# F-ACV-NOTA — Nota geral e cache de capas

**Período:** 2 · **Prioridade:** desejavel
**Dono:** a definir · **Serviços afetados:** `acervo` (backend + projeção/cache) + web

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
| Infra | não iniciado | projeção `nota dos leitores`; cache de capas no Cloudinary; colunas de nota geral no `Livro` |
| Backend | não iniciado | `acervo`: consumidores de `nota.alterada` e `livro.adicionado_a_estante` + import de nota geral |
| Web | não iniciado | página do livro com os dois indicadores distintos e rotulados |
| Mobile | não iniciado | página do livro com os mesmos indicadores distintos e rotulados |

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
- **Import da nota geral (RF-ACV-15, RN-06):** importar da fonte externa a **nota geral** e a **quantidade de avaliações** que a originou, persistindo ambas no `Livro` oficial. Fonte primária **OpenLibrary** (`ol_dump_ratings` — cobertura medida em §10.1: 100% na amostra popular em pt, mediana 213 avaliações), Google Books (`averageRating`/`ratingsCount`) como alternativa esparsa. Executado como **etapa em lote alinhada à ingestão** ([F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md)), chaveada por `ol_edition_key`/obra. A nota geral é **somente leitura** (não recalculada pelo app, não afetada por avaliações de usuários — RN-06.4) e **só muda em recarga do dump ou reimportação** (RN-06.6). Escala fora de 0–5 é **convertida** na importação (RN-12); dado externo é **validado/normalizado antes de persistir** (SEC-33); **ausência é registrada como ausente, nunca como zero** (RN-06.3).

**Exibição (RF-ACV-16, RN-06):** a página do livro passa a mostrar **nota geral** (externa) e **nota dos leitores** (média do app) como **indicadores distintos e rotulados, nunca combinados** em um único número. Regras de RN-06: um livro pode ter um sem o outro; indicador ausente é exibido como ausente (não zero); **livro pessoal não tem nenhum dos dois** — só a nota individual do dono (RN-03/RN-06.5).

**Eventos consumidos:** `nota.alterada`, `livro.adicionado_a_estante`. **VIEWs consumidas** (para backfill): `v_nota_publicacao_v1` (de [F-AVA](../periodo-1/feature-F-AVA.md)) e `v_estante_publica_v1` (de [F-EST](../periodo-1/feature-F-EST.md)).

**Modelo de dados** (schema `acervo`): `Livro` ganha nota geral + quantidade de avaliações e URL da cópia própria; `nota_leitor_projecao` (usuário, livro, valor, única por par) sustenta `nota_livro_agregada` (média + contagem). Tudo permanece no próprio schema.

### Frontend Web (`code/front`)

- **Página do livro** exibe os **dois indicadores** com rótulos claros ("Nota geral" × "Nota dos leitores"), cada um mostrado apenas quando existe, ausência sem placeholder de zero. Usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md) (componente de estrelas/indicador). A resolução de capa passa a exibir a **cópia própria** quando disponível.

### App / sistema

- RF-ACV-15 e RF-ACV-17 são de sistema. A página Flutter de [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) recebe os mesmos dois indicadores, rótulos e estados ausentes da web.

## Critérios de aceite

- [ ] A projeção faz backfill e converge por usuário+livro ao estado atual da VIEW em upsert/delete, inclusive sob duplicação ou entrega fora de ordem.
- [ ] O **cache de capas** consome `livro.adicionado_a_estante`, baixa a capa **uma única vez por livro** (idempotente, RN-14.3), valida a imagem (SEC-20), grava a cópia própria e faz **backfill** de `v_estante_publica_v1`; falha não é erro de usuário (RN-14.5); sem TTL (RN-14.6); livro pessoal não entra (RN-14.7).
- [ ] A **resolução de capa** passa a usar cópia própria → externa → placeholder (RN-14.4) via `v_livro_referencia_v1`.
- [ ] A **nota geral** é importada com a quantidade de avaliações, **somente leitura**, ausência como ausente (RN-06.3), escala convertida (RN-12), dado externo validado (SEC-33).
- [ ] A página exibe **nota geral** e **nota dos leitores** como indicadores **distintos e rotulados**, nunca combinados (RF-ACV-16, RN-06); livro pessoal não exibe nenhum dos dois.
- [ ] Projeção, cache e import funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `acervo` + consumidores + import, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: criação/edição/exclusão e evento fora de ordem na projeção individual/agregada, cache único, backfills, import/normalização e indicadores ausentes (RNF-TST-02)
- [ ] Testes assíncronos: consumo de `nota.alterada` e `livro.adicionado_a_estante` com entrega duplicada, backfill precedendo o incremento, falha de download reprocessável e DLQ (RNF-TST-03)
- [ ] Testes web/mobile cobrem indicadores distintos, ausência sem zero e cold start (RNF-TST-04, RNF-TST-05 e RNF-TST-06)
- [ ] **Spec OpenAPI de `acervo` atualizado em `docs/api/acervo.yaml`** com os campos de nota na página do livro; `v_livro_referencia_v1` reflete a capa resolvida
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** registrar em Timeline a **cobertura real de nota geral** na base carregada e o **dimensionamento do cache de capas** (RN-14 estima 15–30 MB; §10.6), validando as premissas de armazenamento.

## Pendências

- **Depende de** [F-AVA](../periodo-1/feature-F-AVA.md) (`nota.alterada`, `v_nota_publicacao_v1`), [F-EST](../periodo-1/feature-F-EST.md) (`livro.adicionado_a_estante`, `v_estante_publica_v1`), [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) (página do livro e resolução de capa), [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md) (chaves de dedup para o import; `v_livro_referencia_v1`), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md) (broker; Cloudinary/P-09 para o cache).
- **Divergência de baseline — distribuição de notas do livro:** RF-ACV-04 a exibe "quando a funcionalidade correspondente existir", mas ela **não tem feature alocada** (registrado em [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md)). Esta feature é o candidato natural, mas a distribuição **não está** entre seus RFs (15/16/17) e **não deve ser confundida** com F-STA-OPC (distribuição das notas que o **leitor** deu). Alocar pelo grupo antes de implementar; não implementar em silêncio.
- **Fonte da nota geral:** confirmar o formato do `ol_dump_ratings` e a chave de junção com os livros carregados; a alternativa Google Books tem cobertura desconhecida (§10.1). Não bloqueia a projeção/cache.
- Stack de `acervo` ainda pendente (P0-INFRA).

## Timeline

### Criação 28/08/2026: arquivo criado a partir do escopo de F-ACV-NOTA no [periodo-2/README.md](README.md), de RF-ACV-15/16/17 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2 e das RN-06/RN-14/§10.1. Projeção e cache ligados aos fluxos fechados `nota.alterada`/`livro.adicionado_a_estante` com backfill obrigatório pelas VIEWs de F-AVA/F-EST; a distribuição de notas sem feature foi registrada como pendência de baseline, sem alocação autônoma.

### Revisão 28/08/2026: precisão de redação — a resolução de capa por [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) é leitura **intra-serviço** em `acervo`, não consumo cross-schema; `v_livro_referencia_v1` é o contrato para os consumidores **externos** (snapshots de feed em `social`). Frase da resolução de capa reescrita para distinguir os dois casos.

### Revisão 29/08/2026: projeção individual por usuário+livro passou a sustentar média/contagem e a consultar o estado atual da VIEW, cobrindo edição, exclusão e ordem de entrega sem ampliar o evento. Mobile foi incluído por compartilhar a página de livro de RF-ACV-16.
