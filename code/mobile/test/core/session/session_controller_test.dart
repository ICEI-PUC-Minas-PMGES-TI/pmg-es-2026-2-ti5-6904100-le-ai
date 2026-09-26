import 'dart:async';

import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/core/session/session_controller.dart';
import 'package:le_ai_mobile/core/session/token_store.dart';

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

void main() {
  test('comeca carregando e para de carregar apos load()', () async {
    final store = _FakeTokenStore();
    final controller = SessionController(store);

    expect(controller.carregando, isTrue);

    await controller.load();

    expect(controller.carregando, isFalse);
  });

  test('sem token salvo, começa deslogado', () async {
    final store = _FakeTokenStore();
    final controller = SessionController(store);

    await controller.load();

    expect(controller.token, isNull);
    expect(controller.estaAutenticado, isFalse);
  });

  test('restaura token cru gravado antes de F-AUT, sem renovação', () async {
    final store = _FakeTokenStore()..value = 'jwt-salvo';
    final controller = SessionController(store);

    await controller.load();

    expect(controller.token, 'jwt-salvo');
    expect(controller.refreshToken, isNull);
    expect(controller.estaAutenticado, isTrue);
  });

  test('entrar grava os dois tokens e notifica antes de persistir', () async {
    final store = _FakeTokenStore();
    final controller = SessionController(store);
    var notificacoes = 0;
    controller.addListener(() => notificacoes++);

    await controller.entrar('jwt-novo', refreshToken: 'renovacao');

    expect(controller.token, 'jwt-novo');
    expect(controller.refreshToken, 'renovacao');
    expect(notificacoes, 1);

    final recarregado = SessionController(store);
    await recarregado.load();
    expect(recarregado.token, 'jwt-novo');
    expect(recarregado.refreshToken, 'renovacao');
  });

  group('renovar', () {
    late _FakeTokenStore store;
    late SessionController controller;

    setUp(() async {
      store = _FakeTokenStore();
      controller = SessionController(store);
      await controller.entrar('jwt-a', refreshToken: 'renovacao-a');
    });

    test('troca o refresh por um par novo', () async {
      String? usado;

      final renovou = await controller.renovar('jwt-a', (refresh) async {
        usado = refresh;
        return const TokensDaSessao(accessToken: 'jwt-b', refreshToken: 'renovacao-b');
      });

      expect(renovou, isTrue);
      expect(usado, 'renovacao-a');
      expect(controller.token, 'jwt-b');
      expect(controller.refreshToken, 'renovacao-b');
    });

    test('chamadas simultâneas compartilham uma renovação', () async {
      var chamadas = 0;
      final conclusao = Completer<TokensDaSessao>();
      Future<TokensDaSessao> chamada(String _) {
        chamadas++;
        return conclusao.future;
      }

      final primeira = controller.renovar('jwt-a', chamada);
      final segunda = controller.renovar('jwt-a', chamada);
      conclusao.complete(
        const TokensDaSessao(accessToken: 'jwt-b', refreshToken: 'renovacao-b'),
      );

      expect(await Future.wait(<Future<bool>>[primeira, segunda]), <bool>[true, true]);
      expect(chamadas, 1);
    });

    test('token que falhou já não é o da sessão: adota sem ir ao servidor', () async {
      var chamadas = 0;

      final renovou = await controller.renovar('jwt-antigo', (_) async {
        chamadas++;
        return const TokensDaSessao(accessToken: 'x', refreshToken: 'y');
      });

      expect(renovou, isTrue);
      expect(chamadas, 0);
    });

    test('401 na renovação encerra a sessão', () async {
      final renovou = await controller.renovar(
        'jwt-a',
        (_) async => throw const ApiException(
          kind: ApiFailureKind.invalidResponse,
          correlationId: 'c1',
          message: 'Sua sessão expirou. Entre novamente.',
          status: 401,
        ),
      );

      expect(renovou, isFalse);
      expect(controller.estaAutenticado, isFalse);
      expect(store.value, isNull);
    });

    test('servidor fora não desloga', () async {
      final renovou = await controller.renovar(
        'jwt-a',
        (_) async => throw const ApiException(
          kind: ApiFailureKind.network,
          correlationId: 'c1',
          message: 'Não foi possível conectar ao serviço.',
        ),
      );

      expect(renovou, isFalse);
      expect(controller.token, 'jwt-a');
    });
  });

  test('sairRevogando revoga o refresh e limpa, mesmo com o servidor fora', () async {
    final store = _FakeTokenStore();
    final controller = SessionController(store);
    await controller.entrar('jwt', refreshToken: 'renovacao');
    String? revogado;

    await controller.sairRevogando((refresh) async {
      revogado = refresh;
      throw const ApiException(
        kind: ApiFailureKind.network,
        correlationId: 'c1',
        message: 'Não foi possível conectar ao serviço.',
      );
    });

    expect(revogado, 'renovacao');
    expect(controller.estaAutenticado, isFalse);
    expect(store.value, isNull);
  });

  test('sair limpa o token em memória e no store', () async {
    final store = _FakeTokenStore()..value = 'jwt-salvo';
    final controller = SessionController(store);
    await controller.load();

    await controller.sair();

    expect(controller.token, isNull);
    expect(controller.estaAutenticado, isFalse);
    expect(store.value, isNull);
  });
}
