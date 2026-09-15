import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../design/theme.dart';
import '../design/tokens.dart';

class _ItemBarra {
  final IconData regular;
  final IconData fill;
  final String rotulo;

  const _ItemBarra({required this.regular, required this.fill, required this.rotulo});
}

/// Barra fixa de 4 abas (shell-de-navegacao.md §4 "Barra inferior"). `Compass` em vez de
/// `MagnifyingGlass` para Descobrir: a lupa já aparece no header da estante (busca filtra a
/// própria estante, não o acervo), e repetir o glifo na mesma hierarquia seria ruído.
///
/// Sem pill de fundo, sem indicador deslizante: o item ativo se distingue só pela troca de peso
/// do ícone (regular → fill) e cor, em `dur-instant` — nada que dependa só de cor (§9).
class BarraInferior extends StatelessWidget {
  static const double altura = 64;

  static const List<_ItemBarra> _itens = <_ItemBarra>[
    _ItemBarra(
      regular: PhosphorIconsRegular.books,
      fill: PhosphorIconsFill.books,
      rotulo: 'Estante',
    ),
    _ItemBarra(
      regular: PhosphorIconsRegular.compass,
      fill: PhosphorIconsFill.compass,
      rotulo: 'Descobrir',
    ),
    _ItemBarra(
      regular: PhosphorIconsRegular.newspaper,
      fill: PhosphorIconsFill.newspaper,
      rotulo: 'Feed',
    ),
    _ItemBarra(
      regular: PhosphorIconsRegular.userCircle,
      fill: PhosphorIconsFill.userCircle,
      rotulo: 'Perfil',
    ),
  ];

  final int indiceAtivo;
  final ValueChanged<int> aoSelecionar;

  const BarraInferior({super.key, required this.indiceAtivo, required this.aoSelecionar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.elevatedSurface,
        border: Border(top: BorderSide(color: theme.divider)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: altura,
          child: Row(
            children: <Widget>[
              for (int i = 0; i < _itens.length; i++)
                Expanded(child: _botao(context, theme, i)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _botao(BuildContext context, ThemeData theme, int indice) {
    final item = _itens[indice];
    final ativo = indice == indiceAtivo;
    final cor = ativo ? theme.primaryAccent : theme.secondaryText;

    return Semantics(
      button: true,
      selected: ativo,
      label: item.rotulo,
      child: InkWell(
        onTap: () => aoSelecionar(indice),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: AnimatedDefaultTextStyle(
            duration: DesignTokens.durInstant,
            style: theme.textTheme.bodySmall!.copyWith(
              color: cor,
              fontWeight: ativo ? FontWeight.w600 : FontWeight.w500,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                AnimatedSwitcher(
                  duration: DesignTokens.durInstant,
                  child: Icon(
                    ativo ? item.fill : item.regular,
                    key: ValueKey<bool>(ativo),
                    size: 24,
                    color: cor,
                  ),
                ),
                const SizedBox(height: DesignTokens.space1),
                Text(item.rotulo),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
