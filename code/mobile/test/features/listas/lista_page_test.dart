import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/listas/lista_page.dart';
import 'package:le_ai_mobile/features/listas/listas_service.dart';

import 'apoio_listas.dart';

void main() {
  late List<http.Request> pedidos;
  late List<(LivroDaLista, bool)> livrosAbertos;

  setUp(() {
    pedidos = <http.Request>[];
    livrosAbertos = <(LivroDaLista, bool)>[];
  });

  Future<void> montar(
    WidgetTester tester,
    Future<http.Response> Function(http.Request) handler, {
    String? usernameDoDono,
    Future<http.Response> Function(http.Request)? identidade,
  }) async {
    usarTelaDeCelular(tester);
    await tester.pumpWidget(
      envolver(
        ListaPage(
          servico: listasSimulado((pedido) {
            pedidos.add(pedido);
            return handler(pedido);
          }),
          perfil: perfilSimulado(
            identidade ?? (_) async => json(perfilJson(relacao: 'proprio'), 200),
          ),
          listaId: idDaLista,
          usernameDoDono: usernameDoDono,
          aoAbrirLivro: (livro, dono) => livrosAbertos.add((livro, dono)),
          aoAbrirPerfil: (_) {},
          aoBuscarLivros: () {},
        ),
      ),
    );
    await tester.pump();
    await tester.pump();
    await tester.pump();
  }

  Future<http.Response> donoCom(
    http.Request pedido,
    List<Map<String, Object?>> itens, {
    http.Response? aoMover,
  }) async {
    if (pedido.method == 'PUT') {
      return aoMover ?? json(itemJson(1), 200);
    }
    if (pedido.url.path.endsWith('/livros')) {
      return json(itensJson(itens), 200);
    }
    return json(listaJson(quantidade: itens.length), 200);
  }

  final tresLivros = <Map<String, Object?>>[
    itemJson(1, titulo: 'Sagarana'),
    itemJson(2, titulo: 'Torto Arado'),
    itemJson(3, titulo: 'Contos da Rua Direita', pessoal: true),
  ];

  testWidgets('dono: bloco da lista, visibilidade, ações e o menu em cada linha', (tester) async {
    await montar(tester, (pedido) => donoCom(pedido, tresLivros));

    expect(find.text('Contos que eu indico'), findsOneWidget);
    expect(find.text('Em ordem de por onde começar.'), findsOneWidget);
    expect(
      find.text('Seu perfil é público: qualquer leitor pode ver esta lista.'),
      findsOneWidget,
    );
    expect(find.text('3 livros · atualizada em 12 de setembro de 2026'), findsOneWidget);
    expect(find.text('Editar lista'), findsOneWidget);
    expect(find.text('Reordenar'), findsOneWidget);
    expect(find.bySemanticsLabel('Ações de Sagarana'), findsOneWidget);
    expect(find.text('PESSOAL'), findsOneWidget);
    // O dono carrega a lista inteira, em segmentos do teto do servidor.
    expect(
      pedidos.firstWhere((p) => p.url.path.endsWith('/livros')).url.queryParameters['limit'],
      '50',
    );
  });

  testWidgets('dono: o livro pessoal abre como dono (sem via)', (tester) async {
    await montar(tester, (pedido) => donoCom(pedido, tresLivros));

    await tocar(tester, find.text('Contos da Rua Direita').last);

    expect(livrosAbertos.single.$1.pessoal, isTrue);
    expect(livrosAbertos.single.$2, isTrue);
  });

  testWidgets('menu do item: primeiro sem "Mover para cima"; mover salva a posição', (tester) async {
    await montar(tester, (pedido) => donoCom(pedido, tresLivros));

    await tester.tap(find.bySemanticsLabel('Ações de Sagarana'));
    await tester.pumpAndSettle();
    expect(find.text('Posição 1 de 3'), findsOneWidget);
    expect(find.text('Mover para cima'), findsNothing);
    await tester.tap(find.text('Mover para baixo'));
    await tester.pumpAndSettle();

    final mover = pedidos.singleWhere((p) => p.method == 'PUT');
    expect(mover.url.path, '/listas/$idDaLista/livros/item-1/posicao');
    expect(jsonDecode(mover.body), <String, Object?>{'posicao': 2});
    // A ordem nova na tela: Torto Arado sobe para 1.
    final posicaoDeTorto = tester.getTopLeft(find.text('Torto Arado').last).dy;
    final posicaoDeSagarana = tester.getTopLeft(find.text('Sagarana').last).dy;
    expect(posicaoDeTorto, lessThan(posicaoDeSagarana));
  });

  testWidgets('falha ao mover: a lista volta e "Tentar de novo" repete a mesma chave', (
    tester,
  ) async {
    await montar(
      tester,
      (pedido) => donoCom(
        pedido,
        tresLivros,
        aoMover: erro(500, 'ERRO_INTERNO', 'Falhou.'),
      ),
    );

    await tester.tap(find.bySemanticsLabel('Ações de Sagarana'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Mover para baixo'));
    await tester.pumpAndSettle();

    expect(
      find.text('Não foi possível salvar a nova ordem. A lista voltou como estava.'),
      findsOneWidget,
    );
    expect(
      tester.getTopLeft(find.text('Sagarana').last).dy,
      lessThan(tester.getTopLeft(find.text('Torto Arado').last).dy),
    );

    await tester.tap(find.text('Tentar de novo'));
    await tester.pumpAndSettle();

    final movimentos = pedidos.where((p) => p.method == 'PUT').toList();
    expect(movimentos, hasLength(2));
    expect(movimentos[1].headers['Idempotency-Key'], movimentos[0].headers['Idempotency-Key']);
  });

  testWidgets('modo de reordenação: alças no lugar do menu e "Concluir" sai do modo', (
    tester,
  ) async {
    await montar(tester, (pedido) => donoCom(pedido, tresLivros));

    await tester.tap(find.text('Reordenar'));
    await tester.pump();

    expect(find.text('Concluir'), findsOneWidget);
    expect(find.text('Arraste pela alça para mudar a ordem.'), findsOneWidget);
    expect(find.byType(ReorderableDragStartListener), findsNWidgets(3));
    expect(
      find.byWidgetPredicate(
        (widget) => widget is Semantics && widget.properties.label == 'Mudar a posição de Sagarana',
      ),
      findsOneWidget,
    );
    expect(find.bySemanticsLabel('Ações de Sagarana'), findsNothing);
    // Tocar na linha não abre o livro enquanto o modo está ativo.
    await tester.tap(find.text('Torto Arado').last);
    expect(livrosAbertos, isEmpty);

    await tester.tap(find.text('Concluir'));
    await tester.pump();
    expect(find.text('Reordenar'), findsOneWidget);
  });

  testWidgets('remover sai sem confirmação e a contagem cai', (tester) async {
    await montar(tester, (pedido) async {
      if (pedido.method == 'DELETE') {
        return http.Response('', 204);
      }
      return donoCom(pedido, tresLivros);
    });

    await tester.tap(find.bySemanticsLabel('Ações de Torto Arado'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Remover da lista'));
    await tester.pumpAndSettle();

    expect(pedidos.singleWhere((p) => p.method == 'DELETE').url.path,
        '/listas/$idDaLista/livros/livro-2');
    expect(find.text('Torto Arado'), findsNothing);
    expect(find.text('2 livros · atualizada em 12 de setembro de 2026'), findsOneWidget);
  });

  testWidgets('lista vazia do dono: convite e "Buscar livros", sem "Reordenar"', (tester) async {
    await montar(tester, (pedido) => donoCom(pedido, const <Map<String, Object?>>[]));

    expect(find.text('Esta lista ainda está vazia'), findsOneWidget);
    expect(find.text('Buscar livros'), findsOneWidget);
    expect(find.text('Reordenar'), findsNothing);
  });

  testWidgets('outro leitor: só lê, com a linha de dono e o livro pessoal sem ser dono', (
    tester,
  ) async {
    await montar(tester, (pedido) async {
      if (pedido.url.path.endsWith('/livros')) {
        return json(itensJson(tresLivros), 200);
      }
      return json(listaJson(dono: false, nomeDoDono: 'Rafael Okamoto'), 200);
    }, usernameDoDono: 'rafael');

    expect(find.text('Rafael Okamoto'), findsOneWidget);
    expect(find.text('Lista de '), findsOneWidget);
    expect(find.text('Editar lista'), findsNothing);
    expect(find.textContaining('Seu perfil é'), findsNothing);
    expect(find.bySemanticsLabel('Ações de Sagarana'), findsNothing);

    await tocar(tester, find.text('Contos da Rua Direita').last);
    expect(livrosAbertos.single.$2, isFalse);
  });

  testWidgets('perfil privado sem acesso (403): bloco de restrição, nada da lista', (
    tester,
  ) async {
    await montar(
      tester,
      (_) async => erro(403, 'ACESSO_NEGADO', 'Este perfil é privado. Siga para ver as listas.'),
      usernameDoDono: 'beatriz',
      identidade: (_) async => json(
        perfilJson(username: 'beatriz', nome: 'Beatriz Souza', privacidade: 'privado'),
        200,
      ),
    );

    expect(find.text('Esta lista é de um perfil privado'), findsOneWidget);
    expect(find.text('Só quem Beatriz aceita como seguidor vê as listas.'), findsOneWidget);
    expect(find.text('Ver perfil de Beatriz'), findsOneWidget);
    expect(find.text('Contos que eu indico'), findsNothing);
    expect(pedidos.where((p) => p.url.path.endsWith('/livros')), isEmpty);
  });

  testWidgets('lista excluída (404): "Lista não encontrada", sem banner de erro', (tester) async {
    await montar(tester, (_) async => erro(404, 'NAO_ENCONTRADO', 'Lista não encontrada.'));

    expect(find.text('Lista não encontrada'), findsOneWidget);
    expect(find.text('Ela pode ter sido excluída por quem a criou.'), findsOneWidget);
  });

  testWidgets('serviço fora do ar: banner com "Tentar de novo", e tentar de novo carrega', (
    tester,
  ) async {
    var disponivel = false;
    await montar(tester, (pedido) async {
      if (!disponivel) {
        throw http.ClientException('sem conexão');
      }
      return donoCom(pedido, tresLivros);
    });
    // As retentativas do GET (RNF-ERR-03) esperam um `Future.delayed` cada.
    await tester.pumpAndSettle();

    expect(
      find.text('Não foi possível carregar esta lista. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );

    disponivel = true;
    await tester.tap(find.text('Tentar de novo'));
    await tester.pumpAndSettle();

    expect(find.text('Contos que eu indico'), findsOneWidget);
  });
}
