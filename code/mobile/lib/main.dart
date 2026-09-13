import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import 'design/theme.dart';
import 'design/theme_controller.dart';
import 'design/tokens.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final themeController = ThemeController(SharedPreferencesThemeStore());
  await themeController.load();
  runApp(LeAiApp(themeController: themeController));
}

class LeAiApp extends StatelessWidget {
  final ThemeController themeController;

  const LeAiApp({required this.themeController, super.key});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: themeController,
      builder: (context, child) => MaterialApp(
        title: 'Lê Ai',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        themeMode: themeController.mode,
        home: DesignSystemHomePage(themeController: themeController),
      ),
    );
  }
}

class DesignSystemHomePage extends StatelessWidget {
  final ThemeController themeController;

  const DesignSystemHomePage({required this.themeController, super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lê Ai'),
        actions: <Widget>[
          IconButton(
            tooltip: 'Alternar tema',
            onPressed: () =>
                themeController.toggleForBrightness(theme.brightness),
            icon: Icon(
              theme.isDark
                  ? PhosphorIconsRegular.sun
                  : PhosphorIconsRegular.moon,
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(DesignTokens.space5),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text('Design system mobile', style: theme.displayTitle),
            const SizedBox(height: DesignTokens.space2),
            Text(
              'Base visual compartilhada do aplicativo Lê Ai.',
              style: theme.textTheme.bodyLarge,
            ),
            const SizedBox(height: DesignTokens.space6),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(DesignTokens.space4),
              decoration: BoxDecoration(
                color: theme.elevatedSurface,
                borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
                boxShadow: theme.elevation1,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('Leitura de hoje', style: theme.textTheme.titleLarge),
                  const SizedBox(height: DesignTokens.space2),
                  Text('24 páginas', style: theme.numDisplay),
                  const SizedBox(height: DesignTokens.space2),
                  Text(
                    'Acompanhe seu registro sem perder o ritmo.',
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
            const SizedBox(height: DesignTokens.space6),
            Text('Iconografia', style: theme.textTheme.titleMedium),
            const SizedBox(height: DesignTokens.space2),
            Wrap(
              spacing: DesignTokens.space2,
              children: <Widget>[
                _IconChip(
                  label: 'Regular',
                  icon: PhosphorIconsRegular.bookOpen,
                ),
                _IconChip(
                  label: 'Ativo',
                  icon: PhosphorIconsFill.bookmarkSimple,
                ),
              ],
            ),
            const SizedBox(height: DesignTokens.space6),
            Text('Cores de estado', style: theme.textTheme.titleMedium),
            const SizedBox(height: DesignTokens.space2),
            Wrap(
              spacing: DesignTokens.space2,
              runSpacing: DesignTokens.space2,
              children: <Widget>[
                _ColorChip(label: 'Ação', color: theme.primaryAccent),
                _ColorChip(label: 'Progresso', color: theme.progressColor),
                _ColorChip(label: 'Alerta', color: theme.warningColor),
                _ColorChip(label: 'Erro', color: theme.colorScheme.error),
              ],
            ),
            const SizedBox(height: DesignTokens.space6),
            Text('Sinopse', style: theme.textTheme.titleMedium),
            const SizedBox(height: DesignTokens.space2),
            Text(
              'A leitura ganha espaço quando o registro, a meta e o pertencimento cabem na mesma experiência.',
              style: theme.editorialBody,
            ),
          ],
        ),
      ),
    );
  }
}

class _ColorChip extends StatelessWidget {
  final String label;
  final Color color;

  const _ColorChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Chip(
      label: Text(label),
      backgroundColor: color,
      labelStyle: TextStyle(color: Theme.of(context).colorScheme.onPrimary),
    );
  }
}

class _IconChip extends StatelessWidget {
  final String label;
  final IconData icon;

  const _IconChip({required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Chip(avatar: PhosphorIcon(icon, size: 20), label: Text(label));
  }
}
