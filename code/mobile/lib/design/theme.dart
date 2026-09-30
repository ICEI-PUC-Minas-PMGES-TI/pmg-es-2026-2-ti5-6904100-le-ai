import 'package:flutter/material.dart';

import 'theme.g.dart';

export 'theme.g.dart';
export 'theme_extras.dart';

class AppTheme {
  AppTheme._();

  static ThemeData light() => GeneratedAppTheme.light();

  static ThemeData dark() => GeneratedAppTheme.dark();
}
