import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/desafios/desafios_service.dart';

import 'apoio_desafios.dart';

void main() {
  late List<http.Request> pedidos;

  setUp(() => pedidos = <http.Request>[]);

  DesafiosService servico(Future<http.Response> Function(http.Request) responder) =>
      desafiosSimulado((pedido) {
        pedidos.add(pedido);
        return responder(pedido);
      });

  test('listar pede a página e o limite e lê a janela corrente', () async {
    final desafios = servico(
      (_) async => json(
        paginaDeDesafios(
          <Map<String, Object?>>[desafioJson(janela: 'mensal', alvo: 600, acumulado: 612)],
          totalItens: 5,
          totalPaginas: 3,
        ),
        200,
      ),
    );

    final pagina = await desafios.listar(pagina: 2, limite: 2);

    expect(pedidos.single.method, 'GET');
    expect(pedidos.single.url.path, '/desafios');
    expect(pedidos.single.url.queryParameters, <String, String>{'page': '2', 'limite': '2'});
    expect(pagina.totalItens, 5);
    expect(pagina.totalPaginas, 3);
    final desafio = pagina.itens.single;
    expect(desafio.unidade, UnidadeDesafio.paginas);
    expect(desafio.janela, JanelaDesafio.mensal);
    expect(desafio.janelaCorrente.inicio, DateTime(2026, 9, 1));
    expect(desafio.janelaCorrente.acumulado, 612);
    expect(desafio.janelaCorrente.cumprida, isTrue);
    expect(desafio.faltam, 0);
  });

  test('criar manda a configuração, o fuso do aparelho e a chave, e avisa a alteração', () async {
    final desafios = servico((_) async => json(desafioJson(), 201));
    var avisos = 0;
    desafios.alteracoes.addListener(() => avisos++);

    await desafios.criar(
      unidade: UnidadeDesafio.minutos,
      janela: JanelaDesafio.semanal,
      valorAlvo: 150,
      idempotencyKey: 'chave-1',
    );

    expect(pedidos.single.method, 'POST');
    expect(pedidos.single.url.path, '/desafios');
    expect(pedidos.single.headers['Idempotency-Key'], 'chave-1');
    expect(jsonDecode(pedidos.single.body), <String, Object?>{
      'unidade': 'minutos',
      'janela': 'semanal',
      'valorAlvo': 150,
      'fusoHorario': 'America/Sao_Paulo',
    });
    expect(avisos, 1);
  });

  test('editar manda só o que mudou e sempre o fuso', () async {
    final desafios = servico((_) async => json(desafioJson(alvo: 30), 200));

    await desafios.editar(idDoDesafio, <String, Object?>{'valorAlvo': 30}, idempotencyKey: 'k');

    expect(pedidos.single.method, 'PATCH');
    expect(pedidos.single.url.path, '/desafios/$idDoDesafio');
    expect(jsonDecode(pedidos.single.body), <String, Object?>{
      'valorAlvo': 30,
      'fusoHorario': 'America/Sao_Paulo',
    });
  });

  test('pausar, retomar e excluir vão pelas rotas do desafio com a chave', () async {
    final desafios = servico(
      (pedido) async => pedido.method == 'DELETE'
          ? http.Response('', 204)
          : json(desafioJson(pausado: pedido.url.path.endsWith('/pausar')), 200),
    );
    var avisos = 0;
    desafios.alteracoes.addListener(() => avisos++);

    final pausado = await desafios.pausar(idDoDesafio, idempotencyKey: 'p');
    await desafios.retomar(idDoDesafio, idempotencyKey: 'r');
    await desafios.excluir(idDoDesafio, idempotencyKey: 'e');

    expect(pausado.pausado, isTrue);
    expect(pausado.pausadoDesde, DateTime.utc(2026, 9, 15, 15));
    expect(pedidos.map((p) => '${p.method} ${p.url.path}'), <String>[
      'POST /desafios/$idDoDesafio/pausar',
      'POST /desafios/$idDoDesafio/retomar',
      'DELETE /desafios/$idDoDesafio',
    ]);
    expect(pedidos.map((p) => p.headers['Idempotency-Key']), <String>['p', 'r', 'e']);
    expect(avisos, 3);
  });

  test('escrita que falha não avisa alteração', () async {
    final desafios = servico((_) async => erro(409, 'ESTADO_INVALIDO', 'Já está pausado.'));
    var avisos = 0;
    desafios.alteracoes.addListener(() => avisos++);

    await expectLater(
      desafios.pausar(idDoDesafio, idempotencyKey: 'p'),
      throwsA(isA<ApiException>().having((e) => e.status, 'status', 409)),
    );
    expect(avisos, 0);
  });

  test('resposta fora do contrato vira invalidResponse', () async {
    final desafios = servico(
      (_) async => json(
        paginaDeDesafios(<Map<String, Object?>>[
          <String, Object?>{...desafioJson(), 'unidade': 'capitulos'},
        ]),
        200,
      ),
    );

    await expectLater(
      desafios.listar(),
      throwsA(isA<ApiException>().having((e) => e.kind, 'kind', ApiFailureKind.invalidResponse)),
    );
  });
}
