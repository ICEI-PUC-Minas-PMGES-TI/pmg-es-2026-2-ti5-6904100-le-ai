import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/folha_inferior.dart';
import '../feed/social_service.dart';
import 'item_recomendacao.dart';

const double _opacidadeEnviando = 0.5;

/// Abre a pergunta de descarte em lote (RF-REC-17, RN-22.12) e devolve quantas recomendações
/// saíram, ou `null` se a pessoa recusou. Fechar sem escolher (arrastar, tocar no scrim, voltar)
/// conta como recusa; enquanto o pedido corre, a folha não fecha.
Future<int?> perguntarDescarteEmLote(
  BuildContext context, {
  required SocialService social,
  required LivroSnapshot livro,
  required int restantes,
}) => mostrarFolhaInferior<int>(
  Navigator.of(context, rootNavigator: true).context,
  builder: (context) => FolhaDescarteEmLote(social: social, livro: livro, restantes: restantes),
);

/// recomendacoes-recebidas.md do Período 3, §5.2 a §5.5: cabeçalho do livro, a pergunta de RN-22.12
/// sem adaptação, quantas restam, `Remover todas` em `musgo` (a pergunta já é a confirmação, e
/// nada da leitora é apagado) e `Agora não` com o foco. A falha mantém a folha aberta com o banner,
/// e repetir é tocar em `Remover todas` de novo, com a mesma chave.
class FolhaDescarteEmLote extends StatefulWidget {
  final SocialService social;
  final LivroSnapshot livro;
  final int restantes;

  const FolhaDescarteEmLote({
    super.key,
    required this.social,
    required this.livro,
    required this.restantes,
  });

  @override
  State<FolhaDescarteEmLote> createState() => _FolhaDescarteEmLoteState();
}

class _FolhaDescarteEmLoteState extends State<FolhaDescarteEmLote> {
  final String _chave = ApiClient.newIdempotencyKey();
  bool _removendo = false;
  bool _falhou = false;

  Future<void> _removerTodas() async {
    if (_removendo) {
      return;
    }
    setState(() {
      _removendo = true;
      _falhou = false;
    });
    try {
      final removidas = await widget.social.descartarRecomendacoesDoLivro(
        widget.livro.id,
        idempotencyKey: _chave,
      );
      if (mounted) {
        Navigator.of(context).pop(removidas);
      }
    } on ApiException {
      if (mounted) {
        setState(() {
          _removendo = false;
          _falhou = true;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final livro = widget.livro;
    final secundario = theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText);
    final numero = secundario?.copyWith(fontFamily: DesignTokens.fontMono);
    final uma = widget.restantes == 1;
    return PopScope(
      canPop: !_removendo,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Row(
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
                      Text(livro.titulo, style: theme.textTheme.titleSmall),
                      if (livro.autor.isNotEmpty)
                        Text(
                          livro.autor,
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: DesignTokens.space5),
            Divider(height: 1, thickness: 1, color: theme.divider),
            const SizedBox(height: DesignTokens.space5),
            Semantics(
              header: true,
              liveRegion: true,
              child: Text(
                'Deseja remover todas as recomendações atuais do livro ${livro.titulo}?',
                style: theme.textTheme.titleMedium,
              ),
            ),
            const SizedBox(height: DesignTokens.space3),
            Text.rich(
              TextSpan(
                style: secundario,
                children: <InlineSpan>[
                  TextSpan(text: uma ? 'Ainda resta ' : 'Ainda restam '),
                  TextSpan(text: '${widget.restantes}', style: numero),
                  TextSpan(
                    text: uma
                        ? ' recomendação deste livro na sua lista. Quem recomendou não fica '
                              'sabendo, e ela não volta depois.'
                        : ' recomendações deste livro na sua lista. Quem recomendou não fica '
                              'sabendo, e elas não voltam depois.',
                  ),
                ],
              ),
            ),
            if (_falhou) ...<Widget>[
              const SizedBox(height: DesignTokens.space4),
              const BannerAviso(
                variante: VarianteAviso.erro,
                triangulo: true,
                mensagem:
                    'Não foi possível remover as recomendações. Verifique sua conexão e tente de '
                    'novo.',
              ),
            ],
            const SizedBox(height: DesignTokens.space6),
            Opacity(
              opacity: _removendo ? _opacidadeEnviando : 1,
              child: BotaoPrimario(
                texto: _removendo ? 'Removendo…' : 'Remover todas',
                onPressed: _removendo ? null : _removerTodas,
              ),
            ),
            const SizedBox(height: DesignTokens.space2),
            Opacity(
              opacity: _removendo ? _opacidadeEnviando : 1,
              child: Focus(
                autofocus: true,
                child: BotaoTextual(
                  texto: 'Agora não',
                  neutro: true,
                  larguraTotal: true,
                  onPressed: _removendo ? null : () => Navigator.of(context).pop(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
