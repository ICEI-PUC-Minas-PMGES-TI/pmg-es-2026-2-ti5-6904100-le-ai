import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens.dart';
import 'botao_destrutivo.dart';
import 'botao_textual.dart';

/// Bottom sheet do sistema (documento-de-design §5.4): fundo `papel` (`noite-elevada` no
/// escuro), radius 20 no topo, alça de 32 por 4px, scrim `tinta` a 40% (preto a 60% no escuro).
/// O padding inferior soma a barra de navegação do sistema: `useSafeArea` só protege topo e
/// laterais, e um sheet aberto pelo navegador raiz desce até atrás dela (edge-to-edge).
Future<T?> mostrarFolhaInferior<T>(
  BuildContext context, {
  required WidgetBuilder builder,
}) {
  final theme = Theme.of(context);
  return showModalBottomSheet<T>(
    context: context,
    useSafeArea: true,
    isScrollControlled: true,
    backgroundColor: theme.isDark ? theme.elevatedSurface : theme.pageBackground,
    barrierColor: theme.isDark
        ? const Color(0x99000000)
        : DesignTokens.tinta.withValues(alpha: 0.4),
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (context) => Padding(
      padding: EdgeInsets.fromLTRB(
        DesignTokens.space6,
        DesignTokens.space3,
        DesignTokens.space6,
        DesignTokens.space6 + MediaQuery.paddingOf(context).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Center(
            child: Container(
              width: 32,
              height: 4,
              decoration: BoxDecoration(
                color: theme.divider,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: DesignTokens.space5),
          builder(context),
        ],
      ),
    ),
  );
}

/// Confirmação de ação destrutiva (RNF-USA-04, documento-de-design §7.8). O [texto] nomeia o
/// que vai ser perdido — nunca "este item". Devolve `true` só quando a pessoa confirma.
Future<bool> confirmarAcaoDestrutiva(
  BuildContext context, {
  required String titulo,
  required String texto,
  required String acao,
}) async {
  final confirmado = await mostrarFolhaInferior<bool>(
    context,
    builder: (context) {
      final theme = Theme.of(context);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(titulo, style: theme.textTheme.titleMedium),
          const SizedBox(height: DesignTokens.space3),
          Text(
            texto,
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
          ),
          const SizedBox(height: DesignTokens.space6),
          BotaoDestrutivo(texto: acao, onPressed: () => Navigator.of(context).pop(true)),
          const SizedBox(height: DesignTokens.space3),
          BotaoTextual(
            texto: 'Cancelar',
            neutro: true,
            larguraTotal: true,
            onPressed: () => Navigator.of(context).pop(false),
          ),
        ],
      );
    },
  );
  return confirmado ?? false;
}
