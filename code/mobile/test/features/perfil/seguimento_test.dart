import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/perfil/buscar_leitor_page.dart';
import 'package:le_ai_mobile/features/perfil/conexoes_page.dart';
import 'package:le_ai_mobile/features/perfil/perfil_de_outro_page.dart';
import 'package:le_ai_mobile/features/perfil/perfil_page.dart';
import 'package:le_ai_mobile/features/perfil/perfil_service.dart';
import 'package:le_ai_mobile/features/perfil/solicitacoes_page.dart';
import 'package:le_ai_mobile/features/perfil/textos.dart';

import '../livros/apoio.dart';

PerfilService _servico(Future<http.Response> Function(http.Request) handler) => PerfilService(
  ApiClient(
    baseUrl: 'https://identidade.example.com',
    client: MockClient(handler),
    esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
  ),
);

Map<String, Object?> _resumo(
  String username,
  String displayName, {
  String privacidade = 'publico',
  String relacao = 'nenhuma',
  String? biografia,
}) => <String, Object?>{
  'id': 'id-$username',
  'username': username,
  'displayName': displayName,
  'biografia': ?biografia,
  'avatarUrl': null,
  'privacidade': privacidade,
  'conteudoRestrito': false,
  'relacao': relacao,
};

Map<String, Object?> _perfil(
  String username,
  String displayName, {
  String privacidade = 'publico',
  String relacao = 'nenhuma',
  bool restrito = false,
  int seguidores = 212,
}) => <String, Object?>{
  ..._resumo(username, displayName, privacidade: privacidade, relacao: relacao),
  'conteudoRestrito': restrito,
  'biografia': 'Professor de história.',
  'contadores': <String, Object?>{'seguidores': seguidores, 'seguidos': 148},
};

Map<String, Object?> _pagina(List<Map<String, Object?>> itens, {int? total, int paginas = 1}) =>
    <String, Object?>{
      'items': itens,
      'page': 0,
      'size': 20,
      'totalElements': total ?? itens.length,
      'totalPages': itens.isEmpty ? 0 : paginas,
    };

void main() {
  group('textos', () {
    test('primeiro nome, contagem e tempo de espera', () {
      expect(primeiroNome('  Nadia Sampaio '), 'Nadia');
      expect(contagem(1, 'solicitação', 'solicitações'), '1 solicitação');
      final agora = DateTime.utc(2026, 9, 24, 12);
      expect(tempoDeEspera(agora.subtract(const Duration(seconds: 20)), agora), 'agora');
      expect(tempoDeEspera(agora.subtract(const Duration(hours: 2)), agora), 'há 2 horas');
      expect(tempoDeEspera(agora.subtract(const Duration(days: 3)), agora), 'há 3 dias');
      expect(tempoDeEspera(agora.subtract(const Duration(days: 7)), agora), 'há 1 semana');
      expect(tempoDeEspera(agora.subtract(const Duration(days: 61)), agora), 'há 2 meses');
    });
  });

  group('BuscarLeitorPage', () {
    Future<List<http.Request>> montar(
      WidgetTester tester,
      http.Response Function() resposta, {
      void Function(String)? aoAbrir,
    }) async {
      final pedidos = <http.Request>[];
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          BuscarLeitorPage(
            servico: _servico((request) async {
              pedidos.add(request);
              return resposta();
            }),
            aoAbrirPerfil: aoAbrir ?? (_) {},
          ),
        ),
      );
      return pedidos;
    }

    testWidgets('aterrissagem ensina a regra; encontrado abre o perfil', (tester) async {
      String? aberto;
      final pedidos = await montar(
        tester,
        () => json(<Object?>[_resumo('rafaokamoto', 'Rafael Okamoto')], 200),
        aoAbrir: (u) => aberto = u,
      );

      expect(find.text('Busque pelo nome de usuário'), findsOneWidget);
      await tester.enterText(find.byType(TextField), '@rafaokamoto ');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();

      expect(pedidos.single.url.queryParameters['username'], 'rafaokamoto');
      expect(find.text('Rafael Okamoto'), findsOneWidget);
      expect(find.text('Seguir'), findsNothing);
      await tester.tap(find.text('Rafael Okamoto'));
      expect(aberto, 'rafaokamoto');
    });

    testWidgets('vazio fala da busca; formato inválido não consulta', (tester) async {
      final pedidos = await montar(tester, () => json(<Object?>[], 200));

      await tester.enterText(find.byType(TextField), 'ra');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pump();
      expect(find.textContaining('Digite o nome de usuário completo'), findsOneWidget);
      expect(pedidos, isEmpty);

      await tester.enterText(find.byType(TextField), 'rafa');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(find.text('Nenhum leitor com esse nome de usuário'), findsOneWidget);
    });

    testWidgets('card traz chip, biografia em duas linhas e a ilustração do leitor', (tester) async {
      await montar(
        tester,
        () => json(<Object?>[
          _resumo(
            'rafaokamoto',
            'Rafael Okamoto',
            privacidade: 'privado',
            biografia: 'Professor de história. Anoto tudo na margem.',
          ),
        ], 200),
      );

      await tester.enterText(find.byType(TextField), 'rafaokamoto');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();

      expect(find.text('Perfil privado'), findsOneWidget);
      final bio = tester.widget<Text>(find.text('Professor de história. Anoto tudo na margem.'));
      expect(bio.maxLines, 2);
      expect(bio.overflow, TextOverflow.ellipsis);
      expect(find.byKey(const ValueKey<String>('ilustracao-leitor-encontrado')), findsOneWidget);
    });

    testWidgets('nenhum leitor mostra a arte no lugar do ícone', (tester) async {
      await montar(tester, () => json(<Object?>[], 200));

      await tester.enterText(find.byType(TextField), 'rafaokamoto');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();

      expect(
        find.byWidgetPredicate(
          (w) =>
              w is SvgPicture &&
              w.bytesLoader is SvgAssetLoader &&
              (w.bytesLoader as SvgAssetLoader).assetName == 'assets/ilustracoes/nenhum-leitor.svg',
        ),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey<String>('ilustracao-leitor-encontrado')), findsNothing);
    });

    testWidgets('limite de buscas mostra a frase do servidor', (tester) async {
      await montar(
        tester,
        () => erro(429, 'MUITAS_REQUISICOES', 'Muitas buscas em pouco tempo. Tente de novo em instantes.'),
      );

      await tester.enterText(find.byType(TextField), 'rafaokamoto');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();

      expect(find.text('Muitas buscas em pouco tempo. Tente de novo em instantes.'), findsOneWidget);
      expect(find.text('Tentar de novo'), findsOneWidget);
    });
  });

  group('PerfilDeOutroPage', () {
    late List<http.Request> pedidos;
    var proprio = 0;
    var buscar = 0;

    setUp(() {
      pedidos = <http.Request>[];
      proprio = 0;
      buscar = 0;
    });

    Future<void> montar(
      WidgetTester tester,
      Map<String, Object?> perfil, {
      http.Response Function(http.Request)? escrita,
    }) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          PerfilDeOutroPage(
            servico: _servico((request) async {
              pedidos.add(request);
              if (request.method == 'GET') {
                return json(perfil, 200);
              }
              return escrita?.call(request) ?? http.Response('', 204);
            }),
            username: perfil['username']! as String,
            aoAbrirProprioPerfil: () => proprio++,
            aoBuscarLeitor: () => buscar++,
            aoAbrirSolicitacoes: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('público: Seguir é imediato e conta mais um seguidor', (tester) async {
      await montar(
        tester,
        _perfil('rafaokamoto', 'Rafael Okamoto'),
        escrita: (_) => json(<String, Object?>{'estado': 'seguindo', 'solicitacaoId': null}, 201),
      );

      expect(find.text('Perfil público'), findsOneWidget);
      expect(find.text('Este perfil é privado'), findsNothing);
      await tocar(tester, find.text('Seguir'));
      await tester.pumpAndSettle();

      expect(pedidos.last.method, 'POST');
      expect(pedidos.last.url.path, '/perfis/rafaokamoto/seguir');
      expect(pedidos.last.headers['Idempotency-Key'], isNotEmpty);
      expect(find.text('Seguindo'), findsOneWidget);
      expect(find.bySemanticsLabel('213 seguidores'), findsOneWidget);
    });

    testWidgets('privado: restrição sem erro, e o pedido fica aguardando', (tester) async {
      await montar(
        tester,
        _perfil('bia.nogueira', 'Beatriz Nogueira', privacidade: 'privado', restrito: true),
        escrita: (_) => json(<String, Object?>{'estado': 'solicitacao_pendente', 'solicitacaoId': 's1'}, 201),
      );

      expect(find.text('Envie uma solicitação para ver a estante e as resenhas de Beatriz.'), findsOneWidget);
      await tocar(tester, find.text('Solicitar para seguir'));
      await tester.pumpAndSettle();

      expect(find.text('Solicitação enviada'), findsOneWidget);
      expect(find.text('Sua solicitação está aguardando resposta.'), findsOneWidget);
    });

    testWidgets('seguindo: desfazer pede confirmação, sem pronome de gênero', (tester) async {
      await montar(
        tester,
        _perfil('bia.nogueira', 'Beatriz Nogueira', privacidade: 'privado', relacao: 'seguindo'),
      );

      expect(find.text('Você vê este perfil porque segue Beatriz.'), findsOneWidget);
      await tocar(tester, find.text('Seguindo'));
      await tester.pumpAndSettle();
      expect(find.text('Deixar de seguir Beatriz?'), findsOneWidget);
      expect(find.textContaining('As atividades dessa pessoa saem do seu feed, e você perde'), findsOneWidget);

      await tester.tap(find.text('Deixar de seguir'));
      await tester.pumpAndSettle();

      expect(pedidos.last.method, 'DELETE');
      expect(find.text('Solicitar para seguir'), findsOneWidget);
      expect(find.text('Este perfil é privado'), findsOneWidget);
    });

    testWidgets('pedido recebido mostra a linha para a caixa', (tester) async {
      await montar(tester, _perfil('rafaokamoto', 'Rafael Okamoto', relacao: 'solicitacao_recebida'));

      expect(find.text('Rafael pediu para seguir você.'), findsOneWidget);
      expect(find.text('Seguir'), findsOneWidget);
    });

    testWidgets('o próprio username abre o próprio perfil', (tester) async {
      await montar(tester, _perfil('marinableu', 'Marina Beltrão', relacao: 'proprio'));
      expect(proprio, 1);
    });

    testWidgets('404 é "Perfil não encontrado", com Buscar leitor', (tester) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          PerfilDeOutroPage(
            servico: _servico((_) async => erro(404, 'RECURSO_NAO_ENCONTRADO', 'Não encontramos esse leitor.')),
            username: 'ninguem',
            aoAbrirProprioPerfil: () => proprio++,
            aoBuscarLeitor: () => buscar++,
            aoAbrirSolicitacoes: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Perfil não encontrado'), findsOneWidget);
      await tester.tap(find.text('Buscar leitor'));
      expect(buscar, 1);
    });
  });

  group('ConexoesPage', () {
    testWidgets('abas com contagens; remover confirma com a consequência e tira da lista', (tester) async {
      final pedidos = <http.Request>[];
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          ConexoesPage(
            servico: _servico((request) async {
              pedidos.add(request);
              if (request.url.path == '/me/seguidores') {
                return json(_pagina(<Map<String, Object?>>[_resumo('caio', 'Caio Ferraz')], total: 84), 200);
              }
              if (request.url.path == '/me/seguidos') {
                return json(_pagina(<Map<String, Object?>>[], total: 0), 200);
              }
              return http.Response('', 204);
            }),
            aoAbrirPerfil: (_) {},
            aoBuscarLeitor: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.bySemanticsLabel('Seguidores 84'), findsOneWidget);
      expect(find.bySemanticsLabel('Seguindo 0'), findsOneWidget);
      await tester.tap(find.bySemanticsLabel('Remover Caio Ferraz dos seus seguidores'));
      await tester.pumpAndSettle();
      expect(find.text('Remover Caio dos seus seguidores?'), findsOneWidget);
      expect(find.textContaining('Essa pessoa deixa de seguir você'), findsOneWidget);

      await tester.tap(find.widgetWithText(OutlinedButton, 'Remover').last);
      await tester.pumpAndSettle();

      expect(pedidos.last.method, 'DELETE');
      expect(pedidos.last.url.path, '/seguidores/caio');
      expect(find.text('Caio Ferraz'), findsNothing);
      expect(find.bySemanticsLabel('Seguidores 83'), findsOneWidget);
    });

    testWidgets('a linha mostra a biografia numa linha só, e nada quando não há', (tester) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          ConexoesPage(
            servico: _servico((request) async {
              if (request.url.path == '/me/seguidores') {
                return json(
                  _pagina(<Map<String, Object?>>[
                    _resumo('caio', 'Caio Ferraz', biografia: 'Leio no busão. Terror nacional.'),
                    _resumo('nadia', 'Nadia Sampaio'),
                  ]),
                  200,
                );
              }
              return json(_pagina(<Map<String, Object?>>[]), 200);
            }),
            aoAbrirPerfil: (_) {},
            aoBuscarLeitor: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();

      final bio = tester.widget<Text>(find.text('Leio no busão. Terror nacional.'));
      expect(bio.maxLines, 1);
      expect(bio.overflow, TextOverflow.ellipsis);
      expect(find.byKey(const ValueKey<String>('biografia-da-linha')), findsOneWidget);
    });

    testWidgets('aba seguidos vazia oferece Buscar leitor', (tester) async {
      var buscar = 0;
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          ConexoesPage(
            servico: _servico((_) async => json(_pagina(<Map<String, Object?>>[]), 200)),
            abaInicial: AbaDeConexoes.seguidos,
            aoAbrirPerfil: (_) {},
            aoBuscarLeitor: () => buscar++,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Você ainda não segue ninguém'), findsOneWidget);
      await tester.tap(find.text('Buscar leitor'));
      expect(buscar, 1);
    });

    testWidgets('mais de uma página: Carregar mais acrescenta no fim', (tester) async {
      var paginaPedida = -1;
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          ConexoesPage(
            servico: _servico((request) async {
              if (request.url.path == '/me/seguidos') {
                return json(_pagina(<Map<String, Object?>>[]), 200);
              }
              paginaPedida = int.parse(request.url.queryParameters['page']!);
              return json(
                _pagina(
                  <Map<String, Object?>>[
                    paginaPedida == 0 ? _resumo('caio', 'Caio Ferraz') : _resumo('otavio', 'Otávio Brandão'),
                  ],
                  total: 21,
                  paginas: 2,
                ),
                200,
              );
            }),
            aoAbrirPerfil: (_) {},
            aoBuscarLeitor: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Carregar mais'));
      await tester.pumpAndSettle();

      expect(paginaPedida, 1);
      expect(find.text('Caio Ferraz'), findsOneWidget);
      expect(find.text('Otávio Brandão'), findsOneWidget);
    });
  });

  group('SolicitacoesPage', () {
    Map<String, Object?> pedido(String id, String nome) => <String, Object?>{
      'id': id,
      'criadaEm': DateTime.now().toUtc().subtract(const Duration(hours: 2)).toIso8601String(),
      'solicitante': _resumo(id, nome, relacao: 'solicitacao_recebida'),
    };

    Future<List<http.Request>> montar(
      WidgetTester tester,
      List<Map<String, Object?>> itens, {
      String privacidade = 'privado',
    }) async {
      final pedidos = <http.Request>[];
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          SolicitacoesPage(
            servico: _servico((request) async {
              pedidos.add(request);
              if (request.url.path == '/solicitacoes') {
                return json(_pagina(itens), 200);
              }
              if (request.url.path == '/me/perfil') {
                return json(_perfil('marinableu', 'Marina', privacidade: privacidade, relacao: 'proprio'), 200);
              }
              return http.Response('', 204);
            }),
            aoAbrirPerfil: (_) {},
            aoEditarPerfil: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      return pedidos;
    }

    testWidgets('contagem, efeito e aceitar sem modal que mostra Aceito e sai', (tester) async {
      final pedidos = await montar(tester, <Map<String, Object?>>[
        pedido('caio', 'Caio Ferraz'),
        pedido('nadia', 'Nadia Sampaio'),
      ]);

      expect(find.text('2 solicitações'), findsOneWidget);
      expect(find.text('Quem você aceitar passa a ver sua estante, suas notas e suas resenhas.'), findsOneWidget);
      expect(find.text('há 2 horas'), findsNWidgets(2));

      await tester.tap(find.bySemanticsLabel('Aceitar solicitação de Caio Ferraz'));
      await tester.pump();
      await tester.pump();

      expect(pedidos.last.url.path, '/solicitacoes/caio/aceitar');
      expect(find.text('Aceito'), findsOneWidget);
      expect(find.text('1 solicitação'), findsOneWidget);
      expect(find.byType(Dialog), findsNothing);

      await tester.pump(const Duration(seconds: 1));
      await tester.pumpAndSettle();
      expect(find.text('Caio Ferraz'), findsNothing);
      expect(find.text('1 solicitação'), findsOneWidget);
    });

    testWidgets('recusar passa pelo modal que diz que não há aviso', (tester) async {
      final pedidos = await montar(tester, <Map<String, Object?>>[pedido('nadia', 'Nadia Sampaio')]);

      await tester.tap(find.bySemanticsLabel('Recusar solicitação de Nadia Sampaio'));
      await tester.pumpAndSettle();
      expect(find.text('Recusar a solicitação de Nadia?'), findsOneWidget);
      expect(find.textContaining('a pessoa não recebe aviso'), findsOneWidget);

      await tester.tap(find.widgetWithText(OutlinedButton, 'Recusar').last);
      await tester.pumpAndSettle();

      expect(pedidos.last.url.path, '/solicitacoes/nadia/recusar');
      expect(find.text('Nadia Sampaio'), findsNothing);
    });

    testWidgets('vazio com perfil público explica que pedidos só existem em privado', (tester) async {
      await montar(tester, <Map<String, Object?>>[], privacidade: 'publico');

      expect(find.text('Nenhuma solicitação pendente'), findsOneWidget);
      expect(find.textContaining('Pedidos só existem em perfil privado.'), findsOneWidget);
      expect(find.text('Editar perfil'), findsOneWidget);
    });
  });

  group('PerfilPage com seguimento', () {
    testWidgets('contadores abrem as abas e pedidos pendentes têm linha própria', (tester) async {
      final abertas = <AbaDeConexoes>[];
      var caixa = 0;
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          PerfilPage(
            servico: _servico((request) async {
              if (request.url.path == '/solicitacoes') {
                expect(request.url.queryParameters['size'], '1');
                return json(_pagina(<Map<String, Object?>>[], total: 3, paginas: 3), 200);
              }
              return json(_perfil('marinableu', 'Marina Beltrão', relacao: 'proprio', seguidores: 84), 200);
            }),
            aoAbrirConexoes: (aba) async => abertas.add(aba),
            aoAbrirSolicitacoes: () async => caixa++,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.bySemanticsLabel('3 solicitações para seguir você'), findsOneWidget);
      await tester.tap(find.bySemanticsLabel('84 seguidores'));
      await tester.pumpAndSettle();
      await tester.tap(find.bySemanticsLabel('148 seguindo'));
      await tester.pumpAndSettle();
      await tocar(tester, find.bySemanticsLabel('3 solicitações para seguir você'));
      await tester.pumpAndSettle();

      expect(abertas, <AbaDeConexoes>[AbaDeConexoes.seguidores, AbaDeConexoes.seguidos]);
      expect(caixa, 1);
    });
  });
}
