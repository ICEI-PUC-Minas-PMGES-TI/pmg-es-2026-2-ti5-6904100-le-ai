import 'package:flutter/material.dart';

import 'tokens.dart';

/// Cores de papel semântico que a extensão gerada (`theme.g.dart`) ainda não expõe. Ficam aqui,
/// fora do arquivo gerado, para não serem apagadas na próxima geração dos tokens; os valores
/// continuam vindo de `DesignTokens`, nunca de hex solto.
extension DesignThemeExtras on ThemeData {
  /// `musgo-fundo`: tint de badge, chip, etiqueta e faixa informativa neutra.
  Color get accentTint =>
      brightness == Brightness.dark ? DesignTokens.musgoFundoEscuro : DesignTokens.musgoFundo;

  /// `capa-placeholder`: capa de livro ainda não carregada, ou livro sem capa.
  Color get coverPlaceholder => brightness == Brightness.dark
      ? DesignTokens.capaPlaceholderNoite
      : DesignTokens.capaPlaceholder;
}
