import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/features/estante/estante_page.dart';
import 'package:le_ai_mobile/features/estante/estante_service.dart';
import 'package:le_ai_mobile/features/progresso/registrar_progresso.dart';

import '../livros/apoio.dart';
import '../progresso/apoio_progresso.dart';
import 'apoio_estante.dart';

/// Destino do lembrete de sequência (F-GAM-OPC; notificacoes.md P3 §3): a estante conta as
/// leituras em andamento e decide entre o registro de progresso, o filtro `Lendo` e `Todos`.
void main() {
  late List<Uri> pedidas;
  late int consumidos;
  late List<StatusEstante?> filtros;

  Future<void> montar(
    WidgetTester tester, {
    required Map<String, Object?> totaisDaEstante,
    List<Map<String, Object?>> emAndamento = const <Map<String, Object?>>[],
    bool falhar = false,
  }) async {
    usarTelaDeCelular(tester);
    pedidas = <Uri>[];
    consumidos = 0;
    filtros = <StatusEstante?>[];
    final servico = estanteSimulada((request) async {
      pedidas.add(request.url);
      if (falhar) {
        return erro(503, 'SERVICO_INDISPONIVEL', 'Serviço indisponível.');
      }
      if (request.url.path.startsWith('/leituras/')) {
        return json(leituraJson('le1'), 200);
      }
      final status = request.url.queryParameters['status'];
      final itens = status == null
          ? emAndamento
          : emAndamento.where((item) => item['status'] == status).toList();
      return json(paginaJson(itens, totaisPorStatus: totaisDaEstante), 200);
    });
    await tester.pumpWidget(
      envolver(
        EstantePage(
          servico: servico,
          aoBuscarLivros: () {},
          progresso: progressoEmMemoria(),
          lembreteDeSequencia: true,
          aoConsumirLembrete: () => consumidos++,
          aoMudarFiltro: filtros.add,
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('uma única leitura em andamento abre o registro de progresso dela', (tester) async {
    await montar(
      tester,
      totaisDaEstante: totais(lendo: 1, lido: 3),
      emAndamento: <Map<String, Object?>>[
        itemJson(
          'l1',
          status: 'LENDO',
          leituraEmAndamentoId: 'le1',
          paginaAtual: 148,
          totalPaginas: 264,
          percentual: 56,
        ),
      ],
    );

    expect(consumidos, 1);
    expect(pedidas.any((u) => u.path == '/leituras/le1'), isTrue);
    expect(find.byType(FolhaDeRegistroDeProgresso), findsOneWidget);
    expect(filtros, isEmpty);
  });

  testWidgets('a única em Relendo também abre o registro', (tester) async {
    await montar(
      tester,
      totaisDaEstante: totais(relendo: 1),
      emAndamento: <Map<String, Object?>>[
        itemJson('l1', status: 'RELENDO', leituraEmAndamentoId: 'le1', totalPaginas: 264),
      ],
    );

    expect(
      pedidas.any((u) => u.path == '/estante' && u.queryParameters['status'] == 'RELENDO'),
      isTrue,
    );
    expect(find.byType(FolhaDeRegistroDeProgresso), findsOneWidget);
  });

  testWidgets('mais de uma leitura em andamento abre o filtro Lendo', (tester) async {
    await montar(tester, totaisDaEstante: totais(lendo: 2, relendo: 1));

    expect(filtros, <StatusEstante?>[StatusEstante.lendo]);
    expect(find.byType(FolhaDeRegistroDeProgresso), findsNothing);
  });

  testWidgets('nenhuma em andamento fica na estante em Todos', (tester) async {
    await montar(tester, totaisDaEstante: totais(lido: 4));

    expect(consumidos, 1);
    expect(filtros, isEmpty);
    expect(find.byType(FolhaDeRegistroDeProgresso), findsNothing);
  });

  testWidgets('falha ao contar não quebra: o leitor fica na estante', (tester) async {
    await montar(tester, totaisDaEstante: totais(), falhar: true);

    expect(consumidos, 1);
    expect(find.byType(FolhaDeRegistroDeProgresso), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('sem o pedido na rota, a estante não decide nada', (tester) async {
    usarTelaDeCelular(tester);
    final pedidasSemLembrete = <Uri>[];
    await tester.pumpWidget(
      envolver(
        EstantePage(
          servico: estanteSimulada((request) async {
            pedidasSemLembrete.add(request.url);
            return json(paginaJson(const <Map<String, Object?>>[], totaisPorStatus: totais()), 200);
          }),
          aoBuscarLivros: () {},
          progresso: progressoEmMemoria(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(pedidasSemLembrete.where((u) => u.queryParameters['limite'] == '1'), isEmpty);
  });
}
