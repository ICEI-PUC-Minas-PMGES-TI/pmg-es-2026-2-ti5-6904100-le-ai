import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../design/theme.dart';
import 'barra_inferior.dart';
import 'cabecalho_tela.dart';

const List<String> _titulosPorAba = <String>['Minha estante', 'Descobrir', 'Feed', 'Perfil'];
const List<String> _raizesDasAbas = <String>['/estante', '/descobrir', '/feed', '/perfil'];
const int _indiceDoPerfil = 3;

/// O quadro em que as 4 áreas autenticadas vivem (shell-de-navegacao.md §1 e §4). `router.dart`
/// entrega um `navigationShell` do `StatefulShellRoute.indexedStack`, que preserva a pilha de
/// navegação de cada aba ao trocar entre elas — voltar para "Estante" restaura onde o usuário
/// tinha rolado, não reseta para o topo.
///
/// P0 não tem contagem real de não lidas (não existe RF de notificação ainda): o sino fica sem
/// badge até F-NOTIF existir.
///
/// Abaixo da raiz de uma aba (ex.: `/descobrir/adicionar-livro`), o cabeçalho da aba sai e a
/// própria tela desenha o seu, com seta de voltar e título próprio — o título da aba não diz
/// onde a pessoa está, e o protótipo de cada sub-tela pede o dela.
class ShellAutenticado extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  /// Caminho atual. Nulo mantém o cabeçalho da aba, que era o comportamento antes das sub-rotas.
  final String? caminhoAtual;

  /// Engrenagem no header da aba Perfil, que leva às configurações de F-AUT
  /// (configuracoes.md §1). Ausente, o header do Perfil fica só com o sino.
  final VoidCallback? aoAbrirConfiguracoes;

  /// Lupa no header da aba Perfil, antes da engrenagem (meu-perfil.md §4): busca **pessoas**
  /// por nome de usuário exato, nunca livros.
  final VoidCallback? aoBuscarLeitor;

  const ShellAutenticado({
    super.key,
    required this.navigationShell,
    this.caminhoAtual,
    this.aoAbrirConfiguracoes,
    this.aoBuscarLeitor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: theme.pageBackground,
      body: Column(
        children: <Widget>[
          if (caminhoAtual == null || _raizesDasAbas.contains(caminhoAtual))
            CabecalhoTela(
              titulo: _titulosPorAba[navigationShell.currentIndex],
              // Perfil sem divisor, como no protótipo de meu-perfil; as outras abas ficam como estão.
              semDivisor: navigationShell.currentIndex == _indiceDoPerfil,
              acoes: <Widget>[
                if (navigationShell.currentIndex == _indiceDoPerfil && aoBuscarLeitor != null)
                  IconButton(
                    onPressed: aoBuscarLeitor,
                    tooltip: 'Buscar leitor',
                    constraints: const BoxConstraints.tightFor(width: 48, height: 48),
                    padding: EdgeInsets.zero,
                    icon: Icon(
                      PhosphorIconsRegular.magnifyingGlass,
                      size: 24,
                      color: theme.textTheme.bodyMedium?.color,
                    ),
                  ),
                if (navigationShell.currentIndex == _indiceDoPerfil && aoAbrirConfiguracoes != null)
                  IconButton(
                    onPressed: aoAbrirConfiguracoes,
                    tooltip: 'Configurações',
                    constraints: const BoxConstraints.tightFor(width: 48, height: 48),
                    padding: EdgeInsets.zero,
                    icon: Icon(
                      PhosphorIconsRegular.gear,
                      size: 24,
                      color: theme.textTheme.bodyMedium?.color,
                    ),
                  ),
              ],
            ),
          Expanded(child: navigationShell),
        ],
      ),
      bottomNavigationBar: BarraInferior(
        indiceAtivo: navigationShell.currentIndex,
        // `initialLocation: true` quando o item já está ativo: tocar de novo em "Estante"
        // enquanto se está em Estante volta ao topo da pilha da aba, em vez de não fazer nada.
        aoSelecionar: (indice) => navigationShell.goBranch(
          indice,
          initialLocation: indice == navigationShell.currentIndex,
        ),
      ),
    );
  }
}
