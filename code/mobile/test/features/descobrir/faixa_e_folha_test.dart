import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/features/descobrir/filtros_da_busca.dart';
import 'package:le_ai_mobile/features/descobrir/widgets_da_busca.dart';
import 'package:le_ai_mobile/features/descobrir/widgets_dos_filtros.dart';
import 'package:le_ai_mobile/features/livros/livro_oficial.dart';

import '../livros/apoio.dart';

void main() {
  final assuntos = <AssuntoResumo>[
    for (var i = 0; i < 30; i++) AssuntoResumo(id: 'a$i', nome: 'Assunto $i'),
  ];

  testWidgets('a faixa rola até o assunto ativo que está fora da tela', (tester) async {
    usarTelaDeCelular(tester);
    final ativo = ValueNotifier<AssuntoResumo?>(null);
    addTearDown(ativo.dispose);
    await tester.pumpWidget(
      envolver(
        ValueListenableBuilder<AssuntoResumo?>(
          valueListenable: ativo,
          builder: (context, valor, _) =>
              FaixaDeAssuntos(assuntos: assuntos, ativo: valor, aoAlternar: (_) {}),
        ),
      ),
    );
    final largura = tester.view.physicalSize.width / tester.view.devicePixelRatio;
    expect(tester.getRect(find.text('Assunto 25')).left, greaterThan(largura));

    // Chega pela ficha do livro, com um assunto longe na faixa.
    ativo.value = assuntos[25];
    await tester.pumpAndSettle();

    final chip = tester.getRect(find.text('Assunto 25'));
    expect(chip.left, greaterThanOrEqualTo(0));
    expect(chip.right, lessThanOrEqualTo(largura));
  });

  testWidgets('a folha de filtros abre pelo navegador raiz e cobre a barra inferior', (
    tester,
  ) async {
    usarTelaDeCelular(tester);
    // Como no shell: a aba tem o próprio navegador, e a barra fica fora dele.
    await tester.pumpWidget(
      envolver(
        Column(
          children: <Widget>[
            Expanded(
              child: Navigator(
                onGenerateRoute: (_) => MaterialPageRoute<void>(
                  builder: (context) => Center(
                    child: TextButton(
                      onPressed: () => mostrarFolhaDeFiltros(context, FiltrosDaBusca.nenhum),
                      child: const Text('Abrir'),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(key: ValueKey<String>('barra'), height: 80),
          ],
        ),
      ),
    );

    await tester.tap(find.text('Abrir'));
    await tester.pumpAndSettle();

    final folha = tester.getRect(find.byType(BottomSheet));
    final barra = tester.getRect(find.byKey(const ValueKey<String>('barra')));
    expect(folha.bottom, greaterThanOrEqualTo(barra.bottom));
    expect(find.text('Limpar filtros'), findsOneWidget);
  });
}
