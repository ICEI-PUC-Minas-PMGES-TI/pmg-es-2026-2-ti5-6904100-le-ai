import 'dart:async';

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/entrada_suave.dart';
import '../../design/widgets/estado_vazio.dart';
import '../../design/widgets/folha_inferior.dart';
import '../perfil/perfil_service.dart';
import '../perfil/textos.dart';
import '../perfil/widgets_de_perfil.dart';
import 'lista_form_page.dart';
import 'listas_service.dart';
import 'textos.dart';
import 'widgets_de_lista.dart';

/// Lista (docs/design/periodo-2/F-LST/lista.md, RF-LST-02/04/05/06), com a lógica da
/// `ListaView.vue` da web. Dois modos, decididos pelo servidor (`pertenceAoSolicitante`):
///
/// - **Dono:** o menu `DotsThree` de cada linha (mover para cima, para baixo, remover) e o modo
///   `Reordenar`, com a alça de arrastar. A lista inteira fica carregada, para o livro poder ir a
///   qualquer posição. A ordem nova vai na hora; se o servidor recusar, a lista volta como estava
///   e o aviso oferece `Tentar de novo` com a mesma chave (§4.4): nunca fica ordem parcial.
/// - **Outro leitor:** só lê, paginado por rolagem. Perfil privado sem seguimento (403) mostra o
///   bloco de restrição, sem título, capa nem contagem (RN-08).
///
/// Quem decide para onde vai o toque num livro é a rota ([aoAbrirLivro]): o livro pessoal de
/// lista alheia abre em modo consulta com `via=lista`, e o do dono, sem via.
class ListaPage extends StatefulWidget {
  final ListasService servico;
  final String listaId;

  /// Username do dono, quando a rota é a de outro leitor: o 403 não diz de quem é a lista.
  final String? usernameDoDono;
  final PerfilService? perfil;
  final VoidCallback? aoVoltar;
  final void Function(LivroDaLista livro, bool dono) aoAbrirLivro;
  final ValueChanged<String>? aoAbrirPerfil;
  final VoidCallback? aoBuscarLivros;

  const ListaPage({
    super.key,
    required this.servico,
    required this.listaId,
    this.usernameDoDono,
    this.perfil,
    this.aoVoltar,
    required this.aoAbrirLivro,
    this.aoAbrirPerfil,
    this.aoBuscarLivros,
  });

  @override
  State<ListaPage> createState() => _ListaPageState();
}

enum _Carga { carregando, pronta, restrita, naoEncontrada, falha }

class _ListaPageState extends State<ListaPage> {
  final ScrollController _rolagem = ScrollController();

  _Carga _carga = _Carga.carregando;
  Lista? _lista;
  List<ItemDeLista> _itens = <ItemDeLista>[];
  String? _cursor;
  bool _temMais = false;
  bool _carregandoMais = false;
  bool _falhouMais = false;
  String? _nomeDoDonoRestrito;
  Privacidade? _privacidade;
  bool _reordenando = false;

  /// Escrita desta tela em andamento: o aviso de `alteracoes` que ela mesma causa não recarrega.
  bool _escrevendo = false;

  /// Chave da intenção de mover: o mesmo item para a mesma posição repete a chave (RNF-ERR-04).
  final Map<String, String> _chavesDeMover = <String, String>{};

  bool get _dono => _lista?.pertenceAoSolicitante ?? false;

  @override
  void initState() {
    super.initState();
    _rolagem.addListener(_aoRolar);
    widget.servico.alteracoes.addListener(_aoMudarFora);
    _carregar();
  }

  @override
  void dispose() {
    widget.servico.alteracoes.removeListener(_aoMudarFora);
    _rolagem.dispose();
    super.dispose();
  }

  /// Um livro entrou ou saiu por outra tela (a página do livro, empilhada por cima): relê sem
  /// trocar a lista pelo skeleton.
  void _aoMudarFora() {
    if (!_escrevendo && _carga == _Carga.pronta) {
      _carregar(silencioso: true);
    }
  }

  void _aoRolar() {
    if (!_rolagem.hasClients || _dono) {
      return;
    }
    if (_rolagem.position.extentAfter < 400) {
      _carregarMais();
    }
  }

  Future<void> _carregar({bool silencioso = false}) async {
    if (!silencioso) {
      setState(() {
        _carga = _Carga.carregando;
        _reordenando = false;
      });
    }
    try {
      final lista = await widget.servico.obter(widget.listaId);
      final itens = await _buscarItens(lista.pertenceAoSolicitante, null);
      if (!mounted) {
        return;
      }
      setState(() {
        _lista = lista;
        _itens = itens.itens;
        _cursor = itens.proximoCursor;
        _temMais = itens.temMais;
        _carga = _Carga.pronta;
      });
      if (lista.pertenceAoSolicitante && _privacidade == null) {
        unawaited(_carregarPrivacidade());
      }
    } on ApiException catch (erro) {
      if (!mounted) {
        return;
      }
      setState(() {
        _lista = null;
        _itens = <ItemDeLista>[];
        _carga = switch (erro.status) {
          403 => _Carga.restrita,
          404 => _Carga.naoEncontrada,
          _ => _Carga.falha,
        };
      });
      if (erro.status == 403) {
        unawaited(_descobrirNomeRestrito());
      }
    }
  }

  /// Dono: tudo, em segmentos de 50 (o teto do servidor). Terceiro: só um segmento.
  Future<ItensDaLista> _buscarItens(bool tudo, String? cursor) async {
    var segmento = await widget.servico.listarItens(
      widget.listaId,
      cursor: cursor,
      limite: tudo ? limiteDeItens : tamanhoDaPagina,
    );
    final acumulado = <ItemDeLista>[...segmento.itens];
    while (tudo && segmento.temMais && segmento.proximoCursor != null) {
      segmento = await widget.servico.listarItens(
        widget.listaId,
        cursor: segmento.proximoCursor,
        limite: limiteDeItens,
      );
      acumulado.addAll(segmento.itens);
    }
    return ItensDaLista(
      itens: acumulado,
      proximoCursor: segmento.proximoCursor,
      temMais: segmento.temMais,
    );
  }

  Future<void> _carregarMais() async {
    if (!_temMais || _carregandoMais || _carga != _Carga.pronta) {
      return;
    }
    setState(() {
      _carregandoMais = true;
      _falhouMais = false;
    });
    try {
      final segmento = await _buscarItens(false, _cursor);
      if (mounted) {
        final vistos = _itens.map((item) => item.id).toSet();
        setState(() {
          _itens = <ItemDeLista>[
            ..._itens,
            ...segmento.itens.where((item) => !vistos.contains(item.id)),
          ];
          _cursor = segmento.proximoCursor;
          _temMais = segmento.temMais;
        });
      }
    } on ApiException {
      if (mounted) {
        setState(() => _falhouMais = true);
      }
    } finally {
      if (mounted) {
        setState(() => _carregandoMais = false);
      }
    }
  }

  Future<Privacidade> _minhaPrivacidade() async {
    final perfil = widget.perfil;
    if (perfil == null) {
      throw const ApiException(
        kind: ApiFailureKind.invalidResponse,
        correlationId: '',
        message: 'Sem serviço de perfil.',
      );
    }
    return (await perfil.obterMeuPerfil()).privacidade;
  }

  /// A lista segue o perfil (RN-08); sem resposta, a linha de visibilidade some.
  Future<void> _carregarPrivacidade() async {
    if (widget.perfil == null) {
      return;
    }
    try {
      final privacidade = await _minhaPrivacidade();
      if (mounted) {
        setState(() => _privacidade = privacidade);
      }
    } on ApiException {
      // A linha fica fora.
    }
  }

  Future<void> _descobrirNomeRestrito() async {
    final username = widget.usernameDoDono;
    final perfil = widget.perfil;
    if (username == null || perfil == null) {
      return;
    }
    try {
      final dono = await perfil.obterPerfil(username);
      if (mounted) {
        setState(() => _nomeDoDonoRestrito = primeiroNome(dono.displayName));
      }
    } on ApiException {
      // O bloco fica com o texto neutro.
    }
  }

  // ------------------------------------------------------------------ reordenar e remover

  List<ItemDeLista> _renumerar(List<ItemDeLista> itens) => <ItemDeLista>[
    for (var i = 0; i < itens.length; i++) itens[i].naPosicao(i + 1),
  ];

  Future<void> _mover(int de, int para) async {
    final lista = _lista;
    if (lista == null || de == para || para < 0 || para >= _itens.length) {
      return;
    }
    final anterior = _itens;
    final item = anterior[de];
    final proxima = <ItemDeLista>[...anterior]
      ..removeAt(de)
      ..insert(para, item);
    setState(() => _itens = _renumerar(proxima));

    final intencao = '${item.id}:${para + 1}';
    final chave = _chavesDeMover.putIfAbsent(intencao, ApiClient.newIdempotencyKey);
    _escrevendo = true;
    try {
      await widget.servico.mover(lista.id, item.id, para + 1, idempotencyKey: chave);
      _chavesDeMover.remove(intencao);
      if (mounted) {
        ScaffoldMessenger.maybeOf(context)?.hideCurrentSnackBar();
        setState(() => _lista = lista.copiar(atualizadaEm: DateTime.now()));
      }
    } on ApiException {
      if (!mounted) {
        return;
      }
      setState(() => _itens = anterior);
      mostrarAvisoDeLista(
        context,
        texto: 'Não foi possível salvar a nova ordem. A lista voltou como estava.',
        falha: true,
        acao: 'Tentar de novo',
        aoAcionar: () => _mover(de, para),
      );
    } finally {
      _escrevendo = false;
    }
  }

  /// Sem confirmação (§4.2): tira o livro desta lista e de nenhum outro lugar.
  Future<void> _remover(ItemDeLista item) async {
    final lista = _lista;
    if (lista == null) {
      return;
    }
    final anterior = _itens;
    setState(() {
      _itens = _renumerar(anterior.where((outro) => outro.id != item.id).toList());
      _lista = lista.copiar(
        quantidadeLivros: lista.quantidadeLivros > 0 ? lista.quantidadeLivros - 1 : 0,
      );
    });
    _escrevendo = true;
    try {
      await widget.servico.remover(
        lista.id,
        item.livro.id,
        idempotencyKey: ApiClient.newIdempotencyKey(),
      );
    } on ApiException {
      if (!mounted) {
        return;
      }
      setState(() {
        _itens = anterior;
        _lista = lista;
      });
      mostrarAvisoDeLista(
        context,
        texto: 'Não foi possível tirar ${item.livro.titulo} da lista. Tente de novo.',
        falha: true,
      );
    } finally {
      _escrevendo = false;
    }
  }

  /// Menu do item (§4.2): no primeiro, sem `Mover para cima`; no último, sem `Mover para baixo`.
  Future<void> _abrirMenu(ItemDeLista item) async {
    final indice = _itens.indexWhere((outro) => outro.id == item.id);
    final escolha = await mostrarFolhaInferior<String>(
      context,
      builder: (context) {
        final theme = Theme.of(context);
        Widget opcao(String valor, IconData icone, String rotulo, {bool destrutiva = false}) {
          final cor = destrutiva ? theme.colorScheme.error : theme.colorScheme.onSurface;
          return Semantics(
            button: true,
            child: InkWell(
              onTap: () => Navigator.of(context).pop(valor),
              child: SizedBox(
                height: 56,
                child: Row(
                  children: <Widget>[
                    Icon(icone, size: 20, color: cor),
                    const SizedBox(width: DesignTokens.space4),
                    Text(rotulo, style: theme.textTheme.bodyMedium?.copyWith(color: cor)),
                  ],
                ),
              ),
            ),
          );
        }

        final opcoes = <Widget>[
          if (indice > 0) opcao('cima', PhosphorIconsRegular.arrowUp, 'Mover para cima'),
          if (indice < _itens.length - 1)
            opcao('baixo', PhosphorIconsRegular.arrowDown, 'Mover para baixo'),
          opcao('remover', PhosphorIconsRegular.minusCircle, 'Remover da lista', destrutiva: true),
        ];
        return SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  CapaDeItem(
                    url: item.livro.capaUrl,
                    titulo: item.livro.titulo,
                    pessoal: item.livro.pessoal,
                  ),
                  const SizedBox(width: DesignTokens.space4),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(item.livro.titulo, style: theme.textTheme.titleMedium),
                        if (item.livro.autor != null)
                          Text(
                            item.livro.autor!,
                            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                          ),
                        const SizedBox(height: DesignTokens.space1),
                        Text(
                          'Posição ${indice + 1} de ${_itens.length}',
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: DesignTokens.space4),
              Divider(height: 1, color: theme.divider),
              for (var i = 0; i < opcoes.length; i++) ...<Widget>[
                if (i > 0) Divider(height: 1, color: theme.divider),
                opcoes[i],
              ],
              const SizedBox(height: DesignTokens.space4),
              BotaoTextual(
                texto: 'Cancelar',
                neutro: true,
                larguraTotal: true,
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
        );
      },
    );
    if (!mounted || escolha == null) {
      return;
    }
    final atual = _itens.indexWhere((outro) => outro.id == item.id);
    switch (escolha) {
      case 'cima':
        await _mover(atual, atual - 1);
      case 'baixo':
        await _mover(atual, atual + 1);
      default:
        await _remover(item);
    }
  }

  // ------------------------------------------------------------------ editar e excluir

  Future<void> _editar() async {
    final lista = _lista;
    if (lista == null) {
      return;
    }
    _escrevendo = true;
    final resultado = await abrirFormularioDeLista(
      context,
      servico: widget.servico,
      obterPrivacidade: widget.perfil == null ? null : _minhaPrivacidade,
      lista: lista,
    );
    _escrevendo = false;
    if (!mounted || resultado == null) {
      return;
    }
    if (resultado.excluida) {
      // O aviso vai pelo mensageiro do app e aparece na tela de baixo (criar-lista.md §4.8).
      mostrarAvisoDeLista(context, texto: 'Lista excluída.');
      widget.aoVoltar?.call();
      return;
    }
    setState(() => _lista = resultado.lista);
  }

  // ------------------------------------------------------------------ desenho

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: <Widget>[
        // Sem título: o título da lista aparece grande logo abaixo (§4 "Header desta tela").
        CabecalhoTela(titulo: '', aoVoltar: widget.aoVoltar, semDivisor: true),
        Expanded(child: _corpo(theme)),
      ],
    );
  }

  Widget _corpo(ThemeData theme) {
    const lateral = EdgeInsets.symmetric(horizontal: DesignTokens.space5);
    switch (_carga) {
      case _Carga.carregando:
        return const EntradaSuave(child: _SkeletonDaLista());
      case _Carga.restrita:
        final nome = _nomeDoDonoRestrito;
        final username = widget.usernameDoDono;
        return SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(
            DesignTokens.space10,
            DesignTokens.space10,
            DesignTokens.space10,
            DesignTokens.space10,
          ),
          child: EstadoVazio(
            icone: PhosphorIconsRegular.lock,
            solto: true,
            titulo: 'Esta lista é de um perfil privado',
            texto: textoDeListasRestritas(nome),
            rodape: username == null || widget.aoAbrirPerfil == null
                ? null
                : BotaoSecundarioDeLista(
                    texto: nome == null ? 'Ver perfil' : 'Ver perfil de $nome',
                    aoTocar: () => widget.aoAbrirPerfil!(username),
                  ),
          ),
        );
      case _Carga.naoEncontrada:
        return SingleChildScrollView(
          padding: const EdgeInsets.all(DesignTokens.space10),
          child: EstadoVazio(
            icone: PhosphorIconsRegular.listDashes,
            solto: true,
            titulo: 'Lista não encontrada',
            texto: 'Ela pode ter sido excluída por quem a criou.',
            rodape: BotaoTextual(texto: 'Voltar', onPressed: widget.aoVoltar),
          ),
        );
      case _Carga.falha:
        return Padding(
          padding: const EdgeInsets.fromLTRB(
            DesignTokens.space5,
            DesignTokens.space4,
            DesignTokens.space5,
            0,
          ),
          child: BannerAviso(
            variante: VarianteAviso.erro,
            triangulo: true,
            mensagem: 'Não foi possível carregar esta lista. Verifique sua conexão e tente de novo.',
            acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _carregar),
          ),
        );
      case _Carga.pronta:
        final lista = _lista!;
        return CustomScrollView(
          controller: _rolagem,
          slivers: <Widget>[
            SliverPadding(
              padding: lateral,
              sliver: SliverToBoxAdapter(child: _bloco(theme, lista)),
            ),
            if (_itens.isEmpty)
              SliverPadding(
                padding: lateral,
                sliver: SliverToBoxAdapter(child: _vazia(theme, lista)),
              )
            else if (_reordenando)
              SliverReorderableList(
                itemCount: _itens.length,
                onReorderItem: _mover,
                proxyDecorator: (filho, indice, animacao) => Material(
                  type: MaterialType.transparency,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: theme.elevatedSurface,
                      boxShadow: theme.elevation2,
                    ),
                    child: _linha(theme, _itens[indice], indice, levantada: true),
                  ),
                ),
                itemBuilder: (context, indice) => KeyedSubtree(
                  key: ValueKey<String>(_itens[indice].id),
                  child: _linha(theme, _itens[indice], indice),
                ),
              )
            else
              SliverList.builder(
                itemCount: _itens.length,
                itemBuilder: (context, indice) => _linha(theme, _itens[indice], indice),
              ),
            if (!_dono && (_temMais || _falhouMais))
              SliverPadding(
                padding: lateral,
                sliver: SliverToBoxAdapter(
                  child: FimDaLista(
                    temMais: _temMais,
                    carregandoMais: _carregandoMais,
                    falhou: _falhouMais,
                    aoCarregar: _carregarMais,
                  ),
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: DesignTokens.space12)),
          ],
        );
    }
  }

  Widget _bloco(ThemeData theme, Lista lista) {
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    return Padding(
      padding: const EdgeInsets.only(top: DesignTokens.space2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Semantics(
            header: true,
            child: Text(
              lista.titulo,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.headlineSmall,
            ),
          ),
          if (lista.descricao != null) ...<Widget>[
            const SizedBox(height: DesignTokens.space2),
            Text(
              lista.descricao!,
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
            ),
          ],
          if (!_dono) ...<Widget>[
            const SizedBox(height: DesignTokens.space3),
            Row(
              children: <Widget>[
                AvatarLeitor(
                  url: lista.dono.avatarUrl,
                  tamanho: 24,
                  nome: lista.dono.nomeExibicao,
                ),
                const SizedBox(width: DesignTokens.space2),
                Text('Lista de ', style: legenda),
                Flexible(
                  child: Semantics(
                    link: true,
                    child: GestureDetector(
                      onTap: widget.aoAbrirPerfil == null
                          ? null
                          : () => widget.aoAbrirPerfil!(lista.dono.username),
                      child: Text(
                        lista.dono.nomeExibicao,
                        overflow: TextOverflow.ellipsis,
                        style: legenda?.copyWith(
                          color: theme.primaryAccent,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ] else if (_privacidade != null) ...<Widget>[
            const SizedBox(height: DesignTokens.space3),
            LinhaDeVisibilidade(
              privacidade: _privacidade!,
              texto: visibilidadeDaLista(_privacidade!),
            ),
          ],
          const SizedBox(height: DesignTokens.space3),
          Text(linhaDeContagem(lista.quantidadeLivros, lista.atualizadaEm), style: legenda),
          if (_dono) ...<Widget>[
            const SizedBox(height: DesignTokens.space4),
            if (_reordenando) ...<Widget>[
              BotaoPrimario(
                texto: 'Concluir',
                icone: PhosphorIconsBold.check,
                larguraTotal: false,
                onPressed: () => setState(() => _reordenando = false),
              ),
              const SizedBox(height: DesignTokens.space2),
              Text('Arraste pela alça para mudar a ordem.', style: legenda),
            ] else
              Wrap(
                spacing: DesignTokens.space3,
                runSpacing: DesignTokens.space3,
                children: <Widget>[
                  BotaoSecundarioDeLista(
                    texto: 'Editar lista',
                    icone: PhosphorIconsRegular.pencilSimple,
                    aoTocar: _editar,
                  ),
                  if (_itens.length >= 2)
                    BotaoSecundarioDeLista(
                      texto: 'Reordenar',
                      icone: PhosphorIconsRegular.arrowsDownUp,
                      aoTocar: () => setState(() => _reordenando = true),
                    ),
                ],
              ),
          ],
          const SizedBox(height: DesignTokens.space5),
          Divider(height: 1, color: theme.divider),
        ],
      ),
    );
  }

  Widget _vazia(ThemeData theme, Lista lista) {
    if (_dono) {
      return Padding(
        padding: const EdgeInsets.only(top: DesignTokens.space8),
        child: EstadoVazio(
          icone: PhosphorIconsRegular.listPlus,
          solto: true,
          titulo: 'Esta lista ainda está vazia',
          texto: 'Abra a página de um livro e escolha Adicionar à lista no menu de ações.',
          rodape: widget.aoBuscarLivros == null
              ? null
              : BotaoPrimario(
                  texto: 'Buscar livros',
                  larguraTotal: false,
                  onPressed: widget.aoBuscarLivros,
                ),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.only(top: DesignTokens.space5),
      child: Text(
        '${primeiroNome(lista.dono.nomeExibicao)} ainda não adicionou livros a esta lista.',
        style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
      ),
    );
  }

  /// Linha de livro (§4 "Linha de livro"): posição, capa, título e autor; à direita, o menu do
  /// dono, a alça no modo de reordenação ou o `CaretRight` de quem só lê. A linha inteira, fora
  /// do menu e da alça, abre o livro, menos no modo de reordenação.
  Widget _linha(ThemeData theme, ItemDeLista item, int indice, {bool levantada = false}) {
    final livro = item.livro;
    final Widget direita;
    if (!_dono) {
      direita = Icon(PhosphorIconsRegular.caretRight, size: 20, color: theme.secondaryText);
    } else if (_reordenando) {
      direita = ReorderableDragStartListener(
        index: indice,
        child: Semantics(
          button: true,
          label: 'Mudar a posição de ${livro.titulo}',
          excludeSemantics: true,
          child: SizedBox(
            width: 48,
            height: 48,
            child: Icon(
              PhosphorIconsRegular.dotsSixVertical,
              size: 24,
              color: levantada ? theme.primaryAccent : theme.secondaryText,
            ),
          ),
        ),
      );
    } else {
      direita = Semantics(
        button: true,
        label: 'Ações de ${livro.titulo}',
        excludeSemantics: true,
        child: InkWell(
          onTap: () => _abrirMenu(item),
          customBorder: const CircleBorder(),
          child: SizedBox(
            width: 48,
            height: 48,
            child: Icon(PhosphorIconsRegular.dotsThree, size: 24, color: theme.secondaryText),
          ),
        ),
      );
    }

    final conteudo = Row(
      children: <Widget>[
        SizedBox(
          width: 24,
          child: Text(
            '${item.posicao}',
            textAlign: TextAlign.right,
            style: theme.numInline.copyWith(color: theme.secondaryText),
          ),
        ),
        const SizedBox(width: DesignTokens.space3),
        CapaDeItem(url: livro.capaUrl, titulo: livro.titulo, pessoal: livro.pessoal),
        const SizedBox(width: DesignTokens.space4),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                livro.titulo,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleMedium,
              ),
              if (livro.autor != null)
                Text(
                  livro.autor!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                ),
            ],
          ),
        ),
      ],
    );

    return DecoratedBox(
      decoration: BoxDecoration(
        border: levantada ? null : Border(bottom: BorderSide(color: theme.divider)),
      ),
      child: Padding(
        padding: const EdgeInsets.only(left: DesignTokens.space5, right: DesignTokens.space2),
        child: Row(
          children: <Widget>[
            Expanded(
              child: _reordenando
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: DesignTokens.space4),
                      child: conteudo,
                    )
                  : Semantics(
                      button: true,
                      child: InkWell(
                        onTap: () => widget.aoAbrirLivro(livro, _dono),
                        splashFactory: NoSplash.splashFactory,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: DesignTokens.space4),
                          child: conteudo,
                        ),
                      ),
                    ),
            ),
            direita,
          ],
        ),
      ),
    );
  }
}

/// Skeleton estático (§4.8): o bloco da lista e cinco linhas. Também é o estado do cold start.
class _SkeletonDaLista extends StatelessWidget {
  const _SkeletonDaLista();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget peca(double largura, double altura) => Container(
      width: largura,
      height: altura,
      decoration: BoxDecoration(
        color: theme.coverPlaceholder,
        borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
      ),
    );
    Widget barra(double altura, double fracao) => FractionallySizedBox(
      widthFactor: fracao,
      alignment: Alignment.centerLeft,
      child: peca(double.infinity, altura),
    );
    return ExcludeSemantics(
      child: SingleChildScrollView(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(
          DesignTokens.space5,
          DesignTokens.space2,
          DesignTokens.space5,
          0,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            barra(24, 0.70),
            const SizedBox(height: DesignTokens.space3),
            barra(15, 0.90),
            const SizedBox(height: DesignTokens.space2),
            barra(15, 0.60),
            const SizedBox(height: DesignTokens.space3),
            barra(13, 0.50),
            const SizedBox(height: DesignTokens.space5),
            for (var i = 0; i < 5; i++)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: DesignTokens.space4),
                child: Row(
                  children: <Widget>[
                    peca(16, 16),
                    const SizedBox(width: DesignTokens.space3),
                    Container(width: 48, height: 72, color: theme.coverPlaceholder),
                    const SizedBox(width: DesignTokens.space4),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          barra(17, 0.70),
                          const SizedBox(height: DesignTokens.space2),
                          barra(13, 0.45),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
