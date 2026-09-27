import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/design/widgets/estrelas_de_nota.dart';
import 'package:le_ai_mobile/features/avaliacao/leitura_service.dart';
import 'package:le_ai_mobile/features/avaliacao/resenhas_do_perfil.dart';

import '../livros/apoio.dart';

Map<String, Object?> _item(String id, String texto, {bool spoiler = false, double? nota = 4.5}) =>
    <String, Object?>{
      'id': id,
      'usuarioId': 'u2',
      'livroId': 'livro-$id',
      'texto': texto,
      'spoiler': spoiler,
      'criadoEm': '2026-09-12T12:00:00.000Z',
      'atualizadoEm': '2026-09-12T12:00:00.000Z',
      'livro': <String, Object?>{
        'id': 'livro-$id',
        'tipo': 'oficial',
        'titulo': 'Torto Arado',
        'autor': 'Itamar Vieira Junior',
        'capaUrl': null,
      },
      'nota': nota,
    };

Map<String, Object?> _pagina(List<Map<String, Object?>> itens, {int page = 1, int total = 1}) =>
    <String, Object?>{
      'itens': itens,
      'paginacao': <String, Object?>{
        'page': page,
        'limite': 5,
        'totalItens': itens.length,
        'totalPaginas': total,
      },
    };

void main() {
  late List<Uri> pedidas;
  late List<LivroDaResenha> abertos;

  Future<void> montar(
    WidgetTester tester,
    Future<http.Response> Function(http.Request) responder, {
    bool proprio = false,
  }) async {
    usarTelaDeCelular(tester);
    pedidas = <Uri>[];
    abertos = <LivroDaResenha>[];
    await tester.pumpWidget(
      envolver(
        SingleChildScrollView(
          child: ResenhasDoPerfil(
            leitura: leituraSimulada((request) {
              pedidas.add(request.url);
              return responder(request);
            }),
            usuarioId: 'u2',
            proprio: proprio,
            textoVazio: 'Rafael ainda não escreveu resenhas.',
            aoAbrirLivro: abertos.add,
          ),
        ),
      ),
    );
    await tester.pump();
  }

  testWidgets('card com livro, estrelas e trecho; tocar abre o livro', (tester) async {
    await montar(
      tester,
      (_) async => json(_pagina(<Map<String, Object?>>[_item('r1', 'A terra e a fala.')]), 200),
    );

    expect(pedidas.single.path, '/perfis/u2/resenhas');
    expect(pedidas.single.queryParameters, <String, String>{'page': '1', 'limite': '5'});
    expect(find.text('Torto Arado'), findsWidgets);
    expect(find.text('A terra e a fala.'), findsOneWidget);
    expect(find.byType(EstrelasDeNota), findsOneWidget);
    expect(find.text('4,5'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel(RegExp('^Abrir Torto Arado')));
    expect(abertos.single.id, 'livro-r1');
  });

  testWidgets('spoiler de outro leitor fica fora da árvore até o toque', (tester) async {
    await montar(
      tester,
      (_) async => json(
        _pagina(<Map<String, Object?>>[_item('r1', 'O final revela tudo.', spoiler: true)]),
        200,
      ),
    );

    expect(find.text('Esta resenha contém spoiler'), findsOneWidget);
    expect(find.text('O final revela tudo.'), findsNothing);

    await tocar(tester, find.text('Mostrar mesmo assim'));
    await tester.pump();

    expect(find.text('O final revela tudo.'), findsOneWidget);
  });

  testWidgets('o dono vê o próprio texto mesmo com spoiler', (tester) async {
    await montar(
      tester,
      (_) async =>
          json(_pagina(<Map<String, Object?>>[_item('r1', 'Minha leitura.', spoiler: true)]), 200),
      proprio: true,
    );

    expect(find.text('Minha leitura.'), findsOneWidget);
    expect(find.text('Esta resenha contém spoiler'), findsNothing);
  });

  testWidgets('sem resenhas mostra o texto vazio de antes', (tester) async {
    await montar(tester, (_) async => json(_pagina(<Map<String, Object?>>[], total: 0), 200));

    expect(find.text('Rafael ainda não escreveu resenhas.'), findsOneWidget);
  });

  testWidgets('"Ver mais resenhas" traz a página seguinte', (tester) async {
    await montar(tester, (request) async {
      final page = request.url.queryParameters['page'];
      return page == '2'
          ? json(_pagina(<Map<String, Object?>>[_item('r2', 'Segunda.')], page: 2, total: 2), 200)
          : json(_pagina(<Map<String, Object?>>[_item('r1', 'Primeira.')], total: 2), 200);
    });

    await tocar(tester, find.text('Ver mais resenhas'));
    await tester.pump();
    await tester.pump();

    expect(find.text('Segunda.'), findsOneWidget);
    expect(find.text('Ver mais resenhas'), findsNothing);
  });

  testWidgets('erro mostra "Tentar de novo"', (tester) async {
    await montar(tester, (_) async => erro(403, 'ACESSO_NEGADO', 'Perfil privado.'));

    expect(find.text('Não foi possível carregar as resenhas.'), findsOneWidget);
    expect(find.text('Tentar de novo'), findsOneWidget);
  });
}
