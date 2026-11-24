import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/core/session/session_controller.dart';
import 'package:le_ai_mobile/core/session/token_store.dart';
import 'package:le_ai_mobile/features/recomendacoes/folha_descarte_em_lote.dart';
import 'package:le_ai_mobile/features/recomendacoes/recomendacoes_recebidas_page.dart';
import 'package:le_ai_mobile/features/recomendacoes/secoes_de_sugestoes.dart';
import 'package:le_ai_mobile/features/recomendacoes/sessao_do_descarte_em_lote.dart';

import '../feed/apoio.dart';
import '../livros/apoio.dart' show usarTelaDeCelular;

Map<String, Object?> _sugestao(String id, String titulo, String motivo, {String tipo = 'SEGUIDOS'}) =>
    <String, Object?>{
      'livro': <String, Object?>{
        'id': id,
        'tipo': 'OFICIAL',
        'titulo': titulo,
        'autor': 'Aline Bei',
        'capaUrl': null,
      },
      'motivo': <String, Object?>{'tipo': tipo, 'texto': motivo},
    };

Map<String, Object?> _secao(List<Map<String, Object?>> itens, [int? proximo]) =>
    <String, Object?>{'itens': itens, 'proximoOffset': proximo};

final Map<String, Object?> _empilhadas = _sugestao(
  'l1',
  'Mulheres Empilhadas',
  '4 pessoas que você segue leram',
);
final Map<String, Object?> _passaro = _sugestao(
  'l2',
  'O Peso do Pássaro Morto',
  '3 pessoas que você segue leram',
);
final Map<String, Object?> _solitaria = _sugestao('l3', 'Solitária', '2 pessoas que você segue leram');
final Map<String, Object?> _arquipelago = _sugestao(
  'l4',
  'O Arquipélago',
  'Continuação de O Tempo e o Vento',
  tipo: 'SERIE',
);

class _StoreEmMemoria implements TokenStore {
  String? valor;

  @override
  Future<String?> read() async => valor;

  @override
  Future<void> write(String value) async => valor = value;

  @override
  Future<void> delete() async => valor = null;
}

Future<void> _tocarTexto(WidgetTester tester, String texto) async {
  final alvo = find.text(texto).last;
  await tester.ensureVisible(alvo);
  await tester.tap(alvo);
  await tester.pumpAndSettle();
}

void main() {
  group('seções de sugestão (F-REC-ALG)', () {
    Future<List<http.Request>> montar(
      WidgetTester tester,
      Future<http.Response> Function(http.Request) handler,
    ) async {
      usarTelaDeCelular(tester);
      final pedidos = <http.Request>[];
      await tester.pumpWidget(
        envolver(
          SingleChildScrollView(
            child: SecoesDeSugestoes(
              social: socialSimulado((request) {
                pedidos.add(request);
                return handler(request);
              }),
              aoAbrirLivro: (_) async {},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      return pedidos;
    }

    testWidgets('mostra as duas seções rotuladas, com o motivo e sem quem leu', (tester) async {
      await montar(
        tester,
        (_) async => json(<String, Object?>{
          'seguidos': _secao(<Map<String, Object?>>[_empilhadas]),
          'gosto': _secao(<Map<String, Object?>>[_arquipelago]),
        }, 200),
      );

      expect(find.text('Quem você segue leu'), findsOneWidget);
      expect(find.text('Do seu gosto'), findsOneWidget);
      expect(find.text('4 pessoas que você segue leram'), findsOneWidget);
      expect(find.text('Continuação de O Tempo e o Vento'), findsOneWidget);
      expect(
        find.bySemanticsLabel(
          'Mulheres Empilhadas, de Aline Bei. 4 pessoas que você segue leram.',
        ),
        findsOneWidget,
      );
    });

    testWidgets('seção vazia some inteira', (tester) async {
      await montar(
        tester,
        (_) async => json(<String, Object?>{
          'seguidos': _secao(const <Map<String, Object?>>[]),
          'gosto': _secao(<Map<String, Object?>>[_arquipelago]),
        }, 200),
      );

      expect(find.text('Quem você segue leu'), findsNothing);
      expect(find.text('Do seu gosto'), findsOneWidget);
    });

    testWidgets('falha das sugestões mostra o banner sem título e tenta de novo', (tester) async {
      var tentativas = 0;
      await montar(
        tester,
        (_) async => tentativas++ == 0
            ? erro(500, 'ERRO_INTERNO', 'Falhou.')
            : json(<String, Object?>{
                'seguidos': _secao(<Map<String, Object?>>[_empilhadas]),
                'gosto': _secao(const <Map<String, Object?>>[]),
              }, 200),
      );

      expect(
        find.text('Não foi possível carregar as sugestões. Verifique sua conexão e tente de novo.'),
        findsOneWidget,
      );
      expect(find.text('Quem você segue leu'), findsNothing);

      await _tocarTexto(tester, 'Tentar de novo');
      expect(find.text('Mulheres Empilhadas'), findsWidgets);
    });

    testWidgets('Mostrar mais pede a continuação pelo offset e some no fim', (tester) async {
      final pedidos = await montar(tester, (request) async {
        if (request.url.queryParameters['secao'] == 'seguidos') {
          return json(<String, Object?>{
            'seguidos': _secao(<Map<String, Object?>>[_solitaria]),
            'gosto': null,
          }, 200);
        }
        return json(<String, Object?>{
          'seguidos': _secao(<Map<String, Object?>>[_empilhadas, _passaro], 2),
          'gosto': _secao(const <Map<String, Object?>>[]),
        }, 200);
      });

      await _tocarTexto(tester, 'Mostrar mais');

      expect(pedidos.last.url.queryParameters, <String, String>{'secao': 'seguidos', 'offset': '2'});
      expect(find.text('Solitária'), findsWidgets);
      expect(find.text('Mostrar mais'), findsNothing);
    });

    testWidgets('descarte tira o item, avisa e desce o offset da próxima página', (tester) async {
      final pedidos = await montar(tester, (request) async {
        if (request.method == 'POST') {
          return http.Response('', 204);
        }
        if (request.url.queryParameters['secao'] == 'seguidos') {
          return json(<String, Object?>{'seguidos': _secao(const <Map<String, Object?>>[]), 'gosto': null}, 200);
        }
        return json(<String, Object?>{
          'seguidos': _secao(<Map<String, Object?>>[_empilhadas, _passaro, _solitaria], 3),
          'gosto': _secao(const <Map<String, Object?>>[]),
        }, 200);
      });

      await tester.tap(find.bySemanticsLabel('Mais ações para O Peso do Pássaro Morto'));
      await tester.pumpAndSettle();
      expect(find.text('Este livro não volta a aparecer nas sugestões.'), findsOneWidget);
      await _tocarTexto(tester, 'Descartar sugestão');

      expect(pedidos.last.url.path, '/recomendacoes/sugestoes/l2/descartar');
      expect(pedidos.last.headers.containsKey('Idempotency-Key'), isFalse);
      expect(find.text('O Peso do Pássaro Morto'), findsNothing);
      expect(find.text('Sugestão descartada.'), findsOneWidget);

      await _tocarTexto(tester, 'Mostrar mais');
      expect(pedidos.last.url.queryParameters['offset'], '2');
    });
    testWidgets('o mesmo livro nas duas seções sai das duas, e o offset de cada uma desce', (
      tester,
    ) async {
      final passaroNoGosto = _sugestao(
        'l2',
        'O Peso do Pássaro Morto',
        'Você lê muito Romance',
        tipo: 'ASSUNTO',
      );
      final pedidos = await montar(tester, (request) async {
        if (request.method == 'POST') {
          return http.Response('', 204);
        }
        final secao = request.url.queryParameters['secao'];
        if (secao != null) {
          return json(<String, Object?>{
            'seguidos': secao == 'seguidos' ? _secao(const <Map<String, Object?>>[]) : null,
            'gosto': secao == 'gosto' ? _secao(const <Map<String, Object?>>[]) : null,
          }, 200);
        }
        return json(<String, Object?>{
          'seguidos': _secao(<Map<String, Object?>>[_empilhadas, _passaro], 2),
          'gosto': _secao(<Map<String, Object?>>[passaroNoGosto, _arquipelago], 2),
        }, 200);
      });
      expect(find.text('Você lê muito Romance'), findsOneWidget);

      await tester.tap(find.bySemanticsLabel('Mais ações para O Peso do Pássaro Morto').first);
      await tester.pumpAndSettle();
      await _tocarTexto(tester, 'Descartar sugestão');

      expect(find.text('O Peso do Pássaro Morto'), findsNothing);
      expect(find.text('Você lê muito Romance'), findsNothing);
      expect(find.text('Sugestão descartada.'), findsOneWidget);

      await _tocarTexto(tester, 'Mostrar mais');
      expect(pedidos.last.url.queryParameters, <String, String>{'secao': 'gosto', 'offset': '1'});
      await _tocarTexto(tester, 'Mostrar mais');
      expect(pedidos.last.url.queryParameters, <String, String>{'secao': 'seguidos', 'offset': '1'});
    });

    testWidgets('descarte com 404 tira a sugestão, sem erro e sem Tentar de novo', (tester) async {
      var descartes = 0;
      final pedidos = await montar(tester, (request) async {
        if (request.method == 'POST') {
          descartes++;
          return erro(404, 'NAO_ENCONTRADO', 'Livro não encontrado.');
        }
        if (request.url.queryParameters['secao'] == 'seguidos') {
          return json(<String, Object?>{'seguidos': _secao(const <Map<String, Object?>>[]), 'gosto': null}, 200);
        }
        return json(<String, Object?>{
          'seguidos': _secao(<Map<String, Object?>>[_empilhadas, _passaro], 2),
          'gosto': _secao(const <Map<String, Object?>>[]),
        }, 200);
      });

      await tester.tap(find.bySemanticsLabel('Mais ações para O Peso do Pássaro Morto'));
      await tester.pumpAndSettle();
      await _tocarTexto(tester, 'Descartar sugestão');

      expect(descartes, 1);
      expect(find.text('O Peso do Pássaro Morto'), findsNothing);
      expect(find.textContaining('Não foi possível descartar a sugestão'), findsNothing);
      expect(find.text('Tentar de novo'), findsNothing);

      await _tocarTexto(tester, 'Mostrar mais');
      expect(pedidos.last.url.queryParameters['offset'], '1');
    });
  });

  group('pergunta de descarte em lote (F-REC-ALG, RN-22.12/13)', () {
    Map<String, Object?> recomendacao(String id, String remetente) => <String, Object?>{
      'id': id,
      'remetente': autorJson(id: 'u-$id', username: 'leitor$id', nome: remetente),
      'livro': <String, Object?>{
        'id': 'tudo-e-rio',
        'tipo': 'OFICIAL',
        'titulo': 'Tudo É Rio',
        'autor': 'Carla Madeira',
        'capaUrl': null,
      },
      'mensagem': null,
      'criadoEm': DateTime.now().subtract(const Duration(days: 2)).toUtc().toIso8601String(),
      'expiraEm': DateTime.now().add(const Duration(days: 88)).toUtc().toIso8601String(),
    };

    late List<Map<String, Object?>> lista;
    late List<http.Request> pedidos;

    setUp(() {
      zerarSessaoDoDescarteEmLote();
      lista = <Map<String, Object?>>[
        for (final (i, quem) in <String>['Lívia', 'Caio', 'Henrique', 'Beatriz', 'Júlia'].indexed)
          recomendacao('r$i', quem),
      ];
      pedidos = <http.Request>[];
    });

    Future<void> montar(
      WidgetTester tester, {
      int restantes = 2,
      bool loteFalhaPrimeiro = false,
      Future<http.Response> Function()? contagem,
      Future<void>? loteLiberado,
      int? removidasNoServidor,
      int alemDaPagina = 0,
    }) async {
      usarTelaDeCelular(tester);
      var lotes = 0;
      await tester.pumpWidget(
        envolver(
          RecomendacoesRecebidasPage(
            social: socialSimulado((request) async {
              pedidos.add(request);
              final caminho = request.url.path;
              if (request.method == 'DELETE') {
                final id = caminho.split('/').last;
                lista.removeWhere((r) => r['id'] == id);
                return http.Response('', 204);
              }
              if (caminho.endsWith('/restantes')) {
                return contagem != null
                    ? contagem()
                    : json(<String, Object?>{'restantes': restantes}, 200);
              }
              if (caminho.endsWith('/descartar-lote')) {
                await loteLiberado;
                if (loteFalhaPrimeiro && lotes++ == 0) {
                  return erro(500, 'ERRO_INTERNO', 'Falhou.');
                }
                bool doLivro(Map<String, Object?> r) =>
                    (r['livro']! as Map<String, Object?>)['id'] == 'tudo-e-rio';
                final removidas = removidasNoServidor ?? lista.where(doLivro).length;
                lista.removeWhere(doLivro);
                return json(<String, Object?>{'removidas': removidas}, 200);
              }
              return json(<String, Object?>{
                'itens': lista,
                'pagina': 0,
                'tamanho': 20,
                'totalItens': lista.length + alemDaPagina,
                'totalPaginas': lista.isEmpty ? 0 : 1,
                'ultima': true,
              }, 200);
            }),
            aoVoltar: () {},
            aoAbrirLivro: (_) async {},
            aoAbrirPerfil: (_) {},
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    Future<void> descartarUm(WidgetTester tester) async {
      await tester.tap(find.bySemanticsLabel(RegExp('^Mais ações para Tudo É Rio')).first);
      await tester.pumpAndSettle();
      await _tocarTexto(tester, 'Descartar recomendação');
    }

    int restantesPedidos() => pedidos.where((p) => p.url.path.endsWith('/restantes')).length;

    testWidgets('só pergunta no terceiro descarte, com quantas restam', (tester) async {
      await montar(tester);

      await descartarUm(tester);
      await descartarUm(tester);
      expect(restantesPedidos(), 0);

      await descartarUm(tester);
      expect(restantesPedidos(), 1);
      expect(
        find.text('Deseja remover todas as recomendações atuais do livro Tudo É Rio?'),
        findsOneWidget,
      );
      expect(find.textContaining('recomendações deste livro na sua lista.'), findsOneWidget);
    });

    testWidgets('Remover todas descarta em lote com chave e avisa quantas saíram', (tester) async {
      await montar(tester);
      for (var i = 0; i < 3; i++) {
        await descartarUm(tester);
      }

      await _tocarTexto(tester, 'Remover todas');

      final lote = pedidos.lastWhere((p) => p.url.path.endsWith('/descartar-lote'));
      expect(jsonDecode(lote.body), <String, Object?>{'livroId': 'tudo-e-rio'});
      expect(lote.headers['Idempotency-Key'], isNotEmpty);
      expect(find.text('2 recomendações de Tudo É Rio descartadas.'), findsOneWidget);
      expect(find.text('Nenhuma recomendação agora'), findsOneWidget);
    });

    testWidgets('falha do lote deixa a folha aberta com o banner; repetir usa a mesma chave', (
      tester,
    ) async {
      await montar(tester, loteFalhaPrimeiro: true);
      for (var i = 0; i < 3; i++) {
        await descartarUm(tester);
      }

      await _tocarTexto(tester, 'Remover todas');
      expect(
        find.text('Não foi possível remover as recomendações. Verifique sua conexão e tente de novo.'),
        findsOneWidget,
      );

      await _tocarTexto(tester, 'Remover todas');
      final chaves = pedidos
          .where((p) => p.url.path.endsWith('/descartar-lote'))
          .map((p) => p.headers['Idempotency-Key'])
          .toSet();
      expect(chaves, hasLength(1));
      expect(find.text('2 recomendações de Tudo É Rio descartadas.'), findsOneWidget);
    });

    testWidgets('Agora não suprime a pergunta daquele livro na sessão', (tester) async {
      await montar(tester);
      for (var i = 0; i < 3; i++) {
        await descartarUm(tester);
      }

      await _tocarTexto(tester, 'Agora não');
      await descartarUm(tester);

      expect(restantesPedidos(), 1);
      expect(find.text('Recomendação descartada.'), findsOneWidget);
    });

    testWidgets('sem restantes no terceiro descarte, é um descarte comum', (tester) async {
      await montar(tester, restantes: 0);
      for (var i = 0; i < 3; i++) {
        await descartarUm(tester);
      }

      expect(find.text('Remover todas'), findsNothing);
      expect(find.text('Recomendação descartada.'), findsOneWidget);
    });

    testWidgets('arrastar a folha não a fecha enquanto o lote corre, e o resultado vale', (
      tester,
    ) async {
      final liberar = Completer<void>();
      await montar(tester, loteLiberado: liberar.future);
      for (var i = 0; i < 3; i++) {
        await descartarUm(tester);
      }

      await _tocarTexto(tester, 'Remover todas');
      expect(find.text('Removendo…'), findsOneWidget);
      final folha = tester.getRect(find.byType(FolhaDescarteEmLote));
      await tester.dragFrom(Offset(folha.center.dx, folha.top - 20), const Offset(0, 600));
      await tester.pumpAndSettle();
      expect(find.text('Removendo…'), findsOneWidget);

      liberar.complete();
      await tester.pumpAndSettle();
      expect(find.byType(FolhaDescarteEmLote), findsNothing);
      expect(find.text('2 recomendações de Tudo É Rio descartadas.'), findsOneWidget);
      expect(find.text('Nenhuma recomendação agora'), findsOneWidget);
    });

    testWidgets('folha tirada por fora depois do pedido: o lote vale e não conta como recusa', (
      tester,
    ) async {
      final liberar = Completer<void>();
      await montar(tester, loteLiberado: liberar.future);
      for (var i = 0; i < 3; i++) {
        await descartarUm(tester);
      }

      await _tocarTexto(tester, 'Remover todas');
      // Uma navegação que remove a rota da folha não passa pelo `PopScope`.
      tester.state<NavigatorState>(find.byType(Navigator).first).pop();
      await tester.pumpAndSettle();
      expect(find.byType(FolhaDescarteEmLote), findsNothing);

      liberar.complete();
      await tester.pumpAndSettle();
      expect(find.text('2 recomendações de Tudo É Rio descartadas.'), findsOneWidget);
      expect(find.text('Nenhuma recomendação agora'), findsOneWidget);
    });

    testWidgets('outro descarte do mesmo livro durante a pergunta não abre segunda folha', (
      tester,
    ) async {
      final contagens = <Completer<http.Response>>[];
      await montar(
        tester,
        contagem: () {
          final contagem = Completer<http.Response>();
          contagens.add(contagem);
          return contagem.future;
        },
      );
      for (var i = 0; i < 4; i++) {
        await descartarUm(tester);
      }

      expect(contagens, hasLength(1));
      expect(find.text('Recomendação descartada.'), findsOneWidget);

      contagens.single.complete(json(<String, Object?>{'restantes': 1}, 200));
      await tester.pumpAndSettle();
      expect(find.byType(FolhaDescarteEmLote), findsOneWidget);
    });

    testWidgets('o total depois do lote segue a contagem do servidor, não só a página', (
      tester,
    ) async {
      final outroLivro = recomendacao('r9', 'Ana')
        ..['livro'] = <String, Object?>{
          'id': 'torto-arado',
          'tipo': 'OFICIAL',
          'titulo': 'Torto Arado',
          'autor': 'Itamar Vieira Junior',
          'capaUrl': null,
        };
      lista.add(outroLivro);
      await montar(tester, alemDaPagina: 10, removidasNoServidor: 7);
      expect(find.text('16 recomendações'), findsOneWidget);
      for (var i = 0; i < 3; i++) {
        await descartarUm(tester);
      }
      expect(find.text('13 recomendações'), findsOneWidget);

      await _tocarTexto(tester, 'Remover todas');

      expect(find.text('7 recomendações de Tudo É Rio descartadas.'), findsOneWidget);
      expect(find.text('6 recomendações'), findsOneWidget);
      expect(find.text('Torto Arado'), findsWidgets);
    });

    test('sair da conta zera a contagem e a recusa da pergunta', () async {
      final conta = SessionController(_StoreEmMemoria());
      acompanharContaDoDescarteEmLote(conta);
      await conta.load();
      await conta.entrar('token');
      registrarDescarte('l1');
      registrarDescarte('l1');
      recusarPergunta('l2');
      for (var i = 0; i < 3; i++) {
        expect(registrarDescarte('l2'), isFalse);
      }

      await conta.sair();

      expect(registrarDescarte('l1'), isFalse);
      expect(registrarDescarte('l1'), isFalse);
      expect(registrarDescarte('l1'), isTrue);
      registrarDescarte('l2');
      registrarDescarte('l2');
      expect(registrarDescarte('l2'), isTrue);
    });
  });
}
