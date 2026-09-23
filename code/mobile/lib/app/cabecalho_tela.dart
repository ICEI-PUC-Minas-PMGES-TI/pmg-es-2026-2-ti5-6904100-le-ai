import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../design/theme.dart';
import '../design/tokens.dart';

/// Cabeçalho de 72px mais área segura, que toda tela autenticada herda (shell-de-navegacao.md
/// §4 "Padrão de header"). Cuida da própria área segura com `SafeArea` interno em vez de virar
/// `PreferredSizeWidget` para `Scaffold.appBar`: `ShellAutenticado` o usa como irmão de flex de
/// `navigationShell` numa `Column`, não como app bar nativa — não há elevação, scroll-under nem
/// botão de voltar que justifiquem a API de `AppBar`.
///
/// Sino fixo à direita (diferente da web, que não tem sino — REQUISITOS.md §2.1 tira
/// notificações do escopo do cliente web, não do mobile). Sem badge quando não há não lidas:
/// nada de círculo vazio.
///
/// Divisor inferior sempre visível, não só quando o conteúdo rola por baixo: mesma
/// simplificação assumida da web (`CabecalhoTela.vue`, pendência 28b), por consistência entre
/// plataformas (RNF-USA-01) — rastrear scroll só para isso custa mais que o ganho visual.
class CabecalhoTela extends StatelessWidget {
  static const double altura = 72;

  final String titulo;
  final int naoLidas;

  /// Presente nas telas abaixo da raiz de uma aba: `ArrowLeft` à esquerda do título, com
  /// `space-3` de gap (cadastro-por-isbn.md §4). Ausente nas quatro raízes do shell.
  final VoidCallback? aoVoltar;

  /// Ações da tela antes do sino, como o `DotsThreeVertical` do dono na página do livro pessoal.
  final List<Widget> acoes;

  const CabecalhoTela({
    super.key,
    required this.titulo,
    this.naoLidas = 0,
    this.aoVoltar,
    this.acoes = const <Widget>[],
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.pageBackground,
        border: Border(bottom: BorderSide(color: theme.divider)),
      ),
      child: SafeArea(
        bottom: false,
        child: SizedBox(
          height: altura,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
            child: Row(
              children: <Widget>[
                if (aoVoltar != null) ...<Widget>[
                  // Área tocável de 48px em volta do ícone de 24px (alvo mínimo de toque).
                  Semantics(
                    button: true,
                    label: 'Voltar',
                    child: GestureDetector(
                      onTap: aoVoltar,
                      behavior: HitTestBehavior.opaque,
                      child: SizedBox(
                        width: 48,
                        height: 48,
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Icon(
                            PhosphorIconsRegular.arrowLeft,
                            size: 24,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
                Expanded(
                  child: Text(
                    titulo,
                    style: theme.displayTitle,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                ...acoes,
                if (acoes.isNotEmpty) const SizedBox(width: DesignTokens.space3),
                _Sino(naoLidas: naoLidas),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Sino extends StatelessWidget {
  final int naoLidas;

  const _Sino({required this.naoLidas});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      width: 24,
      height: 24,
      child: Stack(
        clipBehavior: Clip.none,
        children: <Widget>[
          Icon(PhosphorIconsRegular.bell, size: 24, color: theme.colorScheme.onSurface),
          if (naoLidas > 0)
            Positioned(
              top: -4,
              right: -4,
              child: Container(
                width: 18,
                height: 18,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: theme.primaryAccent,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  naoLidas > 9 ? '9+' : '$naoLidas',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.onPrimary,
                    height: 1,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
