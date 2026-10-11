import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/features/desafios/rotas_desafios.dart';

import 'apoio_desafios.dart';

/// O botão de ações do card, pelo rótulo do `Semantics` dele.
Finder _acoes(String titulo) => find.byWidgetPredicate(
  (widget) => widget is Semantics && widget.properties.label == 'Ações do desafio $titulo',
);

void main() {
  late GoRouter roteador;

  Future<void> montar(WidgetTester tester, {String inicial = '/perfil'}) async {
    usarTelaDeCelular(tester);
    final deps = DependenciasDeDesafios(
      servico: desafiosSimulado(
        (_) async => json(
          paginaDeDesafios(<Map<String, Object?>>[
            desafioJson(unidade: 'minutos', janela: 'semanal', alvo: 150, acumulado: 95),
          ]),
          200,
        ),
      ),
    );
    roteador = GoRouter(
      initialLocation: inicial,
      routes: <RouteBase>[
        // O `Scaffold` do shell autenticado.
        ShellRoute(
          builder: (context, state, child) => Scaffold(body: child),
          routes: <RouteBase>[
            GoRoute(
              path: '/perfil',
              builder: (context, state) => secaoDosDesafios(context, deps),
              routes: rotasDosDesafios(deps),
            ),
          ],
        ),
      ],
    );
    addTearDown(roteador.dispose);
    await tester.pumpWidget(MaterialApp.router(theme: AppTheme.light(), routerConfig: roteador));
    await tester.pumpAndSettle();
  }

  testWidgets('do bloco à lista, da lista à edição com o desafio, e de volta', (tester) async {
    await montar(tester);

    await tester.tap(find.text('Ver todos'));
    await tester.pumpAndSettle();
    expect(roteador.state.uri.path, rotaDesafios);

    await tester.tap(_acoes('150 minutos por semana'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Editar desafio'));
    await tester.pumpAndSettle();

    expect(roteador.state.uri.path, rotaEditarDesafio(idDoDesafio));
    expect(find.text('Seu desafio: 150 minutos por semana', findRichText: true), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Voltar'));
    await tester.pumpAndSettle();
    expect(roteador.state.uri.path, rotaDesafios);
  });

  testWidgets('a edição aberta sem o desafio (link direto) volta para a lista', (tester) async {
    await montar(tester, inicial: rotaEditarDesafio(idDoDesafio));

    expect(roteador.state.uri.path, rotaDesafios);
    expect(find.text('150 minutos por semana', findRichText: true), findsOneWidget);
  });

  testWidgets('"Novo desafio" do header abre a criação', (tester) async {
    await montar(tester, inicial: rotaDesafios);

    await tester.tap(find.bySemanticsLabel('Novo desafio'));
    await tester.pumpAndSettle();

    expect(roteador.state.uri.path, rotaNovoDesafio);
    expect(find.text('Escolha uma unidade para ver o que conta.'), findsOneWidget);
  });
}
