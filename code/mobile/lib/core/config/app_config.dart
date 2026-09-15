class AppConfig {
  AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:8080',
  );

  /// Base URL do serviço `identidade` (P0-NAV): cadastro, login e `/me`. Decisão de 12/09 —
  /// URL por serviço, sem gateway único (mesmo padrão de `VITE_IDENTIDADE_BASE_URL` na web).
  /// No AVD, o host da máquina é `10.0.2.2`, não `localhost`; passar por
  /// `--dart-define=IDENTIDADE_BASE_URL=http://10.0.2.2:8080` ao rodar no emulador.
  static const String identidadeBaseUrl = String.fromEnvironment(
    'IDENTIDADE_BASE_URL',
    defaultValue: 'http://localhost:8080',
  );
}
