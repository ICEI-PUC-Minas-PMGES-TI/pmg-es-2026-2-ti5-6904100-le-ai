import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/capa_livro.dart';
import '../livros/formatos.dart';
import '../livros/livro_oficial.dart';
import 'agrupar_edicoes.dart';

/// Campo da segunda linha do header de Descobrir (descobrir.md "Header de Descobrir"): largura
/// total, lupa à esquerda e `X` à direita quando há texto. Sem label: o campo é o assunto da tela,
/// e o placeholder descreve o escopo da busca.
class CampoDeBuscaDeLivros extends StatelessWidget {
  final TextEditingController controlador;
  final ValueChanged<String> aoMudar;
  final VoidCallback aoLimpar;

  const CampoDeBuscaDeLivros({
    super.key,
    required this.controlador,
    required this.aoMudar,
    required this.aoLimpar,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return TextField(
      controller: controlador,
      onChanged: aoMudar,
      autocorrect: false,
      textInputAction: TextInputAction.search,
      style: theme.textTheme.bodyMedium,
      decoration: InputDecoration(
        hintText: 'Título, autor, editora ou ISBN',
        prefixIcon: Icon(PhosphorIconsRegular.magnifyingGlass, size: 20, color: theme.tertiaryText),
        suffixIcon: ValueListenableBuilder<TextEditingValue>(
          valueListenable: controlador,
          builder: (context, valor, _) => valor.text.isEmpty
              ? const SizedBox.shrink()
              : IconButton(
                  tooltip: 'Limpar busca',
                  onPressed: aoLimpar,
                  icon: Icon(PhosphorIconsRegular.x, size: 20, color: theme.secondaryText),
                ),
        ),
      ),
    );
  }
}

/// Faixa horizontal de assuntos (descobrir.md "Faixa de assuntos"). Sem seta, sem fade e sem
/// indicador: o corte do último chip visível já diz que há mais.
class FaixaDeAssuntos extends StatelessWidget {
  final List<AssuntoResumo> assuntos;
  final AssuntoResumo? ativo;
  final ValueChanged<AssuntoResumo> aoAlternar;

  const FaixaDeAssuntos({
    super.key,
    required this.assuntos,
    required this.ativo,
    required this.aoAlternar,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
        itemCount: assuntos.length,
        separatorBuilder: (context, _) => const SizedBox(width: DesignTokens.space2),
        itemBuilder: (context, indice) {
          final assunto = assuntos[indice];
          return ChipDeAssunto(
            nome: assunto.nome,
            ativo: assunto.id == ativo?.id,
            aoTocar: () => aoAlternar(assunto),
          );
        },
      ),
    );
  }
}

/// Chip de filtro por assunto. O ativo não depende só da cor (descobrir.md §9): ganha peso 600 e
/// o `X` de remoção. O alvo de toque tem 48px de altura mesmo com o chip visualmente menor.
class ChipDeAssunto extends StatelessWidget {
  final String nome;
  final bool ativo;
  final VoidCallback aoTocar;

  const ChipDeAssunto({super.key, required this.nome, required this.ativo, required this.aoTocar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final corDoTexto = ativo ? theme.colorScheme.onPrimary : theme.colorScheme.onSurface;
    return Semantics(
      button: true,
      selected: ativo,
      label: ativo ? '$nome, filtro ativo. Toque para remover.' : nome,
      excludeSemantics: true,
      // Com `excludeSemantics`, a ação de toque do GestureDetector some da árvore: vai aqui.
      onTap: aoTocar,
      child: GestureDetector(
        onTap: aoTocar,
        behavior: HitTestBehavior.opaque,
        child: Center(
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: DesignTokens.space4,
              vertical: DesignTokens.space2,
            ),
            decoration: BoxDecoration(
              color: ativo ? theme.primaryAccent : null,
              borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
              border: ativo ? null : Border.all(color: theme.divider),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Text(
                  nome,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: corDoTexto,
                    fontWeight: ativo ? FontWeight.w600 : null,
                  ),
                ),
                if (ativo) ...<Widget>[
                  const SizedBox(width: DesignTokens.space1),
                  Icon(PhosphorIconsRegular.x, size: 16, color: corDoTexto),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// `Pallas · 2003`: só o que existe. Sem editora nem ano, a linha some.
String? editoraEAno(LivroOficialResumo livro) {
  final partes = <String>[
    ?livro.editora,
    if (livro.anoPublicacao != null) '${livro.anoPublicacao}',
  ];
  return partes.isEmpty ? null : partes.join(' · ');
}

/// Card da busca, variante Busca do design §4.5, para um grupo de edições (RN-01). O card inteiro
/// abre a edição principal. `N edições` expande as outras logo abaixo, cada uma abrindo a sua.
/// Nenhuma nota: ela só existe a partir de F-ACV-NOTA.
class CardDeLivroBusca extends StatefulWidget {
  final GrupoDeEdicoes grupo;
  final ValueChanged<String> aoAbrir;

  const CardDeLivroBusca({super.key, required this.grupo, required this.aoAbrir});

  @override
  State<CardDeLivroBusca> createState() => _CardDeLivroBuscaState();
}

class _CardDeLivroBuscaState extends State<CardDeLivroBusca> {
  bool _expandido = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final livro = widget.grupo.principal;
    final autores = livro.autoresParaExibir;
    final metadado = editoraEAno(livro);
    final edicoes = widget.grupo.edicoes.length;
    final estiloMetadado = theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Semantics(
          button: true,
          child: InkWell(
            onTap: () => widget.aoAbrir(livro.id),
            splashFactory: NoSplash.splashFactory,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: DesignTokens.space4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  CapaLivro(
                    url: livro.capaUrl,
                    largura: 80,
                    altura: 120,
                    titulo: livro.titulo,
                    autor: autores,
                  ),
                  const SizedBox(width: DesignTokens.space4),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          livro.titulo,
                          style: theme.textTheme.titleMedium,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (autores != null) ...<Widget>[
                          const SizedBox(height: DesignTokens.space1),
                          Text(
                            autores,
                            style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                          ),
                        ],
                        if (metadado != null) ...<Widget>[
                          const SizedBox(height: DesignTokens.space1),
                          Text(metadado, style: estiloMetadado),
                        ],
                        Text(formatarPaginas(livro.paginas), style: estiloMetadado),
                        if (edicoes > 1) ...<Widget>[
                          const SizedBox(height: DesignTokens.space2),
                          _IndicacaoDeEdicoes(
                            quantidade: edicoes,
                            expandido: _expandido,
                            aoAlternar: () => setState(() => _expandido = !_expandido),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (_expandido)
          for (final outra in widget.grupo.outras)
            _LinhaDeEdicao(livro: outra, aoAbrir: () => widget.aoAbrir(outra.id)),
      ],
    );
  }
}

class _IndicacaoDeEdicoes extends StatelessWidget {
  final int quantidade;
  final bool expandido;
  final VoidCallback aoAlternar;

  const _IndicacaoDeEdicoes({
    required this.quantidade,
    required this.expandido,
    required this.aoAlternar,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // `container`: sem ele o nó se funde ao do card, e o toque duplo do leitor de tela abriria o
    // livro em vez de expandir as edições.
    return Semantics(
      container: true,
      button: true,
      expanded: expandido,
      label: expandido ? 'Esconder as outras edições' : 'Ver as $quantidade edições',
      excludeSemantics: true,
      onTap: aoAlternar,
      child: GestureDetector(
        onTap: aoAlternar,
        behavior: HitTestBehavior.opaque,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 24),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text(
                '$quantidade edições',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.primaryAccent,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: DesignTokens.space1),
              Icon(
                expandido ? PhosphorIconsRegular.caretUp : PhosphorIconsRegular.caretDown,
                size: 16,
                color: theme.primaryAccent,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Outra edição do grupo, expandida sob o card: editora, ano e páginas, que é o que distingue uma
/// edição da outra, e o toque abre a página dela.
class _LinhaDeEdicao extends StatelessWidget {
  final LivroOficialResumo livro;
  final VoidCallback aoAbrir;

  const _LinhaDeEdicao({required this.livro, required this.aoAbrir});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final descricao = <String>[?editoraEAno(livro), formatarPaginas(livro.paginas)].join(' · ');
    return Semantics(
      button: true,
      label: 'Edição $descricao',
      excludeSemantics: true,
      onTap: aoAbrir,
      child: InkWell(
        onTap: aoAbrir,
        splashFactory: NoSplash.splashFactory,
        child: Padding(
          padding: const EdgeInsets.only(
            left: 80 + DesignTokens.space4,
            bottom: DesignTokens.space3,
          ),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Row(
              children: <Widget>[
                CapaLivro(url: livro.capaUrl, largura: 32, altura: 48),
                const SizedBox(width: DesignTokens.space3),
                Expanded(
                  child: Text(
                    descricao,
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                  ),
                ),
                Icon(PhosphorIconsRegular.caretRight, size: 16, color: theme.tertiaryText),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Esqueleto do card de busca (descobrir.md §4.3): capa de 80 por 120 e três barras de 70%, 45%
/// e 30%. Estático, sem shimmer.
class SkeletonDeCardDeLivro extends StatelessWidget {
  const SkeletonDeCardDeLivro({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget barra(double altura, double fracao) => FractionallySizedBox(
      widthFactor: fracao,
      alignment: Alignment.centerLeft,
      child: Container(
        height: altura,
        decoration: BoxDecoration(
          color: theme.coverPlaceholder,
          borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        ),
      ),
    );
    return ExcludeSemantics(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: DesignTokens.space4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Container(width: 80, height: 120, color: theme.coverPlaceholder),
            const SizedBox(width: DesignTokens.space4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  barra(18, 0.7),
                  const SizedBox(height: DesignTokens.space2),
                  barra(15, 0.45),
                  const SizedBox(height: DesignTokens.space2),
                  barra(13, 0.3),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
