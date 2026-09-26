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
  - Módulos de feature (`src/estante/`, `src/leituras/`, `src/jobs/inatividade/`) em camadas, com `<modulo>.module.ts` na raiz do módulo e specs ao lado do arquivo:
    - `dominio/` — regras puras (ex.: `maquina-estados.ts`, builders de `eventos.ts`); não importa nada de `@nestjs/*` nem de `drizzle-orm`.
    - `aplicacao/` — services/casos de uso: transação, domínio, outbox, idempotência.
    - `infraestrutura/` — repositories Drizzle.
    - `api/` — controllers, guards HTTP e `dto/` (validação, Swagger).
    - Dependência só para dentro: `api → aplicacao → dominio` e `aplicacao → infraestrutura`. `aplicacao` pode usar os tipos de `api/dto` como contrato de entrada/saída; `dominio` e `infraestrutura` nunca importam `api/`. `common/`, `auth/`, `outbox/`, `referencias/`, `db/` e `messaging/` são transversais e ficam planos.
- **Comandos:** `npm run start:dev` · `npm run build` · `npm test` · `npm run lint` · `npm run db:generate` · `npm run db:migrate`. `npm run start:prod` aplica migrations antes de iniciar a API.
- **Testes:** Jest + ts-jest; specs em `src/**/*.spec.ts`. Mínimo atual: health e filtro de erro/correlation-id. **A máquina de estados (RN-04) e a inatividade/abandono (RN-05) são teste obrigatório e prioritário (RNF-TST-01)** — entram com as features de domínio; escritas idempotentes (RNF-ERR-04) idem.
- **OpenAPI:** `@nestjs/swagger` em runtime (`/docs`); esqueleto commitado em [`docs/api/leitura.yaml`](../../../docs/api/leitura.yaml) (RNF-ARQ-03).

## Pontos de atenção (ver `REQUISITOS.md`) — prioridade de teste

- **Máquina de estados da leitura (RN-04)** — Quero ler / Lendo / Lido / Relendo / Abandonado, releitura, retomada. **Teste obrigatório e prioritário** (RNF-TST-01).
- **Inatividade e abandono automático (RN-05)** — alertas nos dias 20 e 30, abandono no dia 40, via job diário. **Teste obrigatório e prioritário.**
- **Registro de progresso (RN-17):** o leitor informa sempre a **página em que parou** (valor absoluto, monotônico); páginas lidas e percentual são **derivados**. Rejeitar página ≤ atual ou > total (RF-PRG-04).
- **Sessão cronometrada (RN-16):** estado local no dispositivo; o backend só recebe a atualização de progresso resultante do encerramento.
- **Desafios (RN-20)** e **streak (RN-18):** alimentados por `progresso.registrado` e `leitura.finalizada`.
- Nota (RN-06) e resenha (RN-07, Markdown por RN-13) pertencem ao **livro**, não à leitura.
- Publica eventos: `nota.alterada`, `leitura.em_risco`, `leitura.expirada`, `livro.adicionado_a_estante`, `resenha.curtida`, e os que originam atividades/notificações.
- **Fila offline** do cliente móvel (RNF-ERR-05) exige escrita **idempotente** com chave de idempotência (RNF-ERR-04).
