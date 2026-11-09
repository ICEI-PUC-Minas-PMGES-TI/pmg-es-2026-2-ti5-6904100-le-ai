# Prompt — E6-06: Relatório de encerramento do projeto

> Escrito em 08/11/2026. **Leia antes o [`prompt-E6-contexto-comum.md`](prompt-E6-contexto-comum.md)**. Cada etapa é feita por um agente diferente, de contexto limpo. Para usar: *"Leia `docs/plano-de-desenvolvimento/periodo-3/renato-periodo-3/prompt-E6-06-relatorio-de-encerramento.md` e execute a etapa N."*

## Andamento

| Etapa | Situação | Saída |
|---|---|---|
| 1. Planejar | não iniciada | `plano-E6-06-relatorio-de-encerramento.md` nesta pasta |
| 2. Rascunho até o Período 2 | não iniciada | `assets/gerencia/relatorio_de_encerramento.md` com o que já dá para escrever |
| 3. Completar, revisar e PR | depois de 24/11 (release, produção e pitch) | relatório final em `.md`, `.docx` e `.pdf` + PR |

Quem terminar uma etapa atualiza esta tabela e a linha E6-06 do [`README.md`](README.md).

---

## Contexto da tarefa

**Item da entrega:** "Relatório de encerramento do projeto". **Não existe nada dele no repositório.**

**Material de gerência que já existe** (`assets/gerencia/`, com `README.md`):

- o TAP nº 01 (objetivos, escopo, prazo, custo e papéis aprovados em 23/08/2026): o conteúdo preenchido está nos PDFs, `termo_de_abertura_do_projeto_assinado.pdf` e, mais completo e com as cinco assinaturas, `assets/atas/TermoDeAberturaDoProjeto.pdf`. O `termo_de_abertura_do_projeto.md` é só o esqueleto (ver o `README.md` da pasta). Leia os PDFs;
- `declaracao_de_escopo.md`;
- `eap.md`;
- `matriz_raci.md`;
- `orcamento_do_projeto.md`, `Previsoes-do-Orcamento-Le-Ai.xlsx` e `Previsoes-do-Cronograma-Le-Ai.xlsx`.

Cada documento tem `.md` e, quando a disciplina exige o template, `.docx`/`.pdf`. **O relatório segue o mesmo padrão.**

**Fontes para o "realizado"** (tudo verificável):

- as atas (`assets/atas/`);
- a contribuição semanal dos cinco (`assets/contribuicao_semanal/`);
- as tags e releases (`v0.1.0`, `v0.2.0`, `v0.2.1` e a final), com `gh release list`;
- os PRs (`gh pr list --state merged`);
- o status das features (`docs/plano-de-desenvolvimento/periodo-*/feature-*.md` e os READMEs dos períodos);
- o calendário planejado (`docs/orquestador/plano-de-projeto.md` §3) contra as datas reais;
- os riscos planejados (`plano-de-projeto.md`, seção de riscos) contra o que aconteceu;
- os números de teste (`docs/9.plano_de_testes.md` §9.7) e a avaliação da arquitetura (`docs/8.avaliacao_arquitetura.md`).

**Leitura obrigatória específica:** todos os arquivos de `assets/gerencia/`, `docs/orquestador/plano-de-projeto.md`, `assets/atas/README.md`, os READMEs de `docs/plano-de-desenvolvimento/` e de cada período. Leia também o enunciado da disciplina para o relatório, que o Renato fornece (ver 1.1).

---

## Etapa 1 — Planejar

> **Prompt:** Produza o plano da E6-06. Não escreva o relatório nesta etapa. Saída: `plano-E6-06-relatorio-de-encerramento.md` nesta pasta.

### 1.1 O que a disciplina pede

**Pergunte primeiro ao Renato** pelo enunciado ou template do "Relatório de encerramento" (Canvas ou modelo .docx da disciplina), como foi feito com o TAP e as atas. Sem template, proponha a estrutura usual de encerramento de projeto (PMBOK), alinhada aos documentos de abertura que o grupo já entregou:

1. Identificação do projeto e da equipe
2. Objetivos do TAP × resultado alcançado
3. Escopo: planejado (declaração de escopo, EAP e features por prioridade) × entregue, e o que foi cortado, com motivo
4. Cronograma: marcos planejados × datas reais (entregas 1 a 6, períodos 0 a 3 e releases)
5. Custos: orçamento previsto × realizado
6. Qualidade: testes, CI, avaliação heurística, ATAM e DoD
7. Riscos: previstos × ocorridos e como foram tratados
8. Lições aprendidas, do grupo
9. Situação final: release, ambientes (DES e PROD), pendências e recomendações para continuidade
10. Aceite e assinaturas

### 1.2 Levantamento

Para cada seção, liste as fontes exatas e o que já dá para preencher agora (Períodos 0 a 2) versus o que depende de depois de 24/11 (Período 3, release final, produção e pitch). Levante já os números verificáveis: features por prioridade planejadas e entregues, PRs mergeados, releases, testes e datas reais de cada marco.

### 1.3 Decisões a fechar com o Renato (lote curto)

- o template ou enunciado (1.1);
- **lições aprendidas e avaliação do grupo:** o conteúdo vem das pessoas, não do repositório. Recomendação: o agente prepara 5 a 8 perguntas curtas para o Renato levar ao grupo ou responder ele mesmo, e só escreve o que vier das respostas;
- **custo realizado:** de onde vem (horas da contribuição semanal × valor do orçamento? custo de infraestrutura zero no plano gratuito?);
- quem assina e se vai `.docx`/`.pdf` com o template da disciplina.

Estimativa em horas. Topo: "Plano de DD/MM/2026, ainda não revisado". Atualize o Andamento e o README. Relatório: a estrutura, o que precisa vir dele ou do grupo e o link do plano.

---

## Etapa 2 — Rascunho até o Período 2

> **Prompt:** Escreva o rascunho do relatório de encerramento seguindo o `plano-E6-06-relatorio-de-encerramento.md` desta pasta. Não peça aprovação no meio.

1. `git fetch` e a worktree da tarefa, com a branch `renato-e6-06` criada a partir da `origin/desenvolvimento` (ver contexto comum). O plano e o Andamento são lidos e commitados na `renato-features`.
2. Crie `assets/gerencia/relatorio_de_encerramento.md` com todas as seções. Preencha o que já tem evidência: Períodos 0 a 2, marcos até 03/11, riscos ocorridos até agora e números verificados. Cada número cita a fonte.
3. O que depende de depois de 24/11 fica com o marcador `> A completar após 24/11: <o que falta e de onde virá>`. O que depende do grupo (lições aprendidas, por exemplo) fica com `> A completar com o grupo: <perguntas>`. **Não invente conteúdo** para preencher seção.
4. Acrescente a linha do relatório no `assets/gerencia/README.md`, marcada como rascunho.
5. **Validação por um agente de contexto limpo** (só lê). Cada número e cada data conferem com a fonte citada? Algo foi afirmado sem fonte? Corrija os achados.
6. Commit `docs: rascunho do relatório de encerramento`. Atualize o Andamento e o README, depois `git push`. **Não abra o PR** (o relatório só fecha depois de 24/11).
7. Relatório: o que já está escrito, os marcadores pendentes e as perguntas ao grupo.

---

## Etapa 3 — Completar, revisar e PR (depois de 24/11)

> **Prompt:** Complete o `assets/gerencia/relatorio_de_encerramento.md` com o Período 3, a release final, o deploy de produção, o pitch e as respostas do grupo, resolvendo todos os marcadores "A completar". Gere o `.docx`/`.pdf` no template da disciplina, como nos outros documentos de `assets/gerencia/`.

1. Validação por um agente de contexto limpo (números, datas e fontes). Corrija os achados.
2. Commit `docs: relatório de encerramento do projeto`. Integre a `origin/desenvolvimento`, faça o push e abra o PR. Sem linha de atribuição.
3. Fechamento conforme o contexto comum. Relatório com o link do PR e o que falta assinar.
