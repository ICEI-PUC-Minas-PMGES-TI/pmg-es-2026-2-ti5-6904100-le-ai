# F-GAM — Sequência diária (streak)

**Período:** 2 · **Prioridade:** desejavel
**Dono:** a definir · **Serviços afetados:** `leitura` (backend) + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.12 (RF-GAM-01, 02, 03), RN-18, §2.1. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar a **sequência diária de leitura (streak)** — o mecanismo de hábito que recompensa dias com leitura efetiva. **Fora do escopo web** (§2.1: gamificação não faz parte do cliente Vue). Fecha os requisitos **Desejáveis**:

- **RF-GAM-01** manter a **sequência diária**, incrementada em cada dia com registro de progresso (RN-18);
- **RF-GAM-02** visualizar a **sequência atual** e a **maior sequência já alcançada**;
- **RF-GAM-03** **zerar** a sequência quando um dia se encerra sem registro de progresso.

RNF atendidos: **RNF-ARQ-06** (atualização por fluxo assíncrono), **RNF-ERR-06/07** (consumidor idempotente + DLQ), **RNF-SEC-02** (dados do próprio usuário), **RNF-SEC-32** (schema de mensagem).

O escopo de gamificação é **só o streak** (mais os desafios de [F-DSF](feature-F-DSF.md)): **medalhas e ranking estão fora** (§11).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | registro de dias-com-leitura + sequência atual/maior |
| Backend | não iniciado | `leitura`: efeito acionado após progresso (data local RN-18.2), zeramento |
| Web | não aplicável | **fora do escopo web** (§2.1) |
| Mobile | não iniciado | ver sequência atual e maior alcançada |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). Só os dados do **próprio usuário** (SEC-02).

- **Atualização (RF-GAM-01):** marca o dia com leitura usando a data local persistida por F-PRG. Se `progresso.registrado` for promovido, consome com schema/idempotência/DLQ; enquanto candidato, F-PRG chama o mesmo efeito local após confirmar a atualização, sem criar outro evento interno.
- **`GET /me/sequencia`** (RF-GAM-02) — **sequência atual** e **maior já alcançada**.

**Regras de RN-18:**
- Um dia **conta** quando há **≥1 atualização de progresso com ≥1 página lida** (RN-18.1) — concluir/iniciar/abandonar **não** conta por si.
- Contada em **dias de calendário no fuso do dispositivo** no momento do registro (RN-18.2).
- Incrementa **no máximo 1×/dia**, independentemente de quantas atualizações (RN-18.3).
- **Zerada (RF-GAM-03, RN-18.4)** quando um dia de calendário **se encerra sem registro** — sem congelamento, recuperação ou compensação (RN-18.5, coerente com não haver registro retroativo — RN-17).
- **Maior sequência preservada** (RN-18.6), ainda que a atual zere.
- Medida em **dias com leitura**, nunca em tempo (RN-18.7).

**Zeramento — implementação enxuta:** é derivado ao consultar/atualizar a sequência, sem job novo. O serviço compara o último dia com leitura ao dia corrente calculado no **último fuso registrado pelo dispositivo**; havendo dia vazio, a atual é 0 e a maior permanece. Novo progresso atualiza o fuso conhecido. Isso usa apenas os dados persistidos por F-PRG e não depende do fuso de quem consulta.

**Modelo de dados** (schema `leitura`): dias com leitura por usuário (data local), último fuso do dispositivo, sequência atual e maior sequência. Sem leitura cruzada de outro schema.

### App Flutter (`code/mobile`)

- Exibe a **sequência atual** e a **maior alcançada**; usa `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md) (componente de streak). Alvo de demonstração Android.

## Critérios de aceite

- [ ] Um dia conta para a sequência só com **≥1 progresso com ≥1 página lida** (RN-18.1); concluir/iniciar/abandonar não conta.
- [ ] A sequência usa **data local** do dispositivo (RN-18.2) e incrementa **1×/dia** no máximo (RN-18.3).
- [ ] A sequência **zera** quando um dia de calendário se encerra sem registro (RF-GAM-03, RN-18.4); sem recuperação retroativa (RN-18.5).
- [ ] **Sequência atual** e **maior alcançada** aparecem corretamente; a maior é preservada quando a atual zera (RF-GAM-02, RN-18.6).
- [ ] Atualização é idempotente; se o evento for aprovado, também cobre retentativa/DLQ.
- [ ] Zeramento derivado usa o último fuso registrado e não cria job próprio.
- [ ] A sequência funciona no app **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: página lida, 1×/dia, mudança/último fuso, zeramento por dia vazio, maior sequência e idempotência (RNF-TST-02)
- [ ] Com evento aprovado, testes cobrem duplicação/DLQ; na alternativa local, integração cobre repetição sem segundo efeito (RNF-TST-02/03)
- [ ] Testes mobile cobrem exibição da sequência e indisponibilidade/timeout com API simulada (RNF-TST-04/06)
- [ ] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com o endpoint de sequência
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

## Pendências

- **Depende de** [F-PRG](../periodo-1/feature-F-PRG.md) (`progresso.registrado` **com data local persistida** — RN-18.2), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md), [P0-MSG](../periodo-0/feature-P0-MSG.md).
- **Divergência de baseline — fluxo candidato:** `progresso.registrado` está em §7.2 como **candidato** ("sequência diária"), **não** entre os seis fechados (arch §5.2). Promover nos documentos-mestre **ou** definir integração alternativa antes de implementar; não alterar a baseline silenciosamente.
- **Fronteira:** **calendário de dias com progresso** (RF-GAM-04) e **lembrete push** (RF-GAM-05, depende de push/P-04) são Opcionais → **F-GAM-OPC** (Período 3).
- **Compartilha `leitura`** com as demais features de leitura — sinalizar no grupo (plano §6). A sequência é limpa por [F-CONTA-2](feature-F-CONTA-2.md) na exclusão.
- Stack de `leitura` ainda pendente (P0-INFRA).

## Timeline

### Criação 28/08/2026: arquivo criado a partir do escopo de F-GAM no [periodo-2/README.md](README.md), de RF-GAM-01/02/03 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.12 e da RN-18. Streak medido em dias com leitura pela data local de F-PRG; consumo de `progresso.registrado` marcado como fluxo candidato de §7.2 (pendência de baseline); calendário e lembrete push adiados ao Período 3.

### Revisão 29/08/2026: zeramento foi simplificado para derivação no próprio serviço usando dias locais e o último fuso registrado; não há job novo. Calendário e lembrete continuam no Período 3.
