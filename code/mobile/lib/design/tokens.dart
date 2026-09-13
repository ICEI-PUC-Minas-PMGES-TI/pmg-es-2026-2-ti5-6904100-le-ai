// GENERATED FILE - DO NOT EDIT.
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

  // Cores.
  static const Color papel = Color(0xFFF4F2EC);
  static const Color papelElevado = Color(0xFFEDE9DE);
  static const Color linha = Color(0xFFDFD9C9);
  static const Color tinta = Color(0xFF171512);
  static const Color grafite = Color(0xFF5C544B);
  static const Color grafiteSuave = Color(0xFF8A8175);
  static const Color musgo = Color(0xFF3E5C42);
  static const Color musgoVivo = Color(0xFF4E7455);
  static const Color musgoFundo = Color(0xFFE4EAE0);
  static const Color broto = Color(0xFF8AA274);
  static const Color rubi = Color(0xFFB4322A);
  static const Color rubiFundo = Color(0xFFF6E1DE);
  static const Color ambar = Color(0xFFD4A537);
  static const Color ambarFundo = Color(0xFFF7ECD1);
  static const Color capaPlaceholder = Color(0xFFDED4BC);
  static const Color noite = Color(0xFF141311);
  static const Color noiteElevada = Color(0xFF1D1B18);
  static const Color linhaNoite = Color(0xFF2A2724);
  static const Color papelSuave = Color(0xFFEDE9E0);
  static const Color grafiteClaro = Color(0xFFB8AFA2);
  static const Color grafiteFundoEscuro = Color(0xFF7C7466);
  static const Color musgoClaro = Color(0xFF8FB27A);
  static const Color musgoFundoEscuro = Color(0xFF243026);
  static const Color brotoVivo = Color(0xFFA5C285);
  static const Color rubiClaro = Color(0xFFE56354);
  static const Color rubiFundoEscuro = Color(0xFF3A1F1D);
  static const Color ambarClaro = Color(0xFFE8BC5A);
  static const Color ambarFundoEscuro = Color(0xFF332816);
  static const Color capaPlaceholderNoite = Color(0xFF3A342A);

  // Espaçamento.
  static const double space1 = 4.0;
  static const double space2 = 8.0;
  static const double space3 = 12.0;
  static const double space4 = 16.0;
  static const double space5 = 20.0;
  static const double space6 = 24.0;
  static const double space8 = 32.0;
  static const double space10 = 40.0;
  static const double space12 = 48.0;
  static const double space16 = 64.0;
  static const double space24 = 96.0;

  // Raios.
  static const double radiusSm = 6.0;
  static const double radius = 12.0;
  static const double radiusMd = 16.0;
  static const double radiusLg = 20.0;
  static const double radiusXl = 24.0;
  static const double radiusFull = 999.0;
  // Elevações. No modo escuro a opacidade das sombras cai pela metade.
  static const List<BoxShadow> elevation0 = <BoxShadow>[];
  static const List<BoxShadow> elevation1Light = <BoxShadow>[
    BoxShadow(color: Color(0x0F171512), offset: Offset(0, 1), blurRadius: 2),
    BoxShadow(color: Color(0x0A171512), offset: Offset(0, 1), blurRadius: 3),
  ];
  static const List<BoxShadow> elevation2Light = <BoxShadow>[
    BoxShadow(color: Color(0x14171512), offset: Offset(0, 4), blurRadius: 12),
    BoxShadow(color: Color(0x0A171512), offset: Offset(0, 2), blurRadius: 4),
  ];
  static const List<BoxShadow> elevation3Light = <BoxShadow>[
    BoxShadow(color: Color(0x1F171512), offset: Offset(0, 12), blurRadius: 32),
    BoxShadow(color: Color(0x0A171512), offset: Offset(0, 4), blurRadius: 8),
  ];
  static const List<BoxShadow> elevation1Dark = <BoxShadow>[
    BoxShadow(color: Color(0x08171512), offset: Offset(0, 1), blurRadius: 2),
    BoxShadow(color: Color(0x05171512), offset: Offset(0, 1), blurRadius: 3),
  ];
  static const List<BoxShadow> elevation2Dark = <BoxShadow>[
    BoxShadow(color: Color(0x0A171512), offset: Offset(0, 4), blurRadius: 12),
    BoxShadow(color: Color(0x05171512), offset: Offset(0, 2), blurRadius: 4),
  ];
  static const List<BoxShadow> elevation3Dark = <BoxShadow>[
    BoxShadow(color: Color(0x0F171512), offset: Offset(0, 12), blurRadius: 32),
    BoxShadow(color: Color(0x05171512), offset: Offset(0, 4), blurRadius: 8),
  ];

  // Motion.
  static const Duration durInstant = Duration(milliseconds: 100);
  static const Duration durFast = Duration(milliseconds: 180);
  static const Duration durBase = Duration(milliseconds: 260);
  static const Duration durSlow = Duration(milliseconds: 420);
  static const Cubic easeOut = Cubic(0.16, 1.0, 0.3, 1.0);
  static const Cubic easeInOut = Cubic(0.4, 0.0, 0.2, 1.0);
  static const Cubic easeIn = Cubic(0.4, 0.0, 1.0, 1.0);

  // Famílias tipográficas e fallbacks.
  static const String fontDisplay = "Space Grotesk";
  static const String fontBody = "Manrope";
  static const String fontEditorial = "Newsreader";
  static const String fontMono = "JetBrains Mono";
  static const String fontWordmark = "Space Grotesk";
  static const List<String> displayFallback = <String>[
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "sans-serif",
  ];
  static const List<String> bodyFallback = <String>[
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "sans-serif",
  ];
  static const List<String> editorialFallback = <String>[
    "Georgia",
    "Times New Roman",
    "serif",
  ];
  static const List<String> monoFallback = <String>[
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "monospace",
  ];
  static const List<String> wordmarkFallback = <String>[
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "sans-serif",
  ];

  // Escala tipográfica semântica.
  static const TextToken displayHero = TextToken(
    fontFamily: fontDisplay,
    fontSize: 40.0,
    lineHeight: 44.0,
    fontWeight: FontWeight.w600,
    letterSpacingEm: -0.02,
    tabularFigures: false,
  );
  static const TextToken display = TextToken(
    fontFamily: fontDisplay,
    fontSize: 32.0,
    lineHeight: 36.0,
    fontWeight: FontWeight.w600,
    letterSpacingEm: -0.01,
    tabularFigures: false,
  );
  static const TextToken titleLg = TextToken(
    fontFamily: fontDisplay,
    fontSize: 24.0,
    lineHeight: 28.0,
    fontWeight: FontWeight.w600,
    letterSpacingEm: -0.01,
    tabularFigures: false,
  );
  static const TextToken title = TextToken(
    fontFamily: fontDisplay,
    fontSize: 20.0,
    lineHeight: 24.0,
    fontWeight: FontWeight.w600,
    letterSpacingEm: -0.01,
    tabularFigures: false,
  );
  static const TextToken titleSm = TextToken(
    fontFamily: fontDisplay,
    fontSize: 17.0,
    lineHeight: 22.0,
    fontWeight: FontWeight.w600,
    letterSpacingEm: 0.0,
    tabularFigures: false,
  );
  static const TextToken bodyLg = TextToken(
    fontFamily: fontBody,
    fontSize: 17.0,
    lineHeight: 26.0,
    fontWeight: FontWeight.w400,
    letterSpacingEm: 0.0,
    tabularFigures: false,
  );
  static const TextToken body = TextToken(
    fontFamily: fontBody,
    fontSize: 15.0,
    lineHeight: 22.0,
    fontWeight: FontWeight.w400,
    letterSpacingEm: 0.0,
    tabularFigures: false,
  );
  static const TextToken bodyStrong = TextToken(
    fontFamily: fontBody,
    fontSize: 15.0,
    lineHeight: 22.0,
    fontWeight: FontWeight.w600,
    letterSpacingEm: 0.0,
    tabularFigures: false,
  );
  static const TextToken caption = TextToken(
    fontFamily: fontBody,
    fontSize: 13.0,
    lineHeight: 18.0,
    fontWeight: FontWeight.w500,
    letterSpacingEm: 0.0,
    tabularFigures: false,
  );
  static const TextToken label = TextToken(
    fontFamily: fontBody,
    fontSize: 12.0,
    lineHeight: 16.0,
    fontWeight: FontWeight.w600,
    letterSpacingEm: 0.02,
    tabularFigures: false,
  );
  static const TextToken overline = TextToken(
    fontFamily: fontBody,
    fontSize: 11.0,
    lineHeight: 14.0,
    fontWeight: FontWeight.w700,
    letterSpacingEm: 0.08,
    tabularFigures: false,
  );
  static const TextToken numDisplay = TextToken(
    fontFamily: fontMono,
    fontSize: 36.0,
    lineHeight: 40.0,
    fontWeight: FontWeight.w500,
    letterSpacingEm: 0.0,
    tabularFigures: false,
  );
  static const TextToken numInline = TextToken(
    fontFamily: fontMono,
    fontSize: 15.0,
    lineHeight: 22.0,
    fontWeight: FontWeight.w500,
    letterSpacingEm: 0.0,
    tabularFigures: true,
  );
  static const TextToken wordmark = TextToken(
    fontFamily: fontDisplay,
    fontSize: null,
    lineHeight: null,
    fontWeight: FontWeight.w600,
    letterSpacingEm: -0.015,
    tabularFigures: false,
  );
  static const TextToken editorial = TextToken(
    fontFamily: fontEditorial,
    fontSize: 17,
    lineHeight: 28,
    fontWeight: FontWeight.w400,
  );
}
