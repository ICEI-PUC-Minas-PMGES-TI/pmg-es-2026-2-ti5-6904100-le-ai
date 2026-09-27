import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../design/theme.dart';
import '../features/notificacoes/contador_de_nao_lidas.dart';
import 'barra_inferior.dart';
import 'cabecalho_tela.dart';

const List<String> _titulosPorAba = <String>['Minha estante', 'Descobrir', 'Feed', 'Perfil'];
const List<String> _raizesDasAbas = <String>['/estante', '/descobrir', '/feed', '/perfil'];
const int _indiceDeDescobrir = 1;
const int _indiceDoPerfil = 3;

/// O quadro em que as 4 áreas autenticadas vivem (shell-de-navegacao.md §1 e §4). `router.dart`
/// entrega um `navigationShell` do `StatefulShellRoute.indexedStack`, que preserva a pilha de
/// navegação de cada aba ao trocar entre elas — voltar para "Estante" restaura onde o usuário
/// tinha rolado, não reseta para o topo.
///
/// O sino de todo cabeçalho do shell lê o [ContadorDeNaoLidas] pelo [EscopoDeNotificacoes] e abre
/// as notificações empilhadas na aba atual (F-NOT). O total é buscado ao entrar no shell e a cada
/// retorno do app ao primeiro plano: no Período 1 não há tempo real (RF-NOT-06).
///
/// Abaixo da raiz de uma aba (ex.: `/descobrir/adicionar-livro`), o cabeçalho da aba sai e a
/// própria tela desenha o seu, com seta de voltar e título próprio — o título da aba não diz
/// onde a pessoa está, e o protótipo de cada sub-tela pede o dela.
class ShellAutenticado extends StatefulWidget {
  final StatefulNavigationShell navigationShell;

  /// Caminho atual. Nulo mantém o cabeçalho da aba, que era o comportamento antes das sub-rotas.
  final String? caminhoAtual;

  /// Engrenagem no header da aba Perfil, que leva às configurações de F-AUT
  /// (configuracoes.md §1). Ausente, o header do Perfil fica só com o sino.
  final VoidCallback? aoAbrirConfiguracoes;

  /// Lupa no header da aba Perfil, antes da engrenagem (meu-perfil.md §4): busca **pessoas**
  /// por nome de usuário exato, nunca livros.
  final VoidCallback? aoBuscarLeitor;

  final ContadorDeNaoLidas contadorDeNaoLidas;

  /// Abre as notificações empilhadas na aba cuja raiz é o argumento.
  final void Function(String raizDaAba) aoAbrirNotificacoes;

  const ShellAutenticado({
    super.key,
    required this.navigationShell,
    this.caminhoAtual,
    this.aoAbrirConfiguracoes,
    this.aoBuscarLeitor,
    required this.contadorDeNaoLidas,
    required this.aoAbrirNotificacoes,
  });

  @override
  State<ShellAutenticado> createState() => _ShellAutenticadoState();
}

class _ShellAutenticadoState extends State<ShellAutenticado> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    widget.contadorDeNaoLidas.atualizar();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState estado) {
    if (estado == AppLifecycleState.resumed) {
      widget.contadorDeNaoLidas.atualizar();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final navigationShell = widget.navigationShell;
    final caminhoAtual = widget.caminhoAtual;
    final aoBuscarLeitor = widget.aoBuscarLeitor;
    final aoAbrirConfiguracoes = widget.aoAbrirConfiguracoes;
    return EscopoDeNotificacoes(
      contador: widget.contadorDeNaoLidas,
      aoAbrir: () => widget.aoAbrirNotificacoes(_raizesDasAbas[navigationShell.currentIndex]),
      child: Scaffold(
        backgroundColor: theme.pageBackground,
        body: Column(
          children: <Widget>[
            if (caminhoAtual == null || _raizesDasAbas.contains(caminhoAtual))
              CabecalhoTela(
                titulo: _titulosPorAba[navigationShell.currentIndex],
                // Perfil e Descobrir sem divisor, como nos protótipos de meu-perfil e descobrir: em
                // Descobrir o campo de busca, logo abaixo, é a segunda linha do header. As outras abas
                // ficam como estão.
                semDivisor:
                    navigationShell.currentIndex == _indiceDoPerfil ||
                    navigationShell.currentIndex == _indiceDeDescobrir,
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
                  if (navigationShell.currentIndex == _indiceDoPerfil &&
                      aoAbrirConfiguracoes != null)
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
      ),
    );
  }
}
