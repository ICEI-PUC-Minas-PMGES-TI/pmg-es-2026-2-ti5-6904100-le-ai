import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens.dart';
import 'botao_destrutivo.dart';
import 'botao_textual.dart';

/// Modal centrado de confirmação destrutiva (RNF-USA-04, documento-de-design §7.8): card de
/// 320px, título, texto e os dois botões empilhados, destrutivo em cima e o textual embaixo, com
/// o foco começando no textual. É o desenho do modal de saída das configurações, aberto para as
/// telas de F-PERFIL (descartar edição, deixar de seguir, remover seguidor, recusar pedido).
///
/// Devolve `true` só quando a pessoa confirma; fechar por fora ou pelo voltar é `false`.
Future<bool> confirmarNoModal(
  BuildContext context, {
  required String titulo,
  required String texto,
  required String acao,
  String cancelar = 'Cancelar',
}) async {
  final confirmado = await showDialog<bool>(
    context: context,
    builder: (context) {
      final theme = Theme.of(context);
      return Dialog(
        backgroundColor: theme.elevatedSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DesignTokens.radiusLg)),
        insetPadding: const EdgeInsets.symmetric(horizontal: DesignTokens.space6),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 320),
          child: Padding(
            padding: const EdgeInsets.all(DesignTokens.space6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Text(titulo, style: theme.textTheme.titleLarge),
                const SizedBox(height: DesignTokens.space3),
                Text(
                  texto,
                  style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                ),
                const SizedBox(height: DesignTokens.space6),
                BotaoDestrutivo(texto: acao, onPressed: () => Navigator.of(context).pop(true)),
                const SizedBox(height: DesignTokens.space3),
                Focus(
                  autofocus: true,
                  child: BotaoTextual(
                    texto: cancelar,
                    neutro: true,
                    larguraTotal: true,
                    onPressed: () => Navigator.of(context).pop(false),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    },
  );
  return confirmado ?? false;
}
