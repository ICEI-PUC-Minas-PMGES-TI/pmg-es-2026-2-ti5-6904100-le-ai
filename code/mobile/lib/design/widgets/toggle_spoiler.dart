import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../theme.dart';
import '../tokens.dart';

/// Toggle "Contém spoiler" do editor de resenha (escrever-resenha.md §4). Desligado: ícone e
/// rótulo em `grafite`, sem fundo. Ligado: pill em `ambar-fundo`, ícone e rótulo em `ambar`, e o
/// rótulo em peso 600 — o estado não depende só da cor. Alvo de 48px.
///
/// O texto `ambar` sobre `ambar-fundo` fica abaixo do contraste AA (pendência de design
/// registrada em F-AVA); o peso e o ícone reforçam o estado.
class ToggleSpoiler extends StatelessWidget {
  final bool ligado;
  final ValueChanged<bool>? aoMudar;

  const ToggleSpoiler({super.key, required this.ligado, required this.aoMudar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cor = ligado ? theme.warningColor : theme.secondaryText;
    return Semantics(
      toggled: ligado,
      button: true,
      label: 'Contém spoiler',
      excludeSemantics: true,
      child: InkWell(
        onTap: aoMudar == null ? null : () => aoMudar!(!ligado),
        splashFactory: NoSplash.splashFactory,
        borderRadius: BorderRadius.circular(999),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Center(
            widthFactor: 1,
            child: AnimatedContainer(
              duration: DesignTokens.durFast,
              padding: const EdgeInsets.symmetric(
                horizontal: DesignTokens.space3,
                vertical: DesignTokens.space1,
              ),
              decoration: BoxDecoration(
                color: ligado ? theme.warningTint : Colors.transparent,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Icon(PhosphorIconsRegular.eyeSlash, size: 20, color: cor),
                  const SizedBox(width: DesignTokens.space2),
                  Flexible(
                    child: Text(
                      'Contém spoiler',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: cor,
                        fontWeight: ligado ? FontWeight.w600 : null,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
