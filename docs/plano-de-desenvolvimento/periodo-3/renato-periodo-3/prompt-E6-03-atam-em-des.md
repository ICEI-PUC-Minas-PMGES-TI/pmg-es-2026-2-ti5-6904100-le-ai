# Prompt — E6-03: Avaliação da Arquitetura (ATAM) com medições em DES

> Escrito em 08/11/2026. **Leia antes o [`prompt-E6-contexto-comum.md`](prompt-E6-contexto-comum.md)**. Cada etapa é feita por um agente diferente, de contexto limpo. Para usar: *"Leia `docs/plano-de-desenvolvimento/periodo-3/renato-periodo-3/prompt-E6-03-atam-em-des.md` e execute a etapa N."*

## Andamento

| Etapa | Situação | Saída |
|---|---|---|
| 1. Planejar o roteiro de medição | concluída em 19/11/2026: plano ainda não revisado, com as contas de demonstração (compartilhadas com a E6-04), carga leve (até 10 clientes, teto de 10 req/s), cenário 5 local em Docker, ≈ 25,5 h e 4 pendências | [`plano-E6-03-atam-em-des.md`](plano-E6-03-atam-em-des.md) |
| 2. Medir e escrever | concluída em 20/11/2026: medições de 19/11 (cenários 1 a 6) e segunda rodada do cenário 4 em 21/11 UTC (cold start com limite de 300 s e reenvio idempotente); documento reescrito no template da PUC, `.docx`/`.pdf` sobre o template, 2 validadores de contexto limpo com os achados corrigidos; branch `renato-e6-03` com push (`16b155a`). Falta a medição do app offline no emulador | `docs/8.avaliacao_arquitetura.md`, `assets/arquitetura/Relatorio_ATAM_LeAi.{docx,pdf}`, `docs/evidencias/atam/` |
| 3. Revisão independente e merge direto (sem PR, decisão do Renato de 19/11/2026) | não iniciada | commit, push da `renato-e6-03` e merge direto na `desenvolvimento` pelo orquestrador |
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

**Leitura obrigatória específica:** `docs/8.avaliacao_arquitetura.md` inteiro; `docs/orquestador/documento-de-arquitetura.md` §5 (mensageria), §6 (infraestrutura) e §7 (transversais); `docs/orquestador/REQUISITOS.md` §7 (RNFs citados nos cenários) e §8 (segurança); `docs/mensageria/README.md` e `catalogo.md`; `docs/api/README.md`; `docs/plano-de-desenvolvimento/periodo-0/feature-P0-DEPLOY.md` (ambientes) e `feature-P0-MSG.md` (topologia, `ping.teste`, DLQ); e os modelos ATAM da disciplina.

**Template obrigatório da disciplina (Arquitetura de Software, Prof. Filipe Tório)**, fora do repositório, em `C:\Users\Renato\Documents\PUC\Período 5\Arquiterura de Software\ATAM\`:

- `Template_Relatorio_ATAM_PUC_2026.docx`: "estrutura base obrigatória para a entrega da Avaliação Arquitetural". Seções: 1. Resumo executivo; 2. Objetivos de negócio e direcionadores; 3. Topologia (diagrama + tabela Componente / Tecnologia / Papel e comunicação); 4. Árvore de utilidade e inventário de cenários (tabela ID `C-NN` / Atributo / Descrição com estímulo, ambiente e resposta / Prioridade Negócio-Dificuldade); 5. Inventário analítico: Riscos `R-NN`, Não-riscos `NR-NN`, Tradeoffs `T-NN` e Pontos de sensibilidade `S-NN`, cada um com cenários afetados e descrição técnica; 6. Plano de ação (curto e médio/longo prazo); assinaturas.
- `ATAM_RelatórioFinal.pdf`: o exemplo preenchido (sistema de leilão), para tom e nível de detalhe.
- `ATAM.pdf`, `Introd. ATAM.pdf`, `ATAM_Paper.pdf` e `Aula - ATAM.pps`: material de aula.

O `docs/8.avaliacao_arquitetura.md` segue essas seções (mais os resultados das medições, a avaliação final e as evidências), e a versão para entrega é um `.docx` montado sobre o próprio template, com `.pdf`, em `assets/arquitetura/`. A tabela antiga por atributo (Atributo, Requisito, Preocupação, Cenários, Ambiente, Estímulo, Mecanismo, Medida de resposta) **não** é o template desta disciplina. Assinam os 5 integrantes (decisão do Renato de 20/11/2026).

---

## Etapa 1 — Planejar o roteiro de medição

> **Prompt:** Produza o roteiro de medição da E6-03. Não meça nada no DES nesta etapa (leitura de configuração pelos MCPs é livre). Saída: `plano-E6-03-atam-em-des.md` nesta pasta.

1. **Para cada cenário:** passos exatos, ferramenta (curl/script Node, `k6` ou `autocannon` para a carga, Edge via `playwright-core` para a web, emulador + APK de DES para o app, MCP da CloudAMQP para a mensageria, Render para logs), a evidência que fica (print, log com `correlationId`, saída do script, JSON) e onde ela é guardada. Sugestão: `docs/evidencias/atam/`, com nomes `cenario-N-*.{png,json,txt}`.
2. **Onde cada item roda:** alguns itens do cenário 5 exigem forçar falha. Exemplos: indisponibilizar o broker durante uma escrita, ou uma falha transitória para observar 1/5/15 s. Fazer isso no DES derruba um ambiente compartilhado. Proponha rodar esses itens em **dev** ou com os serviços locais apontando para o broker de dev, e **declarar no documento onde cada medição foi feita**. O que for medido em DES diz "DES".
3. **Carga do cenário 3:** proponha concorrência e duração modestas (por exemplo, 10 a 20 clientes por 60 s, depois de aquecer o serviço), as consultas (título, autor e ISBN reais do acervo de DES) e como tratar o rate limit, se a busca tiver. Calcule o impacto no plano gratuito do Neon e do Render. **Exige OK do Renato.**
4. **Estrutura ATAM:** a do `Template_Relatorio_ATAM_PUC_2026.docx` (ver Contexto). Proponha os direcionadores, a árvore de utilidade com os 6 cenários como `C-01` a `C-06` e a prioridade de cada um, e os R/NR/T/S esperados, com as medidas de resposta tiradas dos RNFs.
5. **Decisões a fechar com o Renato** (lote curto, com a recomendada primeiro):
   - criar contas de teste no DES (2 ou 3 leitores com e-mail `.invalid`, um com perfil privado e um com livro pessoal), que ficam lá depois;
   - rodar a carga do cenário 3 no DES, com os parâmetros propostos;
   - publicar mensagens de teste no broker de DES (`ping.teste`, `eventId` repetido e schema inválido para a DLQ) e quem esvazia a DLQ depois;
   - fazer agora com a v0.2.1 e refazer na etapa 4 só o que o Período 3 mudar (recomendado), ou esperar o merge da `main`.
6. Estimativa em horas. Topo: "Plano de DD/MM/2026, ainda não revisado". Atualize o Andamento e o README. Relatório: o roteiro resumido e os OKs que faltam.

---

## Etapa 2 — Medir e escrever

> **Prompt:** Execute o roteiro do `plano-E6-03-atam-em-des.md` desta pasta, só com os OKs que o Renato deu (estão registrados no plano). O que não tiver OK fica de fora e vai para o relatório. Não peça aprovação no meio.

1. `git fetch` e a worktree da tarefa, com a branch `renato-e6-03` criada a partir da `origin/desenvolvimento` (ver contexto comum). O plano e o Andamento são lidos e commitados na `renato-features`.
2. Antes de medir, acorde os serviços (um `GET /health` em cada um, esperando o cold start) e registre o horário. Se um serviço estiver fora do ar ou com deploy falhando, consulte os logs pelo MCP do Render e relate. Não tente corrigir o DES.
3. Meça cenário por cenário, guardando a evidência no caminho do plano. Imagens comprimidas, para não pesar o repositório.
4. **Resultado negativo é resultado.** Se o p95 passar de 1 s, ou um acesso não for negado, registre como está, com a evidência, e trate como risco nas Considerações. **Não ajuste código nesta tarefa.** Se o achado for de segurança (vazamento de perfil privado ou IDOR), pare a etapa e comunique ao Renato no relatório, em destaque.
5. Atualize `docs/8.avaliacao_arquitetura.md` na estrutura do template da disciplina (ver Contexto):
   - resumo executivo, direcionadores, topologia, árvore de utilidade e inventário `C-01` a `C-06`;
   - os resultados das medições por cenário, com valor medido, ambiente e data;
   - os R/NR/T/S revistos à luz das medições e o plano de ação;
   - uma **avaliação final** curta: a arquitetura atende ou não a cada atributo, com o que fica de risco;
   - a seção "Evidências dos testes realizados" com links para os arquivos.
   O comentário no topo diz que os cenários derivam do orquestador: o texto de cada cenário não muda, só ganha o ID `C-NN` e a prioridade. Divergência entre cenário e sistema vai para o relatório. Gere também o `.docx` sobre o template (cabeçalho da PUC preservado, parágrafo "EXCLUA ESTE PARÁGRAFO" removido, nenhum texto entre colchetes sobrando, assinaturas dos 5 integrantes) e o `.pdf` pelo Word, em `assets/arquitetura/`. Confira o PDF página por página.
6. Se tiver o OK, limpe o que a medição deixou no DES (mensagens na DLQ de teste) e registre o que ficou (contas de teste).
7. **Validação por agentes de contexto limpo** (só leem). Cada número tem evidência no repositório? A conta do p95 está certa a partir dos dados brutos? O ambiente de cada medição está declarado? Nenhuma afirmação vai além do que foi medido? Corrija os achados.
8. Commit `docs: avaliação da arquitetura com as medições em DES`. Atualize o Andamento e o README, depois `git push`. **Não abra o PR.**
9. Relatório: atende/não atende por atributo, os números principais e o que ficou sem medir (com motivo).

---

## Etapa 3 — Revisão independente e merge direto

> **Prompt:** Revise com contexto limpo o `docs/8.avaliacao_arquitetura.md`, o `.docx`/`.pdf` de `assets/arquitetura/` e o `docs/evidencias/atam/` da `renato-e6-03`, e faça o merge direto na `desenvolvimento` (sem PR, decisão do Renato de 19/11/2026).

1. Confira se cada medida tem evidência, se a conta bate com os dados brutos, se o documento segue as seções do template da disciplina e se nada contradiz o `REQUISITOS.md` nem a arquitetura. Confira também se o `.docx` e o `.md` dizem o mesmo. Reproduza ao menos uma medição barata, como um acesso negado do cenário 1 ou a comparação de um spec do cenário 6.
2. Corrija os achados num commit `docs: correções da revisão da avaliação da arquitetura`.
3. Integre a `origin/desenvolvimento`, faça o push da `renato-e6-03` e o merge direto na `desenvolvimento`. Sem linha de atribuição nos commits.
4. Fechamento conforme o contexto comum. Relatório curto com o commit do merge.

---

## Etapa 4 — Atualização pós-Período 3

> **Prompt:** Depois do merge da `main` com o Período 3 no DES, refaça só as medições que o Período 3 pode ter mudado. Exemplos: o cenário 1 com conta suspensa (F-MOD-OPC), a busca do cenário 3 com os assuntos do livro pessoal fora do índice (F-ACV-OPC) e o cenário 6 com os specs novos. Atualize as datas e a avaliação final no `.md` e no `.docx`/`.pdf`, e faça o merge direto na `desenvolvimento`, sem PR.
