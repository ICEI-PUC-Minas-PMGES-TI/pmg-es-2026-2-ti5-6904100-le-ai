// ignore_for_file: deprecated_member_use

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'mensageria_push.dart';
import 'notificacao.dart';

const String _chaveDoTipo = 'tipo';
const String _chaveDaNotificacao = 'notificacaoId';
const MethodChannel _canalDeAjustes = MethodChannel('leai/ajustes');
const String _metodoAbrirAjustesDeNotificacao = 'abrirAjustesDeNotificacao';

Future<MensageriaPush> abrirMensageria() async {
  if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
    return const MensageriaIndisponivel();
  }
  try {
    await Firebase.initializeApp();
  } on FirebaseException {
    return const MensageriaIndisponivel();
  } on PlatformException {
    return const MensageriaIndisponivel();
  }
  return MensageriaFirebase(FirebaseMessaging.instance);
}

class MensageriaFirebase implements MensageriaPush {
  final FirebaseMessaging _messaging;

  MensageriaFirebase(this._messaging);

  @override
  Future<bool> permissaoConcedida() async =>
      _autorizada((await _messaging.getNotificationSettings()).authorizationStatus);

  @override
  Future<bool> solicitarPermissao() async =>
      _autorizada((await _messaging.requestPermission()).authorizationStatus);

  @override
  Future<String?> obterToken() async {
    try {
      return await _messaging.getToken();
    } on FirebaseException {
      return null;
    }
  }

  @override
  Stream<String> get tokenRenovado => _messaging.onTokenRefresh;

  @override
  Stream<String> get notificacoesAbertas =>
      FirebaseMessaging.onMessageOpenedApp.expand(_idDaNotificacao);

  @override
  Future<String?> notificacaoDaAberturaInicial() async {
    final mensagem = await _messaging.getInitialMessage();
    return mensagem == null ? null : _idDaNotificacao(mensagem).firstOrNull;
  }

  @override
  Future<void> abrirAjustesDeNotificacao() async {
    try {
      await _canalDeAjustes.invokeMethod<void>(_metodoAbrirAjustesDeNotificacao);
    } on PlatformException {
      return;
    }
  }

  static bool _autorizada(AuthorizationStatus status) =>
      status == AuthorizationStatus.authorized || status == AuthorizationStatus.provisional;

  static Iterable<String> _idDaNotificacao(RemoteMessage mensagem) {
    final id = mensagem.data[_chaveDaNotificacao];
    final tipoConhecido = TipoNotificacao.doContrato(mensagem.data[_chaveDoTipo] as String?) != null;
    return id is String && id.isNotEmpty && tipoConhecido ? <String>[id] : const <String>[];
  }
}
