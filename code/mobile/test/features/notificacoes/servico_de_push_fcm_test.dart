import 'dart:async';
import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/core/session/session_controller.dart';
import 'package:le_ai_mobile/core/session/token_store.dart';
import 'package:le_ai_mobile/features/notificacoes/dispositivo_push_store.dart';
import 'package:le_ai_mobile/features/notificacoes/dispositivos_push_service.dart';
import 'package:le_ai_mobile/features/notificacoes/mensageria_push.dart';
import 'package:le_ai_mobile/features/notificacoes/servico_de_push_fcm.dart';

const String _idDoDispositivo = '0b7e9f2c-6a3d-4c1b-9e55-3f1d2a4b6c7d';

class _Mensageria implements MensageriaPush {
  bool concedida;
  bool concedeAoPedir;
  String? token = 'fcm-1';
  int pedidosDePermissao = 0;
  final StreamController<String> renovacoes = StreamController<String>.broadcast();

  _Mensageria({this.concedida = true, this.concedeAoPedir = true});

  @override
  Future<bool> permissaoConcedida() async => concedida;

  @override
  Future<bool> solicitarPermissao() async {
    pedidosDePermissao++;
    concedida = concedeAoPedir;
    return concedeAoPedir;
  }

  @override
  Future<String?> obterToken() async => token;

  @override
  Stream<String> get tokenRenovado => renovacoes.stream;

  @override
  Stream<String> get notificacoesAbertas => const Stream<String>.empty();

  @override
  Future<String?> notificacaoDaAberturaInicial() async => null;

  @override
  Future<void> abrirAjustesDeNotificacao() async {}
}

class _DispositivoStore implements DispositivoPushStore {
  String? id;

  @override
  Future<String?> read() async => id;

  @override
  Future<void> write(String novo) async => id = novo;

  @override
  Future<void> delete() async => id = null;
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
  final List<http.Request> pedidos = <http.Request>[];
  int statusDoDelete = 204;

  http.Client get cliente => MockClient((pedido) async {
    pedidos.add(pedido);
    if (pedido.method == 'DELETE') {
      return http.Response('', statusDoDelete);
    }
    return http.Response(jsonEncode(<String, Object>{
      'id': _idDoDispositivo,
      'plataforma': 'android',
      'ativo': true,
    }), 201);
  });

  Iterable<http.Request> get registros => pedidos.where((p) => p.method == 'POST');

  Iterable<http.Request> get revogacoes => pedidos.where((p) => p.method == 'DELETE');
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late _Servidor servidor;
  late _DispositivoStore dispositivo;
  late SessionController sessao;
  late _Mensageria mensageria;
  late ServicoDePushFcm servico;

  Future<void> montar(_Mensageria nova) async {
    mensageria = nova;
    servidor = _Servidor();
    dispositivo = _DispositivoStore();
    final api = DispositivosPushService(
      ApiClient(
        baseUrl: 'http://social.test',
        client: servidor.cliente,
        getToken: () => sessao.token,
      ),
    );
    servico = ServicoDePushFcm(mensageria: mensageria, api: api, store: dispositivo);
    sessao = SessionController(_TokenStore(), revogarDispositivo: () => servico.revogar());
    servico.acompanhar(sessao);
  }

  tearDown(() {
    servico.dispose();
    unawaited(mensageria.renovacoes.close());
  });

  group('permissao concedida', () {
    setUp(() => montar(_Mensageria()));

    test('registra o token ao iniciar a sessao e guarda o id do dispositivo', () async {
      await sessao.entrar('jwt', refreshToken: 'renovacao');
      await pumpEventQueue();

      expect(servidor.registros, hasLength(1));
      final registro = servidor.registros.single;
      expect(registro.url.path, '/me/dispositivos-push');
      expect(registro.headers['Authorization'], 'Bearer jwt');
      expect(registro.headers['Idempotency-Key'], isNotEmpty);
      expect(jsonDecode(registro.body), <String, String>{'token': 'fcm-1', 'plataforma': 'android'});
      expect(dispositivo.id, _idDoDispositivo);
    });

    test('registra de novo o token renovado pelo FCM', () async {
      await sessao.entrar('jwt', refreshToken: 'renovacao');
      await pumpEventQueue();

      mensageria.renovacoes.add('fcm-2');
      await pumpEventQueue();

      expect(servidor.registros, hasLength(2));
      expect(jsonDecode(servidor.registros.last.body)['token'], 'fcm-2');
    });

    test('renovar a sessao nao registra o dispositivo outra vez', () async {
      await sessao.entrar('jwt', refreshToken: 'renovacao');
      await pumpEventQueue();

      await sessao.entrar('jwt-2', refreshToken: 'renovacao-2');
      await pumpEventQueue();

      expect(servidor.registros, hasLength(1));
    });

    test('logout revoga o dispositivo com o token ainda valido e limpa a sessao', () async {
      await sessao.entrar('jwt', refreshToken: 'renovacao');
      await pumpEventQueue();

      await sessao.sairRevogando((_) async {});

      expect(servidor.revogacoes, hasLength(1));
      final revogacao = servidor.revogacoes.single;
      expect(revogacao.url.path, '/me/dispositivos-push/$_idDoDispositivo');
      expect(revogacao.headers['Authorization'], 'Bearer jwt');
      expect(dispositivo.id, isNull);
      expect(sessao.estaAutenticado, isFalse);
    });

    test('depois do logout, token renovado pelo FCM nao e registrado', () async {
      await sessao.entrar('jwt', refreshToken: 'renovacao');
      await pumpEventQueue();
      await sessao.sairRevogando((_) async {});

      mensageria.renovacoes.add('fcm-2');
      await pumpEventQueue();

      expect(servidor.registros, hasLength(1));
    });

    test('servidor fora na revogacao nao impede o logout nem a revogacao da renovacao', () async {
      servidor.statusDoDelete = 500;
      await sessao.entrar('jwt', refreshToken: 'renovacao');
      await pumpEventQueue();
      String? refreshRevogado;

      await sessao.sairRevogando((refresh) async => refreshRevogado = refresh);

      expect(servidor.revogacoes, hasLength(1));
      expect(refreshRevogado, 'renovacao');
      expect(sessao.estaAutenticado, isFalse);
    });
  });

  group('permissao recusada', () {
    setUp(() => montar(_Mensageria(concedida: false, concedeAoPedir: false)));

    test('pede a permissao uma vez, nao chama o servidor e o logout segue normal', () async {
      await sessao.entrar('jwt', refreshToken: 'renovacao');
      await pumpEventQueue();

      expect(mensageria.pedidosDePermissao, 1);
      expect(await servico.notificacoesPermitidas(), isFalse);
      mensageria.renovacoes.add('fcm-2');
      await pumpEventQueue();

      await sessao.sairRevogando((_) async {});

      expect(servidor.pedidos, isEmpty);
      expect(sessao.estaAutenticado, isFalse);
    });

    test('ao voltar ao app com a permissao ligada no sistema, registra sem pedir de novo', () async {
      await sessao.entrar('jwt', refreshToken: 'renovacao');
      await pumpEventQueue();
      mensageria.concedida = true;

      TestWidgetsFlutterBinding.instance.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      TestWidgetsFlutterBinding.instance.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await pumpEventQueue();

      expect(mensageria.pedidosDePermissao, 1);
      expect(servidor.registros, hasLength(1));
    });
  });
}
