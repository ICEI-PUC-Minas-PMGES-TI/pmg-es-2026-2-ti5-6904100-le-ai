import 'package:flutter/material.dart';

import '../tokens.dart';

/// Um único fade de entrada em `dur-base` com `ease-out`, para skeleton de carregamento
/// (descobrir.md §4.3, pagina-do-livro.md §4.3). Estático sob movimento reduzido; nada de shimmer
/// nem de pulso.
class EntradaSuave extends StatelessWidget {
  final Widget child;

  const EntradaSuave({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.of(context).disableAnimations) {
      return child;
    }
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: 1),
      duration: DesignTokens.durBase,
      curve: DesignTokens.easeOut,
      builder: (context, opacidade, filho) => Opacity(opacity: opacidade, child: filho),
      child: child,
    );
  }
}
