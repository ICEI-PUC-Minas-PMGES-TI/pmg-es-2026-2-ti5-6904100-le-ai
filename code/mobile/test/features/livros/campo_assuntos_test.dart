import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/features/livros/campo_assuntos.dart';
import 'package:le_ai_mobile/features/livros/livro_oficial.dart';

import 'apoio.dart';
import 'apoio_assuntos.dart';

List<AssuntoResumo> _assuntos(List<String> ids) => <AssuntoResumo>[
  for (final id in ids) AssuntoResumo(id: id, nome: nomesDosAssuntos[id]!),
];

const _helper = 'Opcional. Escolha da lista do Lê Ai, de preferência até 5.';

void main() {
  late FocusNode foco;

  setUp(() => foco = FocusNode(debugLabel: 'acao-dos-assuntos'));
  tearDown(() => foco.dispose());

  /// Monta o campo com estado próprio: remover tira o assunto da lista, como o formulário faz.
  Future<void> montar(
    WidgetTester tester, {
    required List<AssuntoResumo> iniciais,
    String? erro,
    bool habilitado = true,
    VoidCallback? aoEscolher,
  }) async {
    usarTelaDeCelular(tester);
    var assuntos = iniciais;
    await tester.pumpWidget(
      envolver(
        StatefulBuilder(
          builder: (context, setState) => Padding(
            padding: const EdgeInsets.all(20),
            child: CampoAssuntos(
              assuntos: assuntos,
              erro: erro,
              habilitado: habilitado,
              aoEscolher: aoEscolher ?? () {},
              aoRemover: (removido) => setState(() {
                assuntos = <AssuntoResumo>[
                  for (final a in assuntos)
                    if (a.id != removido.id) a,
                ];
              }),
              focoDaAcao: foco,
            ),
          ),
        ),
      ),
    );
  }

  testWidgets('sem assunto: gatilho com rótulo de estado e o helper', (tester) async {
    var aberturas = 0;
    await montar(tester, iniciais: const <AssuntoResumo>[], aoEscolher: () => aberturas++);

    expect(find.text('Assuntos'), findsOneWidget);
    expect(find.text('Escolher assuntos'), findsOneWidget);
    expect(find.text(_helper), findsOneWidget);
    final gatilho = find.bySemanticsLabel('Assuntos, nenhum escolhido, escolher');
    expect(gatilho, findsOneWidget);
    expect(tester.getSize(gatilho).height, greaterThanOrEqualTo(48));

    await tester.tap(find.text('Escolher assuntos'));
    expect(aberturas, 1);
  });

  testWidgets('com assuntos: chips com X rotulado e Alterar assuntos', (tester) async {
    await montar(tester, iniciais: _assuntos(<String>[idHistoria, idMemorias]));

    expect(find.text('História'), findsOneWidget);
    expect(find.text('Memórias'), findsOneWidget);
    expect(find.text('Escolher assuntos'), findsNothing);
    expect(find.text('Alterar assuntos'), findsOneWidget);
    expect(
      find.bySemanticsLabel('Assuntos, 2 escolhidos: História e Memórias, alterar'),
      findsOneWidget,
    );
    final x = find.bySemanticsLabel('Remover Memórias');
    expect(x, findsOneWidget);
    expect(tester.getSize(x), const Size(48, 48));
    expect(find.text(_helper), findsOneWidget);
  });

  testWidgets('o vão visível entre dois chips é de 12px, o resto do alvo de 48px do X', (
    tester,
  ) async {
    await montar(tester, iniciais: _assuntos(<String>[idHistoria, idMemorias]));

    // Fundo do X de História (36x32 dentro do alvo de 48) e fundo do nome de Memórias.
    final fundoDoX = find.descendant(
      of: find.bySemanticsLabel('Remover História'),
      matching: find.byWidgetPredicate((w) => w is Container && w.constraints?.maxWidth == 36),
    );
    final fundoDoNome = find.ancestor(of: find.text('Memórias'), matching: find.byType(Container));
    final x = tester.getRect(fundoDoX);
    final nome = tester.getRect(fundoDoNome.first);
    expect(nome.center.dy, moreOrLessEquals(x.center.dy));
    expect(nome.left - x.right, moreOrLessEquals(12));
  });

  testWidgets('a partir do sexto assunto o helper vira aviso, sem erro', (tester) async {
    await montar(
      tester,
      iniciais: _assuntos(<String>[
        idBiografia,
        idCronica,
        idHistoria,
        idMemorias,
        idPolitica,
        idSociologia,
      ]),
    );

    expect(
      find.text('Você escolheu 6 assuntos. Até 5 ajuda a encontrar o livro com mais precisão.'),
      findsOneWidget,
    );
    expect(find.text(_helper), findsNothing);

    await tester.tap(find.bySemanticsLabel('Remover Sociologia'));
    await tester.pump();
    expect(find.textContaining('Você escolheu'), findsNothing);
    expect(find.text(_helper), findsOneWidget);
  });

  testWidgets('remover leva o foco ao chip seguinte e, no último, à ação do campo', (tester) async {
    await montar(tester, iniciais: _assuntos(<String>[idHistoria, idMemorias]));

    await tester.tap(find.bySemanticsLabel('Remover História'));
    await tester.pump();
    await tester.pump();
    expect(find.text('História'), findsNothing);
    expect(FocusManager.instance.primaryFocus?.debugLabel, 'Remover Memórias');

    await tester.tap(find.bySemanticsLabel('Remover Memórias'));
    await tester.pump();
    await tester.pump();
    expect(find.text('Escolher assuntos'), findsOneWidget);
    expect(FocusManager.instance.primaryFocus, foco);
  });

  testWidgets('erro do servidor toma o lugar do helper e os chips continuam', (tester) async {
    const mensagem =
        'Um dos assuntos escolhidos não está mais na lista do Lê Ai. Revise e salve de novo.';
    await montar(tester, iniciais: _assuntos(<String>[idHistoria]), erro: mensagem);

    expect(find.text(mensagem), findsOneWidget);
    expect(find.text(_helper), findsNothing);
    expect(find.text('História'), findsOneWidget);
  });

  testWidgets('salvando: chips sem X e Alterar assuntos sem ação', (tester) async {
    var aberturas = 0;
    await montar(
      tester,
      iniciais: _assuntos(<String>[idHistoria, idMemorias]),
      habilitado: false,
      aoEscolher: () => aberturas++,
    );

    expect(find.bySemanticsLabel('Remover História'), findsNothing);
    await tester.tap(find.text('Alterar assuntos'));
    expect(aberturas, 0);
  });
}
