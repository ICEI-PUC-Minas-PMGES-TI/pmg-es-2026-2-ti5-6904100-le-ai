import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:phosphor_icons/phosphor_icons.dart';
import 'package:http/testing.dart';

import 'package:le_ai_mobile/app/router.dart';
import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/core/session/session_controller.dart';
import 'package:le_ai_mobile/core/session/token_store.dart';
import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/features/auth/auth_service.dart';
import 'package:le_ai_mobile/features/livros/acervo_service.dart';
import 'package:le_ai_mobile/features/livros/capa.dart';
import 'package:le_ai_mobile/features/livros/rotas_livros.dart';
import 'package:le_ai_mobile/features/perfil/avatar.dart';
import 'package:le_ai_mobile/features/perfil/perfil_service.dart';
import 'package:le_ai_mobile/features/perfil/rotas_perfil.dart';

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

/// `identidade` simulado para a aba Perfil: sempre o mesmo perfil próprio.
DependenciasDePerfil _perfilSimulado() => DependenciasDePerfil(
  servico: PerfilService(
    ApiClient(
      baseUrl: 'http://localhost:8080',
      client: MockClient(
        (request) async => http.Response(
          '{"id":"u1","username":"marinableu","displayName":"Marina Beltrão","avatarUrl":null,'
          '"privacidade":"publico","conteudoRestrito":false,"relacao":"proprio","biografia":null,'
          '"contadores":{"seguidores":0,"seguidos":0}}',
          200,
          headers: <String, String>{'content-type': 'application/json; charset=utf-8'},
        ),
      ),
    ),
  ),
  seletor: _SemImagem(),
  enviador: _SemAvatar(),
);

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
      livros: DependenciasDeLivros(
        acervo: AcervoService(
          ApiClient(
            baseUrl: 'http://localhost:3000',
            client: MockClient((request) async => http.Response('{}', 200)),
          ),
        ),
        seletor: _SemImagem(),
        enviador: _SemEnvio(),
      ),
    );
  });

  testWidgets(
    'sem sessao, deep link para rota protegida preserva o destino ate o login resolver',
    (tester) async {
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
    },
  );

  testWidgets('com sessao ativa, ir para /login redireciona para /estante', (tester) async {
    await sessionController.entrar('jwt-valido');
    await tester.pumpWidget(_wrap(router));
    await tester.pumpAndSettle();

    router.go('/login');
    await tester.pumpAndSettle();

    expect(find.text('Sua estante aparece aqui.'), findsOneWidget);
  });

  testWidgets('trocar de aba preserva a pilha de cada branch', (tester) async {
    await sessionController.entrar('jwt-valido');
    await tester.pumpWidget(_wrap(router));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Perfil'));
    await tester.pumpAndSettle();
    expect(find.text('Marina Beltrão'), findsOneWidget);

    await tester.tap(find.text('Estante'));
    await tester.pumpAndSettle();
    expect(find.text('Sua estante aparece aqui.'), findsOneWidget);
  });

  testWidgets('Descobrir leva ao cadastro por ISBN, que troca o cabeçalho da aba pelo da tela', (
    tester,
  ) async {
    await sessionController.entrar('jwt-valido');
    await tester.pumpWidget(_wrap(router));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Descobrir'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cadastrar por ISBN'));
    await tester.pumpAndSettle();

    expect(find.text('Adicionar livro'), findsOneWidget);
    // Só a barra inferior diz "Descobrir"; o título da aba saiu do cabeçalho.
    expect(find.text('Descobrir'), findsOneWidget);
    expect(find.bySemanticsLabel('Voltar'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Voltar'));
    await tester.pumpAndSettle();
    expect(find.text('A busca do acervo aparece aqui.'), findsOneWidget);
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

    expect(find.text('Novo livro pessoal'), findsOneWidget);
    expect(find.text('ISBN'), findsNothing);
  });

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
      livros: DependenciasDeLivros(
        acervo: AcervoService(ApiClient(baseUrl: 'http://localhost:3000')),
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

    await tester.ensureVisible(find.text('Política de privacidade'));
    await tester.tap(find.text('Política de privacidade'));
    await tester.pumpAndSettle();

    expect(find.text('Dados que coletamos'), findsOneWidget);
    expect(find.byIcon(PhosphorIconsRegular.bell), findsNothing);

    await tester.tap(find.bySemanticsLabel('Voltar'));
    await tester.pumpAndSettle();

    expect(find.text('marina.beltrao@gmail.com'), findsOneWidget);
  });
}
