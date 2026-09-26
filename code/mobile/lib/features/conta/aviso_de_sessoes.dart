import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';

/// Aviso de que salvar a senha encerra as outras sessões, com `Info` de 16px, visível junto do
/// formulário e não só depois (redefinir-senha.md e alterar-senha.md §4).
class AvisoDeSessoes extends StatelessWidget {
  final ThemeData theme;

  const AvisoDeSessoes({super.key, required this.theme});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.only(top: 1),
          child: ExcludeSemantics(
            child: Icon(PhosphorIconsRegular.info, size: 16, color: theme.secondaryText),
          ),
        ),
        const SizedBox(width: DesignTokens.space2),
        Expanded(
          child: Text(
            'Ao salvar, você sai do aplicativo nos outros aparelhos.',
            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
          ),
        ),
      ],
    );
  }
}
