import 'dart:convert';
import 'dart:io';

void main(List<String> arguments) {
  final checkOnly = arguments.contains('--check');
  final root = Directory.current.uri;
  final sourcePath = root
      .resolve('../../docs/design-system/tokens.json')
      .toFilePath();
  final tokensPath = root.resolve('lib/design/tokens.dart').toFilePath();
  final themePath = root.resolve('lib/design/theme.g.dart').toFilePath();

  final source = File(sourcePath);
  if (!source.existsSync()) {
    throw StateError('Fonte de tokens não encontrada: $sourcePath');
  }

  final decoded = jsonDecode(source.readAsStringSync());
  if (decoded is! Map<String, dynamic>) {
    throw const FormatException('tokens.json precisa conter um objeto JSON.');
  }
  _validateSource(decoded);

  final generated = _formatGenerated(<String, String>{
    tokensPath: _renderTokens(decoded),
    themePath: _renderTheme(),
  });

  var hasDrift = false;
  for (final entry in generated.entries) {
    final file = File(entry.key);
    final current = file.existsSync() ? file.readAsStringSync() : null;
    if (current != entry.value) {
      hasDrift = true;
      if (!checkOnly) {
        file.parent.createSync(recursive: true);
        file.writeAsStringSync(entry.value);
        stdout.writeln('Gerado: ${entry.key}');
      }
    }
  }

  if (checkOnly && hasDrift) {
    throw StateError(
      'Artefatos de design desatualizados. Execute dart run tool/generate_tokens.dart.',
    );
  }
  if (checkOnly) {
    stdout.writeln('Design tokens sincronizados.');
  }
}

Map<String, String> _formatGenerated(Map<String, String> rawFiles) {
  final temporaryDirectory = Directory.systemTemp.createTempSync(
    'le_ai_tokens_',
  );
  try {
    final temporaryFiles = <String, File>{};
    for (final entry in rawFiles.entries) {
      final file = File(
        '${temporaryDirectory.path}/${entry.key.hashCode}.dart',
      );
      file.writeAsStringSync(entry.value);
      temporaryFiles[entry.key] = file;
    }
    final result = Process.runSync(Platform.resolvedExecutable, <String>[
      'format',
      ...temporaryFiles.values.map((file) => file.path),
    ]);
    if (result.exitCode != 0) {
      throw StateError(
        'Não foi possível formatar os artefatos gerados: ${result.stderr}',
      );
    }
    return <String, String>{
      for (final entry in temporaryFiles.entries)
        entry.key: entry.value.readAsStringSync(),
    };
  } finally {
    temporaryDirectory.deleteSync(recursive: true);
  }
}

void _validateSource(Map<String, dynamic> source) {
  const required = <String, List<String>>{
    'color': <String>[
      'papel',
      'papel-elevado',
      'linha',
      'tinta',
      'grafite',
      'grafite-suave',
      'musgo',
      'musgo-vivo',
      'musgo-fundo',
      'broto',
      'rubi',
      'rubi-fundo',
      'ambar',
      'ambar-fundo',
      'capa-placeholder',
      'noite',
      'noite-elevada',
      'linha-noite',
      'papel-suave',
      'grafite-claro',
      'grafite-fundo-escuro',
      'musgo-claro',
      'musgo-fundo-escuro',
      'broto-vivo',
      'rubi-claro',
      'rubi-fundo-escuro',
      'ambar-claro',
      'ambar-fundo-escuro',
      'capa-placeholder-noite',
    ],
    'spacing': <String>[
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '8',
      '10',
      '12',
      '16',
      '24',
    ],
    'radius': <String>['sm', 'base', 'md', 'lg', 'xl', 'full'],
    'typography': <String>[
      'display-hero',
      'display',
      'title-lg',
      'title',
      'title-sm',
      'body-lg',
      'body',
      'body-strong',
      'caption',
      'label',
      'overline',
      'num-display',
      'num-inline',
      'wordmark',
    ],
    'elevation': <String>['0', '1', '2', '3'],
    'duration': <String>['instant', 'fast', 'base', 'slow'],
    'easing': <String>['out', 'in-out', 'in'],
    'fontFamily': <String>['display', 'body', 'editorial', 'mono', 'wordmark'],
  };

  for (final entry in required.entries) {
    final category = source[entry.key];
    if (category is! Map<String, dynamic>) {
      throw FormatException('Categoria ausente ou inválida: ${entry.key}');
    }
    for (final token in entry.value) {
      if (!category.containsKey(token)) {
        throw FormatException('Token ausente: ${entry.key}.$token');
      }
    }
  }
}

String _renderTokens(Map<String, dynamic> source) {
  final colors = _map(source['color']);
  final spacing = _map(source['spacing']);
  final radius = _map(source['radius']);
  final fonts = _map(source['fontFamily']);
  final typography = _map(source['typography']);
  final elevation = _map(source['elevation']);
  final duration = _map(source['duration']);
  final easing = _map(source['easing']);
  final out = StringBuffer('''// GENERATED FILE - DO NOT EDIT.
// Source: docs/design-system/tokens.json
// Run: dart run tool/generate_tokens.dart

import 'package:flutter/material.dart';

class TextToken {
  final String fontFamily;
  final double? fontSize;
  final double? lineHeight;
  final FontWeight fontWeight;
  final double letterSpacingEm;
  final bool tabularFigures;

  const TextToken({
    required this.fontFamily,
    this.fontSize,
    this.lineHeight,
    required this.fontWeight,
    this.letterSpacingEm = 0,
    this.tabularFigures = false,
  });
}

class DesignTokens {
  DesignTokens._();

''');

  out.writeln('  // Cores.');
  for (final entry in colors.entries) {
    out.writeln(
      '  static const Color ${_identifier(entry.key)} = Color(${_color(entry.value)});',
    );
  }

  out.writeln('\n  // Espaçamento.');
  for (final entry in spacing.entries) {
    out.writeln(
      '  static const double space${entry.key} = ${_dimension(entry.value)};',
    );
  }

  out.writeln('\n  // Raios.');
  for (final entry in radius.entries) {
    out.writeln(
      '  static const double ${_radiusName(entry.key)} = ${_dimension(entry.value)};',
    );
  }

  out.writeln('''
  // Elevações. No modo escuro a opacidade das sombras cai pela metade.
  static const List<BoxShadow> elevation0 = <BoxShadow>[];''');
  for (final entry in elevation.entries.where((entry) => entry.key != '0')) {
    out.writeln(
      '  static const List<BoxShadow> elevation${entry.key}Light = <BoxShadow>[',
    );
    for (final shadow in _shadows(entry.value)) {
      out.writeln('    $shadow,');
    }
    out.writeln('  ];');
  }
  for (final entry in elevation.entries.where((entry) => entry.key != '0')) {
    out.writeln(
      '  static const List<BoxShadow> elevation${entry.key}Dark = <BoxShadow>[',
    );
    for (final shadow in _shadows(entry.value, dark: true)) {
      out.writeln('    $shadow,');
    }
    out.writeln('  ];');
  }

  out.writeln('\n  // Motion.');
  for (final entry in duration.entries) {
    final milliseconds = _dimension(entry.value).toInt();
    out.writeln(
      '  static const Duration dur${_identifier(entry.key, capitalize: true)} = Duration(milliseconds: $milliseconds);',
    );
  }
  for (final entry in easing.entries) {
    final values = _cubicValues(entry.value);
    out.writeln(
      '  static const Cubic ease${_identifier(entry.key, capitalize: true)} = Cubic(${values.join(', ')});',
    );
  }

  out.writeln('\n  // Famílias tipográficas e fallbacks.');
  for (final entry in fonts.entries) {
    final values = _stringList(entry.value);
    out.writeln(
      "  static const String font${_identifier(entry.key, capitalize: true)} = ${jsonEncode(values.first)};",
    );
  }
  for (final entry in fonts.entries) {
    final values = _stringList(entry.value).skip(1).map(jsonEncode).join(', ');
    out.writeln(
      '  static const List<String> ${_identifier(entry.key)}Fallback = <String>[$values];',
    );
  }

  out.writeln('\n  // Escala tipográfica semântica.');
  for (final entry in typography.entries) {
    out.write(_textToken(entry.key, entry.value));
  }
  out.write(_editorialToken());
  out.write('}\n');
  return out.toString();
}

String _renderTheme() => '''// GENERATED FILE - DO NOT EDIT.
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

  Color get progressColor => isDark ? DesignTokens.brotoVivo : DesignTokens.broto;

  Color get errorTint =>
      isDark ? DesignTokens.rubiFundoEscuro : DesignTokens.rubiFundo;

  Color get warningColor => isDark ? DesignTokens.ambarClaro : DesignTokens.ambar;

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
''';

String _textToken(String key, dynamic raw) {
  final value = _value(raw);
  final name = _identifier(key);
  final fontFamily = _identifier(value['fontFamily']);
  final size = _typographyDimension(value['fontSize']);
  final lineHeight = _typographyDimension(value['lineHeight']);
  final weight = 'FontWeight.w${value['fontWeight']}';
  final tracking = _em(value['letterSpacing']);
  final tabular = value['fontFeatureSettings'] == '"tnum"';
  return '''  static const TextToken $name = TextToken(
    fontFamily: ${_fontConstant(fontFamily)},
    fontSize: $size,
    lineHeight: $lineHeight,
    fontWeight: $weight,
    letterSpacingEm: $tracking,
    tabularFigures: $tabular,
  );
''';
}

String _editorialToken() => '''  static const TextToken editorial = TextToken(
    fontFamily: fontEditorial,
    fontSize: 17,
    lineHeight: 28,
    fontWeight: FontWeight.w400,
  );
''';

Map<String, dynamic> _map(dynamic value) {
  if (value is! Map<String, dynamic>) {
    throw const FormatException('Categoria de tokens inválida.');
  }
  return value;
}

Map<String, dynamic> _value(dynamic token) {
  final map = token is Map<String, dynamic> ? token : null;
  final value = map?['value'];
  if (value is! Map<String, dynamic>) {
    throw const FormatException('Token tipográfico inválido.');
  }
  return value;
}

List<String> _stringList(dynamic token) {
  final map = token is Map<String, dynamic> ? token : null;
  final value = map?['value'];
  if (value is! List) {
    throw const FormatException('Token de fonte inválido.');
  }
  return value.cast<String>();
}

String _identifier(String value, {bool capitalize = false}) {
  final words = value.split('-');
  final first = words.first;
  final rest = words
      .skip(1)
      .map((word) => '${word[0].toUpperCase()}${word.substring(1)}');
  final result = first + rest.join();
  return capitalize
      ? '${result[0].toUpperCase()}${result.substring(1)}'
      : result;
}

String _radiusName(String key) {
  return key == 'base'
      ? 'radius'
      : 'radius${_identifier(key, capitalize: true)}';
}

String _color(dynamic token) {
  final value = (token as Map<String, dynamic>)['value'] as String;
  return '0xFF${value.substring(1)}';
}

double _dimension(dynamic token) {
  final value = token is Map<String, dynamic>
      ? token['value'] as String
      : token as String;
  final number = double.parse(
    value.replaceFirst('px', '').replaceFirst('ms', ''),
  );
  return number;
}

String _typographyDimension(dynamic value) {
  if (value == null || (value as String).endsWith('%')) return 'null';
  return _dimension(value).toString();
}

double _em(dynamic value) {
  if (value == null) return 0;
  return double.parse((value as String).replaceFirst('em', ''));
}

String _fontConstant(String family) {
  switch (family) {
    case 'Space Grotesk':
      return 'fontDisplay';
    case 'Manrope':
      return 'fontBody';
    case 'Newsreader':
      return 'fontEditorial';
    case 'JetBrains Mono':
      return 'fontMono';
    default:
      return 'fontWordmark';
  }
}

List<double> _cubicValues(dynamic token) {
  final value = (token as Map<String, dynamic>)['value'] as String;
  final match = RegExp(r'cubic-bezier\(([^)]+)\)').firstMatch(value);
  if (match == null) throw FormatException('Easing inválido: $value');
  return match
      .group(1)!
      .split(',')
      .map((part) => double.parse(part.trim()))
      .toList();
}

List<String> _shadows(dynamic token, {bool dark = false}) {
  final value = (token as Map<String, dynamic>)['value'] as String;
  if (value == 'none') return const <String>[];
  final pattern = RegExp(
    r'(-?\d+)(?:px)?\s+(-?\d+)px\s+(\d+)px\s+rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)',
  );
  return pattern.allMatches(value).map((match) {
    final alpha = double.parse(match.group(7)!);
    final adjusted = dark ? alpha / 2 : alpha;
    final alphaHex = (adjusted * 255)
        .round()
        .toRadixString(16)
        .padLeft(2, '0')
        .toUpperCase();
    return 'BoxShadow(color: Color(0x${alphaHex}171512), offset: Offset(${match.group(1)}, ${match.group(2)}), blurRadius: ${match.group(3)})';
  }).toList();
}
