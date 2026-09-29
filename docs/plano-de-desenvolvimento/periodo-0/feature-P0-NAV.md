# P0-NAV — Navegabilidade + shell de auth + docs de API

**Período:** 0 · **Prioridade:** fundação
**Dono:** Henrique Carvalho · **Serviços afetados:** `identidade` (backend) + web + mobile + `docs/api` (Swagger UI agregado)

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md). Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md). Processo: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §8. Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar o **"código parcial com navegabilidade"** que a disciplina cobra em 01/09 (plano §3), já com CI e deploy em DES: um **esqueleto navegável de autenticação** que liga os dois clientes (web Vue e app Flutter) ao serviço `identidade`, provando ponta a ponta a cadeia **cliente ↔ serviço ↔ Neon** em DES, mais a **navegação entre as telas principais** e o **Swagger UI agregado** dos contratos.

O valor desta feature é de integração, não de produto: um usuário consegue se cadastrar, entrar e navegar autenticado entre as telas principais (ainda placeholders), e os 4 contratos ficam consultáveis num único Swagger UI. Requisitos tocados (subconjunto): **RF-AUT-01** (cadastro), **RF-AUT-02** (login por e-mail/username), **RF-AUT-03** (token de acesso — subset). RNF: **RNF-SEC-09/27/43** (hash de senha, mínimo 8, recusar menores de 18), **RNF-SEC-08** (HTTPS), **RNF-ERR-09** (cold start), **RNF-ARQ-03** (OpenAPI), plano §8 (Swagger UI agregado).

> **Fronteira com F-AUT (Período 1).** Esta feature é **apenas o esqueleto** (nota do [periodo-0/README.md](README.md)). A feature completa [F-AUT](../periodo-1/README.md) (RF-AUT-01..06, 08) implementa recuperação de senha, troca de senha, logout com invalidação de refresh e login de administrador. Os endpoints de cadastro e login expostos em DES já devem aplicar os controles Essenciais correspondentes: rate limiting, bloqueio progressivo e mensagens anti-enumeração (RNF-SEC-17/28/29). O esqueleto **não pode contradizer** F-AUT — só implementa um recorte compatível com ela.

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | concluído | `docker-compose.docs.yml` (Swagger UI agregado) criado e validado |
| Backend | concluído | `identidade`: tabela `usuario`, Spring Security + JWT HS256, `register`/`login`/`me`, rate limiting por IP e bloqueio progressivo por identidade; **em DES** |
| Web | concluído | fluxo completo: sessão, cliente autenticado, telas de cadastro/login, shell com sidebar retrátil e guarda de rota |
| Mobile | concluído | fluxo completo: sessão com secure storage, cliente autenticado, telas de cadastro/login, shell de 4 abas com `go_router` e guarda de sessão |

Código mergeado em `main` pelo **PR #38** e no ar em DES. Verificação de 17/09/2026 contra `https://leai-identidade.onrender.com`: `GET /health` → `200`; `POST /auth/register` recusa menor de 18 e senha < 8 → `400` com corpo de erro padrão e `correlationId`; `POST /auth/login` com credencial inexistente → `401` com mensagem anti-enumeração; `GET /me` sem token → `401`. Falta apenas um cadastro de caminho feliz pela interface para fechar o critério (ver abaixo).

## Especificação

### Backend / API — `identidade` (esqueleto de auth)

Endpoints mínimos, todos com **corpo de erro padrão + correlation-id** herdados de [P0-INFRA](feature-P0-INFRA.md) e mensagens em pt-BR (RNF-USA-05). Acesso a dados por ORM/consulta parametrizada (RNF-SEC-12). Tabela `usuario` no schema `identidade` (migration revisada por humano, plano §5).

- **`POST /auth/register`** — cadastra com e-mail, **username único**, nome de exibição, **data de nascimento** e senha (campos de RF-AUT-01).
  - Senha com **hash Argon2/bcrypt/scrypt** (RNF-SEC-09) — nunca em claro; **mínimo 8 caracteres** (RNF-SEC-27).
  - **Recusa menores de 18 anos** a partir da data de nascimento (RNF-SEC-43).
  - Conflito de e-mail/username → `409` com corpo padrão (o refinamento das mensagens anti-enumeração é de F-AUT).
  ```json
  // 201
  { "id": "b3f1...", "username": "aluno", "displayName": "Aluno" }
  ```
- **`POST /auth/login`** — autentica por **e-mail ou username** + senha (RF-AUT-02) e emite um **token de acesso** (RF-AUT-03, subset — refresh rotativo/revogável completo fica em F-AUT).
  ```json
  // 200
  { "accessToken": "<jwt>", "tokenType": "Bearer", "expiresIn": 900 }
  ```
- **`GET /me`** — **rota protegida de exemplo**: exige `Authorization: Bearer <token>`; retorna o usuário do token. Serve para provar o middleware de auth end-to-end.
- **Middleware de auth** — valida o token de acesso, injeta a identidade no contexto, e devolve `401` (corpo padrão) quando ausente/inválido. Serviço **stateless** (RNF-ARQ-04).
- **Controles de autenticação expostos em DES** — rate limiting por IP e identidade, bloqueio progressivo após falhas e resposta que não revela se e-mail/username existe (RNF-SEC-17/28/29).
- **OpenAPI** (RNF-ARQ-03; AGENTS §10): as três rotas entram no `docs/api/identidade.yaml` (o esqueleto do arquivo é criado em [P0-INFRA](feature-P0-INFRA.md); aqui ele ganha os paths de auth).

### Frontend Web (`code/front`)

- **Telas de cadastro e login** consumindo os endpoints acima, usando **só os tokens** de [P0-DS](feature-P0-DS.md) (nada de cor hardcoded).
- **Armazenamento do token** e cliente HTTP central que injeta `Authorization` e `X-Correlation-Id`; trata **cold start do Render** como carregamento prolongado, não erro (RNF-ERR-09).
- **Shell de navegação** com Vue Router: menu/rotas para as telas principais (estante, feed, perfil como **placeholders**) e **guarda de rota** que exige sessão para as áreas autenticadas, redirecionando ao login.
- Validação de formulário no cliente reforça, não substitui, a validação do servidor.

### App Flutter (`code/mobile`)

- **Telas de cadastro e login** equivalentes, usando o `ThemeData` de [P0-DS](feature-P0-DS.md).
- **Armazenamento seguro do token** (secure storage) e camada de API que injeta `Authorization` + `X-Correlation-Id`; trata cold start (RNF-ERR-09).
- **Navegação entre as telas principais** (placeholders) com **guarda** de sessão.
- Alvo de demonstração é Android (APK do CI, [P0-CI](feature-P0-CI.md)).

### Docs de API — Swagger UI agregado (plano §8)

- **`docker-compose.docs.yml`** na raiz sobe um único Swagger UI lendo os 4 specs de `docs/api/`, com dropdown para trocar de serviço — funciona offline, sem subir os serviços:
  ```yaml
  # docker-compose.docs.yml
  services:
    api-docs:
      image: swaggerapi/swagger-ui
      ports: ["8080:8080"]
      volumes:
        - ./docs/api:/usr/share/nginx/html/specs:ro
      environment:
        URLS: >
          [
            {"url":"/specs/identidade.yaml","name":"identidade"},
            {"url":"/specs/acervo.yaml","name":"acervo"},
            {"url":"/specs/leitura.yaml","name":"leitura"},
            {"url":"/specs/social.yaml","name":"social"}
          ]
        URLS_PRIMARY_NAME: identidade
  ```
  `docker compose -f docker-compose.docs.yml up` → `localhost:8080` com todos os contratos.
- **Scaffolding de `docs/api/`**: os 4 `.yaml` esqueleto são criados por [P0-INFRA](feature-P0-INFRA.md); esta feature garante que existem e que `identidade.yaml` já traz as rotas de auth mínimas.

## Critérios de aceite

- [x] Cadastro cria usuário com senha **hasheada**; senha < 8 caracteres é recusada; **menor de 18** é recusado (RNF-SEC-09/27/43).
- [x] Login por e-mail **ou** username retorna token de acesso; credencial inválida → `401` sem revelar se e-mail/username existe; rate limiting e bloqueio progressivo estão ativos.
- [x] `GET /me` responde `200` com token válido e `401` sem token / com token inválido.
- [x] Na web e no mobile é possível **cadastrar, entrar e navegar** entre as telas principais; sem sessão, a guarda redireciona ao login. (validado local nas duas plataformas)
- [x] As telas usam os tokens de design ([P0-DS](feature-P0-DS.md)); cold start é tratado como carregamento, não erro (RNF-ERR-09).
- [x] `docker compose -f docker-compose.docs.yml up` abre o Swagger UI em `localhost:8080` com os 4 specs no dropdown.
- [x] `docs/api/identidade.yaml` documenta `register`, `login` e `me`.
- [~] Fluxo cadastro→login→`/me` funciona **em DES**. Verificado em 17/09/2026: serviço no ar (`/health` `200`), `register` aplicando as regras de 18+ e mínimo de 8 (`400` com corpo padrão), `login` recusando credencial inexistente (`401` anti-enumeração) e `/me` exigindo token (`401`). O **caminho feliz** (cadastro real → login → `/me` `200`) não foi executado nesta verificação para não deixar conta permanente em DES — não há exclusão de conta até [F-CONTA-2](../periodo-2/feature-F-CONTA-2.md). Fechar com um cadastro único pela web, registrando a evidência aqui.

## Definition of Done

(plano §10)

- [x] Código (backend `identidade`, web, mobile, `docker-compose.docs.yml`) mergeado em `desenvolvimento` e promovido a `main` pelo **PR #38**
- [x] CI verde ([P0-CI](feature-P0-CI.md)) — `ci-back-identidade`, `ci-front` e `ci-mobile` verdes no PR e no push para `main`
- [x] Testes automatizados dos casos de uso (mínimo backend): register (hash, 18+, mínimo 8), login (e-mail/username, credencial inválida), middleware de auth em `/me`
- [x] **Spec OpenAPI do serviço atualizado em `docs/api/identidade.yaml`** (rotas de auth)
- [~] Fluxo funcionando em DES/HML ([P0-DEPLOY](feature-P0-DEPLOY.md)) — serviço, validações e guarda de rota verificados em DES (17/09/2026); falta só o caminho feliz de cadastro
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada (logo, pendência abaixo)
- [x] Registrado o que ficou de fora para F-AUT retomar

**Item próprio:** deixar registrado no arquivo o que ficou de fora (recuperação/troca de senha, logout revogável e admin) para F-AUT retomar sem retrabalho — ver a última entrada da lista de pendências abaixo.

## Pendências

- **Depende de [P0-INFRA](feature-P0-INFRA.md)** (serviço `identidade` de pé, erro/health/correlation-id, esqueleto `docs/api/`), **[P0-DS](feature-P0-DS.md)** (tokens das telas), **[P0-DEPLOY](feature-P0-DEPLOY.md)** (rodar em DES) e **[P0-CI](feature-P0-CI.md)** (pipeline).
- **Coordenar com F-AUT** para não divergir: o formato de token e o modelo de `usuario` escolhidos aqui são o ponto de partida de F-AUT; qualquer decisão que F-AUT precise mudar vira pendência lá.
- **Entrada única (gateway) × URLs por serviço — decidido (12/09/2026): URL por serviço** (sem gateway). A base URL dos clientes é por serviço e o CORS de cada backend fica restrito à origem do site (ver [P0-DEPLOY](feature-P0-DEPLOY.md)).
- ~~Biblioteca de token por stack (JWT) e de secure storage no Flutter a fixar no arranque.~~ — **decidido (14/09/2026):** backend com Spring Security + `oauth2-resource-server` (Nimbus, JWT HS256, 15 min), antecipando a entrada do Security que estava prevista só para F-AUT; mobile com `flutter_secure_storage` (Keystore/Keychain).
- ~~Gerenciamento de estado de sessão (web e mobile) a definir junto do scaffolding.~~ — **decidido (14/09/2026):** sem biblioteca nova nas duas plataformas. Web: singleton de módulo, no molde de `src/theme.ts` (P0-DS). Mobile: `ChangeNotifier`, no molde de `theme_controller.dart`.
- **Shell de navegação nasce no protótipo desta feature.** O [`documento-de-design.md`](../../orquestador/documento-de-design.md) §5 define os headers de cada tela mas **nunca define barra de navegação**. O protótipo em [`docs/design/periodo-0/P0-NAV/`](../../design/periodo-0/P0-NAV/) fixa: barra inferior de **quatro** itens no mobile (Estante, Descobrir, Feed, Perfil), sidebar fixa e retrátil na web (expandida por padrão, sem sino porque notificações estão fora do escopo web) e um padrão de header com `Bell` e badge de não lidas. O **badge no sino** também não está na fonte: o §5.6 só define o ponto de não lida dentro da lista. Incorporar ao documento pelo controle de mudança (plano §3) depois de aprovado; até lá, o shell vale como decisão do protótipo e é herdado pelas telas do Período 1.
- **A quarta área `Descobrir` foi incorporada ao `documento-de-design.md` em 01/09/2026.** O §5 ganhou a declaração das quatro áreas de navegação na abertura, o §5.1 passou a dizer que a lupa da estante filtra a estante, e a §5.7 `Descobrir` foi criada ao fim do capítulo para não renumerar §5.2 a §5.6. A busca dentro da estante virou **RF-EST-13** (`REQUISITOS.md` v1.2), Desejável, alocada em [F-EST-2](../periodo-2/feature-F-EST-2.md). **Continua pendente de incorporação** o que sempre esteve: a barra inferior, a sidebar retrátil e o badge do sino permanecem como decisão de protótipo.
- **Teto de quatro áreas, decidido junto.** RF-REC-13 pede uma "aba Recomendações" no Período 2. Ela entra como **seção dentro de `Descobrir`**, não como quinto item da barra. Registrado em [F-REC-P2P](../periodo-2/feature-F-REC-P2P.md) e [F-REC-ALG](../periodo-3/feature-F-REC-ALG.md).
- **Logo do produto: implementação divergiu dos prompts, não do design.** O §3.7 do `documento-de-design.md` (adicionado depois dos três prompts de protótipo, ver Timeline) define um lockup com símbolo + wordmark; a implementação segue o §3.7. Os prompts (`cadastro.md`, `login.md`, `shell-de-navegacao.md`, todos de 31/08–01/09) continuam pedindo só o wordmark tipográfico e proibindo símbolo — ficaram desatualizados em relação ao design, que é a fonte (plano §7 regra 5). Revisar os três prompts quando alguém mexer neles de novo.
- **Nome no launcher "Lê Aí" diverge do design (28/09/2026).** Por pedido do dono, o app instalado se chama **Lê Aí** (`android:label`, `CFBundleDisplayName` e o `title` do `MaterialApp`, que é o rótulo dos recentes no Android). O `documento-de-design.md` §10 diz que "o nome definitivo do aplicativo é **Lê Ai**", e o wordmark, a web e a descrição do pubspec continuam assim. Decisão do grupo: ou o §10 passa a "Lê Aí" e o wordmark (`logo_leai.dart`, `LogoLeAi.vue`) e o `<title>` da web acompanham, ou o launcher volta a "Lê Ai". Não editar `docs/orquestador/`.
- **Ícone do app e favicon são variantes de cor em disco (28/09/2026).** O §9.4 diz que "não há variantes de cor em disco", mas o launcher (Android/iOS) e a aba do navegador não tingem em runtime; o próprio §3.7 prevê o símbolo isolado "para ícone de app, favicon". A arte é **papel sobre musgo**, uma das duas combinações do §3.7, gerada a partir do `logo-leai.svg` (`code/mobile/assets/icone/`, `code/front/public/`). Pedir ao grupo uma ressalva no §9.4 para esses dois usos.
- **`RNF-SEC-28` e `RNF-SEC-29` estão com a atribuição trocada** entre `login.md`/este arquivo e o `REQUISITOS.md` (linhas 814–815). Os dois comportamentos (mensagem anti-enumeração e bloqueio progressivo) foram implementados corretamente; só o número de cada um diverge entre as fontes. Não editar `REQUISITOS.md`: é decisão do grupo.
- **Rate limiting e bloqueio progressivo são em memória**, nos dois controles (por IP e por identidade). Tensiona RNF-ARQ-04 (serviço stateless) — aceitável enquanto o Render free roda uma instância só do `identidade`. F-AUT decide se migra para Redis ou banco quando houver mais de uma instância.
- **Token de acesso em `localStorage` na web** é superfície de XSS. Sem refresh token não há alternativa boa no Período 0 (`httpOnly` cookie exigiria trocar o modelo de emissão). F-AUT deve reavaliar com cookie `httpOnly` e rotação de refresh token.
- **RNF-SEC-27 pede verificação contra lista de senhas comuns**, além do mínimo de 8 caracteres. Implementado só o mínimo de 8; nenhum dos protótipos desenhou copy para o erro de senha comum. Registrado como lacuna, não como decisão.
- **Porta 8080 colide** entre o Swagger UI agregado (`docker-compose.docs.yml`) e o `identidade` rodando local — não dá para subir os dois ao mesmo tempo com a config padrão. Documentado como comentário no próprio `docker-compose.docs.yml`.
- **RF-AUT-03 (sessão persistente) fica pela metade.** Só `accessToken` (JWT HS256, 15 min) — sem refresh token, sem renovação automática, sem revogação no logout. É o próximo item de F-AUT.
- **`render.yaml` (P0-DEPLOY) provavelmente precisa de `DATABASE_USERNAME`/`DATABASE_PASSWORD` no serviço `leai-identidade`**, que o `application.yml` do Spring exige separado de `DATABASE_URL` e o `render.yaml` hoje não declara. Nota cruzada — o arquivo é de outra feature, não editado aqui.
- ~~**`flutter_secure_storage` é plugin nativo e toca o build Android.** `flutter build apk --debug` local terminou sem erro; falta confirmar que o job `apk` do `ci-mobile.yml` (rodando em outra máquina) continua verde.~~ — **confirmado (17/09/2026):** `ci-mobile` verde em `main` e o artefato `app-des-apk` publicado (builds de 13/09 e 15/09).
- ~~Telas-piloto do P0-DS saem de cena~~ — **feito.** `HomeView.vue` (Etapa 9, web) e `DesignSystemHomePage` de `main.dart` (Etapa 13, mobile) foram removidas junto com os testes que dependiam delas (`App.spec.ts`, `widget_test.dart`), como o P0-DS já previa que aconteceria quando uma feature entregasse telas reais.
- **Este arquivo de acompanhamento local contraria a regra de raiz limpa do `AGENTS.md` §4.** Exceção consciente, registrada — arquivo nunca versionado (excluído via `.git/info/exclude`), existe só para o dono da feature acompanhar o próprio trabalho.
- **A branch `desenvolvimento` passa a existir a partir desta feature**, encerrando a exceção que o P0-DEPLOY tinha registrado (decisão do grupo de commitar direto em `main` durante a base do Período 0).
- **O que fica de fora, para [F-AUT](../periodo-1/README.md) retomar sem retrabalho:** recuperação de senha, troca de senha, logout com invalidação de refresh, refresh token rotativo e revogável, e login de administrador. O formato de token (JWT HS256) e o modelo de `usuario` decididos aqui são o ponto de partida.

## Timeline

### 29/09/2026: sino do header com o mesmo espaçamento dos outros ícones (mobile). Na aba Perfil havia 24px entre a lupa e a engrenagem e 48px entre a engrenagem e o sino, porque o sino ficava alinhado à direita da sua caixa de 48px e vinha depois de um `SizedBox(space-3)`. O `SizedBox` saiu, o ícone do sino ficou centralizado na caixa de 48px (alvo de toque mantido) e, com sino, o padding final do header cai para `space-5 - 12`, deixando o ícone a 20px da borda. Resultado: 24px de ícone a ícone (lupa, engrenagem, sino; e os três pontos do livro pessoal, sino), o mais perto dos 16px do protótipo sem encolher o toque. Telas sem sino não mudam. Também saiu o parâmetro `tituloEmDuasLinhas` do `CabecalhoTela`, que só a política de privacidade usava (ver F-AUT); o header tem sempre 72px.

### Ícone e nome 28/09/2026: o app ganhou ícone próprio no lugar do padrão do Flutter e o nome **Lê Aí** no launcher (antes `le_ai_mobile` no Android e "Le Ai Mobile" no iOS). Ícone papel sobre musgo, gerado do `logo-leai.svg` corrigido: `assets/icone/icone.svg` (quadrado cheio, iOS e Android legado) e `icone-frente.svg` (foreground e monochrome do ícone adaptativo, símbolo inteiro no círculo seguro de 66dp), rasterizados com `rsvg-convert` e distribuídos pelo `flutter_launcher_icons` 0.14.4 (dev_dependency). A web recebeu `favicon.svg`, `favicon-32.png` e `apple-touch-icon.png` com a mesma arte. As duas divergências com o design (grafia "Lê Aí" × §10 e variante de cor em disco × §9.4) estão em Pendências.

### Correção 25/09/2026: logo cortada no mobile. No app, o símbolo aparecia só com a página esquerda do livro e a folha; a web estava certa. Causa: o `logo-leai.svg` saiu de um editor web que posiciona três peças com `transform-origin` (uma com `transform-box: fill-box`) no `style`, e o `flutter_svg` ignora as duas propriedades — aplica a `matrix` em torno de (0,0), então o grupo espelhado da metade direita caía fora do viewBox e duas peças giradas saíam alguns pontos do lugar. A origem foi embutida em cada `matrix` e as propriedades removidas, em `assets/imagens/logo-leai.svg`, na cópia do mobile e no SVG inline de `LogoLeAi.vue`; nenhum `d=` mudou. Render do WebKit antes/depois idêntico (diferença de arredondamento); o `rsvg-convert`, que também ignora a origem, reproduzia o corte com o arquivo antigo e mostra o livro inteiro com o novo. Teste em `logo_leai_test.dart` barra a volta de `transform-origin`/`transform-box` no asset; nota no `code/mobile/AGENTS.md`. Contrato do §9.4 do design inalterado.

### Verificação em DES 17/09/2026: o PR `desenvolvimento` → `main` (**#38**) foi mergeado e o auto-deploy do [P0-DEPLOY](feature-P0-DEPLOY.md) colocou o `identidade` em DES. Auditoria contra `https://leai-identidade.onrender.com`: `GET /health` → `200`; `POST /auth/register` com data de nascimento de menor e com senha de 3 caracteres → `400` nos dois casos, com `codigo`/`mensagem`/`correlationId` (RNF-SEC-43, RNF-SEC-27, RNF-ERR-01); `POST /auth/login` com identificador inexistente → `401` com "E-mail, nome de usuário ou senha incorretos." (RNF-SEC-29, anti-enumeração); `GET /me` sem token → `401` (RNF-ARQ-04). CI verde no PR e no push para `main`, com o artefato `app-des-apk` publicado. Status, critérios e DoD atualizados. Fica só o cadastro de caminho feliz, deliberadamente não executado para não criar conta permanente em DES enquanto não existe exclusão de conta.

### Fechamento 14/09/2026: as 14 etapas do plano de execução concluídas e commitadas em `desenvolvimento` (backend: tabela `usuario`, Spring Security + JWT, `register`/`login`/`me`, rate limiting e bloqueio progressivo, spec OpenAPI e Swagger UI agregado; web: sessão, cliente autenticado, componentes, telas de cadastro/login, shell com sidebar retrátil e guarda de rota; mobile: sessão com secure storage, cliente autenticado, widgets, telas de cadastro/login, shell de 4 abas com `go_router` e guarda de sessão). Status, critérios de aceite, DoD e pendências atualizados neste arquivo; os três `AGENTS.md` locais (`identidade`, `front`, `mobile`) atualizados para refletir as decisões tomadas durante a feature. Falta abrir o PR `desenvolvimento` → `main` e validar o fluxo em DES — só isso separa o código pronto do critério de aceite "funciona em DES", que é o único portão obrigatório do fluxo.

### Revisão 01/09/2026: o shell passou de três para **quatro** itens de navegação, com a aba `Descobrir` (`Compass`) entre `Estante` e `Feed`. A mudança saiu da escrita de `F-ACV-BUSCA/descobrir.md`, que deixou visível que a busca do acervo não cabia dentro da estante sem a aba mentir sobre o conteúdo. `shell-de-navegacao.md` foi atualizado (barra inferior, sidebar, tabela de copy, componentes que nascem no protótipo) e a proibição "não desenhe uma quarta área" virou "não desenhe uma quinta área", com o teto justificado por RF-REC-13 entrar como seção de `Descobrir`. O bloco de shell replicado nos cinco prompts do Período 1 foi atualizado junto. Nada em `docs/orquestador/` foi tocado: as duas mudanças de fonte (§5.1 do design e o RF novo de busca na estante) ficaram como pendência para a decisão do grupo.

### Revisão 31/08/2026: escritos os prompts de protótipo das telas desta feature em [`docs/design/periodo-0/P0-NAV/`](../../design/periodo-0/P0-NAV/): `cadastro.md`, `login.md` e `shell-de-navegacao.md`. As telas placeholder de estante, feed e perfil ficaram sem protótipo por serem descartadas quando F-EST, F-FEED e F-PERFIL entrarem. O shell de navegação e o badge de não lidas foram registrados como lacunas do `documento-de-design.md` §5, e a criação do logo como pendência aberta.

### Criação 25/08/2026: arquivo criado a partir do escopo de P0-NAV no [periodo-0/README.md](README.md), das linhas RF-AUT-01/02/03 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5 e do [`plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §8. Fronteira com F-AUT (Período 1) explicitada: aqui só o esqueleto navegável; o fluxo completo de AUT fica em F-AUT.
