import 'dart:ui' show SemanticsRole;

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../perfil/textos.dart';
import 'formatos.dart';
import 'livro_oficial.dart';

/// As onze faixas do histograma, de 5 no topo até 0 embaixo (RN-06).
const List<double> _faixas = <double>[
  5,
  4.5,
  4,
  3.5,
  3,
  2.5,
  2,
  1.5,
  1,
  0.5,
  0,
];

/// Seção de notas da página do livro oficial (F-ACV-NOTA, pagina-do-livro.md §4.1 C): o container
/// `Nota geral` e `Nota dos leitores`, lado a lado e nunca combinados (RN-06), e o histograma das
/// notas dos leitores, só quando elas existem.
class NotasDoLivro extends StatelessWidget {
  final IndicadorDeNota? notaGeral;
  final IndicadorDeNota? notaDosLeitores;
  final List<FaixaDaDistribuicao> distribuicao;

  const NotasDoLivro({
    super.key,
    required this.notaGeral,
    required this.notaDosLeitores,
    this.distribuicao = const <FaixaDaDistribuicao>[],
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final quantidades = <double, int>{
      for (final faixa in distribuicao) faixa.valor: faixa.quantidade,
    };
    final maior = quantidades.values.fold<int>(
      0,
      (maior, quantidade) => quantidade > maior ? quantidade : maior,
    );
    // Sem nota dos leitores, ou sem nenhum leitor nas faixas, não há histograma zerado (§10).
    final comHistograma = notaDosLeitores != null && maior > 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Container(
          padding: const EdgeInsets.all(DesignTokens.space5),
          decoration: BoxDecoration(
            color: theme.elevatedSurface,
            borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Expanded(
                  child: _BlocoDeNota(
                    rotulo: 'Nota geral',
                    indicador: notaGeral,
                    singular: 'avaliação',
                    plural: 'avaliações',
                  ),
                ),
                Container(
                  width: 1,
                  margin: const EdgeInsets.symmetric(
                    horizontal: DesignTokens.space5,
                  ),
                  color: theme.divider,
                ),
                Expanded(
                  child: _BlocoDeNota(
                    rotulo: 'Nota dos leitores',
                    indicador: notaDosLeitores,
                    singular: 'leitor',
                    plural: 'leitores',
                  ),
                ),
              ],
            ),
          ),
        ),
        if (comHistograma) ...<Widget>[
          const SizedBox(height: DesignTokens.space4),
          Text(
            'Distribuição das notas dos leitores',
            style: theme.textTheme.labelMedium,
          ),
          const SizedBox(height: DesignTokens.space3),
          // Lido como lista, uma linha por valor, sem depender da largura da barra (§9).
          Semantics(
            container: true,
            role: SemanticsRole.list,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                for (final valor in _faixas) ...<Widget>[
                  if (valor != _faixas.first)
                    const SizedBox(height: DesignTokens.space1),
                  _LinhaDoHistograma(
                    valor: valor,
                    quantidade: quantidades[valor] ?? 0,
                    maior: maior,
                  ),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// Um dos dois blocos do container: rótulo, estrela com a nota e a contagem com unidade; ausente,
/// só `Sem nota`, sem estrela e sem `0,0` (RN-06.3).
class _BlocoDeNota extends StatelessWidget {
  final String rotulo;
  final IndicadorDeNota? indicador;
  final String singular;
  final String plural;

  const _BlocoDeNota({
    required this.rotulo,
    required this.indicador,
    required this.singular,
    required this.plural,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final indicador = this.indicador;
    final nota = indicador == null ? null : formatarNota(indicador.valor);
    final quantos = indicador == null
        ? null
        : contagem(indicador.quantidade, singular, plural);
    return Semantics(
      container: true,
      label: indicador == null
          ? '$rotulo, sem nota'
          : '$rotulo, $nota de 5, $quantos',
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(rotulo, style: theme.textTheme.labelMedium),
          const SizedBox(height: DesignTokens.space2),
          if (indicador == null)
            Text(
              'Sem nota',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.tertiaryText,
              ),
            )
          else ...<Widget>[
            Row(
              children: <Widget>[
                Icon(
                  PhosphorIconsFill.star,
                  size: 24,
                  color: theme.primaryAccent,
                ),
                const SizedBox(width: DesignTokens.space2),
                Flexible(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Text(nota!, style: theme.numDisplay),
                  ),
                ),
              ],
            ),
            const SizedBox(height: DesignTokens.space1),
            Text(
              quantos!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.secondaryText,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Uma linha do histograma: valor com estrela, trilha com a barra proporcional à maior faixa e a
/// contagem com unidade, ou `nenhum`. Sem percentual (§10).
class _LinhaDoHistograma extends StatelessWidget {
  final double valor;
  final int quantidade;
  final int maior;

  const _LinhaDoHistograma({
    required this.valor,
    required this.quantidade,
    required this.maior,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final escala = MediaQuery.textScalerOf(context);
    final rotulo = formatarNota(valor);
    // Abaixo de 2 é singular ("1,5 estrela"), menos o zero, como na web.
    final estrelas = valor > 0 && valor < 2 ? 'estrela' : 'estrelas';
    final quantos = quantidade == 0
        ? 'nenhum'
        : contagem(quantidade, 'leitor', 'leitores');
    final legenda = theme.textTheme.bodySmall?.copyWith(
      color: quantidade == 0 ? theme.tertiaryText : theme.secondaryText,
    );
    // As colunas laterais crescem com o texto do sistema, para os valores não estourarem.
    final larguraDoValor = escala.scale(44).clamp(44.0, double.infinity);
    final larguraDaContagem = escala.scale(88).clamp(88.0, double.infinity);
    return Semantics(
      container: true,
      role: SemanticsRole.listItem,
      label: '$rotulo $estrelas, $quantos',
      excludeSemantics: true,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 20),
        child: Row(
          children: <Widget>[
            SizedBox(
              width: larguraDoValor,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: <Widget>[
                  Flexible(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerRight,
                      child: Text(
                        rotulo,
                        style: theme.numInline.copyWith(
                          fontSize: DesignTokens.caption.fontSize,
                          color: theme.secondaryText,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: DesignTokens.space1),
                  Icon(
                    PhosphorIconsRegular.star,
                    size: 16,
                    color: theme.secondaryText,
                  ),
                ],
              ),
            ),
            const SizedBox(width: DesignTokens.space2),
            Expanded(
              child: Container(
                key: ValueKey<String>('trilha-$rotulo'),
                height: 8,
                decoration: BoxDecoration(
                  color: theme.accentTint,
                  borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
                ),
                alignment: Alignment.centerLeft,
                child: FractionallySizedBox(
                  // A faixa com mais leitores ocupa a trilha inteira.
                  widthFactor: maior == 0 ? 0 : quantidade / maior,
                  heightFactor: 1,
                  child: quantidade == 0
                      ? null
                      : DecoratedBox(
                          key: ValueKey<String>('barra-$rotulo'),
                          decoration: BoxDecoration(
                            color: theme.primaryAccent,
                            borderRadius: BorderRadius.circular(
                              DesignTokens.radiusFull,
                            ),
                          ),
                        ),
                ),
              ),
            ),
            const SizedBox(width: DesignTokens.space2),
            SizedBox(
              width: larguraDaContagem,
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerRight,
                child: Text(quantos, style: legenda),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
