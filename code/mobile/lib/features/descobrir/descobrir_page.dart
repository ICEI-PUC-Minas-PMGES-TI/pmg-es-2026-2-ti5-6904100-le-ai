import 'package:flutter/material.dart';

import '../../design/theme.dart';

/// Placeholder (P0-NAV): conteúdo real entra com F-ACV-BUSCA no Período 1.
class DescobrirPage extends StatelessWidget {
  const DescobrirPage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Text(
        'A busca do acervo aparece aqui.',
        style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
      ),
    );
  }
}
