import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/design/widgets/banner_aviso.dart';
import 'package:le_ai_mobile/features/desafios/desafios_do_perfil.dart';
import 'package:le_ai_mobile/features/desafios/widgets_de_desafios.dart';
import 'package:le_ai_mobile/features/perfil/perfil_page.dart';
import 'package:le_ai_mobile/features/perfil/perfil_service.dart';

import 'apoio_desafios.dart';

const String _segundo = 'eeeeeeee-2222-4222-8222-eeeeeeeeeeee';

void main() {
  late List<Uri> pedidas;
  late int verTodos;
  late int criar;

  Widget bloco(
    Future<http.Response> Function(http.Request) responder, {
    Listenable? alteracoesDeLeitura,
  }) {
    pedidas = <Uri>[];
    verTodos = 0;
    criar = 0;
    return DesafiosDoPerfil(
      servico: desafiosSimulado((pedido) {
        pedidas.add(pedido.url);
        return responder(pedido);
      }),
      alteracoesDeLeitura: alteracoesDeLeitura,
      aoVerTodos: () => verTodos++,
      aoCriar: () => criar++,
    );
  }

  Future<void> montar(
    WidgetTester tester,
    Future<http.Response> Function(http.Request) responder, {
    Listenable? alteracoesDeLeitura,
  }) async {
    usarTelaDeCelular(tester);
    await tester.pumpWidget(
      envolver(
        Padding(
          padding: const EdgeInsets.all(20),
          child: bloco(responder, alteracoesDeLeitura: alteracoesDeLeitura),
        ),
      ),
    );
    await assentar(tester);
  }

  testWidgets('dois ativos em cards compactos e "Mais N desafios" contando os pausados', (
    tester,
  ) async {
    await montar(
      tester,
      (_) async => json(
        paginaDeDesafios(
          <Map<String, Object?>>[
            desafioJson(),
            desafioJson(
              id: _segundo,
              unidade: 'minutos',
              janela: 'semanal',
              alvo: 150,
              acumulado: 95,
            ),
          ],
          totalItens: 5,
          totalPaginas: 3,
        ),
        200,
      ),
    );

    expect(pedidas.single.path, '/desafios');
    expect(pedidas.single.queryParameters['limite'], '2');
    expect(find.text('Desafios'), findsOneWidget);
    expect(find.text('Ver todos'), findsOneWidget);
    expect(find.byType(CartaoCompactoDeDesafio), findsNWidgets(2));
    expect(find.text('Faltam 8 páginas'), findsOneWidget);
    expect(find.text('Mais 3 desafios'), findsOneWidget);

    await tester.tap(find.byType(CartaoCompactoDeDesafio).first);
    await tester.tap(find.text('Ver todos'));
    expect(verTodos, 2);
  });

  testWidgets('pausado não vira card; com um só a mais, "Mais 1 desafio"', (tester) async {
    await montar(
      tester,
      (_) async => json(
        paginaDeDesafios(<Map<String, Object?>>[
          desafioJson(),
          desafioJson(id: _segundo, pausado: true),
        ], totalItens: 2),
        200,
      ),
    );

    expect(find.byType(CartaoCompactoDeDesafio), findsOneWidget);
    expect(find.text('Mais 1 desafio'), findsOneWidget);
  });

  testWidgets('sem "Mais" quando os dois são todos', (tester) async {
    await montar(
      tester,
      (_) async => json(
        paginaDeDesafios(<Map<String, Object?>>[desafioJson(), desafioJson(id: _segundo)]),
        200,
      ),
    );

    expect(find.byType(CartaoCompactoDeDesafio), findsNWidgets(2));
    expect(find.textContaining('Mais'), findsNothing);
  });

  testWidgets('só pausados: cabeçalho com "Ver todos" e quantos estão pausados', (tester) async {
    await montar(
      tester,
      (_) async => json(
        paginaDeDesafios(
          <Map<String, Object?>>[
            desafioJson(pausado: true),
            desafioJson(id: _segundo, pausado: true),
          ],
          totalItens: 3,
          totalPaginas: 2,
        ),
        200,
      ),
    );

    expect(find.byType(CartaoCompactoDeDesafio), findsNothing);
    expect(find.text('Ver todos'), findsOneWidget);
    expect(find.text('3 desafios pausados'), findsOneWidget);
  });

  testWidgets('vazio: convite e "Novo desafio" abre a criação, sem "Ver todos"', (tester) async {
    await montar(tester, (_) async => json(paginaDeDesafios(<Map<String, Object?>>[]), 200));

    expect(
      find.text('Escolha um alvo curto, como páginas por dia ou livros por ano.'),
      findsOneWidget,
    );
    expect(find.text('Ver todos'), findsNothing);
    await tester.tap(find.text('Novo desafio'));
    expect(criar, 1);
  });

  testWidgets('falha mostra o banner do bloco e "Tentar de novo" recarrega', (tester) async {
    var falhar = true;
    await montar(
      tester,
      (_) async => falhar
          ? erro(503, 'SERVICO_INDISPONIVEL', 'Fora.')
          : json(paginaDeDesafios(<Map<String, Object?>>[desafioJson()]), 200),
    );

    expect(
      find.text('Não foi possível carregar seus desafios. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );
    falhar = false;
    await tester.tap(find.text('Tentar de novo'));
    await assentar(tester);

    expect(find.byType(BannerAviso), findsNothing);
    expect(find.byType(CartaoCompactoDeDesafio), findsOneWidget);
  });

  testWidgets('progresso registrado recarrega uma vez depois do consumo assíncrono', (
    tester,
  ) async {
    final avisos = ValueNotifier<int>(0);
    addTearDown(avisos.dispose);
    var acumulado = 12;
    await montar(
      tester,
      (_) async =>
          json(paginaDeDesafios(<Map<String, Object?>>[desafioJson(acumulado: acumulado)]), 200),
      alteracoesDeLeitura: avisos,
    );

    acumulado = 20;
    avisos.value++;
    avisos.value++;
    await tester.pump(const Duration(seconds: 1));
    expect(pedidas, hasLength(1));
    await tester.pump(const Duration(seconds: 3));
    await assentar(tester);

    expect(pedidas, hasLength(2));
    expect(find.text('Cumprido hoje'), findsOneWidget);
  });

  testWidgets('recarga silenciosa que falha mantém os cards', (tester) async {
    final avisos = ValueNotifier<int>(0);
    addTearDown(avisos.dispose);
    var falhar = false;
    await montar(
      tester,
      (_) async => falhar
          ? erro(503, 'SERVICO_INDISPONIVEL', 'Fora.')
          : json(paginaDeDesafios(<Map<String, Object?>>[desafioJson()]), 200),
      alteracoesDeLeitura: avisos,
    );

    falhar = true;
    avisos.value++;
    await tester.pump(const Duration(seconds: 4));
    await assentar(tester);

    expect(find.byType(BannerAviso), findsNothing);
    expect(find.byType(CartaoCompactoDeDesafio), findsOneWidget);
  });

  group('no Meu perfil', () {
    PerfilService identidade() => PerfilService(
      ApiClient(
        baseUrl: 'https://identidade.example.com',
        client: MockClient((request) async {
          if (request.url.path == '/me/perfil') {
            return json(<String, Object?>{
              'id': 'u1',
              'username': 'marinableu',
              'displayName': 'Marina Beltrão',
              'avatarUrl': null,
              'privacidade': 'publico',
              'conteudoRestrito': false,
              'relacao': 'proprio',
              'biografia': null,
              'contadores': <String, Object?>{'seguidores': 84, 'seguidos': 97},
            }, 200);
          }
          return json(<String, Object?>{
            'items': <Object?>[],
            'page': 0,
            'size': 1,
            'totalElements': 0,
            'totalPages': 0,
          }, 200);
        }),
        esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
      ),
    );

    testWidgets('o bloco entra depois dos contadores e antes da Estante', (tester) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          PerfilPage(
            servico: identidade(),
            desafios: () => bloco(
              (_) async => json(paginaDeDesafios(<Map<String, Object?>>[desafioJson()]), 200),
            ),
          ),
        ),
      );
      await assentar(tester);

      final titulo = tester.getTopLeft(find.text('Desafios')).dy;
      expect(tester.getTopLeft(find.text('seguindo')).dy, lessThan(titulo));
      expect(tester.getTopLeft(find.text('Estante')).dy, greaterThan(titulo));
    });

    testWidgets('falha dos desafios não derruba o perfil', (tester) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          PerfilPage(
            servico: identidade(),
            desafios: () => bloco((_) async => erro(503, 'SERVICO_INDISPONIVEL', 'Fora.')),
          ),
        ),
      );
      await assentar(tester);

      expect(find.text('Marina Beltrão'), findsOneWidget);
      expect(
        find.text(
          'Não foi possível carregar seus desafios. Verifique sua conexão e tente de novo.',
        ),
        findsOneWidget,
      );
    });
  });
}
