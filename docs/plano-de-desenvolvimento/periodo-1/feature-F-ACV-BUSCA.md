# F-ACV-BUSCA — Busca e página do livro

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** Renato Douglas · **Serviços afetados:** `acervo` (backend) + web + mobile
**Situação:** entregue, **em revisão** (aguarda o aval dos professores para ser marcada como concluída no GitHub Projects) desde 27/09/2026

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2 (RF-ACV-01, 02, 04, 18, 19), RN-19, RN-21, RN-14. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §2.2, §3.2, §4.2, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar o **caminho de descoberta do acervo** — o "encontrar um livro" do ciclo de valor: a **busca paginada** de livros oficiais e a **página do livro**. Fecha os requisitos **Essenciais**:

- **RF-ACV-01** buscar por **título, autor, editora ou ISBN**, com resultados **paginados**;
- **RF-ACV-02** filtrar resultados por **assunto**;
- **RF-ACV-04** ver a **página do livro** com metadados, capa, **sinopse** e resenhas de outros leitores;
- **RF-ACV-18** obter e persistir a **sinopse sob demanda** na primeira abertura da página (RN-19);
- **RF-ACV-19** a página permanece **utilizável sem sinopse**, exibindo a ausência sem erro.

Consome o acervo carregado por [F-ACV-INGESTAO](feature-F-ACV-INGESTAO.md) e os livros cadastrados por [F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md).

RNF atendidos: **RNF-DES-01** (leitura ≤1s p95, sem cold start), **RNF-DES-02** (paginação com teto de itens), **RNF-DES-03** (índices sobre título/autor/ISBN), **RNF-SEC-05** (IDs não sequenciais / anti-IDOR), **RNF-SEC-06** (livro pessoal fora da busca/catálogo), **RNF-ERR-08/09** (resiliência da fonte externa e cold start), **RNF-ARQ-06** (sinopse por fluxo assíncrono).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | implementado | consumidor `acervo.sinopse` na fila `leai.acervo.sinopse` sobre o runtime de P0-MSG, provado com o broker em memória e, em 27/09, no broker de dev (`Le-ai`): a fila e a DLQ foram criadas e as sinopses pendentes viraram `disponivel`; a prova em DES vem com o merge de fechamento |
| Dados | implementado | migration `0004` (`pg_trgm`, `unaccent`, `acervo.f_busca_normalizar` e índices GIN de título, autor e editora) aplicada no banco de dev em 26/09, com ~2,2 MB de índices; o DES a recebe no deploy da `main` |
| Backend | implementado | `GET /assuntos`, `GET /livros`, `GET /livros/{id}` com sinopse sob demanda e `GET /livros/{id}/resenhas` com RN-08, em 26/09; validado e corrigido em 27/09 (busca por palavras, relevância, ISBN-10, entradas malformadas) |
| Web | implementado | Descobrir e página do livro, conferidos com os protótipos a 1440 e 390 px; paginação, falhas e acessibilidade corrigidas na validação de 27/09 |
| Mobile | implementado | Descobrir conferido no emulador com os dados do dev; página do livro conferida pelos testes de widget; laço de pedidos na falha, lista curta e acessibilidade corrigidos na validação de 27/09 |

## Especificação

### Backend / API — `acervo`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs de livro **não sequenciais** (SEC-05). **Livro pessoal nunca aparece** em busca, catálogo, filtro ou páginas de autor/editora/série (SEC-06, RN-03); sua página autorizada pertence a [F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md).

- **`GET /livros?q={texto}&assunto={uuid}&page={n}&limit={n}`** (RF-ACV-01, RF-ACV-02; contrato em [`docs/api/acervo.yaml`](../../api/acervo.yaml)) — busca **paginada** de livros oficiais por **título, autor, editora ou ISBN-13**, com `q` e `assunto` opcionais, `page` iniciado em 1 e `limit` máximo 50. Usa índices adequados (RNF-DES-03); ordenação por relevância; **agrupamento visual por título+autor** é mitigação de interface de RN-01 (o modelo continua por edição). `PaginaLivros` retorna `itens`, `page`, `limit`, `totalItens` e `totalPaginas`; cada item traz id, título, autores, editora, ano, páginas, **capa resolvida** e assuntos.
- **`GET /livros/{id}`** (RF-ACV-04; `id` UUID de livro oficial) — retorna `LivroOficialDetalhe`: metadados, capa, `sinopse { status, texto }` e a primeira `PaginaResenhas`, com `itens`, `limit` e `proximoCursor`. Assuntos acionáveis pertencem a F-ACV-DESCOBERTA. As resenhas vêm de `leitura.v_resenha_publicacao_v1` e são compostas com os contratos de identidade sob RN-08. Nota geral, nota dos leitores e distribuição não integram o contrato do Período 1.
- **`GET /livros/{id}/resenhas?cursor={opaco}&limit={n}`** — pagina as resenhas permitidas pelo mesmo filtro server-side de RN-08; `cursor` tem até 500 caracteres e `limit` máximo 50. As páginas seguintes à incluída em `GET /livros/{id}` usam esta rota (RNF-DES-02).
- **Sinopse sob demanda** (RF-ACV-18, RF-ACV-19, RN-19):
  - A sinopse **não** foi carregada na ingestão (RN-19.1). O livro mantém `sinopse_status = nao_consultada | pendente | disponivel | ausente | falha_transitoria`. Na primeira abertura, uma atualização concorrente segura muda para `pendente` e publica **uma** `livro.pagina_aberta`; estados `disponivel` e `ausente` são terminais para a busca automática.
  - O consumidor busca na ordem **OpenLibrary → Google Books → ausente** (RN-19.3), com allowlist, timeout, limite de resposta, backoff e circuit breaker (SEC-39, RNF-ERR-08). Em sucesso persiste texto puro ≤4.000 e marca `disponivel`; quando ambas as fontes respondem sem sinopse, marca `ausente`. Ao esgotar tentativas antes da DLQ, marca `falha_transitoria`; uma abertura posterior pode reenfileirar de forma controlada com nova chave, sem ficar eternamente `pendente`. Marcação externa é removida (RN-19.6).
  - A busca é **assíncrona e não bloqueia a renderização** (RN-19.5): a página abre já; a sinopse aparece quando disponível. **Ausência é estado válido** e não gera erro (RF-ACV-19, RN-19.4). Sinopse **não** integra o índice de busca (RN-19.7).
- **Resolução da capa** na exibição (RN-14.4): **cópia própria (Cloudinary), se existir → URL externa → placeholder**. O cache da cópia própria é alimentado por outro fluxo (RN-14, disparado por `livro.adicionado_a_estante` de [F-EST](feature-F-EST.md)); aqui apenas se **consome** a ordem de resolução.

**Evento:** `acervo` produz e consome **`livro.pagina_aberta`** (produtor e consumidor no mesmo domínio, §5.2). O `data` segue [`livro.pagina_aberta.v1`](../../mensageria/schemas/livro.pagina_aberta.v1.schema.json), contém somente `livroId`, e o envelope de P0-MSG usa `businessKey = livro:<livroId>:sinopse`. A mudança concorrente de `nao_consultada` para `pendente` e a linha de `outbox_acervo` são atômicas. O consumidor valida envelope e `data`, grava efeito e recibo na mesma transação e deduplica por `(consumidor, eventId)`; o estado persistido da sinopse fornece a idempotência semântica adicional. A fila é `leai.acervo.sinopse`, ligada a `leai.events.acervo` pela routing key `livro.pagina_aberta`, com `leai.acervo.sinopse.dlq`.

**Contratos cross-schema da página do livro:** para livro oficial, `acervo` lê `leitura.v_resenha_publicacao_v1` (`resenha_id`, `usuario_id`, `livro_id`, `texto`, `spoiler`, `criado_em`, `atualizado_em`, `curtidas`, `descurtidas`) e compõe autor/visibilidade com `identidade.v_perfil_referencia_v1` e `identidade.v_seguimento_aceito_v1`; as VIEWs omitem contas suspensas/em exclusão, mas não substituem a autorização RN-08. A página de livro pessoal, pertencente a F-ACV-CADASTRO, acrescenta as vias `social.v_atividade_livro_pessoal_v1`/`social.v_lista_livro_pessoal_v1` e lê `leitura.v_nota_publicacao_v1`; conhecer o ID não autoriza acesso. `acervo.v_livro_referencia_v1` é exposta por este serviço a `leitura` e `social`, não é usada para ler o próprio livro. Nenhum serviço lê tabela crua de outro schema. As VIEWs foram implantadas pelo DER em 16/09/2026; a composição e a autorização RN-08 da página oficial estão implementadas desde 26/09/2026 (`GET /livros/{id}/resenhas`), e as VIEWs têm dados reais desde que [F-AVA](feature-F-AVA.md) e [F-PERFIL](feature-F-PERFIL.md) entregaram.

### Frontend Web (`code/front`)

- **Tela de busca** com campo único (título/autor/editora/ISBN), **filtro por assunto**, paginação e agrupamento visual por título+autor; usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md) (card de livro).
- **Página do livro**: metadados, capa (com placeholder no fallback), sinopse e resenhas paginadas permitidas por RN-08. Enquanto `sinopse_status=pendente`, o cliente consulta novamente `GET /livros/{id}` com intervalo crescente e limite de tentativas/tempo; para em `disponivel`, `ausente` ou `falha_transitoria`, sem polling infinito. Ausência é exibida sem erro e falha transitória permite nova tentativa em abertura/atualização posterior. Cold start tratado como carregamento (RNF-ERR-09); cliente HTTP usa timeout e backoff apenas em operações idempotentes.

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); paginação incremental de busca e resenhas; mesma resolução de capa e tratamento de sinopse ausente/carregando. Alvo de demonstração Android.

## Critérios de aceite

- [x] Busca retorna livros oficiais por título/autor/editora/ISBN, **paginada** com teto de itens (RNF-DES-02) e usando índices (RNF-DES-03); **livro pessoal nunca** aparece (SEC-06).
- [x] Filtro por assunto restringe os resultados (RN-21).
- [x] Página do livro abre com metadados/capa e resenhas **paginadas**, filtradas server-side por RN-08 via contratos versionados, sem ler tabelas cruas.
- [x] Na 1ª abertura, domínio e outbox de `livro.pagina_aberta.v1` são gravados atomicamente uma vez; sinopse encontrada vira texto puro ≤4.000 e estado `disponivel`; resposta válida sem sinopse vira `ausente` e não repete consultas futuras; indisponibilidade continua reprocessável.
- [x] A página **abre sem esperar** a sinopse; **ausência de sinopse** é exibida sem erro (RF-ACV-19).
- [x] Capa resolve na ordem cópia própria → externa → placeholder (RN-14.4).
- [x] Nota geral/dos leitores aparecem como **ausentes** (não zero) enquanto F-ACV-NOTA não existir. Ausentes por inteiro, sem componente vazio: é o que o RF-ACV-04 ("aparecem quando as funcionalidades correspondentes estiverem disponíveis") e o `pagina-do-livro.md` §7 pedem.
- [ ] Busca e página do livro funcionam **em DES**, com leitura ≤1s p95 desconsiderando cold start (RNF-DES-01). *Entra no merge de fechamento do Período 1: a `main` só recebe o período fechado, e o DES sobe da `main`. No dev, o p95 medido foi ~690 ms (27/09/2026).*

## Definition of Done

(plano §10)

- [x] Código (backend `acervo`, web, mobile) mergeado em `desenvolvimento`
- [x] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [x] Testes unitários e de integração com banco real/container: parâmetros e forma exata de `PaginaLivros`/`PaginaResenhas`; busca por título/autor/editora/ISBN; filtro/paginação/teto; exclusão de livro pessoal; composição das VIEWs e autorização de resenhas para perfil público, privado seguido, privado não seguido, suspenso e em exclusão; estados concorrentes da sinopse (RNF-TST-02)
- [x] Teste assíncrono da sinopse cobre schema canônico, atomicidade domínio+outbox, publicação e consumo pela topologia de P0-MSG, recibo+efeito atômicos, entrega duplicada sem novo efeito, ausência terminal, falha pós-retentativa sem `pendente` órfão e DLQ (RNF-TST-03); a suíte genérica de dispatcher/confirm/retry/DLQ continua pertencendo a P0-MSG
- [x] Testes web/mobile cobrem paginação, polling limitado da sinopse, ausência/carregamento e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [x] **Spec OpenAPI de `acervo` em `docs/api/acervo.yaml` implementado sem divergência** para `GET /livros`, `GET /livros/{id}` e `GET /livros/{id}/resenhas`; remover `x-contract-status: planned` somente após a implementação
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)) — entra no merge de fechamento do Período 1, não é pendência da feature
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver

## Pendências

- **Depende de** [F-ACV-INGESTAO](feature-F-ACV-INGESTAO.md) (acervo carregado com índices e assuntos), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md). P0-MSG está pronto desde 19/09 (dispatcher com confirm, `mensagem_processada`, validação, retry e DLQ), e o consumidor da sinopse roda sobre ele. As fontes externas são OpenLibrary e Google Books.
- **"Funciona em DES" chega com o fechamento do Período 1.** A `main` só recebe cada período inteiro, no merge de fechamento, e o DES sobe da `main`; por isso o item e a latência de RNF-DES-01 (≤ 1 s p95) não são pendência da feature. No deploy, o `start:prod` aplica a migration `0004` no banco de Oregon (as extensões estão disponíveis lá, conferido em 25/09); depois, conferir `/health`, extensões, índices e a fila `leai.acervo.sinopse` no `Le-ai-oregon`, e medir a latência.
- **Sem `GOOGLE_BOOKS_API_KEY` local**, o Google responde 429, que conta como indisponível: livros sem sinopse na OpenLibrary vão para `falha_transitoria` em vez de `ausente`. A chave está no painel do Render.
- ~~**Consome `v_resenha_publicacao_v1`** de [F-AVA](feature-F-AVA.md) e os contratos de privacidade de [F-PERFIL](feature-F-PERFIL.md) — coordenar colunas e índices antes de implementar.~~ — **resolvido em 27/09/2026:** F-AVA entregou a VIEW com as colunas que a página usa, e F-PERFIL, os contratos de perfil e seguimento.
- **Nota geral, nota dos leitores, distribuição e projeção `nota.alterada`** ficam em **F-ACV-NOTA** (Período 2); aqui aparecem como ausentes.
- **Filtro avançado** (autor/editora/série/ano/faixa de páginas, RF-ACV-03) e **páginas de autor/editora/série** (RF-ACV-10/11/12) e **assunto acionável** (RF-ACV-21) são **F-ACV-DESCOBERTA** (Período 2).
- Stack de `acervo` definida: **NestJS (TypeScript)** — mesma stack que `leitura` (arquitetura §2.1).

- **Prompts de tela em [`docs/design/periodo-1/F-ACV-BUSCA/`](../../design/periodo-1/F-ACV-BUSCA/):** `descobrir.md` (antes `busca.md`) e `pagina-do-livro.md`. A página do livro é a **hospedeira de cinco features do Período 1**: além de RF-ACV-04/18/19, ela recebe status e ações de estante e RF-EST-08 ([F-EST](feature-F-EST.md)), a barra de progresso de RF-PRG-02 ([F-PRG](feature-F-PRG.md)) e a nota e as resenhas de RF-AVA-01/02/03 ([F-AVA](feature-F-AVA.md)), conforme a regra de recorte do [`docs/design/AGENTS.md`](../../design/AGENTS.md) §2.
- **Divergência entre o protótipo e o `documento-de-design.md` §5.2, registrada e não silenciada:** a seção descreve a página do livro para o produto pronto e cita seis elementos que **não existem no Período 1**, todos deliberadamente omitidos do prompt com o motivo escrito: botão Favoritar (RF-EST-09, F-EST-2), frases e trechos (RF-AVA-06/07, F-AVA-2), chips de assunto acionáveis (RF-ACV-21, F-ACV-DESCOBERTA), componente de nota geral e nota dos leitores (§4.4, F-ACV-NOTA), autor/editora/série como link (RF-ACV-10/11/12) e resenha em Markdown (RF-AVA-09). Nenhum deles aparece como componente vazio ou zerado. Quando as features do Período 2 entrarem, os prompts precisam ser revisados.
- **Componentes que nascem no protótipo e ainda não estão na fonte:** o **chip de assunto com estado ativo** (`descobrir.md`) e o **bloco de resenha com spoiler oculto** (`pagina-do-livro.md`). RF-AVA-03 e o design §5.2 exigem o comportamento mas não desenham o componente. Incorporar ao `documento-de-design.md` pelo controle de mudança do plano §3; não fica decidido só no prompt.

- **A tela de busca virou raiz de aba, e isso muda o shell.** Escrever o prompt deixou visível que a busca do acervo não cabia dentro da estante: a barra marcava `Estante` como ativo numa tela de resultados de catálogo, e na web o campo do header de `Minha estante` devolvia o acervo inteiro. A tela passou a ser a aba **`Descobrir`** (`Compass`, quarto item da navegação), com header de duas linhas, sem botão de voltar e **com** o sino, que a versão anterior dispensava. O arquivo foi renomeado de `busca.md` para `descobrir.md`. A mudança do shell foi registrada em [P0-NAV](../periodo-0/feature-P0-NAV.md) e incorporada ao `documento-de-design.md` (§5.7 `Descobrir` e a lupa da estante filtrando a estante no §5.1); a busca dentro da estante é pendência de [F-EST](feature-F-EST.md).
- **A aterrissagem da aba é magra no Período 1, por decisão.** Sem consulta, `Descobrir` mostra o campo e a faixa de assuntos e nada mais. Quem preenche a aba é [F-ACV-DESCOBERTA](../periodo-2/feature-F-ACV-DESCOBERTA.md) (filtros avançados, páginas de autor, editora e série) e [F-REC-P2P](../periodo-2/feature-F-REC-P2P.md) (seção de recomendações, RF-REC-13), as duas no Período 2. O prompt proíbe desenhar espaço reservado para elas.

### Achados da validação de 27/09/2026 que ficam para depois

- **Evento publicado antes de a fila existir se perde (P0-MSG).** Na subida, o dispatcher da outbox começa assim que o canal de publicação fica pronto, e as filas dos consumidores são declaradas em paralelo, sem `mandatory`. Na primeira subida com pedidos de sinopse acumulados, um deles saiu antes de `leai.acervo.sinopse` existir e foi descartado pelo broker. O livro se recupera sozinho: fica `pendente`, e a abertura depois de 15 minutos pede de novo (conferido). Só acontece com backlog na primeira subida; correção possível no runtime de P0-MSG é esperar a topologia dos consumidores do próprio serviço antes de despachar.
- **`<h1>` vazio no shell da web (P0-NAV).** Rotas com `titulo: ''` (página do livro oficial, livro pessoal, perfil de outro leitor) deixam um `<h1>` sem texto no `CabecalhoTela`. Na página do livro oficial o título do livro é outro `<h1>`; no livro pessoal e no perfil de outro leitor o título é `<h2>` e conta com esse `<h1>`. Corrigir mexe em três telas de donos diferentes, por isso não entrou aqui.
- **Dados da ingestão ([F-ACV-INGESTAO](feature-F-ACV-INGESTAO.md)).** Títulos que são só pontuação ("," e ".MENSAGEM.") abrem o filtro só por assunto, que ordena por título; e há nomes com acento decomposto ("Presenc̦a", com U+0326), que não casam com a busca digitada. Os dois são do dump da OpenLibrary e pedem limpeza na carga, não na busca.
- **Latência do termo de uma letra.** Buscar "a" ou "o" (cerca de 11 mil edições) leva ~650 ms no dev, contra ~450 ms antes da relevância nova: o casamento integral e a semelhança rodam em todos os candidatos. Os clientes só buscam a partir de 2 caracteres ("de" leva ~360 ms) e o p95 medido ficou em ~690 ms, dentro de RNF-DES-01; se pesar no DES, limitar a pontuação aos candidatos da página.

### Decisões de implementação (26/09/2026)

- **Debounce de 350 ms com mínimo de 2 caracteres**, igual na web e no mobile. Nenhum requisito, design ou protótipo define; o contrato aceita `q` a partir de 1 caractere.
- **"N livros encontrados" conta edições** (`totalItens`), que são livros pelo RN-01; o número de grupos só seria conhecido depois de carregar todas as páginas.
- **Relevância:** o campo vem antes da semelhança (título > autor > editora > assunto), e a semelhança desempata dentro do campo. A busca casa por trecho; semelhança nunca casa. *Revista em 27/09:* acima dos campos vem o **casamento integral**, título ou autor que, sem pontuação, é exatamente o texto buscado (título antes de autor); a semelhança passou a ser `word_similarity` com desempate por `similarity`, que favorece o campo mais curto. Antes, "dom casmurro" trazia "Dom Casmurro (Clássicos...)" antes do título exato, e "machado de assis" trazia cinco livros *sobre* o autor antes das obras dele.
- **Busca palavra por palavra (27/09):** todas as palavras do texto precisam aparecer, por trecho, no mesmo campo, em qualquer ordem. Resolve pontuação e palavras do meio ("grande sertao veredas" acha "Grande sertão: veredas", "senhor aneis" acha "O Senhor dos Anéis") e espaço duplo, sem migration nova. A pontuação nas pontas da palavra sai ("casmurro." vira "casmurro"); palavra só de pontuação sai quando há outra com letra; sem nenhuma, fica, e `%` continua achando "100% amor". Palavra repetida ou contida em outra sai, e ficam no máximo 8, as mais longas: sem teto, 100 palavras de uma letra virariam 400 `LIKE`. "guimaraes rossa" continua vazio.
- **ISBN-10 na busca (27/09):** convertido para o ISBN-13 da edição (prefixo `978`, novo dígito verificador). O RF-ACV-01 fala em "ISBN", e livro antigo traz só o ISBN-10 impresso. O cadastro continua exigindo ISBN-13.
- **Reenfileiramento da sinopse:** `falha_transitoria` há mais de 10 minutos e `pendente` há mais de 15 minutos voltam a pedir a sinopse numa abertura; o relógio é `atualizado_em`.
- **Política das fontes de sinopse:** uma retentativa de 1 s, com o circuit breaker, para a fila (um livro por vez) não ficar presa por minutos. Pior caso de ~35 s por livro.
- **Polling dos clientes:** esperas de 2, 3, 5, 8, 13, 20, 30 e 40 s (~2 minutos), aproveitando só a sinopse de cada consulta.
- **Rate limit da página do livro** (60 por minuto por identidade, 600 por IP), em escopo próprio: a abertura dispara consulta a fonte externa. O teto por IP era 120 e subiu em 27/09: uma turma inteira atrás do NAT da faculdade sai pelo mesmo IP, e cada abertura soma até 7 consultas de polling no primeiro minuto, então a demonstração em sala esbarraria no 429.
- **Resenha do próprio leitor fora da lista**, seguindo o RF-ACV-04 ("de outros leitores"); ela volta à página em "Sua avaliação", com F-AVA.
- **`resenhas` anulável** em `LivroOficialDetalhe`: `null` quando os contratos de `leitura` ou `identidade` falham, e a página abre mesmo assim; a rota de resenhas responde 503 nesse caso.

### Divergências protótipo × implementação (26/09/2026)

- **Card de resenha** sem `@username` e sem estrelas, e o título "Resenhas" sem a contagem "28 resenhas": o contrato do Período 1 não traz esses dados (`ResenhaResumo`, compartilhado com o livro pessoal, não mudou).
- ~~**Blocos de outras features ficam de fora**, sem espaço reservado: status pill da busca e ações de estante (F-EST), barra de progresso (F-PRG), "Sua avaliação" e "Escrever a primeira" (F-AVA).~~ — **resolvido em grande parte pelas features vizinhas:** "Sua avaliação" e "Escrever a primeira" entraram na página do livro em 27/09/2026 ([F-AVA](feature-F-AVA.md)), e a situação na estante, com ações e barra de progresso, em 29/09/2026 ([F-EST](feature-F-EST.md)/[F-PRG](feature-F-PRG.md), `6099020`), na web e no mobile. O status pill nos resultados de Descobrir continua fora.
- **Chips de assunto** vêm do banco (31 do conjunto curado), não os 9 do protótipo. No mobile e na faixa da web, o chip ativo é `musgo` cheio com texto `papel`, como no protótipo; o `descobrir.md` fala em `musgo-fundo`. O chip **inativo** tem texto `tinta`, também como no protótipo; o `descobrir.md` pede `caption grafite` (registrado na validação de 27/09).
- **"N edições" expande as outras edições** logo abaixo do card; o protótipo não desenha o estado expandido.
- **Textos que o design não prevê:** sinopse em `falha_transitoria` ("Não conseguimos buscar a sinopse agora. Ela deve aparecer numa próxima visita."), polling encerrado ainda pendente ("A sinopse ainda está a caminho. Volte daqui a pouco."), livro não encontrado ("Não encontramos este livro") e resenhas indisponíveis ("Não foi possível carregar as resenhas.", com "Tentar de novo").
- **"Ver todas as resenhas"** carrega a página seguinte na própria tela, por cursor.
- **Header:** em Descobrir e na página do livro, sem divisor. O design o mostra quando o conteúdo rola por baixo, e o app não acompanha a rolagem para desenhá-lo. No mobile, o campo de busca fica fixo no topo da página, como segunda linha do header da aba.
- **Na web, voltar da página do livro** refaz a busca a partir de `q` e `assunto` na URL, mas a rolagem recomeça do topo.
- **Testes de RN-08:** conta suspensa e em exclusão são o mesmo caso, "sem linha na `v_perfil_referencia_v1`", porque a VIEW já as omite.

## Timeline

### Fechamento 29/09/2026: arquivo revisado para o fechamento do Período 1. Situação **em revisão** desde 27/09/2026, depois das duas rodadas de validação; camadas registradas como implementadas e os itens de DES como parte do merge de fechamento, com a latência a medir lá. A página do livro, hospedeira de cinco features, recebeu das vizinhas o bloco "Sua avaliação" e "Escrever a primeira" (F-AVA, 27/09) e a situação na estante com progresso (F-EST/F-PRG, `6099020`, 29/09); as divergências foram atualizadas. `ci-back-acervo`, `ci-front` e `ci-mobile` verdes na `desenvolvimento`.

### Validação 27/09/2026, segunda rodada: nova revisão de contexto limpo, só sobre as correções da primeira. **Backend:** palavras sem repetição, sem pontuação nas pontas e com teto de 8; o texto puro da sinopse tira só nomes de tag HTML conhecidos ("&lt;&lt;O Guarani&gt;&gt;" ficava vazio); 503 só para falha de conexão (o `08P01` é bug nosso, não indisponibilidade); o log do pedido de sinopse com a causa do Postgres, e teste do caminho em que ele falha; 413 declarado no contrato. **Mobile:** a lista curta parava na 2ª página quando nada pedia quadro novo (busca pelo chip, campo sem foco); o teste novo pega o defeito. **Web:** movimento reduzido também zera o fade dos skeletons (a regra global só zerava transições); a faixa de assuntos não pisca na retentativa automática; o aviso de cold start passou para uma região de status fixa. **Web e mobile:** 429 sem o corpo do contrato (vindo de proxy) ainda explica o limite.

### Validação 27/09/2026: revisão independente das três camadas e teste real contra o banco e o broker de dev. **Backend:** busca palavra por palavra e casamento integral de título e autor (decisões acima), ISBN-10 convertido, `page` com teto de 100000, caractere de controle no texto e cursor com data impossível passaram de 500 a 400, sinopse sem HTML escapado nem caractere de controle, página do livro que abre mesmo se o pedido da sinopse falhar, banco indisponível como 503, corpo acima do limite como 413, token sem `exp` recusado, parâmetro fora do contrato com mensagem em pt-BR, Swagger de runtime com os tipos do contrato e teto por IP de 600 na página do livro. Fluxo assíncrono provado no broker de dev. **Web:** a marca do fim da lista pede a página seguinte se continuar visível; a falha de "Ver todas as resenhas" avisa; a aba Descobrir tocada de novo volta à aterrissagem; contagem e vazio numa região de status fixa; assuntos com skeleton e "Tentar de novo"; 400 como "não encontrado" e 429 com a mensagem do servidor; `h1` antes da ficha no DOM; campo com `maxlength` 200; spoiler sem o campo fica fechado e revelar leva o foco ao texto. **Mobile:** a falha da página seguinte não vira mais laço de pedidos (eram 10 em 4 s); lista curta por agrupamento carrega as páginas seguintes; página seguinte com o termo buscado; ação de toque para leitor de tela em chip, "N edições" e linha de edição; seção de resenhas sem `liveRegion`; falha do "Ver todas", 400 e 429 como na web; movimento reduzido no spoiler; spoiler sem o campo fica fechado. Pendências novas acima.

### Implementação 26/09/2026, fatia 2 (página do livro): `GET /livros/{id}` com a sinopse pedida na primeira abertura (UPDATE condicional e outbox na mesma transação, `lock_timeout` de 1 s) e as regras de reenfileiramento; `GET /livros/{id}/resenhas` com RN-08 no SQL e cursor keyset com microssegundos; consumidor `acervo.sinopse` com OpenLibrary (obra, edição, ISBN) e Google Books, texto puro de até 4.000 caracteres; `@RateLimit` com escopo; página do livro no mobile e na web, com polling limitado da sinopse e o spoiler fora da árvore até revelar. Contrato marcado como implementado e conferido com o `/docs` em runtime. Decisões e divergências consolidadas acima.

### Implementação 26/09/2026, fatia 1 (busca): contrato com `GET /assuntos` e `editora`, `anoPublicacao` e `autores` anuláveis; migration `0004` de busca, aplicada no dev; `GET /assuntos` e `GET /livros` no `acervo`, por trecho, sem acento, nos quatro campos e por ISBN exato, com as edições de uma obra contíguas; Descobrir no mobile e na web com o protótipo como fonte visual; seed com editora e assunto. Conferido com os dados do dev: `guimaraes rossa` volta vazio e as buscas responderam entre 34 e 225 ms a partir do acervo local. Decisões e divergências desta fatia estão em [`plano-F-ACV-BUSCA.md`](plano-F-ACV-BUSCA.md) e entram consolidadas aqui na fatia 3.

### Revisão 17/09/2026: contrato alinhado ao OpenAPI (`q`, `assunto`, `page`, `limit`, cursor e formas de resposta), ao schema/catálogo de `livro.pagina_aberta.v1` e às VIEWs cross-schema implantadas. O status passou a distinguir baseline físico do DER no Neon de implementação funcional; P0-MSG foi registrado como bloqueio explícito, com idempotência e testes separados entre domínio e infraestrutura genérica.

### Revisão 01/09/2026: distribuição das notas do livro alocada a F-ACV-NOTA e vinculada ao contrato da página do livro.

### Revisão 01/09/2026: `busca.md` renomeado para `descobrir.md` e reescrito como **raiz de aba**. O header perdeu o `ArrowLeft`, ganhou o título `Descobrir` com o sino e desceu o campo de busca para uma segunda linha; o item ativo do shell passou de `Estante` para `Descobrir` em todos os artboards, inclusive no modo escuro. Corrigida também a afirmação de que "descoberta aberta é F-ACV-DESCOBERTA": aquela feature entrega filtros avançados e páginas de autor, editora e série, não uma home de descoberta curada. Em `pagina-do-livro.md`, o item ativo virou a **aba de origem**, com os artboards em `Descobrir`.

### Revisão 28/08/2026: paginação e filtro de resenhas por RN-08 foram definidos com VIEWs versionadas; assunto acionável retornou ao Período 2. A sinopse ganhou estado terminal para ausência, resiliência completa, idempotência semântica e polling limitado no cliente; a distribuição de notas sem feature foi registrada.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-ACV-BUSCA no [periodo-1/README.md](README.md), de RF-ACV-01/02/04/18/19 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2, das RN-19/RN-21/RN-14 e da arquitetura §3.2/§4.2/§5.2. Sinopse fixada como fluxo assíncrono sob demanda; notas agregadas e descoberta avançada explicitamente adiadas ao Período 2.
