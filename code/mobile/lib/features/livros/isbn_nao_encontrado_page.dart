import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/estado_vazio.dart';

/// ISBN não encontrado em nenhuma fonte (RF-ACV-06). Estrutura e cópia de
/// docs/design/periodo-1/F-ACV-CADASTRO/isbn-nao-encontrado.md §4 e §8.
///
/// Não é erro de sistema: as fontes responderam que não conhecem o ISBN. Sem `rubi`, sem
/// alerta, sem "tentar de novo" — repetir a pergunta daria a mesma resposta.
class IsbnNaoEncontradoPage extends StatelessWidget {
  /// ISBN normalizado, sem separadores. Nulo ou vazio quando a tela é aberta sem ele em mãos
  /// (§4.2), e o layout não quebra.
  final String? isbn;
  final VoidCallback? aoConferirIsbn;
  final VoidCallback? aoCadastrarPessoal;

  const IsbnNaoEncontradoPage({
    super.key,
    this.isbn,
    this.aoConferirIsbn,
    this.aoCadastrarPessoal,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final temIsbn = isbn != null && isbn!.isNotEmpty;

    return Column(
      children: <Widget>[
        // O título não muda em relação à tela anterior: é o mesmo fluxo (§4).
        CabecalhoTela(titulo: 'Adicionar livro', aoVoltar: aoConferirIsbn),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
            child: Column(
              children: <Widget>[
                const SizedBox(height: DesignTokens.space8),
                EstadoVazio(
                  icone: PhosphorIconsRegular.magnifyingGlass,
                  titulo: 'Não encontramos este livro',
                  texto: temIsbn
                      ? 'Procuramos em todas as nossas fontes e nenhuma conhece o ISBN $isbn.'
                      : 'Procuramos em todas as nossas fontes e nenhuma conhece esse ISBN.',
                  rodape: temIsbn
                      ? Padding(
                          padding: const EdgeInsets.only(top: DesignTokens.space2),
                          child: Text(
                            isbn!,
                            style: theme.numInline.copyWith(color: theme.tertiaryText),
                          ),
                        )
                      : null,
                ),
                const SizedBox(height: DesignTokens.space8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(DesignTokens.space5),
                  decoration: BoxDecoration(
                    color: theme.elevatedSurface,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text('Cadastrar como livro pessoal?', style: theme.textTheme.labelLarge),
                      const SizedBox(height: DesignTokens.space3),
                      Text(
                        'Um livro pessoal é só seu: ele não entra na busca do acervo e ninguém '
                        'mais pode adicioná-lo à estante. Sua nota e sua resenha continuam '
                        'valendo normalmente.',
                        style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                      ),
                      const SizedBox(height: DesignTokens.space5),
                      BotaoPrimario(
                        texto: 'Cadastrar livro pessoal',
                        onPressed: aoCadastrarPessoal,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: DesignTokens.space5),
                BotaoTextual(texto: 'Conferir o ISBN', onPressed: aoConferirIsbn),
                const SizedBox(height: DesignTokens.space10),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
