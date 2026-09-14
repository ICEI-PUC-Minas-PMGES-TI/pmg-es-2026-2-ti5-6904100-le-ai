import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/app/cabecalho_tela.dart';
import 'package:le_ai_mobile/design/theme.dart';

Widget _wrap(Widget child) {
  return MaterialApp(theme: AppTheme.light(), home: Scaffold(body: child));
}

void main() {
  testWidgets('mostra o titulo da tela', (tester) async {
    await tester.pumpWidget(_wrap(const CabecalhoTela(titulo: 'Minha estante')));

    expect(find.text('Minha estante'), findsOneWidget);
  });

  testWidgets('sem nao lidas, o badge nao existe', (tester) async {
    await tester.pumpWidget(_wrap(const CabecalhoTela(titulo: 'Feed')));

    expect(find.byType(Positioned), findsNothing);
  });

  testWidgets('com nao lidas, mostra o numero no badge', (tester) async {
    await tester.pumpWidget(_wrap(const CabecalhoTela(titulo: 'Feed', naoLidas: 3)));

    expect(find.text('3'), findsOneWidget);
  });

  testWidgets('acima de nove nao lidas, mostra 9+', (tester) async {
    await tester.pumpWidget(_wrap(const CabecalhoTela(titulo: 'Feed', naoLidas: 12)));

    expect(find.text('9+'), findsOneWidget);
    expect(find.text('12'), findsNothing);
  });
}
