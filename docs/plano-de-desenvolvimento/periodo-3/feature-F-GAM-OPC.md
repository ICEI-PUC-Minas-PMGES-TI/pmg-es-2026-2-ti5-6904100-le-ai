# F-GAM-OPC — Calendário e lembrete de streak

**Período:** 3 · **Prioridade:** opcional
**Dono:** a definir · **Serviços afetados:** `leitura` (backend) + `social` (notificação) + mobile + job diário (agendador)

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.12 (RF-GAM-04, 05), §5.10 (RF-NOT-01), RN-17, RN-18, §2.1 (escopo web), §10.2. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §2.4 (P-08), §2.7 (P-04), §3.1, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Completar a **sequência diária** de [F-GAM](../periodo-2/feature-F-GAM.md) com as duas partes que fazem o hábito se sustentar: **ver** o histórico recente e **ser lembrado** antes de perder a sequência. **Fora do escopo web** (§2.1: gamificação não faz parte do cliente Vue). Fecha os requisitos **Opcionais**:

- **RF-GAM-04** visualizar **quais dias recentes tiveram registro de progresso**, em formato de calendário;
- **RF-GAM-05** **notificar** o leitor com sequência ativa que ainda **não registrou progresso no dia corrente**.

O calendário **não cria dado**: F-GAM já persiste o dia com leitura pela data local de RN-18.2; esta feature apenas o expõe. O lembrete é o oposto — é o único requisito de gamificação que atravessa serviços, e **depende de push** para ser efetivo: `REQUISITOS.md` §5.12 registra que notificação in-app só é vista por quem já abriu o aplicativo, e nesse caso o lembrete perde a função. Logo, **depende de [F-NOT-OPC](feature-F-NOT-OPC.md)**.

RNF atendidos: **RNF-SEC-02** (só os dados do próprio usuário), **RNF-SEC-32** (mensagem validada por schema antes de processar), **RNF-ERR-06/07** (produção/consumo idempotente + DLQ), **RNF-DES-02** (janela do calendário limitada pelo servidor), **RNF-ARQ-06** (fluxo assíncrono), **RNF-ARQ-09** (job agendado).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | job diário no agendador; nenhuma tabela nova — reusa os dias com leitura de F-GAM |
| Backend | não iniciado | `leitura`: calendário + seleção diária e publicação do lembrete; `social`: mapeamento no consumidor de F-NOT |
| Web | **não aplicável** | gamificação está **fora do escopo web** (`REQUISITOS.md` §2.1) |
| Mobile | não iniciado | calendário de dias com progresso; recebimento do lembrete |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). Só os dados do **próprio usuário** (SEC-02).

**Calendário (RF-GAM-04)**

- **`GET /me/sequencia/calendario?de=&ate=`** — devolve, na janela pedida, **quais dias tiveram registro de progresso**, lendo os dias com leitura que [F-GAM](../periodo-2/feature-F-GAM.md) já mantém pela **data local** persistida por [F-PRG](../periodo-1/feature-F-PRG.md) (RN-18.2). **Sem tabela nova.**
- A **janela é limitada pelo servidor** (RNF-DES-02) — "dias recentes", não o histórico inteiro; janela ausente assume um padrão curto, e janela maior que o teto é recusada ou truncada com o limite explícito na resposta.
- Um dia conta pelas **mesmas regras de RN-18.1**: ao menos uma atualização com **pelo menos uma página lida**. Iniciar, concluir ou abandonar leitura **não** pinta o dia. Sem isso, o calendário e o número da sequência divergiriam na mesma tela.
- O calendário é **derivado e somente leitura**: não há como marcar um dia manualmente, coerente com a inexistência de registro retroativo de progresso (RN-17, RN-18.5).

**Lembrete de sequência (RF-GAM-05)**

- **Job diário** no agendador decidido em P-08 (GitHub Actions `schedule`, fallback cron-job.org), chamando um **endpoint interno autenticado** de `leitura` — o mesmo desenho do job de inatividade de [F-EST](../periodo-1/feature-F-EST.md) (§10.2, arquitetura §2.4).
- **Seleção:** leitores com **sequência ativa** (atual maior que zero) que **ainda não têm registro no dia local corrente**, calculado pelo **último fuso registrado pelo dispositivo** — o mesmo critério que F-GAM já usa para derivar o zeramento, sem fan-out por fuso horário.
- **Publica `sequencia.lembrete`**, consumido pelo consumidor de notificações de `social`, que grava a notificação do tipo **`lembrete_sequencia`** — tipo **já previsto** em RF-NOT-01 e no enum de `notificacao` de [F-NOT](../periodo-1/feature-F-NOT.md) —, entregue por **push** de [F-NOT-OPC](feature-F-NOT-OPC.md) e sujeita à **preferência de categoria** do leitor.
- **Idempotência (RNF-ERR-06):** chave de negócio **`(usuarioId, dataLocal)`**, além do `eventId`. Reexecução do job no mesmo dia **não** gera segundo lembrete; o dia seguinte gera um novo normalmente. Mensagem com schema inválido é rejeitada antes do processamento (SEC-32); falha após o máximo de tentativas vai para **DLQ** sem travar a fila (RNF-ERR-07).
- **Uma execução por dia**, tolerante a imprecisão de horário (§10.2). O lembrete é conveniência: atraso do agendador não é falha de negócio, e **não** altera a sequência — a sequência continua sendo apurada só pelo registro de progresso (RN-18.7).
- **Não há lembrete para quem não tem sequência ativa** (RF-GAM-05 é explícito), nem segundo lembrete no mesmo dia.

**Payload do evento:** envelope de [P0-MSG](../periodo-0/feature-P0-MSG.md) + schema versionado com `destinatarioId`, `dataLocal`, sequência atual, `eventId`, `occurredAt`, `correlationId` e a chave de negócio `(usuarioId, dataLocal)`.

**Modelo de dados:** **nenhuma tabela nova**. Calendário e seleção do lembrete leem os dias com leitura, a sequência e o último fuso que [F-GAM](../periodo-2/feature-F-GAM.md) já persiste no schema `leitura`. A notificação usa a tabela de `social` já existente.

### Backend / API — `social`

- Acrescenta ao consumidor de [F-NOT](../periodo-1/feature-F-NOT.md) o **mapeamento `sequencia.lembrete` → notificação `lembrete_sequencia`**, com schema, chave de negócio, idempotência e DLQ próprios — exatamente o que `F-NOT` exige de qualquer tipo novo antes de ativá-lo. Respeita a preferência de categoria de [F-NOT-OPC](feature-F-NOT-OPC.md) e sai por push quando o dispositivo estiver registrado.

### App Flutter (`code/mobile`)

- **Calendário** de dias recentes com progresso, junto do componente de streak de [P0-DS](../periodo-0/feature-P0-DS.md); dias com e sem leitura visualmente distintos, sem interação de edição. Janela navegável dentro do limite do servidor.
- **Lembrete** chega como notificação (push quando disponível, in-app sempre) e leva à tela da leitura em andamento ou da estante. Alvo de demonstração Android.

### Frontend Web (`code/front`)

- **Fora de escopo:** gamificação não faz parte do cliente web (`REQUISITOS.md` §2.1), como já registrado em [F-GAM](../periodo-2/feature-F-GAM.md). Registrado no Status e no DoD.

## Critérios de aceite

- [ ] O calendário mostra os dias com registro na janela pedida, usando a **data local** de RN-18.2 (RF-GAM-04).
- [ ] Um dia só é marcado com **≥1 progresso com ≥1 página lida**; iniciar/concluir/abandonar **não** marca (RN-18.1) — calendário e número da sequência nunca divergem.
- [ ] A janela é **limitada pelo servidor** e o calendário é **somente leitura**, sem marcação manual (RNF-DES-02, RN-17).
- [ ] Só o próprio leitor vê seu calendário (SEC-02).
- [ ] O job diário seleciona **apenas** leitores com sequência **ativa** e **sem registro no dia local corrente** (RF-GAM-05).
- [ ] Reexecutar o job no mesmo dia **não** gera segundo lembrete; a chave `(usuarioId, dataLocal)` sustenta a deduplicação (RNF-ERR-06).
- [ ] Schema inválido é rejeitado antes de processar (SEC-32); falha repetida vai para **DLQ** sem travar a fila (RNF-ERR-07).
- [ ] O lembrete respeita a **preferência de categoria** e sai por **push** quando há dispositivo registrado; sem push, permanece na lista in-app.
- [ ] Atraso ou falha do job **não altera** a sequência do leitor (RN-18).
- [ ] Calendário e lembrete funcionam **em DES**, com o lembrete demonstrado em Android.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura` + mapeamento em `social`, job no agendador, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: marcação do dia por RN-18.1, janela limitada, propriedade, seleção do job (com e sem sequência ativa, com e sem registro no dia) e uso do último fuso registrado (RNF-TST-02)
- [ ] Testes assíncronos: publicação de `sequencia.lembrete`, consumo gravando uma única notificação, duplicação por `eventId`, duplicação semântica por `(usuarioId, dataLocal)` e DLQ (RNF-TST-03)
- [ ] Testes mobile cobrem o calendário, o recebimento do lembrete e indisponibilidade/timeout com API simulada (RNF-TST-04/06)
- [ ] **Specs OpenAPI**: `docs/api/leitura.yaml` com o calendário e o endpoint interno do job; `docs/api/social.yaml` com o schema de `sequencia.lembrete`
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)) — **web N/A** (gamificação fora do escopo web, §2.1); justificativa registrada aqui em vez de remover o item
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** propor o contrato completo de **`sequencia.lembrete`** — nome, produtor, schema, chave de negócio, consumidor, retentativa e DLQ — e sua inclusão nos documentos-mestre, como [F-NOT](../periodo-1/feature-F-NOT.md) exige de todo tipo novo. Aprovado o contrato, entregar produtor e mapeamento do consumidor na própria feature.

## Pendências

- **Depende de** [F-GAM](../periodo-2/feature-F-GAM.md) (dias com leitura, sequência, último fuso), [F-PRG](../periodo-1/feature-F-PRG.md) (data local persistida — RN-18.2), [F-NOT](../periodo-1/feature-F-NOT.md) (consumidor e tipo de notificação), **[F-NOT-OPC](feature-F-NOT-OPC.md)** (push e preferências — sem ela RF-GAM-05 não cumpre sua função, §5.12), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md), [P0-MSG](../periodo-0/feature-P0-MSG.md).
- **Divergência de baseline — evento novo:** `sequencia.lembrete` ainda não pertence aos fluxos aprovados. F-GAM-OPC deve definir contrato e propor sua inclusão antes de estender o consumidor.
- **Contrato herdado de F-GAM:** `progresso.registrado` está aprovado; o calendário continua lendo os dias persistidos por F-GAM e não cria consumidor adicional.
- **Validação do período-0:** viabilidade do GitHub Actions `schedule` no repositório do GitHub Classroom (P-08) e emissão de push FCM em Android real (P-04) — arquitetura §8. O lembrete depende das duas.
- **Ordem na sprint:** entra **depois** de [F-NOT-OPC](feature-F-NOT-OPC.md). Se o push não sair, RF-GAM-04 (calendário) permanece entregável sozinho e RF-GAM-05 é o candidato natural a corte, dado o congelamento de 17/11.
- **Compartilha `leitura`** com as demais features de leitura e **`social`** com as sociais — sinalizar no grupo (plano §6).
- Stack definida (arquitetura §2.1): `leitura` em NestJS, `social` em Spring.

## Timeline

### Criação 01/09/2026: arquivo criado a partir do escopo de F-GAM-OPC no [periodo-3/README.md](README.md), de RF-GAM-04/05 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.12 e da RN-18. Calendário fixado como leitura derivada dos dias que F-GAM já persiste, sem tabela nova e com janela limitada; lembrete fixado como job diário em `leitura` publicando `sequencia.lembrete`, com chave de negócio por dia local e dedup na reexecução. O contrato do evento foi registrado como divergência de baseline, conforme exigência de F-NOT, e a dependência dura de push (F-NOT-OPC) foi declarada junto com a ordem das duas features na sprint.
