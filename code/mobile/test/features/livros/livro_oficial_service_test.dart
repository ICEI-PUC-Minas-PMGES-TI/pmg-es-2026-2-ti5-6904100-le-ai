import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/livros/livro_oficial.dart';

import 'apoio.dart';

void main() {
  const id = 'b0a1c2d3-0000-4000-8000-000000000001';

  Map<String, Object?> detalhe({Object? resenhas, Object? sinopse}) => <String, Object?>{
    'id': id,
    'titulo': 'Torto Arado',
    'autores': <Object?>[],
    'editora': null,
    'anoPublicacao': null,
    'paginas': 264,
    'capa': <String, Object?>{'url': 'https://covers.openlibrary.org/b/id/1-L.jpg'},
    'assuntos': <Object?>[],
    'isbn': '9788588808911',
    'sinopse': sinopse ?? <String, Object?>{'status': 'pendente', 'texto': null},
    'resenhas': resenhas,
  };

  test('lê a página do livro, com resenhas nulas quando indisponíveis', () async {
    final servico = acervoSimulado((request) async {
      expect(request.url.path, '/livros/$id');
      return json(detalhe(), 200);
    });

    final livro = await servico.obterLivroOficial(id);

    expect(livro.resumo.titulo, 'Torto Arado');
    expect(livro.isbn, '9788588808911');
    expect(livro.sinopse.status, StatusDaSinopse.pendente);
    expect(livro.resenhas, isNull);
  });

  test('texto da sinopse só vale em disponivel', () async {
    final servico = acervoSimulado(
      (request) async => json(
        detalhe(sinopse: <String, Object?>{'status': 'ausente', 'texto': 'não deveria vir'}),
        200,
      ),
    );
    final livro = await servico.obterLivroOficial(id);
    expect(livro.sinopse.status, StatusDaSinopse.ausente);
    expect(livro.sinopse.texto, isNull);
  });

  test('corpo que não é a página vira resposta inválida', () async {
    final servico = acervoSimulado((request) async => json(<String, Object?>{'id': id}, 200));
    await expectLater(
      servico.obterLivroOficial(id),
      throwsA(isA<ApiException>().having((e) => e.kind, 'kind', ApiFailureKind.invalidResponse)),
    );
  });

  test('pede as resenhas seguintes pelo cursor e descarta item fora do contrato', () async {
    final servico = acervoSimulado((request) async {
      expect(request.url.path, '/livros/$id/resenhas');
      expect(request.url.queryParameters, <String, String>{'cursor': 'abc'});
      return json(<String, Object?>{
        'itens': <Object?>[
          <String, Object?>{
            'id': 'r1',
            'autorNome': 'Marina',
            'texto': 'Boa.',
            'spoiler': false,
            'criadoEm': '2026-08-03T12:00:00.000Z',
          },
          <String, Object?>{'id': 7},
        ],
        'limit': 20,
        'proximoCursor': null,
      }, 200);
    });

    final pagina = await servico.listarResenhasDoLivro(id, cursor: 'abc');

    expect(pagina.itens.map((resenha) => resenha.texto), <String>['Boa.']);
    expect(pagina.proximoCursor, isNull);
  });
}
