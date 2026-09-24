import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens.dart';

/// Barra de skeleton estática (documento-de-design §3.6): sem shimmer, sem pulsar.
class BarraSkeleton extends StatelessWidget {
  final double altura;
  final double fracaoDaLargura;

  const BarraSkeleton({super.key, required this.altura, required this.fracaoDaLargura});

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      widthFactor: fracaoDaLargura,
      alignment: Alignment.centerLeft,
      child: Container(
        height: altura,
        decoration: BoxDecoration(
          color: Theme.of(context).divider,
          borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        ),
      ),
    );
  }
}

/// Cartão de progresso de operação longa (cadastro-por-isbn.md §4.3 e §7): skeleton com a forma
/// do resultado e uma linha de estado que troca de texto com o tempo, em crossfade. Sem spinner
/// e sem percentual: o servidor não informa progresso, e inventar um seria número fake-preciso.
class CartaoProgresso extends StatefulWidget {
  final String mensagem;

  const CartaoProgresso({super.key, required this.mensagem});

  @override
  State<CartaoProgresso> createState() => _CartaoProgressoState();
}

class _CartaoProgressoState extends State<CartaoProgresso> {
  bool _visivel = false;

  @override
  void initState() {
    super.initState();
    // Um único fade de entrada, e só.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => _visivel = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final semMovimento = MediaQuery.of(context).disableAnimations;
    return AnimatedOpacity(
      opacity: _visivel || semMovimento ? 1 : 0,
      duration: semMovimento ? Duration.zero : DesignTokens.durBase,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(DesignTokens.space5),
        decoration: BoxDecoration(
          color: theme.elevatedSurface,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const BarraSkeleton(altura: 16, fracaoDaLargura: 0.7),
            const SizedBox(height: DesignTokens.space3),
            const BarraSkeleton(altura: 14, fracaoDaLargura: 0.45),
            const SizedBox(height: DesignTokens.space3),
            const BarraSkeleton(altura: 14, fracaoDaLargura: 0.35),
            const SizedBox(height: DesignTokens.space4),
            Semantics(
              liveRegion: true,
              child: AnimatedSwitcher(
                duration: semMovimento ? Duration.zero : DesignTokens.durBase,
                child: Text(
                  widget.mensagem,
                  key: ValueKey<String>(widget.mensagem),
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
