import 'package:flutter/foundation.dart';

import 'token_store.dart';

/// Estado de sessão do app: token de acesso, persistido em `TokenStore`. No molde de
/// `ThemeController` (`lib/design/theme_controller.dart`) — `load()` restaura do store,
/// `notifyListeners()` roda antes de persistir para a UI reagir sem esperar a escrita em disco.
///
/// Só o token, ainda. Dado de usuário (nome de exibição etc.) fica para quando uma tela de
/// verdade precisar dele (Etapa 12) — sem isso hoje, guardar mais que o token é estado sem uso.
class SessionController extends ChangeNotifier {
  final TokenStore store;
  String? _token;

  SessionController(this.store);

  String? get token => _token;

  bool get estaAutenticado => _token != null;

  Future<void> load() async {
    _token = await store.read();
    notifyListeners();
  }

  Future<void> entrar(String token) async {
    _token = token;
    notifyListeners();
    await store.write(token);
  }

  Future<void> sair() async {
    _token = null;
    notifyListeners();
    await store.delete();
  }
}
