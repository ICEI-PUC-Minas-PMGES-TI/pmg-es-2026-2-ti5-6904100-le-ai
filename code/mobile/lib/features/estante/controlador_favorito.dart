import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import 'acao_leitura_controller.dart';
import 'estante_service.dart';

class ControladorFavorito extends ChangeNotifier {
  final EstanteService _servico;
  final String livroId;

  ControladorFavorito(this._servico, this.livroId, {bool? inicial}) : favorito = inicial;

  bool? favorito;
  bool salvando = false;
  bool falhou = false;

  String? _chave;
  bool? _alvoDaChave;

  Future<void> carregar() async {
    try {
      favorito = await _servico.consultarFavorito(livroId);
    } on ApiException {
      favorito = null;
    }
    notifyListeners();
  }

  Future<bool?> alternar() async {
    final anterior = favorito;
    if (salvando || anterior == null) {
      return null;
    }
    final alvo = !anterior;
    if (_chave == null || _alvoDaChave != alvo) {
      _chave = ApiClient.newIdempotencyKey();
      _alvoDaChave = alvo;
    }
    final chave = _chave!;

    favorito = alvo;
    falhou = false;
    salvando = true;
    notifyListeners();
    try {
      if (alvo) {
        await _servico.marcarFavorito(livroId, idempotencyKey: chave);
      } else {
        await _servico.desmarcarFavorito(livroId, idempotencyKey: chave);
      }
      _chave = null;
      return alvo;
    } on ApiException catch (erro) {
      if (encerraIntencao(erro)) {
        _chave = null;
      }
      favorito = anterior;
      falhou = true;
      return null;
    } finally {
      salvando = false;
      notifyListeners();
    }
  }
}
