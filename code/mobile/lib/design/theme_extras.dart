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

  /// Número e chama da sequência diária (documento-de-design.md §4.8). O §4.8 e o protótipo de
  /// meu-perfil pedem `broto`, mas `broto` sobre `papel-elevado` fica em 2,3:1, abaixo do 3:1 de
  /// texto grande; no claro vale `musgo` (6,2:1), como as colunas de F-STA, e no escuro
  /// `broto-vivo`. Decisão do dono de F-GAM em 08/10/2026, registrada como divergência na feature.
  Color get streakColor =>
      brightness == Brightness.dark ? DesignTokens.brotoVivo : DesignTokens.musgo;
}
