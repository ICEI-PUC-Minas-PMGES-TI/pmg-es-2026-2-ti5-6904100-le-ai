import 'package:flutter/material.dart';

import '../../design/theme.dart';

/// Placeholder (P0-NAV): conteúdo real entra com F-PERFIL no Período 1. A saída da conta fica em
/// Configurações, pela engrenagem do header da aba (`ShellAutenticado`, F-AUT).
class PerfilPage extends StatelessWidget {
  const PerfilPage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Text(
        'Seu perfil aparece aqui.',
        style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
      ),
    );
  }
}
