/// Recarrega a cada [pedir] sem sobrepor recargas: pedido que chega durante uma recarga agenda só
/// mais uma, ao fim dela. Usada por quem escuta o `alteracoes` de um serviço: a fila offline envia
/// vários registros seguidos, e recargas em paralelo podiam terminar fora de ordem e deixar na tela
/// uma resposta mais velha que a última escrita.
class RecargaEmSequencia {
  final Future<void> Function() _recarregar;

  RecargaEmSequencia(this._recarregar);

  Future<void>? _emCurso;
  bool _deNovo = false;

  Future<void> pedir() {
    final emCurso = _emCurso;
    if (emCurso != null) {
      _deNovo = true;
      return emCurso;
    }
    return _emCurso = _rodar().whenComplete(() => _emCurso = null);
  }

  Future<void> _rodar() async {
    do {
      _deNovo = false;
      await _recarregar();
    } while (_deNovo);
  }
}
