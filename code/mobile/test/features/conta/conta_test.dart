import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/app/cabecalho_tela.dart';
import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/core/session/session_controller.dart';
import 'package:le_ai_mobile/core/session/token_store.dart';
import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/features/auth/auth_service.dart';
import 'package:le_ai_mobile/features/conta/alterar_senha_page.dart';
import 'package:le_ai_mobile/features/conta/configuracoes_page.dart';
import 'package:le_ai_mobile/features/conta/politica_de_privacidade.dart';
import 'package:le_ai_mobile/features/conta/recuperar_senha_page.dart';
import 'package:le_ai_mobile/features/conta/redefinir_senha_page.dart';

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

http.Response _erro(int status, String codigo, String mensagem) => http.Response(
  jsonEncode(<String, String>{'codigo': codigo, 'mensagem': mensagem, 'correlationId': 'c1'}),
  status,
  headers: <String, String>{'content-type': 'application/json; charset=utf-8'},
);

AuthService _servico(Future<http.Response> Function(http.Request) handler) {
  return AuthService(
    ApiClient(
      baseUrl: 'https://api.example.com',
      client: MockClient(handler),
      esperasDeRetentativa: const <Duration>[],
    ),
  );
}

Future<void> _tocar(WidgetTester tester, String texto) async {
  final alvo = find.text(texto).last;
  await tester.ensureVisible(alvo);
  await tester.tap(alvo);
  await tester.pumpAndSettle();
}

void main() {
  group('RecuperarSenhaPage', () {
    Future<void> pedir(WidgetTester tester, AuthService servico, String email) async {
      await tester.pumpWidget(_wrap(RecuperarSenhaPage(authService: servico)));
      await tester.enterText(find.byType(TextField), email);
      await _tocar(tester, 'Enviar link');
    }

    testWidgets('formato inválido fica no cliente', (tester) async {
      var chamado = false;
      await pedir(tester, _servico((_) async {
        chamado = true;
        return http.Response('', 202);
      }), 'marina.beltrao@');

      expect(find.text('Digite um e-mail completo, como nome@provedor.com.'), findsOneWidget);
      expect(chamado, isFalse);
    });

    testWidgets('202 vira a confirmação neutra com o e-mail digitado, sem chave repetida', (tester) async {
      String? chave;
      await pedir(tester, _servico((request) async {
        chave = request.headers['Idempotency-Key'];
        expect(request.headers.containsKey('Authorization'), isFalse);
        return http.Response(
          '{"mensagem":"Se o e-mail estiver cadastrado, você receberá as instruções em breve."}',
          202,
        );
      }), 'marina.beltrao@gmail.com');

      expect(chave, isNotNull);
      expect(find.text('Verifique seu e-mail'), findsOneWidget);
      expect(find.textContaining('Se existir uma conta com marina.beltrao@gmail.com'), findsOneWidget);
    });

    testWidgets('429 é alerta de limite, não confirmação', (tester) async {
      await pedir(
        tester,
        _servico((_) async => _erro(429, 'MUITAS_REQUISICOES', 'Muitas requisições.')),
        'marina.beltrao@gmail.com',
      );

      expect(find.text('Muitas solicitações. Tente de novo em alguns minutos.'), findsOneWidget);
      expect(find.text('Verifique seu e-mail'), findsNothing);
    });
  });

  group('RedefinirSenhaPage', () {
    late SessionController sessao;

    setUp(() {
      sessao = SessionController(_FakeTokenStore());
    });

    Future<void> montar(WidgetTester tester, String? token, AuthService servico) async {
      await tester.pumpWidget(
        _wrap(RedefinirSenhaPage(token: token, authService: servico, sessionController: sessao)),
      );
    }

    Future<void> preencher(WidgetTester tester, String nova, String confirmacao) async {
      await tester.enterText(find.byType(TextField).at(0), nova);
      await tester.enterText(find.byType(TextField).at(1), confirmacao);
      await _tocar(tester, 'Salvar senha');
    }

    testWidgets('sem token, a tela é "Este link não vale mais"', (tester) async {
      await montar(tester, null, _servico((_) async => http.Response('', 204)));

      expect(find.text('Este link não vale mais'), findsOneWidget);
      expect(find.byType(TextField), findsNothing);
    });

    testWidgets('sucesso manda o token e encerra a sessão local', (tester) async {
      await sessao.entrar('jwt', refreshToken: 'r');
      Map<String, dynamic>? corpo;
      await montar(tester, 'abc123', _servico((request) async {
        corpo = jsonDecode(request.body) as Map<String, dynamic>;
        return http.Response('', 204);
      }));

      await preencher(tester, 'senha-nova-longa', 'senha-nova-longa');

      expect(corpo, <String, dynamic>{'token': 'abc123', 'novaSenha': 'senha-nova-longa'});
      expect(find.text('Senha alterada'), findsOneWidget);
      expect(sessao.estaAutenticado, isFalse);
    });

    testWidgets('410 vira link inválido', (tester) async {
      await montar(
        tester,
        'vencido',
        _servico((_) async => _erro(410, 'RECURSO_EXPIRADO', 'O link de recuperação vale por 1 hora.')),
      );

      await preencher(tester, 'senha-nova-longa', 'senha-nova-longa');

      expect(find.text('Este link não vale mais'), findsOneWidget);
    });

    testWidgets('confirmação diferente fica no cliente', (tester) async {
      await montar(tester, 'abc123', _servico((_) async => http.Response('', 204)));

      await preencher(tester, 'senha-nova-longa', 'outra-coisa');

      expect(find.text('As duas senhas precisam ser iguais.'), findsOneWidget);
    });
  });

  group('AlterarSenhaPage', () {
    late SessionController sessao;

    setUp(() async {
      sessao = SessionController(_FakeTokenStore());
      await sessao.entrar('jwt-velho', refreshToken: 'renovacao-velha');
    });

    Future<void> alterar(WidgetTester tester, AuthService servico, String atual, String nova) async {
      await tester.pumpWidget(_wrap(AlterarSenhaPage(authService: servico, sessionController: sessao)));
      await tester.enterText(find.byType(TextField).at(0), atual);
      await tester.enterText(find.byType(TextField).at(1), nova);
      await tester.enterText(find.byType(TextField).at(2), nova);
      await _tocar(tester, 'Salvar nova senha');
    }

    testWidgets('sucesso troca, entra de novo com a senha nova e grava a sessão', (tester) async {
      final caminhos = <String>[];
      await alterar(tester, _servico((request) async {
        caminhos.add(request.url.path);
        return switch (request.url.path) {
          '/me' => http.Response('{"id":"u1","username":"marinableu","displayName":"Marina"}', 200),
          '/auth/password/change' => http.Response('', 204),
          _ => http.Response(
            '{"accessToken":"jwt-novo","tokenType":"Bearer","expiresIn":900,"refreshToken":"r-nova"}',
            200,
          ),
        };
      }), 'senha-atual-longa', 'senha-nova-longa');

      expect(caminhos, <String>['/me', '/auth/password/change', '/auth/login']);
      expect(sessao.token, 'jwt-novo');
      expect(sessao.refreshToken, 'r-nova');
      expect(find.text('Senha alterada'), findsOneWidget);
    });

    testWidgets('senha atual errada vira banner', (tester) async {
      await alterar(tester, _servico((request) async {
        if (request.url.path == '/me') {
          return http.Response('{"id":"u1","username":"marinableu","displayName":"Marina"}', 200);
        }
        return _erro(422, 'ENTIDADE_NAO_PROCESSAVEL', 'Senha atual incorreta.');
      }), 'errada-mas-longa', 'senha-nova-longa');

      expect(find.text('Senha atual incorreta.'), findsOneWidget);
      expect(find.text('Senha alterada'), findsNothing);
    });

    testWidgets('senha nova comum vira erro no campo, não banner', (tester) async {
      const comum = 'Essa senha é muito comum. Escolha uma que não esteja em listas conhecidas.';
      await alterar(tester, _servico((request) async {
        if (request.url.path == '/me') {
          return http.Response('{"id":"u1","username":"marinableu","displayName":"Marina"}', 200);
        }
        return _erro(422, 'ENTIDADE_NAO_PROCESSAVEL', comum);
      }), 'senha-atual-longa', 'senha1234');

      expect(find.text(comum), findsOneWidget);
    });

    testWidgets('fora da política, o erro vem logo abaixo do campo e o helper depois', (tester) async {
      await alterar(tester, _servico((_) async => http.Response('', 204)), 'senha-atual-longa', 'curta');

      final erro = tester.getTopLeft(find.text('Escolha uma senha com pelo menos 8 caracteres.'));
      final helper = tester.getTopLeft(find.textContaining('Mínimo de 8 caracteres.'));
      expect(erro.dy, lessThan(helper.dy));
    });

    testWidgets('salvando esconde Cancelar e centraliza o aviso de cold start', (tester) async {
      final troca = Completer<http.Response>();
      await tester.pumpWidget(
        _wrap(
          AlterarSenhaPage(
            authService: _servico((request) async {
              return switch (request.url.path) {
                '/me' => http.Response('{"id":"u1","username":"marinableu","displayName":"Marina"}', 200),
                '/auth/password/change' => await troca.future,
                _ => http.Response(
                  '{"accessToken":"jwt-novo","tokenType":"Bearer","expiresIn":900,"refreshToken":"r-nova"}',
                  200,
                ),
              };
            }),
            sessionController: sessao,
          ),
        ),
      );
      expect(find.text('Cancelar'), findsOneWidget);
      await tester.enterText(find.byType(TextField).at(0), 'senha-atual-longa');
      await tester.enterText(find.byType(TextField).at(1), 'senha-nova-longa');
      await tester.enterText(find.byType(TextField).at(2), 'senha-nova-longa');
      await tester.ensureVisible(find.text('Salvar nova senha'));
      await tester.tap(find.text('Salvar nova senha'));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Salvando'), findsOneWidget);
      expect(find.text('Cancelar'), findsNothing);
      final aviso = tester.widget<Text>(find.text('O servidor está iniciando. Isso pode levar alguns segundos.'));
      expect(aviso.textAlign, TextAlign.center);

      troca.complete(http.Response('', 204));
      await tester.pumpAndSettle();
      expect(find.text('Senha alterada'), findsOneWidget);
    });
  });

  group('PoliticaDePrivacidade', () {
    testWidgets('título do header em duas linhas, com divisor', (tester) async {
      await tester.pumpWidget(_wrap(const PoliticaDePrivacidadePage()));

      final cabecalho = tester.widget<CabecalhoTela>(find.byType(CabecalhoTela));
      expect(cabecalho.tituloEmDuasLinhas, isTrue);
      expect(cabecalho.semDivisor, isFalse);
    });
  });

  group('ConfiguracoesPage', () {
    testWidgets('mostra nome e username do /me e sai só depois de confirmar', (tester) async {
      var saiu = false;
      await tester.pumpWidget(
        _wrap(
          ConfiguracoesPage(
            authService: _servico(
              (_) async => http.Response('{"id":"u1","username":"marinableu","displayName":"Marina"}', 200),
            ),
            aoSair: () async => saiu = true,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Marina'), findsOneWidget);
      expect(find.text('@marinableu'), findsOneWidget);
      expect(find.text('Lê Ai · versão 1.0.0'), findsOneWidget);

      await _tocar(tester, 'Sair da conta');
      expect(find.text('Sair da conta?'), findsOneWidget);
      await _tocar(tester, 'Cancelar');
      expect(saiu, isFalse);

      await _tocar(tester, 'Sair da conta');
      await _tocar(tester, 'Sair');
      expect(saiu, isTrue);
    });

    testWidgets('mostra o e-mail do /me sob o username, e o skeleton tem três barras', (tester) async {
      await tester.pumpWidget(
        _wrap(
          ConfiguracoesPage(
            authService: _servico((_) async {
              await Future<void>.delayed(const Duration(milliseconds: 50));
              return http.Response(
                '{"id":"u1","username":"marinableu","displayName":"Marina",'
                '"email":"marina.beltrao@gmail.com"}',
                200,
              );
            }),
            aoSair: () async {},
          ),
        ),
      );

      expect(find.byType(FractionallySizedBox), findsNWidgets(3));
      expect(find.text('@marinableu'), findsNothing);

      await tester.pumpAndSettle();

      expect(find.byType(FractionallySizedBox), findsNothing);
      expect(find.text('marina.beltrao@gmail.com'), findsOneWidget);
      final handle = tester.getBottomLeft(find.text('@marinableu'));
      final email = tester.getTopLeft(find.text('marina.beltrao@gmail.com'));
      expect(email.dy - handle.dy, 4);
      final cabecalho = tester.widget<CabecalhoTela>(find.byType(CabecalhoTela));
      expect(cabecalho.semDivisor, isTrue);
    });
  });
}
