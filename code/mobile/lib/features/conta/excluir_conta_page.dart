import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_destrutivo.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/campo_senha.dart';
import '../../design/widgets/folha_inferior.dart';
import '../auth/auth_service.dart';
import 'exclusao_service.dart';
import 'validacao_de_senha.dart';

enum _Erro { senha, limite, envio }

/// Excluir conta (F-CONTA-2, RF-AUT-07). Estrutura e cópia de
/// docs/design/periodo-2/F-CONTA-2/excluir-conta.md §4, mesma lógica da web
/// (`ExcluirContaView.vue`). Três travas antes do pedido: senha, caixa de confirmação e a folha
/// destrutiva. A data limite é calculada no aparelho (agora mais 30 dias) antes do pedido; a
/// tela final mostra a que o servidor devolveu.
///
/// No `202`, quem recebe [aoExclusaoSolicitada] limpa a sessão e o secure storage **antes** de
/// mostrar `Exclusão solicitada` (§9).
class ExcluirContaPage extends StatefulWidget {
  final ExclusaoService servico;

  /// Só para o `GET /me` da consequência 4 (nome de usuário e e-mail).
  final AuthService authService;
  final VoidCallback? aoVoltar;
  final Future<void> Function(DateTime previstaEm) aoExclusaoSolicitada;

  const ExcluirContaPage({
    super.key,
    required this.servico,
    required this.authService,
    required this.aoExclusaoSolicitada,
    this.aoVoltar,
  });

  @override
  State<ExcluirContaPage> createState() => _ExcluirContaPageState();
}

class _ExcluirContaPageState extends State<ExcluirContaPage> {
  final _senhaController = TextEditingController();
  final _senhaFoco = FocusNode();
  final _bannerDaSenha = GlobalKey();
  final _chave = ChaveDaIntencao();
  final String _dataLimite = dataPorExtenso(dataLimiteAPartirDeAgora());

  UsuarioResposta? _usuario;
  bool _entendeu = false;
  bool _excluindo = false;
  _Erro? _erro;

  @override
  void initState() {
    super.initState();
    _carregarUsuario();
  }

  @override
  void dispose() {
    _senhaController.dispose();
    _senhaFoco.dispose();
    super.dispose();
  }

  Future<void> _carregarUsuario() async {
    try {
      final usuario = await widget.authService.buscarUsuarioAtual();
      if (mounted) {
        setState(() => _usuario = usuario);
      }
    } on Object {
      // Sem o `/me`, a consequência 4 fala do nome de usuário sem citá-lo.
    }
  }

  bool get _podeExcluir =>
      _senhaController.text.isNotEmpty && _entendeu && _erro != _Erro.limite && !_excluindo;

  String get _identificadores {
    final usuario = _usuario;
    if (usuario == null) {
      return 'seu nome de usuário';
    }
    final email = usuario.email;
    return email == null ? '@${usuario.username}' : '@${usuario.username} e $email';
  }

  void _aoDigitar(String _) {
    setState(() {
      if (_erro == _Erro.senha) {
        _erro = null;
      }
    });
  }

  Future<void> _confirmar() async {
    if (!_podeExcluir) {
      return;
    }
    final confirmado = await confirmarAcaoDestrutiva(
      context,
      titulo: 'Excluir sua conta?',
      texto:
          'Sua conta fica oculta a partir de agora e é apagada definitivamente em $_dataLimite. '
          'Até lá, você pode cancelar entrando de novo.',
      acao: 'Excluir conta',
    );
    if (confirmado && mounted) {
      await _excluir();
    }
  }

  Future<void> _excluir() async {
    final senha = _senhaController.text;
    setState(() {
      _excluindo = true;
      _erro = null;
    });
    try {
      // A mesma chave enquanto a senha for a mesma: reenviar depois de um erro não cria dois
      // pedidos (§4.7).
      final resposta = await widget.servico.solicitar(
        senha: senha,
        idempotencyKey: _chave.para(senha, ApiClient.newIdempotencyKey),
      );
      await widget.aoExclusaoSolicitada(resposta.previstaEm);
    } on ApiException catch (erro) {
      if (!mounted) {
        return;
      }
      setState(() {
        if (erro.status == 422) {
          _erro = _Erro.senha;
          _senhaController.clear();
        } else if (erro.status == 429) {
          _erro = _Erro.limite;
        } else {
          _erro = _Erro.envio;
        }
      });
      if (_erro == _Erro.senha) {
        // O banner e o campo ficam visíveis abaixo do header, com o foco no campo (§4.5).
        WidgetsBinding.instance.addPostFrameCallback((_) {
          final alvo = _bannerDaSenha.currentContext;
          if (alvo != null && alvo.mounted) {
            Scrollable.ensureVisible(alvo, duration: DesignTokens.durFast);
          }
          _senhaFoco.requestFocus();
        });
      }
    } finally {
      if (mounted) {
        setState(() => _excluindo = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // Sair no meio do pedido deixaria o leitor sem saber se a conta foi posta em exclusão (§4.4).
    return PopScope(
      canPop: !_excluindo,
      child: Column(
        children: <Widget>[
          CabecalhoTela(
            titulo: 'Excluir conta',
            aoVoltar: _excluindo ? () {} : widget.aoVoltar,
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(
                DesignTokens.space5,
                DesignTokens.space6,
                DesignTokens.space5,
                DesignTokens.space8,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Text(
                    'Você pode pedir a exclusão agora e mudar de ideia em até 30 dias.',
                    style: theme.textTheme.bodyLarge,
                  ),
                  const SizedBox(height: DesignTokens.space6),
                  ..._consequencias(theme),
                  // Separa entender o que acontece de provar quem você é e confirmar (§4, item 4).
                  const SizedBox(height: DesignTokens.space8),
                  Divider(height: 1, thickness: 1, color: theme.divider),
                  const SizedBox(height: DesignTokens.space8),
                  ..._formulario(theme),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _consequencias(ThemeData theme) {
    final itens = <(IconData, String, String)>[
      (
        PhosphorIconsRegular.eyeSlash,
        'Oculta a partir de agora',
        'Seu perfil, sua estante, suas resenhas, frases, comentários e listas deixam de aparecer '
            'para os outros leitores assim que você confirmar. Nada é apagado neste momento.',
      ),
      (
        PhosphorIconsRegular.clockCounterClockwise,
        '30 dias para voltar atrás',
        'Até $_dataLimite, basta entrar com seu e-mail e senha para cancelar a exclusão. Tudo '
            'volta como estava.',
      ),
      (
        PhosphorIconsRegular.trash,
        'Depois do prazo, é definitivo',
        'Sua conta e tudo o que você registrou, como leituras, progresso, notas, resenhas, '
            'desafios e quem você segue, são apagados e não podem ser recuperados.',
      ),
      (
        PhosphorIconsRegular.at,
        'Nome de usuário e e-mail reservados',
        'Durante os 30 dias, $_identificadores continuam ligados a esta conta e não podem ser '
            'usados em outra.',
      ),
    ];
    return <Widget>[
      for (var i = 0; i < itens.length; i++) ...<Widget>[
        if (i > 0) const SizedBox(height: DesignTokens.space5),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.only(top: 1),
              child: ExcludeSemantics(
                child: Icon(itens[i].$1, size: 20, color: theme.secondaryText),
              ),
            ),
            const SizedBox(width: DesignTokens.space3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(itens[i].$2, style: theme.textTheme.labelLarge),
                  const SizedBox(height: DesignTokens.space1),
                  Text(
                    itens[i].$3,
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    ];
  }

  List<Widget> _formulario(ThemeData theme) {
    final caption = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    return <Widget>[
      if (_erro == _Erro.senha || _erro == _Erro.limite) ...<Widget>[
        BannerAviso(
          key: _bannerDaSenha,
          variante: _erro == _Erro.senha ? VarianteAviso.erro : VarianteAviso.alerta,
          mensagem: _erro == _Erro.senha
              ? 'Senha incorreta. Sua conta continua como estava.'
              : 'Muitas tentativas com a senha errada. Espere alguns minutos para tentar de novo.',
        ),
        const SizedBox(height: DesignTokens.space6),
      ],
      AnimatedOpacity(
        opacity: _excluindo ? 0.5 : 1,
        duration: DesignTokens.durFast,
        child: IgnorePointer(
          ignoring: _excluindo,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              CampoSenha(
                controller: _senhaController,
                focusNode: _senhaFoco,
                label: 'Senha atual',
                autofillHints: const <String>[AutofillHints.password],
                helper: 'Para confirmar que é você quem está pedindo.',
                bordaDeErro: _erro == _Erro.senha,
                enabled: !_excluindo && _erro != _Erro.limite,
                onChanged: _aoDigitar,
              ),
              const SizedBox(height: DesignTokens.space6),
              _CaixaDeConfirmacao(
                marcada: _entendeu,
                texto: 'Entendi que, depois de $_dataLimite, a exclusão não pode ser desfeita.',
                aoAlternar: () => setState(() => _entendeu = !_entendeu),
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: DesignTokens.space5),
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: ExcludeSemantics(
              child: Icon(PhosphorIconsRegular.info, size: 16, color: theme.secondaryText),
            ),
          ),
          const SizedBox(width: DesignTokens.space2),
          Expanded(
            child: Text(
              'Ao confirmar, você sai do aplicativo neste e em todos os outros aparelhos.',
              style: caption,
            ),
          ),
        ],
      ),
      if (_erro == _Erro.envio) ...<Widget>[
        const SizedBox(height: DesignTokens.space8),
        const BannerAviso(
          variante: VarianteAviso.erro,
          mensagem:
              'Não foi possível pedir a exclusão. Sua conta continua como estava. Verifique sua '
              'conexão e tente de novo.',
        ),
        const SizedBox(height: DesignTokens.space5),
      ] else
        const SizedBox(height: DesignTokens.space8),
      // Desabilitado, o outline continua `rubi`, a 40% e sem resposta ao toque (§4, item 9).
      Semantics(
        enabled: _podeExcluir,
        child: IgnorePointer(
          ignoring: !_podeExcluir && !_excluindo,
          child: Opacity(
            opacity: _podeExcluir || _excluindo ? 1 : 0.4,
            child: BotaoDestrutivo(
              texto: _excluindo ? 'Excluindo' : 'Excluir conta',
              carregando: _excluindo,
              carregandoEsmaecido: true,
              onPressed: _confirmar,
            ),
          ),
        ),
      ),
      if (_excluindo) ...<Widget>[
        const SizedBox(height: DesignTokens.space3),
        Text(
          'O servidor está iniciando. Isso pode levar alguns segundos.',
          textAlign: TextAlign.center,
          style: caption,
        ),
      ] else ...<Widget>[
        const SizedBox(height: DesignTokens.space4),
        BotaoTextual(
          texto: 'Cancelar',
          neutro: true,
          larguraTotal: true,
          onPressed: widget.aoVoltar,
        ),
      ],
    ];
  }
}

/// Caixa de confirmação (§4, item 7): a linha inteira é o alvo, com no mínimo 48px. Marcada usa
/// o acento do produto, não `rubi`: marcar é concordar, e a ação destrutiva é o botão.
class _CaixaDeConfirmacao extends StatelessWidget {
  final bool marcada;
  final String texto;
  final VoidCallback aoAlternar;

  const _CaixaDeConfirmacao({
    required this.marcada,
    required this.texto,
    required this.aoAlternar,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      checked: marcada,
      label: texto,
      excludeSemantics: true,
      onTap: aoAlternar,
      child: InkWell(
        onTap: aoAlternar,
        splashFactory: NoSplash.splashFactory,
        borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.only(top: 1),
                child: AnimatedContainer(
                  duration: DesignTokens.durFast,
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: marcada ? theme.primaryAccent : Colors.transparent,
                    border: Border.all(
                      color: marcada ? theme.primaryAccent : theme.secondaryText,
                      width: 1.5,
                    ),
                    borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
                  ),
                  child: marcada
                      ? Icon(PhosphorIconsBold.check, size: 14, color: theme.pageBackground)
                      : null,
                ),
              ),
              const SizedBox(width: DesignTokens.space3),
              Expanded(child: Text(texto, style: theme.textTheme.bodyMedium)),
            ],
          ),
        ),
      ),
    );
  }
}
