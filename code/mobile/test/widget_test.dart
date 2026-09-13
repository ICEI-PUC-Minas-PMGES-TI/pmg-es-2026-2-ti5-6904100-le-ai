import 'package:flutter_test/flutter_test.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import 'package:le_ai_mobile/design/theme_controller.dart';
import 'package:le_ai_mobile/main.dart';

class _MemoryThemeStore implements ThemePreferenceStore {
  @override
  Future<String?> read() async => null;

  @override
  Future<void> write(String value) async {}
}

void main() {
  testWidgets('tela-piloto usa a base visual mobile', (tester) async {
    final controller = ThemeController(_MemoryThemeStore());
    await tester.pumpWidget(LeAiApp(themeController: controller));

    expect(find.text('Design system mobile'), findsOneWidget);
    expect(find.text('Leitura de hoje'), findsOneWidget);
    expect(find.byTooltip('Alternar tema'), findsOneWidget);
    expect(find.byIcon(PhosphorIconsRegular.moon), findsOneWidget);

    await tester.tap(find.byTooltip('Alternar tema'));
    await tester.pump();

    expect(find.byIcon(PhosphorIconsFill.bookmarkSimple), findsOneWidget);
  });
}
