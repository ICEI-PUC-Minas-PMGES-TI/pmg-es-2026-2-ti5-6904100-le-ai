# Mobile — Lê Ai (Flutter)

Aplicativo mobile nativo do Lê Ai, com base de infraestrutura HTTP e design system claro/escuro.

## Requisitos

- Flutter 3.47.4 na stable, com Dart 3.13.3.
- Android SDK 36, Build Tools 36.0.0, NDK 28.2.13676358 e CMake 3.22.1.
- `phosphor_icons` 3.0.1 para a iconografia do produto.
- Android Studio não é obrigatório: o SDK command-line já é suficiente. O iOS requer macOS/Xcode.

## Executar

Na pasta `code/mobile`:

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080
```

Para validar:

```bash
flutter analyze
flutter test
flutter build apk --debug
```

Os artefatos de design são derivados da fonte canônica antes do build:

```bash
dart run tool/generate_tokens.dart
dart run tool/generate_tokens.dart --check
```

O modo `--check` falha quando `lib/design/tokens.dart` ou `lib/design/theme.g.dart` não correspondem a `docs/design-system/tokens.json`.

Para executar no emulador validado no período-0:

```bash
flutter emulators --launch Pixel_8_API_35
flutter run -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:8080
```

O AVD usa Android 15 (API 35), Google APIs e arquitetura x86_64.

`API_BASE_URL` tem como padrão `http://localhost:8080`. Consulte `.env.example` para a configuração por ambiente. O cliente HTTP aplica timeout de 90 segundos e classifica esse timeout como cold start do backend.

O tema inicia em `ThemeMode.system`. O botão da tela-piloto alterna entre claro e escuro e salva a escolha localmente.

Validação registrada em 13/09/2026: geração, `flutter analyze`, `flutter test` e `flutter build apk --debug` passaram; o APK foi gerado. A validação iOS fica condicionada a macOS/Xcode e a execução no AVD depende de o emulador estar disponível.
