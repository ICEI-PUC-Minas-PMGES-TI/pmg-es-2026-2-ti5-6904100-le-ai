import 'package:flutter/material.dart';

import '../../app/cabecalho_tela.dart';
import '../../design/theme.dart';

/// Placeholder da página do livro oficial, destino do "Abrir página do livro" do cadastro por
/// ISBN. A página de verdade (`GET /livros/{id}`) é de F-ACV-BUSCA, no mesmo molde dos
/// placeholders de P0-NAV.
class LivroOficialPlaceholderPage extends StatelessWidget {
  final VoidCallback? aoVoltar;

  const LivroOficialPlaceholderPage({super.key, this.aoVoltar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: <Widget>[
        CabecalhoTela(titulo: '', aoVoltar: aoVoltar),
        Expanded(
          child: Center(
            child: Text(
              'A página do livro aparece aqui.',
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
            ),
          ),
        ),
      ],
    );
  }
}
