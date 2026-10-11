import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import 'frases.dart';
import 'leitura_service.dart';

/// Uma frase (frases-do-livro.md, "Item de frase"), igual a `FraseCitada.vue`: o texto em
/// Newsreader italic com a borda esquerda de 2px `musgo-fundo`, sem aspas decorativas, e a
/// referência abaixo (`Página 57 · @marina.antunes`, ou `você`). [aoExcluir] mostra o `Trash`,
/// só na frase de quem olha; [compacta] é a versão de `body` da confirmação.
class FraseCitada extends StatelessWidget {
  final Frase frase;
  final VoidCallback? aoExcluir;
  final bool compacta;

  const FraseCitada({super.key, required this.frase, this.aoExcluir, this.compacta = false});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final estilo = theme.editorialBody.copyWith(
      fontStyle: FontStyle.italic,
      fontSize: compacta ? theme.textTheme.bodyMedium?.fontSize : null,
    );
    final excluir = aoExcluir != null && frase.minha ? aoExcluir : null;
    return Semantics(
      container: true,
      label: 'Citação: ${frase.texto} Página ${frase.pagina}${frase.minha ? ', sua frase' : ''}.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            padding: const EdgeInsets.only(left: DesignTokens.space4),
            decoration: BoxDecoration(
              border: Border(left: BorderSide(color: theme.accentTint, width: 2)),
            ),
            child: ExcludeSemantics(child: Text(frase.texto, style: estilo)),
          ),
          const SizedBox(height: DesignTokens.space2),
          Row(
            children: <Widget>[
              const SizedBox(width: DesignTokens.space4),
              Expanded(
                child: ExcludeSemantics(
                  child: Text(
                    referenciaDaFrase(frase),
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                  ),
                ),
              ),
              if (excluir != null)
                IconButton(
                  key: ValueKey<String>('excluir-frase-${frase.id}'),
                  tooltip: 'Excluir frase da página ${frase.pagina}',
                  onPressed: excluir,
                  icon: Icon(PhosphorIconsRegular.trash, size: 20, color: theme.secondaryText),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
