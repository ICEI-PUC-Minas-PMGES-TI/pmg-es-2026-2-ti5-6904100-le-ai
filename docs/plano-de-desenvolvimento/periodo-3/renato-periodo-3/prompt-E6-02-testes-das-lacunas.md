# Prompt — E6-02: Testes que faltam na área do Renato

> Escrito em 08/11/2026. **Leia antes o [`prompt-E6-contexto-comum.md`](prompt-E6-contexto-comum.md)**. Cada etapa é feita por um agente diferente, de contexto limpo. Para usar: *"Leia `docs/plano-de-desenvolvimento/periodo-3/renato-periodo-3/prompt-E6-02-testes-das-lacunas.md` e execute a etapa N."*

## Andamento

| Etapa | Situação | Saída |
|---|---|---|
| 1. Planejar | não iniciada | `plano-E6-02-testes-das-lacunas.md` nesta pasta |
| 2. Realizar e validar | não iniciada | testes novos nos projetos, §9.8 atualizada |
| 3. Revisão independente e PR | não iniciada | PR para a `desenvolvimento` |

Quem terminar uma etapa atualiza esta tabela e a linha E6-02 do [`README.md`](README.md).

---

## Contexto da tarefa

**Itens da entrega:** "Implementação de testes (Funcionalidades Desejáveis) - versão final" e o refino do "Código completo". O `plano-de-projeto.md` §3 descreve o Período 3 como "opcionais/refino + testes das desejáveis + ATAM inicial".

**Escopo: só a área do Renato.** Decisão do grupo de 30/10/2026 (`assets/atas/ATA-2026-10-30.md`): *"Cada dono também escreve os testes das suas features desejáveis do Período 2 e cobre as lacunas do plano de testes na sua área."* As features do Renato são:

- Período 0: P0-DEPLOY;
- Período 1: F-ACV-BUSCA e F-AVA;
- Período 2: F-ACV-NOTA, F-AVA-2 e F-MOD;
- Período 3: F-MOD-OPC e F-ACV-OPC.

Lacuna de outra área não é escrita aqui. Ela vai para o relatório como aviso ao dono, e o Renato decide se repassa. Os donos estão no topo de cada `feature-*.md`.

**Ponto de partida:** `docs/9.plano_de_testes.md` §9.8 lista 12 lacunas do levantamento do Período 1, todas "ficam para o Período 3". A coluna "Área provável" é uma estimativa a confirmar na etapa 1:

| ID | Lacuna | Requisito | Projeto(s) | Área provável |
|---|---|---|---|---|
| L-01 | RN-08 sem teste **unitário** no backend (só integração) | RNF-TST-01 | `identidade`, `leitura`, `social`, `acervo` | transversal: cada dono na sua parte (a do Renato é o `acervo`, via F-ACV-BUSCA) |
| L-02 | Nota e resenha sobrevivem ao abandono e não se duplicam na releitura | RN-04 | `leitura` | **Renato** (F-AVA), com a máquina de estados de F-EST (Ana) |
| L-03 | Consumidores do `social`: retry 1/5/15 s, ACK depois do commit, ligações da fila do feed, rollback de interação com outbox | RNF-TST-03, RNF-ERR-07 | `social` | Kayke (F-FEED, F-NOT) |
| L-04 | Falha do broker não desfaz a escrita de negócio no `leitura` | RNF-TST-03 | `leitura` | Ana (F-EST) |
| L-05 | Reenvio automático da fila offline no mobile (timer e volta ao primeiro plano) | RNF-ERR-05 | mobile | Ana (F-PRG) |
| L-06 | Validação no servidor dos campos do livro pessoal e idempotência de criar/editar | RF-ACV-08, RNF-ERR-04 | `acervo` | Vicenzo (F-ACV-CADASTRO) |
| L-07 | Texto que só aparece na sinopse não é encontrado pela busca | RN-19 | `acervo` | **Renato** (F-ACV-BUSCA) |
| L-08 | `progresso.registrado` entregue depois da exclusão do registro não o ressuscita | RN-17, RNF-TST-03 | `leitura` | Ana (F-PRG) |
| L-09 | Origem fora da lista recusada pelo CORS; CORS nos serviços Nest | RNF-SEC-21 | Nest e Spring | transversal (P0-INFRA, todos) |
| L-10 | Health check com banco fora do ar nos serviços Nest | RNF-OBS-02 | `acervo`, `leitura` | transversal (P0-INFRA) |
| L-11 | Limites de paginação e de quantidade de ids ao marcar notificações | RNF-SEC-13 | `social` | Kayke (F-NOT) |
| L-12 | Agendador real do job de inatividade (GitHub Actions) | RF-EST-11, 12 | workflow | Ana (F-EST) |

Confira cada uma no código da `origin/desenvolvimento` antes de planejar: alguma pode ter sido fechada por outra feature desde 28/10. Algumas estão citadas como pendência em arquivos de feature (L-04 em F-EST, L-08 em F-PRG).

**Lacunas das desejáveis:** a E6-01 vai acrescentar lacunas a partir de L-13 para as features do Período 2. Nesta tarefa entram as de F-ACV-NOTA, F-AVA-2 e F-MOD. Se a E6-01 ainda não tiver terminado, o próprio plano levanta os critérios de aceite dessas três features sem teste, com o mesmo método da E6-01 §1.1. **Os testes das opcionais do Renato** (F-MOD-OPC e F-ACV-OPC) foram escritos com as features e revisados nos PRs #61 e #62. Só entram aqui se o levantamento achar critério sem teste.

**Prazo:** o código congela em **24/11/2026**. Teste não é feature, então pode entrar depois de 17/11, mas antes de 24/11.

**Leitura obrigatória específica:** `docs/9.plano_de_testes.md` (§9.3, §9.4, §9.6 da funcionalidade de cada lacuna, e §9.8), `docs/orquestador/REQUISITOS.md` (as RNs/RNFs da tabela e §9), `docs/orquestador/documento-de-arquitetura.md` §5 (outbox, recibo, retry, DLQ) e §7 (transversais), e os `AGENTS.md` locais de cada projeto tocado.

---

## Etapa 1 — Planejar

> **Prompt:** Produza o plano da E6-02. Não escreva teste nesta etapa. Saída: `plano-E6-02-testes-das-lacunas.md` nesta pasta.

1. **Confirmar a área de cada lacuna.** Para L-01..L-12 e para as lacunas das desejáveis do Renato:
   - onde está o código que a lacuna exercita (caminho/linha);
   - se a lacuna ainda existe;
   - de quem é a área: a feature dona do comportamento, pelo arquivo de feature e pelo código.
   Monte duas listas:
   - **área do Renato:** entra nesta tarefa;
   - **área de outro dono:** vira aviso, com o dono e o teste sugerido, para o Renato repassar ao grupo.
2. **Para cada lacuna da área do Renato:** o teste proposto (arquivo novo ou existente, nível, nome em pt-BR no estilo do projeto). Teste em arquivo de outro dono, como o L-02, que toca a máquina de estados de F-EST, leva a nota no `AGENTS.md` do dono.
3. **Se o teste revelar bug:** proponha a regra ao Renato. Recomendação: no código do Renato, corrigir aqui. No código alheio, registrar no relatório e avisar o dono.
4. **Decisões a fechar com o Renato** (lote curto, com a recomendada primeiro):
   - a divisão das duas listas, sobretudo as lacunas transversais (L-01, L-09 e L-10): o Renato faz a parte do `acervo` e avisa os outros, ou leva ao grupo para decidir quem faz?
   - **L-01, parte do `acervo`:** extrair a checagem de RN-08 para testá-la unitariamente, ou aceitar a integração como cobertura e fechar com justificativa em §9.3.3?
   - **Ordem e corte:** as RNs prioritárias do RNF-TST-01 primeiro (L-02), depois as lacunas das desejáveis e por último as restantes. O que não couber até 24/11 é cortado a partir do fim.
5. **Etapa 2 em paralelo**, se houver mais de um projeto: um agente por projeto e os comandos de verificação de cada um.
5. Estimativa em horas por lacuna. Topo do plano: "Plano de DD/MM/2026, ainda não revisado". Atualize o Andamento e o README. Relatório: decisões, ordem e estimativa.

---

## Etapa 2 — Realizar e validar

> **Prompt:** Execute o `plano-E6-02-testes-das-lacunas.md` desta pasta, que prevalece nos detalhes. Não peça aprovação no meio.

1. `git fetch` e a worktree da tarefa, com a branch `renato-e6-02` criada a partir da `origin/desenvolvimento` (ver contexto comum). O plano e o Andamento são lidos e commitados na `renato-features`.
2. Escreva os testes na ordem do plano, rodando a verificação completa do projeto antes de cada commit. Testes de integração só em Postgres descartável. Um commit por lacuna ou por projeto, por exemplo `test(leitura): nota e resenha sobrevivem ao abandono (L-02)`.
3. Bug encontrado: siga a regra decidida na etapa 1. Correção em código alheio leva a nota no `AGENTS.md` do dono, no mesmo commit.
4. Atualize `docs/9.plano_de_testes.md`: §9.8 com a situação de cada lacuna ("fechada por `arquivo › nome`" ou "verificada manualmente: evidência") e os casos novos em §9.6, no formato e com os IDs da seção da funcionalidade. Se a E6-01 estiver em andamento noutra branch, combine pelo relatório para não haver conflito no mesmo arquivo.
5. **Validação por agentes de contexto limpo**, um por projeto tocado (só leem e testam). Cada teste novo prova o que a lacuna diz? Ele **falha** se o comportamento quebrar (peça ao validador para conferir a asserção, ou para mutar mentalmente o código e dizer se o teste pegaria)? Os testes antigos continuam verdes? Corrija os achados.
6. `git push`. **Não abra o PR.** Atualize o Andamento e o README.
7. Relatório: as lacunas fechadas, as cortadas, os bugs encontrados, a **lista de lacunas de outros donos** (dono e teste sugerido, pronta para o Renato repassar) e o que depende do Renato.

---

## Etapa 3 — Revisão independente e PR

> **Prompt:** Revise com contexto limpo os testes da E6-02 na `renato-e6-02` (`git diff origin/desenvolvimento...renato-e6-02`) e abra o PR para a `desenvolvimento`.

1. Um revisor por projeto tocado, que só lê e testa. Confere se os testes são determinísticos (sem dependência de relógio real ou de ordem), se as notas nos `AGENTS.md` dos donos estão lá e se o §9.8 bate com o código.
2. Corrija os achados confirmados num commit `fix: correções da revisão dos testes das lacunas` e rode a verificação completa de novo.
3. Integre a `origin/desenvolvimento`, faça o push e abra o PR. Corpo: lacunas fechadas (com os testes), cortadas, bugs corrigidos, avisos aos donos alheios e os números dos testes por projeto. Sem linha de atribuição. Confira que o CI de cada projeto tocado ficou verde.
4. Fechamento conforme o contexto comum. Relatório com o link do PR.
