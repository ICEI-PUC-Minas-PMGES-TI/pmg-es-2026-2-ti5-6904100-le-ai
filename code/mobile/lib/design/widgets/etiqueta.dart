import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens.dart';

/// Etiqueta informativa em pill `musgo-fundo` (livro-pessoal.md §7): diz a natureza do registro,
/// como `Livro pessoal`. Não é status de leitura nem chip de assunto.
class Etiqueta extends StatelessWidget {
  final String texto;

  const Etiqueta({super.key, required this.texto});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.space3,
        vertical: DesignTokens.space1,
      ),
      decoration: BoxDecoration(
        color: theme.accentTint,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        texto,
        style: theme.textTheme.labelMedium?.copyWith(color: theme.primaryAccent),
      ),
    );
  }
}
