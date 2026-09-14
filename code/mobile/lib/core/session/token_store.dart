import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persistência do token de acesso. Costura no molde de `ThemePreferenceStore` /
/// `SharedPreferencesThemeStore` (`lib/design/theme_controller.dart`): a interface abstrata é o
/// que torna `SessionController` testável sem tocar Keystore/Keychain de verdade — os testes
/// usam um fake escrito à mão, não `flutter_secure_storage` real nem mock framework.
abstract interface class TokenStore {
  Future<String?> read();

  Future<void> write(String value);

  Future<void> delete();
}

/// `flutter_secure_storage` grava no Keystore (Android) / Keychain (iOS): diferente de
/// `SharedPreferences`, que é `plist`/XML em texto claro. É o que a feature P0-NAV decidiu para
/// o token de acesso, que não pode viver em preferência comum.
class SecureTokenStore implements TokenStore {
  static const String _key = 'access_token';

  final FlutterSecureStorage storage;

  SecureTokenStore({FlutterSecureStorage? storage})
    : storage = storage ?? const FlutterSecureStorage();

  @override
  Future<String?> read() => storage.read(key: _key);

  @override
  Future<void> write(String value) => storage.write(key: _key, value: value);

  @override
  Future<void> delete() => storage.delete(key: _key);
}
