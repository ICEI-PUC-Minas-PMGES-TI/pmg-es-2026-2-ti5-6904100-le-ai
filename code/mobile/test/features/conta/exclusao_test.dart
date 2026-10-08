import 'dart:async';
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
import 'package:le_ai_mobile/features/conta/excluir_conta_page.dart';
import 'package:le_ai_mobile/features/conta/exclusao_service.dart';
import 'package:le_ai_mobile/features/conta/exclusao_solicitada_page.dart';
import 'package:le_ai_mobile/features/conta/recuperar_conta_page.dart';

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

const _json = <String, String>{'content-type': 'application/json; charset=utf-8'};

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

http.Response _erro(int status, String codigo) => http.Response(
  jsonEncode(<String, String>{'codigo': codigo, 'mensagem': 'Falhou.', 'correlationId': 'c1'}),
  status,
  headers: _json,
);

ApiClient _cliente(Future<http.Response> Function(http.Request) handler) => ApiClient(
  baseUrl: 'https://api.example.com',
  client: MockClient(handler),
  esperasDeRetentativa: const <Duration>[],
);

AcessoDeRecuperacao _acesso({required Duration faltando}) => AcessoDeRecuperacao(
  accessToken: 'jwt-recuperacao',
  expiresIn: 900,
  exclusaoSolicitadaEm: DateTime.now().subtract(const Duration(days: 7)),
  exclusaoPrevistaEm: DateTime.now().add(faltando),
  username: 'marinableu',
  nomeExibicao: 'Marina Beltrão',
);

Future<void> _tocar(WidgetTester tester, Finder alvo) async {
  await tester.ensureVisible(alvo);
  await tester.tap(alvo);
  await tester.pumpAndSettle();
}

void main() {
  group('prazo', () {
    test('dias que faltam arredondam para cima e nunca ficam abaixo de 1', () {
      final agora = DateTime.utc(2026, 10, 6, 12);
      expect(diasAte(DateTime.utc(2026, 10, 29, 12), agora), 23);
      expect(diasAte(DateTime.utc(2026, 10, 29, 13), agora), 24);
      expect(diasAte(DateTime.utc(2026, 10, 6, 13), agora), 1);
      expect(diasAte(DateTime.utc(2026, 10, 5), agora), 1);
    });

    test('singular e plural dos dias', () {
      expect(textoDosDias(1), 'Falta 1 dia');
      expect(textoDosDias(23), 'Faltam 23 dias');
    });

    test('a data limite é agora mais 30 dias, por extenso', () {
      final limite = dataLimiteAPartirDeAgora(DateTime(2026, 9, 29, 10));
      expect(dataPorExtenso(limite), '29 de outubro de 2026');
    });
  });

  group('AuthService.entrar', () {
    test('distingue o acesso de recuperação pelo tipo', () async {
      final servico = AuthService(
        _cliente(
          (request) async => http.Response(
            jsonEncode(<String, Object>{
              'tipo': 'recuperacao_exclusao',
              'accessToken': 'jwt-r',
              'tokenType': 'Bearer',
              'expiresIn': 900,
              'exclusaoSolicitadaEm': '2026-09-29T12:00:00Z',
              'exclusaoPrevistaEm': '2026-10-29T12:00:00Z',
              'username': 'marinableu',
              'nomeExibicao': 'Marina Beltrão',
            }),
            200,
            headers: _json,
          ),
        ),
      );
      final resultado = await servico.entrar(identificador: 'marinableu', senha: 'x');
      expect(resultado, isA<LoginDeRecuperacao>());
      final acesso = (resultado as LoginDeRecuperacao).acesso;
      expect(acesso.accessToken, 'jwt-r');
      expect(acesso.exclusaoPrevistaEm, DateTime.utc(2026, 10, 29, 12));
    });

    test('sessão normal, com ou sem o tipo, continua sendo sessão', () async {
      final servico = AuthService(
        _cliente(
          (request) async => http.Response(
            '{"tipo":"sessao","accessToken":"a","tokenType":"Bearer","expiresIn":900,'
            '"refreshToken":"r"}',
            200,
            headers: _json,
          ),
        ),
      );
      final resultado = await servico.entrar(identificador: 'marinableu', senha: 'x');
      expect((resultado as LoginComSessao).sessao.refreshToken, 'r');
    });
  });

  group('SessionController', () {
    test('o acesso de recuperação fica só em memória e não conta como sessão', () async {
      final store = _FakeTokenStore();
      final sessao = SessionController(store);
      await sessao.load();
      var avisos = 0;
      sessao.addListener(() => avisos++);

      sessao.guardarRecuperacao(_acesso(faltando: const Duration(days: 23)));
      expect(sessao.recuperacao, isNotNull);
      expect(sessao.estaAutenticado, isFalse);
      expect(store.value, isNull);
      expect(avisos, 1);

      // Descartar não avisa: a tela de recuperação continua aberta para o estado final.
      sessao.descartarRecuperacao();
      expect(sessao.recuperacao, isNull);
      expect(avisos, 1);
    });
  });

  group('ExcluirContaPage', () {
    late List<http.Request> pedidos;
    late List<http.Response Function()> respostas;
    DateTime? solicitadaAte;

    AuthService authService() => AuthService(
      _cliente(
        (request) async => http.Response(
          '{"id":"u1","username":"marinableu","displayName":"Marina Beltrão",'
          '"email":"marina.beltrao@gmail.com"}',
          200,
          headers: _json,
        ),
      ),
    );

    ExclusaoService servico() => ExclusaoService(
      _cliente((request) async {
        pedidos.add(request);
        return respostas.removeAt(0)();
      }),
    );

    setUp(() {
      pedidos = <http.Request>[];
      respostas = <http.Response Function()>[];
      solicitadaAte = null;
    });

    Future<void> abrir(WidgetTester tester) async {
      await tester.pumpWidget(
        _wrap(
          ExcluirContaPage(
            servico: servico(),
            authService: authService(),
            aoExclusaoSolicitada: (previstaEm) async => solicitadaAte = previstaEm,
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    Future<void> preencherEConfirmar(WidgetTester tester, {String senha = 'senha-certa'}) async {
      await tester.enterText(find.byType(TextField), senha);
      await tester.pump();
      await _tocar(tester, find.widgetWithText(OutlinedButton, 'Excluir conta'));
      // A folha de confirmação: o destrutivo dela é o último `Excluir conta`.
      expect(find.text('Excluir sua conta?'), findsOneWidget);
      await _tocar(tester, find.widgetWithText(OutlinedButton, 'Excluir conta').last);
    }

    Future<void> marcarCaixa(WidgetTester tester) async {
      await _tocar(tester, find.textContaining('a exclusão não pode ser desfeita'));
    }

    testWidgets('mostra as consequências com o nome de usuário e o e-mail do /me', (tester) async {
      await abrir(tester);
      expect(find.text('Oculta a partir de agora'), findsOneWidget);
      expect(
        find.textContaining('@marinableu e marina.beltrao@gmail.com continuam ligados'),
        findsOneWidget,
      );
    });

    testWidgets('sem senha ou sem a caixa marcada, o botão não abre a confirmação', (
      tester,
    ) async {
      await abrir(tester);
      await _tocar(tester, find.widgetWithText(OutlinedButton, 'Excluir conta'));
      expect(find.text('Excluir sua conta?'), findsNothing);

      await tester.enterText(find.byType(TextField), 'senha-certa');
      await tester.pump();
      await _tocar(tester, find.widgetWithText(OutlinedButton, 'Excluir conta'));
      expect(find.text('Excluir sua conta?'), findsNothing);
    });

    testWidgets('no 202 envia senha e confirmação e entrega a data do servidor', (tester) async {
      respostas.add(
        () => http.Response(
          '{"exclusaoSolicitadaEm":"2026-10-08T15:00:00Z",'
          '"exclusaoPrevistaEm":"2026-11-07T15:00:00Z"}',
          202,
          headers: _json,
        ),
      );
      await abrir(tester);
      await marcarCaixa(tester);
      await preencherEConfirmar(tester);

      expect(pedidos.single.method, 'DELETE');
      expect(pedidos.single.url.path, '/me/conta');
      expect(jsonDecode(pedidos.single.body), <String, Object>{
        'senha': 'senha-certa',
        'confirmacao': true,
      });
      expect(pedidos.single.headers['Idempotency-Key'], isNotEmpty);
      expect(solicitadaAte, DateTime.utc(2026, 11, 7, 15));
    });

    testWidgets('senha errada: banner, campo limpo e a caixa continua marcada', (tester) async {
      respostas.add(() => _erro(422, 'ENTIDADE_NAO_PROCESSAVEL'));
      await abrir(tester);
      await marcarCaixa(tester);
      await preencherEConfirmar(tester, senha: 'senha-errada');

      expect(find.text('Senha incorreta. Sua conta continua como estava.'), findsOneWidget);
      expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, isEmpty);
      expect(
        tester.getSemantics(find.bySemanticsLabel(RegExp('a exclusão não pode ser desfeita'))),
        isSemantics(isChecked: true),
      );
      expect(solicitadaAte, isNull);
    });

    testWidgets('muitas tentativas: alerta e campo desabilitado', (tester) async {
      respostas.add(() => _erro(429, 'MUITAS_REQUISICOES'));
      await abrir(tester);
      await marcarCaixa(tester);
      await preencherEConfirmar(tester);

      expect(find.textContaining('Muitas tentativas com a senha errada'), findsOneWidget);
      expect(tester.widget<TextField>(find.byType(TextField)).enabled, isFalse);
    });

    testWidgets('falha de envio preserva a senha e reenvia com a mesma chave', (tester) async {
      respostas
        ..add(() => _erro(500, 'ERRO_INTERNO'))
        ..add(
          () => http.Response(
            '{"exclusaoSolicitadaEm":"2026-10-08T15:00:00Z",'
            '"exclusaoPrevistaEm":"2026-11-07T15:00:00Z"}',
            202,
            headers: _json,
          ),
        );
      await abrir(tester);
      await marcarCaixa(tester);
      await preencherEConfirmar(tester);

      expect(find.textContaining('Não foi possível pedir a exclusão.'), findsOneWidget);
      expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, 'senha-certa');

      await _tocar(tester, find.widgetWithText(OutlinedButton, 'Excluir conta'));
      await _tocar(tester, find.widgetWithText(OutlinedButton, 'Excluir conta').last);

      expect(pedidos, hasLength(2));
      expect(pedidos[1].headers['Idempotency-Key'], pedidos[0].headers['Idempotency-Key']);
      expect(solicitadaAte, isNotNull);
    });

    testWidgets('enquanto o servidor acorda, mostra Excluindo e o aviso, sem erro', (
      tester,
    ) async {
      final resposta = Completer<http.Response>();
      await tester.pumpWidget(
        _wrap(
          ExcluirContaPage(
            servico: ExclusaoService(_cliente((request) => resposta.future)),
            authService: authService(),
            aoExclusaoSolicitada: (previstaEm) async => solicitadaAte = previstaEm,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await marcarCaixa(tester);
      await preencherEConfirmar(tester);

      expect(find.text('Excluindo'), findsOneWidget);
      expect(
        find.text('O servidor está iniciando. Isso pode levar alguns segundos.'),
        findsOneWidget,
      );
      expect(find.textContaining('Não foi possível pedir a exclusão.'), findsNothing);

      resposta.complete(_erro(503, 'SERVICO_INDISPONIVEL'));
      await tester.pumpAndSettle();
    });

    testWidgets('timeout vira o erro de envio, com a senha preservada', (tester) async {
      await tester.pumpWidget(
        _wrap(
          ExcluirContaPage(
            servico: ExclusaoService(
              ApiClient(
                baseUrl: 'https://api.example.com',
                client: MockClient((request) => Completer<http.Response>().future),
                timeout: const Duration(seconds: 1),
                esperasDeRetentativa: const <Duration>[],
              ),
            ),
            authService: authService(),
            aoExclusaoSolicitada: (previstaEm) async => solicitadaAte = previstaEm,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await marcarCaixa(tester);
      await tester.enterText(find.byType(TextField), 'senha-certa');
      await tester.pump();
      await _tocar(tester, find.widgetWithText(OutlinedButton, 'Excluir conta'));
      await tester.tap(find.widgetWithText(OutlinedButton, 'Excluir conta').last);
      await tester.pump(const Duration(seconds: 2));
      await tester.pumpAndSettle();

      expect(find.textContaining('Não foi possível pedir a exclusão.'), findsOneWidget);
      expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, 'senha-certa');
      expect(solicitadaAte, isNull);
    });
  });

  group('RecuperarContaPage', () {
    late SessionController sessao;
    late List<http.Request> pedidos;
    late List<http.Response Function()> respostas;
    var foiAoLogin = false;

    setUp(() async {
      sessao = SessionController(_FakeTokenStore());
      await sessao.load();
      pedidos = <http.Request>[];
      respostas = <http.Response Function()>[];
      foiAoLogin = false;
    });

    Future<void> abrir(WidgetTester tester, AcessoDeRecuperacao acesso) async {
      sessao.guardarRecuperacao(acesso);
      await tester.pumpWidget(
        _wrap(
          RecuperarContaPage(
            sessionController: sessao,
            servico: ExclusaoService(
              _cliente((request) async {
                pedidos.add(request);
                return respostas.removeAt(0)();
              }),
            ),
            aoIrParaLogin: () => foiAoLogin = true,
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('mostra a data, os dias que faltam e nenhuma faixa de prazo', (tester) async {
      await abrir(tester, _acesso(faltando: const Duration(days: 22, hours: 12)));
      expect(find.text('Sua conta está em exclusão'), findsOneWidget);
      expect(find.text('Marina Beltrão · @marinableu'), findsOneWidget);
      expect(find.text('Faltam 23 dias'), findsOneWidget);
      expect(find.textContaining('não será mais possível recuperar'), findsNothing);
    });

    testWidgets('no último dia aparece a faixa de prazo', (tester) async {
      await abrir(tester, _acesso(faltando: const Duration(hours: 10)));
      expect(find.text('Falta 1 dia'), findsOneWidget);
      expect(find.textContaining('não será mais possível recuperar a conta'), findsOneWidget);
    });

    testWidgets('cancelar usa o token de recuperação e descarta o acesso', (tester) async {
      respostas.add(() => http.Response('', 204));
      await abrir(tester, _acesso(faltando: const Duration(days: 23)));
      await _tocar(tester, find.text('Cancelar exclusão'));

      expect(pedidos.single.url.path, '/me/conta/cancelar-exclusao');
      expect(pedidos.single.headers['Authorization'], 'Bearer jwt-recuperacao');
      expect(find.text('Conta recuperada'), findsOneWidget);
      expect(sessao.recuperacao, isNull);

      await _tocar(tester, find.text('Entrar'));
      expect(foiAoLogin, isTrue);
    });

    testWidgets('erro mantém a exclusão agendada e reenvia com a mesma chave', (tester) async {
      respostas
        ..add(() => _erro(503, 'SERVICO_INDISPONIVEL'))
        ..add(() => http.Response('', 204));
      await abrir(tester, _acesso(faltando: const Duration(days: 23)));
      await _tocar(tester, find.text('Cancelar exclusão'));

      expect(find.textContaining('Não foi possível cancelar a exclusão.'), findsOneWidget);
      expect(sessao.recuperacao, isNotNull);

      await _tocar(tester, find.text('Cancelar exclusão'));
      expect(pedidos, hasLength(2));
      expect(pedidos[1].headers['Idempotency-Key'], pedidos[0].headers['Idempotency-Key']);
      expect(find.text('Conta recuperada'), findsOneWidget);
    });

    testWidgets('acesso vencido: alerta, Entrar de novo e sem Sair', (tester) async {
      respostas.add(() => _erro(401, 'NAO_AUTENTICADO'));
      await abrir(tester, _acesso(faltando: const Duration(days: 23)));
      await _tocar(tester, find.text('Cancelar exclusão'));

      expect(find.textContaining('Seu acesso para cancelar expirou.'), findsOneWidget);
      expect(find.text('Sair'), findsNothing);
      expect(sessao.recuperacao, isNull);

      await _tocar(tester, find.text('Entrar de novo'));
      expect(foiAoLogin, isTrue);
    });

    testWidgets('Sair descarta o acesso sem pedir confirmação', (tester) async {
      await abrir(tester, _acesso(faltando: const Duration(days: 23)));
      await _tocar(tester, find.text('Sair'));
      expect(foiAoLogin, isTrue);
      expect(sessao.recuperacao, isNull);
      expect(pedidos, isEmpty);
    });

    testWidgets('timeout mantém a exclusão agendada e o acesso, sem tratar como vencido', (
      tester,
    ) async {
      sessao.guardarRecuperacao(_acesso(faltando: const Duration(days: 23)));
      await tester.pumpWidget(
        _wrap(
          RecuperarContaPage(
            sessionController: sessao,
            servico: ExclusaoService(
              ApiClient(
                baseUrl: 'https://api.example.com',
                client: MockClient((request) => Completer<http.Response>().future),
                timeout: const Duration(seconds: 1),
                esperasDeRetentativa: const <Duration>[],
              ),
            ),
            aoIrParaLogin: () => foiAoLogin = true,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cancelar exclusão'));
      await tester.pump();
      expect(find.text('Cancelando'), findsOneWidget);
      expect(
        find.text('O servidor está iniciando. Isso pode levar alguns segundos.'),
        findsOneWidget,
      );

      await tester.pump(const Duration(seconds: 2));
      await tester.pumpAndSettle();
      expect(find.textContaining('Não foi possível cancelar a exclusão.'), findsOneWidget);
      expect(sessao.recuperacao, isNotNull);
    });
  });

  group('ExclusaoSolicitadaPage', () {
    testWidgets('mostra a data do servidor e leva ao login', (tester) async {
      var foiAoLogin = false;
      await tester.pumpWidget(
        _wrap(
          ExclusaoSolicitadaPage(
            previstaEm: DateTime.utc(2026, 11, 7, 15),
            aoIrParaLogin: () => foiAoLogin = true,
          ),
        ),
      );
      expect(find.text('Exclusão solicitada'), findsOneWidget);
      expect(find.text('7 de novembro de 2026'), findsOneWidget);
      await _tocar(tester, find.text('Ir para o login'));
      expect(foiAoLogin, isTrue);
    });

    testWidgets('sem a data, fala do prazo sem inventar uma', (tester) async {
      await tester.pumpWidget(
        _wrap(ExclusaoSolicitadaPage(previstaEm: null, aoIrParaLogin: () {})),
      );
      expect(find.text('daqui a 30 dias'), findsOneWidget);
    });
  });
}
