import 'package:flutter/widgets.dart';

import '../../core/network/api_client.dart';
import 'notificacoes_service.dart';

/// Total de não lidas do leitor, que é o número do badge do sino (RF-NOT-02). No Período 1 a
/// entrega é in-app e carregada pelo cliente, sem tempo real (RF-NOT-06): o total é buscado ao
/// entrar no shell e ao voltar o app para o primeiro plano, e a tela de notificações o mantém
/// em dia a cada página e marcação.
class ContadorDeNaoLidas extends ChangeNotifier {
  final NotificacoesService _servico;

  ContadorDeNaoLidas(this._servico);

  int _total = 0;

  int get total => _total;

  /// Falha de rede mantém o último total conhecido: o badge é informativo, não bloqueia nada.
  Future<void> atualizar() async {
    try {
      final pagina = await _servico.listar(0, tamanho: 1);
      definir(pagina.totalNaoLidas);
    } on ApiException {
      // Sem conexão ou cold start: o próximo retorno ao app tenta de novo.
    }
  }

  void definir(int total) {
    if (total == _total) {
      return;
    }
    _total = total;
    notifyListeners();
  }
}

/// Entrega o [ContadorDeNaoLidas] e a abertura da tela de notificações a todo `CabecalhoTela`
/// dentro do shell, inclusive nas sub-telas de cada aba, que desenham o próprio cabeçalho.
class EscopoDeNotificacoes extends InheritedNotifier<ContadorDeNaoLidas> {
  final VoidCallback aoAbrir;

  const EscopoDeNotificacoes({
    super.key,
    required ContadorDeNaoLidas contador,
    required this.aoAbrir,
    required super.child,
  }) : super(notifier: contador);

  static EscopoDeNotificacoes? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<EscopoDeNotificacoes>();
}
