import 'package:flutter/foundation.dart';

import 'token_store.dart';

/// Estado de sessão do app: token de acesso, persistido em `TokenStore`. No molde de
/// `ThemeController` (`lib/design/theme_controller.dart`) — `load()` restaura do store,
/// `notifyListeners()` roda antes de persistir para a UI reagir sem esperar a escrita em disco.
///
/// Só o token, ainda. Dado de usuário (nome de exibição etc.) fica para quando uma tela de
/// verdade precisar dele — sem isso hoje, guardar mais que o token é estado sem uso.
///
/// [carregando] existe porque, ao contrário da web (`localStorage` é síncrono), ler
/// `flutter_secure_storage` é assíncrono (canal de plataforma até o Keystore/Keychain): há um
/// intervalo real entre o app abrir e a sessão ser conhecida. É esse intervalo que a guarda de
/// rota (Etapa 13) usa para decidir se mostra a tela de verificação de sessão em vez de já
/// redirecionar para `/login` ou `/estante`.
class SessionController extends ChangeNotifier {
  final TokenStore store;
  String? _token;
  bool _carregando = true;

  SessionController(this.store);

  String? get token => _token;

  bool get estaAutenticado => _token != null;

  bool get carregando => _carregando;

  Future<void> load() async {
    _token = await store.read();
    _carregando = false;
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
