# Prompt — E6-05: HTML estático dos specs OpenAPI

> Escrito em 08/11/2026. **Leia antes o [`prompt-E6-contexto-comum.md`](prompt-E6-contexto-comum.md)**. Tarefa pequena: duas etapas, cada uma com um agente de contexto limpo. Para usar: *"Leia `docs/plano-de-desenvolvimento/periodo-3/renato-periodo-3/prompt-E6-05-openapi-html.md` e execute a etapa N."*

## Andamento

| Etapa | Situação | Saída |
|---|---|---|
| 1. Planejar e decidir | não iniciada | `plano-E6-05-openapi-html.md` nesta pasta |
| 2. Realizar, validar e PR | não iniciada | gerador + HTML dos 4 specs + PR para a `desenvolvimento` |
| 3. Regerar depois do congelamento | depois de 17/11 | HTML com os specs finais |

Quem terminar uma etapa atualiza esta tabela e a linha E6-05 do [`README.md`](README.md).

---

## Contexto da tarefa

**Item da entrega:** anexo do "Documento de Arquitetura de Software (versão final)". O `docs/orquestador/plano-de-projeto.md` (seção de contratos de integração) diz: *"Para a entrega final, gerar o HTML estático dos specs e anexar ao Documento de Arquitetura."*

**O que existe:**

- os quatro specs em `docs/api/`: `identidade.yaml`, `acervo.yaml`, `leitura.yaml` e `social.yaml`, um por serviço, com o estado por operação;
- `docs/api/README.md`;
- `docker-compose.docs.yml`, que sobe um Swagger UI em `localhost:8080` com os quatro specs. Ele precisa do Docker e não serve de anexo.

**Por que regerar depois:** os specs ainda mudam até 17/11 com as features dos outros (F-REC-ALG, F-NOT-OPC, F-GAM-OPC, F-DSF-OPC). A entrega agora é **o gerador de um comando** e a primeira geração. A etapa 3 só roda o comando de novo.

**Leitura obrigatória específica:** `docs/api/README.md`, `docker-compose.docs.yml`, o cabeçalho de cada YAML (versão do OpenAPI, `info`, `servers`) e a seção 10 do `AGENTS.md` raiz (contratos).

---

## Etapa 1 — Planejar e decidir

> **Prompt:** Produza o plano curto da E6-05. Saída: `plano-E6-05-openapi-html.md` nesta pasta.

1. **Ferramenta.** Compare, testando de verdade numa pasta do scratchpad com os quatro YAMLs, pelo menos:
   - `@redocly/cli build-docs` (Redoc), que gera um arquivo HTML único e autossuficiente por spec;
   - Swagger UI estático com o bundle embutido.
   Registre, para cada uma: versão fixa (nada de `latest`), tamanho do HTML gerado, se abre offline com duplo clique (sem servidor e sem CDN), se o spec valida sem erro e como fica o estado por operação (`x-` ou tag).
2. **Onde ficam:** proposta `docs/api/html/<servico>.html` mais um `docs/api/html/index.html` com links para os quatro.
3. **Gerador:** um script versionado (proposta: `code/scripts/openapi-html/gerar.sh` com README curto, ou um `npx` documentado no `docs/api/README.md`), com versão fixa e um comando só.
4. **Decisões a fechar com o Renato** (lote curto, com a recomendada primeiro):
   - a ferramenta escolhida;
   - **anexar ao Documento de Arquitetura** exige editar `docs/orquestador/documento-de-arquitetura.md`. Recomendação: nesta tarefa, linkar só no `docs/api/README.md` e no `docs/README.md` (Ferramentas). O link no Documento de Arquitetura entra na tarefa do Documento de Arquitetura final, com a autorização dele;
   - versionar o HTML gerado no repositório (recomendado, porque a entrega é o repositório) ou só o gerador;
   - um passo de CI que avisa quando o HTML está desatualizado em relação ao YAML (recomendação: não, por ser trabalho além do pedido, já que a etapa 3 regera).
5. Topo: "Plano de DD/MM/2026". Atualize o Andamento e o README. Relatório: a ferramenta recomendada e as decisões.

---

## Etapa 2 — Realizar, validar e PR

> **Prompt:** Execute o `plano-E6-05-openapi-html.md` desta pasta. Não peça aprovação no meio.

1. `git fetch` e a worktree da tarefa, com a branch `renato-e6-05` criada a partir da `origin/desenvolvimento` (ver contexto comum). O plano e o Andamento são lidos e commitados na `renato-features`.
2. Crie o gerador, gere os quatro HTML e o índice e atualize `docs/api/README.md` e `docs/README.md` (Ferramentas) com o comando e os links.
3. Abra cada HTML no Edge headless (`playwright-core`, `file://`), sem rede, e tire um print. Confira que renderiza, que as operações dos quatro serviços aparecem e que nada vem de CDN (bloqueie as requisições externas no Playwright).
4. **Validação por um agente de contexto limpo** (só lê e testa). Ele roda o gerador do zero numa pasta limpa, compara o resultado com o versionado, confere a versão fixa e os links. Corrija os achados.
5. Commit `docs: HTML estático dos contratos OpenAPI`. Integre a `origin/desenvolvimento`, faça o push e abra o PR. Corpo: ferramenta e versão, onde ficam os arquivos, como regerar e o que fica para depois de 17/11. Sem linha de atribuição.
6. Fechamento conforme o contexto comum. Relatório com o link do PR.

---

## Etapa 3 — Regerar depois do congelamento

> **Prompt:** Depois de 17/11, com as features do Período 3 na `desenvolvimento`, rode o gerador, confira os quatro HTML no Edge e abra um PR curto `docs: HTML dos contratos OpenAPI após o congelamento`.
