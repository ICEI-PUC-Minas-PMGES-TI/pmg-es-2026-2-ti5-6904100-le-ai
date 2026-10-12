import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/recomendacoes/recomendacoes_recebidas_page.dart';
import 'package:le_ai_mobile/features/recomendacoes/secao_recomendacoes.dart';

import '../feed/apoio.dart';
import '../livros/apoio.dart' show usarTelaDeCelular;

Map<String, Object?> _recomendacao(
  String id,
  String titulo,
  String remetente, {
  String? mensagem,
}) => <String, Object?>{
  'id': id,
  'remetente': autorJson(id: 'u-$id', username: 'leitor$id', nome: remetente),
  'livro': <String, Object?>{
    'id': 'livro-$id',
    'tipo': 'OFICIAL',
    'titulo': titulo,
    'autor': 'Clarice Lispector',
    'capaUrl': null,
  },
  'mensagem': mensagem,
  'criadoEm': DateTime.now().subtract(const Duration(days: 2)).toUtc().toIso8601String(),
  'expiraEm': DateTime.now().add(const Duration(days: 88)).toUtc().toIso8601String(),
};

Map<String, Object?> _pagina(List<Map<String, Object?>> itens) => <String, Object?>{
  'itens': itens,
  'pagina': 0,
  'tamanho': 20,
  'totalItens': itens.length,
  'totalPaginas': itens.isEmpty ? 0 : 1,
  'ultima': true,
};

final List<Map<String, Object?>> _duas = <Map<String, Object?>>[
  _recomendacao('r1', 'A Hora da Estrela', 'Júlia Figueiredo', mensagem: 'Curtinho e devastador.'),
  _recomendacao('r2', 'Quarto de Despejo', 'Caio Rezende'),
];

void main() {
  group('seção do Descobrir', () {
    final perfis = <String>[];

    Future<List<String>> montar(
      WidgetTester tester,
      Future<http.Response> Function(http.Request) handler,
    ) async {
      usarTelaDeCelular(tester);
      final abertos = <String>[];
      await tester.pumpWidget(
        envolver(
          SingleChildScrollView(
            child: SecaoRecomendacoes(
              social: socialSimulado(handler),
              aoAbrirLivro: (id) async => abertos.add(id),
              aoVerTodas: () async {},
              aoAbrirPerfil: perfis.add,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      return abertos;
    }

    testWidgets('sem recomendações diz onde elas aparecem e não oferece Ver todas', (tester) async {
      await montar(tester, (_) async => json(_pagina(const []), 200));

      expect(
        find.text('Livros que outros leitores recomendarem para você aparecem aqui.'),
        findsOneWidget,
      );
      expect(find.text('Ver todas'), findsNothing);
    });

    testWidgets('pede só as três mais recentes e o item leva ao livro', (tester) async {
      Uri? pedido;
      final abertos = await montar(tester, (request) async {
        pedido = request.url;
        return json(_pagina(_duas), 200);
      });

      expect(pedido?.queryParameters['size'], '3');
      expect(find.text('Ver todas'), findsOneWidget);
      expect(find.text('Curtinho e devastador.'), findsOneWidget);

      await tester.tap(find.text('Quarto de Despejo').first);
      await tester.pumpAndSettle();
      expect(abertos, <String>['livro-r2']);
    });

    testWidgets('falha só da seção oferece tentar de novo', (tester) async {
      var tentativas = 0;
      await montar(
        tester,
        (_) async =>
            tentativas++ == 0 ? erro(500, 'ERRO_INTERNO', 'Falhou.') : json(_pagina(_duas), 200),
      );

      expect(find.textContaining('Não foi possível carregar suas recomendações.'), findsOneWidget);
      await tester.tap(find.text('Tentar de novo'));
      await tester.pumpAndSettle();
      expect(find.text('A Hora da Estrela'), findsWidgets);
    });
  });

  group('seção do Descobrir, menu da recomendação', () {
    Future<List<http.Request>> montar(WidgetTester tester, List<String> perfis) async {
      usarTelaDeCelular(tester);
      final descartes = <http.Request>[];
      var descartado = false;
      await tester.pumpWidget(
        envolver(
          SingleChildScrollView(
            child: SecaoRecomendacoes(
              social: socialSimulado((request) async {
                if (request.method == 'DELETE') {
                  descartes.add(request);
                  descartado = true;
                  return http.Response('', 204);
                }
                return json(_pagina(descartado ? <Map<String, Object?>>[_duas.first] : _duas), 200);
              }),
              aoAbrirLivro: (_) async {},
              aoVerTodas: () async {},
              aoAbrirPerfil: perfis.add,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      return descartes;
    }

    testWidgets('descartar tira a recomendação da seção sem avisar o remetente', (tester) async {
      final descartes = await montar(tester, <String>[]);

      await tester.tap(
        find.bySemanticsLabel('Mais ações para Quarto de Despejo, recomendado por Caio Rezende'),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Descartar recomendação'));
      await tester.pumpAndSettle();

      expect(descartes.single.url.path, '/recomendacoes/r2');
      expect(find.text('Quarto de Despejo'), findsNothing);
      expect(find.text('A Hora da Estrela'), findsWidgets);
      expect(find.text('Recomendação descartada.'), findsOneWidget);
    });

    testWidgets('o menu leva ao perfil de quem recomendou', (tester) async {
      final perfis = <String>[];
      await montar(tester, perfis);

      await tester.tap(
        find.bySemanticsLabel('Mais ações para A Hora da Estrela, recomendado por Júlia Figueiredo'),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Ver perfil de Júlia Figueiredo'));
      await tester.pumpAndSettle();

      expect(perfis, <String>['leitorr1']);
    });
  });

  group('lista completa', () {
    late List<http.Request> descartes;

    Future<void> montar(
      WidgetTester tester, {
      List<Map<String, Object?>>? itens,
      List<Future<http.Response> Function()> respostasDoDescarte = const [],
    }) async {
      usarTelaDeCelular(tester);
      descartes = <http.Request>[];
      var descarte = 0;
      await tester.pumpWidget(
        envolver(
          Scaffold(
            body: RecomendacoesRecebidasPage(
              social: socialSimulado((request) async {
                if (request.method == 'DELETE') {
                  descartes.add(request);
                  return respostasDoDescarte[descarte++]();
                }
                return json(_pagina(itens ?? _duas), 200);
              }),
              aoVoltar: () {},
              aoAbrirLivro: (_) async {},
              aoAbrirPerfil: (_) {},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    Future<void> descartar(WidgetTester tester, String titulo, String nome) async {
      await tester.tap(find.bySemanticsLabel('Mais ações para $titulo, recomendado por $nome'));
      await tester.pumpAndSettle();
      expect(find.text('Quem recomendou não fica sabendo.'), findsOneWidget);
      await tester.tap(find.text('Descartar recomendação'));
      await tester.pumpAndSettle();
    }

    testWidgets('descartar tira o item, desconta a contagem e confirma sem desfazer', (
      tester,
    ) async {
      await montar(
        tester,
        respostasDoDescarte: <Future<http.Response> Function()>[() async => http.Response('', 204)],
      );
      expect(find.text('2 recomendações'), findsOneWidget);

      await descartar(tester, 'Quarto de Despejo', 'Caio Rezende');

      expect(descartes.single.url.path, '/recomendacoes/r2');
      expect(find.text('Quarto de Despejo'), findsNothing);
      expect(find.text('1 recomendação'), findsOneWidget);
      expect(find.text('Recomendação descartada.'), findsOneWidget);
      expect(find.text('Desfazer'), findsNothing);
    });

    testWidgets('falha ao descartar mantém o item; tentar de novo reusa a mesma chave', (
      tester,
    ) async {
      await montar(
        tester,
        respostasDoDescarte: <Future<http.Response> Function()>[
          () async => erro(503, 'SERVICO_INDISPONIVEL', 'Indisponível.'),
          () async => erro(503, 'SERVICO_INDISPONIVEL', 'Indisponível.'),
          () async => erro(503, 'SERVICO_INDISPONIVEL', 'Indisponível.'),
          () async => http.Response('', 204),
        ],
      );

      await descartar(tester, 'Quarto de Despejo', 'Caio Rezende');

      expect(find.text('Quarto de Despejo'), findsWidgets);
      expect(find.text('2 recomendações'), findsOneWidget);
      expect(
        find.text(
          'Não foi possível descartar a recomendação. Verifique sua conexão e tente de novo.',
        ),
        findsOneWidget,
      );

      await tester.tap(find.text('Tentar de novo'));
      await tester.pumpAndSettle();

      expect(find.text('Quarto de Despejo'), findsNothing);
      final chaves = descartes.map((r) => r.headers['Idempotency-Key']).toSet();
      expect(chaves, hasLength(1));
    });

    testWidgets('sem recomendações mostra o vazio sem a regra nem a contagem', (tester) async {
      await montar(tester, itens: const []);

      expect(find.text('Nenhuma recomendação agora'), findsOneWidget);
      expect(find.text('Voltar para Descobrir'), findsOneWidget);
      expect(find.textContaining('90 dias'), findsNothing);
    });
  });
}
