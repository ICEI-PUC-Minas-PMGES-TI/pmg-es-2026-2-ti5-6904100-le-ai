import 'dart:convert';

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
import 'package:le_ai_mobile/features/auth/cadastro_page.dart';
import 'package:le_ai_mobile/features/auth/indicador_de_envio.dart';

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

/// O campo de data de nascimento é somente leitura e abre o seletor nativo em modo de
/// digitação (`DatePickerEntryMode.input`); dirige o diálogo de verdade em vez de tentar
/// escrever direto no campo, que não aceita teclado.
Future<void> _selecionarDataNascimento(WidgetTester tester, String dataBr) async {
  await tester.tap(find.byType(TextField).at(3));
  await tester.pumpAndSettle();

  await tester.enterText(find.byType(TextField).last, dataBr);
  await tester.pumpAndSettle();

  await tester.tap(find.byType(TextButton).last);
  await tester.pumpAndSettle();
}

/// A tela é mais alta que o viewport padrão de teste (800x600): o botão só recebe o toque
/// depois de rolar até ele ficar visível.
Future<void> _tocarBotaoPrincipal(WidgetTester tester, String texto) async {
  final botao = find.text(texto).last;
  await tester.ensureVisible(botao);
  await tester.tap(botao);
}

Future<void> _preencherFormularioValido(WidgetTester tester) async {
  final campos = find.byType(TextField);
  await tester.enterText(campos.at(0), 'marina.beltrao@gmail.com');
  await tester.enterText(campos.at(1), 'marinableu');
  await tester.enterText(campos.at(2), 'Marina Beltrão');
  await _selecionarDataNascimento(tester, '14/03/1999');
  await tester.enterText(find.byType(TextField).at(4), 'senha-bem-comprida');
  await tester.enterText(find.byType(TextField).at(5), 'senha-bem-comprida');
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

  testWidgets('valida no cliente antes de chamar o servidor: formulário vazio mostra os erros', (
    tester,
  ) async {
    var chamado = false;
    await tester.pumpWidget(
      _wrap(
        CadastroPage(
          authService: servico((request) async {
            chamado = true;
            return http.Response('{}', 201);
          }),
          sessionController: sessionController,
        ),
      ),
    );

    await _tocarBotaoPrincipal(tester, 'Criar conta');
    await tester.pump();

    expect(find.text('Informe seu e-mail.'), findsOneWidget);
    expect(find.text('Escolha um nome de usuário.'), findsOneWidget);
    expect(find.text('Informe seu nome de exibição.'), findsOneWidget);
    expect(find.text('Informe sua data de nascimento.'), findsOneWidget);
    expect(find.text('Escolha uma senha.'), findsOneWidget);
    expect(chamado, isFalse);
  });

  testWidgets('mostra o erro ao sair do campo, antes do envio, e o tira quando é corrigido', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CadastroPage(
          authService: servico((request) async => http.Response('{}', 201)),
          sessionController: sessionController,
        ),
      ),
    );
    final campos = find.byType(TextField);

    await tester.enterText(campos.at(0), 'marina@');
    await tester.pump();
    expect(find.text('Informe um e-mail válido.'), findsNothing);

    // Ir para o próximo campo tira o foco do e-mail: é o "sair do campo".
    await tester.tap(campos.at(1));
    await tester.pump();
    expect(find.text('Informe um e-mail válido.'), findsOneWidget);
    // Só o campo que a pessoa deixou; o username acabou de receber o foco.
    expect(find.text('Escolha um nome de usuário.'), findsNothing);

    await tester.enterText(campos.at(0), 'marina@gmail.com');
    await tester.pump();
    expect(find.text('Informe um e-mail válido.'), findsNothing);
  });

  testWidgets('recusa senha curta e menor de idade com as mensagens do protótipo', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CadastroPage(
          authService: servico((request) async => http.Response('{}', 201)),
          sessionController: sessionController,
        ),
      ),
    );

    final campos = find.byType(TextField);
    await tester.enterText(campos.at(0), 'marina.beltrao@gmail.com');
    await tester.enterText(campos.at(1), 'marinableu');
    await tester.enterText(campos.at(2), 'Marina Beltrão');
    await _selecionarDataNascimento(tester, '02/09/2010');
    await tester.enterText(find.byType(TextField).at(4), 'curta');

    await _tocarBotaoPrincipal(tester, 'Criar conta');
    await tester.pump();

    expect(
      find.text('É necessário ter 18 anos ou mais para criar uma conta.'),
      findsOneWidget,
    );
    expect(find.text('Use pelo menos 8 caracteres.'), findsOneWidget);
    // O helper continua visível: a regra não deixou de existir (cadastro.md §4.3).
    expect(find.text('Mínimo de 8 caracteres'), findsOneWidget);
  });

  testWidgets('cadastro bem-sucedido entra automaticamente e chama aoCadastrar', (
    tester,
  ) async {
    var chamadas = 0;
    var aoCadastrarChamado = false;
    await tester.pumpWidget(
      _wrap(
        CadastroPage(
          authService: servico((request) async {
            chamadas++;
            if (request.url.path.endsWith('/auth/register')) {
              return http.Response(
                '{"id":"u1","username":"marinableu","displayName":"Marina Beltrão"}',
                201,
              );
            }
            return http.Response(
              '{"accessToken":"jwt-novo","tokenType":"Bearer","expiresIn":900,"refreshToken":"renovacao"}',
              200,
            );
          }),
          sessionController: sessionController,
          aoCadastrar: () => aoCadastrarChamado = true,
        ),
      ),
    );

    await _preencherFormularioValido(tester);
    await _tocarBotaoPrincipal(tester, 'Criar conta');
    await tester.pumpAndSettle();

    expect(chamadas, 2);
    expect(sessionController.token, 'jwt-novo');
    expect(aoCadastrarChamado, isTrue);
  });

  testWidgets('conflito de username (409) mostra o banner e marca só o campo de usuário', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CadastroPage(
          authService: servico(
            (request) async => http.Response(
              '{"codigo":"CONFLITO","mensagem":"Esse nome de usuário já está em uso. Escolha outro.","correlationId":"c1"}',
              409,
            ),
          ),
          sessionController: sessionController,
        ),
      ),
    );

    await _preencherFormularioValido(tester);
    await _tocarBotaoPrincipal(tester, 'Criar conta');
    await tester.pumpAndSettle();

    expect(
      find.text('Esse nome de usuário já está em uso. Escolha outro.'),
      findsOneWidget,
    );
    final username = tester.widget<TextField>(find.byType(TextField).at(1));
    final borda = username.decoration!.enabledBorder as OutlineInputBorder;
    expect(borda.borderSide.color, AppTheme.light().colorScheme.error);
  });

  testWidgets('durante o envio o formulário vira o indicador e o botão muda de texto', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        CadastroPage(
          authService: servico((request) async {
            await Future<void>.delayed(const Duration(milliseconds: 50));
            if (request.url.path.endsWith('/auth/register')) {
              return http.Response(
                '{"id":"u1","username":"marinableu","displayName":"Marina Beltrão"}',
                201,
              );
            }
            return http.Response(
              '{"accessToken":"jwt","tokenType":"Bearer","expiresIn":900,"refreshToken":"renovacao"}',
              200,
            );
          }),
          sessionController: sessionController,
        ),
      ),
    );

    await _preencherFormularioValido(tester);
    await _tocarBotaoPrincipal(tester, 'Criar conta');
    await tester.pump();

    expect(find.text('Criando conta'), findsOneWidget);
    expect(
      find.text('O servidor está iniciando. Isso pode levar alguns segundos.'),
      findsOneWidget,
    );
    // Como no protótipo: o formulário dá lugar ao indicador centralizado e o botão esmaece.
    expect(find.byType(TextField), findsNothing);
    expect(find.byType(IndicadorDeEnvio), findsOneWidget);
    expect(tester.widget<ElevatedButton>(find.byType(ElevatedButton)).onPressed, isNull);

    // Deixa as duas chamadas (register + login) assentarem antes do teste terminar, senão o
    // timeout de 90s do ApiClient fica como timer pendente e o framework de teste reclama.
    await tester.pumpAndSettle();
  });

  testWidgets('volta com o formulário preenchido quando o envio falha', (tester) async {
    await tester.pumpWidget(
      _wrap(
        CadastroPage(
          authService: servico(
            (request) async => http.Response(
              '{"codigo":"CONFLITO","mensagem":"Esse nome de usuário já está em uso. Escolha outro.","correlationId":"c1"}',
              409,
            ),
          ),
          sessionController: sessionController,
        ),
      ),
    );

    await _preencherFormularioValido(tester);
    await _tocarBotaoPrincipal(tester, 'Criar conta');
    await tester.pumpAndSettle();

    final campos = find.byType(TextField);
    expect(campos, findsNWidgets(6));
    expect(tester.widget<TextField>(campos.at(1)).controller?.text, 'marinableu');
    expect(tester.widget<TextField>(campos.at(5)).controller?.text, 'senha-bem-comprida');
  });

  testWidgets('confirmar senha diferente mostra o erro ao sair do campo e bloqueia o envio', (
    tester,
  ) async {
    var chamado = false;
    await tester.pumpWidget(
      _wrap(
        CadastroPage(
          authService: servico((request) async {
            chamado = true;
            return http.Response('{}', 201);
          }),
          sessionController: sessionController,
        ),
      ),
    );
    await _preencherFormularioValido(tester);
    final campos = find.byType(TextField);

    await tester.enterText(campos.at(5), 'outra-senha-qualquer');
    await tester.pump();
    expect(find.text('As duas senhas precisam ser iguais.'), findsNothing);

    // Voltar para outro campo tira o foco da confirmação: é o "sair do campo".
    await tester.ensureVisible(campos.at(0));
    await tester.tap(campos.at(0));
    await tester.pump();
    expect(find.text('As duas senhas precisam ser iguais.'), findsOneWidget);

    await _tocarBotaoPrincipal(tester, 'Criar conta');
    await tester.pump();
    expect(chamado, isFalse);

    // Corrigir a senha para bater com a confirmação também tira o erro.
    await tester.enterText(campos.at(4), 'outra-senha-qualquer');
    await tester.pump();
    expect(find.text('As duas senhas precisam ser iguais.'), findsNothing);
  });

  testWidgets('a confirmação não vai no corpo do cadastro', (tester) async {
    String? corpo;
    await tester.pumpWidget(
      _wrap(
        CadastroPage(
          authService: servico((request) async {
            if (request.url.path.endsWith('/auth/register')) {
              corpo = request.body;
              return http.Response(
                '{"id":"u1","username":"marinableu","displayName":"Marina Beltrão"}',
                201,
              );
            }
            return http.Response(
              '{"accessToken":"jwt","tokenType":"Bearer","expiresIn":900,"refreshToken":"renovacao"}',
              200,
            );
          }),
          sessionController: sessionController,
        ),
      ),
    );

    await _preencherFormularioValido(tester);
    await _tocarBotaoPrincipal(tester, 'Criar conta');
    await tester.pumpAndSettle();

    expect(corpo, isNotNull);
    expect(
      (jsonDecode(corpo!) as Map<String, dynamic>).keys.toSet(),
      <String>{'email', 'username', 'displayName', 'dataNascimento', 'senha'},
    );
  });

  testWidgets('o aviso de privacidade é um parágrafo só e abre a política', (tester) async {
    var abriu = 0;
    await tester.pumpWidget(
      _wrap(
        CadastroPage(
          authService: servico((request) async => http.Response('{}', 201)),
          sessionController: sessionController,
          aoAbrirPolitica: () => abriu++,
        ),
      ),
    );

    final aviso = find.textContaining('Coletamos o mínimo de dados', findRichText: true);
    expect(aviso, findsOneWidget);
    expect(find.textContaining('Política de privacidade', findRichText: true), findsOneWidget);

    await tester.ensureVisible(aviso);
    await tester.tap(aviso);
    await tester.pump();
    expect(abriu, 1);
  });
}
