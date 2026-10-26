# Plano — F-ACV-NOTA (Nota geral e cache de capas)

> Plano de 22/10/2026, **revisado no mesmo dia** com os 13 achados da revisão independente (veredito: aprovado com ajustes). **Executado em 22 e 23/10/2026**: o resultado, as divergências e o que ficou para o DES estão em [`../feature-F-ACV-NOTA.md`](../feature-F-ACV-NOTA.md). Na execução, além do previsto: a trava de vários livros segue a ordem da chave (`hashtext`), e não do id, para uma colisão não inverter a ordem; um commit `fix` separou o milhar das contagens; o `MessageValidator` do `acervo` passou a registrar o `common-v1`, que o schema de `leitura.iniciada` referencia; e os 4xx do Cloudinary que não são 400 vão à DLQ em vez de virarem recusa.

## Contexto

A F-MOD foi mergeada na `desenvolvimento` pelo PR #55 em 22/10/2026, às 22:16 de Brasília (`d561906`), com aprovação do Vicenzo e a CI do PR verde. A próxima tarefa é a **F-ACV-NOTA**, item 5 da ordem de trabalho de `renato-periodo-2/README.md`. A Sprint 5 vai até 03/11.

**Requisitos que a feature fecha:**
- RF-ACV-15: importar a nota geral e a quantidade de avaliações.
- RF-ACV-16: mostrar nota geral e nota dos leitores como indicadores distintos e rotulados.
- RF-ACV-17: guardar a capa oficial no Cloudinary na primeira vez que o livro entra numa estante (RN-14).
- RF-ACV-04: mostrar a distribuição das notas dos leitores.

**Fontes:**
- `feature-F-ACV-NOTA.md`;
- REQUISITOS RN-06, RN-12, RN-14, §10.1, §10.6 e os RNF ARQ-06, ERR-06/07/08 e SEC-20/32/33/38/39;
- arquitetura §2.5, §3.2, §4.2 e §5.2;
- design `periodo-2/pagina-do-livro/pagina-do-livro.md`, seção 4.1 C e artboards 4.3, 4.6, 4.7, 4.10 e 5.2. A fonte visual é o protótipo `.html`.

**O que já existe na `origin/desenvolvimento` (`d561906`).** A revisão conferiu tudo no código e no banco:
- **`livro`** (`drizzle/0001_…_modelo_der.sql:115-176`):
  - `nota_geral numeric(2,1)` e `nota_geral_qtd`, com CHECK de 0 a 5, contagem ≥ 0 e "as duas nulas ou as duas preenchidas";
  - `ol_work_key` no formato `OL…W` em 10.915 dos 11.011 oficiais;
  - `capa_url_externa`, todas em `covers.openlibrary.org/b/id/…`;
  - `capa_url_propria` e `capa_asset_id`, com o CHECK `livro_capa_propria_asset_ck`, que as exige juntas.
- **Projeção e agregado:** `nota_leitor_projecao` tem PK `(usuario_id, livro_id)` e meia estrela; `nota_livro_agregada` tem `media numeric(3,2)` e `quantidade > 0`. As duas estão vazias em dev e no DES. Dev tem 5 notas e 16 oficiais em estante; o DES tem 2 notas e 3 livros em estante.
- **Capa resolvida:** `v_livro_referencia_v1` já faz `coalesce(capa_url_propria, capa_url_externa)` (`0001…:341`), e `resolverCapa` resolve a capa da página e da busca.
- **Consumidor de `conta.excluida`** (Henrique, `src/conta/conta-excluida.consumer.ts:78-98`): já apaga a projeção e recalcula o agregado, sem trava.
- **Runtime de consumidor** (`src/messaging/amqp-consumer.service.ts`):
  - cada tentativa abre uma transação antes do handler (`:198`);
  - recibo `mensagem_processada`;
  - 3 retentativas, de 1, 5 e 15 s, depois a DLQ (`:164-192`);
  - `prefetch(1)`.
  - Molde: `src/livros/sinopse/sinopse.consumer.ts`, que trava a linha do livro durante a consulta às fontes (`:66-71`).
- **`HttpExterno`:**
  - allowlist exata;
  - timeout que cobre a cadeia toda;
  - até 3 saltos;
  - `lerComLimite`;
  - só `buscarJson`.
  - Allowlist, redirecionamento recusado e todo 4xx que não seja 404 viram `FonteIndisponivel` (`:47-49,76-77,85-86`), que a `PoliticaDeResiliencia` retenta. O padrão é `[1000, 5000, 15000]` (`politica-resiliencia.ts:17`).
  - A URL inicial não confere a porta.
- **Cloudinary:** a única chamada é `remocao-de-asset.ts:47` (destroy assinado). Não há upload pelo servidor nem validação de conteúdo de imagem.
- **Importação por ISBN:**
  - `convergencia.repository.ts:34-42` devolve o id do livro existente sem atualizar nada, e `importacao.service.ts:73` lança `LivroJaCadastrado`. **Não existe reimportação.**
  - O Google Books só é consultado quando a OpenLibrary não acha o ISBN.
- **Ingestão** (`code/scripts/ingestao`, Python, do Vicenzo):
  - `biografias` é o molde de "COPY em staging e depois UPDATE … FROM", e "nunca sobrescreve" (`AGENTS.md:73`);
  - o `.gitignore` ignora `dumps/` e `trabalho/`, mas não um `*.gz` solto.
- **Lacuna do `leitura`:** iniciar a leitura de um livro fora da estante (`leituras.service.ts:359`, `garantirEstante` em `leituras.repository.ts:50-58`) põe o livro na estante **sem** `livro.adicionado_a_estante`. Só sai `leitura.iniciada`.
- **Clientes:** nenhum dos dois lê campo de nota. A web tem `EstrelasNota.vue`, `formatarNota` e `contagem()` (`perfil/textos.ts`). O app tem `EstrelasDeNota`, `formatarNota` e `contagem()`.
- **Neon:** `idle_in_transaction_session_timeout` é de 5 min nos dois projetos.

**Pré-requisitos externos, conferidos em 22/10. Nenhum bloqueia:**
- **`ol_dump_ratings`** (30/09/2026, 9,3 MB gz):
  - 1.060.973 linhas TSV de 4 colunas: `/works/OL…W`, `/books/OL…M` ou `\N`, nota e data;
  - uma linha por avaliação individual, por obra, com nota inteira de 1 a 5, todas válidas;
  - 709.550 obras, sem agregado e sem usuário;
  - 7.209 linhas distintas aparecem repetidas, somando 10.345 linhas excedentes.
  - **Cobertura no acervo de dev:** 2.244 das 11.011 edições oficiais (20%), em 1.968 obras, com mediana de 3 avaliações e 755 obras com uma só. A amostra da revisão deu cerca de 17%. A medição de §10.1 (100%, mediana 213) não se confirma.
  - `/works/{key}/ratings.json` devolve `summary.average` (nulo sem nota) e `summary.count`.
- **Cloudinary (P-09):**
  - o cloud `leai` existe, e a key e o secret do `acervo` estão no Render desde 08/10;
  - o `.env` local só tem `CLOUDINARY_CLOUD_NAME`, e o Renato cria uma API key de dev;
  - dev e DES usam o mesmo cloud, e os ids dos livros coincidem.
- **Capas:** `covers.openlibrary.org` redireciona para `archive.org`, que redireciona para `iaNNNNNN.us.archive.org`. São 2 saltos, e a última resposta é 200 `image/jpeg` de cerca de 35 KB. Com `?default=false`, id inexistente dá 404. A origem já respondeu 502 numa sondagem.

## Decisões do dono (22/10/2026)

**Nota dos leitores:**
- **Consumidor:** ignora o valor do evento. Toma `pg_advisory_xact_lock(<classe da nota>, hashtext(livroId))`, sem disputar a linha de `livro` com a sinopse, e só depois relê `leitura.v_nota_publicacao_v1`: com a linha, faz upsert; sem ela, apaga. Em seguida recalcula o agregado na mesma transação.
- **Livro pessoal ou inexistente:** ACK sem efeito (RN-06.5).
- **Helpers únicos** em `nota-dos-leitores.repository.ts`, sempre com a trava:
  - `sincronizar(tx, usuarioId, livroId)`, para o evento;
  - `sincronizarLivro(tx, livroId)`, que reconcilia todos os usuários do livro, para o backfill;
  - `recalcularAgregados(tx, livroIds[])`, que trava em ordem de id.
- **`conta.excluida`:** passa a colher a lista de livros, travar em ordem de id, apagar e recalcular. É a mesma ordem do consumidor de notas, sem deadlock.
- **Backfill por livro:** um livro por transação, pelo `sincronizarLivro`. Os livros vêm da união dos que estão na VIEW e na projeção. Com a mesma trava do consumidor, os dois se serializam e convergem.
- **Agregado:** `nota_livro_agregada` continua materializada e mantida, porque já é contrato da F-CONTA-2. **A página não a lê:** calcula `round(avg(valor), 1)`, `count(*)` e a distribuição numa consulta só sobre `nota_leitor_projecao`. Assim não há arredondamento duplo (4,245 virando 4,25 e depois 4,3), e a contagem sempre bate com o histograma.
- **Contas em exclusão pendente entram na média:** o agregado é anônimo e sai no `conta.excluida`. A suspensão fica para a F-MOD-OPC.
- **Risco aceito:** uma nota atrasada na janela entre os `conta.excluida` do `leitura` e do `acervo` pode recriar a linha. Um novo backfill corrige.

**Contrato da página.** São três campos novos no `LivroOficialDetalhe`, só como acréscimo:
- `notaGeral: {valor, quantidade} | null`;
- `notaDosLeitores: {valor, quantidade} | null`, com o valor arredondado a 1 casa no SQL;
- `distribuicao: [{valor, quantidade}]`, com as 11 faixas de 5 a 0 quando há nota dos leitores e `[]` quando não há.
- Ausência é `null`, nunca 0 (RN-06.3).

**Nota geral pelo dump** (subcomando `notas` da ingestão):
- **Validação (SEC-33):** chave `^/works/OL\d+W$` e nota inteira de 1 a 5; a linha inválida é descartada e contada.
- **Cálculo:** média por obra com `ROUND_HALF_UP` a 1 casa, mais a contagem. As linhas repetidas são mantidas, porque não há usuário para distingui-las.
- **Envio:** só as obras do acervo vão ao staging. O script lê as chaves do banco antes do COPY, e cerca de 2 mil linhas vão ao Neon em vez de 710 mil.
- **Gravação:** replica o valor em todas as edições do `ol_work_key`. Na recarga, limpa a nota dos oficiais com `ol_work_key` cuja obra saiu do dump.
  - Isso vale também para o livro importado por ISBN. É coerente com a RN-06.6 e contrário ao "nunca sobrescreve" das biografias; registrar como divergência.
  - **Não toca `atualizado_em`**, que é o relógio da sinopse.
- Livro com uma avaliação só também mostra a nota (`1 avaliação`, como no design).

**Nota geral na importação por ISBN, só na inserção**, sem reimportação (pendência registrada):
- **OpenLibrary:** `ratings.json`, com a chave validada por `CHAVE_OBRA` antes de virar URL (SEC-38).
  - Política própria, sem retentativa e com circuito separado do da importação.
  - A falha é engolida e registrada no log, e a nota fica ausente.
- **Google Books:** `averageRating` e `ratingsCount`, só quando ele é a fonte do livro.

**Cache de capas:**
- **Gatilhos:** a fila `leai.acervo.capas` ouve `livro.adicionado_a_estante` **e `leitura.iniciada`**. As duas trazem `livroId`, e o consumidor lê o estado atual. Assim o `leitura` não muda.
- **Download pelo servidor:**
  - instância própria do `HttpExterno`, com a **allowlist por sufixo ativada só nela** (entrada `.dominio`); `FONTES_HOSTS_PERMITIDOS` não muda de sentido;
  - hosts em `CAPAS_DOWNLOAD_HOSTS`: `covers.openlibrary.org`, `archive.org`, `.us.archive.org` e `books.google.com`;
  - `CAPAS_DOWNLOAD_TIMEOUT_MS=15000` e `CAPAS_DOWNLOAD_LIMITE_BYTES=5242880`;
  - `?default=false` no OpenLibrary;
  - a porta é conferida também na URL inicial;
  - `FONTES_USER_AGENT` reaproveitado.
- **Validação (SEC-20):**
  - magic bytes, só JPEG, PNG ou WebP;
  - **o fim do arquivo também é conferido** (`FFD9` no JPEG, `IEND` no PNG, tamanho do RIFF no WebP), porque o `image-size` não detecta arquivo truncado;
  - de 50 a 5000 px por lado, lidos pela dependência nova `image-size`.
- **Upload assinado:**
  - parâmetros em ordem alfabética: `allowed_formats=jpg,png,webp`, `asset_folder=<pasta>`, `overwrite=false`, `public_id=<pasta>/<livroId>` e `timestamp`;
  - a pasta vem de `CLOUDINARY_PASTA_CAPAS_OFICIAIS`: `capas-oficiais-dev` no `.env` e `capas-oficiais` no `render.yaml`;
  - a resposta passa por `validarUrlDeCapa`, e o `assetId` devolvido precisa ser o `public_id` esperado.
- **Gravação:** `UPDATE … SET capa_url_propria, capa_asset_id WHERE capa_url_propria IS NULL`, sem tocar `atualizado_em`. Evento duplicado ou concorrente fica inofensivo sem trava.
- **Resultado discriminado** do `baixarImagem` e do envio, com um teste por caso:
  - **ausente** (404 ou 410): ACK com WARN;
  - **recusada** (fora da allowlist, redirecionamento recusado, acima do limite, outro 4xx, imagem inválida, 400 do Cloudinary, URL de resposta inválida): ACK com WARN, e o livro segue com a capa externa;
  - **indisponível** (timeout, rede, 5xx, 429 ou 420): exceção, retentativa do runtime e depois a DLQ (RN-14.5).
- **Sem retentativa aninhada:** `new PoliticaDeResiliencia({ esperasMs: [] })`, só com o circuit breaker, no molde da sinopse (`livros.module.ts:49`). A retentativa fica só no runtime.
  - Pior caso de uma transação: 15 s de download e 20 s de upload, perto de 35 s. É bem abaixo dos 5 min do Neon.
  - Rodar o backfill de novo substitui o redrive.
- **Sem credenciais:** o consumidor só é registrado com a key e o secret. Sem eles, a partida registra um WARN, a fila não existe e **os eventos se perdem em silêncio**, o que o backfill recupera. Os testes de integração injetam a configuração.
- **Risco aceito:** o placeholder do Google Books (PNG de 200, 1.269 bytes) passa na validação e é cacheado. É a mesma imagem que a capa externa já mostra.

**Backfill e ordem:**
- `npm run backfill:notas` e `npm run backfill:capas` no `acervo`, no molde de `leitura/src/estatisticas/backfill.ts`. São idempotentes, aceitam `--dry-run` e mostram as contagens.
- **Rodam depois de o serviço subir, que cria as filas**, porque "evento publicado antes de a fila existir se perde" (`acervo/AGENTS.md:131`). Registrar como divergência de `catalogo.md:30`.
- Filas `leai.acervo.notas` e `leai.acervo.capas`, cada uma com `.dlq`, na exchange `leai.events.leitura`.

**Execução:**
- Branch `renato-features`, commits só com a linha da mensagem, `git add` por caminho e testes verdes antes de cada commit.
- **Fora do `git add`:** `code/front/tsconfig.tsbuildinfo`, que não é versionado. O `package-lock.json` do `acervo` entra por caminho no commit 5.
- Dados reais só rodam com o OK do Renato: o subcomando `notas`, sempre com `--dry-run` antes, e os backfills.
- **Nenhuma migration prevista.** Se surgir uma, ela passa pela revisão do Renato antes de rodar no Neon de dev.

## Dependências de outras pessoas (avisar no PR)

- **Vicenzo:**
  - `code/scripts/ingestao`: o subcomando `notas` e o `AGENTS.md:67`;
  - `HttpExterno`: o `baixarImagem`, o sufixo opcional por instância e a porta na URL inicial;
  - `openlibrary.fonte.ts`, `google-books.fonte.ts` e `convergencia.repository.ts`, por causa da nota na inserção;
  - `livros.module.ts`: as políticas novas;
  - `LivroOficialView.vue`, `livro_oficial_page.dart`, `livro-oficial.int-spec.ts` e `massaDoLivro.ts`;
  - os testes `'Sem nota'` de `livro_oficial_page_test.dart:122` e `:139`.
- **Henrique:**
  - `src/conta/conta-excluida.consumer.ts`: ordem de trava e o helper de recálculo;
  - `src/conta/remocao-de-asset.ts`: a assinatura vai para `src/common/cloudinary.ts`.
- **Ana (`leitura`):**
  - o `acervo` passa a consumir `livro.adicionado_a_estante` e `leitura.iniciada` e a ler `v_estante_publica_v1`, sem mudança no `leitura`;
  - **lacuna:** iniciar a leitura fora da estante não publica `livro.adicionado_a_estante`, então as recomendações do `social` também não são removidas nesse caso;
  - a descrição de `v_nota_publicacao_v1` em `docs/api/leitura.yaml:44-48` ("backfill futuro") fica desatualizada. Avisar, não editar.

**Tabelas para a matriz de remoção (item 6 do README, aviso ao Henrique):** **nenhuma tabela nova**. `nota_leitor_projecao` e `nota_livro_agregada` já estão em `feature-F-CONTA-2.md:222` e no consumidor. A cópia própria da capa oficial é catálogo: a remoção só apaga capa de livro pessoal (`conta-excluida.consumer.ts:68-76`). O item 6 fecha com esse aviso.

## Pré-requisitos

0. **Branch:** a `renato-features` (`12c8b0c`) está 1 commit atrás da `origin/desenvolvimento` (`d561906`), só pelo merge do #55, com o diff vazio. Rodar `git merge --ff-only origin/desenvolvimento` e `codegraph sync`.
   - **CodeGraph por padrão:** toda leitura de código começa por `codegraph_explore`. `Read` e `Grep` ficam para configs, docs, SQL e o que o índice não cobre. Os subagentes recebem a mesma instrução. Rodar `codegraph sync` depois de cada `git pull`.
1. **Cloudinary de dev:** a API key de dev no `.env` local do `acervo`, junto com `CLOUDINARY_API_SECRET` e `CLOUDINARY_PASTA_CAPAS_OFICIAIS=capas-oficiais-dev`. É necessário para o teste manual do commit 5.
2. **Dump:** `ol_dump_ratings_latest.txt.gz` em `code/scripts/ingestao/dumps/`, que o `.gitignore` já ignora.

## Commit 1 — `docs: F-MOD mergeada na desenvolvimento`

- **`feature-F-MOD.md`:**
  - na DoD, marcar "Código mergeado em `desenvolvimento`" (PR #55, aprovado pelo Vicenzo, 22/10/2026, `d561906`) e "CI verde" (checks do PR);
  - nos Débitos de DES, registrar como resolvidos:
    - `MODERACAO_TOKEN` em `leai-leitura` e `leai-social`;
    - `LEITURA_BASE_URL` no `leai-social`;
    - `social.denuncia` vazia no `le-ai-oregon`.
  - **Continuam abertos** "funcionam em DES" e "Fluxo em DES/HML", que dependem do deploy no merge de fechamento para a `main`;
  - na timeline, uma entrada de 22/10: o merge, a atualização de dompurify, markdown-it, vite e vitest pelo `npm audit`, e o `SeedIntegracaoTest.idempotente` do `identidade`, que falha só na CI e é do dono do `identidade`.
- **`renato-periodo-2/README.md`:**
  - item 4: "concluída em 21/10, mergeada em 22/10 pelo PR #55";
  - o item do token sai de "Para levar ao grupo" e entra como resolvido.

## Commit 2 — `docs: plano da F-ACV-NOTA`

- Este plano em `renato-periodo-2/plano-F-ACV-NOTA.md`.
- No README, item 5 "em andamento", com o link.

## Commit 3 — `feat: nota geral e nota dos leitores na pagina do livro`

### `acervo`
- **Schema da mensagem:** copiar `nota.alterada.v1.schema.json` para `src/messaging/schemas/`, conferido por `schemas.spec.ts`.
- **`src/livros/notas/`:**
  - `nota-dos-leitores.repository.ts`: os três helpers das Decisões, com a trava;
  - `nota-dos-leitores.consumer.ts`: `{consumerName: 'acervo.notas', queue: 'leai.acervo.notas', exchange: EXCHANGES.leitura, routingKeys: ['nota.alterada']}`;
  - `backfill.ts`, por livro.
  - `package.json` ganha `backfill:notas`.
- **`conta-excluida.consumer.ts`:** colhe os livros, trava, apaga e chama `recalcularAgregados`.
- **Página:**
  - `livro-oficial.repository.ts`: `obter()` ganha `l.nota_geral` e `l.nota_geral_qtd`; `notasDosLeitores(livroId)` faz numa consulta só o `GROUP BY valor` com o total e a média arredondada no SQL;
  - `livro-oficial.service.ts` monta os três campos, passando o `numeric` do pg por `Number()`;
  - DTOs novos `NotaGeralDto`, `NotaDosLeitoresDto` e `FaixaDaDistribuicaoDto`.
  - O pessoal não muda.
- **Testes:**
  - Unitários: as 11 faixas e o arredondamento (o caso de 53 notas com soma 225 dá 4,2).
  - Integração do consumidor:
    - criada, atualizada e excluída;
    - entrega duplicada;
    - fora de ordem;
    - pessoal ignorado;
    - schema inválido vai para a DLQ.
  - Integração do backfill:
    - insere;
    - apaga o que ficou velho;
    - é idempotente;
    - **corre junto com o consumidor sem deixar linha velha**, com duas conexões.
  - Página: o `toEqual` de `livro-oficial.int-spec.ts` (sem notas, só geral, só dos leitores, as duas), com a contagem igual à soma das faixas. O `conta-excluida` continua verde.
- **Contratos e docs:**
  - `acervo.yaml`: os campos e os schemas novos; sai a frase do Período 1;
  - `catalogo.md`: consumidor de `nota.alterada`, a fila e o backfill depois da partida;
  - `acervo/AGENTS.md`.

### Web (`code/front`)
- `services/acervo.ts`: os tipos. `massaDoLivro.ts` passa a ter `notaGeral: null`, `notaDosLeitores: null` e `distribuicao: []`.
- **`components/livros/NotasDoLivro.vue`:**
  - container `papel-elevado`, radius 16, até 480px na web;
  - dois blocos com divisor vertical, `PhStar` fill e `num-display`;
  - contagens com `contagem()`;
  - `Sem nota` sem estrela, quando o indicador está ausente;
  - leitura de tela "Nota geral, 4,3 de 5, 412 avaliações".
- **`components/livros/HistogramaDeNotas.vue`:**
  - `<ul>` de 11 itens, com leitura "5 estrelas, 12 leitores" (`pagina-do-livro.md:575`);
  - proporcional à maior faixa, com `nenhum` na faixa vazia;
  - sem percentual.
- **`LivroOficialView.vue`:** a seção entra abaixo do título (≥1024px) e abaixo da barra de ação (<1024px), na ordem do protótipo. Ganha o esqueleto de 104px no carregamento.
- **Testes:** os componentes e a view. Registrar em `code/front/AGENTS.md`.

### Mobile (`code/mobile`)
- `livro_oficial.dart`: os campos com parse defensivo.
- Novo `lib/features/livros/notas_do_livro.dart`, com o container e o histograma lido como lista.
- `livro_oficial_page.dart`: a seção entra logo abaixo da barra de ação e ganha o **esqueleto de 104px do artboard 4.10** (`pagina-do-livro.md:343`).
- **Testes:**
  - novo `test/features/livros/notas_do_livro_test.dart`;
  - os finders de `'Sem nota'` de `livro_oficial_page_test.dart:122` e `:139` ficam específicos.
- `dart format` só nos arquivos novos. Registrar no `AGENTS.md`.

## Commit 4 — `feat: importacao da nota geral`

### Ingestão (`code/scripts/ingestao`)
- **`leai_ingestao/notas.py`:** leitor em streaming, validação e agregação.
- **`carga.py`:** `gravar_notas_gerais`, no molde de `gravar_biografias`:
  - lê as chaves do acervo;
  - COPY das obras presentes em `TEMP stg`;
  - `UPDATE … FROM stg`;
  - limpeza das obras que saíram do dump;
  - tudo numa transação.
- **`cli.py`:** `notas --arquivo <dump> [--dry-run]`, que mostra:
  - linhas lidas e descartadas;
  - obras;
  - edições atualizadas e limpas;
  - cobertura.
- **Testes pytest:** linhas inválidas, `\N`, repetidas, arredondamento, limpeza na recarga e `atualizado_em` intocado. O `AGENTS.md:67` é atualizado.

### `acervo` (inserção por ISBN)
- **`openlibrary.fonte.ts`:** `ratings.json` com a política própria. `average` nulo ou `count` 0 deixa a nota ausente. Valor de 0 a 5, contagem de 1 para cima, 1 casa.
- **`google-books.fonte.ts`:** `averageRating` e `ratingsCount`, quando o Google é a fonte.
- **`convergencia.repository.ts`:** grava a nota só na inserção.
- **`livros.module.ts`:** a política e o circuito do `ratings.json`.
- **Testes:**
  - com nota, sem nota e fora da faixa;
  - chave de obra inválida não vira URL;
  - falha e timeout do `ratings.json` não derrubam a importação nem abrem o circuito dela;
  - integração com a fonte simulada.

## Commit 5 — `feat: cache de capas oficiais no cloudinary`

### `acervo`
- **Contratos:**
  - copiar `livro.adicionado_a_estante.v1` e `leitura.iniciada.v1` para `src/messaging/schemas/`;
  - declarar `leitura.v_estante_publica_v1` em `contratos-externos.ts` com `.existing()`;
  - incluir a VIEW em `CONTRATOS_EXTERNOS` e em `TABELAS_DE_DADOS` (`test/integracao/banco.ts:45`).
- **`HttpExterno`:**
  - `baixarImagem(url)` devolve `{tipo: 'ok', bytes, contentType} | {tipo: 'ausente'} | {tipo: 'recusada', motivo}`, e só lança erro em indisponibilidade;
  - sufixo por opção da instância;
  - porta conferida na URL inicial.
- **Env (`env.ts` e `.env.example`):** `CAPAS_DOWNLOAD_HOSTS`, `CAPAS_DOWNLOAD_TIMEOUT_MS`, `CAPAS_DOWNLOAD_LIMITE_BYTES` e `CLOUDINARY_PASTA_CAPAS_OFICIAIS`. O `render.yaml` recebe a pasta como `value: capas-oficiais`.
- **`src/common/cloudinary.ts`:** `assinar(params, secret)`, em ordem alfabética, extraído de `remocao-de-asset.ts`.
- **`src/livros/capas/`:**
  - `validacao-de-imagem.ts`: início e fim do arquivo, `image-size` e os limites. A dependência nova entra no `package.json`;
  - `envio-de-capa.ts`: upload multipart com timeout de 20 s e o resultado discriminado;
  - `cache-de-capas.service.ts`: `cachear(tx, livroId)`;
  - `capa.consumer.ts`: `{consumerName: 'acervo.capas', queue: 'leai.acervo.capas', exchange: EXCHANGES.leitura, routingKeys: ['livro.adicionado_a_estante', 'leitura.iniciada']}`, registrado só com as credenciais;
  - `backfill.ts`: oficiais distintos de `v_estante_publica_v1` sem cópia, um por vez, com pausa de 1 s. Mostra quantas capas foram cacheadas e a soma dos bytes.
  - `package.json` ganha `backfill:capas`.
- **Testes:**
  - **Unitários:**
    - validação: JPEG, PNG e WebP aceitos; GIF, HTML, imagem truncada, pequena demais e grande demais recusados;
    - assinatura contra o exemplo da documentação do Cloudinary;
    - sufixo só na instância de capas, sem mudar `FONTES_HOSTS_PERMITIDOS`;
    - redirecionamento recusado;
    - porta na URL inicial;
    - limite de bytes;
    - cada ramo do resultado discriminado: 404, 410, 403, 429, 5xx, timeout e 400 do Cloudinary.
  - **Integração**, com `fetch` simulado:
    - `livro.adicionado_a_estante` cacheia;
    - **`leitura.iniciada` de livro sem cópia cacheia**;
    - segundo evento sem novo download;
    - pessoal ignorado;
    - ausente e recusada viram ACK sem cópia;
    - indisponível passa pelas retentativas e vai para a DLQ;
    - `capa_asset_id` gravado junto;
    - backfill;
    - `v_livro_referencia_v1` e a página com `origem: 'propria'`.
- **Docs:**
  - `catalogo.md`: os consumidores das duas routing keys e a fila sem credenciais;
  - `acervo.yaml`: descrição da `Capa`;
  - `AGENTS.md`.

## Commit 6 — `docs: F-ACV-NOTA concluida`

- **`feature-F-ACV-NOTA.md`:**
  - status e critérios, sem marcar o "mergeado" nem o DES;
  - timeline;
  - **item próprio:** a cobertura real pelo `--dry-run` em dev, em divergência com §10.1, sem editar `docs/orquestador`, e o dimensionamento pelo backfill de dev.
  - Divergências:
    - backfill depois da fila;
    - gatilho também em `leitura.iniciada`;
    - página calculada sobre a projeção;
    - 11 faixas;
    - allowlist por sufixo;
    - pasta por ambiente;
    - recarga que limpa a nota de livro importado.
  - Pendências:
    - reimportação por ISBN inexistente;
    - lacuna do `garantirEstante` (Ana);
    - `leitura.yaml` desatualizado;
    - fila de capas ausente sem credenciais.
  - Componentes a levar ao `documento-de-design.md`: container de notas e histograma.
- **`renato-periodo-2/README.md`:**
  - itens 5 e 6, este último com "nenhuma tabela nova; Henrique avisado";
  - atualizar este plano.

## Fechamento: push e PR

- `git push origin renato-features`.
- `gh pr create --base desenvolvimento --head renato-features`, com título `feat: nota geral, nota dos leitores e cache de capas (F-ACV-NOTA)`.
- O corpo segue o formato do #55:
  - resumo;
  - Backend (`acervo`) e Ingestão;
  - Web;
  - Mobile;
  - Decisões e divergências;
  - Código de outras pessoas, com @vicenzofms, @henriquegdc e a Ana;
  - Testes;
  - DES.
- **Destacar:**
  - nenhuma migration;
  - a dependência `image-size`;
  - a lacuna do `leitura`;
  - os passos do DES.
- O PR é revisado por um colega, sem merge local e sem linha de atribuição.
- **DES (débito, depois do merge de fechamento).** Com o `leai-acervo` no ar, que cria as filas, e com o OK do Renato, rodar na máquina local, com as variáveis exportadas só no shell (sem editar o `.env`):
  1. `backfill:notas` no `acervo`, com `DATABASE_URL` do `le-ai-oregon`.
  2. `backfill:capas` no `acervo`, com `DATABASE_URL` do `le-ai-oregon`, **`CLOUDINARY_PASTA_CAPAS_OFICIAIS=capas-oficiais`** e a API key e o secret de dev, que valem para o mesmo cloud. Com a pasta de dev, o DES apontaria para assets de dev.
  3. `notas` da ingestão, com `--dry-run` antes e a `DATABASE_URL` do `le-ai-oregon`.

## Verificação

**Antes de cada commit:**
- `acervo`: `npm run lint`, `npm run build`, `npm test` e `npm run test:integration` (com `DATABASE_URL_TESTE`);
- ingestão: `pytest`;
- web: lint, `vue-tsc` e vitest;
- mobile: `flutter analyze` e `flutter test`.

**Manual, com os quatro serviços locais sobre o banco e o broker de dev:**
- **Nota dos leitores:**
  - rodar `backfill:notas`;
  - nota de um leitor e depois a de outro: a média, a contagem e as faixas batem;
  - editar e excluir: converge;
  - livro pessoal: nenhum dos dois indicadores.
- **Nota geral:**
  - `notas --dry-run` e depois a carga real, com o OK;
  - livro só com nota geral: sem histograma (RN-06.1);
  - inserir por ISBN um livro com `ratings.json`.
- **Capas:**
  - "Quero ler" num livro oficial: o asset aparece em `capas-oficiais-dev/<id>`, e a página devolve `origem: propria`;
  - **"Iniciar leitura" num livro fora da estante: cacheia**;
  - outro leitor: não há novo upload;
  - origem fora da allowlist: ACK, e o livro segue com a capa externa;
  - rodar `backfill:capas`.
- **Web:** 1440 e 390px, claro e escuro.
- **App:** emulador, com os três estados dos indicadores e o esqueleto.
- **CI** verde no PR.

## Riscos

- **Cobertura:** a nota geral cobre perto de 20%, com contagens baixas. A interface trata a ausência, e a medida vai para a Timeline.
- **archive.org instável** (502 já visto): as mensagens vão para a DLQ, o backfill recupera, e a página segue com a capa externa.
- **Dev e DES no mesmo cloud:** o `public_id` com a pasta isola os assets, e o passo do DES fixa a pasta. A cota fica folgada para algumas centenas de capas, de 15 a 30 MB.
- **Evento antes da fila, ou ambiente sem credenciais:** os eventos se perdem, e os backfills rodam depois da partida em cada ambiente.
- **Nota ressuscitada** na janela de `conta.excluida` entre os dois serviços: baixa probabilidade, e um backfill corrige.
- **Código de outros donos:** ingestão, `HttpExterno`, fontes e página do Vicenzo; consumidor de conta do Henrique; lacuna do `leitura` da Ana. O PR avisa cada um.
