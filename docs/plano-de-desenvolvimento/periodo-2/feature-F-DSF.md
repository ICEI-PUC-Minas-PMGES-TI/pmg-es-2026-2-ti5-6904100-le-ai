# F-DSF — Desafios

**Período:** 2 · **Prioridade:** desejavel
**Dono:** a definir · **Serviços afetados:** `leitura` (backend) + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.7 (RF-DSF-01..04, 06), RN-20, RN-04, §2.1. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar os **desafios de leitura** — o mecanismo de "meta" do produto. **Fora do escopo web** (§2.1: desafios não fazem parte do cliente Vue). Fecha os requisitos **Desejáveis**:

- **RF-DSF-01** criar **um ou mais desafios simultâneos**, escolhendo **unidade** (páginas, minutos ou livros), **janela** (diária, semanal, mensal ou anual) e valor-alvo;
- **RF-DSF-02** atualizar os desafios de **páginas** e **minutos** a cada **atualização de progresso**;
- **RF-DSF-03** visualizar o progresso de cada desafio na **janela corrente**;
- **RF-DSF-04** **editar, pausar e excluir** desafios;
- **RF-DSF-06** atualizar os desafios de **livros** a cada **leitura finalizada**.

RNF atendidos: **RNF-ARQ-06** (atualização por fluxo assíncrono), **RNF-ERR-06/07** (consumidor idempotente + DLQ), **RNF-SEC-02** (propriedade no servidor), **RNF-SEC-32** (schema de mensagem), **RNF-ERR-04** (idempotência das escritas), **RNF-DES-02** (listagens paginadas).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | tabelas `desafio` e progresso por janela; consumidores de progresso/finalização |
| Backend | não iniciado | `leitura`: CRUD de desafios + atualização por eventos, janelas de calendário (RN-20) |
| Web | não aplicável | **fora do escopo web** (§2.1) |
| Mobile | não iniciado | criar/editar/pausar/excluir + progresso da janela corrente |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Valida **propriedade** (SEC-02). Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas).

- **CRUD (RF-DSF-01/04):** `POST /desafios` (unidade `paginas|minutos|livros`, janela `diaria|semanal|mensal|anual`, valor-alvo), `PATCH /desafios/{id}` (editar), `POST /desafios/{id}/pausar` (e retomar), `DELETE /desafios/{id}`. Vários desafios ativos simultâneos por usuário (RN-20).
- **Progresso da janela corrente (RF-DSF-03):** `GET /desafios` — cada desafio com o acumulado da **janela corrente** e o alvo; paginado (RNF-DES-02).
- **Atualização por eventos (RF-DSF-02/06):** consome os contratos aprovados **`progresso.registrado`** e **`leitura.finalizada`**. Os campos de data/fuso posicionam o fato na janela de calendário. Consumidor idempotente por fato e com DLQ; backfill cobre fatos anteriores.

**Regras de RN-20:**
- Janelas são de **calendário** (não períodos móveis) no **fuso do dispositivo** (RN-20.1), como em RN-18.
- Desafio criado no **meio de uma janela considera o já registrado** nela (RN-20.2) — o servidor faz uma **consulta histórica** sobre `progresso`/`leitura` do **próprio schema `leitura`** (mesma service; sem VIEW cross-schema).
- **Livros** contam ao serem **finalizados** (RN-20.3): releitura finalizada conta; releitura incompleta e leitura abandonada **não** contam (RN-04).
- **Livros pessoais contam** (RN-20.4), coerente com as estatísticas.
- Desafio **pausado não acumula** e sua janela corrente não é avaliada (RN-20.6).
- Alterar unidade/janela/valor-alvo **recalcula a janela corrente**; janelas anteriores não são alteradas (RN-20.7) — o **histórico de janelas** é RF-DSF-05, **fora** desta feature.
- Janela **cumprida** quando o acumulado atinge o alvo, ainda que o registro que a completou pertença a leitura iniciada em janela anterior (RN-20.8).

**Modelo de dados** (schema `leitura`): `desafio` (usuário, unidade, janela, valor-alvo, estado, timestamps), acumulado/contribuições idempotentes da janela corrente e registro mínimo dos intervalos de pausa nessa janela. Não mantém histórico de janelas concluídas, que continua em RF-DSF-05.

### App Flutter (`code/mobile`)

- Criar/editar/pausar/excluir desafios e ver o **progresso da janela corrente**; usa `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md) (componente de progresso). Alvo de demonstração Android. Fuso do dispositivo informado nas leituras (via [F-PRG](../periodo-1/feature-F-PRG.md)) sustenta o cálculo de janela.

## Critérios de aceite

- [ ] Criar múltiplos desafios com qualquer combinação de **unidade × janela × alvo** (RF-DSF-01, RN-20).
- [ ] Desafios atualizam a cada progresso/finalização; consumidor é idempotente + DLQ e o backfill cobre fatos anteriores (RF-DSF-02/06).
- [ ] Uma atualização alimenta **todos** os desafios ativos compatíveis (RN-20.5).
- [ ] Desafio criado no meio da janela **considera o já registrado** na janela (RN-20.2), via consulta ao próprio schema.
- [ ] **Livros** contam só finalizados (releitura finalizada conta; incompleta/abandonada não — RN-20.3/RN-04); livros pessoais contam (RN-20.4).
- [ ] Editar/pausar/excluir funcionam; pausado não acumula (RN-20.6); alterar recalcula a janela corrente sem tocar janelas anteriores (RN-20.7).
- [ ] Progresso e conclusão entram na janela pela data local do fato; recalcular não inclui intervalos em que o desafio esteve pausado.
- [ ] Ver progresso da janela corrente, paginado (RF-DSF-03, RNF-DES-02).
- [ ] Desafios funcionam no app **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: janelas por data local, criação no meio da janela, finalizados, vários desafios, múltiplas pausas na janela corrente, recálculo, propriedade e idempotência (RNF-TST-02)
- [ ] Testes assíncronos cobrem backfill, consumo duplicado, retentativa e DLQ (RNF-TST-02/03)
- [ ] Testes mobile cobrem estado dos desafios e indisponibilidade/timeout com API simulada (RNF-TST-04/06)
- [ ] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com os endpoints de desafio
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

## Pendências

- **Depende de** [F-PRG](../periodo-1/feature-F-PRG.md) (`progresso.registrado`, unidades páginas/minutos, fuso do dispositivo), [F-EST](../periodo-1/feature-F-EST.md) (`leitura.finalizada`, máquina de estados), [F-SESSAO](feature-F-SESSAO.md) (minutos cronometrados alimentam desafios — RN-16.13), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md), [P0-MSG](../periodo-0/feature-P0-MSG.md).
- **Decisões do dono:** fixar faixa do valor-alvo e tratamento de pausa que começa em uma janela e termina em outra ou atravessa mudança de fuso.
- **Alternativa a avaliar, sem mudar o desenho atual:** calcular a janela corrente consultando progresso/leitura e persistir apenas snapshots históricos no P3.
- **Histórico de janelas** (RF-DSF-05) é Opcional → **F-DSF-OPC** (Período 3); aqui só a janela corrente.
- **Compartilha `leitura`** com as demais features de leitura — sinalizar no grupo (plano §6). Desafios são limpos por [F-CONTA-2](feature-F-CONTA-2.md) na exclusão.
- Stack de `leitura` definida: **NestJS (TypeScript)** (arquitetura §2.1).

## Timeline

### Revisão 01/09/2026: eventos de progresso/finalização aprovados; faixa do alvo e pausas entre janelas registradas para decisão do dono; alternativa por consulta mantida apenas para avaliação.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-DSF no [periodo-2/README.md](README.md), de RF-DSF-01..04/06 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.7 e da RN-20. Janelas de calendário e consulta histórica no próprio schema fixadas; consumo de `progresso.registrado`/`leitura.finalizada` marcado como fluxo candidato de §7.2 (pendência de baseline); histórico de janelas adiado ao Período 3.

### Revisão 29/08/2026: contratos candidatos passaram a carregar a data local necessária à janela; pausas guardam apenas os intervalos da janela corrente para impedir acúmulo/recalculo indevido. Atualização local continua alternativa simples enquanto a mensageria não for aprovada.
