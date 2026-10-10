import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/avaliacao/reacoes.dart';
import 'package:le_ai_mobile/features/avaliacao/reacoes_da_resenha.dart';

import '../livros/apoio.dart';

const EstadoDasReacoes _semReacao = EstadoDasReacoes(curtidas: 12, descurtidas: 1);

Map<String, Object?> _estadoJson(String? minha, int curtidas, int descurtidas) => <String, Object?>{
  'minhaReacao': minha,
  'curtidas': curtidas,
  'descurtidas': descurtidas,
};

ApiException _falha(int status) => ApiException(
  kind: ApiFailureKind.invalidResponse,
  correlationId: '',
  message: 'Falhou.',
  status: status,
);

void main() {
  group('aplicarToque', () {
    test('curtir sem reação soma uma curtida', () {
      expect(
        aplicarToque(_semReacao, TipoDeReacao.curtida),
        const EstadoDasReacoes(minhaReacao: TipoDeReacao.curtida, curtidas: 13, descurtidas: 1),
      );
    });

    test('tocar no ativo retira e tocar no outro troca', () {
      const curtida = EstadoDasReacoes(minhaReacao: TipoDeReacao.curtida, curtidas: 13, descurtidas: 1);
      expect(aplicarToque(curtida, TipoDeReacao.curtida), _semReacao);
      expect(
        aplicarToque(curtida, TipoDeReacao.descurtida),
        const EstadoDasReacoes(minhaReacao: TipoDeReacao.descurtida, curtidas: 12, descurtidas: 2),
      );
    });

    test('nunca deixa contagem negativa', () {
      const zerada = EstadoDasReacoes(minhaReacao: TipoDeReacao.descurtida);
      expect(aplicarToque(zerada, TipoDeReacao.descurtida), const EstadoDasReacoes());
    });
  });

  test('rotulo usa singular e mostra zero como contagem real', () {
    expect(rotuloDaContagem(1, TipoDeReacao.curtida), '1 curtida');
    expect(rotuloDaContagem(0, TipoDeReacao.descurtida), '0 descurtidas');
    expect(rotuloDaContagem(12, TipoDeReacao.curtida), '12 curtidas');
  });

  test('parse tolerante: campo ausente é zero e reação desconhecida é nenhuma', () {
    expect(
      EstadoDasReacoes.fromJson(<String, dynamic>{'minhaReacao': 'amei', 'curtidas': 3}),
      const EstadoDasReacoes(curtidas: 3),
    );
  });

  group('ReacoesOtimistas', () {
    test('muda na hora e depois fica com as contagens do servidor', () async {
      final chamadas = <String>[];
      final reacoes = ReacoesOtimistas(
        resenhaId: 'r1',
        inicial: _semReacao,
        reagir: (id, tipo, {via, required idempotencyKey}) async {
          chamadas.add('${tipo.contrato}:$idempotencyKey');
          return const EstadoDasReacoes(minhaReacao: TipoDeReacao.curtida, curtidas: 20, descurtidas: 1);
        },
        remover: (id, {via, required idempotencyKey}) async => _semReacao,
        novaChave: () => 'chave-${chamadas.length}',
      );

      reacoes.tocar(TipoDeReacao.curtida);
      expect(reacoes.estado.curtidas, 13);
      await pumpEventQueue();

      expect(chamadas, <String>['curtida:chave-0']);
      expect(reacoes.estado.curtidas, 20);
    });

    test('falha volta ao estado anterior e reusa a chave na mesma intenção', () async {
      final chaves = <String>[];
      var falhar = true;
      var sequencia = 0;
      final reacoes = ReacoesOtimistas(
        resenhaId: 'r1',
        inicial: _semReacao,
        reagir: (id, tipo, {via, required idempotencyKey}) async {
          chaves.add(idempotencyKey);
          if (falhar) {
            falhar = false;
            throw _falha(429);
          }
          return const EstadoDasReacoes(minhaReacao: TipoDeReacao.curtida, curtidas: 13, descurtidas: 1);
        },
        remover: (id, {via, required idempotencyKey}) async => _semReacao,
        novaChave: () => 'chave-${sequencia++}',
      );

      reacoes.tocar(TipoDeReacao.curtida);
      await pumpEventQueue();
      expect(reacoes.estado, _semReacao);
      expect(reacoes.erro, mensagemDeFalhaDaReacao);

      reacoes.tocar(TipoDeReacao.curtida);
      await pumpEventQueue();
      expect(chaves, <String>['chave-0', 'chave-0']);
      expect(reacoes.estado.minhaReacao, TipoDeReacao.curtida);
    });

    test('toques rápidos geram uma requisição em voo e convergem para o último', () async {
      final primeira = Completer<EstadoDasReacoes>();
      final tipos = <TipoDeReacao>[];
      final reacoes = ReacoesOtimistas(
        resenhaId: 'r1',
        inicial: _semReacao,
        reagir: (id, tipo, {via, required idempotencyKey}) {
          tipos.add(tipo);
          return tipos.length == 1
              ? primeira.future
              : Future<EstadoDasReacoes>.value(
                  const EstadoDasReacoes(minhaReacao: TipoDeReacao.descurtida, curtidas: 12, descurtidas: 2),
                );
        },
        remover: (id, {via, required idempotencyKey}) async => _semReacao,
      );

      reacoes.tocar(TipoDeReacao.curtida);
      reacoes.tocar(TipoDeReacao.descurtida);
      expect(tipos, <TipoDeReacao>[TipoDeReacao.curtida]);

      primeira.complete(const EstadoDasReacoes(minhaReacao: TipoDeReacao.curtida, curtidas: 13, descurtidas: 1));
      await pumpEventQueue();

      expect(tipos, <TipoDeReacao>[TipoDeReacao.curtida, TipoDeReacao.descurtida]);
      expect(reacoes.estado.descurtidas, 2);
    });
  });

  group('ReacoesDaResenha', () {
    testWidgets('mostra as duas contagens e envia a curtida com a via', (tester) async {
      http.Request? enviado;
      final leitura = leituraSimulada((pedido) async {
        enviado = pedido;
        return json(_estadoJson('curtida', 13, 0), 200);
      });
      await tester.pumpWidget(
        envolver(
          ReacoesDaResenha(
            resenhaId: 'r1',
            reacoes: const EstadoDasReacoes(curtidas: 12),
            leitura: leitura,
            via: const ViaDeAcesso(via: 'lista', referenciaId: 'lista-1'),
          ),
        ),
      );

      expect(find.text('12 curtidas'), findsOneWidget);
      expect(find.text('0 descurtidas'), findsOneWidget);
      expect(find.bySemanticsLabel('Curtir resenha, 12 curtidas'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey<String>('reacao-curtida')));
      await tester.pump();
      expect(find.text('13 curtidas'), findsOneWidget);
      await tester.pumpAndSettle();

      expect(enviado?.method, 'PUT');
      expect(enviado?.url.path, '/resenhas/r1/reacao');
      expect(jsonDecode(enviado!.body), <String, Object?>{
        'tipo': 'curtida',
        'via': 'lista',
        'referenciaId': 'lista-1',
      });
      expect(enviado?.headers['Idempotency-Key'], isNotEmpty);
    });

    testWidgets('retirar vai pelo DELETE com a via na consulta', (tester) async {
      http.Request? enviado;
      final leitura = leituraSimulada((pedido) async {
        enviado = pedido;
        return json(_estadoJson(null, 11, 0), 200);
      });
      await tester.pumpWidget(
        envolver(
          ReacoesDaResenha(
            resenhaId: 'r1',
            reacoes: const EstadoDasReacoes(minhaReacao: TipoDeReacao.curtida, curtidas: 12),
            leitura: leitura,
            via: const ViaDeAcesso(via: 'feed', referenciaId: 'atividade-1'),
          ),
        ),
      );

      await tester.tap(find.byKey(const ValueKey<String>('reacao-curtida')));
      await tester.pumpAndSettle();

      expect(enviado?.method, 'DELETE');
      expect(enviado?.url.queryParameters, <String, String>{'via': 'feed', 'referenciaId': 'atividade-1'});
      expect(find.text('11 curtidas'), findsOneWidget);
    });

    for (final (nome, resposta) in <(String, Future<http.Response> Function())>[
      ('503', () async => erro(503, 'SERVICO_INDISPONIVEL', 'Indisponível.')),
      ('queda de rede', () => Future<http.Response>.error(http.ClientException('sem rede'))),
    ]) {
      testWidgets('falha ($nome) volta ao estado anterior e avisa', (tester) async {
        final leitura = leituraSimulada((pedido) => resposta());
        await tester.pumpWidget(
          envolver(
            ReacoesDaResenha(resenhaId: 'r1', reacoes: const EstadoDasReacoes(curtidas: 12), leitura: leitura),
          ),
        );

        await tester.tap(find.byKey(const ValueKey<String>('reacao-descurtida')));
        await tester.pumpAndSettle();

        expect(find.text('0 descurtidas'), findsOneWidget);
        expect(find.text(mensagemDeFalhaDaReacao), findsOneWidget);
      });
    }

    testWidgets('só leitura mostra as contagens sem botão', (tester) async {
      await tester.pumpWidget(
        envolver(
          const ReacoesDaResenha(
            resenhaId: 'r1',
            reacoes: EstadoDasReacoes(curtidas: 12, descurtidas: 2),
            somenteLeitura: true,
          ),
        ),
      );

      expect(find.text('12 curtidas'), findsOneWidget);
      expect(find.text('2 descurtidas'), findsOneWidget);
      expect(find.byType(InkWell), findsNothing);
    });
  });
}
