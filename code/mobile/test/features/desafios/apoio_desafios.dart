import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/desafios/desafios_service.dart';

export '../livros/apoio.dart' show envolver, erro, json, tocar, usarTelaDeCelular;

const String idDoDesafio = 'dddddddd-1111-4111-8111-dddddddddddd';

/// Serviço de desafios sobre um `MockClient`, sem espera entre retentativas e com fuso fixo.
DesafiosService desafiosSimulado(
  Future<http.Response> Function(http.Request) handler, {
  Duration timeout = const Duration(seconds: 90),
}) {
  return DesafiosService(
    ApiClient(
      baseUrl: 'https://leitura.example.com',
      client: MockClient(handler),
      timeout: timeout,
      esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
    ),
    fuso: () => 'America/Sao_Paulo',
  );
}

/// `Desafio` do contrato. A janela corrente padrão é a de 25/09/2026 para cada periodicidade.
Map<String, Object?> desafioJson({
  String id = idDoDesafio,
  String unidade = 'paginas',
  String janela = 'diaria',
  int alvo = 20,
  int acumulado = 12,
  bool? cumprida,
  bool pausado = false,
  String? pausadoDesde,
  String? inicio,
  String? fim,
}) {
  final (inicioPadrao, fimPadrao) = switch (janela) {
    'semanal' => ('2026-09-21', '2026-09-27'),
    'mensal' => ('2026-09-01', '2026-09-30'),
    'anual' => ('2026-01-01', '2026-12-31'),
    _ => ('2026-09-25', '2026-09-25'),
  };
  return <String, Object?>{
    'id': id,
    'unidade': unidade,
    'janela': janela,
    'valorAlvo': alvo,
    'fusoHorario': 'America/Sao_Paulo',
    'pausado': pausado,
    'pausadoDesde': pausado ? (pausadoDesde ?? '2026-09-15T15:00:00.000Z') : null,
    'criadoEm': '2026-09-01T12:00:00.000Z',
    'janelaCorrente': <String, Object?>{
      'inicio': inicio ?? inicioPadrao,
      'fim': fim ?? fimPadrao,
      'acumulado': acumulado,
      'cumprida': cumprida ?? acumulado >= alvo,
    },
  };
}

Map<String, Object?> paginaDeDesafios(
  List<Map<String, Object?>> itens, {
  int page = 1,
  int? totalItens,
  int? totalPaginas,
}) => <String, Object?>{
  'itens': itens,
  'paginacao': <String, Object?>{
    'page': page,
    'limite': 20,
    'totalItens': totalItens ?? itens.length,
    'totalPaginas': totalPaginas ?? (itens.isEmpty ? 0 : 1),
  },
};

/// Respostas e retentativas sem espera terminam em alguns ciclos.
Future<void> assentar(WidgetTester tester) async {
  for (var i = 0; i < 6; i++) {
    await tester.pump(const Duration(milliseconds: 1));
  }
}
