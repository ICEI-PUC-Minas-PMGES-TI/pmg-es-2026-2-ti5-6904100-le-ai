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
  - `src/main.ts` — bootstrap e Swagger em `/docs` com `bearerAuth`. O pipeline HTTP (correlation-id, `helmet` (RNF-SEC-24), CORS restrito (RNF-SEC-21), `trust proxy` para o rate limiting por IP, `ValidationPipe` com `forbidNonWhitelisted` e corpo de erro próprio) fica em `src/configurar-app.ts`, que os testes de integração reaproveitam.
  - `src/common/` — `correlation.middleware.ts` + `als.ts` (RNF-OBS-01); `all-exceptions.filter.ts` + `error-codes.ts` + `erros-de-negocio.ts` → corpo `{ codigo, mensagem, correlationId }` (RNF-ERR-01, pt-BR, sem stack trace), com `extras` para os campos que o contrato define por resposta; `isbn.ts`, `url-capa.ts`, `hash-payload.ts`, `pg-erros.ts`; `idempotencia/` e `rate-limit/`.
  - `src/auth/` — validação do token HS256 emitido pelo `identidade`, guard global e `@UsuarioAtual()`.
  - `src/db/` — `drizzle.module.ts` (provider `DRIZZLE`; encerra o pool no shutdown), `schema.ts` (`pgSchema`), `migrate.ts`, `seed.ts` (massa de RNF-TST-08), `tipos.ts` (`Tx`), `contratos-externos.ts` (VIEWs de outros schemas).
  - `src/messaging/` — runtime AMQP de P0-MSG: conexão, dispatcher da outbox, publisher, consumidor genérico com recibo em `mensagem_processada`, retry `1/5/15 s` e DLQ, validador de envelope e de `data`. O handler recebe o `tx` do recibo.
  - `src/livros/` — domínio de F-ACV-CADASTRO: `importacao/` (por ISBN, com `dominio/` das fontes externas, o consumidor `importacao.consumer.ts` e a convergência `convergencia.repository.ts`), `pessoal/` (CRUD e consulta autorizada) e `outbox/`. De F-ACV-BUSCA: `busca/` (`GET /assuntos`, `GET /livros`, a página `GET /livros/{id}` e `GET /livros/{id}/resenhas`), `sinopse/` (consumidor de `livro.pagina_aberta` e as fontes de sinopse) e `capa.ts`.
  - `src/health/` — `GET /health` via `@nestjs/terminus` + indicador Drizzle (`SELECT 1`) (RNF-OBS-02).
- **Comandos:** `npm run start:dev` · `npm run build` · `npm test` · `npm run test:integration` · `npm run lint` · `npm run db:generate` · `npm run db:migrate` · `npm run db:seed`. `npm run start:prod` aplica migrations antes de iniciar a API.
- **Testes unitários:** Jest + ts-jest; specs em `src/**/*.spec.ts`, ao lado do arquivo testado. Rodam sem banco e sem rede: `fetch`, relógio e repositórios são injetados.
- **Testes de integração:** `test/integracao/*.int-spec.ts`, contra um Postgres **descartável** em `DATABASE_URL_TESTE` (o fixture derruba e recria os schemas, e recusa URL do Neon ou do Render). Sobem o app com o mesmo pipeline de produção, aplicam as migrations reais e criam as VIEWs de `social`, `identidade` e `leitura` como tabelas, para a massa de RN-15 entrar por INSERT. O caminho assíncrono usa o dispatcher, o publisher e o consumidor reais sobre um broker em memória. Local:
  ```bash
  docker run -d --name leai-pg-teste -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=leai_teste -p 55432:5432 postgres:17-alpine
  DATABASE_URL_TESTE=postgresql://postgres:teste@localhost:55432/leai_teste npm run test:integration
  ```
  No CI, o `ci-back-acervo.yml` sobe um service container de Postgres.
- **OpenAPI:** `@nestjs/swagger` em runtime (`/docs`); contrato commitado em [`docs/api/acervo.yaml`](../../../docs/api/acervo.yaml) (RNF-ARQ-03), com as 12 operações de F-ACV-BUSCA e F-ACV-CADASTRO `implemented`.

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
- **O consumidor de importação usa o runtime de P0-MSG** (`ImportacaoConsumer`, fila `leai.acervo.importacao`). Os três desfechos de domínio — `concluida`, `nao_encontrado`, `falha_transitoria` — são gravados e confirmados; `falha_transitoria` **não lança**, porque já é o fim da política por fonte e habilita o `reprocessar`. Só erro inesperado lança e vai ao retry/DLQ. A convergência escreve com o `tx` do recibo. Não improvise poller de outbox: o dispatcher é de P0-MSG.
- **Checagem de estado dentro do efeito idempotente.** Propriedade e estado são verificados dentro do callback de `IdempotenciaService.executar`, depois da leitura do recibo: senão o reenvio de uma exclusão bem-sucedida responderia 404, e o de um reprocessamento, 409.
- **A OpenLibrary redireciona `/isbn/{isbn}.json` para `/books/{olid}.json`.** O `HttpExterno` segue redirect só dentro da allowlist, revalidando cada salto. Muitas edições não têm `authors`; a fonte usa o primeiro autor da obra.
- **Schema de mensageria é cópia do canônico.** Cada consumidor copia de `docs/mensageria/schemas/` só o que aceita para `src/messaging/schemas/`, e `schemas.spec.ts` falha se a cópia divergir.

## Decisões de F-ACV-BUSCA que valem como regra

Implementado em 26/09/2026.

- **Os objetos de busca ficam na migration `0004`, fora do `schema.ts`**, como `mensagem_processada`: as extensões `pg_trgm` e `unaccent` em `public`, a função `acervo.f_busca_normalizar` (IMMUTABLE, com o dicionário do `unaccent` explícito) e os índices GIN de título, autor e editora. O drizzle-kit não os conhece e não os recria nem os derruba.
- **Tudo qualificado por schema**, na migration e na consulta (`public.word_similarity`, `public.gin_trgm_ops`). A CI **não** pega o esquecimento: o `prepararBanco` roda as migrations com `public` no `search_path`. Confira por `grep` antes de revisar uma migration.
- **A busca casa só por trecho (`LIKE` sobre o texto normalizado); a semelhança só ordena.** Com a semelhança no filtro, "guimaraes rossa" traria Guimarães Rosa, e o design pede vazio. Os candidatos saem de um `UNION ALL` por campo, cada um indexável, e o predicado `tipo = 'oficial' AND ativo` é literal, para casar o índice parcial.
- **Palavra por palavra, no mesmo campo (27/09/2026).** `palavrasDaBusca` quebra o `q` por espaço, e cada palavra vira um `LIKE` no campo (todas com AND). É o que faz "grande sertao veredas" achar "Grande sertão: veredas" sem migration nova. Pontuação nas pontas sai; palavra só de pontuação sai quando há outra com letra; sem nenhuma, fica (`%` acha "100% amor"). Repetida ou contida em outra sai, e o teto é `MAXIMO_DE_PALAVRAS` (8), as mais longas: cada palavra é um `LIKE` em cada um dos quatro campos, duas vezes (contagem e página).
- **Ordem: casamento integral, depois campo, depois semelhança.** Título idêntico ao texto (sem pontuação) vale 12, autor idêntico 10, e só então título 6, autor 4, editora 2 e assunto 0 que *contêm* o texto; a semelhança (`0.75 * word_similarity + 0.25 * similarity`) soma até 1 dentro do degrau. ISBN exato vale 20. Mexer nesses pesos muda a ordem que os testes de integração fixam.
- **ISBN-10 só na busca:** `isbn13DeIsbn10` converte para o ISBN-13 da edição. `normalizarIsbn13`, do cadastro, continua recusando ISBN-10.
- **As edições de uma obra chegam contíguas** (título normalizado + autores; livro sem autor usa o próprio id). O cliente agrupa só vizinhos.
- **Toda transição de sinopse grava `atualizado_em = now()`**, na `GET /livros/{id}` e no consumidor. Ele é o relógio do reenfileiramento: `falha_transitoria` há mais de 10 minutos e `pendente` há mais de 15 minutos voltam a pedir a sinopse. `atualizado_em` não tem trigger.
- **O pedido da sinopse é um UPDATE condicional com `lock_timeout` de 1 s**, na mesma transação da outbox. O estouro (`55P03`) aborta a transação e é tratado fora dela, como no-op: a página não espera o consumidor.
- **A política das fontes de sinopse é mais curta que a da importação** (uma retentativa de 1 s, mesmo circuit breaker): a fila processa um livro por vez, e `falha_transitoria` já é reprocessável na próxima abertura.
- **`@RateLimit` com `escopo`.** O guard é uma instância só por módulo, e sem escopo as rotas dividem os contadores de `ip:` e `sub:`. A página do livro usa o escopo `pagina-do-livro`, com 60 por identidade e **600 por IP**: uma turma atrás do mesmo NAT abre livros ao mesmo tempo, e o polling da sinopse soma até 7 consultas por abertura no primeiro minuto.
- **Resenhas da página filtradas por RN-08 no SQL**: autor público ou privado seguido, sem a resenha do próprio leitor. Cursor keyset `(criado_em, resenha_id)` com o instante em texto do Postgres, com microssegundos. VIEW de outro serviço inacessível vira `resenhas: null` na página e 503 na rota de resenhas.

## Mudanças de 27/09/2026 no código comum (validação de F-ACV-BUSCA)

Para quem mexe no cadastro e na importação saber que isto mudou por baixo:

- **`mapError` (`error-codes.ts`)** agora devolve **503 `SERVICO_INDISPONIVEL`** para banco fora do ar (`ehBancoIndisponivel` em `pg-erros.ts`: falhas de conexão da classe `08` exceto o `08P01`, que é violação de protocolo e costuma ser bug; `57P01` a `57P03`, `53300`, erros de rede e o pool sem conexão) e **413 `CORPO_MUITO_GRANDE`** para o erro do body-parser, que não é `HttpException`. Antes os dois saíam 500. Mesma correção do `leitura`.
- **`montarErroDeValidacao` (`validacao.ts`)** troca a mensagem do `forbidNonWhitelisted` ("property x should not exist") por "Este campo não é aceito.".
- **`VerificadorJwt`** recusa token sem `exp`: o `jwt.verify` só confere a expiração quando ela existe.
- **`textoPuro`** decodifica as entidades e tira de novo só os nomes de tag HTML conhecidos (HTML escapado virava tag gravada; "&lt;&lt;O Guarani&gt;&gt;" e "&lt;e-mail&gt;" são texto e ficam) e remove caracteres de controle. Hoje só a sinopse usa.
- **`isbn.ts`** ganhou `isbn13DeIsbn10`; `normalizarIsbn13` não mudou.

## Pendências do serviço

- A busca externa roda dentro da transação do recibo do consumidor: no pior caso (timeouts e backoff `1/5/15 s` nas duas fontes) a transação fica aberta por dezenas de segundos no Neon. Aceitável no volume do MVP; se pesar, separar a consulta às fontes do efeito exige recibo em duas fases.
- O Google Books sem `GOOGLE_BOOKS_API_KEY` responde 429 por cota (medido em 22/09/2026, como na P-14).
- As VIEWs de `leitura`, `social` e `identidade` são consultadas em runtime. Se o grupo separar roles por serviço no Neon, `acervo` precisa de `GRANT USAGE` nos três schemas e `GRANT SELECT` nas VIEWs. Falha de permissão vira 503, não 500, mas continua sendo falha.
- A fila da sinopse processa um livro por vez (`prefetch(1)`), com até ~35 s por livro no pior caso. Livros abertos em sequência esperam; o polling de ~2 minutos dos clientes cobre alguns na fila à frente.
- **Evento publicado antes de a fila existir se perde.** O dispatcher da outbox começa quando o canal de publicação fica pronto, e as filas dos consumidores são declaradas em paralelo, sem `mandatory`. Na primeira subida com outbox acumulada (visto em 27/09 no broker de dev, com `leai.acervo.sinopse` ainda inexistente), o primeiro `livro.pagina_aberta` saiu antes do binding e o broker o descartou. A sinopse se recupera pela regra dos 15 minutos de `pendente`; a importação ficaria `pendente` até o `reprocessar`. Correção sugerida no runtime de P0-MSG: esperar a topologia dos consumidores do próprio serviço antes de despachar.
