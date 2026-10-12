import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/livros/livro_oficial_page.dart';
import 'package:le_ai_mobile/design/widgets/botao_secundario.dart';
import 'package:le_ai_mobile/features/recomendacoes/recomendar_livro_page.dart';

import '../feed/apoio.dart';
import '../livros/apoio.dart' show acervoSimulado, leituraSimulada, semAvaliacao, usarTelaDeCelular;

const String _livroId = 'b0a1c2d3-0000-4000-8000-000000000001';

Map<String, Object?> _candidato(
  String id,
  String nome,
  String username, {
  bool jaTemLivro = false,
  bool limite = false,
}) => <String, Object?>{
  'leitor': autorJson(id: id, username: username, nome: nome),
  'jaTemLivro': jaTemLivro,
  'limiteAtingido': limite,
};

final List<Map<String, Object?>> _mutuos = <Map<String, Object?>>[
  _candidato('u-bia', 'Beatriz Okada', 'biaokada', jaTemLivro: true),
  _candidato('u-caio', 'Caio Rezende', 'caiorezende'),
  _candidato('u-dani', 'Daniel Ferraz', 'danielferraz', limite: true),
  _candidato('u-ju', 'Júlia Figueiredo', 'juliafigueiredo'),
  _candidato('u-li', 'Lívia Carvalho', 'liviacarvalho'),
];

Map<String, Object?> _resultado(String id, {String? motivo}) => <String, Object?>{
  'destinatarioId': id,
  'status': motivo == null ? 'CRIADA' : 'BLOQUEADA',
  'recomendacaoId': motivo == null ? 'r-$id' : null,
  'motivo': motivo,
};

const LivroRecomendado _livro = LivroRecomendado(
  id: _livroId,
  titulo: 'Torto Arado',
  autor: 'Itamar Vieira Junior',
  detalhes: 'Todavia · 2019 · 264 páginas',
  capaUrl: null,
);

void main() {
  late List<http.Request> envios;
  late int buscas;

  Future<void> montar(
    WidgetTester tester, {
    Future<http.Response> Function()? candidatos,
    List<Future<http.Response> Function()> respostasDoEnvio = const [],
  }) async {
    usarTelaDeCelular(tester);
    envios = <http.Request>[];
    buscas = 0;
    var envio = 0;
    await tester.pumpWidget(
      envolver(
        RecomendarLivroPage(
          social: socialSimulado((request) async {
            if (request.url.path == '/recomendacoes/candidatos') {
              return (candidatos ?? () async => json(<String, Object?>{'itens': _mutuos}, 200))();
            }
            envios.add(request);
            return respostasDoEnvio[envio++]();
          }),
          livro: _livro,
          aoBuscarLeitores: () => buscas++,
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Finder linha(String inicio) => find.byWidgetPredicate(
    (widget) => widget is Semantics && (widget.properties.label?.startsWith(inicio) ?? false),
  );

  testWidgets('mostra o motivo de quem não pode receber e não deixa escolher essa pessoa', (
    tester,
  ) async {
    await montar(tester);

    expect(find.text('Já tem esse livro em sua estante'), findsOneWidget);
    expect(find.text('Limite de recomendações para esta pessoa'), findsOneWidget);
    expect(find.text('Nenhum escolhido'), findsOneWidget);

    await tocar(tester, find.text('Beatriz Okada'));
    expect(find.text('Nenhum escolhido'), findsOneWidget);
    expect(find.text('Enviar recomendação'), findsOneWidget);
  });

  testWidgets('a busca ignora acento e @, e quem foi escolhido continua escolhido', (tester) async {
    await montar(tester);
    await tocar(tester, find.text('Júlia Figueiredo'));

    await tester.enterText(find.widgetWithText(TextField, 'Nome ou @username'), '@livia');
    await tester.pump();

    expect(find.text('Lívia Carvalho'), findsOneWidget);
    expect(find.text('Caio Rezende'), findsNothing);
    expect(find.text('1 escolhido'), findsOneWidget);
    expect(find.text('Enviar para 1 leitor'), findsOneWidget);
  });

  testWidgets('mensagem acima de 280 caracteres troca o helper pelo erro e bloqueia o envio', (
    tester,
  ) async {
    await montar(tester);
    await tocar(tester, find.text('Caio Rezende'));

    await tester.enterText(
      find.widgetWithText(TextField, 'Conte por que esse livro combina com a pessoa'),
      'a' * 281,
    );
    await tester.pump();

    expect(find.text('A mensagem passou do limite de 280 caracteres.'), findsOneWidget);
    expect(find.text('281 de 280 caracteres'), findsOneWidget);
    await tocar(tester, find.text('Enviar para 1 leitor'));
    expect(envios, isEmpty);
  });

  testWidgets('envio em parte mantém a tela, diz quem não recebeu e troca o botão por Concluir', (
    tester,
  ) async {
    await montar(
      tester,
      respostasDoEnvio: <Future<http.Response> Function()>[
        () async => json(<String, Object?>{
          'resultados': <Object?>[_resultado('u-caio', motivo: 'JA_TEM_LIVRO'), _resultado('u-ju')],
          'totalCriadas': 1,
        }, 200),
      ],
    );
    await tocar(tester, find.text('Caio Rezende'));
    await tocar(tester, find.text('Júlia Figueiredo'));
    await tester.pump();

    await tocar(tester, find.text('Enviar para 2 leitores'));
    await tester.pumpAndSettle();

    expect(
      find.text(
        'Recomendação enviada para Júlia Figueiredo. Caio Rezende já tem esse livro em sua estante e '
        'não recebeu.',
      ),
      findsOneWidget,
    );
    expect(find.text('Recomendação enviada'), findsOneWidget);
    expect(linha('Caio Rezende, já tem esse livro'), findsOneWidget);
    expect(find.text('Concluir'), findsOneWidget);
    expect(jsonDecode(envios.single.body), <String, Object?>{
      'livroId': _livroId,
      'destinatarios': <String>['u-caio', 'u-ju'],
    });
  });

  testWidgets(
    'limite de frequência avisa sem perder a escolha; a nova tentativa usa a mesma chave',
    (tester) async {
      await montar(
        tester,
        respostasDoEnvio: <Future<http.Response> Function()>[
          () async => erro(429, 'MUITAS_REQUISICOES', 'Muitas recomendações em pouco tempo.'),
          () async => erro(429, 'MUITAS_REQUISICOES', 'Muitas recomendações em pouco tempo.'),
        ],
      );
      await tocar(tester, find.text('Caio Rezende'));
      await tester.pump();

      await tocar(tester, find.text('Enviar para 1 leitor'));
      await tester.pumpAndSettle();
      expect(
        find.textContaining('Você enviou muitas recomendações em pouco tempo.'),
        findsOneWidget,
      );
      expect(find.text('Enviar para 1 leitor'), findsOneWidget);

      await tocar(tester, find.text('Enviar para 1 leitor'));
      await tester.pumpAndSettle();
      expect(envios[1].headers['Idempotency-Key'], envios[0].headers['Idempotency-Key']);
    },
  );

  testWidgets('falha ao carregar os leitores oferece tentar de novo', (tester) async {
    var tentativas = 0;
    await montar(
      tester,
      candidatos: () async => tentativas++ == 0
          ? erro(500, 'ERRO_INTERNO', 'Falhou.')
          : json(<String, Object?>{'itens': _mutuos}, 200),
    );

    expect(find.textContaining('Não foi possível carregar seus leitores.'), findsOneWidget);
    await tocar(tester, find.text('Tentar de novo'));
    await tester.pumpAndSettle();

    expect(find.text('Caio Rezende'), findsOneWidget);
  });

  testWidgets('sem mútuos explica a regra, esconde o envio e leva à busca de leitores', (
    tester,
  ) async {
    await montar(
      tester,
      candidatos: () async => json(<String, Object?>{'itens': <Object?>[]}, 200),
    );

    expect(find.text('Ninguém para recomendar ainda'), findsOneWidget);
    expect(find.text('Enviar recomendação'), findsNothing);
    await tocar(tester, find.text('Buscar leitores'));
    await tester.pumpAndSettle();

    expect(buscas, 1);
  });

  testWidgets('fechar com alguém escolhido pede confirmação antes de descartar', (tester) async {
    await montar(tester);
    await tocar(tester, find.text('Caio Rezende'));

    await tester.tap(find.bySemanticsLabel('Fechar'));
    await tester.pumpAndSettle();

    expect(find.text('Descartar esta recomendação?'), findsOneWidget);
    expect(find.text('Continuar editando'), findsOneWidget);
  });

  testWidgets('o item do menu Mais ações também abre a tela de recomendar', (tester) async {
    usarTelaDeCelular(tester);
    await tester.pumpWidget(
      envolver(
        LivroOficialPage(
          servico: acervoSimulado((request) async => json(_livroDoAcervo, 200)),
          leitura: leituraSimulada((_) async => json(semAvaliacao(_livroId), 200)),
          livroId: _livroId,
          aoVoltar: () {},
          social: socialSimulado((request) async => json(<String, Object?>{'itens': _mutuos}, 200)),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.bySemanticsLabel('Mais ações'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Recomendar a um leitor').last);
    await tester.pumpAndSettle();

    expect(find.byType(RecomendarLivroPage), findsOneWidget);
  });

  testWidgets('pela página do livro: menu, envio aceito para todos e aviso com os nomes', (
    tester,
  ) async {
    usarTelaDeCelular(tester);
    final enviados = <http.Request>[];
    await tester.pumpWidget(
      envolver(
        LivroOficialPage(
          servico: acervoSimulado((request) async => json(_livroDoAcervo, 200)),
          leitura: leituraSimulada((_) async => json(semAvaliacao(_livroId), 200)),
          livroId: _livroId,
          aoVoltar: () {},
          social: socialSimulado((request) async {
            if (request.url.path == '/recomendacoes/candidatos') {
              return json(<String, Object?>{'itens': _mutuos}, 200);
            }
            enviados.add(request);
            return json(<String, Object?>{
              'resultados': <Object?>[_resultado('u-caio'), _resultado('u-ju')],
              'totalCriadas': 2,
            }, 200);
          }),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(BotaoSecundario, 'Recomendar a um leitor'));
    await tester.pumpAndSettle();
    expect(find.text('Recomendar'), findsOneWidget);

    await tocar(tester, find.text('Caio Rezende'));
    await tocar(tester, find.text('Júlia Figueiredo'));
    await tester.pump();
    await tocar(tester, find.text('Enviar para 2 leitores'));
    await tester.pumpAndSettle();

    expect(find.byType(RecomendarLivroPage), findsNothing);
    expect(enviados, hasLength(1));
    expect(find.text('Recomendação enviada para Caio Rezende e Júlia Figueiredo.'), findsOneWidget);
  });
}

final Map<String, Object?> _livroDoAcervo = <String, Object?>{
  'id': _livroId,
  'titulo': 'Torto Arado',
  'autores': <Object?>[
    <String, String>{'id': 'a1', 'nome': 'Itamar Vieira Junior'},
  ],
  'editora': 'Todavia',
  'anoPublicacao': 2019,
  'paginas': 264,
  'capa': <String, Object?>{'url': null, 'origem': 'placeholder'},
  'assuntos': <Object?>[],
  'isbn': '9788588808911',
  'sinopse': <String, Object?>{'status': 'ausente', 'texto': null},
  'resenhas': <String, Object?>{'itens': <Object?>[], 'limit': 10, 'proximoCursor': null},
};
