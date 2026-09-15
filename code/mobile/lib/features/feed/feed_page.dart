import 'package:flutter/material.dart';

import '../../design/theme.dart';

/// Placeholder (P0-NAV): conteúdo real entra com F-FEED no Período 1.
class FeedPage extends StatelessWidget {
  const FeedPage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Text(
        'As atividades de quem você segue aparecem aqui.',
        style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
      ),
    );
  }
}
