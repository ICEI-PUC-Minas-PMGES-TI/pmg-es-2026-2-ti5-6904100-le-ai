import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens.dart';

/// Estado terminal de tela inteira: ícone de 32px, título, texto e ações, no lugar do formulário
/// (confirmação neutra da recuperação, senha alterada, link que não vale mais). Alinhado à
/// esquerda e sem ilustração: o acento é o ícone (redefinir-senha.md §4.5 e §7). Mesmo bloco da
/// web (`EstadoTerminal.vue`).
///
/// `liveRegion` faz o leitor de tela anunciar a troca quando o formulário some (§9).
class EstadoTerminal extends StatelessWidget {
  final IconData icone;
  final String titulo;
  final List<String> paragrafos;
  final List<Widget> acoes;

  /// Âmbar para o link que não vale mais; `musgo` para o resto.
  final bool alerta;

  const EstadoTerminal({
    super.key,
    required this.icone,
    required this.titulo,
    required this.paragrafos,
    required this.acoes,
    this.alerta = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      liveRegion: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Align(
            alignment: Alignment.centerLeft,
            child: ExcludeSemantics(
              child: Icon(
                icone,
                size: 32,
                color: alerta ? theme.warningColor : theme.primaryAccent,
              ),
            ),
          ),
          const SizedBox(height: DesignTokens.space5),
          Semantics(header: true, child: Text(titulo, style: theme.textTheme.headlineSmall)),
          for (final paragrafo in paragrafos) ...<Widget>[
            const SizedBox(height: DesignTokens.space4),
            Text(
              paragrafo,
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
            ),
          ],
          const SizedBox(height: DesignTokens.space8),
          for (var i = 0; i < acoes.length; i++) ...<Widget>[
            if (i > 0) const SizedBox(height: DesignTokens.space4),
            acoes[i],
          ],
        ],
      ),
    );
  }
}
