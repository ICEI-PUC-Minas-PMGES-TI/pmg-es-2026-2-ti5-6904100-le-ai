import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/descobrir/descobrir_page.dart';

import '../livros/apoio.dart';
import 'massa_da_busca.dart';

void main() {
  late List<String> abertos;
  late int cadastrosPorIsbn;
  late int cadastrosPessoais;

  Future<void> montar(
    WidgetTester tester,
    Future<http.Response> Function(http.Request request) responder, {
    bool escuro = false,
  }) async {
    usarTelaDeCelular(tester);
    abertos = <String>[];
    cadastrosPorIsbn = 0;
    cadastrosPessoais = 0;
    final servico = acervoSimulado((request) {
      if (request.url.path == '/assuntos') {
        return Future<http.Response>.value(json(assuntosJson, 200));
      }
      return responder(request);
    });
    await tester.pumpWidget(
      envolver(
        DescobrirPage(
          servico: servico,
          aoAbrirLivro: abertos.add,
          aoCadastrarPorIsbn: () => cadastrosPorIsbn++,
          aoCadastrarPessoal: () => cadastrosPessoais++,
        ),
        escuro: escuro,
      ),
    );
    await tester.pump();
  }

  Future<void> digitar(WidgetTester tester, String texto) async {
    await tester.enterText(find.byType(TextField), texto);
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump();
  }

  Future<http.Response> resultadosDeEvaristo(http.Request request) async => json(
    paginaJson(<Map<String, Object?>>[
      livroJson('ponc-2018', 'Ponciá Vicêncio', ano: 2018),
      livroJson('ponc-2017', 'Ponciá Vicêncio', ano: 2017),
      livroJson('ponc-2003', 'Ponciá Vicêncio', ano: 2003),
      livroJson('becos', 'Becos da Memória', ano: 2006, paginas: 200),
    ], totalItens: 12),
    200,
  );

  testWidgets('aterrissagem: campo sem foco, assuntos e nada mais', (tester) async {
    await montar(tester, resultadosDeEvaristo);

    expect(find.text('Título, autor, editora ou ISBN'), findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).autofocus, isFalse);
    expect(find.text('Romance'), findsOneWidget);
    expect(find.textContaining('encontrado'), findsNothing);
    expect(find.text('Nenhum livro encontrado'), findsNothing);
  });

  testWidgets('resultados: contagem, card sem nota e as edições agrupadas', (tester) async {
    await montar(tester, resultadosDeEvaristo);
    await digitar(tester, 'conceição evaristo');

    expect(find.text('12 livros encontrados'), findsOneWidget);
    // Sem capa, o placeholder textual repete título e autor dentro do card.
    expect(find.text('Ponciá Vicêncio'), findsNWidgets(2));
    expect(find.text('Pallas · 2018'), findsOneWidget);
    expect(find.text('128 páginas'), findsOneWidget);
    expect(find.text('3 edições'), findsOneWidget);
    expect(find.text('Becos da Memória'), findsNWidgets(2));

    await tester.tap(find.text('Becos da Memória').last);
    expect(abertos, <String>['becos']);
  });

  testWidgets('"N edições" expande as outras, e cada uma abre a própria página', (tester) async {
    await montar(tester, resultadosDeEvaristo);
    await digitar(tester, 'poncia');

    expect(find.text('Pallas · 2017 · 128 páginas'), findsNothing);
    await tester.tap(find.text('3 edições'));
    await tester.pump();

    expect(find.text('Pallas · 2017 · 128 páginas'), findsOneWidget);
    expect(find.text('Pallas · 2003 · 128 páginas'), findsOneWidget);
    await tester.tap(find.text('Pallas · 2003 · 128 páginas'));
    expect(abertos, <String>['ponc-2003']);
  });

  testWidgets('omite editora, ano e autor que faltam', (tester) async {
    await montar(
      tester,
      (request) async => json(
        paginaJson(<Map<String, Object?>>[
          livroJson(
            'l1',
            'Poemas esparsos',
            autores: const <Map<String, String>>[],
            editora: null,
            ano: null,
            paginas: 1,
          ),
        ]),
        200,
      ),
    );
    await digitar(tester, 'poemas');

    expect(find.text('1 livro encontrado'), findsOneWidget);
    expect(find.text('1 página'), findsOneWidget);
    expect(find.textContaining('·'), findsNothing);
  });

  testWidgets('filtro por assunto: um chip ativo por vez, com o X para remover', (tester) async {
    final assuntosPedidos = <String?>[];
    await montar(tester, (request) async {
      assuntosPedidos.add(request.url.queryParameters['assunto']);
      return resultadosDeEvaristo(request);
    });

    await tester.tap(find.text('Terror'));
    await tester.pump();
    await tester.pump();
    expect(assuntosPedidos.last, 'terror');
    expect(find.bySemanticsLabel('Terror, filtro ativo. Toque para remover.'), findsOneWidget);

    await tester.tap(find.text('Romance'));
    await tester.pump();
    await tester.pump();
    expect(assuntosPedidos.last, 'romance');
    expect(find.bySemanticsLabel(RegExp('filtro ativo')), findsOneWidget);

    await tester.tap(find.text('Romance'));
    await tester.pump();
    expect(find.bySemanticsLabel(RegExp('filtro ativo')), findsNothing);
    expect(find.text('Título, autor, editora ou ISBN'), findsOneWidget);
  });

  testWidgets('nenhum resultado oferece os dois cadastros', (tester) async {
    await montar(tester, (request) async => json(paginaJson(<Map<String, Object?>>[]), 200));
    await digitar(tester, 'guimaraes rossa');

    expect(find.text('Nenhum livro encontrado'), findsOneWidget);
    await tocar(tester, find.text('Cadastrar por ISBN'));
    await tocar(tester, find.text('Cadastrar livro pessoal'));
    expect(cadastrosPorIsbn, 1);
    expect(cadastrosPessoais, 1);
  });

  testWidgets('falha mostra o banner, e "Tentar de novo" busca outra vez', (tester) async {
    var falhar = true;
    await montar(tester, (request) async {
      if (falhar) {
        return http.Response('', 500);
      }
      return resultadosDeEvaristo(request);
    });
    await digitar(tester, 'conceição evaristo');

    expect(
      find.text('Não foi possível carregar os resultados. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );
    falhar = false;
    await tester.tap(find.text('Tentar de novo'));
    await tester.pump();
    await tester.pump();
    expect(find.text('12 livros encontrados'), findsOneWidget);
  });

  testWidgets('carregando mostra o skeleton, e o cold start vira aviso, não erro', (tester) async {
    final demorada = Completer<http.Response>();
    await montar(tester, (request) => demorada.future);
    await tester.enterText(find.byType(TextField), 'conceição evaristo');
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.textContaining('encontrado'), findsNothing);
    expect(find.text('O servidor está iniciando. Isso pode levar alguns segundos.'), findsNothing);

    await tester.pump(const Duration(seconds: 3));
    expect(
      find.text('O servidor está iniciando. Isso pode levar alguns segundos.'),
      findsOneWidget,
    );

    demorada.complete(await resultadosDeEvaristo(http.Request('GET', Uri())));
    await tester.pump();
    expect(find.text('12 livros encontrados'), findsOneWidget);
  });

  testWidgets('limpar o campo volta à aterrissagem', (tester) async {
    await montar(tester, resultadosDeEvaristo);
    await digitar(tester, 'conceição evaristo');

    await tester.tap(find.byTooltip('Limpar busca'));
    await tester.pump();

    expect(find.text('Título, autor, editora ou ISBN'), findsOneWidget);
    expect(find.textContaining('encontrado'), findsNothing);
  });

  testWidgets('rolar até o fim traz a próxima página e o grupo cresce', (tester) async {
    await montar(tester, (request) async {
      final page = int.parse(request.url.queryParameters['page']!);
      if (page == 1) {
        return json(
          paginaJson(
            <Map<String, Object?>>[
              for (var i = 0; i < 19; i++) livroJson('l$i', 'Livro $i', autores: const []),
              livroJson('ponc-2018', 'Ponciá Vicêncio', ano: 2018),
            ],
            totalItens: 21,
            totalPaginas: 2,
          ),
          200,
        );
      }
      return json(
        paginaJson(
          <Map<String, Object?>>[livroJson('ponc-2003', 'Ponciá Vicêncio', ano: 2003)],
          page: 2,
          totalItens: 21,
          totalPaginas: 2,
        ),
        200,
      );
    });
    await digitar(tester, 'livro');

    await tester.drag(find.byType(ListView).last, const Offset(0, -4000));
    await tester.pump();
    await tester.pump();

    expect(find.text('2 edições'), findsOneWidget);
  });

  testWidgets('modo escuro monta sem erro', (tester) async {
    await montar(tester, resultadosDeEvaristo, escuro: true);
    await digitar(tester, 'conceição evaristo');
    expect(find.text('12 livros encontrados'), findsOneWidget);
  });
}
