import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/entrada_suave.dart';
import '../../design/widgets/estado_vazio.dart';
import 'desafios_service.dart';
import 'historico_do_desafio.dart';
import 'textos.dart';
import 'textos_do_historico.dart';
import 'widgets_de_desafios.dart';

const double _distanciaParaCarregarMais = 300;

/// Histórico do desafio (docs/design/periodo-3/F-DSF-OPC/historico-do-desafio.md, RF-DSF-05):
/// as janelas encerradas, da mais recente para a mais antiga, cada uma com a meta de quando valeu,
/// agrupadas pelo período maior com o cabeçalho preso ao topo. Somente leitura: as linhas não são
/// tocáveis e o header não tem ações.
///
/// O [desafio] vem do card que abriu a tela (o contrato não tem `GET /desafios/{id}`): dá o
/// título, a pausa em curso, a data de criação do rodapé e a janela corrente do vazio. O resultado
/// de uma janela encerrada pode mudar com a sincronização tardia (RN-20.10); a tela mostra o atual
/// a cada abertura, sem marcar a mudança.
class HistoricoDoDesafioPage extends StatefulWidget {
  final DesafiosService servico;
  final Desafio desafio;
  final VoidCallback? aoVoltar;

  const HistoricoDoDesafioPage({
    super.key,
    required this.servico,
    required this.desafio,
    this.aoVoltar,
  });

  @override
  State<HistoricoDoDesafioPage> createState() => _HistoricoDoDesafioPageState();
}

class _HistoricoDoDesafioPageState extends State<HistoricoDoDesafioPage> {
  final ScrollController _rolagem = ScrollController();
  late final HistoricoDoDesafio _historico = HistoricoDoDesafio(
    (pagina) => widget.servico.listarJanelas(widget.desafio.id, pagina: pagina),
  );
  Timer? _relogio;
  bool _demorando = false;

  @override
  void initState() {
    super.initState();
    _historico.addListener(_aoMudar);
    unawaited(_historico.carregar());
  }

  @override
  void dispose() {
    _relogio?.cancel();
    _historico
      ..removeListener(_aoMudar)
      ..dispose();
    _rolagem.dispose();
    super.dispose();
  }

  /// Passados três segundos na primeira carga, avisa que o serviço pode estar acordando
  /// (RNF-ERR-09). Depois de cada página, se a lista ainda não enche a tela, pede a seguinte:
  /// sem rolagem, ninguém chegaria perto do fim.
  void _aoMudar() {
    final esperando = _historico.carregando && _historico.janelas.isEmpty;
    if (esperando && _relogio == null) {
      _relogio = Timer(const Duration(seconds: 3), () {
        if (mounted) {
          setState(() => _demorando = true);
        }
      });
    } else if (!esperando && _relogio != null) {
      _relogio?.cancel();
      _relogio = null;
      _demorando = false;
    }
    setState(() {});
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted &&
          _rolagem.hasClients &&
          _rolagem.position.maxScrollExtent == 0 &&
          _historico.falhaAoCarregarMais == null) {
        unawaited(_carregarMais());
      }
    });
  }

  bool _pertoDoFim(ScrollNotification notificacao) {
    if (notificacao.metrics.axis == Axis.vertical &&
        notificacao.metrics.extentAfter < _distanciaParaCarregarMais &&
        _historico.falhaAoCarregarMais == null) {
      unawaited(_carregarMais());
    }
    return false;
  }

  /// O carregar mais é anunciado de forma educada, sem mover o foco (prompt §9).
  Future<void> _carregarMais() async {
    final trouxe = await _historico.carregarMais();
    if (trouxe && mounted) {
      unawaited(
        SemanticsService.sendAnnouncement(
          View.of(context),
          textoMaisJanelasCarregadas,
          Directionality.of(context),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final desafio = widget.desafio;
    return Column(
      children: <Widget>[
        CabecalhoTela(
          titulo: tituloDe(desafio),
          conteudoDoTitulo: TituloDoDesafio(desafio: desafio, estilo: theme.textTheme.titleLarge),
          subtitulo: subtituloDoHistorico(desafio),
          aoVoltar: widget.aoVoltar,
          semDivisor: true,
        ),
        Expanded(child: _corpo(theme)),
      ],
    );
  }

  Widget _corpo(ThemeData theme) {
    final historico = _historico;
    if (historico.carregando && historico.janelas.isEmpty) {
      return _carregando(theme);
    }
    final falha = historico.falha;
    if (falha != null) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(
          DesignTokens.space5,
          DesignTokens.space4,
          DesignTokens.space5,
          DesignTokens.space8,
        ),
        children: <Widget>[_bannerDeFalha(falha)],
      );
    }
    if (historico.janelas.isEmpty) {
      return _vazio();
    }
    return NotificationListener<ScrollNotification>(
      onNotification: _pertoDoFim,
      child: CustomScrollView(
        controller: _rolagem,
        slivers: <Widget>[
          for (final grupo in agruparHistorico(historico.janelas))
            SliverMainAxisGroup(
              slivers: <Widget>[
                if (grupo.titulo != null)
                  PinnedHeaderSliver(child: _CabecalhoDeGrupo(titulo: grupo.titulo!)),
                SliverList.list(children: _itensDoGrupo(grupo)),
              ],
            ),
          SliverToBoxAdapter(child: _fimDaLista(theme)),
        ],
      ),
    );
  }

  List<Widget> _itensDoGrupo(GrupoDoHistorico grupo) {
    final itens = <Widget>[];
    ItemDoHistorico? anterior;
    for (final item in grupo.itens) {
      switch (item) {
        case LinhaDeJanela(:final janela):
          itens.add(
            _LinhaDaJanela(
              key: ValueKey<String>('janela-${janela.chave}'),
              janela: janela,
              divisorAcima: anterior is LinhaDeJanela,
            ),
          );
        case MarcaDeMudanca(:final mudancas):
          itens.add(_MarcaDeMudanca(mudancas: mudancas));
      }
      anterior = item;
    }
    return itens;
  }

  Widget _fimDaLista(ThemeData theme) {
    final historico = _historico;
    if (historico.carregandoMais) {
      return const EntradaSuave(
        child: Column(
          children: <Widget>[
            _EsqueletoDaLinha(divisorAcima: true),
            _EsqueletoDaLinha(divisorAcima: true),
          ],
        ),
      );
    }
    final falha = historico.falhaAoCarregarMais;
    if (falha != null) {
      return _FalhaAoCarregarMais(falha: falha, aoTentarDeNovo: () => unawaited(_carregarMais()));
    }
    if (!historico.chegouAoFim) {
      return const SizedBox(height: DesignTokens.space8);
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        DesignTokens.space6,
        DesignTokens.space5,
        DesignTokens.space8,
      ),
      child: Text.rich(
        _comNumeros(
          rodapeDeCriacao(widget.desafio.criadoEm, historico.janelas.last.periodicidade),
          theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
          theme,
        ),
        textAlign: TextAlign.center,
      ),
    );
  }

  Widget _carregando(ThemeData theme) {
    return ListView(
      padding: const EdgeInsets.only(bottom: DesignTokens.space8),
      children: <Widget>[
        EntradaSuave(
          child: Column(
            children: <Widget>[
              const _EsqueletoDoCabecalho(),
              for (var i = 0; i < 4; i++) _EsqueletoDaLinha(divisorAcima: i > 0),
            ],
          ),
        ),
        if (_demorando)
          Padding(
            padding: const EdgeInsets.all(DesignTokens.space5),
            child: Semantics(
              liveRegion: true,
              child: Text(
                textoDeServicoIniciando,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
              ),
            ),
          ),
      ],
    );
  }

  Widget _vazio() {
    return LayoutBuilder(
      builder: (context, limites) => SingleChildScrollView(
        padding: const EdgeInsets.symmetric(
          horizontal: DesignTokens.space5,
          vertical: DesignTokens.space10,
        ),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: limites.maxHeight - 2 * DesignTokens.space10),
          child: Center(
            child: EstadoVazio(
              icone: PhosphorIconsRegular.clockCounterClockwise,
              solto: true,
              titulo: tituloSemJanelaEncerrada(widget.desafio.janela),
              texto: textoSemJanelaEncerrada(widget.desafio),
            ),
          ),
        ),
      ),
    );
  }

  Widget _bannerDeFalha(FalhaDoHistorico falha) {
    final tentar = BotaoTextual(texto: 'Tentar de novo', onPressed: _historico.carregar);
    return switch (falha) {
      FalhaDoHistorico.semConexao => BannerAviso(
        variante: VarianteAviso.alerta,
        icone: PhosphorIconsRegular.wifiSlash,
        iconeNaCorDaVariante: true,
        mensagem: textoSemConexaoNoHistorico,
        acao: tentar,
      ),
      FalhaDoHistorico.servidor => BannerAviso(
        variante: VarianteAviso.erro,
        triangulo: true,
        mensagem: textoDoErroDoHistorico,
        acao: tentar,
      ),
    };
  }
}

/// `14 a 20 de setembro` com os números em JetBrains Mono, no tamanho e no peso do texto em volta.
TextSpan _comNumeros(String texto, TextStyle? base, ThemeData theme) {
  final numero = theme.numInline.copyWith(
    fontSize: base?.fontSize,
    fontWeight: base?.fontWeight,
    color: base?.color,
    height: base?.height,
  );
  final partes = <InlineSpan>[];
  texto.splitMapJoin(
    RegExp(r'\d+'),
    onMatch: (achado) {
      partes.add(TextSpan(text: achado[0], style: numero));
      return '';
    },
    onNonMatch: (resto) {
      if (resto.isNotEmpty) {
        partes.add(TextSpan(text: resto));
      }
      return '';
    },
  );
  return TextSpan(style: base, children: partes);
}

/// `Setembro de 2026` em `title-sm`, preso ao topo enquanto as linhas do grupo passam por baixo;
/// o grupo seguinte o empurra (`SliverMainAxisGroup`).
class _CabecalhoDeGrupo extends StatelessWidget {
  final String titulo;

  const _CabecalhoDeGrupo({required this.titulo});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ColoredBox(
      color: theme.pageBackground,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          DesignTokens.space5,
          DesignTokens.space6,
          DesignTokens.space5,
          DesignTokens.space2,
        ),
        child: Semantics(header: true, child: Text(titulo, style: theme.textTheme.titleMedium)),
      ),
    );
  }
}

/// Linha de janela encerrada (prompt §4, "Linha de janela"): nome e resultado, a barra sobre a
/// meta da própria janela, a fração com unidade e, se houve, a pausa. Lida como uma frase só.
class _LinhaDaJanela extends StatelessWidget {
  final JanelaEncerrada janela;
  final bool divisorAcima;

  const _LinhaDaJanela({super.key, required this.janela, required this.divisorAcima});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    final pausa = textoDaPausaDaJanela(janela);
    final corDoResultado = janela.cumprida ? theme.colorScheme.onSurface : theme.secondaryText;
    return Semantics(
      container: true,
      label: semanticaDaJanela(janela),
      excludeSemantics: true,
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: divisorAcima ? Border(top: BorderSide(color: theme.divider)) : null,
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: DesignTokens.space5,
            vertical: DesignTokens.space4,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              // Com fonte grande, o resultado desce para baixo do nome, alinhado à esquerda.
              SizedBox(
                width: double.infinity,
                child: Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: DesignTokens.space3,
                  runSpacing: DesignTokens.space1,
                  children: <Widget>[
                    Text.rich(
                      _comNumeros(nomeDaJanelaEncerrada(janela), theme.textTheme.labelLarge, theme),
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        Icon(
                          janela.cumprida
                              ? PhosphorIconsFill.checkCircle
                              : PhosphorIconsRegular.circle,
                          size: 20,
                          color: janela.cumprida ? theme.progressColor : theme.secondaryText,
                        ),
                        const SizedBox(width: DesignTokens.space1),
                        // `caption` peso 600: parte do `body-strong`, porque o `copyWith` de
                        // peso sobre a legenda manteria a família do Manrope regular.
                        Text(
                          textoDoResultado(janela),
                          style: theme.textTheme.labelLarge?.copyWith(
                            fontSize: legenda?.fontSize,
                            height: legenda?.height,
                            letterSpacing: legenda?.letterSpacing,
                            color: corDoResultado,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: DesignTokens.space2),
              BarraDeProgressoDeDesafio(acumulado: janela.acumulado, alvo: janela.valorAlvo),
              const SizedBox(height: DesignTokens.space2),
              Text.rich(
                TextSpan(
                  style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                  children: <InlineSpan>[
                    TextSpan(text: '${janela.acumulado}', style: theme.numInline),
                    const TextSpan(text: ' de '),
                    TextSpan(text: '${janela.valorAlvo}', style: theme.numInline),
                    TextSpan(text: ' ${nomeDaUnidade(janela.unidade, janela.valorAlvo)}'),
                  ],
                ),
              ),
              if (pausa != null) ...<Widget>[
                const SizedBox(height: DesignTokens.space2),
                Row(
                  children: <Widget>[
                    Icon(PhosphorIconsRegular.pauseCircle, size: 16, color: theme.secondaryText),
                    const SizedBox(width: DesignTokens.space1),
                    Flexible(child: Text(pausa, style: legenda)),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Marca de mudança de configuração entre duas janelas vizinhas, no lugar do divisor, com uma
/// linha por mudança. Sem tom de alerta: editar o desafio não é problema.
class _MarcaDeMudanca extends StatelessWidget {
  final List<String> mudancas;

  const _MarcaDeMudanca({required this.mudancas});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    final borda = BorderSide(color: theme.divider);
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(top: borda, bottom: borda),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: DesignTokens.space5,
          vertical: DesignTokens.space3,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            for (final (indice, mudanca) in mudancas.indexed) ...<Widget>[
              if (indice > 0) const SizedBox(height: DesignTokens.space1),
              Row(
                children: <Widget>[
                  ExcludeSemantics(
                    child: Icon(
                      PhosphorIconsRegular.pencilSimple,
                      size: 16,
                      color: theme.secondaryText,
                    ),
                  ),
                  const SizedBox(width: DesignTokens.space2),
                  Expanded(child: Text.rich(_comNumeros(mudanca, legenda, theme))),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Fim da lista quando a página seguinte não veio: a linha fica onde o problema está, sem banner
/// no topo e sem toast, e o leitor de tela a anuncia.
class _FalhaAoCarregarMais extends StatelessWidget {
  final FalhaDoHistorico falha;
  final VoidCallback aoTentarDeNovo;

  const _FalhaAoCarregarMais({required this.falha, required this.aoTentarDeNovo});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final semConexao = falha == FalhaDoHistorico.semConexao;
    return Semantics(
      liveRegion: true,
      child: Container(
        constraints: const BoxConstraints(minHeight: 56),
        padding: const EdgeInsets.symmetric(
          horizontal: DesignTokens.space5,
          vertical: DesignTokens.space1,
        ),
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: theme.divider)),
        ),
        child: Row(
          children: <Widget>[
            Icon(
              semConexao ? PhosphorIconsRegular.wifiSlash : PhosphorIconsRegular.warning,
              size: 16,
              color: theme.secondaryText,
            ),
            const SizedBox(width: DesignTokens.space2),
            Expanded(
              child: Text(
                semConexao ? textoSemConexaoAoCarregarMais : textoDoErroAoCarregarMais,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
              ),
            ),
            const SizedBox(width: DesignTokens.space2),
            BotaoTextual(texto: 'Tentar de novo', onPressed: aoTentarDeNovo),
          ],
        ),
      ),
    );
  }
}

Widget _barraDeEsqueleto(ThemeData theme, double altura, double fracao, {bool pill = false}) {
  return FractionallySizedBox(
    widthFactor: fracao,
    alignment: Alignment.centerLeft,
    child: Container(
      height: altura,
      decoration: BoxDecoration(
        color: theme.divider,
        borderRadius: BorderRadius.circular(pill ? DesignTokens.radiusFull : DesignTokens.radiusSm),
      ),
    ),
  );
}

class _EsqueletoDoCabecalho extends StatelessWidget {
  const _EsqueletoDoCabecalho();

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          DesignTokens.space5,
          DesignTokens.space6,
          DesignTokens.space5,
          DesignTokens.space2,
        ),
        child: _barraDeEsqueleto(Theme.of(context), 17, 0.4),
      ),
    );
  }
}

/// A forma da linha de janela: nome e resultado, barra e números (prompt §4.3).
class _EsqueletoDaLinha extends StatelessWidget {
  final bool divisorAcima;

  const _EsqueletoDaLinha({required this.divisorAcima});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ExcludeSemantics(
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: divisorAcima ? Border(top: BorderSide(color: theme.divider)) : null,
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: DesignTokens.space5,
            vertical: DesignTokens.space4,
          ),
          child: Column(
            children: <Widget>[
              LayoutBuilder(
                builder: (context, limites) => Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: <Widget>[
                    SizedBox(
                      width: limites.maxWidth * 0.45,
                      child: _barraDeEsqueleto(theme, 15, 1),
                    ),
                    SizedBox(width: limites.maxWidth * 0.2, child: _barraDeEsqueleto(theme, 13, 1)),
                  ],
                ),
              ),
              const SizedBox(height: DesignTokens.space2),
              _barraDeEsqueleto(theme, 6, 1, pill: true),
              const SizedBox(height: DesignTokens.space2),
              _barraDeEsqueleto(theme, 15, 0.35),
            ],
          ),
        ),
      ),
    );
  }
}
