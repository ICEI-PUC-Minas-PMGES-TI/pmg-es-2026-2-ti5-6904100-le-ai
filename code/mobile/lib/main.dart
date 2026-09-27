import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';

import 'app/router.dart';
import 'core/config/app_config.dart';
import 'core/network/api_client.dart';
import 'core/session/session_controller.dart';
import 'core/session/token_store.dart';
import 'design/theme.dart';
import 'design/theme_controller.dart';
import 'features/auth/auth_service.dart';
import 'features/estante/estante_service.dart';
import 'features/livros/rotas_livros.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final themeController = ThemeController(SharedPreferencesThemeStore());
  await themeController.load();

  final sessionController = SessionController(SecureTokenStore());
  // Fire-and-forget: ler o secure storage é assíncrono, mas nada aqui precisa esperar por ele
  // antes do primeiro frame. Enquanto não resolve, `router.dart` mostra `VerificandoSessaoPage`
  // (shell-de-navegacao.md §4.4) e reage sozinho via `refreshListenable` quando `load()` termina.
  unawaited(sessionController.load());

  // `late`: o cliente precisa renovar pela `AuthService`, que precisa do cliente. A renovação
  // vai anônima (`anonimo: true`), então não há recursão: ela nunca passa pelo próprio 401.
  late final AuthService authService;
  Future<bool> renovarSessao(String token) => sessionController.renovar(token, authService.renovar);

  final apiClient = ApiClient(
    baseUrl: AppConfig.identidadeBaseUrl,
    getToken: () => sessionController.token,
    renovarSessao: renovarSessao,
  );
  authService = AuthService(apiClient);

  runApp(
    LeAiApp(
      themeController: themeController,
      sessionController: sessionController,
      authService: authService,
      livros: DependenciasDeLivros.padrao(
        getToken: () => sessionController.token,
        renovarSessao: renovarSessao,
      ),
    ),
  );
}

class LeAiApp extends StatefulWidget {
  final ThemeController themeController;
  final SessionController sessionController;
  final AuthService authService;
  final DependenciasDeLivros? livros;
  final EstanteService? estante;

  const LeAiApp({
    required this.themeController,
    required this.sessionController,
    required this.authService,
    this.livros,
    this.estante,
    super.key,
  });

  @override
  State<LeAiApp> createState() => _LeAiAppState();
}

class _LeAiAppState extends State<LeAiApp> {
  // Construído uma vez só: um novo `GoRouter` a cada rebuild de tema jogaria fora o estado de
  // navegação (pilha de cada aba do `StatefulShellRoute`).
  late final GoRouter _router = buildRouter(
    sessionController: widget.sessionController,
    authService: widget.authService,
    livros: widget.livros,
    estante: widget.estante,
  );

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.themeController,
      builder: (context, child) => MaterialApp.router(
        title: 'Lê Ai',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        themeMode: widget.themeController.mode,
        // Sem isto, os textos que o próprio Flutter desenha (botões do seletor de data,
        // formato de data "Enter Date" / mm/dd/yyyy) saem em inglês — o app é pt-BR por
        // decisão de produto (AGENTS.md §2), não só a cópia que este projeto escreve à mão.
        locale: const Locale('pt', 'BR'),
        supportedLocales: const <Locale>[Locale('pt', 'BR')],
        localizationsDelegates: const <LocalizationsDelegate<Object?>>[
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        routerConfig: _router,
      ),
    );
  }
}
