import 'package:flutter/material.dart';

import '../../design/theme.dart';
import '../../design/widgets/botao_textual.dart';

/// Placeholder (P0-NAV): conteúdo real entra com F-ACV-BUSCA no Período 1.
///
/// O único conteúdo real por enquanto é a saída para o cadastro por ISBN de F-ACV-CADASTRO, que
/// o estado vazio desta área vai oferecer quando existir (cadastro-por-isbn.md §1).
class DescobrirPage extends StatelessWidget {
  final VoidCallback? aoCadastrarPorIsbn;

  const DescobrirPage({super.key, this.aoCadastrarPorIsbn});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(
            'A busca do acervo aparece aqui.',
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
          ),
          if (aoCadastrarPorIsbn != null) BotaoTextual(texto: 'Cadastrar por ISBN', onPressed: aoCadastrarPorIsbn),
        ],
      ),
    );
  }
}
