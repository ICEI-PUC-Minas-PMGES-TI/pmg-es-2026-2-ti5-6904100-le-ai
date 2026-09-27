import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/capa_livro.dart';
import 'estante_service.dart';
import 'textos.dart';

const double _proporcaoDaCapa = 2 / 3;
const double _alturaDaBarra = 6;
const double _seloDaCapa = 28;
const int _percentualMaximo = 100;

class PillStatus extends StatelessWidget {
  final StatusEstante status;

  const PillStatus({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (IconData icone, Color? fundo, Color cor, bool borda) = switch (status) {
      StatusEstante.queroLer => (
        PhosphorIconsRegular.bookmarkSimple,
        null,
        theme.colorScheme.onSurface,
        true,
      ),
      StatusEstante.lendo => (
        PhosphorIconsRegular.bookOpen,
        theme.accentTint,
        theme.primaryAccent,
        false,
      ),
      StatusEstante.lido => (
        PhosphorIconsBold.check,
        theme.primaryAccent,
        theme.colorScheme.onPrimary,
        false,
      ),
      StatusEstante.relendo => (
        PhosphorIconsRegular.arrowsClockwise,
        theme.accentTint,
        theme.progressColor,
        false,
      ),
      StatusEstante.abandonado => (
        PhosphorIconsRegular.pauseCircle,
        null,
        theme.secondaryText,
        true,
      ),
    };
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.space2,
        vertical: DesignTokens.space1,
      ),
      decoration: BoxDecoration(
        color: fundo,
        border: borda ? Border.all(color: theme.divider) : null,
        borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(icone, size: 16, color: cor),
          const SizedBox(width: DesignTokens.space1),
          Text(rotuloDoStatus[status]!, style: theme.textTheme.bodySmall?.copyWith(color: cor)),
        ],
      ),
    );
  }
}

class BarraDeProgresso extends StatelessWidget {
  final double percentual;
  final String rotulo;
  final String? semantica;

  const BarraDeProgresso({
    super.key,
    required this.percentual,
    required this.rotulo,
    this.semantica,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      label: semantica,
      value: '${percentual.round()}%',
      child: Row(
        children: <Widget>[
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
              child: LinearProgressIndicator(
                value: percentual / _percentualMaximo,
                minHeight: _alturaDaBarra,
                backgroundColor: theme.accentTint,
                color: theme.primaryAccent,
              ),
            ),
          ),
          const SizedBox(width: DesignTokens.space2),
          ExcludeSemantics(
            child: Text(
              rotulo,
              style: theme.numInline.copyWith(
                color: theme.secondaryText,
                fontSize: theme.textTheme.bodySmall?.fontSize,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class CartaoEstante extends StatelessWidget {
  final ItemEstante item;
  final VoidCallback? aoAbrir;

  const CartaoEstante({super.key, required this.item, this.aoAbrir});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    final percentual = item.status.emAndamento ? item.percentualConcluido?.roundToDouble() : null;
    final paginaAtual = item.paginaAtual;
    final totalPaginas = item.totalPaginas;
    final parouNaPagina =
        item.status == StatusEstante.abandonado && paginaAtual != null && totalPaginas != null
        ? textoParouNaPagina(paginaAtual, totalPaginas)
        : null;
    final autor = item.livro.autor;

    final conteudo = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        AspectRatio(
          aspectRatio: _proporcaoDaCapa,
          child: LayoutBuilder(
            builder: (context, limites) => Stack(
              children: <Widget>[
                CapaLivro(
                  url: item.livro.capaUrl,
                  largura: limites.maxWidth,
                  altura: limites.maxHeight,
                ),
                if (item.status == StatusEstante.lido || item.status == StatusEstante.relendo)
                  Align(
                    alignment: Alignment.topRight,
                    child: Padding(
                      padding: const EdgeInsets.all(DesignTokens.space2),
                      child: _SeloDaCapa(status: item.status),
                    ),
                  ),
              ],
            ),
          ),
        ),
        if (percentual != null) ...<Widget>[
          const SizedBox(height: DesignTokens.space2),
          BarraDeProgresso(
            percentual: percentual,
            rotulo: percentual == 0 ? TextosDaEstante.progressoIniciado : '${percentual.toInt()}%',
            semantica: 'Progresso de ${item.livro.titulo}',
          ),
        ],
        const SizedBox(height: DesignTokens.space2),
        Text(
          item.livro.titulo,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: theme.textTheme.titleSmall,
        ),
        if (autor != null)
          Text(autor, maxLines: 1, overflow: TextOverflow.ellipsis, style: legenda),
        const SizedBox(height: DesignTokens.space2),
        PillStatus(status: item.status),
        if (parouNaPagina != null) ...<Widget>[
          const SizedBox(height: DesignTokens.space1),
          Text(parouNaPagina, style: legenda),
        ],
        if (item.vezesLido > 0) ...<Widget>[
          const SizedBox(height: DesignTokens.space1),
          Text(textoVezesLido(item.vezesLido), style: legenda),
        ],
      ],
    );

    if (aoAbrir == null) {
      return conteudo;
    }
    return Semantics(
      button: true,
      child: InkWell(
        onTap: aoAbrir,
        splashFactory: NoSplash.splashFactory,
        borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        child: conteudo,
      ),
    );
  }
}

class _SeloDaCapa extends StatelessWidget {
  final StatusEstante status;

  const _SeloDaCapa({required this.status});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final lido = status == StatusEstante.lido;
    return ExcludeSemantics(
      child: Container(
        width: _seloDaCapa,
        height: _seloDaCapa,
        decoration: BoxDecoration(
          color: theme.pageBackground,
          shape: BoxShape.circle,
          boxShadow: theme.elevation1,
        ),
        child: Icon(
          lido ? PhosphorIconsBold.check : PhosphorIconsRegular.arrowsClockwise,
          size: 20,
          color: lido ? theme.primaryAccent : theme.progressColor,
        ),
      ),
    );
  }
}

class EsqueletoDaEstante extends StatelessWidget {
  static const int _quantidade = 6;

  const EsqueletoDaEstante({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget barra(double altura, double fracao) => FractionallySizedBox(
      widthFactor: fracao,
      alignment: Alignment.centerLeft,
      child: Container(
        height: altura,
        decoration: BoxDecoration(
          color: theme.coverPlaceholder,
          borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        ),
      ),
    );
    return Semantics(
      label: TextosDaEstante.carregando,
      child: ExcludeSemantics(
        child: GradeDaEstante(
          filhos: List<Widget>.generate(
            _quantidade,
            (_) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                AspectRatio(
                  aspectRatio: _proporcaoDaCapa,
                  child: ColoredBox(color: theme.coverPlaceholder),
                ),
                const SizedBox(height: DesignTokens.space2),
                barra(18, 0.85),
                const SizedBox(height: DesignTokens.space2),
                barra(13, 0.55),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class GradeDaEstante extends StatelessWidget {
  static const int _colunas = 2;

  final List<Widget> filhos;

  const GradeDaEstante({super.key, required this.filhos});

  @override
  Widget build(BuildContext context) {
    final linhas = <Widget>[];
    for (var inicio = 0; inicio < filhos.length; inicio += _colunas) {
      if (inicio > 0) {
        linhas.add(const SizedBox(height: DesignTokens.space6));
      }
      linhas.add(
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            for (var coluna = 0; coluna < _colunas; coluna++) ...<Widget>[
              if (coluna > 0) const SizedBox(width: DesignTokens.space4),
              Expanded(
                child: inicio + coluna < filhos.length
                    ? filhos[inicio + coluna]
                    : const SizedBox.shrink(),
              ),
            ],
          ],
        ),
      );
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: linhas);
  }
}
