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

- [ ] A projeção faz backfill e converge por usuário+livro ao estado atual da VIEW em upsert/delete, inclusive sob duplicação ou entrega fora de ordem.
- [ ] O **cache de capas** consome `livro.adicionado_a_estante`, baixa a capa **uma única vez por livro** (idempotente, RN-14.3), valida a imagem (SEC-20), grava a cópia própria e faz **backfill** de `v_estante_publica_v1`; falha não é erro de usuário (RN-14.5); sem TTL (RN-14.6); livro pessoal não entra (RN-14.7).
- [ ] A **resolução de capa** passa a usar cópia própria → externa → placeholder (RN-14.4) via `v_livro_referencia_v1`.
- [ ] A **nota geral** é importada com a quantidade de avaliações, **somente leitura**, ausência como ausente (RN-06.3), escala convertida (RN-12), dado externo validado (SEC-33).
- [ ] A página exibe **nota geral** e **nota dos leitores** como indicadores **distintos e rotulados**, nunca combinados (RF-ACV-16, RN-06); livro pessoal não exibe nenhum dos dois.
- [ ] Livro oficial com avaliações dos leitores exibe distribuição por valor; ausência retorna distribuição vazia, sem tabela adicional (RF-ACV-04).
- [ ] Projeção, cache e import funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `acervo` + consumidores + import, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: criação/edição/exclusão e evento fora de ordem na projeção individual/agregada, cache único, backfills, import/normalização e indicadores ausentes (RNF-TST-02)
- [ ] Testes assíncronos: consumo de `nota.alterada` e `livro.adicionado_a_estante` com entrega duplicada, backfill precedendo o incremento, falha de download reprocessável e DLQ (RNF-TST-03)
- [ ] Testes web/mobile cobrem indicadores distintos, distribuição, ausência sem zero e cold start (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `acervo` atualizado em `docs/api/acervo.yaml`** com indicadores e distribuição na página do livro; `v_livro_referencia_v1` reflete a capa resolvida
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** registrar em Timeline a **cobertura real de nota geral** na base carregada e o **dimensionamento do cache de capas** (RN-14 estima 15–30 MB; §10.6), validando as premissas de armazenamento.

## Pendências

- **Aviso de [F-ACV-DESCOBERTA](feature-F-ACV-DESCOBERTA.md) (Vicenzo, 02/10/2026):** `GET /livros/{id}` (`LivroOficialDetalhe`) ganhou dois campos obrigatórios, só como acréscimo e sem mudar os existentes:
  - `editoraId: uuid | null`;
  - `serie: { id, nome, numero | null } | null`.

  Eles servem aos links da ficha para as páginas de editora e série. Os campos de nota desta feature entram no mesmo DTO (`src/livros/busca/dto/livro-oficial.dto.ts`) e no mesmo `obter()` de `livro-oficial.repository.ts`, que agora faz `LEFT JOIN acervo.serie`. O teste de forma exata em `test/integracao/livro-oficial.int-spec.ts` já inclui os dois campos. O contrato está no `docs/api/acervo.yaml`, e o código está na branch `vicenzo-features` até o merge em `desenvolvimento`.
- **Telas (design P2):** nota geral × nota dos leitores (§4.4) e histograma entram na edição consolidada [`pagina-do-livro.md`](../../design/periodo-2/pagina-do-livro/pagina-do-livro.md) ([protótipo](../../design/periodo-2/pagina-do-livro/prototipos/pagina-do-livro.html)), prompt escrito em 28/09/2026, protótipo exportado em 29/09/2026. Anatomia do histograma (11 faixas de 0 a 5 com meia estrela, faixa vazia como `nenhum`) nasce no prompt e aguarda incorporação ao design.
- **Depende de** [F-AVA](../periodo-1/feature-F-AVA.md) (`nota.alterada`, `v_nota_publicacao_v1`), [F-EST](../periodo-1/feature-F-EST.md) (`livro.adicionado_a_estante`, `v_estante_publica_v1`), [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) (página do livro e resolução de capa), [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md) (chaves de dedup para o import; `v_livro_referencia_v1`), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md) (broker; Cloudinary/P-09 para o cache).
- **Fonte da nota geral:** confirmar o formato concreto do `ol_dump_ratings`; a semântica por obra já está decidida e usa `ol_work_key`.
- **Alternativa a avaliar, sem mudar o desenho atual:** manter somente a projeção individual e calcular média/contagem por VIEW SQL antes de materializar `nota_livro_agregada`.
- Stack de `acervo` definida: **NestJS (TypeScript)** (arquitetura §2.1).

## Timeline

### Revisão 01/09/2026: ratings por obra passaram a ser replicados nas edições via `ol_work_key`; distribuição de notas do livro alocada nesta feature sem tabela nova; mobile corrigido no escopo.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-ACV-NOTA no [periodo-2/README.md](README.md), de RF-ACV-15/16/17 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2 e das RN-06/RN-14/§10.1. Projeção e cache ligados aos fluxos fechados `nota.alterada`/`livro.adicionado_a_estante` com backfill obrigatório pelas VIEWs de F-AVA/F-EST; a distribuição de notas sem feature foi registrada como pendência de baseline, sem alocação autônoma.

### Revisão 28/08/2026: precisão de redação — a resolução de capa por [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) é leitura **intra-serviço** em `acervo`, não consumo cross-schema; `v_livro_referencia_v1` é o contrato para os consumidores **externos** (snapshots de feed em `social`). Frase da resolução de capa reescrita para distinguir os dois casos.

### Revisão 29/08/2026: projeção individual por usuário+livro passou a sustentar média/contagem e a consultar o estado atual da VIEW, cobrindo edição, exclusão e ordem de entrega sem ampliar o evento. Mobile foi incluído por compartilhar a página de livro de RF-ACV-16.

### Dono 29/09/2026: feature atribuída a **Renato Douglas** na [divisão do Período 2](README.md#divisão-do-período-2-entre-5-pessoas).
