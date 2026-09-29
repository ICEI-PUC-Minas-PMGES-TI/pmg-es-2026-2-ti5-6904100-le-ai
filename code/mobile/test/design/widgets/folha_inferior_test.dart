import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/design/tokens.dart';
import 'package:le_ai_mobile/design/widgets/folha_inferior.dart';

void main() {
  testWidgets('o último botão fica acima da barra de navegação do sistema', (tester) async {
    const barraDoSistema = 48.0;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        // Edge-to-edge: a barra do sistema chega como padding inferior do MediaQuery.
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(padding: const EdgeInsets.only(bottom: barraDoSistema)),
          child: child!,
        ),
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => mostrarFolhaInferior<void>(
                context,
                builder: (context) =>
                    ElevatedButton(onPressed: () {}, child: const Text('Remover nota')),
              ),
              child: const Text('Abrir'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Abrir'));
    await tester.pumpAndSettle();

    final baseDaTela = tester.getSize(find.byType(MaterialApp)).height;
    final fundoDoBotao = tester.getBottomLeft(find.byType(ElevatedButton)).dy;
    expect(baseDaTela - fundoDoBotao, greaterThanOrEqualTo(barraDoSistema + DesignTokens.space6));
  });
}
