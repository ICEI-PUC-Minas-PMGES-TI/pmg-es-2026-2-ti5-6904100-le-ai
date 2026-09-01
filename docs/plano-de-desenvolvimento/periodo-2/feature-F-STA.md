# F-STA — Estatísticas

**Período:** 2 · **Prioridade:** desejavel
**Dono:** a definir · **Serviços afetados:** `leitura` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.8 (RF-STA-01, 02, 03, 05), RN-04, RN-17. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar o **painel de estatísticas** de leitura do leitor — o "registro" que sustenta o hábito. Fecha os requisitos **Desejáveis**:

- **RF-STA-01** totais de **livros concluídos, páginas lidas e tempo de leitura**, por ano e no acumulado;
- **RF-STA-02** médias: **páginas por dia, dias por livro e nota média** atribuída;
- **RF-STA-03** gráficos de evolução: **páginas por mês** e **livros concluídos por mês**;
- **RF-STA-05** **recalcular** as estatísticas de forma **assíncrona** a partir dos eventos de progresso e de conclusão.

RNF atendidos: **RNF-ARQ-06** (recálculo por fluxo assíncrono), **RNF-ERR-06/07** (consumidor idempotente + DLQ), **RNF-SEC-02** (dados do próprio usuário), **RNF-SEC-32** (schema de mensagem), **RNF-DES-01/02** (leitura rápida, paginação onde couber), **RNF-USA-03** (contraste dos gráficos, [P0-DS](../periodo-0/feature-P0-DS.md)).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | agregados/projeção de estatísticas; consumidores de progresso/conclusão |
| Backend | não iniciado | `leitura`: totais, médias, séries mensais + recálculo assíncrono |
| Web | não iniciado | painel de totais/médias e gráficos de evolução |
| Mobile | não iniciado | mesmas telas |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso parametrizado e propriedade/privacidade validadas no servidor. Agrega sobre `progresso`, `leitura` e `nota` do próprio schema.

- **`GET /me/estatisticas`** (RF-STA-01/02):
  - **Totais** por **ano** e **acumulado**: livros concluídos, **páginas lidas** e **tempo de leitura**. Páginas de leituras **abandonadas contam** (RN-04, invariante 2); páginas lidas derivam das atualizações de progresso (RN-17).
  - **Médias**: páginas por dia, dias por livro e **nota média atribuída** (das notas de [F-AVA](../periodo-1/feature-F-AVA.md)).
- **`GET /me/estatisticas/graficos`** (RF-STA-03) — séries de **páginas por mês** e **livros concluídos por mês** para os gráficos de evolução.
- **`GET /perfis/{usuarioId}/estatisticas`** — recorte necessário à composição do perfil. Perfil público é visível a todos; privado exige próprio usuário ou seguidor aceito (RN-08). A mesma camada de cálculo/consulta de `/me` é reutilizada, evitando fórmulas divergentes; o DTO público pode omitir métricas privadas.
- **Recálculo assíncrono (RF-STA-05):** consome os contratos aprovados **`progresso.registrado`** e **`leitura.finalizada`**; consumidor idempotente + DLQ. A base histórica vem do próprio schema por backfill.
- **Coerência nas demais mutações locais:** como F-PRG, F-AVA e F-STA vivem no mesmo serviço, excluir progresso marca os agregados de páginas/tempo para recálculo local, e criar/editar/remover nota atualiza a nota média localmente. Não são criados eventos de broker apenas para comunicação interna.

**Modelo de dados** (schema `leitura`): agregados de estatística por usuário (totais por ano/acumulado, séries mensais) mantidos por recálculo assíncrono; nenhuma leitura cruzada de outro schema.

### Frontend Web (`code/front`)

- **Painel próprio** completo e seção de estatísticas no perfil alheio usando o DTO público sob RN-08. Gráficos seguem paleta/contraste de P0-DS e cold start é carregamento.

### App Flutter (`code/mobile`)

- Mesmas telas e composição de perfil com `ThemeData` de P0-DS. Alvo de demonstração Android.

## Critérios de aceite

- [ ] Totais de livros concluídos, páginas lidas e tempo aparecem por **ano** e **acumulado** (RF-STA-01); páginas de leituras abandonadas **contam** (RN-04).
- [ ] Médias de páginas/dia, dias/livro e nota média corretas (RF-STA-02).
- [ ] Gráficos de **páginas/mês** e **livros/mês** (RF-STA-03), com contraste WCAG AA (RNF-USA-03).
- [ ] As estatísticas são **recalculadas de forma assíncrona** a partir de `progresso.registrado`/`leitura.finalizada`; consumidor **idempotente** + DLQ (RF-STA-05, RNF-ERR-06/07); o painel reflete também dados históricos do próprio schema.
- [ ] Excluir progresso corrige páginas/tempo e criar/editar/remover nota corrige a nota média, sem aguardar evento inexistente.
- [ ] O painel funciona **em DES**.
- [ ] Endpoint de perfil respeita RN-08 server-side e reutiliza a mesma lógica de cálculo do endpoint `/me`.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração: totais/médias/séries, páginas abandonadas, exclusão de progresso, nota, recálculo, base histórica e RN-08 em perfil público/privado
- [ ] Testes assíncronos: consumo de `progresso.registrado`/`leitura.finalizada` com duplicação e DLQ (RNF-TST-03)
- [ ] Testes web/mobile cobrem render dos gráficos e indisponibilidade/timeout com API simulada (RNF-TST-05/04/06)
- [ ] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com os endpoints de estatística
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

## Pendências

- **Depende de** [F-PRG](../periodo-1/feature-F-PRG.md) (`progresso.registrado`), [F-EST](../periodo-1/feature-F-EST.md) (`leitura.finalizada`), [F-AVA](../periodo-1/feature-F-AVA.md) (notas), [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (RN-08), P0-INFRA, P0-DS, P0-DEPLOY, P0-CI e P0-MSG.
- **Decisões do dono:** fixar denominadores de páginas/dia e dias/livro, tratamento de releituras e campos do DTO público antes da implementação.
- **Alternativa a avaliar, sem mudar o desenho atual:** persistir buckets mensais e derivar totais anuais, evitando agregados redundantes.
- **Fronteira:** a distribuição das notas dadas pelo leitor (RF-STA-04) é F-STA-OPC. A distribuição de notas do livro é distinta e foi alocada a F-ACV-NOTA.
- **Compartilha `leitura`** com as demais features de leitura — sinalizar no grupo (plano §6).
- Stack de `leitura` ainda pendente (P0-INFRA).

## Timeline

### Revisão 01/09/2026: endpoint público de estatísticas sob RN-08 acrescentado com lógica compartilhada; eventos de recálculo aprovados e fórmulas/DTO público deixados como decisões do dono.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-STA no [periodo-2/README.md](README.md), de RF-STA-01/02/03/05 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.8 e das RN-04/RN-17. Recálculo assíncrono ligado a `progresso.registrado`/`leitura.finalizada` (fluxo candidato de §7.2 — pendência de baseline); distribuição de notas do leitor adiada ao Período 3 e distinguida da distribuição de notas do livro (sem feature).

### Revisão 29/08/2026: exclusão de progresso e ciclo da nota passaram a manter os agregados por atualização local no próprio serviço `leitura`; nenhum evento adicional foi criado para essas mutações internas.
