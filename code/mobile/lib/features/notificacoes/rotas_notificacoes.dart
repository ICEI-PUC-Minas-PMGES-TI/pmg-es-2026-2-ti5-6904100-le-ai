import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../livros/rotas_livros.dart';
import '../perfil/rotas_perfil.dart';
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
  final ContadorDeNaoLidas contador;
  final FechamentoDeNotificacoes fechamento = FechamentoDeNotificacoes();

  DependenciasDeNotificacoes(this.servico) : contador = ContadorDeNaoLidas(servico);

  factory DependenciasDeNotificacoes.padrao({
    required String? Function() getToken,
    Future<bool> Function(String tokenQueFalhou)? renovarSessao,
  }) => DependenciasDeNotificacoes(
    NotificacoesService.padrao(getToken: getToken, renovarSessao: renovarSessao),
  );
}

/// As notificações são temporárias: quem sai da aba (pela barra inferior, ou abrindo uma
/// notificação cujo destino é outra aba) as fecha antes, e a aba volta à tela que estava por baixo.
/// O `go_router` não deixa editar a pilha de uma aba inativa, então o fechamento é um `pop` **sem
/// animação** — a animação de saída congelaria no meio, porque a aba escondida perde o `TickerMode`
/// — seguido de um quadro de espera, para o shell gravar a pilha nova da aba antes da troca.
class FechamentoDeNotificacoes {
  bool _semAnimacao = false;

  /// A rota de notificações consulta isto ao ser fechada: ligada, ela some na hora.
  bool get semAnimacao => _semAnimacao;

  /// Fecha as notificações que estão no topo e só devolve depois do quadro em que a aba registra a
  /// pilha sem elas. O voltar normal (seta, gesto) não passa por aqui e continua animado.
  Future<void> fechar(GoRouter router) async {
    _semAnimacao = true;
    try {
      router.pop();
      await WidgetsBinding.instance.endOfFrame;
    } finally {
      _semAnimacao = false;
    }
  }
}

/// Destino de cada tipo (§4, item de notificação). Os comentários da atividade ainda não existem
/// no app (o feed mobile é placeholder), então os três tipos de atividade levam ao feed.
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
      return rotaFeedRaiz;
    case TipoNotificacao.leituraEmRisco:
    case TipoNotificacao.leituraExpirada:
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
    fechamento: deps.fechamento,
    child: NotificacoesPage(
      servico: deps.servico,
      contador: deps.contador,
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

/// A `Page` que o `go_router` monta por padrão (`MaterialPage`), mas com a rota própria, que pode
/// fechar sem animação.
class _PaginaDeNotificacoes extends Page<void> {
  final Widget child;
  final FechamentoDeNotificacoes fechamento;

  const _PaginaDeNotificacoes({
    required this.child,
    required this.fechamento,
    super.key,
    super.name,
    super.arguments,
    super.restorationId,
  });

  @override
  Route<void> createRoute(BuildContext context) => _RotaDeNotificacoes(this);
}

/// Como a rota de `MaterialPage` (transição de página do Material, lendo o `child` da página para
/// acompanhar atualizações dela), mas que, no fechamento por troca de aba, sai com duração zero: a
/// rota é finalizada na hora, sem quadro intermediário. É a duração de saída, e não o controlador,
/// que se altera: a cada `didPop`, o `MaterialRouteTransitionMixin` reescreve
/// `controller.reverseDuration` a partir de [reverseTransitionDuration].
class _RotaDeNotificacoes extends PageRoute<void> with MaterialRouteTransitionMixin<void> {
  _RotaDeNotificacoes(_PaginaDeNotificacoes pagina) : super(settings: pagina);

  _PaginaDeNotificacoes get _pagina => settings as _PaginaDeNotificacoes;

  @override
  Widget buildContent(BuildContext context) => _pagina.child;

  @override
  bool get maintainState => true;

  @override
  Duration get reverseTransitionDuration =>
      _pagina.fechamento.semAnimacao ? Duration.zero : super.reverseTransitionDuration;
}
