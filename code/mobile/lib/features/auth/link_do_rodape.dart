import 'package:flutter/material.dart';

import '../../design/theme.dart';

/// Link do rodapé de login e cadastro ("Criar conta", "Entrar"): sem o padding nem a largura
/// mínima de 64 do `TextButton`, para ficar a 4 do texto como no protótipo; a altura de 48
/// mantém o alvo de toque.
class LinkDoRodape extends StatelessWidget {
  final String texto;
  final VoidCallback? onPressed;

  const LinkDoRodape({super.key, required this.texto, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        padding: EdgeInsets.zero,
        minimumSize: const Size(0, 48),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: Text(
        texto,
        style: theme.textTheme.bodyMedium?.copyWith(
          color: theme.primaryAccent,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
