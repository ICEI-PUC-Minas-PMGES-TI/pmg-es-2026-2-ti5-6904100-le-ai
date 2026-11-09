# Contexto comum — tarefas da Entrega 6

> Escrito em 08/11/2026. Vale para todos os `prompt-E6-NN-*.md` desta pasta. **Cada prompt manda ler este arquivo antes.** O agente que o ler não terá a conversa que o gerou.

## O que são estas tarefas

A Entrega 6 (01/12/2026, 40 pts) pede, além do código das features:

1. Documento de Arquitetura de Software (versão final, completa e atualizada)
2. Código completo do front-end e do back-end (refino e/ou opcionais)
3. Test Plan (funcionalidades desejáveis), versão final
4. Implementação de testes (funcionalidades desejáveis), versão final
5. Release do software com todas as histórias priorizadas implementadas
6. Avaliação da Arquitetura, versão final
7. Relatório de encerramento do projeto
8. Vídeo de apresentação do projeto (pitch)
9. Fechamento da Sprint 6
10. Atas de reunião semanais

As features opcionais do Renato (F-MOD-OPC e F-ACV-OPC) já estão na `desenvolvimento`. Estas tarefas são o que **dá para fazer ou adiantar agora**, sem esperar as features dos outros. Cada uma tem um prompt próprio, com etapas feitas por agentes diferentes de contexto limpo.

| Tarefa | Prompt | Item da entrega |
|---|---|---|
| E6-01 | [`prompt-E6-01-plano-de-testes-desejaveis.md`](prompt-E6-01-plano-de-testes-desejaveis.md) | 3 |
| E6-02 (testes que faltam na área do Renato) | [`prompt-E6-02-testes-das-lacunas.md`](prompt-E6-02-testes-das-lacunas.md) | 2 e 4 |
| E6-03 | [`prompt-E6-03-atam-em-des.md`](prompt-E6-03-atam-em-des.md) | 6 |
| E6-04 | [`prompt-E6-04-capturas-de-tela.md`](prompt-E6-04-capturas-de-tela.md) | 1 (seção 7 do documento da disciplina) |
| E6-05 | [`prompt-E6-05-openapi-html.md`](prompt-E6-05-openapi-html.md) | 1 (anexo do Documento de Arquitetura) |
| E6-06 | [`prompt-E6-06-relatorio-de-encerramento.md`](prompt-E6-06-relatorio-de-encerramento.md) | 7 |
| E6-07 | [`prompt-E6-07-atas-semanais.md`](prompt-E6-07-atas-semanais.md) | 10 |

Ficam para depois, sem prompt ainda: Documento de Arquitetura final (depois do congelamento de 17/11), release + tag + deploy de produção (grupo, fim de novembro), vídeo e slides do pitch (24/11) e o fechamento da Sprint 6. Ver o [`README.md`](README.md) desta pasta.

## Quem é o dono

Renato Douglas (git `RenatoDNS`). As tarefas são entregáveis do grupo que o Renato assumiu. Quase todas mexem em documentos da disciplina.

**Decisão do grupo de 30/10/2026** (`assets/atas/ATA-2026-10-30.md`, "Donos do Período 3"): *"Cada dono também escreve os testes das suas features desejáveis do Período 2 e cobre as lacunas do plano de testes na sua área."* Por isso, escrever teste no código de outro dono **não** é tarefa do Renato. A E6-02 cobre só a área dele. O que estiver na área de outro dono vai para o relatório como aviso a esse dono, e o Renato decide se repassa.

## Prazos (`docs/orquestador/plano-de-projeto.md` §3)

- **17/11/2026:** congelamento de features. Nenhuma feature nova entra depois.
- **24/11/2026:** congelamento de código, deploy de produção e pitch.
- **01/12/2026:** Entrega 6. O horário, 23:59, vem do enunciado da disciplina no Canvas, não do repositório.
- O DES (branch `main`) hoje roda a **v0.2.1** (Período 2). O Período 3 só chega ao DES com o merge da `main` no fim de novembro, feito pelo grupo.

## Leitura obrigatória (AGENTS.md §5, item 1)

1. `AGENTS.md` (raiz). Os `AGENTS.md` locais dos projetos que a tarefa tocar (`code/back/<servico>/`, `code/front/`, `code/mobile/`, `code/scripts/ingestao/`).
2. `docs/orquestador/REQUISITOS.md`, nas seções que o prompt da tarefa indicar. É a fonte de verdade e sempre vence.
3. `docs/orquestador/plano-de-projeto.md` §2.1: os documentos `docs/1.` a `docs/9.` são **derivados** do orquestador. Podem ser editados por estas tarefas, mas nunca contradizendo a fonte.
4. O prompt da tarefa e, a partir da etapa 2, o plano dela (`plano-E6-NN-*.md`).

## Regras que não se negociam

- **Nenhum arquivo de `docs/orquestador/` é editado** sem autorização explícita do Renato na própria sessão. Divergência vira item do relatório.
- **Não editar `feature-*.md` de outro dono.** Se a tarefa achar algo que é de uma feature alheia (bug, teste faltando, divergência), registre no plano/relatório da tarefa e, se o Renato pedir, avise o dono.
- **Mudança em código de outro dono** (inclusive só testes) é permitida, mas fica registrada com nota datada no `AGENTS.md` do serviço/subprojeto dele (o quê, por quê, onde, armadilhas) e listada no PR. O dono de cada serviço está no `AGENTS.md` local e nos arquivos de feature.
- **Nunca inventar fato.** Documento da disciplina cita só o que tem evidência: teste que existe com aquele nome, medição feita, reunião que aconteceu, decisão registrada. O que não tiver evidência vira lacuna ou pergunta ao Renato.
- **Testes de integração em Postgres descartável** (Docker/CI), **nunca no Neon**. O `.env` local nunca aponta para o DES.
- **DES é ambiente compartilhado.** Nada de apagar, esvaziar fila, publicar em massa, carga pesada ou mudança de configuração no DES (Render, Neon `le-ai-oregon`, CloudAMQP `Le-ai-oregon`) sem OK do Renato. Leitura e uso normal do app são livres.
- **Contas de teste:** as contas seed não funcionam no dev (`SEED_SENHA` vazia). Crie contas próprias pelo `/auth/register` com e-mail `.invalid`. No DES, só com o OK do Renato dado no plano da tarefa.
- **Commits:** Conventional Commits, **só o assunto, em pt-BR acentuado, sem corpo**, **sem `Co-Authored-By` e sem rodapé de ferramenta**. PR também sem linha de atribuição.
- **Branch: uma por tarefa, `renato-e6-NN`** (por exemplo, `renato-e6-01`). A branch nasce da `renato-features`, que tem estes prompts, e o PR sai dela para a `desenvolvimento`. Assim, o trabalho de uma tarefa que ainda não passou por revisão não vaza para o PR de outra (o rascunho da E6-06, por exemplo, fica semanas sem PR). A `renato-features` continua sendo a branch das features do Renato e **não** recebe o trabalho das tarefas, só estes prompts. Antes de começar e antes do PR: `git fetch` e integrar a `origin/desenvolvimento`. Para rodar duas tarefas ao mesmo tempo, cada uma vai numa worktree própria (`git worktree add ../le-ai-e6-NN renato-e6-NN`). Nunca trocar de branch na pasta principal se houver outro agente trabalhando.
- **Mudanças nesta pasta de prompts** (tabela Andamento, `README.md`, planos `plano-E6-*.md`) vão no commit da própria tarefa, na branch dela.
- **PR só para a `desenvolvimento`.** O merge na `main` e o DES são do grupo, no fechamento de novembro.
- **Débito da própria tarefa é corrigido**, não só registrado.
- **Relatórios ao Renato: curtos e diretos, o essencial primeiro.** Nada de relatório denso.

## Ferramentas

- O repositório tem índice CodeGraph (`.codegraph/`): use `codegraph_explore` antes de grep/Read para achar e entender código.
- `gh` autenticado (PRs, runs do Actions, releases, Kanban com escopo `project`).
- MCPs do **Neon**, do **Render** e da **CloudAMQP**: o que dá para fazer por eles não é devolvido ao Renato como tarefa.
- **Teste manual e capturas, sem a extensão do Chrome:**
  - **Web:** Edge headless via `playwright-core` numa pasta do scratchpad, com `chromium.launch({ channel: 'msedge', headless: true })`. Esperar uns 700 ms antes do print, senão a transição de cor sai pela metade.
  - **Mobile:** emulador `Pixel_8_API_35`. Use `flutter run` ou o APK do release, com interação por `adb` + `uiautomator dump`, que enxerga o `content-desc` do Flutter. Antes de digitar, desligue a escrita por caneta: `MSYS_NO_PATHCONV=1 adb shell settings put secure stylus_handwriting_enabled 0`. Depois digite com `adb shell input text` em pedaços de 4 caracteres.
- **Comandos de verificação por projeto:**
  - `identidade` e `social`: `./mvnw verify`, com `DATABASE_URL_TESTE` apontando para Postgres em Docker.
  - `acervo` e `leitura`: `npm run lint`, `npm run build`, `npm test` e `npm run test:integration`, este em Postgres descartável. No Windows o lint acusa `␍` (checkout CRLF) em todos os arquivos, e isso não é achado.
  - Web: `npm run lint`, `npm run build` e `npm test`.
  - Mobile: `flutter analyze` e `flutter test`.
  - Script de ingestão: `python -m pytest`, com `DATABASE_URL_TESTE`.

## Formato das etapas

- **Planejar:** gera o `plano-E6-NN-*.md` nesta pasta, autossuficiente. Pergunta ao Renato **em lotes curtos**, com opções e a recomendada primeiro, e não pergunta o que dá para decidir pelo repositório. No topo do plano: "Plano de DD/MM/2026, ainda não revisado".
- **Realizar:** segue o plano, que prevalece sobre o prompt nos detalhes. Não pede aprovação no meio: o que precisar do OK do Renato vai para o relatório final. Ao terminar, faz a **validação por agentes de contexto limpo**, que só leem e testam. Eles são proibidos de editar, commitar ou trocar de branch e relatam só achados confirmados, com caminho/linha e como reproduzir. Depois, corrige os achados.
- **Revisão independente e PR:** outro agente revisa com contexto limpo, corrige e abre o PR para a `desenvolvimento`. Corpo do PR no formato dos PRs anteriores do Renato (#57, #61, #62).

## Fechamento de cada tarefa (sem o Renato pedir)

- Atualizar a tabela **Andamento** do prompt da tarefa e a linha dela no [`README.md`](README.md) desta pasta.
- **Contribuição semanal:** linhas "Realizado ..." em `assets/contribuicao_semanal/renato.md`, sob `# Sprint 6` / `### Semana K (dd/mm - dd/mm)`. Semana 1 = 04/11–10/11, Semana 2 = 11/11–17/11, Semana 3 = 18/11–24/11, Semana 4 = 25/11–01/12. Confira `git log --author=RenatoDNS` da semana para não faltar nada.
- **Kanban:** projeto "Lê Ai — Kanban" (org `ICEI-PUC-Minas-PMGES-TI`, nº 738). Se houver card da tarefa, mova para "Em revisão (PR)" ao abrir o PR. Se não houver, pergunte no relatório se o Renato quer um.
- Conferir os documentos que citam o artefato (por exemplo, o SUMÁRIO em `docs/README.md` quando uma seção mudar de nome ou ganhar subseção).
