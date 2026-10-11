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
    String? assuntoInicial,
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
          assuntoInicial: assuntoInicial,
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

  testWidgets('falha da página seguinte não vira laço de pedidos: só o botão tenta de novo', (
    tester,
  ) async {
    final paginasPedidas = <String>[];
    await montar(tester, (request) async {
      final page = request.url.queryParameters['page']!;
      paginasPedidas.add(page);
      if (page == '1') {
        return json(
          paginaJson(
            <Map<String, Object?>>[
              for (var i = 0; i < 20; i++) livroJson('l$i', 'Livro $i', autores: const []),
            ],
            totalItens: 40,
            totalPaginas: 2,
          ),
          200,
        );
      }
      return json(<String, Object?>{'codigo': 'ERRO_INTERNO', 'mensagem': 'Falhou.'}, 500);
    });
    await digitar(tester, 'livro');

    await tester.drag(find.byType(ListView).last, const Offset(0, -6000));
    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 400));
    }

    expect(paginasPedidas.where((page) => page == '2'), hasLength(1));
    expect(find.text('Não foi possível carregar mais resultados.'), findsOneWidget);

    await tocar(tester, find.text('Tentar de novo'));
    await tester.pump();
    await tester.pump();
    expect(paginasPedidas.where((page) => page == '2'), hasLength(2));
  });

  testWidgets('lista que não enche a tela, por edições agrupadas, carrega as páginas seguintes', (
    tester,
  ) async {
    final paginasPedidas = <String>[];
    await montar(tester, (request) async {
      final page = int.parse(request.url.queryParameters['page']!);
      paginasPedidas.add('$page');
      return json(
        paginaJson(
          <Map<String, Object?>>[
            for (var i = 0; i < 20; i++)
              livroJson('p$page-$i', 'Dom Casmurro', ano: 2020 - (page - 1) * 20 - i),
          ],
          page: page,
          totalItens: 60,
          totalPaginas: 3,
        ),
        200,
      );
    });
    await digitar(tester, 'dom casmurro');
    for (var i = 0; i < 6; i++) {
      await tester.pump();
    }

    expect(paginasPedidas, <String>['1', '2', '3']);
    expect(find.text('60 edições'), findsOneWidget);
  });

  testWidgets('lista curta pelo chip, sem foco no campo, também carrega até a última página', (
    tester,
  ) async {
    final paginasPedidas = <String>[];
    await montar(tester, (request) async {
      final page = int.parse(request.url.queryParameters['page']!);
      paginasPedidas.add('$page');
      return json(
        paginaJson(
          <Map<String, Object?>>[
            for (var i = 0; i < 20; i++)
              livroJson('p$page-$i', 'Dom Casmurro', ano: 2020 - (page - 1) * 20 - i),
          ],
          page: page,
          totalItens: 60,
          totalPaginas: 3,
        ),
        200,
      );
    });

    // Sem cursor piscando, nada pede quadro novo: `pumpAndSettle` para quando o app para.
    await tester.tap(find.text('Romance'));
    await tester.pumpAndSettle();

    expect(paginasPedidas, <String>['1', '2', '3']);
  });

  group('filtros avançados (F-ACV-DESCOBERTA)', () {
    /// Os campos da folha, na ordem do protótipo; o primeiro `TextField` é o da busca.
    Finder campoDaFolha(int indice) => find.byType(TextField).at(indice + 1);

    Future<void> abrirFolha(WidgetTester tester) async {
      await tester.tap(find.bySemanticsLabel('Filtros'));
      await tester.pumpAndSettle();
    }

    Future<void> aplicar(WidgetTester tester) async {
      await tocar(tester, find.text('Aplicar filtros'));
      await tester.pumpAndSettle();
    }

    testWidgets('a folha aplica os filtros, que viram chips e badge', (tester) async {
      final pedidas = <Uri>[];
      await montar(tester, (request) async {
        pedidas.add(request.url);
        return resultadosDeEvaristo(request);
      });

      await abrirFolha(tester);
      expect(
        find.text('Preencha só o que quiser usar. Os filtros valem junto com a busca e o assunto.'),
        findsOneWidget,
      );
      await tester.enterText(campoDaFolha(1), 'Pallas');
      await tester.enterText(campoDaFolha(4), '100');
      await tester.enterText(campoDaFolha(5), '150');
      await aplicar(tester);

      expect(pedidas.single.queryParameters, <String, String>{
        'editora': 'Pallas',
        'paginasMin': '100',
        'paginasMax': '150',
        'page': '1',
        'limit': '20',
      });
      expect(find.text('Aplicar filtros'), findsNothing);
      expect(find.bySemanticsLabel('Filtros, 2 ativos'), findsOneWidget);
      expect(find.bySemanticsLabel('Remover filtro Editora: Pallas'), findsOneWidget);
      expect(find.bySemanticsLabel('Remover filtro 100 a 150 páginas'), findsOneWidget);
      expect(find.text('12 livros encontrados'), findsOneWidget);

      await tester.tap(find.bySemanticsLabel('Remover filtro Editora: Pallas'));
      await tester.pumpAndSettle();
      expect(pedidas.last.queryParameters.containsKey('editora'), isFalse);
      expect(find.bySemanticsLabel('Filtros, 1 ativo'), findsOneWidget);
    });

    testWidgets('ano e páginas aceitam só dígitos', (tester) async {
      await montar(tester, resultadosDeEvaristo);
      await abrirFolha(tester);

      await tester.enterText(campoDaFolha(3), '20a19x');
      await tester.enterText(campoDaFolha(4), '-12');

      expect(tester.widget<TextField>(campoDaFolha(3)).controller!.text, '2019');
      expect(tester.widget<TextField>(campoDaFolha(4)).controller!.text, '12');
    });

    testWidgets('faixa invertida não envia e mantém a folha aberta', (tester) async {
      final pedidas = <Uri>[];
      await montar(tester, (request) async {
        pedidas.add(request.url);
        return resultadosDeEvaristo(request);
      });
      await abrirFolha(tester);

      await tester.enterText(campoDaFolha(4), '200');
      await tester.enterText(campoDaFolha(5), '100');
      await aplicar(tester);

      expect(pedidas, isEmpty);
      expect(find.text('O mínimo não pode ser maior que o máximo.'), findsOneWidget);
      expect(find.text('Aplicar filtros'), findsOneWidget);
      expect(tester.widget<TextField>(campoDaFolha(4)).focusNode!.hasFocus, isTrue);
    });

    testWidgets('fechar a folha sem aplicar não busca', (tester) async {
      final pedidas = <Uri>[];
      await montar(tester, (request) async {
        pedidas.add(request.url);
        return resultadosDeEvaristo(request);
      });
      await abrirFolha(tester);
      await tester.enterText(campoDaFolha(0), 'evaristo');

      await tester.tapAt(const Offset(10, 10));
      await tester.pumpAndSettle();

      expect(find.text('Aplicar filtros'), findsNothing);
      expect(pedidas, isEmpty);
      expect(find.bySemanticsLabel('Filtros'), findsOneWidget);
    });

    testWidgets('vazio com filtros não oferece cadastro, e "Limpar filtros" volta à aterrissagem', (
      tester,
    ) async {
      await montar(tester, (request) async => json(paginaJson(<Map<String, Object?>>[]), 200));
      await abrirFolha(tester);
      await tester.enterText(campoDaFolha(4), '5000');
      await aplicar(tester);

      expect(find.text('Nenhum livro com esses filtros'), findsOneWidget);
      expect(
        find.text('Remova um filtro ou amplie a faixa de páginas para ver mais resultados.'),
        findsOneWidget,
      );
      expect(find.text('Cadastrar por ISBN'), findsNothing);

      await tocar(tester, find.widgetWithText(ElevatedButton, 'Limpar filtros'));
      await tester.pumpAndSettle();
      expect(find.text('Nenhum livro com esses filtros'), findsNothing);
      expect(find.bySemanticsLabel('Filtros'), findsOneWidget);
    });

    testWidgets('o assunto vindo da ficha busca na hora', (tester) async {
      final pedidas = <Uri>[];
      await montar(tester, (request) async {
        pedidas.add(request.url);
        return resultadosDeEvaristo(request);
      }, assuntoInicial: 'romance');
      await tester.pump();

      expect(pedidas.single.queryParameters['assunto'], 'romance');
      expect(find.bySemanticsLabel('Romance, filtro ativo. Toque para remover.'), findsOneWidget);
    });

    testWidgets('o assunto da ficha é consumido: o mesmo assunto de novo limpa o texto', (
      tester,
    ) async {
      usarTelaDeCelular(tester);
      final pedidas = <Uri>[];
      final assunto = ValueNotifier<String?>('romance');
      addTearDown(assunto.dispose);
      final servico = acervoSimulado((request) {
        if (request.url.path == '/assuntos') {
          return Future<http.Response>.value(json(assuntosJson, 200));
        }
        pedidas.add(request.url);
        return resultadosDeEvaristo(request);
      });
      await tester.pumpWidget(
        envolver(
          ValueListenableBuilder<String?>(
            valueListenable: assunto,
            builder: (context, valor, _) => DescobrirPage(
              servico: servico,
              aoAbrirLivro: (_) {},
              aoCadastrarPorIsbn: () {},
              aoCadastrarPessoal: () {},
              assuntoInicial: valor,
              // O roteador faz `go('/descobrir')`, que reconstrói a página sem o assunto.
              aoConsumirAssunto: () => assunto.value = null,
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump();
      expect(assunto.value, isNull);

      await digitar(tester, 'evaristo');
      expect(find.text('evaristo'), findsOneWidget);

      assunto.value = 'romance';
      await tester.pump();
      await tester.pump();

      expect(find.text('evaristo'), findsNothing);
      expect(pedidas.last.queryParameters['assunto'], 'romance');
      expect(pedidas.last.queryParameters.containsKey('q'), isFalse);
      expect(find.bySemanticsLabel('Romance, filtro ativo. Toque para remover.'), findsOneWidget);
    });

    testWidgets('abrir um livro solta o foco do campo, para o teclado não voltar na volta', (
      tester,
    ) async {
      await montar(tester, resultadosDeEvaristo);
      await digitar(tester, 'evaristo');
      expect(tester.testTextInput.isVisible, isTrue);

      await tester.tap(find.text('Becos da Memória').last);
      await tester.pump();

      expect(abertos, <String>['becos']);
      final campo = tester.widget<EditableText>(find.byType(EditableText));
      expect(campo.focusNode.hasFocus, isFalse);
    });
  });
}
