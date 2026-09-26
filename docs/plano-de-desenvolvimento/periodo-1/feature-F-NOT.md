# F-NOT — Notificações in-app

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** Kayke · **Serviços afetados:** `social` (backend) + mobile (sem web — ver Status)

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
| Infra | bloqueado por P0-MSG | fila `leai.social.notificacoes`, bindings, retry/DLQ e runtime consumidor ainda não implementados |
| Dados | concluído (baseline físico) | DER implantado no Neon em 16/09: `notificacao`, índices, `idempotencia_social` e `outbox_social`; `mensagem_processada` continua entrega incremental de P0-MSG |
| Backend | não iniciado | `social` possui somente scaffold/health; geração, lista e marcação de notificações não estão implementadas |
| Web | **não aplicável** | notificações estão **fora do escopo web** (`REQUISITOS.md` §2.1) |
| Mobile | não iniciado | lista de notificações, não lidas, marcar lidas, ação de abandonar |

## Especificação

### Backend / API — `social`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Só o **dono** lê e marca suas notificações (SEC-02). Escritas HTTP aceitam `Idempotency-Key` conforme o [README do período](README.md#regras-de-implementação-compartilhadas).

**Pré-requisito de execução:** o DER já implantado não substitui [P0-MSG](../periodo-0/feature-P0-MSG.md). O consumidor só pode entrar em DES depois de P0-MSG entregar conexão/consumer reutilizável, envelope/validador, `mensagem_processada` e a política operacional de retry/DLQ; até lá nenhum evento gera notificação.

- **Geração (RF-NOT-01)** — pela fila durável `leai.social.notificacoes`, `social` consome os eventos de notificação de §7.2 **disponíveis no Período 1** e grava uma `notificacao` para o destinatário. A fila liga-se a `leai.events.identidade` para os três eventos de perfil, a `leai.events.social` para os três eventos de interação e a `leai.events.leitura` para os dois eventos de inatividade, sempre com routing key igual ao nome exato do evento:

  | Evento | Origem | Gatilho | `businessKey` canônica |
  |---|---|---|---|
  | `seguidor.novo` | identidade ([F-PERFIL](feature-F-PERFIL.md)) | novo seguidor | `seguimento:<seguimentoId>` |
  | `solicitacao.criada` | identidade | solicitação de seguir | `solicitacao:<solicitacaoId>` |
  | `solicitacao.aceita` | identidade | solicitação aceita | `solicitacao:<solicitacaoId>` |
  | `atividade.curtida` | social ([F-FEED](feature-F-FEED.md)) | curtida em atividade | `atividade:<atividadeId>:curtida:<autorAcaoId>` |
  | `atividade.comentada` | social | comentário em atividade | `comentario:<comentarioId>` |
  | `comentario.respondido` | social | resposta a comentário | `comentario:<comentarioId>` |
  | `leitura.em_risco` | leitura ([F-EST](feature-F-EST.md)) | dias 20/30 de inatividade (RN-05) | `leitura:<leituraId>:inatividade:<versao>:<limiar>` |
  | `leitura.expirada` | leitura | abandono automático (dia 40) | `leitura:<leituraId>:inatividade:<versao>:40` |

  O envelope v1 exige `eventId`, `type`, `version`, `occurredAt`, `correlationId`, `businessKey` e `data`; `destinatarioId` e os ids/snapshots específicos ficam em `data`, exatamente conforme cada schema v1. O consumidor valida envelope e `data` antes do domínio e é idempotente em dois níveis: recibo `(consumidor, event_id)` para a mesma entrega e unicidade de efeito `(destinatario_id, tipo, chave_negocio)`. Efeito e recibo são gravados na mesma transação; recibo repetido recebe ACK sem novo efeito, e ACK só ocorre após commit. Para inatividade, `businessKey` é `leitura:<leituraId>:inatividade:<inatividadeVersao>:<limiarDias>`: republicar o mesmo fato com outro UUID não duplica, mas um novo ciclo pode notificar novamente. No Período 1, uma resposta gera somente `comentario.respondido`; `usuario.mencionado` entra com F-SOCIAL-2, sem notificação dupla para o mesmo ato.
- **`GET /notificacoes?page={page}&size={size}`** (RF-NOT-02) — lista em ordem cronológica decrescente somente as notificações do usuário autenticado, com página iniciada em zero, `size` de 1 a 50 (padrão 20), estado lida/não lida e `totalNaoLidas` para o badge. Notificação ligada a conta suspensa ou conteúdo que perdeu visibilidade não expõe o snapshot ao cliente.
- **`POST /notificacoes/marcar-lidas`** (RF-NOT-03) — com `modo=SELECIONADAS`, exige de 1 a 100 `ids` únicos (um id cobre a marcação individual); com `modo=TODAS`, proíbe `ids` e marca todas as não lidas do dono. IDs alheios não são alterados e resultam em 404 sem revelar existência. A operação exige `Idempotency-Key` e é idempotente.
- **Ação de abandonar (RF-NOT-04)** — a notificação de leitura em risco carrega a referência da leitura. Ao acionar, o cliente pede confirmação explícita e, se confirmada, chama autenticado `POST /leituras/{leituraId}/abandonar` de [F-EST](feature-F-EST.md), com `Idempotency-Key`; `leitura` revalida propriedade e estado. `social` não altera tabela de `leitura`, não lê seu schema cru e não expõe rota própria de abandono.

**Retry/DLQ:** `leai.social.notificacoes.dlq` liga-se ao exchange direto `leai.dead-letter` pela routing key `leai.social.notificacoes`. Envelope, schema ou versão inválida e erro permanente vão imediatamente à DLQ; erro técnico transitório tenta novamente após 1, 5 e 15 segundos e, após a terceira tentativa, usa `nack(requeue=false)`. Não há redrive automático; o redrive é manual após corrigir a causa.

**Extensibilidade registrada:** RF-NOT-01 também cita `usuario.mencionado`, `resenha.curtida`, recomendação recebida e lembrete de sequência diária. As features candidatas de origem são F-SOCIAL-2, [F-AVA-2](../periodo-2/README.md), F-REC-P2P e **F-GAM-OPC (Período 3)**. Elas não herdam um evento implícito: antes de ativar cada tipo, a feature futura deve definir nome, produtor, schema, chave de negócio, consumidor, retentativa/DLQ e atualizar os documentos-mestre quando necessário. No Período 1 apenas os tipos da tabela acima são gerados.

**Modelo de dados** (schema `social`): `notificacao` (destinatário, tipo, payload/snapshot, referência à leitura quando aplicável, lida/não lida, `eventId`, chave de negócio e timestamps), com unicidade de efeito por destinatário+tipo+chave de negócio.

### App Flutter (`code/mobile`)

- **Lista de notificações** com indicação de não lidas e **badge** de contagem; **marcar lidas** (individual e em lote); a notificação de **leitura em risco** oferece a **ação de abandonar** ali mesmo (RF-NOT-04), integrando com [F-EST](feature-F-EST.md). Usa `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md). Alvo de demonstração Android.
- Cliente HTTP aplica timeout/backoff somente a operações idempotentes e preserva a chave ao marcar/abandonar. No Período 1 a entrega é **in-app** (lista carregada/atualizada pelo cliente); **tempo real** (RF-NOT-06) e **push** (RF-NOT-07) são posteriores.

### Frontend Web (`code/front`)

- **Fora de escopo:** notificações não fazem parte do cliente web (`REQUISITOS.md` §2.1). Registrado no Status e no DoD.

## Critérios de aceite

- [ ] Cada evento da tabela gera **uma** notificação para o destinatário correto; entrega duplicada ou republicação do mesmo fato com novo `eventId` não duplica (RNF-ERR-06).
- [ ] `leai.social.notificacoes` possui somente os oito bindings canônicos nos três exchanges; mensagem com envelope/schema/versão inválido vai diretamente a `leai.social.notificacoes.dlq`, e falha transitória percorre 1/5/15 segundos antes da DLQ (SEC-32, RNF-ERR-07).
- [ ] Efeito e recibo são atômicos, ACK ocorre somente após commit e reentrega do mesmo `eventId` não repete o efeito; a chave semântica impede duplicação do mesmo fato com outro `eventId`.
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
- [ ] Testes assíncronos de integração cobrem os oito bindings e schemas v1, destinatário, atomicidade efeito+recibo, ACK pós-commit, duplicação por `eventId`, duplicação semântica por `businessKey`, novo ciclo de inatividade, rejeição imediata de mensagem inválida, retry 1/5/15 e `leai.social.notificacoes.dlq` (RNF-TST-03)
- [ ] Mobile testa estado, paginação, ação de abandonar e indisponibilidade/timeout com API simulada (RNF-TST-04/06)
- [ ] **Spec OpenAPI de `social` atualizado em `docs/api/social.yaml`** com os endpoints de notificação
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)) — **web N/A** (notificações fora do escopo web, §2.1); justificativa registrada aqui em vez de remover o item
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** documentar o mapa evento→notificação, schema esperado e chave de negócio de cada tipo. Tipos futuros só entram acompanhados do contrato do produtor.

## Pendências

- **Depende de** [F-PERFIL](feature-F-PERFIL.md) (eventos de seguir), [F-FEED](feature-F-FEED.md) (eventos de atividade/resposta; menção arbitrária fica em F-SOCIAL-2), [F-EST](feature-F-EST.md) (eventos de leitura em risco/expirada e o `abandonar` de RF-NOT-04), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md) (broker, envelope, DLQ, idempotência, schema).
- **Compartilha `social` com [F-FEED](feature-F-FEED.md)** — sinalizar no grupo antes de mexer (plano §6).
- **Dados já implantados não significam feature pronta:** a migration `V20260916024928__cria_modelo_social.sql` criou `notificacao`, seus índices e a unicidade de efeito no Neon. P0-MSG ainda deve criar `social.mensagem_processada` por nova migration revisada por humano; não alterar a migration aplicada.
- **Eventos futuros sem contrato:** recomendação recebida e lembrete de sequência não constam nas listas fechadas de mensageria dos documentos-mestre. F-REC-P2P/F-GAM-OPC devem propor os contratos e donos dos testes pelo controle de mudança antes de estender este consumidor.
- **Ficam fora:** preferências de categoria (RF-NOT-05, Período 3), **tempo real** (RF-NOT-06, **F-NOT-2** Período 2), **push FCM** (RF-NOT-07, Período 3).
- Stack de `social` definida: **Spring (Java)** (arquitetura §2.1).

## Timeline

### Alinhamento 17/09/2026: endpoints foram igualados ao `docs/api/social.yaml`; eventos, exchanges, fila `leai.social.notificacoes`, recibo/efeito transacional, chaves semânticas e retry/DLQ foram igualados ao catálogo e ao P0-MSG. O status passou a reconhecer a tabela de notificação implantada no Neon sem alegar implementação do serviço.

### Revisão 28/08/2026: deduplicação passou a considerar chave semântica por ciclo de inatividade, não apenas `eventId`; schemas, ownership da ação de abandonar, idempotência HTTP e testes foram explicitados. Resposta deixou de ser duplicada como menção; `usuario.mencionado` foi alinhado a F-SOCIAL-2. Eventos futuros de recomendação/streak ficaram condicionados a contratos próprios.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-NOT no [periodo-1/README.md](README.md), de RF-NOT-01..04 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.10 e da arquitetura §5.2. Consumidor de notificações construído só para os eventos disponíveis no Período 1, com ponto de extensão para os tipos futuros; web marcada como fora de escopo (§2.1); tempo real e push adiados.
