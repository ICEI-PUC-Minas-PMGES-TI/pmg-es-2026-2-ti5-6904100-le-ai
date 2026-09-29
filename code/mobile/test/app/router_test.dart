import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:phosphor_icons/phosphor_icons.dart';
import 'package:http/testing.dart';

import 'package:le_ai_mobile/app/barra_inferior.dart';
import 'package:le_ai_mobile/app/cabecalho_tela.dart';
import 'package:le_ai_mobile/app/router.dart';
import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/core/session/session_controller.dart';
import 'package:le_ai_mobile/core/session/token_store.dart';
import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/features/avaliacao/leitura_service.dart';
import 'package:le_ai_mobile/features/auth/auth_service.dart';
import 'package:le_ai_mobile/features/feed/rotas_feed.dart';
import 'package:le_ai_mobile/features/feed/social_service.dart';
import 'package:le_ai_mobile/features/livros/acervo_service.dart';
import 'package:le_ai_mobile/features/livros/capa.dart';
import 'package:le_ai_mobile/features/livros/rotas_livros.dart';
import 'package:le_ai_mobile/features/notificacoes/notificacoes_page.dart';
import 'package:le_ai_mobile/features/notificacoes/notificacoes_service.dart';
import 'package:le_ai_mobile/features/notificacoes/rotas_notificacoes.dart';
import 'package:le_ai_mobile/features/perfil/avatar.dart';
import 'package:le_ai_mobile/features/perfil/perfil_service.dart';
import 'package:le_ai_mobile/features/perfil/rotas_perfil.dart';

import '../features/estante/apoio_estante.dart';

/// Testa a guarda através de um `GoRouter` de verdade dirigido por `router.go()`, em vez de
/// montar um `GoRouterState` à mão: o construtor dele exige uma `RouteConfiguration` interna do
/// pacote, feita para ser montada pelo próprio `GoRouter`, não por um teste. Mais barato e menos
/// frágil do que replicar isso à mão.
class _FakeTokenStore implements TokenStore {
  String? value;

  @override
  Future<String?> read() async => value;

  @override
  Future<void> write(String novo) async {
    value = novo;
  }

  @override
  Future<void> delete() async {
    value = null;
  }
}

class _SemImagem implements SeletorDeImagem {
  @override
  Future<ImagemEscolhida?> escolher() async => null;
}

class _SemEnvio implements EnviadorDeCapa {
  @override
  Future<String> enviar(ImagemEscolhida imagem, {void Function(double)? aoProgredir}) async =>
      throw const FalhaNoEnvioDaCapa();
}

class _SemAvatar implements EnviadorDeAvatar {
  @override
  Future<Avatar> enviar(ImagemEscolhida imagem) async => throw const FalhaNoEnvioDoAvatar();
}

/// `identidade` simulado para a aba Perfil: o perfil próprio em `/me/perfil`, e em
/// `/perfis/<username>` um leitor qualquer que não é quem pergunta.
DependenciasDePerfil _perfilSimulado() => DependenciasDePerfil(
  servico: PerfilService(
    ApiClient(
      baseUrl: 'http://localhost:8080',
      client: MockClient((request) async {
        final segmentos = request.url.pathSegments;
        final outro = segmentos.length == 2 && segmentos.first == 'perfis';
        return http.Response(
          outro
              ? '{"id":"u2","username":"${segmentos.last}","displayName":"Outro Leitor",'
                    '"avatarUrl":null,"privacidade":"publico","conteudoRestrito":false,'
                    '"relacao":"seguindo","biografia":null,'
                    '"contadores":{"seguidores":0,"seguidos":0}}'
              : '{"id":"u1","username":"marinableu","displayName":"Marina Beltrão",'
                    '"avatarUrl":null,"privacidade":"publico","conteudoRestrito":false,'
                    '"relacao":"proprio","biografia":null,'
                    '"contadores":{"seguidores":0,"seguidos":0}}',
          200,
          headers: <String, String>{'content-type': 'application/json; charset=utf-8'},
        );
      }),
    ),
  ),
  seletor: _SemImagem(),
  enviador: _SemAvatar(),
);

/// `social` simulado para a aba Feed: uma atividade de livro pessoal, de outra pessoa.
DependenciasDeFeed _feedSimulado() => DependenciasDeFeed(
  social: SocialService(
    ApiClient(
      baseUrl: 'http://localhost:8081',
      client: MockClient(
        (request) async => http.Response(
          jsonEncode(<String, Object?>{
            'itens': <Object?>[
              <String, Object?>{
                'id': 'a1',
                'tipo': 'LEITURA_INICIADA',
                'autor': <String, Object?>{
                  'id': 'u2',
                  'username': 'caio',
                  'nomeExibicao': 'Caio Ferraz',
                  'avatarUrl': null,
                },
                'livro': <String, Object?>{
                  'id': 'l1',
                  'tipo': 'PESSOAL',
                  'titulo': 'Caderno de Contos do Bairro',
                  'autor': 'Caio Ferraz',
                  'capaUrl': null,
                  'link': <String, Object?>{'livroId': 'l1', 'via': 'feed', 'referenciaId': 'a1'},
                },
                'resenha': null,
                'criadoEm': '2026-09-26T12:00:00Z',
                'totalCurtidas': 0,
                'totalComentarios': 0,
                'curtidaPeloSolicitante': false,
              },
            ],
            'pagina': 0,
            'tamanho': 20,
            'totalItens': 1,
            'totalPaginas': 1,
            'ultima': true,
          }),
          200,
          headers: <String, String>{'content-type': 'application/json; charset=utf-8'},
        ),
      ),
    ),
  ),
);

/// `acervo` simulado por rota: um assunto para a faixa, e toda busca volta vazia, que é o estado
/// que leva aos dois cadastros.
Future<http.Response> _acervoPorRota(http.Request request) async {
  const cabecalhos = <String, String>{'content-type': 'application/json; charset=utf-8'};
  if (request.url.path == '/assuntos') {
    return http.Response(
      '{"itens":[{"id":"a1","nome":"Romance"}]}',
      200,
      headers: cabecalhos,
    );
  }
  if (request.url.path == '/livros') {
    return http.Response(
      '{"itens":[],"page":1,"limit":20,"totalItens":0,"totalPaginas":0}',
      200,
      headers: cabecalhos,
    );
  }
  if (request.url.path == '/livros/livro-1') {
    return http.Response(
      '{"id":"livro-1","titulo":"Torto Arado","autores":[],"editora":null,'
      '"anoPublicacao":2019,"paginas":264,"capa":{"url":null,"origem":"placeholder"},'
      '"assuntos":[],"isbn":"9788588808911","sinopse":{"status":"ausente","texto":null},'
      '"resenhas":{"itens":[],"limit":10,"proximoCursor":null}}',
      200,
      headers: cabecalhos,
    );
  }
  // O livro pessoal aberto pelo feed não faz parte do que se testa aqui: responde como livro
  // inexistente, que a tela sabe mostrar.
  if (request.url.path.startsWith('/livros/pessoal/')) {
    return http.Response(
      '{"codigo":"RECURSO_NAO_ENCONTRADO","mensagem":"Não encontrado."}',
      404,
      headers: cabecalhos,
    );
  }
  return http.Response('{}', 200);
}

/// Digita na busca do Descobrir e espera o debounce até o estado vazio aparecer.
Future<void> _buscarSemResultado(WidgetTester tester) async {
  await tester.tap(find.text('Descobrir'));
  await tester.pumpAndSettle();
  await tester.enterText(find.byType(TextField), 'guimaraes rossa');
  await tester.pump(const Duration(milliseconds: 400));
  await tester.pumpAndSettle();
  expect(find.text('Nenhum livro encontrado'), findsOneWidget);
}

Widget _wrap(GoRouter router) {
  return MaterialApp.router(theme: AppTheme.light(), routerConfig: router);
}

void main() {
  late SessionController sessionController;
  late GoRouter router;

  setUp(() async {
    sessionController = SessionController(_FakeTokenStore());
    await sessionController.load();
    final apiClient = ApiClient(
      baseUrl: 'http://localhost:8080',
      client: MockClient((request) async => http.Response('{}', 200)),
    );
    router = buildRouter(
      sessionController: sessionController,
      authService: AuthService(apiClient),
      perfil: _perfilSimulado(),
      feed: _feedSimulado(),
      estante: estanteVazia(),
      livros: DependenciasDeLivros(
        acervo: AcervoService(
          ApiClient(
            baseUrl: 'http://localhost:3000',
            client: MockClient(_acervoPorRota),
          ),
        ),
        leitura: _leituraSimulada(),
        seletor: _SemImagem(),
        enviador: _SemEnvio(),
      ),
    );
  });

  testWidgets('sem sessao, deep link para rota protegida preserva o destino ate o login resolver', (
    tester,
  ) async {
    await tester.pumpWidget(_wrap(router));
    await tester.pumpAndSettle();
    expect(find.text('Criar conta'), findsOneWidget);

    router.go('/perfil');
    await tester.pumpAndSettle();
    // Ainda sem sessão: a guarda manda de volta para /login, preservando ?destino=/perfil.
    expect(find.text('Criar conta'), findsOneWidget);

    await sessionController.entrar('jwt-valido');
    await tester.pumpAndSettle();
    // refreshListenable reavalia a guarda sozinho: com sessão, /login vira o destino salvo.
    expect(find.text('Marina Beltrão'), findsOneWidget);
  });

  testWidgets('com sessao ativa, ir para /login redireciona para /estante', (tester) async {
    await sessionController.entrar('jwt-valido');
    await tester.pumpWidget(_wrap(router));
    await tester.pumpAndSettle();

    router.go('/login');
    await tester.pumpAndSettle();

    expect(find.text('Sua estante está vazia'), findsOneWidget);
  });

  testWidgets('trocar de aba preserva a pilha de cada branch', (tester) async {
    await sessionController.entrar('jwt-valido');
    await tester.pumpWidget(_wrap(router));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Perfil'));
    await tester.pumpAndSettle();
    expect(find.text('Marina Beltrão'), findsOneWidget);

    // O perfil agora também tem uma seção "Estante"; o toque é na aba da barra inferior.
    await tester.tap(
      find.descendant(of: find.byType(BarraInferior), matching: find.text('Estante')),
    );
    await tester.pumpAndSettle();
    expect(find.text('Sua estante está vazia'), findsOneWidget);
  });

  testWidgets('Descobrir leva ao cadastro por ISBN, que troca o cabeçalho da aba pelo da tela', (
    tester,
  ) async {
    await sessionController.entrar('jwt-valido');
    await tester.pumpWidget(_wrap(router));
    await tester.pumpAndSettle();

    // "Cadastrar por ISBN" só existe no vazio da busca (descobrir.md §4.4), não na aterrissagem.
    await _buscarSemResultado(tester);
    await tester.ensureVisible(find.text('Cadastrar por ISBN'));
    await tester.tap(find.text('Cadastrar por ISBN'));
    await tester.pumpAndSettle();

    expect(find.text('Adicionar livro'), findsOneWidget);
    // Só a barra inferior diz "Descobrir"; o título da aba saiu do cabeçalho.
    expect(find.text('Descobrir'), findsOneWidget);
    expect(find.bySemanticsLabel('Voltar'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Voltar'));
    await tester.pumpAndSettle();
    // A busca continua onde estava: o shell preserva a pilha da aba.
    expect(find.text('Nenhum livro encontrado'), findsOneWidget);
  });

  testWidgets('a página do livro oficial abre dentro da aba Descobrir e volta para ela', (
    tester,
  ) async {
    await sessionController.entrar('jwt-valido');
    await tester.pumpWidget(_wrap(router));
    await tester.pumpAndSettle();

    router.go('/descobrir');
    await tester.pumpAndSettle();
    router.push('/descobrir/livro/livro-1');
    await tester.pumpAndSettle();

    expect(find.text('Este livro ainda não tem sinopse no acervo.'), findsOneWidget);
    expect(find.bySemanticsLabel('Voltar'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Voltar'));
    await tester.pumpAndSettle();
    expect(find.text('Título, autor, editora ou ISBN'), findsOneWidget);
  });

  testWidgets('o cadastro pessoal aberto pelo vazio da busca volta aos resultados ao cancelar', (
    tester,
  ) async {
    await sessionController.entrar('jwt-valido');
    await tester.pumpWidget(_wrap(router));
    await tester.pumpAndSettle();

    await _buscarSemResultado(tester);
    await tester.ensureVisible(find.text('Cadastrar livro pessoal'));
    await tester.tap(find.text('Cadastrar livro pessoal'));
    await tester.pumpAndSettle();
    expect(find.text('Cadastrar livro'), findsOneWidget);

    final cancelar = find.text('Cancelar');
    await tester.ensureVisible(cancelar);
    await tester.tap(cancelar);
    await tester.pumpAndSettle();

    expect(find.text('Nenhum livro encontrado'), findsOneWidget);
    expect(find.text('Adicionar livro'), findsNothing);
  });

  testWidgets('a saída pessoal do ISBN abre o formulário sem campo de ISBN', (tester) async {
    await sessionController.entrar('jwt-valido');
    await tester.pumpWidget(_wrap(router));
    await tester.pumpAndSettle();

    router.go('/descobrir/adicionar-livro');
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Cadastrar livro pessoal'));
    await tester.tap(find.text('Cadastrar livro pessoal'));
    await tester.pumpAndSettle();

    expect(find.text('Cadastrar livro'), findsOneWidget);
    expect(find.text('ISBN'), findsNothing);
  });

  testWidgets(
    'após salvar o livro pessoal, a aba Descobrir volta limpa (sem o formulário preenchido)',
    (tester) async {
      // O shell é um indexedStack: sem zerar a pilha da aba Descobrir ao salvar, o formulário
      // preenchido continuaria vivo e reapareceria ao voltar para a aba. Regressão do bug.
      const idLivro = 'dddddddd-4444-4444-8444-dddddddddddd';
      const livroJson =
          '{"id":"$idLivro","donoId":"eeeeeeee-5555-4555-8555-eeeeeeeeeeee",'
          '"titulo":"Cartas de um sertanejo","autor":"Marina Albuquerque","paginas":184,'
          '"sinopse":null,"capaUrl":null,"modoConsulta":false,"notaDoDono":null,'
          '"resenhaDoDono":null,"dono":null}';

      final roteador = buildRouter(
        sessionController: sessionController,
        authService: AuthService(
          ApiClient(
            baseUrl: 'http://localhost:8080',
            client: MockClient((request) async => http.Response('{}', 200)),
          ),
        ),
        perfil: _perfilSimulado(),
        estante: estanteVazia(),
        livros: DependenciasDeLivros(
          acervo: AcervoService(
            ApiClient(
              baseUrl: 'http://localhost:3000',
              client: MockClient((request) async {
                final ehLivroPessoal = request.url.path.contains('/livros/pessoal');
                if (ehLivroPessoal && (request.method == 'POST' || request.method == 'GET')) {
                  return http.Response(
                    livroJson,
                    request.method == 'POST' ? 201 : 200,
                    headers: const <String, String>{
                      'content-type': 'application/json; charset=utf-8',
                    },
                  );
                }
                return http.Response('{}', 200);
              }),
            ),
          ),
          leitura: _leituraSimulada(),
          seletor: _SemImagem(),
          enviador: _SemEnvio(),
        ),
      );

      await sessionController.entrar('jwt-valido');
      await tester.pumpWidget(_wrap(roteador));
      await tester.pumpAndSettle();

      roteador.go('/descobrir/adicionar-livro');
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Cadastrar livro pessoal'));
      await tester.tap(find.text('Cadastrar livro pessoal'));
      await tester.pumpAndSettle();

      Future<void> preencher(String label, String valor) async {
        final campo = find.ancestor(of: find.text(label), matching: find.byType(Column)).first;
        await tester.enterText(find.descendant(of: campo, matching: find.byType(TextField)), valor);
        await tester.pump();
      }

      await preencher('Título', 'Cartas de um sertanejo');
      await preencher('Autor', 'Marina Albuquerque');
      await preencher('Número de páginas', '184');

      final salvar = find.widgetWithText(ElevatedButton, 'Salvar livro');
      await tester.ensureVisible(salvar);
      await tester.tap(salvar);
      await tester.pumpAndSettle();

      // Saiu do formulário e abriu a página do livro na aba Estante.
      expect(find.text('Cadastrar livro'), findsNothing);

      // Voltar para Descobrir mostra a raiz limpa, não o formulário preenchido.
      await tester.tap(find.text('Descobrir'));
      await tester.pumpAndSettle();
      expect(find.text('Título, autor, editora ou ISBN'), findsOneWidget);
      expect(find.text('Cadastrar livro'), findsNothing);
    },
  );

  testWidgets('recuperar senha abre sem sessão, pelo login', (tester) async {
    await tester.pumpWidget(_wrap(router));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('Esqueci minha senha'));
    await tester.tap(find.text('Esqueci minha senha'));
    await tester.pumpAndSettle();

    expect(find.text('Recuperar senha'), findsOneWidget);
  });

  testWidgets('o link de redefinição abre sem sessão e com o token do fragmento', (tester) async {
    await tester.pumpWidget(_wrap(router));
    await tester.pumpAndSettle();

    router.go('/redefinir-senha#token=abc123');
    await tester.pumpAndSettle();

    expect(find.text('Criar uma senha nova'), findsOneWidget);
  });

  testWidgets('o link de redefinição não passa pela verificação de sessão', (tester) async {
    // Sessão ainda carregando: qualquer outra rota iria para /verificando-sessao e perderia o
    // fragmento.
    final carregando = SessionController(_FakeTokenStore());
    final roteador = buildRouter(
      sessionController: carregando,
      authService: AuthService(
        ApiClient(
          baseUrl: 'http://localhost:8080',
          client: MockClient((request) async => http.Response('{}', 200)),
        ),
      ),
      perfil: _perfilSimulado(),
      estante: estanteVazia(),
      livros: DependenciasDeLivros(
        acervo: AcervoService(ApiClient(baseUrl: 'http://localhost:3000')),
        leitura: _leituraSimulada(),
        seletor: _SemImagem(),
        enviador: _SemEnvio(),
      ),
    );
    await tester.pumpWidget(_wrap(roteador));
    roteador.go('/redefinir-senha#token=abc123');
    await tester.pumpAndSettle();

    expect(carregando.carregando, isTrue);
    expect(find.text('Criar uma senha nova'), findsOneWidget);
  });

  testWidgets('a engrenagem do Perfil leva às configurações', (tester) async {
    await sessionController.entrar('jwt-valido');
    await tester.pumpWidget(_wrap(router));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Perfil'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Configurações'));
    await tester.pumpAndSettle();

    expect(find.text('Alterar senha'), findsOneWidget);
    expect(find.text('Sair da conta'), findsOneWidget);
  });

  testWidgets('a lupa do Perfil abre a busca de leitor, com volta para o perfil', (tester) async {
    await sessionController.entrar('jwt-valido');
    await tester.pumpWidget(_wrap(router));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Perfil'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Buscar leitor'));
    await tester.pumpAndSettle();
    expect(find.text('Busque pelo nome de usuário'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Voltar'));
    await tester.pumpAndSettle();
    expect(find.text('Marina Beltrão'), findsOneWidget);
  });

  testWidgets('a política abre pelo cadastro, sem sino, e volta com o formulário preenchido', (
    tester,
  ) async {
    await tester.pumpWidget(_wrap(router));
    await tester.pumpAndSettle();
    router.go('/cadastro');
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'marina.beltrao@gmail.com');

    // O link está dentro do parágrafo do aviso (Text.rich), e o parágrafo inteiro abre a política.
    final aviso = find.textContaining('Política de privacidade', findRichText: true);
    await tester.ensureVisible(aviso);
    await tester.tap(aviso);
    await tester.pumpAndSettle();

    expect(find.text('Dados que coletamos'), findsOneWidget);
    expect(find.byIcon(PhosphorIconsRegular.bell), findsNothing);

    await tester.tap(find.bySemanticsLabel('Voltar'));
    await tester.pumpAndSettle();

    expect(find.text('marina.beltrao@gmail.com'), findsOneWidget);
  });

  testWidgets('no feed, o autor abre o perfil e o livro pessoal leva a referência da atividade', (
    tester,
  ) async {
    await sessionController.entrar('jwt-valido');
    await tester.pumpWidget(_wrap(router));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Feed'));
    await tester.pumpAndSettle();
    expect(find.text('Livro pessoal'), findsOneWidget);

    await tester.tap(find.text('Caio Ferraz').first);
    await tester.pumpAndSettle();
    expect(router.state.uri.toString(), '/feed/leitores/caio');

    router.go('/feed');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Caderno de Contos do Bairro'));
    await tester.pumpAndSettle();
    expect(
      router.state.uri.toString(),
      '/feed/livro-pessoal/l1?via=feed&referenciaId=a1',
    );
  });

  group('notificações fecham ao sair da aba', () {
    late GoRouter roteador;

    Future<void> abrirApp(WidgetTester tester) async {
      await sessionController.entrar('jwt-valido');
      roteador = _roteadorComNotificacoes(sessionController);
      await tester.pumpWidget(_wrap(roteador));
      await tester.pumpAndSettle();
    }

    Finder aba(String nome) =>
        find.descendant(of: find.byType(BarraInferior), matching: find.text(nome));
    Finder sino() => find.descendant(
      of: find.byType(CabecalhoTela),
      matching: find.byIcon(PhosphorIconsRegular.bell),
    );
    final notificacoes = find.byType(NotificacoesPage, skipOffstage: false);

    testWidgets('trocar de aba com as notificações abertas devolve a raiz da Estante', (
      tester,
    ) async {
      await abrirApp(tester);

      await tester.tap(sino());
      await tester.pumpAndSettle();
      expect(find.byType(NotificacoesPage), findsOneWidget);

      await tester.tap(aba('Feed'));
      await tester.pumpAndSettle();
      await tester.tap(aba('Estante'));
      await tester.pumpAndSettle();

      expect(notificacoes, findsNothing);
      expect(find.text('Sua estante está vazia'), findsOneWidget);
      expect(roteador.state.uri.path, '/estante');
    });

    testWidgets('a sub-tela que estava por baixo continua lá quando a aba volta', (tester) async {
      await abrirApp(tester);
      await tester.tap(aba('Descobrir'));
      await tester.pumpAndSettle();
      roteador.push('/descobrir/adicionar-livro');
      await tester.pumpAndSettle();
      expect(find.text('Adicionar livro'), findsOneWidget);

      await tester.tap(sino());
      await tester.pumpAndSettle();
      expect(find.byType(NotificacoesPage), findsOneWidget);

      await tester.tap(aba('Feed'));
      await tester.pumpAndSettle();
      await tester.tap(aba('Descobrir'));
      await tester.pumpAndSettle();

      expect(notificacoes, findsNothing);
      expect(find.text('Adicionar livro'), findsOneWidget);
      expect(roteador.state.uri.path, '/descobrir/adicionar-livro');
    });

    testWidgets('a notificação cujo destino é outra aba fecha as notificações da aba de origem', (
      tester,
    ) async {
      await abrirApp(tester);
      await tester.tap(sino());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Dandara Lopes curtiu sua resenha de Vidas Secas.'));
      await tester.pumpAndSettle();
      // atividadeCurtida leva ao feed.
      expect(roteador.state.uri.path, '/feed');
      expect(find.text('Livro pessoal'), findsOneWidget);

      await tester.tap(aba('Estante'));
      await tester.pumpAndSettle();

      expect(notificacoes, findsNothing);
      expect(find.text('Sua estante está vazia'), findsOneWidget);
    });

    testWidgets('o fechamento pela troca de aba não anima: sai em dois quadros', (tester) async {
      await abrirApp(tester);
      await tester.tap(sino());
      await tester.pumpAndSettle();

      await tester.tap(aba('Feed'));
      // Um quadro para o fechamento e outro para a troca; sem `pumpAndSettle`.
      await tester.pump();
      await tester.pump();

      expect(roteador.state.uri.path, '/feed');
      expect(notificacoes, findsNothing);

      // De volta à Estante, nenhum quadro da tela de notificações aparece.
      await tester.tap(aba('Estante'));
      await tester.pump();
      expect(notificacoes, findsNothing);
      expect(find.text('Sua estante está vazia'), findsOneWidget);
    });

    testWidgets('a seta de voltar continua animada e volta à tela de baixo', (tester) async {
      await abrirApp(tester);
      await tester.tap(sino());
      await tester.pumpAndSettle();

      await tester.tap(find.bySemanticsLabel('Voltar'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      // No meio da transição de saída a página ainda está na árvore.
      expect(notificacoes, findsOneWidget);

      await tester.pumpAndSettle();
      expect(notificacoes, findsNothing);
      expect(find.text('Sua estante está vazia'), findsOneWidget);
    });
  });
}

/// Roteador com `notificacoes` simuladas: uma única notificação, de curtida (destino: o feed).
GoRouter _roteadorComNotificacoes(SessionController sessionController) {
  const cabecalhos = <String, String>{'content-type': 'application/json; charset=utf-8'};
  ApiClient social() => ApiClient(
    baseUrl: 'http://localhost:8081',
    client: MockClient((request) async {
      if (request.method == 'GET' && request.url.path == '/notificacoes') {
        return http.Response(
          jsonEncode(<String, Object?>{
            'itens': <Object?>[
              <String, Object?>{
                'id': 'n1',
                'tipo': 'ATIVIDADE_CURTIDA',
                'mensagem': 'Dandara Lopes curtiu sua resenha de Vidas Secas.',
                'lida': true,
                'criadoEm': '2026-09-26T12:00:00Z',
              },
            ],
            'pagina': 0,
            'tamanho': 20,
            'totalItens': 1,
            'totalPaginas': 1,
            'ultima': true,
            'totalNaoLidas': 0,
          }),
          200,
          headers: cabecalhos,
        );
      }
      return http.Response('{"totalNaoLidas":0}', 200, headers: cabecalhos);
    }),
  );
  return buildRouter(
    sessionController: sessionController,
    authService: AuthService(
      ApiClient(
        baseUrl: 'http://localhost:8080',
        client: MockClient((request) async => http.Response('{}', 200)),
      ),
    ),
    perfil: _perfilSimulado(),
    feed: _feedSimulado(),
    estante: estanteVazia(),
    notificacoes: DependenciasDeNotificacoes(
      NotificacoesService(social(), ApiClient(baseUrl: 'http://localhost:8082')),
    ),
    livros: DependenciasDeLivros(
      acervo: AcervoService(
        ApiClient(baseUrl: 'http://localhost:3000', client: MockClient(_acervoPorRota)),
      ),
      leitura: _leituraSimulada(),
      seletor: _SemImagem(),
      enviador: _SemEnvio(),
    ),
  );
}

/// `leitura` que responde "sem avaliação" a qualquer livro: o roteador só precisa da página abrir.
LeituraService _leituraSimulada() => LeituraService(
  ApiClient(
    baseUrl: 'http://localhost:3001',
    client: MockClient((request) async {
      final partes = request.url.pathSegments;
      if (partes.length == 3 && partes[0] == 'perfis' && partes[2] == 'resenhas') {
        return http.Response(
          '{"itens":[],"paginacao":{"page":1,"limite":5,"totalItens":0,"totalPaginas":0}}',
          200,
          headers: const <String, String>{'content-type': 'application/json; charset=utf-8'},
        );
      }
      if (partes.length == 3 && partes[2] == 'minha-avaliacao') {
        return http.Response(
          '{"livroId":"${partes[1]}","nota":null,"resenha":null}',
          200,
          headers: const <String, String>{'content-type': 'application/json; charset=utf-8'},
        );
      }
      return http.Response('{}', 200);
    }),
  ),
);
