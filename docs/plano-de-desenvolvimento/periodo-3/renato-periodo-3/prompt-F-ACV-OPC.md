# Prompt — F-ACV-OPC (Extras de acervo)

> Escrito em 06/11/2026. Este arquivo é **autossuficiente**: o agente que o ler não terá a conversa que o gerou. Ele traz um prompt para cada etapa da feature, e **cada etapa é feita por um agente diferente, de contexto limpo**. Para usar, diga ao agente: *"Leia `docs/plano-de-desenvolvimento/periodo-3/renato-periodo-3/prompt-F-ACV-OPC.md` e execute a etapa N."* A etapa seguinte só começa quando a anterior registrou que terminou (ver "Andamento").

## Andamento

| Etapa | Agente | Situação | Saída |
|---|---|---|---|
| 1. Planejar | 1º | feita em 06/11/2026 | [`plano-F-ACV-OPC.md`](plano-F-ACV-OPC.md) nesta pasta, com as decisões do dono (1 a 8) |
| 2. Revisar o plano | 2º | feita em 06/11/2026 por um agente de contexto limpo | plano corrigido com 12 achados (veredito: aprovar com ajustes), mais a decisão 9 do dono (a recarga não mexe em `ol_work_key`) |
| 3. Realizar e revisar | 3º | feita em 06 e 07/11/2026 | commits `35984bc`, `887d77c`, `98c9690` e o de docs na `renato-features` (sem PR), validados por quatro agentes de contexto limpo e testados à mão (Edge e emulador) |
| 4. Revisão independente e PR | 4º | a fazer | commit `fix` com as correções + PR para a `desenvolvimento` |

Quem terminar uma etapa atualiza esta tabela (situação, data e saída) e o item 2 do [`README.md`](README.md) desta pasta.

---

## Contexto comum a todas as etapas

**Quem é o dono:** Renato Douglas (git `RenatoDNS`). A feature é dele, mas quase todo o código que ela toca é do **Vicenzo Fonseca**: o script de carga ([F-ACV-INGESTAO](../../periodo-1/feature-F-ACV-INGESTAO.md)), os endpoints e formulários de livro pessoal ([F-ACV-CADASTRO](../../periodo-1/feature-F-ACV-CADASTRO.md)) e as páginas de descoberta ([F-ACV-DESCOBERTA](../../periodo-2/feature-F-ACV-DESCOBERTA.md)). Busca e filtros ([F-ACV-BUSCA](../../periodo-1/feature-F-ACV-BUSCA.md)) e nota ([F-ACV-NOTA](../../periodo-2/feature-F-ACV-NOTA.md)) são do Renato. A recomendação algorítmica ([F-REC-ALG](../feature-F-REC-ALG.md)) é do **Henrique**.

**O que a feature entrega** (dois escopos independentes, mesmo serviço):

- **(a) RF-ACV-22 — assuntos em livro pessoal:** `POST /livros/pessoal` e `PATCH /livros/pessoal/{id}` aceitam `assuntos[]` (ids do conjunto curado de 31 assuntos; id inexistente e texto livre rejeitados; só o dono edita; terceiro com `via=feed|lista` só vê). Seletor nos formulários de criar e editar (web e app) e linha `Assuntos` na ficha do livro pessoal. **Os assuntos do livro pessoal nunca alimentam busca, filtros, páginas de autor/editora/série/assunto nem contadores de catálogo** (RN-03, RNF-SEC-06).
- **(b) RF-ACV-14 — recarga manual do dump:** o mesmo script de carga em modo `recarga`, idempotente, registrando a execução em `ingestao_execucao`, **sem apagar** livro pessoal, cópia própria da capa, sinopse obtida, nota geral nem a projeção da nota dos leitores. Livro que deixou de passar nos filtros não é removido.

**Ordem e corte:** (a) primeiro (backend → web → mobile); (b) depois. **Se o prazo apertar, (b) é o primeiro corte.** A execução real da recarga roda no Neon e é combinada com o grupo: **nenhuma etapa roda a recarga contra o Neon (dev ou DES) sem o OK do Renato**; a validação automática usa a amostra reproduzível em Postgres descartável.

**Prazo:** congelamento de features em **17/11/2026**; nada desta feature entra depois. A etapa 1 estima em dias e, se não couber, propõe o corte em vez de esticar.

**Leitura obrigatória antes de qualquer etapa** (AGENTS.md §5.1):

1. `AGENTS.md` (raiz) e os locais: `code/back/acervo/AGENTS.md`, `code/scripts/ingestao/AGENTS.md` (e o `README.md` dele), `code/front/AGENTS.md`, `code/mobile/AGENTS.md`.
2. `docs/orquestador/REQUISITOS.md`: §5.2 (RF-ACV-02/03, RF-ACV-14, RF-ACV-21, RF-ACV-22), RN-02, RN-03, RN-12, RN-14, RN-15, RN-19, RN-21, §10.1, §10.2, RNF-SEC-02/06/12/13/33, RNF-DES-04/05, RNF-ARQ-05, RNF-TST-02..08.
3. `docs/orquestador/documento-de-arquitetura.md` §2.1, §2.4, §4.1 e §4.2 (leitura entre schemas só por VIEW versionada).
4. `docs/orquestador/documento-de-design.md` (tokens e componentes) — para web e mobile.
5. **O arquivo da feature:** `docs/plano-de-desenvolvimento/periodo-3/feature-F-ACV-OPC.md` (especificação, critérios de aceite, DoD e Pendências, inclusive o que está "a ratificar" e "a confirmar").
6. **As features que esta estende:** `periodo-1/feature-F-ACV-INGESTAO.md`, `periodo-1/feature-F-ACV-CADASTRO.md`, `periodo-1/feature-F-ACV-BUSCA.md`, `periodo-2/feature-F-ACV-NOTA.md` (subcomando `notas`, que roda depois de cada recarga) e `periodo-2/feature-F-ACV-DESCOBERTA.md` (biografias, páginas de autor/editora/série).
7. Design P3: `docs/design/periodo-3/cadastro-pessoal/` e `docs/design/periodo-3/livro-pessoal/` (prompt `.md` + `prototipos/*.html`). Protótipo é referência visual, não spec de pixel.
8. Planos anteriores do Renato, como modelo de formato e de nível de detalhe: `plano-F-MOD-OPC.md` (nesta pasta) e `../../periodo-2/renato-periodo-2/plano-F-ACV-NOTA.md` (o mais parecido: `acervo` + script de carga).

**Ferramentas:** o repositório tem índice CodeGraph (`.codegraph/`); use `codegraph_explore` antes de grep/Read para achar e entender código. Há MCPs do Neon, do Render e da CloudAMQP: o que dá para fazer por eles não é devolvido ao Renato como tarefa.

**Regras que não se negociam:**

- Nenhum arquivo de `docs/orquestador/` é editado. Divergência vira pendência no arquivo da feature.
- Não editar `feature-*.md` de outro dono (só o `feature-F-ACV-OPC.md`).
- Mudança em código de outro dono (script de ingestão, livro pessoal no `acervo`, formulários do Vicenzo na web e no app, qualquer coisa do Henrique) é permitida, mas fica registrada com nota datada no `AGENTS.md` do serviço/subprojeto dele (o quê, por quê, onde, armadilhas), comentário no topo da migration, e listada no arquivo da feature e no PR.
- **Gêmeos Python/TS:** o `AGENTS.md` da ingestão lista regras que existem duplicadas no script e no `acervo` (normalização, autor utilizável, chave unificada, texto puro). Se a recarga mexer numa delas, muda nos dois com os mesmos casos de teste.
- **Migration:** nome com timestamp/numeração do serviço, só tabelas do schema `acervo`. Por decisão do Renato (06/11/2026), migration nova é **aplicada no banco de dev** (Neon `le-ai`, São Paulo; no `acervo`, `npm run db:migrate` com o `.env` local) **assim que os testes passam, sem esperar o OK dele**; o SQL vai no relatório. O DES só recebe no deploy da `main`.
- Testes de integração em Postgres descartável (Docker/CI), **nunca no Neon**. O `.env` local nunca aponta para o DES.
- Commits: Conventional Commits, **só o assunto, em pt-BR acentuado, sem corpo**, **sem `Co-Authored-By` e sem rodapé de ferramenta**. PR também sem linha de atribuição.
- Branch de trabalho: `renato-features`. `git fetch` e `git pull --rebase` antes de começar; integrar a `origin/desenvolvimento` antes do PR. Não trocar de branch na pasta principal se houver outro agente trabalhando em outra worktree.
- **PR só para a `desenvolvimento`.** O merge na `main` e o DES são do grupo, no fechamento de novembro: não entram como pendência do Renato.
- Débito da própria feature é corrigido, não só registrado.
- Relatórios ao Renato: curtos e diretos, o essencial primeiro.

**Comandos de verificação por camada:**

- `acervo`: `npm run lint`, `npm run build`, `npm test`, `npm run test:integration` (Postgres descartável, ver o `AGENTS.md` do serviço). No Windows, o lint dos serviços Nest acusa `␍` (checkout com CRLF) em todos os arquivos: isso não é achado.
- Script: `python -m pytest` com `DATABASE_URL_TESTE` apontando para um Postgres em Docker (sem ele, os testes `banco` pulam e não valem como verificação).
- Web (`code/front`): `npm run lint`, `npm run build`, `npm test`.
- Mobile (`code/mobile`): `flutter analyze`, `flutter test`.

---

## Etapa 1 — Planejar (1º agente)

> **Prompt:** Você vai produzir o plano de implementação da F-ACV-OPC. Não escreva código nem migration nesta etapa. A saída é `docs/plano-de-desenvolvimento/periodo-3/renato-periodo-3/plano-F-ACV-OPC.md`, autossuficiente, no formato de `plano-F-MOD-OPC.md` (Contexto · Decisões do dono · Dependências de outras pessoas · Pré-requisitos · Etapas por camada com os commits previstos · Contratos · Verificação · Riscos e plano de corte · Estimativa). Faça a leitura obrigatória do "Contexto comum" e siga os passos abaixo.

### 1.1 Levantar o que já existe (com caminho e linha)

Confira no código da `origin/desenvolvimento` e registre no Contexto do plano:

- **Schema `acervo`:** `assunto`, `livro_assunto` (há CHECK, trigger ou FK que hoje impeça livro `tipo=pessoal`? o que acontece com as linhas quando o livro pessoal é apagado, inclusive pela exclusão de conta em `conta-excluida.consumer.ts`?), `ingestao_execucao` (o CHECK de tipo já aceita `recarga`), `livro` (`tipo`, dono, `atualizado_em` como relógio da sinopse, capa externa e própria, nota).
- **Livro pessoal no `acervo`:** controller, DTO/validação, serviço e repositório de `POST /livros/pessoal`, `PATCH /livros/pessoal/{id}` e da leitura do livro pessoal (dono e `via=feed|lista`), `Idempotency-Key`, corpo de erro padrão. Se já existe listagem do conjunto curado (`GET /assuntos` ou o que alimenta o filtro de RF-ACV-02): reaproveitar em vez de criar outra.
- **Inventário de isolamento — a parte mais arriscada.** Liste **toda consulta que lê `livro_assunto` ou `assunto`**: busca e filtros, contagens de catálogo, páginas de autor/editora/série/assunto, descobrir, VIEWs expostas a outros schemas (inclusive as que a F-REC-ALG usa ou vai usar), seeds e testes. Para cada uma: hoje ela filtra `tipo=oficial`? Se não, o livro pessoal com assunto vaza. Registre caminho/linha, o efeito e de quem é o código.
- **Script de carga:** o que o `--tipo recarga` do `cli.py` já faz; o caminho do upsert em `carga.py` (por ISBN-13 e `ol_edition_key`): quais colunas ele sobrescreve num livro que já existe (título, páginas, capa externa, autores, editora, série, assuntos) e se alguma delas apaga dado local (capa própria, sinopse, `atualizado_em`, nota geral, projeção da nota dos leitores); como trata o livro que deixou de passar nos filtros; o que `ingestao_execucao` grava; o que os testes de amostra cobrem e se o CI roda os testes com banco.
- **Web:** formulário de livro pessoal (criar e editar), página do livro pessoal (dono e modo consulta) e o serviço HTTP do `acervo`.
- **Mobile:** os mesmos três pontos.
- **Operação da recarga:** de onde vêm os dumps (estão na máquina do Renato? qual tamanho?), quanto tempo levou a carga inicial e quanto do plano Neon ela consumiu (Timeline da F-ACV-INGESTAO), e como a carga chegou ao DES.

### 1.2 Fechar as decisões em aberto com o dono

Pergunte ao Renato **em lotes curtos** (pergunta com opções e a recomendada primeiro), sem perguntar o que dá para decidir pelo código ou por um padrão já adotado. As conhecidas em 06/11/2026:

1. **Teto de 5 assuntos:** o servidor rejeita acima de 5 ou só o cliente avisa (o design diz "acima de 5 só avisa"; RN-21.2 diz "recomendado")?
2. Ficha do livro pessoal: assuntos **em texto, não chip**, em **ordem alfabética**, e a linha some quando vazia (ratificar o design).
3. Fechar o seletor sem `Concluir` **descarta** a escolha (ratificar) e o **texto do aviso** acima de 5.
4. `assuntos[]` também na leitura do livro pessoal em **modo consulta** (terceiro por `via=feed|lista`).
5. Erro de assunto inexistente e de texto livre: código e mensagem (seguir o padrão de erro do `acervo`; só perguntar se houver mais de um padrão).
6. Recarga: num livro que já existe, os **assuntos do livro oficial** são substituídos pelo mapeamento atual ou só acrescidos? E os autores, editora e série?
7. Recarga: a **nota geral** acompanha a fonte (o subcomando `notas` limpa a da obra que saiu do dump, por decisão de 23/10); confirmar que a recarga roda `notas` em seguida e que isso é compatível com "a recarga não apaga a nota".
8. **Execução real da recarga** nesta feature: rodar no Neon de dev (quando, avisando o grupo) e deixar o DES para o fechamento, ou entregar só o modo validado contra a amostra e registrar a execução como pendência do grupo?
9. Escopo de corte: se não couber até 17/11, cortar (b) inteiro ou entregar (b) só no script, sem a execução real?

Registre as respostas na seção "Decisões do dono (data)" do plano. **Não decida** se os assuntos do livro pessoal do próprio leitor contam na F-REC-ALG: é do grupo (pendência da feature).

### 1.3 Escrever o plano

- Ordem das camadas: **(a)** `acervo` (migration se o levantamento apontar, validação de `assuntos[]`, gravação e leitura, isolamento em cada consulta do inventário) → web → mobile → `docs/api/acervo.yaml`; **(b)** script (modo `recarga`, preservação, idempotência, registro) → testes da amostra → roteiro de operação.
- Para cada camada: arquivos a criar/alterar, testes (unidade e integração em container, incluindo os do DoD: recarga idempotente sobre a amostra, preservação de capa própria/sinopse/nota/livro pessoal, rejeição de id inexistente e texto livre, propriedade do livro pessoal, isolamento de busca/filtros/páginas/contadores, seletor e timeout nos clientes), e o commit previsto (assunto pt-BR).
- **Dependências de outras pessoas:** cada arquivo alheio que muda, o dono e o aviso no `AGENTS.md` dele.
- **Verificação:** comandos por camada antes de cada commit e o roteiro do teste manual: leitor A cria livro pessoal com assuntos (web e app), edita, esvazia; acima de 5; falha ao carregar a lista não impede salvar; leitor B vê os assuntos pelo feed ou por uma lista, sem editar, e um `PATCH` dele é recusado; o livro não aparece por assunto na busca, nos filtros nem nas páginas, e os contadores não mudam; recarga da amostra duas vezes sem duplicar e sem perder o dado local.
- **Riscos**, **plano de corte** e **estimativa** em dias contra 17/11.

### 1.4 Fechar

- Anote no topo do plano: "Plano de DD/MM/2026, ainda não revisado". A revisão é a etapa 2, feita por outro agente: **não a faça aqui**.
- Atualize a tabela "Andamento" e o item 2 do `README.md` desta pasta. Não altere o `feature-F-ACV-OPC.md` (sessão de planejamento), salvo se o Renato pedir para registrar as decisões lá.
- Relatório ao Renato: decisões fechadas, estimativa, o que precisa de aval dele e o link do plano.

---

## Etapa 2 — Revisar o plano (2º agente)

> **Prompt:** Revise com contexto limpo o `plano-F-ACV-OPC.md` desta pasta contra o código da `origin/desenvolvimento` e as fontes da verdade. Faça a leitura obrigatória do "Contexto comum". Não escreva código.

- **O que conferir:**
  - cada fato do Contexto (caminho e linha existem e dizem o que o plano diz);
  - o **inventário de isolamento** está completo: procure por conta própria toda leitura de `livro_assunto`/`assunto` no `acervo`, nas VIEWs e nos outros serviços, e aponte o que faltou;
  - o plano cobre **todos** os critérios de aceite e itens do DoD do `feature-F-ACV-OPC.md`, e as decisões do dono não contradizem `REQUISITOS.md` (contradição vira pendência, não ajuste silencioso);
  - a recarga preserva tudo o que a especificação manda preservar, confrontando com o que `carga.py` faz hoje, e não quebra os gêmeos Python/TS;
  - migrations (se houver) só no schema `acervo`, com rollback pensado, e os testes previstos de fato provam cada critério;
  - código alheio listado com o dono certo e a nota no `AGENTS.md` dele;
  - a estimativa e o plano de corte são realistas para 17/11.
- **Saída:** corrija o plano com os achados confirmados (é documento, pode editar) e anote no topo: "Plano de DD/MM/2026, revisado em DD/MM com N achados (veredito: …)". Achado que muda uma decisão do dono **não** é aplicado: vai para o relatório como pergunta ao Renato.
- Atualize a tabela "Andamento" e o item 2 do `README.md`. Relatório curto: o veredito, os achados (com caminho/linha e gravidade) e as perguntas pendentes ao Renato.

---

## Etapa 3 — Realizar e revisar (3º agente)

> **Prompt:** Implemente a F-ACV-OPC seguindo `plano-F-ACV-OPC.md` desta pasta, que prevalece sobre este prompt nos detalhes. Faça a leitura obrigatória do "Contexto comum". Não peça aprovação ao Renato no meio: o que precisar do aval dele fica para o relatório final.

1. Comece com `git fetch` e a `renato-features` atualizada com a `origin/desenvolvimento`.
2. Siga a ordem e os commits do plano. Antes de cada commit, rode a verificação da camada. Migration nova: aplicar no dev assim que os testes passarem (ver "Regras").
3. Registre cada mudança em código alheio no `AGENTS.md` do dono, no mesmo commit.
4. **Revisão da própria entrega**, antes de passar adiante:
   - um agente de contexto limpo por camada (`acervo`, script, web, mobile), com prompt autossuficiente (fontes da verdade, arquivo da feature, plano, o que conferir, comandos de teste). Eles **só leem e testam**: proibido editar, commitar ou trocar de branch, e relatam só achados confirmados, com caminho/linha e como reproduzir;
   - corrija os achados confirmados, com teste para cada um, e rode a verificação de novo.
5. **Teste manual** com os serviços locais e o banco de dev (sem a extensão do Chrome): web no Edge headless via `playwright-core` (numa pasta do scratchpad, `chromium.launch({ channel: 'msedge' })`, prints em 1440 e 390 px, claro e escuro); app no emulador `Pixel_8_API_35` com `flutter run`, interação por `adb` + `uiautomator dump`; contas próprias criadas por `/auth/register` com e-mail `.invalid` (as seed não funcionam no dev). Roteiro: o da seção Verificação do plano. A recarga entra no teste manual só contra a amostra em Postgres descartável, salvo OK explícito do Renato para o Neon.
6. Ao terminar: atualize o `feature-F-ACV-OPC.md` (Status por camada, critérios e DoD marcados só com evidência, Pendências com decisões, divergências, débitos e código alheio, Timeline datada), o `docs/api/acervo.yaml`, a tabela "Andamento" e o `README.md` desta pasta.
7. Faça `git push` da `renato-features`, mas **não abra o PR**: ele é aberto na etapa 4, depois da revisão independente.
8. Relatório ao Renato: o que foi entregue, os achados e as correções, as migrations aplicadas (com o SQL), o que ficou como débito e o que depende dele.

---

## Etapa 4 — Revisão independente e PR (4º agente)

> **Prompt:** Revise com contexto limpo a F-ACV-OPC implementada na `renato-features` (o diff é `git diff origin/desenvolvimento...renato-features`) e, ao final, abra o PR para a `desenvolvimento`. Faça a leitura obrigatória do "Contexto comum" e leia o plano. Não peça aprovação no meio.

1. **Revisão:** um agente de contexto limpo por camada (`acervo`, script, web, mobile), que **só lê e testa** (sem editar, commitar nem trocar de branch). O que conferir:
   - cada critério de aceite e item do DoD do `feature-F-ACV-OPC.md`, marcado só se houver evidência (teste ou teste manual registrado);
   - isolamento do livro pessoal: busca, filtros, páginas de autor/editora/série/assunto, contadores e VIEWs, com o livro pessoal **com** assuntos na massa de teste;
   - autorização: só o dono grava `assuntos[]`; terceiro por `via=feed|lista` só lê; sem via, nada;
   - recarga: idempotência sobre a amostra, nada local apagado, livro fora dos filtros mantido, `ingestao_execucao` com os totais, gêmeos Python/TS iguais;
   - nada do que já funcionava quebrou (cadastro e edição de livro pessoal sem `assuntos`, busca e filtros do livro oficial, carga inicial);
   - migrations, notas nos `AGENTS.md` dos donos e `docs/api/acervo.yaml` coerentes com o código.
2. **Corrigir** os achados confirmados num commit `fix: correções da revisão da F-ACV-OPC`, com teste para cada um, e rodar a verificação completa de todas as camadas de novo.
3. Atualize o `feature-F-ACV-OPC.md` (Timeline com a revisão e os números dos testes), a tabela "Andamento" e o `README.md` desta pasta.
4. **PR:** integre a `origin/desenvolvimento`, faça o push e abra `gh pr create --base desenvolvimento --head renato-features`, corpo no formato dos PRs anteriores do Renato (#57, #61): resumo, Backend, Script, Web, Mobile, Decisões, avisos aos donos alheios (Vicenzo e quem mais), Testes, DES. Destaque as migrations (já aplicadas no dev) e o estado da recarga real. Sem linha de atribuição. Confira que o CI do PR ficou verde.
5. Relatório ao Renato: o link do PR, os achados e as correções, e o que depende dele (por exemplo, o OK para rodar a recarga no Neon).
