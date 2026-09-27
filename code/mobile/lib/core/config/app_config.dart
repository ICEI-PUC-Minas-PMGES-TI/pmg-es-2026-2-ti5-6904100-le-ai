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

  /// Base URL do serviço `acervo` (F-ACV-CADASTRO): importação por ISBN e livro pessoal. No AVD,
  /// `--dart-define=ACERVO_BASE_URL=http://10.0.2.2:3000`.
  static const String acervoBaseUrl = String.fromEnvironment(
    'ACERVO_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  static const String leituraBaseUrl = String.fromEnvironment(
    'LEITURA_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  /// Cloud do Cloudinary (P-09). Precisa ser a mesma de `CLOUDINARY_CLOUD_NAME` no `acervo`: o
  /// servidor só aceita capa hospedada em `res.cloudinary.com/<cloud>/image/upload/`.
  static const String cloudinaryCloudName = String.fromEnvironment(
    'CLOUDINARY_CLOUD_NAME',
    defaultValue: 'leai',
  );

  /// Preset **unsigned** de upload do Cloudinary. É o preset que limita tipo, tamanho e
  /// dimensões do lado do Cloudinary (RNF-SEC-20); o cliente valida antes para dar a mensagem
  /// certa sem gastar o upload. Vazio desliga o envio de capa, com mensagem de falha no envio.
  static const String cloudinaryUploadPreset = String.fromEnvironment(
    'CLOUDINARY_UPLOAD_PRESET',
    defaultValue: '',
  );

  /// Preset **unsigned** do avatar (F-PERFIL): `leai_avatares`, que grava na pasta `avatares`,
  /// a única que o `identidade` aceita na URL. Vazio desliga o envio de foto, como o da capa.
  static const String cloudinaryAvatarPreset = String.fromEnvironment(
    'CLOUDINARY_AVATAR_PRESET',
    defaultValue: '',
  );
}
