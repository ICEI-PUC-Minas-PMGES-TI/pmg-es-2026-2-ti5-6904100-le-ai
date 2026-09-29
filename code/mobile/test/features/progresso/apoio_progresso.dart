import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/progresso/fila_de_progresso.dart';
import 'package:le_ai_mobile/features/progresso/progresso_service.dart';
import 'package:le_ai_mobile/features/progresso/rotas_progresso.dart';

class ArmazemEmMemoria implements ArmazemDaFila {
  String? conteudo;

  ArmazemEmMemoria([this.conteudo]);

  @override
  Future<String?> ler() async => conteudo;

  @override
  Future<void> gravar(String novo) async => conteudo = novo;
}

ProgressoService progressoSimulado(Future<http.Response> Function(http.Request) handler) {
  return ProgressoService(
    ApiClient(
      baseUrl: 'https://leitura.example.com',
      client: MockClient(handler),
      esperasDeRetentativa: const <Duration>[],
    ),
  );
}

DependenciasDeProgresso progressoEmMemoria() {
  final servico = progressoSimulado((request) async => http.Response('{}', 200));
  return DependenciasDeProgresso(
    servico: servico,
    fila: FilaDeProgresso(servico, ArmazemEmMemoria()),
  );
}

Map<String, Object?> resumoJson({
  int paginaAtual = 148,
  int totalPaginas = 264,
  int minutosTotais = 0,
}) => <String, Object?>{
  'paginaAtual': paginaAtual,
  'totalPaginas': totalPaginas,
  'percentualConcluido': paginaAtual * 100 / totalPaginas,
  'minutosTotais': minutosTotais,
};

Map<String, Object?> progressoJson(
  String id, {
  required int posicao,
  required int pagina,
  required int paginaAnterior,
  int minutos = 0,
  String leituraId = 'le1',
  String dataLocal = '2026-09-08',
}) => <String, Object?>{
  'id': id,
  'leituraId': leituraId,
  'posicao': posicao,
  'pagina': pagina,
  'paginaAnterior': paginaAnterior,
  'paginasLidas': pagina - paginaAnterior,
  'minutos': minutos,
  'registradoEmDispositivo': '2026-09-08T12:00:00.000Z',
  'fusoHorarioDispositivo': 'Etc/GMT+3',
  'dataLocal': dataLocal,
  'criadoEm': '2026-09-08T12:00:00.000Z',
};

Map<String, Object?> comResumoJson(Map<String, Object?> progresso, {int? paginaAtual}) =>
    <String, Object?>{
      'progresso': progresso,
      'resumo': resumoJson(paginaAtual: paginaAtual ?? progresso['pagina']! as int),
    };

Map<String, Object?> paginaProgressoJson(
  List<Map<String, Object?>> itens, {
  Map<String, Object?>? resumo,
  bool somenteLeitura = false,
}) => <String, Object?>{
  'itens': itens,
  'paginacao': <String, Object?>{
    'page': 1,
    'limite': 20,
    'totalItens': itens.length,
    'totalPaginas': 1,
  },
  'resumo': resumo ?? resumoJson(),
  'somenteLeitura': somenteLeitura,
};

RegistroPendente pendente(String chave, int pagina, {String leituraId = 'le1'}) => RegistroPendente(
  chave: chave,
  leituraId: leituraId,
  pagina: pagina,
  registradoEmDispositivo: '2026-09-08T12:00:00.000Z',
  fusoHorarioDispositivo: 'Etc/GMT+3',
);
