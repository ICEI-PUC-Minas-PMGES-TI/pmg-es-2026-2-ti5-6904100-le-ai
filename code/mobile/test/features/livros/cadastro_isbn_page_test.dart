import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/livros/acervo_service.dart';
import 'package:le_ai_mobile/features/livros/cadastro_isbn_controller.dart';
import 'package:le_ai_mobile/features/livros/cadastro_isbn_page.dart';

import 'apoio.dart';

const _importacao = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const _livro = 'cccccccc-3333-4333-8333-cccccccccccc';

const _resumo = <String, Object?>{
  'id': _livro,
  'titulo': 'Memórias Póstumas de Brás Cubas',
  'autores': 'Machado de Assis',
  'editora': 'Penguin-Companhia',
  'anoPublicacao': 2014,
  'paginas': 288,
  'capaUrl': null,
};

Map<String, Object?> _estado(String status, {String? livroId}) => <String, Object?>{
  'importacaoId': _importacao,
  'isbn': '9788535914849',
  'status': status,
  'livroId': livroId,
  'livro': status == 'concluida' ? _resumo : null,
  'permiteCadastroPessoal': status == 'nao_encontrado',
  'criadoEm': '2026-09-22T12:00:00.000Z',
  'atualizadoEm': '2026-09-22T12:00:00.000Z',
};

CadastroIsbnController Function(AcervoService) _rapido() =>
    (servico) => CadastroIsbnController(
      servico: servico,
      intervaloDeConsulta: const Duration(milliseconds: 100),
      aposEsteTempoEstaLento: const Duration(seconds: 8),
      aposEsteTempoEColdStart: const Duration(seconds: 3),
      limiteDoAcompanhamento: const Duration(seconds: 20),
    );

void main() {
  late List<http.Request> pedidos;

  setUp(() => pedidos = <http.Request>[]);

  Future<void> montar(
    WidgetTester tester,
    Future<http.Response> Function(http.Request) handler, {
    void Function(String)? aoAbrirLivro,
    Future<bool?> Function(String)? aoNaoEncontrar,
    VoidCallback? aoCadastrarPessoal,
  }) async {
    usarTelaDeCelular(tester);
    await tester.pumpWidget(
      envolver(
        CadastroIsbnPage(
          servico: acervoSimulado((pedido) {
            pedidos.add(pedido);
            return handler(pedido);
          }),
          criarController: _rapido(),
          aoAbrirLivro: aoAbrirLivro,
          aoNaoEncontrar: aoNaoEncontrar,
          aoCadastrarPessoal: aoCadastrarPessoal,
        ),
      ),
    );
  }

  Finder botaoBuscar() => find.widgetWithText(ElevatedButton, 'Buscar livro');

  testWidgets('aterrissagem: botão desabilitado até 13 dígitos e saída pessoal desde o início', (
    tester,
  ) async {
    var pessoal = false;
    await montar(tester, (_) async => json(<String, Object>{}, 200),
        aoCadastrarPessoal: () => pessoal = true);

    expect(find.text('Adicionar livro'), findsOneWidget);
    expect(find.text('Só o ISBN. Links e títulos não funcionam aqui.'), findsOneWidget);
    expect(tester.widget<ElevatedButton>(botaoBuscar()).onPressed, isNull);

    await tester.enterText(find.byType(TextField), '978-85-359-1484');
    await tester.pump();
    expect(tester.widget<ElevatedButton>(botaoBuscar()).onPressed, isNull);

    await tester.enterText(find.byType(TextField), '978-85-359-1484-9');
    await tester.pump();
    expect(tester.widget<ElevatedButton>(botaoBuscar()).onPressed, isNotNull);

    await tocar(tester, find.text('Cadastrar livro pessoal'));
    expect(pessoal, isTrue);
  });

  testWidgets('ISBN que não confere mostra o erro no campo sem chamar o servidor', (tester) async {
    await montar(tester, (_) async => json(<String, Object>{}, 200));

    await tester.enterText(find.byType(TextField), '9788535914848');
    await tester.pump();
    await tocar(tester, botaoBuscar());
    await tester.pump();

    expect(
      find.text('Esse ISBN não confere. Verifique os 13 dígitos impressos no livro.'),
      findsOneWidget,
    );
    expect(find.text('Só o ISBN. Links e títulos não funcionam aqui.'), findsNothing);
    expect(pedidos, isEmpty);
  });

  testWidgets('202, acompanhamento na mesma tela e livro encontrado', (tester) async {
    var consultas = 0;
    String? aberto;
    await montar(tester, (pedido) async {
      if (pedido.method == 'POST') {
        return json(<String, Object>{'importacaoId': _importacao, 'status': 'pendente'}, 202);
      }
      consultas++;
      return json(
        consultas < 3 ? _estado('pendente') : _estado('concluida', livroId: _livro),
        200,
      );
    }, aoAbrirLivro: (id) => aberto = id);

    await tester.enterText(find.byType(TextField), '978-85-359-1484-9');
    await tester.pump();
    await tocar(tester, botaoBuscar());
    await tester.pump();

    expect(find.text('Buscando'), findsOneWidget);
    expect(
      find.text('Procurando em nossas fontes. Isso pode levar alguns segundos.'),
      findsOneWidget,
    );

    final post = pedidos.single;
    expect(jsonDecode(post.body), <String, String>{'isbn': '9788535914849'});
    expect(post.headers['Idempotency-Key'], isNotNull);

    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();

    expect(find.text('Livro adicionado ao acervo.'), findsOneWidget);
    // O card confirma QUAL livro entrou (§4.4).
    expect(find.text('Memórias Póstumas de Brás Cubas'), findsOneWidget);
    expect(find.text('Machado de Assis'), findsOneWidget);
    expect(find.text('Penguin-Companhia · 2014'), findsOneWidget);
    expect(find.text('288 páginas'), findsOneWidget);
    await tocar(tester, find.text('Abrir página do livro'));
    expect(aberto, _livro);
  });

  testWidgets('buscar de novo o ISBN que acabou de entrar vira faixa de já cadastrado, com chave nova', (
    tester,
  ) async {
    var posts = 0;
    await montar(tester, (pedido) async {
      if (pedido.method == 'POST') {
        posts++;
        if (posts == 1) {
          return json(<String, Object>{'importacaoId': _importacao, 'status': 'pendente'}, 202);
        }
        return erro(409, 'LIVRO_JA_CADASTRADO', 'Este livro já está no acervo.', <String, Object>{
          'livroId': _livro,
          'livro': _resumo,
        });
      }
      return json(_estado('concluida', livroId: _livro), 200);
    });

    await tester.enterText(find.byType(TextField), '9788535914849');
    await tester.pump();
    await tocar(tester, botaoBuscar());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 150));
    await tester.pump();
    expect(find.text('Livro adicionado ao acervo.'), findsOneWidget);

    await tocar(tester, botaoBuscar());
    await tester.pump();
    await tester.pump();

    expect(find.text('Este livro já está no acervo.'), findsOneWidget);
    expect(find.text('Memórias Póstumas de Brás Cubas'), findsOneWidget);
    final chaves = pedidos.where((p) => p.method == 'POST').map((p) => p.headers['Idempotency-Key']);
    expect(chaves.toSet(), hasLength(2));
  });

  testWidgets('máscara: com ou sem hífen dá o mesmo valor e nada passa de 13 dígitos', (tester) async {
    await montar(tester, (_) async => json(<String, Object>{}, 200));
    String texto() => tester.widget<TextField>(find.byType(TextField)).controller!.text;

    await tester.enterText(find.byType(TextField), '9788535914849');
    expect(texto(), '978-85-359-1484-9');
    await tester.enterText(find.byType(TextField), '978 85 359 1484 9 123');
    expect(texto(), '978-85-359-1484-9');
    await tester.enterText(find.byType(TextField), 'isbn');
    expect(texto(), isEmpty);
  });

  testWidgets('ISBN já cadastrado não é erro: faixa informativa e caminho para o livro', (
    tester,
  ) async {
    String? aberto;
    await montar(tester, (_) async {
      return erro(409, 'LIVRO_JA_CADASTRADO', 'Este livro já está no acervo.', <String, Object>{
        'livroId': _livro,
      });
    }, aoAbrirLivro: (id) => aberto = id);

    await tester.enterText(find.byType(TextField), '9788535914849');
    await tester.pump();
    await tocar(tester, botaoBuscar());
    await tester.pump();
    await tester.pump();

    expect(find.text('Este livro já está no acervo.'), findsOneWidget);
    await tocar(tester, find.text('Abrir página do livro'));
    expect(aberto, _livro);

    await tocar(tester, find.text('Cadastrar outro ISBN'));
    await tester.pump();
    expect(botaoBuscar(), findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, isEmpty);
  });

  testWidgets('busca demorada troca a linha do cartão depois de oito segundos', (tester) async {
    await montar(tester, (pedido) async {
      if (pedido.method == 'POST') {
        return json(<String, Object>{'importacaoId': _importacao, 'status': 'pendente'}, 202);
      }
      return json(_estado('pendente'), 200);
    });

    await tester.enterText(find.byType(TextField), '9788535914849');
    await tester.pump();
    await tocar(tester, botaoBuscar());
    await tester.pump();
    await tester.pump(const Duration(seconds: 9));

    expect(
      find.text('Ainda procurando. As fontes externas estão lentas agora.'),
      findsOneWidget,
    );
    // Encerra os timers antes do fim do teste.
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('fonte indisponível: alerta e "Tentar de novo" reprocessa a mesma solicitação', (
    tester,
  ) async {
    var reprocessou = false;
    await montar(tester, (pedido) async {
      if (pedido.url.path.endsWith('/reprocessar')) {
        reprocessou = true;
        return json(<String, Object>{'importacaoId': _importacao, 'status': 'pendente'}, 202);
      }
      if (pedido.method == 'POST') {
        return json(<String, Object>{'importacaoId': _importacao, 'status': 'pendente'}, 202);
      }
      return json(
        reprocessou ? _estado('concluida', livroId: _livro) : _estado('falha_transitoria'),
        200,
      );
    });

    await tester.enterText(find.byType(TextField), '9788535914849');
    await tester.pump();
    await tocar(tester, botaoBuscar());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 150));
    await tester.pump();

    expect(
      find.text('Não conseguimos consultar nossas fontes agora. Seu pedido foi guardado.'),
      findsOneWidget,
    );
    // Buscar livro continua na tela em todos os estados, como no protótipo.
    expect(botaoBuscar(), findsOneWidget);

    await tocar(tester, find.text('Tentar de novo'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 150));
    await tester.pump();

    expect(reprocessou, isTrue);
    final reprocessamento = pedidos.firstWhere((p) => p.url.path.endsWith('/reprocessar'));
    expect(reprocessamento.headers['Idempotency-Key'], isNotNull);
    expect(find.text('Livro adicionado ao acervo.'), findsOneWidget);
  });

  testWidgets('nenhuma fonte conhece o ISBN: abre a tela seguinte com o ISBN normalizado', (
    tester,
  ) async {
    String? isbnRecebido;
    await montar(tester, (pedido) async {
      if (pedido.method == 'POST') {
        return json(<String, Object>{'importacaoId': _importacao, 'status': 'pendente'}, 202);
      }
      return json(_estado('nao_encontrado'), 200);
    }, aoNaoEncontrar: (isbn) async {
      isbnRecebido = isbn;
      return true;
    });

    await tester.enterText(find.byType(TextField), '978-85-359-1484-9');
    await tester.pump();
    await tocar(tester, botaoBuscar());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 150));
    await tester.pump();

    expect(isbnRecebido, '9788535914849');
    // Volta à aterrissagem com o campo preenchido, pronto para correção.
    expect(botaoBuscar(), findsOneWidget);
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      '978-85-359-1484-9',
    );
  });

  testWidgets('pedido não aceito por falha de rede não promete que foi guardado', (tester) async {
    await montar(tester, (_) async => throw http.ClientException('sem rede'));

    await tester.enterText(find.byType(TextField), '9788535914849');
    await tester.pump();
    await tocar(tester, botaoBuscar());
    // Tentativa inicial e duas retentativas, cada uma separada por um `Future.delayed`.
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 10));
    }

    expect(find.text('Não foi possível conectar ao serviço.'), findsOneWidget);
    expect(find.textContaining('Seu pedido foi guardado'), findsNothing);
    // Mesma chave em todas as tentativas automáticas da mesma intenção.
    expect(pedidos.map((p) => p.headers['Idempotency-Key']).toSet(), hasLength(1));
    expect(pedidos.length, 3);
  });

  testWidgets('limite de requisições (429) aparece como alerta com a mensagem do servidor', (
    tester,
  ) async {
    await montar(tester, (_) async {
      return erro(429, 'MUITAS_REQUISICOES', 'Muitas tentativas. Aguarde um pouco e tente de novo.');
    });

    await tester.enterText(find.byType(TextField), '9788535914849');
    await tester.pump();
    await tocar(tester, botaoBuscar());
    await tester.pump();
    await tester.pump();

    expect(find.text('Muitas tentativas. Aguarde um pouco e tente de novo.'), findsOneWidget);
  });
}
