import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/design/widgets/botao_primario.dart';

Widget _wrap(Widget child) {
  return MaterialApp(
    theme: AppTheme.light(),
    home: Scaffold(body: child),
  );
}

void main() {
  testWidgets('chama onPressed ao tocar', (tester) async {
    var tocado = false;
    await tester.pumpWidget(
      _wrap(BotaoPrimario(texto: 'Entrar', onPressed: () => tocado = true)),
    );

    await tester.tap(find.text('Entrar'));

    expect(tocado, isTrue);
  });

  testWidgets('carregando desabilita o botão, sem trocar o texto sozinho', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        BotaoPrimario(texto: 'Entrando', onPressed: () {}, carregando: true),
      ),
    );

    final botao = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
    expect(botao.onPressed, isNull);
    expect(find.text('Entrando'), findsOneWidget);
  });
}
