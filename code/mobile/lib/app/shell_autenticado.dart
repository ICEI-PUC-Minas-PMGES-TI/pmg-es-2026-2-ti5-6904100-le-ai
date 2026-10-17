import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../design/theme.dart';
import '../features/estante/busca_na_estante.dart';
import '../features/estante/cabecalho_da_busca.dart';
import '../features/estante/textos.dart';
import '../features/notificacoes/canal_de_notificacoes.dart';
import '../features/notificacoes/contador_de_nao_lidas.dart';
import '../features/notificacoes/rotas_notificacoes.dart';
import 'barra_inferior.dart';
import 'cabecalho_tela.dart';

const List<String> _titulosPorAba = <String>['Minha estante', 'Descobrir', 'Feed', 'Perfil'];
const List<String> _raizesDasAbas = <String>['/estante', '/descobrir', '/feed', '/perfil'];
const int _indiceDaEstante = 0;
const int _indiceDeDescobrir = 1;
const int _indiceDoPerfil = 3;

/// O quadro em que as 4 áreas autenticadas vivem (shell-de-navegacao.md §1 e §4). `router.dart`
/// entrega um `navigationShell` do `StatefulShellRoute.indexedStack`, que preserva a pilha de
/// navegação de cada aba ao trocar entre elas — voltar para "Estante" restaura onde o usuário
/// tinha rolado, não reseta para o topo.
///
/// O sino de todo cabeçalho do shell lê o [ContadorDeNaoLidas] pelo [EscopoDeNotificacoes] e abre
/// as notificações empilhadas na aba atual (F-NOT). Elas são temporárias: trocar de aba pela barra
/// inferior as fecha antes, e a aba de origem volta à tela que estava por baixo. O canal de tempo
/// real (RF-NOT-06) fica aberto com o shell montado e o app em primeiro plano.
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

  /// Relógio e lupa no header da Estante (estante.md do Período 2, §4.1): o histórico de leituras
  /// e o modo de busca local, que troca o header pelo campo.
  final VoidCallback? aoAbrirHistorico;
  final BuscaNaEstante? buscaNaEstante;

  final ContadorDeNaoLidas contadorDeNaoLidas;

  final CanalDeNotificacoes canalDeNotificacoes;

  /// Abre as notificações empilhadas na aba cuja raiz é o argumento.
  final void Function(String raizDaAba) aoAbrirNotificacoes;

  /// Fecha as notificações que estão no topo da aba atual antes de trocar de aba.
  final Future<void> Function() fecharNotificacoes;

  const ShellAutenticado({
    super.key,
    required this.navigationShell,
    this.caminhoAtual,
    this.aoAbrirConfiguracoes,
    this.aoBuscarLeitor,
    this.aoAbrirHistorico,
    this.buscaNaEstante,
    required this.contadorDeNaoLidas,
    required this.canalDeNotificacoes,
    required this.aoAbrirNotificacoes,
    required this.fecharNotificacoes,
  });

  @override
  State<ShellAutenticado> createState() => _ShellAutenticadoState();
}

class _ShellAutenticadoState extends State<ShellAutenticado> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    widget.buscaNaEstante?.addListener(_aoMudarBusca);
    widget.contadorDeNaoLidas.atualizar();
    widget.canalDeNotificacoes.conectar();
  }

  @override
  void dispose() {
    widget.canalDeNotificacoes.desconectar();
    widget.buscaNaEstante?.removeListener(_aoMudarBusca);
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  bool? _buscaAberta;

  void _aoMudarBusca() {
    final aberta = widget.buscaNaEstante?.aberta;
    if (aberta != _buscaAberta) {
      setState(() => _buscaAberta = aberta);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState estado) {
    switch (estado) {
      case AppLifecycleState.resumed:
        widget.contadorDeNaoLidas.atualizar();
        widget.canalDeNotificacoes.conectar();
      case AppLifecycleState.paused:
        // Em segundo plano o sistema derruba a conexão de qualquer jeito; fechar antes poupa bateria.
        widget.canalDeNotificacoes.desconectar();
      case AppLifecycleState.inactive:
      case AppLifecycleState.hidden:
      case AppLifecycleState.detached:
        break;
    }
  }

  Future<void> _selecionar(int indice) async {
    final caminhoAtual = widget.caminhoAtual;
    if (indice != widget.navigationShell.currentIndex &&
        caminhoAtual != null &&
        ehRotaDeNotificacoes(caminhoAtual)) {
      await widget.fecharNotificacoes();
      if (!mounted) {
        return;
      }
    }
    // Lê o shell de novo: a pilha da aba mudou enquanto as notificações fechavam.
    final navigationShell = widget.navigationShell;
    // `initialLocation: true` quando o item já está ativo: tocar de novo em "Estante"
    // enquanto se está em Estante volta ao topo da pilha da aba, em vez de não fazer nada.
    navigationShell.goBranch(indice, initialLocation: indice == navigationShell.currentIndex);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final navigationShell = widget.navigationShell;
    final caminhoAtual = widget.caminhoAtual;
    final aoBuscarLeitor = widget.aoBuscarLeitor;
    final aoAbrirConfiguracoes = widget.aoAbrirConfiguracoes;
    final aoAbrirHistorico = widget.aoAbrirHistorico;
    final busca = widget.buscaNaEstante;
    final naEstante = navigationShell.currentIndex == _indiceDaEstante;
    return EscopoDeNotificacoes(
      contador: widget.contadorDeNaoLidas,
      aoAbrir: () => widget.aoAbrirNotificacoes(_raizesDasAbas[navigationShell.currentIndex]),
      child: Scaffold(
        backgroundColor: theme.pageBackground,
        body: Column(
          children: <Widget>[
            if ((caminhoAtual == null || _raizesDasAbas.contains(caminhoAtual)) &&
                naEstante &&
                busca != null &&
                busca.aberta)
              CabecalhoDaBuscaNaEstante(busca: busca)
            else if (caminhoAtual == null || _raizesDasAbas.contains(caminhoAtual))
              CabecalhoTela(
                titulo: _titulosPorAba[navigationShell.currentIndex],
                // Perfil e Descobrir sem divisor, como nos protótipos de meu-perfil e descobrir: em
                // Descobrir o campo de busca, logo abaixo, é a segunda linha do header. As outras abas
                // ficam como estão.
                semDivisor:
                    navigationShell.currentIndex == _indiceDoPerfil ||
                    navigationShell.currentIndex == _indiceDeDescobrir,
                acoes: <Widget>[
                  if (naEstante && aoAbrirHistorico != null)
                    IconButton(
                      onPressed: aoAbrirHistorico,
                      tooltip: rotuloHistorico,
                      constraints: const BoxConstraints.tightFor(width: 48, height: 48),
                      padding: EdgeInsets.zero,
                      icon: Icon(
                        PhosphorIconsRegular.clockCounterClockwise,
                        size: 24,
                        color: theme.textTheme.bodyMedium?.color,
                      ),
                    ),
                  if (naEstante && busca != null)
                    IconButton(
                      onPressed: busca.abrir,
                      tooltip: TextosDaBuscaNaEstante.placeholder,
                      constraints: const BoxConstraints.tightFor(width: 48, height: 48),
                      padding: EdgeInsets.zero,
                      icon: Icon(
                        PhosphorIconsRegular.magnifyingGlass,
                        size: 24,
                        color: theme.textTheme.bodyMedium?.color,
                      ),
                    ),
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
            // Contêiner semântico próprio para as abas: sem ele, o cabeçalho acima (título, lupa,
            // engrenagem e sino) sumia da árvore de acessibilidade nas quatro raízes, e o leitor
            // de tela não o alcançava. A causa provável é o `BlockSemantics` que o Flutter põe na
            // barreira de cada rota do navegador da aba, que derruba o que foi pintado antes dele
            // no mesmo contêiner.
            Expanded(child: Semantics(container: true, child: navigationShell)),
          ],
        ),
        bottomNavigationBar: BarraInferior(
          indiceAtivo: navigationShell.currentIndex,
          aoSelecionar: _selecionar,
        ),
      ),
    );
  }
}
