import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/avaliacao/adicionar_frase.dart';
import 'package:le_ai_mobile/features/avaliacao/frases.dart';
import 'package:le_ai_mobile/features/avaliacao/frases_do_livro_page.dart';
import 'package:le_ai_mobile/features/avaliacao/leitura_service.dart';
import 'package:le_ai_mobile/features/avaliacao/secao_frases.dart';

import '../livros/apoio.dart';

const String _livroId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const LivroDaFrase _livro = LivroDaFrase(
  id: _livroId,
  titulo: 'Torto Arado',
  autor: 'Itamar Vieira Junior',
  paginas: 264,
);

Map<String, Object?> _frase(String id, int pagina, {bool minha = false}) => <String, Object?>{
  'id': id,
  'livroId': _livroId,
  'texto': 'Trecho $id.',
  'pagina': pagina,
  'criadoEm': '2026-10-09T12:00:00.000Z',
  'autor': <String, Object?>{
    'id': minha ? 'eu' : 'u2',
    'username': minha ? 'eu' : 'marina.antunes',
    'nome': 'Marina',
    'avatarUrl': null,
  },
  'minha': minha,
};

Map<String, Object?> _pagina(List<Map<String, Object?>> itens, int total, {int minhas = 0}) =>
    <String, Object?>{
      'itens': itens,
      'paginacao': <String, Object?>{'page': 1, 'limite': 20, 'totalItens': total, 'totalPaginas': 1},
      'minhasFrases': minhas,
      'limitePorLivro': 10,
    };

void main() {
  group('textos e validação', () {
    test('contagem, referência e cota', () {
      expect(rotuloDeFrases(1), '1 frase');
      expect(rotuloDeFrases(14), '14 frases');
      expect(linhaDaCota(0, 10), 'Você ainda não guardou frases deste livro. Cabem até 10.');
      expect(
        linhaDaCota(9, 10, noFormulario: true),
        'Você guardou 9 de 10 frases deste livro. Esta é a última que cabe.',
      );
    });

    test('trecho e página', () {
      expect(erroDoTrecho('  '), 'Escreva o trecho que você quer guardar.');
      expect(erroDoTrecho('a' * 534), 'Use até 500 caracteres. Tire 34 para salvar.');
      expect(erroDoTrecho('📚' * 500), isNull);
      expect(erroDaPagina('', 264), 'Informe a página em que o trecho está.');
      expect(erroDaPagina('0', 264), 'Informe uma página a partir de 1.');
      expect(erroDaPagina('300', 264), 'O livro tem 264 páginas. Informe uma página até 264.');
      expect(erroDaPagina('74', 264), isNull);
    });
  });

  group('SecaoFrases', () {
    testWidgets('mostra a contagem, as três mais recentes e as ações, sem excluir', (tester) async {
      String? consulta;
      final leitura = leituraSimulada(semFrases: false, (pedido) async {
        consulta = pedido.url.query;
        return json(
          _pagina(<Map<String, Object?>>[_frase('a', 57), _frase('b', 112, minha: true), _frase('c', 203)], 14, minhas: 2),
          200,
        );
      });
      var abriu = false;
      await tester.pumpWidget(
        envolver(
          SingleChildScrollView(
            child: SecaoFrases(leitura: leitura, livro: _livro, aoVerTodas: () => abriu = true),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(consulta, 'page=1&limite=3');
      expect(find.text('14 frases'), findsOneWidget);
      expect(find.text('Página 57 · @marina.antunes'), findsOneWidget);
      expect(find.text('Página 112 · você'), findsOneWidget);
      expect(find.byTooltip('Excluir frase da página 112'), findsNothing);
      await tocar(tester, find.text('Ver todas as frases'));
      expect(abriu, isTrue);
      expect(find.text('Adicionar frase'), findsOneWidget);
    });

    testWidgets('vazio convida a adicionar a primeira', (tester) async {
      final leitura = leituraSimulada(semFrases: false, (pedido) async => json(_pagina(<Map<String, Object?>>[], 0), 200));
      await tester.pumpWidget(envolver(SecaoFrases(leitura: leitura, livro: _livro)));
      await tester.pumpAndSettle();

      expect(find.text('Nenhuma frase ainda'), findsOneWidget);
      expect(find.text('Adicionar a primeira'), findsOneWidget);
    });

    testWidgets('falha (503) mostra o erro e Tentar de novo recarrega', (tester) async {
      var chamadas = 0;
      final leitura = leituraSimulada(semFrases: false, (pedido) async {
        chamadas += 1;
        // O cliente repete o 503 duas vezes antes de desistir: três falhas viram o erro na tela.
        return chamadas <= 3
            ? erro(503, 'SERVICO_INDISPONIVEL', 'Fora.')
            : json(_pagina(<Map<String, Object?>>[_frase('a', 57)], 1), 200);
      });
      await tester.pumpWidget(envolver(SecaoFrases(leitura: leitura, livro: _livro)));
      await tester.pumpAndSettle();

      expect(find.text(TextosDasFrases.erroCarga), findsOneWidget);
      await tocar(tester, find.text('Tentar de novo'));
      await tester.pumpAndSettle();
      expect(find.text('Página 57 · @marina.antunes'), findsOneWidget);
    });
  });

  group('FolhaAdicionarFrase', () {
    Future<void> abrir(WidgetTester tester, LeituraService leitura, {int minhas = 2}) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          Builder(
            builder: (context) => TextButton(
              onPressed: () => abrirAdicionarFrase(context, leitura: leitura, livro: _livro, minhasFrases: minhas),
              child: const Text('abrir'),
            ),
          ),
        ),
      );
      await tester.tap(find.text('abrir'));
      await tester.pumpAndSettle();
    }

    testWidgets('valida ao salvar e conta code points sem cortar o texto', (tester) async {
      final pedidos = <http.Request>[];
      final leitura = leituraSimulada((pedido) async {
        pedidos.add(pedido);
        return json(_frase('n', 1, minha: true), 201);
      });
      await abrir(tester, leitura, minhas: 9);

      expect(find.text('Você guardou 9 de 10 frases deste livro. Esta é a última que cabe.'), findsOneWidget);
      await tester.tap(find.text('Salvar frase'));
      await tester.pumpAndSettle();
      expect(find.text('Escreva o trecho que você quer guardar.'), findsOneWidget);
      expect(pedidos, isEmpty);

      await tester.enterText(find.byKey(const ValueKey<String>('campo-trecho')), 'a' * 534);
      await tester.enterText(find.byKey(const ValueKey<String>('campo-pagina')), '300');
      await tester.pumpAndSettle();
      expect(find.text('534/500'), findsOneWidget);
      await tester.tap(find.text('Salvar frase'));
      await tester.pumpAndSettle();
      expect(find.text('Use até 500 caracteres. Tire 34 para salvar.'), findsOneWidget);
      expect(find.text('O livro tem 264 páginas. Informe uma página até 264.'), findsOneWidget);
      expect(pedidos, isEmpty);
    });

    testWidgets('salva com a página; a falha mantém o texto e repete a chave', (tester) async {
      final pedidos = <http.Request>[];
      final leitura = leituraSimulada((pedido) async {
        pedidos.add(pedido);
        // A primeira tentativa e as duas retentativas do cliente falham.
        return pedidos.length <= 3
            ? erro(503, 'SERVICO_INDISPONIVEL', 'Fora.')
            : json(_frase('n', 74, minha: true), 201);
      });
      await abrir(tester, leitura);

      await tester.enterText(find.byKey(const ValueKey<String>('campo-trecho')), 'A gente aprende a ler o céu.');
      await tester.enterText(find.byKey(const ValueKey<String>('campo-pagina')), '74');
      await tester.tap(find.text('Salvar frase'));
      await tester.pumpAndSettle();
      expect(find.text(TextosDasFrases.erroEnvio), findsOneWidget);
      await tester.tap(find.text('Salvar frase'));
      await tester.pumpAndSettle();

      expect(pedidos, hasLength(4));
      expect(jsonDecode(pedidos.first.body), <String, Object?>{'texto': 'A gente aprende a ler o céu.', 'pagina': 74});
      // O novo toque em salvar reusa a chave da intenção: o servidor não cria duas frases.
      expect(pedidos.map((p) => p.headers['Idempotency-Key']).toSet(), hasLength(1));
      expect(find.text('Salvar frase'), findsNothing);
    });

    testWidgets('cota estourada no servidor trava os campos e troca as ações', (tester) async {
      final leitura = leituraSimulada((pedido) async => erro(422, 'LIMITE_DE_FRASES', 'Limite.'));
      await abrir(tester, leitura);

      await tester.enterText(find.byKey(const ValueKey<String>('campo-trecho')), 'Mais um.');
      await tester.enterText(find.byKey(const ValueKey<String>('campo-pagina')), '10');
      await tester.tap(find.text('Salvar frase'));
      await tester.pumpAndSettle();

      expect(find.text(TextosDasFrases.limiteNoEnvio), findsOneWidget);
      expect(find.text('Ver minhas frases'), findsOneWidget);
      expect(find.text(TextosDasFrases.naoSeraGuardado), findsOneWidget);
    });

    testWidgets('cancelar com trecho escrito pede o descarte', (tester) async {
      final leitura = leituraSimulada((pedido) async => json(_frase('n', 1), 201));
      await abrir(tester, leitura);

      await tester.enterText(find.byKey(const ValueKey<String>('campo-trecho')), 'Escrevi algo.');
      await tester.tap(find.text('Cancelar'));
      await tester.pumpAndSettle();
      expect(find.text('Descartar esta frase?'), findsOneWidget);
      await tester.tap(find.text('Continuar escrevendo'));
      await tester.pumpAndSettle();
      expect(find.text('Escrevi algo.'), findsOneWidget);
    });
  });

  group('FrasesDoLivroPage', () {
    Future<List<http.Request>> abrir(
      WidgetTester tester,
      Map<String, Object?> pagina, {
      Future<http.Response> Function(http.Request)? excluir,
    }) async {
      usarTelaDeCelular(tester);
      final pedidos = <http.Request>[];
      final leitura = leituraSimulada(semFrases: false, (pedido) async {
        pedidos.add(pedido);
        if (pedido.method == 'DELETE') {
          return excluir?.call(pedido) ?? http.Response('', 204);
        }
        return json(pagina, 200);
      });
      final acervo = acervoSimulado(
        (pedido) async => json(<String, Object?>{
          'id': _livroId,
          'tipo': 'pessoal',
          'donoId': 'eu',
          'titulo': 'Diário de leituras',
          'autor': 'Eu Mesma',
          'paginas': 120,
          'sinopse': null,
          'capaUrl': null,
          'modoConsulta': false,
          'notaDoDono': null,
          'resenhaDoDono': null,
          'dono': null,
        }, 200),
      );
      await tester.pumpWidget(
        envolver(
          FrasesDoLivroPage(
            leitura: leitura,
            acervo: acervo,
            livroId: _livroId,
            pessoal: true,
            aoVoltar: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      return pedidos;
    }

    testWidgets('lista com a cota; só a própria tem excluir', (tester) async {
      await abrir(tester, _pagina(<Map<String, Object?>>[_frase('a', 57), _frase('b', 112, minha: true)], 2, minhas: 1));

      expect(find.text('Você guardou 1 de 10 frases deste livro.'), findsOneWidget);
      expect(find.text('Adicionar frase'), findsOneWidget);
      expect(find.byTooltip('Excluir frase da página 112'), findsOneWidget);
      expect(find.byTooltip('Excluir frase da página 57'), findsNothing);
    });

    testWidgets('no limite, a explicação ocupa o lugar do botão', (tester) async {
      await abrir(tester, _pagina(<Map<String, Object?>>[_frase('b', 112, minha: true)], 22, minhas: 10));

      expect(find.text(TextosDasFrases.limite), findsOneWidget);
      expect(find.text('Adicionar frase'), findsNothing);
    });

    testWidgets('excluir confirma mostrando a frase e tira da lista', (tester) async {
      final pedidos = await abrir(
        tester,
        _pagina(<Map<String, Object?>>[_frase('a', 57), _frase('b', 112, minha: true)], 14, minhas: 2),
      );

      await tester.tap(find.byTooltip('Excluir frase da página 112'));
      await tester.pumpAndSettle();
      expect(find.text('Excluir esta frase?'), findsOneWidget);
      expect(find.text('Trecho b.'), findsNWidgets(2));
      await tester.tap(find.byKey(const ValueKey<String>('confirmar-exclusao')));
      await tester.pumpAndSettle();

      expect(pedidos.last.method, 'DELETE');
      expect(pedidos.last.url.path, '/frases/b');
      expect(find.text('Trecho b.'), findsNothing);
      expect(find.text('Você guardou 1 de 10 frases deste livro.'), findsOneWidget);
    });

    testWidgets('falha ao excluir mantém a folha aberta com o aviso', (tester) async {
      await abrir(
        tester,
        _pagina(<Map<String, Object?>>[_frase('b', 112, minha: true)], 1, minhas: 1),
        excluir: (_) async => erro(503, 'SERVICO_INDISPONIVEL', 'Fora.'),
      );

      await tester.tap(find.byTooltip('Excluir frase da página 112'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey<String>('confirmar-exclusao')));
      await tester.pumpAndSettle();

      expect(find.text(TextosDasFrases.excluirFalha), findsOneWidget);
      expect(find.text('Excluir esta frase?'), findsOneWidget);
    });
  });
}
