import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens.dart';

/// Ação de apoio, ao lado de um botão primário: outline `musgo`, radius 12, largura total.
class BotaoSecundario extends StatelessWidget {
  final String texto;
  final VoidCallback? onPressed;
  final IconData? icone;

  const BotaoSecundario({super.key, required this.texto, required this.onPressed, this.icone});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cor = theme.primaryAccent;
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 48),
          foregroundColor: cor,
          side: BorderSide(color: cor),
          textStyle: theme.textTheme.labelLarge,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DesignTokens.radius)),
          splashFactory: NoSplash.splashFactory,
        ),
        child: icone == null
            ? Text(texto)
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Icon(icone, size: 20),
                  const SizedBox(width: DesignTokens.space2),
                  Flexible(child: Text(texto, textAlign: TextAlign.center)),
                ],
              ),
      ),
    );
  }
}
