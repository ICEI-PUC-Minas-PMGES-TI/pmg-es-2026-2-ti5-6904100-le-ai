# Plano — E6-05: HTML estático dos contratos OpenAPI

> Plano de 19/11/2026. Etapas 1 e 2 feitas na mesma sessão, a pedido do Renato. O congelamento de features (17/11) já passou, então a primeira geração já é a final e a etapa 3 se funde com a 2. Prompt: [`prompt-E6-05-openapi-html.md`](prompt-E6-05-openapi-html.md).

## Decisões (fechadas pelo Renato em 19/11/2026, seguindo as recomendadas)

1. **Ferramenta:** Redoc via `@redocly/cli build-docs` **2.75.0** (de 04/11/2026), com `--inlineBundle`. Escolhida pela comparação abaixo.
2. **Links só no `docs/api/README.md` e no `docs/README.md` (Ferramentas).** Nada em `docs/orquestador/`; o link no Documento de Arquitetura entra na tarefa do Documento de Arquitetura final, com a autorização do Renato.
3. **O HTML gerado é versionado** (a entrega é o repositório).
4. **Sem passo de CI** para HTML desatualizado.
5. **Sem PR:** o Renato autorizou o merge direto. A branch `renato-e6-05` fica commitada e com push (commit `55dced4`, sobre a `origin/desenvolvimento` em `8d8cdfd`); o orquestrador faz o merge na `desenvolvimento`.

## Comparação medida (19/11/2026, scratchpad, quatro YAMLs da `origin/desenvolvimento` em `c872dab`)

Abertura conferida no Edge headless (`playwright-core` 1.56.1, `file://`), com toda requisição fora de `file:`/`data:`/`blob:` bloqueada.

| Critério | Redoc (`@redocly/cli` 2.75.0, Redoc 3) | Swagger UI estático (`swagger-ui-dist` 5.34.1 embutido) |
|---|---|---|
| Como gera | um comando nativo por spec (`build-docs --inlineBundle`) | não há comando pronto: precisa de script próprio (YAML → JSON com `js-yaml` + bundle e CSS embutidos num HTML) |
| Tamanho por arquivo | 2,49 a 2,53 MiB (identidade 2.623.121 B, acervo 2.606.725, leitura 2.655.391, social 2.649.838) | 1,84 a 1,88 MiB |
| Offline com duplo clique | sim; sem `--inlineBundle` carrega o Redoc do CDN. Com o bundle embutido, a única requisição externa é o logo "API docs by" do rodapé (`cdn.redoc.ly`), que some sem rede; o template com CSP corta essa requisição antes de sair | sim, zero requisições externas (com `validatorUrl: null`) |
| Validação do spec | `redocly lint --extends=spec`: identidade sem erro; **2 erros reais em `leitura.yaml`** (abaixo, corrigidos); 15 avisos `nullable-type-sibling` (`nullable: true` ao lado de `allOf` sem `type`) em acervo (8), leitura (4) e social (3), padrão aceito pelos renderizadores e mantido | não valida offline (o validador é um serviço externo) |
| Estado por operação | com `--openapi.showExtensions=true`, logo abaixo do título da operação: `implementation-status: implemented`, `implemented-by: F-EST` (acervo: `contract-status`) | na tabela "Extensions" no fim da operação expandida, depois das respostas |
| Navegação | barra lateral por tag, busca (Ctrl+K) que funciona offline, exemplos de payload ao lado | lista por tag, sem busca |
| Saída determinística | sim (mesma entrada → mesmos bytes; sem caminho absoluto nem data) | sim |

**Escolha: Redoc.** Os dois abrem offline em arquivo único; o Redoc é o comando de uma linha que o prompt propõe, mostra o estado de cada operação em destaque e tem busca. O custo é ~0,65 MiB a mais por arquivo e o logo do rodapé, resolvido pela CSP do template.

## Achado nos contratos (corrigido)

`docs/api/leitura.yaml`, `DELETE /livros/{livroId}/nota` e `DELETE /livros/{livroId}/resenha`: a resposta `204` estava num mapa YAML de fluxo sem aspas (`{ description: Nota removida, já ausente ou ... }`). A vírgula partia a descrição em duas chaves, e o contrato publicava só "Nota removida" mais uma chave inválida. Pus a descrição entre aspas. Os dois trechos são do commit `42ae687` (Renato, F-AVA, 27/09/2026), então é débito do próprio Renato e não pede nota no `AGENTS.md` de outro dono. O texto em runtime (`avaliacoes.controller.ts`) é mais curto ("Nota removida ou já ausente."); a diferença é só de redação.

## O que foi feito (branch `renato-e6-05`)

- **Gerador:** `code/scripts/openapi-html/` com `gerar.mjs`, `package.json` e `package-lock.json` (`@redocly/cli` 2.75.0, pacote único, sem dependências transitivas) e `README.md`. Comando, da raiz: `node code/scripts/openapi-html/gerar.mjs`. Instala com `npm ci` na primeira vez, roda o CLI com `REDOCLY_TELEMETRY=off`, gera os quatro HTML e o `index.html`. Script em Node, e não `.sh`, porque o checkout do Windows converte para CRLF e o Git Bash não roda `.sh` com CRLF. O template com CSP fica dentro do `gerar.mjs` pelo mesmo motivo (um `.hbs` com CRLF mudaria os bytes da saída).
- **Saída:** `docs/api/html/{identidade,acervo,leitura,social}.html` e `docs/api/html/index.html`. `docs/api/html/.gitattributes` marca os HTML como `binary linguist-generated`, para o Git não converter fim de linha e não mostrar diff do bundle.
- **Links:** seção "HTML estático" no `docs/api/README.md` e linha "Contratos HTTP (OpenAPI)" na tabela Ferramentas do `docs/README.md`.

## Conferência no Edge headless (19/11/2026)

Os cinco arquivos abertos por `file://`, com rede bloqueada: zero requisições externas, nenhum erro de página; o único aviso de console é o bloqueio do logo pela CSP. Operações na barra lateral iguais às do YAML: identidade 27/27, acervo 15/15, leitura 49 entradas para 46 operações (3 operações em duas tags) e social 40/40, as 128 com estado `implemented`. Estado por operação visível abaixo do título; busca funcionando offline. Prints no scratchpad da sessão (`e6-05/pw/shots-final/`).

## Validação por agente de contexto limpo

Um agente de contexto limpo (só leitura e teste) clonou a branch do zero duas vezes, com `core.autocrlf=true` e `false`, e rodou o comando documentado: `npm ci` funcionou (≈ 4 s na primeira vez, ≈ 1 s depois), `git status` ficou limpo e os cinco HTML bateram byte a byte com os versionados. Confirmou a versão exata no `package.json` e no lock, o uso do CLI da pasta, os links e a âncora `#html-estático`, zero requisições externas no Edge com rede bloqueada, o estado por operação abaixo do título e que o diff do `leitura.yaml` só põe aspas.

Achados, corrigidos antes do push: (1) o README do gerador sugeria `npx redocly lint` da raiz, que resolve outro pacote (`redocly@1.0.0`) e não o CLI da pasta; agora indica `node code/scripts/openapi-html/node_modules/@redocly/cli/bin/cli.js lint ...`; (2) o mesmo trecho não avisava que o lint `--extends=spec` acusa os 15 `nullable-type-sibling` antigos de acervo, leitura e social; agora avisa. De quebra, o `npm ci` deixou de usar `execFileSync` com `shell: true` (aviso DEP0190 no Node 25). A saída gerada não mudou.

## Fica para depois

- O link no Documento de Arquitetura (`docs/orquestador/documento-de-arquitetura.md`), na tarefa do Documento de Arquitetura final.
- O parágrafo "Estado do contrato" do `docs/api/README.md` ainda fala em 117 operações (25/10/2026); hoje são 128 (27 + 15 + 46 + 40), todas `implemented`. Fora do escopo desta tarefa; fica como aviso.
- Se um YAML mudar até a release, rodar o gerador de novo e commitar YAML e HTML juntos.
