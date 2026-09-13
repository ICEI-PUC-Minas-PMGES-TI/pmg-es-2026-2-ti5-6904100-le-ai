import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/design/theme_controller.dart';

class _FakeThemeStore implements ThemePreferenceStore {
  String? value;

  @override
  Future<String?> read() async => value;

  @override
  Future<void> write(String value) async {
    this.value = value;
  }
}

void main() {
  test('restaura modo salvo e persiste nova escolha', () async {
    final store = _FakeThemeStore()..value = 'dark';
    final controller = ThemeController(store);

    await controller.load();
    expect(controller.mode, ThemeMode.dark);

    await controller.setMode(ThemeMode.light);
    expect(controller.mode, ThemeMode.light);
    expect(store.value, 'light');
  });

  test('valor inválido retorna ao modo do sistema', () async {
    final store = _FakeThemeStore()..value = 'invalid';
    final controller = ThemeController(store);

    await controller.load();

    expect(controller.mode, ThemeMode.system);
  });
}
