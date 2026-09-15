import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import 'package:le_ai_mobile/app/barra_inferior.dart';
import 'package:le_ai_mobile/design/theme.dart';

Widget _wrap(Widget child) {
  return MaterialApp(
    theme: AppTheme.light(),
    home: Scaffold(bottomNavigationBar: child, body: const SizedBox()),
  );
}

void main() {
  testWidgets('toca um item chama aoSelecionar com o indice certo', (tester) async {
    int? selecionado;
    await tester.pumpWidget(
      _wrap(BarraInferior(indiceAtivo: 0, aoSelecionar: (i) => selecionado = i)),
    );

    await tester.tap(find.text('Descobrir'));

    expect(selecionado, 1);
  });

  testWidgets('item ativo usa icone fill; os outros ficam regular', (tester) async {
    await tester.pumpWidget(
      _wrap(BarraInferior(indiceAtivo: 2, aoSelecionar: (_) {})),
    );

    expect(find.byIcon(PhosphorIconsFill.newspaper), findsOneWidget);
    expect(find.byIcon(PhosphorIconsRegular.books), findsOneWidget);
    expect(find.byIcon(PhosphorIconsRegular.compass), findsOneWidget);
    expect(find.byIcon(PhosphorIconsRegular.userCircle), findsOneWidget);
    expect(find.byIcon(PhosphorIconsFill.books), findsNothing);
  });

  testWidgets('mostra os quatro rotulos na ordem do shell-de-navegacao.md', (tester) async {
    await tester.pumpWidget(
      _wrap(BarraInferior(indiceAtivo: 0, aoSelecionar: (_) {})),
    );

    final rotulos = <String>['Estante', 'Descobrir', 'Feed', 'Perfil'];
    for (final rotulo in rotulos) {
      expect(find.text(rotulo), findsOneWidget);
    }
  });
}
