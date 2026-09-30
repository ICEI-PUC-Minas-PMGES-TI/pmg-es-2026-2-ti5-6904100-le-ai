import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/avaliacao/avaliacao_controller.dart';
import 'package:le_ai_mobile/features/avaliacao/leitura_service.dart';

import '../livros/apoio.dart';

const String _id = 'b0a1c2d3-0000-4000-8000-000000000001';

Map<String, Object?> _resenha(String texto) => <String, Object?>{
  'id': 'r-${texto.hashCode}',
  'usuarioId': 'u1',
  'livroId': _id,
  'texto': texto,
  'spoiler': false,
  'criadoEm': '2026-09-12T12:00:00.000Z',
  'atualizadoEm': '2026-09-12T12:00:00.000Z',
};

void main() {
  late List<http.Request> pedidos;
  late LeituraService servico;

  /// Controller sobre um servidor falso: GET devolve [inicial] (ou cai com 500 enquanto
  /// [falhasDoGet] > 0); PUT devolve o que foi salvo; DELETE devolve 204.
  Future<AvaliacaoController> montar({
    Map<String, Object?>? inicial,
    int falhasDoGet = 0,
    Future<http.Response> Function(http.Request)? escrita,
  }) async {
    pedidos = <http.Request>[];
    var falhas = falhasDoGet;
    servico = leituraSimulada((request) async {
      pedidos.add(request);
      if (request.method == 'GET') {
        if (falhas > 0) {
          falhas--;
          return erro(500, 'ERRO_INTERNO', 'Erro.');
        }
        return json(inicial ?? semAvaliacao(_id), 200);
      }
      if (escrita != null) {
        return escrita(request);
      }
      if (request.method == 'DELETE') {
        return http.Response('', 204);
      }
      final corpo = jsonDecode(request.body) as Map<String, dynamic>;
      return request.url.path.endsWith('/nota')
          ? json(notaJson(_id, (corpo['valor'] as num).toDouble()), 200)
          : json(_resenha(corpo['texto'] as String), 200);
    });
    final controller = AvaliacaoController(servico, _id);
    addTearDown(controller.dispose);
    await controller.carregar();
    return controller;
  }

  List<String?> chavesDe(String metodo, String sufixo) => pedidos
      .where((p) => p.method == metodo && p.url.path.endsWith(sufixo))
      .map((p) => p.headers['Idempotency-Key'])
      .toList();

  // A chave antiga só repetiria no servidor a resposta guardada, sem gravar a nota de novo.
  test('depois de remover, dar a mesma nota de novo usa uma chave nova', () async {
    final avaliacao = await montar();

    await avaliacao.salvarNota(4);
    await avaliacao.removerNota();
    await avaliacao.salvarNota(4);
    await avaliacao.removerNota();

    final salvar = chavesDe('PUT', '/nota');
    final remover = chavesDe('DELETE', '/nota');
    expect(salvar[1], isNot(salvar[0]));
    expect(remover[1], isNot(remover[0]));
  });

  test('excluir e publicar o mesmo texto de novo usa uma chave nova', () async {
    final avaliacao = await montar();

    await avaliacao.salvarResenha('Ótimo.', spoiler: false);
    await avaliacao.excluirResenha();
    await avaliacao.salvarResenha('Ótimo.', spoiler: false);

    final chaves = chavesDe('PUT', '/resenha');
    expect(chaves[1], isNot(chaves[0]));
  });

  test('reenviar a mesma nota depois de um erro repete a chave', () async {
    var primeira = true;
    final avaliacao = await montar(
      escrita: (request) async {
        if (primeira) {
          primeira = false;
          return erro(422, 'ENTIDADE_NAO_PROCESSAVEL', 'Erro.');
        }
        return json(notaJson(_id, 4), 200);
      },
    );

    await expectLater(avaliacao.salvarNota(4), throwsA(isA<ApiException>()));
    await avaliacao.salvarNota(4);

    final chaves = chavesDe('PUT', '/nota');
    expect(chaves[1], chaves[0]);
  });

  // Uma FormatException solta deixava o painel preso em "Salvando".
  test('resposta 2xx fora do contrato vira ApiException de resposta inválida', () async {
    final avaliacao = await montar(escrita: (_) async => json(<String, Object?>{}, 200));

    await expectLater(
      avaliacao.salvarNota(4),
      throwsA(isA<ApiException>().having((e) => e.kind, 'kind', ApiFailureKind.invalidResponse)),
    );
  });

  // Com a carga falha, a resenha é desconhecida: nula abriria o editor vazio sobre ela.
  test('escrever sem a avaliação carregada recarrega em vez de declarar pronta', () async {
    final avaliacao = await montar(
      falhasDoGet: 1,
      inicial: <String, Object?>{
        'livroId': _id,
        'nota': notaJson(_id, 4),
        'resenha': _resenha('Já escrita.'),
      },
    );
    expect(avaliacao.estado, EstadoDaAvaliacao.erro);

    await avaliacao.salvarNota(4);
    await Future<void>.delayed(Duration.zero);

    expect(avaliacao.estado, EstadoDaAvaliacao.pronta);
    expect(avaliacao.resenha?.texto, 'Já escrita.');
  });

  test('toda escrita que dá certo avisa quem escuta as alterações', () async {
    final avaliacao = await montar();
    var avisos = 0;
    servico.alteracoes.addListener(() => avisos++);

    await avaliacao.salvarNota(3);
    await avaliacao.removerNota();
    await avaliacao.salvarResenha('Bom.', spoiler: false);
    await avaliacao.excluirResenha();

    expect(avisos, 4);
  });
}
