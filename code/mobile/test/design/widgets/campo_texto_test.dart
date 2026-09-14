import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/design/widgets/campo_texto.dart';

Widget _wrap(Widget child) {
  return MaterialApp(
    theme: AppTheme.light(),
    home: Scaffold(body: child),
  );
}

void main() {
  testWidgets('mostra o label e emite o texto digitado', (tester) async {
    final controller = TextEditingController();
    await tester.pumpWidget(
      _wrap(CampoTexto(controller: controller, label: 'E-mail')),
    );

    expect(find.text('E-mail'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'marinableu');

    expect(controller.text, 'marinableu');
  });

  testWidgets('helper permanece visível junto com o erro (cadastro.md §4.3)', (
    tester,
  ) async {
    final controller = TextEditingController();
    await tester.pumpWidget(
      _wrap(
        CampoTexto(
          controller: controller,
          label: 'Senha',
          helper: 'Mínimo de 8 caracteres.',
          erro: 'Use pelo menos 8 caracteres.',
        ),
      ),
    );

    expect(find.text('Mínimo de 8 caracteres.'), findsOneWidget);
    expect(find.text('Use pelo menos 8 caracteres.'), findsOneWidget);
  });

  testWidgets('bordaDeErro aplica a borda de erro sem legenda própria (login.md §4.2)', (
    tester,
  ) async {
    final controller = TextEditingController();
    await tester.pumpWidget(
      _wrap(
        CampoTexto(
          controller: controller,
          label: 'E-mail ou nome de usuário',
          bordaDeErro: true,
        ),
      ),
    );

    final campo = tester.widget<TextField>(find.byType(TextField));
    final borda = campo.decoration!.enabledBorder as OutlineInputBorder;
    expect(borda.borderSide.color, AppTheme.light().colorScheme.error);
    // Só o label é texto nesta árvore: nenhuma legenda repete o que o banner já diz.
    expect(find.byType(Text), findsOneWidget);
  });

  testWidgets('disabled repassa enabled: false para o campo nativo', (
    tester,
  ) async {
    final controller = TextEditingController();
    await tester.pumpWidget(
      _wrap(
        CampoTexto(controller: controller, label: 'Senha', enabled: false),
      ),
    );

    final campo = tester.widget<TextField>(find.byType(TextField));
    expect(campo.enabled, isFalse);
  });
}
