import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/descobrir/busca_de_livros_controller.dart';
import 'package:le_ai_mobile/features/livros/livro_oficial.dart';

import '../livros/apoio.dart';
import 'massa_da_busca.dart';

/// `testWidgets` pelo relógio falso: o debounce e o limite do cold start avançam com `pump`.
void main() {
  const romance = AssuntoResumo(id: 'romance', nome: 'Romance');

  late List<Uri> pedidas;

  BuscaDeLivrosController controlador(
    Future<http.Response> Function(http.Request request) responder,
  ) {
    pedidas = <Uri>[];
    final busca = BuscaDeLivrosController(
      acervoSimulado((request) {
        if (request.url.path == '/assuntos') {
          return Future<http.Response>.value(json(assuntosJson, 200));
        }
        pedidas.add(request.url);
        return responder(request);
      }),
    );
    addTearDown(busca.dispose);
    return busca;
  }

  Future<http.Response> umResultado(http.Request request) async =>
      json(paginaJson(<Map<String, Object?>>[livroJson('l1', 'Ponciá Vicêncio')]), 200);

  testWidgets('espera 350 ms sem digitar antes de buscar', (tester) async {
    final busca = controlador(umResultado);

    busca.alterarConsulta('co');
    busca.alterarConsulta('con');
    await tester.pump(const Duration(milliseconds: 300));
    expect(pedidas, isEmpty);

    await tester.pump(const Duration(milliseconds: 60));
    await tester.pump();
    expect(pedidas.single.queryParameters['q'], 'con');
    expect(busca.estado, EstadoDaBusca.resultados);
  });

  testWidgets('com menos de 2 caracteres volta à aterrissagem sem buscar', (tester) async {
    final busca = controlador(umResultado);

    busca.alterarConsulta('c');
    await tester.pump(const Duration(milliseconds: 400));

    expect(pedidas, isEmpty);
    expect(busca.estado, EstadoDaBusca.aterrissagem);
  });

  testWidgets('apara o texto e não repete a busca por um espaço no fim', (tester) async {
    final busca = controlador(umResultado);

    busca.alterarConsulta('  conceicao ');
    await tester.pump(const Duration(milliseconds: 400));
    busca.alterarConsulta('  conceicao  ');
    await tester.pump(const Duration(milliseconds: 400));

    expect(pedidas.map((uri) => uri.queryParameters['q']), <String>['conceicao']);
  });

  testWidgets('assunto busca na hora, sozinho ou com o texto, e sai ao tocar de novo', (
    tester,
  ) async {
    final busca = controlador(umResultado);

    busca.alternarAssunto(romance);
    await tester.pump();
    expect(pedidas.last.queryParameters, containsPair('assunto', 'romance'));
    expect(pedidas.last.queryParameters.containsKey('q'), isFalse);

    busca.alterarConsulta('vidas');
    await tester.pump(const Duration(milliseconds: 400));
    expect(pedidas.last.queryParameters, <String, String>{
      'q': 'vidas',
      'assunto': 'romance',
      'page': '1',
      'limit': '20',
    });

    busca.alternarAssunto(romance);
    await tester.pump();
    expect(busca.assunto, isNull);
    expect(pedidas.last.queryParameters.containsKey('assunto'), isFalse);
  });

  testWidgets('resposta de busca antiga não sobrescreve a atual', (tester) async {
    final lenta = Completer<http.Response>();
    final busca = controlador((request) {
      if (request.url.queryParameters['q'] == 'antiga') {
        return lenta.future;
      }
      return Future<http.Response>.value(
        json(paginaJson(<Map<String, Object?>>[livroJson('nova', 'Resultado novo')]), 200),
      );
    });

    busca.alterarConsulta('antiga');
    await tester.pump(const Duration(milliseconds: 400));
    busca.alterarConsulta('atual');
    await tester.pump(const Duration(milliseconds: 400));
    expect(busca.livros.single.id, 'nova');

    lenta.complete(
      json(paginaJson(<Map<String, Object?>>[livroJson('velha', 'Resultado velho')]), 200),
    );
    await tester.pump();
    expect(busca.livros.single.id, 'nova');
  });

  testWidgets('sem resultado é vazio, falha é erro, e tentar de novo repete a busca', (
    tester,
  ) async {
    var falhar = true;
    final busca = controlador((request) async {
      if (falhar) {
        return http.Response('', 500);
      }
      return json(paginaJson(<Map<String, Object?>>[]), 200);
    });

    busca.alterarConsulta('guimaraes rossa');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump();
    expect(busca.estado, EstadoDaBusca.erro);

    falhar = false;
    busca.tentarDeNovo();
    await tester.pump();
    expect(busca.estado, EstadoDaBusca.vazio);
  });

  testWidgets('acumula as páginas sem repetir id e para no fim', (tester) async {
    final busca = controlador((request) async {
      final page = int.parse(request.url.queryParameters['page']!);
      final itens = page == 1
          ? <Map<String, Object?>>[livroJson('a', 'Um'), livroJson('b', 'Dois')]
          : <Map<String, Object?>>[livroJson('b', 'Dois'), livroJson('c', 'Três')];
      return json(paginaJson(itens, page: page, totalItens: 3, totalPaginas: 2), 200);
    });

    busca.alterarConsulta('livro');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump();
    expect(busca.temMais, isTrue);

    await busca.carregarMais();
    expect(busca.livros.map((livro) => livro.id), <String>['a', 'b', 'c']);
    expect(busca.temMais, isFalse);

    await busca.carregarMais();
    expect(pedidas, hasLength(2));
  });

  testWidgets('a falha da página seguinte não apaga as anteriores', (tester) async {
    final busca = controlador((request) async {
      if (request.url.queryParameters['page'] == '2') {
        return http.Response('', 500);
      }
      return json(
        paginaJson(<Map<String, Object?>>[livroJson('a', 'Um')], totalItens: 2, totalPaginas: 2),
        200,
      );
    });

    busca.alterarConsulta('livro');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump();
    await busca.carregarMais();

    expect(busca.falhouMais, isTrue);
    expect(busca.estado, EstadoDaBusca.resultados);
    expect(busca.livros.single.id, 'a');
  });

  testWidgets('depois de 3 s buscando avisa o cold start, e ele some com a resposta', (
    tester,
  ) async {
    final demorada = Completer<http.Response>();
    final busca = controlador((request) => demorada.future);

    busca.alterarConsulta('livro');
    await tester.pump(const Duration(milliseconds: 400));
    expect(busca.estado, EstadoDaBusca.buscando);
    expect(busca.coldStart, isFalse);

    await tester.pump(const Duration(seconds: 3));
    expect(busca.coldStart, isTrue);

    demorada.complete(json(paginaJson(<Map<String, Object?>>[livroJson('a', 'Um')]), 200));
    await tester.pump();
    expect(busca.coldStart, isFalse);
    expect(busca.estado, EstadoDaBusca.resultados);
  });

  testWidgets('limpar o campo com assunto ativo mantém a busca pelo assunto', (tester) async {
    final busca = controlador(umResultado);

    busca.alternarAssunto(romance);
    busca.alterarConsulta('vidas');
    await tester.pump(const Duration(milliseconds: 400));
    busca.limparConsulta();
    await tester.pump();

    expect(pedidas.last.queryParameters.containsKey('q'), isFalse);
    expect(pedidas.last.queryParameters['assunto'], 'romance');
  });

  testWidgets('carrega os assuntos uma vez só', (tester) async {
    final busca = controlador(umResultado);

    await busca.carregarAssuntos();
    await busca.carregarAssuntos();

    expect(busca.assuntos.map((assunto) => assunto.nome), <String>['Romance', 'Conto', 'Terror']);
  });

  testWidgets('a página seguinte continua a busca feita, não o texto que ainda espera o debounce', (
    tester,
  ) async {
    final busca = controlador(
      (request) async => json(
        paginaJson(
          <Map<String, Object?>>[livroJson('l1', 'Ponciá Vicêncio')],
          totalItens: 2,
          totalPaginas: 2,
        ),
        200,
      ),
    );

    busca.alterarConsulta('ab');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump();
    busca.alterarConsulta('abc');
    await busca.carregarMais();

    expect(pedidas.last.queryParameters['q'], 'ab');
    expect(pedidas.last.queryParameters['page'], '2');

    // O debounce de "abc" ainda sai, como busca nova.
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump();
    expect(pedidas.last.queryParameters['q'], 'abc');
  });
}
