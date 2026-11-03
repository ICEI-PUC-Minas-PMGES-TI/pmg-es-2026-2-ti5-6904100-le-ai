import 'package:flutter/material.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/capa_livro.dart';
import '../feed/social_service.dart';
import '../perfil/textos.dart';
import '../perfil/widgets_de_perfil.dart';

const double larguraDaCapaRecomendada = 60;
const double alturaDaCapaRecomendada = 90;

String rotuloDaRecomendacao(RecomendacaoRecebida recomendacao) {
  final livro = recomendacao.livro;
  final deQuem = livro.autor.isEmpty ? '${livro.titulo}.' : '${livro.titulo}, de ${livro.autor}.';
  final atribuicao =
      '${recomendacao.remetente.nomeExibicao} te recomendou ${tempoDeEspera(recomendacao.criadoEm)}';
  final mensagem = recomendacao.mensagem;
  return mensagem == null ? '$deQuem $atribuicao.' : '$deQuem $atribuicao: $mensagem';
}

class ItemRecomendacao extends StatelessWidget {
  final RecomendacaoRecebida recomendacao;
  final VoidCallback aoAbrir;
  final bool completa;
  final Widget? acao;

  const ItemRecomendacao({
    super.key,
    required this.recomendacao,
    required this.aoAbrir,
    this.completa = false,
    this.acao,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final livro = recomendacao.livro;
    final legenda = theme.textTheme.bodySmall;
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.space5,
        vertical: DesignTokens.space4,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Expanded(
            child: Semantics(
              button: true,
              label: rotuloDaRecomendacao(recomendacao),
              excludeSemantics: true,
              onTap: aoAbrir,
              child: GestureDetector(
                onTap: aoAbrir,
                behavior: HitTestBehavior.opaque,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    CapaLivro(
                      url: livro.capaUrl,
                      largura: larguraDaCapaRecomendada,
                      altura: alturaDaCapaRecomendada,
                      titulo: livro.titulo,
                      autor: livro.autor,
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
                          if (livro.autor.isNotEmpty)
                            Text(
                              livro.autor,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: theme.secondaryText,
                              ),
                            ),
                          const SizedBox(height: DesignTokens.space2),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              AvatarLeitor(
                                url: recomendacao.remetente.avatarUrl,
                                nome: recomendacao.remetente.nomeExibicao,
                                tamanho: 20,
                              ),
                              const SizedBox(width: DesignTokens.space2),
                              Expanded(
                                child: Text.rich(
                                  TextSpan(
                                    style: legenda?.copyWith(color: theme.secondaryText),
                                    children: <InlineSpan>[
                                      TextSpan(
                                        text: recomendacao.remetente.nomeExibicao,
                                        style: TextStyle(
                                          fontWeight: FontWeight.w600,
                                          color: theme.colorScheme.onSurface,
                                        ),
                                      ),
                                      const TextSpan(text: ' te recomendou'),
                                      TextSpan(
                                        text: ' · ${tempoDeEspera(recomendacao.criadoEm)}',
                                        style: TextStyle(color: theme.tertiaryText),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          if (recomendacao.mensagem != null) ...<Widget>[
                            const SizedBox(height: DesignTokens.space2),
                            Text(
                              recomendacao.mensagem!,
                              maxLines: completa ? null : 2,
                              overflow: completa ? null : TextOverflow.ellipsis,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: theme.secondaryText,
                              ),
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
          ?acao,
        ],
      ),
    );
  }
}

class SkeletonDeRecomendacao extends StatelessWidget {
  const SkeletonDeRecomendacao({super.key});

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
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.space5,
        vertical: DesignTokens.space4,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            width: larguraDaCapaRecomendada,
            height: alturaDaCapaRecomendada,
            color: theme.coverPlaceholder,
          ),
          const SizedBox(width: DesignTokens.space4),
          Expanded(
            child: Column(
              children: <Widget>[
                barra(17, 0.7),
                const SizedBox(height: DesignTokens.space2),
                barra(15, 0.45),
                const SizedBox(height: DesignTokens.space2),
                barra(13, 0.55),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
