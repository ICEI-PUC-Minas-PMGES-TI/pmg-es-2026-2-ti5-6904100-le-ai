import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/core/session/session_controller.dart';
import 'package:le_ai_mobile/core/session/token_store.dart';
import 'package:le_ai_mobile/design/theme_controller.dart';
import 'package:le_ai_mobile/features/auth/auth_service.dart';
import 'package:le_ai_mobile/main.dart';

class _MemoryThemeStore implements ThemePreferenceStore {
  @override
  Future<String?> read() async => null;

  @override
  Future<void> write(String value) async {}
}

class _FakeTokenStore implements TokenStore {
  String? value;

  _FakeTokenStore([this.value]);

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

/// `sessionController.load()` é aguardado aqui (ao contrário do `main()` real, que dispara e
/// esquece): assim a guarda de rota já sabe se há sessão no primeiro frame do teste, sem
/// depender de um `pumpAndSettle` atravessar `VerificandoSessaoPage` no meio do caminho.
Future<LeAiApp> _montarApp({String? tokenSalvo}) async {
  final themeController = ThemeController(_MemoryThemeStore());
  await themeController.load();

  final sessionController = SessionController(_FakeTokenStore(tokenSalvo));
  await sessionController.load();

  final apiClient = ApiClient(
    baseUrl: 'http://localhost:8080',
    client: MockClient((request) async => http.Response('{}', 200)),
  );

  return LeAiApp(
    themeController: themeController,
    sessionController: sessionController,
    authService: AuthService(apiClient),
  );
}

void main() {
  testWidgets('sem sessao salva, a guarda de rota abre no login', (tester) async {
    await tester.pumpWidget(await _montarApp());
    await tester.pumpAndSettle();

    expect(find.text('Entrar'), findsWidgets);
    expect(find.text('Criar conta'), findsOneWidget);
  });

  testWidgets('com sessao salva, a guarda de rota abre no shell autenticado', (tester) async {
    await tester.pumpWidget(await _montarApp(tokenSalvo: 'jwt-valido'));
    await tester.pumpAndSettle();

    expect(find.text('Minha estante'), findsOneWidget);
    expect(find.text('Sua estante aparece aqui.'), findsOneWidget);
    expect(find.text('Estante'), findsOneWidget);
    expect(find.text('Descobrir'), findsOneWidget);
    expect(find.text('Feed'), findsOneWidget);
    expect(find.text('Perfil'), findsOneWidget);
  });
}
