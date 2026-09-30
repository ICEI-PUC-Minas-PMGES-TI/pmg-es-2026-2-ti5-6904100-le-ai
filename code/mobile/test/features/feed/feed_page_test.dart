import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/feed/feed_page.dart';
import 'package:le_ai_mobile/features/feed/social_service.dart';
import 'package:le_ai_mobile/features/perfil/perfil_service.dart';

import 'apoio.dart';

Map<String, Object?> _paginaDeFeed(List<Map<String, Object?>> itens) => <String, Object?>{
  'itens': itens,
  'pagina': 0,
  'tamanho': 20,
  'totalItens': itens.length,
  'totalPaginas': itens.isEmpty ? 0 : 1,
  'ultima': true,
};

PerfilService _perfil({int seguidos = 0}) => PerfilService(
  ApiClient(
    baseUrl: 'https://identidade.example.com',
    client: MockClient(
      (_) async => json(<String, Object?>{
        'id': 'eu',
        'username': 'kayke',
        'displayName': 'Kayke',
        'avatarUrl': null,
        'privacidade': 'publico',
        'contadores': <String, Object?>{'seguidores': 0, 'seguidos': seguidos},
      }, 200),
    ),
    esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
  ),
);

class _Eventos {
  final lista = <String>[];
}

Future<_Eventos> _montar(
  WidgetTester tester,
  SocialService social, {
  PerfilService? perfil,
}) async {
  final eventos = _Eventos();
  await tester.pumpWidget(
    envolver(
      FeedPage(
        social: social,
        perfil: perfil ?? _perfil(),
        aoAbrirAutor: (username) => eventos.lista.add('autor:$username'),
        aoAbrirLivro: (atividade) => eventos.lista.add(
          'livro:${atividade.livro.id}:${atividade.livro.pessoal}:${atividade.livro.referenciaId}',
        ),
        aoBuscarLeitor: () => eventos.lista.add('buscar'),
        aoVerEstante: () => eventos.lista.add('estante'),
      ),
    ),
  );
  return eventos;
}

void main() {
  testWidgets('carregando mostra o skeleton e depois a lista', (tester) async {
    final resposta = Completer<http.Response>();
    await _montar(tester, socialSimulado((_) => resposta.future));
    await tester.pump();

    expect(find.byKey(const ValueKey<String>('skeleton-do-feed')), findsOneWidget);

    resposta.complete(json(_paginaDeFeed(<Map<String, Object?>>[atividadeJson()]), 200));
    await tester.pumpAndSettle();

    expect(find.text('começou a ler'), findsOneWidget);
    expect(find.byKey(const ValueKey<String>('skeleton-do-feed')), findsNothing);
  });

  testWidgets('erro mostra o banner e Tentar de novo recarrega', (tester) async {
    var chamadas = 0;
    await _montar(
      tester,
      socialSimulado((_) async {
        chamadas++;
        return chamadas == 1
            ? erro(500, 'ERRO_INTERNO', 'falhou')
            : json(_paginaDeFeed(<Map<String, Object?>>[atividadeJson()]), 200);
      }),
    );
    await tester.pumpAndSettle();

    expect(
      find.text('Não foi possível carregar seu feed. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );

    await tester.tap(find.text('Tentar de novo'));
    await tester.pumpAndSettle();

    expect(find.text('começou a ler'), findsOneWidget);
  });

  testWidgets('vazio sem seguir ninguém leva à busca de leitor', (tester) async {
    final eventos = await _montar(
      tester,
      socialSimulado((_) async => json(_paginaDeFeed(const <Map<String, Object?>>[]), 200)),
      perfil: _perfil(seguidos: 0),
    );
    await tester.pumpAndSettle();

    expect(find.text('Comece seguindo leitores'), findsOneWidget);
    await tester.tap(find.text('Buscar por nome de usuário'));
    expect(eventos.lista, <String>['buscar']);
  });

  testWidgets('vazio seguindo pessoas leva à estante', (tester) async {
    final eventos = await _montar(
      tester,
      socialSimulado((_) async => json(_paginaDeFeed(const <Map<String, Object?>>[]), 200)),
      perfil: _perfil(seguidos: 3),
    );
    await tester.pumpAndSettle();

    expect(find.text('Nada por aqui ainda'), findsOneWidget);
    expect(find.text('Buscar por nome de usuário'), findsNothing);
    await tester.tap(find.text('Ver minha estante'));
    expect(eventos.lista, <String>['estante']);
  });

  testWidgets('curtir muda o item antes de o servidor responder e depois usa o total dele', (
    tester,
  ) async {
    final pedidos = <String>[];
    final resposta = Completer<http.Response>();
    await _montar(
      tester,
      socialSimulado((request) async {
        pedidos.add('${request.method} ${request.url.path}');
        if (request.url.path == '/feed') {
          return json(_paginaDeFeed(<Map<String, Object?>>[atividadeJson()]), 200);
        }
        return resposta.future;
      }),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.bySemanticsLabel('Curtir, 4 curtidas'));
    await tester.pump();

    expect(find.bySemanticsLabel('Descurtir, 5 curtidas'), findsOneWidget);

    resposta.complete(
      json(<String, Object?>{'atividadeId': 'a1', 'curtida': true, 'totalCurtidas': 6}, 200),
    );
    await tester.pumpAndSettle();

    expect(find.bySemanticsLabel('Descurtir, 6 curtidas'), findsOneWidget);
    expect(pedidos, <String>['GET /feed', 'POST /atividades/a1/curtir']);
  });

  testWidgets('descurtir que falha volta ao estado anterior e avisa', (tester) async {
    final resposta = Completer<http.Response>();
    await _montar(
      tester,
      socialSimulado((request) async {
        if (request.url.path == '/feed') {
          return json(
            _paginaDeFeed(<Map<String, Object?>>[atividadeJson(curtidas: 5, curtida: true)]),
            200,
          );
        }
        return resposta.future;
      }),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.bySemanticsLabel('Descurtir, 5 curtidas'));
    await tester.pump();

    expect(find.bySemanticsLabel('Curtir, 4 curtidas'), findsOneWidget);

    resposta.complete(erro(404, 'RECURSO_NAO_ENCONTRADO', 'Não encontramos o que você procura.'));
    await tester.pumpAndSettle();

    expect(find.bySemanticsLabel('Descurtir, 5 curtidas'), findsOneWidget);
    expect(find.byType(SnackBar), findsOneWidget);
  });

  testWidgets('autor e livro pessoal levam à navegação com a referência da atividade', (tester) async {
    final eventos = await _montar(
      tester,
      socialSimulado(
        (_) async => json(
          _paginaDeFeed(<Map<String, Object?>>[atividadeJson(tipoLivro: 'PESSOAL')]),
          200,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Dandara Lopes'));
    await tester.tap(find.text('Torto Arado'));

    expect(eventos.lista, <String>['autor:dandara', 'livro:l1:true:a1']);
  });
}
