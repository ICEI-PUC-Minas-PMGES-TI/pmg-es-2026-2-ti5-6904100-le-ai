import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../theme.dart';
import '../tokens.dart';

/// Faixa informativa neutra em `musgo-fundo` (cadastro-por-isbn.md §7): para a informação que
/// não é alerta nem erro, como "Este livro já está no acervo." Usar `ambar` ali passaria a
/// ideia errada de que algo falhou.
class FaixaInformativa extends StatelessWidget {
  final String mensagem;

  const FaixaInformativa({super.key, required this.mensagem});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      liveRegion: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(DesignTokens.space4),
        decoration: BoxDecoration(
          color: theme.accentTint,
          borderRadius: BorderRadius.circular(DesignTokens.radius),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Icon(PhosphorIconsRegular.info, size: 20, color: theme.primaryAccent),
            const SizedBox(width: DesignTokens.space3),
            Expanded(
              child: Text(
                mensagem,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.isDark ? theme.primaryAccent : null,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
