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
| Web | implementado (12/10/2026) | `/perfil/estatisticas` com seletor de período, totais, médias e dois gráficos com visão em tabela; bloco `Estatísticas do ano` no Meu perfil (com `Ver estatísticas`) e no perfil de outro leitor |
| Mobile | implementado (12/10/2026) | `/perfil/estatisticas` com faixa de períodos, totais, médias e dois gráficos com tabela; bloco `Estatísticas do ano` no Meu perfil (com `Ver estatísticas`) e no perfil de outro leitor. Conferido no emulador |

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

## Implementação do web (12/10/2026)

**`code/front`:**
- **Rota `/perfil/estatisticas`** (`views/perfil/EstatisticasView.vue`), aba Perfil ativa, com o período na rota (`?periodo=2025|acumulado`; sem ele, o ano corrente).
  - Na web larga, a partir de 1280px (5.1 a 5.5): lista `Período` na coluna da esquerda e, à direita, linha de período, `Totais` e `Médias` em cards de três e os dois gráficos lado a lado.
  - Entre 768 e 1280px: pills no topo, cards de três e gráficos empilhados.
  - Abaixo de 768px (4.1 a 4.9): faixa de pills, containers de linhas empilhadas e gráficos um embaixo do outro.
  - Vazio sem coluna de períodos e com `Ir para a estante`; erro com o banner no topo da coluna direita e o seletor mantido; skeleton em cada carga e troca de período, também no cold start.
  - Resposta atrasada de um período anterior é descartada.
- **Gráfico feito à mão** (`components/estatisticas/GraficoDeColunas.vue`), sem biblioteca nova:
  - grade de 1px, eixo Y só com marcas (passos 1-2-5, no máximo quatro, em `estatisticas/escala.ts`) e um único rótulo direto no primeiro maior valor;
  - balão do mês no hover, no toque e nas setas do teclado (`Esc` fecha), com contorno de foco no gráfico inteiro e anúncio em `aria-live`;
  - `Ver como tabela` troca a área por uma `<table>` real, e a escolha vale por card.
- **Blocos `Estatísticas do ano`** (`components/estatisticas/BlocoEstatisticasDoAno.vue`) no fim da coluna de identidade:
  - No Meu perfil, com `Ver estatísticas`, a partir de `GET /me/estatisticas` (os mesmos números do painel).
  - No perfil de outro leitor, só com o conteúdo visível e sem botão, a partir de `GET /perfis/{id}/estatisticas`.
  - Carga independente: a falha vira o banner do bloco, e 403/404 do `leitura` esconde o bloco. Na web, as linhas no desenho dos contadores; no celular, a faixa de cards.
- **Cabeçalho:** `meta.voltarSoNoCelular` mostra a seta só abaixo de 768px, porque na web a volta é o item Perfil da sidebar.
- **Copy e formatos** em `estatisticas/textos.ts` e `estatisticas/formatos.ts`: milhar com ponto, decimal com vírgula, nota média sempre com uma casa (`4,0`) e tempo em partes (`88 h 05 min`).
- **Testes:** 932 no web, com os novos de serviço, domínio (escala, formatos, textos e seletor), gráfico, tela (períodos, rota, acumulado, médias ausentes, vazio, timeout e 503 com retry, skeleton e resposta atrasada) e blocos dos dois perfis (vazio, erro, 403/404, restrito).
- **Conferência lado a lado** com os protótipos renderizados, em 1440×900, 1280, 1024 e 390×844, claro e escuro, com a conta de teste e dados em 2024, 2025 e 2026: 5.1 com hover, 5.2, 5.4 com tabela e foco por teclado, 4.1, `Escuro 5.1`, `Web, público não sigo` e `Sequência, estatísticas e desafios (rolada)`.

## Implementação do mobile (12/10/2026)

**`code/mobile`, `lib/features/estatisticas/`:**
- **Serviço:** `EstatisticasService` (`consultar`, `graficos` e `doPerfil` no `leitura`, no mesmo client da estante; `buildRouter(estatisticas:)` injeta). O período vai sempre explícito (`PeriodoAno` ou `PeriodoAcumulado`). O "hoje" é o de São Paulo, em UTC−3 fixo (o Brasil não tem horário de verão desde 2019), o mesmo fuso do servidor, sem pacote novo.
- **Painel `/perfil/estatisticas`** (`estatisticas_page.dart`), aba Perfil ativa, com o período na rota (`?periodo=2025|acumulado`), como o filtro da Estante.
  - Do protótipo 4.1 a 4.9: faixa de pills, linha do intervalo, `Totais` e `Médias` em containers de linhas, `Páginas por mês` (180) e `Livros concluídos por mês` (140), rodapé.
  - Vazio com `Ir para a estante` e sem faixa; erro com o banner e a faixa mantida; skeleton em cada carga e troca de período, também no cold start.
  - Resposta atrasada de um período anterior é descartada. A troca é anunciada ao TalkBack com o novo intervalo.
- **Gráfico feito à mão** (`widgets_de_estatisticas.dart`), sem pacote novo:
  - grade de 1px, eixo Y só com marcas (a mesma escala 1-2-5 do web, em `escala.dart`) e um único rótulo direto;
  - toque na faixa do mês abre o balão e a faixa `musgo-fundo`; tocar fora fecha;
  - `Ver como tabela` por card;
  - TalkBack: o resumo do gráfico e um nó por mês (`Julho de 2026, 604 páginas`) com ação de toque.
- **Bloco `Estatísticas do ano`** (`estatisticas_do_perfil.dart`):
  - No Meu perfil (`PerfilPage.estatisticas`), entre a sequência e os desafios, com `Ver estatísticas`.
  - No perfil de outro leitor (`PerfilDeOutroPage.estatisticas`, montado em `rotas_perfil.dart` e em `rotas_feed.dart`), só com o conteúdo visível e sem botão.
  - Faixa de três cards que sangra pela borda direita. Carga própria: a falha vira o banner do bloco, e 403/404 do `leitura` esconde o bloco.
  - O skeleton da página ganhou `comEstatisticas`.
- **Recarga:** o painel e o bloco recarregam em silêncio 3 s depois dos avisos de progresso, estante e nota (`LeituraService.alteracoes`), porque os totais vêm do consumo assíncrono. A falha silenciosa mantém o que está na tela.
- **Copy e formatos:** em `textos.dart` e `formatos.dart`, espelho de `code/front/src/estatisticas/`.
- **Compartilhado:** o pill de filtro da Estante saiu para `design/widgets/pill_de_filtro.dart` (`PillDeFiltro`, com `rotuloNumerico` para os anos) e ganhou o `onTap` no `Semantics` que faltava.
- **Copy de RN-08:** a frase do perfil privado e a do modal de deixar de seguir passam a citar listas e estatísticas, no mobile e no web (perfil de outro leitor e Conexões).
- **Testes:** 54 novos.
  - Serviço: URLs, parse, resposta inválida e 403.
  - Domínio: escala, formatos, textos e seletor.
  - Painel: períodos, rota, acumulado, médias ausentes, vazio, 503 e timeout com retry, skeleton, resposta atrasada, recarga silenciosa e escuro.
  - Gráfico: rótulo único, mês zero, toque e troca do balão, TalkBack e tabela.
  - Blocos: isolado, no Meu perfil (posição e falha isolada) e no perfil de outro leitor (RN-08, 403/404, vazio).
  - Rotas.

  `flutter analyze` sem avisos e 794 testes verdes.

**Teste manual no emulador (12/10/2026):**
- **Preparação:** Android API 35 no WSL (`subir.sh` e o driver `emu`), serviços locais contra o banco de dev, conta de teste com leituras em 2024, 2025 e 2026.
- **Roteiro conferido lado a lado com os artboards:**
  - **Meu perfil:** o bloco entre a sequência e os desafios (`Sequência, estatísticas e desafios`).
  - **`Ver estatísticas`** abre o painel.
  - **2026:** 4.1, e o toque em julho mostra o balão e a faixa (4.2).
  - **`Ver como tabela`** com "Outubro até hoje" (4.3).
  - **2024, o primeiro ano:** "desde o seu primeiro registro".
  - **Acumulado** e gráficos por ano no escuro (`Escuro 4.1`/`4.2`).
  - **Perfil público** (`Estatísticas e estante`).
  - **Perfil privado sem seguimento:** sem bloco, com a frase de restrição nova.
  - **`leitura` parado:** banner com `Tentar de novo`, que recarrega quando o serviço volta.
- **O teste achou três ajustes, já corrigidos:**
  - O espaço entre número e unidade numa métrica de uma parte é `space-2` (no tempo, `space-1` dentro de cada parte).
  - O banner de erro usa o triângulo `Warning`, como no protótipo.
  - A linha do período e a ajuda dos totais saíam fundidas num só nó do TalkBack.
- **Fora da F-STA, visto de passagem:** o resultado da busca de leitor aparece sem ação de toque na semântica, o defeito que a convenção de Semantics da `desenvolvimento` (`d9f32cf`) corrige.
- **O vazio** (leitor sem nenhum registro) ficou coberto pelos testes, sem conta assim no dev.

## Critérios de aceite

- [x] Totais de livros concluídos, páginas lidas e tempo aparecem por **ano** e **acumulado** (RF-STA-01); páginas de leituras abandonadas **contam** (RN-04). Backend, web e mobile.
- [x] Médias de páginas/dia, dias/livro e nota média corretas (RF-STA-02). Backend, web e mobile.
- [x] Gráficos de **páginas/mês** e **livros/mês** (RF-STA-03), com contraste WCAG AA (RNF-USA-03). Web e mobile, com colunas em `musgo` (`musgo-claro` no escuro) e visão em tabela.
- [x] As estatísticas são **recalculadas de forma assíncrona** a partir de `progresso.registrado`/`leitura.finalizada`; consumidor **idempotente** + DLQ (RF-STA-05, RNF-ERR-06/07); o painel reflete também dados históricos do próprio schema.
- [x] Excluir progresso corrige páginas/tempo e criar/editar/remover nota corrige a nota média, sem aguardar evento inexistente.
- [ ] O painel funciona **em DES**. Entra no merge de fechamento do Período 2, com a migration 0006 e o backfill no DES.
- [x] Endpoint de perfil respeita RN-08 server-side e reutiliza a mesma lógica de cálculo do endpoint `/me`.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, web, mobile) mergeado em `desenvolvimento` (hoje na `vicenzo-features`, em PR)
- [x] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md)): no PR #53 (12/10/2026), todos os checks verdes. Localmente, depois de trazer a `desenvolvimento` com o #51 (12/10/2026), lint, build, 285 unitários e 335 de integração do `leitura`; lint, `vue-tsc` e 959 testes do web; `flutter analyze` e 823 testes do mobile, todos verdes
- [x] Testes unitários e de integração: totais/médias/séries, páginas abandonadas, exclusão de progresso, nota, recálculo, base histórica e RN-08 em perfil público/privado
- [x] Testes assíncronos: consumo de `progresso.registrado`/`leitura.finalizada` com duplicação e DLQ (RNF-TST-03)
- [x] Testes web/mobile cobrem render dos gráficos e indisponibilidade/timeout com API simulada (RNF-TST-05/04/06).
- [x] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com os endpoints de estatística
- [x] Catálogo de mensageria atualizado: F-STA no consumidor `leitura.metricas` de `progresso.registrado` e `leitura.finalizada`, e o backfill, em `docs/mensageria/catalogo.md`
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)). Entra no merge de fechamento do Período 2
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver

## Pendências

- **Telas (design P2):** [`estatisticas.md`](../../design/periodo-2/F-STA/estatisticas.md) ([protótipo](../../design/periodo-2/F-STA/prototipos/estatisticas.html)) (painel próprio W+M, entrada pelo bloco `Estatísticas do ano` do Meu perfil, desenhado na edição `meu-perfil` do lote 6), prompt escrito e protótipo exportado em 29/09/2026. Lote 6, prompts escritos e protótipos exportados em 29/09/2026: bloco `Estatísticas do ano` na edição [`meu-perfil.md`](../../design/periodo-2/meu-perfil/meu-perfil.md) ([protótipo](../../design/periodo-2/meu-perfil/prototipos/meu-perfil.html)) (mobile e coluna web, `Ver estatísticas`) e bloco sem painel, sob RN-08, na edição [`perfil-de-outro-leitor.md`](../../design/periodo-2/perfil-de-outro-leitor/perfil-de-outro-leitor.md) ([protótipo](../../design/periodo-2/perfil-de-outro-leitor/prototipos/perfil-de-outro-leitor.html)). **Contratos que os protótipos deixavam a confirmar, resolvidos no backend (11/10/2026):** tempo por ano em `/me/estatisticas`, séries do ano escolhido mês a mês e do acumulado ano a ano (`granularidade`), nota média e quantidade de notas no período, lista de anos com registro (`anos`), e o DTO público com os três totais do ano, tempo incluído, por `?ano=` (ver [Implementação do backend](#implementação-do-backend-11102026)).
- **Depende de** [F-PRG](../periodo-1/feature-F-PRG.md) (`progresso.registrado`), [F-EST](../periodo-1/feature-F-EST.md) (`leitura.finalizada`), [F-AVA](../periodo-1/feature-F-AVA.md) (notas), [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (RN-08), P0-INFRA, P0-DS, P0-DEPLOY, P0-CI e P0-MSG.
- **Decisão do grupo incorporada em 15/09/2026:** denominadores definidos acima. Testar dia com vários progressos/livros, progresso manual, sincronização tardia, conclusão no mesmo dia, releituras e intervalo abandonado. Os campos do DTO público sob RN-08 foram decididos na implementação do backend (11/10/2026).
- **Backfill em cada ambiente:** depois da migration 0006, rodar `npm run backfill:estatisticas` no `leitura`. No DES, entra no merge de fechamento do Período 2.
- **Tabelas removidas no DES:** o Henrique pediu, na revisão do #53, um `SELECT count(*)` em `estatistica_anual` e `estatistica_usuario` no DES antes do deploy da 0006. **Decisão do dono (12/10/2026):** dispensado. O banco do DES (`le-ai-oregon`) não guarda dado que importe, e nenhum código jamais gravou nas duas tabelas.
- **Divergências protótipo × implementação** (web e mobile; as do web valem para o mobile onde o desenho é o mesmo, e o "desde" e as frases novas são idênticos):
  - **Bloco no Meu perfil web.** Os artboards web de `meu-perfil.html` não têm o bloco `Estatísticas do ano`; só o mobile tem. Os prompts (`meu-perfil.md` §4.8 e `estatisticas.md` §1) o põem na coluna de identidade, e sem ele o painel não tem entrada na web. **Decisão do dono (12/10/2026):** o bloco entra com o desenho do perfil de outro leitor no protótipo web, mais `Ver estatísticas` com `ChartBar`.
  - **"Desde" pelo primeiro registro.** O protótipo diz `Desde 12 de novembro de 2023, quando você entrou` e `…, desde que você entrou`, mas a data que o `leitura` devolve é a do primeiro progresso ou fim de leitura concluída (a `v_perfil_referencia_v1` não tem a criação da conta). **Decisão do dono (12/10/2026):** `Desde 12 de novembro de 2023, seu primeiro registro` e `…, desde o seu primeiro registro`.
  - **Seta só no celular.** Os artboards web não têm seta (a volta é o item Perfil da sidebar); o mobile tem. Em vez do `← Perfil` das outras telas do perfil, a rota usa `meta.voltarSoNoCelular`.
  - **Frases que o protótipo não desenha:** nota com uma só nota (`A única nota que você deu em 2026.`), página por dia ausente num ano só com conclusões (`Sem dias com leitura em 2025`), nota ausente no acumulado (`Nenhuma nota dada ainda`) e gráfico de páginas sem páginas (`Nenhuma página registrada em 2025.`).
  - **Largura intermediária.** O protótipo só desenha 1440 e 390. Com a coluna de períodos, entre 768 e 1280px a coluna direita ficava com cerca de 440px, e os números vazavam dos cards. Nessa faixa, os períodos viram as pills do mobile no topo e os gráficos empilham.
  - **Mobile: pill de filtro compartilhado.** A faixa de períodos usa o pill da Estante ("mesmo desenho dos pills de filtro da Estante", §4), que saiu para `design/widgets/pill_de_filtro.dart`; a Estante não mudou de desenho, só ganhou o `onTap` no `Semantics`.
  - **Mobile: frase de restrição e modal de deixar de seguir.** Seguem `perfil-de-outro-leitor.md` (§4.3 e o modal) e citam listas e estatísticas também no web; o modal mantém `dessa pessoa` em vez de `dela`, pela regra de não supor gênero.
  - **Escala do eixo** por regra (passos 1-2-5, até quatro marcas, ar acima da coluna mais alta), conferida contra os exemplos do protótipo (604 → 0 a 600, 2 → 0 a 3, 5.150 → 0 a 6.000, 14 → 0 a 15). Fora deles, a regra vale sozinha: 939 → 0/500/1.000.
- **Fronteira:** a distribuição das notas dadas pelo leitor (RF-STA-04) é F-STA-OPC. A distribuição de notas do livro é distinta e foi alocada a F-ACV-NOTA.
- **Compartilha `leitura`** com as demais features de leitura — sinalizar no grupo (plano §6).
- Stack de `leitura` definida: **NestJS (TypeScript)** (arquitetura §2.1).

## Timeline

### Integração 12/10/2026: `desenvolvimento` trazida de novo, depois do #51 (F-CONTA-2, F-AUT, F-PERFIL e F-LST), que deixou o #53 em conflito.
- **`conta-excluida.consumer.ts`:** o #51 extraiu a lista de tabelas apagadas para `TABELAS_DA_CONTA`, usada pela guarda de exclusão nova (`test/integracao/guarda-exclusao.int-spec.ts`), ainda com `estatistica_usuario` e `estatistica_anual`. Ficou a constante, sem as duas: a guarda exige que toda tabela declarada exista, e a 0006 as remove.
- **`feature-F-CONTA-2.md`:** ficou tudo o que o #51 trouxe na matriz (social, acervo, a linha nova do `identidade`, isentas e guarda), com a linha do `leitura` só com `estatistica_mensal`.
- `leitura` (lint, build, 285 unitários e 335 de integração, com os dois da guarda), web (959) e mobile (823) verdes depois do merge.

### Integração 12/10/2026: `desenvolvimento` trazida para a `vicenzo-features` (#52, F-REC-P2P) e PR aberto para a `desenvolvimento`.
- Um conflito, em `docs/mensageria/catalogo.md`: a linha de `livro.adicionado_a_estante` ganhou o consumidor de recomendações e a de `progresso.registrado` manteve a F-STA.
- Web (lint, `vue-tsc`, 955 testes) e mobile (`flutter analyze`, 814 testes) verdes depois do merge. O `leitura` não mudou na `desenvolvimento`.
- CI do PR #53 verde.
- Revisão do Henrique (#53): migration 0006 aprovada, com o pedido de conferir em DES que as duas tabelas estão vazias, dispensado pelo dono (nas pendências). Pedidos dele feitos no próprio PR: a matriz da F-CONTA-2 passa a citar só `estatistica_mensal`, o modelo de dados do `leitura` (`docs/diagramas/modelo-dados-leitura.mmd`, PNG e SVG regerados com o Mermaid CLI 11.17.0) perde as duas tabelas e mostra as colunas novas, e a alternativa de buckets da F-STA-OPC passa a se apoiar em `estatistica_mensal`.
- Revisão da doc: critério e DoD de DES com a nota do fechamento do período, catálogo no DoD, contratos dos protótipos dados como resolvidos e a matriz da F-CONTA-2 como pendência do dono dela (feita depois, a pedido dele).

### Implementação 12/10/2026: mobile implementado na `vicenzo-features`.
- Painel `/perfil/estatisticas`, gráfico de colunas próprio com tabela e TalkBack, e os blocos `Estatísticas do ano` no Meu perfil e no perfil de outro leitor.
- Teste manual no emulador feito, lado a lado com os artboards: três ajustes (espaço da unidade, ícone do banner, nós do TalkBack), corrigidos.
- A frase de restrição e o modal de deixar de seguir citam listas e estatísticas, no mobile e no web.
- Testes: mobile 794. Falta o merge em `desenvolvimento` e, no fechamento do período, o DES com o backfill.

### Implementação 12/10/2026: web implementado na `vicenzo-features`.
- Painel `/perfil/estatisticas`, gráfico de colunas próprio com tabela e teclado, e os blocos `Estatísticas do ano` nos dois perfis.
- Conferido lado a lado com os protótipos renderizados (web 1440, 1280, 1024 e celular 390; claro e escuro) contra a stack local com dados de teste em três anos.
- Decisões do dono: bloco no Meu perfil web, que o protótipo não desenha, e o "desde" pelo primeiro registro. Divergências registradas nas pendências.
- Testes: web 932. Falta o mobile.

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
