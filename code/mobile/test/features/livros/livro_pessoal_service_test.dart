import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/livros/acervo_service.dart';

import 'apoio.dart';
import 'apoio_assuntos.dart';

const _id = 'dddddddd-4444-4444-8444-dddddddddddd';

Map<String, Object?> _livro({Object? assuntos, bool comCampo = true}) => <String, Object?>{
  'id': _id,
  'tipo': 'pessoal',
  'donoId': 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee',
  'titulo': 'Cartas de um sertanejo',
  'autor': 'Marina Albuquerque',
  'paginas': 184,
  'sinopse': null,
  'capaUrl': null,
  'modoConsulta': false,
  'notaDoDono': null,
  'resenhaDoDono': null,
  if (comCampo) 'assuntos': assuntos,
};

/// Assuntos do livro pessoal no serviço (F-ACV-OPC): o parse da resposta e o corpo da escrita.
void main() {
  group('LivroPessoal.fromJson', () {
    test('lê assuntos como AssuntoResumo, na ordem do servidor', () {
      final livro = LivroPessoal.fromJson(
        _livro(assuntos: <Object>[assuntoJson(idHistoria), assuntoJson(idMemorias)]),
      );
      expect(livro.assuntos.map((a) => a.id), <String>[idHistoria, idMemorias]);
      expect(livro.assuntos.map((a) => a.nome), <String>['História', 'Memórias']);
    });

    test('ausente, nulo ou fora do contrato vira lista vazia; item inválido é descartado', () {
      expect(LivroPessoal.fromJson(_livro(comCampo: false)).assuntos, isEmpty);
      expect(LivroPessoal.fromJson(_livro()).assuntos, isEmpty);
      expect(LivroPessoal.fromJson(_livro(assuntos: 'História')).assuntos, isEmpty);
      final livro = LivroPessoal.fromJson(
        _livro(
          assuntos: <Object?>[
            assuntoJson(idHistoria),
            42,
            <String, Object>{'id': 1},
          ],
        ),
      );
      expect(livro.assuntos.single.nome, 'História');
    });
  });

  group('DadosLivroPessoal.paraJson', () {
    const base = DadosLivroPessoal(titulo: 'Cartas', autor: 'Marina', paginas: 10);

    test('criação sem assunto não manda o campo', () {
      expect(base.paraJson(edicao: false).containsKey('assuntos'), isFalse);
    });

    test('criação com assuntos manda os ids ordenados e sem repetição', () {
      const dados = DadosLivroPessoal(
        titulo: 'Cartas',
        autor: 'Marina',
        paginas: 10,
        assuntos: <String>[idBiografia, idMemorias, idBiografia],
      );
      expect(dados.paraJson(edicao: false)['assuntos'], <String>[idMemorias, idBiografia]);
    });

    test('edição manda sempre o array, vazio para limpar', () {
      expect(base.paraJson(edicao: true)['assuntos'], <String>[]);
    });
  });

  group('AcervoService', () {
    late List<http.Request> pedidos;
    late AcervoService servico;

    setUp(() {
      pedidos = <http.Request>[];
      servico = acervoSimulado((pedido) async {
        pedidos.add(pedido);
        if (pedido.method == 'POST') {
          return json(_livro(assuntos: <Object>[assuntoJson(idHistoria)]), 201);
        }
        return json(_livro(assuntos: const <Object>[]), 200);
      });
    });

    test('POST /livros/pessoal manda os assuntos e devolve os do servidor', () async {
      final livro = await servico.criarLivroPessoal(
        const DadosLivroPessoal(
          titulo: 'Cartas',
          autor: 'Marina',
          paginas: 10,
          assuntos: <String>[idHistoria],
        ),
        idempotencyKey: 'chave-1',
      );
      expect(jsonDecode(pedidos.single.body)['assuntos'], <String>[idHistoria]);
      expect(livro.assuntos.single.nome, 'História');
    });

    test('PATCH /livros/pessoal/{id} manda o array vazio', () async {
      final livro = await servico.atualizarLivroPessoal(
        _id,
        const DadosLivroPessoal(titulo: 'Cartas', autor: 'Marina', paginas: 10),
        idempotencyKey: 'chave-2',
      );
      expect(pedidos.single.method, 'PATCH');
      expect(jsonDecode(pedidos.single.body)['assuntos'], <String>[]);
      expect(livro.assuntos, isEmpty);
    });

    test('400 de assuntos chega em campos', () async {
      final comErro = acervoSimulado(
        (_) async => erro(400, 'REQUISICAO_INVALIDA', 'Confira os campos.', <String, Object>{
          'campos': <Map<String, String>>[
            <String, String>{
              'campo': 'assuntos',
              'mensagem': 'Escolha os assuntos da lista do Lê Ai.',
            },
          ],
        }),
      );
      await expectLater(
        comErro.criarLivroPessoal(
          const DadosLivroPessoal(
            titulo: 'Cartas',
            autor: 'Marina',
            paginas: 10,
            assuntos: <String>['nao-e-uuid'],
          ),
          idempotencyKey: 'chave-3',
        ),
        throwsA(
          isA<ApiException>().having(
            (e) => e.campos['assuntos'],
            'campos[assuntos]',
            'Escolha os assuntos da lista do Lê Ai.',
          ),
        ),
      );
    });
  });
}
