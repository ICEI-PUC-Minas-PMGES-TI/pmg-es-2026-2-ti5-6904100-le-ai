import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/cartao_progresso.dart';
import '../../design/widgets/estado_vazio.dart';
import '../../design/widgets/pill_de_filtro.dart';
import '../descobrir/widgets_da_busca.dart';
import '../estante/estante_service.dart';
import '../perfil/widgets_de_perfil.dart';
import 'lista_do_historico.dart';
import 'textos.dart';

const double _distanciaParaCarregarMais = 300;
const double _larguraDaCapaDaLinha = 48;
const double _alturaDaCapaDaLinha = 72;
const double _larguraDaCapaDoLivro = 60;
const double _alturaDaCapaDoLivro = 90;
const int _linhasDoEsqueleto = 5;

class HistoricoPage extends StatefulWidget {
  final EstanteService servico;
  final VoidCallback aoVoltar;
  final VoidCallback aoVerEstante;
  final ValueChanged<String> aoAbrirOcorrencia;

  const HistoricoPage({
    super.key,
    required this.servico,
    required this.aoVoltar,
    required this.aoVerEstante,
    required this.aoAbrirOcorrencia,
  });

  @override
  State<HistoricoPage> createState() => _HistoricoPageState();
}

class _HistoricoPageState extends State<HistoricoPage> {
  final TextEditingController _campo = TextEditingController();
  int? _ano;
  String? _busca;

  late final ListaDoHistorico _lista = ListaDoHistorico(
    (pagina) => widget.servico.listarHistorico(ano: _ano, busca: _busca, pagina: pagina),
  );

  @override
  void initState() {
    super.initState();
    _lista
      ..addListener(_aoMudar)
      ..carregar();
  }

  @override
  void dispose() {
    _lista
      ..removeListener(_aoMudar)
      ..dispose();
    _campo.dispose();
    super.dispose();
  }

  void _aoMudar() => setState(() {});

  void _pesquisar(String texto) {
    final aparado = texto.trim();
    final busca = aparado.isEmpty ? null : aparado;
    if (busca == _busca) {
      return;
    }
    setState(() => _busca = busca);
    _lista.carregar();
  }

  void _limpar() {
    _campo.clear();
    _pesquisar('');
  }

  void _escolherAno(int? ano) {
    if (ano == _ano) {
      return;
    }
    setState(() => _ano = ano);
    _lista.carregar();
  }

  bool _pertoDoFim(ScrollNotification notificacao) {
    if (notificacao.metrics.axis == Axis.vertical &&
        notificacao.metrics.extentAfter < _distanciaParaCarregarMais) {
      _lista.carregarMais();
    }
    return false;
  }

  bool get _semNada =>
      !_lista.carregando && !_lista.falhou && _lista.anos.isEmpty && _busca == null && _ano == null;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: <Widget>[
        CabecalhoTela(titulo: TextosDoHistorico.titulo, aoVoltar: widget.aoVoltar),
        Expanded(
          child: NotificationListener<ScrollNotification>(
            onNotification: _pertoDoFim,
            child: ListView(
              padding: const EdgeInsets.only(bottom: DesignTokens.space10),
              children: _semNada
                  ? <Widget>[_vazio()]
                  : <Widget>[_pesquisa(theme), _faixaDeAnos(), ..._corpo(theme)],
            ),
          ),
        ),
      ],
    );
  }

  Widget _vazio() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        DesignTokens.space10,
        DesignTokens.space5,
        0,
      ),
      child: EstadoVazio(
        icone: PhosphorIconsRegular.clockCounterClockwise,
        solto: true,
        titulo: TextosDoHistorico.vazioTitulo,
        texto: TextosDoHistorico.vazioTexto,
        rodape: Padding(
          padding: const EdgeInsets.only(top: DesignTokens.space6),
          child: BotaoPrimario(texto: TextosDoHistorico.vazioBotao, onPressed: widget.aoVerEstante),
        ),
      ),
    );
  }

  Widget _pesquisa(ThemeData theme) {
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        DesignTokens.space4,
        DesignTokens.space5,
        0,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(TextosDoHistorico.rotuloPesquisa, style: theme.textTheme.labelMedium),
          const SizedBox(height: DesignTokens.space2),
          CampoDeBuscaDeLivros(
            key: const ValueKey<String>('pesquisa-historico'),
            controlador: _campo,
            aoConfirmar: _pesquisar,
            aoLimpar: _limpar,
            dica: TextosDoHistorico.placeholder,
          ),
          const SizedBox(height: DesignTokens.space2),
          Text(TextosDoHistorico.ajudaPesquisa, style: legenda),
        ],
      ),
    );
  }

  Widget _faixaDeAnos() {
    final opcoes = <(int?, String)>[
      (null, TextosDoHistorico.todosOsAnos),
      for (final ano in _lista.anos.keys) (ano, '$ano'),
    ];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        DesignTokens.space4,
        DesignTokens.space5,
        0,
      ),
      child: Row(
        children: <Widget>[
          for (final (ano, rotulo) in opcoes) ...<Widget>[
            if (ano != null) const SizedBox(width: DesignTokens.space2),
            PillDeFiltro(
              rotulo: rotulo,
              rotuloNumerico: ano != null,
              ativo: ano == _ano,
              aoTocar: () => _escolherAno(ano),
            ),
          ],
        ],
      ),
    );
  }

  List<Widget> _corpo(ThemeData theme) {
    const margem = EdgeInsets.symmetric(horizontal: DesignTokens.space5);
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    if (_lista.carregando) {
      return const <Widget>[_Esqueleto()];
    }
    if (_lista.falhou) {
      return <Widget>[
        Padding(
          padding: const EdgeInsets.all(DesignTokens.space5),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const BannerAviso(
                variante: VarianteAviso.erro,
                mensagem: TextosDoHistorico.erroTexto,
              ),
              BotaoTextual(texto: TextosDoHistorico.erroBotao, onPressed: _lista.carregar),
            ],
          ),
        ),
      ];
    }
    final contagem = Padding(
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        DesignTokens.space3,
        DesignTokens.space5,
        0,
      ),
      child: Semantics(
        liveRegion: true,
        child: Text(
          textoContagemDoHistorico(
            livros: _lista.livros,
            leituras: _lista.leituras,
            ano: _ano,
            busca: _busca,
          ),
          style: legenda,
        ),
      ),
    );
    if (_lista.itens.isEmpty) {
      final ano = _ano;
      return <Widget>[
        contagem,
        Padding(
          padding: const EdgeInsets.fromLTRB(
            DesignTokens.space5,
            DesignTokens.space8,
            DesignTokens.space5,
            0,
          ),
          child: EstadoVazio(
            icone: PhosphorIconsRegular.magnifyingGlass,
            solto: true,
            titulo: TextosDoHistorico.semResultadoTitulo,
            texto: ano == null
                ? TextosDoHistorico.semResultadoTexto
                : TextosDoHistorico.semResultadoNoAno(ano),
            rodape: BotaoTextual(
              texto: ano == null
                  ? TextosDoHistorico.limparPesquisa
                  : TextosDoHistorico.pesquisarEmTodosOsAnos,
              onPressed: ano == null ? _limpar : () => _escolherAno(null),
            ),
          ),
        ),
      ];
    }
    return <Widget>[
      contagem,
      if (_busca == null) ..._porAno(theme) else ..._porLivro(theme),
      Padding(
        padding: margem,
        child: FimDaLista(
          temMais: _lista.temMais,
          carregandoMais: _lista.carregandoMais,
          falhou: _lista.falhouMais,
          aoCarregar: _lista.carregarMais,
        ),
      ),
    ];
  }

  List<Widget> _porAno(ThemeData theme) {
    final grupos = <int, List<OcorrenciaHistorico>>{};
    for (final ocorrencia in _lista.itens) {
      grupos.putIfAbsent(ocorrencia.ano, () => <OcorrenciaHistorico>[]).add(ocorrencia);
    }
    return <Widget>[
      for (final MapEntry(key: ano, value: ocorrencias) in grupos.entries) ...<Widget>[
        Padding(
          padding: const EdgeInsets.fromLTRB(
            DesignTokens.space5,
            DesignTokens.space6,
            DesignTokens.space5,
            DesignTokens.space3,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: <Widget>[
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text('$ano', style: theme.textTheme.titleLarge),
                ),
              ),
              Text(
                textoLeiturasConcluidas(_lista.anos[ano] ?? ocorrencias.length),
                style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
              ),
            ],
          ),
        ),
        for (final (indice, ocorrencia) in ocorrencias.indexed) ...<Widget>[
          if (indice > 0) Divider(height: 1, indent: DesignTokens.space5, color: theme.divider),
          _LinhaDaOcorrencia(
            ocorrencia: ocorrencia,
            aoAbrir: () => widget.aoAbrirOcorrencia(ocorrencia.leituraId),
          ),
        ],
      ],
    ];
  }

  List<Widget> _porLivro(ThemeData theme) {
    final grupos = <String, List<OcorrenciaHistorico>>{};
    for (final ocorrencia in _lista.itens) {
      grupos.putIfAbsent(ocorrencia.livro.id, () => <OcorrenciaHistorico>[]).add(ocorrencia);
    }
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    return <Widget>[
      for (final ocorrencias in grupos.values) ...<Widget>[
        Padding(
          padding: const EdgeInsets.fromLTRB(
            DesignTokens.space5,
            DesignTokens.space6,
            DesignTokens.space5,
            0,
          ),
          child: Row(
            children: <Widget>[
              CapaLivro(
                url: ocorrencias.first.livro.livro.capaUrl,
                largura: _larguraDaCapaDoLivro,
                altura: _alturaDaCapaDoLivro,
              ),
              const SizedBox(width: DesignTokens.space4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Semantics(
                      header: true,
                      child: Text(
                        ocorrencias.first.livro.livro.titulo,
                        style: theme.textTheme.titleSmall,
                      ),
                    ),
                    if (ocorrencias.first.livro.livro.autor != null)
                      Text(ocorrencias.first.livro.livro.autor!, style: legenda),
                    Text(textoLeiturasConcluidas(ocorrencias.length), style: legenda),
                  ],
                ),
              ),
            ],
          ),
        ),
        for (final (indice, ocorrencia) in ocorrencias.indexed) ...<Widget>[
          if (indice > 0)
            Divider(
              height: 1,
              indent: DesignTokens.space5 + _larguraDaCapaDoLivro + DesignTokens.space4,
              color: theme.divider,
            ),
          _LinhaDaConclusao(
            ocorrencia: ocorrencia,
            aoAbrir: () => widget.aoAbrirOcorrencia(ocorrencia.leituraId),
          ),
        ],
      ],
    ];
  }
}

class _TipoDaOcorrencia extends StatelessWidget {
  final bool releitura;
  final bool sempre;

  const _TipoDaOcorrencia({required this.releitura, this.sempre = false});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (!releitura && !sempre) {
      return const SizedBox.shrink();
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        if (releitura) ...<Widget>[
          Icon(PhosphorIconsRegular.arrowsClockwise, size: 16, color: theme.progressColor),
          const SizedBox(width: DesignTokens.space1),
        ],
        Text(
          releitura ? TextosDoHistorico.releitura : TextosDoHistorico.leitura,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.secondaryText,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _LinhaDaOcorrencia extends StatelessWidget {
  final OcorrenciaHistorico ocorrencia;
  final VoidCallback aoAbrir;

  const _LinhaDaOcorrencia({required this.ocorrencia, required this.aoAbrir});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    final livro = ocorrencia.livro.livro;
    return Semantics(
      button: true,
      child: InkWell(
        onTap: aoAbrir,
        splashFactory: NoSplash.splashFactory,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: DesignTokens.space5,
            vertical: DesignTokens.space4,
          ),
          child: Row(
            children: <Widget>[
              CapaLivro(
                url: livro.capaUrl,
                largura: _larguraDaCapaDaLinha,
                altura: _alturaDaCapaDaLinha,
              ),
              const SizedBox(width: DesignTokens.space4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      livro.titulo,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall,
                    ),
                    if (livro.autor != null)
                      Text(
                        livro.autor!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: legenda,
                      ),
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: <Widget>[
                        if (ocorrencia.releitura) ...<Widget>[
                          _TipoDaOcorrencia(releitura: ocorrencia.releitura),
                          Text(' · ', style: legenda),
                        ],
                        Text(
                          textoConcluidoEm(ocorrencia.dataFim, ocorrencia.duracaoDias),
                          style: legenda,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(PhosphorIconsRegular.caretRight, size: 20, color: theme.secondaryText),
            ],
          ),
        ),
      ),
    );
  }
}

class _LinhaDaConclusao extends StatelessWidget {
  final OcorrenciaHistorico ocorrencia;
  final VoidCallback aoAbrir;

  const _LinhaDaConclusao({required this.ocorrencia, required this.aoAbrir});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      button: true,
      child: InkWell(
        onTap: aoAbrir,
        splashFactory: NoSplash.splashFactory,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            DesignTokens.space5 + _larguraDaCapaDoLivro + DesignTokens.space4,
            DesignTokens.space3,
            DesignTokens.space5,
            DesignTokens.space3,
          ),
          child: Row(
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    _TipoDaOcorrencia(releitura: ocorrencia.releitura, sempre: true),
                    Text(
                      textoConcluidoEm(ocorrencia.dataFim, ocorrencia.duracaoDias),
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                    ),
                  ],
                ),
              ),
              Icon(PhosphorIconsRegular.caretRight, size: 20, color: theme.secondaryText),
            ],
          ),
        ),
      ),
    );
  }
}

class _Esqueleto extends StatelessWidget {
  const _Esqueleto();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      label: TextosDoHistorico.carregando,
      child: ExcludeSemantics(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            DesignTokens.space5,
            DesignTokens.space6,
            DesignTokens.space5,
            0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const BarraSkeleton(altura: 24, fracaoDaLargura: 0.2),
              for (var linha = 0; linha < _linhasDoEsqueleto; linha++)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: DesignTokens.space4),
                  child: Row(
                    children: <Widget>[
                      Container(
                        width: _larguraDaCapaDaLinha,
                        height: _alturaDaCapaDaLinha,
                        color: theme.coverPlaceholder,
                      ),
                      const SizedBox(width: DesignTokens.space4),
                      const Expanded(
                        child: Column(
                          children: <Widget>[
                            BarraSkeleton(altura: 17, fracaoDaLargura: 0.7),
                            SizedBox(height: DesignTokens.space2),
                            BarraSkeleton(altura: 13, fracaoDaLargura: 0.45),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
