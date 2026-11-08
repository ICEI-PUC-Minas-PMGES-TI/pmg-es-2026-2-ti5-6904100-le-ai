import 'dart:async';

import 'package:flutter/widgets.dart';

import '../../core/network/api_client.dart';
import '../../core/session/session_controller.dart';
import 'dispositivo_push_store.dart';
import 'dispositivos_push_service.dart';
import 'mensageria_push.dart';
import 'servico_de_push.dart';

const Duration prazoDaRevogacaoNoLogout = Duration(seconds: 5);

class ServicoDePushFcm implements ServicoDePush {
  final MensageriaPush _mensageria;
  final DispositivosPushService _api;
  final DispositivoPushStore _store;
  SessionController? _sessao;
  AppLifecycleListener? _ciclo;
  StreamSubscription<String>? _tokens;
  bool _ativo = false;
  bool _revogando = false;
  Future<void>? _emCurso;

  ServicoDePushFcm({
    required MensageriaPush mensageria,
    required DispositivosPushService api,
    required DispositivoPushStore store,
  }) : _mensageria = mensageria,
       _api = api,
       _store = store;

  @override
  Future<bool> notificacoesPermitidas() => _mensageria.permissaoConcedida();

  @override
  Future<void> abrirAjustesDeNotificacao() => _mensageria.abrirAjustesDeNotificacao();

  void acompanhar(SessionController sessao) {
    _sessao = sessao;
    sessao.addListener(_aoMudarSessao);
    _ciclo = AppLifecycleListener(onResume: _aoRetomar);
    _aoMudarSessao();
  }

  Future<void> revogar() async {
    _revogando = true;
    _ativo = false;
    await _pararDeAcompanharToken();
    try {
      await _emCurso;
    } on Object {
      _emCurso = null;
    }
    final id = await _store.read();
    if (id == null) {
      return;
    }
    try {
      await _api.revogar(id).timeout(prazoDaRevogacaoNoLogout);
    } finally {
      await _store.delete();
    }
  }

  void dispose() {
    _sessao?.removeListener(_aoMudarSessao);
    _ciclo?.dispose();
    unawaited(_pararDeAcompanharToken());
  }

  void _aoMudarSessao() {
    final autenticado = _sessao!.estaAutenticado;
    if (!autenticado) {
      _revogando = false;
    }
    if (_revogando || autenticado == _ativo) {
      return;
    }
    _ativo = autenticado;
    if (autenticado) {
      _emCurso = _iniciar(pedirPermissao: true);
    } else {
      unawaited(_pararDeAcompanharToken());
    }
  }

  void _aoRetomar() {
    if (_ativo && _tokens == null) {
      _emCurso = _iniciar(pedirPermissao: false);
    }
  }

  Future<void> _iniciar({required bool pedirPermissao}) async {
    final permitido =
        await _mensageria.permissaoConcedida() ||
        (pedirPermissao && await _mensageria.solicitarPermissao());
    if (!permitido || !_ativo || _tokens != null) {
      return;
    }
    _tokens = _mensageria.tokenRenovado.listen((token) => _emCurso = _registrar(token));
    final token = await _mensageria.obterToken();
    if (token != null && _ativo) {
      await _registrar(token);
    }
  }

  Future<void> _registrar(String token) async {
    if (!_ativo) {
      return;
    }
    try {
      await _store.write(await _api.registrar(token));
    } on ApiException {
      return;
    }
  }

  Future<void> _pararDeAcompanharToken() async {
    final assinatura = _tokens;
    _tokens = null;
    await assinatura?.cancel();
  }
}
