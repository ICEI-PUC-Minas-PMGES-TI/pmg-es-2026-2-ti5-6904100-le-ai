# Plano — F-ACV-BUSCA (Busca e página do livro)

## Contexto

F-ACV-BUSCA é o "encontrar um livro" do ciclo de valor: busca paginada do acervo oficial (RF-ACV-01/02), página do livro (RF-ACV-04) e sinopse sob demanda assíncrona (RF-ACV-18/19, RN-19). Dono: Renato. Hoje só existe o baseline físico do DER; backend, web e mobile estão em zero. Os placeholders `DescobrirView.vue`, `LivroOficialPlaceholderView.vue`, `descobrir_page.dart` e `LivroOficialPlaceholderPage` já estão roteados esperando esta feature. É também a hospedeira da UI de F-AVA, a próxima feature do Renato.

Os dados reais no Neon (`production`) foram medidos:
- 11.011 livros oficiais e 31 assuntos, todos com `sinopse_status = nao_consultada` e com capa externa.
- 701 livros sem autor, 40 sem editora e 56 sem ano.
- No máximo 6 edições por obra.
- Não há `pg_trgm` instalado.

## Decisões já tomadas (com o Renato)

- **Branch `renato-features`**, saindo de `desenvolvimento` atualizada e voltando por PR, como a `vicenzo-features` (PR #41). O CI roda em qualquer push, filtrado por caminho.
- **Banco de dev: `production` compartilhada**, que é o que o time usa. Por isso, nada de schema é aplicado nela sem revisão humana.
- **Mensageria local: CloudAMQP compartilhado com `AMQP_ENABLED=true`.** Banco e broker são os mesmos do time, então o ambiente fica coerente. O outbox do `acervo` está hoje com 0 linhas pendentes.
- **Índice de busca: migration nova com `pg_trgm` + `unaccent`.**
- **Ajustes de contrato aprovados:** `GET /assuntos`; `editora` e `anoPublicacao` anuláveis; `autores` com `minItems: 0`.
- **Ajustes não aprovados, que viram divergência registrada:** `@username` e estrelas no card de resenha, e a contagem "28 resenhas".
- **Node:** seguir com o 24.14.1 atual, com aviso de engine. O CI continua sendo a prova de Node 22 (acervo) e 24.19 (front).
- **Commits sem `Co-Authored-By`**, por regra da memória. Formato Conventional Commits.

## Pré-requisito na sua máquina

- **Abrir o Docker Desktop.** O CLI está instalado, mas o daemon está parado. `npm run test:integration` exige Postgres local, porque `test/integracao/ambiente.ts` recusa URL do Neon: `docker run -d --name leai-pg-teste -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=leai_teste -p 55432:5432 postgres:17-alpine`. Sem Docker, a integração só roda no CI.

## Fase 0 — Branch e ambiente

1. `git pull --rebase` na `desenvolvimento`, depois `git switch -c renato-features`. O primeiro push usa `-u origin renato-features`.
2. Criar os `.env`, todos já cobertos por `.gitignore` (conferido com `git check-ignore`):
   - **`code/back/acervo/.env`:**
     - `DATABASE_URL` do papel `leaidb_prd`, via `mcp__neon__get_connection_string`, com `options=-csearch_path%3Dacervo`.
     - `DB_SCHEMA=acervo`.
     - `JWT_SECRET` gerado localmente (48 bytes base64).
     - `AMQP_URL` do CloudAMQP e `AMQP_ENABLED=true`.
     - `CORS_ALLOWED_ORIGINS=http://localhost:5173`.
     - O restante segue o `.env.example`.
   - **`code/back/identidade/.env`:**
     - `DATABASE_URL` em JDBC, mais `DATABASE_USERNAME` e `DATABASE_PASSWORD`.
     - O **mesmo** `JWT_SECRET` do acervo.
     - `FLYWAY_ENABLED=false`, para não aplicar nada no banco compartilhado.
     - Chaves Brevo informadas; `ADMIN_EMAIL` e `ADMIN_PASSWORD` vazios (sobe sem admin).
     - Formato `.properties`: sem comentário na linha e sem aspas.
   - **`code/front/.env.local`:** `VITE_IDENTIDADE_BASE_URL=http://localhost:8080`, `VITE_ACERVO_BASE_URL=http://localhost:3000` e os presets Cloudinary do `.env.example`.
   - **`code/mobile/.env`:** URLs com `10.0.2.2`, usado com `flutter run --dart-define-from-file=.env`.
3. Smoke test: subir `identidade` (`./mvnw spring-boot:run`) e `acervo` (`npm run start:dev`), fazer login pela web local e chamar `GET /health`.

## Fase 1 — Migration de busca (checkpoint humano)

**Arquivo:** `code/back/acervo/drizzle/0004_<timestamp>_indices_busca.sql`, escrito à mão como o `0003`, com nova entrada no `meta/_journal.json`.

**Conteúdo:**
- `CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public` e o mesmo para `unaccent`. Segue o precedente do `citext`, que está em `public`; o papel `leaidb_prd` tem CREATE no banco.
- Função `acervo.f_busca_normalizar(text)` `IMMUTABLE PARALLEL SAFE STRICT`, igual a `lower(public.unaccent('public.unaccent'::regdictionary, $1))`.
- Índices GIN com `public.gin_trgm_ops` sobre `acervo.f_busca_normalizar(...)`:
  - `livro.titulo`, parcial em `tipo='oficial' AND ativo`;
  - `autor.nome`;
  - `editora.nome`.
- Como `search_path` é só `acervo`, toda referência a `public` vai qualificada.

**Fora do `schema.ts`, de propósito.** Mesmo precedente de `mensagem_processada`: o drizzle-kit não conhece esses objetos, e um `db:generate` futuro não os duplica. Isso fica registrado no `AGENTS.md` do acervo.

**Checkpoint:** o Renato revisa a migration (AGENTS §5.6). Só depois, com OK explícito, rodo `npm run db:migrate` contra a `production`. É aditiva: o código de `main` no DES segue funcionando. Até lá o desenvolvimento avança pelos testes de integração, que aplicam as migrations no Postgres do Docker.

## Fase 2 — Backend: `GET /assuntos` e `GET /livros`

**Novo módulo:** `src/livros/busca/` (controller, service, repository e specs), seguindo o padrão de `src/livros/pessoal/` e registrado no `LivrosModule`.

**`GET /assuntos`**
- Retorna `{ itens: AssuntoResumo[] }` ordenado por nome, com `LIMIT 100` imposto pelo servidor. É o conjunto fechado de RN-21.1; a justificativa de RNF-DES-02 fica no spec.

**`GET /livros?q&assunto&page&limit`**
- **Validação:** DTO de query com class-validator e `@Type(() => Number)`, porque o `ValidationPipe` global usa `forbidNonWhitelisted` e não faz conversão implícita.
  - `q` com 1 a 200 caracteres; `assunto` UUID; `page` ≥ 1; `limit` de 1 a 50, padrão 20.
  - Sem `q` e sem `assunto` → `ErroDeValidacao` (400).
- **Consulta** em `sql```, com parâmetros e somente `tipo='oficial' AND ativo` (SEC-06). O `q` é normalizado por `acervo.f_busca_normalizar` e casa por trecho (`ILIKE`, servido pelo índice trigram) em:
  - título;
  - autor, via `livro_autor`;
  - editora;
  - **nome do assunto** (RN-21.6: o assunto integra o índice; o protótipo busca `terror`).
  - Se o `q` for ISBN-13 válido (`normalizarIsbn13` de `src/common/isbn.ts`), vira match exato em `isbn13`.
- **Filtro** `assunto` por `EXISTS livro_assunto`.
- **Ordenação:**
  - Relevância por `word_similarity`, com título > autor > editora > assunto.
  - Chave de grupo: título normalizado + ids de autores ordenados. A pontuação do grupo é `max() OVER (PARTITION BY grupo)`, e a ordem final é pontuação do grupo, grupo, ano desc, id. Assim as edições da mesma obra chegam **contíguas**, e o cliente agrupa sem mudar o modelo (RN-01).
  - `count(*) OVER ()` fornece o `totalItens`.
- **Resposta:** `autores` e `assuntos` via `json_agg`. A capa sai de uma nova `resolverCapa()` em `src/livros/capa.ts` (`propria` → `externa` → `placeholder`, RN-14.4). Por CHECK, o livro oficial sempre tem URL externa; o placeholder visual é o fallback do cliente quando a imagem falha.

**Testes**
- **Unitários:** DTO, `resolverCapa` e mapeamento.
- **Integração:** `test/integracao/busca.int-spec.ts`:
  - título, autor, editora, assunto e ISBN;
  - busca sem acento;
  - filtro, paginação, teto de 50 e 400s;
  - livro pessoal e inativo nunca aparecem;
  - forma exata de `PaginaLivros`;
  - contiguidade das edições.
- Estender `limpar()` em `test/integracao/banco.ts` para incluir `assunto` e `serie`, e criar fábricas de autor, editora e assunto em `massa.ts`.

## Fase 3 — Backend: `GET /livros/{id}`, `GET /livros/{id}/resenhas` e o gatilho da sinopse

**`GET /livros/{id}`**
- `ParseUUIDPipe`; livro inexistente, pessoal ou inativo → `NaoEncontrado`.
- Numa `this.db.transaction`, um UPDATE condicional com `RETURNING`, no padrão de `ImportacaoRepository.reabrir`, troca o status para `pendente` quando ele é:
  - `nao_consultada`;
  - `falha_transitoria` há mais de 10 min (reenfileiramento controlado);
  - `pendente` há mais de 15 min. Isso resgata um `pendente` órfão depois da DLQ sem mexer no runtime de P0-MSG.
- Só se houver linha: `OutboxRepository.inserir(tx, { tipo: 'livro.pagina_aberta', versao: 1, chaveNegocio: 'livro:<id>:sinopse', payload: { livroId } })`. Duas aberturas concorrentes geram um evento só, pelo lock de linha.
- Constante do evento em `src/livros/outbox/eventos.ts`.
- **Resposta:** resumo + `isbn` + `sinopse { status, texto }` + a primeira `PaginaResenhas` (limite 10). Nunca espera a fonte externa.

**`GET /livros/{id}/resenhas?cursor&limit`**
- **Cursor keyset** `(criado_em, resenha_id)` em base64url, com até 500 caracteres; inválido → 400 no campo `cursor`. `limit` até 50; busca `limit + 1` para calcular o `proximoCursor`.
- **Filtro RN-08, novo e reutilizável** (o existente de RN-15 não serve), em `src/livros/busca/resenhas.repository.ts`:
  - `vResenhaPublicacao` com `innerJoin vPerfilReferencia`. A VIEW já omite contas suspensas e em exclusão.
  - Condição: `privacidade = 'publico' OR EXISTS vSeguimentoAceito(seguidor = viewer, seguido = autor)`.
  - Exclui a resenha do próprio leitor: RF-ACV-04 fala em "outros leitores", e a própria aparece em "Sua avaliação" (F-AVA).
- Reusa `ResenhaResumoDto` de `src/livros/pessoal/dto/livro-pessoal.dto.ts`. Falha de contrato (`ehFalhaDeContratoExterno`) → `ServicoIndisponivel` (503), sem confundir ausência com indisponibilidade.

**Testes de integração**
- Perfis público, privado seguido, privado não seguido e ausente da VIEW (simula suspenso/em exclusão; as VIEWs externas são tabelas no harness).
- Paginação por cursor e cursor inválido.
- Livro pessoal → 404.
- Atomicidade estado + outbox; duas aberturas → uma linha de outbox; reenfileiramento de `falha_transitoria` e de `pendente` vencido.

## Fase 4 — Backend: consumidor da sinopse (RN-19)

**Local:** `src/livros/sinopse/`.

- **Schema:** copiar `docs/mensageria/schemas/livro.pagina_aberta.v1.schema.json` idêntico para `src/messaging/schemas/`, porque o `schemas.spec.ts` compara a cópia com o canônico.
- **`SinopseConsumer`**, no molde de `ImportacaoConsumer`:
  - `{ consumerName: 'acervo.sinopse', queue: 'leai.acervo.sinopse', exchange: EXCHANGES.acervo, routingKeys: ['livro.pagina_aberta'] }`. O `AmqpConsumerService.register` declara fila, binding e DLQ.
  - `processar(envelope, tx)` faz `SELECT … FOR UPDATE` e sai se o status não for `pendente` (idempotência semântica; `disponivel` e `ausente` são terminais).
- **Fontes novas**, sem editar as de importação do Vicenzo: `dominio/openlibrary-sinopse.fonte.ts` e `dominio/google-books-sinopse.fonte.ts`.
  - Reusam `HttpExterno` (allowlist, timeout, limite de resposta) e `PoliticaDeResiliencia` (backoff e circuit breaker).
  - OpenLibrary: `description` de `/works/{ol_work_key}.json`, depois de `/books/{ol_edition_key}.json`. O campo pode vir como string ou `{ value }`.
  - Google Books: `volumeInfo.description` por ISBN.
  - Providas por fábrica `FONTES_DE_SINOPSE` no `LivrosModule`.
- **Resultado:**
  - Texto encontrado → `textoPuro()` em `src/common/texto-puro.ts` (remove tags, decodifica entidades, colapsa espaços, corta em 4.000 na fronteira de palavra; RN-19.6) → `disponivel`.
  - As duas fontes respondem sem texto → `ausente`.
  - `FonteIndisponivel` depois da resiliência → `falha_transitoria`, com commit e sem throw, como na importação.
  - Tudo respeita o CHECK `(status='disponivel') = (sinopse IS NOT NULL)`.
- **Testes:**
  - Unitários de `textoPuro` e das fontes com `fetch` simulado.
  - `test/integracao/consumo-sinopse.int-spec.ts` com `BrokerEmMemoria` e `ConsumidorSemEspera`, no padrão de `consumo-importacao.int-spec.ts`: publicação pelo dispatcher, consumo, recibo + efeito atômicos, entrega duplicada sem novo efeito, `ausente` terminal, falha → `falha_transitoria` sem `pendente` órfão, mensagem inválida → DLQ.

## Fase 5 — Web (`code/front`)

**Fonte visual:** os protótipos `.html` em `docs/design/periodo-1/F-ACV-BUSCA/prototipos/`; o `.md` serve para regras e copy.

- **`src/services/acervo.ts`:** `listarAssuntos`, `buscarLivros`, `obterLivroOficial` e `listarResenhasDoLivro`, com os tipos do contrato. Specs com `fetch` injetado.
- **Composables em `src/livros/`:**
  - `useBuscaDeLivros`: estados `aterrissagem | buscando | resultados | vazio | erro`, guarda de corrida, cold start em 3 s, debounce de 350 ms com mínimo de 2 caracteres, e `q`/`assunto` na URL via `router.replace` para voltar da página do livro sem perder a busca.
  - `usePaginacaoDoAcervo`: página base 1 com acumulação. Não mexe no `usePaginacao` do F-PERFIL.
  - `agruparEdicoes()`: função pura que agrupa itens contíguos.
  - `useSinopse`: polling com intervalo crescente (2, 3, 5, 8 s…) limitado por contagem, no molde de `useCadastroIsbn`; para em `disponivel`, `ausente` ou `falha_transitoria`.
  - `useResenhasDoLivro`: paginação por cursor.
- **Componentes em `components/livros/`:**
  - `CardLivroBusca` (com "N edições" que expande);
  - `ChipAssunto` e `FiltroAssuntos` (faixa rolável no mobile, painel vertical no desktop);
  - `CardResenha`, cujo bloco de spoiler **não renderiza o texto no DOM** até revelar.
  - O `CapaLivro` ganha as props opcionais `titulo` e `autor` para o placeholder textual, compatível com o uso atual.
- **Views:**
  - `DescobrirView.vue` substitui o placeholder. No desktop o campo vai por Teleport para `#cabecalho-acoes`; abaixo de 768 px vira a segunda linha dentro da view. O estado vazio leva a `/descobrir/adicionar` e `/descobrir/adicionar/pessoal`.
  - Novo `views/livros/LivroOficialView.vue` na rota `livro-oficial`, que já existe com `meta.aba`. Tem hero, sinopse (skeleton, texto, ausente ou falha transitória), ficha (linhas que faltam são omitidas), resenhas e os estados de carregando, erro e 404. Deixa os slots de estante/progresso (F-EST/F-PRG) e de "Sua avaliação" (F-AVA) sem conteúdo.
- **Testes (Vitest):**
  - service;
  - composables com timers falsos;
  - `agruparEdicoes`;
  - specs de view com `montarNaRota` cobrindo cada estado, cold start, 503 com tentar de novo, spoiler e polling limitado.

## Fase 6 — Mobile (`code/mobile`)

- **`acervo_service.dart`:** modelos com `fromJson` manual e os 4 métodos novos.
- **`lib/features/descobrir/`:**
  - `DescobrirPage` com o campo abaixo do cabeçalho do shell (padrão `BuscarLeitorPage`) e a faixa de chips.
  - `BuscaDeLivrosController` (`ChangeNotifier`, página base 1) e agrupamento.
  - Rolagem infinita por `extentAfter < 300`, com rodapé próprio: sem botão "Carregar mais", só "Tentar de novo" em falha.
- **`lib/features/livros/livro_oficial_page.dart`:** substitui `LivroOficialPlaceholderPage` em `/descobrir/livro/:id`. Tem `SinopseController` (molde `CadastroIsbnController`), resenhas por cursor e spoiler oculto. O widget `CapaLivro` ganha o placeholder textual.
- **Testes:** `MockClient` e os helpers de `test/features/livros/apoio.dart`. Ajustar `test/app/router_test.dart`, que hoje espera o texto do placeholder.
- **Execução:** rodar no AVD `Pixel_8_API_35`.

## Fase 7 — Contratos e documentação (DoD)

- **`docs/api/acervo.yaml`:**
  - adicionar `GET /assuntos`;
  - `editora` e `anoPublicacao` anuláveis e `autores` com `minItems: 0`;
  - `x-contract-status: implemented` nas 4 rotas;
  - notas: `q` também casa assunto (RN-21.6), `q` ou `assunto` obrigatório, resenha própria excluída, primeira página embutida com limite 10.
  - Conferir o spec contra o `/docs` em runtime.
- **`docs/mensageria/catalogo.md`:** marcar o consumidor `acervo/sinopse` como implementado, se o catálogo tiver essa marcação.
- **`code/back/acervo/AGENTS.md`:** índices de busca na migration 0004, fora do `schema.ts`; resolver o item "índice de busca".
- **`feature-F-ACV-BUSCA.md`:** status por camada, decisões desta sessão e entrada na Timeline. As pendências e divergências a registrar são:
  - card de resenha sem `@username`/estrelas e sem contagem;
  - status pill da busca e bloco de ações da página ficam para F-EST;
  - "Escrever a primeira" fica para F-AVA;
  - texto para `falha_transitoria` (o design não prevê);
  - chips vêm do banco (31 assuntos, não os 9 do protótipo);
  - "Ver todas as resenhas" carrega a próxima página;
  - o `ResenhaResumo` compartilhado com o livro pessoal não mudou.
- **Commits por fase**, com push na `renato-features`. **O PR para `desenvolvimento` só quando você pedir.**

## Verificação

- **Backend:** `npm run lint && npm run build && npm test && npm run test:integration` em `code/back/acervo`, esta última com `DATABASE_URL_TESTE=postgresql://postgres:teste@localhost:55432/leai_teste`.
- **Web:** `npm run lint && npm run build && npm test` em `code/front`.
- **Mobile:** `dart run tool/generate_tokens.dart --check && flutter analyze && flutter test` em `code/mobile`.
- **Manual (web e AVD), com identidade + acervo locais sobre `production` + CloudAMQP:**
  - buscar `conceicao evaristo` sem acento;
  - filtrar por assunto;
  - rolar a paginação;
  - abrir um livro nunca aberto: a página abre na hora com a sinopse em skeleton; em seguida `disponivel` ou `ausente` via fila `leai.acervo.sinopse`;
  - reabrir não gera nova linha de outbox, conferido por SQL;
  - livro pessoal não aparece;
  - a seção de resenhas mostra o estado vazio. Ainda não existe nenhuma resenha no banco, porque F-AVA não foi entregue; a filtragem RN-08 fica provada pelos testes de integração.
- **`EXPLAIN`** da busca no Neon, confirmando o uso dos índices GIN e medindo a latência (RNF-DES-01).
- **CI verde na `renato-features`.**

## Riscos e o que fica fora

- **"Funcionando em DES" (DoD) não depende só desta feature.** A `main` está 93 commits atrás, o que exige o PR do time `desenvolvimento → main`, e o `AMQP_URL` do `leai-acervo` precisa ser preenchido no painel do Render. As duas coisas ficam registradas como pendência no arquivo da feature.
- **Fora do escopo:** nota geral/dos leitores (F-ACV-NOTA), filtros avançados e páginas de autor/editora/série (F-ACV-DESCOBERTA), estante e progresso na página (F-EST/F-PRG) e o conteúdo de "Sua avaliação" (F-AVA).
