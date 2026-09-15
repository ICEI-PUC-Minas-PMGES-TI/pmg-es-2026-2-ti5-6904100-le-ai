import 'package:flutter/material.dart';

import '../../design/theme.dart';

/// Placeholder (P0-NAV): conteúdo real entra com F-PERFIL no Período 1. Sem botão de sair: a
/// fronteira da feature deixa logout com invalidação de refresh para F-AUT (plano de execução) —
/// verificação manual é limpar o secure storage, como no fluxo local documentado.
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
