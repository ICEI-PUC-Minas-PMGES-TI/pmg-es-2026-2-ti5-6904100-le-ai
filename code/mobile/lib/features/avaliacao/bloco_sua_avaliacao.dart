import 'package:flutter/material.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/cartao_progresso.dart';
import '../../design/widgets/estrelas_de_nota.dart';
import '../livros/formatos.dart';
import 'avaliacao_controller.dart';
import 'painel_de_nota.dart';

/// Bloco "Sua avaliação" da página do livro (pagina-do-livro.md §4.1, item 4, e §4.2).
///
/// - Estrelas de 24px com o valor ao lado, ou as cinco vazias com `Sem nota`. Nunca `0,0`.
/// - A linha de estrelas é um botão com nome ("Sua nota: 4,5. Alterar") que abre o painel.
/// - A resenha do próprio leitor aparece aqui, e não na lista de resenhas: nem o `.md` nem o
///   `.html` desenham esse estado, e a decisão está registrada em F-AVA.
/// - Carrega à parte: com o `leitura` lento ou fora, a página segue utilizável e só o bloco
///   mostra o skeleton ou o erro com `Tentar de novo`.
class BlocoSuaAvaliacao extends StatelessWidget {
  final AvaliacaoController avaliacao;
  final LivroAvaliado livro;

  const BlocoSuaAvaliacao({super.key, required this.avaliacao, required this.livro});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListenableBuilder(
      listenable: avaliacao,
      builder: (context, _) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text('Sua avaliação', style: theme.textTheme.headlineSmall),
          const SizedBox(height: DesignTokens.space3),
          ..._conteudo(context, theme),
        ],
      ),
    );
  }

  List<Widget> _conteudo(BuildContext context, ThemeData theme) {
    switch (avaliacao.estado) {
      case EstadoDaAvaliacao.carregando:
        return const <Widget>[
          SizedBox(
            height: 48,
            child: Center(child: BarraSkeleton(altura: 24, fracaoDaLargura: 0.6)),
          ),
        ];
      case EstadoDaAvaliacao.erro:
        return <Widget>[
          Text(
            'Não foi possível carregar sua avaliação.',
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
          ),
          BotaoTextual(texto: 'Tentar de novo', onPressed: avaliacao.carregar),
        ];
      case EstadoDaAvaliacao.pronta:
        final resenha = avaliacao.resenha;
        return <Widget>[
          _LinhaDaNota(
            valor: avaliacao.nota?.valor,
            aoTocar: () => abrirPainelDeNota(context, avaliacao: avaliacao, livro: livro),
          ),
          if (resenha != null) ...<Widget>[
            const SizedBox(height: DesignTokens.space3),
            Text(resenha.texto, style: theme.editorialBody),
            const SizedBox(height: DesignTokens.space2),
            Text(
              'Publicada em ${formatarData(resenha.criadoEm)}',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText),
            ),
          ],
        ];
    }
  }
}

class _LinhaDaNota extends StatelessWidget {
  final double? valor;
  final VoidCallback aoTocar;

  const _LinhaDaNota({required this.valor, required this.aoTocar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final nota = valor;
    return Semantics(
      button: true,
      label: nota == null ? 'Sem nota. Dar nota' : 'Sua nota: ${formatarNota(nota)}. Alterar',
      excludeSemantics: true,
      child: InkWell(
        onTap: aoTocar,
        splashFactory: NoSplash.splashFactory,
        borderRadius: BorderRadius.circular(DesignTokens.radius),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Row(
            children: <Widget>[
              EstrelasDeNota(valor: nota, tamanho: 24),
              const SizedBox(width: DesignTokens.space3),
              if (nota == null)
                Text(
                  'Sem nota',
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText),
                )
              else
                Text(formatarNota(nota), style: theme.numInline),
            ],
          ),
        ),
      ),
    );
  }
}
