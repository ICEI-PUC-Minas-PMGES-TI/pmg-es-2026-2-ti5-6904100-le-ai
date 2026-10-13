import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/estatisticas/estatisticas_service.dart';

export '../livros/apoio.dart' show envolver, erro, json, tocar, usarTelaDeCelular;

/// Serviço de estatísticas sobre um `MockClient`, sem espera entre retentativas.
EstatisticasService estatisticasSimulado(
  Future<http.Response> Function(http.Request) handler, {
  Duration timeout = const Duration(seconds: 90),
}) {
  return EstatisticasService(
    ApiClient(
      baseUrl: 'https://leitura.example.com',
      client: MockClient(handler),
      timeout: timeout,
      esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
    ),
  );
}

/// Painel de 2026 do protótipo (4.1), com os anos do seletor.
Map<String, Object?> estatisticasJson({
  Object? ano = 2026,
  List<Map<String, Object?>>? anos,
  Object? primeiroRegistro = '2023-11-12',
  int livros = 9,
  int paginas = 3818,
  int minutos = 4280,
  double? paginasPorDia = 20.4,
  double? diasPorLivro = 19.1,
  double? notaMedia = 4.2,
  int notas = 8,
}) => <String, Object?>{
  'ano': ano,
  'anos':
      anos ??
      <Map<String, Object?>>[
        <String, Object?>{'ano': 2026, 'livrosConcluidos': 9},
        <String, Object?>{'ano': 2025, 'livrosConcluidos': 14},
        <String, Object?>{'ano': 2024, 'livrosConcluidos': 11},
        <String, Object?>{'ano': 2023, 'livrosConcluidos': 0},
      ],
  'primeiroRegistro': primeiroRegistro,
  'totais': <String, Object?>{
    'livrosConcluidos': livros,
    'paginasLidas': paginas,
    'minutosLidos': minutos,
  },
  'medias': <String, Object?>{
    'paginasPorDia': <String, Object?>{
      'valor': paginasPorDia,
      'paginasLidas': paginas,
      'diasComLeitura': paginasPorDia == null ? 0 : 187,
    },
    'diasPorLivro': <String, Object?>{
      'valor': diasPorLivro,
      'dias': diasPorLivro == null ? 0 : 172,
      'leiturasConcluidas': livros,
    },
    'notaMedia': <String, Object?>{'valor': notaMedia, 'quantidade': notaMedia == null ? 0 : notas},
  },
};

/// Leitor sem nenhum registro (4.7).
Map<String, Object?> semRegistroJson() => estatisticasJson(
  anos: const <Map<String, Object?>>[],
  primeiroRegistro: null,
  livros: 0,
  paginas: 0,
  minutos: 0,
  paginasPorDia: null,
  diasPorLivro: null,
  notaMedia: null,
);

Map<String, Object?> pontoJson(int? mes, int paginas, [int livros = 0, int ano = 2026]) =>
    <String, Object?>{'ano': ano, 'mes': mes, 'paginasLidas': paginas, 'livrosConcluidos': livros};

/// Série mensal de janeiro até [ate], com julho no topo (4.2).
Map<String, Object?> graficosJson({int ano = 2026, int ate = 9}) {
  const paginas = <int>[412, 356, 498, 287, 530, 441, 604, 372, 318, 402, 366, 575];
  const livros = <int>[1, 1, 2, 0, 1, 1, 2, 0, 1, 1, 2, 1];
  return <String, Object?>{
    'ano': ano,
    'granularidade': 'mes',
    'pontos': <Map<String, Object?>>[
      for (var i = 0; i < ate; i++) pontoJson(i + 1, paginas[i], livros[i], ano),
    ],
  };
}

PontoEstatistica ponto(int? mes, int paginas, [int livros = 0, int ano = 2026]) =>
    PontoEstatistica(ano: ano, mes: mes, paginasLidas: paginas, livrosConcluidos: livros);

Future<void> assentar(WidgetTester tester) async {
  for (var i = 0; i < 6; i++) {
    await tester.pump(const Duration(milliseconds: 1));
  }
}
