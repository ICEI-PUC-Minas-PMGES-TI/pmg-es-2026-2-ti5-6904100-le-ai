import 'package:flutter/material.dart';

import '../tokens.dart';

/// Ação destrutiva (documento-de-design §4.1 e §7.8): **sempre outline `rubi`, nunca
/// preenchido**, radius 12, largura total no mobile.
class BotaoDestrutivo extends StatelessWidget {
  final String texto;
  final VoidCallback? onPressed;
  final bool carregando;

  /// Ícone de 20px à esquerda do texto, como o `SignOut` de "Sair da conta" (configuracoes.md).
  final IconData? icone;

  const BotaoDestrutivo({
    super.key,
    required this.texto,
    required this.onPressed,
    this.carregando = false,
    this.icone,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cor = theme.colorScheme.error;
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: carregando ? null : onPressed,
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 48),
          foregroundColor: cor,
          side: BorderSide(color: cor),
          textStyle: theme.textTheme.labelLarge,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(DesignTokens.radius),
          ),
          splashFactory: NoSplash.splashFactory,
        ),
        child: icone == null
            ? Text(texto)
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Icon(icone, size: 20),
                  const SizedBox(width: DesignTokens.space2),
                  Text(texto),
                ],
              ),
      ),
    );
  }
}
