import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../livros/rotas_livros.dart';
import '../perfil/rotas_perfil.dart';
import 'canal_de_notificacoes.dart';
import 'contador_de_nao_lidas.dart';
import 'notificacao.dart';
import 'notificacoes_page.dart';
import 'notificacoes_service.dart';

const String _segmento = 'notificacoes';

/// A tela é empilhada na aba de origem, para a barra inferior continuar com ela ativa
/// (notificacoes.md §4): `/estante/notificacoes`, `/feed/notificacoes`...
String rotaNotificacoes(String raizDaAba) => '$raizDaAba/$_segmento';

/// Se [caminho] é a tela de notificações de alguma aba, a de [rotaNotificacoes].
bool ehRotaDeNotificacoes(String caminho) => caminho.endsWith('/$_segmento');

/// O que F-NOT precisa do mundo lá fora, no molde de `DependenciasDePerfil`. O contador é um só
/// para o app inteiro: é o número do badge em todo cabeçalho.
class DependenciasDeNotificacoes {
  final NotificacoesService servico;
  final CanalDeNotificacoes canal;
  final ContadorDeNaoLidas contador;
  final FechamentoDeNotificacoes fechamento = FechamentoDeNotificacoes();

  DependenciasDeNotificacoes(NotificacoesService servico)
    : this._(servico, CanalDeNotificacoes(servico.abrirTempoReal));

  DependenciasDeNotificacoes._(this.servico, this.canal)
    : contador = ContadorDeNaoLidas(servico, canal);

  factory DependenciasDeNotificacoes.padrao({
    required String? Function() getToken,
    Future<bool> Function(String tokenQueFalhou)? renovarSessao,
  }) => DependenciasDeNotificacoes(
    NotificacoesService.padrao(getToken: getToken, renovarSessao: renovarSessao),
  );
}

/// As notificações são temporárias: abrem e fecham sem animação (decisão de 29/09/2026), e quem
/// sai da aba (pela barra inferior, ou abrindo uma notificação cujo destino é outra aba) as fecha
/// antes, para a aba voltar à tela que estava por baixo. O `go_router` não deixa editar a pilha de
/// uma aba inativa, então o fechamento é um `pop` seguido de um quadro de espera, para o shell
/// gravar a pilha nova da aba antes da troca.
class FechamentoDeNotificacoes {
  /// Fecha as notificações que estão no topo e só devolve depois do quadro em que a aba registra a
  /// pilha sem elas.
  Future<void> fechar(GoRouter router) async {
    router.pop();
    await WidgetsBinding.instance.endOfFrame;
  }
}

/// Destino de cada tipo (§4, item de notificação). Os comentários da atividade ainda não existem
/// no app (o feed mobile é placeholder), então os tipos de atividade e a menção levam ao feed.
String destinoDaNotificacao(Notificacao notificacao) {
  switch (notificacao.tipo) {
    case TipoNotificacao.novoSeguidor:
    case TipoNotificacao.solicitacaoAceita:
      final ator = notificacao.ator;
      return ator == null ? rotaPerfilRaiz : rotaPerfilDeOutro(ator.username);
    case TipoNotificacao.solicitacaoCriada:
      return rotaSolicitacoes;
    case TipoNotificacao.atividadeCurtida:
    case TipoNotificacao.atividadeComentada:
    case TipoNotificacao.comentarioRespondido:
    case TipoNotificacao.usuarioMencionado:
      return rotaFeedRaiz;
    case TipoNotificacao.leituraEmRisco:
    case TipoNotificacao.leituraExpirada:
    // F-AVA-2: a página do livro da resenha curtida, onde ela aparece em "Sua avaliação". A
    // notificação não leva o id da resenha, então não rola até ela (divergência registrada).
    case TipoNotificacao.resenhaCurtida:
      final livro = notificacao.livro;
      if (livro == null) {
        return rotaEstanteRaiz;
      }
      return livro.pessoal ? rotaLivroPessoalNaEstante(livro.id) : rotaLivroOficial(livro.id);
  }
}

/// Sub-rota `notificacoes` de uma aba. `go`, e não `push`, para o destino: ele pode estar em
/// outra aba, e o `StatefulShellRoute` troca de aba com `go`. Um destino fora da aba fecha as
/// notificações antes ([FechamentoDeNotificacoes]), para a aba de origem não guardá-las; o `router`
/// é capturado antes porque o `context` da página some com o fechamento.
GoRoute rotaDeNotificacoes(DependenciasDeNotificacoes deps, String raizDaAba) => GoRoute(
  path: _segmento,
  pageBuilder: (context, state) => _PaginaDeNotificacoes(
    key: state.pageKey,
    name: state.name ?? state.path,
    arguments: <String, String>{...state.pathParameters, ...state.uri.queryParameters},
    restorationId: state.pageKey.value,
    child: NotificacoesPage(
      servico: deps.servico,
      contador: deps.contador,
      canal: deps.canal,
      aoVoltar: () => context.canPop() ? context.pop() : context.go(raizDaAba),
      aoAbrir: (notificacao) =>
          _irPara(context, deps, raizDaAba, destinoDaNotificacao(notificacao)),
      // O registro de progresso (F-PRG) ainda não tem tela no app: a estante é onde a leitura está.
      aoRegistrarProgresso: (_) => _irPara(context, deps, raizDaAba, rotaEstanteRaiz),
    ),
  ),
);

Future<void> _irPara(
  BuildContext context,
  DependenciasDeNotificacoes deps,
  String raizDaAba,
  String destino,
) async {
  final router = GoRouter.of(context);
  final foraDaAba = destino != raizDaAba && !destino.startsWith('$raizDaAba/');
  if (foraDaAba) {
    await deps.fechamento.fechar(router);
  }
  router.go(destino);
}

/// A `Page` das notificações, com a rota própria, sem transição.
class _PaginaDeNotificacoes extends Page<void> {
  final Widget child;

  const _PaginaDeNotificacoes({
    required this.child,
    super.key,
    super.name,
    super.arguments,
    super.restorationId,
  });

  @override
  Route<void> createRoute(BuildContext context) => _RotaDeNotificacoes(this);
}

/// Rota que entra e sai na hora, sem transição nem animação de voltar preditivo: a tela é uma
/// camada temporária sobre a aba, e não uma página a mais na navegação. Lê o `child` da página para
/// acompanhar as atualizações dela.
class _RotaDeNotificacoes extends PageRoute<void> {
  _RotaDeNotificacoes(_PaginaDeNotificacoes pagina) : super(settings: pagina);

  _PaginaDeNotificacoes get _pagina => settings as _PaginaDeNotificacoes;

  @override
  Duration get transitionDuration => Duration.zero;

  @override
  Duration get reverseTransitionDuration => Duration.zero;

  @override
  bool get maintainState => true;

  @override
  bool get opaque => true;

  @override
  Color? get barrierColor => null;

  @override
  String? get barrierLabel => null;

  @override
  Widget buildPage(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
  ) => Semantics(scopesRoute: true, explicitChildNodes: true, child: _pagina.child);
}
