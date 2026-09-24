import 'package:flutter/material.dart';

import '../../design/theme.dart';
import '../../design/widgets/botao_textual.dart';

/// Placeholder (P0-NAV): conteúdo real entra com F-EST no Período 1.
///
/// O único conteúdo real por enquanto é a saída para o cadastro por ISBN de F-ACV-CADASTRO, que
/// o estado vazio desta área vai oferecer quando existir (cadastro-por-isbn.md §1).
class EstantePage extends StatelessWidget {
  final VoidCallback? aoCadastrarLivro;

  const EstantePage({super.key, this.aoCadastrarLivro});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(
            'Sua estante aparece aqui.',
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
          ),
          if (aoCadastrarLivro != null) BotaoTextual(texto: 'Cadastrar por ISBN', onPressed: aoCadastrarLivro),
        ],
      ),
    );
  }
}
