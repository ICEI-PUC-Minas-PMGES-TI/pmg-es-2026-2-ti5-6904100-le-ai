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
  - `src/main.ts` — bootstrap: correlation-id, `helmet` (RNF-SEC-24), CORS restrito (RNF-SEC-21), `trust proxy` (necessário para o rate limiting por IP), `ValidationPipe` com `forbidNonWhitelisted` e corpo de erro próprio, Swagger em `/docs` com `bearerAuth`.
  - `src/common/` — `correlation.middleware.ts` + `als.ts` (RNF-OBS-01); `all-exceptions.filter.ts` + `error-codes.ts` + `erros-de-negocio.ts` → corpo `{ codigo, mensagem, correlationId }` (RNF-ERR-01, pt-BR, sem stack trace), com `extras` para os campos que o contrato define por resposta; `isbn.ts`, `url-capa.ts`, `hash-payload.ts`, `pg-erros.ts`; `idempotencia/` e `rate-limit/`.
  - `src/auth/` — validação do token HS256 emitido pelo `identidade`, guard global e `@UsuarioAtual()`.
  - `src/db/` — `drizzle.module.ts` (provider `DRIZZLE`), `schema.ts` (`pgSchema`), `migrate.ts`, `tipos.ts` (`Tx`), `contratos-externos.ts` (VIEWs de outros schemas).
  - `src/livros/` — domínio de F-ACV-CADASTRO: `importacao/` (por ISBN, com `dominio/` das fontes externas), `pessoal/` (CRUD e consulta autorizada) e `outbox/`.
  - `src/health/` — `GET /health` via `@nestjs/terminus` + indicador Drizzle (`SELECT 1`) (RNF-OBS-02).
- **Comandos:** `npm run start:dev` · `npm run build` · `npm test` · `npm run lint` · `npm run db:generate` · `npm run db:migrate`. `npm run start:prod` aplica migrations antes de iniciar a API.
- **Testes:** Jest + ts-jest; specs em `src/**/*.spec.ts`, ao lado do arquivo testado. Tudo roda sem banco e sem rede: `fetch`, relógio e repositórios são injetados. Testes que exigem banco real seguem pendentes (ver abaixo).
- **OpenAPI:** `@nestjs/swagger` em runtime (`/docs`); esqueleto commitado em [`docs/api/acervo.yaml`](../../../docs/api/acervo.yaml) (RNF-ARQ-03).

## Pontos de atenção (ver `REQUISITOS.md`)

- **Livro = edição** (RN-01); **ISBN-13** é chave natural única do livro oficial (RN-02). **Livro pessoal não tem ISBN** e fica fora de busca, catálogo, filtros e páginas de autor/editora/série (RNF-SEC-06).
- **Cadastro por ISBN:** ISBN validado por formato e dígito verificador; URL da fonte externa construída pelo servidor a partir de **allowlist** — nunca aceitar URL do usuário (RNF-SEC-38/39, anti-SSRF). Fontes: OpenLibrary → Google Books.
- **Sinopse** e **capas** por **cache sob demanda**, não na carga inicial (RN-19, RN-14). Ordem de exibição da capa: cópia própria → URL externa → placeholder.
- **Assuntos** normalizados de conjunto curado e fechado na ingestão (RN-21); tag externa sem correspondência não cria assunto.
- **Nota geral** externa é somente-leitura, importada quando a fonte fornece (RN-06); nunca combinada com a nota dos leitores.
- Ingestão via **script utilitário** (carga do dump OpenLibrary), não serviço; dados externos validados e normalizados antes de persistir (RNF-SEC-33).
- Produz/consome: `livro.importacao_solicitada`, `livro.pagina_aberta`, `livro.adicionado_a_estante` (consome, cache de capa), `nota.alterada` (consome, refresh da agregada).

## Decisões de F-ACV-CADASTRO que valem como regra

Implementado em 18/09/2026. Ao mexer nestes pontos, mexa sabendo por que estão assim.

- **O guard de autenticação é global** (`APP_GUARD`), e `/health` se libera com `@Publico()`. Rota nova nasce protegida: o custo de esquecer o decorator é um 401, não um vazamento.
- **`JWT_SECRET` precisa ser idêntico ao do `identidade`.** Ele assina HS256 com os bytes UTF-8 crus da string. Obrigatório em produção; ausente em desenvolvimento, o serviço sobe e toda rota autenticada dá 401, com aviso no boot. Está declarado no `render.yaml`.
- **Idempotência é serviço chamado pelo handler, nunca interceptor.** O recibo em `idempotencia_acervo` precisa ser a última operação da **mesma transação** do efeito; um interceptor roda depois do commit e abriria janela para efeito duplicado. O hash do payload é canônico, com chaves ordenadas.
- **O correlation-id só aceita UUID.** `outbox_acervo.correlation_id` é `uuid NOT NULL`, e um header malformado derrubaria a transação do `202`.
- **VIEWs de outros schemas ficam em `src/db/contratos-externos.ts`, com `.existing()`**, e esse arquivo fica **fora** de `schema.ts`. Sem isso o drizzle-kit geraria `CREATE VIEW` em schema de outro dono.
- **Repositório recebe `tx`, nunca usa o `db` global dentro de transação.** Sobre um `Pool`, o `db` global pega outra conexão e a escrita commitaria sozinha.
- **Erro do Postgres vem em `err.cause.code`**, não em `err.code`: o Drizzle embrulha o erro do driver (ver `pg-erros.ts`).
- **Ausência e indisponibilidade são estados diferentes** na busca externa. Fonte que responde "não conheço este ISBN" leva a `nao_encontrado` e à oferta de cadastro pessoal; fonte que não responde leva a `falha_transitoria`, reprocessável. Nunca colapse os dois.
- **Três CHECKs do modelo físico são fáceis de violar** e por isso estão centralizados em helpers: `sinopse` e `sinopse_status` andam juntos e o default `nao_consultada` viola o CHECK de livro pessoal; `capa_url_propria` e `capa_asset_id` andam juntos; e o estado da importação amarra `livro_id` e `erro`.
- **O consumidor de importação não tem acionador.** `ProcessadorImportacao` não é registrado no módulo: ele espera o runtime AMQP de P0-MSG. Não improvise um poller de outbox aqui — o dispatcher é de P0-MSG.

## Pendências do serviço

- Testes de integração com banco real (RNF-TST-02) e o seed reproduzível de RNF-TST-08 ainda não existem; o `ci-back-acervo.yml` não tem service container de Postgres.
- As VIEWs de `leitura`, `social` e `identidade` são consultadas em runtime. Se o grupo separar roles por serviço no Neon, `acervo` precisa de `GRANT USAGE` nos três schemas e `GRANT SELECT` nas VIEWs. Falha de permissão vira 503, não 500, mas continua sendo falha.
- Índice de busca de RNF-DES-03 tem só `lower(titulo)` em btree; busca por autor e por ISBN entra com F-ACV-BUSCA.
