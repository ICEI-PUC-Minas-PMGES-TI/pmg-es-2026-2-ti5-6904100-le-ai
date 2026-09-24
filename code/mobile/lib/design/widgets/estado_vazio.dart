import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens.dart';

/// Estado vazio com desenho intencional (documento-de-design §5.1 e §8): ícone em círculo de
/// 72px `papel-elevado`, título e texto centralizados, **alinhado ao topo** — centralizar na tela
/// inteira faria um desfecho previsto parecer falha de sistema. O ícone é decorativo e fica fora
/// da árvore de acessibilidade; o título carrega o significado.
class EstadoVazio extends StatelessWidget {
  final IconData icone;
  final String titulo;
  final String? texto;
  final Widget? rodape;

  const EstadoVazio({
    super.key,
    required this.icone,
    required this.titulo,
    this.texto,
    this.rodape,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      liveRegion: true,
      child: Column(
        children: <Widget>[
          ExcludeSemantics(
            child: Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(color: theme.elevatedSurface, shape: BoxShape.circle),
              child: Icon(icone, size: 32, color: theme.tertiaryText),
            ),
          ),
          const SizedBox(height: DesignTokens.space6),
          Text(titulo, style: theme.textTheme.titleLarge, textAlign: TextAlign.center),
          if (texto != null) ...<Widget>[
            const SizedBox(height: DesignTokens.space3),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 300),
              child: Text(
                texto!,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
              ),
            ),
          ],
          ?rodape,
        ],
      ),
    );
  }
}
