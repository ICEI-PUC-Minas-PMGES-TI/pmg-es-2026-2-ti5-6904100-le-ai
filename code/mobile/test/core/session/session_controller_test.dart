import 'package:flutter_test/flutter_test.dart';

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
  test('sem token salvo, começa deslogado', () async {
    final store = _FakeTokenStore();
    final controller = SessionController(store);

    await controller.load();

    expect(controller.token, isNull);
    expect(controller.estaAutenticado, isFalse);
  });

  test('restaura o token salvo ao carregar', () async {
    final store = _FakeTokenStore()..value = 'jwt-salvo';
    final controller = SessionController(store);

    await controller.load();

    expect(controller.token, 'jwt-salvo');
    expect(controller.estaAutenticado, isTrue);
  });

  test('entrar grava o token e notifica antes de persistir', () async {
    final store = _FakeTokenStore();
    final controller = SessionController(store);
    var notificacoes = 0;
    controller.addListener(() => notificacoes++);

    await controller.entrar('jwt-novo');

    expect(controller.token, 'jwt-novo');
    expect(controller.estaAutenticado, isTrue);
    expect(store.value, 'jwt-novo');
    expect(notificacoes, 1);
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
