# P0-INFRA — Scaffolding do monorepo e serviços

**Período:** 0 · **Prioridade:** fundação
**Dono:** a definir · **Serviços afetados:** transversal (os 4 serviços de backend + web + mobile)

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md). Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md). Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Em caso de conflito, o `REQUISITOS.md` ganha.

## Objetivo

Transformar as pastas vazias de `code/` em **esqueletos executáveis** dos quatro serviços de backend (`identidade`, `acervo`, `leitura`, `social`), do app Flutter e da SPA Vue, cada um com os **comportamentos transversais mínimos** que a arquitetura exige de todo serviço antes de qualquer feature de domínio:

- **health check** por serviço (RNF-OBS-02);
- **corpo de erro padronizado** com código interno, mensagem exibível e `correlation-id` (RNF-ERR-01, RNF-ERR-02);
- **log estruturado com `correlation-id`** propagado (RNF-OBS-01);
- serviços **stateless** (RNF-ARQ-04), com **CORS restrito** (RNF-SEC-21), **headers de segurança** (RNF-SEC-22/23/24) e **HTTPS** (RNF-SEC-08);
- **lockfile versionado** com versões fixadas (RNF-SEC-25);
- **conta de administrador** provisionada por variável de ambiente (RF-AUT-08, RNF-SEC-31), com segredos só em `.env` / GitHub Secrets (RNF-SEC-11).

É a base sobre a qual [P0-CI](feature-P0-CI.md) (precisa de projetos que compilam), [P0-DEPLOY](feature-P0-DEPLOY.md) (precisa de artefatos deployáveis), [P0-MSG](feature-P0-MSG.md) (precisa dos serviços de pé) e [P0-DS](feature-P0-DS.md) (precisa de web/mobile scaffoldados) rodam. Não implementa nenhum RF de domínio — entrega o "esqueleto" citado no [periodo-0/README.md](README.md).

Requisitos não funcionais atendidos: **RNF-ARQ-01/02/03/04/07** (microsserviços HTTP/JSON, stateless, OpenAPI, PostgreSQL/Neon), **RNF-OBS-01/02/03**, **RNF-ERR-01/02**, **RNF-SEC-08/11/21/22/23/24/25/31**.

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | parcial | os 4 serviços de backend, o `front` (Vue) e o `mobile` (Flutter) inicializados; `.gitignore`/`.env.example` raiz e por serviço criados; Android validado e iOS gerado |
| Backend | concluído | os **4 serviços** scaffoldados com os transversais (health/erro/correlation-id/CORS/headers): **acervo** e **leitura** (NestJS, 11/09/2026), **identidade** e **social** (Spring Boot, 12/09/2026). Falta apenas subir em DES ([P0-DEPLOY](feature-P0-DEPLOY.md)) e entrar no pipeline ([P0-CI](feature-P0-CI.md)) |
| Web | concluído | Vue 3 + TypeScript + Vite 8 + Tailwind 4, Router, Vitest e cliente HTTP central validados localmente em 12/09/2026 |
| Mobile | concluído (Android) | scaffold Flutter nativo, plataformas, lockfile, testes, build e execução no AVD validados; iOS gerado, mas depende de macOS/Xcode para build |

## Especificação

### Infra

**Árvore de código** (já existe apenas a estrutura de pastas + `AGENTS.md` por subprojeto — ver [`AGENTS.md`](../../../AGENTS.md) raiz §4):

```
code/
├── mobile/                # Flutter
├── front/                 # Vue (SPA) + Tailwind
└── back/
    ├── identidade/        # Spring (Java)
    ├── acervo/            # NestJS (TypeScript)
    ├── leitura/           # NestJS (TypeScript)
    └── social/            # Spring (Java)
```

**Inicialização de cada projeto** (uma vez, pelo dono da frente):

- **Backend (por serviço, na stack alocada):**
  - *Spring:* projeto Spring Boot (Web, Validation, Actuator, Data JPA, PostgreSQL driver, Spring AMQP, springdoc-openapi, Flyway). Build Gradle ou Maven — fixar no `AGENTS.md` do serviço.
  - *NestJS:* `nest new`, com `@nestjs/config`, `class-validator`/`class-transformer`, driver `pg` + TypeORM (ou Prisma), `@nestjs/swagger`, `@nestjs/terminus` (health), `amqplib`. Gerenciador de pacote fixo (`pnpm`/`npm`) com lockfile.
- **Web (`code/front`):** `npm create vite@latest` com template Vue, Tailwind CSS instalado e configurado, Vue Router, ferramenta de teste (Vitest). Node LTS fixado no `AGENTS.md`.
- **Mobile (`code/mobile`):** `flutter create` (Android + iOS), Flutter/Dart fixados no `AGENTS.md`; dependências base (`http`, `google_fonts`, `phosphor_icons` e `shared_preferences`), com gerenciamento de estado de domínio a definir.

Cada projeto deve **compilar e subir** com um endpoint/tela mínima antes de fechar esta feature.

**Variáveis de ambiente — `.env.example` versionado, `.env` nunca** (RNF-SEC-11; plano §4):

- **Raiz** (`.env.example`): valores compartilhados de referência (URL do Neon do projeto, host do CloudAMQP, origem CORS de DES).
- **Por serviço de backend** (`code/back/<servico>/.env.example`), no mínimo:

  ```dotenv
  # Banco — projeto único Neon, schema por serviço (arquitetura §4.1)
  DATABASE_URL=postgresql://<user>:<pass>@<host>/<db>?options=-csearch_path%3D<servico>
  DB_SCHEMA=<servico>

  # Mensageria (ver P0-MSG)
  AMQP_URL=amqps://<user>:<pass>@<host>/<vhost>

  # Brevo — somente o serviço identidade usa estas credenciais (P-02)
  BREVO_API_KEY=
  BREVO_SMTP_KEY=
  BREVO_SMTP_HOST=smtp-relay.brevo.com
  BREVO_SMTP_PORT=587
  BREVO_SENDER_EMAIL=
  BREVO_SENDER_NAME=Lê Ai

  # Observabilidade / erro
  LOG_LEVEL=info
  SERVICE_NAME=<servico>

  # Segurança
  CORS_ALLOWED_ORIGINS=http://localhost:5173
  JWT_SECRET=            # segredo forte, aleatório e provisionado por ambiente

  # Admin fixo e único, provisionado por ambiente (RF-AUT-08, RNF-SEC-31)
  ADMIN_EMAIL=
  ADMIN_PASSWORD=        # senha forte, distinta de qualquer default
  ```

- **Web/Mobile:** `.env.example` com a base URL da API por ambiente.

**Banco e migrations** (arquitetura §4; plano §5):

- Um projeto PostgreSQL no Neon, **um schema por serviço** (`identidade`, `acervo`, `leitura`, `social`) — separação lógica no mesmo cluster. O provisionamento do projeto e das branches é de [P0-DEPLOY](feature-P0-DEPLOY.md); aqui garante-se apenas que cada serviço aponta para o **seu** schema via `search_path`.
- **Ferramenta de migration por serviço**, escolhida somente após a alocação de stack e registrada no `AGENTS.md` local, criando **apenas** as tabelas do próprio schema (arquitetura §4.3). Migration com nome por timestamp e **revisada por humano** antes de subir (plano §5, AGENTS §5.6). Nesta feature entra só a configuração da ferramenta + migration inicial que cria/valida o schema (sem tabelas de domínio).
- **Nenhum serviço lê tabela crua de outro schema** — acesso entre schemas só por VIEW exposta pelo dono (arquitetura §4.2). Nenhuma VIEW é criada aqui; a regra é registrada para as features de domínio.

### Backend / API — contrato de comportamento (implementado nas 2 stacks)

Os transversais são **contratos de saída**, não biblioteca compartilhada: cada stack implementa o seu, mas o formato observável é idêntico (arquitetura §2.1).

- **Health check** (RNF-OBS-02): `GET /health` → `200` quando o serviço está de pé e o banco responde.
  ```json
  { "status": "ok", "service": "acervo", "time": "2026-08-25T12:00:00Z" }
  ```
  (Spring: Actuator `/actuator/health` ou controller próprio no path acima; Nest: `@nestjs/terminus`.)

- **Corpo de erro padronizado** (RNF-ERR-01, RNF-ERR-02, RNF-USA-05): toda resposta de erro tem a mesma forma, com **código HTTP semântico** e **mensagem em pt-BR sem detalhe técnico** (sem stack trace — RNF-SEC-22):
  ```json
  {
    "codigo": "RECURSO_NAO_ENCONTRADO",
    "mensagem": "Não encontramos o que você procura.",
    "correlationId": "b3f1c2e4-..."
  }
  ```
  Handler global de exceções em cada stack (`@ControllerAdvice` no Spring; `ExceptionFilter` no Nest) mapeia validação/autenticação/autorização/inexistente/conflito/indisponibilidade/timeout para os códigos corretos.

- **Log estruturado com `correlation-id`** (RNF-OBS-01, RNF-OBS-03): middleware/filter que, a cada requisição, lê o header `X-Correlation-Id` (ou gera um), coloca no contexto de log (MDC no Spring; interceptor + async local storage no Nest) e o devolve na resposta e no corpo de erro. Logs em JSON, sem dados sensíveis (nunca senha/token/hash — RNF-SEC-36). O mesmo id será propagado nas mensagens em [P0-MSG](feature-P0-MSG.md).

- **Stateless** (RNF-ARQ-04): sem estado de sessão em memória; qualquer estado vai para banco ou token.

- **CORS e headers de segurança:** CORS restrito às origens conhecidas, sem curinga (RNF-SEC-21); headers `HSTS`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` (RNF-SEC-24); debug desligado em produção (RNF-SEC-23). HTTPS é terminado pelo Render (RNF-SEC-08).

- **OpenAPI em runtime + commit** (RNF-ARQ-03; AGENTS §10): cada serviço expõe o spec (`/v3/api-docs` no Spring, `@nestjs/swagger` no Nest) e commita o **esqueleto** em `docs/api/<servico>.yaml` (só health + info por ora; as rotas de domínio entram com as features). Criar a pasta `docs/api/` com os 4 arquivos e o `docker-compose.docs.yml` do Swagger UI agregado (plano §8) fica compartilhado com [P0-NAV](feature-P0-NAV.md); aqui basta o esqueleto de cada spec.

### Frontend Web (`code/front`)

- Projeto Vite + Vue + Tailwind que **compila e roda**, com Vue Router e uma tela inicial em branco navegável.
- Cliente HTTP central com base URL por ambiente, envio de `X-Correlation-Id`, e tratamento do **cold start do Render** como carregamento prolongado, não erro (RNF-ERR-09).
- Consumo dos design tokens fica em [P0-DS](feature-P0-DS.md); aqui só o esqueleto que ela vai preencher.

### App Flutter (`code/mobile`)

- Projeto `flutter create` que **compila e roda** em Android (alvo principal de demonstração) com uma tela inicial.
- Camada de acesso à API com base URL por ambiente, `X-Correlation-Id`, e tratamento do cold start (RNF-ERR-09).
- `ThemeData` a partir dos tokens fica em [P0-DS](feature-P0-DS.md).

## Critérios de aceite

- [ ] Os 4 serviços de backend, o `code/front` e o `code/mobile` **compilam e sobem** localmente.
- [ ] `GET /health` responde `200` em cada um dos 4 serviços, com o corpo padronizado.
- [ ] Um erro forçado em cada serviço retorna o **corpo de erro padrão** com `correlationId` e código HTTP semântico.
- [ ] O `correlation-id` recebido no header aparece no log estruturado e volta na resposta.
- [ ] Cada serviço tem `.env.example` versionado; nenhum `.env` real está no repositório.
- [ ] Cada serviço aponta para o **seu schema** no Neon via `search_path`; a ferramenta de migration cria só o schema do próprio serviço.
- [ ] Lockfile versionado com versões fixadas em cada projeto (RNF-SEC-25).
- [ ] Admin provisionável por variável de ambiente (sem tela de criação).
- [ ] Esqueleto de `docs/api/<servico>.yaml` commitado para os 4 serviços.
- [ ] CORS restrito e headers de segurança presentes nas respostas.

## Definition of Done

(plano §10 — obrigatórios para toda feature)

- [ ] Código das camadas aplicáveis mergeado em `desenvolvimento`
- [ ] CI verde (lint, build, testes) — depende de [P0-CI](feature-P0-CI.md); o esqueleto deve passar no pipeline assim que ele existir
- [ ] Testes automatizados dos casos de uso da feature (mínimo backend): teste do health check e do handler de erro/correlation-id em cada serviço
- [ ] Spec OpenAPI do serviço atualizado em `docs/api/` (esqueleto dos 4 specs)
- [ ] Fluxo funcionando em DES/HML — os esqueletos sobem em DES via [P0-DEPLOY](feature-P0-DEPLOY.md)
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver (N/A — feature sem UI de produto)

**Itens próprios desta feature:**
- [ ] `AGENTS.md` de cada serviço atualizado com estrutura interna, padrão de teste e comandos de build (a stack já foi decidida em 02/09/2026: identidade/social em Spring, acervo/leitura em NestJS).

## Pendências

- **Alocação de stack por serviço — decidida em 02/09/2026** (arquitetura §2.1): `identidade` e `social` em **Spring**; `acervo` e `leitura` em **NestJS** (mantendo `acervo` e `leitura` na mesma stack). Já registrada no `AGENTS.md` de cada serviço. **Pendência encerrada.**
- Versões de SDK/build por serviço já fixadas: **Nest (`acervo`, `leitura`) em 11/09/2026 — Node 22 LTS, npm, Drizzle ORM**; **web (`front`) em 12/09/2026 — Node 24.19.0 LTS, npm 12.0.2, Vue 3.5, TypeScript 6, Vite 8, Tailwind CSS 4**; **Spring (`identidade`, `social`) em 12/09/2026 — JDK 21 LTS, Maven com wrapper, Spring Boot 4.1.1, Flyway**; **mobile em 13/09/2026 — Flutter 3.47.4, Dart 3.13.3, JDK 24, Android SDK 36, Build Tools 36.0.0, NDK 28.2.13676358 e CMake 3.22.1** (todos registrados nos respectivos `AGENTS.md`).
- **ORM/migration do Nest decidido — Drizzle ORM + drizzle-kit** (11/09/2026), divergindo dos exemplos "TypeORM (ou Prisma)" citados nesta spec (que os lista como exemplo, não imposição). O restante (TypeORM/Prisma) fica descartado para o Nest.
- **Build do Spring é Maven, não Gradle** (12/09/2026). O template de pipeline em [P0-CI](feature-P0-CI.md) assume `./gradlew build` e `cache: gradle` para a trilha Spring. Como o pipeline ainda não existe (não há `.github/`), não houve quebra — mas o template precisa passar a `cache: maven` e `./mvnw -B verify` quando P0-CI for implementada. **Decisão do dono de P0-CI**; esta feature não edita o arquivo dela (AGENTS §5.3).
- **Ferramenta de auditoria de dependências do Spring continua a fixar** (item aberto em P0-CI). O lado Nest fecha com `npm audit --audit-level=high`; o Maven não tem equivalente embutido, e o OWASP Dependency-Check exige chave da NVD e deixa o pipeline lento. Nada foi adicionado ao `pom.xml` por conta própria.
- **Spring AMQP ficou fora do scaffold**, apesar de constar na lista de starters da spec acima. Motivo: paridade com o scaffold Nest, que também não trouxe cliente de mensageria, e porque o starter ativa um health contributor de RabbitMQ que marcaria `/actuator/health` como DOWN sem broker no ar. Entra em [P0-MSG](feature-P0-MSG.md), junto com a conexão real.
- **`DATABASE_URL` do Spring tem formato diferente do Nest.** O driver JDBC não aceita usuário e senha embutidos na URL, então os serviços Spring usam `DATABASE_URL=jdbc:postgresql://...` mais `DATABASE_USERNAME` e `DATABASE_PASSWORD`, divergindo do modelo de `.env.example` desta spec. O nome da variável e o `search_path`/schema por serviço foram preservados.
- **Spring Security ficou fora do scaffold** (também não está na lista de starters da spec). Os cabeçalhos de segurança de RNF-SEC-24 vêm de um filtro próprio; quando F-AUT entrar, o Security assume e os cabeçalhos migram para `HttpSecurity#headers`.
- O gerenciamento de estado de domínio do Flutter e da web continua a ser definido pelas features correspondentes; o controlador de tema usa `ChangeNotifier` nativo e não bloqueia o scaffolding.
- O scaffold iOS foi gerado, mas a validação do build permanece condicionada a macOS/Xcode; o Android é o alvo validado neste ambiente.
- **Compatibilidade P0-DS com Tailwind 4:** a web usa o plugin oficial `@tailwindcss/vite` e a abordagem CSS-first. Como [P0-DS](feature-P0-DS.md) prevê gerar `tailwind.config`, sua implementação deve gerar tokens no formato CSS-first do Tailwind 4 ou carregar o config gerado por meio de `@config`, preservando `docs/design-system/tokens.json` como fonte única. Nenhum token foi antecipado nesta feature.

## Timeline

### Scaffolding Spring 12/09/2026: `identidade` e `social` scaffoldados (**Spring Boot 4.1.1** + **JDK 21 LTS** + **Maven com wrapper** + **Flyway**), fechando os quatro serviços de backend. Entregue por serviço: esqueleto executável (`./mvnw verify` verde, 16 testes cada), `GET /health` devolvendo exatamente `{ status, service, time }` com checagem `SELECT 1`, corpo de erro padrão `{ codigo, mensagem, correlationId }` em todo caminho de erro — inclusive na recusa de CORS e no despacho `/error`, que o `@RestControllerAdvice` não alcança —, correlation-id via filtro + MDC, log JSON ECS nativo no perfil `prod`, CORS restrito por allowlist, cabeçalhos de segurança por filtro próprio, config validada no boot por `@ConfigurationProperties` e migration inicial que cria **só o schema** do serviço, com a `flyway_schema_history` dentro dele. Verificado contra um PostgreSQL 17 real: `/health` 200, rota inexistente 404 (e não 500), origem desconhecida 403 no corpo padrão, `identidade` e `social` criando apenas o próprio schema. Escolha de Maven sobre Gradle, ausência de Spring AMQP/Spring Security e formato do `DATABASE_URL` registrados em **Pendências**. Também criados: esqueleto `docs/api/{identidade,social}.yaml` e `AGENTS.md` dos dois serviços. Pendente para fechar a feature nesses dois: subir em DES (P0-DEPLOY) e entrar no pipeline (P0-CI).

### Esqueletos em DES 12/09/2026: os 4 serviços de backend subiram e respondem `GET /health` 200 em DES (Render + Neon) — o item "Fluxo funcionando em DES/HML" do DoD desta feature está satisfeito para o backend. Detalhes e evidência em [P0-DEPLOY](feature-P0-DEPLOY.md).

### Web concluída em 12/09/2026: `code/front` inicializado com Node 24.19.0 LTS, npm 12.0.2, Vue 3 + TypeScript, Vite 8, Tailwind CSS 4, Vue Router, Vitest e ESLint. Incluídos cliente HTTP central com `X-Correlation-Id`, timeout de 90 segundos para cold start, `.env.example`, lockfile e cinco testes automatizados. `npm run lint`, `npm test` e `npm run build` passam localmente. A compatibilidade de P0-DS com o modelo CSS-first do Tailwind 4 foi registrada como pendência; as demais camadas de P0-INFRA permanecem inalteradas.

### Scaffolding Nest 11/09/2026: `acervo` e `leitura` scaffoldados (NestJS + **Node 22 LTS** + **npm** + **Drizzle ORM**/drizzle-kit). Drizzle é divergência dos exemplos "TypeORM (ou Prisma)" da spec — decisão da equipe, registrada nos `AGENTS.md` locais. Entregue por serviço: esqueleto executável (build/lint/test verdes), `GET /health` (terminus + indicador Drizzle), corpo de erro padrão `{ codigo, mensagem, correlationId }`, correlation-id via middleware+ALS, log JSON (pino), CORS restrito + helmet, config validada por zod, e migration inicial que cria **só o schema** do serviço. Também criados: `.gitignore` e `.env.example` (raiz + por serviço) e esqueleto `docs/api/{acervo,leitura}.yaml`. Pendente para fechar a feature nesses dois: subir em DES (P0-DEPLOY) e entrar no pipeline (P0-CI). `identidade` e `social` (Spring) e web/mobile seguem por iniciar.

### Decisão de stack 02/09/2026: alocação por serviço fechada pela equipe — `identidade` e `social` em Spring, `acervo` e `leitura` em NestJS (arquitetura §2.1). Pendência de stack encerrada; permanece a fixação de versões de SDK/build no arranque.

### Criação 25/08/2026: arquivo criado a partir do escopo de P0-INFRA no [periodo-0/README.md](README.md) e do [`documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §2–§8. Stack por serviço mantida como pendência (decisão do grupo).

### Implementação mobile 12/09/2026: criada a base Dart/Flutter em `code/mobile`, com configuração por `API_BASE_URL`, cliente HTTP com `X-Correlation-Id`, timeout de 90 segundos classificado como cold start, tela inicial e testes. A geração das pastas nativas, `pubspec.lock` e a execução do build foram concluídas após a instalação do Flutter; os demais recortes de infraestrutura permanecem inalterados.

### Finalização mobile 13/09/2026: scaffold Android/iOS gerado com Flutter 3.47.4 e Dart 3.13.3. `flutter pub get`, `flutter analyze` e `flutter test` passaram; `flutter build apk --debug` gerou o APK. O AVD `Pixel_8_API_35` (Android 15/API 35, Google APIs, x86_64) foi criado, o APK foi instalado e o app iniciou com `API_BASE_URL=http://10.0.2.2:8080`. A validação iOS permanece condicionada a macOS/Xcode. O aviso sobre `devices.xml` na criação do AVD foi não-fatal.
