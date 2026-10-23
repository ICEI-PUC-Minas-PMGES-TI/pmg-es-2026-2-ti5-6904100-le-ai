import 'package:flutter/material.dart';

import '../theme.dart';

/// Botão textual (documento-de-design §4.1): `musgo` para ação, `grafite` para cancelar e `rubi`
/// para a ação destrutiva que abre uma confirmação ("Remover nota", avaliar-livro.md §4). Alvo de
/// toque de no mínimo 48px mesmo quando o texto é curto (§9 dos prompts de F-ACV-CADASTRO).
class BotaoTextual extends StatelessWidget {
  final String texto;
  final VoidCallback? onPressed;
  final bool neutro;
  final bool destrutivo;
  final bool larguraTotal;
  final IconData? icone;

  const BotaoTextual({
    super.key,
    required this.texto,
    required this.onPressed,
    this.neutro = false,
    this.destrutivo = false,
    this.larguraTotal = false,
    this.icone,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final estilo = TextButton.styleFrom(
      minimumSize: const Size(48, 48),
      foregroundColor: destrutivo
          ? theme.colorScheme.error
          : neutro
          ? theme.secondaryText
          : theme.primaryAccent,
      textStyle: theme.textTheme.labelLarge,
      splashFactory: NoSplash.splashFactory,
    );
    final botao = icone == null
        ? TextButton(onPressed: onPressed, style: estilo, child: Text(texto))
        : TextButton.icon(
            onPressed: onPressed,
            style: estilo,
            icon: Icon(icone, size: 20),
            label: Text(texto),
          );
    return larguraTotal ? SizedBox(width: double.infinity, child: botao) : botao;
  }
}
