# AGENTS.md — Serviço `leitura`

Complementa o [`AGENTS.md`](../../../AGENTS.md) da raiz (regras gerais) e o [`code/back/README.md`](../README.md) (visão dos serviços). Fonte de verdade: [`docs/orquestador/REQUISITOS.md`](../../../docs/orquestador/REQUISITOS.md); arquitetura: [`docs/orquestador/documento-de-arquitetura.md`](../../../docs/orquestador/documento-de-arquitetura.md).

## Domínio

Núcleo do produto. Estante, leitura, progresso, sessão cronometrada, nota, resenha (com curtidas), frases/trechos, desafios, sequência diária (streak), estatísticas e histórico. Requisitos: **EST, PRG, AVA, DSF, STA, GAM**. É o maior serviço, mantido inteiro porque tudo gira em torno da mesma agregação (usuário + livro + leitura).

## Stack e dados

- **Stack:** **NestJS (TypeScript)** — decidido pela equipe em 02/09/2026 (arquitetura §2.1); mesma stack que `acervo`. Fixado no scaffolding P0-INFRA (11/09/2026): **Node 22 LTS**, gerenciador **npm** (lockfile `package-lock.json`, RNF-SEC-25) e **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`, driver `pg`).
- **Schema:** `leitura`, no PostgreSQL único do Neon. Expõe **VIEWs** de estante e nota consumidas pela recomendação em `social`; a nota agregada em `acervo` é alimentada por evento.
- **Curtida/descurtida de resenha fica aqui**, junto da resenha (não em `social`).

> **Modelo físico do DER (16/09/2026):** as 20 tabelas e as VIEWs de contrato
> de `leitura` foram declaradas no Drizzle e versionadas em migrations. A
> existência da estrutura não significa que as features de domínio estejam
> implementadas.

## Estrutura, comandos e ferramentas (P0-INFRA)

- **Runtime:** Node 22 LTS (`.nvmrc`), **npm** com `package-lock.json` versionado (RNF-SEC-25).
- **ORM/migrations:** **Drizzle** (`drizzle-orm`) + **drizzle-kit**; schema-por-serviço via `pgSchema('leitura')`, com nomes qualificados no SQL e sem depender de `search_path` na `DATABASE_URL`. Migrations em `drizzle/*.sql` (SQL revisável), aplicadas por `npm run db:migrate` — **cada migration revisada por humano** antes de subir (plano §5); só tabelas do schema `leitura`. As **VIEWs de contrato** (estante, nota) para `social` também vivem aqui (arquitetura §4.2).
- **Config:** `@nestjs/config` + validação `zod` (`src/config/env.ts`) — não sobe com env inválida. `.env.example` versionado, `.env` nunca (RNF-SEC-11).
- **Estrutura:**
  - `src/main.ts` — bootstrap: correlation-id, `helmet` (RNF-SEC-24), CORS restrito (RNF-SEC-21), `ValidationPipe`, Swagger em `/docs`.
  - `src/common/` — `correlation.middleware.ts` + `als.ts` (RNF-OBS-01); `all-exceptions.filter.ts` + `error-codes.ts` → corpo `{ codigo, mensagem, correlationId }` (RNF-ERR-01, pt-BR, sem stack trace).
  - `src/db/` — `drizzle.module.ts` (provider `DRIZZLE`), `schema.ts` (`pgSchema`), `migrate.ts`.
  - `src/health/` — `GET /health` via `@nestjs/terminus` + indicador Drizzle (`SELECT 1`) (RNF-OBS-02).
- **Comandos:** `npm run start:dev` · `npm run build` · `npm test` · `npm run test:integration` · `npm run lint` · `npm run db:generate` · `npm run db:migrate`. `npm run start:prod` aplica migrations antes de iniciar a API.
- **Porta local: 3001.** O `acervo` usa a 3000 e os dois sobem juntos. No Render a porta vem do ambiente.
- **Testes:** Jest + ts-jest; unitários em `src/**/*.spec.ts`, integração em `test/integracao/*.int-spec.ts`. **A máquina de estados (RN-04) e a inatividade/abandono (RN-05) são teste obrigatório e prioritário (RNF-TST-01)** — entram com as features de domínio.
- **OpenAPI:** `@nestjs/swagger` em runtime (`/docs`); commitado em [`docs/api/leitura.yaml`](../../../docs/api/leitura.yaml) (RNF-ARQ-03).

## Infra comum das features (F-AVA, fatia 0, 26/09/2026)

Copiada do `acervo` e pronta para F-AVA, F-EST e F-PRG. Não existe pacote compartilhado entre serviços: a regra é copiar e adaptar. Plano: [`plano-F-AVA.md`](../../../docs/plano-de-desenvolvimento/periodo-1/plano-F-AVA.md), fatia 0.

- **Autenticação (`src/auth/`):** `JwtAuthGuard` global (`APP_GUARD`): toda rota nasce protegida. `@Publico()` libera (só `/health`). `@UsuarioAtual()` dá `{ id, username }` do token — nunca aceite o id do solicitante pelo corpo. HS256, issuer `identidade`, `JWT_SECRET` igual ao do `identidade` (mínimo de 32 caracteres, obrigatório em produção; sem ele o serviço não sobe).
- **Pipeline HTTP (`src/configurar-app.ts`):** `trust proxy`, correlation-id, helmet, CORS e `ValidationPipe` com `forbidNonWhitelisted` e `exceptionFactory`. O `main.ts` e os testes usam o mesmo.
- **Correlation-id só UUID.** `outbox_leitura.correlation_id` é `uuid NOT NULL`; um header malformado é trocado por um UUID gerado, senão derrubaria a escrita com 500.
- **Erros (`src/common/erros-de-negocio.ts`):** corpo `{ codigo, mensagem, correlationId }`, com `campos` quando houver.
  - **400** (`ErroDeValidacao`): corpo malformado — tipo errado, campo faltando ou sobrando, UUID inválido, `Idempotency-Key` ausente.
  - **422** (`EntidadeInvalida`, código `ENTIDADE_NAO_PROCESSAVEL`): dado bem formado que fere regra de negócio (nota fora da escala, resenha vazia ou longa demais).
  - 401, 403, 404, 409, 429 (com `Retry-After`) e 503 têm classe própria.
  - VIEW de outro serviço inacessível (`ehFalhaDeContratoExterno`, em `pg-erros.ts`) vira 503.
- **Idempotência (`src/common/idempotencia/`):** `IdempotenciaService.executar(contexto, efeito)` roda o efeito e grava o recibo **na mesma transação**; é serviço, não interceptor. `@IdempotencyKey()` exige UUID (400 se faltar).
  - **Escopo diferente do `acervo`:** `operacao = operacaoNoCaminho(OPERACOES.X, idsDoCaminho)`, por exemplo `salvarNota:<livroId>`, porque o `leitura.yaml` define o escopo como ator + método + **caminho canônico**. A mesma chave em outro livro é outra operação (no `acervo` seria 409). Mesma chave com outro corpo: 409. Janela de replay: 24 h.
  - Acrescente as operações da sua feature em `OPERACOES`, com o `operationId` do contrato.
  - O índice único é `idempotencia_leitura_subject_operacao_chave_uk` (predicado `subject_ref is not null and chave is not null`).
- **Limite de requisições (`src/common/rate-limit/`):** `@UseGuards(RateLimitGuard)` + `@RateLimit({ porIdentidade, porIp, janelaSegundos, escopo })` nas escritas que viram atividade ou evento. **Um `escopo` por rota**, senão as rotas dividem o contador.
- **VIEWs de outros serviços (`src/db/contratos-externos.ts`):** `acervo.v_livro_referencia_v1`, `identidade.v_perfil_referencia_v1` e `identidade.v_seguimento_aceito_v1`, todas `.existing()` e fora do `schema.ts`. `autor_exibicao` é `NULL` em livro oficial sem autor (701 livros no dev).
- **Outbox (`src/outbox/`):** `OutboxRepository.inserir(tx, { tipo, versao, chaveNegocio, payload })`, sempre com o `tx` da transação do domínio. O `payload` é só o `data` do schema; o despachante de P0-MSG monta o envelope. **O `data` é validado antes do INSERT:** evento fora do contrato desfaz a transação (500) em vez de cair na DLQ de outro serviço. Por isso:
  - registre o schema do seu evento no `onModuleInit` do módulo com `MessageValidator.registerDataSchema(tipo, versao, schema)`, usando a cópia em `src/messaging/schemas/` (idêntica à de `docs/mensageria`, conferida por `schemas.spec.ts`);
  - o `common-v1` já está registrado, então `$ref: "common-v1.schema.json#/..."` resolve;
  - limpe o que vem de fora antes de montar o evento: URL de capa ou avatar malformada vira `null`, e ausência de autor é `null`, nunca texto inventado (`LivroSnapshot.autor` aceita `null` desde 26/09/2026, ver `docs/mensageria/README.md`).
- **Testes de integração (`test/integracao/`):** Postgres descartável, nunca o Neon (`ambiente.ts` recusa). As VIEWs de `acervo` e `identidade` viram **tabelas** no fixture (`banco.ts`), com massa em `massa.ts` (`inserirLivro`, `inserirPerfil`, `seguir`). Nelas, "suspenso" e "em exclusão" são o mesmo caso: sem linha. `limpar()` zera todas as tabelas dos três schemas pelo catálogo, então tabela nova entra sozinha. `broker-em-memoria.ts` prova outbox → despachante → envelope válido. `criarApp([Controller])` aceita rotas só de teste (ver `rota-de-teste.ts`).
  - Local: `DATABASE_URL_TESTE=postgresql://postgres:teste@localhost:55432/leai_teste_leitura npm run test:integration`, com um banco **separado** do usado pelo acervo (`createdb -U postgres leai_teste_leitura` no container), porque os dois fixtures recriam os mesmos schemas.
  - A CI (`ci-back-leitura.yml`) sobe Postgres 17 e roda o mesmo comando.
- **Lint no Windows:** com `core.autocrlf=true`, o checkout vem em CRLF e o `prettier/prettier` acusa todo arquivo. O Git grava LF; para conferir o resto localmente, rode `npx eslint "src/**/*.ts" --rule '{"prettier/prettier": ["error", {"endOfLine": "auto"}]}'`.

## Pontos de atenção (ver `REQUISITOS.md`) — prioridade de teste

- **Máquina de estados da leitura (RN-04)** — Quero ler / Lendo / Lido / Relendo / Abandonado, releitura, retomada. **Teste obrigatório e prioritário** (RNF-TST-01).
- **Inatividade e abandono automático (RN-05)** — alertas nos dias 20 e 30, abandono no dia 40, via job diário. **Teste obrigatório e prioritário.**
- **Registro de progresso (RN-17):** o leitor informa sempre a **página em que parou** (valor absoluto, monotônico); páginas lidas e percentual são **derivados**. Rejeitar página ≤ atual ou > total (RF-PRG-04).
- **Sessão cronometrada (RN-16):** estado local no dispositivo; o backend só recebe a atualização de progresso resultante do encerramento.
- **Desafios (RN-20)** e **streak (RN-18):** alimentados por `progresso.registrado` e `leitura.finalizada`.
- Nota (RN-06) e resenha (RN-07, Markdown por RN-13) pertencem ao **livro**, não à leitura.
- Publica eventos: `nota.alterada`, `leitura.em_risco`, `leitura.expirada`, `livro.adicionado_a_estante`, `resenha.curtida`, e os que originam atividades/notificações.
- **Fila offline** do cliente móvel (RNF-ERR-05) exige escrita **idempotente** com chave de idempotência (RNF-ERR-04).
