import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/avaliacao/avaliacao_controller.dart';
import 'package:le_ai_mobile/features/avaliacao/escrever_resenha_page.dart';
import 'package:le_ai_mobile/features/avaliacao/painel_de_nota.dart';

import '../livros/apoio.dart';

const String _id = 'b0a1c2d3-0000-4000-8000-000000000001';

const LivroAvaliado _livro = LivroAvaliado(
  titulo: 'Torto Arado',
  autor: 'Itamar Vieira Junior',
);

Map<String, Object?> _resenha(String texto, {bool spoiler = false}) => <String, Object?>{
  'id': 'r1',
  'usuarioId': 'u1',
  'livroId': _id,
  'texto': texto,
  'spoiler': spoiler,
  'criadoEm': '2026-08-22T12:00:00.000Z',
  'atualizadoEm': '2026-08-22T12:00:00.000Z',
};

void main() {
  late List<http.Request> pedidos;
  late AvaliacaoController avaliacao;

  Future<void> montar(
    WidgetTester tester, {
    Map<String, Object?>? resenha,
    Future<http.Response> Function(http.Request)? escrita,
  }) async {
    usarTelaDeCelular(tester);
    pedidos = <http.Request>[];
    avaliacao = AvaliacaoController(
      leituraSimulada((request) async {
        pedidos.add(request);
        if (request.method == 'GET') {
          return json(<String, Object?>{'livroId': _id, 'nota': null, 'resenha': resenha}, 200);
        }
        if (escrita != null) {
          return escrita(request);
        }
        if (request.method == 'DELETE') {
          return http.Response('', 204);
        }
        final corpo = jsonDecode(request.body) as Map<String, dynamic>;
        return json(_resenha(corpo['texto'] as String, spoiler: corpo['spoiler'] as bool), 200);
      }),
      _id,
    );
    addTearDown(avaliacao.dispose);
    await avaliacao.carregar();
    await tester.pumpWidget(
      envolver(
        Builder(
          builder: (context) => ElevatedButton(
            onPressed: () => abrirEditorDeResenha(context, avaliacao: avaliacao, livro: _livro),
            child: const Text('Abrir editor'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Abrir editor'));
    await tester.pumpAndSettle();
  }

  Finder publicar(String rotulo) => find.widgetWithText(TextButton, rotulo);

  bool habilitado(WidgetTester tester, Finder botao) =>
      tester.widget<TextButton>(botao).onPressed != null;

  testWidgets('vazio: placeholder, contador em zero e Publicar desabilitado', (tester) async {
    await montar(tester);

    expect(find.text('Resenha'), findsOneWidget);
    expect(
      find.text('Escreva sobre o livro. O que ficou, o que incomodou, para quem você indicaria.'),
      findsOneWidget,
    );
    expect(find.text('0 de 5.000 caracteres'), findsOneWidget);
    expect(habilitado(tester, publicar('Publicar')), isFalse);
    expect(find.text('Sem nota'), findsOneWidget);
    expect(find.text('Dar nota'), findsOneWidget);
  });

  testWidgets('escrever e publicar envia texto e spoiler e fecha o editor', (tester) async {
    await montar(tester);

    await tester.enterText(find.byType(TextField), 'Levei três dias.');
    await tester.pump();
    expect(find.text('16 de 5.000 caracteres'), findsOneWidget);

    await tester.tap(publicar('Publicar'));
    await tester.pumpAndSettle();

    final put = pedidos.singleWhere((p) => p.method == 'PUT');
    expect(put.url.path, '/livros/$_id/resenha');
    expect(jsonDecode(put.body), <String, Object?>{'texto': 'Levei três dias.', 'spoiler': false});
    expect(put.headers['Idempotency-Key'], isNotEmpty);
    expect(find.byType(EscreverResenhaPage), findsNothing);
    expect(avaliacao.resenha?.texto, 'Levei três dias.');
  });

  testWidgets('conta caracteres Unicode: um emoji de um code point conta 1', (tester) async {
    await montar(tester);

    await tester.enterText(find.byType(TextField), '😀');
    await tester.pump();

    expect(find.text('1 de 5.000 caracteres'), findsOneWidget);
  });

  testWidgets('acima do limite: aviso com o excedente, texto inteiro e Publicar bloqueado', (
    tester,
  ) async {
    await montar(tester);
    final texto = 'a' * 5126;

    await tester.enterText(find.byType(TextField), texto);
    await tester.pump();

    expect(find.text('5.126 de 5.000 caracteres'), findsOneWidget);
    expect(
      find.text('Sua resenha passou do limite em 126 caracteres. Corte um trecho para publicar.'),
      findsOneWidget,
    );
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, texto);
    expect(habilitado(tester, publicar('Publicar')), isFalse);
  });

  testWidgets('spoiler ligado mostra o aviso e vai no corpo', (tester) async {
    await montar(tester);

    await tester.enterText(find.byType(TextField), 'O final surpreende.');
    await tester.tap(find.bySemanticsLabel('Contém spoiler'));
    await tester.pump();

    expect(
      find.text('Sua resenha será exibida oculta. Quem quiser ler precisa tocar para revelar.'),
      findsOneWidget,
    );

    await tester.tap(publicar('Publicar'));
    await tester.pumpAndSettle();

    final put = pedidos.singleWhere((p) => p.method == 'PUT');
    expect((jsonDecode(put.body) as Map<String, dynamic>)['spoiler'], isTrue);
  });

  testWidgets('erro ao publicar: banner, texto preservado e reenvio com a mesma chave', (
    tester,
  ) async {
    await montar(
      tester,
      escrita: (_) async => erro(500, 'ERRO_INTERNO', 'Ocorreu um erro inesperado.'),
    );

    await tester.enterText(find.byType(TextField), 'Não quero perder isto.');
    await tester.pump();
    await tester.tap(publicar('Publicar'));
    await tester.pumpAndSettle();

    expect(
      find.text('Não foi possível publicar sua resenha. O texto continua aqui. Tente de novo.'),
      findsOneWidget,
    );
    expect(find.text('Não quero perder isto.'), findsOneWidget);

    await tester.tap(publicar('Publicar'));
    await tester.pumpAndSettle();

    final chaves = pedidos
        .where((p) => p.method == 'PUT')
        .map((p) => p.headers['Idempotency-Key'])
        .toSet();
    expect(chaves, hasLength(1));
  });

  testWidgets('edição: texto existente, Salvar, data e excluir com confirmação', (tester) async {
    await montar(tester, resenha: _resenha('Primeira versão.'));

    expect(find.text('Primeira versão.'), findsOneWidget);
    expect(publicar('Salvar'), findsOneWidget);
    expect(find.text('Publicada em 22 de agosto de 2026'), findsOneWidget);

    await tester.tap(find.byTooltip('Excluir resenha'));
    await tester.pumpAndSettle();

    expect(find.text('Excluir sua resenha?'), findsOneWidget);
    expect(
      find.text(
        'O texto será apagado e sai da página do livro e do seu perfil. Sua nota continua registrada.',
      ),
      findsOneWidget,
    );

    await tester.tap(find.widgetWithText(OutlinedButton, 'Excluir resenha'));
    await tester.pumpAndSettle();

    expect(pedidos.where((p) => p.method == 'DELETE'), hasLength(1));
    expect(find.byType(EscreverResenhaPage), findsNothing);
    expect(avaliacao.resenha, isNull);
  });

  testWidgets('fechar com texto não salvo pede confirmação e pode continuar', (tester) async {
    await montar(tester);

    await tester.enterText(find.byType(TextField), 'Rascunho.');
    await tester.tap(find.byTooltip('Fechar'));
    await tester.pumpAndSettle();

    expect(find.text('Descartar a resenha?'), findsOneWidget);

    await tester.tap(find.text('Continuar escrevendo'));
    await tester.pumpAndSettle();

    expect(find.byType(EscreverResenhaPage), findsOneWidget);
    expect(find.text('Rascunho.'), findsOneWidget);
  });

  testWidgets('fechar sem mudanças sai direto', (tester) async {
    await montar(tester);

    await tester.tap(find.byTooltip('Fechar'));
    await tester.pumpAndSettle();

    expect(find.byType(EscreverResenhaPage), findsNothing);
  });
}
