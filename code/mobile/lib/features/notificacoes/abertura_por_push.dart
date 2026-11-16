import 'dart:async';

import 'package:go_router/go_router.dart';

import '../../core/network/api_client.dart';
import '../../core/session/session_controller.dart';
import '../livros/rotas_livros.dart';
import 'mensageria_push.dart';
import 'notificacao.dart';
import 'rotas_notificacoes.dart';

class AberturaPorPush {
  final MensageriaPush _mensageria;
  final SessionController _sessao;
  final DependenciasDeNotificacoes _notificacoes;
  StreamSubscription<String>? _abertas;
  GoRouter? _router;
  String? _pendente;

  AberturaPorPush({
    required MensageriaPush mensageria,
    required SessionController sessao,
    required DependenciasDeNotificacoes notificacoes,
  }) : _mensageria = mensageria,
       _sessao = sessao,
       _notificacoes = notificacoes;

  void iniciar(GoRouter router) {
    _router = router;
    _abertas = _mensageria.notificacoesAbertas.listen(_receber);
    _sessao.addListener(_tentarAbrir);
    unawaited(_receberAberturaInicial());
  }

  void dispose() {
    _sessao.removeListener(_tentarAbrir);
    unawaited(_abertas?.cancel());
  }

  Future<void> _receberAberturaInicial() async {
    final id = await _mensageria.notificacaoDaAberturaInicial();
    if (id != null) {
      _receber(id);
    }
  }

  void _receber(String notificacaoId) {
    _pendente = notificacaoId;
    _tentarAbrir();
  }

  void _tentarAbrir() {
    final id = _pendente;
    if (id == null || _sessao.carregando) {
      return;
    }
    _pendente = null;
    if (_sessao.estaAutenticado) {
      unawaited(_abrir(id));
    }
  }

  Future<void> _abrir(String notificacaoId) async {
    final notificacao = await _buscar(notificacaoId);
    final destino = notificacao == null
        ? rotaNotificacoes(rotaEstanteRaiz)
        : destinoDaNotificacao(notificacao);
    final router = _router!;
    if (ehRotaDeNotificacoes(router.routeInformationProvider.value.uri.path)) {
      await _notificacoes.fechamento.fechar(router);
    }
    router.go(destino);
    if (notificacao != null && !notificacao.lida) {
      await _marcarComoLida(notificacao);
    }
  }

  Future<Notificacao?> _buscar(String notificacaoId) async {
    try {
      final pagina = await _notificacoes.servico.listar(0);
      return pagina.itens.where((item) => item.id == notificacaoId).firstOrNull;
    } on ApiException {
      return null;
    }
  }

  Future<void> _marcarComoLida(Notificacao notificacao) async {
    try {
      final total = await _notificacoes.servico.marcarLidas(
        <String>[notificacao.id],
        idempotencyKey: ApiClient.newIdempotencyKey(),
      );
      _notificacoes.contador.definir(total);
    } on ApiException {
      return;
    }
  }
}
