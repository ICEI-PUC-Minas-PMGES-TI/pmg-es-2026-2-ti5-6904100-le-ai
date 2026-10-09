import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bloco_de_spoiler.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/entrada_suave.dart';
import '../../design/widgets/folha_inferior.dart';
import '../listas/folha_adicionar_a_lista.dart';
import '../listas/lista_form_page.dart';
import '../listas/rotas_listas.dart';
import '../avaliacao/avaliacao_controller.dart';
import '../avaliacao/bloco_sua_avaliacao.dart';
import '../avaliacao/escrever_resenha_page.dart';
import '../avaliacao/leitura_service.dart';
import '../avaliacao/painel_de_nota.dart';
import '../avaliacao/adicionar_frase.dart';
import '../avaliacao/reacoes_da_resenha.dart';
import '../avaliacao/secao_frases.dart';
import '../estante/estante_service.dart';
import '../estante/situacao_na_estante.dart';
import '../perfil/widgets_de_perfil.dart';
import '../progresso/rotas_progresso.dart';
import 'acervo_service.dart';
import 'formatos.dart';
import 'livro_oficial.dart';
import 'livro_oficial_controller.dart';

/// Página do livro oficial (RF-ACV-04, RF-ACV-18, RF-ACV-19), a partir do protótipo
/// `pagina-do-livro.html`.
///
/// - O header não repete o título: ele aparece grande no hero.
/// - A página abre inteira e utilizável enquanto a sinopse chega (RN-19.5); só a seção dela fica
///   em skeleton. Ausência é estado válido e aparece como texto neutro, nunca como erro.
/// - "Sua avaliação" (F-AVA) fica entre o hero e a sinopse e carrega à parte, no `leitura`: se ele
///   estiver lento, a página abre igual.
/// - A situação na estante (F-EST) e o progresso (F-PRG) ficam logo abaixo do hero, com um único
///   botão principal por situação.
/// - Resenhas de outros leitores, filtradas por RN-08 no servidor. O texto de spoiler só entra na
///   árvore depois de revelado.
/// - F-ACV-DESCOBERTA: na ficha, autor, editora e série levam às páginas de catálogo (o número da
///   série fica fora do link), e `Assuntos`, depois da sinopse, leva ao Descobrir filtrado. O
///   autor do hero não vira link.
class LivroOficialPage extends StatefulWidget {
  final AcervoService servico;
  final LeituraService leitura;
  final String livroId;
  final VoidCallback aoVoltar;
  final EstanteService? estante;
  final DependenciasDeProgresso? progresso;
  final ValueChanged<String>? aoVerAtualizacoes;

  /// Menu `Mais ações` do header com `Adicionar à lista` (pagina-do-livro.md P2 §4 A e §5.1,
  /// F-LST). `Recomendar a um leitor` (F-REC-P2P) entra acrescentando um item em `_abrirMenu`.
  final DependenciasDeListas? listas;

  /// Páginas de autor, editora e série e a busca por assunto (F-ACV-DESCOBERTA). Sem elas, a
  /// ficha mostra os valores como texto e os assuntos não reagem ao toque.
  final ValueChanged<String>? aoAbrirAutor;
  final ValueChanged<String>? aoAbrirEditora;
  final ValueChanged<String>? aoAbrirSerie;
  final ValueChanged<String>? aoBuscarAssunto;

  /// `Ver todas as frases` (F-AVA-2). Sem ele, a seção de frases mostra só as três mais recentes.
  final VoidCallback? aoVerFrases;

  const LivroOficialPage({
    super.key,
    required this.servico,
    required this.leitura,
    required this.livroId,
    required this.aoVoltar,
    this.estante,
    this.progresso,
    this.aoVerAtualizacoes,
    this.listas,
    this.aoAbrirAutor,
    this.aoAbrirEditora,
    this.aoAbrirSerie,
    this.aoBuscarAssunto,
    this.aoVerFrases,
  });

  @override
  State<LivroOficialPage> createState() => _LivroOficialPageState();
}

class _LivroOficialPageState extends State<LivroOficialPage> {
  late final LivroOficialController _pagina = LivroOficialController(
    widget.servico,
    widget.livroId,
  );

  late final AvaliacaoController _avaliacao = AvaliacaoController(widget.leitura, widget.livroId);

  @override
  void initState() {
    super.initState();
    _pagina.carregar();
    _avaliacao.carregar();
  }

  @override
  void dispose() {
    _pagina.dispose();
    _avaliacao.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        // Sem divisor: com a página no topo o protótipo não tem linha, e o header não acompanha
        // a rolagem para desenhá-la depois (a mesma simplificação do resto do app). O menu age
        // sobre o livro e só aparece quando ele carrega.
        ListenableBuilder(
          listenable: _pagina,
          builder: (context, _) {
            final livro = _pagina.livro;
            return CabecalhoTela(
              titulo: '',
              aoVoltar: widget.aoVoltar,
              semDivisor: true,
              acoes: <Widget>[
                if (widget.listas != null &&
                    _pagina.estado == EstadoDaPagina.pronta &&
                    livro != null)
                  Semantics(
                    button: true,
                    label: 'Mais ações',
                    excludeSemantics: true,
                    child: GestureDetector(
                      onTap: () => _abrirMenu(livro.resumo),
                      behavior: HitTestBehavior.opaque,
                      child: SizedBox(
                        width: 48,
                        height: 48,
                        child: Icon(
                          PhosphorIconsRegular.dotsThree,
                          size: 24,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
        Expanded(
          child: ListenableBuilder(
            listenable: _pagina,
            builder: (context, _) => _conteudo(Theme.of(context)),
          ),
        ),
      ],
    );
  }

  /// Menu `Mais ações` (§5.1): card compacto do livro e os itens, sem destrutivo.
  Future<void> _abrirMenu(LivroOficialResumo livro) async {
    final listas = widget.listas;
    if (listas == null) {
      return;
    }
    final escolha = await mostrarFolhaInferior<String>(
      Navigator.of(context, rootNavigator: true).context,
      builder: (context) {
        final theme = Theme.of(context);
        return SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  CapaLivro(url: livro.capaUrl, largura: 60, altura: 90, titulo: livro.titulo),
                  const SizedBox(width: DesignTokens.space4),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(livro.titulo, style: theme.textTheme.titleMedium),
                        if (livro.autoresParaExibir case final autores?)
                          Text(
                            autores,
                            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: DesignTokens.space4),
              Divider(height: 1, color: theme.divider),
              Semantics(
                button: true,
                child: InkWell(
                  onTap: () => Navigator.of(context).pop('lista'),
                  child: SizedBox(
                    height: 56,
                    child: Row(
                      children: <Widget>[
                        Icon(
                          PhosphorIconsRegular.listPlus,
                          size: 20,
                          color: theme.colorScheme.onSurface,
                        ),
                        const SizedBox(width: DesignTokens.space4),
                        Text('Adicionar à lista', style: theme.textTheme.bodyMedium),
                      ],
                    ),
                  ),
                ),
              ),
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
    if (escolha != 'lista' || !mounted) {
      return;
    }
    await abrirAdicionarALista(
      context,
      servico: listas.servico,
      livro: LivroDeOrigem(
        id: livro.id,
        titulo: livro.titulo,
        autor: livro.autoresParaExibir,
        capaUrl: livro.capaUrl,
        pessoal: false,
      ),
      obterPrivacidade: listas.minhaPrivacidade,
      aoVerLista: (id) => GoRouter.maybeOf(context)?.go(rotaMinhaLista(id)),
    );
  }

  Widget _conteudo(ThemeData theme) {
    switch (_pagina.estado) {
      case EstadoDaPagina.carregando:
        return EntradaSuave(child: _SkeletonDaPagina(coldStart: _pagina.coldStart));
      case EstadoDaPagina.erro:
        return _Aviso(
          icone: PhosphorIconsRegular.warning,
          corDoIcone: theme.colorScheme.error,
          titulo: 'Não foi possível abrir este livro',
          texto:
              _pagina.mensagemDoErro ??
              'A conexão falhou antes de carregar os dados. Tente de novo em alguns instantes.',
          acao: BotaoPrimario(texto: 'Tentar de novo', onPressed: _pagina.carregar),
        );
      case EstadoDaPagina.naoEncontrada:
        return _Aviso(
          icone: PhosphorIconsRegular.bookOpen,
          corDoIcone: theme.tertiaryText,
          titulo: 'Não encontramos este livro',
          texto: 'Ele pode ter saído do acervo. Volte e busque de novo.',
          acao: BotaoTextual(texto: 'Voltar', onPressed: widget.aoVoltar),
        );
      case EstadoDaPagina.pronta:
        return _pronta(theme, _pagina.livro!);
    }
  }

  Widget _pronta(ThemeData theme, LivroOficialDetalhe livro) {
    // Página de detalhe com poucas seções: constrói tudo de uma vez, sem a lista preguiçosa.
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        DesignTokens.space2,
        DesignTokens.space5,
        DesignTokens.space8,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          _Hero(livro: livro.resumo),
          if (widget.estante != null) ...<Widget>[
            const SizedBox(height: DesignTokens.space6),
            SituacaoNaEstante(
              servico: widget.estante!,
              livroId: widget.livroId,
              livro: LivroDaEstante(
                titulo: livro.resumo.titulo,
                autor: livro.resumo.autoresParaExibir,
                capaUrl: livro.resumo.capaUrl,
              ),
              progresso: widget.progresso,
              aoVerAtualizacoes: widget.aoVerAtualizacoes,
            ),
          ],
          const SizedBox(height: DesignTokens.space8),
          BlocoSuaAvaliacao(avaliacao: _avaliacao, livro: _livroAvaliado(livro)),
          const SizedBox(height: DesignTokens.space6),
          _Secao(titulo: 'Sinopse', child: _sinopse(theme)),
          if (livro.resumo.assuntos.isNotEmpty) ...<Widget>[
            const SizedBox(height: DesignTokens.space6),
            _Secao(
              titulo: 'Assuntos',
              child: _Assuntos(assuntos: livro.resumo.assuntos, aoBuscar: widget.aoBuscarAssunto),
            ),
          ],
          const SizedBox(height: DesignTokens.space6),
          _Secao(
            titulo: 'Ficha',
            child: _Ficha(
              livro: livro,
              aoAbrirAutor: widget.aoAbrirAutor,
              aoAbrirEditora: widget.aoAbrirEditora,
              aoAbrirSerie: widget.aoAbrirSerie,
            ),
          ),
          const SizedBox(height: DesignTokens.space6),
          _resenhas(theme),
          // F-AVA-2: frases e trechos, depois das resenhas (pagina-do-livro.md §5.4).
          const SizedBox(height: DesignTokens.space6),
          SecaoFrases(
            leitura: widget.leitura,
            livro: LivroDaFrase(
              id: livro.resumo.id,
              titulo: livro.resumo.titulo,
              autor: livro.resumo.autoresParaExibir,
              capaUrl: livro.resumo.capaUrl,
              paginas: livro.resumo.paginas,
            ),
            aoVerTodas: widget.aoVerFrases,
          ),
        ],
      ),
    );
  }

  LivroAvaliado _livroAvaliado(LivroOficialDetalhe livro) => LivroAvaliado(
    titulo: livro.resumo.titulo,
    autor: livro.resumo.autoresParaExibir,
    capaUrl: livro.resumo.capaUrl,
  );

  Widget _sinopse(ThemeData theme) {
    final sinopse = _pagina.sinopse;
    final neutro = theme.textTheme.bodyMedium?.copyWith(color: theme.tertiaryText);
    // Só a ausência usa o terciário (design): ela não pede nada ao leitor. Os outros avisos dizem o
    // que fazer, e precisam do contraste AA do secundário.
    final aviso = theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText);
    switch (sinopse.status) {
      case StatusDaSinopse.disponivel:
        return Text(sinopse.texto ?? '', style: theme.editorialBody);
      case StatusDaSinopse.ausente:
        return Text('Este livro ainda não tem sinopse no acervo.', style: neutro);
      case StatusDaSinopse.falhaTransitoria:
        return Text(
          'Não conseguimos buscar a sinopse agora. Ela deve aparecer numa próxima visita.',
          style: aviso,
        );
      case StatusDaSinopse.pendente:
      case StatusDaSinopse.naoConsultada:
        if (_pagina.sinopseDemorou) {
          return Text('A sinopse ainda está a caminho. Volte daqui a pouco.', style: aviso);
        }
        return const EntradaSuave(child: _SkeletonDaSinopse());
    }
  }

  Widget _resenhas(ThemeData theme) {
    final resenhas = _pagina.resenhas;
    final vazia = resenhas.isEmpty && !_pagina.resenhasIndisponiveis;
    final secundario = theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText);
    // Sem `liveRegion` na seção: ela fundia as resenhas num nó só, lido inteiro ao abrir e a cada
    // página nova. Só os avisos de falha são anunciados.
    return Semantics(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          // `Wrap`, não `Row`: com fonte ampliada o rótulo desce em vez de estourar a linha.
          Wrap(
            spacing: DesignTokens.space3,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: <Widget>[
              Text('Resenhas', style: theme.textTheme.headlineSmall),
              if (vazia)
                Text(
                  'Nenhuma resenha ainda',
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                ),
            ],
          ),
          const SizedBox(height: DesignTokens.space4),
          if (_pagina.resenhasIndisponiveis) ...<Widget>[
            Semantics(
              liveRegion: true,
              child: Text('Não foi possível carregar as resenhas.', style: secundario),
            ),
            BotaoTextual(
              texto: 'Tentar de novo',
              onPressed: _pagina.carregandoResenhas ? null : _pagina.carregarResenhas,
            ),
          ] else if (vazia) ...<Widget>[
            // A lista é filtrada por RN-08: "sem resenhas" pode ser "nenhuma para você".
            Text('Ninguém que você segue escreveu sobre este livro.', style: secundario),
            // Só para quem ainda não escreveu: a resenha própria fica em "Sua avaliação".
            ListenableBuilder(
              listenable: _avaliacao,
              builder: (context, _) =>
                  _avaliacao.estado == EstadoDaAvaliacao.pronta && _avaliacao.resenha == null
                  ? BotaoTextual(
                      texto: 'Escrever a primeira',
                      onPressed: () => abrirEditorDeResenha(
                        context,
                        avaliacao: _avaliacao,
                        livro: _livroAvaliado(_pagina.livro!),
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          ] else ...<Widget>[
            for (final (indice, resenha) in resenhas.indexed) ...<Widget>[
              if (indice > 0) const SizedBox(height: DesignTokens.space6),
              _Resenha(key: ValueKey<String>(resenha.id), resenha: resenha, leitura: widget.leitura),
            ],
            if (_pagina.falhouMaisResenhas) ...<Widget>[
              const SizedBox(height: DesignTokens.space4),
              Semantics(
                liveRegion: true,
                child: Text(
                  'Não foi possível carregar mais resenhas. Verifique sua conexão.',
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                ),
              ),
            ],
            if (_pagina.temMaisResenhas) ...<Widget>[
              SizedBox(
                height: _pagina.falhouMaisResenhas ? DesignTokens.space1 : DesignTokens.space4,
              ),
              BotaoTextual(
                texto: _pagina.falhouMaisResenhas ? 'Tentar de novo' : 'Ver todas as resenhas',
                onPressed: _pagina.carregandoResenhas ? null : _pagina.carregarResenhas,
              ),
            ],
          ],
        ],
      ),
    );
  }
}

/// `Todavia · 2019 · 264 páginas`: só o que existe.
String metadadosDoLivro(LivroOficialResumo livro) => <String>[
  ?livro.editora,
  if (livro.anoPublicacao != null) '${livro.anoPublicacao}',
  formatarPaginas(livro.paginas),
].join(' · ');

class _Hero extends StatelessWidget {
  final LivroOficialResumo livro;

  const _Hero({required this.livro});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final autores = livro.autoresParaExibir;
    return LayoutBuilder(
      builder: (context, limites) {
        // Capa a 40% da largura, na proporção 2:3 (pagina-do-livro.md §4.1).
        final largura = limites.maxWidth * 0.4;
        return Column(
          children: <Widget>[
            DecoratedBox(
              decoration: BoxDecoration(boxShadow: theme.elevation2),
              child: CapaLivro(
                url: livro.capaUrl,
                largura: largura,
                altura: largura * 1.5,
                titulo: livro.titulo,
                autor: autores,
              ),
            ),
            const SizedBox(height: DesignTokens.space5),
            Text(livro.titulo, textAlign: TextAlign.center, style: theme.displayTitle),
            if (autores != null) ...<Widget>[
              const SizedBox(height: DesignTokens.space2),
              Text(
                autores,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
              ),
            ],
            const SizedBox(height: DesignTokens.space1),
            Text(
              metadadosDoLivro(livro),
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText),
            ),
          ],
        );
      },
    );
  }
}

class _Secao extends StatelessWidget {
  final String titulo;
  final Widget child;

  const _Secao({required this.titulo, required this.child});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(titulo, style: theme.textTheme.headlineSmall),
        const SizedBox(height: DesignTokens.space3),
        child,
      ],
    );
  }
}

/// Ficha em rótulo e valor. Autor, editora e série levam às páginas de catálogo
/// (`pagina-do-livro.md` do P2): valor em `musgo` peso 600 com `CaretRight`, e a linha inteira
/// como alvo quando há um link só. Com coautoria, cada nome é o seu alvo. O `volume N` da série
/// fica fora do link. Autor, editora e série que faltam somem, em vez de aparecerem vazios.
class _Ficha extends StatelessWidget {
  final LivroOficialDetalhe livro;
  final ValueChanged<String>? aoAbrirAutor;
  final ValueChanged<String>? aoAbrirEditora;
  final ValueChanged<String>? aoAbrirSerie;

  const _Ficha({required this.livro, this.aoAbrirAutor, this.aoAbrirEditora, this.aoAbrirSerie});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final autores = livro.resumo.autores;
    final editora = livro.resumo.editora;
    final editoraId = livro.editoraId;
    final serie = livro.serie;
    final linhas = <_LinhaDaFicha>[
      if (autores.isNotEmpty)
        _LinhaDaFicha(
          autores.length > 1 ? 'Autores' : 'Autor',
          links: <(String, VoidCallback?)>[
            for (final autor in autores)
              (autor.nome, aoAbrirAutor == null ? null : () => aoAbrirAutor!(autor.id)),
          ],
        ),
      if (editora != null)
        _LinhaDaFicha(
          'Editora',
          links: <(String, VoidCallback?)>[
            (
              editora,
              editoraId == null || aoAbrirEditora == null ? null : () => aoAbrirEditora!(editoraId),
            ),
          ],
        ),
      if (serie != null)
        _LinhaDaFicha(
          'Série',
          links: <(String, VoidCallback?)>[
            (serie.nome, aoAbrirSerie == null ? null : () => aoAbrirSerie!(serie.id)),
          ],
          complemento: serie.numero == null ? null : 'volume ${serie.numero}',
        ),
      _LinhaDaFicha('ISBN', links: <(String, VoidCallback?)>[(livro.isbn, null)]),
    ];
    return Column(
      children: <Widget>[
        for (final (indice, linha) in linhas.indexed) ...<Widget>[
          if (indice > 0) Divider(height: 1, thickness: 1, color: theme.divider),
          _linha(theme, linha),
        ],
      ],
    );
  }

  Widget _linha(ThemeData theme, _LinhaDaFicha linha) {
    final unico = linha.links.length == 1 ? linha.links.single.$2 : null;
    final conteudo = ConstrainedBox(
      constraints: BoxConstraints(minHeight: unico == null ? 0 : 48),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: DesignTokens.space3),
        child: Row(
          crossAxisAlignment: unico == null ? CrossAxisAlignment.start : CrossAxisAlignment.center,
          children: <Widget>[
            Text(linha.rotulo, style: theme.textTheme.labelMedium),
            const SizedBox(width: DesignTokens.space4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: <Widget>[
                  for (final (texto, aoTocar) in linha.links)
                    _valor(theme, texto, linha.links.length > 1 ? aoTocar : null, aoTocar != null),
                  if (linha.complemento != null)
                    Text(
                      linha.complemento!,
                      textAlign: TextAlign.right,
                      style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
    if (unico == null) {
      return conteudo;
    }
    final (texto, _) = linha.links.single;
    return Semantics(
      link: true,
      label: '${linha.rotulo}: $texto',
      excludeSemantics: linha.complemento == null,
      onTap: unico,
      child: InkWell(onTap: unico, splashFactory: NoSplash.splashFactory, child: conteudo),
    );
  }

  /// Valor de link em `musgo` com `CaretRight`; com [aoTocar], o próprio valor é o alvo (coautoria).
  Widget _valor(ThemeData theme, String texto, VoidCallback? aoTocar, bool link) {
    if (!link) {
      return Text(texto, textAlign: TextAlign.right, style: theme.textTheme.bodyMedium);
    }
    final valor = Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Flexible(
          child: Text(
            texto,
            textAlign: TextAlign.right,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.primaryAccent,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(width: DesignTokens.space1),
        Icon(PhosphorIconsRegular.caretRight, size: 16, color: theme.primaryAccent),
      ],
    );
    if (aoTocar == null) {
      return valor;
    }
    return Semantics(
      link: true,
      label: texto,
      excludeSemantics: true,
      onTap: aoTocar,
      child: GestureDetector(
        onTap: aoTocar,
        behavior: HitTestBehavior.opaque,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Align(alignment: AlignmentDirectional.centerEnd, widthFactor: 1, child: valor),
        ),
      ),
    );
  }
}

class _LinhaDaFicha {
  final String rotulo;

  /// Texto e ação; ação nula é texto puro (ISBN, editora sem página).
  final List<(String, VoidCallback?)> links;
  final String? complemento;

  const _LinhaDaFicha(this.rotulo, {required this.links, this.complemento});
}

/// Assuntos acionáveis (RF-ACV-21, RN-21): chips com lupa que levam ao Descobrir filtrado.
class _Assuntos extends StatelessWidget {
  final List<AssuntoResumo> assuntos;
  final ValueChanged<String>? aoBuscar;

  const _Assuntos({required this.assuntos, required this.aoBuscar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Wrap(
      spacing: DesignTokens.space2,
      children: <Widget>[
        for (final assunto in assuntos)
          Semantics(
            link: true,
            label: 'Buscar livros de ${assunto.nome}',
            excludeSemantics: true,
            onTap: aoBuscar == null ? null : () => aoBuscar!(assunto.id),
            child: GestureDetector(
              onTap: aoBuscar == null ? null : () => aoBuscar!(assunto.id),
              behavior: HitTestBehavior.opaque,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 48),
                child: Align(
                  widthFactor: 1,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: DesignTokens.space3,
                      vertical: DesignTokens.space1,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
                      border: Border.all(color: theme.divider),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        Icon(
                          PhosphorIconsRegular.magnifyingGlass,
                          size: 16,
                          color: theme.secondaryText,
                        ),
                        const SizedBox(width: DesignTokens.space1),
                        Text(assunto.nome.toUpperCase(), style: theme.textTheme.bodySmall),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _Resenha extends StatefulWidget {
  final ResenhaDoLivro resenha;
  final LeituraService leitura;

  const _Resenha({super.key, required this.resenha, required this.leitura});

  @override
  State<_Resenha> createState() => _ResenhaState();
}

class _ResenhaState extends State<_Resenha> {
  bool _revelada = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final resenha = widget.resenha;
    final oculta = resenha.spoiler && !_revelada;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Row(
          children: <Widget>[
            AvatarLeitor(url: resenha.autorAvatarUrl, tamanho: 40, nome: resenha.autorNome),
            const SizedBox(width: DesignTokens.space3),
            Expanded(child: Text(resenha.autorNome, style: theme.textTheme.titleMedium)),
          ],
        ),
        const SizedBox(height: DesignTokens.space3),
        AnimatedSwitcher(
          // Movimento reduzido: a troca é estática (pagina-do-livro.md §9).
          duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : DesignTokens.durFast,
          child: oculta
              ? BlocoDeSpoiler(aoRevelar: () => setState(() => _revelada = true))
              : Text(
                  resenha.texto,
                  key: const ValueKey<String>('texto'),
                  style: theme.editorialBody,
                ),
        ),
        const SizedBox(height: DesignTokens.space2),
        Text(
          formatarData(resenha.criadoEm),
          style: theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText),
        ),
        // Reações (F-AVA-2), mesmo com o corpo oculto por spoiler.
        const SizedBox(height: DesignTokens.space3),
        ReacoesDaResenha(
          resenhaId: resenha.id,
          reacoes: resenha.reacoes,
          leitura: widget.leitura,
        ),
      ],
    );
  }
}

/// Quatro barras na forma de um parágrafo (pagina-do-livro.md §4.3), sem texto de "carregando".
class _SkeletonDaSinopse extends StatelessWidget {
  const _SkeletonDaSinopse();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ExcludeSemantics(
      child: Column(
        children: <Widget>[
          for (final (indice, fracao) in <double>[1, 0.96, 1, 0.62].indexed) ...<Widget>[
            if (indice > 0) const SizedBox(height: DesignTokens.space3),
            FractionallySizedBox(
              widthFactor: fracao,
              alignment: Alignment.centerLeft,
              child: Container(
                height: 20,
                decoration: BoxDecoration(
                  color: theme.coverPlaceholder,
                  borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Carregando a página (pagina-do-livro.md §4.8), que é também o estado do cold start.
class _SkeletonDaPagina extends StatelessWidget {
  final bool coldStart;

  const _SkeletonDaPagina({required this.coldStart});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget barra(double altura, double fracao, {double raio = DesignTokens.radiusSm}) =>
        FractionallySizedBox(
          widthFactor: fracao,
          child: Container(
            height: altura,
            decoration: BoxDecoration(
              color: theme.coverPlaceholder,
              borderRadius: BorderRadius.circular(raio),
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
        ExcludeSemantics(
          child: LayoutBuilder(
            builder: (context, limites) {
              final largura = limites.maxWidth * 0.4;
              return Column(
                children: <Widget>[
                  Container(width: largura, height: largura * 1.5, color: theme.coverPlaceholder),
                  const SizedBox(height: DesignTokens.space5),
                  barra(32, 0.7),
                  const SizedBox(height: DesignTokens.space3),
                  barra(18, 0.45),
                  const SizedBox(height: DesignTokens.space8),
                  barra(48, 1, raio: DesignTokens.radiusFull),
                  const SizedBox(height: DesignTokens.space3),
                  barra(48, 1, raio: DesignTokens.radiusFull),
                ],
              );
            },
          ),
        ),
        if (coldStart) ...<Widget>[
          const SizedBox(height: DesignTokens.space5),
          Semantics(
            liveRegion: true,
            child: Text(
              'O servidor está iniciando. Isso pode levar alguns segundos.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
            ),
          ),
        ],
      ],
    );
  }
}

/// Bloco centralizado de falha da página inteira (pagina-do-livro.md §4.9), também usado no livro
/// que não existe. Nunca aparece por causa de sinopse ausente.
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
