import 'package:flutter/material.dart';

import '../theme.dart';

/// Botão textual (documento-de-design §4.1): `musgo` para ação, `grafite` para cancelar. Alvo de
/// toque de no mínimo 48px mesmo quando o texto é curto (§9 dos prompts de F-ACV-CADASTRO).
class BotaoTextual extends StatelessWidget {
  final String texto;
  final VoidCallback? onPressed;
  final bool neutro;
  final bool larguraTotal;

  const BotaoTextual({
    super.key,
    required this.texto,
    required this.onPressed,
    this.neutro = false,
    this.larguraTotal = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final botao = TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        minimumSize: const Size(48, 48),
        foregroundColor: neutro ? theme.secondaryText : theme.primaryAccent,
        textStyle: theme.textTheme.labelLarge,
        splashFactory: NoSplash.splashFactory,
      ),
      child: Text(texto),
    );
    return larguraTotal ? SizedBox(width: double.infinity, child: botao) : botao;
  }
}
