import 'package:go_router/go_router.dart';

import '../core/session/session_controller.dart';
import '../features/auth/auth_service.dart';
import '../features/auth/cadastro_page.dart';
import '../features/auth/login_page.dart';
import '../features/descobrir/descobrir_page.dart';
import '../features/estante/estante_page.dart';
import '../features/feed/feed_page.dart';
import '../features/perfil/perfil_page.dart';
import 'shell_autenticado.dart';
import 'verificando_sessao_page.dart';

const String rotaVerificandoSessao = '/verificando-sessao';
const String rotaLogin = '/login';
const String rotaCadastro = '/cadastro';
const String rotaEstante = '/estante';
const List<String> _rotasPublicas = <String>[rotaLogin, rotaCadastro];

/// Monta o `GoRouter` do app (shell-de-navegacao.md). `refreshListenable: sessionController`
/// faz o `redirect` reavaliar sozinho sempre que `entrar()`/`sair()`/`load()` chamam
/// `notifyListeners()` — por isso `LoginPage`/`CadastroPage` não precisam navegar depois de
/// autenticar: só muda a sessão, e a guarda reage.
GoRouter buildRouter({required SessionController sessionController, required AuthService authService}) {
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
        builder: (context, state, navigationShell) =>
            ShellAutenticado(navigationShell: navigationShell),
        branches: <StatefulShellBranch>[
          StatefulShellBranch(
            routes: <RouteBase>[
              GoRoute(path: rotaEstante, builder: (context, state) => const EstantePage()),
            ],
          ),
          StatefulShellBranch(
            routes: <RouteBase>[
              GoRoute(path: '/descobrir', builder: (context, state) => const DescobrirPage()),
            ],
          ),
          StatefulShellBranch(
            routes: <RouteBase>[
              GoRoute(path: '/feed', builder: (context, state) => const FeedPage()),
            ],
          ),
          StatefulShellBranch(
            routes: <RouteBase>[
              GoRoute(path: '/perfil', builder: (context, state) => const PerfilPage()),
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
