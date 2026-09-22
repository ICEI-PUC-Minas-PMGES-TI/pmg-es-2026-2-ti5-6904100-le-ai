# P0-MSG — Mensageria e integrações base

**Período:** 0 · **Prioridade:** fundação
**Dono:** a definir · **Serviços afetados:** transversal (os 4 serviços conectam ao broker) + integrações externas

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md). Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §2.3–2.7, §5, §8. Em caso de conflito, o `REQUISITOS.md` ganha.

## Objetivo

Deixar de pé o **encanamento genérico de mensageria** que os fluxos assíncronos do produto usam (RNF-ARQ-06) e validar a viabilidade dos serviços gratuitos da arquitetura antes de qualquer feature depender deles.

Esta feature possui duas frentes:

1. **Transporte assíncrono:** RabbitMQ no CloudAMQP, conexão nas duas stacks, outbox transacional, publisher confirms, consumidor idempotente, validação de schema, retry e DLQ.
2. **Provas das integrações gratuitas:** GitHub Actions `schedule` (P-08), Cloudinary (P-09), Brevo (P-02) e FCM Android (P-04).

### Fronteira de responsabilidade

P0-MSG define **como** uma mensagem é persistida, publicada, transportada, validada, repetida e descartada. Ela não define o `data` de eventos de negócio como `leitura.iniciada` ou `seguidor.novo`: esses schemas pertencem às features produtoras e ficam no catálogo canônico de [`../../mensageria/`](../../mensageria/README.md).

O implementador de uma feature de domínio apenas:

- grava o fato e a linha da outbox na mesma transação;
- usa o envelope e a topologia fixados aqui;
- publica/consome um schema já versionado em `docs/mensageria/schemas/`;
- grava o efeito e o recibo de consumo na mesma transação.

Requisitos atendidos: **RNF-ARQ-06**, **RNF-ERR-03/06/07/10**, **RNF-SEC-32**, **RNF-OBS-01** e as validações P-02/P-04/P-06/P-08/P-09.

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | implementado localmente | clientes AMQP, topologia, configuração condicional e conexão real com CloudAMQP validados; DES/HML ainda não foi executado |
| Dados | aplicado no Neon | colunas de backoff e tabelas de recibo estão aplicadas nos quatro schemas; revisão humana formal das migrations permanece obrigatória |
| Backend | implementado | conexão, dispatcher, publisher confirm, validação, consumer, retry e DLQ implementados nas duas stacks; prova real Spring → Nest concluída |
| Web | não aplicável | mensageria é server-side |
| Mobile | não iniciado | somente a prova de recebimento de push FCM em Android real (P-04) |

## Especificação

### Configuração e clientes

- CloudAMQP no plano gratuito *Little Lemur*.
- Cada serviço mantém **uma conexão** e channels separados para publicação e consumo; nunca uma conexão por consumidor.
- Spring usa `spring-boot-starter-amqp` em `identidade` e `social`.
- NestJS usa `amqplib` em `acervo` e `leitura`.
- Validação JSON Schema usa `networknt json-schema-validator` no Java e `ajv` + `ajv-formats` no TypeScript.
- `AMQP_ENABLED=false` permite subir local/teste sem broker. Com `AMQP_ENABLED=true`, `AMQP_URL` é obrigatório. DES/HML usa mensageria habilitada.
- Indisponibilidade do broker não transforma uma operação síncrona confirmada em erro nem derruba `/health`; a outbox preserva e republica o evento.
- Credenciais (`AMQP_URL`) só por variável de ambiente / GitHub Secrets (RNF-SEC-11), previstas no `.env.example` de [P0-INFRA](feature-P0-INFRA.md).
- Contas/credenciais das integrações (Cloudinary, Brevo, Firebase/FCM) provisionadas e guardadas como segredo. Para o Brevo, `BREVO_API_KEY` e `BREVO_SMTP_KEY` ficam exclusivamente no `identidade`; `BREVO_SENDER_EMAIL` deve ser um remetente verificado.

### Envelope v1

Todo evento usa exatamente este envelope:

```json
{
  "eventId": "01994c25-83cd-7d41-a9b4-1d9b71f34560",
  "type": "leitura.iniciada",
  "version": 1,
  "occurredAt": "2026-09-16T12:00:00Z",
  "correlationId": "16aa3308-daee-4638-b220-c306484f6a9c",
  "businessKey": "leitura:01994c24-dac3-72bd-a739-63290929d47f:iniciada",
  "data": {}
}
```

| Campo | Origem e semântica |
|---|---|
| `eventId` | `outbox_*.event_id`; identifica a entrega técnica e não muda em retry |
| `type` | `outbox_*.tipo`; também é a routing key |
| `version` | `outbox_*.versao`; seleciona o JSON Schema |
| `occurredAt` | `outbox_*.criado_em` em UTC; tempos do domínio permanecem em `data` |
| `correlationId` | `outbox_*.correlation_id`; propagado da requisição ou job originador |
| `businessKey` | `outbox_*.chave_negocio`; identifica o fato/agregado, mas não possui unicidade global |
| `data` | `outbox_*.payload`; conteúdo definido pela feature produtora |

O payload persistido na outbox contém **somente `data`**. O dispatcher monta o envelope final. Propriedades AMQP:

| Propriedade/header | Valor |
|---|---|
| `messageId` | `eventId` |
| `correlationId` | `correlationId` |
| `type` | nome do evento |
| `contentType` | `application/json` |
| `deliveryMode` | persistente |
| `x-event-version` | `version` |
| `x-business-key` | `businessKey` |

Header e corpo divergentes são mensagem inválida. O schema do envelope fica em [`../../mensageria/schemas/envelope-v1.schema.json`](../../mensageria/schemas/envelope-v1.schema.json).

### Versionamento

- A primeira versão de todo contrato é `1`.
- Schema publicado é imutável; alteração incompatível cria nova versão.
- Routing key não inclui versão.
- Cada consumidor declara as versões aceitas e rejeita as demais antes de executar domínio.
- `eventId` deduplica a mesma entrega. `businessKey` não é usado como unicidade genérica porque um agregado pode produzir vários fatos legítimos.

### Topologia

Exchanges duráveis e não auto-delete:

| Exchange | Tipo | Dono dos eventos |
|---|---|---|
| `leai.events.identidade` | `topic` | `identidade` |
| `leai.events.acervo` | `topic` | `acervo` |
| `leai.events.leitura` | `topic` | `leitura` |
| `leai.events.social` | `topic` | `social` |
| `leai.dead-letter` | `direct` | DLQ comum |

Cada serviço publica somente no exchange do domínio que possui. A routing key é o `type` exato.

Filas de negócio previstas para o Período 1, declaradas pela feature consumidora quando ela entrar:

| Fila | Exchange e bindings |
|---|---|
| `leai.acervo.importacao` | `leai.events.acervo`: `livro.importacao_solicitada` |
| `leai.acervo.sinopse` | `leai.events.acervo`: `livro.pagina_aberta` |
| `leai.social.feed` | `leai.events.leitura`: `leitura.iniciada`, `leitura.retomada`, `leitura.finalizada`, `leitura.abandonada`, `resenha.publicada`, `resenha.excluida` |
| `leai.social.notificacoes` | eventos de perfil em `identidade`, interações em `social` e inatividade em `leitura` |

Eventos sem consumidor no Período 1 são publicados sem fila acumuladora. O consumidor futuro executa backfill antes de declarar seu binding, conforme o README do período.

### Dispatcher da outbox

Cada serviço implementa o mesmo comportamento:

1. Seleciona até 50 linhas `pendente`, por `criado_em`, a cada 1 segundo.
2. Usa lock com `SKIP LOCKED` para duas instâncias não publicarem a mesma linha simultaneamente.
3. Publica mensagem persistente e aguarda publisher confirm.
4. Marca `publicado` e `publicado_em` somente após confirmação.
5. Em falha, incrementa `tentativas`, mantém `pendente` e tenta novamente com backoff limitado a 60 segundos.
6. Nunca descarta evento pendente por quantidade de tentativas.

### Consumo e recibo transacional

Cada schema recebe por nova migration uma tabela técnica, sem alterar migrations já aplicadas:

```text
mensagem_processada
- consumidor text
- event_id uuid
- processado_em timestamptz
PRIMARY KEY (consumidor, event_id)
```

- O consumidor valida envelope e `data` antes de iniciar a transação.
- Efeito de domínio e recibo são gravados na mesma transação do schema consumidor.
- Recibo já existente significa entrega duplicada: nenhum efeito é repetido e a mensagem recebe ACK.
- ACK ocorre somente após commit. Rollback não cria recibo e permite nova entrega.
- Deduplicação semântica adicional, como `(leituraId, inatividadeVersao, limiarDias)`, continua responsabilidade da feature.

### Retry e DLQ

Cada fila principal possui `<fila>.dlq`, ligada a `leai.dead-letter` pela routing key do nome da fila. A fila principal declara:

```text
x-dead-letter-exchange = leai.dead-letter
x-dead-letter-routing-key = <nome-da-fila>
```

| Falha | Tratamento |
|---|---|
| Envelope/schema/versão inválida | DLQ imediata, sem executar domínio |
| Erro permanente de domínio | DLQ imediata |
| Erro técnico transitório | tentativas após 1, 5 e 15 segundos |
| Falha após a terceira tentativa | `nack(requeue=false)` e DLQ |

Não há plugin de delayed messages, árvore de filas de retry ou redrive automático. As três retentativas ocorrem no processo consumidor, sobre a mesma entrega não confirmada, com `prefetch=1` por channel; isso é aceitável para o baixo volume do MVP e não ocupa outras filas/consumidores. Se o processo cair durante a espera, o broker reentrega e o recibo transacional impede efeito duplicado. Depois da tentativa inicial e das retentativas em 1, 5 e 15 segundos, o consumidor envia `nack(requeue=false)`. Redrive é manual e controlado, depois de corrigir a causa.

### Schemas canônicos

Os contratos neutros entre Java e TypeScript ficam em [`docs/mensageria`](../../mensageria/README.md):

```text
docs/mensageria/
├── README.md
├── catalogo.md
└── schemas/
    ├── envelope-v1.schema.json
    ├── common-v1.schema.json
    └── <evento>.v1.schema.json
```

P0-MSG entrega o envelope, os tipos comuns, `ping.teste` e os validadores. Cada feature entrega os schemas dos eventos que produz. O consumidor copia para seus recursos runtime apenas os schemas que aceita; o CI compara a cópia com o arquivo canônico para impedir divergência.

### Prova mínima entre stacks

- `identidade` publica `ping.teste` no exchange `leai.events.identidade`.
- `acervo` consome pela fila `leai.p0.ping`.
- A fila possui `leai.p0.ping.dlq`.
- Entrega duplicada produz um único efeito/recibo.
- Mensagem inválida vai diretamente à DLQ.
- Falha transitória percorre 1, 5 e 15 segundos e depois vai à DLQ.
- `correlationId` aparece nos logs das duas stacks.
- Publisher confirm marca a linha de outbox como publicada.

### Validações das integrações gratuitas

- **P-08 — agendador:** provar chamada HTTP autenticada por `schedule`; se indisponível no GitHub Classroom, usar cron-job.org sem mudar o endpoint.
- **P-09 — Cloudinary:** provar unsigned upload em preset restrito e transformação por URL em dois tamanhos.
- **P-02 — Brevo:** confirmar limite vigente, remetente verificado e entrega de e-mail transacional de teste.
- **P-06 — CloudAMQP:** registrar limites vigentes sob uma conexão por serviço.
- **P-04 — FCM:** receber push em dispositivo Android real; Firebase continua exclusivo para FCM.
- **Neon:** registrar o limite vigente junto de P0-DEPLOY.

## Critérios de aceite

- [x] Cada serviço conecta ao CloudAMQP com uma conexão e channels separados.
- [x] Envelope v1 é validado antes do domínio, incluindo versão e business key.
- [x] Dispatcher publica outbox com confirm e só então marca `publicado`.
- [x] Falha do broker mantém a operação síncrona confirmada e a linha pendente.
- [x] Recibo e efeito são atômicos; entrega duplicada não duplica efeito.
- [x] Schema inválido vai diretamente à DLQ.
- [x] Falha transitória tenta em 1/5/15 segundos e, depois, vai à DLQ.
- [x] `ping.teste` funciona de `identidade` para `acervo`, inclusive duplicação e DLQ.
- [x] `correlationId` atravessa o broker e aparece nos logs.
- [x] Exchanges, filas e DLQs usam exatamente os nomes documentados.
- [x] Eventos sem consumidor atual não criam fila acumuladora.
- [ ] `schedule` ou fallback foi validado em ambiente real.
- [ ] Cloudinary, Brevo, FCM, CloudAMQP e Neon tiveram limites/provas registrados.

## Definition of Done

- [x] Dependências AMQP e JSON Schema fixadas nas duas stacks
- [ ] Migrations de `mensagem_processada` revisadas por humano e aplicadas nos quatro schemas
- [x] Dispatcher, publisher, consumer, retry e DLQ reutilizáveis nos quatro serviços
- [x] Envelope, schemas comuns e `ping.teste` em `docs/mensageria/`
- [x] Testes automatizados de outbox, confirm, duplicação, validação, retry e DLQ
- [ ] Prova Spring → Node funcionando em DES/HML
- [x] Variáveis e segredos configurados sem valor versionado
- [ ] Limites e provas das integrações registrados na Timeline
- [ ] CI verde
- [ ] Arquivo da feature atualizado com status e pendências finais

OpenAPI é N/A para o broker. O endpoint interno do agendador entra no spec de `leitura` com F-EST.

## Pendências

- Depende de [P0-INFRA](feature-P0-INFRA.md) para serviços, banco, logs e correlation-id, e de [P0-CI](feature-P0-CI.md) para validações e `schedule`.
- Provisionamento e evidências das contas gratuitas precisam ser registrados; informação verbal de que estão configuradas não substitui a prova do critério de aceite.
- A revisão humana das novas migrations de recibo é obrigatória.
- Payloads de negócio não são pendência desta feature: ficam nos schemas das features produtoras.
- **Viabilidade das Actions `schedule` no GitHub Classroom não confirmada** (P-08) — se restrita, adotar cron-job.org.
- Cliente AMQP por serviço definido com a stack (02/09/2026): **Spring AMQP** em `identidade` e `social`; **`amqplib`** em `acervo` e `leitura`.
- Bibliotecas de validação definidas e implementadas: `networknt json-schema-validator` no Java e `ajv` + `ajv-formats` no TypeScript — RNF-SEC-32.
- Limites vigentes dos planos gratuitos a confirmar e anotar (Cloudinary, CloudAMQP, Brevo, Neon).
- Contrato de ambiente do Brevo preparado em `code/back/identidade/.env.example`, `application.yml`, `AppProperties` e `render.yaml`; as chaves reais não são versionadas.
- Clientes AMQP implementados em 19/09/2026: Spring AMQP em `identidade`/`social` e `amqplib` em `acervo`/`leitura`, com `AMQP_ENABLED=false` por padrão local.
- Validadores Draft 2020-12, envelope v1, `ping.teste`, dispatcher de outbox, publisher confirm, recibo idempotente, retry e DLQ implementados em 19/09/2026. Testes locais atuais: `acervo` 13/13, `leitura` 12/12; testes Java direcionados de mensageria: `identidade` 5/5 e `social` 4/4.
- Migrations aplicadas no Neon em 19/09/2026; as quatro tabelas `mensagem_processada` e as colunas `proxima_tentativa_em` foram confirmadas nos schemas corretos.
- Prova real concluída em 19/09/2026: o evento `b546119f-3916-4f82-b2fa-04a628f4c5de` foi publicado por `identidade`, recebido por `acervo` e gravado como `acervo.p0.ping`; três eventos pendentes anteriores também foram drenados.
- Validação local 20/09/2026: testes de consumidor NestJS cobrem topologia, recibo idempotente, validação, retry e DLQ; ESLint focado nos arquivos RabbitMQ não apresentou erros. O lint global ainda possui falhas preexistentes de fim de linha em arquivos fora desta alteração.

## Timeline

### Consolidação 16/09/2026: envelope v1, versionamento, nomes de exchanges/filas/DLQs, dispatcher, recibo transacional, retry e fronteira com eventos de negócio foram fechados para evitar decisões incompatíveis entre os quatro serviços.

### DER 16/09/2026: as quatro tabelas de outbox foram versionadas e implantadas como baseline física. Isso não implementa conexão, dispatcher, consumo ou DLQ.

### Revisão 01/09/2026: outbox transacional aprovada como garantia de RNF-ERR-10; mapa atualizado com atividades, progresso/conclusão, exclusão de resenha/conta e recomendação P2P.

### Criação 25/08/2026: arquivo criado a partir do escopo de P0-MSG e da arquitetura §2.3–2.7, §5 e §8.
### Implementação 19/09/2026: clientes AMQP, topologia, envelope/validação, dispatcher de outbox, publisher confirm, consumer idempotente, retry e DLQ foram implementados nas duas stacks. Os testes unitários existentes passaram nos quatro serviços; a prova real foi registrada na validação abaixo.

### Validação real 19/09/2026: migrations aplicadas no Neon e conexão CloudAMQP confirmada. Após corrigir a serialização Java de `OffsetDateTime` para `string` ISO-8601 no envelope, a prova `identidade` → `acervo` passou; a outbox ficou `publicado` e o recibo idempotente foi gravado.

### Configuração de ambiente 19/09/2026: variáveis do Brevo preparadas no serviço `identidade` e no blueprint do Render. A prova real de envio permanece pendente até preencher as chaves no ambiente e confirmar o remetente verificado.
