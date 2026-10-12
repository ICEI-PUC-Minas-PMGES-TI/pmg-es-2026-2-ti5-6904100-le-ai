import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import 'escala.dart';
import 'estatisticas_service.dart';
import 'formatos.dart';
import 'textos.dart';

/// Container `papel-elevado` de linhas empilhadas com divisor de 1px (`Totais` e `Médias`, 4.1).
class ContainerDeLinhas extends StatelessWidget {
  final List<Widget> linhas;

  const ContainerDeLinhas({super.key, required this.linhas});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.elevatedSurface,
        borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          for (var i = 0; i < linhas.length; i++) ...<Widget>[
            if (i > 0) Divider(height: 1, thickness: 1, color: theme.divider),
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: DesignTokens.space5,
                vertical: DesignTokens.space4,
              ),
              child: linhas[i],
            ),
          ],
        ],
      ),
    );
  }
}

/// Número em `num-display` com a unidade em `body-strong` `grafite`, na mesma linha de base. O
/// tempo chega em partes (`71` `h` `20` `min`) e quebra entre elas se não couber.
class ValorComUnidade extends StatelessWidget {
  final List<ParteDoTempo> partes;

  const ValorComUnidade({super.key, required this.partes});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final numero = theme.numDisplay.copyWith(color: theme.colorScheme.onSurface);
    final unidade = theme.textTheme.labelLarge?.copyWith(color: theme.secondaryText);
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.end,
      spacing: DesignTokens.space2,
      children: <Widget>[
        for (final parte in partes)
          Text.rich(
            TextSpan(
              children: <InlineSpan>[
                TextSpan(text: parte.numero, style: numero),
                // `space-2` entre número e unidade; no tempo, `space-1` dentro de cada parte (§4).
                WidgetSpan(
                  child: SizedBox(
                    width: partes.length == 1 ? DesignTokens.space2 : DesignTokens.space1,
                  ),
                ),
                TextSpan(text: parte.unidade, style: unidade),
              ],
            ),
          ),
      ],
    );
  }
}

/// Linha de métrica total (F-STA): label em `caption` sobre o valor. O TalkBack lê [leitura].
class MetricaTotal extends StatelessWidget {
  final String rotulo;
  final List<ParteDoTempo> partes;
  final String leitura;

  const MetricaTotal({
    super.key,
    required this.rotulo,
    required this.partes,
    required this.leitura,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      container: true,
      label: leitura,
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(rotulo, style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText)),
          const SizedBox(height: DesignTokens.space1),
          ValorComUnidade(partes: partes),
        ],
      ),
    );
  }
}

/// Linha de média com a regra da conta (4.1): label e ajuda à esquerda; à direita, o número no
/// tamanho do `title` em JetBrains Mono com a unidade embaixo. Sem denominador, uma frase de até
/// 140px no lugar do número: nunca `0`, nunca traço.
class MetricaMedia extends StatelessWidget {
  final String rotulo;
  final String ajuda;
  final String? valor;
  final String unidade;
  final String ausente;

  const MetricaMedia({
    super.key,
    required this.rotulo,
    required this.ajuda,
    required this.valor,
    required this.unidade,
    required this.ausente,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    final leitura = valor == null
        ? '$rotulo: $ausente. $ajuda'
        : '$rotulo: $valor $unidade. $ajuda';
    return Semantics(
      container: true,
      label: leitura,
      excludeSemantics: true,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(rotulo, style: theme.textTheme.labelLarge),
                const SizedBox(height: DesignTokens.space1),
                Text(ajuda, style: legenda),
              ],
            ),
          ),
          const SizedBox(width: DesignTokens.space4),
          if (valor != null)
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: <Widget>[
                Text(
                  valor!,
                  style: theme.numInline.copyWith(
                    fontSize: theme.textTheme.titleLarge?.fontSize,
                    fontWeight: FontWeight.w500,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
                Text(unidade, style: legenda),
              ],
            )
          else
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 140),
              child: Text(ausente, style: legenda, textAlign: TextAlign.right),
            ),
        ],
      ),
    );
  }
}

/// Barra estática de skeleton em `capa-placeholder`.
class BarraDeSkeleton extends StatelessWidget {
  final double altura;
  final double fracao;
  final double? largura;

  const BarraDeSkeleton({super.key, required this.altura, this.fracao = 1, this.largura});

  @override
  Widget build(BuildContext context) {
    final barra = Container(
      height: altura,
      width: largura,
      decoration: BoxDecoration(
        color: Theme.of(context).coverPlaceholder,
        borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
      ),
    );
    return largura != null
        ? barra
        : FractionallySizedBox(alignment: Alignment.centerLeft, widthFactor: fracao, child: barra);
  }
}

/// Skeleton estático do painel (4.8), com a forma final para o conteúdo não saltar: títulos
/// reais e, no lugar dos containers, as barras de label e número.
class SkeletonDoPainel extends StatelessWidget {
  const SkeletonDoPainel({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      container: true,
      label: TextosDasEstatisticas.carregando,
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            const SizedBox(height: DesignTokens.space6),
            Text(TextosDasEstatisticas.totais, style: theme.textTheme.headlineSmall),
            const SizedBox(height: DesignTokens.space3),
            ContainerDeLinhas(
              linhas: <Widget>[
                for (var i = 0; i < 3; i++)
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      BarraDeSkeleton(altura: 13, fracao: 0.3),
                      SizedBox(height: DesignTokens.space2),
                      BarraDeSkeleton(altura: 36, fracao: 0.45),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: DesignTokens.space6),
            Text(TextosDasEstatisticas.medias, style: theme.textTheme.headlineSmall),
            const SizedBox(height: DesignTokens.space3),
            ContainerDeLinhas(
              linhas: <Widget>[
                for (var i = 0; i < 3; i++)
                  const Row(
                    children: <Widget>[
                      Expanded(child: BarraDeSkeleton(altura: 15, fracao: 0.6)),
                      SizedBox(width: DesignTokens.space4),
                      BarraDeSkeleton(altura: 20, largura: 56),
                    ],
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Gráfico de colunas de uma série (F-STA, RF-STA-03), feito à mão: grade de 1px, eixo Y só com
/// marcas, um único rótulo direto no maior valor e o balão do mês no toque. Todo valor também
/// está na tabela (`Ver como tabela`), e a escolha vale só para este card. Espelha
/// `code/front/src/components/estatisticas/GraficoDeColunas.vue`.
class GraficoDeColunas extends StatefulWidget {
  final Medida medida;
  final List<PontoEstatistica> pontos;
  final PeriodoEstatisticas periodo;
  final DateTime hoje;

  const GraficoDeColunas({
    super.key,
    required this.medida,
    required this.pontos,
    required this.periodo,
    required this.hoje,
  });

  @override
  State<GraficoDeColunas> createState() => _GraficoDeColunasState();
}

class _GraficoDeColunasState extends State<GraficoDeColunas> {
  /// Folga no topo para o balão e o rótulo direto da coluna mais alta.
  static const double _folgaNoTopo = DesignTokens.space8;
  static const double _folgaDoBalao = DesignTokens.space2;
  static const double _alturaDoEixoX = DesignTokens.space6;

  bool _tabela = false;
  int? _ativo;

  @override
  void didUpdateWidget(GraficoDeColunas antigo) {
    super.didUpdateWidget(antigo);
    if (antigo.pontos != widget.pontos) {
      _ativo = null;
    }
  }

  /// Páginas têm mais altura que livros (4.2).
  double get _altura => widget.medida == Medida.paginas ? 180 : 140;

  List<int> get _valores => <int>[for (final p in widget.pontos) valorDoPonto(widget.medida, p)];

  void _ativar(int indice) => setState(() => _ativo = indice);

  void _fechar() {
    if (_ativo != null) {
      setState(() => _ativo = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final porAno = widget.pontos.isNotEmpty && widget.pontos.first.mes == null;
    final semDados = somaDaMedida(widget.medida, widget.pontos) == 0;
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.elevatedSurface,
        borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
      ),
      child: Padding(
        padding: const EdgeInsets.all(DesignTokens.space5),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Semantics(
              header: true,
              child: Text(
                tituloDoGrafico(widget.medida, porAno: porAno),
                style: theme.textTheme.titleMedium,
              ),
            ),
            const SizedBox(height: DesignTokens.space1),
            Text(subtituloDoGrafico(widget.medida, widget.pontos, widget.periodo), style: legenda),
            if (semDados) ...<Widget>[
              const SizedBox(height: DesignTokens.space4),
              Text(
                graficoSemDados(widget.medida, widget.periodo),
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
              ),
            ] else ...<Widget>[
              const SizedBox(height: DesignTokens.space2),
              if (_tabela) _construirTabela(theme) else _construirArea(theme),
              const SizedBox(height: DesignTokens.space3),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () => setState(() {
                    _tabela = !_tabela;
                    _ativo = null;
                  }),
                  icon: Icon(
                    _tabela ? PhosphorIconsRegular.chartBar : PhosphorIconsRegular.table,
                    size: 20,
                  ),
                  label: Text(
                    _tabela
                        ? TextosDasEstatisticas.verComoGrafico
                        : TextosDasEstatisticas.verComoTabela,
                  ),
                  style: TextButton.styleFrom(
                    foregroundColor: theme.primaryAccent,
                    minimumSize: const Size(48, 48),
                    padding: EdgeInsets.zero,
                    textStyle: theme.textTheme.labelLarge,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _construirArea(ThemeData theme) {
    final valores = _valores;
    final escala = escalaDoEixo(valores.fold(0, math.max));
    final marcaStyle = theme.textTheme.bodySmall?.copyWith(
      color: theme.secondaryText,
      fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
    );
    // A coluna do eixo Y tem a largura da maior marca.
    final larguraDoEixo = escala.marcas
        .map((marca) {
          final pintor = TextPainter(
            text: TextSpan(text: formatarMilhar(marca), style: marcaStyle),
            textDirection: TextDirection.ltr,
            textScaler: MediaQuery.textScalerOf(context),
          )..layout();
          return pintor.width;
        })
        .fold<double>(0, math.max);
    final maior = indiceDoMaior(widget.medida, widget.pontos);
    // Com doze meses a coluna afina para sobrar ar entre elas (4.4).
    final larguraDaColuna = widget.pontos.length >= 12 ? 16.0 : 20.0;
    final altura = _altura;
    double proporcao(int valor) => altura * valor / escala.dominio;

    return TapRegion(
      onTapOutside: (_) => _fechar(),
      child: Semantics(
        container: true,
        explicitChildNodes: true,
        label: resumoDoGrafico(widget.medida, widget.pontos, widget.periodo),
        child: LayoutBuilder(
          builder: (context, restricoes) {
            final larguraDaArea = restricoes.maxWidth - larguraDoEixo - DesignTokens.space2;
            final larguraDoMes = larguraDaArea / widget.pontos.length;
            return Stack(
              clipBehavior: Clip.none,
              children: <Widget>[
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    const SizedBox(height: _folgaNoTopo),
                    SizedBox(
                      height: altura,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: <Widget>[
                          // Eixo Y: só as marcas, sem linha de eixo.
                          ExcludeSemantics(
                            child: SizedBox(
                              width: larguraDoEixo,
                              child: Stack(
                                clipBehavior: Clip.none,
                                children: <Widget>[
                                  for (final marca in escala.marcas)
                                    Positioned(
                                      right: 0,
                                      bottom: proporcao(marca) - 8,
                                      child: Text(formatarMilhar(marca), style: marcaStyle),
                                    ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: DesignTokens.space2),
                          Expanded(
                            child: Stack(
                              clipBehavior: Clip.none,
                              children: <Widget>[
                                for (final marca in escala.marcas)
                                  Positioned(
                                    left: 0,
                                    right: 0,
                                    bottom: proporcao(marca),
                                    child: Container(height: 1, color: theme.divider),
                                  ),
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: <Widget>[
                                    for (var i = 0; i < widget.pontos.length; i++)
                                      Expanded(
                                        child: _Mes(
                                          leitura: leituraDoPonto(
                                            widget.medida,
                                            widget.pontos[i],
                                            widget.hoje,
                                          ),
                                          ativo: _ativo == i,
                                          alturaDaColuna: proporcao(valores[i]),
                                          larguraDaColuna: larguraDaColuna,
                                          rotuloDireto: i == maior && _ativo != i
                                              ? rotuloDaMedida(widget.medida, valores[i])
                                              : null,
                                          aoTocar: () => _ativar(i),
                                        ),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Eixo X: mês abreviado (ou ano no acumulado) sob cada coluna.
                    ExcludeSemantics(
                      child: SizedBox(
                        height: _alturaDoEixoX,
                        child: Row(
                          children: <Widget>[
                            SizedBox(width: larguraDoEixo + DesignTokens.space2),
                            for (final ponto in widget.pontos)
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.only(top: DesignTokens.space2),
                                  child: Text(
                                    marcaDoEixoX(ponto),
                                    style: marcaStyle,
                                    textAlign: TextAlign.center,
                                    maxLines: 1,
                                    overflow: TextOverflow.visible,
                                    softWrap: false,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                if (_ativo != null)
                  Positioned.fill(
                    child: IgnorePointer(
                      child: ExcludeSemantics(
                        child: CustomSingleChildLayout(
                          delegate: _PosicaoDoBalao(
                            centro:
                                larguraDoEixo +
                                DesignTokens.space2 +
                                larguraDoMes * (_ativo! + 0.5),
                            pontaDaColuna:
                                _folgaNoTopo + altura - proporcao(valores[_ativo!]) - _folgaDoBalao,
                          ),
                          child: _Balao(
                            titulo: tituloDoBalao(widget.pontos[_ativo!], widget.hoje),
                            valor: valorDoBalao(widget.medida, widget.pontos[_ativo!]),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _construirTabela(ThemeData theme) {
    final rotulo = theme.textTheme.labelMedium?.copyWith(color: theme.secondaryText);
    final porAno = widget.pontos.first.mes == null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SizedBox(height: DesignTokens.space2),
        ExcludeSemantics(
          child: Padding(
            padding: const EdgeInsets.only(bottom: DesignTokens.space2),
            child: Row(
              children: <Widget>[
                Expanded(child: Text(porAno ? 'Ano' : 'Mês', style: rotulo)),
                Text(widget.medida == Medida.paginas ? 'Páginas' : 'Livros', style: rotulo),
              ],
            ),
          ),
        ),
        for (final ponto in widget.pontos)
          Semantics(
            container: true,
            label:
                '${nomeNaTabela(ponto)}'
                '${pontoEmAndamento(ponto, widget.hoje) ? ', ${TextosDasEstatisticas.ateHoje}' : ''}'
                ', ${rotuloDaMedida(widget.medida, valorDoPonto(widget.medida, ponto))}',
            excludeSemantics: true,
            child: Container(
              constraints: const BoxConstraints(minHeight: 44),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: theme.divider)),
              ),
              child: Row(
                children: <Widget>[
                  Expanded(
                    child: Text.rich(
                      TextSpan(
                        text: nomeNaTabela(ponto),
                        style: theme.textTheme.bodyMedium,
                        children: <InlineSpan>[
                          if (pontoEmAndamento(ponto, widget.hoje))
                            TextSpan(
                              text: '  ${TextosDasEstatisticas.ateHoje}',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.secondaryText,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  Text(
                    rotuloDaMedida(widget.medida, valorDoPonto(widget.medida, ponto)),
                    style: theme.numInline.copyWith(color: theme.colorScheme.onSurface),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// Faixa vertical de um mês: a área tocável tem a altura inteira do gráfico e pelo menos 32px,
/// mais que a coluna. Mês com zero não tem coluna, mas o toque mostra o zero.
class _Mes extends StatelessWidget {
  final String leitura;
  final bool ativo;
  final double alturaDaColuna;
  final double larguraDaColuna;
  final String? rotuloDireto;
  final VoidCallback aoTocar;

  const _Mes({
    required this.leitura,
    required this.ativo,
    required this.alturaDaColuna,
    required this.larguraDaColuna,
    required this.rotuloDireto,
    required this.aoTocar,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      container: true,
      button: true,
      label: leitura,
      onTap: aoTocar,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: aoTocar,
        child: Stack(
          alignment: Alignment.bottomCenter,
          clipBehavior: Clip.none,
          children: <Widget>[
            if (ativo)
              Positioned(
                top: 0,
                bottom: 0,
                child: Container(
                  key: const ValueKey<String>('faixa-do-mes'),
                  width: 32,
                  decoration: BoxDecoration(
                    color: theme.accentTint,
                    borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
                  ),
                ),
              ),
            if (alturaDaColuna > 0)
              Container(
                key: const ValueKey<String>('coluna'),
                width: larguraDaColuna,
                height: alturaDaColuna,
                decoration: BoxDecoration(
                  color: theme.primaryAccent,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                ),
              ),
            if (rotuloDireto != null)
              Positioned(
                bottom: alturaDaColuna + DesignTokens.space1,
                child: Text(
                  rotuloDireto!,
                  key: const ValueKey<String>('rotulo-direto'),
                  softWrap: false,
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Balão acima da coluna, centralizado nela, sem sair da área: encosta na borda no primeiro e no
/// último mês e no topo quando a coluna é alta.
class _PosicaoDoBalao extends SingleChildLayoutDelegate {
  final double centro;
  final double pontaDaColuna;

  const _PosicaoDoBalao({required this.centro, required this.pontaDaColuna});

  @override
  BoxConstraints getConstraintsForChild(BoxConstraints constraints) => constraints.loosen();

  @override
  Offset getPositionForChild(Size size, Size childSize) => Offset(
    (centro - childSize.width / 2).clamp(0, math.max(0, size.width - childSize.width)).toDouble(),
    math.max(0, pontaDaColuna - childSize.height),
  );

  @override
  bool shouldRelayout(_PosicaoDoBalao antigo) =>
      antigo.centro != centro || antigo.pontaDaColuna != pontaDaColuna;
}

class _Balao extends StatelessWidget {
  final String titulo;
  final String valor;

  const _Balao({required this.titulo, required this.valor});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final semMovimento = MediaQuery.disableAnimationsOf(context);
    return TweenAnimationBuilder<double>(
      key: ValueKey<String>(titulo),
      tween: Tween<double>(begin: semMovimento ? 1 : 0, end: 1),
      duration: semMovimento ? Duration.zero : DesignTokens.durFast,
      builder: (context, opacidade, child) => Opacity(opacity: opacidade, child: child),
      child: Container(
        key: const ValueKey<String>('balao'),
        padding: const EdgeInsets.symmetric(
          horizontal: DesignTokens.space3,
          vertical: DesignTokens.space2,
        ),
        decoration: BoxDecoration(
          color: theme.pageBackground,
          borderRadius: BorderRadius.circular(DesignTokens.radius),
          border: theme.isDark ? Border.all(color: theme.divider) : null,
          boxShadow: theme.isDark ? DesignTokens.elevation2Dark : DesignTokens.elevation2Light,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(titulo, style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText)),
            Text(valor, style: theme.textTheme.labelLarge),
          ],
        ),
      ),
    );
  }
}
