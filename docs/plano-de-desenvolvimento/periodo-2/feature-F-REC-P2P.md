# F-REC-P2P — Recomendação entre usuários + aba unificada

**Período:** 2 · **Prioridade:** desejavel
**Dono:** a definir · **Serviços afetados:** `social` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.13 (RF-REC-01..07, 13, 14, 15, 16), RN-22, §10.8. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.2 (ajuste 3), §4.2, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar a **recomendação de livro entre usuários (P2P)** — no modelo de conteúdo compartilhado, sem aceitar/recusar (RN-22) — e a **aba Recomendações** que funciona já só com a fonte P2P. Fecha os requisitos **Desejáveis**:

- **RF-REC-01** recomendar um livro a **um ou mais leitores** de uma vez, só entre **seguimento mútuo**;
- **RF-REC-03** acompanhar **mensagem opcional**;
- **RF-REC-02** o destinatário **recebe notificação** (RF-NOT-01);
- **RF-REC-04** visualizar as recomendações **recebidas** (livro, quem recomendou, mensagem);
- **RF-REC-05** ao acionar, ir à **página do livro**;
- **RF-REC-06** impedir recomendação de **livro pessoal** (inacionável — RN-15);
- **RF-REC-07** impedir envio sem mútuo, quando o destinatário **já tem o livro** na estante, ou ao **limite** de RN-22;
- **RF-REC-15** **descartar** uma recomendação recebida, sem motivo e **sem** avisar o remetente;
- **RF-REC-16** **remover automaticamente** as recomendações de um livro quando o destinatário o **adiciona à estante**;
- **RF-REC-13** apresentar uma **aba Recomendações** reunindo as fontes em seções distintas;
- **RF-REC-14** a aba funciona **só com P2P** quando a algorítmica não estiver disponível.

RNF atendidos: **RNF-SEC-02/03** (propriedade e privacidade no servidor), **RNF-SEC-18** (rate limiting no envio), **RNF-DES-02** (listagens paginadas), **RNF-ERR-04/06/07** (idempotência + consumidor idempotente/DLQ), **RNF-ARQ-06** (fluxos assíncronos).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | tabela `recomendacao`; publisher/consumer de `recomendacao.recebida`; consumidor de `livro.adicionado_a_estante` |
| Backend | não iniciado | `social`: envio, recebidas, descarte owner-only, remoção automática, notificação e aba |
| Web | não iniciado | recomendar, ver recebidas, descartar, aba Recomendações (seção P2P) |
| Mobile | não iniciado | mesmas telas + a notificação de recebida |

## Especificação

### Backend / API — `social`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas). A recomendação **não tem máquina de estados** (§10.8): existe ou não — as quatro vias de remoção convergem para a mesma operação.

- **`POST /recomendacoes`** (RF-REC-01/03/06/07, RN-22.1-5) — livro + **destinatários[]** + mensagem opcional; gera **uma recomendação independente por destinatário**. O servidor **bloqueia** quando:
  - não há **seguimento mútuo** (`v_seguimento_aceito_v1` nos dois sentidos) — RN-22.1;
  - o destinatário **já tem o livro** na estante em qualquer status (`v_estante_publica_v1`) — RN-22.3, com aviso "já tem esse livro";
  - o livro é **pessoal** (`v_livro_referencia_v1`, `tipo=pessoal`) — RF-REC-06, RN-22.5;
  - o par remetente→destinatário atingiu **50 recomendações ativas** (RN-22.4).
  - **Rate limiting** (SEC-18).
- **`GET /recomendacoes/recebidas?page=`** (RF-REC-04) — **paginado**; cada item com o livro, quem recomendou e a mensagem quando houver. Acionar leva à **página do livro** (RF-REC-05). Só ativas e **não expiradas** (filtro de 90 dias — RN-22.9).
- **`DELETE /recomendacoes/{id}`** (RF-REC-15, RN-22.11) — **descarte individual exclusivo do destinatário autenticado** (SEC-02), sem motivo e **sem** avisar o remetente. Id conhecido por terceiro retorna negação. O descarte em lote de RN-22.12/13 é RF-REC-17, Opcional → F-REC-ALG.
- **Remoção automática (RF-REC-16, RN-22.10):** ao o destinatário **adicionar o livro à estante**, **todas** as recomendações daquele livro recebidas por ele são removidas. Implementado consumindo **`livro.adicionado_a_estante`** (produzido por [F-EST](../periodo-1/feature-F-EST.md)); consumidor **idempotente** (RNF-ERR-06) + **DLQ** (RNF-ERR-07).
- **Expiração (RN-22.9):** 90 dias por filtro na consulta + **remoção física** em rotina periódica (sem exigir precisão de horário — §10.8).
- **Recebimento (RN-22.6-8/15):** sem aceitar/recusar; um livro pode ser recomendado por **vários remetentes** (coexistem); recomendações já enviadas **permanecem** ainda que o mútuo se desfaça depois (RN-22.15). Cada recebimento gera notificação (ver evento).

**Aba unificada (RF-REC-13/14):** a **aba Recomendações** apresenta a seção **P2P** (recebidas) em seção rotulada e **funciona sem** a recomendação algorítmica (RF-REC-14); a shell é construída para acomodar a seção algorítmica quando ela existir (F-REC-ALG).

**Evento produzido e consumido:** **`recomendacao.recebida`** (RF-REC-02, RF-NOT-01), contrato aprovado. É gravado na outbox após cada recomendação criada e consumido por F-NOT com schema, idempotência e DLQ. Novo envio após descarte/expiração cria novo id; reentrega do mesmo fato não duplica.

**Eventos consumidos:** `livro.adicionado_a_estante` (para RF-REC-16).

**VIEWs consumidas:** `v_seguimento_aceito_v1`/`v_perfil_referencia_v1` (identidade), `v_livro_referencia_v1` (acervo), `v_estante_publica_v1` (leitura). `social` não lê tabelas cruas.

**Modelo de dados** (schema `social`): `recomendacao` (remetente, destinatário, livro, mensagem opcional, criada_em/expira_em, `eventId` de dedup) — sem estado de aceitação (§10.8). Índice para o limite por par e para a expiração.

### Frontend Web (`code/front`)

- **Recomendar** (selecionar livro + destinatários com mútuo + mensagem), **ver recebidas**, **descartar**, e a **aba Recomendações** com a seção P2P (rotulada, funcionando sem a algorítmica). Usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md). Bloqueios (sem mútuo / já tem o livro / limite) com mensagem clara.

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); a **notificação de recomendação recebida** aparece na lista de [F-NOT](../periodo-1/feature-F-NOT.md). Alvo de demonstração Android.

## Critérios de aceite

- [ ] Enviar exige **seguimento mútuo**; bloqueia livro **pessoal**, destinatário que **já tem** o livro e o **limite de 50 ativas** por par (RF-REC-01/06/07, RN-22.1-5); rate limiting ativo (SEC-18); vários destinatários geram uma recomendação cada.
- [ ] Ver recebidas (paginado) com livro/remetente/mensagem; acionar leva à **página do livro** (RF-REC-04/05); expiradas (90 dias) não aparecem.
- [ ] Descarte individual é exclusivo do destinatário, **sem motivo** e **sem** avisar o remetente (RF-REC-15, SEC-02).
- [ ] Adicionar o livro à estante **remove todas** as recomendações dele (RF-REC-16) via `livro.adicionado_a_estante`; consumidor **idempotente** + DLQ.
- [ ] `recomendacao.recebida` usa `recomendacaoId`, é publicado após a escrita e gera uma notificação no destinatário sem suprimir novo envio futuro.
- [ ] A **aba** mostra a seção P2P e **funciona sem** a algorítmica (RF-REC-13/14).
- [ ] Recomendação P2P funciona **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `social`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: regras de envio, descarte pelo destinatário e negativa para terceiro/remetente, expiração, remoção automática, paginação e idempotência (RNF-TST-02)
- [ ] Testes assíncronos: publicação/consumo/DLQ de `recomendacao.recebida` e consumo de `livro.adicionado_a_estante` com duplicação e DLQ (RNF-TST-03)
- [ ] Testes web/mobile cobrem envio com bloqueios, aba P2P e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `social` atualizado em `docs/api/social.yaml`** com recomendações e o schema de `recomendacao.recebida`
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** entregar o contrato aprovado de `recomendacao.recebida`, seu consumidor de notificação e o novo consumo de `livro.adicionado_a_estante` por `social`.

## Pendências

- **A "aba Recomendações" de RF-REC-13 é uma SEÇÃO dentro da aba `Descobrir`, não um item de navegação.** Decidido em 01/09/2026 junto da criação de `Descobrir` ([P0-NAV](../periodo-0/feature-P0-NAV.md)): a barra inferior tem quatro itens (Estante, Descobrir, Feed, Perfil) e esse é o teto. Um quinto item apertaria o rótulo em `caption` no mobile e fragmentaria descoberta em duas áreas que fazem a mesma coisa. RF-REC-13 pede que a aba "reúna as fontes em seções distintas" e RF-REC-14 que ela funcione só com P2P: as duas exigências são atendidas por uma seção rotulada dentro de `Descobrir`, que hoje aterrissa quase vazia ([`descobrir.md`](../../design/periodo-1/F-ACV-BUSCA/descobrir.md) §4.6). **Se o grupo preferir aba própria**, a decisão volta pelo plano §3 e o impacto é o shell replicado em seis prompts de design.
- **Depende de** [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (mútuo), [F-EST](../periodo-1/feature-F-EST.md) (`v_estante_publica_v1`, `livro.adicionado_a_estante`), [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md)/[F-ACV-CADASTRO](../periodo-1/feature-F-ACV-CADASTRO.md) (`v_livro_referencia_v1`, página do livro), [F-NOT](../periodo-1/feature-F-NOT.md) (consumo da notificação), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md), [P0-MSG](../periodo-0/feature-P0-MSG.md).
- **Decisões do dono:** definir semântica de falha parcial e formato de resposta por destinatário no envio múltiplo, além dos limites de destinatários e caracteres da mensagem.
- **Alternativa a avaliar, sem mudar o desenho atual:** aplicar expiração apenas por `expira_em` nas consultas e adiar a remoção física para manutenção, sem job próprio da feature.
- **Fronteira:** recomendação algorítmica e descarte em lote são F-REC-ALG/P3. Opt-out aprovado, incorporado em 15/09/2026, pertence àquela feature; contador de três descartes e supressão da pergunta são temporários por sessão do cliente.
- **Compartilha `social`** com as demais features sociais; recomendações limpas por [F-CONTA-2](feature-F-CONTA-2.md) na exclusão — sinalizar no grupo (plano §6).
- Stack de `social` definida: **Spring (Java)** (arquitetura §2.1).

## Timeline

### Revisão 15/09/2026: fronteira atualizada com opt-out aprovado e estado local temporário de descartes em F-REC-ALG. P2P continua sem novas tabelas ou máquina de aceitação.

### Revisão 01/09/2026: `recomendacao.recebida` e consumo de `livro.adicionado_a_estante` por `social` aprovados; falha parcial/limites ficaram como decisões do dono.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-REC-P2P no [periodo-2/README.md](README.md), de RF-REC-01..07/13/14/15/16 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.13 e da RN-22/§10.8. Modelo sem aceitação, quatro vias de remoção e limite de 50 fixados; `recomendacao.recebida` e o novo consumo de `livro.adicionado_a_estante` registrados como pendências de baseline; algorítmica e descarte em lote adiados ao Período 3.

### Revisão 29/08/2026: descarte passou a ser explicitamente owner-only; `recomendacao.recebida` usa a identidade da recomendação para não confundir reentrega com novo envio. O mapeamento consumidor de notificação passou a integrar a própria feature, condicionado à aprovação da baseline.
