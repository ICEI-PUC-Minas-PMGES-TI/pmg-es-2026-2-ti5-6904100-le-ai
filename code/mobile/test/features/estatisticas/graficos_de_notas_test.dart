import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/features/estatisticas/estatisticas_service.dart';
import 'package:le_ai_mobile/features/estatisticas/widgets_de_notas.dart';

import 'apoio_estatisticas.dart';

DistribuicaoNotas? _distribuicao(List<(double, int)>? contagens) =>
    DistribuicaoNotas.deJson(distribuicaoJson(contagens));

void main() {
  Future<void> montar(
    WidgetTester tester,
    DistribuicaoNotas? distribuicao, {
    PeriodoEstatisticas periodo = const PeriodoAno(2026),
  }) async {
    usarTelaDeCelular(tester);
    await tester.pumpWidget(
      envolver(
        SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: GraficoDeNotas(
            distribuicao: distribuicao,
            periodo: periodo,
            primeiroRegistro: DateTime(2023, 11, 12),
          ),
        ),
      ),
    );
  }

  const notas2026 = <(double, int)>[(3, 1), (3.5, 1), (4, 2), (4.5, 2), (5, 2)];

  testWidgets('onze notas no eixo, contagem em todas e coluna só onde há livro', (tester) async {
    await montar(tester, _distribuicao(notas2026));

    expect(find.text('Notas que você deu'), findsOneWidget);
    expect(find.text('8 notas em 2026'), findsOneWidget);
    expect(find.byKey(const ValueKey<String>('contagem-da-nota')), findsNWidgets(11));
    expect(find.byKey(const ValueKey<String>('coluna-da-nota')), findsNWidgets(5));
    expect(find.text('0,5'), findsOneWidget);
  });

  testWidgets('acumulado diz desde quando', (tester) async {
    await montar(tester, _distribuicao(notas2026), periodo: const PeriodoAcumulado());

    expect(find.text('8 notas desde 2023'), findsOneWidget);
  });

  testWidgets('sem nota no período: só a frase, sem gráfico nem tabela', (tester) async {
    await montar(tester, null, periodo: const PeriodoAno(2023));

    expect(find.text('Nenhuma nota dada em 2023.'), findsOneWidget);
    expect(find.byKey(const ValueKey<String>('coluna-da-nota')), findsNothing);
    expect(find.text('Ver como tabela'), findsNothing);
  });

  testWidgets('tocar numa nota abre o balão e esconde a contagem dela', (tester) async {
    await montar(tester, _distribuicao(notas2026));

    await tester.tap(find.byKey(const ValueKey<String>('coluna-da-nota')).at(3));
    await tester.pump();

    expect(find.text('Nota 4,5'), findsOneWidget);
    expect(find.text('2 livros'), findsOneWidget);
    expect(find.byKey(const ValueKey<String>('contagem-da-nota')), findsNWidgets(10));
    expect(find.byKey(const ValueKey<String>('faixa-da-nota')), findsOneWidget);
  });

  testWidgets('a tabela lista as onze notas e fecha com o total', (tester) async {
    await montar(tester, _distribuicao(notas2026));

    await tester.tap(find.text('Ver como tabela'));
    await tester.pump();

    expect(find.text('0,5 estrela'), findsOneWidget);
    expect(find.text('5 estrelas'), findsOneWidget);
    expect(find.text('Total'), findsOneWidget);
    expect(find.text('8 livros'), findsOneWidget);
    expect(find.text('Ver como gráfico'), findsOneWidget);
  });
}
