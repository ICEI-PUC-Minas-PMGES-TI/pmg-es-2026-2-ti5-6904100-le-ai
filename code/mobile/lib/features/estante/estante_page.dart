import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/estado_vazio.dart';
import '../../design/widgets/folha_inferior.dart';
import '../perfil/widgets_de_perfil.dart';
import 'acoes_leitura.dart';
import 'cartao_estante.dart';
import 'estante_service.dart';
import 'lista_da_estante.dart';
import 'textos.dart';

const double _distanciaParaCarregarMais = 300;

class EstantePage extends StatefulWidget {
  final EstanteService servico;
  final VoidCallback aoBuscarLivros;
  final VoidCallback? aoCadastrarLivro;

  const EstantePage({
    super.key,
    required this.servico,
    required this.aoBuscarLivros,
    this.aoCadastrarLivro,
  });

  @override
  State<EstantePage> createState() => _EstantePageState();
}

class _EstantePageState extends State<EstantePage> {
  StatusEstante? _status;
  OrdenacaoEstante _ordenacao = ordenacaoPadrao;

  late final ListaDaEstante _lista = ListaDaEstante(
    (pagina) => widget.servico.listarEstante(
      FiltroEstante(status: _status, ordenacao: _ordenacao, pagina: pagina),
    ),
  );

  @override
  void initState() {
    super.initState();
    _lista.addListener(_aoMudar);
    _lista.carregar();
  }

  @override
  void dispose() {
    _lista
      ..removeListener(_aoMudar)
      ..dispose();
    super.dispose();
  }

  void _aoMudar() => setState(() {});

  void _filtrar(StatusEstante? status) {
    if (status == _status) {
      return;
    }
    setState(() => _status = status);
    _lista.carregar();
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
    final novo = await abrirAcoesDeLeitura(
      context,
      servico: widget.servico,
      livro: LivroDaAcao.doItem(item),
    );
    if (novo != null && mounted) {
      _lista.carregar();
    }
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

  bool _pertoDoFim(ScrollNotification notificacao) {
    if (notificacao.metrics.axis == Axis.vertical &&
        notificacao.metrics.extentAfter < _distanciaParaCarregarMais) {
      _lista.carregarMais();
    }
    return false;
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
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.space5,
        vertical: DesignTokens.space4,
      ),
      child: Row(
        children: <Widget>[
          for (final (status, rotulo, contagem) in opcoes) ...<Widget>[
            _PillDeFiltro(
              rotulo: rotulo,
              contagem: contagem,
              ativo: status == _status,
              aoTocar: () => _filtrar(status),
            ),
            if (status != ordemDosFiltros.last) const SizedBox(width: DesignTokens.space2),
          ],
        ],
      ),
    );
  }

  List<Widget> _corpo(ThemeData theme) {
    const margem = EdgeInsets.symmetric(horizontal: DesignTokens.space5);
    if (_lista.carregando) {
      return const <Widget>[Padding(padding: margem, child: EsqueletoDaEstante())];
    }
    if (_lista.falhou) {
      return <Widget>[
        Padding(
          padding: margem,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const BannerAviso(variante: VarianteAviso.erro, mensagem: TextosDaEstante.erroTexto),
              const SizedBox(height: DesignTokens.space2),
              BotaoTextual(texto: TextosDaEstante.erroBotao, onPressed: _lista.carregar),
            ],
          ),
        ),
      ];
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

  Widget _linhaDeOrdenacao(ThemeData theme) {
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
              textoTotalDeLivros(_lista.total),
              style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
            ),
          ),
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

class _PillDeFiltro extends StatelessWidget {
  final String rotulo;
  final int? contagem;
  final bool ativo;
  final VoidCallback aoTocar;

  const _PillDeFiltro({
    required this.rotulo,
    required this.contagem,
    required this.ativo,
    required this.aoTocar,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cor = ativo ? theme.primaryAccent : theme.secondaryText;
    final peso = ativo ? FontWeight.w600 : null;
    return Semantics(
      button: true,
      selected: ativo,
      label: contagem == null ? rotulo : '$rotulo $contagem',
      excludeSemantics: true,
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
                  style: theme.textTheme.bodySmall?.copyWith(color: cor, fontWeight: peso),
                ),
                if (contagem != null) ...<Widget>[
                  const SizedBox(width: DesignTokens.space1),
                  Text(
                    '$contagem',
                    style: theme.numInline.copyWith(
                      color: cor,
                      fontWeight: peso,
                      fontSize: theme.textTheme.bodySmall?.fontSize,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
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
