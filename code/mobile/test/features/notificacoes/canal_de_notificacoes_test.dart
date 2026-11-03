import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/notificacoes/canal_de_notificacoes.dart';

/// Sem jitter, para as esperas do backoff serem exatas.
class _SemJitter implements Random {
  @override
  double nextDouble() => 0;

  @override
  bool nextBool() => false;

  @override
  int nextInt(int max) => 0;
}

/// Ponta servidora: cada abertura consome a próxima resposta da fila — um stream controlado pelo
/// teste ou uma falha. Fila vazia é rede fora.
class _Servidor {
  final List<Object> respostas = <Object>[];
  final List<Duration> aberturas = <Duration>[];
  final Stopwatch relogio;
  StreamController<List<int>>? atual;

  _Servidor(this.relogio);

  Future<Stream<List<int>>> abrir() async {
    aberturas.add(relogio.elapsed);
    final resposta = respostas.isEmpty ? _rede() : respostas.removeAt(0);
    if (resposta is ApiException) {
      throw resposta;
    }
    atual = resposta as StreamController<List<int>>;
    return atual!.stream;
  }

  StreamController<List<int>> conexao() {
    final controle = StreamController<List<int>>();
    respostas.add(controle);
    return controle;
  }

  static ApiException _rede() => const ApiException(
    kind: ApiFailureKind.network,
    correlationId: 'teste',
    message: 'Não foi possível conectar ao serviço.',
  );
}

const ApiException _sessaoEncerrada = ApiException(
  kind: ApiFailureKind.invalidResponse,
  correlationId: 'teste',
  message: 'Sessão expirada.',
  codigo: 'NAO_AUTENTICADO',
  status: 401,
);

void main() {
  late Stopwatch relogio;
  late _Servidor servidor;
  late CanalDeNotificacoes canal;
  late List<EventoDeNotificacoes> recebidos;

  void preparar(WidgetTester tester) {
    // O relógio do teste é o do fake async do `testWidgets`: `pump(d)` avança exatamente `d`.
    relogio = tester.binding.clock.stopwatch()..start();
    servidor = _Servidor(relogio);
    canal = CanalDeNotificacoes(servidor.abrir, aleatorio: _SemJitter());
    recebidos = <EventoDeNotificacoes>[];
    final assinatura = canal.eventos.listen(recebidos.add);
    addTearDown(() {
      unawaited(assinatura.cancel());
      canal.dispose();
    });
  }

  testWidgets('decodifica sincronizacao e notificacao, ignorando heartbeat e cortes no meio', (
    tester,
  ) async {
    preparar(tester);
    final conexao = servidor.conexao();
    canal.conectar();
    await tester.pump();

    final bytes = utf8.encode(
      'event:sincronizacao\ndata:{"totalNaoLidas":2}\n\n'
      ':heartbeat\n\n'
      'event: notificacao\nid: n-1\n'
      'data:{"notificacao":{"id":"n-1","tipo":"NOVO_SEGUIDOR","mensagem":"Ana começou a seguir você.",'
      '"ator":null,"lida":false,"criadoEm":"2026-10-03T12:00:00Z"},"totalNaoLidas":3}\n\n',
    );
    // O proxy pode entregar em pedaços que cortam linha e caractere multibyte.
    for (var i = 0; i < bytes.length; i += 7) {
      conexao.add(bytes.sublist(i, min(i + 7, bytes.length)));
    }
    await tester.pump();

    expect(recebidos, hasLength(2));
    expect(recebidos[0], isA<SincronizacaoDeNotificacoes>());
    expect(recebidos[0].totalNaoLidas, 2);
    final nova = recebidos[1] as NotificacaoRecebida;
    expect(nova.totalNaoLidas, 3);
    expect(nova.notificacao!.id, 'n-1');
    expect(nova.notificacao!.mensagem, 'Ana começou a seguir você.');
  });

  testWidgets('tipo desconhecido ainda atualiza o total', (tester) async {
    preparar(tester);
    final conexao = servidor.conexao();
    canal.conectar();
    await tester.pump();

    conexao.add(
      utf8.encode(
        'event:notificacao\ndata:{"notificacao":{"id":"x","tipo":"TIPO_FUTURO"},'
        '"totalNaoLidas":4}\n\n',
      ),
    );
    await tester.pump();

    final evento = recebidos.single as NotificacaoRecebida;
    expect(evento.notificacao, isNull);
    expect(evento.totalNaoLidas, 4);
  });

  testWidgets('servico fora: tenta de novo com backoff exponencial ate o teto', (tester) async {
    preparar(tester);
    canal.conectar();
    await tester.pump();

    await tester.pump(const Duration(minutes: 3));

    final intervalos = <int>[
      for (var i = 1; i < servidor.aberturas.length; i++)
        (servidor.aberturas[i] - servidor.aberturas[i - 1]).inSeconds,
    ];
    expect(intervalos.take(6), <int>[1, 2, 4, 8, 16, 30]);
    expect(intervalos.skip(5), everyElement(30));
    canal.desconectar();
  });

  testWidgets('queda depois de conectar reconecta em 1 s, e o evento zera o backoff', (
    tester,
  ) async {
    preparar(tester);
    canal.conectar(); // falha: rede
    await tester.pump();
    await tester.pump(const Duration(seconds: 1)); // falha de novo; próxima em 2 s
    final conexao = servidor.conexao();
    await tester.pump(const Duration(seconds: 2));
    conexao.add(utf8.encode('event:sincronizacao\ndata:{"totalNaoLidas":0}\n\n'));
    await tester.pump();
    final aberturasAntes = servidor.aberturas.length;
    servidor.conexao();

    await conexao.close(); // token expirou, deploy ou hibernação
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 999));
    expect(servidor.aberturas, hasLength(aberturasAntes));
    await tester.pump(const Duration(milliseconds: 1));

    expect(servidor.aberturas, hasLength(aberturasAntes + 1));
    expect(recebidos.whereType<SincronizacaoDeNotificacoes>(), hasLength(1));
  });

  testWidgets('sessao que nao renova encerra o canal sem insistir', (tester) async {
    preparar(tester);
    servidor.respostas.add(_sessaoEncerrada);
    canal.conectar();
    await tester.pump();

    await tester.pump(const Duration(minutes: 5));

    expect(servidor.aberturas, hasLength(1));
  });

  testWidgets('desconectar cancela a reconexao pendente; conectar volta a abrir', (tester) async {
    preparar(tester);
    canal.conectar();
    await tester.pump();

    canal.desconectar();
    await tester.pump(const Duration(minutes: 1));
    expect(servidor.aberturas, hasLength(1));

    servidor.conexao();
    canal.conectar();
    await tester.pump();
    expect(servidor.aberturas, hasLength(2));
  });

  testWidgets('desconectar fecha a conexao aberta', (tester) async {
    preparar(tester);
    final conexao = servidor.conexao();
    canal.conectar();
    await tester.pump();
    expect(conexao.hasListener, isTrue);

    canal.desconectar();
    await tester.pump();

    expect(conexao.hasListener, isFalse);
  });

  test('jitter soma no maximo metade da espera', () {
    expect(CanalDeNotificacoes.esperaDaTentativa(0, _SemJitter()), const Duration(seconds: 1));
    expect(
      CanalDeNotificacoes.esperaDaTentativa(3, Random(7)).inMilliseconds,
      inInclusiveRange(8000, 12000),
    );
    expect(
      CanalDeNotificacoes.esperaDaTentativa(50, Random(7)).inMilliseconds,
      inInclusiveRange(30000, 45000),
    );
  });
}
