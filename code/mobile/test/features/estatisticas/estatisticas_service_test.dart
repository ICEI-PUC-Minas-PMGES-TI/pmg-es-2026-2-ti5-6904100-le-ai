import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/estatisticas/estatisticas_service.dart';

import 'apoio_estatisticas.dart';

void main() {
  test('o período vai sempre explícito, ano ou acumulado', () async {
    final pedidas = <Uri>[];
    final servico = estatisticasSimulado((pedido) async {
      pedidas.add(pedido.url);
      return pedido.url.path.endsWith('graficos')
          ? json(graficosJson(), 200)
          : json(estatisticasJson(), 200);
    });

    final estatisticas = await servico.consultar(const PeriodoAno(2025));
    await servico.graficos(const PeriodoAcumulado());

    expect(pedidas.map((u) => '${u.path}?${u.query}'), <String>[
      '/me/estatisticas?periodo=2025',
      '/me/estatisticas/graficos?periodo=acumulado',
    ]);
    expect(estatisticas.totais.paginasLidas, 3818);
    expect(estatisticas.notaMedia.valor, 4.2);
    expect(estatisticas.notaMedia.quantidade, 8);
    expect(estatisticas.anos.first.ano, 2026);
    expect(estatisticas.primeiroRegistro, DateTime(2023, 11, 12));
    expect(estatisticas.semRegistro, isFalse);
  });

  test('média sem denominador vem nula; sem registro nenhum, `semRegistro`', () async {
    final servico = estatisticasSimulado((_) async => json(semRegistroJson(), 200));

    final estatisticas = await servico.consultar(const PeriodoAno(2026));

    expect(estatisticas.diasPorLivro.valor, isNull);
    expect(estatisticas.notaMedia.valor, isNull);
    expect(estatisticas.semRegistro, isTrue);
  });

  test('perfil: id escapado e só os totais do ano', () async {
    late Uri pedida;
    final servico = estatisticasSimulado((pedido) async {
      pedida = pedido.url;
      return json(<String, Object?>{
        'ano': 2026,
        'livrosConcluidos': 14,
        'paginasLidas': 4920,
        'minutosLidos': 5800,
      }, 200);
    });

    final doPerfil = await servico.doPerfil('u 2');

    expect(pedida.path, '/perfis/u%202/estatisticas');
    expect(doPerfil.ano, 2026);
    expect(doPerfil.totais.paginasLidas, 4920);
  });

  test('403 do perfil privado chega como ApiException com o status', () async {
    final servico = estatisticasSimulado(
      (_) async => erro(403, 'ACESSO_NEGADO', 'Este perfil é privado.'),
    );

    await expectLater(
      servico.doPerfil('u3'),
      throwsA(isA<ApiException>().having((e) => e.status, 'status', 403)),
    );
  });

  test('resposta fora do contrato vira resposta inválida', () async {
    final servico = estatisticasSimulado((_) async => json(<String, Object?>{'totais': 'x'}, 200));

    await expectLater(
      servico.consultar(const PeriodoAno(2026)),
      throwsA(isA<ApiException>().having((e) => e.kind, 'kind', ApiFailureKind.invalidResponse)),
    );
  });

  test('período da rota: ano de quatro dígitos ou acumulado; o resto é o ano corrente', () {
    expect(PeriodoEstatisticas.daRota('2024', 2026), const PeriodoAno(2024));
    expect(PeriodoEstatisticas.daRota('acumulado', 2026), const PeriodoAcumulado());
    for (final invalido in <String?>[null, '', '26', 'todos', '0999', '2026x']) {
      expect(PeriodoEstatisticas.daRota(invalido, 2026), const PeriodoAno(2026));
    }
  });
}
