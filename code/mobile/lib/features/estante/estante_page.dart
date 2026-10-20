import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/api_client.dart';
import '../../core/network/recarga_em_sequencia.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/estado_vazio.dart';
import '../../design/widgets/folha_inferior.dart';
import '../../design/widgets/pill_de_filtro.dart';
import '../perfil/lista_paginada.dart';
import '../perfil/widgets_de_perfil.dart';
import '../progresso/rotas_progresso.dart';
import 'acoes_leitura.dart';
import 'busca_na_estante.dart';
import 'cartao_estante.dart';
import 'estante_service.dart';
import 'lista_da_estante.dart';
import 'textos.dart';

const double _distanciaParaCarregarMais = 300;

class EstantePage extends StatefulWidget {
  final EstanteService servico;
  final VoidCallback aoBuscarLivros;
  final VoidCallback? aoCadastrarLivro;
  final DependenciasDeProgresso? progresso;
  final ValueChanged<String>? aoVerAtualizacoes;

  /// Filtro da rota (`?status=`): o contador `livros lidos` do perfil chega com `Lido` (F-PERFIL).
  /// Quando muda com a página montada, a lista troca de filtro.
  final StatusEstante? statusInicial;

  /// Avisa a troca de filtro feita na página, para a rota guardar o `?status=`. Sem isso, o
  /// contador levaria de novo à mesma rota e a página continuaria no filtro trocado aqui.
  final ValueChanged<StatusEstante?>? aoMudarFiltro;

  /// Busca local do header (RF-EST-13), aberta pela lupa do shell. Combina com o status e com
  /// o filtro de favoritos; nunca consulta o acervo.
  final BuscaNaEstante? busca;

  /// Botão do vazio da busca, que leva o termo digitado ao acervo.
  final ValueChanged<String>? aoBuscarNoAcervo;

  const EstantePage({
    super.key,
    required this.servico,
    required this.aoBuscarLivros,
    this.aoCadastrarLivro,
    this.progresso,
    this.aoVerAtualizacoes,
    this.statusInicial,
    this.aoMudarFiltro,
    this.busca,
    this.aoBuscarNoAcervo,
  });

  @override
  State<EstantePage> createState() => _EstantePageState();
}

class _EstantePageState extends State<EstantePage> {
  late StatusEstante? _status = widget.statusInicial;
  OrdenacaoEstante _ordenacao = ordenacaoPadrao;
  bool _favoritos = false;
  String? _buscaAplicada;

  late final ListaDaEstante _lista = ListaDaEstante(
    (pagina) => widget.servico.listarEstante(
      FiltroEstante(status: _status, ordenacao: _ordenacao, busca: _buscaAplicada, pagina: pagina),
    ),
  );

  late final ListaPaginada<ItemFavorito> _listaDeFavoritos = ListaPaginada<ItemFavorito>(
    (pagina) => widget.servico.listarFavoritos(busca: _buscaAplicada, pagina: pagina + 1),
    (item) => item.livro.id,
  );

  late final RecargaEmSequencia _recarga = RecargaEmSequencia(() async {
    if (mounted) {
      await _recarregar();
    }
  });

  Future<void> _recarregar() async {
    await Future.wait(<Future<void>>[
      _lista.carregar(),
      if (_favoritos) _listaDeFavoritos.carregar(),
    ]);
  }

  @override
  void initState() {
    super.initState();
    _lista.addListener(_aoMudar);
    _listaDeFavoritos.addListener(_aoMudar);
    widget.busca?.addListener(_aoMudarBusca);
    _buscaAplicada = widget.busca?.busca;
    _lista.carregar();
    // A aba fica montada no `indexedStack`: o que muda a estante em outra aba, ou numa tela
    // empilhada por cima (atualizações, página do livro), chega por estes avisos. As ações feitas
    // aqui também chegam por eles, por isso nenhuma delas recarrega a lista por conta própria.
    widget.servico.alteracoes.addListener(_aoAlterar);
    widget.progresso?.servico.alteracoes.addListener(_aoAlterar);
    final fila = widget.progresso?.fila;
    if (fila != null) {
      fila.addListener(_aoMudar);
      fila.carregar();
    }
  }

  @override
  void didUpdateWidget(EstantePage antigo) {
    super.didUpdateWidget(antigo);
    final status = widget.statusInicial;
    if (status != antigo.statusInicial && status != _status) {
      setState(() => _status = status);
      _lista.carregar();
    }
  }

  @override
  void dispose() {
    widget.servico.alteracoes.removeListener(_aoAlterar);
    widget.progresso?.servico.alteracoes.removeListener(_aoAlterar);
    widget.progresso?.fila.removeListener(_aoMudar);
    widget.busca?.removeListener(_aoMudarBusca);
    _lista
      ..removeListener(_aoMudar)
      ..dispose();
    _listaDeFavoritos
      ..removeListener(_aoMudar)
      ..dispose();
    super.dispose();
  }

  void _aoMudar() => setState(() {});

  void _aoMudarBusca() {
    final busca = widget.busca?.busca;
    if (busca == _buscaAplicada) {
      return;
    }
    setState(() => _buscaAplicada = busca);
    _recarregar();
  }

  void _aoAlterar() => _recarga.pedir();

  void _filtrar(StatusEstante? status) {
    if (status == _status && !_favoritos) {
      return;
    }
    setState(() {
      _status = status;
      _favoritos = false;
    });
    _lista.carregar();
    widget.aoMudarFiltro?.call(status);
  }

  void _filtrarFavoritos() {
    if (_favoritos) {
      return;
    }
    final mudouStatus = _status != null;
    setState(() {
      _status = null;
      _favoritos = true;
    });
    _recarregar();
    if (mudouStatus) {
      widget.aoMudarFiltro?.call(null);
    }
  }

  Future<void> _escolherOrdenacao() async {
    final escolhida = await mostrarFolhaInferior<OrdenacaoEstante>(
      context,
      builder: (context) => _FolhaDeOrdenacao(atual: _ordenacao),
    );
    if (escolhida == null || escolhida == _ordenacao || !mounted) {
      return;
    }
    setState(() => _ordenacao = escolhida);
    _lista.carregar();
  }

  Future<void> _abrirAcoes(ItemEstante item) async {
    await abrirAcoesDeLeitura(
      context,
      servico: widget.servico,
      livro: LivroDaAcao.doItem(item),
      aoRegistrarProgresso: widget.progresso == null
          ? null
          : (leitura) => _registrarProgresso(item, leitura),
      aoVerAtualizacoes: widget.aoVerAtualizacoes == null
          ? null
          : (leitura) => widget.aoVerAtualizacoes!(leitura.id),
    );
  }

  Future<void> _registrarProgresso(ItemEstante item, Leitura leitura) async {
    final progresso = widget.progresso;
    if (progresso == null) {
      return;
    }
    await registrarProgressoDaLeitura(
      context,
      progresso: progresso,
      leitura: leitura,
      livro: item.livro,
    );
  }

  void _seguirVazio(DestinoDoVazio destino) {
    switch (destino) {
      case DestinoDoVazio.descobrir:
        widget.aoBuscarLivros();
      case DestinoDoVazio.lendo:
        _filtrar(StatusEstante.lendo);
      case DestinoDoVazio.lido:
        _filtrar(StatusEstante.lido);
    }
  }

  int? _paginaPendente(ItemEstante item) {
    final leituraId = item.leituraEmAndamentoId;
    return leituraId == null ? null : widget.progresso?.fila.paginaLocal(leituraId);
  }

  bool _pertoDoFim(ScrollNotification notificacao) {
    if (notificacao.metrics.axis == Axis.vertical &&
        notificacao.metrics.extentAfter < _distanciaParaCarregarMais) {
      if (_favoritos) {
        _listaDeFavoritos.carregarMais();
      } else {
        _lista.carregarMais();
      }
    }
    return false;
  }

  Future<void> _abrirFavorito(ItemFavorito favorito) async {
    final item = favorito.status == null ? null : await _itemDaEstante(favorito.livro.id);
    if (!mounted) {
      return;
    }
    await abrirAcoesDeLeitura(
      context,
      servico: widget.servico,
      livro: LivroDaAcao(
        livroId: favorito.livro.id,
        livro: favorito.livro.livro,
        status: item?.status ?? favorito.status,
        leituraId: item?.leituraParaAcoes,
        favorito: true,
      ),
      aoRegistrarProgresso: widget.progresso == null || item == null
          ? null
          : (leitura) => _registrarProgresso(item, leitura),
      aoVerAtualizacoes: widget.aoVerAtualizacoes == null
          ? null
          : (leitura) => widget.aoVerAtualizacoes!(leitura.id),
    );
  }

  Future<ItemEstante?> _itemDaEstante(String livroId) async {
    try {
      return await widget.servico.itemDaEstante(livroId);
    } on ApiException {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return NotificationListener<ScrollNotification>(
      onNotification: _pertoDoFim,
      child: ListView(
        padding: const EdgeInsets.only(bottom: DesignTokens.space10),
        children: <Widget>[_faixaDeFiltros(theme), ..._corpo(theme)],
      ),
    );
  }

  Widget _faixaDeFiltros(ThemeData theme) {
    final totais = _lista.carregando ? null : _lista.totais;
    final opcoes = <(StatusEstante?, String, int?)>[
      (null, rotuloTodos, totais == null ? null : _lista.totalGeral),
      for (final status in ordemDosFiltros) (status, rotuloDoStatus[status]!, totais?[status]),
    ];
    final totalFavoritos = _lista.carregando ? null : _lista.totalFavoritos;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.space5,
        vertical: DesignTokens.space4,
      ),
      child: Row(
        children: <Widget>[
          for (final (status, rotulo, contagem) in opcoes) ...<Widget>[
            PillDeFiltro(
              rotulo: rotulo,
              contagem: contagem,
              ativo: !_favoritos && status == _status,
              aoTocar: () => _filtrar(status),
            ),
            if (status != ordemDosFiltros.last) const SizedBox(width: DesignTokens.space2),
          ],
          ExcludeSemantics(
            child: Container(
              width: 1,
              height: 24,
              margin: const EdgeInsets.symmetric(horizontal: DesignTokens.space2),
              color: theme.divider,
            ),
          ),
          PillDeFiltro(
            key: const ValueKey<String>('pill-favoritos'),
            rotulo: TextosDoFiltroFavoritos.rotulo,
            contagem: totalFavoritos,
            ativo: _favoritos,
            icone: (PhosphorIconsRegular.heart, PhosphorIconsFill.heart),
            aoTocar: _filtrarFavoritos,
          ),
        ],
      ),
    );
  }

  Widget _vazio({
    required IconData icone,
    required String titulo,
    required String texto,
    required String rotulo,
    required VoidCallback aoTocar,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        DesignTokens.space8,
        DesignTokens.space5,
        0,
      ),
      child: EstadoVazio(
        icone: icone,
        titulo: titulo,
        texto: texto,
        rodape: Padding(
          padding: const EdgeInsets.only(top: DesignTokens.space6),
          child: BotaoPrimario(texto: rotulo, onPressed: aoTocar),
        ),
      ),
    );
  }

  Widget? _vazioDaBusca() {
    final busca = _buscaAplicada;
    if (busca == null) {
      return null;
    }
    final aoBuscarNoAcervo = widget.aoBuscarNoAcervo;
    return _vazio(
      icone: PhosphorIconsRegular.magnifyingGlass,
      titulo: TextosDaBuscaNaEstante.vazioTitulo,
      texto: TextosDaBuscaNaEstante.vazioTexto,
      rotulo: TextosDaBuscaNaEstante.vazioBotao,
      aoTocar: aoBuscarNoAcervo == null ? widget.aoBuscarLivros : () => aoBuscarNoAcervo(busca),
    );
  }

  List<Widget> _corpoDosFavoritos(ThemeData theme) {
    const margem = EdgeInsets.symmetric(horizontal: DesignTokens.space5);
    final lista = _listaDeFavoritos;
    if (lista.carregando) {
      return const <Widget>[Padding(padding: margem, child: EsqueletoDaEstante())];
    }
    if (lista.falhou) {
      return <Widget>[_erro(margem, _recarregar)];
    }
    if (lista.itens.isEmpty) {
      return <Widget>[
        _vazioDaBusca() ??
            _vazio(
              icone: PhosphorIconsRegular.heart,
              titulo: TextosDoFiltroFavoritos.vazioTitulo,
              texto: TextosDoFiltroFavoritos.vazioTexto,
              rotulo: TextosDoFiltroFavoritos.vazioBotao,
              aoTocar: () => _filtrar(StatusEstante.lido),
            ),
      ];
    }
    return <Widget>[
      _linhaDeContagem(theme, lista.total, comOrdenacao: false),
      Padding(
        padding: margem,
        child: GradeDaEstante(
          filhos: <Widget>[
            for (final item in lista.itens)
              CartaoEstante.doFavorito(
                key: ValueKey<String>(item.livro.id),
                item: item,
                aoAbrir: () => _abrirFavorito(item),
              ),
          ],
        ),
      ),
      Padding(
        padding: margem,
        child: FimDaLista(
          temMais: lista.temMais,
          carregandoMais: lista.carregandoMais,
          falhou: lista.falhouMais,
          aoCarregar: lista.carregarMais,
        ),
      ),
    ];
  }

  Widget _erro(EdgeInsets margem, VoidCallback aoTentar) {
    return Padding(
      padding: margem,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const BannerAviso(variante: VarianteAviso.erro, mensagem: TextosDaEstante.erroTexto),
          const SizedBox(height: DesignTokens.space2),
          BotaoTextual(texto: TextosDaEstante.erroBotao, onPressed: aoTentar),
        ],
      ),
    );
  }

  List<Widget> _corpo(ThemeData theme) {
    const margem = EdgeInsets.symmetric(horizontal: DesignTokens.space5);
    if (_favoritos) {
      return _corpoDosFavoritos(theme);
    }
    if (_lista.carregando) {
      return const <Widget>[Padding(padding: margem, child: EsqueletoDaEstante())];
    }
    if (_lista.falhou) {
      return <Widget>[_erro(margem, _lista.carregar)];
    }
    final vazioDaBusca = _lista.itens.isEmpty ? _vazioDaBusca() : null;
    if (vazioDaBusca != null) {
      return <Widget>[_linhaDeContagem(theme, 0, comOrdenacao: true), vazioDaBusca];
    }
    if (_lista.totalGeral == 0) {
      return <Widget>[
        Padding(
          padding: const EdgeInsets.fromLTRB(
            DesignTokens.space5,
            DesignTokens.space8,
            DesignTokens.space5,
            0,
          ),
          child: EstadoVazio(
            icone: PhosphorIconsRegular.books,
            titulo: TextosDaEstante.vaziaTitulo,
            texto: TextosDaEstante.vaziaTexto,
            rodape: Padding(
              padding: const EdgeInsets.only(top: DesignTokens.space6),
              child: Column(
                children: <Widget>[
                  BotaoPrimario(
                    texto: TextosDaEstante.vaziaBotaoPrimario,
                    onPressed: widget.aoBuscarLivros,
                  ),
                  if (widget.aoCadastrarLivro != null) ...<Widget>[
                    const SizedBox(height: DesignTokens.space3),
                    BotaoTextual(
                      texto: TextosDaEstante.vaziaBotaoTextual,
                      larguraTotal: true,
                      onPressed: widget.aoCadastrarLivro,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ];
    }
    final status = _status;
    if (status != null && _lista.itens.isEmpty) {
      final vazio = vazioDoFiltro[status]!;
      final destino = vazio.destino;
      return <Widget>[
        _linhaDeOrdenacao(theme),
        Padding(
          padding: const EdgeInsets.fromLTRB(
            DesignTokens.space5,
            DesignTokens.space8,
            DesignTokens.space5,
            0,
          ),
          child: EstadoVazio(
            icone: _iconeDoVazio(status),
            titulo: vazio.titulo,
            texto: vazio.texto,
            rodape: destino == null
                ? null
                : Padding(
                    padding: const EdgeInsets.only(top: DesignTokens.space6),
                    child: BotaoPrimario(
                      texto: vazio.rotuloDoBotao!,
                      onPressed: () => _seguirVazio(destino),
                    ),
                  ),
          ),
        ),
      ];
    }
    return <Widget>[
      _linhaDeOrdenacao(theme),
      Padding(
        padding: margem,
        child: GradeDaEstante(
          filhos: <Widget>[
            for (final item in _lista.itens)
              CartaoEstante(
                key: ValueKey<String>(item.livroId),
                item: item,
                aoAbrir: () => _abrirAcoes(item),
                paginaPendente: _paginaPendente(item),
              ),
          ],
        ),
      ),
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

  IconData _iconeDoVazio(StatusEstante status) => switch (status) {
    StatusEstante.queroLer => PhosphorIconsRegular.bookmarkSimple,
    StatusEstante.lendo => PhosphorIconsRegular.bookOpen,
    StatusEstante.lido => PhosphorIconsRegular.checkCircle,
    StatusEstante.relendo => PhosphorIconsRegular.arrowsClockwise,
    StatusEstante.abandonado => PhosphorIconsRegular.pauseCircle,
  };

  Widget _linhaDeOrdenacao(ThemeData theme) =>
      _linhaDeContagem(theme, _lista.total, comOrdenacao: true);

  Widget _linhaDeContagem(ThemeData theme, int total, {required bool comOrdenacao}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        0,
        DesignTokens.space1,
        DesignTokens.space3,
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Text(
              _buscaAplicada == null ? textoTotalDeLivros(total) : textoEncontradosNaEstante(total),
              style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
            ),
          ),
          if (comOrdenacao)
            Flexible(
              child: Semantics(
                label: '${TextosDaEstante.rotuloOrdenacao}: ${rotuloDaOrdenacao[_ordenacao]}',
                button: true,
                excludeSemantics: true,
                child: TextButton.icon(
                  onPressed: _escolherOrdenacao,
                  icon: const Icon(PhosphorIconsRegular.arrowsDownUp, size: 16),
                  label: Text(rotuloDaOrdenacao[_ordenacao]!, overflow: TextOverflow.ellipsis),
                  style: TextButton.styleFrom(
                    minimumSize: const Size(48, 48),
                    foregroundColor: theme.primaryAccent,
                    textStyle: theme.textTheme.labelLarge,
                    splashFactory: NoSplash.splashFactory,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _FolhaDeOrdenacao extends StatelessWidget {
  final OrdenacaoEstante atual;

  const _FolhaDeOrdenacao({required this.atual});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(TextosDaEstante.rotuloOrdenacao, style: theme.textTheme.titleMedium),
          const SizedBox(height: DesignTokens.space3),
          for (final opcao in OrdenacaoEstante.values)
            Semantics(
              button: true,
              selected: opcao == atual,
              child: InkWell(
                onTap: () => Navigator.of(context).pop(opcao),
                splashFactory: NoSplash.splashFactory,
                child: SizedBox(
                  height: 48,
                  child: Row(
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          rotuloDaOrdenacao[opcao]!,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: opcao == atual
                                ? theme.primaryAccent
                                : theme.colorScheme.onSurface,
                            fontWeight: opcao == atual ? FontWeight.w600 : null,
                          ),
                        ),
                      ),
                      if (opcao == atual)
                        Icon(PhosphorIconsBold.check, size: 20, color: theme.primaryAccent),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
