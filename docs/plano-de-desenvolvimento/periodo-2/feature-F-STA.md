# F-STA — Estatísticas

**Período:** 2 · **Prioridade:** desejavel
**Dono:** Vicenzo Fonseca · **Serviços afetados:** `leitura` (backend) + web + mobile

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
| Infra | implementado (11/10/2026) | migration `0006_..._estatistica_buckets_mensais`: só `estatistica_mensal`, com dias com leitura, dias em livros concluídos e soma/quantidade de notas; `estatistica_anual` e `estatistica_usuario` (vazias) removidas. Consumo pela fila `leai.leitura.metricas` da F-GAM |
| Backend | implementado (11/10/2026) | `leitura`: `GET /me/estatisticas`, `/me/estatisticas/graficos` e `/perfis/{id}/estatisticas`, recálculo pelo consumidor de métricas, pela exclusão de trecho e pelas escritas de nota, backfill `npm run backfill:estatisticas` |
| Web | não iniciado | painel de totais/médias e gráficos de evolução |
| Mobile | não iniciado | mesmas telas |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso parametrizado e propriedade/privacidade validadas no servidor. Agrega sobre `progresso`, `leitura` e `nota` do próprio schema.

- **`GET /me/estatisticas`** (RF-STA-01/02):
  - **Totais** por **ano** e **acumulado**: livros concluídos, **páginas lidas** e **tempo de leitura**. Páginas de leituras **abandonadas contam** (RN-04, invariante 2); páginas lidas derivam das atualizações de progresso (RN-17).
  - **Médias**: páginas por dia = páginas registradas / dias locais distintos com progresso no período (manual ou cronometrado); dias sem leitura ficam fora do denominador. Dias por livro = soma de `(data_fim - data_inicio + 1)` / quantidade de leituras concluídas: inclui início/fim, dias sem leitura e abandono, com releituras como ocorrências independentes. Sem denominador, retorna ausente. **Nota média atribuída** vem das notas de [F-AVA](../periodo-1/feature-F-AVA.md).
- **`GET /me/estatisticas/graficos`** (RF-STA-03) — séries de **páginas por mês** e **livros concluídos por mês** para os gráficos de evolução.
- **`GET /perfis/{usuarioId}/estatisticas`** — recorte necessário à composição do perfil. Perfil público é visível a todos; privado exige próprio usuário ou seguidor aceito (RN-08). A mesma camada de cálculo/consulta de `/me` é reutilizada, evitando fórmulas divergentes; o DTO público pode omitir métricas privadas.
- **Recálculo assíncrono (RF-STA-05):** consome os contratos aprovados **`progresso.registrado`** e **`leitura.finalizada`**; consumidor idempotente + DLQ. A base histórica vem do próprio schema por backfill.
- **Coerência nas demais mutações locais:** editar o último progresso ou excluir um trecho final recalcula páginas/tempo e os dias com leitura; sincronização offline atribui o registro à data local original. Criar/editar/remover nota atualiza a média localmente. Não são criados eventos de broker apenas para comunicação interna.

**Modelo de dados** (schema `leitura`): agregados de estatística por usuário (totais por ano/acumulado, séries mensais) mantidos por recálculo assíncrono; nenhuma leitura cruzada de outro schema.

### Frontend Web (`code/front`)

- **Painel próprio** completo e seção de estatísticas no perfil alheio usando o DTO público sob RN-08. Gráficos seguem paleta/contraste de P0-DS e cold start é carregamento.

### App Flutter (`code/mobile`)

- Mesmas telas e composição de perfil com `ThemeData` de P0-DS. Alvo de demonstração Android.

## Implementação do backend (11/10/2026)

**`code/back/leitura`, módulo `src/estatisticas/`:**
- **Endpoints:** `GET /me/estatisticas?periodo=<ano>|acumulado` (`consultarMinhasEstatisticas`), `GET /me/estatisticas/graficos?periodo=…` (`consultarGraficosEstatisticas`) e `GET /perfis/{usuarioId}/estatisticas?ano=` (`consultarEstatisticasPerfil`). Sem `periodo` ou `ano`, o ano corrente. Contrato em [`docs/api/leitura.yaml`](../../api/leitura.yaml).
- **Resposta de `/me/estatisticas`:** `{ ano, anos[{ano, livrosConcluidos}], primeiroRegistro, totais{livrosConcluidos, paginasLidas, minutosLidos}, medias{paginasPorDia{valor, paginasLidas, diasComLeitura}, diasPorLivro{valor, dias, leiturasConcluidas}, notaMedia{valor, quantidade}} }`. `anos` alimenta o seletor de ano, `primeiroRegistro` o "desde" do acumulado, e o bloco "Estatísticas do ano" do Meu perfil usa a mesma chamada com o ano corrente. Os gráficos devolvem `{ ano, granularidade: 'mes'|'ano', pontos[{ano, mes, paginasLidas, livrosConcluidos}] }`.
- **Baldes mensais:** `estatistica_mensal` guarda por leitor e mês os totais, os dias com leitura, os dias em leituras concluídas e a soma e a quantidade de notas. O ano é a soma dos seus meses e o acumulado, a soma de todos; dias com leitura somam sem contar duas vezes porque cada data local cai num só mês. `/me` e o perfil somam os mesmos baldes.
- **Recálculo único:** `EstatisticasService.recalcular(tx, usuarioId)` apaga e recompõe todos os meses do leitor em SQL set-based, a partir de `atualizacao_progresso`, `leitura` e `nota` do próprio schema. Nunca soma o `data` do evento, então entrega repetida ou fora de ordem, captura offline tardia, data de fim retroativa e exclusão de progresso convergem. Serializado por leitor com `pg_advisory_xact_lock`, depois das travas da sequência e dos desafios.
- **Quem chama:** o `MetricasConsumer` em `progresso.registrado` e `leitura.finalizada`; `ProgressoService.excluirTrecho` no mesmo `tx`; `AvaliacoesService.salvarNota` e `excluirNota` no mesmo `tx`. Abandonar e retomar não mudam nenhum total.
- **Backfill:** `npm run backfill:estatisticas` (`node dist/estatisticas/backfill.js` no build), idempotente. Também limpa baldes de quem ficou sem nenhum dado.
- **Testes:** 23 unitários de domínio e 31 de integração em `test/integracao/estatisticas.int-spec.ts`. Cobrem totais por ano e acumulado, seletor de anos, SEC-02, páginas de leitura abandonada, dia com vários progressos e livros, sincronização tardia e fuso do dispositivo, conclusão no mesmo dia, intervalo abandonado e releitura em dias por livro, exclusão de trecho, criar/editar/remover nota, backfill, gráficos, RN-08 (próprio, público, privado com e sem seguimento, ausente, id em maiúsculas, validação), duplicata, retry, DLQ e mensagem atrasada de progresso excluído. Suítes completas verdes localmente: 285 unitários e 333 de integração.

**Decisões do dono (11/10/2026):**
- **Só baldes mensais.** A alternativa das pendências foi adotada: o ano e o acumulado saem da soma dos meses, e as tabelas `estatistica_anual` e `estatistica_usuario` da baseline DER, nunca preenchidas, foram removidas.
- **Livro concluído conta no mês de `data_fim`**, coerente com "dias por livro". Releitura abandonada (`incompleta`) não tem `finalizada_em` e fica fora.
- **Nota conta no mês de `nota.atualizado_em`**, no fuso America/Sao_Paulo, porque a nota não guarda o fuso do dispositivo. Editar a nota a move para o mês da edição.
- **Perfil alheio recebe só os três totais do ano** (livros, páginas, tempo), com `?ano=`. Médias e gráficos ficam no painel próprio.
- **"Desde que você entrou" vira a data do primeiro registro** (primeiro progresso ou fim de leitura concluída): a `v_perfil_referencia_v1` não expõe a data de criação da conta.
- **Nota sozinha não abre ano** no seletor nem estica o eixo dos gráficos.

**Divergência da especificação:** a spec ainda fala em "editar o último progresso". A edição de progresso foi removida em 29/09/2026 (`8f28b76`, F-PRG); só a exclusão de trecho recalcula.

## Critérios de aceite

- [ ] Totais de livros concluídos, páginas lidas e tempo aparecem por **ano** e **acumulado** (RF-STA-01); páginas de leituras abandonadas **contam** (RN-04). Backend pronto; faltam web e mobile.
- [ ] Médias de páginas/dia, dias/livro e nota média corretas (RF-STA-02). Backend pronto; faltam web e mobile.
- [ ] Gráficos de **páginas/mês** e **livros/mês** (RF-STA-03), com contraste WCAG AA (RNF-USA-03). Séries prontas no backend; faltam os gráficos.
- [x] As estatísticas são **recalculadas de forma assíncrona** a partir de `progresso.registrado`/`leitura.finalizada`; consumidor **idempotente** + DLQ (RF-STA-05, RNF-ERR-06/07); o painel reflete também dados históricos do próprio schema.
- [x] Excluir progresso corrige páginas/tempo e criar/editar/remover nota corrige a nota média, sem aguardar evento inexistente.
- [ ] O painel funciona **em DES**.
- [x] Endpoint de perfil respeita RN-08 server-side e reutiliza a mesma lógica de cálculo do endpoint `/me`.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [x] Testes unitários e de integração: totais/médias/séries, páginas abandonadas, exclusão de progresso, nota, recálculo, base histórica e RN-08 em perfil público/privado
- [x] Testes assíncronos: consumo de `progresso.registrado`/`leitura.finalizada` com duplicação e DLQ (RNF-TST-03)
- [ ] Testes web/mobile cobrem render dos gráficos e indisponibilidade/timeout com API simulada (RNF-TST-05/04/06)
- [x] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com os endpoints de estatística
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

## Pendências

- **Telas (design P2):** [`estatisticas.md`](../../design/periodo-2/F-STA/estatisticas.md) ([protótipo](../../design/periodo-2/F-STA/prototipos/estatisticas.html)) (painel próprio W+M, entrada pelo bloco `Estatísticas do ano` do Meu perfil, desenhado na edição `meu-perfil` do lote 6), prompt escrito e protótipo exportado em 29/09/2026. Contratos a confirmar: tempo por ano em `GET /me/estatisticas`, séries por ano escolhido × 12 meses móveis, série anual do acumulado, ano de referência da nota média e contagem de notas, lista de anos com registro. Lote 6, prompts escritos e protótipos exportados em 29/09/2026: bloco `Estatísticas do ano` na edição [`meu-perfil.md`](../../design/periodo-2/meu-perfil/meu-perfil.md) ([protótipo](../../design/periodo-2/meu-perfil/prototipos/meu-perfil.html)) (mobile e coluna web, `Ver estatísticas`) e bloco sem painel, sob RN-08, na edição [`perfil-de-outro-leitor.md`](../../design/periodo-2/perfil-de-outro-leitor/perfil-de-outro-leitor.md) ([protótipo](../../design/periodo-2/perfil-de-outro-leitor/prototipos/perfil-de-outro-leitor.html)). Contratos a confirmar: campos do DTO público (tempo de leitura pode ser privado), ano corrente isolado.
- **Depende de** [F-PRG](../periodo-1/feature-F-PRG.md) (`progresso.registrado`), [F-EST](../periodo-1/feature-F-EST.md) (`leitura.finalizada`), [F-AVA](../periodo-1/feature-F-AVA.md) (notas), [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (RN-08), P0-INFRA, P0-DS, P0-DEPLOY, P0-CI e P0-MSG.
- **Decisão do grupo incorporada em 15/09/2026:** denominadores definidos acima. Testar dia com vários progressos/livros, progresso manual, sincronização tardia, conclusão no mesmo dia, releituras e intervalo abandonado. Os campos do DTO público sob RN-08 foram decididos na implementação do backend (11/10/2026).
- **Backfill em cada ambiente:** depois da migration 0006, rodar `npm run backfill:estatisticas` no `leitura`. No DES, entra no merge de fechamento do Período 2.
- **Web e mobile:** painel próprio, bloco `Estatísticas do ano` do Meu perfil e bloco do perfil alheio, a partir das telas de design abaixo.
- **Fronteira:** a distribuição das notas dadas pelo leitor (RF-STA-04) é F-STA-OPC. A distribuição de notas do livro é distinta e foi alocada a F-ACV-NOTA.
- **Compartilha `leitura`** com as demais features de leitura — sinalizar no grupo (plano §6).
- Stack de `leitura` definida: **NestJS (TypeScript)** (arquitetura §2.1).

## Timeline

### Implementação 11/10/2026: backend implementado na `vicenzo-features`, depois de trazer a `desenvolvimento` (#50, F-PERFIL e F-EST).
- Migration 0006: só baldes mensais (a alternativa das pendências), com as colunas que as médias pedem; `estatistica_anual` e `estatistica_usuario` removidas.
- Decisões do dono: baldes mensais, livro no mês de `data_fim`, nota no mês da última vez que foi dada, perfil alheio só com os totais do ano e "desde" pelo primeiro registro.
- A edição de progresso citada na spec não existe desde 29/09/2026; só a exclusão de trecho recalcula.
- Testes verdes localmente. Faltam web, mobile, o merge em `desenvolvimento` e, no fechamento do período, o DES com o backfill.

### Revisão 15/09/2026: médias definidas pelo grupo — dias com progresso para páginas/dia, toda a duração para dias/livro; recálculo inclui edição/exclusão e offline. Implementação permanece não iniciada.

### Revisão 01/09/2026: endpoint público de estatísticas sob RN-08 acrescentado com lógica compartilhada; eventos de recálculo aprovados e fórmulas/DTO público deixados como decisões do dono.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-STA no [periodo-2/README.md](README.md), de RF-STA-01/02/03/05 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.8 e das RN-04/RN-17. Recálculo assíncrono ligado a `progresso.registrado`/`leitura.finalizada` (fluxo candidato de §7.2 — pendência de baseline); distribuição de notas do leitor adiada ao Período 3 e distinguida da distribuição de notas do livro (sem feature).

### Revisão 29/08/2026: exclusão de progresso e ciclo da nota passaram a manter os agregados por atualização local no próprio serviço `leitura`; nenhum evento adicional foi criado para essas mutações internas.

### Dono 29/09/2026: feature atribuída a **Vicenzo Fonseca** na [divisão do Período 2](README.md#divisão-do-período-2-entre-5-pessoas).
