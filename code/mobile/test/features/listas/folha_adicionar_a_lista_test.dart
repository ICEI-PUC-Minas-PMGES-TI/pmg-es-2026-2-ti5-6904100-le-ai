import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:phosphor_icons/phosphor_icons.dart';

import 'package:le_ai_mobile/features/listas/folha_adicionar_a_lista.dart';
import 'package:le_ai_mobile/features/listas/lista_form_page.dart';

import 'apoio_listas.dart';

const _livro = LivroDeOrigem(
  id: 'livro-torto',
  titulo: 'Torto Arado',
  autor: 'Itamar Vieira Junior',
  capaUrl: null,
  pessoal: false,
);

void main() {
  late List<http.Request> pedidos;

  setUp(() => pedidos = <http.Request>[]);

  Future<void> montar(
    WidgetTester tester,
    Future<http.Response> Function(http.Request) handler, {
    LivroDeOrigem livro = _livro,
    Duration timeout = const Duration(seconds: 90),
  }) async {
    usarTelaDeCelular(tester);
    await tester.pumpWidget(
      envolver(
        FolhaAdicionarALista(
          servico: listasSimulado((pedido) {
            pedidos.add(pedido);
            return handler(pedido);
          }, timeout: timeout),
          livro: livro,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();
  }

  final duasListas = paginaJson(<Map<String, Object?>>[
    resumoJson(id: 'l-viagem', titulo: 'Para ler numa viagem', quantidade: 4, contem: true),
    resumoJson(id: 'l-2027', titulo: 'Quero ler em 2027', quantidade: 0),
  ]);

  testWidgets('mostra a marca de quem já contém o livro, pedida com o livroId', (tester) async {
    await montar(tester, (_) async => json(duasListas, 200));

    expect(pedidos.single.url.path, '/me/listas');
    expect(pedidos.single.url.queryParameters['livroId'], 'livro-torto');
    expect(find.text('O livro entra no fim de cada lista que você marcar.'), findsOneWidget);
    expect(find.byIcon(PhosphorIconsFill.checkCircle), findsOneWidget);
    expect(find.byIcon(PhosphorIconsRegular.plusCircle), findsOneWidget);
    expect(find.text('4 livros'), findsOneWidget);
    expect(find.text('Criar lista'), findsOneWidget);
  });

  testWidgets('tocar adiciona na hora e a contagem confirma depois', (tester) async {
    final resposta = Completer<http.Response>();
    await montar(tester, (pedido) async {
      if (pedido.method == 'POST') {
        return resposta.future;
      }
      return json(duasListas, 200);
    });

    await tester.tap(find.text('Quero ler em 2027'));
    await tester.pump();
    expect(find.text('Adicionando'), findsOneWidget);
    expect(find.byIcon(PhosphorIconsFill.checkCircle), findsNWidgets(2));

    resposta.complete(json(itemJson(1), 201));
    await tester.pumpAndSettle();
    expect(pedidos.last.url.path, '/listas/l-2027/livros');
    expect(find.text('1 livro'), findsOneWidget);
  });

  testWidgets('falha ao remover: a marca volta e tocar reenvia a mesma remoção', (tester) async {
    var falhar = true;
    await montar(tester, (pedido) async {
      if (pedido.method == 'DELETE') {
        if (falhar) {
          falhar = false;
          return erro(500, 'ERRO_INTERNO', 'Falhou.');
        }
        return http.Response('', 204);
      }
      return json(duasListas, 200);
    });

    await tester.tap(find.text('Para ler numa viagem'));
    await tester.pumpAndSettle();
    expect(find.text('Não foi possível remover. Toque para tentar de novo.'), findsOneWidget);
    expect(find.byIcon(PhosphorIconsFill.checkCircle), findsOneWidget);

    await tester.tap(find.text('Para ler numa viagem'));
    await tester.pumpAndSettle();

    final remocoes = pedidos.where((p) => p.method == 'DELETE').toList();
    expect(remocoes, hasLength(2));
    expect(remocoes[1].headers['Idempotency-Key'], remocoes[0].headers['Idempotency-Key']);
    expect(find.text('3 livros'), findsOneWidget);
  });

  // L-14 (E6-02): tempo esgotado do cliente, com o `ApiClient` real e um timeout curto.
  testWidgets('tempo esgotado ao carregar as listas: banner com "Tentar de novo", que carrega', (
    tester,
  ) async {
    var demorar = true;
    await montar(tester, (_) async {
      if (demorar) {
        await Future<void>.delayed(atrasoDoServidor);
      }
      return json(duasListas, 200);
    }, timeout: timeoutCurto);
    await tester.pump(timeoutCurto);
    await tester.pump();

    expect(
      find.text('Não foi possível carregar suas listas. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );
    expect(
      find.text('Você ainda não tem listas. Crie a primeira e este livro já entra nela.'),
      findsNothing,
    );
    expect(pedidos, hasLength(1));
    await tester.pump(atrasoDoServidor);

    demorar = false;
    await tester.tap(find.text('Tentar de novo'));
    await tester.pumpAndSettle();
    expect(find.text('Para ler numa viagem'), findsOneWidget);
    expect(find.text('Quero ler em 2027'), findsOneWidget);
  });

  testWidgets('tempo esgotado ao adicionar: a marca volta e tocar reenvia com a mesma chave', (
    tester,
  ) async {
    var demorar = true;
    await montar(tester, (pedido) async {
      if (pedido.method == 'POST') {
        if (demorar) {
          demorar = false;
          await Future<void>.delayed(atrasoDoServidor);
        }
        return json(itemJson(1), 201);
      }
      return json(duasListas, 200);
    }, timeout: timeoutCurto);

    await tester.tap(find.text('Quero ler em 2027'));
    await tester.pump();
    await tester.pump(timeoutCurto);
    // A troca da marca é animada; o `pumpAndSettle` não avança o timer da resposta atrasada.
    await tester.pumpAndSettle();

    expect(find.text('Não foi possível adicionar. Toque para tentar de novo.'), findsOneWidget);
    expect(find.byIcon(PhosphorIconsFill.checkCircle), findsOneWidget);
    await tester.pump(atrasoDoServidor);

    await tester.tap(find.text('Quero ler em 2027'));
    await tester.pumpAndSettle();

    final adicoes = pedidos.where((p) => p.method == 'POST').toList();
    expect(adicoes, hasLength(2));
    expect(adicoes[1].headers['Idempotency-Key'], adicoes[0].headers['Idempotency-Key']);
    expect(find.text('1 livro'), findsOneWidget);
    expect(find.byIcon(PhosphorIconsFill.checkCircle), findsNWidgets(2));
  });

  testWidgets('sem listas: convite a criar a primeira; livro pessoal ganha a faixa', (
    tester,
  ) async {
    await montar(
      tester,
      (_) async => json(paginaJson(const <Map<String, Object?>>[]), 200),
      livro: const LivroDeOrigem(
        id: 'livro-p',
        titulo: 'Contos da Rua Direita',
        autor: 'Helena Prado',
        capaUrl: null,
        pessoal: true,
      ),
    );

    expect(
      find.text('Você ainda não tem listas. Crie a primeira e este livro já entra nela.'),
      findsOneWidget,
    );
    expect(find.textContaining('Livro pessoal: quem puder ver a lista'), findsOneWidget);
    expect(find.text('O livro entra no fim de cada lista que você marcar.'), findsNothing);
  });
}
