import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('fonte canônica contém todas as categorias do mobile', () {
    final source =
        jsonDecode(
              File('../../docs/design-system/tokens.json').readAsStringSync(),
            )
            as Map<String, dynamic>;

    expect(
      source.keys,
      containsAll(<String>[
        'color',
        'spacing',
        'radius',
        'typography',
        'elevation',
        'duration',
        'easing',
        'fontFamily',
      ]),
    );
    expect((source['color'] as Map<String, dynamic>).length, 29);
    expect((source['spacing'] as Map<String, dynamic>).length, 11);
    expect((source['typography'] as Map<String, dynamic>).length, 14);
  });

  test('artefatos Dart estão sincronizados com a fonte canônica', () {
    final tokens = File('lib/design/tokens.dart').readAsStringSync();
    final theme = File('lib/design/theme.g.dart').readAsStringSync();

    expect(tokens, startsWith('// GENERATED FILE - DO NOT EDIT.'));
    expect(theme, startsWith('// GENERATED FILE - DO NOT EDIT.'));
    expect(tokens, contains('static const Color capaPlaceholderNoite'));
    expect(tokens, contains('static const double space24'));
    expect(tokens, contains('static const Cubic easeInOut'));
    expect(tokens, contains('static const TextToken numInline'));
    expect(theme, contains('static ThemeData light()'));
    expect(theme, contains('static ThemeData dark()'));
    expect(theme, contains('extension DesignThemeData on ThemeData'));
  });
}
