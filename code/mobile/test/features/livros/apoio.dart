import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/features/livros/acervo_service.dart';

/// As telas de livro vivem dentro do `Scaffold` do shell; no teste, um `Scaffold` próprio faz
/// esse papel.
Widget envolver(Widget tela, {bool escuro = false}) {
  return MaterialApp(
    theme: escuro ? AppTheme.dark() : AppTheme.light(),
    locale: const Locale('pt', 'BR'),
    supportedLocales: const <Locale>[Locale('pt', 'BR')],
    localizationsDelegates: const <LocalizationsDelegate<Object?>>[
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: Scaffold(body: tela),
  );
}

/// Serviço de acervo sobre um `MockClient`, sem espera entre retentativas.
AcervoService acervoSimulado(Future<http.Response> Function(http.Request) handler) {
  return AcervoService(
    ApiClient(
      baseUrl: 'https://acervo.example.com',
      client: MockClient(handler),
      esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
    ),
  );
}

http.Response json(Object corpo, int status) =>
    http.Response(jsonEncode(corpo), status, headers: <String, String>{
      'content-type': 'application/json; charset=utf-8',
    });

http.Response erro(int status, String codigo, String mensagem, [Map<String, Object?> extras = const {}]) {
  return json(<String, Object?>{
    'codigo': codigo,
    'mensagem': mensagem,
    'correlationId': '16aa3308-daee-4638-b220-c306484f6a9c',
    ...extras,
  }, status);
}

/// A tela é mais alta que o viewport padrão de teste: rola até o alvo antes de tocar.
Future<void> tocar(WidgetTester tester, Finder alvo) async {
  await tester.ensureVisible(alvo);
  await tester.pump();
  await tester.tap(alvo);
}

void usarTelaDeCelular(WidgetTester tester) {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
}
