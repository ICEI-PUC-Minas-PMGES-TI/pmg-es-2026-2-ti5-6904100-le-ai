import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../core/network/recarga_em_sequencia.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/entrada_suave.dart';
import '../../design/widgets/estado_vazio.dart';
import '../../design/widgets/pill_de_filtro.dart';
import 'estatisticas_service.dart';
import 'formatos.dart';
import 'seletor.dart';
import 'textos.dart';
import 'widgets_de_estatisticas.dart';

/// Painel de estatísticas (F-STA, RF-STA-01/02/03), a partir de `F-STA/prototipos/estatisticas.html`
/// (4.1 a 4.9): faixa de períodos, linha do intervalo, `Totais` e `Médias` em containers de
/// linhas e os dois gráficos de colunas, cada um com a sua visão em tabela.
///
/// O período fica na rota (`?periodo=2025|acumulado`), como o filtro da Estante: a página guarda o
/// próprio e avisa [aoMudarPeriodo]. Totais e séries vêm juntos; uma resposta atrasada de um
/// período anterior é descartada, e os anos do seletor sobrevivem à troca de período para a faixa
/// continuar usável enquanto o novo recorte carrega. Os avisos de [alteracoesDeLeitura] recarregam
/// em silêncio depois de [atrasoDaRecarga], porque o servidor recompõe de forma assíncrona.
class EstatisticasPage extends StatefulWidget {
  final EstatisticasService servico;
  final PeriodoEstatisticas? periodoInicial;
  final ValueChanged<PeriodoEstatisticas> aoMudarPeriodo;
  final VoidCallback aoVoltar;
  final VoidCallback aoIrParaEstante;
  final Listenable? alteracoesDeLeitura;
  final Duration atrasoDaRecarga;
  final DateTime Function() hoje;

  const EstatisticasPage({
    super.key,
    required this.servico,
    this.periodoInicial,
    required this.aoMudarPeriodo,
    required this.aoVoltar,
    required this.aoIrParaEstante,
    this.alteracoesDeLeitura,
    this.atrasoDaRecarga = const Duration(seconds: 3),
    this.hoje = hojeEmSaoPaulo,
  });

  @override
  State<EstatisticasPage> createState() => _EstatisticasPageState();
}

enum _Carga { carregando, pronta, erro }

class _EstatisticasPageState extends State<EstatisticasPage> {
  late final DateTime _hoje = widget.hoje();
  late PeriodoEstatisticas _periodo = widget.periodoInicial ?? PeriodoAno(_hoje.year);
  _Carga _carga = _Carga.carregando;
  Estatisticas? _estatisticas;
  GraficosEstatisticas? _graficos;
  List<AnoComRegistro>? _anos;
  DateTime? _primeiroRegistro;
  int _pedido = 0;
  bool _trocouPeriodo = false;
  Timer? _agendada;
  late final RecargaEmSequencia _recarga = RecargaEmSequencia(() => _carregar(silencioso: true));

  @override
  void initState() {
    super.initState();
    widget.alteracoesDeLeitura?.addListener(_aoRegistrarLeitura);
    _carregar();
  }

  @override
  void didUpdateWidget(EstatisticasPage antigo) {
    super.didUpdateWidget(antigo);
    if (antigo.alteracoesDeLeitura != widget.alteracoesDeLeitura) {
      antigo.alteracoesDeLeitura?.removeListener(_aoRegistrarLeitura);
      widget.alteracoesDeLeitura?.addListener(_aoRegistrarLeitura);
    }
    final periodo = widget.periodoInicial;
    if (periodo != null && periodo != antigo.periodoInicial && periodo != _periodo) {
      _periodo = periodo;
      _carregar();
    }
  }

  @override
  void dispose() {
    _agendada?.cancel();
    widget.alteracoesDeLeitura?.removeListener(_aoRegistrarLeitura);
    super.dispose();
  }

  /// Vários registros seguidos (fila offline) viram uma recarga só, depois do último.
  void _aoRegistrarLeitura() {
    _agendada?.cancel();
    _agendada = Timer(widget.atrasoDaRecarga, () {
      if (mounted) {
        unawaited(_recarga.pedir());
      }
    });
  }

  Future<void> _carregar({bool silencioso = false}) async {
    final pedido = ++_pedido;
    final periodo = _periodo;
    if (!silencioso || _carga != _Carga.pronta) {
      setState(() => _carga = _Carga.carregando);
    }
    try {
      final (estatisticas, graficos) = await (
        widget.servico.consultar(periodo),
        widget.servico.graficos(periodo),
      ).wait;
      if (!mounted || pedido != _pedido) {
        return;
      }
      setState(() {
        _estatisticas = estatisticas;
        _graficos = graficos;
        _anos = estatisticas.anos;
        _primeiroRegistro = estatisticas.primeiroRegistro;
        _carga = _Carga.pronta;
      });
      if (_trocouPeriodo) {
        _trocouPeriodo = false;
        // A troca muda todos os números de uma vez: o TalkBack ouve o novo intervalo (§9).
        unawaited(
          SemanticsService.sendAnnouncement(
            View.of(context),
            anuncioDoPeriodo(periodo, linhaDoPeriodo(periodo, _hoje, _primeiroRegistro)),
            TextDirection.ltr,
          ),
        );
      }
    } on ParallelWaitError<dynamic, dynamic> {
      _falhar(pedido, silencioso: silencioso);
    } on ApiException {
      _falhar(pedido, silencioso: silencioso);
    }
  }

  void _falhar(int pedido, {required bool silencioso}) {
    // Recarga silenciosa que falha mantém o que já estava na tela.
    if (mounted && pedido == _pedido && !(silencioso && _carga == _Carga.pronta)) {
      setState(() => _carga = _Carga.erro);
    }
  }

  void _escolher(PeriodoEstatisticas periodo) {
    if (periodo == _periodo) {
      return;
    }
    _periodo = periodo;
    _trocouPeriodo = true;
    widget.aoMudarPeriodo(periodo);
    _carregar();
  }

  /// Leitor sem nenhum registro de leitura: o painel vira o vazio (4.7), sem faixa de períodos.
  bool get _vazio => _carga == _Carga.pronta && (_estatisticas?.semRegistro ?? false);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: <Widget>[
        CabecalhoTela(
          titulo: TextosDasEstatisticas.titulo,
          aoVoltar: widget.aoVoltar,
          semDivisor: true,
        ),
        Expanded(child: _vazio ? _construirVazio() : _construirPainel(theme)),
      ],
    );
  }

  Widget _construirVazio() {
    return LayoutBuilder(
      builder: (context, restricoes) => SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: restricoes.maxHeight),
          child: Center(
            child: EstadoVazio(
              icone: PhosphorIconsRegular.chartBar,
              solto: true,
              titulo: TextosDasEstatisticas.vazioTitulo,
              texto: TextosDasEstatisticas.vazioTexto,
              rodape: BotaoPrimario(
                texto: TextosDasEstatisticas.vazioAcao,
                onPressed: widget.aoIrParaEstante,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _construirPainel(ThemeData theme) {
    final itens = itensDoSeletor(_anos ?? const <AnoComRegistro>[], _hoje.year, _periodo);
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    return ListView(
      padding: const EdgeInsets.only(bottom: DesignTokens.space8),
      children: <Widget>[
        // Faixa de períodos (4.1): pills roláveis, sem seta, fade nem indicador.
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(
            DesignTokens.space5,
            DesignTokens.space4,
            DesignTokens.space5,
            0,
          ),
          child: Row(
            children: <Widget>[
              for (var i = 0; i < itens.length; i++) ...<Widget>[
                if (i > 0) const SizedBox(width: DesignTokens.space2),
                PillDeFiltro(
                  rotulo: rotuloDoPeriodo(itens[i].periodo),
                  ativo: itens[i].periodo == _periodo,
                  rotuloNumerico: itens[i].periodo is PeriodoAno,
                  aoTocar: () => _escolher(itens[i].periodo),
                ),
              ],
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
          child: switch (_carga) {
            _Carga.carregando => const EntradaSuave(child: SkeletonDoPainel()),
            _Carga.erro => Padding(
              padding: const EdgeInsets.only(top: DesignTokens.space4),
              child: BannerAviso(
                variante: VarianteAviso.erro,
                triangulo: true,
                mensagem: TextosDasEstatisticas.erro,
                acao: BotaoTextual(texto: TextosDasEstatisticas.tentarDeNovo, onPressed: _carregar),
              ),
            ),
            _Carga.pronta => _construirConteudo(theme, legenda),
          },
        ),
      ],
    );
  }

  Widget _construirConteudo(ThemeData theme, TextStyle? legenda) {
    final estatisticas = _estatisticas!;
    final pontos = _graficos!.pontos;
    final totais = estatisticas.totais;
    final periodo = _periodo;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        const SizedBox(height: DesignTokens.space3),
        // Nós próprios no TalkBack: sem `container`, a linha e a ajuda se fundem com o vizinho.
        Semantics(
          container: true,
          child: Text(
            linhaDoPeriodo(periodo, _hoje, estatisticas.primeiroRegistro),
            style: legenda,
          ),
        ),
        const SizedBox(height: DesignTokens.space6),
        Semantics(
          header: true,
          child: Text(TextosDasEstatisticas.totais, style: theme.textTheme.headlineSmall),
        ),
        const SizedBox(height: DesignTokens.space3),
        ContainerDeLinhas(
          linhas: <Widget>[
            MetricaTotal(
              rotulo: TextosDasEstatisticas.livrosConcluidos,
              partes: <ParteDoTempo>[
                (
                  numero: formatarMilhar(totais.livrosConcluidos),
                  unidade: totais.livrosConcluidos == 1 ? 'livro' : 'livros',
                ),
              ],
              leitura:
                  '${TextosDasEstatisticas.livrosConcluidos}: ${rotuloLivros(totais.livrosConcluidos)}',
            ),
            MetricaTotal(
              rotulo: TextosDasEstatisticas.paginasLidas,
              partes: <ParteDoTempo>[
                (
                  numero: formatarMilhar(totais.paginasLidas),
                  unidade: totais.paginasLidas == 1 ? 'página' : 'páginas',
                ),
              ],
              leitura:
                  '${TextosDasEstatisticas.paginasLidas}: ${rotuloPaginas(totais.paginasLidas)}',
            ),
            MetricaTotal(
              rotulo: TextosDasEstatisticas.tempoDeLeitura,
              partes: partesDoTempo(totais.minutosLidos),
              leitura:
                  '${TextosDasEstatisticas.tempoDeLeitura}: ${rotuloDoTempo(totais.minutosLidos)}',
            ),
          ],
        ),
        const SizedBox(height: DesignTokens.space3),
        Semantics(
          container: true,
          child: Text(TextosDasEstatisticas.ajudaDosTotais, style: legenda),
        ),
        const SizedBox(height: DesignTokens.space6),
        Semantics(
          header: true,
          child: Text(TextosDasEstatisticas.medias, style: theme.textTheme.headlineSmall),
        ),
        const SizedBox(height: DesignTokens.space3),
        ContainerDeLinhas(
          linhas: <Widget>[
            MetricaMedia(
              rotulo: TextosDasEstatisticas.paginasPorDia,
              ajuda: TextosDasEstatisticas.ajudaPaginasPorDia,
              valor: _talVez(estatisticas.paginasPorDia.valor, formatarDecimal),
              unidade: TextosDasEstatisticas.unidadePaginasPorDia,
              ausente: MediaAusente.paginasPorDia(periodo),
            ),
            MetricaMedia(
              rotulo: TextosDasEstatisticas.diasPorLivro,
              ajuda: TextosDasEstatisticas.ajudaDiasPorLivro,
              valor: _talVez(estatisticas.diasPorLivro.valor, formatarDecimal),
              unidade: TextosDasEstatisticas.unidadeDiasPorLivro,
              ausente: MediaAusente.diasPorLivro(periodo),
            ),
            MetricaMedia(
              rotulo: TextosDasEstatisticas.notaMedia,
              ajuda: ajudaDaNota(periodo, estatisticas.notaMedia.quantidade),
              valor: _talVez(estatisticas.notaMedia.valor, formatarNotaMedia),
              unidade: TextosDasEstatisticas.unidadeNotaMedia,
              ausente: MediaAusente.notaMedia(periodo),
            ),
          ],
        ),
        const SizedBox(height: DesignTokens.space6),
        GraficoDeColunas(medida: Medida.paginas, pontos: pontos, periodo: periodo, hoje: _hoje),
        const SizedBox(height: DesignTokens.space4),
        GraficoDeColunas(medida: Medida.livros, pontos: pontos, periodo: periodo, hoje: _hoje),
        const SizedBox(height: DesignTokens.space6),
        Text(TextosDasEstatisticas.rodape, style: legenda, textAlign: TextAlign.center),
      ],
    );
  }

  static String? _talVez(double? valor, String Function(double) formatar) =>
      valor == null ? null : formatar(valor);
}
