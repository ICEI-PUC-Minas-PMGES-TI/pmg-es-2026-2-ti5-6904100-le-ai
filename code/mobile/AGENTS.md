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
- Persistência segura: `flutter_secure_storage` 11.1.1 (Keystore/Keychain) — decidido em P0-NAV (14/09/2026) para o token de sessão, que não pode viver em preferência comum.
- Tipografia: `google_fonts` 8.2.1.
- Iconografia: `phosphor_icons` 3.0.1; use Phosphor regular por padrão e fill somente para estados ativos.
- Imagem da galeria: `image_picker` 1.2.3, para a capa de livro pessoal (F-ACV-CADASTRO). Atrás da interface `SeletorDeImagem`, para o teste não depender do plugin nativo. No iOS, `NSPhotoLibraryUsageDescription` está no `Info.plist`; no Android o Photo Picker do sistema dispensa permissão.
- SVG: `flutter_svg` 2.3.0, para a logo (`assets/imagens/logo-leai.svg`) via `SvgPicture.asset` + `ColorFilter.mode(cor, BlendMode.srcIn)`.
- Navegação: `go_router` 18.0.1, decidido em P0-NAV (14/09/2026) — `StatefulShellRoute.indexedStack` para as abas principais, `redirect` no nível do `GoRouter` fazendo a guarda de sessão, `refreshListenable` reagindo ao controlador de sessão.
- **Gerenciamento de estado: `ChangeNotifier` nativo — decidido em P0-NAV (14/09/2026), não só para tema.** `SessionController` segue o mesmo molde de `ThemeController` (store injetável, testável com fake escrito à mão). Nenhuma biblioteca de estado (Provider, Riverpod, Bloc) entrou; reavaliar só se uma feature futura precisar de estado de domínio mais complexo que sessão/tema.
- Testes: `flutter_test`, com clientes HTTP e stores de preferência/token injetáveis; `http/testing.dart` (`MockClient`) para simular respostas do servidor.

## Estrutura atual

- `lib/design/`: tokens, tema, preferência de tema e widgets do design system (`lib/design/widgets/`: campo de texto, campo de senha, botão primário, banner de aviso, logo e, desde F-ACV-CADASTRO, botão textual, botão destrutivo, faixa informativa, capa de livro, cartão de progresso, área de upload de capa, etiqueta, estado vazio e folha inferior com confirmação destrutiva). `theme_extras.dart` expõe os papéis de cor que a extensão gerada ainda não tem, sem editar o arquivo gerado.
- `lib/core/config/`: configuração por `--dart-define`.
- `lib/core/network/`: cliente HTTP compartilhado. `ApiClient` tem `get/post/patch/put/delete` (`put` desde F-PERFIL, para `PUT /me/perfil`), aceita `Idempotency-Key` e retenta com backoff **só** operação idempotente (GET, ou escrita com chave) em falha de rede e `502/503/504`; a chave é gerada uma vez por intenção do usuário e reaproveitada em todo reenvio (RNF-ERR-03/04). `ApiException` carrega `status` e o corpo de erro (`livroId`, `campos`).
- `lib/core/session/`: `SessionController` (`ChangeNotifier`) e `TokenStore`/`SecureTokenStore` — sessão do usuário, ver "Gerenciamento de estado" acima. Desde F-AUT guarda token de acesso e de renovação (JSON no secure storage; o token cru de antes ainda é lido). `renovar` deduplica chamadas simultâneas (duas renovações com o mesmo token contariam como reuso e derrubariam todas as sessões do usuário) e `sairRevogando` revoga no servidor e limpa sempre. O `ApiClient` recebe `renovarSessao`: `401` numa chamada com o token da sessão renova e repete uma vez. Rotas públicas do `identidade` vão com `anonimo: true`, sem `Authorization`, porque o Spring Security recusa token vencido com `401` mesmo em rota aberta.
- `lib/app/`: composição do app — `router.dart` (`GoRouter` e a guarda de sessão), `shell_autenticado.dart`, `barra_inferior.dart`, `cabecalho_tela.dart`, `verificando_sessao_page.dart`.
- `lib/features/conta/` (F-AUT): recuperar e redefinir senha (fora do shell), configurações, alterar senha e política de privacidade (sob Perfil, pela engrenagem do header). `/redefinir-senha` passa pela guarda com ou sem sessão, **e até enquanto a sessão carrega**, porque o redirecionamento para a verificação perderia o token do fragmento (`#token=`). O intent-filter do link do e-mail está no `AndroidManifest.xml`; abrir o app direto exige o `assetlinks.json` no `leai-web` com a impressão digital da chave de assinatura, que ainda não existe. `design/widgets/estado_terminal.dart` é o bloco de tela inteira dos estados finais.
- `lib/features/<nome>/`: uma pasta por área de produto (ex.: `auth/`, `estante/`, `descobrir/`, `feed/`, `perfil/`), cada uma com suas páginas e serviços. `livros/` é F-ACV-CADASTRO: cadastro por ISBN, ISBN não encontrado, formulário e página de livro pessoal, com as sub-rotas em `rotas_livros.dart` montadas dentro das abas Descobrir, Estante e Feed. Abaixo da raiz de uma aba, o shell esconde o cabeçalho da aba e a tela desenha o seu, com seta de voltar.
- `lib/features/perfil/` (F-PERFIL): `PerfilService` (`identidade`), `avatar.dart` (foto pelo mesmo `EnviadorCloudinary` da capa, com o preset de avatar, e `publicId` tirado da URL, como o servidor confere), `widgets_de_perfil.dart` (avatar circular, chip de privacidade, contadores), meu perfil, editar perfil, buscar leitor, perfil de outro leitor (`/perfil/leitores/:username`), conexões (`/perfil/conexoes?aba=`) e solicitações, com as sub-rotas em `rotas_perfil.dart` (`DependenciasDePerfil`, injetável no `buildRouter` como `livros`). Formulário que se abandona usa `CabecalhoTela(fechar: true)` e confirma o descarte com `PopScope` + `confirmarNoModal` (`design/widgets/dialogo_confirmacao.dart`, o modal centrado de confirmação destrutiva). Listas paginadas usam `ListaPaginada` (`ChangeNotifier`, carrega perto do fim da rolagem, com `FimDaLista` como botão). Textos com o nome de outra pessoa ficam em `textos.dart`: **primeiro nome, nunca pronome de gênero**. `ApiClient.getJsonLista` decodifica resposta que é lista (a busca exata).
- `android/` e `ios/`: plataformas nativas geradas pelo Flutter; o build iOS depende de macOS/Xcode.
- `test/`: testes unitários e widget, espelhando a árvore de `lib/`.

## Comandos

Executar na pasta `code/mobile`: `flutter pub get`, `dart run tool/generate_tokens.dart --check`, `flutter analyze`, `flutter test` e `flutter build apk --debug`. Quando `tokens.json` mudar, rode `dart run tool/generate_tokens.dart` antes da validação.
Para validação ponta a ponta Android, iniciar o AVD `Pixel_8_API_35` e executar `flutter run -d emulator-5554`, com uma `--dart-define` por serviço: `IDENTIDADE_BASE_URL=http://10.0.2.2:8080`, `ACERVO_BASE_URL=http://10.0.2.2:3000` e, para a capa, `CLOUDINARY_UPLOAD_PRESET=leai_capas` (preset unsigned do cloud `leai`, ver `.env.example`); para o avatar, `CLOUDINARY_AVATAR_PRESET=leai_avatares`.

## Pontos de atenção do produto (ver `REQUISITOS.md`)

- **Fila offline** de registros de progresso: detectar ausência de conectividade e reenviar quando a conexão voltar (RNF-ERR-05).
- **Sessão de leitura cronometrada** com **modo de foco** obrigatório e não contornável; estado mantido **localmente no dispositivo**, não no servidor (RN-16). Recuperação de sessão interrompida.
- Tratar a **hibernação do plano gratuito do Render**: estado de carregamento prolongado na primeira requisição, não erro (RNF-ERR-09).
- **Push** via FCM em Android; iOS recebe as mesmas notificações apenas in-app (RF-NOT-07, arquitetura §2.7).
- Ao implementar a partir de um protótipo, seguir [`docs/design/AGENTS.md`](../../docs/design/AGENTS.md) §10: copiar a **estrutura** do protótipo e chegar visualmente muito próximo dele, montando com os widgets de layout do Flutter e respeitando o escalonamento de texto do sistema. Nada de `Stack` com `Positioned` para montar o que é fluxo, nada de tamanho fixo que quebre em outra tela.
- O [`documento-de-design.md`](../../docs/orquestador/documento-de-design.md) define o sistema; `docs/design-system/tokens.json` é a fonte canônica consumida pelos artefatos gerados do `ThemeData` do Flutter e pela configuração do Tailwind (RNF-USA-06).
- Testes unitários da camada de estado e de serviços, incluindo a fila offline (RNF-TST-04).
