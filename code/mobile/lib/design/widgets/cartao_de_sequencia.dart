import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../theme.dart';
import '../tokens.dart';

/// Componente de streak (documento-de-design.md §4.8; desenho em
/// docs/design/periodo-2/meu-perfil/prototipos/meu-perfil.html): rótulo "Sequência diária", chama
/// estática de 20px e o número em `num-display` com "dias seguidos" ao lado, o recorde em
/// `num-inline` `grafite` e, à direita, a regra de contagem. Nada de fogo animado nem emoji.
///
/// Sequência zerada não é erro (meu-perfil.md §5.3): mostra "0" com "leia hoje para começar", sem
/// `rubi` nem `ambar`, e o recorde continua com o mesmo peso. Não é acionável (o calendário é do
/// P3) e o leitor de tela lê o bloco como um rótulo só.
class CartaoDeSequencia extends StatelessWidget {
  final int atual;
  final int recorde;

  const CartaoDeSequencia({super.key, required this.atual, required this.recorde});

  static String _dias(int n) => n == 1 ? 'dia' : 'dias';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mudo = theme.secondaryText;
    final caption = theme.textTheme.bodySmall?.copyWith(color: mudo);
    final zerada = atual == 0;
    final rotulo = zerada
        ? 'Sequência diária: 0 dias. Recorde: $recorde ${_dias(recorde)}.'
        : 'Sequência diária: $atual ${_dias(atual)} seguido${atual == 1 ? '' : 's'}. '
              'Recorde: $recorde ${_dias(recorde)}.';

    return Semantics(
      container: true,
      label: rotulo,
      excludeSemantics: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(DesignTokens.space5),
        decoration: BoxDecoration(
          color: theme.elevatedSurface,
          borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'Sequência diária',
                    style: theme.textTheme.labelMedium?.copyWith(color: mudo),
                  ),
                  const SizedBox(height: DesignTokens.space2),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: <Widget>[
                      // A chama vai dentro do texto para a linha alinhar pela base do número.
                      Text.rich(
                        TextSpan(
                          // O estilo do número na raiz: a chama centraliza pela altura dele.
                          style: theme.numDisplay.copyWith(
                            color: theme.streakColor,
                            fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
                          ),
                          children: <InlineSpan>[
                            WidgetSpan(
                              alignment: PlaceholderAlignment.middle,
                              child: Padding(
                                padding: const EdgeInsets.only(right: DesignTokens.space2),
                                child: Icon(
                                  PhosphorIconsRegular.flame,
                                  size: 20,
                                  color: theme.streakColor,
                                ),
                              ),
                            ),
                            TextSpan(text: '$atual'),
                          ],
                        ),
                      ),
                      const SizedBox(width: DesignTokens.space2),
                      Flexible(
                        child: Text(
                          zerada
                              ? 'leia hoje para começar'
                              : '${_dias(atual)} seguido${atual == 1 ? '' : 's'}',
                          style: (zerada ? theme.textTheme.bodyMedium : theme.textTheme.labelLarge)
                              ?.copyWith(color: mudo),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: DesignTokens.space2),
                  // Um texto só: em tela estreita, quebra em vez de transbordar.
                  Text.rich(
                    TextSpan(
                      style: caption,
                      children: <InlineSpan>[
                        const TextSpan(text: 'Recorde: '),
                        TextSpan(
                          text: '$recorde',
                          style: theme.numInline.copyWith(color: mudo),
                        ),
                        TextSpan(text: ' ${_dias(recorde)}'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: DesignTokens.space3),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 116),
              child: Text('Conta cada dia em que você registra ao menos 1 página.', style: caption),
            ),
          ],
        ),
      ),
    );
  }
}

/// Forma do [CartaoDeSequencia] enquanto carrega (meu-perfil.md, artboard "Carregando"): bloco de
/// 104px, `radius-md`, na cor de placeholder.
class SkeletonDeSequencia extends StatelessWidget {
  const SkeletonDeSequencia({super.key});

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: Container(
        width: double.infinity,
        height: 104,
        decoration: BoxDecoration(
          color: Theme.of(context).coverPlaceholder,
          borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
        ),
      ),
    );
  }
}
