import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/entrada_suave.dart';
import '../avaliacao/avaliacao_controller.dart';
import '../avaliacao/bloco_sua_avaliacao.dart';
import '../avaliacao/leitura_service.dart';
import '../avaliacao/painel_de_nota.dart';
import '../perfil/widgets_de_perfil.dart';
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
///   estiver lento, a página abre igual. Estante e progresso são de F-EST e F-PRG e entram com
///   elas; aqui não há espaço reservado para eles.
/// - Resenhas de outros leitores, filtradas por RN-08 no servidor. O texto de spoiler só entra na
///   árvore depois de revelado.
class LivroOficialPage extends StatefulWidget {
  final AcervoService servico;
  final LeituraService leitura;
  final String livroId;
  final VoidCallback aoVoltar;

  const LivroOficialPage({
    super.key,
    required this.servico,
    required this.leitura,
    required this.livroId,
    required this.aoVoltar,
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
        // a rolagem para desenhá-la depois (a mesma simplificação do resto do app).
        CabecalhoTela(titulo: '', aoVoltar: widget.aoVoltar, semDivisor: true),
        Expanded(
          child: ListenableBuilder(
            listenable: _pagina,
            builder: (context, _) => _conteudo(Theme.of(context)),
          ),
        ),
      ],
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
          texto: 'A conexão falhou antes de carregar os dados. Tente de novo em alguns instantes.',
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
          const SizedBox(height: DesignTokens.space8),
          BlocoSuaAvaliacao(
            avaliacao: _avaliacao,
            livro: LivroAvaliado(
              titulo: livro.resumo.titulo,
              autor: livro.resumo.autoresParaExibir,
              capaUrl: livro.resumo.capaUrl,
            ),
          ),
          const SizedBox(height: DesignTokens.space6),
          _Secao(titulo: 'Sinopse', child: _sinopse(theme)),
          const SizedBox(height: DesignTokens.space6),
          _Secao(titulo: 'Ficha', child: _Ficha(livro: livro)),
          const SizedBox(height: DesignTokens.space6),
          _resenhas(theme),
        ],
      ),
    );
  }

  Widget _sinopse(ThemeData theme) {
    final sinopse = _pagina.sinopse;
    final neutro = theme.textTheme.bodyMedium?.copyWith(color: theme.tertiaryText);
    switch (sinopse.status) {
      case StatusDaSinopse.disponivel:
        return Text(sinopse.texto ?? '', style: theme.editorialBody);
      case StatusDaSinopse.ausente:
        return Text('Este livro ainda não tem sinopse no acervo.', style: neutro);
      case StatusDaSinopse.falhaTransitoria:
        return Text(
          'Não conseguimos buscar a sinopse agora. Ela deve aparecer numa próxima visita.',
          style: neutro,
        );
      case StatusDaSinopse.pendente:
      case StatusDaSinopse.naoConsultada:
        if (_pagina.sinopseDemorou) {
          return Text('A sinopse ainda está a caminho. Volte daqui a pouco.', style: neutro);
        }
        return const EntradaSuave(child: _SkeletonDaSinopse());
    }
  }

  Widget _resenhas(ThemeData theme) {
    final resenhas = _pagina.resenhas;
    final vazia = resenhas.isEmpty && !_pagina.resenhasIndisponiveis;
    final secundario = theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText);
    return Semantics(
      liveRegion: true,
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
            Text('Não foi possível carregar as resenhas.', style: secundario),
            BotaoTextual(
              texto: 'Tentar de novo',
              onPressed: _pagina.carregandoResenhas ? null : _pagina.carregarResenhas,
            ),
          ] else if (vazia)
            // A lista é filtrada por RN-08: "sem resenhas" pode ser "nenhuma para você".
            Text('Ninguém que você segue escreveu sobre este livro.', style: secundario)
          else ...<Widget>[
            for (final (indice, resenha) in resenhas.indexed) ...<Widget>[
              if (indice > 0) const SizedBox(height: DesignTokens.space6),
              _Resenha(key: ValueKey<String>(resenha.id), resenha: resenha),
            ],
            if (_pagina.temMaisResenhas) ...<Widget>[
              const SizedBox(height: DesignTokens.space4),
              BotaoTextual(
                texto: 'Ver todas as resenhas',
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

/// Ficha em rótulo e valor. Os valores são texto, não link: páginas de autor e editora são do
/// Período 2. Autor e editora que faltam somem, em vez de aparecerem vazios.
class _Ficha extends StatelessWidget {
  final LivroOficialDetalhe livro;

  const _Ficha({required this.livro});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final linhas = <(String, String)>[
      if (livro.resumo.autoresParaExibir != null) ('Autor', livro.resumo.autoresParaExibir!),
      if (livro.resumo.editora != null) ('Editora', livro.resumo.editora!),
      ('ISBN', livro.isbn),
    ];
    return Column(
      children: <Widget>[
        for (final (indice, (rotulo, valor)) in linhas.indexed) ...<Widget>[
          if (indice > 0) Divider(height: 1, thickness: 1, color: theme.divider),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: DesignTokens.space3),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(rotulo, style: theme.textTheme.labelMedium),
                const SizedBox(width: DesignTokens.space4),
                Expanded(
                  child: Text(valor, textAlign: TextAlign.right, style: theme.textTheme.bodyMedium),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _Resenha extends StatefulWidget {
  final ResenhaDoLivro resenha;

  const _Resenha({super.key, required this.resenha});

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
          duration: DesignTokens.durFast,
          child: oculta
              ? _BlocoDeSpoiler(aoRevelar: () => setState(() => _revelada = true))
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
      ],
    );
  }
}

/// Resenha com spoiler (pagina-do-livro.md §4.6): o conteúdo simplesmente não está renderizado
/// até o toque, nem borrado nem censurado por caractere.
class _BlocoDeSpoiler extends StatelessWidget {
  final VoidCallback aoRevelar;

  const _BlocoDeSpoiler({required this.aoRevelar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      key: const ValueKey<String>('spoiler'),
      width: double.infinity,
      constraints: const BoxConstraints(minHeight: 96),
      padding: const EdgeInsets.all(DesignTokens.space4),
      decoration: BoxDecoration(
        color: theme.elevatedSurface,
        borderRadius: BorderRadius.circular(DesignTokens.radius),
        border: Border.all(color: theme.divider),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Icon(PhosphorIconsRegular.eyeSlash, size: 20, color: theme.secondaryText),
          const SizedBox(height: DesignTokens.space2),
          Text(
            'Esta resenha contém spoiler',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
          ),
          BotaoTextual(texto: 'Mostrar mesmo assim', onPressed: aoRevelar),
        ],
      ),
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
