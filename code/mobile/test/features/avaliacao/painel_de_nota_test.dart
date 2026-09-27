import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/design/widgets/seletor_de_nota.dart';
import 'package:le_ai_mobile/features/avaliacao/avaliacao_controller.dart';
import 'package:le_ai_mobile/features/avaliacao/painel_de_nota.dart';

import '../livros/apoio.dart';

const String _id = 'b0a1c2d3-0000-4000-8000-000000000001';

const LivroAvaliado _livro = LivroAvaliado(
  titulo: 'Torto Arado',
  autor: 'Itamar Vieira Junior',
);

void main() {
  late List<http.Request> pedidos;
  late AvaliacaoController avaliacao;

  /// Página mínima com um botão que abre o painel, como a página do livro faz.
  Future<void> montar(
    WidgetTester tester, {
    double? notaSalva,
    Future<http.Response> Function(http.Request)? escrita,
  }) async {
    usarTelaDeCelular(tester);
    pedidos = <http.Request>[];
    avaliacao = AvaliacaoController(
      leituraSimulada((request) async {
        pedidos.add(request);
        if (request.method == 'GET') {
          return json(<String, Object?>{
            'livroId': _id,
            'nota': notaSalva == null ? null : notaJson(_id, notaSalva),
            'resenha': null,
          }, 200);
        }
        return escrita == null ? http.Response('', 204) : escrita(request);
      }),
      _id,
    );
    addTearDown(avaliacao.dispose);
    await avaliacao.carregar();
    await tester.pumpWidget(
      envolver(
        Builder(
          builder: (context) => ElevatedButton(
            onPressed: () => abrirPainelDeNota(context, avaliacao: avaliacao, livro: _livro),
            child: const Text('Abrir painel'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Abrir painel'));
    await tester.pumpAndSettle();
  }

  /// Toca na estrela [indice] (1 a 5), na metade esquerda (meia) ou direita (inteira).
  Future<void> tocarEstrela(WidgetTester tester, int indice, {bool meia = false}) async {
    final origem = tester.getTopLeft(find.byType(SeletorDeNota));
    final x = (indice - 1) * SeletorDeNota.alvo + (meia ? 12 : 36);
    await tester.tapAt(origem + Offset(x, SeletorDeNota.alvo / 2));
    await tester.pump();
  }

  Finder salvar() => find.widgetWithText(ElevatedButton, 'Salvar nota');

  testWidgets('sem nota: "Sem nota", Salvar desabilitado e sem Remover', (tester) async {
    await montar(tester);

    expect(find.text('Sem nota'), findsOneWidget);
    expect(find.text('de 0 a 5, com meia estrela'), findsOneWidget);
    expect(tester.widget<ElevatedButton>(salvar()).onPressed, isNull);
    expect(find.text('Remover nota'), findsNothing);
  });

  testWidgets('nota salva: valor com vírgula e Remover presente', (tester) async {
    await montar(tester, notaSalva: 4.5);

    expect(find.text('4,5'), findsOneWidget);
    expect(find.text('Remover nota'), findsOneWidget);
  });

  testWidgets('nota zero salva é 0, não "Sem nota" (RN-06)', (tester) async {
    await montar(tester, notaSalva: 0);

    expect(find.text('0'), findsOneWidget);
    expect(find.text('Sem nota'), findsNothing);
    expect(find.text('Você deu nota 0 a este livro.'), findsOneWidget);
  });

  testWidgets('metade esquerda escolhe meia estrela; direita, a inteira', (tester) async {
    await montar(tester);

    await tocarEstrela(tester, 5, meia: true);
    expect(find.text('4,5'), findsOneWidget);

    await tocarEstrela(tester, 3);
    expect(find.text('3'), findsOneWidget);
  });

  testWidgets('salvar envia o valor com chave de idempotência e fecha o painel', (tester) async {
    await montar(tester, escrita: (_) async => json(notaJson(_id, 4.5), 200));

    await tocarEstrela(tester, 5, meia: true);
    await tester.tap(salvar());
    await tester.pumpAndSettle();

    final put = pedidos.singleWhere((p) => p.method == 'PUT');
    expect(put.url.path, '/livros/$_id/nota');
    expect(jsonDecode(put.body), <String, Object?>{'valor': 4.5});
    expect(put.headers['Idempotency-Key'], isNotEmpty);
    expect(find.byType(PainelDeNota), findsNothing);
    expect(avaliacao.nota?.valor, 4.5);
  });

  testWidgets('erro ao salvar: mensagem, painel aberto e reenvio com a mesma chave', (
    tester,
  ) async {
    await montar(
      tester,
      escrita: (_) async => erro(500, 'ERRO_INTERNO', 'Ocorreu um erro inesperado.'),
    );

    await tocarEstrela(tester, 4);
    await tester.tap(salvar());
    await tester.pumpAndSettle();

    expect(
      find.text('Não foi possível salvar sua nota. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );
    expect(find.byType(PainelDeNota), findsOneWidget);

    await tester.tap(salvar());
    await tester.pumpAndSettle();

    final chaves = pedidos
        .where((p) => p.method == 'PUT')
        .map((p) => p.headers['Idempotency-Key'])
        .toSet();
    expect(chaves, hasLength(1));
  });

  testWidgets('remover pede confirmação; confirmar envia o DELETE', (tester) async {
    await montar(tester, notaSalva: 3);

    await tester.tap(find.text('Remover nota'));
    await tester.pumpAndSettle();

    expect(find.text('Remover sua nota?'), findsOneWidget);
    expect(
      find.text('O livro volta a ficar sem nota sua. Sua resenha, se houver, continua publicada.'),
      findsOneWidget,
    );

    await tester.tap(find.widgetWithText(OutlinedButton, 'Remover nota'));
    await tester.pumpAndSettle();

    expect(pedidos.where((p) => p.method == 'DELETE'), hasLength(1));
    expect(avaliacao.nota, isNull);
  });

  testWidgets('cancelar a remoção volta ao painel sem apagar', (tester) async {
    await montar(tester, notaSalva: 3);

    await tester.tap(find.text('Remover nota'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();

    expect(find.byType(PainelDeNota), findsOneWidget);
    expect(pedidos.where((p) => p.method == 'DELETE'), isEmpty);
  });
}
