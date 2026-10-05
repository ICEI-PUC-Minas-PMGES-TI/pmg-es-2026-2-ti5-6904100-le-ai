import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/capa_livro.dart';
import '../perfil/perfil_service.dart';
import 'listas_service.dart';
import 'textos.dart';

/// Peças compartilhadas pelas telas de F-LST, refeitas a partir dos protótipos de
/// `docs/design/periodo-2/F-LST/` e dos componentes equivalentes da web
/// (`components/listas/*.vue`).

/// Mosaico do card de lista (listas-do-leitor.md §4 "Card de lista"): as três primeiras capas em
/// leque horizontal, 48 por 72px deslocadas 20px, a primeira na frente, cada uma com contorno de
/// 1px `papel`. Sem capa, `capa-placeholder` **sem texto** (em 48px atrás de outra capa o título
/// não se lê). Lista com menos de três livros completa com retângulos vazios.
///
/// A sobreposição é uma composição de tamanho fixo (88 por 72px), não fluxo: por isso o `Stack`.
/// Decorativo para leitor de tela.
class MosaicoDeCapas extends StatelessWidget {
  final List<CapaDaLista> capas;

  const MosaicoDeCapas({super.key, required this.capas});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget capa(int indice) {
      final dado = indice < capas.length ? capas[indice] : null;
      return Container(
        width: 48,
        height: 72,
        decoration: BoxDecoration(
          color: dado == null ? theme.elevatedSurface : theme.coverPlaceholder,
          border: Border.all(color: dado == null ? theme.divider : theme.pageBackground),
        ),
        child: dado?.capaUrl == null
            ? null
            : Image.network(
                dado!.capaUrl!,
                fit: BoxFit.cover,
                errorBuilder: (context, erro, pilha) => const SizedBox.shrink(),
              ),
      );
    }

    return ExcludeSemantics(
      child: SizedBox(
        width: 88,
        height: 72,
        // A de trás primeiro: no `Stack` quem vem depois fica na frente.
        child: Stack(
          children: <Widget>[
            Positioned(left: 40, child: capa(2)),
            Positioned(left: 20, child: capa(1)),
            Positioned(left: 0, child: capa(0)),
          ],
        ),
      ),
    );
  }
}

/// Card de lista em linha (listas-do-leitor.md §4): mosaico, título até duas linhas, descrição até
/// duas linhas, contagem e `CaretRight`. É linha, não cartão elevado. O card inteiro é a área
/// acionável e se anuncia com o conteúdo completo; o mosaico é decorativo.
class CardDeLista extends StatelessWidget {
  final ListaResumo lista;
  final VoidCallback aoTocar;

  const CardDeLista({super.key, required this.lista, required this.aoTocar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final rotulo = <String>[
      '${lista.titulo}, ${contagemDeLivros(lista.quantidadeLivros)}.',
      ?lista.descricao,
      'Abrir lista.',
    ].join(' ');
    return Semantics(
      button: true,
      label: rotulo,
      excludeSemantics: true,
      child: InkWell(
        onTap: aoTocar,
        splashFactory: NoSplash.splashFactory,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: DesignTokens.space4),
          child: Row(
            children: <Widget>[
              MosaicoDeCapas(capas: lista.capas),
              const SizedBox(width: DesignTokens.space4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      lista.titulo,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleMedium,
                    ),
                    if (lista.descricao != null) ...<Widget>[
                      const SizedBox(height: DesignTokens.space1),
                      Text(
                        lista.descricao!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                      ),
                    ],
                    const SizedBox(height: DesignTokens.space1),
                    Text(
                      contagemDeLivros(lista.quantidadeLivros),
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: DesignTokens.space2),
              Icon(PhosphorIconsRegular.caretRight, size: 20, color: theme.secondaryText),
            ],
          ),
        ),
      ),
    );
  }
}

/// Skeleton estático do card (listas-do-leitor.md §4.6): o leque em `capa-placeholder` e três
/// barras à direita. Sem shimmer.
class SkeletonDeCard extends StatelessWidget {
  const SkeletonDeCard({super.key});

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
          children: <Widget>[
            const MosaicoDeCapas(
              capas: <CapaDaLista>[
                CapaDaLista(livroId: '', pessoal: false, titulo: '', capaUrl: null),
                CapaDaLista(livroId: '', pessoal: false, titulo: '', capaUrl: null),
                CapaDaLista(livroId: '', pessoal: false, titulo: '', capaUrl: null),
              ],
            ),
            const SizedBox(width: DesignTokens.space4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  barra(17, 0.65),
                  const SizedBox(height: DesignTokens.space2),
                  barra(13, 0.85),
                  const SizedBox(height: DesignTokens.space2),
                  barra(13, 0.30),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Capa de 48 por 72px das linhas de lista (lista.md §4 "Linha de livro"): canto vivo, sem
/// sombra. Sem imagem, o placeholder textual com o título. Livro pessoal ganha o badge `PESSOAL`
/// em `overline` no canto inferior esquerdo, sobre `papel` a 90%.
class CapaDeItem extends StatelessWidget {
  final String? url;
  final String titulo;
  final bool pessoal;
  final double largura;
  final double altura;

  const CapaDeItem({
    super.key,
    required this.url,
    required this.titulo,
    required this.pessoal,
    this.largura = 48,
    this.altura = 72,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final capa = CapaLivro(url: url, largura: largura, altura: altura, titulo: titulo);
    if (!pessoal) {
      return capa;
    }
    return SizedBox(
      width: largura,
      height: altura,
      child: Stack(
        children: <Widget>[
          capa,
          Align(
            alignment: Alignment.bottomLeft,
            child: Padding(
              padding: const EdgeInsets.all(2),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: theme.pageBackground.withValues(alpha: 0.9),
                  borderRadius: BorderRadius.circular(2),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: Text(
                    'PESSOAL',
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontSize: 8,
                      height: 1.25,
                      letterSpacing: 0.4,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// `Globe` ou `Lock` de 16px e a frase de quem vê a lista (lista.md §4, listas-do-leitor.md §4).
/// A lista não tem privacidade própria: segue o perfil (RN-08).
class LinhaDeVisibilidade extends StatelessWidget {
  final Privacidade privacidade;
  final String texto;

  const LinhaDeVisibilidade({super.key, required this.privacidade, required this.texto});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.only(top: 1),
          child: Icon(
            privacidade == Privacidade.privado
                ? PhosphorIconsRegular.lock
                : PhosphorIconsRegular.globe,
            size: 16,
            color: theme.secondaryText,
          ),
        ),
        const SizedBox(width: DesignTokens.space2),
        Expanded(
          child: Text(
            texto,
            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
          ),
        ),
      ],
    );
  }
}

/// Botão secundário de 48px das telas de lista (`Editar lista`, `Reordenar`, `Ver perfil de`).
class BotaoSecundarioDeLista extends StatelessWidget {
  final String texto;
  final IconData? icone;
  final VoidCallback? aoTocar;

  const BotaoSecundarioDeLista({super.key, required this.texto, this.icone, this.aoTocar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final estilo = OutlinedButton.styleFrom(
      foregroundColor: theme.colorScheme.onSurface,
      minimumSize: const Size(48, 48),
      padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
      side: BorderSide(color: theme.divider),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DesignTokens.radius)),
      textStyle: theme.textTheme.labelLarge,
    );
    if (icone == null) {
      return OutlinedButton(onPressed: aoTocar, style: estilo, child: Text(texto));
    }
    return OutlinedButton.icon(
      onPressed: aoTocar,
      style: estilo,
      icon: Icon(icone, size: 20),
      label: Text(texto),
    );
  }
}

/// Toast do rodapé (lista.md §4.4, adicionar-a-lista.md §4.9): `papel-elevado`, `radius` 12,
/// `elev-2`, barra lateral de 4px em `musgo` (confirmação) ou `rubi` (falha), texto em `body` e,
/// à direita, a ação textual. Vai pelo `ScaffoldMessenger` do app, então sobrevive à troca de
/// tela (`Lista excluída.` aparece depois de voltar).
///
/// A falha não some sozinha (§4.4: fica até `Tentar de novo` ou `X`). A confirmação fica alguns
/// segundos: o documento de design não fixa a duração (adicionar-a-lista.md §7).
void mostrarAvisoDeLista(
  BuildContext context, {
  required String texto,
  bool falha = false,
  String? acao,
  VoidCallback? aoAcionar,
}) {
  final mensageiro = ScaffoldMessenger.maybeOf(context);
  if (mensageiro == null) {
    return;
  }
  final theme = Theme.of(context);
  mensageiro.hideCurrentSnackBar();
  mensageiro.showSnackBar(
    SnackBar(
      behavior: SnackBarBehavior.floating,
      elevation: 0,
      backgroundColor: Colors.transparent,
      padding: EdgeInsets.zero,
      margin: const EdgeInsets.fromLTRB(
        DesignTokens.space4,
        0,
        DesignTokens.space4,
        DesignTokens.space4,
      ),
      duration: falha ? const Duration(days: 1) : const Duration(seconds: 6),
      content: Semantics(
        liveRegion: true,
        child: Container(
          decoration: BoxDecoration(
            color: theme.elevatedSurface,
            borderRadius: BorderRadius.circular(DesignTokens.radius),
            boxShadow: theme.elevation2,
          ),
          clipBehavior: Clip.antiAlias,
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Container(
                  width: 4,
                  color: falha ? theme.colorScheme.error : theme.primaryAccent,
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: DesignTokens.space4,
                      vertical: DesignTokens.space3,
                    ),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        texto,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurface,
                        ),
                      ),
                    ),
                  ),
                ),
                if (acao != null)
                  TextButton(
                    onPressed: () {
                      mensageiro.hideCurrentSnackBar();
                      aoAcionar?.call();
                    },
                    style: TextButton.styleFrom(
                      foregroundColor: theme.primaryAccent,
                      minimumSize: const Size(48, 48),
                      textStyle: theme.textTheme.labelLarge,
                    ),
                    child: Text(acao),
                  ),
                if (falha)
                  Semantics(
                    button: true,
                    label: 'Fechar aviso',
                    excludeSemantics: true,
                    child: InkWell(
                      onTap: mensageiro.hideCurrentSnackBar,
                      child: SizedBox(
                        width: 48,
                        child: Icon(PhosphorIconsRegular.x, size: 20, color: theme.secondaryText),
                      ),
                    ),
                  )
                else
                  const SizedBox(width: DesignTokens.space2),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
