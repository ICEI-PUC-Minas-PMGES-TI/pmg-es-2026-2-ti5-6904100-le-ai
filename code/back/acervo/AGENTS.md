# AGENTS.md — Serviço `acervo`

Complementa o [`AGENTS.md`](../../../AGENTS.md) da raiz (regras gerais) e o [`code/back/README.md`](../README.md) (visão dos serviços). Fonte de verdade: [`docs/orquestador/REQUISITOS.md`](../../../docs/orquestador/REQUISITOS.md); arquitetura: [`docs/orquestador/documento-de-arquitetura.md`](../../../docs/orquestador/documento-de-arquitetura.md).

## Domínio

Livro (oficial e pessoal), autor, editora, série, busca e filtros, ingestão, sinopse, capas e **nota agregada** (materializada). Requisitos: **ACV**.

## Stack e dados

- **Stack:** **NestJS (TypeScript)** — decidido pela equipe em 02/09/2026 (arquitetura §2.1); mesma stack que `leitura`, como recomendado. Fixado no scaffolding P0-INFRA (11/09/2026): **Node 22 LTS**, gerenciador **npm** (lockfile `package-lock.json`, RNF-SEC-25) e **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`, driver `pg`).
- **Schema:** `acervo`, no PostgreSQL único do Neon. É o serviço **mais dependente de busca e filtro relacional** — índices sobre título, autor e ISBN (RNF-DES-03).
- **Nota dos leitores (agregada)** é uma projeção local alimentada pelo evento `nota.alterada`; nunca lê a tabela privada `leitura.nota`.

> **Modelo físico do DER (16/09/2026):** as 15 tabelas e as VIEWs de contrato
> de `acervo` foram declaradas no Drizzle e versionadas em migration. A
> existência da estrutura não significa que as features de domínio estejam
> implementadas.

## Estrutura, comandos e ferramentas (P0-INFRA)

- **Runtime:** Node 22 LTS (`.nvmrc`), **npm** com `package-lock.json` versionado (RNF-SEC-25).
- **ORM/migrations:** **Drizzle** (`drizzle-orm`) + **drizzle-kit**; schema-por-serviço via `pgSchema('acervo')`, com nomes qualificados no SQL e sem depender de `search_path` na `DATABASE_URL`. Migrations em `drizzle/*.sql` (SQL revisável), aplicadas por `npm run db:migrate` — **cada migration revisada por humano** antes de subir (plano §5); só tabelas do schema `acervo`.
- **Config:** `@nestjs/config` + validação `zod` (`src/config/env.ts`) — não sobe com env inválida. `.env.example` versionado, `.env` nunca (RNF-SEC-11).
- **Estrutura:**
  - `src/main.ts` — bootstrap: correlation-id, `helmet` (RNF-SEC-24), CORS restrito (RNF-SEC-21), `ValidationPipe`, Swagger em `/docs`.
  - `src/common/` — `correlation.middleware.ts` + `als.ts` (RNF-OBS-01); `all-exceptions.filter.ts` + `error-codes.ts` → corpo `{ codigo, mensagem, correlationId }` (RNF-ERR-01, pt-BR, sem stack trace).
  - `src/db/` — `drizzle.module.ts` (provider `DRIZZLE`), `schema.ts` (`pgSchema`), `migrate.ts`.
  - `src/health/` — `GET /health` via `@nestjs/terminus` + indicador Drizzle (`SELECT 1`) (RNF-OBS-02).
- **Comandos:** `npm run start:dev` · `npm run build` · `npm test` · `npm run lint` · `npm run db:generate` · `npm run db:migrate`. `npm run start:prod` aplica migrations antes de iniciar a API.
- **Testes:** Jest + ts-jest; specs em `src/**/*.spec.ts`. Mínimo atual: health e filtro de erro/correlation-id (testes de domínio entram com as features).
- **OpenAPI:** `@nestjs/swagger` em runtime (`/docs`); esqueleto commitado em [`docs/api/acervo.yaml`](../../../docs/api/acervo.yaml) (RNF-ARQ-03).

## Pontos de atenção (ver `REQUISITOS.md`)

- **Livro = edição** (RN-01); **ISBN-13** é chave natural única do livro oficial (RN-02). **Livro pessoal não tem ISBN** e fica fora de busca, catálogo, filtros e páginas de autor/editora/série (RNF-SEC-06).
- **Cadastro por ISBN:** ISBN validado por formato e dígito verificador; URL da fonte externa construída pelo servidor a partir de **allowlist** — nunca aceitar URL do usuário (RNF-SEC-38/39, anti-SSRF). Fontes: OpenLibrary → Google Books.
- **Sinopse** e **capas** por **cache sob demanda**, não na carga inicial (RN-19, RN-14). Ordem de exibição da capa: cópia própria → URL externa → placeholder.
- **Assuntos** normalizados de conjunto curado e fechado na ingestão (RN-21); tag externa sem correspondência não cria assunto.
- **Nota geral** externa é somente-leitura, importada quando a fonte fornece (RN-06); nunca combinada com a nota dos leitores.
- Ingestão via **script utilitário** (carga do dump OpenLibrary), não serviço; dados externos validados e normalizados antes de persistir (RNF-SEC-33).
- Produz/consome: `livro.importacao_solicitada`, `livro.pagina_aberta`, `livro.adicionado_a_estante` (consome, cache de capa), `nota.alterada` (consome, refresh da agregada).
