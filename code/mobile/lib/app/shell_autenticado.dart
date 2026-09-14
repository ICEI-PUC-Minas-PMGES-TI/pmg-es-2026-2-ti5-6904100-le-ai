import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../design/theme.dart';
import 'barra_inferior.dart';
import 'cabecalho_tela.dart';

const List<String> _titulosPorAba = <String>['Minha estante', 'Descobrir', 'Feed', 'Meu perfil'];

/// O quadro em que as 4 áreas autenticadas vivem (shell-de-navegacao.md §1 e §4). `router.dart`
/// entrega um `navigationShell` do `StatefulShellRoute.indexedStack`, que preserva a pilha de
/// navegação de cada aba ao trocar entre elas — voltar para "Estante" restaura onde o usuário
/// tinha rolado, não reseta para o topo.
///
/// P0 não tem contagem real de não lidas (não existe RF de notificação ainda): o sino fica sem
/// badge até F-NOTIF existir.
class ShellAutenticado extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const ShellAutenticado({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: theme.pageBackground,
      body: Column(
        children: <Widget>[
          CabecalhoTela(titulo: _titulosPorAba[navigationShell.currentIndex]),
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
