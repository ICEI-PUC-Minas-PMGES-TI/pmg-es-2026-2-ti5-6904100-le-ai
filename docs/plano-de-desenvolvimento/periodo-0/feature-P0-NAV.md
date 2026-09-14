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
| Infra | não iniciado | `docker-compose.docs.yml` (Swagger UI agregado) inexistente |
| Backend | não iniciado | `identidade`: `register`/`login`/`me` mínimos + middleware de auth |
| Web | não iniciado | telas de cadastro/login + shell de navegação (Vue) |
| Mobile | não iniciado | telas de cadastro/login + navegação entre telas principais (Flutter) |

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

- [ ] Cadastro cria usuário com senha **hasheada**; senha < 8 caracteres é recusada; **menor de 18** é recusado (RNF-SEC-09/27/43).
- [ ] Login por e-mail **ou** username retorna token de acesso; credencial inválida → `401` sem revelar se e-mail/username existe; rate limiting e bloqueio progressivo estão ativos.
- [ ] `GET /me` responde `200` com token válido e `401` sem token / com token inválido.
- [ ] Na web e no mobile é possível **cadastrar, entrar e navegar** entre as telas principais; sem sessão, a guarda redireciona ao login.
- [ ] As telas usam os tokens de design ([P0-DS](feature-P0-DS.md)); cold start é tratado como carregamento, não erro (RNF-ERR-09).
- [ ] `docker compose -f docker-compose.docs.yml up` abre o Swagger UI em `localhost:8080` com os 4 specs no dropdown.
- [ ] `docs/api/identidade.yaml` documenta `register`, `login` e `me`.
- [ ] Fluxo cadastro→login→`/me` funciona **em DES** (não só local).

## Definition of Done

(plano §10)

- [ ] Código (backend `identidade`, web, mobile, `docker-compose.docs.yml`) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](feature-P0-CI.md))
- [ ] Testes automatizados dos casos de uso (mínimo backend): register (hash, 18+, mínimo 8), login (e-mail/username, credencial inválida), middleware de auth em `/me`
- [ ] **Spec OpenAPI do serviço atualizado em `docs/api/identidade.yaml`** (rotas de auth)
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** deixar registrado no arquivo o que ficou de fora (recuperação/troca de senha, logout revogável e admin) para F-AUT retomar sem retrabalho.

## Pendências

- **Depende de [P0-INFRA](feature-P0-INFRA.md)** (serviço `identidade` de pé, erro/health/correlation-id, esqueleto `docs/api/`), **[P0-DS](feature-P0-DS.md)** (tokens das telas), **[P0-DEPLOY](feature-P0-DEPLOY.md)** (rodar em DES) e **[P0-CI](feature-P0-CI.md)** (pipeline).
- **Coordenar com F-AUT** para não divergir: o formato de token e o modelo de `usuario` escolhidos aqui são o ponto de partida de F-AUT; qualquer decisão que F-AUT precise mudar vira pendência lá.
- **Entrada única (gateway) × URLs por serviço — decidido (12/09/2026): URL por serviço** (sem gateway). A base URL dos clientes é por serviço e o CORS de cada backend fica restrito à origem do site (ver [P0-DEPLOY](feature-P0-DEPLOY.md)).
- Biblioteca de token por stack (JWT) e de secure storage no Flutter a fixar no arranque.
- Gerenciamento de estado de sessão (web e mobile) a definir junto do scaffolding.
- **Shell de navegação nasce no protótipo desta feature.** O [`documento-de-design.md`](../../orquestador/documento-de-design.md) §5 define os headers de cada tela mas **nunca define barra de navegação**. O protótipo em [`docs/design/periodo-0/P0-NAV/`](../../design/periodo-0/P0-NAV/) fixa: barra inferior de **quatro** itens no mobile (Estante, Descobrir, Feed, Perfil), sidebar fixa e retrátil na web (expandida por padrão, sem sino porque notificações estão fora do escopo web) e um padrão de header com `Bell` e badge de não lidas. O **badge no sino** também não está na fonte: o §5.6 só define o ponto de não lida dentro da lista. Incorporar ao documento pelo controle de mudança (plano §3) depois de aprovado; até lá, o shell vale como decisão do protótipo e é herdado pelas telas do Período 1.
- **A quarta área `Descobrir` foi incorporada ao `documento-de-design.md` em 01/09/2026.** O §5 ganhou a declaração das quatro áreas de navegação na abertura, o §5.1 passou a dizer que a lupa da estante filtra a estante, e a §5.7 `Descobrir` foi criada ao fim do capítulo para não renumerar §5.2 a §5.6. A busca dentro da estante virou **RF-EST-13** (`REQUISITOS.md` v1.2), Desejável, alocada em [F-EST-2](../periodo-2/feature-F-EST-2.md). **Continua pendente de incorporação** o que sempre esteve: a barra inferior, a sidebar retrátil e o badge do sino permanecem como decisão de protótipo.
- **Teto de quatro áreas, decidido junto.** RF-REC-13 pede uma "aba Recomendações" no Período 2. Ela entra como **seção dentro de `Descobrir`**, não como quinto item da barra. Registrado em [F-REC-P2P](../periodo-2/feature-F-REC-P2P.md) e [F-REC-ALG](../periodo-3/feature-F-REC-ALG.md).
- **Logo do produto em aberto.** O design §10 fixa o nome `Lê Ai` mas não define marca gráfica. As telas de cadastro e login usam o **wordmark tipográfico** em Space Grotesk 600, e nenhum símbolo é desenhado (§7.6 proíbe SVG decorativo à mão). Revisar os três prompts quando a marca existir.

## Timeline

### Revisão 01/09/2026: o shell passou de três para **quatro** itens de navegação, com a aba `Descobrir` (`Compass`) entre `Estante` e `Feed`. A mudança saiu da escrita de `F-ACV-BUSCA/descobrir.md`, que deixou visível que a busca do acervo não cabia dentro da estante sem a aba mentir sobre o conteúdo. `shell-de-navegacao.md` foi atualizado (barra inferior, sidebar, tabela de copy, componentes que nascem no protótipo) e a proibição "não desenhe uma quarta área" virou "não desenhe uma quinta área", com o teto justificado por RF-REC-13 entrar como seção de `Descobrir`. O bloco de shell replicado nos cinco prompts do Período 1 foi atualizado junto. Nada em `docs/orquestador/` foi tocado: as duas mudanças de fonte (§5.1 do design e o RF novo de busca na estante) ficaram como pendência para a decisão do grupo.

### Revisão 31/08/2026: escritos os prompts de protótipo das telas desta feature em [`docs/design/periodo-0/P0-NAV/`](../../design/periodo-0/P0-NAV/): `cadastro.md`, `login.md` e `shell-de-navegacao.md`. As telas placeholder de estante, feed e perfil ficaram sem protótipo por serem descartadas quando F-EST, F-FEED e F-PERFIL entrarem. O shell de navegação e o badge de não lidas foram registrados como lacunas do `documento-de-design.md` §5, e a criação do logo como pendência aberta.

### Criação 25/08/2026: arquivo criado a partir do escopo de P0-NAV no [periodo-0/README.md](README.md), das linhas RF-AUT-01/02/03 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5 e do [`plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §8. Fronteira com F-AUT (Período 1) explicitada: aqui só o esqueleto navegável; o fluxo completo de AUT fica em F-AUT.
