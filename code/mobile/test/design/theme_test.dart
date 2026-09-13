import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/design/tokens.dart';

void main() {
  test('expõe os tokens canônicos de cor e escala', () {
    expect(DesignTokens.papel, const Color(0xFFF4F2EC));
    expect(DesignTokens.noite, const Color(0xFF141311));
    expect(DesignTokens.musgo, const Color(0xFF3E5C42));
    expect(DesignTokens.musgoClaro, const Color(0xFF8FB27A));
    expect(DesignTokens.space5, 20);
    expect(DesignTokens.radiusMd, 16);
    expect(DesignTokens.durBase, const Duration(milliseconds: 260));
    expect(DesignTokens.elevation1Light, hasLength(2));
    expect(DesignTokens.elevation1Dark, hasLength(2));
    expect(DesignTokens.easeOut, isA<Cubic>());
  });

  test('mapeia as superfícies e acentos do tema claro', () {
    final theme = AppTheme.light();

    expect(theme.brightness, Brightness.light);
    expect(theme.pageBackground, DesignTokens.papel);
    expect(theme.elevatedSurface, DesignTokens.papelElevado);
    expect(theme.primaryAccent, DesignTokens.musgo);
    expect(theme.colorScheme.onPrimary, DesignTokens.papel);
  });

  test('mapeia as superfícies e acentos do tema escuro', () {
    final theme = AppTheme.dark();

    expect(theme.brightness, Brightness.dark);
    expect(theme.pageBackground, DesignTokens.noite);
    expect(theme.elevatedSurface, DesignTokens.noiteElevada);
    expect(theme.primaryAccent, DesignTokens.musgoClaro);
    expect(theme.colorScheme.onPrimary, DesignTokens.noite);
    expect(theme.numInline.fontFeatures, isNotEmpty);
    expect(theme.iconTheme.size, 24);
  });
}
