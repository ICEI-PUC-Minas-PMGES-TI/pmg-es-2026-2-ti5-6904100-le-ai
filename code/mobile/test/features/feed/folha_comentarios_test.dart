import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/feed/folha_comentarios.dart';
import 'package:le_ai_mobile/features/feed/social_service.dart';
import 'package:le_ai_mobile/features/perfil/perfil_service.dart';

import 'apoio.dart';

Map<String, Object?> _pagina(List<Map<String, Object?>> itens) => <String, Object?>{
  'itens': itens,
  'pagina': 0,
  'tamanho': 20,
  'totalItens': itens.length,
  'totalPaginas': itens.isEmpty ? 0 : 1,
  'ultima': true,
};

final PerfilService _perfil = PerfilService(
  ApiClient(
    baseUrl: 'https://identidade.example.com',
    client: MockClient(
      (_) async => json(<String, Object?>{
        'id': 'eu',
        'username': 'kayke',
        'displayName': 'Kayke Eman',
        'avatarUrl': null,
        'privacidade': 'publico',
        'contadores': <String, Object?>{'seguidores': 0, 'seguidos': 1},
      }, 200),
    ),
    esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
  ),
);

final Map<String, Object?> _raiz = comentarioJson(
  id: 'c1',
  totalRespostas: 1,
  texto: 'Que leitura.',
  username: 'dandara',
  nome: 'Dandara Lopes',
);
final Map<String, Object?> _resposta = comentarioJson(
  id: 'r1',
  nivel: 'RESPOSTA',
  raiz: 'c1',
  texto: '@dandara concordo',
  username: 'juwences',
  nome: 'Júlia Wenceslau',
);

/// Servidor simulado do `social`: raízes, respostas e o POST de comentário.
class _Servidor {
  List<Map<String, Object?>> raizes;
  final List<http.Request> posts = <http.Request>[];
  http.Response Function(http.Request)? aoPostar;
  bool falharLista;

  _Servidor({List<Map<String, Object?>>? raizes, this.falharLista = false})
    : raizes = raizes ?? <Map<String, Object?>>[_raiz];

  SocialService get servico => socialSimulado((request) async {
    if (request.method == 'POST') {
      posts.add(request);
      final corpo = jsonDecode(request.body) as Map<String, dynamic>;
      return aoPostar?.call(request) ??
          json(
            comentarioJson(
              id: 'novo${posts.length}',
              nivel: corpo['comentarioRespondidoId'] == null ? 'RAIZ' : 'RESPOSTA',
              raiz: corpo['comentarioRespondidoId'] == null ? null : 'c1',
              texto: corpo['texto'] as String,
              username: 'kayke',
              nome: 'Kayke Eman',
            ),
            201,
          );
    }
    if (request.url.path.endsWith('/respostas')) {
      return json(<String, Object?>{
        'itens': <Object?>[_resposta],
        'proximoCursor': null,
        'temMais': false,
      }, 200);
    }
    if (falharLista) {
      falharLista = false;
      return erro(500, 'ERRO_INTERNO', 'falhou');
    }
    return json(_pagina(raizes), 200);
  });
}

Future<List<String>> _abrir(WidgetTester tester, _Servidor servidor, {int comentarios = 1}) async {
  final eventos = <String>[];
  final atividade = Atividade.fromJson(atividadeJson(comentarios: comentarios));
  await tester.pumpWidget(
    envolver(
      Builder(
        builder: (context) => TextButton(
          onPressed: () => mostrarComentarios(
            context,
            social: servidor.servico,
            perfil: _perfil,
            atividade: atividade,
            aoComentar: () => eventos.add('comentou'),
          ),
          child: const Text('abrir'),
        ),
      ),
    ),
  );
  await tester.tap(find.text('abrir'));
  await tester.pumpAndSettle();
  return eventos;
}

Future<void> _enviar(WidgetTester tester, String texto) async {
  await tester.enterText(find.byType(TextField), texto);
  await tester.pump();
  await tester.tap(find.bySemanticsLabel('Enviar comentário'));
  await tester.pumpAndSettle();
}

double _recuoDe(WidgetTester tester, String texto) => tester.getTopLeft(find.text(texto)).dx;

void main() {
  testWidgets('lista as raízes com o resumo da atividade e expande e oculta respostas', (tester) async {
    await _abrir(tester, _Servidor());

    expect(find.text('Comentários'), findsOneWidget);
    expect(find.text('1 comentário'), findsOneWidget);
    expect(find.text('Dandara Lopes começou a ler'), findsOneWidget);
    expect(find.text('Que leitura.'), findsOneWidget);

    await tester.tap(find.text('Ver 1 resposta'));
    await tester.pumpAndSettle();
    expect(find.text('@dandara concordo'), findsOneWidget);

    await tester.tap(find.text('Ocultar respostas'));
    await tester.pumpAndSettle();
    expect(find.text('@dandara concordo'), findsNothing);
  });

  testWidgets('responder a uma resposta pré-preenche a menção e fica no mesmo recuo', (tester) async {
    final servidor = _Servidor();
    final eventos = await _abrir(tester, servidor);
    await tester.tap(find.text('Ver 1 resposta'));
    await tester.pumpAndSettle();

    await tester.tap(find.bySemanticsLabel('Responder a Júlia Wenceslau'));
    await tester.pumpAndSettle();

    expect(find.text('Respondendo a Júlia'), findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, '@juwences ');

    await _enviar(tester, '@juwences eu também');

    expect(jsonDecode(servidor.posts.single.body), <String, Object?>{
      'texto': '@juwences eu também',
      'comentarioRespondidoId': 'r1',
    });
    expect(servidor.posts.single.headers['Idempotency-Key'], isNotEmpty);
    expect(find.text('@juwences eu também'), findsOneWidget);
    expect(_recuoDe(tester, '@juwences eu também'), _recuoDe(tester, '@dandara concordo'));
    expect(find.text('Respondendo a Júlia'), findsNothing);
    expect(eventos, <String>['comentou']);
  });

  testWidgets('cancelar a resposta limpa o campo e a barra de contexto', (tester) async {
    await _abrir(tester, _Servidor());

    await tester.tap(find.bySemanticsLabel('Responder a Dandara Lopes'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Cancelar resposta'));
    await tester.pumpAndSettle();

    expect(find.text('Respondendo a Dandara'), findsNothing);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, isEmpty);
  });

  testWidgets('comentário-raiz entra no fim da lista sem recarregar', (tester) async {
    final servidor = _Servidor();
    final eventos = await _abrir(tester, servidor);

    await _enviar(tester, 'Quero ler também');

    expect(jsonDecode(servidor.posts.single.body), <String, Object?>{'texto': 'Quero ler também'});
    expect(find.text('Quero ler também'), findsOneWidget);
    expect(find.text('2 comentários'), findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, isEmpty);
    expect(eventos, <String>['comentou']);
  });

  testWidgets('429 mostra o aviso, mantém o texto e desabilita o campo', (tester) async {
    final servidor = _Servidor()
      ..aoPostar = (_) => erro(429, 'LIMITE_EXCEDIDO', 'Muitas requisições.');
    final eventos = await _abrir(tester, servidor);

    await _enviar(tester, 'Mais um comentário');

    expect(
      find.text('Muitos comentários seguidos. Espere alguns minutos para comentar de novo.'),
      findsOneWidget,
    );
    final campo = tester.widget<TextField>(find.byType(TextField));
    expect(campo.controller!.text, 'Mais um comentário');
    expect(campo.enabled, isFalse);
    expect(eventos, isEmpty);
  });

  testWidgets('sem comentários mostra o convite, sem botão', (tester) async {
    await _abrir(tester, _Servidor(raizes: <Map<String, Object?>>[]), comentarios: 0);

    expect(find.text('Nenhum comentário'), findsOneWidget);
    expect(find.text('Seja o primeiro a comentar esta atividade.'), findsOneWidget);
  });

  testWidgets('erro ao carregar mostra o banner e Tentar de novo recarrega', (tester) async {
    await _abrir(tester, _Servidor(falharLista: true));

    expect(
      find.text('Não foi possível carregar os comentários. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );

    await tester.tap(find.text('Tentar de novo'));
    await tester.pumpAndSettle();

    expect(find.text('Que leitura.'), findsOneWidget);
  });
}
