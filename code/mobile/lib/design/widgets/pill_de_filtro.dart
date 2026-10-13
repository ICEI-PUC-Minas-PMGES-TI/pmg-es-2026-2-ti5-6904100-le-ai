import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens.dart';

/// Pill de filtro com seleção única (documento-de-design §5.1): ativo em `musgo-fundo` sem borda,
/// inativo com borda `linha`, raio cheio e 40px de altura mínima. Nasceu na faixa de status da
/// Estante e é reusado na faixa de períodos das Estatísticas (F-STA).
///
/// [rotuloNumerico] desenha o rótulo em `num-inline` no tamanho do `caption`, para anos (`2026`).
/// O `Semantics` exclui os filhos, então repassa o toque (`onTap`) para o TalkBack.
class PillDeFiltro extends StatelessWidget {
  final String rotulo;
  final int? contagem;
  final bool ativo;
  final bool rotuloNumerico;
  final VoidCallback aoTocar;

  const PillDeFiltro({
    super.key,
    required this.rotulo,
    this.contagem,
    required this.ativo,
    this.rotuloNumerico = false,
    required this.aoTocar,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cor = ativo ? theme.primaryAccent : theme.secondaryText;
    final peso = ativo ? FontWeight.w600 : null;
    final numero = theme.numInline.copyWith(
      color: cor,
      fontWeight: peso,
      fontSize: theme.textTheme.bodySmall?.fontSize,
    );
    return Semantics(
      button: true,
      selected: ativo,
      label: contagem == null ? rotulo : '$rotulo $contagem',
      excludeSemantics: true,
      onTap: aoTocar,
      child: InkWell(
        onTap: aoTocar,
        splashFactory: NoSplash.splashFactory,
        borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 40),
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: DesignTokens.space4,
              vertical: DesignTokens.space2,
            ),
            decoration: BoxDecoration(
              color: ativo ? theme.accentTint : null,
              border: ativo ? null : Border.all(color: theme.divider),
              borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Text(
                  rotulo,
                  style: rotuloNumerico
                      ? numero
                      : theme.textTheme.bodySmall?.copyWith(color: cor, fontWeight: peso),
                ),
                if (contagem != null) ...<Widget>[
                  const SizedBox(width: DesignTokens.space1),
                  Text('$contagem', style: numero),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
