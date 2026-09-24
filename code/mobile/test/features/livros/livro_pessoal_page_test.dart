import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/livros/livro_pessoal_page.dart';

import 'apoio.dart';

const _id = 'dddddddd-4444-4444-8444-dddddddddddd';
const _dono = 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee';
const _atividade = 'ffffffff-6666-4666-8666-ffffffffffff';

Map<String, Object?> _livro({
  bool consulta = false,
  bool comAvaliacao = false,
  String? sinopse = 'Reunião de cartas trocadas entre 1978 e 1984.',
}) => <String, Object?>{
  'id': _id,
  'tipo': 'pessoal',
  'donoId': _dono,
  'titulo': 'Cartas de um sertanejo',
  'autor': 'Marina Albuquerque',
  'paginas': 184,
  'sinopse': sinopse,
  'capaUrl': null,
  'modoConsulta': consulta,
  'notaDoDono': comAvaliacao ? <String, Object>{'valor': 4.5} : null,
  'resenhaDoDono': comAvaliacao
      ? <String, Object?>{
          'id': '11111111-1111-4111-8111-111111111111',
          'autorId': _dono,
          'autorNome': 'Rafaela Siqueira',
          'autorAvatarUrl': null,
          'texto': 'Comprei numa feira e li em duas noites.',
          'spoiler': false,
          'criadoEm': '2026-09-12T12:00:00.000Z',
          'atualizadoEm': '2026-09-12T12:00:00.000Z',
        }
      : null,
  'dono': <String, Object?>{'nome': 'Rafaela Siqueira', 'avatarUrl': null},
};

void main() {
  late List<http.Request> pedidos;

  setUp(() => pedidos = <http.Request>[]);

  Future<void> montar(
    WidgetTester tester,
    Future<http.Response> Function(http.Request) handler, {
    String? via,
    String? referenciaId,
    VoidCallback? aoExcluir,
    Future<void> Function(String)? aoEditar,
  }) async {
    usarTelaDeCelular(tester);
    await tester.pumpWidget(
      envolver(
        LivroPessoalPage(
          servico: acervoSimulado((pedido) {
            pedidos.add(pedido);
            return handler(pedido);
          }),
          livroId: _id,
          via: via,
          referenciaId: referenciaId,
          aoExcluir: aoExcluir,
          aoEditar: aoEditar,
        ),
      ),
    );
    await tester.pump();
    await tester.pump();
  }

  Finder menu() => find.bySemanticsLabel('Ações do livro');

  testWidgets('dono: hero, etiqueta, ficha, sinopse e o convite sem avaliação', (tester) async {
    await montar(tester, (_) async => json(_livro(), 200));

    expect(pedidos.single.url.query, isEmpty);
    expect(find.text('Cartas de um sertanejo'), findsOneWidget);
    expect(find.text('Marina Albuquerque'), findsOneWidget);
    expect(find.text('Livro pessoal'), findsOneWidget);
    expect(find.text('184 páginas'), findsOneWidget);
    expect(find.text('Sinopse'), findsOneWidget);
    expect(find.text('Você ainda não avaliou este livro.'), findsOneWidget);
    expect(menu(), findsOneWidget);
    // Nada do que não existe em livro pessoal (RN-02, RN-03).
    expect(find.text('ISBN'), findsNothing);
    expect(find.text('Editora'), findsNothing);
  });

  testWidgets('dono sem sinopse: a seção inteira some', (tester) async {
    await montar(tester, (_) async => json(_livro(sinopse: null), 200));

    expect(find.text('Sinopse'), findsNothing);
  });

  testWidgets('terceiro pelo feed: modo consulta sem ações do dono, com nota e resenha dele', (
    tester,
  ) async {
    await montar(
      tester,
      (_) async => json(_livro(consulta: true, comAvaliacao: true), 200),
      via: 'feed',
      referenciaId: _atividade,
    );

    expect(pedidos.single.url.queryParameters, <String, String>{
      'via': 'feed',
      'referenciaId': _atividade,
    });
    expect(menu(), findsNothing);
    expect(find.text('Livro pessoal de Rafaela Siqueira'), findsOneWidget);
    expect(find.text('Nota de Rafaela'), findsOneWidget);
    expect(find.text('4,5'), findsOneWidget);
    expect(find.bySemanticsLabel('4,5 de 5'), findsOneWidget);
    expect(find.text('Resenha de Rafaela'), findsOneWidget);
    expect(find.text('12 de setembro de 2026'), findsOneWidget);
    expect(find.text('Você ainda não avaliou este livro.'), findsNothing);
  });

  testWidgets('terceiro com dono sem avaliação: sem seção e sem convite', (tester) async {
    await montar(
      tester,
      (_) async => json(_livro(consulta: true), 200),
      via: 'feed',
      referenciaId: _atividade,
    );

    expect(find.textContaining('Nota de'), findsNothing);
    expect(find.textContaining('Resenha de'), findsNothing);
    expect(find.text('Você ainda não avaliou este livro.'), findsNothing);
    expect(find.text('184 páginas'), findsOneWidget);
    // O nome vinha só dentro da resenha; agora a atribuição aparece mesmo sem ela.
    expect(find.text('Livro pessoal de Rafaela Siqueira'), findsOneWidget);
  });

  for (final status in <int>[403, 404]) {
    testWidgets('$status: mesmo estado indisponível, sem confirmar que o livro existe', (
      tester,
    ) async {
      await montar(
        tester,
        (_) async => erro(status, 'ACESSO_NEGADO', 'Você não tem acesso a este recurso.'),
      );

      expect(find.text('Este livro não está mais disponível'), findsOneWidget);
      expect(find.text('Ele pode ter sido excluído por quem o cadastrou.'), findsOneWidget);
      expect(find.text('Voltar ao feed'), findsOneWidget);
      expect(find.text('Cartas de um sertanejo'), findsNothing);
    });
  }

  testWidgets('dono exclui pelo menu, com confirmação que nomeia o livro', (tester) async {
    var excluido = false;
    await montar(tester, (pedido) async {
      return pedido.method == 'DELETE' ? http.Response('', 204) : json(_livro(), 200);
    }, aoExcluir: () => excluido = true);

    await tester.tap(menu());
    await tester.pumpAndSettle();
    expect(find.text('Editar livro'), findsOneWidget);
    await tester.tap(find.text('Excluir livro'));
    await tester.pumpAndSettle();

    expect(find.text('Excluir este livro?'), findsOneWidget);
    expect(find.textContaining('Cartas de um sertanejo sai da sua estante'), findsOneWidget);
    await tester.tap(find.widgetWithText(OutlinedButton, 'Excluir livro'));
    await tester.pumpAndSettle();

    expect(pedidos.where((p) => p.method == 'DELETE'), hasLength(1));
    expect(excluido, isTrue);
  });

  testWidgets('editar pelo menu abre a edição e recarrega na volta', (tester) async {
    var editou = false;
    await montar(
      tester,
      (_) async => json(_livro(), 200),
      aoEditar: (id) async => editou = id == _id,
    );

    await tester.tap(menu());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Editar livro'));
    await tester.pumpAndSettle();

    expect(editou, isTrue);
    expect(pedidos.where((p) => p.method == 'GET'), hasLength(2));
  });

  testWidgets('falha de rede tem saída, não tela vazia', (tester) async {
    await montar(tester, (_) async => throw http.ClientException('sem rede'));
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 10));
    }

    expect(find.text('Não foi possível conectar ao serviço.'), findsOneWidget);
    expect(find.text('Tentar de novo'), findsOneWidget);
  });
}
