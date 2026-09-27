import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/dialogo_confirmacao.dart';
import '../../design/widgets/estado_vazio.dart';
import '../estante/estante_de_perfil.dart';
import '../estante/leitura_service.dart';
import 'perfil_service.dart';
import 'textos.dart';
import 'widgets_de_perfil.dart';

/// Perfil de outro leitor (RF-SOC-02, RF-SOC-05..07, RN-08), a partir de
/// docs/design/periodo-1/F-PERFIL/perfil-de-outro-leitor.md, com a mesma lógica da web
/// (`PerfilDeOutroView.vue`). Nome, avatar, biografia e contadores são públicos; o botão de
/// relação muda com a privacidade e com `relacao`. Quem decide o que é restrito é o servidor
/// (`conteudoRestrito`), e os serviços donos revalidam (RNF-SEC-03).
///
/// Sem resenhas quando o conteúdo é visível; a estante vem de `GET /perfis/{id}/estante`, e o
/// `403` dela também leva ao bloco de restrição. Contadores não acionáveis:
/// não há lista do grafo de terceiros (RNF-SEC-19/44).
class PerfilDeOutroPage extends StatefulWidget {
  final PerfilService servico;
  final String username;
  final VoidCallback? aoVoltar;
  final VoidCallback aoAbrirProprioPerfil;
  final VoidCallback aoBuscarLeitor;
  final VoidCallback aoAbrirSolicitacoes;
  final LeituraService? leitura;

  const PerfilDeOutroPage({
    super.key,
    required this.servico,
    required this.username,
    this.aoVoltar,
    required this.aoAbrirProprioPerfil,
    required this.aoBuscarLeitor,
    required this.aoAbrirSolicitacoes,
    this.leitura,
  });

  @override
  State<PerfilDeOutroPage> createState() => _PerfilDeOutroPageState();
}

class _PerfilDeOutroPageState extends State<PerfilDeOutroPage> {
  Perfil? _perfil;
  bool _carregando = true;
  bool _naoEncontrado = false;
  bool _falhou = false;
  bool _agindo = false;
  String? _erroDaAcao;
  bool _estanteRestrita = false;

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  Future<void> _carregar() async {
    setState(() {
      _carregando = true;
      _naoEncontrado = false;
      _falhou = false;
      _erroDaAcao = null;
    });
    try {
      final perfil = await widget.servico.obterPerfil(widget.username);
      if (!mounted) {
        return;
      }
      if (perfil.relacao == Relacao.proprio) {
        widget.aoAbrirProprioPerfil();
        return;
      }
      setState(() {
        _perfil = perfil;
        _carregando = false;
      });
    } on ApiException catch (erro) {
      if (mounted) {
        setState(() {
          _carregando = false;
          _naoEncontrado = erro.status == 404;
          _falhou = erro.status != 404;
        });
      }
    }
  }

  Perfil _com(Perfil p, {required String relacao, bool? restrito, int deltaSeguidores = 0}) {
    return Perfil(
      id: p.id,
      username: p.username,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      privacidade: p.privacidade,
      conteudoRestrito: restrito ?? p.conteudoRestrito,
      relacao: relacao,
      biografia: p.biografia,
      seguidores: p.seguidores + deltaSeguidores < 0 ? 0 : p.seguidores + deltaSeguidores,
      seguidos: p.seguidos,
    );
  }

  /// Seguir perfil público é imediato; em privado vira pedido (RF-SOC-05/06). Sem modal.
  Future<void> _seguir() async {
    final atual = _perfil;
    if (atual == null || _agindo) {
      return;
    }
    setState(() {
      _agindo = true;
      _erroDaAcao = null;
    });
    try {
      final segue = await widget.servico.seguir(
        atual.username,
        idempotencyKey: ApiClient.newIdempotencyKey(),
      );
      if (mounted) {
        setState(() {
          _perfil = segue
              ? _com(atual, relacao: Relacao.seguindo, restrito: false, deltaSeguidores: 1)
              : _com(atual, relacao: Relacao.solicitacaoEnviada);
        });
      }
    } on ApiException catch (erro) {
      if (!mounted) {
        return;
      }
      if (erro.status == 409) {
        // A relação mudou por outro caminho: o servidor sabe o estado.
        await _carregar();
      } else {
        setState(() => _erroDaAcao = erro.message);
      }
    } finally {
      if (mounted) {
        setState(() => _agindo = false);
      }
    }
  }

  Future<void> _deixarDeSeguir() async {
    final atual = _perfil;
    if (atual == null) {
      return;
    }
    final privado = atual.privacidade == Privacidade.privado;
    final confirmado = await confirmarNoModal(
      context,
      titulo: 'Deixar de seguir ${primeiroNome(atual.displayName)}?',
      texto: privado
          ? 'As atividades dessa pessoa saem do seu feed, e você perde o acesso à estante e às '
                'resenhas. Seguir de novo exige uma solicitação nova.'
          : 'As atividades dessa pessoa saem do seu feed. Você pode seguir de novo quando quiser.',
      acao: 'Deixar de seguir',
    );
    if (!confirmado || !mounted) {
      return;
    }
    setState(() {
      _agindo = true;
      _erroDaAcao = null;
    });
    try {
      await widget.servico.deixarDeSeguir(
        atual.username,
        idempotencyKey: ApiClient.newIdempotencyKey(),
      );
      if (mounted) {
        setState(
          () => _perfil = _com(
            atual,
            relacao: Relacao.nenhuma,
            restrito: privado,
            deltaSeguidores: -1,
          ),
        );
      }
    } on ApiException catch (erro) {
      if (mounted) {
        setState(() => _erroDaAcao = erro.message);
      }
    } finally {
      if (mounted) {
        setState(() => _agindo = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        // Sem título: o nome está grande no bloco de identidade (§4).
        CabecalhoTela(titulo: '', aoVoltar: widget.aoVoltar),
        Expanded(child: _corpo(Theme.of(context))),
      ],
    );
  }

  Widget _corpo(ThemeData theme) {
    const margem = EdgeInsets.fromLTRB(
      DesignTokens.space5,
      DesignTokens.space6,
      DesignTokens.space5,
      DesignTokens.space10,
    );
    if (_carregando) {
      return const Padding(padding: margem, child: SkeletonDeIdentidade());
    }
    if (_naoEncontrado) {
      return Padding(
        padding: margem,
        child: EstadoVazio(
          icone: PhosphorIconsRegular.userCircle,
          titulo: 'Perfil não encontrado',
          texto: 'Confira o nome de usuário e tente de novo.',
          rodape: BotaoPrimario(texto: 'Buscar leitor', onPressed: widget.aoBuscarLeitor),
        ),
      );
    }
    final perfil = _perfil;
    if (_falhou || perfil == null) {
      return Padding(
        padding: margem,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const BannerAviso(
              variante: VarianteAviso.erro,
              mensagem:
                  'Não foi possível carregar este perfil. Verifique sua conexão e tente de novo.',
            ),
            const SizedBox(height: DesignTokens.space2),
            BotaoTextual(texto: 'Tentar de novo', onPressed: _carregar),
          ],
        ),
      );
    }
    final nome = primeiroNome(perfil.displayName);
    final privado = perfil.privacidade == Privacidade.privado;
    final leitura = widget.leitura;
    return SingleChildScrollView(
      padding: margem,
      child: Column(
        children: <Widget>[
          AvatarLeitor(url: perfil.avatarUrl, tamanho: 96),
          const SizedBox(height: DesignTokens.space4),
          Text(perfil.displayName, style: theme.displayTitle, textAlign: TextAlign.center),
          const SizedBox(height: DesignTokens.space1),
          Text(
            '@${perfil.username}',
            style: theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText),
          ),
          const SizedBox(height: DesignTokens.space3),
          ChipPrivacidade(privacidade: perfil.privacidade),
          if (privado && perfil.relacao == Relacao.seguindo) ...<Widget>[
            const SizedBox(height: DesignTokens.space2),
            Text(
              'Você vê este perfil porque segue $nome.',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
              textAlign: TextAlign.center,
            ),
          ],
          if (perfil.biografia != null) ...<Widget>[
            const SizedBox(height: DesignTokens.space4),
            Text(
              perfil.biografia!,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
            ),
          ],
          if (perfil.relacao == Relacao.solicitacaoRecebida) ...<Widget>[
            const SizedBox(height: DesignTokens.space3),
            // §4.8: o pedido recebido tem um lugar, mas a decisão mora na caixa.
            LinhaDeAcento(
              icone: PhosphorIconsRegular.userPlus,
              texto: '$nome pediu para seguir você.',
              aoTocar: widget.aoAbrirSolicitacoes,
            ),
          ],
          const SizedBox(height: DesignTokens.space5),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 240),
            child: _botaoDeRelacao(theme, perfil),
          ),
          if (_erroDaAcao != null) ...<Widget>[
            const SizedBox(height: DesignTokens.space4),
            BannerAviso(variante: VarianteAviso.erro, mensagem: _erroDaAcao!),
          ],
          const SizedBox(height: DesignTokens.space6),
          LinhaDeContadores(
            contadores: <ContadorDePerfil>[
              ContadorDePerfil(
                valor: perfil.seguidores,
                rotulo: perfil.seguidores == 1 ? 'seguidor' : 'seguidores',
              ),
              ContadorDePerfil(valor: perfil.seguidos, rotulo: 'seguindo'),
            ],
          ),
          if (perfil.conteudoRestrito || _estanteRestrita) ...<Widget>[
            const SizedBox(height: DesignTokens.space10),
            // §4.3: restrito não é erro. Nenhuma capa nem trecho aparece, nem desfocado.
            EstadoVazio(
              icone: PhosphorIconsRegular.lock,
              titulo: 'Este perfil é privado',
              texto: perfil.relacao == Relacao.solicitacaoEnviada
                  ? 'Sua solicitação está aguardando resposta.'
                  : 'Envie uma solicitação para ver a estante e as resenhas de $nome.',
            ),
          ],
          if (!perfil.conteudoRestrito && !_estanteRestrita && leitura != null) ...<Widget>[
            const SizedBox(height: DesignTokens.space8),
            EstanteDePerfil(
              key: ValueKey<String>('estante-de-${perfil.id}'),
              servico: leitura,
              usuarioId: perfil.id,
              primeiroNome: nome,
              aoMudarRestricao: (restrita) => setState(() => _estanteRestrita = restrita),
            ),
          ],
        ],
      ),
    );
  }

  Widget _botaoDeRelacao(ThemeData theme, Perfil perfil) {
    Widget secundario({
      required IconData icone,
      required String texto,
      VoidCallback? aoTocar,
      Color? corIcone,
    }) {
      return SizedBox(
        width: double.infinity,
        height: 48,
        child: OutlinedButton.icon(
          onPressed: aoTocar,
          icon: Icon(icone, size: 20, color: corIcone),
          label: Text(texto),
          style: OutlinedButton.styleFrom(
            foregroundColor: theme.colorScheme.onSurface,
            disabledForegroundColor: theme.secondaryText,
            side: BorderSide(color: theme.divider),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DesignTokens.radius)),
            textStyle: theme.textTheme.labelLarge,
          ),
        ),
      );
    }

    switch (perfil.relacao) {
      case Relacao.seguindo:
        return secundario(
          icone: PhosphorIconsBold.check,
          texto: 'Seguindo',
          corIcone: theme.primaryAccent,
          aoTocar: _agindo ? null : _deixarDeSeguir,
        );
      case Relacao.solicitacaoEnviada:
        return secundario(icone: PhosphorIconsRegular.clock, texto: 'Solicitação enviada');
      default:
        return BotaoPrimario(
          texto: perfil.privacidade == Privacidade.privado ? 'Solicitar para seguir' : 'Seguir',
          carregando: _agindo,
          onPressed: _seguir,
        );
    }
  }
}
