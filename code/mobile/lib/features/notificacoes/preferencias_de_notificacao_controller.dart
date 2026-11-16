import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import 'preferencias_de_notificacao.dart';
import 'preferencias_de_notificacao_service.dart';
import 'servico_de_push.dart';

enum EstadoDasPreferencias { carregando, pronta, erro }

class PreferenciasDeNotificacaoController extends ChangeNotifier {
  final PreferenciasDeNotificacaoService _servico;
  final ServicoDePush? _push;

  PreferenciasDeNotificacaoController(this._servico, this._push);

  EstadoDasPreferencias estado = EstadoDasPreferencias.carregando;
  bool pushNegado = false;

  final Map<TipoPreferenciaNotificacao, bool> _habilitadas =
      <TipoPreferenciaNotificacao, bool>{};
  final Set<TipoPreferenciaNotificacao> _salvando = <TipoPreferenciaNotificacao>{};
  final Set<TipoPreferenciaNotificacao> _comFalha = <TipoPreferenciaNotificacao>{};
  bool _descartado = false;

  bool habilitada(TipoPreferenciaNotificacao tipo) =>
      _habilitadas[tipo] ?? preferenciaHabilitadaPorPadrao;

  bool falhouAoSalvar(TipoPreferenciaNotificacao tipo) => _comFalha.contains(tipo);

  Future<void> carregar() async {
    estado = EstadoDasPreferencias.carregando;
    _avisar();
    try {
      final carregadas = await _servico.carregar();
      _habilitadas
        ..clear()
        ..addAll(carregadas);
      _comFalha.clear();
      estado = EstadoDasPreferencias.pronta;
    } on ApiException {
      estado = EstadoDasPreferencias.erro;
    } on FormatException {
      estado = EstadoDasPreferencias.erro;
    }
    _avisar();
  }

  Future<void> verificarPermissao() async {
    final push = _push;
    if (push == null) {
      return;
    }
    final permitidas = await push.notificacoesPermitidas();
    if (pushNegado == !permitidas) {
      return;
    }
    pushNegado = !permitidas;
    _avisar();
  }

  Future<void> alternar(TipoPreferenciaNotificacao tipo) async {
    if (estado != EstadoDasPreferencias.pronta || _salvando.contains(tipo)) {
      return;
    }
    final anterior = habilitada(tipo);
    _habilitadas[tipo] = !anterior;
    _comFalha.remove(tipo);
    _salvando.add(tipo);
    _avisar();
    try {
      await _servico.salvar(tipo, !anterior, idempotencyKey: ApiClient.newIdempotencyKey());
    } on ApiException {
      _habilitadas[tipo] = anterior;
      _comFalha.add(tipo);
    } finally {
      _salvando.remove(tipo);
    }
    _avisar();
  }

  void _avisar() {
    if (!_descartado) {
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _descartado = true;
    super.dispose();
  }
}
