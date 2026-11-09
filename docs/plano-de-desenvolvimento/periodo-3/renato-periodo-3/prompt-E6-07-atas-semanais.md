# Prompt — E6-07: Atas de reunião semanais da Sprint 6

> Escrito em 08/11/2026. **Leia antes o [`prompt-E6-contexto-comum.md`](prompt-E6-contexto-comum.md)**. Tarefa **recorrente**: roda uma vez por reunião (ou por lote de reuniões), em duas etapas. Para usar: *"Leia `docs/plano-de-desenvolvimento/periodo-3/renato-periodo-3/prompt-E6-07-atas-semanais.md` e execute a etapa N para a reunião de DD/MM."*

## Andamento

| Reunião | Etapa 1 (rascunho) | Etapa 2 (final + PR) | Arquivos |
|---|---|---|---|
| a definir pelo Renato | — | — | — |

Quem terminar uma etapa atualiza esta tabela e a linha E6-07 do [`README.md`](README.md).

---

## Contexto da tarefa

**Item da entrega:** "Atas de reunião semanais".

**O que existe** (`assets/atas/`):

- atas de 23/08, 11/09, 22/09, 06/10, 20/10, 27/10 e 30/10/2026, cada uma em `.md` e em `.docx`/`.pdf` no template da disciplina;
- o modelo `ATA-YYYY-MM-DD.md`, com as seções Informações, Participantes, Pauta, Notas e Decisões, Ações e pendências e Outras notas;
- o `README.md` da pasta, com a tabela de atas (data, reunião, links).

Nomenclatura: `ATA-AAAA-MM-DD.md`. **A última é de 30/10.** Faltam as reuniões da Sprint 6: a partir de 03/11 até 01/12, nas datas em que o grupo de fato se reuniu.

**Regra central: a ata registra uma reunião que aconteceu.** Data, participantes, pauta, decisões e responsáveis vêm **das anotações do Renato** (ou de quem secretariou). O repositório serve para *conferir e detalhar* (número de PR, nome de feature, data de merge), nunca para *inventar* o que foi dito ou decidido.

**Secretário:** o plano de projeto prevê rodízio de plantão semanal (§6 e seção de rituais), mas as 7 atas existentes têm sempre Vicenzo Fonseca de Mello Souza como secretário. Pergunte ao Renato quem secretariou cada reunião, sem presumir.

**Integrantes** (nomes completos, como nas atas anteriores e no `docs/README.md`): Vicenzo Fonseca de Mello Souza, Renato Douglas Nascimento Silva de Oliveira, Henrique Moreira Gomes de Carvalho, Kayke Emanoel de Souza Santos e Ana Luiza de Freitas Rodrigues.

**Leitura obrigatória específica:** `assets/atas/README.md`, `ATA-YYYY-MM-DD.md`, as duas atas mais recentes (`ATA-2026-10-27.md` e `ATA-2026-10-30.md`, para tom, nível de detalhe e pendências em aberto) e o `.docx` de 30/10 (o template da disciplina).

---

## Etapa 1 — Rascunho a partir das anotações

> **Prompt:** Monte o rascunho da ata da reunião de DD/MM a partir das anotações que o Renato colar ou indicar. Não commite nesta etapa.

1. **Se o Renato não tiver passado as anotações, peça antes de tudo**, com um roteiro curto do que precisa:
   - data, hora, local ou canal;
   - quem esteve;
   - os assuntos tratados;
   - o que foi decidido;
   - quem ficou com o quê e para quando.
2. **Cruze com o repositório**, só para completar e conferir: PRs mergeados na semana (`gh pr list --state merged --search "merged:AAAA-MM-DD..AAAA-MM-DD"`), status das features do Período 3, prazos do plano de projeto e as pendências da ata anterior. Para cada pendência da ata anterior, pergunte o que aconteceu com ela, ou marque o "Feito (S/N)" só se houver evidência.
3. Escreva `ATA-AAAA-MM-DD.md` no modelo, no mesmo tom das atas anteriores. O que as anotações não cobrem fica **fora** da ata ou vira pergunta, nunca suposição.
4. Mostre o rascunho ao Renato com as dúvidas em lista curta no fim. **Esta é a única tarefa em que a aprovação dele vem antes do commit:** a ata é registro do grupo.

---

## Etapa 2 — Versão final e PR

> **Prompt:** Com o rascunho aprovado pelo Renato, finalize a ata de DD/MM.

1. `git fetch` e a worktree da tarefa, com a branch `renato-e6-07` criada a partir da `origin/desenvolvimento` (ver contexto comum). O plano e o Andamento são lidos e commitados na `renato-features`.
2. Salve `assets/atas/ATA-AAAA-MM-DD.md`.
3. Gere o `.docx` a partir do template da disciplina (use o `.docx` de 30/10 como base, preservando formatação, cabeçalho e tabelas) e o `.pdf` a partir dele. Abra o PDF e confira se nada saiu cortado ou desformatado.
4. Acrescente a linha na tabela do `assets/atas/README.md`.
5. **Validação por um agente de contexto limpo** (só lê). O `.md`, o `.docx` e o `.pdf` têm o mesmo conteúdo? Os PRs e as datas citados conferem com o GitHub? Os nomes estão completos e certos? Corrija os achados.
6. Commit `docs: ata da reunião de DD/MM` (ou `docs: atas das reuniões de DD/MM e DD/MM`, em lote). Faça o push. O PR para a `desenvolvimento` pode juntar várias atas ou ir junto de outra tarefa de documentação. Pergunte no relatório se o Renato prefere abrir agora ou acumular.
7. Fechamento conforme o contexto comum (contribuição semanal: "Realizado ata da reunião de DD/MM"). Atualize o Andamento e o README.
