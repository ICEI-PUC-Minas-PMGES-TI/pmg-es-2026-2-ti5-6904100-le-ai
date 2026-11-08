abstract interface class MensageriaPush {
  Future<bool> permissaoConcedida();

  Future<bool> solicitarPermissao();

  Future<String?> obterToken();

  Stream<String> get tokenRenovado;

  Stream<String> get notificacoesAbertas;

  Future<String?> notificacaoDaAberturaInicial();

  Future<void> abrirAjustesDeNotificacao();
}

class MensageriaIndisponivel implements MensageriaPush {
  const MensageriaIndisponivel();

  @override
  Future<bool> permissaoConcedida() async => false;

  @override
  Future<bool> solicitarPermissao() async => false;

  @override
  Future<String?> obterToken() async => null;

  @override
  Stream<String> get tokenRenovado => const Stream<String>.empty();

  @override
  Stream<String> get notificacoesAbertas => const Stream<String>.empty();

  @override
  Future<String?> notificacaoDaAberturaInicial() async => null;

  @override
  Future<void> abrirAjustesDeNotificacao() async {}
}
