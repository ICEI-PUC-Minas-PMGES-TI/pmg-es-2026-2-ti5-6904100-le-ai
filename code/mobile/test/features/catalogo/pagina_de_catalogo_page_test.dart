import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/catalogo/catalogo_controller.dart';
import 'package:le_ai_mobile/features/catalogo/pagina_de_catalogo_page.dart';

import '../descobrir/massa_da_busca.dart';
import '../livros/apoio.dart';

Map<String, Object?> _catalogo({
  String nome = 'Conceição Evaristo',
  String? biografia = 'Escritora mineira.',
  List<Map<String, String>> autores = const <Map<String, String>>[],
  Map<String, Object?>? livros,
}) => <String, Object?>{
  'id': 'x',
  'nome': nome,
  'biografia': biografia,
  'autores': autores,
  'livros':
      livros ??
      paginaJson(<Map<String, Object?>>[
        livroJson('olhos', "Olhos d'Água"),
        livroJson('becos', 'Becos da Memória'),
      ]),
};

Map<String, Object?> _volume(String id, String titulo, int? numero) => <String, Object?>{
  ...livroJson(
    id,
    titulo,
    autores: const <Map<String, String>>[
      <String, String>{'id': 'verissimo', 'nome': 'Erico Verissimo'},
    ],
  ),
  'numeroNaSerie': numero,
};

void main() {
  late List<Uri> pedidas;
  late List<String> eventos;

  Future<void> montar(
    WidgetTester tester,
    TipoDeCatalogo tipo,
    Future<http.Response> Function(http.Request request) responder,
  ) async {
    usarTelaDeCelular(tester);
    pedidas = <Uri>[];
    eventos = <String>[];
    await tester.pumpWidget(
      envolver(
        PaginaDeCatalogoPage(
          servico: acervoSimulado((request) {
            pedidas.add(request.url);
            return responder(request);
          }),
          tipo: tipo,
          id: 'x',
          aoVoltar: () => eventos.add('voltar'),
          aoAbrirLivro: (id) => eventos.add('livro:$id'),
          aoAbrirAutor: (id) => eventos.add('autor:$id'),
          aoBuscarNoDescobrir: () => eventos.add('descobrir'),
        ),
      ),
    );
    await tester.pump();
  }

  testWidgets('autor: tipo no header, nome, contagem, biografia com a fonte e os livros', (
    tester,
  ) async {
    await montar(tester, TipoDeCatalogo.autor, (request) async => json(_catalogo(), 200));

    expect(pedidas.single.path, '/autores/x');
    expect(pedidas.single.queryParameters['page'], '1');
    expect(find.text('Autor'), findsOneWidget);
    expect(find.text('Conceição Evaristo'), findsWidgets);
    expect(find.text('2 livros no acervo'), findsOneWidget);
    expect(find.text('Biografia'), findsOneWidget);
    expect(find.text('Escritora mineira.'), findsOneWidget);
    expect(find.text('Fonte: OpenLibrary'), findsOneWidget);

    await tocar(tester, find.text('Becos da Memória').last);
    expect(eventos, <String>['livro:becos']);
  });

  testWidgets('autor sem biografia: a seção não existe', (tester) async {
    await montar(
      tester,
      TipoDeCatalogo.autor,
      (request) async => json(_catalogo(biografia: null), 200),
    );

    expect(find.text('Biografia'), findsNothing);
    expect(find.text('Fonte: OpenLibrary'), findsNothing);
    expect(find.text('Livros'), findsOneWidget);
  });

  testWidgets('editora: contagem no singular, sem biografia mesmo que venha', (tester) async {
    await montar(
      tester,
      TipoDeCatalogo.editora,
      (request) async => json(
        _catalogo(
          nome: 'Pallas',
          livros: paginaJson(<Map<String, Object?>>[livroJson('olhos', 'Olhos')]),
        ),
        200,
      ),
    );

    expect(pedidas.single.path, '/editoras/x');
    expect(find.text('Editora'), findsOneWidget);
    expect(find.text('1 livro no acervo'), findsOneWidget);
    expect(find.text('Biografia'), findsNothing);
  });

  testWidgets('série: autoria com link, Livro N pela ordem e os sem número no fim', (tester) async {
    await montar(
      tester,
      TipoDeCatalogo.serie,
      (request) async => json(
        _catalogo(
          nome: 'O Tempo e o Vento',
          biografia: null,
          autores: const <Map<String, String>>[
            <String, String>{'id': 'verissimo', 'nome': 'Erico Verissimo'},
          ],
          livros: paginaJson(<Map<String, Object?>>[
            _volume('v1', 'O Continente', 1),
            _volume('v3', 'O Arquipélago', 3),
            _volume('extra', 'Ana Terra', null),
          ]),
        ),
        200,
      ),
    );

    expect(pedidas.single.path, '/series/x');
    expect(find.text('Livro 1'), findsOneWidget);
    expect(find.text('Livro 3'), findsOneWidget);
    expect(find.text('Livro 2'), findsNothing);
    expect(find.textContaining('Livro '), findsNWidgets(2));
    expect(find.text('Sem número na série'), findsOneWidget);
    expect(
      tester.getTopLeft(find.text('Sem número na série')).dy,
      lessThan(tester.getTopLeft(find.text('Ana Terra').last).dy),
    );
    expect(
      tester.getTopLeft(find.text('Livro 1')).dy,
      lessThan(tester.getTopLeft(find.text('Livro 3')).dy),
    );

    await tocar(tester, find.bySemanticsLabel('Erico Verissimo'));
    expect(eventos, <String>['autor:verissimo']);
  });

  testWidgets('sem livros: sem contagem nem autoria, com o convite ao Descobrir', (tester) async {
    await montar(
      tester,
      TipoDeCatalogo.serie,
      (request) async => json(
        _catalogo(
          nome: 'O Tempo e o Vento',
          autores: const <Map<String, String>>[
            <String, String>{'id': 'verissimo', 'nome': 'Erico Verissimo'},
          ],
          livros: paginaJson(<Map<String, Object?>>[]),
        ),
        200,
      ),
    );

    expect(find.text('Nenhum livro no acervo'), findsOneWidget);
    expect(
      find.text('Os livros de O Tempo e o Vento não estão no acervo no momento.'),
      findsOneWidget,
    );
    expect(find.textContaining('livros no acervo'), findsNothing);
    expect(find.textContaining('Erico Verissimo'), findsNothing);
    await tocar(tester, find.text('Buscar no Descobrir'));
    expect(eventos, <String>['descobrir']);
  });

  testWidgets('a página seguinte vem pela rolagem; a falha mantém os carregados e tenta de novo', (
    tester,
  ) async {
    var falhar = true;
    await montar(tester, TipoDeCatalogo.autor, (request) async {
      final page = int.parse(request.url.queryParameters['page']!);
      if (page == 2 && falhar) {
        falhar = false;
        return erro(500, 'ERRO_INTERNO', 'Falhou');
      }
      return json(
        _catalogo(
          livros: paginaJson(
            <Map<String, Object?>>[livroJson('l$page', 'Livro da página $page')],
            page: page,
            totalItens: 2,
            totalPaginas: 2,
          ),
        ),
        200,
      );
    });
    await tester.pump();
    await tester.pump();

    expect(
      find.text('Não foi possível carregar mais livros. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );
    expect(find.text('Livro da página 1'), findsWidgets);

    await tocar(tester, find.text('Tentar de novo'));
    await tester.pump();
    expect(find.text('Livro da página 2'), findsWidgets);
    expect(find.textContaining('Não foi possível carregar mais'), findsNothing);
  });

  testWidgets('falha da página inteira mostra o erro, e "Tentar de novo" carrega', (tester) async {
    var primeira = true;
    await montar(tester, TipoDeCatalogo.autor, (request) async {
      if (primeira) {
        primeira = false;
        return erro(500, 'ERRO_INTERNO', 'Falhou');
      }
      return json(_catalogo(), 200);
    });

    expect(find.text('Não foi possível abrir esta página'), findsOneWidget);
    await tocar(tester, find.text('Tentar de novo'));
    await tester.pump();
    expect(find.text('2 livros no acervo'), findsOneWidget);
  });

  testWidgets('404 diz que a página não foi encontrada e oferece voltar', (tester) async {
    await montar(
      tester,
      TipoDeCatalogo.editora,
      (request) async => erro(404, 'RECURSO_NAO_ENCONTRADO', 'Não encontramos esta editora.'),
    );

    expect(find.text('Não encontramos esta página'), findsOneWidget);
    await tocar(tester, find.text('Voltar'));
    expect(eventos, <String>['voltar']);
  });

  testWidgets('carregando com cold start avisa, sem erro', (tester) async {
    final resposta = Completer<http.Response>();
    await montar(tester, TipoDeCatalogo.autor, (request) => resposta.future);

    expect(find.text('O servidor está iniciando. Isso pode levar alguns segundos.'), findsNothing);
    await tester.pump(const Duration(seconds: 3));
    expect(
      find.text('O servidor está iniciando. Isso pode levar alguns segundos.'),
      findsOneWidget,
    );
    expect(find.text('Não foi possível abrir esta página'), findsNothing);

    resposta.complete(json(_catalogo(), 200));
    await tester.pump();
  });
}
