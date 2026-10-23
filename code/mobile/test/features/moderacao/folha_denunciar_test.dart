import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/feed/social_service.dart';
import 'package:le_ai_mobile/features/moderacao/folha_denunciar.dart';

import '../feed/apoio.dart';

const AlvoDaDenuncia _resenha = AlvoDaDenuncia.resenha(
  id: 'r1',
  autorNome: 'Letícia Nakamura',
  livroTitulo: 'Torto Arado',
  texto: 'A segunda parte *muda tudo*.\n\n- e **conta** o final',
);

/// Um botão que abre a denúncia, como as telas fazem, e devolve os pedidos que chegaram.
Future<List<http.Request>> _abrir(
  WidgetTester tester, {
  AlvoDaDenuncia alvo = _resenha,
  Future<http.Response> Function(http.Request)? responder,
}) async {
  final pedidos = <http.Request>[];
  final SocialService social = socialSimulado((pedido) async {
    pedidos.add(pedido);
    return responder?.call(pedido) ??
        json(<String, Object?>{
          'id': 'd1',
          'estado': 'pendente',
          'criadoEm': '2026-10-18T12:00:00Z',
        }, 201);
  });
  await tester.pumpWidget(
    envolver(
      Builder(
        builder: (context) => TextButton(
          onPressed: () => abrirDenuncia(context, social: social, alvo: alvo),
          child: const Text('abrir'),
        ),
      ),
    ),
  );
  await tester.tap(find.text('abrir'));
  await tester.pumpAndSettle();
  return pedidos;
}

Future<void> _escreverERevisar(WidgetTester tester, String motivo) async {
  await tester.enterText(
    find.byKey(const ValueKey<String>('campo-motivo')),
    motivo,
  );
  await tester.pump();
  await tester.tap(find.text(TextosDaDenuncia.revisar));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'passo 1 da resenha: card com o trecho formatado em três linhas e o contador',
    (tester) async {
      await _abrir(tester);

      expect(find.text('Denunciar resenha'), findsOneWidget);
      expect(find.text('Resenha de Torto Arado'), findsOneWidget);
      expect(find.text('0 de 500 caracteres'), findsOneWidget);
      final trecho = tester.widget<RichText>(
        find.byWidgetPredicate(
          (w) =>
              w is RichText &&
              w.text.toPlainText().startsWith('A segunda parte muda tudo.'),
        ),
      );
      expect(trecho.maxLines, 3);
      expect(
        trecho.text.toPlainText(),
        'A segunda parte muda tudo. e conta o final',
      );
      // `visitChildren` só visita spans com texto; o itálico é o pai, sem texto próprio.
      final italicos = <String>[];
      void percorrer(InlineSpan span) {
        if (span is TextSpan) {
          if (span.style?.fontStyle == FontStyle.italic) {
            italicos.add(span.toPlainText());
          }
          span.children?.forEach(percorrer);
        }
      }

      percorrer(trecho.text);
      expect(italicos, <String>['muda tudo']);
    },
  );

  testWidgets('resenha com spoiler não mostra o texto', (tester) async {
    await _abrir(
      tester,
      alvo: const AlvoDaDenuncia.resenha(
        id: 'r1',
        autorNome: 'Letícia',
        livroTitulo: 'Torto Arado',
        texto: 'O final',
        spoiler: true,
      ),
    );

    expect(find.text(TextosDaDenuncia.spoiler), findsOneWidget);
    expect(find.textContaining('O final'), findsNothing);
  });

  testWidgets(
    'motivo em branco e acima do limite mostram o erro no lugar do helper',
    (tester) async {
      await _abrir(tester);

      await _escreverERevisar(tester, '   ');
      expect(find.text(TextosDaDenuncia.emBranco), findsOneWidget);
      expect(find.text('Enviar esta denúncia?'), findsNothing);

      await _escreverERevisar(tester, '😀' * 501);
      expect(find.text(TextosDaDenuncia.longo), findsOneWidget);
      expect(find.text('501 de 500 caracteres'), findsOneWidget);
    },
  );

  testWidgets('envia o motivo aparado e mostra o aviso de confirmação', (
    tester,
  ) async {
    final pedidos = await _abrir(tester);
    await _escreverERevisar(tester, '  Conta o final.  ');

    expect(find.text('Seu motivo'), findsOneWidget);
    expect(
      find.textContaining('A resenha de Letícia Nakamura e o seu motivo'),
      findsOneWidget,
    );
    await tester.tap(find.text(TextosDaDenuncia.enviar));
    await tester.pumpAndSettle();

    expect(jsonDecode(pedidos.single.body), <String, Object?>{
      'alvoTipo': 'resenha',
      'alvoId': 'r1',
      'motivo': 'Conta o final.',
    });
    expect(find.text(TextosDaDenuncia.enviada), findsOneWidget);
  });

  testWidgets('via do livro pessoal vai junto', (tester) async {
    final pedidos = await _abrir(
      tester,
      alvo: const AlvoDaDenuncia.resenha(
        id: 'r1',
        autorNome: 'Rafaela',
        livroTitulo: 'Cartas',
        texto: 'Texto',
        via: 'lista',
        referenciaId: 'lista-1',
      ),
    );
    await _escreverERevisar(tester, 'Spam');
    await tester.tap(find.text(TextosDaDenuncia.enviar));
    await tester.pumpAndSettle();

    final corpo = jsonDecode(pedidos.single.body) as Map<String, dynamic>;
    expect(corpo['via'], 'lista');
    expect(corpo['referenciaId'], 'lista-1');
  });

  testWidgets(
    'falha e 429 mostram o banner certo; tentar de novo repete a mesma chave',
    (tester) async {
      var vez = 0;
      final pedidos = await _abrir(
        tester,
        responder: (_) async {
          vez++;
          return vez <= 3
              ? erro(503, 'SERVICO_INDISPONIVEL', 'fora')
              : erro(429, 'MUITAS_REQUISICOES', 'limite');
        },
      );
      await _escreverERevisar(tester, 'Spam');

      await tester.tap(find.text(TextosDaDenuncia.enviar));
      await tester.pumpAndSettle();
      expect(find.text(TextosDaDenuncia.falhaConexao), findsOneWidget);

      await tester.tap(find.text(TextosDaDenuncia.enviar));
      await tester.pumpAndSettle();
      expect(find.text(TextosDaDenuncia.falhaFrequencia), findsOneWidget);
      expect(find.text('Seu motivo'), findsOneWidget);
      expect(
        pedidos.map((p) => p.headers['Idempotency-Key']).toSet(),
        hasLength(1),
      );
    },
  );

  testWidgets('404 troca para o conteúdo indisponível', (tester) async {
    await _abrir(
      tester,
      responder: (_) async => erro(404, 'RECURSO_NAO_ENCONTRADO', 'sumiu'),
    );
    await _escreverERevisar(tester, 'Spam');

    await tester.tap(find.text(TextosDaDenuncia.enviar));
    await tester.pumpAndSettle();

    expect(find.text('Esta resenha não está mais disponível'), findsOneWidget);
    await tester.tap(find.text(TextosDaDenuncia.fechar));
    await tester.pumpAndSettle();
    expect(find.text('Esta resenha não está mais disponível'), findsNothing);
    expect(find.text(TextosDaDenuncia.enviada), findsNothing);
  });

  testWidgets('aviso de partida a frio depois de três segundos de envio', (
    tester,
  ) async {
    final resposta = Completer<http.Response>();
    await _abrir(tester, responder: (_) => resposta.future);
    await _escreverERevisar(tester, 'Spam');

    await tester.tap(find.text(TextosDaDenuncia.enviar));
    await tester.pump();
    expect(find.text(TextosDaDenuncia.enviando), findsOneWidget);
    await tester.pump(const Duration(seconds: 3));
    expect(find.text(TextosDaDenuncia.coldStart), findsOneWidget);

    resposta.complete(json(<String, Object?>{}, 201));
    await tester.pumpAndSettle();
    expect(find.text(TextosDaDenuncia.enviada), findsOneWidget);
  });

  testWidgets('fechar com motivo escrito pergunta antes', (tester) async {
    await _abrir(tester);
    await tester.enterText(
      find.byKey(const ValueKey<String>('campo-motivo')),
      'Algo',
    );
    await tester.pump();

    await tester.tap(find.byTooltip(TextosDaDenuncia.fechar));
    await tester.pumpAndSettle();
    expect(find.text(TextosDaDenuncia.descartarTitulo), findsOneWidget);

    await tester.tap(find.text(TextosDaDenuncia.continuar));
    await tester.pumpAndSettle();
    expect(find.text('Denunciar resenha'), findsOneWidget);

    await tester.tap(find.byTooltip(TextosDaDenuncia.fechar));
    await tester.pumpAndSettle();
    await tester.tap(find.text(TextosDaDenuncia.descartar));
    await tester.pumpAndSettle();
    expect(find.text('Denunciar resenha'), findsNothing);
  });
}
