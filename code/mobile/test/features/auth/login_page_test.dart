import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/core/session/session_controller.dart';
import 'package:le_ai_mobile/core/session/token_store.dart';
import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/features/auth/auth_service.dart';
import 'package:le_ai_mobile/features/auth/indicador_de_envio.dart';
import 'package:le_ai_mobile/features/auth/login_page.dart';

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
    home: child,
  );
}

/// A tela é mais alta que o viewport padrão de teste (800x600): o botão só recebe o toque
/// depois de rolar até ele ficar visível.
Future<void> _tocarBotaoPrincipal(WidgetTester tester, String texto) async {
  final botao = find.text(texto).last;
  await tester.ensureVisible(botao);
  await tester.tap(botao);
}

void main() {
  late TokenStore store;
  late SessionController sessionController;

  setUp(() {
    store = _FakeTokenStore();
    sessionController = SessionController(store);
  });

  AuthService servico(Future<http.Response> Function(http.Request) handler) {
    final client = MockClient(handler);
    final api = ApiClient(baseUrl: 'https://api.example.com', client: client);
    return AuthService(api);
  }

  testWidgets('valida no cliente antes de chamar o servidor: campos vazios mostram os erros', (
    tester,
  ) async {
    var chamado = false;
    await tester.pumpWidget(
      _wrap(
        LoginPage(
          authService: servico((request) async {
            chamado = true;
            return http.Response('{}', 200);
          }),
          sessionController: sessionController,
        ),
      ),
    );

    await _tocarBotaoPrincipal(tester, 'Entrar');
    await tester.pump();

    expect(find.text('Informe seu e-mail ou nome de usuário.'), findsOneWidget);
    expect(find.text('Informe sua senha.'), findsOneWidget);
    expect(chamado, isFalse);
  });

  testWidgets('login bem-sucedido inicia a sessão e chama aoEntrar', (tester) async {
    var aoEntrarChamado = false;
    await tester.pumpWidget(
      _wrap(
        LoginPage(
          authService: servico(
            (request) async => http.Response(
              '{"accessToken":"jwt-novo","tokenType":"Bearer","expiresIn":900,"refreshToken":"renovacao"}',
              200,
            ),
          ),
          sessionController: sessionController,
          aoEntrar: () => aoEntrarChamado = true,
        ),
      ),
    );

    final campos = find.byType(TextField);
    await tester.enterText(campos.at(0), 'marinableu');
    await tester.enterText(campos.at(1), 'senha-bem-comprida');
    await _tocarBotaoPrincipal(tester, 'Entrar');
    await tester.pumpAndSettle();

    expect(sessionController.token, 'jwt-novo');
    expect(sessionController.refreshToken, 'renovacao');
    expect(aoEntrarChamado, isTrue);
  });

  testWidgets('credencial inválida marca os dois campos, mantém o identificador e limpa a senha', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        LoginPage(
          authService: servico(
            (request) async => http.Response(
              '{"codigo":"NAO_AUTENTICADO","mensagem":"E-mail, nome de usuário ou senha incorretos.","correlationId":"c1"}',
              401,
            ),
          ),
          sessionController: sessionController,
        ),
      ),
    );

    final campos = find.byType(TextField);
    await tester.enterText(campos.at(0), 'marinableu');
    await tester.enterText(campos.at(1), 'senha-errada');
    await _tocarBotaoPrincipal(tester, 'Entrar');
    await tester.pumpAndSettle();

    expect(
      find.text('E-mail, nome de usuário ou senha incorretos.'),
      findsOneWidget,
    );
    final identificador = tester.widget<TextField>(campos.at(0));
    final senha = tester.widget<TextField>(campos.at(1));
    final bordaIdentificador =
        identificador.decoration!.enabledBorder as OutlineInputBorder;
    final bordaSenha = senha.decoration!.enabledBorder as OutlineInputBorder;
    expect(bordaIdentificador.borderSide.color, AppTheme.light().colorScheme.error);
    expect(bordaSenha.borderSide.color, AppTheme.light().colorScheme.error);
    expect(identificador.controller?.text, 'marinableu');
    expect(senha.controller?.text, '');
  });

  testWidgets('bloqueio mostra alerta ambar e desabilita o botão; editar um campo libera de novo', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        LoginPage(
          authService: servico(
            (request) async => http.Response(
              '{"codigo":"MUITAS_REQUISICOES","mensagem":"Muitas tentativas. Tente de novo em alguns minutos.","correlationId":"c1"}',
              429,
            ),
          ),
          sessionController: sessionController,
        ),
      ),
    );

    final campos = find.byType(TextField);
    await tester.enterText(campos.at(0), 'marinableu');
    await tester.enterText(campos.at(1), 'senha-bem-comprida');
    await _tocarBotaoPrincipal(tester, 'Entrar');
    await tester.pumpAndSettle();

    expect(
      find.text('Muitas tentativas. Tente de novo em alguns minutos.'),
      findsOneWidget,
    );
    final botao = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
    expect(botao.onPressed, isNull);
    // Bloqueio é alerta (ambar), não erro (rubi): os campos não ganham borda de erro.
    final identificador = tester.widget<TextField>(campos.at(0));
    final bordaIdentificador =
        identificador.decoration!.enabledBorder as OutlineInputBorder;
    expect(
      bordaIdentificador.borderSide.color,
      isNot(AppTheme.light().colorScheme.error),
    );

    await tester.enterText(campos.at(1), 'outra-tentativa');
    await tester.pump();

    final botaoLiberado = tester.widget<ElevatedButton>(
      find.byType(ElevatedButton),
    );
    expect(botaoLiberado.onPressed, isNotNull);
    expect(find.text('Muitas tentativas. Tente de novo em alguns minutos.'), findsNothing);
  });

  testWidgets('durante o envio os campos ficam desabilitados e o botão muda de texto', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        LoginPage(
          authService: servico((request) async {
            await Future<void>.delayed(const Duration(milliseconds: 50));
            return http.Response(
              '{"accessToken":"jwt","tokenType":"Bearer","expiresIn":900,"refreshToken":"renovacao"}',
              200,
            );
          }),
          sessionController: sessionController,
        ),
      ),
    );

    final campos = find.byType(TextField);
    await tester.enterText(campos.at(0), 'marinableu');
    await tester.enterText(campos.at(1), 'senha-bem-comprida');
    await _tocarBotaoPrincipal(tester, 'Entrar');
    await tester.pump();

    expect(find.text('Entrando'), findsOneWidget);
    expect(
      find.text('O servidor está iniciando. Isso pode levar alguns segundos.'),
      findsOneWidget,
    );
    final identificador = tester.widget<TextField>(campos.at(0));
    expect(identificador.enabled, isFalse);
    // Protótipo (Login · Entrando): indicador entre o link e o botão.
    expect(find.byType(IndicadorDeEnvio), findsOneWidget);

    await tester.pumpAndSettle();
    expect(find.byType(IndicadorDeEnvio), findsNothing);
  });
}
