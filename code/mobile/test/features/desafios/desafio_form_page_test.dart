import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/desafios/desafio_form_page.dart';
import 'package:le_ai_mobile/features/desafios/desafios_service.dart';

import 'apoio_desafios.dart';

void main() {
  late List<http.Request> pedidos;
  late int concluidas;

  Future<void> montar(
    WidgetTester tester,
    Future<http.Response> Function(http.Request) responder, {
    Desafio? desafio,
  }) async {
    usarTelaDeCelular(tester);
    pedidos = <http.Request>[];
    concluidas = 0;
    await tester.pumpWidget(
      envolver(
        DesafioFormPage(
          servico: desafiosSimulado((pedido) {
            pedidos.add(pedido);
            return responder(pedido);
          }),
          desafio: desafio,
          aoConcluir: () => concluidas++,
          hoje: () => DateTime(2026, 9, 25),
        ),
      ),
    );
    await tester.pump();
  }

  Finder botao(String texto) => find.widgetWithText(ElevatedButton, texto);
  Finder campo() => find.byType(TextField);

  Future<void> escolher(WidgetTester tester, String rotulo) async {
    await tocar(tester, find.text(rotulo));
    await tester.pump();
  }

  /// Sai do campo, como quem toca fora dele.
  Future<void> sair(WidgetTester tester) async {
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pump();
  }

  testWidgets('criação começa sem nada escolhido e com o botão desabilitado', (tester) async {
    await montar(tester, (_) async => json(desafioJson(), 201));

    expect(find.text('Novo desafio'), findsOneWidget);
    expect(find.text('Escolha uma unidade para ver o que conta.'), findsOneWidget);
    expect(find.text('Um número inteiro maior que zero.'), findsOneWidget);
    expect(find.textContaining('Seu desafio'), findsNothing);
    expect(find.text('Excluir desafio'), findsNothing);
    expect(tester.widget<ElevatedButton>(botao('Criar desafio')).onPressed, isNull);
  });

  testWidgets('com as três escolhas, o resumo, a faixa do período e o botão', (tester) async {
    await montar(tester, (_) async => json(desafioJson(), 201));

    await escolher(tester, 'Páginas');
    expect(find.text('Conta as páginas de cada registro de progresso.'), findsOneWidget);
    await escolher(tester, 'Por mês');
    await tester.enterText(campo(), '600');
    await tester.pump();

    expect(find.text('páginas'), findsOneWidget);
    expect(find.text('Seu desafio: 600 páginas por mês', findRichText: true), findsOneWidget);
    expect(find.text('O que você já registrou em setembro também conta.'), findsOneWidget);
    expect(tester.widget<ElevatedButton>(botao('Criar desafio')).onPressed, isNotNull);
  });

  testWidgets('um livro fica no singular ao lado do campo', (tester) async {
    await montar(tester, (_) async => json(desafioJson(), 201));

    await escolher(tester, 'Livros');
    await tester.enterText(campo(), '1');
    await tester.pump();

    expect(find.text('livro'), findsOneWidget);
    expect(
      find.text('Conta cada leitura ou releitura finalizada. Livro abandonado não conta.'),
      findsOneWidget,
    );
  });

  testWidgets('alvo vazio ou zero só vira erro ao sair do campo', (tester) async {
    await montar(tester, (_) async => json(desafioJson(), 201));

    await escolher(tester, 'Minutos');
    await tester.tap(campo());
    await tester.enterText(campo(), '0');
    await tester.pump();
    expect(find.text('Informe um número maior que zero.'), findsNothing);

    await sair(tester);
    expect(find.text('Informe um número maior que zero.'), findsOneWidget);
    expect(find.text('Um número inteiro maior que zero.'), findsNothing);

    await tester.enterText(campo(), '');
    await tester.pump();
    expect(find.text('Informe quanto você quer alcançar.'), findsOneWidget);
  });

  testWidgets('acima do teto da unidade, a frase do servidor e o botão desabilitado', (
    tester,
  ) async {
    await montar(tester, (_) async => json(desafioJson(), 201));

    await escolher(tester, 'Livros');
    await escolher(tester, 'Por ano');
    await tester.enterText(campo(), '1001');
    await tester.pump();

    expect(find.text('Para livros, o alvo vai de 1 a 1.000.'), findsOneWidget);
    expect(tester.widget<ElevatedButton>(botao('Criar desafio')).onPressed, isNull);
    expect(find.textContaining('Seu desafio'), findsNothing);

    // O mesmo número vale para páginas.
    await escolher(tester, 'Páginas');
    expect(find.text('Para livros, o alvo vai de 1 a 1.000.'), findsNothing);
    expect(tester.widget<ElevatedButton>(botao('Criar desafio')).onPressed, isNotNull);
  });

  testWidgets('criar manda a configuração com o fuso e volta para a lista', (tester) async {
    await montar(tester, (_) async => json(desafioJson(), 201));

    await escolher(tester, 'Páginas');
    await escolher(tester, 'Por dia');
    await tester.enterText(campo(), '20');
    await tester.pump();
    await tocar(tester, botao('Criar desafio'));
    await assentar(tester);

    final post = pedidos.single;
    expect(post.method, 'POST');
    expect(post.url.path, '/desafios');
    expect(jsonDecode(post.body), <String, Object?>{
      'unidade': 'paginas',
      'janela': 'diaria',
      'valorAlvo': 20,
      'fusoHorario': 'America/Sao_Paulo',
    });
    expect(concluidas, 1);
  });

  testWidgets('falha de rede: banner, dados mantidos e o reenvio repete a chave', (tester) async {
    var falhar = true;
    await montar(
      tester,
      (_) async => falhar ? erro(503, 'SERVICO_INDISPONIVEL', 'Fora.') : json(desafioJson(), 201),
    );

    await escolher(tester, 'Páginas');
    await escolher(tester, 'Por dia');
    await tester.enterText(campo(), '20');
    await tester.pump();
    await tocar(tester, botao('Criar desafio'));
    await assentar(tester);

    expect(
      find.text('Não foi possível criar o desafio. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );
    expect(concluidas, 0);

    falhar = false;
    await tocar(tester, botao('Criar desafio'));
    await assentar(tester);

    final chaves = pedidos.map((p) => p.headers['Idempotency-Key']).toSet();
    expect(chaves, hasLength(1));
    expect(concluidas, 1);
  });

  testWidgets('422 com campos.valorAlvo cai no campo, sem banner', (tester) async {
    await montar(
      tester,
      (_) async => erro(422, 'ENTIDADE_NAO_PROCESSAVEL', 'Alvo fora da faixa.', <String, Object?>{
        'campos': <Object?>[
          <String, Object?>{
            'campo': 'valorAlvo',
            'mensagem': 'Para minutos, o alvo vai de 1 a 100.000.',
          },
        ],
      }),
    );

    await escolher(tester, 'Minutos');
    await escolher(tester, 'Por semana');
    await tester.enterText(campo(), '150');
    await tester.pump();
    await tocar(tester, botao('Criar desafio'));
    await assentar(tester);

    expect(find.text('Para minutos, o alvo vai de 1 a 100.000.'), findsOneWidget);
    expect(find.textContaining('Não foi possível criar'), findsNothing);
  });

  group('edição', () {
    Desafio salvo({bool pausado = false}) => Desafio.fromJson(
      desafioJson(
        unidade: 'minutos',
        janela: 'semanal',
        alvo: 150,
        acumulado: 95,
        pausado: pausado,
      ),
    );

    testWidgets('vem preenchida, sem mudança não salva, e a faixa fala da semana', (tester) async {
      await montar(tester, (_) async => json(desafioJson(), 200), desafio: salvo());

      expect(find.text('Editar desafio'), findsOneWidget);
      expect(find.text('Seu desafio: 150 minutos por semana', findRichText: true), findsOneWidget);
      expect(
        find.text(
          'A mudança vale para esta semana, que é recalculada. Semanas que já terminaram '
          'continuam como estavam.',
        ),
        findsOneWidget,
      );
      expect(tester.widget<ElevatedButton>(botao('Salvar alterações')).onPressed, isNull);
      expect(find.text('Excluir desafio'), findsOneWidget);
      expect(find.text('Continua pausado depois de salvar.'), findsNothing);
    });

    testWidgets('trocar semanal por mensal: faixa com o mês novo e o plural antigo; PATCH só com '
        'a mudança', (tester) async {
      await montar(tester, (_) async => json(desafioJson(), 200), desafio: salvo());

      await escolher(tester, 'Por mês');
      expect(
        find.text(
          'A mudança vale para setembro, que é recalculado. Semanas que já terminaram continuam '
          'como estavam.',
        ),
        findsOneWidget,
      );
      await tocar(tester, botao('Salvar alterações'));
      await assentar(tester);

      final patch = pedidos.single;
      expect(patch.method, 'PATCH');
      expect(patch.url.path, '/desafios/$idDoDesafio');
      expect(jsonDecode(patch.body), <String, Object?>{
        'janela': 'mensal',
        'fusoHorario': 'America/Sao_Paulo',
      });
      expect(concluidas, 1);
    });

    testWidgets('pausado avisa que continua pausado', (tester) async {
      await montar(tester, (_) async => json(desafioJson(), 200), desafio: salvo(pausado: true));

      expect(find.text('Pausado'), findsOneWidget);
      expect(find.text('Continua pausado depois de salvar.'), findsOneWidget);
    });

    testWidgets('excluir pede confirmação com o título salvo e volta para a lista', (tester) async {
      await montar(tester, (_) async => http.Response('', 204), desafio: salvo());

      await tester.enterText(campo(), '200');
      await tester.pump();
      await tocar(tester, find.widgetWithText(OutlinedButton, 'Excluir desafio'));
      await tester.pumpAndSettle();

      expect(find.text('Excluir o desafio 150 minutos por semana?'), findsOneWidget);
      expect(pedidos, isEmpty);

      await tester.tap(find.widgetWithText(OutlinedButton, 'Excluir desafio').last);
      await tester.pumpAndSettle();

      expect(pedidos.single.method, 'DELETE');
      expect(pedidos.single.url.path, '/desafios/$idDoDesafio');
      expect(concluidas, 1);
    });
  });
}
