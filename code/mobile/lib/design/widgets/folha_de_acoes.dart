import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens.dart';
import 'botao_textual.dart';
import 'folha_inferior.dart';

class AcaoDaFolha {
  final String valor;
  final IconData icone;
  final String rotulo;
  final bool destrutiva;
  final String? detalhe;

  const AcaoDaFolha({
    required this.valor,
    required this.icone,
    required this.rotulo,
    this.destrutiva = false,
    this.detalhe,
  });
}

Future<String?> escolherNaFolha(
  BuildContext context,
  List<AcaoDaFolha> acoes, {
  Widget? cabecalho,
  String cancelar = 'Cancelar',
  bool semMovimento = false,
}) {
  return mostrarFolhaInferior<String>(
    context,
    semMovimento: semMovimento,
    builder: (context) {
      final theme = Theme.of(context);
      return Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          if (cabecalho != null) ...<Widget>[
            Padding(
              padding: const EdgeInsets.only(bottom: DesignTokens.space4),
              child: cabecalho,
            ),
            Divider(height: 1, color: theme.divider),
          ],
          for (final (indice, acao) in acoes.indexed) ...<Widget>[
            if (indice > 0) Divider(height: 1, color: theme.divider),
            _ItemDaFolha(acao: acao),
          ],
          const SizedBox(height: DesignTokens.space4),
          BotaoTextual(
            texto: cancelar,
            neutro: true,
            larguraTotal: true,
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      );
    },
  );
}

class _ItemDaFolha extends StatelessWidget {
  final AcaoDaFolha acao;

  const _ItemDaFolha({required this.acao});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cor = acao.destrutiva ? theme.colorScheme.error : theme.colorScheme.onSurface;
    return Semantics(
      button: true,
      child: InkWell(
        onTap: () => Navigator.of(context).pop(acao.valor),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: acao.detalhe == null ? 56 : 72),
          child: Row(
            children: <Widget>[
              Icon(acao.icone, size: 20, color: cor),
              const SizedBox(width: DesignTokens.space4),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(acao.rotulo, style: theme.textTheme.bodyMedium?.copyWith(color: cor)),
                    if (acao.detalhe != null)
                      Text(
                        acao.detalhe!,
                        style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
