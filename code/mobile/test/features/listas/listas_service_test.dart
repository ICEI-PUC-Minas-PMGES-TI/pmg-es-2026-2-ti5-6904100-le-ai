import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/core/network/api_client.dart';

import 'apoio_listas.dart';

void main() {
  late List<http.Request> pedidos;

  setUp(() => pedidos = <http.Request>[]);

  test('criar manda título, descrição, livro e a chave, e avisa a alteração', () async {
    final servico = listasSimulado((pedido) async {
      pedidos.add(pedido);
      return json(listaJson(), 201);
    });
    var avisos = 0;
    servico.alteracoes.addListener(() => avisos++);

    final lista = await servico.criar(
      titulo: 'Contos que eu indico',
      descricao: null,
      livroId: 'livro-1',
      idempotencyKey: 'chave-1',
    );

    expect(lista.titulo, 'Contos que eu indico');
    expect(lista.pertenceAoSolicitante, isTrue);
    expect(pedidos.single.method, 'POST');
    expect(pedidos.single.url.path, '/listas');
    expect(pedidos.single.headers['Idempotency-Key'], 'chave-1');
    expect(jsonDecode(pedidos.single.body), <String, Object?>{
      'titulo': 'Contos que eu indico',
      'descricao': null,
      'livroId': 'livro-1',
    });
    expect(avisos, 1);
  });

  test('mover manda a posição visível pela rota do item', () async {
    final servico = listasSimulado((pedido) async {
      pedidos.add(pedido);
      return json(itemJson(1), 200);
    });

    await servico.mover(idDaLista, 'item-3', 1, idempotencyKey: 'chave-m');

    expect(pedidos.single.method, 'PUT');
    expect(pedidos.single.url.path, '/listas/$idDaLista/livros/item-3/posicao');
    expect(jsonDecode(pedidos.single.body), <String, Object?>{'posicao': 1});
  });

  test('itens vão por cursor com limite; minhas listas mandam o livro para contemLivro', () async {
    final servico = listasSimulado((pedido) async {
      pedidos.add(pedido);
      return pedido.url.path.endsWith('/livros')
          ? json(itensJson(<Map<String, Object?>>[itemJson(1)], proximoCursor: 'c2', temMais: true), 200)
          : json(paginaJson(<Map<String, Object?>>[resumoJson(contem: true)]), 200);
    });

    final itens = await servico.listarItens(idDaLista, cursor: 'c1', limite: 50);
    final minhas = await servico.listarMinhas(0, livroId: 'livro-9');

    expect(pedidos[0].url.queryParameters, <String, String>{'limit': '50', 'cursor': 'c1'});
    expect(itens.temMais, isTrue);
    expect(itens.proximoCursor, 'c2');
    expect(pedidos[1].url.path, '/me/listas');
    expect(pedidos[1].url.queryParameters['livroId'], 'livro-9');
    expect(minhas.itens.single.contemLivro, isTrue);
    expect(minhas.totalElementos, 1);
  });

  test('falha de escrita não avisa alteração', () async {
    final servico = listasSimulado(
      (_) async => erro(403, 'ACESSO_NEGADO', 'Você não tem acesso a este recurso.'),
    );
    var avisos = 0;
    servico.alteracoes.addListener(() => avisos++);

    await expectLater(
      servico.remover(idDaLista, 'livro-1', idempotencyKey: 'k'),
      throwsA(isA<ApiException>().having((e) => e.status, 'status', 403)),
    );
    expect(avisos, 0);
  });
}
