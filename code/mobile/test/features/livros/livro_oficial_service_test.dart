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

  group('notas (F-ACV-NOTA)', () {
    LivroOficialDetalhe ler(Map<String, Object?> extras) =>
        LivroOficialDetalhe.deJson(<String, Object?>{...detalhe(), ...extras})!;

    final onzeFaixas = <Object?>[
      for (var i = 10; i >= 0; i--)
        <String, Object?>{'valor': i / 2, 'quantidade': i == 10 ? 2 : 1},
    ];

    test('lê a nota geral, a dos leitores e as onze faixas', () {
      final livro = ler(<String, Object?>{
        'notaGeral': <String, Object?>{'valor': 4.3, 'quantidade': 412},
        'notaDosLeitores': <String, Object?>{'valor': 4, 'quantidade': 12},
        'distribuicao': onzeFaixas,
      });

      expect(livro.notaGeral?.valor, 4.3);
      expect(livro.notaGeral?.quantidade, 412);
      expect(livro.notaDosLeitores?.valor, 4.0);
      expect(livro.notaDosLeitores?.quantidade, 12);
      expect(livro.distribuicao, hasLength(11));
      expect(livro.distribuicao.first.valor, 5.0);
      expect(livro.distribuicao.first.quantidade, 2);
      expect(livro.distribuicao.last.valor, 0.0);
    });

    test('campos ausentes ou nulos viram nulos e lista vazia, sem lançar', () {
      final semCampos = ler(const <String, Object?>{});
      expect(semCampos.notaGeral, isNull);
      expect(semCampos.notaDosLeitores, isNull);
      expect(semCampos.distribuicao, isEmpty);

      final nulos = ler(const <String, Object?>{
        'notaGeral': null,
        'notaDosLeitores': null,
        'distribuicao': null,
      });
      expect(nulos.notaGeral, isNull);
      expect(nulos.notaDosLeitores, isNull);
      expect(nulos.distribuicao, isEmpty);
    });

    test('indicador fora do contrato é descartado, nunca vira zero', () {
      for (final bruto in <Object?>[
        'x',
        <String, Object?>{'valor': 5.1, 'quantidade': 3},
        <String, Object?>{'valor': -0.5, 'quantidade': 3},
        <String, Object?>{'valor': 4, 'quantidade': 0},
        <String, Object?>{'valor': 4, 'quantidade': 1.5},
        <String, Object?>{'valor': '4', 'quantidade': 3},
        <String, Object?>{'valor': 4},
      ]) {
        final livro = ler(<String, Object?>{'notaGeral': bruto, 'notaDosLeitores': bruto});
        expect(livro.notaGeral, isNull, reason: '$bruto');
        expect(livro.notaDosLeitores, isNull, reason: '$bruto');
      }
    });

    test('distribuição malformada vira lista vazia; sem nota dos leitores, também', () {
      const leitores = <String, Object?>{'valor': 4, 'quantidade': 12};
      for (final bruto in <Object?>[
        'x',
        <Object?>[...onzeFaixas.take(10), 'x'],
        <Object?>[...onzeFaixas.take(10), <String, Object?>{'valor': 0, 'quantidade': -1}],
        <Object?>[...onzeFaixas.take(10), <String, Object?>{'valor': 0.3, 'quantidade': 1}],
        <Object?>[...onzeFaixas, <String, Object?>{'valor': 5, 'quantidade': 1}],
      ]) {
        final livro = ler(<String, Object?>{'notaDosLeitores': leitores, 'distribuicao': bruto});
        expect(livro.notaDosLeitores, isNotNull);
        expect(livro.distribuicao, isEmpty, reason: '$bruto');
      }

      final semLeitores = ler(<String, Object?>{
        'notaDosLeitores': null,
        'distribuicao': onzeFaixas,
      });
      expect(semLeitores.distribuicao, isEmpty);
    });
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
