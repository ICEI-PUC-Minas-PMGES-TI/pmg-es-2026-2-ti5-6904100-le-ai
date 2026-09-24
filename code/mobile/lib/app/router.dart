import 'package:go_router/go_router.dart';

import '../core/session/session_controller.dart';
import '../features/auth/auth_service.dart';
import '../features/auth/cadastro_page.dart';
import '../features/auth/login_page.dart';
import '../features/conta/alterar_senha_page.dart';
import '../features/conta/configuracoes_page.dart';
import '../features/conta/politica_de_privacidade.dart';
import '../features/conta/recuperar_senha_page.dart';
import '../features/conta/redefinir_senha_page.dart';
import '../features/descobrir/descobrir_page.dart';
import '../features/estante/estante_page.dart';
import '../features/feed/feed_page.dart';
import '../features/livros/rotas_livros.dart';
import '../features/perfil/perfil_page.dart';
import 'shell_autenticado.dart';
import 'verificando_sessao_page.dart';

const String rotaVerificandoSessao = '/verificando-sessao';
const String rotaLogin = '/login';
const String rotaCadastro = '/cadastro';
const String rotaEstante = '/estante';
const String rotaRecuperarSenha = '/recuperar-senha';
const String rotaRedefinirSenha = '/redefinir-senha';
const String rotaConfiguracoes = '/perfil/configuracoes';
const List<String> _rotasPublicas = <String>[rotaLogin, rotaCadastro, rotaRecuperarSenha];

/// Monta o `GoRouter` do app (shell-de-navegacao.md). `refreshListenable: sessionController`
/// faz o `redirect` reavaliar sozinho sempre que `entrar()`/`sair()`/`load()` chamam
/// `notifyListeners()` — por isso `LoginPage`/`CadastroPage` não precisam navegar depois de
/// autenticar: só muda a sessão, e a guarda reage.
///
/// [livros] traz os serviços das telas de F-ACV-CADASTRO. Sem ele, o padrão aponta para o
/// `acervo` de `AppConfig` com o token da sessão — os testes que não passam por essas telas não
/// precisam montar nada.
GoRouter buildRouter({
  required SessionController sessionController,
  required AuthService authService,
  DependenciasDeLivros? livros,
}) {
  final deps =
      livros ??
      DependenciasDeLivros.padrao(
        getToken: () => sessionController.token,
        renovarSessao: (token) => sessionController.renovar(token, authService.renovar),
      );
  return GoRouter(
    initialLocation: rotaVerificandoSessao,
    refreshListenable: sessionController,
    redirect: (context, state) => _guardaDeSessao(sessionController, state),
    routes: <RouteBase>[
      GoRoute(
        path: rotaVerificandoSessao,
        builder: (context, state) => const VerificandoSessaoPage(),
      ),
      GoRoute(
        path: rotaLogin,
        builder: (context, state) => LoginPage(
          authService: authService,
          sessionController: sessionController,
          aoIrParaCadastro: () => context.go(rotaCadastro),
          aoEsquecerSenha: () => context.go(rotaRecuperarSenha),
        ),
      ),
      GoRoute(
        path: rotaRecuperarSenha,
        builder: (context, state) => RecuperarSenhaPage(
          authService: authService,
          aoVoltarParaLogin: () => context.go(rotaLogin),
        ),
      ),
      // O token vem no fragmento do link (`#token=...`), como na web: o mesmo link do e-mail abre
      // o app quando os app links estão verificados, e o navegador quando não.
      GoRoute(
        path: rotaRedefinirSenha,
        builder: (context, state) => RedefinirSenhaPage(
          token: _tokenDoFragmento(state.uri),
          authService: authService,
          sessionController: sessionController,
          aoIrParaLogin: () => context.go(rotaLogin),
          aoPedirNovoLink: () => context.go(rotaRecuperarSenha),
        ),
      ),
      GoRoute(
        path: rotaCadastro,
        builder: (context, state) => CadastroPage(
          authService: authService,
          sessionController: sessionController,
          aoIrParaLogin: () => context.go(rotaLogin),
        ),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => ShellAutenticado(
          navigationShell: navigationShell,
          caminhoAtual: state.uri.path,
          aoAbrirConfiguracoes: () => context.go(rotaConfiguracoes),
        ),
        branches: <StatefulShellBranch>[
          StatefulShellBranch(
            routes: <RouteBase>[
              GoRoute(
                path: rotaEstante,
                builder: (context, state) =>
                    EstantePage(aoCadastrarLivro: () => context.go(rotaAdicionarLivro)),
                routes: rotasDaEstante(deps),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: <RouteBase>[
              GoRoute(
                path: '/descobrir',
                builder: (context, state) =>
                    DescobrirPage(aoCadastrarPorIsbn: () => context.go(rotaAdicionarLivro)),
                routes: rotasDeDescobrir(deps),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: <RouteBase>[
              GoRoute(
                path: '/feed',
                builder: (context, state) => const FeedPage(),
                routes: rotasDoFeed(deps),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: <RouteBase>[
              GoRoute(
                path: '/perfil',
                builder: (context, state) => const PerfilPage(),
                routes: <RouteBase>[
                  GoRoute(
                    path: 'configuracoes',
                    builder: (context, state) => ConfiguracoesPage(
                      authService: authService,
                      aoVoltar: () => context.go('/perfil'),
                      aoAlterarSenha: () => context.go('$rotaConfiguracoes/alterar-senha'),
                      aoAbrirPolitica: () => context.go('$rotaConfiguracoes/privacidade'),
                      aoSair: () async {
                        await sessionController.sairRevogando(authService.revogar);
                        // A guarda já levou ao login com `?destino=`; saída voluntária não volta
                        // para cá depois de entrar.
                        if (context.mounted) {
                          context.go(rotaLogin);
                        }
                      },
                    ),
                    routes: <RouteBase>[
                      GoRoute(
                        path: 'alterar-senha',
                        builder: (context, state) => AlterarSenhaPage(
                          authService: authService,
                          sessionController: sessionController,
                          aoVoltar: () => context.go(rotaConfiguracoes),
                        ),
                      ),
                      GoRoute(
                        path: 'privacidade',
                        builder: (context, state) => PoliticaDePrivacidadePage(
                          aoVoltar: () => context.go(rotaConfiguracoes),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
}

/// Ao contrário da web (sessão síncrona via `localStorage`), ler o secure storage é assíncrono
/// (`SessionController.carregando`): enquanto não resolve, toda navegação é forçada para
/// `/verificando-sessao`, sem exceção — não dá para saber ainda se a rota pedida é permitida.
///
/// Resolvido, o resto espelha a `guardaDeSessao` da web: sem sessão fora das rotas públicas vai
/// para `/login` preservando o destino em `?destino=`; com sessão em `/login` ou `/cadastro` vai
/// para o destino preservado, se houver, senão para `/estante`.
String? _guardaDeSessao(SessionController sessionController, GoRouterState state) {
  final indo = state.matchedLocation;

  // O link do e-mail vale com ou sem sessão, e não pode passar pela verificação de sessão: o
  // redirecionamento perderia o token do fragmento.
  if (indo == rotaRedefinirSenha) {
    return null;
  }

  if (sessionController.carregando) {
    return indo == rotaVerificandoSessao ? null : rotaVerificandoSessao;
  }

  final autenticado = sessionController.estaAutenticado;

  if (indo == rotaVerificandoSessao) {
    return autenticado ? rotaEstante : rotaLogin;
  }
  if (!autenticado && !_rotasPublicas.contains(indo)) {
    return Uri(path: rotaLogin, queryParameters: <String, String>{'destino': indo}).toString();
  }
  if (autenticado && _rotasPublicas.contains(indo)) {
    final destino = state.uri.queryParameters['destino'];
    return destino ?? rotaEstante;
  }
  return null;
}

/// Token do link de redefinição, no fragmento (`#token=...`). Nulo sem fragmento ou sem token.
String? _tokenDoFragmento(Uri uri) {
  if (uri.fragment.isEmpty) {
    return null;
  }
  final token = Uri.splitQueryString(uri.fragment)['token'];
  return token == null || token.isEmpty ? null : token;
}
