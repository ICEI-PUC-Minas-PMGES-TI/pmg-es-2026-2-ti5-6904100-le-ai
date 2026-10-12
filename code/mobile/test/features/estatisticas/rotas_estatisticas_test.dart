import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/features/estatisticas/rotas_estatisticas.dart';
import 'package:le_ai_mobile/features/estatisticas/textos.dart';

import 'apoio_estatisticas.dart';

void main() {
  late GoRouter roteador;
  late List<Uri> pedidas;

  Future<void> montar(WidgetTester tester, {String inicial = '/perfil'}) async {
    usarTelaDeCelular(tester);
    pedidas = <Uri>[];
    final deps = DependenciasDeEstatisticas(
      servico: estatisticasSimulado((pedido) async {
        pedidas.add(pedido.url);
        return pedido.url.path.endsWith('graficos')
            ? json(graficosJson(), 200)
            : json(estatisticasJson(), 200);
      }),
      rotaDaEstante: '/estante',
    );
    roteador = GoRouter(
      initialLocation: inicial,
      routes: <RouteBase>[
        ShellRoute(
          builder: (context, state, child) => Scaffold(body: child),
          routes: <RouteBase>[
            GoRoute(
              path: '/perfil',
              builder: (context, state) => secaoDasEstatisticas(context, deps),
              routes: rotasDasEstatisticas(deps),
            ),
          ],
        ),
      ],
    );
    addTearDown(roteador.dispose);
    await tester.pumpWidget(MaterialApp.router(theme: AppTheme.light(), routerConfig: roteador));
    await tester.pumpAndSettle();
  }

  testWidgets('do bloco ao painel, o período vai para a rota, e a seta volta ao perfil', (
    tester,
  ) async {
    await montar(tester);

    await tester.tap(find.text(TextosDoBloco.verEstatisticas));
    await tester.pumpAndSettle();
    expect(roteador.state.uri.path, rotaEstatisticas);

    await tester.tap(find.bySemanticsLabel('2025'));
    await tester.pumpAndSettle();
    expect(roteador.state.uri.toString(), '$rotaEstatisticas?periodo=2025');
    expect(pedidas.last.query, 'periodo=2025');

    await tester.tap(find.bySemanticsLabel('Voltar'));
    await tester.pumpAndSettle();
    expect(roteador.state.uri.path, '/perfil');
  });

  testWidgets('o painel aberto direto pela rota abre no período dela', (tester) async {
    await montar(tester, inicial: '$rotaEstatisticas?periodo=acumulado');

    // O `/perfil` por baixo monta o bloco, que pede o ano corrente; o painel pede o acumulado.
    expect(pedidas.where((u) => u.query == 'periodo=acumulado').map((u) => u.path), <String>[
      '/me/estatisticas',
      '/me/estatisticas/graficos',
    ]);
    expect(find.text('Desde 12 de novembro de 2023, seu primeiro registro'), findsOneWidget);
  });
}
