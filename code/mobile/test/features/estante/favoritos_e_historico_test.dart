import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/estante/acoes_leitura.dart';
import 'package:le_ai_mobile/features/estante/busca_na_estante.dart';
import 'package:le_ai_mobile/features/estante/estante_page.dart';
import 'package:le_ai_mobile/features/estante/estante_service.dart';
import 'package:le_ai_mobile/features/estante/textos.dart';
import 'package:le_ai_mobile/features/historico/historico_page.dart';
import 'package:le_ai_mobile/features/historico/textos.dart';
import 'package:le_ai_mobile/features/progresso/fila_de_progresso.dart';
import 'package:le_ai_mobile/features/progresso/progresso_page.dart';
import 'package:le_ai_mobile/features/progresso/rotas_progresso.dart';
import 'package:le_ai_mobile/features/progresso/textos.dart';

import '../livros/apoio.dart';
import '../progresso/apoio_progresso.dart';
import 'apoio_estante.dart';

Map<String, Object?> _ocorrencia(String leituraId, String dataFim, {bool releitura = false}) =>
    <String, Object?>{
      'leituraId': leituraId,
      'livro': <String, Object?>{
        'id': 'dom-casmurro',
        'tipo': 'oficial',
        'titulo': 'Dom Casmurro',
        'autor': 'Machado de Assis',
        'capaUrl': null,
      },
      'dataInicio': dataFim,
      'dataFim': dataFim,
      'releitura': releitura,
      'duracaoDias': 1,
      'paginaFinal': 256,
      'totalPaginas': 256,
    };

Map<String, Object?> _historico(
  List<Map<String, Object?>> itens, {
  int page = 1,
  int totalPaginas = 1,
  int leituras = 3,
}) => <String, Object?>{
  'itens': itens,
  'paginacao': <String, Object?>{
    'page': page,
    'limite': 2,
    'totalItens': leituras,
    'totalPaginas': totalPaginas,
  },
  'anos': <Map<String, Object?>>[
    <String, Object?>{'ano': 2025, 'total': 2},
    <String, Object?>{'ano': 2024, 'total': 1},
  ],
  'totais': <String, Object?>{'livros': 1, 'leituras': leituras},
};

const int _tentativasDoCliente = 3;

void main() {
  testWidgets(
    'favoritar nas ações é otimista, volta e avisa na falha, e o reenvio usa a mesma chave',
    (tester) async {
      usarTelaDeCelular(tester);
      final chaves = <String?>[];
      final servico = estanteSimulada((request) async {
        if (request.method == 'PUT') {
          chaves.add(request.headers['Idempotency-Key']);
          if (chaves.length <= _tentativasDoCliente) {
            return erro(503, 'SERVICO_INDISPONIVEL', 'Fora do ar.');
          }
          return json(<String, Object?>{
            'livroId': 'l1',
            'favorito': true,
            'favoritadoEm': null,
          }, 200);
        }
        return json(<String, Object?>{
          'livroId': 'l1',
          'favorito': false,
          'favoritadoEm': null,
        }, 200);
      });
      await tester.pumpWidget(
        envolver(
          Scaffold(
            body: FolhaDeAcoesDeLeitura(
              servico: servico,
              livro: const LivroDaAcao(
                livroId: 'l1',
                livro: LivroDaEstante(titulo: 'Vidas Secas', autor: null, capaUrl: null),
                status: StatusEstante.lido,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tocar(tester, find.text(TextosDoFavorito.favoritar));
      await tester.pumpAndSettle();
      expect(find.text(TextosDoFavorito.favoritar), findsOneWidget);
      expect(find.text(TextosDoFavorito.erro), findsOneWidget);

      await tocar(tester, find.text(TextosDoFavorito.favoritar));
      await tester.pumpAndSettle();
      expect(find.text(TextosDoFavorito.remover), findsOneWidget);
      expect(find.text(TextosDoFavorito.erro), findsNothing);
      expect(chaves, hasLength(_tentativasDoCliente + 1));
      expect(chaves.toSet(), hasLength(1));
    },
  );

  testWidgets(
    'a busca da estante filtra dentro do status e, sem resultado, leva o termo ao acervo',
    (tester) async {
      usarTelaDeCelular(tester);
      final consultas = <Map<String, String>>[];
      final servico = estanteSimulada((request) async {
        consultas.add(request.url.queryParameters);
        final busca = request.url.queryParameters['q'];
        return json(
          paginaJson(
            busca == null ? <Map<String, Object?>>[itemJson('l1', status: 'LENDO')] : const [],
            totaisPorStatus: totais(lendo: 1),
          ),
          200,
        );
      });
      final busca = BuscaNaEstante();
      String? levadoAoAcervo;
      await tester.pumpWidget(
        envolver(
          EstantePage(
            servico: servico,
            aoBuscarLivros: () {},
            statusInicial: StatusEstante.lendo,
            busca: busca,
            aoBuscarNoAcervo: (termo) => levadoAoAcervo = termo,
          ),
        ),
      );
      await tester.pumpAndSettle();

      busca.definir('saramago');
      await tester.pumpAndSettle();
      expect(consultas.last['status'], 'LENDO');
      expect(consultas.last['q'], 'saramago');
      expect(find.text(textoEncontradosNaEstante(0)), findsOneWidget);

      await tocar(tester, find.text(TextosDaBuscaNaEstante.vazioBotao));
      expect(levadoAoAcervo, 'saramago');
      busca.dispose();
    },
  );

  group('HistoricoPage', () {
    Future<void> montar(
      WidgetTester tester,
      Future<http.Response> Function(http.Request) handler, {
      ValueChanged<String>? aoAbrir,
    }) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          HistoricoPage(
            servico: estanteSimulada(handler),
            aoVoltar: () {},
            aoVerEstante: () {},
            aoAbrirOcorrencia: aoAbrir ?? (_) {},
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets(
      'agrupa por ano, pagina, pesquisa em todos os anos, filtra por ano e abre a ocorrência',
      (tester) async {
        final consultas = <Map<String, String>>[];
        String? aberta;
        await montar(tester, (request) async {
          consultas.add(request.url.queryParameters);
          if (request.url.queryParameters['page'] == '2') {
            return json(
              _historico(
                <Map<String, Object?>>[_ocorrencia('lei-1', '2024-03-22')],
                page: 2,
                totalPaginas: 2,
              ),
              200,
            );
          }
          return json(
            _historico(<Map<String, Object?>>[
              _ocorrencia('lei-3', '2025-11-16', releitura: true),
              _ocorrencia('lei-2', '2025-02-09', releitura: true),
            ], totalPaginas: 2),
            200,
          );
        }, aoAbrir: (leituraId) => aberta = leituraId);

        expect(find.text(textoLeiturasConcluidas(3)), findsOneWidget);
        expect(find.text('2025'), findsWidgets);

        await tester.drag(find.byType(ListView), const Offset(0, -20000));
        await tester.pumpAndSettle();
        expect(consultas.map((consulta) => consulta['page']), contains('2'));

        await tester.enterText(find.byType(TextField), 'machado');
        await tester.testTextInput.receiveAction(TextInputAction.search);
        await tester.pumpAndSettle();
        expect(consultas.last['q'], 'machado');
        expect(consultas.last.containsKey('ano'), isFalse);

        await tocar(tester, find.bySemanticsLabel('2025'));
        await tester.pumpAndSettle();
        expect(consultas.last['ano'], '2025');
        expect(consultas.last['q'], 'machado');

        await tocar(tester, find.text(TextosDoHistorico.releitura).first);
        expect(aberta, 'lei-3');
      },
    );

    testWidgets('serviço indisponível mostra o erro e tenta de novo', (tester) async {
      var chamadas = 0;
      await montar(tester, (request) async {
        chamadas++;
        return chamadas <= 3
            ? erro(503, 'SERVICO_INDISPONIVEL', 'Fora do ar.')
            : json(_historico(<Map<String, Object?>>[_ocorrencia('lei-3', '2025-11-16')]), 200);
      });
      expect(find.text(TextosDoHistorico.erroTexto), findsOneWidget);

      await tocar(tester, find.text(TextosDoHistorico.erroBotao));
      await tester.pumpAndSettle();
      expect(find.text(TextosDoHistorico.erroTexto), findsNothing);
      expect(find.text('Dom Casmurro'), findsOneWidget);
    });
  });

  testWidgets(
    'ocorrência concluída abre o progresso no modo histórico, sem registrar nem excluir',
    (tester) async {
      usarTelaDeCelular(tester);
      final servico = progressoSimulado(
        (request) async => json(
          paginaProgressoJson(<Map<String, Object?>>[
            progressoJson('a', posicao: 1, pagina: 117, paginaAnterior: 0),
          ], somenteLeitura: true),
          200,
        ),
      );
      await tester.pumpWidget(
        envolver(
          ProgressoPage(
            leituraId: 'le1',
            progresso: DependenciasDeProgresso(
              servico: servico,
              fila: FilaDeProgresso(servico, ArmazemEmMemoria()),
            ),
            estante: estanteSimulada((request) async {
              if (request.url.path.startsWith('/leituras/')) {
                return json(
                  leituraJson('le1', status: 'LIDO', releitura: true, dataFim: '2026-09-14'),
                  200,
                );
              }
              return json(itemJson('l1', status: 'LIDO'), 200);
            }),
            aoVoltar: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text(TextosDasAtualizacoes.concluida), findsOneWidget);
      expect(find.text(TextosDasAtualizacoes.releitura), findsOneWidget);
      expect(find.text('Início em 1 de setembro de 2026 · 14 dias'), findsOneWidget);
      expect(find.text(TextosDasAtualizacoes.somenteConsulta), findsOneWidget);
      expect(find.byTooltip(TextosDoRegistro.titulo), findsNothing);
      expect(find.byTooltip(TextosDasAtualizacoes.rotuloExcluir(117)), findsNothing);
    },
  );
}
