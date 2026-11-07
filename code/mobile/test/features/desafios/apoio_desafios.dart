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
  String Function()? fuso,
}) {
  return DesafiosService(
    ApiClient(
      baseUrl: 'https://leitura.example.com',
      client: MockClient(handler),
      timeout: timeout,
      esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
    ),
    fuso: fuso ?? () => 'America/Sao_Paulo',
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

/// `JanelaEncerrada` do contrato (F-DSF-OPC). A semana padrão é a de 14 a 20/09/2026.
Map<String, Object?> janelaJson({
  String inicio = '2026-09-14',
  String fim = '2026-09-20',
  String unidade = 'minutos',
  String periodicidade = 'semanal',
  int alvo = 150,
  int acumulado = 170,
  bool? cumprida,
  String pausa = 'nenhuma',
}) => <String, Object?>{
  'inicio': inicio,
  'fim': fim,
  'unidade': unidade,
  'periodicidade': periodicidade,
  'valorAlvo': alvo,
  'acumulado': acumulado,
  'cumprida': cumprida ?? acumulado >= alvo,
  'pausa': pausa,
};

Map<String, Object?> paginaDeJanelas(
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

/// O histórico do mock do protótipo (`150 minutos por semana`, §3): meta de 120 editada para 150
/// em 02/09, pausado de 17 a 23/08, semana vazia de 10 a 16/08 e criação em 05/08.
List<Map<String, Object?>> historicoDoPrototipo() => <Map<String, Object?>>[
  janelaJson(),
  janelaJson(inicio: '2026-09-07', fim: '2026-09-13', acumulado: 150),
  janelaJson(inicio: '2026-08-31', fim: '2026-09-06', acumulado: 85),
  janelaJson(inicio: '2026-08-24', fim: '2026-08-30', alvo: 120, acumulado: 130),
  janelaJson(inicio: '2026-08-17', fim: '2026-08-23', alvo: 120, acumulado: 0, pausa: 'inteira'),
  janelaJson(inicio: '2026-08-10', fim: '2026-08-16', alvo: 120, acumulado: 0),
  janelaJson(inicio: '2026-08-03', fim: '2026-08-09', alvo: 120, acumulado: 140),
];
