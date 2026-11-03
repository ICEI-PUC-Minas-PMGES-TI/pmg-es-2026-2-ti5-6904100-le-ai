import 'dart:async';

import 'package:flutter/foundation.dart';

import '../descobrir/busca_de_livros_controller.dart';

class BuscaNaEstante extends ChangeNotifier {
  bool aberta = false;
  String termo = '';
  Timer? _espera;

  String? get busca {
    final aparado = termo.trim();
    return aparado.isEmpty ? null : aparado;
  }

  void abrir() {
    aberta = true;
    notifyListeners();
  }

  void fechar() {
    _espera?.cancel();
    aberta = false;
    termo = '';
    notifyListeners();
  }

  void digitar(String texto) {
    _espera?.cancel();
    _espera = Timer(BuscaDeLivrosController.espera, () => definir(texto));
  }

  void definir(String texto) {
    _espera?.cancel();
    if (texto == termo) {
      return;
    }
    termo = texto;
    notifyListeners();
  }

  @override
  void dispose() {
    _espera?.cancel();
    super.dispose();
  }
}
