import 'package:flutter/material.dart';

import '../../design/theme.dart';

/// Placeholder (P0-NAV): conteúdo real entra com F-EST no Período 1.
class EstantePage extends StatelessWidget {
  const EstantePage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Text(
        'Sua estante aparece aqui.',
        style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
      ),
    );
  }
}
