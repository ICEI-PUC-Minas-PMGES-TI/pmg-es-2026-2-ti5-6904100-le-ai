# F-EST — Estante e ciclo de leitura

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** a definir · **Serviços afetados:** `leitura` (backend) + web + mobile + job diário (agendador)

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.3 (RF-EST-01..08, 11, 12), RN-04, RN-05. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §4.2, §5.2, §2.4. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar o **coração do produto**: a estante do leitor e a **máquina de estados da leitura** — o "registrar leitura → acompanhar progresso" do ciclo de valor. Fecha os requisitos **Essenciais**:

- **RF-EST-01** representar a relação leitor↔livro em **Quero ler, Lendo, Lido, Relendo ou Abandonado** (transições de RN-04);
- **RF-EST-02** visualizar a estante **agrupada por status**, com ordenação e paginação;
- **RF-EST-03..07** **iniciar, finalizar, abandonar, iniciar releitura e retomar** leitura;
- **RF-EST-08** exibir o **número de vezes que o leitor concluiu** o livro;
- **RF-EST-11** **abandono automático** após 40 dias de inatividade (RN-05, RN-04);
- **RF-EST-12** **alertar** o leitor nos dias **20 e 30** de inatividade (RN-05).

A **máquina de estados (RN-04)** e a **regra de inatividade (RN-05)** são **prioridade obrigatória de teste** (RNF-TST-01, arquitetura §7). É sobre esta feature que [F-PRG](feature-F-PRG.md) (progresso), [F-AVA](feature-F-AVA.md) (nota/resenha) e [F-FEED](feature-F-FEED.md) (atividades) se apoiam.

RNF atendidos: **RNF-ARQ-05** (escrita concorrente sem perda — invariante "uma leitura em andamento por usuário+livro"), **RNF-ARQ-09** (agendador para o job diário — GitHub Actions `schedule`, P-08), **RNF-SEC-02** (propriedade da leitura no servidor), **RNF-SEC-07** (recusar iniciar leitura/favoritar de livro pessoal de outro), **RNF-DES-02** (estante paginada), **RNF-USA-04** (confirmação em abandono manual), **RNF-ARQ-06** (eventos de leitura/expiração via broker).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | tabelas `estante`/`leitura`; VIEW `v_estante_publica_v1`; job e publishers de inatividade |
| Backend | não iniciado | `leitura`: máquina de estados RN-04 + estante + job de inatividade |
| Web | não iniciado | estante por status + ações do ciclo de leitura |
| Mobile | não iniciado | mesmas telas + ações de estante |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Toda operação valida **propriedade** (SEC-02) e consulta `v_livro_referencia_v1` para verificar existência, tipo, dono e total de páginas sem ler tabelas cruas de `acervo`. O servidor recusa iniciar leitura de livro pessoal de outro (SEC-07, RN-15); favoritos pertencem a F-EST-2. Escritas aceitam `Idempotency-Key` conforme o [README do período](README.md#regras-de-implementação-compartilhadas).

**Estados e transições (RN-04) — implementados como máquina de estados explícita:**

| De | Evento | Para | Efeitos |
|---|---|---|---|
| — | Adicionar à estante sem iniciar | **Quero ler** | Cria vínculo de estante sem leitura |
| Quero ler | Remover da estante | — | Remove vínculo enquanto não há histórico de leitura |
| Quero ler / — | Iniciar leitura (nunca concluído) | **Lendo** | Cria leitura com data de início (RF-EST-03) |
| — | Iniciar releitura (já concluído) | **Relendo** | Nova leitura marcada como releitura (RF-EST-06) |
| Lendo / Relendo | Registrar progresso | mesmo | Atualiza página atual e **zera inatividade** (via [F-PRG](feature-F-PRG.md)) |
| Lendo / Relendo | Finalizar | **Lido** | Grava data de fim; **incrementa nº de vezes lido** (RF-EST-04, RF-EST-08) |
| Lendo | Abandono (manual/automático) | **Abandonado** | Grava página de parada; leitura **retomável** (RF-EST-05) |
| Relendo | Abandono (manual/automático) | **Lido** | Releitura salva como **incompleta**; **não** incrementa nº lido; **não** retomável |
| Abandonado | Retomar | **Lendo** | Continua da página registrada; publica "Voltou a ler" (RF-EST-07) |

**Invariantes (RN-04):** (1) no máximo **uma leitura em andamento** por usuário+livro (garantida por controle de concorrência — RNF-ARQ-05); (2) páginas de leituras abandonadas **contam** nas estatísticas; (3) releitura incompleta é histórico não retomável; (4) `nº de vezes lido` conta **só finalizadas**; (5) nota e resenha pertencem ao livro, sobrevivem a abandono e não duplicam por releitura ([F-AVA](feature-F-AVA.md)).

**Endpoints (nomes ilustrativos):**
- `POST /estante` (adicionar como **Quero ler**) valida no servidor que livro pessoal pertence ao usuário · `DELETE /estante/{livroId}` remove enquanto não há histórico, com confirmação explícita no cliente. Livro pessoal de terceiro é recusado também em Quero ler (RNF-SEC-07).
- `GET /estante?status=&page=` — estante **agrupada por status**, ordenada e paginada (RF-EST-02, RNF-DES-02).
- `GET /perfis/{usuarioId}/estante?status=&page=` — composição de RF-SOC-02. Combina `v_perfil_referencia_v1` e `v_seguimento_aceito_v1`: dono e perfil público podem ser consultados; perfil privado exige seguimento aceito (RN-08, SEC-03). O limite de página é imposto pelo servidor.
- `POST /leituras` (iniciar — data de início padrão hoje, editável — RF-EST-03) · `POST /leituras/{id}/finalizar` (data de fim padrão hoje, editável — RF-EST-04) · `POST /leituras/{id}/abandonar` (RF-EST-05, confirmação no cliente — RNF-USA-04) · `POST /leituras/{id}/retomar` (RF-EST-07) · `POST /releituras` (RF-EST-06).
- `GET /livros/{id}/conclusoes` — número de vezes concluído pelo leitor (RF-EST-08), exibido na página do livro.
- **Endpoint interno do job** (RF-EST-11/12) — autenticado como chamada de serviço/agendador, com segredo por ambiente (SEC-01/11), e não exposto ao cliente. RNF-SEC-04 não se aplica: ele trata moderação.

**Inatividade e abandono automático (RF-EST-11/12, RN-05)** — **job diário** agendado (GitHub Actions `schedule`, P-08; fallback cron-job.org): dispara chamada autenticada ao endpoint interno de `leitura`, que varre leituras em andamento por última atividade (ou início). Cada atividade incrementa atomicamente uma `inatividadeVersao`; as chaves determinísticas são `(leituraId, inatividadeVersao, risco, 20)`, `(leituraId, inatividadeVersao, risco, 30)` e `(leituraId, inatividadeVersao, expiração, 40)`.

- **Dia 20/30:** dentro da transação, registra o limiar como processado; após confirmar, publica `leitura.em_risco` para `social` criar a notificação.
- **Dia 40:** aplica e confirma primeiro a transição de abandono de RN-04 e registra o limiar; somente depois publica `leitura.expirada`, que representa fato concluído e gera notificação.
- Reexecução do job no mesmo ciclo não repete alerta ou transição; atividade inicia nova versão e permite novos alertas após outros 20/30 dias. Entrega duplicada do mesmo ciclo não duplica notificação. Eventos são gravados na outbox na mesma transação e falhas seguem retry/DLQ.
- Atividade é qualquer registro de progresso ou edição da leitura.

**Eventos produzidos** (§5.2, publicados **após** a escrita confirmada):
- `leitura.iniciada`, `leitura.retomada`, `leitura.finalizada` e `leitura.abandonada` para [F-FEED](feature-F-FEED.md). O payload versionado contém autor e snapshot mínimo de usuário/livro obtido de `v_perfil_referencia_v1` e `v_livro_referencia_v1`, além de leitura/livro, tipo e chave do fato. O critério de F-EST termina na publicação; criar a atividade é critério de F-FEED.
- `livro.adicionado_a_estante` → o consumidor de cache pertence a **F-ACV-NOTA** (Período 2, RF-ACV-17). F-ACV-NOTA deve fazer backfill dos livros já presentes em estantes antes de consumir eventos novos; o Período 1 não presume retenção histórica no broker.
- `leitura.em_risco` / `leitura.expirada` (do job) → consumidos por [F-NOT](feature-F-NOT.md).
- `leitura.finalizada` também alimenta desafios e estatísticas no próprio serviço `leitura`.

**VIEW exposta por `leitura`** (arquitetura §4.2): `v_estante_publica_v1` (usuário, livro, status, nº de conclusões), com nome distinto da tabela `estante`. F-ACV-NOTA usa a VIEW para backfill dos livros que já entraram em estantes antes do cache, e a recomendação a usa futuramente. A composição do perfil usa o endpoint autorizado de `leitura`, não a VIEW diretamente.

**Modelo de dados** (schema `leitura`): `estante` (usuário, livro, status, nº conclusões), `leitura` (usuário, livro, início, fim, página de parada, flag releitura, flag incompleta, última atividade, versão de inatividade) e controle dos limiares processados por ciclo. Favorito entra somente em F-EST-2.

### Frontend Web (`code/front`)

- **Estante agrupada por status** com ordenação/paginação; ações de iniciar/finalizar/abandonar/reler/retomar com datas editáveis; contagem de conclusões na página do livro. **Confirmação** ao abandonar e ao remover Quero ler (RNF-USA-04). Só tokens de [P0-DS](../periodo-0/feature-P0-DS.md) (status pill, card de livro).
- A composição de perfil usa o endpoint público autorizado; o cliente HTTP central aplica timeout e backoff somente a operações idempotentes e preserva `Idempotency-Key` em reenvio.
- RF-EST-11/12 são de sistema (Web —); o cliente apenas **exibe** o efeito (status Abandonado) e recebe a notificação por [F-NOT](feature-F-NOT.md).

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); alvo de demonstração Android. É no mobile que a notificação de leitura em risco ganha a ação de abandonar ([F-NOT](feature-F-NOT.md), RF-NOT-04).

## Critérios de aceite

- [ ] Todas as transições de **RN-04** funcionam com os efeitos corretos (nº de vezes lido só em finalização; releitura abandonada vira Lido incompleto **não retomável**; abandono de 1ª leitura é retomável).
- [ ] **Uma única leitura em andamento** por usuário+livro é garantida sob concorrência (RNF-ARQ-05).
- [ ] Estante agrupada por status, ordenada e **paginada** (RNF-DES-02).
- [ ] Contagem de conclusões correta na página do livro (RF-EST-08).
- [ ] O **job diário** publica `leitura.em_risco` nos dias 20 e 30 e **abandona + `leitura.expirada`** no dia 40 (RN-05); atividade zera o contador de inatividade.
- [ ] O job usa chave semântica por ciclo: reexecução não repete alerta ou abandono, mas atividade seguida de nova inatividade permite novos alertas; consumidores testam duplicação/DLQ em suas próprias features.
- [ ] Servidor recusa **adicionar à estante e iniciar leitura** de livro pessoal de outro (SEC-07); favoritos serão testados em F-EST-2; operações validam propriedade (SEC-02).
- [ ] Eventos de atividade e `livro.adicionado_a_estante` são publicados após a escrita, conforme schemas versionados; efeitos do feed/cache pertencem às features consumidoras.
- [ ] `v_estante_publica_v1` e o endpoint de perfil são consumíveis sob RN-08, sem colisão com a tabela `estante`.
- [ ] Repetir escrita com a mesma `Idempotency-Key` não repete vínculo, leitura ou transição (RNF-ERR-04).
- [ ] Remover livro em Quero ler e abandonar leitura exigem confirmação nos clientes (RNF-USA-04).
- [ ] Seed reproduzível cobre Quero ler, Lendo, Lido, Relendo, Abandonado e releitura incompleta (RNF-TST-08).
- [ ] Ciclo completo (Quero ler → Lendo → Lido, releitura, abandono/retomada) funciona **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, web, mobile, workflow do job) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container, **com prioridade para RN-04/RN-05**: cada transição, concorrência, propriedade, estante privada/pública, idempotência, job dos dias 20/30/40 e novo ciclo após atividade (RNF-TST-01 e RNF-TST-02)
- [ ] Testes assíncronos de F-EST cobrem outbox, schema/publicação, reexecução sem segundo fato; consumo/DLQ ficam em F-NOT, F-FEED, F-DSF e F-STA (RNF-TST-03)
- [ ] Testes web/mobile cobrem máquina de estados na camada de estado, autorização de perfil e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com estante/leituras, endpoint interno e `v_estante_publica_v1`
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** validar o **agendador** (GitHub Actions `schedule` no repo do GitHub Classroom, ou fallback cron-job.org) — a viabilidade é uma pendência aberta de [P0-MSG](../periodo-0/feature-P0-MSG.md) (P-08); o job de inatividade é o **primeiro consumidor real** dele.

## Pendências

- **Depende de** [F-ACV-BUSCA](feature-F-ACV-BUSCA.md)/[F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md) (livros para colocar na estante), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md) (broker + agendador P-08).
- **Compartilha `leitura` com [F-PRG](feature-F-PRG.md) e [F-AVA](feature-F-AVA.md)** — quem chegar primeiro fixa a estrutura de `leitura`; sinalizar no grupo (plano §6). O "registrar progresso" que zera a inatividade é de F-PRG.
- **Favoritos (RF-EST-09) e histórico por ano (RF-EST-10)** ficam **fora** — são **F-EST-2** (Período 2).
- Viabilidade do `schedule` no GitHub Classroom **não confirmada** (P-08) — se restrita, cron-job.org sem mudar o desenho.
- Stack de `leitura` ainda pendente (recomendação: mesma de `acervo` — P0-INFRA).

- **Prompts de tela em [`docs/design/periodo-1/F-EST/`](../../design/periodo-1/F-EST/):** `estante.md` e `acoes-de-leitura.md`. **RF-EST-08 (número de conclusões) e o status na estante não têm prompt próprio:** eles são elementos que esta feature acrescenta a [`F-ACV-BUSCA/pagina-do-livro.md`](../../design/periodo-1/F-ACV-BUSCA/pagina-do-livro.md), conforme a regra de recorte do [`docs/design/AGENTS.md`](../../design/AGENTS.md) §2, que manda o prompt morar junto da tela e não junto da feature que pediu o dado. Alteração no desenho da página do livro precisa ser combinada com o dono de F-ACV-BUSCA.
- **A copy das duas confirmações de abandono carrega uma regra de negócio, não uma variação de texto.** Abandonar primeira leitura deixa a leitura retomável; abandonar releitura salva como incompleta, volta a Lido, não incrementa conclusões e não é retomável (RN-04). Os dois textos estão fixados na seção 8 de `acoes-de-leitura.md` e não podem ser unificados na implementação.
- **Busca dentro da estante virou RF-EST-13, e é Desejável: sai do Período 1.** RF-EST-01..12 não previa busca textual na estante, e a lupa do `documento-de-design.md` §5.1 não tinha escopo declarado. A alteração foi aprovada e incorporada em 01/09/2026 (`REQUISITOS.md` v1.2, `documento-de-design.md` §5.1 e §5.7). Como ficou **Desejável**, ela pertence a [F-EST-2](../periodo-2/feature-F-EST-2.md) no Período 2, não a esta feature. **Consequência para o Período 1: o header da estante sai sem lupa**, só com o sino. O desenho já existe em [`estante.md`](../../design/periodo-1/F-EST/estante.md) (modo de busca do header e artboards 4.9, 4.10 e 5.5), marcado ali como escopo do Período 2, pela regra de recorte do [`docs/design/AGENTS.md`](../../design/AGENTS.md) §2 que mantém o prompt junto da tela.
- **A porta do acervo saiu desta tela.** A lupa ia para a busca do acervo; quem implementar F-EST não deve ligá-la a `GET /livros` do serviço `acervo`. A porta do acervo é a aba `Descobrir` ([`descobrir.md`](../../design/periodo-1/F-ACV-BUSCA/descobrir.md)), e os CTAs `Buscar livros` dos estados vazios navegam para lá.
- **Componentes que nascem no protótipo e ainda não estão na fonte:** a **contagem dentro do pill de filtro** e o **controle de ordenação** (`estante.md`, RF-EST-02 exige ordenação e o design §5.1 não desenha o controle), e a **lista de ações do sheet** com ação neutra, principal e destrutiva (`acoes-de-leitura.md`; o §5.4 desenha o sheet de progresso, que é formulário, não menu de transições). Incorporar ao `documento-de-design.md` pelo controle de mudança do plano §3.

## Timeline

### Revisão 01/09/2026: eventos `leitura.*` aprovados; `leitura.finalizada` passou a alimentar feed, desafios e estatísticas pela outbox transacional.

### Revisão 01/09/2026: a busca do acervo saiu desta tela para a nova aba `Descobrir` ([P0-NAV](../periodo-0/feature-P0-NAV.md)). O gatilho foi a ambiguidade do campo de 320px no header web de `Minha estante`, que devolvia o catálogo inteiro. A busca **dentro** da estante virou **RF-EST-13** (`REQUISITOS.md` v1.2), classificada como Desejável e alocada em [F-EST-2](../periodo-2/feature-F-EST-2.md): no Período 1 o header da estante fica **sem lupa**. `estante.md` ganhou o modo de busca do header e três artboards novos (4.9, 4.10 e 5.5), todos marcados como escopo do Período 2.

### Revisão 28/08/2026: contratos com acervo/identidade, endpoint autorizado de estante pública, idempotência e testes foram definidos. O job passou a publicar fatos determinísticos por ciclo de inatividade para `social`; a divergência do consumidor adicional `leitura` ficou pendente para correção da matriz. Favoritos e cache permaneceram nas features futuras corretas.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-EST no [periodo-1/README.md](README.md), de RF-EST-01..08/11/12 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.3, das RN-04/RN-05 e da arquitetura §3.1/§4.2/§5.2/§2.4. Máquina de estados e job de inatividade fixados como prioridade de teste; favoritos e histórico adiados ao Período 2.
