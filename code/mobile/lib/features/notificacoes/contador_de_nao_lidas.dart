import 'dart:async';

import 'package:flutter/widgets.dart';

import '../../core/network/api_client.dart';
import 'canal_de_notificacoes.dart';
import 'notificacoes_service.dart';

/// Total de não lidas do leitor, que é o número do badge do sino (RF-NOT-02), atualizado por cada
/// evento do canal de tempo real (RF-NOT-06) e, com ele fechado, pela tela e pelo shell.
class ContadorDeNaoLidas extends ChangeNotifier {
  final NotificacoesService _servico;
  late final StreamSubscription<EventoDeNotificacoes> _tempoReal;

  ContadorDeNaoLidas(this._servico, CanalDeNotificacoes canal) {
    _tempoReal = canal.eventos.listen((evento) => definir(evento.totalNaoLidas));
  }

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

  @override
  void dispose() {
    unawaited(_tempoReal.cancel());
    super.dispose();
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
