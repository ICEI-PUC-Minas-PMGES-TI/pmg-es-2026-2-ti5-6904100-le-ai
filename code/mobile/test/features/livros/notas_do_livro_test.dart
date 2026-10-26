import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import 'package:le_ai_mobile/design/tokens.dart';
import 'package:le_ai_mobile/features/livros/livro_oficial.dart';
import 'package:le_ai_mobile/features/livros/notas_do_livro.dart';

import 'apoio.dart';

/// A distribuição de pagina-do-livro.md §5.2, de 5 a 0.
const List<FaixaDaDistribuicao> _distribuicao = <FaixaDaDistribuicao>[
  FaixaDaDistribuicao(valor: 5, quantidade: 12),
  FaixaDaDistribuicao(valor: 4.5, quantidade: 9),
  FaixaDaDistribuicao(valor: 4, quantidade: 7),
  FaixaDaDistribuicao(valor: 3.5, quantidade: 3),
  FaixaDaDistribuicao(valor: 3, quantidade: 2),
  FaixaDaDistribuicao(valor: 2.5, quantidade: 1),
  FaixaDaDistribuicao(valor: 2, quantidade: 1),
  FaixaDaDistribuicao(valor: 1.5, quantidade: 0),
  FaixaDaDistribuicao(valor: 1, quantidade: 1),
  FaixaDaDistribuicao(valor: 0.5, quantidade: 0),
  FaixaDaDistribuicao(valor: 0, quantidade: 0),
];

const IndicadorDeNota _geral = IndicadorDeNota(valor: 4.3, quantidade: 412);
const IndicadorDeNota _leitores = IndicadorDeNota(valor: 4.2, quantidade: 36);

const List<String> _rotulos = <String>[
  '5',
  '4,5',
  '4',
  '3,5',
  '3',
  '2,5',
  '2',
  '1,5',
  '1',
  '0,5',
  '0',
];

Future<void> _montar(
  WidgetTester tester, {
  IndicadorDeNota? geral,
  IndicadorDeNota? leitores,
  List<FaixaDaDistribuicao> distribuicao = const <FaixaDaDistribuicao>[],
  bool escuro = false,
  double? largura,
  double escalaDoTexto = 1,
}) async {
  usarTelaDeCelular(tester);
  if (largura != null) {
    tester.view.physicalSize = Size(largura * 3, 2532);
  }
  await tester.pumpWidget(
    envolver(
      Builder(
        builder: (context) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(escalaDoTexto)),
          // O mesmo padding lateral da página (`space-5`).
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(DesignTokens.space5),
            child: NotasDoLivro(
              notaGeral: geral,
              notaDosLeitores: leitores,
              distribuicao: distribuicao,
            ),
          ),
        ),
      ),
      escuro: escuro,
    ),
  );
}

Finder get _estrelasCheias => find.byWidgetPredicate(
  (widget) => widget is Icon && widget.icon == PhosphorIconsFill.star,
);

Finder get _rotuloDoHistograma =>
    find.text('Distribuição das notas dos leitores');

void main() {
  testWidgets(
    'só nota geral: a dos leitores fica em Sem nota, sem histograma',
    (tester) async {
      await _montar(tester, geral: _geral);

      expect(find.text('Nota geral'), findsOneWidget);
      expect(find.text('Nota dos leitores'), findsOneWidget);
      expect(find.text('4,3'), findsOneWidget);
      expect(find.text('412 avaliações'), findsOneWidget);
      expect(find.text('Sem nota'), findsOneWidget);
      expect(_estrelasCheias, findsOneWidget);
      expect(_rotuloDoHistograma, findsNothing);
    },
  );

  testWidgets(
    'só nota dos leitores: a geral fica em Sem nota, com histograma',
    (tester) async {
      await _montar(tester, leitores: _leitores, distribuicao: _distribuicao);

      expect(find.text('4,2'), findsOneWidget);
      expect(find.text('36 leitores'), findsOneWidget);
      expect(find.text('Sem nota'), findsOneWidget);
      expect(_estrelasCheias, findsOneWidget);
      expect(_rotuloDoHistograma, findsOneWidget);
    },
  );

  testWidgets('as duas notas, separadas, cada uma com a sua estrela', (
    tester,
  ) async {
    await _montar(
      tester,
      geral: _geral,
      leitores: _leitores,
      distribuicao: _distribuicao,
    );

    expect(find.text('4,3'), findsOneWidget);
    expect(find.text('4,2'), findsOneWidget);
    expect(find.text('Sem nota'), findsNothing);
    expect(_estrelasCheias, findsNWidgets(2));
  });

  testWidgets(
    'nenhuma nota: dois Sem nota, sem estrela, sem 0,0 e sem histograma',
    (tester) async {
      await _montar(tester);

      expect(find.text('Nota geral'), findsOneWidget);
      expect(find.text('Nota dos leitores'), findsOneWidget);
      expect(find.text('Sem nota'), findsNWidgets(2));
      expect(_estrelasCheias, findsNothing);
      expect(find.text('0,0'), findsNothing);
      expect(find.text('0'), findsNothing);
      expect(_rotuloDoHistograma, findsNothing);
    },
  );

  testWidgets('contagens no singular e no plural', (tester) async {
    await _montar(
      tester,
      geral: const IndicadorDeNota(valor: 3.9, quantidade: 1),
      leitores: const IndicadorDeNota(valor: 5, quantidade: 1),
      distribuicao: const <FaixaDaDistribuicao>[
        FaixaDaDistribuicao(valor: 5, quantidade: 1),
      ],
    );

    expect(find.text('1 avaliação'), findsOneWidget);
    // `1 leitor` no bloco e na faixa de 5.
    expect(find.text('1 leitor'), findsNWidgets(2));
    expect(find.text('3,9'), findsOneWidget);
  });

  testWidgets('milhar com ponto, como em pt-BR', (tester) async {
    await _montar(
      tester,
      geral: const IndicadorDeNota(valor: 4, quantidade: 1442),
    );

    expect(find.text('1.442 avaliações'), findsOneWidget);
  });

  testWidgets(
    'histograma com onze linhas de 5 a 0, contagem com unidade e nenhum',
    (tester) async {
      await _montar(tester, leitores: _leitores, distribuicao: _distribuicao);

      final alturas = <double>[];
      for (final rotulo in _rotulos) {
        final trilha = find.byKey(ValueKey<String>('trilha-$rotulo'));
        expect(trilha, findsOneWidget, reason: 'faixa $rotulo');
        alturas.add(tester.getCenter(trilha).dy);
      }
      // De 5 no topo até 0 embaixo.
      expect(alturas, List<double>.of(alturas)..sort());
      expect(find.text('12 leitores'), findsOneWidget);
      expect(find.text('9 leitores'), findsOneWidget);
      expect(find.text('1 leitor'), findsNWidgets(3));
      expect(find.text('nenhum'), findsNWidgets(3));
      expect(find.textContaining('%'), findsNothing);
    },
  );

  testWidgets(
    'a maior faixa ocupa a trilha inteira; as outras são proporcionais',
    (tester) async {
      await _montar(tester, leitores: _leitores, distribuicao: _distribuicao);

      double largura(String chave) =>
          tester.getSize(find.byKey(ValueKey<String>(chave))).width;
      final trilha = largura('trilha-5');

      expect(largura('barra-5'), moreOrLessEquals(trilha));
      expect(largura('barra-4,5'), moreOrLessEquals(trilha * 9 / 12));
      expect(largura('barra-1'), moreOrLessEquals(trilha / 12));
      // Faixa vazia: trilha sem barra.
      expect(find.byKey(const ValueKey<String>('barra-0')), findsNothing);
      expect(find.byKey(const ValueKey<String>('trilha-0')), findsOneWidget);
    },
  );

  testWidgets(
    'nota dos leitores com faixas todas zeradas não desenha histograma',
    (tester) async {
      await _montar(
        tester,
        leitores: _leitores,
        distribuicao: const <FaixaDaDistribuicao>[
          FaixaDaDistribuicao(valor: 5, quantidade: 0),
        ],
      );

      expect(find.text('4,2'), findsOneWidget);
      expect(_rotuloDoHistograma, findsNothing);
    },
  );

  testWidgets('escala padrão: valor, trilha e contagem na mesma linha', (
    tester,
  ) async {
    await _montar(tester, leitores: _leitores, distribuicao: _distribuicao);

    final trilha = tester.getRect(
      find.byKey(const ValueKey<String>('trilha-5')),
    );
    final contagem = tester.getRect(find.text('12 leitores'));
    final valor = tester.getRect(find.text('5').last);
    expect(contagem.center.dy, moreOrLessEquals(trilha.center.dy));
    expect(valor.center.dy, moreOrLessEquals(trilha.center.dy));
    expect(valor.right, lessThan(trilha.left));
    expect(contagem.left, greaterThan(trilha.right));
  });

  testWidgets('texto a 200% em 320 dp: a linha empilha e a trilha não some', (
    tester,
  ) async {
    await _montar(
      tester,
      leitores: _leitores,
      distribuicao: _distribuicao,
      largura: 320,
      escalaDoTexto: 2,
    );

    expect(tester.takeException(), isNull);
    final trilha = tester.getRect(
      find.byKey(const ValueKey<String>('trilha-5')),
    );
    // A trilha ganha a largura inteira da área de conteúdo, embaixo do texto.
    expect(trilha.width, greaterThan(0));
    expect(trilha.width, moreOrLessEquals(320 - 2 * DesignTokens.space5));
    expect(
      tester.getSize(find.byKey(const ValueKey<String>('barra-5'))).width,
      moreOrLessEquals(trilha.width),
    );
    final contagem = find.text('12 leitores');
    expect(contagem, findsOneWidget);
    expect(tester.getRect(contagem).bottom, lessThanOrEqualTo(trilha.top));
    expect(find.text('nenhum'), findsNWidgets(3));
    expect(find.textContaining('%'), findsNothing);
  });

  testWidgets('empilhada, cada faixa continua um item com o texto completo', (
    tester,
  ) async {
    final semantica = tester.ensureSemantics();
    await _montar(
      tester,
      leitores: _leitores,
      distribuicao: _distribuicao,
      largura: 320,
      escalaDoTexto: 2,
    );

    expect(find.bySemanticsLabel('5 estrelas, 12 leitores'), findsOneWidget);
    expect(find.bySemanticsLabel('0 estrelas, nenhum'), findsOneWidget);
    semantica.dispose();
  });

  testWidgets('leitor de tela: cada bloco e cada faixa como texto completo', (
    tester,
  ) async {
    final semantica = tester.ensureSemantics();
    await _montar(tester, geral: _geral, distribuicao: _distribuicao);

    expect(
      find.bySemanticsLabel('Nota geral, 4,3 de 5, 412 avaliações'),
      findsOneWidget,
    );
    expect(
      find.bySemanticsLabel('Nota dos leitores, sem nota'),
      findsOneWidget,
    );
    // Sem nota dos leitores, a distribuição não é lida.
    expect(find.bySemanticsLabel(RegExp('estrelas')), findsNothing);

    await _montar(
      tester,
      geral: _geral,
      leitores: _leitores,
      distribuicao: _distribuicao,
    );
    expect(
      find.bySemanticsLabel('Nota dos leitores, 4,2 de 5, 36 leitores'),
      findsOneWidget,
    );
    expect(find.bySemanticsLabel('5 estrelas, 12 leitores'), findsOneWidget);
    expect(find.bySemanticsLabel('4,5 estrelas, 9 leitores'), findsOneWidget);
    expect(find.bySemanticsLabel('1,5 estrela, nenhum'), findsOneWidget);
    expect(find.bySemanticsLabel('1 estrela, 1 leitor'), findsOneWidget);
    expect(find.bySemanticsLabel('0 estrelas, nenhum'), findsOneWidget);
    semantica.dispose();
  });

  testWidgets('modo escuro: noite-elevada, barra musgo-claro e trilha escura', (
    tester,
  ) async {
    await _montar(
      tester,
      geral: _geral,
      leitores: _leitores,
      distribuicao: _distribuicao,
      escuro: true,
    );

    final container = tester.widget<Container>(
      find.ancestor(
        of: find.text('Nota geral'),
        matching: find.byWidgetPredicate(
          (widget) =>
              widget is Container &&
              widget.decoration is BoxDecoration &&
              (widget.decoration! as BoxDecoration).borderRadius ==
                  BorderRadius.circular(DesignTokens.radiusMd),
        ),
      ),
    );
    expect(
      (container.decoration! as BoxDecoration).color,
      DesignTokens.noiteElevada,
    );
    final trilha = tester.widget<Container>(
      find.byKey(const ValueKey<String>('trilha-5')),
    );
    expect(
      (trilha.decoration! as BoxDecoration).color,
      DesignTokens.musgoFundoEscuro,
    );
    final barra = tester.widget<DecoratedBox>(
      find.byKey(const ValueKey<String>('barra-5')),
    );
    expect((barra.decoration as BoxDecoration).color, DesignTokens.musgoClaro);
    final estrela = tester.widget<Icon>(_estrelasCheias.first);
    expect(estrela.color, DesignTokens.musgoClaro);
  });
}
