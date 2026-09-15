import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/design/widgets/campo_senha.dart';

Widget _wrap(Widget child) {
  return MaterialApp(
    theme: AppTheme.light(),
    home: Scaffold(body: child),
  );
}

void main() {
  testWidgets('começa oculta, com o botão Mostrar senha', (tester) async {
    final controller = TextEditingController();
    await tester.pumpWidget(
      _wrap(CampoSenha(controller: controller, label: 'Senha')),
    );

    final campo = tester.widget<TextField>(find.byType(TextField));
    expect(campo.obscureText, isTrue);
    expect(find.byTooltip('Mostrar senha'), findsOneWidget);
  });

  testWidgets('alterna para texto visível ao tocar no olho, e volta ao tocar de novo', (
    tester,
  ) async {
    final controller = TextEditingController();
    await tester.pumpWidget(
      _wrap(CampoSenha(controller: controller, label: 'Senha')),
    );

    await tester.tap(find.byTooltip('Mostrar senha'));
    await tester.pump();

    expect(
      tester.widget<TextField>(find.byType(TextField)).obscureText,
      isFalse,
    );
    expect(find.byTooltip('Ocultar senha'), findsOneWidget);

    await tester.tap(find.byTooltip('Ocultar senha'));
    await tester.pump();

    expect(
      tester.widget<TextField>(find.byType(TextField)).obscureText,
      isTrue,
    );
  });

  testWidgets('repassa o erro para o CampoTexto interno', (tester) async {
    final controller = TextEditingController();
    await tester.pumpWidget(
      _wrap(
        CampoSenha(
          controller: controller,
          label: 'Senha',
          erro: 'Use pelo menos 8 caracteres.',
        ),
      ),
    );

    expect(find.text('Use pelo menos 8 caracteres.'), findsOneWidget);
  });
}
