import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/core/session/session_controller.dart';
import 'package:le_ai_mobile/core/session/token_store.dart';
import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/design/widgets/botao_textual.dart';
import 'package:le_ai_mobile/features/auth/auth_service.dart';
import 'package:le_ai_mobile/features/conta/recuperar_senha_page.dart';
import 'package:le_ai_mobile/features/conta/redefinir_senha_page.dart';

/// Ordem dos blocos e estados de envio de recuperar e redefinir senha, conferidos contra os
/// protótipos de F-AUT (erro antes do helper, aviso de sessões depois da confirmação, botão
/// esmaecido e legenda centralizada no envio).

class _FakeTokenStore implements TokenStore {
  String? value;

  @override
  Future<String?> read() async => value;

  @override
  Future<void> write(String value) async {
    this.value = value;
  }

  @override
  Future<void> delete() async {
    value = null;
  }
}

Widget _wrap(Widget child) {
  return MaterialApp(
    theme: AppTheme.light(),
    locale: const Locale('pt', 'BR'),
    supportedLocales: const <Locale>[Locale('pt', 'BR')],
    localizationsDelegates: const <LocalizationsDelegate<Object?>>[
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: Scaffold(body: child),
  );
}

AuthService _servico(Future<http.Response> Function(http.Request) handler) {
  return AuthService(
    ApiClient(
      baseUrl: 'https://api.example.com',
      client: MockClient(handler),
      esperasDeRetentativa: const <Duration>[],
    ),
  );
}

double _topo(WidgetTester tester, String texto) => tester.getTopLeft(find.text(texto)).dy;

const _legenda = 'O servidor está iniciando. Isso pode levar alguns segundos.';

void main() {
  group('RecuperarSenhaPage', () {
    testWidgets('o erro de formato vem logo abaixo do campo, antes do helper', (tester) async {
      await tester.pumpWidget(_wrap(RecuperarSenhaPage(authService: _servico((_) async => http.Response('', 202)))));
      await tester.enterText(find.byType(TextField), 'marina.beltrao@');
      await tester.tap(find.text('Enviar link'));
      await tester.pumpAndSettle();

      expect(
        _topo(tester, 'Digite um e-mail completo, como nome@provedor.com.'),
        lessThan(_topo(tester, 'O link vale por 1 hora e só pode ser usado uma vez.')),
      );
    });

    testWidgets('durante o envio o botão esmaece, a legenda centraliza e o voltar de baixo some', (
      tester,
    ) async {
      final resposta = Completer<http.Response>();
      await tester.pumpWidget(_wrap(RecuperarSenhaPage(authService: _servico((_) => resposta.future))));
      expect(find.widgetWithText(BotaoTextual, 'Voltar para entrar'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'marina.beltrao@gmail.com');
      await tester.tap(find.text('Enviar link'));
      await tester.pump();

      expect(find.text('Enviando'), findsOneWidget);
      expect(tester.widget<Text>(find.text(_legenda)).textAlign, TextAlign.center);
      expect(find.widgetWithText(BotaoTextual, 'Voltar para entrar'), findsNothing);
      // A seta do topo continua (é o voltar desta tela no protótipo).
      expect(find.byTooltip('Voltar para entrar'), findsOneWidget);

      resposta.complete(http.Response('', 202));
      await tester.pumpAndSettle();
    });
  });

  group('RedefinirSenhaPage', () {
    Future<void> montar(WidgetTester tester, AuthService servico) async {
      await tester.pumpWidget(
        _wrap(
          RedefinirSenhaPage(
            token: 'token-de-teste',
            authService: servico,
            sessionController: SessionController(_FakeTokenStore()),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('o aviso de sessões vem depois do campo de confirmação', (tester) async {
      await montar(tester, _servico((_) async => http.Response('', 204)));

      expect(
        _topo(tester, 'Confirmar nova senha'),
        lessThan(_topo(tester, 'Ao salvar, você sai do aplicativo nos outros aparelhos.')),
      );
    });

    testWidgets('o erro de política vem antes do helper da nova senha', (tester) async {
      await montar(tester, _servico((_) async => http.Response('', 204)));
      final campos = find.byType(TextField);
      await tester.enterText(campos.at(0), 'curta');
      await tester.enterText(campos.at(1), 'curta');
      await tester.ensureVisible(find.text('Salvar senha'));
      await tester.tap(find.text('Salvar senha'));
      await tester.pumpAndSettle();

      expect(
        _topo(tester, 'Escolha uma senha com pelo menos 8 caracteres.'),
        lessThan(_topo(tester, 'Mínimo de 8 caracteres. Evite senhas comuns, como sequências e o seu nome.')),
      );
    });

    testWidgets('durante o envio a legenda fica centralizada', (tester) async {
      final resposta = Completer<http.Response>();
      await montar(tester, _servico((_) => resposta.future));
      final campos = find.byType(TextField);
      await tester.enterText(campos.at(0), 'nova-senha-longa');
      await tester.enterText(campos.at(1), 'nova-senha-longa');
      await tester.ensureVisible(find.text('Salvar senha'));
      await tester.tap(find.text('Salvar senha'));
      await tester.pump();

      expect(find.text('Salvando'), findsOneWidget);
      expect(tester.widget<Text>(find.text(_legenda)).textAlign, TextAlign.center);

      resposta.complete(http.Response('', 204));
      await tester.pumpAndSettle();
    });
  });
}
