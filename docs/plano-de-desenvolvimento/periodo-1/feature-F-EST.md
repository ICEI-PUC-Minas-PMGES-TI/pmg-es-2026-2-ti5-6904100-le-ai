# F-EST — Estante e ciclo de leitura

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** Ana Luiza de Freitas · **Serviços afetados:** `leitura` (backend) + web + mobile + job diário (agendador)

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
| Dados | concluído (baseline DER) | tabelas `estante`, `leitura`, `limiar_inatividade`, `idempotencia_leitura` e `outbox_leitura`, constraints/índices e VIEW `v_estante_publica_v1` versionados e aplicados no Neon em 16/09/2026; isso não implementa o domínio |
| Infra | não iniciado | workflow do job, conexão/dispatcher AMQP, retry/DLQ e prova do agendador dependem de P0-MSG |
| Backend | em andamento | `leitura`: estante (adicionar/remover/listar/perfil), máquina de estados RN-04 (iniciar, releitura, finalizar, abandonar, retomar, conclusões), job de inatividade com outbox, idempotência HTTP e seed RNF-TST-08 implementados com testes de integração; falta validar em DES |
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
| Quero ler | Iniciar leitura | **Lendo** | Cria leitura com data de início (RF-EST-03) |
| — | Iniciar leitura (livro nunca concluído) | **Lendo** | Cria estante e leitura com data de início (RF-EST-03) |
| — | Iniciar releitura (já concluído) | **Relendo** | Nova leitura marcada como releitura (RF-EST-06) |
| Lendo / Relendo | Registrar progresso | mesmo | Atualiza página atual e **zera inatividade** (via [F-PRG](feature-F-PRG.md)) |
| Lendo / Relendo | Finalizar | **Lido** | Grava data de fim; **incrementa nº de vezes lido** (RF-EST-04, RF-EST-08) |
| Lendo | Abandono (manual/automático) | **Abandonado** | Grava página de parada; leitura **retomável** (RF-EST-05) |
| Relendo | Abandono (manual/automático) | **Lido** | Releitura salva como **incompleta**; **não** incrementa nº lido; **não** retomável |
| Abandonado | Retomar | **Lendo** | Continua da página registrada; publica "Voltou a ler" (RF-EST-07) |

**Invariantes (RN-04):** (1) no máximo **uma leitura em andamento** por usuário+livro (garantida por controle de concorrência — RNF-ARQ-05); (2) páginas de leituras abandonadas **contam** nas estatísticas; (3) releitura incompleta é histórico não retomável; (4) `nº de vezes lido` conta **só finalizadas**; (5) nota e resenha pertencem ao livro, sobrevivem a abandono e não duplicam por releitura ([F-AVA](feature-F-AVA.md)). No modelo físico, `estante.status` representa os cinco estados visíveis, enquanto cada ocorrência em `leitura.status` usa `lendo`, `lido` ou `abandonado`; `releitura=true` distingue **Relendo** e `releitura=true` + `incompleta=true` representa a releitura abandonada. Toda transição atualiza ocorrência e estante atomicamente.

**Contrato HTTP fechado em [`docs/api/leitura.yaml`](../../api/leitura.yaml):**
- `POST /estante` recebe `{ livroId }`; `DELETE /estante/{livroId}` remove somente **Quero ler** sem histórico. Ambos exigem `Idempotency-Key`; livro pessoal de terceiro é recusado também em Quero ler e a confirmação da remoção é do cliente.
- `GET /estante?status=&ordenacao=&page=&limite=` lista a estante autenticada; `GET /perfis/{usuarioId}/estante?status=&ordenacao=&page=&limite=` compõe RF-SOC-02. O servidor limita `limite` a 50 e, no endpoint de perfil, combina `v_perfil_referencia_v1` e `v_seguimento_aceito_v1`: dono e perfil público podem consultar; perfil privado exige seguimento aceito; conta suspensa ou em exclusão pendente não é exposta (RN-08, SEC-03).
- `POST /leituras` e `POST /releituras` recebem `{ livroId, dataInicio? }`; `POST /leituras/{leituraId}/finalizar` recebe `{ dataFim?, fusoHorarioDispositivo }`; `POST /leituras/{leituraId}/abandonar` e `POST /leituras/{leituraId}/retomar` não recebem corpo. Todas exigem `Idempotency-Key`; `GET /leituras/{leituraId}` detalha somente leitura própria.
- `GET /livros/{livroId}/conclusoes` retorna `{ livroId, vezesLido }` do leitor autenticado.
- `POST /internal/jobs/inatividade` é exclusivo do agendador, autenticado por `X-Scheduler-Token`, exige `Idempotency-Key` e aceita opcionalmente `{ dataReferencia }` somente para execução controlada/testes. Não é exposto aos clientes; RNF-SEC-04 não se aplica porque trata moderação.

Em toda escrita, a chave HTTP é UUID opaco com escopo `(ator autenticado, método, caminho canônico)`: mesma chave e mesmo payload reproduzem status/corpo sem repetir efeito; payload diferente retorna `409`. A tabela `idempotencia_leitura` já existe, mas o comportamento ainda é backend não iniciado.

**Inatividade e abandono automático (RF-EST-11/12, RN-05)** — **job diário** agendado (GitHub Actions `schedule`, P-08; fallback cron-job.org): chama `POST /internal/jobs/inatividade` e varre ocorrências em andamento por `ultima_atividade_em` (ou data de início quando ainda não houve atividade). Cada atividade incrementa atomicamente `inatividade_versao`; `limiar_inatividade` impõe unicidade a `(leitura_id, inatividade_versao, limiar_dias)`, com `tipo=risco` nos dias 20/30 e `tipo=expiracao` no dia 40.

- **Dia 20/30:** dentro da transação, registra o limiar como processado; após confirmar, publica `leitura.em_risco` para `social` criar a notificação.
- **Dia 40:** aplica e confirma primeiro a transição de abandono de RN-04 e registra o limiar; somente depois publica `leitura.expirada`, que representa fato concluído e gera notificação.
- Reexecução do job no mesmo ciclo não repete alerta ou transição; atividade inicia nova versão e permite novos alertas após outros 20/30 dias. A `Idempotency-Key` deduplica a chamada HTTP, enquanto a unicidade do limiar deduplica semanticamente o lote mesmo sob chaves/chamadas diferentes. Eventos são gravados na outbox na mesma transação; transporte, retry e DLQ dependem de P0-MSG.
- Atividade é qualquer registro de progresso ou edição da leitura. F-EST é dona das edições/transições; F-PRG é dona de registrar/editar/excluir progresso e deve atualizar `ultima_atividade_em`/`inatividade_versao` atomicamente quando a operação contar como atividade.

**Eventos produzidos** (§5.2 e contratos canônicos em [`docs/mensageria`](../../mensageria/README.md)): alteração de domínio e linha de `outbox_leitura` são atômicas; o dispatcher de P0-MSG monta o envelope e publica depois da confirmação síncrona. `eventId` deduplica a mesma entrega no consumidor; `businessKey` identifica o fato, mas não tem unicidade genérica. F-EST impede fatos semanticamente repetidos; cada feature consumidora grava efeito e recibo `(consumidor, eventId)` na mesma transação e é dona de deduplicação semântica adicional e DLQ.

| Evento | `businessKey` exata | `data` v1 |
|---|---|---|
| `leitura.iniciada` | `leitura:<leituraId>:iniciada` | `usuarioId`, `leituraId`, `livroId`, `releitura`, `usuario`, `livro` |
| `leitura.retomada` | `leitura:<leituraId>:retomada:<eventId>` | `usuarioId`, `leituraId`, `livroId`, `paginaRetomada`, `usuario`, `livro` |
| `leitura.finalizada` | `leitura:<leituraId>:finalizada` | `usuarioId`, `leituraId`, `livroId`, `releitura`, `dataFim`, `finalizadaEm`, `finalizacaoFusoHorario`, `finalizacaoDataLocal`, `usuario`, `livro` |
| `leitura.abandonada` | `leitura:<leituraId>:abandonada:<eventId>` | `usuarioId`, `leituraId`, `livroId`, `releitura`, `incompleta`, `paginaParada`, `usuario`, `livro` |
| `livro.adicionado_a_estante` | `estante:<usuarioId>:<livroId>` | `usuarioId`, `livroId` |
| `leitura.em_risco` | `leitura:<leituraId>:inatividade:<versao>:<limiar>` | `destinatarioId`, `leituraId`, `inatividadeVersao`, `limiarDias` (20 ou 30), `livro` |
| `leitura.expirada` | `leitura:<leituraId>:inatividade:<versao>:40` | `destinatarioId`, `leituraId`, `inatividadeVersao`, `limiarDias` (40), `livro` |

Os quatro eventos de atividade vão para [F-FEED](feature-F-FEED.md); abandono automático também produz o fato de abandono para o feed e `leitura.expirada` para a notificação. Os snapshots vêm de `v_perfil_referencia_v1` e `v_livro_referencia_v1`. `leitura.em_risco`/`leitura.expirada` vão para [F-NOT](feature-F-NOT.md). `livro.adicionado_a_estante` tem consumidor futuro: o backfill deve preceder a criação do binding, sem presumir retenção histórica. `leitura.finalizada` também alimenta consumidores futuros de desafios/estatísticas e usa os campos temporais da ação, independentes de `data_fim` editável.

**VIEW exposta por `leitura`** (arquitetura §4.2): `v_estante_publica_v1(usuario_id, livro_id, status, vezes_lido)`, já implantada e com nome distinto da tabela `estante`. Ela é contrato entre schemas para backfill/recomendação, não superfície autorizada ao cliente e não substitui RN-08. A composição do perfil usa o endpoint HTTP autorizado de `leitura`; nenhum serviço lê tabela crua de outro schema.

**Modelo de dados** (schema `leitura`, baseline já implantada): `estante` (unicidade usuário+livro), `leitura` (FK composta garante a mesma estante/usuário/livro; índice parcial garante uma ocorrência `lendo` por usuário+livro), `limiar_inatividade` (unicidade por leitura+versão+limiar), `idempotencia_leitura`, `outbox_leitura` e `v_estante_publica_v1`. Favorito entra somente em F-EST-2. A migration aplicada é baseline compartilhada com F-PRG/F-AVA; eventual ajuste exige nova migration revisada, nunca alteração das migrations `0001`/`0002`.

### Frontend Web (`code/front`)

- **Estante agrupada por status** com ordenação/paginação; ações de iniciar/finalizar/abandonar/reler/retomar com datas editáveis; contagem de conclusões na página do livro. **Confirmação** ao abandonar e ao remover Quero ler (RNF-USA-04). Só tokens de [P0-DS](../periodo-0/feature-P0-DS.md) (status pill, card de livro).
- A composição de perfil usa o endpoint público autorizado; o cliente HTTP central aplica timeout e backoff somente a operações idempotentes e preserva `Idempotency-Key` em reenvio.
- RF-EST-11/12 são de sistema (Web —); o cliente apenas **exibe** o efeito (status Abandonado) e recebe a notificação por [F-NOT](feature-F-NOT.md).

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); alvo de demonstração Android. É no mobile que a notificação de leitura em risco ganha a ação de abandonar ([F-NOT](feature-F-NOT.md), RF-NOT-04).

## Critérios de aceite

- [ ] Finalizar hoje com data de fim anterior conta no desafio de hoje; evento e backfill chegam à mesma janela pela data local persistida da ação, sem alterar a data editável do histórico.

- [ ] Todas as transições de **RN-04** funcionam com os efeitos corretos (nº de vezes lido só em finalização; releitura abandonada vira Lido incompleto **não retomável**; abandono de 1ª leitura é retomável).
- [ ] **Uma única leitura em andamento** por usuário+livro é garantida sob concorrência (RNF-ARQ-05).
- [ ] Estante agrupada por status, ordenada e **paginada** (RNF-DES-02).
- [ ] Contagem de conclusões correta na página do livro (RF-EST-08).
- [ ] O **job diário** publica `leitura.em_risco` nos dias 20 e 30 e **abandona + `leitura.expirada`** no dia 40 (RN-05); atividade zera o contador de inatividade.
- [ ] O job usa unicidade semântica `(leituraId, inatividadeVersao, limiarDias)`: reexecução não repete alerta ou abandono, mas atividade seguida de nova inatividade permite novo ciclo; F-EST testa que não cria segundo fato e consumidores testam recibo, duplicação semântica e DLQ nas próprias features.
- [ ] Servidor recusa **adicionar à estante e iniciar leitura** de livro pessoal de outro (SEC-07); favoritos serão testados em F-EST-2; operações validam propriedade (SEC-02).
- [ ] Eventos de atividade, inatividade e `livro.adicionado_a_estante` usam exatamente as business keys/payloads v1 do catálogo e são gravados na outbox junto da escrita; efeitos do feed/notificação/cache pertencem às features consumidoras.
- [ ] `v_estante_publica_v1` e o endpoint de perfil são consumíveis sob RN-08, sem colisão com a tabela `estante`.
- [ ] Repetir escrita com a mesma `Idempotency-Key` e payload reproduz status/corpo sem repetir vínculo, leitura ou transição; reutilizá-la com payload diferente retorna `409` (RNF-ERR-04).
- [ ] Remover livro em Quero ler e abandonar leitura exigem confirmação nos clientes (RNF-USA-04).
- [ ] Seed reproduzível cobre Quero ler, Lendo, Lido, Relendo, Abandonado e releitura incompleta (RNF-TST-08).
- [ ] Ciclo completo (Quero ler → Lendo → Lido, releitura, abandono/retomada) funciona **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, web, mobile, workflow do job) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com PostgreSQL real/container, **com prioridade para RN-04/RN-05/RN-08**: cada transição e efeito em ocorrência+estante, primeira leitura/releitura, concorrência, propriedade e livro pessoal, perfil público/privado/suspenso, idempotência HTTP, job dos dias 20/30/40, reexecução e novo ciclo após atividade (RNF-TST-01 e RNF-TST-02)
- [ ] Testes assíncronos de F-EST cobrem escrita+outbox atômicas, schemas/business keys, falha do broker sem desfazer escrita e reexecução sem segundo fato; recibo de consumo, duplicação semântica e DLQ ficam em F-NOT, F-FEED, F-DSF e F-STA (RNF-TST-03)
- [ ] Testes web/mobile cobrem máquina de estados na camada de estado, autorização de perfil e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com estante/leituras, endpoint interno e `v_estante_publica_v1`
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** validar o **agendador** (GitHub Actions `schedule` no repo do GitHub Classroom, ou fallback cron-job.org) — a viabilidade é uma pendência aberta de [P0-MSG](../periodo-0/feature-P0-MSG.md) (P-08); o job de inatividade é o **primeiro consumidor real** dele.

## Pendências

- **Depende de** [F-ACV-BUSCA](feature-F-ACV-BUSCA.md)/[F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md) (livros para colocar na estante), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md). P0-MSG ainda está com infra/backend não iniciados: F-EST pode implementar domínio+outbox sobre a baseline, mas não conclui publicação, retry/DLQ nem o job em DES antes do dispatcher/topologia e da prova P-08.
- **Compartilha `leitura` com [F-PRG](feature-F-PRG.md) e [F-AVA](feature-F-AVA.md)** — a baseline física já foi fixada no DER de 16/09; sinalizar no grupo antes de nova migration (plano §6). F-EST é dona de `estante`, transições e limiares; F-PRG é dona de `atualizacao_progresso` e, na mesma transação do progresso, atualiza `leitura.pagina_atual`, `ultima_atividade_em` e `inatividade_versao` conforme RN-05.
- **Favoritos (RF-EST-09) e histórico por ano (RF-EST-10)** ficam **fora** — são **F-EST-2** (Período 2).
- Viabilidade do `schedule` no GitHub Classroom **não confirmada** (P-08) — se restrita, cron-job.org sem mudar o desenho.
- ~~**Divergências contratuais preservadas:** `requestBody` de `POST /leituras/{leituraId}/finalizar` opcional e `v_estante_publica_v1` como `planned`.~~ Fechadas em 25/09/2026: o `requestBody` passou a `required: true` (o schema já exigia `fusoHorarioDispositivo` e a implementação responde 400 sem ele) e a VIEW já constava como `implemented`; as operações de F-EST passaram a `implemented`.
- ~~**Lacunas do contrato frente ao protótipo (`estante.md`), sem mudança de contrato nesta revisão:** `ItemEstante` não traz título, autor nem capa, que o card da estante exibe — o cliente teria de compor com `acervo`; a ordenação por autor e por progresso do protótipo não existe em `OrdenacaoEstante` (só `adicionado_*` e `titulo_*`); e a ordenação por título faz JOIN direto de `v_livro_referencia_v1` na consulta da listagem. Resolver pelo controle de mudança (acréscimo de campos em `ItemEstante` e de valores em `OrdenacaoEstante`) antes do web/mobile.~~ Fechadas em 26/09/2026 com aprovação da dona do produto: `ItemEstante` de `GET /estante` e `GET /perfis/{id}/estante` passou a trazer `livro { titulo, autor, capaUrl }` (capa só como URL, imagem servida por Cloudinary/OpenLibrary); `OrdenacaoEstante` ganhou `autor_asc/desc` (sem autor por último, empate pelo título) e `progresso_asc/desc` (percentual da leitura em andamento, sem leitura em andamento por último).
- **Decisão registrada (26/09/2026): a listagem da estante faz JOIN direto da VIEW de contrato `v_livro_referencia_v1` no repositório de `leitura`**, em vez de passar pela classe `ReferenciasExternas`. É permitido pela arquitetura §4.2 porque é VIEW de contrato, não tabela crua, e é necessário porque a ordenação paginada por título e por autor tem de acontecer no SQL.
- **Ainda em aberto:** web e mobile não iniciados; testes de integração ainda não executados; secrets do GitHub `LEITURA_URL`/`LEITURA_SCHEDULER_TOKEN` e env `SCHEDULER_TOKEN` a configurar, com a prova do agendador (P-08); deploy em DES.
- Stack de `leitura` definida: **NestJS** — mesma de `acervo` (arquitetura §2.1).

- **Prompts de tela em [`docs/design/periodo-1/F-EST/`](../../design/periodo-1/F-EST/):** `estante.md` e `acoes-de-leitura.md`. **RF-EST-08 (número de conclusões) e o status na estante não têm prompt próprio:** eles são elementos que esta feature acrescenta a [`F-ACV-BUSCA/pagina-do-livro.md`](../../design/periodo-1/F-ACV-BUSCA/pagina-do-livro.md), conforme a regra de recorte do [`docs/design/AGENTS.md`](../../design/AGENTS.md) §2, que manda o prompt morar junto da tela e não junto da feature que pediu o dado. Alteração no desenho da página do livro precisa ser combinada com o dono de F-ACV-BUSCA.
- **A copy das duas confirmações de abandono carrega uma regra de negócio, não uma variação de texto.** Abandonar primeira leitura deixa a leitura retomável; abandonar releitura salva como incompleta, volta a Lido, não incrementa conclusões e não é retomável (RN-04). Os dois textos estão fixados na seção 8 de `acoes-de-leitura.md` e não podem ser unificados na implementação.
- **Busca dentro da estante virou RF-EST-13, e é Desejável: sai do Período 1.** RF-EST-01..12 não previa busca textual na estante, e a lupa do `documento-de-design.md` §5.1 não tinha escopo declarado. A alteração foi aprovada e incorporada em 01/09/2026 (`REQUISITOS.md` v1.2, `documento-de-design.md` §5.1 e §5.7). Como ficou **Desejável**, ela pertence a [F-EST-2](../periodo-2/feature-F-EST-2.md) no Período 2, não a esta feature. **Consequência para o Período 1: o header da estante sai sem lupa**, só com o sino. O desenho já existe em [`estante.md`](../../design/periodo-1/F-EST/estante.md) (modo de busca do header e artboards 4.9, 4.10 e 5.5), marcado ali como escopo do Período 2, pela regra de recorte do [`docs/design/AGENTS.md`](../../design/AGENTS.md) §2 que mantém o prompt junto da tela.
- **A porta do acervo saiu desta tela.** A lupa ia para a busca do acervo; quem implementar F-EST não deve ligá-la a `GET /livros` do serviço `acervo`. A porta do acervo é a aba `Descobrir` ([`descobrir.md`](../../design/periodo-1/F-ACV-BUSCA/descobrir.md)), e os CTAs `Buscar livros` dos estados vazios navegam para lá.
- ~~**Componentes que nascem no protótipo e ainda não estão na fonte:** a **contagem dentro do pill de filtro** e o **controle de ordenação** (`estante.md`, RF-EST-02 exige ordenação e o design §5.1 não desenha o controle), e a **lista de ações do sheet** com ação neutra, principal e destrutiva (`acoes-de-leitura.md`; o §5.4 desenha o sheet de progresso, que é formulário, não menu de transições). Incorporar ao `documento-de-design.md` pelo controle de mudança do plano §3.~~ Incorporados em 26/09/2026 ao `documento-de-design.md` §5.1 (contagem no pill, linha e opções de ordenação) e §5.4 (lista de ações do sheet, com as duas confirmações de abandono distintas), com entrada na §11 Timeline do documento.

## Timeline

### Revisão 27/09/2026: controle de mudança de contrato aprovado pela dona do produto (Ana Luiza). (a) `ItemEstante` ganha `ultimaLeituraId` (leitura mais recente do livro na estante, em qualquer status) e `retomavel` (verdadeiro só quando essa leitura é a primeira leitura abandonada), também em `GET /perfis/{usuarioId}/estante`: sem o id da última leitura o cliente não conseguia retomar um livro Abandonado (RF-EST-07), já que `leituraEmAndamentoId` é nulo nesse estado. (b) Novo `GET /estante/{livroId}` (`consultarItemEstante`, 404 quando o livro não está na estante do leitor autenticado) para a consulta por livro, substituindo a varredura paginada da estante na página do livro pessoal. A listagem e a consulta por livro compartilham a mesma consulta SQL, com LATERAL JOIN da leitura mais recente. Comentários de código removidos a pedido da dona do produto; as decisões ficam registradas nos docs.

### Revisão 26/09/2026: lacunas de protótipo fechadas por controle de mudança, aprovado pela dona do produto (Ana Luiza). (a) `ItemEstante` de `GET /estante` e `GET /perfis/{id}/estante` passa a trazer `livro { titulo, autor, capaUrl }`, lido da VIEW de contrato `v_livro_referencia_v1` (capa só como URL; imagem servida por Cloudinary/OpenLibrary, custo desprezível). (b) `OrdenacaoEstante` com `adicionado_desc/asc`, `titulo_asc/desc`, `autor_asc/desc` (sem autor por último, empate pelo título) e `progresso_asc/desc` (percentual da leitura em andamento, sem leitura em andamento por último). (c) A listagem da estante faz JOIN direto de `v_livro_referencia_v1` no repositório de `leitura`, e não via `ReferenciasExternas`: permitido pela arquitetura §4.2 por ser VIEW de contrato, e necessário porque a ordenação paginada por título/autor é feita no SQL. (d) Backend de `leitura` reorganizado em camadas por módulo: `dominio/`, `aplicacao/`, `infraestrutura/`, `api/`. Design: contagem no pill, controle de ordenação e lista de ações do sheet incorporados ao `documento-de-design.md` §5.1/§5.4; `estante.md` atualizado com as opções de ordenação e a origem dos dados do card.

### Revisão 25/09/2026: backend de `leitura` implementado (estante, máquina de estados RN-04, conclusões, job de inatividade, idempotência HTTP e outbox) com testes de integração em Postgres real escritos (ainda não executados), e seed RNF-TST-08 (`npm run db:seed`) cobrindo os cinco estados e a releitura incompleta sobre os ids fixos do seed de `acervo`. Decisões: a inatividade conta dias em UTC; alerta de dia 20/30 já ultrapassado não é emitido retroativamente; `POST /leituras` sem vínculo prévio cria a estante mas não emite `livro.adicionado_a_estante`; `dataInicio` padrão usa `America/Sao_Paulo`. OpenAPI: `requestBody` de finalizar passou a obrigatório e as operações de F-EST a `implemented`. Lacunas frente ao protótipo (título/autor/capa em `ItemEstante`, ordenação por autor/progresso, JOIN com `v_livro_referencia_v1` na ordenação por título) ficaram como pendências.

### Revisão 17/09/2026: contratos alinhados ao OpenAPI, catálogo/schemas de mensageria e DER implantado. Baseline de dados marcada como concluída no Neon; máquina de estados, job, AMQP e clientes permanecem não iniciados. Fixadas as fronteiras F-EST/F-PRG/P0-MSG, as business keys e as responsabilidades de idempotência/deduplicação.

### Revisão 15/09/2026: grupo definiu a data da ação de finalizar como referência para desafios; metadados temporais persistidos e critério de backfill incorporados. Implementação não iniciada.

### Revisão 01/09/2026: eventos `leitura.*` aprovados; `leitura.finalizada` passou a alimentar feed, desafios e estatísticas pela outbox transacional.

### Revisão 01/09/2026: a busca do acervo saiu desta tela para a nova aba `Descobrir` ([P0-NAV](../periodo-0/feature-P0-NAV.md)). O gatilho foi a ambiguidade do campo de 320px no header web de `Minha estante`, que devolvia o catálogo inteiro. A busca **dentro** da estante virou **RF-EST-13** (`REQUISITOS.md` v1.2), classificada como Desejável e alocada em [F-EST-2](../periodo-2/feature-F-EST-2.md): no Período 1 o header da estante fica **sem lupa**. `estante.md` ganhou o modo de busca do header e três artboards novos (4.9, 4.10 e 5.5), todos marcados como escopo do Período 2.

### Revisão 28/08/2026: contratos com acervo/identidade, endpoint autorizado de estante pública, idempotência e testes foram definidos. O job passou a publicar fatos determinísticos por ciclo de inatividade para `social`; a divergência do consumidor adicional `leitura` ficou pendente para correção da matriz. Favoritos e cache permaneceram nas features futuras corretas.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-EST no [periodo-1/README.md](README.md), de RF-EST-01..08/11/12 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.3, das RN-04/RN-05 e da arquitetura §3.1/§4.2/§5.2/§2.4. Máquina de estados e job de inatividade fixados como prioridade de teste; favoritos e histórico adiados ao Período 2.
