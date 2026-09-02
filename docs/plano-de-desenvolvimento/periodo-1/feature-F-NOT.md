# F-NOT — Notificações in-app

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** a definir · **Serviços afetados:** `social` (backend) + mobile (sem web — ver Status)

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.10 (RF-NOT-01..04) e §2.1 (escopo web). Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §5.2, §2.7. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar as **notificações in-app** — a camada que avisa o leitor sobre o que acontece com ele (novo seguidor, comentário, leitura em risco). Fecha os requisitos **Essenciais**:

- **RF-NOT-01** **gerar notificação in-app** para os eventos das funcionalidades desta versão;
- **RF-NOT-02** visualizar as notificações em **lista paginada**, com indicação de **não lidas**;
- **RF-NOT-03** **marcar como lidas**, individualmente e **em lote**;
- **RF-NOT-04** a notificação de **leitura em risco** tem **ação direta de abandonar a leitura**.

`social` é o **consumidor** dos eventos de notificação de §7.2 (produzidos por `identidade`, `leitura` e o próprio `social`). O sistema base é **in-app** e vale para as duas plataformas móveis; push (Android) é extensão futura do mesmo fluxo (P-04).

RNF atendidos: **RNF-ERR-06** (consumidor idempotente), **RNF-ERR-07** (DLQ), **RNF-SEC-32** (mensagem validada por schema antes de processar), **RNF-SEC-02** (só o dono lê/marca suas notificações), **RNF-DES-02** (lista paginada), **RNF-ARQ-06** (fluxo assíncrono via broker).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | tabela `notificacao`; consumidor dos eventos de §7.2 (fan-out) |
| Backend | não iniciado | `social`: geração + lista paginada + marcar lidas + ação de abandonar |
| Web | **não aplicável** | notificações estão **fora do escopo web** (`REQUISITOS.md` §2.1) |
| Mobile | não iniciado | lista de notificações, não lidas, marcar lidas, ação de abandonar |

## Especificação

### Backend / API — `social`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Só o **dono** lê e marca suas notificações (SEC-02). Escritas HTTP aceitam `Idempotency-Key` conforme o [README do período](README.md#regras-de-implementação-compartilhadas).

- **Geração (RF-NOT-01)** — `social` consome, do broker, os eventos de notificação de §7.2 **disponíveis no Período 1** e grava uma `notificacao` para o destinatário:

  | Evento | Origem | Gatilho |
  |---|---|---|
  | `seguidor.novo` | identidade ([F-PERFIL](feature-F-PERFIL.md)) | novo seguidor |
  | `solicitacao.criada` | identidade | solicitação de seguir |
  | `solicitacao.aceita` | identidade | solicitação aceita |
  | `atividade.curtida` | social ([F-FEED](feature-F-FEED.md)) | curtida em atividade |
  | `atividade.comentada` | social | comentário em atividade |
  | `comentario.respondido` | social | resposta a comentário |
  | `leitura.em_risco` | leitura ([F-EST](feature-F-EST.md)) | dias 20/30 de inatividade (RN-05) |
  | `leitura.expirada` | leitura | abandono automático (dia 40) |

  Todo schema exige `destinatarioId`, ids do recurso, `eventId`, `occurredAt`, `correlationId` e chave de negócio estável. O consumidor é idempotente por `(destinatario, tipo, chave de negócio)`, além de `eventId`: nova execução do job com outro UUID não duplica o alerta do mesmo `(leitura, inatividadeVersao, limiar)`, mas um novo ciclo após atividade pode notificar novamente. Mensagem inválida é rejeitada antes do processamento (SEC-32); falha após máximo de tentativas vai para DLQ sem travar a fila (RNF-ERR-06/07). No Período 1, uma resposta gera somente `comentario.respondido`; `usuario.mencionado` entra com F-SOCIAL-2, sem notificação dupla para o mesmo ato.
- **`GET /notificacoes?page=`** (RF-NOT-02) — lista **paginada** (RNF-DES-02) das notificações do usuário, com **indicação de não lidas** (e contagem de não lidas para o badge).
- **`POST /notificacoes/marcar-lidas`** (RF-NOT-03) — marca como lidas **individualmente** (lista de ids) e **em lote** (todas), de forma idempotente.
- **Ação de abandonar (RF-NOT-04)** — a notificação de leitura em risco carrega a referência da leitura. Ao acionar, o cliente pede confirmação explícita e, se confirmada, chama autenticado o endpoint `abandonar` de [F-EST](feature-F-EST.md), que revalida propriedade e estado; `social` não altera tabela de `leitura` nem lê seu schema cru.

**Extensibilidade registrada:** RF-NOT-01 também cita `usuario.mencionado`, `resenha.curtida`, recomendação recebida e lembrete de sequência diária. As features candidatas de origem são F-SOCIAL-2, [F-AVA-2](../periodo-2/README.md), F-REC-P2P e **F-GAM-OPC (Período 3)**. Elas não herdam um evento implícito: antes de ativar cada tipo, a feature futura deve definir nome, produtor, schema, chave de negócio, consumidor, retentativa/DLQ e atualizar os documentos-mestre quando necessário. No Período 1 apenas os tipos da tabela acima são gerados.

**Modelo de dados** (schema `social`): `notificacao` (destinatário, tipo, payload/snapshot, referência à leitura quando aplicável, lida/não lida, `eventId`, chave de negócio e timestamps), com unicidade de efeito por destinatário+tipo+chave de negócio.

### App Flutter (`code/mobile`)

- **Lista de notificações** com indicação de não lidas e **badge** de contagem; **marcar lidas** (individual e em lote); a notificação de **leitura em risco** oferece a **ação de abandonar** ali mesmo (RF-NOT-04), integrando com [F-EST](feature-F-EST.md). Usa `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md). Alvo de demonstração Android.
- Cliente HTTP aplica timeout/backoff somente a operações idempotentes e preserva a chave ao marcar/abandonar. No Período 1 a entrega é **in-app** (lista carregada/atualizada pelo cliente); **tempo real** (RF-NOT-06) e **push** (RF-NOT-07) são posteriores.

### Frontend Web (`code/front`)

- **Fora de escopo:** notificações não fazem parte do cliente web (`REQUISITOS.md` §2.1). Registrado no Status e no DoD.

## Critérios de aceite

- [ ] Cada evento da tabela gera **uma** notificação para o destinatário correto; entrega duplicada ou republicação do mesmo fato com novo `eventId` não duplica (RNF-ERR-06).
- [ ] Mensagem com schema inválido é rejeitada antes de processar (SEC-32); falha repetida vai para **DLQ** sem travar a fila (RNF-ERR-07).
- [ ] Lista de notificações é **paginada** e mostra **não lidas** com contagem (RF-NOT-02, RNF-DES-02).
- [ ] Marcar lidas funciona **individual e em lote** (RF-NOT-03); só o dono acessa/altera as suas (SEC-02).
- [ ] Marcar lidas repetidamente com a mesma `Idempotency-Key` mantém o mesmo resultado (RNF-ERR-04).
- [ ] A notificação de **leitura em risco** exige confirmação antes do abandono autenticado em F-EST; propriedade e estado são revalidados (RF-NOT-04, RNF-USA-04).
- [ ] Novos tipos de evento (Período 2+) podem ser adicionados **sem remodelar** o consumidor.
- [ ] Geração e leitura de notificações funcionam **em DES** (mobile).

## Definition of Done

(plano §10)

- [ ] Código (backend `social`, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: lista paginada, propriedade, não lidas, marcação individual/lote, idempotência HTTP e vínculo da ação de abandonar (RNF-TST-02)
- [ ] Testes assíncronos cobrem cada schema, destinatário, duplicação por `eventId`, duplicação semântica e DLQ (RNF-TST-03)
- [ ] Mobile testa estado, paginação, ação de abandonar e indisponibilidade/timeout com API simulada (RNF-TST-04/06)
- [ ] **Spec OpenAPI de `social` atualizado em `docs/api/social.yaml`** com os endpoints de notificação
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)) — **web N/A** (notificações fora do escopo web, §2.1); justificativa registrada aqui em vez de remover o item
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** documentar o mapa evento→notificação, schema esperado e chave de negócio de cada tipo. Tipos futuros só entram acompanhados do contrato do produtor.

## Pendências

- **Depende de** [F-PERFIL](feature-F-PERFIL.md) (eventos de seguir), [F-FEED](feature-F-FEED.md) (eventos de atividade/resposta; menção arbitrária fica em F-SOCIAL-2), [F-EST](feature-F-EST.md) (eventos de leitura em risco/expirada e o `abandonar` de RF-NOT-04), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md) (broker, envelope, DLQ, idempotência, schema).
- **Compartilha `social` com [F-FEED](feature-F-FEED.md)** — sinalizar no grupo antes de mexer (plano §6).
- **Eventos futuros sem contrato:** recomendação recebida e lembrete de sequência não constam nas listas fechadas de mensageria dos documentos-mestre. F-REC-P2P/F-GAM-OPC devem propor os contratos e donos dos testes pelo controle de mudança antes de estender este consumidor.
- **Ficam fora:** preferências de categoria (RF-NOT-05, Período 3), **tempo real** (RF-NOT-06, **F-NOT-2** Período 2), **push FCM** (RF-NOT-07, Período 3).
- Stack de `social` definida: **Spring (Java)** (arquitetura §2.1).

## Timeline

### Revisão 28/08/2026: deduplicação passou a considerar chave semântica por ciclo de inatividade, não apenas `eventId`; schemas, ownership da ação de abandonar, idempotência HTTP e testes foram explicitados. Resposta deixou de ser duplicada como menção; `usuario.mencionado` foi alinhado a F-SOCIAL-2. Eventos futuros de recomendação/streak ficaram condicionados a contratos próprios.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-NOT no [periodo-1/README.md](README.md), de RF-NOT-01..04 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.10 e da arquitetura §5.2. Consumidor de notificações construído só para os eventos disponíveis no Período 1, com ponto de extensão para os tipos futuros; web marcada como fora de escopo (§2.1); tempo real e push adiados.
