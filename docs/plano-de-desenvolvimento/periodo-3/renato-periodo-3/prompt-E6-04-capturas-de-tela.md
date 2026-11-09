# Prompt — E6-04: Capturas das telas reais no `7.solucao.md`

> Escrito em 08/11/2026. **Leia antes o [`prompt-E6-contexto-comum.md`](prompt-E6-contexto-comum.md)**. Cada etapa é feita por um agente diferente, de contexto limpo. Para usar: *"Leia `docs/plano-de-desenvolvimento/periodo-3/renato-periodo-3/prompt-E6-04-capturas-de-tela.md` e execute a etapa N."*

## Andamento

| Etapa | Situação | Saída |
|---|---|---|
| 1. Planejar | não iniciada | `plano-E6-04-capturas-de-tela.md` nesta pasta |
| 2. Capturar e escrever (Períodos 1 e 2) | não iniciada | imagens em `docs/imagens/` e `docs/7.solucao.md` com as telas |
| 3. Revisão independente e PR | não iniciada | PR para a `desenvolvimento` |
| 4. Telas do Período 3 | depois do merge da `main` no fim de novembro | §7.3 com as telas das opcionais |

Quem terminar uma etapa atualiza esta tabela e a linha E6-04 do [`README.md`](README.md).

---

## Contexto da tarefa

**Item da entrega:** faz parte do documento da disciplina ("Documento de Arquitetura… versão final, completa e atualizada"). A seção 7 (Projeto da Solução) deve mostrar **as telas do sistema construído**, com uma descrição sucinta de cada uma.

**O que existe:** `docs/7.solucao.md` tem duas tabelas, §7.1 (Período 1, 9 linhas; a F-ACV-INGESTAO fica numa nota à parte, sem tela) e §7.2 (Período 2, 14 features), que apontam para os **protótipos**, não para telas reais. O status dela diz: "as capturas de tela do produto ainda serão adicionadas (em `docs/imagens/`)". No fim do arquivo há um modelo comentado por tela (imagem + descrição + requisito + cliente).

**Fonte das capturas:** o sistema real em **DES**, não os protótipos:

- web: `https://leai-web.onrender.com`
- mobile: APK `le-ai-v0.2.1-android.apk` do release `v0.2.1` (`gh release download v0.2.1 -p '*.apk'`), instalado no emulador `Pixel_8_API_35`

O DES roda o Período 2, então as telas do Período 3 (suspensão de conta, assuntos no livro pessoal e distribuição de notas) só entram na etapa 4.

**Dados nas telas:** uma tela vazia não mostra a solução. As capturas precisam de uma conta com estante, leituras, resenhas, listas, desafios etc. Os dados do DES não são replicados do dev. Ninguém pode aparecer com dado pessoal real de colega nas imagens sem o OK do Renato.

**Leitura obrigatória específica:** `docs/7.solucao.md`; `docs/orquestador/plano-de-projeto.md` §2 (convenção `docs/imagens/` para figuras); `docs/orquestador/documento-de-design.md` (temas claro e escuro, breakpoints); os arquivos de feature dos Períodos 1 e 2, só a lista de telas e os estados.

---

## Etapa 1 — Planejar

> **Prompt:** Produza o plano da E6-04. Não capture nada no DES nesta etapa. Saída: `plano-E6-04-capturas-de-tela.md` nesta pasta.

1. **Inventário de telas:** para cada linha das tabelas §7.1 e §7.2, as telas a capturar por cliente, com a rota da web ou o caminho de navegação no app e o estado mais representativo (por exemplo, a página do livro com nota, sinopse e resenhas). Corte o que é variação menor: o objetivo é uma figura por tela relevante, não todos os estados.
2. **Convenções** (proponha):
   - nome: `docs/imagens/solucao/<periodo>-<feature>-<tela>-<web|mobile>.png`;
   - tamanho: web em 1440 px e mobile no tamanho do Pixel 8;
   - tema claro como padrão, com o escuro só em uma ou duas telas de exemplo;
   - compressão: PNG otimizado, com meta de até ~300 KB por imagem;
   - layout no Markdown: por feature, uma tabela com web e mobile lado a lado e uma descrição de 1 a 2 frases com o RF.
3. **Roteiro de dados:** quais contas criar e o que cada uma precisa ter para as telas saírem preenchidas (leitor principal com estante e resenhas, um segundo leitor para seguir, comentar e recomendar, e o admin para o painel de moderação). Diga como criar, de preferência pela própria UI ou pela API do DES, sem tocar no banco.
4. **Decisões a fechar com o Renato** (lote curto, com a recomendada primeiro):
   - criar as contas de demonstração no DES, que ficam lá e também servem ao pitch e à E6-03;
   - credencial de admin do DES para o painel de moderação, que vem dele ou do segredo no Render;
   - o tema escuro entra (recomendação: só em 2 telas de exemplo);
   - as tabelas de protótipo saem do `7.solucao.md` ou ficam como coluna de referência (recomendação: ficam, numa coluna).
5. Estimativa em horas. Topo: "Plano de DD/MM/2026, ainda não revisado". Atualize o Andamento e o README. Relatório: número de telas, decisões e OKs que faltam.

---

## Etapa 2 — Capturar e escrever (Períodos 1 e 2)

> **Prompt:** Execute o `plano-E6-04-capturas-de-tela.md` desta pasta, só com os OKs registrados nele. Não peça aprovação no meio.

1. `git fetch` e a branch da tarefa, `renato-e6-04`, criada a partir da `renato-features` (que tem estes prompts) e atualizada com a `origin/desenvolvimento` (ver contexto comum).
2. Acorde os serviços do DES (`GET /health` em cada um) antes de começar, para não capturar a tela de carregamento do cold start.
3. Monte os dados pelo roteiro do plano.
4. **Web:** script `playwright-core` + Edge headless numa pasta do scratchpad, com login, navegação e `page.screenshot` por tela. Espere ~700 ms depois de cada navegação para a transição de cor terminar.
5. **Mobile:** APK de DES no emulador, navegação por `adb` + `uiautomator dump` e captura com `adb exec-out screencap -p > arquivo.png`. Para digitar, siga o contexto comum (caneta desligada, texto em pedaços de 4 caracteres).
6. Olhe cada imagem com a ferramenta Read antes de aceitar. Refaça as que tiverem skeleton, toast de erro, teclado aberto sem querer ou dado de outra pessoa.
7. Comprima as imagens e atualize `docs/7.solucao.md`:
   - status novo, com a data e a origem: DES, v0.2.1;
   - as figuras por feature no formato do plano;
   - o modelo comentado removido.
8. **Validação por agentes de contexto limpo** (só leem). Cada link de imagem abre? A imagem mostra a tela que a legenda diz? O RF da descrição está certo? Algum dado pessoal real aparece? Corrija os achados.
9. Commit `docs: telas reais do sistema na seção de solução`. Atualize o Andamento e o README, depois `git push`. **Não abra o PR.**
10. Relatório: quantas telas, as que ficaram de fora (com motivo) e as contas criadas no DES.

---

## Etapa 3 — Revisão independente e PR

> **Prompt:** Revise com contexto limpo o `docs/7.solucao.md` e as imagens novas da `renato-e6-04` e abra o PR para a `desenvolvimento`.

1. Confira a cobertura: toda linha de §7.1 e §7.2 tem pelo menos uma figura, ou um motivo para não ter. Confira também legendas, links, tamanho total adicionado ao repositório (`git diff --stat`) e ausência de dado pessoal.
2. Corrija os achados num commit `docs: correções da revisão das telas da solução`.
3. Integre a `origin/desenvolvimento`, faça o push e abra o PR. Corpo: número de telas por período, origem (DES v0.2.1), contas de demonstração criadas e o que fica para a etapa 4. Sem linha de atribuição.
4. Fechamento conforme o contexto comum. Relatório com o link do PR.

---

## Etapa 4 — Telas do Período 3

> **Prompt:** Depois do merge da `main` com o Período 3 no DES, acrescente a §7.3 com as telas das opcionais implementadas, nas mesmas convenções. As de F-MOD-OPC, F-ACV-OPC e F-STA-OPC já estão na `desenvolvimento`; as outras, se entrarem até 17/11. Abra um PR curto para a `desenvolvimento`.
