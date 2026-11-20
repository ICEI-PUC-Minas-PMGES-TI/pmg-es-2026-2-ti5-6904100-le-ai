# F-GAM-OPC — Calendário e lembrete de streak

**Período:** 3 · **Prioridade:** opcional
**Dono:** Vicenzo Fonseca · **Serviços afetados:** `leitura` (backend) + `social` (notificação) + mobile + job diário (agendador)

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
| Infra | concluída no código | `.github/workflows/job-lembrete-sequencia.yml` (22h UTC, mesmos secrets do job de inatividade); nenhuma tabela nem migration nova; falta rodar em DES (merge na `main`) |
| Backend | concluído | `leitura`: `GET /me/sequencia/calendario` e `POST /internal/jobs/lembrete-sequencia` publicando `lembrete.sequencia`; `social`: tipo `LEMBRETE_SEQUENCIA` no consumidor de notificações. Lint, build, 321 unitários e 399 de integração no `leitura`; `./mvnw verify` do `social` com 365 testes, Postgres 17 descartável (19/11/2026) |
| Web | **não aplicável** | gamificação está **fora do escopo web** (`REQUISITOS.md` §2.1) |
| Mobile | concluído | tela `Sequência` (calendário), entrada pelo bloco de sequência do Meu perfil, lembrete na lista de notificações e no push com destino na estante; `flutter analyze` limpo e 1074 testes (20/11/2026); validado no emulador Android |

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
- **Publica `sequencia.lembrete`**, consumido pelo consumidor de notificações de `social`, que grava a notificação do tipo **`lembrete_sequencia`** — tipo **já previsto** em RF-NOT-01 e no enum de `notificacao` de [F-NOT](../periodo-1/feature-F-NOT.md) —, entregue por **push** de [F-NOT-OPC](feature-F-NOT-OPC.md) e sujeita à **preferência do tipo `lembrete_sequencia`** do leitor.
- **Idempotência (RNF-ERR-06):** chave de negócio **`(usuarioId, dataLocal)`**, além do `eventId`. Reexecução do job no mesmo dia **não** gera segundo lembrete; o dia seguinte gera um novo normalmente. Mensagem com schema inválido é rejeitada antes do processamento (SEC-32); falha após o máximo de tentativas vai para **DLQ** sem travar a fila (RNF-ERR-07).
- **Uma execução por dia**, tolerante a imprecisão de horário (§10.2). O lembrete é conveniência: atraso do agendador não é falha de negócio, e **não** altera a sequência — a sequência continua sendo apurada só pelo registro de progresso (RN-18.7).
- **Não há lembrete para quem não tem sequência ativa** (RF-GAM-05 é explícito), nem segundo lembrete no mesmo dia.

**Payload do evento:** envelope de [P0-MSG](../periodo-0/feature-P0-MSG.md) + schema versionado com `destinatarioId`, `dataLocal`, sequência atual, `eventId`, `occurredAt`, `correlationId` e a chave de negócio `(usuarioId, dataLocal)`.

**Modelo de dados:** **nenhuma tabela nova**. Calendário e seleção do lembrete leem os dias com leitura, a sequência e o último fuso que [F-GAM](../periodo-2/feature-F-GAM.md) já persiste no schema `leitura`. A notificação usa a tabela de `social` já existente.

### Backend / API — `social`

- Acrescenta ao consumidor de [F-NOT](../periodo-1/feature-F-NOT.md) o **mapeamento `sequencia.lembrete` → notificação `lembrete_sequencia`**, com schema, chave de negócio, idempotência e DLQ próprios — exatamente o que `F-NOT` exige de qualquer tipo novo antes de ativá-lo. Respeita a preferência do tipo `lembrete_sequencia` de [F-NOT-OPC](feature-F-NOT-OPC.md) e sai por push quando o dispositivo estiver registrado.

### App Flutter (`code/mobile`)

- **Calendário** de dias recentes com progresso, junto do componente de streak de [P0-DS](../periodo-0/feature-P0-DS.md); dias com e sem leitura visualmente distintos, sem interação de edição. Janela navegável dentro do limite do servidor.
- **Lembrete** chega como notificação (push quando disponível, in-app sempre) e leva à tela da leitura em andamento ou da estante. Alvo de demonstração Android.

### Contrato implementado (19/11/2026)

- **`GET /me/sequencia/calendario?mes=AAAA-MM`** → `{ mes, mesAtual, mesMaisAntigo, hoje, dias[] }`. Janela: o mês corrente e os cinco anteriores, sem recuar antes do mês do primeiro dia com leitura (sem nenhum, só o mês corrente). `mesAtual` e `hoje` no último fuso do dispositivo (`America/Sao_Paulo` sem progresso). Formato inválido é 400; fora da janela, 422 com `campos.mes`. Resolve o "contrato a confirmar" do design: o cliente recebe o limite e conta o total do mês.
- **`POST /internal/jobs/lembrete-sequencia`** (`X-Scheduler-Token` + `Idempotency-Key`, corpo `{}`) → `{ instanteReferencia, elegiveis, lembretesPublicados, jaLembrados }`. Elegível: último dia com leitura **exatamente ontem** no último fuso (sequência ativa e sem registro hoje), conta presente em `v_perfil_referencia_v1`.
- **`lembrete.sequencia` v1:** produtor `leitura` (job), consumidor `social/notificações`, `data = { destinatarioId, dataLocal, sequenciaAtual ≥ 1 }`, chave `sequencia:<usuarioId>:lembrete:<dataLocal>`, `eventId` UUID v5 de `(usuarioId, dataLocal)`. Dedup no produtor pela chave primária da outbox e no consumidor por `eventId` e pela unicidade `(destinatário, tipo, chave)`. Schema inválido vai para a DLQ pelo runtime (retry 1/5/15 s).
- **Notificação `LEMBRETE_SEQUENCIA`:** sem ator, livro nem ação; frase `Sua sequência está em N dias e hoje ainda não tem leitura registrada.` (singular em 1 dia), a mesma no push.

### Frontend Web (`code/front`)

- **Fora de escopo:** gamificação não faz parte do cliente web (`REQUISITOS.md` §2.1), como já registrado em [F-GAM](../periodo-2/feature-F-GAM.md). Registrado no Status e no DoD.

## Critérios de aceite

- [x] O calendário mostra os dias com registro na janela pedida, usando a **data local** de RN-18.2 (RF-GAM-04).
- [x] Um dia só é marcado com **≥1 progresso com ≥1 página lida**; iniciar/concluir/abandonar **não** marca (RN-18.1) — calendário e número da sequência nunca divergem.
- [x] A janela é **limitada pelo servidor** e o calendário é **somente leitura**, sem marcação manual (RNF-DES-02, RN-17).
- [x] Só o próprio leitor vê seu calendário (SEC-02).
- [x] O job diário seleciona **apenas** leitores com sequência **ativa** e **sem registro no dia local corrente** (RF-GAM-05).
- [x] Reexecutar o job no mesmo dia **não** gera segundo lembrete; a chave `(usuarioId, dataLocal)` sustenta a deduplicação (RNF-ERR-06).
- [x] Schema inválido é rejeitado antes de processar (SEC-32); falha repetida vai para **DLQ** sem travar a fila (RNF-ERR-07).
- [x] O lembrete respeita a **preferência do tipo `lembrete_sequencia`** e sai por **push** quando há dispositivo registrado; sem push, permanece na lista in-app. (Validado em 20/11/2026 no emulador Android com Google Play, com o projeto Firebase `leai-ti5`: o push do lembrete chega e o toque abre o destino; ver Timeline.)
- [x] Atraso ou falha do job **não altera** a sequência do leitor (RN-18).
- [ ] Calendário e lembrete funcionam **em DES**, com o lembrete demonstrado em Android.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura` + mapeamento em `social`, job no agendador, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [x] Testes unitários e de integração com banco real/container: marcação do dia por RN-18.1, janela limitada, propriedade, seleção do job (com e sem sequência ativa, com e sem registro no dia) e uso do último fuso registrado (RNF-TST-02)
- [x] Testes assíncronos: publicação de `lembrete.sequencia`, consumo gravando uma única notificação, duplicação por `eventId`, duplicação semântica por `(usuarioId, dataLocal)` e DLQ (RNF-TST-03)
- [x] Testes mobile cobrem o calendário, o recebimento do lembrete e indisponibilidade/timeout com API simulada (RNF-TST-04/06)
- [x] **Specs OpenAPI**: `docs/api/leitura.yaml` com o calendário e o endpoint interno do job; `docs/api/social.yaml` com o consumo de `lembrete.sequencia` (HTML regerado)
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)) — **web N/A** (gamificação fora do escopo web, §2.1); justificativa registrada aqui em vez de remover o item
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver

**Item próprio (feito em 19/11/2026, evento renomeado para `lembrete.sequencia`, o nome que a arquitetura já usava):** propor o contrato completo de **`sequencia.lembrete`** — nome, produtor, schema, chave de negócio, consumidor, retentativa e DLQ — e sua inclusão nos documentos-mestre, como [F-NOT](../periodo-1/feature-F-NOT.md) exige de todo tipo novo. Aprovado o contrato, entregar produtor e mapeamento do consumidor na própria feature.

## Pendências

- **Telas (design P3):** lote 1, prompt escrito em 11/10/2026: [`calendario-de-sequencia.md`](../../design/periodo-3/F-GAM-OPC/calendario-de-sequencia.md) ([protótipo](../../design/periodo-3/F-GAM-OPC/prototipos/calendario-de-sequencia.html)) (só mobile, somente leitura, janela de meses limitada pelo servidor). Entrada pelo toque no bloco de sequência do Meu perfil, na edição consolidada (lote 3, prompt escrito em 11/10/2026) [`meu-perfil.md`](../../design/periodo-3/meu-perfil/meu-perfil.md) ([protótipo](../../design/periodo-3/meu-perfil/prototipos/meu-perfil.html)) (container inteiro tocável com `CaretRight`); o tipo `Lembrete de sequência` está na edição [`notificacoes.md`](../../design/periodo-3/notificacoes/notificacoes.md) ([protótipo](../../design/periodo-3/notificacoes/prototipos/notificacoes.html)) (lote 3; o toque leva à leitura em andamento ou à estante, conforme esta feature, a ratificar). Contrato a confirmar: `GET /me/sequencia/calendario` devolver o mês mais antigo disponível. Protótipos exportados em 21/10/2026.
- **Depende de** [F-GAM](../periodo-2/feature-F-GAM.md) (dias com leitura, sequência, último fuso), [F-PRG](../periodo-1/feature-F-PRG.md) (data local persistida — RN-18.2), [F-NOT](../periodo-1/feature-F-NOT.md) (consumidor e tipo de notificação), **[F-NOT-OPC](feature-F-NOT-OPC.md)** (push e preferências — sem ela RF-GAM-05 não cumpre sua função, §5.12), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md), [P0-MSG](../periodo-0/feature-P0-MSG.md).
- **Divergência de baseline — evento novo (resolvida em 19/11/2026):** com o aval do dono, `lembrete.sequencia` entrou nos fluxos aprovados: `REQUISITOS.md` §7.2 (linha nova, e sai de "candidatos a inclusão futura") com Timeline v1.10, arquitetura §5.2 (linha nova, schema e contagem de 27) com v1.9, e os derivados `3.requisitos.md` e `4.modelagem.md`. O nome final é `lembrete.sequencia`, e não `sequencia.lembrete`, para casar com a arquitetura e o `social.yaml`.
- **Única pendência de entrega: DES.** O código está pronto e o fluxo completo foi validado no emulador Android em 20/11/2026, com o projeto Firebase `leai-ti5`. Falta o merge na `main`: deploy do `leitura` e do `social`, o workflow agendado passando a rodar e `FIREBASE_CREDENTIALS_JSON` no `leai-social` do Render ([Ativar o push](feature-F-NOT-OPC.md#ativar-o-push)). O secret `GOOGLE_SERVICES_JSON_BASE64` já está no GitHub desde 20/11/2026. Sem credencial do Firebase, o lembrete continua chegando na lista in-app.
- **Ordem no deploy:** sem backfill. A fila `leai.social.notificacoes` ganha o binding `lembrete.sequencia` quando o `social` sobe; um lembrete publicado antes disso se perde, o que não é falha de negócio (o do dia seguinte sai normalmente). Subir o `social` antes da primeira execução do job em DES.
- **Divergências protótipo × implementação (mobile):** (1) conta nova: os dias anteriores à criação da conta não ficam em `grafite-suave`, porque o contrato não traz a data de criação; o limite para trás vem só de `mesMaisAntigo` (mês do primeiro dia com leitura); (2) o rótulo acessível do lembrete termina sempre em "Abre a estante.", porque o destino exato só se conhece depois de consultar a estante; (3) os botões de mês não têm o `scale(0.98)` ao pressionar; (4) o contorno de foco do cartão do perfil fica sobre a borda, sem folga de 2 px; (5) o resumo do calendário reaproveita o cartão do perfil, com o helper em 116 px em vez de 128 px; (6) com mais de uma leitura em andamento, o lembrete abre o filtro `Lendo`, que não inclui `Relendo`; (7) no cartão do perfil, o helper de 112 px ocupa quatro linhas na fonte real, e não até três, porque o limite de três cortava "1 página." sem reticências (visto no emulador).
- **Destino do lembrete (ratificado conforme o design de notificações):** `/estante?lembrete=sequencia`, também pela abertura por push. Uma leitura em andamento (`Lendo` ou `Relendo`) abre a folha de registrar progresso dela; mais de uma, o filtro `Lendo`; nenhuma, `Todos`.
- **Código compartilhado tocado:** `estante_page.dart` (estante, Ana) para o destino do lembrete, e os arquivos de notificações e preferências do mobile e do `social` (Kayke), para o tipo novo. Também `perfil_page.dart`, para corrigir o contador de seguidores visto no emulador. Sinalizar aos donos.
- **Componentes novos a incorporar ao `documento-de-design.md`** (controle de mudança do grupo): os seis da §7 do prompt do calendário (grade mensal, faixa de dias seguidos, anel de hoje, navegação de mês, legenda e banner de sem conexão).
- **Contrato herdado de F-GAM:** `progresso.registrado` está aprovado; o calendário continua lendo os dias persistidos por F-GAM e não cria consumidor adicional.
- **Validação do período-0:** o `schedule` do GitHub Actions funciona no repositório do GitHub Classroom desde 30/09/2026 (P-08, `job-inatividade.yml`), e o push FCM foi validado num emulador Android com Google Play em 20/11/2026 (P-04). Falta repetir o push em DES num aparelho físico (arquitetura §8).
- **Ordem na sprint:** entra **depois** de [F-NOT-OPC](feature-F-NOT-OPC.md). Se o push não sair, RF-GAM-04 (calendário) permanece entregável sozinho e RF-GAM-05 é o candidato natural a corte, dado o congelamento de 17/11.
- **Compartilha `leitura`** com as demais features de leitura e **`social`** com as sociais — sinalizar no grupo (plano §6).
- Stack definida (arquitetura §2.1): `leitura` em NestJS, `social` em Spring.

## Timeline

### Documentação e secret 20/11/2026: secret `GOOGLE_SERVICES_JSON_BASE64` criado no GitHub.
- **Arquitetura v1.10:** situação do push em §2.7, §6 e §8.
- **Arquivo da F-NOT-OPC:** Firebase criado, DoD de merge e CI e a pendência de DES.
- **`3.requisitos.md`:** status de RF-GAM-04/05, RF-NOT-05/07 e das opcionais já mergeadas (RF-ACV-14/22, RF-DSF-05, RF-STA-04, RF-MOD-04) de "A iniciar" para "Em revisão".
- **Plano de testes:** seção 9.6.31 (CT-GAO-01 a 31) e CT-PER-17.
- **README do período:** contrato `lembrete.sequencia` como aprovado.

### Validação no emulador 20/11/2026: os quatro serviços rodaram localmente (banco e RabbitMQ de dev) e o app rodou num emulador Android 16 com Google Play, com o projeto Firebase `leai-ti5`. Antes, `verificar-firebase.mjs` conferiu as duas credenciais, e um envio `validate_only` ao FCM respondeu 200.
- **Cenário:** conta nova com três dias de leitura até ontem, registrados com o horário do aparelho, como no envio offline.
- **Calendário:** o toque no cartão do perfil abre a tela `Sequência`, com 17, 18 e 19/11 marcados, o anel em hoje, os dias futuros apagados e o aviso de hoje sem registro.
- **Push:** com o app em segundo plano, outra conta seguiu o leitor e o push "Lê Aí" chegou com visibilidade privada.
- **Lembrete:** o job publicou o lembrete e o push chegou com "Sua sequência está em 3 dias e hoje ainda não tem leitura registrada."; repetir a chave devolveu a mesma resposta e uma chave nova deu `jaLembrados`.
- **Destino:** o toque no push abriu a folha de registrar progresso da única leitura, e o item da lista in-app (ícone `Flame`, já lido) também. Depois do registro, a sequência foi a 4, o dia 20 ficou marcado e o job seguinte não selecionou mais o leitor.
- **Correção:** o helper do cartão do perfil cortava "1 página." com `maxLines: 3`; o limite saiu (divergência 7) e os testes de sequência e perfil passam.
- **Corrigido fora da feature:** o contador de seguidores do Meu perfil ficava em 0 depois de um novo seguidor, embora `GET /me/perfil` já devolvesse 1, porque a aba fica viva no shell e só relia o perfil ao voltar de uma tela empilhada. Agora `PerfilPage` ouve o canal de tempo real: seguidor novo, pedido criado ou aceito e a reconexão do canal releem o perfil em silêncio (CT-PER-17).

### Implementação 19/11/2026: depois do merge da F-NOT-OPC (#65), o evento foi definido como `lembrete.sequencia`. Com o aval do dono, ele entrou pontualmente no orquestrador (REQUISITOS v1.10 e arquitetura v1.9, §7.2 e §5.2).
- **`leitura`:** calendário mensal sobre `dia_leitura` com janela de seis meses, e job `POST /internal/jobs/lembrete-sequencia` com `eventId` UUID v5 e `inserirSeNovo` na outbox. Workflow `job-lembrete-sequencia.yml`.
- **`social`:** tipo `LEMBRETE_SEQUENCIA` no consumidor, com a frase do design.
- **Mobile:** tela `Sequência`, entrada pelo perfil e lembrete na lista e no push.
- **Validação:** lint e build do `leitura`; 321 testes unitários e 399 de integração no `leitura`; 365 no `verify` do `social`; `flutter analyze` e 1071 testes no mobile.
- **Falta:** DES e a demonstração em Android real, que dependem do merge na `main` e do Firebase de produção.

### Criação 01/09/2026: arquivo criado a partir do escopo de F-GAM-OPC no [periodo-3/README.md](README.md), de RF-GAM-04/05 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.12 e da RN-18. Calendário fixado como leitura derivada dos dias que F-GAM já persiste, sem tabela nova e com janela limitada; lembrete fixado como job diário em `leitura` publicando `sequencia.lembrete`, com chave de negócio por dia local e dedup na reexecução. O contrato do evento foi registrado como divergência de baseline, conforme exigência de F-NOT, e a dependência dura de push (F-NOT-OPC) foi declarada junto com a ordem das duas features na sprint.
