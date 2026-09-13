import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

abstract interface class ThemePreferenceStore {
  Future<String?> read();

  Future<void> write(String value);
}

class SharedPreferencesThemeStore implements ThemePreferenceStore {
  static const String key = 'theme_mode';

  final SharedPreferencesAsync preferences;

  SharedPreferencesThemeStore({SharedPreferencesAsync? preferences})
    : preferences = preferences ?? SharedPreferencesAsync();

  @override
  Future<String?> read() => preferences.getString(key);

  @override
  Future<void> write(String value) => preferences.setString(key, value);
}

class ThemeController extends ChangeNotifier {
  final ThemePreferenceStore store;
  ThemeMode _mode = ThemeMode.system;

  ThemeController(this.store);

  ThemeMode get mode => _mode;

  Future<void> load() async {
    _mode = _decode(await store.read());
    notifyListeners();
  }

  Future<void> setMode(ThemeMode mode) async {
    _mode = mode;
    notifyListeners();
    await store.write(_encode(mode));
  }

  Future<void> toggleForBrightness(Brightness brightness) {
    final nextMode = brightness == Brightness.dark
        ? ThemeMode.light
        : ThemeMode.dark;
    return setMode(nextMode);
  }

  static ThemeMode _decode(String? value) {
    switch (value) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  static String _encode(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }
}
