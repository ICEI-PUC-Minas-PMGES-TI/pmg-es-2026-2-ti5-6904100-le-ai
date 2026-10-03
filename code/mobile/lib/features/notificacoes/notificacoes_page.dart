import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/dialogo_confirmacao.dart';
import '../../design/widgets/entrada_suave.dart';
import '../../design/widgets/estado_vazio.dart';
import '../perfil/lista_paginada.dart';
import '../perfil/perfil_service.dart';
import '../perfil/textos.dart';
import '../perfil/widgets_de_perfil.dart';
import 'canal_de_notificacoes.dart';
import 'contador_de_nao_lidas.dart';
import 'notificacao.dart';
import 'notificacoes_service.dart';

const int _itensDoSkeleton = 6;
const int _itensDoSkeletonNoFim = 2;
const int _linhasDoTexto = 3;

/// Notificações in-app (RF-NOT-02/03/04), a partir de docs/design/periodo-1/F-NOT/notificacoes.md.
/// Não lida é só o ponto `musgo` de 8px; abrir marca como lida, e `Marcar todas` zera o badge. A
/// leitura em risco oferece `Abandonar leitura`, que sempre passa pelo modal (RNF-USA-04), ao
/// lado de `Registrar progresso`, e depois de abandonar o item fica na lista, lido.
class NotificacoesPage extends StatefulWidget {
  final NotificacoesService servico;
  final ContadorDeNaoLidas contador;

  final CanalDeNotificacoes canal;
  final VoidCallback? aoVoltar;

  /// Destino do tipo: perfil de quem seguiu, caixa de solicitações, feed ou página do livro.
  final void Function(Notificacao notificacao) aoAbrir;
  final void Function(Notificacao notificacao) aoRegistrarProgresso;

  const NotificacoesPage({
    super.key,
    required this.servico,
    required this.contador,
    required this.canal,
    this.aoVoltar,
    required this.aoAbrir,
    required this.aoRegistrarProgresso,
  });

  @override
  State<NotificacoesPage> createState() => _NotificacoesPageState();
}

class _NotificacoesPageState extends State<NotificacoesPage> {
  late final ListaPaginada<Notificacao> _lista = ListaPaginada<Notificacao>(
    _buscar,
    (notificacao) => notificacao.id,
  );
  final Set<String> _abandonadas = <String>{};
  final Set<String> _abandonando = <String>{};
  final Map<String, String> _erros = <String, String>{};
  bool _marcandoTodas = false;

  final ScrollController _rolagem = ScrollController();
  late final StreamSubscription<EventoDeNotificacoes> _tempoReal;

  /// Chegaram com a lista rolada e esperam o topo: a lista não se mexe debaixo do dedo (P2 §5.2).
  final List<Notificacao> _pendentes = <Notificacao>[];

  final Set<String> _recemChegadas = <String>{};

  @override
  void initState() {
    super.initState();
    _lista.addListener(_aoMudarLista);
    widget.contador.addListener(_redesenhar);
    _rolagem.addListener(_aoRolar);
    _tempoReal = widget.canal.eventos.listen(_aoReceber);
    _lista.carregar();
  }

  @override
  void dispose() {
    unawaited(_tempoReal.cancel());
    widget.contador.removeListener(_redesenhar);
    _rolagem.dispose();
    _lista.dispose();
    super.dispose();
  }

  void _redesenhar() {
    if (mounted) {
      setState(() {});
    }
  }

  void _aoMudarLista() {
    _soltarPendentesNoTopo();
    _redesenhar();
  }

  void _aoRolar() {
    if (_pendentes.isNotEmpty) {
      _soltarPendentesNoTopo();
    }
  }

  bool get _noTopo => !_rolagem.hasClients || _rolagem.offset <= 0;

  void _aoReceber(EventoDeNotificacoes evento) {
    switch (evento) {
      case NotificacaoRecebida(:final notificacao?):
        _chegaram(<Notificacao>[notificacao]);
      case NotificacaoRecebida():
        break;
      case SincronizacaoDeNotificacoes():
        unawaited(_sincronizar());
    }
  }

  Future<void> _sincronizar() async {
    if (_lista.carregando || _lista.falhou) {
      return;
    }
    try {
      final pagina = await widget.servico.listar(0);
      widget.contador.definir(pagina.totalNaoLidas);
      _chegaram(pagina.itens);
    } on ApiException {
      // O canal reconecta e sincroniza outra vez.
    }
  }

  void _chegaram(List<Notificacao> novas) {
    if (!mounted) {
      return;
    }
    final conhecidas = <String>{..._lista.itens.map((n) => n.id), ..._pendentes.map((n) => n.id)};
    final ineditas = novas.where((n) => conhecidas.add(n.id)).toList();
    if (ineditas.isEmpty) {
      return;
    }
    setState(() => _pendentes.insertAll(0, ineditas));
    _soltarPendentesNoTopo();
  }

  void _soltarPendentesNoTopo() {
    if (_pendentes.isEmpty || _lista.carregando || _lista.falhou || !_noTopo) {
      return;
    }
    final novas = List<Notificacao>.of(_pendentes);
    _pendentes.clear();
    _recemChegadas.addAll(novas.map((n) => n.id));
    _lista.mesclarNoTopo(novas);
  }

  void _irAoTopo() {
    if (!_rolagem.hasClients) {
      return;
    }
    if (MediaQuery.of(context).disableAnimations) {
      _rolagem.jumpTo(0);
      return;
    }
    unawaited(
      _rolagem.animateTo(0, duration: DesignTokens.durSlow, curve: DesignTokens.easeInOut),
    );
  }

  Future<Pagina<Notificacao>> _buscar(int pagina) async {
    final resultado = await widget.servico.listar(pagina);
    widget.contador.definir(resultado.totalNaoLidas);
    return Pagina<Notificacao>(
      itens: resultado.itens,
      pagina: pagina,
      totalElementos: resultado.totalItens,
      totalPaginas: resultado.totalPaginas,
    );
  }

  int get _naoLidas => widget.contador.total;

  void _marcarLocalmente(Set<String> ids) {
    setState(() {
      _lista.itens = _lista.itens.map((n) => ids.contains(n.id) ? n.comoLida() : n).toList();
    });
  }

  /// Abrir marca como lida (RF-NOT-03, individual). A marcação corre junto da navegação: se ela
  /// falhar, a notificação continua não lida no servidor e volta a aparecer assim na próxima carga.
  void _abrir(Notificacao notificacao) {
    if (!notificacao.lida) {
      _marcarComoLida(notificacao);
      SemanticsService.sendAnnouncement(
        View.of(context),
        'Notificação marcada como lida',
        Directionality.of(context),
      );
    }
    widget.aoAbrir(notificacao);
  }

  Future<void> _marcarComoLida(Notificacao notificacao) async {
    _marcarLocalmente(<String>{notificacao.id});
    widget.contador.definir(_naoLidas > 0 ? _naoLidas - 1 : 0);
    try {
      final total = await widget.servico.marcarLidas(<String>[
        notificacao.id,
      ], idempotencyKey: ApiClient.newIdempotencyKey());
      widget.contador.definir(total);
    } on ApiException {
      // O servidor manda: a próxima carga da lista e do badge traz o estado real.
    }
  }

  Future<void> _marcarTodas() async {
    final quantas = _naoLidas;
    setState(() => _marcandoTodas = true);
    try {
      final total = await widget.servico.marcarTodas(idempotencyKey: ApiClient.newIdempotencyKey());
      if (!mounted) {
        return;
      }
      _marcarLocalmente(_lista.itens.map((n) => n.id).toSet());
      widget.contador.definir(total);
      SemanticsService.sendAnnouncement(
        View.of(context),
        '${contagem(quantas, 'notificação marcada', 'notificações marcadas')} como lidas',
        Directionality.of(context),
      );
    } on ApiException catch (erro) {
      if (mounted) {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(erro.message)));
      }
    } finally {
      if (mounted) {
        setState(() => _marcandoTodas = false);
      }
    }
  }

  Future<void> _abandonar(Notificacao notificacao) async {
    final titulo = notificacao.livro?.titulo;
    final confirmado = await confirmarNoModal(
      context,
      titulo: titulo == null ? 'Abandonar esta leitura?' : 'Abandonar $titulo?',
      texto:
          'A leitura passa para Abandonado na sua estante, e seu progresso continua salvo. '
          'Você pode retomar depois.',
      acao: 'Abandonar',
    );
    if (!confirmado || !mounted) {
      return;
    }
    setState(() {
      _abandonando.add(notificacao.id);
      _erros.remove(notificacao.id);
    });
    try {
      await widget.servico.abandonarLeitura(
        notificacao.leituraId!,
        idempotencyKey: ApiClient.newIdempotencyKey(),
      );
      if (!mounted) {
        return;
      }
      setState(() => _abandonadas.add(notificacao.id));
      if (!notificacao.lida) {
        await _marcarComoLida(notificacao);
      }
    } on ApiException catch (erro) {
      if (mounted) {
        setState(
          () => _erros[notificacao.id] = erro.status == 404 || erro.status == 409
              // Já finalizada, abandonada ou retomada em outro lugar: a estante tem o estado atual.
              ? 'Esta leitura não está mais em andamento.'
              : erro.message,
        );
      }
    } finally {
      if (mounted) {
        setState(() => _abandonando.remove(notificacao.id));
      }
    }
  }

  bool _pertoDoFim(ScrollNotification notificacao) {
    if (notificacao.metrics.extentAfter < 300) {
      _lista.carregarMais();
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final comLista = !_lista.carregando && !_lista.falhou && _lista.itens.isNotEmpty;
    // A linha de contexto fica acima da lista: surgir com ela rolada empurraria o que se lê. Só as
    // não lidas já na lista contam para ela aparecer; as que esperam o topo entram no número.
    final comContexto = comLista && _naoLidas - _pendentes.where((n) => !n.lida).length > 0;
    return Column(
      children: <Widget>[
        CabecalhoTela(
          titulo: 'Notificações',
          aoVoltar: widget.aoVoltar,
          comSino: false,
          semDivisor: comContexto,
          acoes: <Widget>[
            if (_naoLidas > 0 && !_lista.falhou)
              Opacity(
                opacity: _lista.carregando || _marcandoTodas ? 0.5 : 1,
                child: BotaoTextual(
                  texto: 'Marcar todas',
                  onPressed: _lista.carregando || _marcandoTodas ? null : _marcarTodas,
                ),
              ),
          ],
        ),
        if (comContexto) _linhaDeContexto(theme),
        Expanded(
          child: Stack(
            children: <Widget>[
              Positioned.fill(
                child: NotificationListener<ScrollNotification>(
                  onNotification: _pertoDoFim,
                  child: _conteudo(theme),
                ),
              ),
              Positioned(
                top: DesignTokens.space3,
                left: 0,
                right: 0,
                child: Center(
                  child: _AvisoDeNovas(
                    quantas: comLista ? _pendentes.length : 0,
                    aoTocar: _irAoTopo,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _linhaDeContexto(ThemeData theme) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.space5,
        vertical: DesignTokens.space3,
      ),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: theme.divider)),
      ),
      child: Semantics(
        liveRegion: true,
        child: Text(
          contagem(_naoLidas, 'não lida', 'não lidas'),
          style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
        ),
      ),
    );
  }

  Widget _conteudo(ThemeData theme) {
    if (_lista.carregando) {
      // Também o estado do cold start (RNF-ERR-09): demora não é erro.
      return EntradaSuave(
        child: ListView(
          children: List<Widget>.generate(_itensDoSkeleton, (_) => const _SkeletonDeNotificacao()),
        ),
      );
    }
    if (_lista.falhou) {
      return ListView(
        padding: const EdgeInsets.all(DesignTokens.space5),
        children: <Widget>[
          BannerAviso(
            variante: VarianteAviso.erro,
            triangulo: true,
            mensagem:
                'Não foi possível carregar suas notificações. Verifique sua conexão e tente de novo.',
            acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _lista.carregar),
          ),
        ],
      );
    }
    if (_lista.itens.isEmpty) {
      return const CustomScrollView(
        slivers: <Widget>[
          SliverFillRemaining(
            hasScrollBody: false,
            child: Padding(
              padding: EdgeInsets.all(DesignTokens.space5),
              child: Center(
                child: EstadoVazio(
                  icone: PhosphorIconsRegular.bell,
                  solto: true,
                  titulo: 'Nada por enquanto',
                  texto:
                      'Curtidas, comentários, novos seguidores e avisos das suas leituras '
                      'aparecem aqui.',
                ),
              ),
            ),
          ),
        ],
      );
    }
    return ListView.separated(
      controller: _rolagem,
      itemCount: _lista.itens.length + 1,
      separatorBuilder: (_, _) => Divider(height: 1, thickness: 1, color: theme.divider),
      itemBuilder: (context, indice) {
        if (indice == _lista.itens.length) {
          return Semantics(
            liveRegion: _lista.carregandoMais,
            label: _lista.carregandoMais ? 'Carregando mais notificações' : null,
            child: FimDaLista(
              temMais: _lista.temMais,
              carregandoMais: _lista.carregandoMais,
              falhou: _lista.falhouMais,
              aoCarregar: _lista.carregarMais,
              esqueleto: EntradaSuave(
                child: Column(
                  children: List<Widget>.generate(
                    _itensDoSkeletonNoFim,
                    (_) => const _SkeletonDeNotificacao(),
                  ),
                ),
              ),
            ),
          );
        }
        final notificacao = _lista.itens[indice];
        final item = _item(theme, notificacao);
        return _recemChegadas.contains(notificacao.id)
            ? _Chegada(
                key: ValueKey<String>(notificacao.id),
                aoTerminar: () => _recemChegadas.remove(notificacao.id),
                child: item,
              )
            : item;
      },
    );
  }

  Widget _item(ThemeData theme, Notificacao notificacao) {
    final tempo = tempoDeEspera(notificacao.criadoEm);
    final abandonada = _abandonadas.contains(notificacao.id);
    final erro = _erros[notificacao.id];
    return Semantics(
      button: true,
      child: GestureDetector(
        onTap: () => _abrir(notificacao),
        behavior: HitTestBehavior.opaque,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: DesignTokens.space5,
            vertical: DesignTokens.space4,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              _PontoEIcone(tipo: notificacao.tipo, lida: notificacao.lida),
              const SizedBox(width: DesignTokens.space3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Semantics(
                      label:
                          '${notificacao.lida ? '' : 'Não lida. '}${notificacao.mensagem} $tempo',
                      excludeSemantics: true,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          _Texto(notificacao: notificacao),
                          const SizedBox(height: DesignTokens.space1),
                          Text(
                            tempo,
                            style: theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText),
                          ),
                        ],
                      ),
                    ),
                    if (notificacao.podeAbandonar && notificacao.leituraId != null)
                      _acoesDeRisco(theme, notificacao, abandonada),
                    if (erro != null) ...<Widget>[
                      const SizedBox(height: DesignTokens.space2),
                      Text(
                        erro,
                        style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// As duas respostas legítimas ao aviso de RN-05, nunca só a destrutiva (§4.2). Abandonar é
  /// textual `rubi`, nunca preenchido, e sempre confirma antes.
  Widget _acoesDeRisco(ThemeData theme, Notificacao notificacao, bool abandonada) {
    if (abandonada) {
      return Padding(
        padding: const EdgeInsets.only(top: DesignTokens.space3),
        child: Semantics(
          liveRegion: true,
          child: Text(
            'Leitura abandonada.',
            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
          ),
        ),
      );
    }
    final ocupado = _abandonando.contains(notificacao.id);
    ButtonStyle estilo(Color cor) => TextButton.styleFrom(
      foregroundColor: cor,
      minimumSize: const Size(48, 48),
      padding: EdgeInsets.zero,
      textStyle: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
      splashFactory: NoSplash.splashFactory,
    );
    return Padding(
      padding: const EdgeInsets.only(top: DesignTokens.space1),
      child: Row(
        children: <Widget>[
          TextButton(
            onPressed: ocupado ? null : () => _abandonar(notificacao),
            style: estilo(theme.colorScheme.error),
            child: const Text('Abandonar leitura'),
          ),
          const SizedBox(width: DesignTokens.space4),
          TextButton(
            onPressed: ocupado ? null : () => widget.aoRegistrarProgresso(notificacao),
            style: estilo(theme.primaryAccent),
            child: const Text('Registrar progresso'),
          ),
        ],
      ),
    );
  }
}

/// Aviso `N novas notificações` (notificacoes.md P2 §5.2).
class _AvisoDeNovas extends StatefulWidget {
  final int quantas;
  final VoidCallback aoTocar;

  const _AvisoDeNovas({required this.quantas, required this.aoTocar});

  @override
  State<_AvisoDeNovas> createState() => _AvisoDeNovasState();
}

class _AvisoDeNovasState extends State<_AvisoDeNovas> {
  static const double _altura = 36;
  static const double _areaDeToque = 48;
  static const double _icone = 16;

  /// O fade de saída mostra o último número, não `0 novas notificações`.
  int _exibidas = 0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final quantas = widget.quantas;
    final aoTocar = widget.aoTocar;
    final visivel = quantas > 0;
    if (visivel) {
      _exibidas = quantas;
    }
    final texto = _exibidas == 1 ? '1 nova notificação' : '$_exibidas novas notificações';
    return IgnorePointer(
      ignoring: !visivel,
      child: AnimatedOpacity(
        opacity: visivel ? 1 : 0,
        duration: MediaQuery.of(context).disableAnimations ? Duration.zero : DesignTokens.durFast,
        child: Semantics(
          button: true,
          liveRegion: true,
          label: visivel ? '$texto. Voltar ao topo' : null,
          excludeSemantics: true,
          child: GestureDetector(
            onTap: aoTocar,
            behavior: HitTestBehavior.opaque,
            child: SizedBox(
              height: _areaDeToque,
              child: Center(
                child: Container(
                  height: _altura,
                  padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space4),
                  decoration: BoxDecoration(
                    color: theme.elevatedSurface,
                    borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
                    border: Border.all(color: theme.divider),
                    boxShadow: theme.elevation2,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      Icon(PhosphorIconsRegular.arrowUp, size: _icone, color: theme.primaryAccent),
                      const SizedBox(width: DesignTokens.space2),
                      Text(
                        texto,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.primaryAccent,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Animação de chegada pelo tempo real (P2 §5.1).
class _Chegada extends StatelessWidget {
  static const double _deslocamento = 8;

  final VoidCallback aoTerminar;
  final Widget child;

  const _Chegada({super.key, required this.aoTerminar, required this.child});

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.of(context).disableAnimations) {
      aoTerminar();
      return child;
    }
    return TweenAnimationBuilder<double>(
      onEnd: aoTerminar,
      tween: Tween<double>(begin: 0, end: 1),
      duration: DesignTokens.durBase,
      curve: DesignTokens.easeOut,
      child: child,
      builder: (context, progresso, child) => Opacity(
        opacity: progresso,
        child: Transform.translate(
          offset: Offset(0, (progresso - 1) * _deslocamento),
          child: child,
        ),
      ),
    );
  }
}

/// Ponto de não lida à esquerda do ícone contextual, centrado nele (§5.6). Lido é a ausência do
/// ponto, e só: o item não esmaece.
class _PontoEIcone extends StatelessWidget {
  final TipoNotificacao tipo;
  final bool lida;

  const _PontoEIcone({required this.tipo, required this.lida});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final emRisco = tipo == TipoNotificacao.leituraEmRisco;
    return SizedBox(
      height: 24,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          AnimatedOpacity(
            opacity: lida ? 0 : 1,
            duration: MediaQuery.of(context).disableAnimations
                ? Duration.zero
                : DesignTokens.durFast,
            child: Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: theme.primaryAccent, shape: BoxShape.circle),
            ),
          ),
          const SizedBox(width: DesignTokens.space2),
          // Só o Warning tem cor própria: é o único que pede ação do leitor.
          Icon(_icone(tipo), size: 24, color: emRisco ? theme.warningColor : theme.secondaryText),
        ],
      ),
    );
  }

  static IconData _icone(TipoNotificacao tipo) => switch (tipo) {
    TipoNotificacao.atividadeCurtida => PhosphorIconsRegular.heart,
    TipoNotificacao.atividadeComentada ||
    TipoNotificacao.comentarioRespondido => PhosphorIconsRegular.chatCircle,
    TipoNotificacao.novoSeguidor ||
    TipoNotificacao.solicitacaoCriada => PhosphorIconsRegular.userPlus,
    TipoNotificacao.solicitacaoAceita => PhosphorIconsRegular.userCheck,
    TipoNotificacao.usuarioMencionado => PhosphorIconsRegular.at,
    TipoNotificacao.leituraEmRisco => PhosphorIconsRegular.warning,
    TipoNotificacao.leituraExpirada => PhosphorIconsRegular.pauseCircle,
  };
}

/// Frase do servidor, com o nome de quem agiu em `body-strong` quando ela começa por ele.
class _Texto extends StatelessWidget {
  final Notificacao notificacao;

  const _Texto({required this.notificacao});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final estilo = theme.textTheme.bodyMedium;
    final nome = notificacao.ator?.nomeExibicao;
    final mensagem = notificacao.mensagem;
    final spans = nome != null && mensagem.startsWith(nome)
        ? <TextSpan>[
            TextSpan(
              text: nome,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            TextSpan(text: mensagem.substring(nome.length)),
          ]
        : <TextSpan>[TextSpan(text: mensagem)];
    return Text.rich(
      TextSpan(style: estilo, children: spans),
      maxLines: _linhasDoTexto,
      overflow: TextOverflow.ellipsis,
    );
  }
}

/// Skeleton estático de um item (§4.6): quadrado de 24px e duas barras de 15px e 13px, em 85% e
/// 30% da largura.
class _SkeletonDeNotificacao extends StatelessWidget {
  const _SkeletonDeNotificacao();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget peca({double? largura, required double altura}) => Container(
      width: largura,
      height: altura,
      decoration: BoxDecoration(
        color: theme.coverPlaceholder,
        borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
      ),
    );
    Widget barra(double altura, double fracao) => FractionallySizedBox(
      widthFactor: fracao,
      alignment: Alignment.centerLeft,
      child: peca(altura: altura),
    );
    return ExcludeSemantics(
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: DesignTokens.space5,
          vertical: DesignTokens.space4,
        ),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: theme.divider)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const SizedBox(width: 8 + DesignTokens.space2),
            peca(largura: 24, altura: 24),
            const SizedBox(width: DesignTokens.space3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  barra(15, 0.85),
                  const SizedBox(height: DesignTokens.space2),
                  barra(13, 0.3),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
