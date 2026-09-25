import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/campo_texto.dart';
import '../../design/widgets/dialogo_confirmacao.dart';
import '../livros/capa.dart';
import 'avatar.dart';
import 'perfil_service.dart';
import 'widgets_de_perfil.dart';

const int _limiteDoNome = 60;
const int _limiteDaBiografia = 1000;
const int _avisoDaBiografia = 900;

/// Editar perfil (RF-SOC-01/04), a partir de docs/design/periodo-1/F-PERFIL/editar-perfil.md §4.
/// Nome de exibição, biografia, avatar e privacidade; o username não muda. Mesma lógica da web
/// (`EditarPerfilView.vue`):
///
/// - **Avatar** validado pelos bytes, enviado direto ao Cloudinary; só URL e `publicId` vão ao
///   `identidade`. O upload não trava os campos; recusa, falha ou `422` voltam a foto anterior.
/// - **Sair com alterações** pelo `X` ou pelo voltar do sistema passa pelo modal de descarte.
///   Trocar de aba não perde a edição: o shell preserva a pilha de cada aba.
/// - **Biografia com contador de 1000**, o teto técnico do servidor; o protótipo dispensava
///   contador por falta de limite.
class EditarPerfilPage extends StatefulWidget {
  final PerfilService servico;
  final SeletorDeImagem seletor;
  final EnviadorDeAvatar enviador;
  final VoidCallback aoSair;

  const EditarPerfilPage({
    super.key,
    required this.servico,
    required this.seletor,
    required this.enviador,
    required this.aoSair,
  });

  @override
  State<EditarPerfilPage> createState() => _EditarPerfilPageState();
}

class _EditarPerfilPageState extends State<EditarPerfilPage> {
  final _nome = TextEditingController();
  final _biografia = TextEditingController();

  Perfil? _original;
  bool _carregando = true;
  bool _falhouCarga = false;

  Privacidade _privacidade = Privacidade.publico;
  Avatar? _avatar;
  Avatar? _avatarOriginal;
  Uint8List? _previa;
  bool _enviandoAvatar = false;
  String? _erroDoAvatar;
  int _envioAtual = 0;

  bool _nomeTocado = false;
  String? _erroDoServidorNome;
  String? _erroDoServidorBiografia;
  String? _banner;

  bool _salvando = false;
  bool _coldStart = false;
  Timer? _coldStartTimer;
  bool _saidaLiberada = false;

  // A chave acompanha a intenção: reenviar o mesmo conteúdo reaproveita a chave (RNF-ERR-04).
  String? _chave;
  String? _conteudoDaChave;

  @override
  void initState() {
    super.initState();
    _nome.addListener(() => setState(() {
      _nomeTocado = true;
      _erroDoServidorNome = null;
    }));
    _biografia.addListener(() => setState(() => _erroDoServidorBiografia = null));
    _carregar();
  }

  @override
  void dispose() {
    _coldStartTimer?.cancel();
    _nome.dispose();
    _biografia.dispose();
    super.dispose();
  }

  Future<void> _carregar() async {
    setState(() {
      _carregando = true;
      _falhouCarga = false;
    });
    try {
      final perfil = await widget.servico.obterMeuPerfil();
      if (!mounted) {
        return;
      }
      final publicId = perfil.avatarUrl == null ? null : publicIdDaUrl(perfil.avatarUrl!);
      setState(() {
        _original = perfil;
        _nome.text = perfil.displayName;
        _biografia.text = perfil.biografia ?? '';
        _privacidade = perfil.privacidade;
        _avatarOriginal = perfil.avatarUrl != null && publicId != null
            ? Avatar(url: perfil.avatarUrl!, publicId: publicId)
            : null;
        _avatar = _avatarOriginal;
        _nomeTocado = false;
        _carregando = false;
      });
    } on ApiException {
      if (mounted) {
        setState(() {
          _carregando = false;
          _falhouCarga = true;
        });
      }
    }
  }

  String get _nomeLimpo => _nome.text.trim();

  String? get _erroDoNome {
    if (_erroDoServidorNome != null) {
      return _erroDoServidorNome;
    }
    if (_nomeTocado && _nomeLimpo.isEmpty) {
      return 'Informe um nome de exibição.';
    }
    if (_nomeLimpo.length > _limiteDoNome) {
      return 'Use no máximo $_limiteDoNome caracteres.';
    }
    return null;
  }

  bool get _podeSalvar =>
      _original != null &&
      _nomeLimpo.isNotEmpty &&
      _nomeLimpo.length <= _limiteDoNome &&
      _biografia.text.length <= _limiteDaBiografia &&
      !_enviandoAvatar &&
      !_salvando;

  EditarPerfil get _dados {
    final biografia = _biografia.text.trim();
    return EditarPerfil(
      displayName: _nomeLimpo,
      biografia: biografia.isEmpty ? null : biografia,
      avatar: _avatar,
      privacidade: _privacidade,
    );
  }

  bool get _modificado {
    final perfil = _original;
    if (perfil == null) {
      return false;
    }
    final dados = _dados;
    return dados.displayName != perfil.displayName ||
        dados.biografia != perfil.biografia ||
        dados.privacidade != perfil.privacidade ||
        dados.avatar?.url != perfil.avatarUrl ||
        _enviandoAvatar;
  }

  String? get _avisoDePrivado {
    final perfil = _original;
    if (perfil == null ||
        perfil.privacidade != Privacidade.publico ||
        _privacidade != Privacidade.privado ||
        perfil.seguidores == 0) {
      return null;
    }
    return perfil.seguidores == 1
        ? 'Seu 1 seguidor atual continua seguindo você. Para tirar alguém, use a lista de seguidores.'
        : 'Seus ${perfil.seguidores} seguidores atuais continuam seguindo você. Para tirar alguém, '
              'use a lista de seguidores.';
  }

  Future<void> _escolherFoto() async {
    final imagem = await widget.seletor.escolher();
    if (imagem == null || !mounted) {
      return;
    }
    final meu = ++_envioAtual;
    setState(() => _erroDoAvatar = null);
    final recusa = await validarCapa(imagem.bytes);
    if (!mounted || meu != _envioAtual) {
      return;
    }
    if (recusa != null) {
      setState(() => _erroDoAvatar = 'Não foi possível usar essa imagem. $recusa');
      return;
    }
    setState(() {
      _previa = imagem.bytes;
      _enviandoAvatar = true;
    });
    try {
      final enviado = await widget.enviador.enviar(imagem);
      if (mounted && meu == _envioAtual) {
        setState(() => _avatar = enviado);
      }
    } on FalhaNoEnvioDoAvatar catch (erro) {
      if (mounted && meu == _envioAtual) {
        setState(() => _erroDoAvatar = erro.mensagem);
      }
    } finally {
      if (mounted && meu == _envioAtual) {
        setState(() {
          _enviandoAvatar = false;
          _previa = null;
        });
      }
    }
  }

  void _removerFoto() {
    setState(() {
      _envioAtual++;
      _enviandoAvatar = false;
      _previa = null;
      _erroDoAvatar = null;
      _avatar = null;
    });
  }

  Future<void> _salvar() async {
    setState(() => _nomeTocado = true);
    if (!_podeSalvar) {
      return;
    }
    final dados = _dados;
    final conteudo = jsonEncode(dados.paraJson());
    if (conteudo != _conteudoDaChave) {
      _chave = ApiClient.newIdempotencyKey();
      _conteudoDaChave = conteudo;
    }
    setState(() {
      _salvando = true;
      _banner = null;
      _coldStart = false;
    });
    _coldStartTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() => _coldStart = true);
      }
    });
    try {
      await widget.servico.atualizarMeuPerfil(dados, idempotencyKey: _chave!);
      if (mounted) {
        _saidaLiberada = true;
        widget.aoSair();
      }
    } on ApiException catch (erro) {
      if (!mounted) {
        return;
      }
      setState(() {
        if (erro.status == 422) {
          // Avatar recusado pelo servidor: volta a foto anterior, o resto fica (§4.3).
          _avatar = _avatarOriginal;
          _erroDoAvatar = erro.message;
        } else if (erro.campos.containsKey('displayName') || erro.campos.containsKey('biografia')) {
          _erroDoServidorNome = erro.campos['displayName'];
          _erroDoServidorBiografia = erro.campos['biografia'];
        } else {
          _banner = erro.message;
        }
      });
    } finally {
      _coldStartTimer?.cancel();
      if (mounted) {
        setState(() {
          _salvando = false;
          _coldStart = false;
        });
      }
    }
  }

  /// `X` e voltar do sistema: sem alteração sai direto; com alteração, o modal decide (§4.7).
  Future<void> _sair() async {
    if (_salvando) {
      return;
    }
    if (_saidaLiberada || !_modificado) {
      widget.aoSair();
      return;
    }
    final descartar = await confirmarNoModal(
      context,
      titulo: 'Descartar alterações?',
      texto: 'O que você mudou nesta tela não vai ser salvo.',
      acao: 'Descartar',
      cancelar: 'Continuar editando',
    );
    if (descartar && mounted) {
      _saidaLiberada = true;
      widget.aoSair();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return PopScope(
      canPop: _saidaLiberada || !_modificado,
      onPopInvokedWithResult: (saiu, _) {
        if (!saiu) {
          _sair();
        }
      },
      child: Column(
        children: <Widget>[
          CabecalhoTela(
            titulo: 'Editar perfil',
            aoVoltar: _sair,
            fechar: true,
            // §4: tela de edição com ação de salvar, e o sino competiria com ela.
            comSino: false,
            acoes: <Widget>[
              _salvando
                  ? Text(
                      'Salvando',
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                    )
                  : BotaoTextual(texto: 'Salvar', onPressed: _podeSalvar ? _salvar : null),
            ],
          ),
          Expanded(child: _corpo(theme)),
        ],
      ),
    );
  }

  Widget _corpo(ThemeData theme) {
    if (_carregando) {
      return const Padding(
        padding: EdgeInsets.all(DesignTokens.space5),
        child: SkeletonDeIdentidade(),
      );
    }
    final original = _original;
    if (_falhouCarga || original == null) {
      return Padding(
        padding: const EdgeInsets.all(DesignTokens.space5),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const BannerAviso(
              variante: VarianteAviso.erro,
              mensagem: 'Não foi possível carregar seu perfil. Verifique sua conexão e tente de novo.',
            ),
            const SizedBox(height: DesignTokens.space2),
            BotaoTextual(texto: 'Tentar de novo', onPressed: _carregar),
          ],
        ),
      );
    }
    final aviso = _avisoDePrivado;
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const SizedBox(height: DesignTokens.space6),
          if (_banner != null) ...<Widget>[
            BannerAviso(variante: VarianteAviso.erro, mensagem: _banner!),
            const SizedBox(height: DesignTokens.space5),
          ],
          _blocoDoAvatar(theme),
          const SizedBox(height: DesignTokens.space6),
          Divider(height: 1, color: theme.divider),
          const SizedBox(height: DesignTokens.space6),
          _usernameFixo(theme, original.username),
          const SizedBox(height: DesignTokens.space6),
          CampoTexto(
            controller: _nome,
            label: 'Nome de exibição',
            helper: '${_nomeLimpo.length}/$_limiteDoNome',
            erro: _erroDoNome,
            enabled: !_salvando,
            autofillHints: const <String>[AutofillHints.name],
          ),
          const SizedBox(height: DesignTokens.space6),
          CampoTexto(
            controller: _biografia,
            label: 'Biografia',
            helper: 'Aparece no seu perfil em até três linhas.',
            erro: _erroDoServidorBiografia,
            minLines: 4,
            maxLines: 8,
            keyboardType: TextInputType.multiline,
            enabled: !_salvando,
          ),
          const SizedBox(height: DesignTokens.space1),
          Align(
            alignment: Alignment.centerRight,
            child: Text(
              '${_biografia.text.length}/$_limiteDaBiografia',
              style: theme.textTheme.bodySmall?.copyWith(
                color: _biografia.text.length > _avisoDaBiografia
                    ? theme.warningColor
                    : theme.tertiaryText,
              ),
            ),
          ),
          const SizedBox(height: DesignTokens.space8),
          Divider(height: 1, color: theme.divider),
          const SizedBox(height: DesignTokens.space6),
          Semantics(
            header: true,
            child: Text('Privacidade', style: theme.textTheme.headlineSmall),
          ),
          const SizedBox(height: DesignTokens.space4),
          _OpcaoDePrivacidade(
            icone: PhosphorIconsRegular.globe,
            titulo: 'Público',
            descricao: 'Qualquer leitor vê sua estante, suas notas e suas resenhas.',
            selecionada: _privacidade == Privacidade.publico,
            aoTocar: _salvando ? null : () => setState(() => _privacidade = Privacidade.publico),
          ),
          const SizedBox(height: DesignTokens.space3),
          _OpcaoDePrivacidade(
            icone: PhosphorIconsRegular.lock,
            titulo: 'Privado',
            descricao: 'Só quem você aceitar vê sua estante, suas notas e suas resenhas.',
            selecionada: _privacidade == Privacidade.privado,
            aoTocar: _salvando ? null : () => setState(() => _privacidade = Privacidade.privado),
          ),
          if (aviso != null) ...<Widget>[
            const SizedBox(height: DesignTokens.space4),
            BannerAviso(variante: VarianteAviso.alerta, mensagem: aviso),
          ],
          if (_coldStart) ...<Widget>[
            const SizedBox(height: DesignTokens.space4),
            Text(
              'O servidor está iniciando. Isso pode levar alguns segundos.',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
            ),
          ],
          const SizedBox(height: DesignTokens.space16),
        ],
      ),
    );
  }

  Widget _blocoDoAvatar(ThemeData theme) {
    return Column(
      children: <Widget>[
        // A camada de envio cobre o círculo inteiro: é sobreposição, não montagem de layout.
        Stack(
          alignment: Alignment.center,
          children: <Widget>[
            AvatarLeitor(url: _avatar?.url, bytes: _previa, tamanho: 96),
            if (_enviandoAvatar)
              Container(
                width: 96,
                height: 96,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
                ),
                child: Semantics(
                  liveRegion: true,
                  child: Text(
                    'Enviando',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.pageBackground,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: DesignTokens.space3),
        TextButton.icon(
          onPressed: _enviandoAvatar || _salvando ? null : _escolherFoto,
          icon: const Icon(PhosphorIconsRegular.camera, size: 20),
          label: const Text('Trocar foto'),
          style: TextButton.styleFrom(
            foregroundColor: theme.primaryAccent,
            minimumSize: const Size(48, 48),
            textStyle: theme.textTheme.labelLarge,
          ),
        ),
        if (_avatar != null && !_enviandoAvatar)
          BotaoTextual(texto: 'Remover foto', neutro: true, onPressed: _salvando ? null : _removerFoto),
        if (_erroDoAvatar != null) ...<Widget>[
          const SizedBox(height: DesignTokens.space3),
          BannerAviso(variante: VarianteAviso.erro, mensagem: _erroDoAvatar!),
        ],
      ],
    );
  }

  Widget _usernameFixo(ThemeData theme, String username) {
    return Semantics(
      label: 'Nome de usuário, @$username. Não editável.',
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text('Nome de usuário', style: theme.textTheme.labelMedium),
          const SizedBox(height: DesignTokens.space2),
          Container(
            height: 48,
            padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space4),
            decoration: BoxDecoration(
              color: theme.elevatedSurface,
              borderRadius: BorderRadius.circular(DesignTokens.radius),
              border: Border.all(color: theme.divider),
            ),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    '@$username',
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.tertiaryText),
                  ),
                ),
                Icon(PhosphorIconsRegular.lock, size: 20, color: theme.tertiaryText),
              ],
            ),
          ),
          const SizedBox(height: DesignTokens.space2),
          Text(
            'O nome de usuário não muda.',
            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
          ),
        ],
      ),
    );
  }
}

/// Card de opção com rádio, ícone, título e descrição (§4 "Bloco de privacidade"). Selecionada:
/// borda de 1.5px `musgo` e fundo `musgo-fundo`, com o rádio preenchido; o estado é anunciado.
class _OpcaoDePrivacidade extends StatelessWidget {
  final IconData icone;
  final String titulo;
  final String descricao;
  final bool selecionada;
  final VoidCallback? aoTocar;

  const _OpcaoDePrivacidade({
    required this.icone,
    required this.titulo,
    required this.descricao,
    required this.selecionada,
    required this.aoTocar,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: selecionada,
      button: true,
      label: '$titulo. $descricao',
      excludeSemantics: true,
      child: InkWell(
        onTap: aoTocar,
        borderRadius: BorderRadius.circular(DesignTokens.radius),
        splashFactory: NoSplash.splashFactory,
        child: Container(
          padding: const EdgeInsets.all(DesignTokens.space4),
          decoration: BoxDecoration(
            color: selecionada ? theme.accentTint : null,
            borderRadius: BorderRadius.circular(DesignTokens.radius),
            border: Border.all(
              color: selecionada ? theme.primaryAccent : theme.divider,
              width: selecionada ? 1.5 : 1,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(
                selecionada ? PhosphorIconsFill.radioButton : PhosphorIconsRegular.circle,
                size: 20,
                color: selecionada ? theme.primaryAccent : theme.secondaryText,
              ),
              const SizedBox(width: DesignTokens.space3),
              Icon(icone, size: 20, color: theme.colorScheme.onSurface),
              const SizedBox(width: DesignTokens.space3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(titulo, style: theme.textTheme.labelLarge),
                    const SizedBox(height: DesignTokens.space1),
                    Text(
                      descricao,
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
