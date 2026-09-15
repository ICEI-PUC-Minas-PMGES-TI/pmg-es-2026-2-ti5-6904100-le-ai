// GENERATED FILE - DO NOT EDIT.
// Source: docs/design-system/tokens.json
// Run: dart run tool/generate_tokens.dart

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'tokens.dart';

class GeneratedAppTheme {
  GeneratedAppTheme._();

  static ThemeData light() => _build(
    brightness: Brightness.light,
    background: DesignTokens.papel,
    elevatedSurface: DesignTokens.papelElevado,
    divider: DesignTokens.linha,
    onSurface: DesignTokens.tinta,
    secondaryText: DesignTokens.grafite,
    tertiaryText: DesignTokens.grafiteSuave,
    primary: DesignTokens.musgo,
    onPrimary: DesignTokens.papel,
    primaryContainer: DesignTokens.musgoFundo,
    secondary: DesignTokens.broto,
    error: DesignTokens.rubi,
    errorContainer: DesignTokens.rubiFundo,
  );

  static ThemeData dark() => _build(
    brightness: Brightness.dark,
    background: DesignTokens.noite,
    elevatedSurface: DesignTokens.noiteElevada,
    divider: DesignTokens.linhaNoite,
    onSurface: DesignTokens.papelSuave,
    secondaryText: DesignTokens.grafiteClaro,
    tertiaryText: DesignTokens.grafiteFundoEscuro,
    primary: DesignTokens.musgoClaro,
    onPrimary: DesignTokens.noite,
    primaryContainer: DesignTokens.musgoFundoEscuro,
    secondary: DesignTokens.brotoVivo,
    error: DesignTokens.rubiClaro,
    errorContainer: DesignTokens.rubiFundoEscuro,
  );

  static ThemeData _build({
    required Brightness brightness,
    required Color background,
    required Color elevatedSurface,
    required Color divider,
    required Color onSurface,
    required Color secondaryText,
    required Color tertiaryText,
    required Color primary,
    required Color onPrimary,
    required Color primaryContainer,
    required Color secondary,
    required Color error,
    required Color errorContainer,
  }) {
    final colorScheme = ColorScheme(
      brightness: brightness,
      primary: primary,
      onPrimary: onPrimary,
      primaryContainer: primaryContainer,
      onPrimaryContainer: onSurface,
      secondary: secondary,
      onSecondary: onSurface,
      secondaryContainer: primaryContainer,
      onSecondaryContainer: onSurface,
      tertiary: secondary,
      onTertiary: onSurface,
      tertiaryContainer: primaryContainer,
      onTertiaryContainer: onSurface,
      error: error,
      onError: onPrimary,
      errorContainer: errorContainer,
      onErrorContainer: onSurface,
      surface: background,
      onSurface: onSurface,
      surfaceTint: primary,
      inverseSurface: onSurface,
      onInverseSurface: background,
      inversePrimary: primary,
      outline: divider,
      outlineVariant: divider,
      scrim: DesignTokens.tinta,
    );

    return ThemeData(
      brightness: brightness,
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      canvasColor: background,
      cardColor: elevatedSurface,
      dividerColor: divider,
      shadowColor: DesignTokens.tinta,
      iconTheme: IconThemeData(color: onSurface, size: 24),
      textTheme: _textTheme(
        onSurface: onSurface,
        secondaryText: secondaryText,
        tertiaryText: tertiaryText,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: background,
        foregroundColor: onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: _style(DesignTokens.title, color: onSurface),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: elevatedSurface,
        labelStyle: _style(DesignTokens.label, color: secondaryText),
        hintStyle: _style(DesignTokens.body, color: tertiaryText),
        enabledBorder: _outline(divider),
        focusedBorder: _outline(primary, width: 2),
        errorBorder: _outline(error),
        focusedErrorBorder: _outline(error, width: 2),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: onPrimary,
          shape: const StadiumBorder(),
          minimumSize: const Size(48, 48),
          textStyle: _style(DesignTokens.bodyStrong),
        ),
      ),
    );
  }

  static OutlineInputBorder _outline(Color color, {double width = 1}) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(DesignTokens.radius),
      borderSide: BorderSide(color: color, width: width),
    );
  }

  static TextTheme _textTheme({
    required Color onSurface,
    required Color secondaryText,
    required Color tertiaryText,
  }) {
    return TextTheme(
      displayLarge: _style(DesignTokens.displayHero, color: onSurface),
      displayMedium: _style(DesignTokens.display, color: onSurface),
      headlineSmall: _style(DesignTokens.titleLg, color: onSurface),
      titleLarge: _style(DesignTokens.title, color: onSurface),
      titleMedium: _style(DesignTokens.titleSm, color: onSurface),
      bodyLarge: _style(DesignTokens.bodyLg, color: onSurface),
      bodyMedium: _style(DesignTokens.body, color: onSurface),
      bodySmall: _style(DesignTokens.caption, color: tertiaryText),
      labelLarge: _style(DesignTokens.bodyStrong, color: onSurface),
      labelMedium: _style(DesignTokens.label, color: secondaryText),
      labelSmall: _style(DesignTokens.overline, color: secondaryText),
    );
  }

  static TextStyle _style(TextToken token, {Color? color}) {
    final style = GoogleFonts.getFont(
      token.fontFamily,
      fontSize: token.fontSize,
      height: token.fontSize == null || token.lineHeight == null
          ? null
          : token.lineHeight! / token.fontSize!,
      fontWeight: token.fontWeight,
      letterSpacing: token.fontSize == null
          ? null
          : token.letterSpacingEm * token.fontSize!,
      color: color,
      fontFeatures: token.tabularFigures
          ? const <FontFeature>[FontFeature.tabularFigures()]
          : null,
    );

    return style.copyWith(fontFamilyFallback: _fallbacks(token.fontFamily));
  }

  static List<String> _fallbacks(String fontFamily) {
    if (fontFamily == DesignTokens.fontEditorial) {
      return DesignTokens.editorialFallback;
    }
    if (fontFamily == DesignTokens.fontMono) {
      return DesignTokens.monoFallback;
    }
    if (fontFamily == DesignTokens.fontBody) {
      return DesignTokens.bodyFallback;
    }
    return DesignTokens.displayFallback;
  }
}

extension DesignThemeData on ThemeData {
  bool get isDark => brightness == Brightness.dark;

  Color get pageBackground => colorScheme.surface;

  Color get elevatedSurface =>
      isDark ? DesignTokens.noiteElevada : DesignTokens.papelElevado;

  Color get divider => isDark ? DesignTokens.linhaNoite : DesignTokens.linha;

  Color get primaryAccent => colorScheme.primary;

  Color get secondaryText =>
      isDark ? DesignTokens.grafiteClaro : DesignTokens.grafite;

  Color get tertiaryText =>
      isDark ? DesignTokens.grafiteFundoEscuro : DesignTokens.grafiteSuave;

  Color get progressColor =>
      isDark ? DesignTokens.brotoVivo : DesignTokens.broto;

  Color get errorTint =>
      isDark ? DesignTokens.rubiFundoEscuro : DesignTokens.rubiFundo;

  Color get warningColor =>
      isDark ? DesignTokens.ambarClaro : DesignTokens.ambar;

  Color get warningTint =>
      isDark ? DesignTokens.ambarFundoEscuro : DesignTokens.ambarFundo;

  TextStyle get displayHero => textTheme.displayLarge!;

  TextStyle get displayTitle => textTheme.displayMedium!;

  TextStyle get editorialBody => GeneratedAppTheme._style(
    DesignTokens.editorial,
    color: colorScheme.onSurface,
  );

  TextStyle get numDisplay => GeneratedAppTheme._style(
    DesignTokens.numDisplay,
    color: colorScheme.onSurface,
  );

  TextStyle get numInline => GeneratedAppTheme._style(
    DesignTokens.numInline,
    color: colorScheme.onSurface,
  );

  List<BoxShadow> get elevation1 =>
      isDark ? DesignTokens.elevation1Dark : DesignTokens.elevation1Light;

  List<BoxShadow> get elevation2 =>
      isDark ? DesignTokens.elevation2Dark : DesignTokens.elevation2Light;

  List<BoxShadow> get elevation3 =>
      isDark ? DesignTokens.elevation3Dark : DesignTokens.elevation3Light;
}
