import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import 'sessao_controller.dart';
import 'sessao_de_leitura.dart';
import 'sessao_page.dart';
import 'sessao_pendente_page.dart';

const String rotaSessao = '/sessao';
const String rotaSessaoPendente = '/sessao/pendente';

String localAtual(BuildContext context) =>
    GoRouter.of(context).routerDelegate.currentConfiguration.uri.toString();

String? guardaDaSessao(SessaoController sessao, String indo, {required String semSessao}) {
  final destino = switch (sessao.situacao) {
    null => null,
    SituacaoDaSessao.emAndamento || SituacaoDaSessao.pausada => rotaSessao,
    SituacaoDaSessao.pausaEsgotada || SituacaoDaSessao.expirada => rotaSessaoPendente,
  };
  if (destino == null) {
    final naSessao = indo == rotaSessao || indo == rotaSessaoPendente;
    return naSessao ? sessao.destinoAoSair ?? semSessao : null;
  }
  return indo == destino ? null : destino;
}

Page<void> _semTransicao(GoRouterState state, Widget child) => CustomTransitionPage<void>(
  key: state.pageKey,
  transitionDuration: Duration.zero,
  reverseTransitionDuration: Duration.zero,
  transitionsBuilder: (context, animation, secundaria, child) => child,
  child: child,
);

List<RouteBase> rotasDaSessao(SessaoController sessao) => <RouteBase>[
  GoRoute(
    path: rotaSessao,
    pageBuilder: (context, state) => _semTransicao(state, SessaoPage(sessao: sessao)),
  ),
  GoRoute(
    path: rotaSessaoPendente,
    pageBuilder: (context, state) => _semTransicao(state, SessaoPendentePage(sessao: sessao)),
  ),
];
