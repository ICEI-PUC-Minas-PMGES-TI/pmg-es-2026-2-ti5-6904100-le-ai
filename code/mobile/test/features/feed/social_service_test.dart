import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/feed/social_service.dart';

import 'apoio.dart';

void main() {
  test('listarFeed converte a página do social e lê resenha com nota e livro pessoal', () async {
    late http.Request pedido;
    final servico = socialSimulado((request) async {
      pedido = request;
      return json(<String, Object?>{
        'itens': <Object?>[
          atividadeJson(tipo: 'RESENHA_PUBLICADA', nota: 4.5),
          atividadeJson(id: 'a2', tipoLivro: 'PESSOAL', nota: null),
        ],
        'pagina': 1,
        'tamanho': 20,
        'totalItens': 22,
        'totalPaginas': 2,
        'ultima': true,
      }, 200);
    });

    final pagina = await servico.listarFeed(1);

    expect(pedido.url.path, '/feed');
    expect(pedido.url.queryParameters, <String, String>{'page': '1', 'size': '20'});
    expect(pagina.pagina, 1);
    expect(pagina.totalElementos, 22);
    expect(pagina.totalPaginas, 2);
    expect(pagina.itens.first.tipo, TipoAtividade.resenhaPublicada);
    expect(pagina.itens.first.resenha!.nota, 4.5);
    expect(pagina.itens.last.livro.pessoal, isTrue);
    expect(pagina.itens.last.resenha, isNull);
  });

  test('nota inteira do JSON vira double', () async {
    final servico = socialSimulado(
      (_) async => json(atividadeJson(tipo: 'RESENHA_PUBLICADA', nota: 5), 200),
    );

    final atividade = await servico.obterAtividade('a1');

    expect(atividade.resenha!.nota, 5.0);
  });

  test('curtir, descurtir e comentar mandam a Idempotency-Key recebida', () async {
    final pedidos = <http.Request>[];
    final servico = socialSimulado((request) async {
      pedidos.add(request);
      if (request.method == 'DELETE') {
        return http.Response('', 204);
      }
      if (request.url.path.endsWith('/curtir')) {
        return json(<String, Object?>{'atividadeId': 'a1', 'curtida': true, 'totalCurtidas': 5}, 200);
      }
      return json(comentarioJson(), 201);
    });

    final estado = await servico.curtir('a1', idempotencyKey: 'k1');
    await servico.descurtir('a1', idempotencyKey: 'k2');
    await servico.comentar('a1', texto: '@ana oi', comentarioRespondidoId: 'c9', idempotencyKey: 'k3');

    expect(estado.totalCurtidas, 5);
    expect(pedidos.map((p) => p.headers['Idempotency-Key']), <String>['k1', 'k2', 'k3']);
    expect(pedidos.map((p) => '${p.method} ${p.url.path}'), <String>[
      'POST /atividades/a1/curtir',
      'DELETE /atividades/a1/curtir',
      'POST /atividades/a1/comentarios',
    ]);
    expect(jsonDecode(pedidos.last.body), <String, Object?>{
      'texto': '@ana oi',
      'comentarioRespondidoId': 'c9',
    });
  });

  test('comentário-raiz não manda comentarioRespondidoId', () async {
    late http.Request pedido;
    final servico = socialSimulado((request) async {
      pedido = request;
      return json(comentarioJson(), 201);
    });

    await servico.comentar('a1', texto: 'Que livro', idempotencyKey: 'k');

    expect(jsonDecode(pedido.body), <String, Object?>{'texto': 'Que livro'});
  });

  test('listarRespostas usa o cursor e devolve o próximo', () async {
    late http.Request pedido;
    final servico = socialSimulado((request) async {
      pedido = request;
      return json(<String, Object?>{
        'itens': <Object?>[comentarioJson(id: 'r1', nivel: 'RESPOSTA', raiz: 'c1')],
        'proximoCursor': 'abc',
        'temMais': true,
      }, 200);
    });

    final lista = await servico.listarRespostas('c1', cursor: 'xyz');

    expect(pedido.url.path, '/comentarios/c1/respostas');
    expect(pedido.url.queryParameters, <String, String>{'limit': '20', 'cursor': 'xyz'});
    expect(lista.itens.single.resposta, isTrue);
    expect(lista.itens.single.comentarioRaizId, 'c1');
    expect(lista.proximoCursor, 'abc');
    expect(lista.temMais, isTrue);
  });

  test('listarComentariosRaiz converte a página e lê totalRespostas', () async {
    final servico = socialSimulado(
      (_) async => json(<String, Object?>{
        'itens': <Object?>[comentarioJson(totalRespostas: 2)],
        'pagina': 0,
        'tamanho': 20,
        'totalItens': 1,
        'totalPaginas': 1,
        'ultima': true,
      }, 200),
    );

    final pagina = await servico.listarComentariosRaiz('a1', 0);

    expect(pagina.itens.single.totalRespostas, 2);
    expect(pagina.itens.single.resposta, isFalse);
  });
}
