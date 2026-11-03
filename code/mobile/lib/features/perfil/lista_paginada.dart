import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import 'perfil_service.dart';

/// Lista paginada do servidor carregada por rolagem (RNF-DES-02), igual a `usePaginacao.ts` da
/// web: a primeira página substitui, as seguintes acrescentam no fim sem repetir id, e a falha da
/// página seguinte não apaga as anteriores (seguidores-e-seguidos.md §4.7).
class ListaPaginada<T> extends ChangeNotifier {
  final Future<Pagina<T>> Function(int pagina) _buscar;
  final String Function(T item) _idDe;

  ListaPaginada(this._buscar, this._idDe);

  List<T> itens = <T>[];
  int total = 0;
  bool carregando = false;
  bool carregandoMais = false;
  bool falhou = false;
  bool falhouMais = false;
  int _proxima = 0;
  int _paginas = 0;

  bool get temMais => _proxima < _paginas;

  Future<void> carregar() async {
    carregando = true;
    falhou = false;
    notifyListeners();
    try {
      final pagina = await _buscar(0);
      itens = pagina.itens;
      total = pagina.totalElementos;
      _paginas = pagina.totalPaginas;
      _proxima = 1;
    } on ApiException {
      falhou = true;
    } finally {
      carregando = false;
      notifyListeners();
    }
  }

  Future<void> carregarMais() async {
    if (!temMais || carregando || carregandoMais) {
      return;
    }
    carregandoMais = true;
    falhouMais = false;
    notifyListeners();
    try {
      final pagina = await _buscar(_proxima);
      final vistos = itens.map(_idDe).toSet();
      itens = <T>[...itens, ...pagina.itens.where((item) => !vistos.contains(_idDe(item)))];
      total = pagina.totalElementos;
      _paginas = pagina.totalPaginas;
      _proxima++;
    } on ApiException {
      falhouMais = true;
    } finally {
      carregandoMais = false;
      notifyListeners();
    }
  }

  /// Põe no topo os itens que chegaram depois da carga, ignorando os que a lista já tem.
  void mesclarNoTopo(List<T> novos) {
    final vistos = itens.map(_idDe).toSet();
    final ineditos = novos.where((item) => vistos.add(_idDe(item))).toList();
    if (ineditos.isEmpty) {
      return;
    }
    itens = <T>[...ineditos, ...itens];
    total += ineditos.length;
    notifyListeners();
  }

  /// Troca um item pela versão nova depois de uma ação que deu certo (curtir, comentar), sem
  /// recarregar a lista nem mover a rolagem.
  void substituir(T novo) {
    final id = _idDe(novo);
    itens = itens.map((item) => _idDe(item) == id ? novo : item).toList();
    notifyListeners();
  }

  /// Tira da lista depois de uma ação que deu certo (remover, deixar de seguir, decidir).
  void retirar(String id) {
    final antes = itens.length;
    itens = itens.where((item) => _idDe(item) != id).toList();
    if (itens.length < antes) {
      total = total > 0 ? total - 1 : 0;
    }
    notifyListeners();
  }
}
