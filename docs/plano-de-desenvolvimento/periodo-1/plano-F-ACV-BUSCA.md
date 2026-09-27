# Plano — F-ACV-BUSCA (Busca e página do livro)

> **Revisão de 25/09/2026.** Substitui a versão de `f68aaab`. Cada afirmação foi conferida contra o código (acervo, front, mobile, contratos, mensageria e CI). Este arquivo é autossuficiente: a sessão que o produziu não estará disponível no próximo PC.
>
> **Conferência de 26/09/2026**, depois do merge dos 10 commits de F-AUT/F-PERFIL na `renato-features` (`1ba6de3`): linhas e componentes que mudaram foram atualizados, afirmações erradas corrigidas e lacunas incluídas. F-AVA fica para depois desta feature, com plano próprio; o que já se sabe dela está no fim deste arquivo.

## Andamento

- **Fatia 1 (busca): concluída em 26/09/2026.** Contrato, migration `0004` (aplicada no banco de dev), `GET /assuntos` e `GET /livros`, Descobrir no mobile e na web, e o seed. CI verde na `renato-features`. Conferido com os dados do dev na web (1440 e 390 px) e no emulador.
- **Fatia 2 (página do livro, sinopse e resenhas): concluída em 26/09/2026.** `GET /livros/{id}`, `/resenhas`, o consumidor `acervo.sinopse` e a página no mobile e na web. CI verde. A sinopse ponta a ponta no broker de dev depende de ligar o `AMQP_ENABLED` do acervo local, combinado com o time.
- **Fatia 3 (contrato, docs e DES):** docs concluídos em 26/09 (contrato marcado como implementado e conferido com o `/docs`, `AGENTS.md` do acervo, arquivo da feature). **Falta DES**, que depende do PR `desenvolvimento → main` do time.
- **Diferenças do que foi implementado em relação ao texto abaixo:**
  - **Header do Descobrir no mobile:** não precisou do slot `inferior`. O shell desenha o header da aba sem divisor (`semDivisor`, como o Perfil), e o campo fica fixo no topo da própria página. Visualmente é a segunda linha do header do protótipo.
  - **Capa:** a função se chama `resolverCapa()` (`src/livros/capa.ts`) e devolve `{ url, origem }`.
  - **Web:** um composable só, `useBuscaDeLivros`, com a paginação dentro (base 1); não existe `usePaginacaoDoAcervo`.
  - **Chip de assunto ativo:** `musgo` cheio com texto `papel`, como no protótipo; o `.md` fala em `musgo-fundo`. No painel da web, o ativo é `musgo-fundo`, também como no protótipo.

## Contexto

F-ACV-BUSCA é o "encontrar um livro" do ciclo de valor:
- busca paginada do acervo oficial (RF-ACV-01/02);
- página do livro (RF-ACV-04);
- sinopse sob demanda, assíncrona (RF-ACV-18/19, RN-19).

Dono: Renato. É a hospedeira da UI de F-AVA, a próxima feature do Renato.

**Onde estamos:**
- Backend, web e mobile estão em zero.
- Já existem e esperam esta feature os placeholders `DescobrirView.vue`, `LivroOficialPlaceholderView.vue`, `descobrir_page.dart` e `LivroOficialPlaceholderPage`.

**Prazo:** a Sprint 4 fecha em **29/09/2026** (README do período-1, L7), e F-ACV-BUSCA e F-AVA vencem nela.
- O que não couber desce inteiro de nível (AGENTS §8).
- O corte recai **sobre a web antes do mobile** (AGENTS §3).
- O README do período-1 (L74) sugere F-AVA (backend) primeiro. Invertemos: BUSCA vem primeiro, o que é viável porque `leitura.v_resenha_publicacao_v1` já existe fisicamente, vazia. F-AVA só é planejada quando esta feature terminar (decisão de 26/09).
- **Pedir ao grupo o PR `desenvolvimento → main` o quanto antes.** A `main` está 108 commits atrás (26/09), e sem esse PR nenhuma feature fecha o item "funcionando em DES" do DoD, por mais que o código esteja pronto.

**P0-MSG está pronto desde 19/09:** dispatcher com confirm, `mensagem_processada`, validação, retry `1/5/15 s` e DLQ. O `feature-F-ACV-BUSCA.md` ainda diz o contrário (L26, L87); corrigir na fatia 3.

**Dados medidos no banco de dev:**
- 11.019 livros oficiais e 31 assuntos, todos com `sinopse_status = nao_consultada` e com capa externa;
- 701 livros sem autor, 40 sem editora e 56 sem ano;
- no máximo 6 edições por obra;
- sem `pg_trgm`/`unaccent`, só `citext`;
- todo livro oficial tem `ativo = true` e `capa_url_externa`, garantidos pelo CHECK `livro_oficial_pessoal_ck` (`src/db/schema.ts`). Só livro pessoal pode estar inativo.

## Ambientes de dados (desde 25/09/2026)

| | Dev (local) | DES (Render, branch `main`) |
|---|---|---|
| Neon | projeto `le-ai` (`quiet-meadow-93392126`), São Paulo | projeto `le-ai-oregon` (`jolly-art-87595662`), Oregon |
| CloudAMQP | `Le-ai` (403307), São Paulo | `Le-ai-oregon` (404379), Oregon |

- **Sem replicação:** os dois bancos não se falam.
- **Migrations:** aplicadas localmente só vão para o banco de dev. O DES as recebe no deploy da `main` (`start:prod` roda o migrator do Drizzle).
- **O banco e o broker de dev são compartilhados pelo time**, então nada de schema é aplicado neles sem revisão humana.
- Detalhes em `feature-P0-DEPLOY.md` ("Ambientes de dados") e no AGENTS raiz §7.

## Decisões

- **Branch:** `renato-features`, com merge em `desenvolvimento` **ao fim de cada fatia** (`git merge --no-edit`), não num PR único no fim. A branch curta reduz conflito e o risco de ordem de migration.
- **Fatias verticais, mobile antes da web:**
  - Fatia 1: busca.
  - Fatia 2: página, sinopse e resenhas.
  - Fatia 3: contrato, docs e DES.
- **Mensageria local:** `AMQP_ENABLED=false` no `code/back/acervo/.env` **até existir o consumidor da sinopse** (fatia 2).
  - Enquanto a fila `leai.acervo.sinopse` não existe, e como o publisher não usa `mandatory`, cada `livro.pagina_aberta` publicado se perde e o livro fica `pendente` até o resgate de 15 min.
  - Avisar o time antes de ligar.
  - **O `false` local não basta: a outbox é do banco de dev, que é compartilhado.** O acervo local de um colega, com AMQP ligado, publica as linhas `livro.pagina_aberta` que você gravar, e elas se perdem sem a fila. Por isso, **até o consumidor existir, a `GET /livros/{id}` só roda nos testes de integração**, nunca contra o banco de dev.
  - Não declarar a fila à mão no broker: o consumidor a declara no boot com os argumentos de DLQ dele, e uma fila já criada com argumentos diferentes faz o boot falhar.
- **Índice de busca:** migration nova com `pg_trgm` + `unaccent`.
- **Ajustes de contrato aprovados:**
  - `GET /assuntos`;
  - `editora` e `anoPublicacao` anuláveis;
  - `autores` com `minItems: 0`;
  - **`resenhas` anulável em `LivroOficialDetalhe`**, onde `null` significa indisponível (VIEW de outro serviço falhando).
- **Ajustes não aprovados, que viram divergência registrada:** `@username` e estrelas no card de resenha, e a contagem "28 resenhas".
- **A resenha do próprio leitor fica fora da lista** da página, seguindo o RF-ACV-04 ("resenhas de outros leitores"). O `pagina-do-livro.md:7` diz que ela aparece; registrar como divergência. Ela volta à página no bloco "Sua avaliação", quando F-AVA existir.
- **Mobile:** o header da aba Descobrir sai sem divisor, e o campo de busca fica fixo no topo da página, como segunda linha do header (ver Andamento).
- **Debounce de 350 ms com mínimo de 2 caracteres, igual na web e no mobile.** É decisão nova: nenhum requisito, design ou protótipo define, e o contrato aceita `q` a partir de 1 caractere. Registrar no arquivo da feature.
- **"N livros encontrados" conta `totalItens`**, ou seja, edições, que são livros pelo RN-01. O número de grupos só seria conhecido depois de carregar todas as páginas. Registrar.
- **Node:** 24.19 com npm 12 no front, e 22 no acervo (`.nvmrc` de cada um), via fnm ou nvm. **Não usar Node 25**: ele fica fora do `engines` do front e expõe `localStorage` global, com risco no jsdom.
- **Commits:** só a linha de mensagem em Conventional Commits, **sem corpo e sem `Co-Authored-By`**. Um commit por assunto.

## Pré-requisitos no PC

1. **Variáveis de ambiente:** vêm do documento `le-ai-variaveis-de-ambiente.md`, que foi distribuído no grupo e **não está no repositório**.
   - Siga a seção 0 dele: conferir `git check-ignore`, não sobrescrever `.env` existente e não commitar.
   - Depois de criar, troque `AMQP_ENABLED` para `false` no `code/back/acervo/.env`, conforme as Decisões.
   - `GOOGLE_BOOKS_API_KEY` está vazia. Sem ela o Google responde 429, e muitos livros vão para `falha_transitoria` em vez de `ausente`. Pedir a chave (está no Render).
2. **Ferramentas:**
   - Node nas versões das Decisões;
   - `npm ci` em `code/back/acervo` e em `code/front`;
   - `flutter pub get` em `code/mobile`, e o AVD `Pixel_8_API_35`.
3. **Docker Desktop no ar.** `npm run test:integration` exige Postgres descartável, porque `test/integracao/ambiente.ts` recusa o Neon:
   ```bash
   docker run -d --name leai-pg-teste -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=leai_teste -p 55432:5432 postgres:17-alpine
   ```
4. **Branch:** `git fetch` e depois `git merge origin/desenvolvimento` na `renato-features`. A branch já existe no remoto; não use `switch -c`.
5. **Smoke test:**
   - subir `identidade` (`./mvnw spring-boot:run`) e `acervo` (`npm run start:dev`);
   - chamar `GET /health`;
   - fazer login na web local.

---

## Fatia 1 — Busca (back → mobile → web → merge)

### 1.1 Contrato primeiro (`docs/api/acervo.yaml`)
- Adicionar `GET /assuntos`.
- `LivroOficialResumo`: `editora` e `anoPublicacao` anuláveis, e `autores` com `minItems: 0`.
- Notas:
  - `q` também casa com o nome do assunto (RN-21.6);
  - `q` ou `assunto` é obrigatório;
  - `limit > 50` → 400, coerente com `maximum: 50`.

### 1.2 Migration de busca (checkpoint humano)

**Criação:** `npx drizzle-kit generate --custom --name=<timestamp>_indices_busca`.
- Foi assim que a `0003` nasceu: o snapshot dela é cópia do `0002`.
- Não editar o `_journal.json` à mão.
- Separar os statements com `--> statement-breakpoint`.

**Conteúdo:**
- `CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public` e o mesmo para `unaccent`. O `citext` também está em `public`, mas quem o criou foi o Flyway do identidade (`V20260915120000`); esta é a primeira extensão criada por uma migration do acervo.
- Função `acervo.f_busca_normalizar(text)`, `IMMUTABLE PARALLEL SAFE STRICT`, igual a `lower(public.unaccent('public.unaccent'::regdictionary, $1))`.
- Índices GIN com `public.gin_trgm_ops` sobre `acervo.f_busca_normalizar(...)`:
  - `livro.titulo`, parcial em `tipo='oficial' AND ativo`;
  - `autor.nome`;
  - `editora.nome`.
- **Tudo qualificado.** O `search_path` é só `acervo`, e o PG 17 restringe o `search_path` em ANALYZE e REINDEX.
- **A CI não pega esquecimento.** O `prepararBanco` (`test/integracao/banco.ts`) roda as migrations sem `search_path=acervo`, com `public` no caminho. Um `unaccent(` ou `gin_trgm_ops` sem schema passa na CI e quebra no dev e no DES. Conferir por `grep` antes do checkpoint. Na consulta vale o mesmo: `public.word_similarity`.

**Fora do `schema.ts`, de propósito.** É o mesmo precedente de `mensagem_processada`: o drizzle-kit não conhece esses objetos. Registrar no `code/back/acervo/AGENTS.md`.

**Ordem de migrations (risco real):**
- O migrator do Drizzle só aplica migration com `when` **maior** que o último `created_at` do banco (`pg-core/dialect.ts`). Uma migration gerada antes e mergeada depois é **pulada em silêncio**.
- Vicenzo e Ana também criam migrations no acervo.
- Antes de aplicar:
  1. avisar o time;
  2. fazer merge da `origin/desenvolvimento` mais recente;
  3. conferir que o `when` da nova é o maior do journal;
  4. conferir que nenhuma branch aberta tem migration do acervo pendente.
- **Depois de aplicada, nunca editar**, porque o Drizzle não reaplica por hash. Correção vira uma migration nova.

**Checkpoint:**
- O Renato revisa a migration (AGENTS §5.6).
- Só com OK explícito roda `npm run db:migrate` no **banco de dev**.
- O DES recebe a migration no `start:prod`, quando a `main` for deployada. As 3 extensões já estão disponíveis no projeto de Oregon (conferido em 25/09).
- Até o OK, o desenvolvimento avança pelos testes de integração.
- Depois de aplicada no dev, medir o tamanho dos índices novos (`pg_relation_size`) contra o teto do RNF-DES-04: o acervo não pode passar de 20% do plano gratuito do Neon.

### 1.3 Backend: `GET /assuntos` e `GET /livros`

**Estrutura:** módulo novo `src/livros/busca/` (controller, service, repository e specs), no padrão de `src/livros/pessoal/`, registrado no `LivrosModule`.

**`GET /assuntos`:** devolve `{ itens: AssuntoResumo[] }` ordenado por nome, com `LIMIT 100` imposto pelo servidor.

**`GET /livros?q&assunto&page&limit`**

*Validação:*
- DTO de query com class-validator e `@Type(() => Number)`. O `ValidationPipe` global usa `transform` e `forbidNonWhitelisted`, sem conversão implícita.
- **Trim** do `q` antes de validar. `q` com 1 a 200 caracteres; só espaços → 400 no campo `q`.
- `assunto` UUID; `page` ≥ 1; `limit` de 1 a 50, padrão 20.
- Sem `q` e sem `assunto` → `ErroDeValidacao`.

*Consulta:*
- Em `sql```, parametrizado, e somente `tipo='oficial' AND ativo` (SEC-06).
  - Escrever esse predicado **literal**, não como parâmetro, para o planner casar o índice parcial.
  - O `ativo` é sempre verdadeiro em livro oficial (CHECK); ele está no predicado só para casar o índice parcial.
- O `q` é normalizado por `acervo.f_busca_normalizar` e casa **só por trecho** (LIKE) em quatro campos:
  - título;
  - autor, via `livro_autor`;
  - editora;
  - nome do assunto (RN-21.6).
- **Escapar `%`, `_` e `\`** do `q`.
- `word_similarity` **só ordena, nunca casa**. O exemplo de "nenhum resultado" do design, `guimaraes rossa`, tem de voltar vazio.
- **Estrutura:** candidatos por **UNION de subconsultas por campo**, cada uma indexável. Um OR entre 4 tabelas faz o planner escolher seq scan.
- Se o `q` for ISBN-13 válido (`normalizarIsbn13`, em `src/common/isbn.ts`), vira match exato em `isbn13`.

*Filtro:* `assunto` por `EXISTS livro_assunto`.

*Ordenação:*
- **Com `q`:** relevância por `public.word_similarity`, com título > autor > editora > assunto.
- **Sem `q`** (só assunto): título normalizado, ano desc, id.
- **Chave de grupo:** título normalizado + ids dos autores ordenados. Livro **sem autor** usa o próprio `id` como chave, porque são 701 livros e não podem se agrupar entre si.
- A pontuação do grupo é `max() OVER (PARTITION BY grupo)`. A ordem final é pontuação do grupo, grupo, ano desc, id. Assim as edições chegam contíguas (RN-01).

*Paginação:*
- **Contagem separada**, ou CTE com a contagem, e não `count(*) OVER ()`. O window não devolve linha quando `page` passa da última, e o `totalItens` sairia 0.

*Resposta:*
- `autores` e `assuntos` via `json_agg`, com autores **ordenados por nome**, como a `v_livro_referencia_v1`.
- **Capa (RN-14.4):** a URL resolvida já existe em SQL, `coalesce(capa_url_propria, capa_url_externa)`, como nas VIEWs e no `ImportacaoRepository.resumoDoLivro`. Falta só o campo `origem` do schema `Capa`, calculado por uma função pequena, `resolverCapa()`, em `src/livros/capa.ts`: `propria` ou `externa`.
  - Livro oficial sempre tem capa externa (CHECK), então o servidor nunca devolve `placeholder` para ele. O placeholder é o fallback do cliente quando a imagem não carrega.

### 1.4 Testes do backend

**Unitários:** DTO, `resolverCapa` e o mapeamento.

**Integração** (`test/integracao/busca.int-spec.ts`):
- busca por título, autor, editora, assunto e ISBN;
- busca sem acento;
- filtro, paginação, teto de 50 e os 400;
- livro pessoal, ativo ou inativo, nunca aparece (livro oficial inativo não existe, pelo CHECK);
- forma exata de `PaginaLivros`;
- contiguidade das edições.

**Casos novos:**
- página além do fim com o `totalItens` verdadeiro;
- `guimaraes rossa` → vazio;
- `%` como literal;
- livro sem autor não agrupa;
- grupo que atravessa a fronteira da página.

**Harness:** estender o `limpar()` de `test/integracao/banco.ts` com `assunto` e `serie`, e criar fábricas de autor, editora e assunto em `massa.ts`.

**Seed (RNF-TST-08):** os 3 livros oficiais de `src/db/seed.ts` não têm assunto nem editora. Acrescentar os dois, para a busca e o filtro funcionarem num banco só com o seed. O arquivo se declara "a parte de F-ACV-CADASTRO", então avisar o Vicenzo.

### 1.5 Mobile: Descobrir (`code/mobile`)

**Header:** o `DescobrirPage` é **raiz de aba**, e hoje o shell desenha o header de toda raiz (`shell_autenticado.dart:53`).
- Tirar `/descobrir` dessa condição. A página monta `CabecalhoTela(titulo: 'Descobrir', inferior: campo)`, com o sino padrão (`comSino`).
- O `CabecalhoTela` ganhou `semDivisor` e `tituloEmDuasLinhas` em 26/09, mas continua sem slot. O `inferior` novo fica **fora** do `ConstrainedBox` de 72 px, entre a linha do título e o divisor.
- O divisor fica sempre visível; o design o mostra só quando a lista rola por baixo. Registrar como divergência.

**Campo:** o `BuscarLeitorPage` não é modelo para o header (é sub-rota e desenha o próprio), mas é para o campo: contador `_buscaAtual`, cold start em 3 s e X de limpar.
- Diferente dele, o campo **não** fica desabilitado durante a busca, porque o debounce continua recebendo digitação.
- Placeholder `Título, autor, editora ou ISBN`, sem foco automático.

**Estados:**
- aterrissagem: só o campo e a faixa de assuntos;
- carregando: 5 skeletons de card, sem contagem; cold start também é carregamento;
- resultados: "N livros encontrados" (`totalItens`, ver Decisões), com `liveRegion`;
- vazio: `EstadoVazio(solto: true)` (ícone de 32 px, texto até 280 px), com os dois links de cadastro;
- erro: `BannerAviso(triangulo: true, acao: …)` com "Tentar de novo".

**Layout:** header, faixa de chips e contagem ficam fixos; só a lista rola. Chips e o X de limpar com alvo de 48 px.

**Estado e busca:**
- `BuscaDeLivrosController` (`ChangeNotifier`, página base 1), com debounce de 350 ms, mínimo de 2 caracteres e contador de geração como guarda de corrida.
- `ListaPaginada` e `Pagina.fromJson` não servem: são base 0 e usam outros nomes de campo. Copiar deles a deduplicação por id entre páginas.
- Agrupamento sobre a lista **acumulada**. O "N edições" do último card pode crescer quando chega a próxima página.
- O card do grupo mostra a primeira edição que chega, que é a mais recente (o backend ordena por ano desc dentro do grupo).

**Card:**
- O `CapaLivro` (`design/widgets/capa_livro.dart`) ganha já nesta fatia o placeholder textual (título e autor). Hoje ele só tem `comIcone`.
- "N edições" expande. O protótipo não desenha o estado expandido; registrar a decisão.

**Rolagem e rodapé:**
- Rolagem infinita por `extentAfter < 300`, no padrão de `conexoes_page.dart`.
- Rodapé próprio, sem "Carregar mais", só "Tentar de novo" na falha. O `FimDaLista` mostra "Carregar mais", o que o design proíbe no mobile.

**Rotas e injeção:**
- No `router.dart:130`, o `DescobrirPage` só recebe `aoCadastrarPorIsbn`. Passa a receber também `deps.acervo` e `aoAbrirLivro`.
- Os links de cadastro do estado vazio usam `rotaAdicionarLivro` (`/descobrir/adicionar-livro`) e `.../pessoal`, não os caminhos da web.
- Conferir o voltar do cadastro pessoal aberto pelo estado vazio: com `go`, cancelar volta para a tela de ISBN, e não para os resultados. Testar com `push`.

**Serviço:** modelos com `fromJson` manual e **parse defensivo**, para JSON inesperado não virar `TypeError`.

**Testes:**
- `MockClient` e os helpers de `test/features/livros/apoio.dart`.
- **`test/app/router_test.dart` quebra.** Ele espera o texto do placeholder **do Descobrir** (L177, L277), toca "Cadastrar por ISBN" (L167) e checa "Descobrir" (L172).
- O teste da L158 quebra por mais um motivo: no design novo, "Cadastrar por ISBN" só aparece no estado vazio, não na aterrissagem. O teste passa a ir direto por `router.go(rotaAdicionarLivro)`.
- O `MockClient` desse teste devolve `{}` para tudo. Ele precisa responder por rota, e os asserts precisam ser reescritos.

### 1.6 Web: Descobrir (`code/front`)

**Fonte visual:** os protótipos `.html` em `docs/design/periodo-1/F-ACV-BUSCA/prototipos/`; o `.md` vale para regras e copy.

**Serviço:** `src/services/acervo.ts` ganha `listarAssuntos` e `buscarLivros`, com specs usando `fetch` injetado.

**Composables:**
- `useBuscaDeLivros`:
  - estados `aterrissagem | buscando | resultados | vazio | erro`;
  - cold start em 3 s;
  - debounce de 350 ms com mínimo de 2 caracteres (não existe debounce no front hoje);
  - `q`/`assunto` na URL via `router.replace`, no padrão de `ConexoesView.vue:44`.
  - **A guarda de corrida é um contador de geração:** o `api.ts` descarta o `AbortSignal` do chamador (L182), e GETs antigos continuam fazendo retry em 503.
- `usePaginacaoDoAcervo`: base 1, com acumulação. Não reusar o `src/perfil/usePaginacao.ts`, que é base 0.
- `agruparEdicoes()`: função pura, aplicada sobre a lista acumulada.

**Componentes (`components/livros/`):**
- `CardLivroBusca`, com "N edições" que expande;
- `ChipAssunto` e `FiltroAssuntos`: faixa rolável abaixo de 768 px, painel vertical de 240 px no desktop, seleção única com X;
- o `CapaLivro` ganha as props opcionais `titulo` e `autor` para o placeholder textual.

**View:**
- `DescobrirView.vue` substitui o placeholder.
- **Campo de busca:** reusar o padrão do `BuscarLeitorView` (26/09). A partir de 768 px, o campo vai por `Teleport` para `#cabecalho-acoes` (`matchMedia`, L22–41 e L103); abaixo disso, fica no conteúdo. É o que o `descobrir.md` pede. Nos testes, o `montarNaRota` fixa `matches: false`, então o campo aparece no conteúdo.
- **Layout:**
  - grid de duas colunas de cards, com `max-width` de 1120 px e hover `papel-elevado`;
  - skeleton de 6 cards;
  - "N livros encontrados" (`totalItens`) com `aria-live`.
- **Campos nulos no card:** `Editora · Ano` mostra só o que existir, os autores vêm separados por vírgula, e a linha de autor some quando não há autor.
- **Próxima página:** usar o `FimDaLista`, que é IntersectionObserver com "Carregar mais" como fallback. No jsdom não há IntersectionObserver, então os testes veem o botão.
- **Estado vazio:** `EstadoVazio` na forma `solto` (ícone de 32 px, texto até 280 px). Leva a `/descobrir/adicionar` e `/descobrir/adicionar/pessoal`. A rota real é `/:origem(descobrir|estante)/adicionar`.
- **Voltar da página do livro remonta o Descobrir:** `q` e `assunto` voltam pela URL e a busca refaz a página 1, mas a rolagem se perde (não há `keep-alive`). Aceitar e registrar.

**Testes (Vitest):**
- service;
- composables com timers falsos;
- `agruparEdicoes`;
- view com `montarNaRota` (`src/testes/montarNaRota.ts`), cobrindo cada estado e o cold start.
- **`src/layouts/ShellAutenticado.spec.ts:43` passa a fazer rede de verdade:** ele monta `/descobrir` sem mock, e o `listarAssuntos` do mount chamaria `fetch`. Acrescentar o `vi.mock` do serviço do acervo.

### 1.7 Merge da fatia 1
- CI verde na `renato-features`.
- Depois, `git merge --no-edit` na `desenvolvimento` e push.

---

## Fatia 2 — Página do livro (back → mobile → web → merge)

### 2.1 Contrato primeiro
- `LivroOficialDetalhe.resenhas` passa a ser anulável: `null` significa indisponível.
- **Achatar o `LivroOficialDetalhe`.** Hoje ele é `allOf` de `LivroOficialResumo`, que tem `additionalProperties: false`, e uma validação estrita recusaria `isbn`, `sinopse` e `resenhas`.
- Nota: primeira página embutida com limite 10, e a resenha do próprio leitor é excluída.
- Descrição de `obterLivroOficial` com as regras de reenfileiramento da 2.2 (`falha_transitoria` há mais de 10 min, `pendente` há mais de 15 min), que são decisões novas.

### 2.2 `GET /livros/{id}`

**Validação:** `ParseUUIDPipe({ exceptionFactory: idInvalido })`, como os controllers existentes, para o 400 sair no formato `ErroValidacao` com o campo `id`. Livro inexistente, pessoal ou inativo → `NaoEncontrado`.
- O `idInvalido` é uma função local, repetida em `importacao.controller.ts` e `livro-pessoal.controller.ts`. Fazer uma cópia local, como eles.

**Rate limit:** esta GET dispara a fonte externa, então um script que abrisse os 11 mil livros geraria 11 mil consultas à OpenLibrary. Usar o `@RateLimit` que já existe (`src/common/rate-limit/`), mais folgado que o da importação, porque o polling da sinopse também chama esta rota. Por exemplo, 60 por minuto por identidade.

**Disparo da sinopse:** dentro de `this.db.transaction`, um UPDATE condicional com `RETURNING` (padrão de `ImportacaoRepository.reabrir`) troca o status para `pendente` quando ele é:
- `nao_consultada`;
- `falha_transitoria` há mais de 10 min;
- `pendente` há mais de 15 min, para resgatar um órfão depois da DLQ.

**"Há mais de" usa `livro.atualizado_em`:**
- Não existe `sinopse_atualizada_em`, e `atualizado_em` não tem trigger.
- Toda transição de sinopse (a GET e o consumidor) grava `atualizado_em = now()`.
- Registrar essa regra no AGENTS do acervo.

**Trava:** `SET LOCAL lock_timeout = '1s'` na transação, com o estouro tratado como no-op. No caminho de resgate, a GET esperaria o `FOR UPDATE` do consumidor enquanto ele consulta as fontes.
- O estouro (`55P03`) aborta a transação. Capturar **fora** do `db.transaction`, com `codigoDoPostgres` (`err.cause.code`), e depois ler a página normalmente.

**Outbox:**
- Só se o UPDATE devolver linha: `OutboxRepository.inserir(tx, { tipo: 'livro.pagina_aberta', versao: 1, chaveNegocio: 'livro:<id>:sinopse', payload: { livroId } })`.
- A constante do evento fica em `src/livros/outbox/eventos.ts`.
- Duas aberturas concorrentes geram um evento só, graças ao lock de linha.

**Resposta:**
- resumo + `isbn` + `sinopse { status, texto }` + a primeira `PaginaResenhas` (limite 10);
- **falha de contrato externo** (`ehFalhaDeContratoExterno`) nas resenhas → `resenhas: null`, e a página abre mesmo assim;
- a resposta nunca espera a fonte externa.

### 2.3 `GET /livros/{id}/resenhas?cursor&limit`

**Livro primeiro:** conferir que o livro existe e é oficial, e responder `NaoEncontrado` caso contrário (o spec já prevê o 404). Sem isso, a rota listaria resenhas de livro pessoal por fora do RN-15.

**Cursor keyset** `(criado_em, resenha_id)` em base64url, com até 500 caracteres. O índice `leitura.resenha_livro_criado_idx (livro_id, criado_em)` já existe e serve à VIEW; o `id` só desempata.
- `criado_em` tem precisão de µs; `Date` e `toISOString()` têm ms, o que pula resenhas.
- Montar o cursor a partir do **texto do Postgres** (`to_char(... 'US')` ou epoch em µs) e comparar com `::timestamptz`.
- Cursor inválido → 400 no campo `cursor`. `limit` até 50; buscar `limit + 1`.

**Filtro RN-08**, novo e reutilizável, em `src/livros/busca/resenhas.repository.ts`:
- `vResenhaPublicacao` com `innerJoin vPerfilReferencia`. A VIEW já omite contas suspensas e em exclusão.
- Condição: `privacidade = 'publico' OR EXISTS vSeguimentoAceito(seguidor = viewer, seguido = autor)`. Os valores reais da coluna são `'publico'`/`'privado'`.
- Exclui a resenha do próprio leitor.

**Reuso:** `ResenhaResumoDto`, de `src/livros/pessoal/dto/livro-pessoal.dto.ts`. Nesta rota, falha de contrato → `ServicoIndisponivel` (503).

### 2.4 Consumidor da sinopse (`src/livros/sinopse/`)

**Schema:** copiar `docs/mensageria/schemas/livro.pagina_aberta.v1.schema.json`, idêntico, para `src/messaging/schemas/`; o `schemas.spec.ts` compara. Registrar com `validador.registerDataSchema`.

**`SinopseConsumer`**, no molde de `ImportacaoConsumer`:
- `{ consumerName: 'acervo.sinopse', queue: 'leai.acervo.sinopse', exchange: EXCHANGES.acervo, routingKeys: ['livro.pagina_aberta'] }`.
- `processar(envelope, tx)` faz `SELECT … FOR UPDATE` e sai se o status não for `pendente`.

**Fontes novas**, sem editar as de importação: `dominio/openlibrary-sinopse.fonte.ts` e `dominio/google-books-sinopse.fonte.ts`.
- Reusam `HttpExterno` (404 → `null`, ou seja, ausência) e `PoliticaDeResiliencia`.
- **Política mais curta que a da importação:** `new PoliticaDeResiliencia({ esperasMs: [1_000] })`, com uma retentativa e o mesmo circuit breaker. Isso dá cerca de 11 s por fonte. Uma `falha_transitoria` já é reprocessável na próxima abertura, então não compensa segurar a fila por minutos.
- Providas pela fábrica `FONTES_DE_SINOPSE`.
- **OpenLibrary:** `description` de `/works/{ol_work_key}.json`, depois de `/books/{ol_edition_key}.json`. **Sem chaves OL**, tentar `/isbn/{isbn}.json`. O campo pode vir como string ou como `{ value }`.
- **Google Books:** `volumeInfo.description` por ISBN.

**Resultado:**
- **Texto encontrado:** passa por `textoPuro()`, em `src/common/texto-puro.ts` (arquivo novo), e vira `disponivel`. O `textoPuro()` faz o seguinte:
  - remove tags e **Markdown de referência** (`([source][1])`, `[1]: https://…`, `----`), que a OpenLibrary costuma trazer;
  - decodifica entidades e colapsa espaços;
  - corta em 4.000 caracteres na fronteira de palavra (RN-19.6).
- **As duas fontes respondem sem texto:** `ausente`.
- **`FonteIndisponivel` depois da resiliência:** `falha_transitoria`, com commit e sem throw, como na importação.
- Tudo grava `atualizado_em = now()` e respeita o CHECK `(status='disponivel') = (sinopse IS NOT NULL)`.

**Latência:** com a política curta, o pior caso fica em cerca de 35 s por mensagem (works → books → Google, 5 s de timeout × 2 tentativas, 1 s de espera). Com a política padrão da importação seriam cerca de 2 min.
- Tudo acontece dentro da transação do recibo, com `prefetch(1)`. Livros abertos em sequência esperam na fila um atrás do outro.
- Sem `GOOGLE_BOOKS_API_KEY`, o 429 do Google conta como `FonteIndisponivel` e também é retentado.

**Ligar o broker:** só nesta etapa troque `AMQP_ENABLED` para `true` no acervo local, **depois de avisar o time**. A primeira execução declara a fila `leai.acervo.sinopse` no broker de dev.

### 2.5 Testes do backend

**Integração de `GET /livros/{id}` e das resenhas:**
- perfis: público, privado seguido, privado não seguido, e ausente da VIEW. No fixture, as VIEWs de outros serviços são **tabelas**, e as VIEWs reais já omitem conta suspensa ou em exclusão. Por isso "suspenso" e "em exclusão", que o DoD lista separados, viram o mesmo caso: sem linha na VIEW. Registrar essa equivalência;
- cursor, incluindo duas resenhas separadas por µs, e cursor inválido;
- livro pessoal → 404, na página e em `/resenhas`;
- VIEW inexistente → `resenhas: null`. Esse caso vai num arquivo próprio, porque exige `DROP TABLE` da tabela que faz papel de VIEW, e o `limpar()` dos outros testes faz TRUNCATE nela;
- atomicidade estado + outbox;
- duas aberturas → uma linha de outbox;
- reenfileiramento de `falha_transitoria` e de `pendente` vencido.

**Unitários:** `textoPuro` (HTML e Markdown de referência) e as fontes com `fetch` simulado.

**`test/integracao/consumo-sinopse.int-spec.ts`**, com `BrokerEmMemoria` e `ConsumidorSemEspera`. O `ConsumidorSemEspera` hoje é uma classe local, não exportada, de `consumo-importacao.int-spec.ts`; extrair para um arquivo de apoio em `test/integracao/` e usar nos dois specs.
- publicação pelo dispatcher e consumo;
- recibo + efeito atômicos;
- entrega duplicada sem novo efeito;
- `ausente` terminal;
- falha → `falha_transitoria`, sem `pendente` órfão;
- mensagem inválida → DLQ.

### 2.6 Clientes: polling da sinopse (web e mobile)

- **Esperas explícitas:** `[2, 3, 5, 8, 13, 20, 30, 40]` s, cerca de 2 min. Cobrem a latência do consumidor e alguns livros na fila à frente. O `useCadastroIsbn`/`CadastroIsbnController` usa intervalo **fixo** de 2 s com teto por contagem, então só o teto se aproveita.
- **Cada consulta aproveita só a `sinopse`.** A `GET /livros/{id}` devolve de novo a primeira página de resenhas; sobrescrever apagaria as resenhas já carregadas e os spoilers já revelados.
- **Parada:** em `disponivel`, `ausente` ou `falha_transitoria`, e ao sair da tela (`onScopeDispose` na web, `dispose` no mobile).
- **Polling que acaba ainda em `pendente`:** mostra texto neutro, sem erro (o design não prevê esse estado).
- **Estado "resenhas indisponíveis":** "Não foi possível carregar as resenhas" com "Tentar de novo", que chama `/resenhas`.

### 2.7 Mobile: `lib/features/livros/livro_oficial_page.dart`

- Substitui o `LivroOficialPlaceholderPage` em `/descobrir/livro/:id` (`rotas_livros.dart`). A rota atual **não lê o id**: usar `state.pathParameters['id']` e uma `ValueKey`.
- **Rota por aba de origem:** o design manda a aba de origem ficar ativa, e F-EST e F-FEED vão linkar o livro oficial. Criar uma fábrica `rotasDoLivroOficial(deps, raiz:)`, no molde de `_paginaDoLivroPessoal`. Por ora ela só é usada em Descobrir.
- `SinopseController`, com a lista de esperas acima.
- Resenhas por cursor e spoiler oculto. O bloco do spoiler tem altura mínima de cerca de 96 px.
- `CapaLivro` com o placeholder textual da 1.5.
- **Estados:** carregando (skeleton), erro e 404. O erro do design é centralizado, com `Warning` rubi, e nenhum widget atual serve: o `EstadoTerminal` é alinhado à esquerda e só tem musgo ou âmbar. Criar um widget novo.
- **Metadados e ficha:** omitir as linhas nulas (autor, editora e ano). Reusar `formatarData`/`formatarPaginas` (`livros/formatos.dart`) e o estilo `editorialBody` (Newsreader) na sinopse.
- O estado sem resenhas tem copy própria no design.

### 2.8 Web: `views/livros/LivroOficialView.vue`

**Rota:** `livro-oficial` (`livros/:id`, com `?origem=` definindo a aba).
- Trocar de livro na mesma rota não remonta a view: usar `:key` pelo id ou `watch` no id.

**Layout (desktop):**
- coluna esquerda de 320 px, `sticky`, com a capa de 280×420 e a ficha;
- título em `display-hero`;
- resenhas em grid de duas colunas, `papel-elevado` e raio 16;
- entre 768 e 1024 px, uma coluna só, com capa de 200 px.

**Conteúdo da página:**
- hero;
- sinopse: skeleton, texto, ausente, falha transitória ou polling encerrado;
- ficha: Autor, Editora e ISBN como texto, omitindo as linhas que faltam;
- resenhas;
- estados de carregando, erro e 404.

**Slots que ficam sem conteúdo:** estante e progresso (F-EST/F-PRG) e "Sua avaliação" (F-AVA).

**Código:**
- `src/services/acervo.ts` ganha `obterLivroOficial` e `listarResenhasDoLivro`.
- Composables `useSinopse` e `useResenhasDoLivro`.
- `CardResenha`, com o texto do spoiler **fora do DOM** até ser revelado.
- Hero sem campos nulos: `Editora · Ano · N páginas` mostra só o que existir.

**Testes (Vitest):**
- `useSinopse` com timers falsos: para em cada estado terminal, no teto e ao desmontar;
- `useResenhasDoLivro`, com cursor;
- `CardResenha`, com o spoiler fora do DOM;
- view com carregando, 404 e `resenhas: null`.

**`CadastroIsbnView.spec.ts:89` quebra:** ele navega para `/livros/livro-1`, e o `vi.mock` dele (L8–14) não tem `obterLivroOficial`. Acrescentar ao mock.

### 2.9 Merge da fatia 2
Mesmo procedimento da 1.7.

---

## Fatia 3 — Contrato, docs e DES

- **`docs/api/acervo.yaml`:**
  - `x-contract-status: implemented` + `x-implemented-by: F-ACV-BUSCA` nas 4 rotas (padrão existente);
  - atualizar o `info.description`, que diz "seguem planejadas", e o `x-contract-status: partial` (L14) e o `x-planned-features` (L33) do topo;
  - conferir o spec contra o `/docs` em runtime.
- **`docs/mensageria/catalogo.md`:** não tem coluna de "implementado", então **nada a fazer**.
- **`code/back/acervo/AGENTS.md`:**
  - índices de busca na migration nova, fora do `schema.ts`;
  - regra do `atualizado_em` nas transições de sinopse;
  - resolver o item "índice de busca" das pendências.
- **`feature-F-ACV-BUSCA.md`:**
  - status por camada;
  - Infra: P0-MSG pronto desde 19/09 (corrigir L26 e L87);
  - decisões desta revisão;
  - Timeline.
- **Divergências e pendências a registrar em `feature-F-ACV-BUSCA.md`:**
  - card de resenha sem `@username`/estrelas e sem contagem;
  - status pill da busca e bloco de ações ficam para F-EST (o protótipo diz "Ações de leitura");
  - "Escrever a primeira" fica para F-AVA;
  - texto para `falha_transitoria` e para o polling encerrado, que o design não prevê;
  - chips vêm do banco (31 assuntos, não os 9 do protótipo);
  - "Ver todas as resenhas" carrega a próxima página;
  - slot `inferior` no header do mobile, e o divisor sempre visível (o design o mostra só com rolagem);
  - debounce novo;
  - "N livros encontrados" conta edições (`totalItens`);
  - "N edições" expandido, que o protótipo não desenha;
  - resenha do próprio leitor fora da lista, apesar do `pagina-do-livro.md:7`;
  - copy do 404 e do "resenhas indisponíveis", que o design não prevê;
  - na web, voltar da página do livro refaz a busca e perde a rolagem;
  - nos testes de RN-08, "suspenso" e "em exclusão" viram "sem linha na VIEW";
  - `resenhas` anulável;
  - o `ResenhaResumo` compartilhado com o livro pessoal não mudou.
- **"Funcionando em DES" (DoD):**
  - Depende do PR `desenvolvimento → main` do time: a `main` está 108 commits atrás (26/09).
  - O `AMQP_URL` do Render já aponta para o `Le-ai-oregon` (25/09).
  - No deploy, o `start:prod` aplica a migration nova no banco de Oregon. Depois, conferir `/health`, extensões e índices lá.

---

## Verificação

- **Backend:** `npm run lint && npm run build && npm test && npm run test:integration` em `code/back/acervo`, esta última com `DATABASE_URL_TESTE=postgresql://postgres:teste@localhost:55432/leai_teste`.
- **Web:** `npm run lint && npm run build && npm test` em `code/front`.
- **Mobile:** `dart run tool/generate_tokens.dart --check && flutter analyze && flutter test && flutter build apk --debug` em `code/mobile`.
- **Manual (web e AVD)**, com identidade + acervo locais sobre o **banco e o broker de dev**:
  - no AVD `Pixel_8_API_35`: `flutter run -d emulator-5554 --dart-define=IDENTIDADE_BASE_URL=http://10.0.2.2:8080 --dart-define=ACERVO_BASE_URL=http://10.0.2.2:3000` (as outras `--dart-define` estão no `code/mobile/AGENTS.md`);
  - buscar `conceicao evaristo` sem acento;
  - buscar `guimaraes rossa` → vazio;
  - filtrar por assunto;
  - rolar a paginação;
  - abrir um livro nunca aberto: a página abre na hora com a sinopse em skeleton, e depois vira `disponivel` ou `ausente` via fila `leai.acervo.sinopse`;
  - reabrir não gera nova linha de outbox (conferir por SQL);
  - livro pessoal não aparece;
  - a seção de resenhas mostra o estado vazio. F-AVA não foi entregue, então não há resenhas; o RN-08 fica provado pela integração.
- **SQL de reversão**, para bug do consumidor em dev. Só com OK humano, porque o banco de dev é do time:
  ```sql
  UPDATE acervo.livro SET sinopse = NULL, sinopse_status = 'nao_consultada', atualizado_em = now() WHERE id IN (...);
  ```
- **Latência** (RNF-DES-01, ≤ 1 s p95) medida **no DES (Oregon)** depois do deploy. O `EXPLAIN` no banco de dev é diagnóstico; o critério é a latência, não o uso do GIN.
- **CI verde** na `renato-features`.

## Riscos e o que fica fora

- **Migration pulada em silêncio:** ver 1.2. É o risco mais caro.
- **Latência do consumidor (~35 s no pior caso, com a política curta):** com `prefetch(1)`, os livros abertos em sequência esperam um atrás do outro. O polling de ~2 min e os estados da UI cobrem isso (2.6).
- **Banco e broker de dev compartilhados:**
  - `ausente` e `disponivel` são terminais: um bug marca livros do time até alguém rodar o SQL de reversão;
  - o acervo local, com AMQP ligado, compete pela fila `leai.acervo.importacao` com os acervos locais dos colegas.
- **DES depende de terceiros:** o PR para a `main` é do time. Pedir logo (ver Contexto).
- **Fora do escopo:**
  - nota geral e nota dos leitores (F-ACV-NOTA);
  - filtros avançados e páginas de autor, editora e série (F-ACV-DESCOBERTA);
  - estante e progresso na página (F-EST/F-PRG);
  - o conteúdo de "Sua avaliação" (F-AVA).

## Para o plano de F-AVA (depois desta feature)

Levantado em 26/09 e ainda não planejado. Não faz parte desta feature.

- **Sem migration:** `nota`, `resenha` (com CHECKs, unique e índice), `idempotencia_leitura`, `outbox_leitura`, as duas VIEWs e `mensagem_processada` já existem no `leitura`.
- **Falta infra no `leitura`:** JWT (guard, `@UsuarioAtual`, `@Publico`), `Idempotency-Key` HTTP, erros com uma classe de 422, validador com `registerDataSchema` e `common-v1`, harness de integração e CI com Postgres. O acervo tem quase tudo para copiar. Mergear cedo, porque a Ana vai precisar do mesmo em F-EST/F-PRG.
- **Ambiente:** `PORT=3001` no `leitura` (acervo e leitura usam 3000); `VITE_LEITURA_BASE_URL` no front e `LEITURA_BASE_URL` no mobile ainda não existem; o `leai-leitura` do `render.yaml` não tem `JWT_SECRET`.
- **Livros sem autor:** `v_livro_referencia_v1.autor_exibicao` sai NULL nos 701 livros sem autor, mas o `acervo.yaml` diz `nullable: false`, e o `LivroSnapshot.autor` do `common-v1` exige `minLength: 1`. Afeta `resenha.publicada` e também os eventos `leitura.*` de F-EST: avisar a Ana.
- **Eventos `resenha.*` no DES:** o `render.yaml` liga o AMQP no `leitura`, e a fila `leai.social.feed` ainda não existe. Os eventos se perderiam, e o feed não tem como recuperar porque não lê VIEW. Combinar com o Kayke.
- **Resenhas no perfil:** o `SecoesDeLeitura.vue` do Henrique espera `listarResenhasPerfil`, e o card pede capa, título, autor e nota, que o schema `Resenha` não traz.
- **Página do livro:** "Sua avaliação", com a resenha do próprio leitor e "Escrever resenha"/"Escrever a primeira", entra por F-AVA.
