import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../features/livros/formatos.dart';
import '../theme.dart';
import '../tokens.dart';

enum TamanhoDeEstrela { sm, md }

/// Estrelas em variante de exibição, com meia estrela (documento-de-design §4.3): `sm` (16px) em
/// listas, com o valor em `caption`; `md` (24px) na página do livro, com o valor em `num-inline`.
/// A nota é anunciada por um texto só, `4,5 de 5`, e não por cinco imagens soltas.
class EstrelasNota extends StatelessWidget {
  final double nota;
  final TamanhoDeEstrela tamanho;

  const EstrelasNota({super.key, required this.nota, this.tamanho = TamanhoDeEstrela.md});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final texto = formatarNota(nota);
    final pequena = tamanho == TamanhoDeEstrela.sm;
    return Semantics(
      label: '$texto de 5',
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          for (var i = 1; i <= 5; i++)
            Icon(
              nota >= i
                  ? PhosphorIconsFill.star
                  : nota >= i - 0.5
                  ? PhosphorIconsFill.starHalf
                  : PhosphorIconsRegular.star,
              size: pequena ? 16 : 24,
              color: nota >= i - 0.5 ? theme.primaryAccent : theme.tertiaryText,
            ),
          const SizedBox(width: DesignTokens.space2),
          Text(
            texto,
            style: pequena
                ? theme.numInline.copyWith(
                    fontSize: theme.textTheme.bodySmall?.fontSize,
                    color: theme.secondaryText,
                  )
                : theme.numInline,
          ),
        ],
      ),
    );
  }
}
