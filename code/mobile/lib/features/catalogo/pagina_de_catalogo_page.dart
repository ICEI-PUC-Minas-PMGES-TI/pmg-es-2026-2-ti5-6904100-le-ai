import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/entrada_suave.dart';
import '../../design/widgets/estado_vazio.dart';
import '../descobrir/widgets_da_busca.dart';
import '../livros/acervo_service.dart';
import '../livros/livro_oficial.dart';
import 'catalogo_controller.dart';

/// Páginas de autor, editora e série (RF-ACV-10/11/12, F-ACV-DESCOBERTA), a partir dos protótipos
/// `pagina-do-autor.html`, `pagina-da-editora.html` e `pagina-da-serie.html`: o mesmo esqueleto,
/// que **não é perfil** (sem seguir, compartilhar nem conteúdo de usuário).
///
/// - Header com a seta e o **tipo** (`Autor`, `Editora`, `Série`); o nome vem logo abaixo, como
///   cabeçalho da tela para o leitor de tela.
/// - `N livros no acervo` conta edições (`livros.totalItens`). Sem livros, a contagem some.
/// - Autor: `Biografia` só quando a OpenLibrary tem uma, com `Fonte: OpenLibrary`.
/// - Série: `de <autores>` com um link por autor, `Livro N` em cada card e os sem número no fim.
/// - Livros por rolagem infinita, sem `Carregar mais`; a falha da página seguinte mantém os já
///   carregados e oferece `Tentar de novo`.
class PaginaDeCatalogoPage extends StatefulWidget {
  final AcervoService servico;
  final TipoDeCatalogo tipo;
  final String id;
  final VoidCallback aoVoltar;
  final ValueChanged<String> aoAbrirLivro;
  final ValueChanged<String> aoAbrirAutor;
  final VoidCallback aoBuscarNoDescobrir;

  const PaginaDeCatalogoPage({
    super.key,
    required this.servico,
    required this.tipo,
    required this.id,
    required this.aoVoltar,
    required this.aoAbrirLivro,
    required this.aoAbrirAutor,
    required this.aoBuscarNoDescobrir,
  });

  @override
  State<PaginaDeCatalogoPage> createState() => _PaginaDeCatalogoPageState();
}

class _PaginaDeCatalogoPageState extends State<PaginaDeCatalogoPage> {
  late final CatalogoController _catalogo = CatalogoController(
    widget.servico,
    widget.tipo,
    widget.id,
  );
  final _rolagem = ScrollController();
  bool _cargaAgendada = false;

  String get _rotulo => switch (widget.tipo) {
    TipoDeCatalogo.autor => 'Autor',
    TipoDeCatalogo.editora => 'Editora',
    TipoDeCatalogo.serie => 'Série',
  };

  @override
  void initState() {
    super.initState();
    _catalogo.carregar();
  }

  @override
  void dispose() {
    _catalogo.dispose();
    _rolagem.dispose();
    super.dispose();
  }

  bool _pertoDoFim(ScrollNotification notificacao) {
    _talvezCarregarMais(notificacao.metrics);
    return false;
  }

  /// Pede a página seguinte a menos de 300px do fim, depois do quadro (como no Descobrir). Depois
  /// de uma falha, só o botão tenta de novo, para não pedir em laço.
  void _talvezCarregarMais(ScrollMetrics metricas) {
    if (metricas.extentAfter >= 300 ||
        _cargaAgendada ||
        !_catalogo.temMais ||
        _catalogo.carregandoMais ||
        _catalogo.falhouMais) {
      return;
    }
    _cargaAgendada = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _cargaAgendada = false;
      if (mounted) {
        _catalogo.carregarMais();
      }
    });
    WidgetsBinding.instance.ensureVisualUpdate();
  }

  /// Lista que não enche a tela não rola, e sem rolagem não há notificação.
  void _conferirFimVisivel() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _rolagem.hasClients) {
        _talvezCarregarMais(_rolagem.position);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        CabecalhoTela(titulo: _rotulo, aoVoltar: widget.aoVoltar, semDivisor: true),
        Expanded(
          child: ListenableBuilder(
            listenable: _catalogo,
            builder: (context, _) => _conteudo(Theme.of(context)),
          ),
        ),
      ],
    );
  }

  Widget _conteudo(ThemeData theme) {
    switch (_catalogo.estado) {
      case EstadoDoCatalogo.carregando:
        return EntradaSuave(child: _carregando(theme));
      case EstadoDoCatalogo.erro:
        return _Aviso(
          icone: PhosphorIconsRegular.warning,
          corDoIcone: theme.colorScheme.error,
          titulo: 'Não foi possível abrir esta página',
          texto: 'A conexão falhou antes de carregar os dados. Tente de novo em alguns instantes.',
          acao: BotaoPrimario(
            texto: 'Tentar de novo',
            larguraTotal: false,
            onPressed: _catalogo.carregar,
          ),
        );
      case EstadoDoCatalogo.naoEncontrada:
        return _Aviso(
          icone: PhosphorIconsRegular.bookOpen,
          corDoIcone: theme.tertiaryText,
          titulo: 'Não encontramos esta página',
          texto: 'Ela pode ter saído do acervo. Volte e busque de novo.',
          acao: BotaoTextual(texto: 'Voltar', onPressed: widget.aoVoltar),
        );
      case EstadoDoCatalogo.pronta:
        return _pronta(theme, _catalogo.pagina!);
    }
  }

  /// Identidade em skeleton, o título `Livros` real e quatro cards em skeleton.
  Widget _carregando(ThemeData theme) {
    Widget barra(double fator, double altura) => FractionallySizedBox(
      alignment: AlignmentDirectional.centerStart,
      widthFactor: fator,
      child: Container(
        height: altura,
        decoration: BoxDecoration(
          color: theme.coverPlaceholder,
          borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        ),
      ),
    );
    return ListView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        DesignTokens.space2,
        DesignTokens.space5,
        DesignTokens.space5,
      ),
      children: <Widget>[
        ExcludeSemantics(child: barra(0.6, 28)),
        const SizedBox(height: DesignTokens.space2),
        ExcludeSemantics(child: barra(0.35, 15)),
        const SizedBox(height: DesignTokens.space6),
        Text('Livros', style: theme.textTheme.titleLarge),
        if (_catalogo.coldStart) ...<Widget>[
          const SizedBox(height: DesignTokens.space2),
          Semantics(
            liveRegion: true,
            child: Text(
              'O servidor está iniciando. Isso pode levar alguns segundos.',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
            ),
          ),
        ],
        for (var i = 0; i < 4; i++) ...<Widget>[
          if (i > 0) Divider(height: 1, thickness: 1, color: theme.divider),
          const SkeletonDeCardDeLivro(),
        ],
      ],
    );
  }

  Widget _pronta(ThemeData theme, PaginaDeCatalogo pagina) {
    final semLivros = _catalogo.livros.isEmpty;
    final total = _catalogo.totalItens;
    final biografia = widget.tipo == TipoDeCatalogo.autor ? pagina.biografia : null;
    final autoresDaSerie = widget.tipo == TipoDeCatalogo.serie && !semLivros
        ? pagina.autores
        : const <AutorResumo>[];
    if (!semLivros) {
      _conferirFimVisivel();
    }

    final cabecalho = <Widget>[
      Semantics(
        header: true,
        child: Text(
          pagina.nome,
          style: theme.textTheme.titleLarge,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      if (autoresDaSerie.isNotEmpty) ...<Widget>[
        const SizedBox(height: DesignTokens.space1),
        _Autoria(autores: autoresDaSerie, aoAbrirAutor: widget.aoAbrirAutor),
      ],
      if (!semLivros) ...<Widget>[
        const SizedBox(height: DesignTokens.space1),
        Text(
          total == 1 ? '1 livro no acervo' : '$total livros no acervo',
          style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
        ),
      ],
      if (biografia != null) ...<Widget>[
        const SizedBox(height: DesignTokens.space6),
        EntradaSuave(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Semantics(header: true, child: Text('Biografia', style: theme.textTheme.titleLarge)),
              const SizedBox(height: DesignTokens.space3),
              Text(biografia, style: theme.textTheme.bodyMedium),
              const SizedBox(height: DesignTokens.space2),
              Text(
                'Fonte: OpenLibrary',
                style: theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText),
              ),
            ],
          ),
        ),
      ],
      const SizedBox(height: DesignTokens.space6),
      Semantics(header: true, child: Text('Livros', style: theme.textTheme.titleLarge)),
    ];

    if (semLivros) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(
          DesignTokens.space5,
          DesignTokens.space2,
          DesignTokens.space5,
          DesignTokens.space5,
        ),
        children: <Widget>[
          ...cabecalho,
          const SizedBox(height: DesignTokens.space10),
          EstadoVazio(
            icone: PhosphorIconsRegular.books,
            solto: true,
            titulo: 'Nenhum livro no acervo',
            texto: 'Os livros de ${pagina.nome} não estão no acervo no momento.',
            rodape: BotaoTextual(
              texto: 'Buscar no Descobrir',
              onPressed: widget.aoBuscarNoDescobrir,
            ),
          ),
        ],
      );
    }

    final itens = <Widget>[
      ...cabecalho,
      for (final (indice, item) in _catalogo.grupos.indexed) ...<Widget>[
        if (indice > 0) Divider(height: 1, thickness: 1, color: theme.divider),
        CardDeLivroBusca(
          key: ValueKey<String>(item.grupo.principal.id),
          grupo: item.grupo,
          numeroNaSerie: item.numero,
          aoAbrir: widget.aoAbrirLivro,
        ),
      ],
      if (_catalogo.semNumero.isNotEmpty) ...<Widget>[
        const SizedBox(height: DesignTokens.space6),
        Semantics(
          header: true,
          child: Text(
            'Sem número na série',
            style: theme.textTheme.labelMedium?.copyWith(color: theme.secondaryText),
          ),
        ),
        for (final (indice, item) in _catalogo.semNumero.indexed) ...<Widget>[
          if (indice > 0) Divider(height: 1, thickness: 1, color: theme.divider),
          CardDeLivroBusca(
            key: ValueKey<String>(item.grupo.principal.id),
            grupo: item.grupo,
            aoAbrir: widget.aoAbrirLivro,
          ),
        ],
      ],
      _rodape(),
    ];

    return NotificationListener<ScrollNotification>(
      onNotification: _pertoDoFim,
      child: ListView(
        controller: _rolagem,
        padding: const EdgeInsets.fromLTRB(
          DesignTokens.space5,
          DesignTokens.space2,
          DesignTokens.space5,
          DesignTokens.space5,
        ),
        children: itens,
      ),
    );
  }

  /// Carregando mais: dois cards em skeleton. Falha: banner com `Tentar de novo`.
  Widget _rodape() {
    if (_catalogo.carregandoMais) {
      return const Column(children: <Widget>[SkeletonDeCardDeLivro(), SkeletonDeCardDeLivro()]);
    }
    if (_catalogo.falhouMais) {
      return Padding(
        padding: const EdgeInsets.only(top: DesignTokens.space4),
        child: BannerAviso(
          variante: VarianteAviso.erro,
          triangulo: true,
          mensagem: 'Não foi possível carregar mais livros. Verifique sua conexão e tente de novo.',
          acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _catalogo.carregarMais),
        ),
      );
    }
    return const SizedBox.shrink();
  }
}

/// `de Erico Verissimo` em `musgo`, cada nome levando à página do autor.
class _Autoria extends StatelessWidget {
  final List<AutorResumo> autores;
  final ValueChanged<String> aoAbrirAutor;

  const _Autoria({required this.autores, required this.aoAbrirAutor});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final estilo = theme.textTheme.bodyMedium?.copyWith(color: theme.primaryAccent);
    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      children: <Widget>[
        Text('de ', style: estilo),
        for (final (indice, autor) in autores.indexed)
          Semantics(
            container: true,
            link: true,
            label: autor.nome,
            excludeSemantics: true,
            onTap: () => aoAbrirAutor(autor.id),
            child: GestureDetector(
              onTap: () => aoAbrirAutor(autor.id),
              behavior: HitTestBehavior.opaque,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 48),
                child: Align(
                  widthFactor: 1,
                  child: Text(
                    indice < autores.length - 1 ? '${autor.nome}, ' : autor.nome,
                    style: estilo,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Erro e "não encontrada" da página inteira, centrados no espaço que sobra.
class _Aviso extends StatelessWidget {
  final IconData icone;
  final Color corDoIcone;
  final String titulo;
  final String texto;
  final Widget acao;

  const _Aviso({
    required this.icone,
    required this.corDoIcone,
    required this.titulo,
    required this.texto,
    required this.acao,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return LayoutBuilder(
      builder: (context, limites) => SingleChildScrollView(
        padding: const EdgeInsets.all(DesignTokens.space5),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minHeight: (limites.maxHeight - 2 * DesignTokens.space5).clamp(0, double.infinity),
          ),
          child: Center(
            child: Semantics(
              liveRegion: true,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  ExcludeSemantics(child: Icon(icone, size: 32, color: corDoIcone)),
                  const SizedBox(height: DesignTokens.space5),
                  Text(titulo, textAlign: TextAlign.center, style: theme.textTheme.titleLarge),
                  const SizedBox(height: DesignTokens.space5),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 300),
                    child: Text(
                      texto,
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                    ),
                  ),
                  const SizedBox(height: DesignTokens.space5),
                  acao,
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
