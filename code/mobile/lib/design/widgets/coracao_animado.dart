import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../theme.dart';
import '../tokens.dart';

class CoracaoAnimado extends StatefulWidget {
  final bool ativo;
  final double tamanho;
  final Color corInativa;

  const CoracaoAnimado({
    super.key,
    required this.ativo,
    required this.tamanho,
    required this.corInativa,
  });

  @override
  State<CoracaoAnimado> createState() => _CoracaoAnimadoState();
}

class _CoracaoAnimadoState extends State<CoracaoAnimado> with SingleTickerProviderStateMixin {
  late final AnimationController _controle = AnimationController(
    vsync: this,
    duration: DesignTokens.durBase,
  );

  static final Animatable<double> _escala = TweenSequence<double>(<TweenSequenceItem<double>>[
    TweenSequenceItem<double>(tween: Tween<double>(begin: 1, end: 1.15), weight: 35),
    TweenSequenceItem<double>(tween: Tween<double>(begin: 1.15, end: 1), weight: 65),
  ]).chain(CurveTween(curve: DesignTokens.easeOut));

  @override
  void didUpdateWidget(CoracaoAnimado antigo) {
    super.didUpdateWidget(antigo);
    if (widget.ativo && !antigo.ativo) {
      _controle.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final icone = Icon(
      widget.ativo ? PhosphorIconsFill.heart : PhosphorIconsRegular.heart,
      size: widget.tamanho,
      color: widget.ativo ? theme.primaryAccent : widget.corInativa,
    );
    return AnimatedBuilder(
      animation: _controle,
      builder: (context, filho) => CustomPaint(
        foregroundPainter: _controle.isAnimating
            ? _Particulas(progresso: _controle.value, cor: theme.primaryAccent)
            : null,
        child: Transform.scale(scale: _escala.evaluate(_controle), child: filho),
      ),
      child: icone,
    );
  }
}

class _Particulas extends CustomPainter {
  static const int _total = 6;
  static const double _raio = 2;

  final double progresso;
  final Color cor;

  const _Particulas({required this.progresso, required this.cor});

  @override
  void paint(Canvas canvas, Size size) {
    final centro = size.center(Offset.zero);
    final distancia = progresso < 0.6
        ? 10 + 8 * (progresso / 0.6)
        : 18 + 2 * ((progresso - 0.6) / 0.4);
    final fim = progresso < 0.6 ? 1.0 : 1 - (progresso - 0.6) / 0.4;
    final pincel = Paint()..color = cor.withValues(alpha: fim);
    for (var i = 0; i < _total; i++) {
      final angulo = 2 * math.pi * i / _total - math.pi / 2;
      canvas.drawCircle(
        centro + Offset(math.cos(angulo), math.sin(angulo)) * distancia,
        _raio * fim,
        pincel,
      );
    }
  }

  @override
  bool shouldRepaint(_Particulas antigo) => antigo.progresso != progresso || antigo.cor != cor;
}
