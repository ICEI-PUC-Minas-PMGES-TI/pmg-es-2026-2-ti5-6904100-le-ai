import 'dart:async';
import 'dart:convert';
import 'dart:math';

import '../../core/network/api_client.dart';
import '../../core/network/eventos_sse.dart';
import 'notificacao.dart';

sealed class EventoDeNotificacoes {
  final int totalNaoLidas;

  const EventoDeNotificacoes(this.totalNaoLidas);
}

/// Primeiro evento de toda conexão; após uma queda, a lista busca a página 0 de novo.
class SincronizacaoDeNotificacoes extends EventoDeNotificacoes {
  const SincronizacaoDeNotificacoes(super.totalNaoLidas);
}

/// Uma notificação nova do leitor. [notificacao] é nula para um tipo que esta versão do app não
/// conhece; o total continua valendo para o badge.
class NotificacaoRecebida extends EventoDeNotificacoes {
  final Notificacao? notificacao;

  const NotificacaoRecebida(this.notificacao, super.totalNaoLidas);
}

const String _eventoSincronizacao = 'sincronizacao';
const String _eventoNotificacao = 'notificacao';

/// Canal SSE das notificações (RF-NOT-06). Queda e cold start são reconexão silenciosa com backoff
/// (RNF-ERR-09/03); só a sessão que não renova encerra o canal até o próximo [conectar].
class CanalDeNotificacoes {
  static const Duration esperaInicial = Duration(seconds: 1);
  static const Duration esperaMaxima = Duration(seconds: 30);

  /// Fração máxima somada a cada espera, para os apps não reconectarem todos no mesmo instante
  /// quando o serviço volta.
  static const double _jitter = 0.5;

  final Future<Stream<List<int>>> Function() _abrir;
  final Random _aleatorio;
  final StreamController<EventoDeNotificacoes> _eventos =
      StreamController<EventoDeNotificacoes>.broadcast();

  bool _ativo = false;
  int _falhasSeguidas = 0;
  StreamSubscription<EventoSse>? _conexao;
  Timer? _reconexao;

  CanalDeNotificacoes(this._abrir, {Random? aleatorio}) : _aleatorio = aleatorio ?? Random();

  Stream<EventoDeNotificacoes> get eventos => _eventos.stream;

  void conectar() {
    if (_ativo) {
      return;
    }
    _ativo = true;
    _falhasSeguidas = 0;
    unawaited(_abrirConexao());
  }

  void desconectar() {
    _ativo = false;
    _reconexao?.cancel();
    _reconexao = null;
    unawaited(_conexao?.cancel());
    _conexao = null;
  }

  void dispose() {
    desconectar();
    unawaited(_eventos.close());
  }

  Future<void> _abrirConexao() async {
    final Stream<List<int>> corpo;
    try {
      corpo = await _abrir();
    } on ApiException catch (erro) {
      if (erro.status == 401) {
        // A renovação já foi tentada na abertura: sem sessão, insistir não adianta.
        _ativo = false;
        return;
      }
      _agendarReconexao();
      return;
    }
    if (!_ativo) {
      unawaited(corpo.listen(null).cancel());
      return;
    }
    _conexao = decodificarSse(corpo).listen(
      _receber,
      onError: (Object _) => _aoCair(),
      onDone: _aoCair,
      cancelOnError: true,
    );
  }

  void _receber(EventoSse evento) {
    final interpretado = _interpretar(evento);
    if (interpretado == null) {
      return;
    }
    _falhasSeguidas = 0;
    _eventos.add(interpretado);
  }

  static EventoDeNotificacoes? _interpretar(EventoSse evento) {
    final Object? json;
    try {
      json = jsonDecode(evento.dado);
    } on FormatException {
      return null;
    }
    if (json is! Map<String, dynamic> || json['totalNaoLidas'] is! num) {
      return null;
    }
    final total = (json['totalNaoLidas'] as num).toInt();
    switch (evento.nome) {
      case _eventoSincronizacao:
        return SincronizacaoDeNotificacoes(total);
      case _eventoNotificacao:
        final bruta = json['notificacao'];
        return NotificacaoRecebida(
          bruta is Map<String, dynamic> ? Notificacao.fromJson(bruta) : null,
          total,
        );
    }
    return null;
  }

  void _aoCair() {
    _conexao = null;
    _agendarReconexao();
  }

  void _agendarReconexao() {
    if (!_ativo) {
      return;
    }
    _reconexao = Timer(esperaDaTentativa(_falhasSeguidas, _aleatorio), () {
      _reconexao = null;
      if (_ativo) {
        unawaited(_abrirConexao());
      }
    });
    _falhasSeguidas++;
  }

  static Duration esperaDaTentativa(int falhasSeguidas, Random aleatorio) {
    final base = min(
      esperaInicial.inMilliseconds * pow(2, min(falhasSeguidas, 10)),
      esperaMaxima.inMilliseconds,
    ).toInt();
    return Duration(milliseconds: base + (base * _jitter * aleatorio.nextDouble()).round());
  }
}
