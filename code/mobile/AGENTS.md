# AGENTS.md — Mobile (Flutter)

Convenções do app mobile. Complementa o [`AGENTS.md`](../../AGENTS.md) da raiz — que traz as regras gerais (branches, commits, DoD, segurança, fluxo de feature) e prevalece no que for transversal. Fonte de verdade do escopo: [`docs/orquestador/REQUISITOS.md`](../../docs/orquestador/REQUISITOS.md).

## Stack

- **Flutter 3.47.4** nativo (Android e iOS). **Produto principal**, escopo funcional completo.
- Não usar Flutter Web (vetado): a web é um projeto Vue separado.

## Stack fixada

- Flutter 3.47.4 na stable, com Dart 3.13.3.
- Android SDK 36, platform Android 35 para o build, Build Tools 36.0.0, NDK 28.2.13676358 e CMake 3.22.1.
- JDK 24 (`JAVA_HOME=C:\Program Files\Java\jdk-24`) para o build Android.
- HTTP: `package:http` 1.6.0.
- Preferência local: `shared_preferences` 2.5.5, usando `SharedPreferencesAsync`.
- Tipografia: `google_fonts` 8.2.1.
- Iconografia: `phosphor_icons` 3.0.1; use Phosphor regular por padrão e fill somente para estados ativos.
- Gerenciamento de estado: `ChangeNotifier` nativo apenas para o controlador de tema nesta fundação; biblioteca adicional será decidida pela feature que precisar de estado de domínio.
- Testes: `flutter_test`, com clientes HTTP e stores de preferência injetáveis.

## Estrutura atual

- `lib/design/`: tokens, tema e preferência de tema.
- `lib/core/config/`: configuração por `--dart-define`.
- `lib/core/network/`: cliente HTTP compartilhado.
- `android/` e `ios/`: plataformas nativas geradas pelo Flutter; o build iOS depende de macOS/Xcode.
- `test/`: testes unitários e widget.

## Comandos

Executar na pasta `code/mobile`: `flutter pub get`, `dart run tool/generate_tokens.dart --check`, `flutter analyze`, `flutter test` e `flutter build apk --debug`. Quando `tokens.json` mudar, rode `dart run tool/generate_tokens.dart` antes da validação.
Para validação ponta a ponta Android, iniciar o AVD `Pixel_8_API_35` e executar `flutter run -d emulator-5554`.

## Pontos de atenção do produto (ver `REQUISITOS.md`)

- **Fila offline** de registros de progresso: detectar ausência de conectividade e reenviar quando a conexão voltar (RNF-ERR-05).
- **Sessão de leitura cronometrada** com **modo de foco** obrigatório e não contornável; estado mantido **localmente no dispositivo**, não no servidor (RN-16). Recuperação de sessão interrompida.
- Tratar a **hibernação do plano gratuito do Render**: estado de carregamento prolongado na primeira requisição, não erro (RNF-ERR-09).
- **Push** via FCM em Android; iOS recebe as mesmas notificações apenas in-app (RF-NOT-07, arquitetura §2.7).
- Ao implementar a partir de um protótipo, seguir [`docs/design/AGENTS.md`](../../docs/design/AGENTS.md) §10: copiar a **estrutura** do protótipo e chegar visualmente muito próximo dele, montando com os widgets de layout do Flutter e respeitando o escalonamento de texto do sistema. Nada de `Stack` com `Positioned` para montar o que é fluxo, nada de tamanho fixo que quebre em outra tela.
- O [`documento-de-design.md`](../../docs/orquestador/documento-de-design.md) define o sistema; `docs/design-system/tokens.json` é a fonte canônica consumida pelos artefatos gerados do `ThemeData` do Flutter e pela configuração do Tailwind (RNF-USA-06).
- Testes unitários da camada de estado e de serviços, incluindo a fila offline (RNF-TST-04).
