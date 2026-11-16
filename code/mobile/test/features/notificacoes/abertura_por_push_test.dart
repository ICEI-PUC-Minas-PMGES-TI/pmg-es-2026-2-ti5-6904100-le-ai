import 'dart:async';
import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/core/session/session_controller.dart';
import 'package:le_ai_mobile/core/session/token_store.dart';
import 'package:le_ai_mobile/features/notificacoes/abertura_por_push.dart';
import 'package:le_ai_mobile/features/notificacoes/mensageria_push.dart';
import 'package:le_ai_mobile/features/notificacoes/notificacoes_service.dart';
import 'package:le_ai_mobile/features/notificacoes/rotas_notificacoes.dart';

class _Mensageria extends MensageriaIndisponivel {
  final StreamController<String> abertas = StreamController<String>.broadcast();
  String? aberturaInicial;

  @override
  Stream<String> get notificacoesAbertas => abertas.stream;

  @override
  Future<String?> notificacaoDaAberturaInicial() async => aberturaInicial;
}

class _TokenStore implements TokenStore {
  String? valor;

  @override
  Future<String?> read() async => valor;

  @override
  Future<void> write(String novo) async => valor = novo;

  @override
  Future<void> delete() async => valor = null;
}

class _Servidor {
  final List<String> marcacoes = <String>[];
  bool notificacaoExiste = true;

  http.Client get cliente => MockClient((pedido) async {
    const cabecalhos = <String, String>{'content-type': 'application/json; charset=utf-8'};
    if (pedido.method == 'GET') {
      final itens = notificacaoExiste
          ? <Object?>[
              <String, Object?>{
                'id': 'n1',
                'tipo': 'SOLICITACAO_CRIADA',
                'mensagem': 'Caio quer seguir você.',
                'lida': false,
                'criadoEm': '2026-09-26T12:00:00Z',
              },
            ]
          : <Object?>[];
      return http.Response(
        jsonEncode(<String, Object?>{
          'itens': itens,
          'pagina': 0,
          'tamanho': 20,
          'totalItens': itens.length,
          'totalPaginas': 1,
          'ultima': true,
          'totalNaoLidas': itens.length,
        }),
        200,
        headers: cabecalhos,
      );
    }
    marcacoes.add(pedido.body);
    return http.Response('{"marcadas":1,"totalNaoLidas":0}', 200, headers: cabecalhos);
  });
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late _Servidor servidor;
  late _Mensageria mensageria;
  late SessionController sessao;
  late DependenciasDeNotificacoes notificacoes;
  late GoRouter router;
  late AberturaPorPush abertura;
  late List<String> visitadas;

  setUp(() {
    servidor = _Servidor();
    mensageria = _Mensageria();
    sessao = SessionController(_TokenStore());
    visitadas = <String>[];
    notificacoes = DependenciasDeNotificacoes(
      NotificacoesService(
        ApiClient(baseUrl: 'http://social.test', client: servidor.cliente),
        ApiClient(baseUrl: 'http://leitura.test'),
      ),
    );
    router = GoRouter(
      initialLocation: '/inicio',
      routes: <RouteBase>[
        GoRoute(path: '/inicio', builder: (_, _) => const SizedBox()),
        GoRoute(
          path: '/:resto(.*)',
          builder: (context, state) {
            visitadas.add(state.uri.path);
            return const SizedBox();
          },
        ),
      ],
    );
    abertura = AberturaPorPush(mensageria: mensageria, sessao: sessao, notificacoes: notificacoes);
  });

  tearDown(() {
    abertura.dispose();
    unawaited(mensageria.abertas.close());
  });

  testWidgets('toque com a sessao ainda carregando espera e abre o item depois', (tester) async {
    await tester.pumpWidget(WidgetsApp.router(routerConfig: router, color: const Color(0xFF000000)));
    abertura.iniciar(router);

    mensageria.abertas.add('n1');
    await tester.pump();
    expect(servidor.marcacoes, isEmpty);

    await sessao.entrar('jwt', refreshToken: 'renovacao');
    await tester.pump();
    expect(servidor.marcacoes, isEmpty);

    await sessao.load();
    await tester.pumpAndSettle();

    expect(router.routeInformationProvider.value.uri.path, '/perfil/solicitacoes');
    expect(servidor.marcacoes, hasLength(1));
  });

  testWidgets('notificacao fora da primeira pagina abre a lista de notificacoes', (tester) async {
    servidor.notificacaoExiste = false;
    await sessao.entrar('jwt', refreshToken: 'renovacao');
    await sessao.load();
    await tester.pumpWidget(WidgetsApp.router(routerConfig: router, color: const Color(0xFF000000)));
    abertura.iniciar(router);

    mensageria.abertas.add('n9');
    await tester.pumpAndSettle();

    expect(router.routeInformationProvider.value.uri.path, '/estante/notificacoes');
    expect(servidor.marcacoes, isEmpty);
  });
}
