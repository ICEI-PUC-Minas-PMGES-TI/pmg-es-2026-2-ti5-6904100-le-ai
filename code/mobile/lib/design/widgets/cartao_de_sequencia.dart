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
/// `rubi` nem `ambar`, e o recorde continua com o mesmo peso. O leitor de tela lê o bloco como um
/// rótulo só.
///
/// Com [aoAbrir] (o Meu perfil, F-GAM-OPC; docs/design/periodo-3/meu-perfil/meu-perfil.md §4.1),
/// o container inteiro vira um botão que abre o calendário: `CaretRight` de 20px centrado à
/// direita, helper estreitado para 112px (sem limite de linhas: na fonte real são quatro), fundo
/// `musgo-fundo` e `scale(0.98)` no pressionado, e o destino no rótulo. Sem ele (o resumo do
/// próprio calendário), não é acionável.
class CartaoDeSequencia extends StatefulWidget {
  final int atual;
  final int recorde;
  final VoidCallback? aoAbrir;

  const CartaoDeSequencia({super.key, required this.atual, required this.recorde, this.aoAbrir});

  @override
  State<CartaoDeSequencia> createState() => _CartaoDeSequenciaState();
}

class _CartaoDeSequenciaState extends State<CartaoDeSequencia> {
  bool _pressionado = false;
  bool _focado = false;

  static String _dias(int n) => n == 1 ? 'dia' : 'dias';

  String _rotulo() {
    final atual = widget.atual;
    final recorde = widget.recorde;
    if (widget.aoAbrir == null) {
      return atual == 0
          ? 'Sequência diária: 0 dias. Recorde: $recorde ${_dias(recorde)}.'
          : 'Sequência diária: $atual ${_dias(atual)} seguido${atual == 1 ? '' : 's'}. '
                'Recorde: $recorde ${_dias(recorde)}.';
    }
    final sequencia = atual == 0
        ? 'nenhum dia seguido, leia hoje para começar'
        : '$atual ${_dias(atual)} seguido${atual == 1 ? '' : 's'}';
    return 'Sequência diária: $sequencia. Recorde: $recorde ${_dias(recorde)}. '
        'Abrir calendário da sequência.';
  }

  void _pressionar(bool valor) {
    if (_pressionado != valor) {
      setState(() => _pressionado = valor);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mudo = theme.secondaryText;
    final caption = theme.textTheme.bodySmall?.copyWith(color: mudo);
    final atual = widget.atual;
    final recorde = widget.recorde;
    final zerada = atual == 0;
    final aoAbrir = widget.aoAbrir;
    final reduzido = MediaQuery.of(context).disableAnimations;

    // Texto ampliado: o helper desce para baixo dos números em vez de espremer a coluna
    // (calendario-de-sequencia.md §9).
    final empilhar = MediaQuery.textScalerOf(context).scale(10) / 10 >= 1.3;
    final numeros = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text('Sequência diária', style: theme.textTheme.labelMedium?.copyWith(color: mudo)),
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
                      child: Icon(PhosphorIconsRegular.flame, size: 20, color: theme.streakColor),
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
                style: (zerada ? theme.textTheme.bodyMedium : theme.textTheme.labelLarge)?.copyWith(
                  color: mudo,
                ),
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
    );
    const regra = 'Conta cada dia em que você registra ao menos 1 página.';
    final conteudo = empilhar
        ? Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              numeros,
              const SizedBox(height: DesignTokens.space3),
              Text(regra, style: caption),
            ],
          )
        : Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Expanded(child: numeros),
              const SizedBox(width: DesignTokens.space3),
              ConstrainedBox(
                constraints: BoxConstraints(maxWidth: aoAbrir == null ? 116 : 112),
                // Sem maxLines: na fonte real o helper ocupa quatro linhas em 112px, e o limite de
                // três do design cortava "1 página." sem reticências (visto no emulador, 20/11).
                child: Text(regra, style: caption),
              ),
            ],
          );

    final cartao = AnimatedContainer(
      duration: reduzido ? Duration.zero : DesignTokens.durInstant,
      width: double.infinity,
      padding: const EdgeInsets.all(DesignTokens.space5),
      decoration: BoxDecoration(
        color: _pressionado ? theme.accentTint : theme.elevatedSurface,
        borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
      ),
      // Foco de teclado: contorno de 2px `musgo` (meu-perfil.md §9), sem mexer no layout.
      foregroundDecoration: _focado
          ? BoxDecoration(
              borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
              border: Border.all(color: theme.primaryAccent, width: 2),
            )
          : null,
      child: aoAbrir == null
          ? conteudo
          : Row(
              children: <Widget>[
                Expanded(child: conteudo),
                const SizedBox(width: DesignTokens.space3),
                // Centrado na vertical do container.
                Icon(PhosphorIconsRegular.caretRight, size: 20, color: mudo),
              ],
            ),
    );

    if (aoAbrir == null) {
      return Semantics(container: true, label: _rotulo(), excludeSemantics: true, child: cartao);
    }
    return Semantics(
      container: true,
      button: true,
      label: _rotulo(),
      onTap: aoAbrir,
      excludeSemantics: true,
      child: FocusableActionDetector(
        onShowFocusHighlight: (valor) => setState(() => _focado = valor),
        actions: <Type, Action<Intent>>{
          ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) => aoAbrir()),
        },
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: (_) => _pressionar(true),
          onTapUp: (_) => _pressionar(false),
          onTapCancel: () => _pressionar(false),
          onTap: aoAbrir,
          child: AnimatedScale(
            scale: _pressionado && !reduzido ? 0.98 : 1,
            duration: reduzido ? Duration.zero : DesignTokens.durInstant,
            child: cartao,
          ),
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
