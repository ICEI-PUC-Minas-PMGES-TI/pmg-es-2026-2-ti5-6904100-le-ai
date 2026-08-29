# P0-MSG — Mensageria e integrações base

**Período:** 0 · **Prioridade:** fundação
**Dono:** a definir · **Serviços afetados:** transversal (os 4 serviços conectam ao broker) + integrações externas

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md). Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §2.3–2.7, §5, §8. Em caso de conflito, o `REQUISITOS.md` ganha.

## Objetivo

Deixar de pé o **encanamento de mensageria** que os fluxos assíncronos do produto vão usar (RNF-ARQ-06) e **validar a viabilidade dos serviços gratuitos** que a arquitetura §8 lista como "itens a validar no período-0" — antes de qualquer feature depender deles.

Duas frentes:

1. **Broker conectado:** RabbitMQ no **CloudAMQP** (plano gratuito *Little Lemur*), com **uma conexão por serviço** (arquitetura §2.3) e o esqueleto de publisher/consumer resiliente — idempotência (RNF-ERR-06), dead-letter queue (RNF-ERR-07), validação de schema de mensagem (RNF-SEC-32) e backoff (RNF-ERR-03). A garantia durável exigida por RNF-ERR-10 permanece pendente de decisão arquitetural.
2. **Prova de conceito das integrações gratuitas:** confirmar, em ambiente real, GitHub Actions `schedule` (agendador, P-08), Cloudinary (imagens, P-09), Brevo (e-mail, P-02) e FCM (push Android, P-04) — cada um com uma chamada mínima que prova que funciona no free tier.

Esta feature **não implementa nenhum fluxo de negócio** (notificações, ingestão, cache de capas etc.) — só o encanamento e as validações. Os fluxos entram com suas features de domínio no Período 1+.

Requisitos atendidos: **RNF-ARQ-06** (mensageria), **RNF-ERR-03/06/07** (resiliência assíncrona), **RNF-SEC-32** (validação de schema de mensagem), **RNF-OBS-01** (correlation-id propagado na mensagem), e os "itens a validar no período-0" (arquitetura §8: P-02, P-04, P-06, P-08, P-09). RNF-ERR-10 só poderá ser marcado como atendido após a decisão sobre garantia durável entre commit e publicação.

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | conta CloudAMQP + credenciais das integrações a provisionar |
| Backend | não iniciado | conexão + esqueleto publisher/consumer/DLQ nos 4 serviços |
| Web | não aplicável | mensageria é server-side |
| Mobile | não iniciado | só o teste de recebimento de push FCM em Android real (P-04) |

## Especificação

### Infra — RabbitMQ (CloudAMQP) e integrações

- **CloudAMQP** plano gratuito *Little Lemur*: limite de conexões (na ordem de 20) e de mensagens/mês. Por isso **cada serviço mantém uma única conexão e vários channels**, nunca conexão por consumidor (arquitetura §2.3).
- Credenciais (`AMQP_URL`) só por variável de ambiente / GitHub Secrets (RNF-SEC-11), previstas no `.env.example` de [P0-INFRA](feature-P0-INFRA.md).
- Contas/credenciais das integrações (Cloudinary, Brevo, Firebase/FCM) provisionadas e guardadas como segredo.

### Backend — esqueleto de mensageria (contrato de comportamento, 2 stacks)

O broker é comum; cada stack usa seu cliente maduro (arquitetura §2.3): **Spring AMQP** no Java, **`amqplib`** no Node. O comportamento observável é o mesmo.

- **Topologia base:** um *topic exchange* por domínio de evento, filas nomeadas por consumidor, e **dead-letter exchange + DLQ** para cada fila (RNF-ERR-07). Bindings por routing key.
- **Publisher:** publica **depois** da escrita síncrona confirmada (arquitetura §5.1); falha ao publicar é logada e **não desfaz** a operação síncrona. Esse comportamento, isoladamente, não garante o reprocessamento de RNF-ERR-10.
- **Consumer:** **idempotente** (tolera entrega duplicada — RNF-ERR-06), usando chave de idempotência/dedup; **valida o schema** da mensagem antes de processar (RNF-SEC-32); em falha, **retentativa com backoff** e, esgotadas as tentativas, a mensagem vai para a **DLQ** sem bloquear a fila principal (RNF-ERR-03/07).
- **Correlation-id** propagado no header/property da mensagem, ligado ao log estruturado (RNF-OBS-01) definido em [P0-INFRA](feature-P0-INFRA.md).
- **Envelope de mensagem padrão** (referência para todos os fluxos):
  ```json
  {
    "eventId": "uuid",           // idempotência/dedup
    "type": "livro.adicionado_a_estante",
    "occurredAt": "2026-08-25T12:00:00Z",
    "correlationId": "uuid",
    "data": { }                   // validado por schema do evento (RNF-SEC-32)
  }
  ```
- **Mapa de eventos v1** (arquitetura §5.2) — referência de para onde o encanamento vai servir; **não implementar aqui**, só garantir que publicar/consumir/DLQ funcionam com um evento de teste:

  | Fluxo | Evento(s) | Produtor | Consumidor |
  |---|---|---|---|
  | Notificações in-app | `seguidor.novo`, `solicitacao.*`, `atividade.curtida`, `atividade.comentada`, `comentario.respondido`, `usuario.mencionado`, `resenha.curtida`, `leitura.em_risco`, `leitura.expirada` | identidade, leitura, social | social (+ FCM Android) |
  | Expiração de leituras | `leitura.em_risco`, `leitura.expirada` | leitura (job diário) | leitura, social |
  | Ingestão de livros | `livro.importacao_solicitada` | acervo | acervo |
  | Cache de capas | `livro.adicionado_a_estante` | leitura | acervo |
  | Busca de sinopse | `livro.pagina_aberta` | acervo | acervo |
  | Nota agregada | `nota.alterada` | leitura | acervo |

- **Prova mínima:** um evento de teste (`ping.teste`) publicado por um serviço e consumido por outro, com um caso que força ida à DLQ, comprovando idempotência e dead-lettering.

### Validações de free-tier (itens a validar no período-0 — arquitetura §8)

Cada item vira um teste mínimo que prova viabilidade **no ambiente real**, não uma promessa:

- **P-08 — GitHub Actions `schedule`:** confirmar que o **repositório do GitHub Classroom** permite workflow agendado (roda só na branch default, pode atrasar em pico, desativa após ~60 dias de inatividade do repo). Prova: um workflow `schedule` que faz uma chamada HTTP autenticada a um endpoint interno de teste. **Se as Actions estiverem restritas, migrar para cron-job.org sem mudar o desenho** (o job continua sendo uma chamada HTTP).
- **P-09 — Cloudinary:** confirmar limites vigentes do plano gratuito e testar **transformação por URL** + **unsigned upload preset** (pasta/tipos/tamanho fixados no preset — RNF-SEC-20). Prova: upload de uma imagem de teste e recuperação em dois tamanhos por URL.
- **P-02 — Brevo:** confirmar 300 e-mails/dia e **verificação de remetente**; enviar um e-mail transacional de teste (o único fluxo real será o reset de senha, RF-AUT-04, no Período 1).
- **P-06 — CloudAMQP:** confirmar limites (conexões, mensagens/mês) do *Little Lemur* sob o modelo de uma conexão por serviço.
- **P-04 — FCM (Android):** projeto Firebase **só para FCM** (nada de Firestore/Auth — arquitetura §2.7). Prova: **emitir um push para um dispositivo Android real** de demonstração. iOS fica em in-app (sem APNs pago).
- **Neon:** confirmar limites do plano gratuito (compartilhado com [P0-DEPLOY](feature-P0-DEPLOY.md)).

## Critérios de aceite

- [ ] Cada serviço conecta ao CloudAMQP com **uma conexão** (vários channels), sem estourar o limite do free tier.
- [ ] Um evento de teste é publicado por um serviço e consumido por outro, com `correlation-id` propagado.
- [ ] Uma mensagem que falha repetidamente vai para a **DLQ** sem travar a fila principal; consumidor comprovadamente **idempotente** (entrega duplicada não duplica efeito).
- [ ] Mensagem com schema inválido é rejeitada antes do processamento (RNF-SEC-32).
- [ ] Falha ao publicar não desfaz a operação síncrona correspondente; RNF-ERR-10 permanece pendente até ser definido e testado o mecanismo de reprocessamento durável.
- [ ] `schedule` do GitHub Actions dispara no repo da faculdade **ou** o fallback cron-job.org está validado (P-08).
- [ ] Upload + transformação por URL no Cloudinary funcionam no free tier (P-09).
- [ ] E-mail transacional de teste entregue pelo Brevo com remetente verificado (P-02).
- [ ] Push FCM recebido em **dispositivo Android real** (P-04).
- [ ] Limites vigentes de CloudAMQP, Cloudinary, Brevo e Neon anotados nas Pendências/Timeline.

## Definition of Done

(plano §10)

- [ ] Esqueleto de mensageria mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](feature-P0-CI.md))
- [ ] Testes automatizados: **publicação, consumo, idempotência e DLQ** do evento de teste (RNF-TST-03 pede exatamente isso para fluxos assíncronos)
- [ ] Spec OpenAPI do serviço atualizado em `docs/api/` — **N/A para o broker** (mensageria não é HTTP); os endpoints internos usados pelo `schedule` entram no spec do serviço dono quando existirem
- [ ] Fluxo funcionando em DES/HML — broker conectado a partir dos serviços em DES ([P0-DEPLOY](feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver (N/A)

**Item próprio:** registrar em Timeline os **limites confirmados** de cada serviço gratuito (o resultado das validações é entregável desta feature).

## Pendências

- **Depende de [P0-INFRA](feature-P0-INFRA.md)** (serviços de pé, log/correlation-id) e conversa com [P0-CI](feature-P0-CI.md) (o workflow `schedule` vive no mesmo `.github/`).
- **Viabilidade das Actions `schedule` no GitHub Classroom não confirmada** (P-08) — se restrita, adotar cron-job.org.
- Cliente AMQP concreto por serviço depende da stack alocada (pendência de P0-INFRA): Spring AMQP ou `amqplib`.
- Definir a **biblioteca de validação de schema de mensagem** por stack (ex.: JSON Schema com validador Java/Node) — RNF-SEC-32.
- Decidir o mecanismo de garantia durável entre o commit no banco e a publicação no broker. Filas duráveis, publisher confirms e DLQ não recuperam evento que nunca chegou ao RabbitMQ; outbox transacional é candidata, não decisão tomada.
- Limites vigentes dos planos gratuitos a confirmar e anotar (Cloudinary, CloudAMQP, Brevo, Neon).

## Timeline

### Criação 25/08/2026: arquivo criado a partir do escopo de P0-MSG no [periodo-0/README.md](README.md) e do [`documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §2.3–2.7, §5 e §8 (itens a validar no período-0). Fluxos de negócio deliberadamente fora de escopo aqui — só o encanamento e as validações de free-tier.
