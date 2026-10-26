# F-ACV-NOTA — Nota geral e cache de capas

**Período:** 2 · **Prioridade:** desejavel
**Dono:** Renato Douglas · **Serviços afetados:** `acervo` (backend + projeção/cache) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2 (RF-ACV-15, 16, 17), RN-06, RN-14, §10.1. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §2.5, §3.2, §4.2, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Dar à página do livro os **dois indicadores de nota** e proteger as **capas oficiais** contra *link rot*. Continua [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) (que exibia notas como ausentes e apenas consumia a ordem de resolução de capa) e conecta os contratos que [F-AVA](../periodo-1/feature-F-AVA.md) e [F-EST](../periodo-1/feature-F-EST.md) publicaram. Fecha os requisitos **Desejáveis**:

- **RF-ACV-15** importar da fonte externa a **nota geral** e a quantidade de avaliações que a originou, persistindo ambas no livro oficial;
- **RF-ACV-16** exibir **nota geral** e **nota dos leitores** como indicadores **distintos e rotulados**, sem combiná-los em um único valor;
- **RF-ACV-17** armazenar a **capa** de um livro oficial em serviço próprio na primeira vez que ele entra na estante de algum usuário (RN-14).

RNF atendidos: **RNF-ARQ-06** (projeção de nota agregada e cache de capa por fluxo assíncrono), **RNF-ERR-06/07** (consumidores idempotentes + DLQ), **RNF-SEC-32** (mensagens validadas por schema), **RNF-SEC-33** (nota geral externa validada/normalizada antes de persistir), **RNF-SEC-20** (imagem validada por tipo/tamanho/dimensões antes de cachear), **RNF-SEC-39** (download externo com allowlist/timeout/limite de resposta). Imagens: **Cloudinary** (P-09).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | implementado | Nenhuma migration: as colunas de nota geral e de cópia própria, `nota_leitor_projecao` e `nota_livro_agregada` vêm do DER. Filas `leai.acervo.notas` e `leai.acervo.capas` (com `.dlq`) na exchange `leai.events.leitura`. Variáveis novas `CAPAS_DOWNLOAD_*` e `CLOUDINARY_PASTA_CAPAS_OFICIAIS`. Dependência nova `image-size` 2.0.4 |
| Backend | implementado | `acervo`: consumidor de `nota.alterada` com trava por livro, `backfill:notas`, os três campos novos na página; nota geral na importação por ISBN; cache de capas (`livro.adicionado_a_estante` e `leitura.iniciada`), `backfill:capas`. Ingestão: subcomando `notas` |
| Web | implementado | `NotasDoLivro` e `HistogramaDeNotas` na página do livro, com o esqueleto de 104px |
| Mobile | implementado | `NotasDoLivro` na página do livro, com o esqueleto de 104px |

## Especificação

### Backend / API — `acervo`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). Todo consumidor valida schema (SEC-32), é **idempotente** (RNF-ERR-06) e usa **DLQ** (RNF-ERR-07). **Backfill antes de consumir eventos novos** (regra compartilhada: eventos do Período 1 não são presumidos retidos no broker).

- **Projeção "nota dos leitores" (RF-ACV-16):** mantém em `acervo` uma projeção individual por usuário+livro e o agregado média+contagem por livro. Ao receber **`nota.alterada`**, o consumidor consulta a linha atual em `v_nota_publicacao_v1`: se existir, faz upsert do valor individual; se não, remove. Depois recalcula o agregado na mesma transação. Assim edição, exclusão, duplicação e entrega fora de ordem convergem para o estado atual sem exigir valor anterior no evento nem chamada HTTP a `leitura`. O backfill inicial usa a mesma VIEW antes do incremento.
- **Cache de capas (RF-ACV-17, RN-14):** consumidor do evento **`livro.adicionado_a_estante`** de [F-EST](../periodo-1/feature-F-EST.md) (fluxo fechado "cache de capas", §5.2). Na **primeira** vez que um livro oficial entra em **qualquer** estante, baixa a capa da URL externa (download **server-side** com allowlist/timeout/limite de resposta — SEC-39, RNF-ERR-08), valida a imagem (SEC-20) e a envia ao **Cloudinary**, gravando a **URL da cópia própria** (RN-14.2). Regras de RN-14:
  - Download **no máximo uma vez por livro**: eventos para livro que já tem cópia própria são **descartados** (idempotência, RN-14.3);
  - Falha no download **não é erro de usuário** — o livro segue exibido pela URL externa e o evento é reprocessado pela política de retentativa/DLQ (RN-14.5);
  - **Sem expiração por tempo** (RN-14.6): a cópia própria é permanente;
  - Capas de **livro pessoal não** passam por este fluxo (RN-14.7 — são enviadas pelo dono em [F-ACV-CADASTRO](../periodo-1/feature-F-ACV-CADASTRO.md)).
  - **Backfill inicial** dos livros já presentes em estantes a partir de **`v_estante_publica_v1`**, antes de consumir eventos novos (contrato registrado em [F-EST](../periodo-1/feature-F-EST.md)).
  A cópia própria alimenta a **resolução de capa** (ordem cópia própria → URL externa → placeholder, RN-14.4): dentro do próprio `acervo`, a página do livro de [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) lê a capa resolvida; para os demais serviços, a resolução é exposta por `v_livro_referencia_v1`, consumida em cross-schema pelos snapshots de feed em `social`.
- **Import da nota geral (RF-ACV-15, RN-06):** importar nota e quantidade de avaliações. Quando `ol_dump_ratings` fornecer avaliação por obra, `ol_work_key` associa e replica o mesmo valor externo às edições correspondentes; isso não cria entidade Obra e as notas dos leitores continuam independentes por edição. Google Books permanece alternativa esparsa. A nota é somente leitura, atualizada em recarga/reimportação, convertida para 0–5 e ausência nunca vira zero.

**Exibição (RF-ACV-16, RN-06):** a página do livro passa a mostrar **nota geral** (externa) e **nota dos leitores** (média do app) como **indicadores distintos e rotulados, nunca combinados** em um único número. Regras de RN-06: um livro pode ter um sem o outro; indicador ausente é exibido como ausente (não zero); **livro pessoal não tem nenhum dos dois** — só a nota individual do dono (RN-03/RN-06.5).

**Distribuição das notas do livro (RF-ACV-04):** a página também recebe o histograma dos valores dados pelos leitores, derivado por agrupamento de `nota_leitor_projecao.valor`. Não cria tabela nova e não se confunde com RF-STA-04, que distribui as notas dadas por um usuário.

**Eventos consumidos:** `nota.alterada`, `livro.adicionado_a_estante`. **VIEWs consumidas** (para backfill): `v_nota_publicacao_v1` (de [F-AVA](../periodo-1/feature-F-AVA.md)) e `v_estante_publica_v1` (de [F-EST](../periodo-1/feature-F-EST.md)).

**Modelo de dados** (schema `acervo`): `Livro` ganha nota geral + quantidade de avaliações e URL da cópia própria; `nota_leitor_projecao` (usuário, livro, valor, única por par) sustenta `nota_livro_agregada` (média + contagem). Tudo permanece no próprio schema.

### Frontend Web (`code/front`)

- **Página do livro** exibe os dois indicadores e a distribuição das avaliações dos leitores quando existir, sem zero inventado. Usa os componentes de estrelas/indicador de P0-DS. A resolução de capa passa a exibir a cópia própria quando disponível.

### App / sistema

- RF-ACV-15 e RF-ACV-17 são de sistema. A página Flutter recebe os mesmos indicadores, distribuição e estados ausentes da web.

## Critérios de aceite

- [x] A projeção faz backfill e converge por usuário+livro ao estado atual da VIEW em upsert/delete, inclusive sob duplicação ou entrega fora de ordem.
- [x] O **cache de capas** consome `livro.adicionado_a_estante`, baixa a capa **uma única vez por livro** (idempotente, RN-14.3), valida a imagem (SEC-20), grava a cópia própria e faz **backfill** de `v_estante_publica_v1`; falha não é erro de usuário (RN-14.5); sem TTL (RN-14.6); livro pessoal não entra (RN-14.7).
- [x] A **resolução de capa** passa a usar cópia própria → externa → placeholder (RN-14.4) via `v_livro_referencia_v1`.
- [x] A **nota geral** é importada com a quantidade de avaliações, **somente leitura**, ausência como ausente (RN-06.3), escala convertida (RN-12), dado externo validado (SEC-33).
- [x] A página exibe **nota geral** e **nota dos leitores** como indicadores **distintos e rotulados**, nunca combinados (RF-ACV-16, RN-06); livro pessoal não exibe nenhum dos dois.
- [x] Livro oficial com avaliações dos leitores exibe distribuição por valor; ausência retorna distribuição vazia, sem tabela adicional (RF-ACV-04).
- [ ] Projeção, cache e import funcionam **em DES**.

## Definition of Done

(plano §10)

- [x] Código (backend `acervo` + consumidores + import, web, mobile) mergeado em `desenvolvimento` (PR #57, 25/10/2026)
- [x] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [x] Testes unitários e de integração com banco real/container: criação/edição/exclusão e evento fora de ordem na projeção individual/agregada, cache único, backfills, import/normalização e indicadores ausentes (RNF-TST-02)
- [x] Testes assíncronos: consumo de `nota.alterada` e `livro.adicionado_a_estante` com entrega duplicada, backfill precedendo o incremento, falha de download reprocessável e DLQ (RNF-TST-03)
- [x] Testes web/mobile cobrem indicadores distintos, distribuição, ausência sem zero e cold start (RNF-TST-04/05/06)
- [x] **Spec OpenAPI de `acervo` atualizado em `docs/api/acervo.yaml`** com indicadores e distribuição na página do livro; `v_livro_referencia_v1` reflete a capa resolvida
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)). Débito do merge de fechamento
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver

**Item próprio:** registrar em Timeline a **cobertura real de nota geral** na base carregada e o **dimensionamento do cache de capas** (RN-14 estima 15–30 MB; §10.6), validando as premissas de armazenamento.

- **Cobertura real da nota geral (dev, 23/10/2026, `notas --dry-run` e carga):** o `ol_dump_ratings` de 30/09/2026 tem 1.060.973 linhas, todas válidas, em 709.550 obras. Das 10.568 obras do acervo, 1.968 têm nota, o que dá **2.244 das 11.011 edições oficiais (20,4%)**. A mediana é de 3 avaliações por obra, e 755 obras têm uma só. **Diverge do §10.1** (100% de cobertura e mediana de 213), que não se confirma no dump; `docs/orquestador` não foi editado.
- **Dimensionamento do cache de capas (dev):** o `backfill:capas` de 23/10/2026 cacheou em `capas-oficiais-dev` as **17 capas** dos livros oficiais que estavam em alguma estante, com 0,65 MB, sem nenhuma ausente, recusada ou indisponível, em 57 s (com a pausa de 1 s entre livros). Com as 2 do teste manual por evento, são 19 capas e cerca de 0,74 MB: **perto de 40 KB por capa**. A estimativa de 15 a 30 MB da RN-14 (§10.6) corresponde, nessa média, a algo entre 400 e 800 livros oficiais em estante, folgada para a cota do plano gratuito. Teste manual do cache: origem fora da allowlist virou ACK com a capa externa; "Quero ler" cacheou e a página passou a `origem: propria`; um segundo leitor não gerou novo upload; "Iniciar leitura" de um livro fora da estante também cacheou.

## Pendências

- **Aviso de [F-ACV-DESCOBERTA](feature-F-ACV-DESCOBERTA.md) (Vicenzo, 02/10/2026):** `GET /livros/{id}` (`LivroOficialDetalhe`) ganhou dois campos obrigatórios, só como acréscimo e sem mudar os existentes:
  - `editoraId: uuid | null`;
  - `serie: { id, nome, numero | null } | null`.

  Eles servem aos links da ficha para as páginas de editora e série. Os campos de nota desta feature entram no mesmo DTO (`src/livros/busca/dto/livro-oficial.dto.ts`) e no mesmo `obter()` de `livro-oficial.repository.ts`, que agora faz `LEFT JOIN acervo.serie`. O teste de forma exata em `test/integracao/livro-oficial.int-spec.ts` já inclui os dois campos. O contrato está no `docs/api/acervo.yaml`, e o código está na branch `vicenzo-features` até o merge em `desenvolvimento`.
- **⚠ Alerta de [F-ACV-DESCOBERTA](feature-F-ACV-DESCOBERTA.md) (Vicenzo, 07/10/2026), para antes de mexer na página do livro:** a tela que você integra mudou na web e no mobile (commits `47e31be` e `af7c5d4`, branch `vicenzo-features` até o merge em `desenvolvimento`). Faça rebase ou merge antes de começar, para não conflitar.
  - **Web (`code/front/src/views/livros/LivroOficialView.vue`):**
    - A ficha virou uma lista de `LinhaDaFicha`, com `valor` (texto), `links` (um ou vários) e `complemento`. Autor, editora e série são links. A linha `Série` entra entre `Editora` e `ISBN`, com `volume N` fora do link. A constante `LINK_ESTICADO` faz o link único cobrir a linha inteira.
    - Entrou a seção `Assuntos` logo depois da sinopse, na coluna da direita, com `order-4` abaixo de 1024px, e só aparece se o livro tiver assuntos.
    - Se a nota geral ou o histograma entrarem perto da sinopse, confira a ordem com `Assuntos` no protótipo.
    - Os testes novos estão em `LivroOficialView.spec.ts`. A massa `testes/massaDoLivro.ts` traz `editoraId: null` e `serie: null`.
  - **Mobile (`code/mobile/lib/features/livros/livro_oficial_page.dart`):**
    - `_Ficha` foi reescrita, agora com `_LinhaDaFicha`, links com `CaretRight` e linha de 48px quando há um link só.
    - Há uma `_Secao('Assuntos')` entre `Sinopse` e `Ficha`.
    - A página recebe os callbacks opcionais `aoAbrirAutor`, `aoAbrirEditora`, `aoAbrirSerie` e `aoBuscarAssunto`, passados por `rotaDoLivroOficial` em `rotas_livros.dart`. Sem eles, a ficha fica só em texto.
    - O modelo `LivroOficialDetalhe` ganhou `editoraId` e `serie`, e os dois ficam nulos quando ausentes.
    - Os testes novos estão no grupo "links da ficha e assuntos" de `livro_oficial_page_test.dart`.
  - Os dois `AGENTS.md` (de `code/front` e de `code/mobile`) registram essas mudanças.
- **Telas (design P2):** nota geral × nota dos leitores (§4.4) e histograma entram na edição consolidada [`pagina-do-livro.md`](../../design/periodo-2/pagina-do-livro/pagina-do-livro.md) ([protótipo](../../design/periodo-2/pagina-do-livro/prototipos/pagina-do-livro.html)), prompt escrito em 28/09/2026, protótipo exportado em 29/09/2026. Anatomia do histograma (11 faixas de 0 a 5 com meia estrela, faixa vazia como `nenhum`) nasce no prompt e aguarda incorporação ao design.
- **Depende de** [F-AVA](../periodo-1/feature-F-AVA.md) (`nota.alterada`, `v_nota_publicacao_v1`), [F-EST](../periodo-1/feature-F-EST.md) (`livro.adicionado_a_estante`, `v_estante_publica_v1`), [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) (página do livro e resolução de capa), [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md) (chaves de dedup para o import; `v_livro_referencia_v1`), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md) (broker; Cloudinary/P-09 para o cache).
- **Fonte da nota geral:** formato confirmado em 22/10/2026. O `ol_dump_ratings` tem uma linha por avaliação individual (obra, edição ou `\N`, nota inteira de 1 a 5, data), sem usuário e sem agregado.
- **Decisões do dono (22/10/2026),** detalhadas no [plano](renato-periodo-2/plano-F-ACV-NOTA.md#decisões-do-dono-22102026):
  - o consumidor de `nota.alterada` ignora o valor do evento, trava o livro por `pg_advisory_xact_lock` e relê a VIEW; o backfill e o `conta.excluida` usam a mesma trava, na mesma ordem;
  - `nota_livro_agregada` continua mantida (contrato da F-CONTA-2), mas a página não a lê;
  - contas em exclusão pendente entram na média; a suspensão fica para a F-MOD-OPC;
  - risco aceito: uma nota atrasada entre os `conta.excluida` do `leitura` e do `acervo` pode recriar a linha, e um novo backfill corrige.
- **Divergências registradas:**
  - **Backfill depois da fila**, e não antes do binding como em `catalogo.md`: o runtime cria a fila na partida, e evento publicado antes disso se perde. `backfill:notas` e `backfill:capas` rodam depois de o serviço subir em cada ambiente.
  - **Cache de capas também em `leitura.iniciada`**: iniciar a leitura de um livro fora da estante põe o livro nela sem publicar `livro.adicionado_a_estante`.
  - **Página calculada sobre a projeção**, numa consulta só (média arredondada uma vez, a 1 casa, e a distribuição), e não sobre `nota_livro_agregada`, que tem 2 casas e arredondaria duas vezes.
  - **11 faixas** no histograma (de 5 a 0, meia estrela), sempre todas quando há nota dos leitores.
  - **Allowlist por sufixo** só na instância de download das capas (`.us.archive.org`); as fontes de metadados continuam por igualdade exata.
  - **Pasta por ambiente** no Cloudinary (`capas-oficiais-dev` e `capas-oficiais`), porque dev e DES usam o mesmo cloud e os mesmos ids de livro.
  - **A recarga do dump limpa a nota geral** da edição cuja obra saiu do dump, inclusive no livro importado por ISBN, ao contrário do "nunca sobrescreve" das biografias (RN-06.6).
  - **Web e app, apontadas na implementação:** a nota inteira sai `4`, e não `4,0`, como no resto do app; o histograma fica `space-4` abaixo do container (o protótipo desenha 24px); na web, a barra de ação está na coluna da direita, então a partir de 1024px as notas ficam entre o título e a barra; o botão `Recomendar a um leitor` continua solto abaixo da barra de ação, e as notas entram depois dele; as contagens têm separador de milhar (`1.442 avaliações`).
- **Pendências:**
  - **Não existe reimportação por ISBN:** a nota da importação entra só na inserção; livro já cadastrado só ganha nota pela recarga do dump.
  - **Lacuna do `leitura` (Ana):** `garantirEstante` põe o livro na estante sem `livro.adicionado_a_estante`, então as recomendações do `social` também não são removidas nesse caso. O cache de capas contorna ouvindo `leitura.iniciada`.
  - **`docs/api/leitura.yaml`** descreve `v_nota_publicacao_v1` como "backfill futuro"; agora ela é lida pelo backfill e pelo consumidor. Avisar a dona, sem editar.
  - **Fila de capas ausente sem credencial:** sem `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`, o consumidor não se registra e os eventos se perdem; o `backfill:capas` recupera.
  - **`npm audit`:** a CI do `acervo` e a do front falhavam por vulnerabilidades altas publicadas depois de 21/10, que já falhavam na `desenvolvimento`. Resolvido no próprio PR, a pedido da revisão: `undici` 8.12.3 no front; body-parser, multer, fast-uri e **zod 4.6.7** (major) no `acervo`, com o `env.ts` conferido. Sobram 4 moderados do `drizzle-kit`, abaixo do nível `high` da CI.
- **Componentes a levar ao `documento-de-design.md`:** o container `Nota geral` × `Nota dos leitores` (`papel-elevado`, radius 16, divisor vertical, `Sem nota` sem estrela) e o histograma de 11 faixas (linhas de 20px, trilha de 8px, maior faixa com a trilha inteira, `nenhum` na faixa vazia, sem percentual). Sem edição de `docs/orquestador` aqui.
- **Débitos de DES (depois do merge de fechamento para a `main`):** com o `leai-acervo` no ar, rodar da máquina local, com as variáveis só no shell: `backfill:notas` e `backfill:capas` com a `DATABASE_URL` do `le-ai-oregon` (este com `CLOUDINARY_PASTA_CAPAS_OFICIAIS=capas-oficiais`), e o `notas` da ingestão, com `--dry-run` antes.
- **Código de outras pessoas alterado** (registrado nos `AGENTS.md`; avisar no PR):
  - Vicenzo: ingestão (`notas`, `carga.py`, `cli.py`, `AGENTS.md`), `HttpExterno` (`baixarImagem`, sufixo por instância, porta na URL inicial), `openlibrary.fonte.ts`, `google-books.fonte.ts`, `convergencia.repository.ts`, `livros.module.ts`, `LivroOficialView.vue`, `livro_oficial_page.dart`, `livro-oficial.int-spec.ts`, `massaDoLivro.ts` e os finders de `Sem nota` de `livro_oficial_page_test.dart`.
  - Henrique: `conta-excluida.consumer.ts` (trava em ordem e `recalcularAgregados`) e `remocao-de-asset.ts` (assinatura em `src/common/cloudinary.ts`).
  - Runtime de P0-MSG: o `MessageValidator` do `acervo` registra o `common-v1`, como o do `leitura`.
  - Ana: o `acervo` passa a consumir `livro.adicionado_a_estante` e `leitura.iniciada` e a ler `v_estante_publica_v1`, sem mudança no `leitura`.
- **Matriz de remoção da F-CONTA-2:** nenhuma tabela nova. `nota_leitor_projecao` e `nota_livro_agregada` já estão no consumidor, e a cópia própria da capa oficial é catálogo.
- **Alternativa a avaliar, sem mudar o desenho atual:** manter somente a projeção individual e calcular média/contagem por VIEW SQL antes de materializar `nota_livro_agregada`.
- Stack de `acervo` definida: **NestJS (TypeScript)** (arquitetura §2.1).

## Timeline

### 25/10/2026: PR #57 aprovado e mergeado na `desenvolvimento`

Aprovado pelo Vicenzo na terceira revisão, com a CI verde, e mergeado. A issue #20 fica em `Em revisão (PR)` no projeto até o aval dos professores. Falta o fluxo em DES, com os backfills, depois do merge de fechamento na `main`.

### 25/10/2026: segunda revisão do PR #57 (Vicenzo)

Três achados confirmados como corrigidos; a recarga da nota dos leitores pedia dois ajustes, ambos corrigidos com teste:

- **Respostas fora de ordem na web:** uma consulta da mesma rodada que terminava depois de uma mais nova devolvia a nota de antes da escrita. As consultas agora são numeradas e a resposta mais antiga que a última aplicada é descartada, como o app já fazia.
- **A recarga terminava antes da última retentativa do consumidor:** com a outbox da `leitura` (1 s) e as retentativas do `acervo` (1, 5 e 15 s), a última tentativa começa uns 22 s depois da escrita, e a última consulta era aos 15 s. As esperas passam a 2, 6, 15, 25 e 40 s, na web e no app.

### 24/10/2026: ajustes da revisão do PR #57 (Vicenzo)

Quatro achados, todos reproduzidos pelo revisor e corrigidos com teste:

- `6cb1720` **falha ao ler a resposta do Cloudinary:** a conexão que caía ou o timeout que disparava depois dos headers virava recusa e ACK, sem retentativa. Agora é indisponibilidade (retry e DLQ); só um corpo inteiro que não é o JSON esperado é recusa.
- `44aa3d4` **download recusado deixava a conexão aberta:** os corpos descartados (redirecionamento, respostas recusadas, `Content-Length` acima do limite) agora são cancelados, e `baixarImagem` aborta a requisição em qualquer caminho.
- `cd62364` **a nota dos leitores não acompanhava a nota do próprio leitor:** salvar, alterar ou remover a nota agenda recargas em silêncio dos indicadores (2, 6 e 15 s depois), na web e no app, trocando só as três notas e preservando as resenhas.
- `c6fe26b` **barras do histograma sumiam no app com texto ampliado em tela estreita:** a linha empilha (rótulos em cima, trilha inteira embaixo) quando sobram menos de 64 dp para a trilha.

Testes, todos passando: `acervo` com 386 unitários e 173 de integração; ingestão com 137; web com 1040; app com 891.

### 22 e 23/10/2026: implementação, testes e teste manual. Commits na `renato-features`, para o PR:

- `fc2799b` **nota geral e nota dos leitores na página:** consumidor de `nota.alterada` com trava por livro, `backfill:notas`, `conta.excluida` com a mesma trava, os três campos da página; `NotasDoLivro` e `HistogramaDeNotas` na web e no app.
- `114e27f` **importação da nota geral:** subcomando `notas` da ingestão e nota na importação por ISBN (`ratings.json` e Google Books).
- `5def38f` **fix:** separador de milhar nas contagens (`1.442 avaliações`), achado no teste manual.
- `110cf98` **cache de capas oficiais:** download pelo servidor com allowlist por sufixo, validação da imagem, upload assinado, consumidor de `livro.adicionado_a_estante` e `leitura.iniciada`, `backfill:capas`.

Testes, todos passando: `acervo` com 378 unitários e 173 de integração; ingestão com 137; web com 1032, com lint e `vue-tsc` limpos; app com 863, com `flutter analyze` limpo. Teste manual com os quatro serviços locais sobre o banco e o broker de dev: `backfill:notas` (5 notas) e notas de dois leitores pela API, com a média, as faixas, a edição e a exclusão convergindo; livro pessoal sem os indicadores; `notas` da ingestão (cobertura no item próprio); importação por ISBN com `ratings.json`; cache de capas (no item próprio). Na web (Edge automatizado, 1440 e 390px, claro e escuro) e no app (emulador Pixel 8): as duas notas com histograma, só a nota geral e nenhuma nota.

Observação do teste manual, fora desta feature: o `leitura` caiu uma vez com `getaddrinfo ENOTFOUND` do host do Neon (falha momentânea de DNS) e voltou ao ser reiniciado, como o `acervo` no teste da F-AVA-2.

### Revisão 01/09/2026: ratings por obra passaram a ser replicados nas edições via `ol_work_key`; distribuição de notas do livro alocada nesta feature sem tabela nova; mobile corrigido no escopo.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-ACV-NOTA no [periodo-2/README.md](README.md), de RF-ACV-15/16/17 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2 e das RN-06/RN-14/§10.1. Projeção e cache ligados aos fluxos fechados `nota.alterada`/`livro.adicionado_a_estante` com backfill obrigatório pelas VIEWs de F-AVA/F-EST; a distribuição de notas sem feature foi registrada como pendência de baseline, sem alocação autônoma.

### Revisão 28/08/2026: precisão de redação — a resolução de capa por [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) é leitura **intra-serviço** em `acervo`, não consumo cross-schema; `v_livro_referencia_v1` é o contrato para os consumidores **externos** (snapshots de feed em `social`). Frase da resolução de capa reescrita para distinguir os dois casos.

### Revisão 29/08/2026: projeção individual por usuário+livro passou a sustentar média/contagem e a consultar o estado atual da VIEW, cobrindo edição, exclusão e ordem de entrega sem ampliar o evento. Mobile foi incluído por compartilhar a página de livro de RF-ACV-16.

### Dono 29/09/2026: feature atribuída a **Renato Douglas** na [divisão do Período 2](README.md#divisão-do-período-2-entre-5-pessoas).
