import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/design/widgets/banner_aviso.dart';
import 'package:le_ai_mobile/features/estatisticas/estatisticas_page.dart';
import 'package:le_ai_mobile/features/estatisticas/estatisticas_service.dart';
import 'package:le_ai_mobile/features/estatisticas/textos.dart';
import 'package:le_ai_mobile/features/estatisticas/widgets_de_estatisticas.dart';

import 'apoio_estatisticas.dart';

/// O dia dos artboards: 29 de setembro de 2026.
DateTime _hoje() => DateTime(2026, 9, 29);

void main() {
  late List<Uri> pedidas;
  late List<PeriodoEstatisticas> mudancas;
  late int estante;

  setUp(() {
    pedidas = <Uri>[];
    mudancas = <PeriodoEstatisticas>[];
    estante = 0;
  });

  Future<void> montar(
    WidgetTester tester,
    Future<http.Response> Function(http.Request) responder, {
    PeriodoEstatisticas? periodo,
    Listenable? alteracoes,
    Duration timeout = const Duration(seconds: 90),
    bool escuro = false,
  }) async {
    usarTelaDeCelular(tester);
    await tester.pumpWidget(
      envolver(
        EstatisticasPage(
          servico: estatisticasSimulado((pedido) {
            pedidas.add(pedido.url);
            return responder(pedido);
          }, timeout: timeout),
          periodoInicial: periodo,
          aoMudarPeriodo: mudancas.add,
          aoVoltar: () {},
          aoIrParaEstante: () => estante++,
          alteracoesDeLeitura: alteracoes,
          hoje: _hoje,
        ),
        escuro: escuro,
      ),
    );
    await assentar(tester);
  }

  Future<http.Response> padrao(http.Request pedido) async => pedido.url.path.endsWith('graficos')
      ? json(graficosJson(), 200)
      : json(estatisticasJson(), 200);

  testWidgets('abre no ano corrente com totais, médias e gráficos em pt-BR (4.1)', (tester) async {
    await montar(tester, padrao);

    expect(pedidas.map((u) => u.query), <String>['periodo=2026', 'periodo=2026']);
    expect(find.text('De 1º de janeiro a 29 de setembro de 2026'), findsOneWidget);
    expect(find.bySemanticsLabel('Livros concluídos: 9 livros'), findsOneWidget);
    expect(find.bySemanticsLabel('Páginas lidas: 3.818 páginas'), findsOneWidget);
    expect(find.bySemanticsLabel('Tempo de leitura: 71 h 20 min'), findsOneWidget);
    expect(find.text('20,4'), findsOneWidget);
    expect(find.text('19,1'), findsOneWidget);
    expect(find.text('4,2'), findsOneWidget);
    expect(find.text('Média das 8 notas que você deu em 2026.'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text(TextosDasEstatisticas.rodape),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Páginas por mês'), findsOneWidget);
    expect(find.text('Livros concluídos por mês'), findsOneWidget);
    expect(find.text('3.818 páginas de janeiro a setembro'), findsOneWidget);
  });

  testWidgets(
    'a faixa tem os anos e o acumulado, e trocar de período recarrega e vai para a rota',
    (tester) async {
      await montar(tester, (pedido) async {
        final de2025 = pedido.url.query == 'periodo=2025';
        if (pedido.url.path.endsWith('graficos')) {
          return json(graficosJson(ano: de2025 ? 2025 : 2026, ate: de2025 ? 12 : 9), 200);
        }
        return json(
          de2025 ? estatisticasJson(ano: 2025, livros: 14, minutos: 5285) : estatisticasJson(),
          200,
        );
      });

      for (final rotulo in <String>['2026', '2025', '2024', '2023', 'Acumulado']) {
        expect(find.bySemanticsLabel(rotulo), findsOneWidget);
      }
      await tocar(tester, find.bySemanticsLabel('2025'));
      await assentar(tester);

      expect(mudancas, <PeriodoEstatisticas>[const PeriodoAno(2025)]);
      expect(pedidas.last.query, 'periodo=2025');
      expect(find.text('De 1º de janeiro a 31 de dezembro de 2025'), findsOneWidget);
      expect(find.bySemanticsLabel('Tempo de leitura: 88 h 05 min'), findsOneWidget);
    },
  );

  testWidgets('o acumulado diz desde o primeiro registro e mostra a série por ano (4.5)', (
    tester,
  ) async {
    await montar(tester, periodo: const PeriodoAcumulado(), (pedido) async {
      if (pedido.url.path.endsWith('graficos')) {
        return json(<String, Object?>{
          'ano': null,
          'granularidade': 'ano',
          'pontos': <Object?>[
            pontoJson(null, 360, 0, 2023),
            pontoJson(null, 4210, 11, 2024),
            pontoJson(null, 5150, 14, 2025),
            pontoJson(null, 3818, 9),
          ],
        }, 200);
      }
      return json(estatisticasJson(ano: null, notaMedia: 4, notas: 31), 200);
    });

    expect(pedidas.first.query, 'periodo=acumulado');
    expect(find.text('Desde 12 de novembro de 2023, seu primeiro registro'), findsOneWidget);
    expect(find.text('4,0'), findsOneWidget);
    expect(find.text('Média das 31 notas que você já deu.'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Páginas por ano'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('13.538 páginas desde 2023'), findsOneWidget);
  });

  testWidgets('média sem denominador vira frase, nunca zero (4.6)', (tester) async {
    await montar(tester, periodo: const PeriodoAno(2023), (pedido) async {
      if (pedido.url.path.endsWith('graficos')) {
        return json(<String, Object?>{
          'ano': 2023,
          'granularidade': 'mes',
          'pontos': <Object?>[pontoJson(11, 146, 0, 2023), pontoJson(12, 214, 0, 2023)],
        }, 200);
      }
      return json(
        estatisticasJson(
          ano: 2023,
          livros: 0,
          paginas: 360,
          minutos: 460,
          paginasPorDia: 25.7,
          diasPorLivro: null,
          notaMedia: null,
        ),
        200,
      );
    });

    expect(
      find.text('De 12 de novembro a 31 de dezembro de 2023, desde o seu primeiro registro'),
      findsOneWidget,
    );
    expect(find.text('Sem leituras concluídas em 2023'), findsOneWidget);
    expect(find.text('Nenhuma nota dada em 2023'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Nenhum livro concluído em 2023.'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('360 páginas de novembro a dezembro'), findsOneWidget);
  });

  testWidgets('sem nenhum registro, o vazio com Ir para a estante e sem faixa (4.7)', (
    tester,
  ) async {
    await montar(
      tester,
      (pedido) async => pedido.url.path.endsWith('graficos')
          ? json(<String, Object?>{'ano': 2026, 'granularidade': 'mes', 'pontos': <Object?>[]}, 200)
          : json(semRegistroJson(), 200),
    );

    expect(find.text(TextosDasEstatisticas.vazioTitulo), findsOneWidget);
    expect(find.bySemanticsLabel('2026'), findsNothing);
    await tocar(tester, find.text(TextosDasEstatisticas.vazioAcao));
    expect(estante, 1);
  });

  testWidgets('503 vira o banner com Tentar de novo, mantendo a faixa (4.9)', (tester) async {
    var falhar = true;
    await montar(tester, (pedido) async {
      if (falhar) {
        return erro(503, 'SERVICO_INDISPONIVEL', 'Fora do ar.');
      }
      return padrao(pedido);
    });

    expect(find.text(TextosDasEstatisticas.erro), findsOneWidget);
    expect(find.bySemanticsLabel('Acumulado'), findsOneWidget);
    falhar = false;
    await tocar(tester, find.text(TextosDasEstatisticas.tentarDeNovo));
    await assentar(tester);

    expect(find.byType(BannerAviso), findsNothing);
    expect(find.bySemanticsLabel('Livros concluídos: 9 livros'), findsOneWidget);
  });

  testWidgets('tempo esgotado também vira o banner (RNF-TST-04/06)', (tester) async {
    await montar(tester, timeout: const Duration(milliseconds: 100), (pedido) async {
      await Future<void>.delayed(const Duration(seconds: 2));
      return padrao(pedido);
    });
    await tester.pump(const Duration(seconds: 10));

    expect(find.text(TextosDasEstatisticas.erro), findsOneWidget);
  });

  testWidgets('enquanto carrega, o skeleton com a faixa real (cold start não é erro)', (
    tester,
  ) async {
    final resposta = Completer<http.Response>();
    await montar(tester, (_) => resposta.future);

    expect(find.byType(SkeletonDoPainel), findsOneWidget);
    expect(find.byType(BannerAviso), findsNothing);
    expect(find.bySemanticsLabel('Acumulado'), findsOneWidget);
    resposta.complete(json(estatisticasJson(), 200));
    await assentar(tester);
  });

  testWidgets('a resposta atrasada de um período anterior é descartada', (tester) async {
    final lenta = Completer<http.Response>();
    await montar(tester, (pedido) async {
      if (pedido.url.query == 'periodo=2024' && !pedido.url.path.endsWith('graficos')) {
        return lenta.future;
      }
      if (pedido.url.path.endsWith('graficos')) {
        return json(graficosJson(), 200);
      }
      return json(
        pedido.url.query == 'periodo=2025'
            ? estatisticasJson(ano: 2025, livros: 14)
            : estatisticasJson(),
        200,
      );
    });

    await tocar(tester, find.bySemanticsLabel('2024'));
    await assentar(tester);
    await tocar(tester, find.bySemanticsLabel('2025'));
    await assentar(tester);
    lenta.complete(json(estatisticasJson(ano: 2024, livros: 11), 200));
    await assentar(tester);

    expect(find.bySemanticsLabel('Livros concluídos: 14 livros'), findsOneWidget);
    expect(find.bySemanticsLabel('Livros concluídos: 11 livros'), findsNothing);
  });

  testWidgets('aviso de leitura recarrega em silêncio depois de 3 s', (tester) async {
    final avisos = ValueNotifier<int>(0);
    addTearDown(avisos.dispose);
    await montar(tester, padrao, alteracoes: avisos);
    expect(pedidas, hasLength(2));

    avisos.value++;
    avisos.value++;
    await tester.pump(const Duration(seconds: 1));
    expect(pedidas, hasLength(2));
    await tester.pump(const Duration(seconds: 3));
    await assentar(tester);
    expect(pedidas, hasLength(4));
    expect(find.byType(SkeletonDoPainel), findsNothing);
  });

  testWidgets('modo escuro desenha sem erro', (tester) async {
    await montar(tester, padrao, escuro: true);

    expect(tester.takeException(), isNull);
    expect(find.bySemanticsLabel('Livros concluídos: 9 livros'), findsOneWidget);
  });

  group('gráfico de colunas', () {
    Future<void> grafico(
      WidgetTester tester, {
      Medida medida = Medida.paginas,
      List<PontoEstatistica>? pontos,
      PeriodoEstatisticas periodo = const PeriodoAno(2026),
    }) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          Padding(
            padding: const EdgeInsets.all(20),
            child: SingleChildScrollView(
              child: GraficoDeColunas(
                medida: medida,
                pontos:
                    pontos ??
                    <PontoEstatistica>[
                      ponto(1, 412, 1),
                      ponto(2, 356, 1),
                      ponto(3, 498, 2),
                      ponto(4, 287),
                      ponto(5, 530, 1),
                      ponto(6, 441, 1),
                      ponto(7, 604, 2),
                      ponto(8, 372),
                      ponto(9, 318, 1),
                    ],
                periodo: periodo,
                hoje: _hoje(),
              ),
            ),
          ),
        ),
      );
    }

    testWidgets('um único rótulo direto, no primeiro maior valor', (tester) async {
      await grafico(tester, medida: Medida.livros);

      final rotulos = find.byKey(const ValueKey<String>('rotulo-direto'));
      expect(rotulos, findsOneWidget);
      expect(tester.widget<Text>(rotulos).data, '2 livros');
    });

    testWidgets('mês com zero não tem coluna, mas continua no eixo', (tester) async {
      await grafico(tester, medida: Medida.livros);

      expect(find.byKey(const ValueKey<String>('coluna')), findsNWidgets(7));
      expect(find.text('abr'), findsOneWidget);
    });

    testWidgets('tocar no mês abre o balão e a faixa; o rótulo direto some na mesma coluna', (
      tester,
    ) async {
      await grafico(tester);

      await tester.tap(find.bySemanticsLabel('Julho de 2026, 604 páginas'));
      await tester.pump();

      expect(find.byKey(const ValueKey<String>('balao')), findsOneWidget);
      expect(find.text('Julho de 2026'), findsOneWidget);
      expect(find.byKey(const ValueKey<String>('faixa-do-mes')), findsOneWidget);
      expect(find.byKey(const ValueKey<String>('rotulo-direto')), findsNothing);

      await tester.tap(find.bySemanticsLabel('Setembro de 2026, até hoje, 318 páginas'));
      await tester.pump();
      expect(find.text('Setembro de 2026, até hoje'), findsOneWidget);
      expect(find.text('Julho de 2026'), findsNothing);
    });

    testWidgets('o TalkBack lê o resumo e cada mês, que aceita toque (§9)', (tester) async {
      final semantica = tester.ensureSemantics();
      await grafico(tester);

      expect(
        find.bySemanticsLabel(
          'Gráfico de colunas, páginas por mês em 2026, de janeiro a setembro. '
          'Maior valor: julho, 604 páginas.',
        ),
        findsOneWidget,
      );
      final mes = tester.getSemantics(find.bySemanticsLabel('Abril de 2026, 287 páginas'));
      expect(mes.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
      semantica.dispose();
    });

    testWidgets('Ver como tabela troca a área pela tabela, com "até hoje" no mês corrente', (
      tester,
    ) async {
      await grafico(tester);

      await tocar(tester, find.text(TextosDasEstatisticas.verComoTabela));
      await tester.pump();

      expect(find.text('Mês'), findsOneWidget);
      expect(find.text('Janeiro'), findsOneWidget);
      expect(find.text('412 páginas'), findsOneWidget);
      expect(find.bySemanticsLabel('Setembro, até hoje, 318 páginas'), findsOneWidget);
      expect(find.text(TextosDasEstatisticas.verComoGrafico), findsOneWidget);
      expect(find.byKey(const ValueKey<String>('coluna')), findsNothing);
    });

    testWidgets('sem nada da medida, a frase no lugar do gráfico e sem alternância', (
      tester,
    ) async {
      await grafico(
        tester,
        medida: Medida.livros,
        pontos: <PontoEstatistica>[ponto(11, 146, 0, 2023), ponto(12, 214, 0, 2023)],
        periodo: const PeriodoAno(2023),
      );

      expect(find.text('Nenhum livro concluído em 2023.'), findsOneWidget);
      expect(find.text(TextosDasEstatisticas.verComoTabela), findsNothing);
    });
  });
}
