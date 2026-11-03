import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/listas/listas_do_leitor_page.dart';
import 'package:le_ai_mobile/features/listas/listas_do_perfil.dart';

import 'apoio_listas.dart';

void main() {
  late List<http.Request> pedidos;
  late List<String> abertas;

  setUp(() {
    pedidos = <http.Request>[];
    abertas = <String>[];
  });

  Future<void> montarIndice(
    WidgetTester tester, {
    String? username,
    required Future<http.Response> Function(http.Request) social,
    required Future<http.Response> Function(http.Request) identidade,
  }) async {
    usarTelaDeCelular(tester);
    await tester.pumpWidget(
      envolver(
        ListasDoLeitorPage(
          servico: listasSimulado((pedido) {
            pedidos.add(pedido);
            return social(pedido);
          }),
          perfil: perfilSimulado(identidade),
          username: username,
          aoAbrirLista: abertas.add,
          aoAbrirPerfil: (_) {},
        ),
      ),
    );
    await tester.pump();
    await tester.pump();
    await tester.pump();
  }

  final tresListas = paginaJson(<Map<String, Object?>>[
    resumoJson(id: 'l1', titulo: 'Contos que eu indico', quantidade: 7),
    resumoJson(id: 'l2', titulo: 'Autoras negras brasileiras', quantidade: 6),
    resumoJson(id: 'l3', titulo: 'Para ler numa viagem', quantidade: 1),
  ]);

  testWidgets('minhas listas: contagem, "Nova lista", visibilidade e cards que abrem', (
    tester,
  ) async {
    await montarIndice(
      tester,
      social: (_) async => json(tresListas, 200),
      identidade: (_) async => json(perfilJson(relacao: 'proprio', privacidade: 'privado'), 200),
    );

    expect(pedidos.single.url.path, '/me/listas');
    expect(find.text('Listas'), findsOneWidget);
    expect(find.text('3 listas'), findsOneWidget);
    expect(find.text('Nova lista'), findsOneWidget);
    expect(
      find.text('Seu perfil é privado: só quem você aceitou como seguidor vê suas listas.'),
      findsOneWidget,
    );
    expect(find.text('1 livro'), findsOneWidget);

    await tester.tap(find.text('Autoras negras brasileiras'));
    expect(abertas, <String>['l2']);
  });

  testWidgets('minhas listas, vazio: o convite tem a única "Nova lista"', (tester) async {
    await montarIndice(
      tester,
      social: (_) async => json(paginaJson(const <Map<String, Object?>>[]), 200),
      identidade: (_) async => json(perfilJson(relacao: 'proprio'), 200),
    );

    expect(find.text('Você ainda não tem listas'), findsOneWidget);
    expect(find.text('Nova lista'), findsOneWidget);
    expect(find.textContaining('listas'), findsWidgets);
    expect(find.text('0 listas'), findsNothing);
  });

  testWidgets('outro leitor: "Listas de" e as listas do perfil pelo id', (tester) async {
    await montarIndice(
      tester,
      username: 'rafael',
      social: (_) async => json(tresListas, 200),
      identidade: (_) async => json(perfilJson(), 200),
    );

    expect(pedidos.single.url.path, '/perfis/u-rafael/listas');
    expect(find.text('Listas de '), findsOneWidget);
    expect(find.text('Rafael Okamoto'), findsOneWidget);
    expect(find.text('Nova lista'), findsNothing);
  });

  testWidgets('outro leitor com conteúdo restrito: bloco RN-08 sem consultar o social', (
    tester,
  ) async {
    await montarIndice(
      tester,
      username: 'beatriz',
      social: (_) async => json(tresListas, 200),
      identidade: (_) async => json(
        perfilJson(
          id: 'u-bia',
          username: 'beatriz',
          nome: 'Beatriz Souza',
          privacidade: 'privado',
          restrito: true,
        ),
        200,
      ),
    );

    expect(find.text('Este perfil é privado'), findsOneWidget);
    expect(find.text('Só quem Beatriz aceita como seguidor vê as listas.'), findsOneWidget);
    expect(find.text('Contos que eu indico'), findsNothing);
    expect(pedidos, isEmpty);
  });

  testWidgets('403 do social também vira o bloco de restrição', (tester) async {
    await montarIndice(
      tester,
      username: 'beatriz',
      social: (_) async => erro(403, 'ACESSO_NEGADO', 'Este perfil é privado.'),
      identidade: (_) async => json(perfilJson(username: 'beatriz', nome: 'Beatriz Souza'), 200),
    );

    expect(find.text('Este perfil é privado'), findsOneWidget);
    expect(find.text('Ver perfil de Beatriz'), findsOneWidget);
  });

  testWidgets('seção do perfil: três listas, "Ver todas" e "Nova lista" do dono', (tester) async {
    usarTelaDeCelular(tester);
    await tester.pumpWidget(
      envolver(
        SingleChildScrollView(
          child: ListasDoPerfil(
            servico: listasSimulado((pedido) async {
              pedidos.add(pedido);
              return json(tresListas, 200);
            }),
            usuarioId: 'u-marina',
            proprio: true,
            aoVerTodas: () => abertas.add('todas'),
            aoAbrirLista: abertas.add,
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(pedidos.single.url.path, '/perfis/u-marina/listas');
    expect(pedidos.single.url.queryParameters['size'], '3');
    expect(find.text('Contos que eu indico'), findsOneWidget);
    expect(find.text('Nova lista'), findsOneWidget);

    await tester.tap(find.text('Ver todas'));
    expect(abertas, <String>['todas']);
  });

  testWidgets('seção de outro leitor sem listas: frase com o nome, sem botão', (tester) async {
    usarTelaDeCelular(tester);
    await tester.pumpWidget(
      envolver(
        SingleChildScrollView(
          child: ListasDoPerfil(
            servico: listasSimulado(
              (_) async => json(paginaJson(const <Map<String, Object?>>[]), 200),
            ),
            usuarioId: 'u-rafael',
            proprio: false,
            nome: 'Rafael',
            aoVerTodas: () {},
            aoAbrirLista: (_) {},
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Rafael ainda não criou listas.'), findsOneWidget);
    expect(find.text('Ver todas'), findsNothing);
    expect(find.text('Nova lista'), findsNothing);
  });
}
