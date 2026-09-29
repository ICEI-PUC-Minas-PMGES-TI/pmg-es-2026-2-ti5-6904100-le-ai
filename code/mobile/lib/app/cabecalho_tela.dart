import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../design/theme.dart';
import '../design/tokens.dart';
import '../features/notificacoes/contador_de_nao_lidas.dart';
import '../features/perfil/textos.dart';

/// Cabeçalho de 72px mais área segura, que toda tela autenticada herda (shell-de-navegacao.md
/// §4 "Padrão de header"). Cuida da própria área segura com `SafeArea` interno em vez de virar
/// `PreferredSizeWidget` para `Scaffold.appBar`: `ShellAutenticado` o usa como irmão de flex de
/// `navigationShell` numa `Column`, não como app bar nativa — não há elevação, scroll-under nem
/// botão de voltar que justifiquem a API de `AppBar`.
///
/// Sino fixo à direita (diferente da web, que não tem sino — REQUISITOS.md §2.1 tira
/// notificações do escopo do cliente web, não do mobile). Sem badge quando não há não lidas:
/// nada de círculo vazio. O total e a abertura da tela de notificações vêm do
/// [EscopoDeNotificacoes] do shell (F-NOT); fora dele o sino não tem para onde levar.
///
/// Divisor inferior sempre visível, não só quando o conteúdo rola por baixo: mesma
/// simplificação assumida da web (`CabecalhoTela.vue`, pendência 28b), por consistência entre
/// plataformas (RNF-USA-01) — rastrear scroll só para isso custa mais que o ganho visual.
class CabecalhoTela extends StatelessWidget {
  static const double altura = 72;

  final String titulo;

  /// Presente nas telas abaixo da raiz de uma aba: `ArrowLeft` à esquerda do título, com
  /// `space-3` de gap (cadastro-por-isbn.md §4). Ausente nas quatro raízes do shell.
  final VoidCallback? aoVoltar;

  /// Ações da tela antes do sino, como o `DotsThreeVertical` do dono na página do livro pessoal.
  final List<Widget> acoes;

  /// Falso só fora do shell, onde não há sessão e portanto não há notificação (a política de
  /// privacidade aberta pelo cadastro, cadastro.md §5).
  final bool comSino;

  /// Com [aoVoltar]: formulário que se abandona (editar-perfil.md §4), com `X` no lugar da seta.
  final bool fechar;

  /// Sem o divisor inferior, como nos protótipos de F-AUT e F-PERFIL.
  final bool semDivisor;

  const CabecalhoTela({
    super.key,
    required this.titulo,
    this.aoVoltar,
    this.acoes = const <Widget>[],
    this.comSino = true,
    this.fechar = false,
    this.semDivisor = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.pageBackground,
        border: semDivisor ? null : Border(bottom: BorderSide(color: theme.divider)),
      ),
      child: SafeArea(
        bottom: false,
        child: ConstrainedBox(
          constraints: const BoxConstraints.tightFor(height: altura),
          child: Padding(
            // Com sino, a caixa de toque de 48px do sino entra 12px além do ícone; o padding final
            // cai esses 12px para o ícone continuar a `space-5` da borda.
            padding: EdgeInsets.only(
              left: DesignTokens.space5,
              right: comSino ? DesignTokens.space5 - 12 : DesignTokens.space5,
            ),
            child: Row(
              children: <Widget>[
                if (aoVoltar != null) ...<Widget>[
                  // Área tocável de 48px em volta do ícone de 24px (alvo mínimo de toque).
                  Semantics(
                    button: true,
                    label: fechar ? 'Fechar' : 'Voltar',
                    child: GestureDetector(
                      onTap: aoVoltar,
                      behavior: HitTestBehavior.opaque,
                      child: SizedBox(
                        width: 48,
                        height: 48,
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Icon(
                            fechar ? PhosphorIconsRegular.x : PhosphorIconsRegular.arrowLeft,
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
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                // Ações e sino são alvos de 48px com o ícone centralizado, sem espaço entre eles:
                // 24px de ícone a ícone, o mais perto dos 16px do protótipo sem encolher o toque.
                ...acoes,
                if (comSino) const _Sino(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Sino extends StatelessWidget {
  const _Sino();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final escopo = EscopoDeNotificacoes.maybeOf(context);
    final naoLidas = escopo?.notifier?.total ?? 0;
    // Área tocável de 48px em volta do ícone de 24px (alvo mínimo de toque).
    return Semantics(
      button: true,
      label: naoLidas > 0
          ? 'Notificações, ${contagem(naoLidas, 'não lida', 'não lidas')}'
          : 'Notificações',
      excludeSemantics: true,
      child: GestureDetector(
        onTap: escopo?.aoAbrir,
        behavior: HitTestBehavior.opaque,
        child: SizedBox(
          width: 48,
          height: 48,
          child: Center(child: _icone(theme, naoLidas)),
        ),
      ),
    );
  }

  Widget _icone(ThemeData theme, int naoLidas) {
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
                decoration: BoxDecoration(color: theme.primaryAccent, shape: BoxShape.circle),
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
