# Prompt — E6-01: Test Plan das funcionalidades desejáveis (versão final)

> Escrito em 08/11/2026. **Leia antes o [`prompt-E6-contexto-comum.md`](prompt-E6-contexto-comum.md)**: regras, ferramentas e fechamento valem aqui. Cada etapa é feita por um agente diferente, de contexto limpo. Para usar, diga ao agente: *"Leia `docs/plano-de-desenvolvimento/periodo-3/renato-periodo-3/prompt-E6-01-plano-de-testes-desejaveis.md` e execute a etapa N."*

## Andamento

| Etapa | Situação | Saída |
|---|---|---|
| 1. Planejar | não iniciada | `plano-E6-01-plano-de-testes-desejaveis.md` nesta pasta |
| 2. Revisar o plano | não iniciada | plano corrigido |
| 3. Realizar e validar | não iniciada | `docs/9.plano_de_testes.md` com as desejáveis |
| 4. Revisão independente e PR | não iniciada | PR para a `desenvolvimento` |

Quem terminar uma etapa atualiza esta tabela e a linha E6-01 do [`README.md`](README.md).

---

## Contexto da tarefa

**Item da entrega:** "Test Plan (Funcionalidades Desejáveis) - versão final".

**O que existe hoje:** `docs/9.plano_de_testes.md` foi escrito pelo Renato na Sprint 5 (commit `a27a387`). Ele cobre **só as prioritárias do Período 1**: 10 funcionalidades mais os transversais, com 190 casos. O formato a seguir é exatamente o dele:

- §9.2 Escopo, §9.3 Estratégia (níveis, ferramentas, rastreabilidade com RNF-TST-01..08), §9.4 Ambiente, §9.5 Critérios de aceite.
- §9.6 Casos de teste: uma subseção por funcionalidade e uma tabela `ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado | Resultado`. O ID é `CT-<SIGLA>-NN`, e a coluna do teste aponta `prefixo/arquivo › nome exato do teste` (prefixos `ID/`, `SO/`, `AC/`, `LE/`, `WEB/`, `MOB/`, `ING/`).
- §9.7 Execução e resultados: a última execução de cada workflow do CI, com link do run, data e total de testes.
- §9.8 Lacunas conhecidas, L-01 a L-12. A tarefa E6-02 trata essas lacunas.
- §9.9 Riscos.

**O que falta:** as **14 funcionalidades desejáveis do Período 2**, todas implementadas e na `main` desde a v0.2.0 (03/11/2026):

| Feature | Serviço | Requisitos | Dono | Clientes |
|---|---|---|---|---|
| F-CONTA-2 — Exclusão de conta | identidade | RF-AUT-07 | Henrique | web e mobile |
| F-SOCIAL-2 — Edição de comentário e menções | social | RF-SOC-13, 15 | Kayke | web e mobile |
| F-ACV-DESCOBERTA — Filtros e páginas de autor/editora/série | acervo | RF-ACV-03, 10, 11, 12, 21 | Vicenzo | web e mobile |
| F-ACV-NOTA — Nota geral e cache de capas | acervo | RF-ACV-15, 16, 17 | Renato | web e mobile |
| F-EST-2 — Favoritos, histórico e buscas | leitura | RF-EST-09, 10, 13 | Ana | web e mobile |
| F-SESSAO — Sessão cronometrada | leitura (sem endpoint novo) | RF-PRG-05..12 | Ana | só mobile |
| F-AVA-2 — Reações, Markdown e frases | leitura | RF-AVA-05..09 | Renato | web e mobile |
| F-DSF — Desafios | leitura | RF-DSF-01..04, 06 | Vicenzo | só mobile |
| F-STA — Estatísticas | leitura | RF-STA-01, 02, 03, 05 | Vicenzo | web e mobile |
| F-GAM — Sequência diária | leitura | RF-GAM-01..03 | Vicenzo | só mobile |
| F-LST — Listas | social | RF-LST-01..06 | Henrique | web e mobile |
| F-REC-P2P — Recomendação entre leitores | social | RF-REC-01..07, 13..16 | Kayke | web e mobile |
| F-MOD — Moderação | social | RF-MOD-01, 02, 03, 05 | Renato | web (painel só web) e mobile |
| F-NOT-2 — Notificações em tempo real | social | RF-NOT-06 | Kayke | só mobile |

Confira a tabela contra os arquivos `docs/plano-de-desenvolvimento/periodo-2/feature-*.md`, que prevalecem.

**Leitura obrigatória específica:**

- `docs/9.plano_de_testes.md` inteiro.
- `docs/orquestador/REQUISITOS.md`: §5 (os RFs da tabela), as RNs que eles citam, §8 (segurança, para os casos de autorização) e §9 (estratégia de testes, RNF-TST-01..08).
- Os 14 arquivos de feature do Período 2: critérios de aceite, DoD e Timeline. A Timeline costuma citar os testes escritos e os números.
- `docs/plano-de-desenvolvimento/periodo-3/README.md`, para decidir se as opcionais do Período 3 entram (ver decisão 1).

**Fora do escopo desta tarefa:** escrever teste novo. Esta tarefa **documenta** os testes que existem. O que faltar vira lacuna em §9.8, **com o dono da área**. Pela decisão do grupo de 30/10 (`assets/atas/ATA-2026-10-30.md`), cada dono cobre as lacunas da sua área, e a E6-02 cobre só a do Renato.

---

## Etapa 1 — Planejar

> **Prompt:** Você vai produzir o plano da E6-01. Não edite `docs/9.plano_de_testes.md` nesta etapa. A saída é `plano-E6-01-plano-de-testes-desejaveis.md` nesta pasta, autossuficiente. Faça a leitura obrigatória (contexto comum e esta tarefa) e siga os passos.

### 1.1 Inventário dos testes por feature

Para cada uma das 14 features, levante na `origin/desenvolvimento` os arquivos de teste que a exercitam, em todas as camadas em que ela existe (back, web, mobile):

- os arquivos (caminho);
- quantos testes há em cada um;
- quais RFs/RNs e critérios de aceite eles cobrem.

Use o CodeGraph e os nomes citados nas Timelines das features. Registre no plano uma tabela-resumo por feature (arquivos, total, RFs cobertos) e os **critérios de aceite sem teste aparente**, que são os candidatos a lacuna.

### 1.2 Decisões a fechar com o Renato

Pergunte em lote curto, com a recomendada primeiro:

1. **Escopo:** só as 14 desejáveis (recomendado, é o que a entrega pede) ou também as opcionais do Período 3 já mergeadas (F-MOD-OPC, F-ACV-OPC, F-STA-OPC)?
2. **Estrutura do §9.6:** manter 9.6.1–9.6.11 como estão e acrescentar 9.6.12 em diante para o Período 2 (recomendado, sem renumerar), ou reorganizar em "9.6.1 Período 1 / 9.6.2 Período 2"?
3. **Siglas dos IDs:** proposta, por exemplo, CT-CNT, CT-SOC, CT-DES, CT-NOG, CT-ES2, CT-SES, CT-AV2, CT-DSF, CT-STA, CT-GAM, CT-LST, CT-REC, CT-MOD, CT-NT2. Sem colidir com as siglas do Período 1.
4. **Densidade:** quantos casos por feature. O Período 1 tem de 12 a 22 por funcionalidade. Proposta: os critérios de aceite e as RNs de cada RF, mais autorização e mensageria quando houver.
5. **§9.7:** refazer a tabela com a execução mais recente de cada workflow na `desenvolvimento` (recomendado) ou manter a de 28/10 e acrescentar uma nova?

### 1.3 Escrever o plano

- Lista de casos previstos por feature: ID, requisito, cenário, nível e o teste candidato (`arquivo › nome`) já localizado.
- O que muda em cada seção: §9.1 (objetivo), §9.2 (escopo com as 14), §9.3.3 (rastreabilidade, citando os casos novos de RNF-TST-03 e RNF-TST-04, por exemplo), §9.5 (critérios), §9.6, §9.7, §9.8 (lacunas novas a partir de L-13), §9.9 (riscos novos, se houver) e o SUMÁRIO do `docs/README.md`, se surgir subseção.
- **Como a etapa 3 se divide:** um agente por grupo de features (sugestão: `leitura` em dois grupos, `social`, e `acervo` + `identidade`). Cada um escreve só as suas subseções num arquivo temporário do scratchpad, e o agente principal consolida no `9.plano_de_testes.md`. Assim ninguém edita o mesmo arquivo ao mesmo tempo.
- **Verificação de cada caso:** o nome do teste existe **exatamente** como citado (grep pelo nome no arquivo) e o teste passou no run do CI citado em §9.7.
- Estimativa em horas.

### 1.4 Fechar

Topo do plano: "Plano de DD/MM/2026, ainda não revisado". Atualize o Andamento e o README. Relatório: decisões fechadas, número de casos previsto, lacunas candidatas e o link do plano.

---

## Etapa 2 — Revisar o plano

> **Prompt:** Revise com contexto limpo o `plano-E6-01-plano-de-testes-desejaveis.md` contra o código da `origin/desenvolvimento`, os 14 arquivos de feature do Período 2 e o `REQUISITOS.md`. Não edite o `9.plano_de_testes.md`.

- **Conferir:**
  - cada RF da tabela de escopo tem pelo menos um caso previsto, no backend quando o requisito é de servidor (critério §9.5);
  - os testes candidatos existem com aquele nome;
  - os critérios de aceite das features estão cobertos ou viraram lacuna;
  - as funcionalidades só-mobile (F-SESSAO, F-DSF, F-GAM, F-NOT-2) não têm caso web inventado;
  - nenhuma lacuna foi omitida por estar "quase coberta".
- **Saída:** corrija o plano e anote no topo "revisado em DD/MM com N achados (veredito: …)". Achado que muda uma decisão do Renato vai como pergunta no relatório. Atualize o Andamento e o README.

---

## Etapa 3 — Realizar e validar

> **Prompt:** Execute o `plano-E6-01-plano-de-testes-desejaveis.md` desta pasta, que prevalece sobre este prompt nos detalhes. Não peça aprovação no meio.

1. `git fetch` e a branch da tarefa, `renato-e6-01`, criada a partir da `renato-features` (que tem estes prompts) e atualizada com a `origin/desenvolvimento` (ver contexto comum).
2. Divida conforme o plano: um agente por grupo de features, cada um escrevendo as suas subseções num arquivo do scratchpad. Consolide no `docs/9.plano_de_testes.md`.
3. §9.7: rode `gh run list --branch desenvolvimento --workflow <wf> --limit 1` para cada workflow e leia os totais nos logs (`gh run view --log`). Se o run mais recente falhou, **diga isso na tabela**, não esconda.
4. §9.8: lacunas novas a partir de L-13, no mesmo formato, com uma coluna para o dono da área (acrescente-a também em L-01..L-12). Se a E6-02 já tiver fechado alguma de L-01..L-12, atualize a situação dela.
5. **Validação por agentes de contexto limpo** (só leem): um agente por grupo de features confere cada linha. O teste citado existe com aquele nome exato? Ele prova o cenário e o resultado esperado? O requisito está certo? Faltou critério de aceite? Corrija os achados confirmados.
6. Commit `docs: plano de testes das funcionalidades desejáveis`. Atualize o Andamento e o README, depois `git push`. **Não abra o PR.**
7. Relatório: número de casos por feature, lacunas novas e o que depende do Renato.

---

## Etapa 4 — Revisão independente e PR

> **Prompt:** Revise com contexto limpo o `docs/9.plano_de_testes.md` da `renato-e6-01` (diff: `git diff origin/desenvolvimento...renato-e6-01 -- docs/9.plano_de_testes.md`) e abra o PR para a `desenvolvimento`.

1. Amostragem: escolha ao acaso pelo menos 3 casos por feature e confira o teste (nome, o que prova, resultado no run citado). Confira as subseções de §9.2, §9.3.3, §9.5, §9.7 e §9.8 e o SUMÁRIO.
2. Corrija os achados confirmados num commit `docs: correções da revisão do plano de testes`.
3. Integre a `origin/desenvolvimento`, faça o push e abra `gh pr create --base desenvolvimento --head renato-e6-01`. Corpo: resumo, escopo (14 features, N casos), lacunas novas, como foi verificado. Sem linha de atribuição. Lembre que, pelo filtro de caminho, mudança em `docs/` não roda CI.
4. Fechamento conforme o contexto comum: contribuição semanal, Kanban, Andamento e README. Relatório com o link do PR.
