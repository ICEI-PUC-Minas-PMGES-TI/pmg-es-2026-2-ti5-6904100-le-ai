# Plano — E6-06: Relatório de encerramento do projeto

> Plano de 19/11/2026, ainda não revisado. Etapas 1 e 2 feitas na mesma sessão, a pedido do Renato. Prompt: [`prompt-E6-06-relatorio-de-encerramento.md`](prompt-E6-06-relatorio-de-encerramento.md). Regras: [`prompt-E6-contexto-comum.md`](prompt-E6-contexto-comum.md).

## Decisões (fechadas pelo Renato em 19/11/2026)

1. **Sem template da disciplina.** O relatório segue a estrutura PMBOK do item 1.1 do prompt (dez seções, abaixo).
2. **Custo realizado** = horas registradas × valor-hora do [`orcamento_do_projeto.md`](../../../../assets/gerencia/orcamento_do_projeto.md) (R$ 45,00/h, TAP 4.1). Fontes das horas: a contribuição semanal e as estimativas dos planos, citando a fonte e deixando claro o que é estimativa. Infraestrutura a custo zero (planos gratuitos). **Onde as horas não forem verificáveis, o relatório diz isso** em vez de inventar (ver "Custos" abaixo: hoje não são verificáveis para ninguém).
3. **Lições aprendidas e avaliação do grupo:** o agente prepara de 5 a 8 perguntas curtas para o Renato levar ao grupo e deixa o marcador `A completar com o grupo`. Nada é escrito sem resposta.
4. **Quem assina e o `.docx`/`.pdf`:** ficam para a etapa 3, como pendência.
5. **Sem PR.** O Renato autorizou merge direto das tarefas E6 na `desenvolvimento`. Na etapa 2: commit e push da branch `renato-e6-06`, sem PR. O merge fica para depois da etapa 3 (o relatório só fecha depois de 24/11).
6. **Período 3 até hoje.** Desde que o prompt foi escrito (08/11), a E6-01, a E6-02 e a E6-05 entraram na `desenvolvimento`, o congelamento de features passou (17/11) e o plano de testes final tem 722 casos e 4.217 testes no CI (19/11). O rascunho cobre o Período 3 até 19/11/2026 com evidência; o que vem depois de 24/11 (release final, produção, pitch) leva `A completar após 24/11`.

## Estrutura e fontes

| # | Seção | Fontes | Preenchido na etapa 2 | Fica para depois |
|---|---|---|---|---|
| 1 | Identificação do projeto e da equipe | TAP nº 01 (`assets/atas/TermoDeAberturaDoProjeto.pdf`), `ATA-2026-08-23.md`, Declaração de Escopo §8 | tudo | — |
| 2 | Objetivos do TAP × resultado | TAP 1.5, 1.7 e 2.3; plano de testes §9.7; `8.avaliacao_arquitetura.md`; README do Período 0 | objetivo, qualidade e entregáveis até 19/11 | produção (24/11), ATAM medido, vídeo e pitch |
| 3 | Escopo planejado × entregue | `docs/plano-de-desenvolvimento/README.md` e READMEs dos períodos, arquivos de feature, `gh pr list --state merged`, atas | Períodos 0 a 2 e o Período 3 até 19/11 | registro formal do corte de F-REC-ALG e F-GAM-OPC (grupo) |
| 4 | Cronograma: marcos × datas reais | Declaração de Escopo §6 (M1 a M10), plano de projeto §3, `gh release list`, PRs, atas, `git log`, `Previsoes-do-Cronograma-Le-Ai.xlsx` | M2 a M7 | M1 (sem registro no repositório), M8 a M10 |
| 5 | Custos: previsto × realizado | `orcamento_do_projeto.md`, `Previsoes-do-Orcamento-Le-Ai.xlsx`, contribuição semanal, planos da E6-01 e da E6-02 | linha de base, desembolso, ausência de apontamento | horas declaradas pelo grupo (pergunta 5), nov e dez |
| 6 | Qualidade | `docs/9.plano_de_testes.md` §9.5 a §9.9, `docs/6.1.avaliacao_heuristica_leai.md`, `docs/8.avaliacao_arquitetura.md`, plano de projeto §10 | testes, CI, lacunas, heurística, DoD | ATAM com medições em DES (E6-03) |
| 7 | Riscos previstos × ocorridos | plano de projeto §13, atas, PRs #59 e #60, cronograma, plano de testes §9.9 | riscos até 19/11 | os de 24/11 em diante |
| 8 | Lições aprendidas | o grupo | — | tudo (`A completar com o grupo`) |
| 9 | Situação final | `gh release list`, `git log origin/main`, READMEs dos períodos, arquivos de feature, `assets/gerencia/README.md` | estado em 19/11 e pendências conhecidas | release final, PROD, recomendações do grupo |
| 10 | Aceite e assinaturas | TAP 5, Declaração de Escopo §8 | quadro de nomes | assinaturas, `.docx`/`.pdf` (etapa 3) |

## Números levantados em 19/11/2026 (conferidos nas fontes)

- **Features:** 37 planejadas (6 do Período 0, 10 prioritárias, 14 desejáveis, 7 opcionais) e 130 RFs (54 E, 61 D, 15 O): `docs/plano-de-desenvolvimento/README.md`. A ata de 23/08 fala em 129 RFs; o relatório usa o número do plano de desenvolvimento e registra a diferença.
- **Entregues:** 10 prioritárias na `main` em 29/09 (PR #45, `v0.1.0`); 14 desejáveis na `main` em 03/11 (PR #58, `v0.2.0`, correções #59 e #60, `v0.2.1`); 5 opcionais na `desenvolvimento` (PRs #61, #62, #63, #64 e #65, de 06/11 a 16/11). F-REC-ALG e F-GAM-OPC: "não iniciado" nos arquivos de feature e sem PR até 19/11.
- **Releases** (`gh release list`, horário de Brasília): `v0.1.0` publicada em 30/09/2026 00:11 (tag no commit `1eb1fc7`, de 29/09 23:12); `v0.2.0` em 03/11 19:49; `v0.2.1` em 03/11 20:31. A `main` (DES) está em `f1f5c7e` (03/11 20:16) desde então.
- **PRs mergeados:** 28 (#38 a #45 e #48 a #67; #46 e #47 estão abertos), por `gh pr list --state merged`.
- **Testes:** 722 casos e 4.217 testes verdes no CI em 19/11 (plano de testes §9.7); 190 casos e 3.751 testes em 30/10 (`ATA-2026-10-30.md`); 44 lacunas (L-01 a L-44) na §9.8.
- **Custos:** linha de base R$ 46.420,88 (RH R$ 32.400,00 = 720 h × R$ 45,00); status em 26/10 de R$ 30.947,25 realizado, CPI 1,00 **por premissa** (sem apontamento de horas); desembolso R$ 0,00 (`orcamento_do_projeto.md` §3, §6).
- **Horas:** nenhuma das cinco contribuições semanais registra horas. As únicas estimativas em horas são dos planos do Renato: E6-01 ≈ 11,5 h (§8) e E6-02 ≈ 55 h (§7), de agente e conferência, planejadas e não medidas. F-MOD-OPC e F-ACV-OPC estimaram 8 dias cada, sem conversão em horas.

## Perguntas ao grupo (o Renato leva; o relatório só usa as respostas)

1. **O que funcionou bem** no processo (divisão vertical com dono de ponta a ponta, arquivo de feature, CI, uso de agentes)? Um ou dois exemplos concretos.
2. **O que vocês fariam diferente?** O que atrasou ou gerou retrabalho (por exemplo, P0-MSG adiada em 11/09, CI quebrado na `main` depois do merge do Período 2, validação em DES só no fechamento)?
3. **Assistentes de IA e agentes:** onde ajudaram, onde atrapalharam, e que cuidado vocês recomendariam a outro grupo?
4. **F-REC-ALG e F-GAM-OPC:** foram cortadas no congelamento de 17/11? Quem decidiu, quando e por quê?
5. **Horas:** cada um consegue declarar quantas horas dedicou ao projeto por mês (agosto a novembro)? Entra como estimativa declarada, não como medição, e substitui a premissa de 8 h semanais no custo realizado.
6. **Avaliação do grupo:** de 1 a 5, como avaliam a comunicação, a divisão do trabalho e o cumprimento dos prazos? Algum comentário que deva constar?
7. **Riscos não registrados:** houve algum problema que não está em ata (indisponibilidade de alguém, limite de plano gratuito, conflito em código compartilhado, perda de trabalho)?
8. **Continuidade:** que recomendação deixariam a quem continuasse o produto? O que fariam a seguir?

## Achados para outros donos (não corrigidos aqui; o Renato decide se repassa)

- **Ana:** `feature-F-STA-OPC.md` ainda diz "implementado, aguardando CI" nas três camadas, mas o PR #63 entrou em 08/11 e o CI de 19/11 rodou os testes da feature (plano de testes §9.6.28 e §9.7).
- **Vicenzo:** `feature-F-DSF-OPC.md` diz "implementado (07/11/2026)", sem citar o merge do PR #64 em 16/11.
- **Henrique e Vicenzo:** `feature-F-REC-ALG.md` e `feature-F-GAM-OPC.md` continuam "não iniciado" depois do congelamento de 17/11, sem registro do corte.
- **Dono de P0-DEPLOY:** a tabela-mestre do plano de desenvolvimento diz Renato; a ata de 23/08 diz Kayke e a de 11/09, Vicenzo. O relatório cita as atas e não decide.

## Validação da etapa 2 (19/11/2026)

Um agente de contexto limpo conferiu cerca de 120 itens contra as fontes (PRs, releases e tags pelo `gh` e pelo `git`, atas, TAP, orçamento e planilhas, plano de testes, arquivos de feature). Nenhum número errado e nenhum link quebrado; 8 achados de interpretação, todos corrigidos antes do commit `fd2e832`:

1. M2: o plano de desenvolvimento não atrasou; as 37 features já estavam por período no quadro em 23/08 (ata de kickoff). O commit de 29/08 é só a entrada no repositório.
2. M3: "TAP no prazo" virou aprovação em 23/08, assinaturas completas em 12/09 (+11 dias) e Período 0 validado em 22/09 (+21 dias); a situação do Documento de Arquitetura em 01/09 ficou para o grupo.
3. M4: relatório heurístico no repositório 7 dias depois do marco; data no Canvas fica para o grupo.
4. M5 e M6: "no prazo" vale para merge, tag e release; a validação em DES não foi registrada (Período 1) ou foi parcial (Período 2).
5. Cronograma: variação em dias úteis; P0-MSG tinha dois itens abertos, não um.
6. Segurança: token e recuperação de uso único têm casos; hash de senha e LGPD não têm caso dedicado no plano de testes.
7. Estouro do plano gratuito é risco do orçamento §5, não do plano de projeto §13; última medição em 24/09.
8. E6-01: "≈ 11,5 h, mais 1 a 2 h por opcional"; os 66,5 h são piso.

## Etapas

- **Etapa 2 (19/11/2026):** worktree `../le-ai-e6-06` na branch `renato-e6-06`, criada da `origin/desenvolvimento` em `30661ba`. Rascunho em `assets/gerencia/relatorio_de_encerramento.md` e linha marcada como rascunho no `assets/gerencia/README.md`. Validação por um agente de contexto limpo (números e datas contra as fontes), correções, commit `docs: rascunho do relatório de encerramento` e push, sem PR. Plano, Andamento e README desta pasta num commit separado na `renato-features`, sem push.
- **Etapa 3 (depois de 24/11):** respostas do grupo, release final, PROD, pitch, ATAM (E6-03) e capturas (E6-04); resolver todos os marcadores; `.docx`/`.pdf`; quem assina; validação de contexto limpo; merge direto na `desenvolvimento` (decisão 5).

## Estimativa

| Etapa | Horas (agente + conferência) |
|---|---|
| 1. Planejar | 1,5 h |
| 2. Rascunho, validação e correções | 4 h |
| 3. Completar, `.docx`/`.pdf`, validar e integrar | 4 h, mais o tempo do grupo para responder |
| **Total** | **≈ 9,5 h** |
