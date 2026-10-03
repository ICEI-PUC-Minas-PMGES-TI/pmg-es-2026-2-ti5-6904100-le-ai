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
  final List<http.Request> edicoes = <http.Request>[];
  http.Response Function(http.Request)? aoPostar;
  http.Response Function(http.Request)? aoEditarOuExcluir;
  bool falharLista;

  _Servidor({List<Map<String, Object?>>? raizes, this.falharLista = false})
    : raizes = raizes ?? <Map<String, Object?>>[_raiz];

  SocialService get servico => socialSimulado((request) async {
    if (request.method == 'PATCH' || request.method == 'DELETE') {
      edicoes.add(request);
      return aoEditarOuExcluir!(request);
    }
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

/// Com [dentroDeAba], o botão fica num navegador aninhado no corpo de um `Scaffold`, abaixo de um
/// cabeçalho de 72px, como o feed dentro do shell.
Future<List<String>> _abrir(
  WidgetTester tester,
  _Servidor servidor, {
  int comentarios = 1,
  bool dentroDeAba = false,
}) async {
  final eventos = <String>[];
  final atividade = Atividade.fromJson(atividadeJson(comentarios: comentarios));
  final botao = Builder(
    builder: (context) => TextButton(
      onPressed: () => mostrarComentarios(
        context,
        social: servidor.servico,
        perfil: _perfil,
        atividade: atividade,
        aoComentar: () => eventos.add('comentou'),
        aoExcluir: (quantidade) => eventos.add('excluiu $quantidade'),
        aoAbrirPerfil: (username) => eventos.add('perfil $username'),
      ),
      child: const Text('abrir'),
    ),
  );
  await tester.pumpWidget(
    envolver(
      dentroDeAba
          ? Column(
              children: <Widget>[
                const SizedBox(height: 72),
                Expanded(
                  child: Navigator(
                    onGenerateRoute: (_) => MaterialPageRoute<void>(builder: (_) => botao),
                  ),
                ),
              ],
            )
          : botao,
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

  testWidgets('respondendo com o teclado aberto, campo e faixa cabem acima do teclado', (tester) async {
    // Medidas de um S25 Ultra (384 por 832) com a barra de 3 botões e o teclado com a barra de
    // ferramentas.
    tester.view
      ..devicePixelRatio = 1
      ..physicalSize = const Size(384, 832)
      ..padding = const FakeViewPadding(top: 37, bottom: 42);
    addTearDown(tester.view.reset);
    await _abrir(tester, _Servidor(), dentroDeAba: true);

    tester.view.viewInsets = const FakeViewPadding(bottom: 383);
    await tester.tap(find.bySemanticsLabel('Responder a Dandara Lopes'));
    await tester.pumpAndSettle();

    expect(find.text('Respondendo a Dandara'), findsOneWidget);
    expect(tester.getBottomLeft(find.byType(TextField)).dy, lessThanOrEqualTo(832 - 383));
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

  group('comentário próprio (F-SOCIAL-2)', () {
    const texto = 'Por indicação da @nadiasampaio e da @helenaprof.';
    Map<String, Object?> meu({String texto = texto, int totalRespostas = 0, bool editado = false}) =>
        comentarioJson(
          id: 'm1',
          texto: texto,
          totalRespostas: totalRespostas,
          username: 'kayke',
          nome: 'Kayke Eman',
          meu: true,
          editado: editado,
          mencoes: <Map<String, Object?>>[
            <String, Object?>{'posicao': 17, 'comprimento': 13, 'usuarioId': 'u9', 'username': 'nadiasampaio'},
          ],
        );

    Future<void> escolher(WidgetTester tester, String acao) async {
      await tester.tap(find.byTooltip('Ações do seu comentário'));
      await tester.pumpAndSettle();
      await tester.tap(find.text(acao));
      await tester.pumpAndSettle();
    }

    testWidgets('menção resolvida abre o perfil; comentário alheio não tem menu', (tester) async {
      final eventos = await _abrir(tester, _Servidor(raizes: <Map<String, Object?>>[meu(), _raiz]));

      expect(find.byTooltip('Ações do seu comentário'), findsOneWidget);
      final rich = tester.widget<RichText>(
        find.byWidgetPredicate((w) => w is RichText && w.text.toPlainText(includeSemanticsLabels: false) == texto),
      );
      final spans = <TextSpan>[];
      rich.text.visitChildren((span) {
        if (span is TextSpan && span.recognizer != null) {
          spans.add(span);
        }
        return true;
      });
      expect(spans.map((span) => span.text), <String>['@nadiasampaio']);

      (spans.single.recognizer! as dynamic).onTap!();
      await tester.pumpAndSettle();

      expect(eventos, <String>['perfil nadiasampaio']);
      expect(find.text('Comentários'), findsNothing);
    });

    testWidgets('editar troca o texto só depois do servidor e marca editado', (tester) async {
      final servidor = _Servidor(raizes: <Map<String, Object?>>[meu()]);
      servidor.aoEditarOuExcluir = (request) =>
          json(meu(texto: (jsonDecode(request.body) as Map<String, dynamic>)['texto'] as String, editado: true), 200);
      await _abrir(tester, servidor);

      await escolher(tester, 'Editar');
      expect(find.text('Editando comentário'), findsOneWidget);
      expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, texto);
      expect(tester.widget<TextButton>(find.widgetWithText(TextButton, 'Salvar')).onPressed, isNull);

      await tester.enterText(find.byType(TextField), '$texto Obrigado!');
      await tester.pump();
      await tester.tap(find.text('Salvar'));
      await tester.pumpAndSettle();

      expect(servidor.edicoes.single.method, 'PATCH');
      expect(servidor.edicoes.single.url.path, '/comentarios/m1');
      expect(_comentarioComTexto('$texto Obrigado!'), findsOneWidget);
      expect(find.textContaining('· editado', findRichText: true), findsOneWidget);
      expect(find.text('Editando comentário'), findsNothing);
    });

    testWidgets('limite de menções mostra o alerta e preserva o texto', (tester) async {
      final servidor = _Servidor(raizes: <Map<String, Object?>>[meu()]);
      servidor.aoEditarOuExcluir = (_) => erro(429, 'MUITAS_REQUISICOES', 'Muitas menções seguidas.');
      await _abrir(tester, servidor);

      await escolher(tester, 'Editar');
      await tester.enterText(find.byType(TextField), '$texto @ana');
      await tester.pump();
      await tester.tap(find.text('Salvar'));
      await tester.pumpAndSettle();

      expect(find.text('Muitas menções seguidas. Espere alguns minutos para salvar de novo.'), findsOneWidget);
      expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, '$texto @ana');
      expect(_comentarioComTexto(texto), findsOneWidget);
    });

    testWidgets('excluir raiz com resposta confirma, remove as duas e avisa a contagem', (tester) async {
      final servidor = _Servidor(raizes: <Map<String, Object?>>[meu(totalRespostas: 1)]);
      servidor.aoEditarOuExcluir = (_) => http.Response('', 204);
      final eventos = await _abrir(tester, servidor, comentarios: 2);
      await tester.tap(find.text('Ver 1 resposta'));
      await tester.pumpAndSettle();

      await escolher(tester, 'Excluir');
      expect(find.text('Excluir comentário?'), findsOneWidget);
      expect(
        find.text('Seu comentário e a resposta de Júlia Wenceslau serão apagados. Não dá para desfazer.'),
        findsOneWidget,
      );

      await tester.tap(find.text('Excluir comentário'));
      await tester.pumpAndSettle();

      expect(servidor.edicoes.single.method, 'DELETE');
      expect(_comentarioComTexto(texto), findsNothing);
      expect(find.text('@dandara concordo'), findsNothing);
      expect(find.text('Nenhum comentário'), findsOneWidget);
      expect(eventos, <String>['excluiu 2']);
    });

    testWidgets('falha ao excluir mantém o comentário e explica', (tester) async {
      final servidor = _Servidor(raizes: <Map<String, Object?>>[meu()]);
      servidor.aoEditarOuExcluir = (_) => erro(503, 'SERVICO_INDISPONIVEL', 'fora');
      final eventos = await _abrir(tester, servidor);

      await escolher(tester, 'Excluir');
      await tester.tap(find.text('Excluir comentário'));
      await tester.pumpAndSettle();

      expect(_comentarioComTexto(texto), findsOneWidget);
      expect(
        find.text('Não foi possível excluir o comentário. Ele continua publicado. Tente de novo.'),
        findsOneWidget,
      );
      expect(eventos, isEmpty);
    });
  });
}

/// O texto com menção tem o rótulo semântico do link no lugar do `@username`; compara o texto visível.
Finder _comentarioComTexto(String texto) => find.byWidgetPredicate(
  (widget) => widget is RichText && widget.text.toPlainText(includeSemanticsLabels: false) == texto,
);
