import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import 'desafios_service.dart';
import 'textos.dart';

/// Ícone da unidade (desafios.md §4): `BookOpen` páginas, `Clock` minutos, `Books` livros.
IconData iconeDaUnidade(UnidadeDesafio unidade, {bool preenchido = false}) => switch (unidade) {
  UnidadeDesafio.paginas => preenchido ? PhosphorIconsFill.bookOpen : PhosphorIconsRegular.bookOpen,
  UnidadeDesafio.minutos => preenchido ? PhosphorIconsFill.clock : PhosphorIconsRegular.clock,
  UnidadeDesafio.livros => preenchido ? PhosphorIconsFill.books : PhosphorIconsRegular.books,
};

/// `20 páginas por dia` com o número em mono, como no protótipo.
class TituloDoDesafio extends StatelessWidget {
  final Desafio desafio;
  final TextStyle? estilo;

  const TituloDoDesafio({super.key, required this.desafio, this.estilo});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final base = estilo ?? theme.textTheme.titleMedium;
    final titulo = tituloDe(desafio);
    final numero = '${desafio.valorAlvo}';
    return Text.rich(
      TextSpan(
        style: base,
        children: <InlineSpan>[
          TextSpan(
            text: numero,
            style: theme.numInline.copyWith(
              fontSize: base?.fontSize,
              fontWeight: FontWeight.w500,
              color: base?.color,
            ),
          ),
          TextSpan(text: titulo.substring(numero.length)),
        ],
      ),
    );
  }
}

/// Barra do desafio (documento-de-design §3.1.3 e §4.7): trilha de 6px em `musgo-fundo`,
/// preenchimento `broto` (`broto-vivo` no escuro), pill. Para no alvo, mesmo que o acumulado
/// passe dele; sem porcentagem escrita.
class BarraDoDesafio extends StatelessWidget {
  final Desafio desafio;

  const BarraDoDesafio({super.key, required this.desafio});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final acumulado = desafio.janelaCorrente.acumulado;
    final alvo = desafio.valorAlvo;
    final fracao = alvo <= 0 ? 0.0 : (acumulado / alvo).clamp(0.0, 1.0);
    return Semantics(
      label: tituloDe(desafio),
      value: '${acumulado > alvo ? alvo : acumulado} de $alvo',
      child: ClipRRect(
        borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
        child: SizedBox(
          height: 6,
          child: Stack(
            fit: StackFit.expand,
            children: <Widget>[
              ColoredBox(color: theme.accentTint),
              FractionallySizedBox(
                key: const ValueKey<String>('preenchimento-do-desafio'),
                alignment: Alignment.centerLeft,
                widthFactor: fracao,
                child: ColoredBox(color: theme.progressColor),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Linha abaixo da barra: `12 de 20 páginas` à esquerda e, à direita, `Faltam 8 páginas` ou o
/// `Cumprido …` com o check.
class NumerosDoDesafio extends StatelessWidget {
  final Desafio desafio;

  const NumerosDoDesafio({super.key, required this.desafio});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final corpo = theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText);
    final numero = theme.numInline;
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    final janela = desafio.janelaCorrente;
    // Em tela estreita ou com fonte grande, o lado direito desce para a linha de baixo em vez de
    // espremer os números.
    return Wrap(
      alignment: WrapAlignment.spaceBetween,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: DesignTokens.space3,
      runSpacing: DesignTokens.space1,
      children: <Widget>[
        Text.rich(
          TextSpan(
            style: corpo,
            children: <InlineSpan>[
              TextSpan(text: '${janela.acumulado}', style: numero),
              const TextSpan(text: ' de '),
              TextSpan(text: '${desafio.valorAlvo}', style: numero),
              TextSpan(text: ' ${nomeDaUnidade(desafio.unidade, desafio.valorAlvo)}'),
            ],
          ),
        ),
        if (janela.cumprida)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Icon(PhosphorIconsBold.check, size: 16, color: theme.progressColor),
              const SizedBox(width: DesignTokens.space1),
              Flexible(
                child: Text(
                  textoDeCumprido(desafio.janela, janela.inicio),
                  style: legenda?.copyWith(
                    color: theme.colorScheme.onSurface,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          )
        else
          Text(textoDeFalta(desafio.unidade, desafio.faltam), style: legenda),
      ],
    );
  }
}

/// Pill `Pausado` (desafios.md §4, no molde da pill `Abandonado` do design §4.6): fundo
/// transparente, borda `linha`, ícone e texto `grafite`.
class PillPausado extends StatelessWidget {
  const PillPausado({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.space2,
        vertical: DesignTokens.space1,
      ),
      decoration: BoxDecoration(
        border: Border.all(color: theme.divider),
        borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(PhosphorIconsRegular.pauseCircle, size: 16, color: theme.secondaryText),
          const SizedBox(width: DesignTokens.space1),
          Text('Pausado', style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText)),
        ],
      ),
    );
  }
}

/// Card da lista de desafios (desafios.md §4): ícone da unidade, conteúdo e o botão de ações de
/// 48px. A barra e os números ficam na coluna do conteúdo, recuados do ícone. O card em si não é
/// tocável: não há página de detalhe no Período 2.
class CartaoDeDesafio extends StatelessWidget {
  final Desafio desafio;
  final VoidCallback aoAbrirAcoes;

  const CartaoDeDesafio({super.key, required this.desafio, required this.aoAbrirAcoes});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final janela = desafio.janelaCorrente;
    return Container(
      padding: const EdgeInsets.all(DesignTokens.space5),
      decoration: BoxDecoration(
        color: theme.elevatedSurface,
        borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Icon(iconeDaUnidade(desafio.unidade), size: 20, color: theme.secondaryText),
          ),
          const SizedBox(width: DesignTokens.space3),
          Expanded(
            child: Semantics(
              container: true,
              label: semanticaDoCard(desafio),
              excludeSemantics: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  TituloDoDesafio(desafio: desafio),
                  if (desafio.pausado) ...<Widget>[
                    const SizedBox(height: DesignTokens.space2),
                    const PillPausado(),
                    const SizedBox(height: DesignTokens.space3),
                    Text(
                      '${textoDePausadoDesde(desafio)}. $textoDaPausa',
                      style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                    ),
                  ] else ...<Widget>[
                    const SizedBox(height: DesignTokens.space1),
                    Text(
                      nomeDaJanela(desafio.janela, janela.inicio),
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                    ),
                    const SizedBox(height: DesignTokens.space4),
                    BarraDoDesafio(desafio: desafio),
                    const SizedBox(height: DesignTokens.space2),
                    NumerosDoDesafio(desafio: desafio),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(width: DesignTokens.space3),
          Semantics(
            button: true,
            label: 'Ações do desafio ${tituloDe(desafio)}',
            excludeSemantics: true,
            child: InkResponse(
              onTap: aoAbrirAcoes,
              radius: 24,
              child: SizedBox(
                width: 48,
                height: 48,
                child: Icon(
                  PhosphorIconsRegular.dotsThreeVertical,
                  size: 24,
                  color: theme.secondaryText,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Card compacto do bloco `Desafios` do Meu perfil (meu-perfil.md §4.1 B): padding 16, a janela
/// à direita do título e a barra na largura toda. O card inteiro é um botão que abre a lista.
class CartaoCompactoDeDesafio extends StatelessWidget {
  final Desafio desafio;
  final VoidCallback aoTocar;

  const CartaoCompactoDeDesafio({super.key, required this.desafio, required this.aoTocar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      button: true,
      label: semanticaDoCardDoPerfil(desafio),
      excludeSemantics: true,
      child: Material(
        color: theme.elevatedSurface,
        borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: aoTocar,
          child: Padding(
            padding: const EdgeInsets.all(DesignTokens.space4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    Icon(iconeDaUnidade(desafio.unidade), size: 20, color: theme.secondaryText),
                    const SizedBox(width: DesignTokens.space3),
                    Expanded(child: TituloDoDesafio(desafio: desafio)),
                    const SizedBox(width: DesignTokens.space3),
                    Text(
                      nomeDaJanela(desafio.janela, desafio.janelaCorrente.inicio),
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                    ),
                  ],
                ),
                const SizedBox(height: DesignTokens.space3),
                BarraDoDesafio(desafio: desafio),
                const SizedBox(height: DesignTokens.space2),
                NumerosDoDesafio(desafio: desafio),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Skeleton do card (desafios.md §4.6): três barras em `linha`, sem coluna de ícone, estático.
class SkeletonDeDesafio extends StatelessWidget {
  const SkeletonDeDesafio({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget barra(double altura, double fracao, {bool pill = false}) => FractionallySizedBox(
      widthFactor: fracao,
      alignment: Alignment.centerLeft,
      child: Container(
        height: altura,
        decoration: BoxDecoration(
          color: theme.divider,
          borderRadius: BorderRadius.circular(
            pill ? DesignTokens.radiusFull : DesignTokens.radiusSm,
          ),
        ),
      ),
    );
    return ExcludeSemantics(
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(DesignTokens.space5),
        decoration: BoxDecoration(
          color: theme.elevatedSurface,
          borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            barra(17, 0.6),
            const SizedBox(height: DesignTokens.space2),
            barra(13, 0.3),
            const SizedBox(height: DesignTokens.space4),
            barra(6, 1, pill: true),
          ],
        ),
      ),
    );
  }
}
