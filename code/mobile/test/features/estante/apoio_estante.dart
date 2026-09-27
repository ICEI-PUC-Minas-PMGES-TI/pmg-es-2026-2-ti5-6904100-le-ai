import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/estante/leitura_service.dart';

import '../livros/apoio.dart';

LeituraService leituraSimulada(
  Future<http.Response> Function(http.Request) handler, {
  Duration timeout = const Duration(seconds: 90),
}) {
  return LeituraService(
    ApiClient(
      baseUrl: 'https://leitura.example.com',
      client: MockClient(handler),
      timeout: timeout,
      esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
    ),
  );
}

Map<String, Object?> totais({
  int queroLer = 0,
  int lendo = 0,
  int lido = 0,
  int relendo = 0,
  int abandonado = 0,
}) => <String, Object?>{
  'QUERO_LER': queroLer,
  'LENDO': lendo,
  'LIDO': lido,
  'RELENDO': relendo,
  'ABANDONADO': abandonado,
};

Map<String, Object?> itemJson(
  String livroId, {
  String status = 'QUERO_LER',
  String titulo = 'Torto Arado',
  int vezesLido = 0,
  String? leituraEmAndamentoId,
  String? ultimaLeituraId,
  bool retomavel = false,
  int? paginaAtual,
  int? totalPaginas,
  double? percentual,
}) => <String, Object?>{
  'livroId': livroId,
  'livro': <String, Object?>{'titulo': titulo, 'autor': 'Itamar Vieira Junior', 'capaUrl': null},
  'status': status,
  'vezesLido': vezesLido,
  'leituraEmAndamentoId': leituraEmAndamentoId,
  'ultimaLeituraId': ultimaLeituraId,
  'retomavel': retomavel,
  'paginaAtual': paginaAtual,
  'totalPaginas': totalPaginas,
  'percentualConcluido': percentual,
  'adicionadoEm': '2026-09-01T10:00:00.000Z',
};

Map<String, Object?> paginaJson(
  List<Map<String, Object?>> itens, {
  int page = 1,
  int totalPaginas = 1,
  int? totalItens,
  Map<String, Object?>? totaisPorStatus,
}) => <String, Object?>{
  'itens': itens,
  'paginacao': <String, Object?>{
    'page': page,
    'limite': 20,
    'totalItens': totalItens ?? itens.length,
    'totalPaginas': totalPaginas,
  },
  'totaisPorStatus': totaisPorStatus ?? totais(queroLer: itens.length),
};

Map<String, Object?> leituraJson(
  String id, {
  String status = 'LENDO',
  bool releitura = false,
  bool incompleta = false,
  bool retomavel = false,
  int paginaAtual = 148,
  int? totalPaginas = 264,
  int vezesLido = 0,
  String? dataFim,
}) => <String, Object?>{
  'id': id,
  'livroId': 'l1',
  'status': status,
  'dataInicio': '2026-09-01',
  'dataFim': dataFim,
  'releitura': releitura,
  'incompleta': incompleta,
  'retomavel': retomavel,
  'paginaAtual': paginaAtual,
  'totalPaginas': totalPaginas,
  'percentualConcluido': totalPaginas == null ? null : paginaAtual * 100 / totalPaginas,
  'vezesLido': vezesLido,
  'ultimaAtividadeEm': '2026-09-20T10:00:00.000Z',
};

LeituraService estanteVazia() => leituraSimulada((request) async {
  if (request.url.pathSegments.length > 1) {
    return erro(404, 'NAO_ENCONTRADO', 'Livro fora da estante.');
  }
  return json(paginaJson(const <Map<String, Object?>>[], totaisPorStatus: totais()), 200);
});
