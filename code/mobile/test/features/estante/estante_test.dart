import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/core/network/recarga_em_sequencia.dart';
import 'package:le_ai_mobile/features/estante/acao_leitura_controller.dart';
import 'package:le_ai_mobile/features/estante/acoes_disponiveis.dart';
import 'package:le_ai_mobile/features/estante/acoes_leitura.dart';
import 'package:le_ai_mobile/features/estante/datas_de_leitura.dart';
import 'package:le_ai_mobile/features/estante/estante_page.dart';
import 'package:le_ai_mobile/features/estante/estante_service.dart';
import 'package:le_ai_mobile/features/estante/textos.dart';
import 'package:le_ai_mobile/features/perfil/perfil_de_outro_page.dart';
import 'package:le_ai_mobile/features/perfil/perfil_page.dart';
import 'package:le_ai_mobile/features/perfil/perfil_service.dart';
import 'package:http/testing.dart';

import '../livros/apoio.dart';
import 'apoio_estante.dart';

const String _livroId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

Leitura _leitura({bool retomavel = false}) =>
    Leitura.fromJson(leituraJson('le1', retomavel: retomavel));

List<IdAcao> _ids(StatusEstante? status, {Leitura? leitura}) =>
    acoesDisponiveis(EstadoDeLeitura(status: status, leitura: leitura)).map((a) => a.id).toList();

void main() {
  group('acoesDisponiveis (RN-04)', () {
    test('cada status oferece só as transições válidas, destrutiva por último', () {
      expect(_ids(null), <IdAcao>[IdAcao.adicionarQueroLer, IdAcao.iniciarLeitura]);
      expect(_ids(StatusEstante.queroLer), <IdAcao>[
        IdAcao.iniciarLeitura,
        IdAcao.removerDaEstante,
      ]);
      expect(_ids(StatusEstante.lendo, leitura: _leitura()), <IdAcao>[
        IdAcao.registrarProgresso,
        IdAcao.verAtualizacoes,
        IdAcao.finalizarLeitura,
        IdAcao.abandonarLeitura,
      ]);
      expect(_ids(StatusEstante.relendo, leitura: _leitura()), <IdAcao>[
        IdAcao.registrarProgresso,
        IdAcao.verAtualizacoes,
        IdAcao.finalizarReleitura,
        IdAcao.abandonarReleitura,
      ]);
      expect(_ids(StatusEstante.lido), <IdAcao>[IdAcao.iniciarReleitura]);
      expect(_ids(StatusEstante.abandonado, leitura: _leitura(retomavel: true)), <IdAcao>[
        IdAcao.retomarLeitura,
      ]);
      expect(_ids(StatusEstante.abandonado, leitura: _leitura()), isEmpty);
      expect(_ids(StatusEstante.lendo), <IdAcao>[IdAcao.registrarProgresso]);
    });
  });

  test('o fuso vira identificador IANA Etc/GMT com sinal invertido', () {
    expect(fusoHorarioDoDispositivo(DateTime.utc(2026)), 'Etc/UTC');
    expect(dataIso(DateTime(2026, 9, 8)), '2026-09-08');
  });

  group('AcaoLeituraController', () {
    test('reenvio da mesma intenção reaproveita a chave; intenção nova troca', () async {
      final chaves = <String?>[];
      var falhar = true;
      final controller = AcaoLeituraController(
        estanteSimulada((request) async {
          chaves.add(request.headers['Idempotency-Key']);
          if (falhar) {
            throw const SocketExceptionSimulada();
          }
          return json(itemJson(_livroId), 201);
        }),
      );
      const pedido = PedidoDeAcao(acao: IdAcao.adicionarQueroLer, livroId: _livroId);

      expect(await controller.executar(pedido), isNull);
      expect(controller.erro, TextosDeAcao.erroAoSalvar);
      falhar = false;
      final estado = await controller.executar(pedido);
      expect(estado?.status, StatusEstante.queroLer);
      expect(chaves.toSet(), hasLength(1));

      await controller.executar(pedido);
      expect(chaves.toSet(), hasLength(2));
    });

    test('409 mostra o conflito e descarta a chave', () async {
      final chaves = <String?>[];
      final controller = AcaoLeituraController(
        estanteSimulada((request) async {
          chaves.add(request.headers['Idempotency-Key']);
          return erro(409, 'TRANSICAO_INVALIDA', 'Transição inválida.');
        }),
      );
      const pedido = PedidoDeAcao(acao: IdAcao.removerDaEstante, livroId: _livroId);
      await controller.executar(pedido);
      expect(controller.erro, ErrosDeAcao.conflito);
      await controller.executar(pedido);
      expect(chaves.toSet(), hasLength(2));
    });

    test('timeout mostra a mensagem de salvar e mantém a chave', () async {
      final chaves = <String?>[];
      final controller = AcaoLeituraController(
        estanteSimulada((request) {
          chaves.add(request.headers['Idempotency-Key']);
          return Completer<http.Response>().future;
        }, timeout: const Duration(milliseconds: 10)),
      );
      const pedido = PedidoDeAcao(acao: IdAcao.retomarLeitura, livroId: _livroId, leituraId: 'le1');
      await controller.executar(pedido);
      expect(controller.erro, TextosDeAcao.erroAoSalvar);
      await controller.executar(pedido);
      expect(chaves.toSet(), hasLength(1));
    });

    test('finalizar manda dataFim e fuso; releitura abandonada volta a Lido', () async {
      Map<String, dynamic>? corpo;
      final controller = AcaoLeituraController(
        estanteSimulada((request) async {
          if (request.url.path.endsWith('/finalizar')) {
            corpo = jsonDecode(request.body) as Map<String, dynamic>;
            return json(leituraJson('le1', status: 'LIDO', dataFim: '2026-09-08'), 200);
          }
          return json(
            leituraJson('le1', status: 'ABANDONADO', releitura: true, incompleta: true),
            200,
          );
        }),
      );
      await controller.executar(
        const PedidoDeAcao(
          acao: IdAcao.finalizarLeitura,
          livroId: _livroId,
          leituraId: 'le1',
          data: '2026-09-08',
          fusoHorarioDispositivo: 'Etc/GMT+3',
        ),
      );
      expect(corpo, <String, dynamic>{
        'dataFim': '2026-09-08',
        'fusoHorarioDispositivo': 'Etc/GMT+3',
      });
      final estado = await controller.executar(
        const PedidoDeAcao(acao: IdAcao.abandonarReleitura, livroId: _livroId, leituraId: 'le1'),
      );
      expect(estado?.status, StatusEstante.lido);
    });
  });

  group('EstantePage', () {
    testWidgets('pills com contagem, Todos soma, ordenação e segunda página', (tester) async {
      usarTelaDeCelular(tester);
      final consultas = <Map<String, String>>[];
      final servico = estanteSimulada((request) async {
        consultas.add(request.url.queryParameters);
        final pagina = int.parse(request.url.queryParameters['page'] ?? '1');
        return json(
          paginaJson(
            <Map<String, Object?>>[
              for (var i = 0; i < 20; i++)
                itemJson('p$pagina-$i', titulo: 'Livro $pagina-$i', status: 'LIDO', vezesLido: 2),
            ],
            page: pagina,
            totalPaginas: 2,
            totalItens: 40,
            totaisPorStatus: totais(lendo: 2, queroLer: 3, lido: 33, relendo: 1, abandonado: 1),
          ),
          200,
        );
      });
      await tester.pumpWidget(envolver(EstantePage(servico: servico, aoBuscarLivros: () {})));
      await tester.pumpAndSettle();

      expect(find.bySemanticsLabel('Todos 40'), findsOneWidget);
      expect(find.bySemanticsLabel('Lido 33'), findsOneWidget);
      expect(find.text('40 livros'), findsOneWidget);
      expect(find.text('Lido 2 vezes'), findsWidgets);

      await tester.drag(find.byType(ListView), const Offset(0, -20000));
      await tester.pumpAndSettle();
      expect(consultas.map((c) => c['page']), containsAll(<String>['1', '2']));

      await tester.drag(find.byType(ListView), const Offset(0, 40000));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Adicionados recentemente'));
      await tester.pumpAndSettle();
      for (final rotulo in rotuloDaOrdenacao.values) {
        expect(find.text(rotulo), findsWidgets);
      }
      await tester.tap(find.text('Maior progresso'));
      await tester.pumpAndSettle();
      expect(consultas.last['ordenacao'], 'progresso_desc');
      expect(consultas.last['page'], '1');

      await tocar(tester, find.bySemanticsLabel('Lendo 2'));
      await tester.pumpAndSettle();
      expect(consultas.last['status'], 'LENDO');
    });

    testWidgets('estante vazia leva ao Descobrir; erro tem Tentar de novo', (tester) async {
      usarTelaDeCelular(tester);
      var falhar = true;
      var buscou = false;
      final servico = estanteSimulada((request) async {
        if (falhar) {
          return erro(500, 'ERRO_INTERNO', 'Falha.');
        }
        return json(paginaJson(const <Map<String, Object?>>[], totaisPorStatus: totais()), 200);
      });
      await tester.pumpWidget(
        envolver(EstantePage(servico: servico, aoBuscarLivros: () => buscou = true)),
      );
      await tester.pumpAndSettle();
      expect(find.text(TextosDaEstante.erroTexto), findsOneWidget);

      falhar = false;
      await tester.tap(find.text('Tentar de novo'));
      await tester.pumpAndSettle();
      expect(find.text(TextosDaEstante.vaziaTitulo), findsOneWidget);
      await tester.tap(find.text('Buscar livros'));
      expect(buscou, isTrue);
    });

    testWidgets('filtro vazio mostra o CTA do filtro', (tester) async {
      usarTelaDeCelular(tester);
      final servico = estanteSimulada((request) async {
        final status = request.url.queryParameters['status'];
        return json(
          paginaJson(
            status == null
                ? <Map<String, Object?>>[itemJson(_livroId)]
                : const <Map<String, Object?>>[],
            totaisPorStatus: totais(queroLer: 1),
          ),
          200,
        );
      });
      await tester.pumpWidget(envolver(EstantePage(servico: servico, aoBuscarLivros: () {})));
      await tester.pumpAndSettle();
      await tocar(tester, find.bySemanticsLabel('Relendo 0'));
      await tester.pumpAndSettle();
      expect(find.text('Nenhuma releitura em andamento'), findsOneWidget);
      await tester.tap(find.text('Ver livros lidos'));
      await tester.pumpAndSettle();
      expect(find.text('Nenhum livro concluído'), findsOneWidget);
    });

    testWidgets('recarrega quando o livro entra na estante por outra tela', (tester) async {
      usarTelaDeCelular(tester);
      var naEstante = false;
      final servico = estanteSimulada((request) async {
        if (request.method == 'POST') {
          naEstante = true;
          return json(itemJson(_livroId, titulo: 'Diário de um Banana 6'), 201);
        }
        return json(
          paginaJson(<Map<String, Object?>>[
            itemJson('l0'),
            if (naEstante) itemJson(_livroId, titulo: 'Diário de um Banana 6'),
          ]),
          200,
        );
      });
      await tester.pumpWidget(envolver(EstantePage(servico: servico, aoBuscarLivros: () {})));
      await tester.pumpAndSettle();
      expect(find.text('Diário de um Banana 6'), findsNothing);

      // A página do livro, na aba Descobrir, usa o mesmo serviço; a Estante continua montada.
      unawaited(servico.adicionarEstante(_livroId, idempotencyKey: 'k1'));
      await tester.pumpAndSettle();
      expect(find.text('Diário de um Banana 6'), findsOneWidget);
      expect(find.bySemanticsLabel('Todos 2'), findsOneWidget);
    });
  });

  group('RecargaEmSequencia', () {
    test('pedidos durante uma recarga viram uma só, depois dela', () async {
      var recargas = 0;
      var emParalelo = 0;
      var maiorParalelo = 0;
      final liberar = <Completer<void>>[];
      final recarga = RecargaEmSequencia(() async {
        recargas++;
        emParalelo++;
        maiorParalelo = emParalelo > maiorParalelo ? emParalelo : maiorParalelo;
        final espera = Completer<void>();
        liberar.add(espera);
        await espera.future;
        emParalelo--;
      });

      final primeira = recarga.pedir();
      recarga
        ..pedir()
        ..pedir()
        ..pedir();
      await Future<void>.delayed(Duration.zero);
      expect(recargas, 1);

      liberar.last.complete();
      await Future<void>.delayed(Duration.zero);
      expect(recargas, 2);
      liberar.last.complete();
      await primeira;

      expect(recargas, 2);
      expect(maiorParalelo, 1);

      unawaited(recarga.pedir());
      await Future<void>.delayed(Duration.zero);
      expect(recargas, 3);
      liberar.last.complete();
    });
  });

  group('Folha de ações', () {
    Future<void> abrir(WidgetTester tester, EstanteService servico, LivroDaAcao livro) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          Builder(
            builder: (context) => TextButton(
              onPressed: () => abrirAcoesDeLeitura(context, servico: servico, livro: livro),
              child: const Text('abrir'),
            ),
          ),
        ),
      );
      await tester.tap(find.text('abrir'));
      await tester.pumpAndSettle();
    }

    LivroDaAcao livro(StatusEstante status) => LivroDaAcao(
      livroId: _livroId,
      livro: const LivroDaEstante(titulo: 'Torto Arado', autor: null, capaUrl: null),
      status: status,
      leituraId: 'le1',
    );

    testWidgets('abandonar leitura e releitura têm confirmações distintas', (tester) async {
      await abrir(
        tester,
        estanteSimulada((request) async => json(leituraJson('le1'), 200)),
        livro(StatusEstante.lendo),
      );
      expect(find.text('Página 148 de 264'), findsOneWidget);
      await tester.tap(find.text('Abandonar leitura'));
      await tester.pumpAndSettle();
      expect(find.text(ConfirmacaoAbandonarLeitura.titulo), findsOneWidget);
      expect(find.text(ConfirmacaoAbandonarLeitura.texto(148)), findsOneWidget);
      expect(find.text(ConfirmacaoAbandonarReleitura.texto), findsNothing);
    });

    testWidgets('abandonar releitura usa a copy de releitura', (tester) async {
      await abrir(
        tester,
        estanteSimulada(
          (request) async => json(leituraJson('le1', status: 'RELENDO', releitura: true), 200),
        ),
        livro(StatusEstante.relendo),
      );
      await tester.tap(find.text('Abandonar releitura'));
      await tester.pumpAndSettle();
      expect(find.text(ConfirmacaoAbandonarReleitura.titulo), findsOneWidget);
      expect(find.text(ConfirmacaoAbandonarReleitura.texto), findsOneWidget);
    });

    testWidgets('abandonado retomável mostra Retomar e a página', (tester) async {
      await abrir(
        tester,
        estanteSimulada(
          (request) async => json(
            leituraJson(
              'le1',
              status: 'ABANDONADO',
              retomavel: true,
              paginaAtual: 210,
              totalPaginas: 552,
            ),
            200,
          ),
        ),
        livro(StatusEstante.abandonado),
      );
      expect(find.text('Retomar leitura'), findsOneWidget);
      expect(find.text('Parou na página 210 de 552'), findsOneWidget);
      expect(find.text('Você volta para a página 210, onde parou.'), findsOneWidget);
    });

    testWidgets('iniciar leitura abre o passo de data com hoje e o helper', (tester) async {
      Map<String, dynamic>? corpo;
      await abrir(
        tester,
        estanteSimulada((request) async {
          corpo = jsonDecode(request.body) as Map<String, dynamic>;
          return json(leituraJson('le1'), 201);
        }),
        const LivroDaAcao(
          livroId: _livroId,
          livro: LivroDaEstante(titulo: 'Torto Arado', autor: null, capaUrl: null),
          status: StatusEstante.queroLer,
        ),
      );
      await tester.tap(find.text('Iniciar leitura'));
      await tester.pumpAndSettle();
      expect(find.text(TextosDeAcao.ajudaDataInicio), findsOneWidget);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Iniciar leitura'));
      await tester.pumpAndSettle();
      expect(corpo?['dataInicio'], dataIso(diaLocal(DateTime.now())));
      expect(find.text(TextosDeAcao.ajudaDataInicio), findsNothing);
    });
  });

  group('Estante no perfil de outro leitor', () {
    PerfilService perfil() => PerfilService(
      ApiClient(
        baseUrl: 'https://identidade.example.com',
        client: MockClient(
          (request) async => json(<String, Object?>{
            'id': 'u2',
            'username': 'bia',
            'displayName': 'Beatriz Lima',
            'avatarUrl': null,
            'privacidade': 'publico',
            'conteudoRestrito': false,
            'relacao': 'seguindo',
            'biografia': null,
            'contadores': <String, Object?>{'seguidores': 1, 'seguidos': 1},
          }, 200),
        ),
      ),
    );

    Future<void> montar(WidgetTester tester, EstanteService estante) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          PerfilDeOutroPage(
            servico: perfil(),
            username: 'bia',
            aoAbrirProprioPerfil: () {},
            aoBuscarLeitor: () {},
            aoAbrirSolicitacoes: () {},
            estante: estante,
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('mostra os livros sem ações', (tester) async {
      await montar(
        tester,
        estanteSimulada((request) async {
          expect(request.url.path, '/perfis/u2/estante');
          return json(paginaJson(<Map<String, Object?>>[itemJson(_livroId)]), 200);
        }),
      );
      expect(find.text('Estante'), findsOneWidget);
      expect(find.text('Torto Arado'), findsOneWidget);
    });

    testWidgets('403 vira o estado privado', (tester) async {
      await montar(tester, estanteSimulada((request) async => erro(403, 'PROIBIDO', 'Privado.')));
      expect(find.text('Este perfil é privado'), findsOneWidget);
    });

    testWidgets('404 esconde a seção', (tester) async {
      await montar(
        tester,
        estanteSimulada((request) async => erro(404, 'NAO_ENCONTRADO', 'Não encontrado.')),
      );
      expect(find.text('Estante'), findsNothing);
      expect(find.text('Este perfil é privado'), findsNothing);
    });
  });

  group('Estante no meu perfil', () {
    PerfilService meuPerfil() => PerfilService(
      ApiClient(
        baseUrl: 'https://identidade.example.com',
        client: MockClient((request) async {
          if (request.url.path == '/solicitacoes') {
            return json(<String, Object?>{
              'items': <Object?>[],
              'page': 0,
              'size': 1,
              'totalElements': 0,
              'totalPages': 0,
            }, 200);
          }
          return json(<String, Object?>{
            'id': 'u1',
            'username': 'marinableu',
            'displayName': 'Marina Beltrão',
            'avatarUrl': null,
            'privacidade': 'privado',
            'conteudoRestrito': false,
            'relacao': 'proprio',
            'biografia': null,
            'contadores': <String, Object?>{'seguidores': 1, 'seguidos': 1},
          }, 200);
        }),
      ),
    );

    Future<void> montar(WidgetTester tester, EstanteService estante, {VoidCallback? aoVerEstante}) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          PerfilPage(
            servico: meuPerfil(),
            estante: estante,
            aoBuscarLivros: () {},
            aoVerEstante: aoVerEstante ?? () {},
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('mostra os próprios livros, sem ações, com "Ver tudo"', (tester) async {
      var verTudo = 0;
      await montar(
        tester,
        estanteSimulada((request) async {
          expect(request.url.path, '/perfis/u1/estante');
          return json(paginaJson(<Map<String, Object?>>[itemJson(_livroId, titulo: 'Dom Casmurro')]), 200);
        }),
        aoVerEstante: () => verTudo++,
      );

      expect(find.text('Dom Casmurro'), findsOneWidget);
      expect(find.text('Os livros que você adicionar aparecem aqui.'), findsNothing);
      await tester.tap(find.text('Ver tudo'));
      expect(verTudo, 1);
    });

    testWidgets('sem livros, fica o vazio com "Buscar livros"', (tester) async {
      await montar(tester, estanteSimulada((request) async => json(paginaJson(<Map<String, Object?>>[]), 200)));
      expect(find.text('Os livros que você adicionar aparecem aqui.'), findsOneWidget);
      expect(find.text('Buscar livros'), findsOneWidget);
      expect(find.text('Ver tudo'), findsOneWidget);
    });

    testWidgets('404 do leitura fica no vazio com "Buscar livros"', (tester) async {
      await montar(
        tester,
        estanteSimulada((request) async => erro(404, 'NAO_ENCONTRADO', 'Não encontrado.')),
      );
      expect(find.text('Os livros que você adicionar aparecem aqui.'), findsOneWidget);
      expect(find.text('Buscar livros'), findsOneWidget);
    });

    testWidgets('falha mostra erro com "Tentar de novo"', (tester) async {
      var falhar = true;
      await montar(
        tester,
        estanteSimulada((request) async {
          // O cliente repete GET com 5xx: a falha dura até o toque em "Tentar de novo".
          if (falhar) {
            return erro(500, 'ERRO_INTERNO', 'Falha.');
          }
          return json(paginaJson(<Map<String, Object?>>[itemJson(_livroId, titulo: 'Dom Casmurro')]), 200);
        }),
      );
      expect(find.text(TextosDaEstanteDePerfil.erroTexto), findsOneWidget);
      falhar = false;
      await tester.tap(find.text(TextosDaEstante.erroBotao));
      await tester.pumpAndSettle();
      expect(find.text('Dom Casmurro'), findsOneWidget);
    });
  });
}

class SocketExceptionSimulada implements Exception {
  const SocketExceptionSimulada();
}
