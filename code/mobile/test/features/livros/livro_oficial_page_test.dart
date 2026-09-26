import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/livros/livro_oficial_page.dart';

import 'apoio.dart';

const String _id = 'b0a1c2d3-0000-4000-8000-000000000001';

Map<String, Object?> _resenha(String id, String nome, String texto, {bool spoiler = false}) =>
    <String, Object?>{
      'id': id,
      'autorId': 'autor-$id',
      'autorNome': nome,
      'autorAvatarUrl': null,
      'texto': texto,
      'spoiler': spoiler,
      'criadoEm': '2026-08-03T12:00:00.000Z',
      'atualizadoEm': '2026-08-03T12:00:00.000Z',
    };

Map<String, Object?> _livro({
  String status = 'disponivel',
  String? texto = 'Bibiana e Belonísia crescem no interior da Bahia.',
  Object? resenhas = const <String, Object?>{
    'itens': <Object?>[],
    'limit': 10,
    'proximoCursor': null,
  },
  String? editora = 'Todavia',
  List<Map<String, String>> autores = const <Map<String, String>>[
    <String, String>{'id': 'a1', 'nome': 'Itamar Vieira Junior'},
  ],
}) => <String, Object?>{
  'id': _id,
  'titulo': 'Torto Arado',
  'autores': autores,
  'editora': editora,
  'anoPublicacao': 2019,
  'paginas': 264,
  'capa': <String, Object?>{'url': null, 'origem': 'placeholder'},
  'assuntos': <Object?>[],
  'isbn': '9788588808911',
  'sinopse': <String, Object?>{'status': status, 'texto': status == 'disponivel' ? texto : null},
  'resenhas': resenhas,
};

Map<String, Object?> _pagina(List<Map<String, Object?>> itens, {String? cursor}) =>
    <String, Object?>{'itens': itens, 'limit': 10, 'proximoCursor': cursor};

void main() {
  late List<Uri> pedidas;
  late int voltas;

  Future<void> montar(
    WidgetTester tester,
    Future<http.Response> Function(http.Request request) responder,
  ) async {
    usarTelaDeCelular(tester);
    pedidas = <Uri>[];
    voltas = 0;
    await tester.pumpWidget(
      envolver(
        LivroOficialPage(
          servico: acervoSimulado((request) {
            pedidas.add(request.url);
            return responder(request);
          }),
          livroId: _id,
          aoVoltar: () => voltas++,
        ),
      ),
    );
    await tester.pump();
  }

  int consultasDaPagina() => pedidas.where((uri) => uri.path == '/livros/$_id').length;

  testWidgets('pronta: hero, sinopse em texto, ficha e sem nota nem espaço reservado', (
    tester,
  ) async {
    await montar(tester, (request) async => json(_livro(), 200));

    // Sem capa, o placeholder textual repete o título, como o componente pede.
    expect(find.text('Torto Arado'), findsNWidgets(2));
    expect(find.text('Todavia · 2019 · 264 páginas'), findsOneWidget);
    expect(find.text('Bibiana e Belonísia crescem no interior da Bahia.'), findsOneWidget);
    expect(find.text('Ficha'), findsOneWidget);
    expect(find.text('9788588808911'), findsOneWidget);
    expect(find.text('Sua avaliação'), findsNothing);
    expect(find.textContaining('Registrar progresso'), findsNothing);
  });

  testWidgets('sinopse ausente aparece sem erro', (tester) async {
    await montar(tester, (request) async => json(_livro(status: 'ausente'), 200));

    expect(find.text('Este livro ainda não tem sinopse no acervo.'), findsOneWidget);
    expect(find.text('Tentar de novo'), findsNothing);
  });

  testWidgets('omite autor e editora que faltam, na ficha e no hero', (tester) async {
    await montar(
      tester,
      (request) async => json(_livro(editora: null, autores: const <Map<String, String>>[]), 200),
    );

    expect(find.text('Autor'), findsNothing);
    expect(find.text('Editora'), findsNothing);
    expect(find.text('ISBN'), findsOneWidget);
    expect(find.text('2019 · 264 páginas'), findsOneWidget);
  });

  testWidgets('polling atualiza só a sinopse e para quando ela chega', (tester) async {
    var consulta = 0;
    await montar(tester, (request) async {
      consulta++;
      if (consulta == 1) {
        return json(
          _livro(
            status: 'pendente',
            resenhas: _pagina(<Map<String, Object?>>[_resenha('r1', 'Marina Antunes', 'A terra.')]),
          ),
          200,
        );
      }
      // As consultas seguintes trazem outra primeira página: a tela não pode trocar a lista.
      return json(_livro(resenhas: _pagina(<Map<String, Object?>>[])), 200);
    });

    expect(find.text('A terra.'), findsOneWidget);
    expect(find.text('Bibiana e Belonísia crescem no interior da Bahia.'), findsNothing);

    await tester.pump(const Duration(seconds: 2));
    await tester.pump();

    expect(find.text('Bibiana e Belonísia crescem no interior da Bahia.'), findsOneWidget);
    expect(find.text('A terra.'), findsOneWidget);

    await tester.pump(const Duration(minutes: 3));
    expect(consultasDaPagina(), 2);
  });

  testWidgets('sinopse que não chega nas esperas vira texto neutro, sem polling infinito', (
    tester,
  ) async {
    await montar(tester, (request) async => json(_livro(status: 'pendente'), 200));

    await tester.pump(const Duration(minutes: 3));
    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(seconds: 40));
    }

    expect(consultasDaPagina(), 1 + 8);
    expect(find.text('A sinopse ainda está a caminho. Volte daqui a pouco.'), findsOneWidget);
  });

  testWidgets('sair da tela para o polling', (tester) async {
    await montar(tester, (request) async => json(_livro(status: 'pendente'), 200));

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(minutes: 3));

    expect(consultasDaPagina(), 1);
  });

  testWidgets('resenha com spoiler fica oculta até o toque', (tester) async {
    await montar(
      tester,
      (request) async => json(
        _livro(
          resenhas: _pagina(<Map<String, Object?>>[
            _resenha('r1', 'Rafael Bittencourt', 'O final revela tudo.', spoiler: true),
          ]),
        ),
        200,
      ),
    );

    expect(find.text('O final revela tudo.'), findsNothing);
    expect(find.text('Esta resenha contém spoiler'), findsOneWidget);

    await tocar(tester, find.text('Mostrar mesmo assim'));
    await tester.pumpAndSettle();

    expect(find.text('O final revela tudo.'), findsOneWidget);
    expect(find.text('Rafael Bittencourt'), findsOneWidget);
    expect(find.text('3 de agosto de 2026'), findsOneWidget);
  });

  testWidgets('sem resenhas diz que é para você, não que o livro não tem', (tester) async {
    await montar(tester, (request) async => json(_livro(), 200));

    expect(find.text('Nenhuma resenha ainda'), findsOneWidget);
    expect(find.text('Ninguém que você segue escreveu sobre este livro.'), findsOneWidget);
  });

  testWidgets('"Ver todas as resenhas" acrescenta a página seguinte pelo cursor', (tester) async {
    await montar(tester, (request) async {
      if (request.url.path.endsWith('/resenhas')) {
        expect(request.url.queryParameters['cursor'], 'cursor-1');
        return json(_pagina(<Map<String, Object?>>[_resenha('r2', 'Letícia', 'Segunda.')]), 200);
      }
      return json(
        _livro(
          resenhas: _pagina(<Map<String, Object?>>[
            _resenha('r1', 'Marina', 'Primeira.'),
          ], cursor: 'cursor-1'),
        ),
        200,
      );
    });

    await tocar(tester, find.text('Ver todas as resenhas'));
    await tester.pump();
    await tester.pump();

    expect(find.text('Primeira.'), findsOneWidget);
    expect(find.text('Segunda.'), findsOneWidget);
    expect(find.text('Ver todas as resenhas'), findsNothing);
  });

  testWidgets('resenhas indisponíveis: a página abre, e "Tentar de novo" pede as resenhas', (
    tester,
  ) async {
    await montar(tester, (request) async {
      if (request.url.path.endsWith('/resenhas')) {
        return json(_pagina(<Map<String, Object?>>[_resenha('r1', 'Marina', 'Voltou.')]), 200);
      }
      return json(_livro(resenhas: null), 200);
    });

    expect(find.text('Torto Arado'), findsNWidgets(2));
    expect(find.text('Não foi possível carregar as resenhas.'), findsOneWidget);

    await tocar(tester, find.text('Tentar de novo'));
    await tester.pump();
    await tester.pump();

    expect(find.text('Voltou.'), findsOneWidget);
    expect(find.text('Não foi possível carregar as resenhas.'), findsNothing);
  });

  testWidgets('falha da página inteira mostra o bloco de erro e tenta de novo', (tester) async {
    var falhar = true;
    await montar(tester, (request) async {
      if (falhar) {
        return http.Response('', 500);
      }
      return json(_livro(), 200);
    });

    expect(find.text('Não foi possível abrir este livro'), findsOneWidget);
    falhar = false;
    await tocar(tester, find.text('Tentar de novo'));
    await tester.pump();
    await tester.pump();

    expect(find.text('Não foi possível abrir este livro'), findsNothing);
    expect(find.text('Ficha'), findsOneWidget);
  });

  testWidgets('livro que não existe ou é pessoal responde 404 e oferece voltar', (tester) async {
    await montar(
      tester,
      (request) async => erro(404, 'RECURSO_NAO_ENCONTRADO', 'Não encontramos este livro.'),
    );

    expect(find.text('Não encontramos este livro'), findsOneWidget);
    await tocar(tester, find.text('Voltar'));
    expect(voltas, 1);
  });

  testWidgets('cold start é carregamento com aviso, não erro', (tester) async {
    final demorada = Completer<http.Response>();
    await montar(tester, (request) => demorada.future);

    expect(find.text('Ficha'), findsNothing);
    await tester.pump(const Duration(seconds: 3));
    expect(
      find.text('O servidor está iniciando. Isso pode levar alguns segundos.'),
      findsOneWidget,
    );

    demorada.complete(json(_livro(), 200));
    await tester.pump();
    await tester.pump();
    expect(find.text('Ficha'), findsOneWidget);
  });
}
