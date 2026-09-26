import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/livros/livro_oficial.dart';

import '../livros/apoio.dart';
import 'massa_da_busca.dart';

void main() {
  group('buscarLivros', () {
    test('manda q, assunto, page e o limite do contrato', () async {
      late Uri pedida;
      final servico = acervoSimulado((request) async {
        pedida = request.url;
        return json(paginaJson(<Map<String, Object?>>[]), 200);
      });

      await servico.buscarLivros(q: 'conceição evaristo', assuntoId: 'romance', page: 2);

      expect(pedida.path, '/livros');
      expect(pedida.queryParameters, <String, String>{
        'q': 'conceição evaristo',
        'assunto': 'romance',
        'page': '2',
        'limit': '20',
      });
    });

    test('omite q e assunto ausentes', () async {
      late Uri pedida;
      final servico = acervoSimulado((request) async {
        pedida = request.url;
        return json(paginaJson(<Map<String, Object?>>[]), 200);
      });

      await servico.buscarLivros(assuntoId: 'terror');

      expect(pedida.queryParameters.containsKey('q'), isFalse);
      expect(pedida.queryParameters['page'], '1');
    });

    test('lê a página com editora, ano e autores ausentes como nulos', () async {
      final servico = acervoSimulado(
        (request) async => json(
          paginaJson(
            <Map<String, Object?>>[
              livroJson(
                'l1',
                'Becos da Memória',
                autores: const <Map<String, String>>[],
                editora: null,
                ano: null,
              ),
            ],
            totalItens: 41,
            totalPaginas: 3,
          ),
          200,
        ),
      );

      final pagina = await servico.buscarLivros(q: 'becos');

      expect(pagina.totalItens, 41);
      expect(pagina.totalPaginas, 3);
      final livro = pagina.itens.single;
      expect(livro.editora, isNull);
      expect(livro.anoPublicacao, isNull);
      expect(livro.autoresParaExibir, isNull);
      expect(livro.capaUrl, isNull);
    });

    test('descarta item fora do contrato em vez de quebrar a lista', () async {
      final servico = acervoSimulado(
        (request) async => json(<String, Object?>{
          'itens': <Object?>[
            livroJson('l1', 'Ponciá Vicêncio'),
            <String, Object?>{'id': 7, 'titulo': null},
            'lixo',
          ],
          'page': 1,
          'limit': 20,
          'totalItens': 3,
          'totalPaginas': 1,
        }, 200),
      );

      final pagina = await servico.buscarLivros(q: 'poncia');

      expect(pagina.itens.map((livro) => livro.titulo), <String>['Ponciá Vicêncio']);
    });

    test('corpo que não é página vira resposta inválida, não TypeError', () async {
      final servico = acervoSimulado(
        (request) async => json(<String, Object?>{'resultado': <Object?>[]}, 200),
      );

      await expectLater(
        servico.buscarLivros(q: 'poncia'),
        throwsA(
          isA<ApiException>().having((erro) => erro.kind, 'kind', ApiFailureKind.invalidResponse),
        ),
      );
    });

    test('503 retentado e ainda falhando chega como ApiException', () async {
      var chamadas = 0;
      final servico = acervoSimulado((request) async {
        chamadas++;
        return http.Response('', 503);
      });

      await expectLater(servico.buscarLivros(q: 'poncia'), throwsA(isA<ApiException>()));
      expect(chamadas, 3);
    });
  });

  group('listarAssuntos', () {
    test('lê os itens na ordem do servidor', () async {
      final servico = acervoSimulado((request) async {
        expect(request.url.path, '/assuntos');
        return json(assuntosJson, 200);
      });

      final assuntos = await servico.listarAssuntos();

      expect(assuntos.map((assunto) => assunto.nome), <String>['Romance', 'Conto', 'Terror']);
    });

    test('corpo sem itens vira lista vazia', () async {
      final servico = acervoSimulado((request) async => json(<String, Object?>{}, 200));
      expect(await servico.listarAssuntos(), isEmpty);
    });
  });

  test('autores para exibir juntam os nomes na ordem do servidor', () {
    final livro = LivroOficialResumo.deJson(
      livroJson(
        'l1',
        'Livro a quatro mãos',
        autores: const <Map<String, String>>[
          <String, String>{'id': 'a', 'nome': 'Ana'},
          <String, String>{'id': 'b', 'nome': 'Bruno'},
        ],
      ),
    );
    expect(livro?.autoresParaExibir, 'Ana, Bruno');
  });
}
