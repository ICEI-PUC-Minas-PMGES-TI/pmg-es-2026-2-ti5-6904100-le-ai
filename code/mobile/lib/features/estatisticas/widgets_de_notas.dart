import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../livros/formatos.dart';
import 'estatisticas_service.dart';
import 'formatos.dart';
import 'textos.dart';
import 'widgets_de_estatisticas.dart';

class ColunasDeNotas extends StatelessWidget {
  static const double _alturaDaArea = 160;
  static const double _alturaDaMaiorColuna = 120;
  static const double _alturaDaAreaCompacta = 112;
  static const double _alturaDaMaiorColunaCompacta = 80;
  static const double _larguraDaColuna = 16;
  static const double _larguraDaColunaCompacta = 14;
  static const double _alturaDoEixoX = DesignTokens.space6;

  final List<FaixaDeNota> faixas;
  final bool compacto;
  final int? ativo;
  final ValueChanged<int>? aoTocar;

  const ColunasDeNotas({
    super.key,
    required this.faixas,
    this.compacto = false,
    this.ativo,
    this.aoTocar,
  });

  static double alturaDaArea({required bool compacto}) =>
      compacto ? _alturaDaAreaCompacta : _alturaDaArea;

  static double alturaDaColuna(List<FaixaDeNota> faixas, int quantidade, {required bool compacto}) {
    final maior = faixas.fold<int>(1, (m, f) => f.quantidade > m ? f.quantidade : m);
    final maxima = compacto ? _alturaDaMaiorColunaCompacta : _alturaDaMaiorColuna;
    return maxima * quantidade / maior;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final eixo = theme.textTheme.bodySmall?.copyWith(
      color: theme.secondaryText,
      fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Container(
          height: alturaDaArea(compacto: compacto),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: theme.divider)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              for (var i = 0; i < faixas.length; i++) Expanded(child: _construirFaixa(theme, i)),
            ],
          ),
        ),
        ExcludeSemantics(
          child: SizedBox(
            height: _alturaDoEixoX,
            child: Row(
              children: <Widget>[
                for (final faixa in faixas)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: DesignTokens.space2),
                      child: Text(
                        formatarNota(faixa.valor),
                        style: eixo,
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        softWrap: false,
                        overflow: TextOverflow.visible,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _construirFaixa(ThemeData theme, int indice) {
    final faixa = faixas[indice];
    final altura = alturaDaColuna(faixas, faixa.quantidade, compacto: compacto);
    final contagem = theme.textTheme.bodySmall?.copyWith(
      fontWeight: faixa.quantidade == 0 ? FontWeight.w400 : FontWeight.w600,
      color: faixa.quantidade == 0 ? theme.secondaryText : theme.colorScheme.onSurface,
      fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
    );
    final conteudo = Stack(
      alignment: Alignment.bottomCenter,
      clipBehavior: Clip.none,
      children: <Widget>[
        if (ativo == indice)
          Positioned(
            top: 0,
            bottom: 0,
            child: Container(
              key: const ValueKey<String>('faixa-da-nota'),
              width: 28,
              decoration: BoxDecoration(
                color: theme.accentTint,
                borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
              ),
            ),
          ),
        if (faixa.quantidade > 0)
          Container(
            key: const ValueKey<String>('coluna-da-nota'),
            width: compacto ? _larguraDaColunaCompacta : _larguraDaColuna,
            height: altura,
            decoration: BoxDecoration(
              color: theme.primaryAccent,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
            ),
          ),
        if (ativo != indice)
          Positioned(
            bottom: altura + DesignTokens.space1,
            child: Text(
              formatarMilhar(faixa.quantidade),
              key: const ValueKey<String>('contagem-da-nota'),
              softWrap: false,
              style: contagem,
            ),
          ),
      ],
    );
    if (aoTocar == null) {
      return conteudo;
    }
    return Semantics(
      container: true,
      button: true,
      label: leituraDaNota(faixa),
      onTap: () => aoTocar!(indice),
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => aoTocar!(indice),
        child: conteudo,
      ),
    );
  }
}

class GraficoDeNotas extends StatefulWidget {
  final DistribuicaoNotas? distribuicao;
  final PeriodoEstatisticas periodo;
  final DateTime? primeiroRegistro;

  const GraficoDeNotas({
    super.key,
    required this.distribuicao,
    required this.periodo,
    required this.primeiroRegistro,
  });

  @override
  State<GraficoDeNotas> createState() => _GraficoDeNotasState();
}

class _GraficoDeNotasState extends State<GraficoDeNotas> {
  static const double _folgaNoTopo = DesignTokens.space8;
  static const double _folgaDoBalao = DesignTokens.space2;

  bool _tabela = false;
  int? _ativo;

  @override
  void didUpdateWidget(GraficoDeNotas antigo) {
    super.didUpdateWidget(antigo);
    if (antigo.distribuicao != widget.distribuicao) {
      _ativo = null;
    }
  }

  void _fechar() {
    if (_ativo != null) {
      setState(() => _ativo = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final distribuicao = widget.distribuicao;
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
              child: Text(TextosDasNotas.titulo, style: theme.textTheme.titleMedium),
            ),
            if (distribuicao == null) ...<Widget>[
              const SizedBox(height: DesignTokens.space4),
              Text(
                semNotasNoPeriodo(widget.periodo),
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
              ),
            ] else ...<Widget>[
              const SizedBox(height: DesignTokens.space1),
              Text(
                subtituloDasNotas(widget.periodo, distribuicao.total, widget.primeiroRegistro),
                style: legenda,
              ),
              const SizedBox(height: DesignTokens.space4),
              if (_tabela) _construirTabela(theme, distribuicao) else _construirGrafico(distribuicao),
              if (!_tabela) ...<Widget>[
                const SizedBox(height: DesignTokens.space2),
                Text(TextosDasNotas.legenda, style: legenda),
              ],
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

  Widget _construirGrafico(DistribuicaoNotas distribuicao) {
    final faixas = distribuicao.faixas;
    return TapRegion(
      onTapOutside: (_) => _fechar(),
      child: Semantics(
        container: true,
        explicitChildNodes: true,
        label: resumoDasNotas(widget.periodo, distribuicao),
        child: LayoutBuilder(
          builder: (context, restricoes) {
            final larguraDaFaixa = restricoes.maxWidth / faixas.length;
            final ativo = _ativo;
            return Stack(
              clipBehavior: Clip.none,
              children: <Widget>[
                Padding(
                  padding: const EdgeInsets.only(top: _folgaNoTopo),
                  child: ColunasDeNotas(
                    faixas: faixas,
                    ativo: ativo,
                    aoTocar: (indice) => setState(() => _ativo = indice),
                  ),
                ),
                if (ativo != null)
                  Positioned.fill(
                    child: IgnorePointer(
                      child: ExcludeSemantics(
                        child: CustomSingleChildLayout(
                          delegate: PosicaoDoBalao(
                            centro: larguraDaFaixa * (ativo + 0.5),
                            pontaDaColuna:
                                _folgaNoTopo +
                                ColunasDeNotas.alturaDaArea(compacto: false) -
                                ColunasDeNotas.alturaDaColuna(
                                  faixas,
                                  faixas[ativo].quantidade,
                                  compacto: false,
                                ) -
                                _folgaDoBalao,
                          ),
                          child: BalaoDeValor(
                            titulo: tituloDoBalaoDaNota(faixas[ativo]),
                            valor: quantidadeDeLivros(faixas[ativo].quantidade),
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

  Widget _construirTabela(ThemeData theme, DistribuicaoNotas distribuicao) {
    final rotulo = theme.textTheme.labelMedium?.copyWith(color: theme.secondaryText);
    Widget linha(String nome, String valor, String leitura, {bool destaque = false}) => Semantics(
      container: true,
      label: leitura,
      excludeSemantics: true,
      child: Container(
        constraints: const BoxConstraints(minHeight: 44),
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: theme.divider)),
        ),
        child: Row(
          children: <Widget>[
            Expanded(
              child: Text(
                nome,
                style: destaque ? theme.textTheme.labelLarge : theme.textTheme.bodyMedium,
              ),
            ),
            Text(
              valor,
              style: theme.numInline.copyWith(
                color: theme.colorScheme.onSurface,
                fontWeight: destaque ? FontWeight.w600 : null,
              ),
            ),
          ],
        ),
      ),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        ExcludeSemantics(
          child: Padding(
            padding: const EdgeInsets.only(bottom: DesignTokens.space2),
            child: Row(
              children: <Widget>[
                Expanded(child: Text(TextosDasNotas.colunaNota, style: rotulo)),
                Text(TextosDasNotas.colunaLivros, style: rotulo),
              ],
            ),
          ),
        ),
        for (final faixa in distribuicao.faixas)
          linha(rotuloEstrelas(faixa.valor), rotuloLivros(faixa.quantidade), leituraDaNota(faixa)),
        linha(
          TextosDasNotas.total,
          rotuloLivros(distribuicao.total),
          '${TextosDasNotas.total}, ${rotuloLivros(distribuicao.total)}',
          destaque: true,
        ),
      ],
    );
  }
}

class NotasDoPerfil extends StatelessWidget {
  final DistribuicaoNotas? distribuicao;
  final String nome;
  final int ano;

  const NotasDoPerfil({
    super.key,
    required this.distribuicao,
    required this.nome,
    required this.ano,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    final distribuicao = this.distribuicao;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.elevatedSurface,
        borderRadius: BorderRadius.circular(DesignTokens.radius),
      ),
      child: Padding(
        padding: const EdgeInsets.all(DesignTokens.space4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: <Widget>[
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text(
                      TextosDasNotasDoPerfil.titulo(ano),
                      style: theme.textTheme.labelLarge,
                    ),
                  ),
                ),
                if (distribuicao != null) Text(rotuloNotas(distribuicao.total), style: legenda),
              ],
            ),
            const SizedBox(height: DesignTokens.space3),
            if (distribuicao == null)
              Text(
                TextosDasNotasDoPerfil.semNotas(nome, ano),
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
              )
            else ...<Widget>[
              Semantics(
                container: true,
                label: TextosDasNotasDoPerfil.resumo(nome, ano, distribuicao),
                excludeSemantics: true,
                child: Padding(
                  padding: const EdgeInsets.only(top: DesignTokens.space5),
                  child: ColunasDeNotas(faixas: distribuicao.faixas, compacto: true),
                ),
              ),
              const SizedBox(height: DesignTokens.space2),
              Text(TextosDasNotas.legenda, style: legenda),
            ],
          ],
        ),
      ),
    );
  }
}
