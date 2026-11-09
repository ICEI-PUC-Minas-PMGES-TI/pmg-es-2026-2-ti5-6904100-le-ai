# Prompt — E6-03: Avaliação da Arquitetura (ATAM) com medições em DES

> Escrito em 08/11/2026. **Leia antes o [`prompt-E6-contexto-comum.md`](prompt-E6-contexto-comum.md)**. Cada etapa é feita por um agente diferente, de contexto limpo. Para usar: *"Leia `docs/plano-de-desenvolvimento/periodo-3/renato-periodo-3/prompt-E6-03-atam-em-des.md` e execute a etapa N."*

## Andamento

| Etapa | Situação | Saída |
|---|---|---|
| 1. Planejar o roteiro de medição | não iniciada | `plano-E6-03-atam-em-des.md` nesta pasta |
| 2. Medir e escrever | não iniciada | `docs/8.avaliacao_arquitetura.md` com as medições e as evidências |
| 3. Revisão independente e PR | não iniciada | PR para a `desenvolvimento` |
| 4. Atualização pós-Período 3 | depois do merge da `main` no fim de novembro | só o que o Período 3 mudar |

Quem terminar uma etapa atualiza esta tabela e a linha E6-03 do [`README.md`](README.md).

---

## Contexto da tarefa

**Item da entrega:** "Avaliação da Arquitetura – versão final".

**O que existe:** `docs/8.avaliacao_arquitetura.md` tem os **6 cenários** escritos (§8.1) e **uma** tabela ATAM, a de Segurança, com a medida "a medir em DES". Tem também o protocolo de verificação dos cenários 5 e 6 e a lista do que "ainda deve ser coletado em DES/HML". **Nenhuma medição foi feita.**

| Cenário | Atributo | O que medir |
|---|---|---|
| 1 | Segurança: perfil privado | Estante, resenhas, estatísticas, listagem e busca de perfil privado negadas a quem não segue |
| 2 | Segurança: IDOR e livro pessoal | Adicionar à estante, favoritar e iniciar leitura com o id de livro pessoal alheio. Consulta só por `via=feed\|lista` válida |
| 3 | Desempenho | Busca por título/autor/ISBN com clientes concorrentes: **p95 ≤ 1 s**, sem contar o cold start |
| 4 | Disponibilidade/resiliência | Cold start de 30–60 s tratado como carregamento prolongado; fila offline do app reenviada ao reconectar, sem perda nem duplicação |
| 5 | Resiliência assíncrona | Retry 1/5/15 s e DLQ sem bloquear a fila; `eventId` duplicado sem efeito em dobro; broker fora não desfaz a escrita (outbox) |
| 6 | Manutenibilidade/interoperabilidade | Specs em runtime iguais aos YAMLs de `docs/api/`; consumidores usam só VIEW, HTTP ou evento versionado; `ping.teste` Spring → Nest com o mesmo envelope |

**Ambiente:** DES/HML no Render (Oregon), com Neon `le-ai-oregon` e CloudAMQP `Le-ai-oregon`. Hoje roda a **v0.2.1** (Período 2). URLs:

- web: `https://leai-web.onrender.com`
- serviços: `https://leai-identidade.onrender.com`, `https://leai-acervo.onrender.com`, `https://leai-leitura.onrender.com` e `https://leai-social.onrender.com`
- APK de DES: asset do release `v0.2.1` (`gh release view v0.2.1`)

O plano gratuito do Render hiberna os serviços, e há rate limiting nas rotas de autenticação e nas ações sociais. Os dois afetam as medições e precisam ser tratados no roteiro, não descobertos no meio.

**Leitura obrigatória específica:** `docs/8.avaliacao_arquitetura.md` inteiro; `docs/orquestador/documento-de-arquitetura.md` §5 (mensageria), §6 (infraestrutura) e §7 (transversais); `docs/orquestador/REQUISITOS.md` §7 (RNFs citados nos cenários) e §8 (segurança); `docs/mensageria/README.md` e `catalogo.md`; `docs/api/README.md`; `docs/plano-de-desenvolvimento/periodo-0/feature-P0-DEPLOY.md` (ambientes) e `feature-P0-MSG.md` (topologia, `ping.teste`, DLQ); e os modelos ATAM da disciplina, se o Renato tiver o enunciado.

---

## Etapa 1 — Planejar o roteiro de medição

> **Prompt:** Produza o roteiro de medição da E6-03. Não meça nada no DES nesta etapa (leitura de configuração pelos MCPs é livre). Saída: `plano-E6-03-atam-em-des.md` nesta pasta.

1. **Para cada cenário:** passos exatos, ferramenta (curl/script Node, `k6` ou `autocannon` para a carga, Edge via `playwright-core` para a web, emulador + APK de DES para o app, MCP da CloudAMQP para a mensageria, Render para logs), a evidência que fica (print, log com `correlationId`, saída do script, JSON) e onde ela é guardada. Sugestão: `docs/evidencias/atam/`, com nomes `cenario-N-*.{png,json,txt}`.
2. **Onde cada item roda:** alguns itens do cenário 5 exigem forçar falha. Exemplos: indisponibilizar o broker durante uma escrita, ou uma falha transitória para observar 1/5/15 s. Fazer isso no DES derruba um ambiente compartilhado. Proponha rodar esses itens em **dev** ou com os serviços locais apontando para o broker de dev, e **declarar no documento onde cada medição foi feita**. O que for medido em DES diz "DES".
3. **Carga do cenário 3:** proponha concorrência e duração modestas (por exemplo, 10 a 20 clientes por 60 s, depois de aquecer o serviço), as consultas (título, autor e ISBN reais do acervo de DES) e como tratar o rate limit, se a busca tiver. Calcule o impacto no plano gratuito do Neon e do Render. **Exige OK do Renato.**
4. **Tabelas ATAM:** o template da disciplina tem uma tabela por atributo (Atributo, Requisito, Preocupação, Cenários, Ambiente, Estímulo, Mecanismo, Medida de resposta) e as Considerações (Riscos, Pontos de sensibilidade, Tradeoff). Hoje só existe a de Segurança. Proponha as tabelas de Desempenho, Disponibilidade/Resiliência e Manutenibilidade/Interoperabilidade, com as medidas de resposta tiradas dos RNFs.
5. **Decisões a fechar com o Renato** (lote curto, com a recomendada primeiro):
   - criar contas de teste no DES (2 ou 3 leitores com e-mail `.invalid`, um com perfil privado e um com livro pessoal), que ficam lá depois;
   - rodar a carga do cenário 3 no DES, com os parâmetros propostos;
   - publicar mensagens de teste no broker de DES (`ping.teste`, `eventId` repetido e schema inválido para a DLQ) e quem esvazia a DLQ depois;
   - fazer agora com a v0.2.1 e refazer na etapa 4 só o que o Período 3 mudar (recomendado), ou esperar o merge da `main`.
6. Estimativa em horas. Topo: "Plano de DD/MM/2026, ainda não revisado". Atualize o Andamento e o README. Relatório: o roteiro resumido e os OKs que faltam.

---

## Etapa 2 — Medir e escrever

> **Prompt:** Execute o roteiro do `plano-E6-03-atam-em-des.md` desta pasta, só com os OKs que o Renato deu (estão registrados no plano). O que não tiver OK fica de fora e vai para o relatório. Não peça aprovação no meio.

1. `git fetch` e a branch da tarefa, `renato-e6-03`, criada a partir da `renato-features` (que tem estes prompts) e atualizada com a `origin/desenvolvimento` (ver contexto comum).
2. Antes de medir, acorde os serviços (um `GET /health` em cada um, esperando o cold start) e registre o horário. Se um serviço estiver fora do ar ou com deploy falhando, consulte os logs pelo MCP do Render e relate. Não tente corrigir o DES.
3. Meça cenário por cenário, guardando a evidência no caminho do plano. Imagens comprimidas, para não pesar o repositório.
4. **Resultado negativo é resultado.** Se o p95 passar de 1 s, ou um acesso não for negado, registre como está, com a evidência, e trate como risco nas Considerações. **Não ajuste código nesta tarefa.** Se o achado for de segurança (vazamento de perfil privado ou IDOR), pare a etapa e comunique ao Renato no relatório, em destaque.
5. Atualize `docs/8.avaliacao_arquitetura.md`:
   - medida de resposta com o valor medido, ambiente e data;
   - as tabelas ATAM novas;
   - as Considerações revistas à luz das medições;
   - a seção "Evidências dos testes realizados" com links para os arquivos;
   - uma **avaliação final** curta: a arquitetura atende ou não a cada atributo, com o que fica de risco.
   O comentário no topo diz que os cenários derivam do orquestador: não altere os cenários, só preencha as medições. Divergência entre cenário e sistema vai para o relatório.
6. Se tiver o OK, limpe o que a medição deixou no DES (mensagens na DLQ de teste) e registre o que ficou (contas de teste).
7. **Validação por agentes de contexto limpo** (só leem). Cada número tem evidência no repositório? A conta do p95 está certa a partir dos dados brutos? O ambiente de cada medição está declarado? Nenhuma afirmação vai além do que foi medido? Corrija os achados.
8. Commit `docs: avaliação da arquitetura com as medições em DES`. Atualize o Andamento e o README, depois `git push`. **Não abra o PR.**
9. Relatório: atende/não atende por atributo, os números principais e o que ficou sem medir (com motivo).

---

## Etapa 3 — Revisão independente e PR

> **Prompt:** Revise com contexto limpo o `docs/8.avaliacao_arquitetura.md` e o `docs/evidencias/atam/` da `renato-e6-03` e abra o PR para a `desenvolvimento`.

1. Confira se cada medida tem evidência, se a conta bate com os dados brutos, se as tabelas seguem o template e se nada contradiz o `REQUISITOS.md` nem a arquitetura. Reproduza ao menos uma medição barata, como um acesso negado do cenário 1 ou a comparação de um spec do cenário 6.
2. Corrija os achados num commit `docs: correções da revisão da avaliação da arquitetura`.
3. Integre a `origin/desenvolvimento`, faça o push e abra o PR. Corpo: resumo por atributo, onde cada medição foi feita e o que fica para a atualização pós-Período 3. Sem linha de atribuição.
4. Fechamento conforme o contexto comum. Relatório com o link do PR.

---

## Etapa 4 — Atualização pós-Período 3

> **Prompt:** Depois do merge da `main` com o Período 3 no DES, refaça só as medições que o Período 3 pode ter mudado. Exemplos: o cenário 1 com conta suspensa (F-MOD-OPC), a busca do cenário 3 com os assuntos do livro pessoal fora do índice (F-ACV-OPC) e o cenário 6 com os specs novos. Atualize as datas e a avaliação final, e abra um PR curto para a `desenvolvimento`.
