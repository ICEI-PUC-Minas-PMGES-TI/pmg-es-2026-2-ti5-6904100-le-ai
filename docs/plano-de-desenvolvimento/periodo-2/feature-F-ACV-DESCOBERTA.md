# F-ACV-DESCOBERTA — Filtros e páginas de autor/editora/série

**Período:** 2 · **Prioridade:** desejavel
**Dono:** Vicenzo Fonseca · **Serviços afetados:** `acervo` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2 (RF-ACV-03, 10, 11, 12, 21), RN-21, §10.1. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §2.2, §3.2, §4.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Aprofundar a **descoberta do acervo** que [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) deixou para o Período 2: filtros avançados e as páginas de consulta de autor, editora e série. Fecha os requisitos **Desejáveis**:

- **RF-ACV-03** filtrar resultados de busca por **autor, editora, série, ano de publicação e faixa de nº de páginas**;
- **RF-ACV-10** visualizar a **página de autor**, com biografia curta e lista de livros oficiais daquele autor;
- **RF-ACV-11** visualizar a **página de editora**, com a lista de livros oficiais daquela editora;
- **RF-ACV-12** visualizar a **página de série**, com os livros oficiais da série **ordenados por número de ordem**;
- **RF-ACV-21** a página do livro exibe seus **assuntos**, cada um **acionável como filtro** de busca.

As páginas de autor, editora e série **não são perfis** (§5.2 do `REQUISITOS.md`): não têm dono, não recebem conteúdo de usuário e não são editáveis — são consulta e filtro sobre a base oficial curada.

RNF atendidos: **RNF-DES-02** (listagens paginadas com teto server-side), **RNF-DES-03** (índices de busca), **RNF-SEC-05** (IDs não sequenciais), **RNF-SEC-06** (livro pessoal fora de busca/catálogo/páginas de autor/editora/série), **RNF-DES-01** (leitura ≤1s p95 sem cold start).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | implementado (02/10/2026) | migration `0005`: índice trigram do nome da série e CHECK `autor_biografia_ck`, revisada e **aplicada no banco de dev em 02/10/2026** (DES recebe no deploy da `main`). Índice de ano/páginas medido e dispensado (Timeline). Biografias a carregar pelo script `biografias` em dev e DES |
| Backend | implementado (02/10/2026) | `acervo`: filtros avançados em `GET /livros`, `GET /autores/{id}`, `GET /editoras/{id}`, `GET /series/{id}`, `editoraId` e `serie` em `GET /livros/{id}` e biografia na importação por ISBN; contrato `implemented` no `acervo.yaml` |
| Web | implementado e em `desenvolvimento` (07/10/2026) | filtros no Descobrir (painel recolhível e folha), páginas `/descobrir/autores|editoras|series/:id` e links da ficha com `Assuntos`. Conferido pelo dono no navegador contra os serviços locais, com os ajustes da Timeline. Lint, 734 testes e build verdes |
| Mobile | implementado e em `desenvolvimento` (07/10/2026) | mesmas telas, com as páginas sob `/descobrir` e `/perfil`. `analyze`, 531 testes e `build apk --debug` verdes; **falta conferir no emulador** |

## Onde continuar (atualizado em 07/10/2026, no fechamento)

Backend, web e mobile estão mergeados em `desenvolvimento` (merge da `vicenzo-features` em 07/10/2026). A `vicenzo-features` continua existindo, a pedido do dono. Os commits estão na Timeline.

**Falta para o DoD e os critérios de aceite**
1. **Biografias (critério de RF-ACV-10):** o código está pronto, mas o banco ainda não tem os textos. Rodar `python -m leai_ingestao biografias` com o dump de autores (seção "Como carregar as biografias"):
   - primeiro em dev, com `--dry-run` antes;
   - depois do merge na `main`, em DES;
   - registrar os números na Timeline.
2. **Mobile no emulador:** o mesmo roteiro da web. Busca com filtros, chips e badge; autor, editora e série a partir da ficha; ordem da série; toque num assunto.
3. **DES (fim do período):** depois do PR `desenvolvimento` → `main`, conferir os filtros e as páginas em DES e a leitura ≤1s p95 (RNF-DES-01).

**Fora desta feature, mas no `acervo` e com o Vicenzo:**
- A etapa 3 da [F-LST](feature-F-LST.md#etapa-3-via-lista-no-acervo), a via lista no livro pessoal. Ela foi delegada pelo Henrique em 05/10/2026 e bloqueia o RF-LST-06 e o DoD da F-LST.
- O `npm audit --audit-level=high` do `acervo` falha desde 07/10/2026 por avisos publicados depois do último ajuste (03/10). Ver Pendências. O próximo push que tocar `code/back/acervo` deixa o CI vermelho até isso ser resolvido.

**Para retomar rápido**
- **Testes do backend:** `npm test` e `DATABASE_URL_TESTE=postgresql://postgres:teste@localhost:55432/leai_teste npm run test:integration` em `code/back/acervo`. O container `leai-pg-teste` já existe localmente.
- **Testes da ingestão:** `.venv/bin/python -m pytest` em `code/scripts/ingestao`.
- **Protótipos:** autor, editora e série em `docs/design/periodo-2/F-ACV-DESCOBERTA/`; filtros em `docs/design/periodo-2/descobrir/`; ficha em `docs/design/periodo-2/pagina-do-livro/`.
- **Banco de dev:** o banco de dev no Neon se chama `leai-db-prd`, mas é o projeto de **dev** (`le-ai`, São Paulo). O DES fica em Oregon.

## Especificação

### Backend / API — `acervo`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). **Livro pessoal nunca aparece** em busca, filtros ou páginas de autor/editora/série (SEC-06, RN-03). Lê as tabelas `Autor/Editora/Serie/Assunto` e associações do **próprio** schema `acervo`, criadas por [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md).

- **`GET /livros`** — estende a busca de [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) com os **filtros de RF-ACV-03**: `autor`, `editora`, `serie`, `ano` e **faixa de nº de páginas** (`paginasMin`/`paginasMax`), combináveis com o filtro por assunto já existente (RF-ACV-02). Paginado com teto (RNF-DES-02) e índices adequados (RNF-DES-03).
- **`GET /autores/{id}`** (RF-ACV-10) — biografia curta da **OpenLibrary**, quando disponível, e livros oficiais paginados. Sem biografia na fonte (ou sem identificador de autor), omitir a seção e manter a lista utilizável. Não inventar texto nem consultar fonte alternativa para a biografia.
- **`GET /editoras/{id}`** (RF-ACV-11) — página de editora: lista **paginada** de livros oficiais daquela editora.
- **`GET /series/{id}?page=`** (RF-ACV-12) — página de série paginada com teto server-side; livros oficiais ordenados por número de ordem (RN-12).
- **Assunto acionável (RF-ACV-21):** `GET /livros/{id}` (de [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md)) passa a expor os **assuntos** do livro como itens **acionáveis** que apontam para `GET /livros?assunto=<id>` (RN-21: assunto é filtro de busca). Os assuntos já existem desde a ingestão.

Sem novos eventos e sem VIEW cross-schema: a feature lê e serve dados do próprio `acervo`.

### Frontend Web (`code/front`)

- **Filtros avançados** na tela de busca (autor/editora/série/ano/faixa de páginas), combináveis com assunto; **páginas de autor, editora e série** (consulta, sem ações de perfil); **assuntos clicáveis** na página do livro que levam à busca filtrada. Usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md) (card de livro, chips de filtro). Cold start tratado como carregamento (RNF-ERR-09).

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); paginação incremental nas listas. Alvo de demonstração Android.

### Contrato implementado (backend, 02/10/2026)

- **`GET /livros`:** `autor`, `editora` e `serie` são texto livre e casam como o `q`: por trecho, sem acento e palavra por palavra, todas no nome de um **mesmo** autor. A editora casa também pelos sinônimos de `acervo.sinonimo_editora` ("cia das letras" acha a Companhia das Letras). `ano` é um valor único. `paginasMin`/`paginasMax` formam faixa fechada, e cada lado vale sozinho. Tudo se soma (AND) ao `q` e ao `assunto`. **Qualquer critério basta**: o 400 por falta de critério só sai sem nenhum dos oito, ainda no campo `q`, com a mensagem "Informe um texto de busca, um assunto ou um filtro.". `paginasMin > paginasMax` é 400 em `paginasMax`. Sem `q`, a ordem continua por título.
- **`GET /autores/{id}`**, **`/editoras/{id}`** e **`/series/{id}`** (`page`, `limit` ≤ 50):
  - **Autor:** `{ id, nome, biografia | null, livros }`.
  - **Editora:** `{ id, nome, livros }`.
  - **Série:** `{ id, nome, autores[], livros }`. Cada item da série traz `numeroNaSerie`.
  - **Contagem:** `livros.totalItens` é o "N livros no acervo", contando edições.
  - **Ordem de autor e editora:** pelo ano mais recente do grupo (título normalizado + autores, como na busca), com as edições juntas e os grupos sem ano no fim.
  - **Ordem da série:** pelo número de ordem. Sem número vai no fim, por título. Lacuna não gera item, e edições de mesmo número ficam juntas, da mais recente para a mais antiga.
  - **Respostas:** entidade sem livro oficial ativo dá 200 com a lista vazia; inexistente dá 404; id malformado dá 400 em `id`. Não há rate limit próprio, porque a rota não chama fonte externa.
- **`GET /livros/{id}`:** acrescenta `editoraId` e `serie { id, nome, numero | null }`. O id de cada assunto já filtra `GET /livros?assunto=` (RF-ACV-21), o que o teste de integração prova.
- **Biografia:** `autor.biografia` em texto puro (gêmeos `textoPuro` no TS e `texto_puro` no Python), com teto de 2000 e nunca vazia (CHECK). Duas origens:
  - o script `biografias`, para os autores já carregados;
  - a importação por ISBN, que já consultava `/authors/{key}.json` e agora grava o `bio` do autor novo e completa o do autor existente sem sobrescrever.
- **Código:**
  - `src/livros/catalogo/` (controller, service, repository, DTOs);
  - `BuscaRepository` com filtros, filtros por id e as ordens `relevancia`, `ano-do-grupo` e `serie`;
  - `BuscaService.paginar()`, compartilhado pela busca e pelas três páginas.

### Como carregar as biografias (Vicenzo, na máquina com o dump)

O dump de autores (`ol_dump_authors_*.txt.gz`, ~0,7 GB) é o mesmo da carga de 24/09/2026. O script lê o dump em streaming e só procura os autores já carregados com `biografia IS NULL`. Grava tudo numa transação, com `UPDATE ... WHERE biografia IS NULL`. Reexecutar não muda nada, e a biografia que a importação por ISBN gravou nunca é sobrescrita.

1. **Migration primeiro:** o CHECK `autor_biografia_ck` vem da `0005`. Em dev, rode `npm run db:migrate` em `code/back/acervo` depois da revisão humana. Em DES, ela entra no deploy da `main` (`start:prod` aplica as migrations).
2. **Ambiente do script:** em `code/scripts/ingestao`, rode `pip install -e .[banco]`. A `DATABASE_URL` do ambiente-alvo vem do `.env` do `acervo` (dev) ou do painel do Neon (DES) e nunca é versionada.
3. **Simular** (grava numa transação desfeita e só mostra os números):
   ```bash
   DATABASE_URL='postgresql://...' python -m leai_ingestao biografias \
     --dump-autores dumps/ol_dump_authors_latest.txt.gz --dry-run
   ```
4. **Gravar:** o mesmo comando sem `--dry-run`. O resumo mostra `autores_sem_biografia`, `encontrados_no_dump`, `com_biografia_no_dump` e `atualizados`.
5. **Conferir:**
   ```sql
   SELECT count(*) FILTER (WHERE biografia IS NOT NULL) AS com_biografia, count(*) AS autores
     FROM acervo.autor;
   ```
6. Repetir em DES depois do merge na `main`. Registrar os números na Timeline.

A biografia fica **no idioma da fonte**: a OpenLibrary costuma devolver em inglês. Ver Pendências.

## Critérios de aceite

- [x] Busca aceita filtros por **autor, editora, série, ano e faixa de nº de páginas** (RF-ACV-03), combináveis com assunto, paginada e indexada.
- [x] Páginas de **autor/editora/série** listam os livros oficiais corretos, paginados; a de série ordena por **número de ordem** (RF-ACV-12).
- [ ] Página de autor entrega a biografia curta exigida por RF-ACV-10 a partir da fonte aprovada pelo grupo. *(Código e testes prontos; falta carregar as biografias com o script.)*
- [x] Nenhuma dessas páginas/filtros expõe **livro pessoal** (SEC-06, RN-03); elas não têm ações de perfil (não editáveis, sem conteúdo de usuário).
- [x] Na página do livro, cada **assunto é acionável** e leva à busca filtrada por aquele assunto (RF-ACV-21, RN-21).
- [ ] Filtros e páginas funcionam **em DES**, com leitura ≤1s p95 desconsiderando cold start (RNF-DES-01).

## Definition of Done

(plano §10)

- [x] Código (backend `acervo`, web, mobile) mergeado em `desenvolvimento` — 07/10/2026
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [x] Testes unitários e de integração com banco real/container: filtros/combinações, biografia, série ordenada/paginada, exclusão de livro pessoal e assunto acionável (RNF-TST-02) — 02/10/2026
- [x] Testes web/mobile cobrem filtros, navegação às páginas de autor/editora/série e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06) — 07/10/2026
- [x] **Spec OpenAPI de `acervo` atualizado em `docs/api/acervo.yaml`** com os filtros de `GET /livros` e os endpoints de autor/editora/série — 02/10/2026
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [x] Arquivo da feature atualizado: status, pendências, timeline — 07/10/2026
- [x] Divergência protótipo × implementação registrada, se houver (Pendências, ratificadas em 07/10/2026)

## Pendências

- **Backend pronto em 02/10/2026; web e mobile em 07/10/2026.** Antes do merge em `desenvolvimento`:
  - **aviso ao Renato**, integrador da página do livro (alerta deixado nas Pendências da [F-ACV-NOTA](feature-F-ACV-NOTA.md) em 07/10/2026), de que `LivroOficialDetalhe` ganhou `editoraId` e `serie`, só como acréscimos (a F-ACV-NOTA mexe no mesmo DTO). Avise também que a tela dele mudou nas duas plataformas:
    - **web:** a ficha de `LivroOficialView.vue` aceita linha com link e complemento, e há a seção `Assuntos` depois da sinopse;
    - **mobile:** a `_Ficha` de `livro_oficial_page.dart` foi reescrita com links, e há a `_Secao('Assuntos')`.
    - Registrado também nos `AGENTS.md` de `code/front` e `code/mobile`;
  - **conferir em execução real** (web no navegador, mobile no emulador), que não foi feito nesta sessão;
  - **rodar o script `biografias`** em dev e, depois do merge na `main`, em DES (seção "Como carregar as biografias").
- **`npm audit` do `acervo` (07/10/2026):** o CI roda `npm audit --audit-level=high`, e o `acervo` passou a falhar por avisos publicados depois de 03/10.
  - `proxy-addr` (crítico) sai com `npm audit fix`.
  - `js-yaml` (alto) vem só de dependências de desenvolvimento (`ts-jest`, `eslint`, `@nestjs/cli`, `@nestjs/swagger`). A única correção automática rebaixa o `ts-jest` para a 27 (`--force`), o que quebra os testes.
  - O lockfile do `acervo` ficou fora do merge para não deixar o CI vermelho. Decidir com o grupo (override de `js-yaml` ou aceitar o aviso); o `leitura` tem o mesmo `proxy-addr`.
  - No front, o `source-map-js` (alto) foi corrigido com `npm audit fix` (`53305f2`).
- **Queda dos serviços Nest sem rede (07/10/2026, fora desta feature):** numa queda de rede, o `acervo` e o `leitura` morreram com `read ETIMEDOUT` num cliente `pg` em uso, emitido como evento `error` sem ouvinte. O `pool.on('error')` de `drizzle.module.ts` só cobre a conexão ociosa. Levar a quem cuida da infra (P0-INFRA): no Render, cada oscilação de rede reiniciaria o serviço.
- **Divergências protótipo × implementação (web e mobile, 07/10/2026)**, escolhidas na sessão de implementação e **ratificadas pelo dono em 07/10/2026**:
  - **Web, página de catálogo:** fica a seta de voltar do header, como na página do livro. O protótipo não tem voltar na web.
  - **Web, faixa de páginas:** os dois campos ficam lado a lado também no painel, como no protótipo renderizado. O `descobrir.md` diz "um embaixo do outro".
  - **Web, bloco Filtros (decisão do dono, 07/10/2026):** fica no topo do painel, acima de `Assuntos`, e é recolhível. Ele começa fechado, e o título mostra `Filtros · N ativos`. O protótipo põe o bloco abaixo de `Assuntos` e sempre aberto.
  - **Web, sufixo da faixa (decisão do dono, 07/10/2026):** fica `págs`, e não `páginas`. Com `páginas`, os dígitos ficavam cortados nos campos de cerca de 110px do painel. O mobile mantém `páginas`.
  - **Web, largura do painel (decisão do dono, 07/10/2026):** 280px, não os 240px do protótipo. Assim os campos de mínimo e máximo ficam com espaço para os dígitos.
  - **Mobile, header da página de catálogo:** mostra o tipo (`Autor`, `Editora`, `Série`), e o nome vem abaixo, marcado como cabeçalho. Na web o tipo aparece só abaixo de 768px, junto da seta, e o `h1` é o nome. No mobile web ficam dois `h1`, o do tipo e o do nome.
  - **Mobile, aba das páginas de catálogo:** abertas da ficha de um livro na aba Perfil, ficam no Perfil (`/perfil/autor/:id`), como a própria página do livro. O protótipo diz que a aba ativa continua sendo Descobrir. Na web elas ficam sempre sob `/descobrir`.
  - **Assunto tocado na ficha:** abre o Descobrir só com aquele assunto e limpa o texto e os filtros. É o comportamento da URL `/descobrir?assunto=<id>` nas duas plataformas.
  - **Ano zero:** sem copy no protótipo. A mensagem ficou `Use um ano maior que zero.`, e ano e páginas só aceitam dígitos (até 4 e 5).
  - **Biografia:** sem `Ler mais`, como pede o protótipo. O texto vem no idioma da OpenLibrary (ver abaixo).
- **Selo de status na estante nos cards (Lido, Lendo, Quero ler)**, pedido pelos protótipos de autor, editora e série e já pedido pelo Descobrir do P1. Fica **fora do backend desta entrega por decisão do dono (02/10/2026)**. O dado é do serviço `leitura`, que não tem consulta em lote. O caminho previsto é o `acervo` ler uma VIEW de estante do `leitura` (a `v_estante_publica_v1` existente ou uma nova), feito quando a F-EST-2 da Ana amadurecer. Até lá os cards saem sem o selo.
- **Idioma da biografia:** sai como a OpenLibrary devolve, muitas vezes em inglês, sem tradução e sem completar com outra fonte (RF-ACV-10, decisão de 15/09/2026). O prompt `pagina-do-autor.md` usa texto em português no mock. Levar ao grupo se incomodar na demonstração.
- **Decisões do dono ratificadas em 02/10/2026** (eram "a ratificar" no prompt):
  - listas de autor e editora pelo ano mais recente do grupo, com os sem ano no fim;
  - série sem número no fim, por título;
  - lacuna sem marcador;
  - contagem pelo `totalItens`;
  - filtros de autor, editora e série em texto livre;
  - `ano` como valor único;
  - busca só com filtros permitida.
  - Os dois conflitos de contrato abaixo foram resolvidos pelo `acervo.yaml`.
- **Telas (design P2):** prompts escritos em 28/09/2026 e protótipos exportados em 29/09/2026: [`pagina-do-autor.md`](../../design/periodo-2/F-ACV-DESCOBERTA/pagina-do-autor.md) ([protótipo](../../design/periodo-2/F-ACV-DESCOBERTA/prototipos/pagina-do-autor.html)), [`pagina-da-editora.md`](../../design/periodo-2/F-ACV-DESCOBERTA/pagina-da-editora.md) ([protótipo](../../design/periodo-2/F-ACV-DESCOBERTA/prototipos/pagina-da-editora.html)) e [`pagina-da-serie.md`](../../design/periodo-2/F-ACV-DESCOBERTA/pagina-da-serie.md) ([protótipo](../../design/periodo-2/F-ACV-DESCOBERTA/prototipos/pagina-da-serie.html)) (mesmo esqueleto de página de catálogo); filtros avançados na edição consolidada [`descobrir.md`](../../design/periodo-2/descobrir/descobrir.md) ([protótipo](../../design/periodo-2/descobrir/prototipos/descobrir.html)); assuntos acionáveis e ficha com links na edição consolidada [`pagina-do-livro.md`](../../design/periodo-2/pagina-do-livro/pagina-do-livro.md) ([protótipo](../../design/periodo-2/pagina-do-livro/prototipos/pagina-do-livro.html)). Decisões do prompt a ratificar pelo dono: ordem das listas de autor e editora por ano (o RF não fixa), livros de série sem número de ordem agrupados no fim, lacuna na numeração sem marcador, idioma da biografia (a OpenLibrary costuma devolver em inglês), contagem `N livros no acervo` pressupondo total no endpoint. **Conflitos de contrato:** `GET /livros` não diz se `autor`, `editora` e `serie` são id ou texto (o protótipo usa texto livre sem autocompletar) e `ano` é valor único; `GET /livros/{id}` precisa trazer série e número de ordem para a ficha.
- **Esta feature preenche a aba `Descobrir`, criada em 01/09/2026.** A busca do acervo deixou de ser tela filha da estante e virou o quarto item da navegação ([P0-NAV](../periodo-0/feature-P0-NAV.md), [`descobrir.md`](../../design/periodo-1/F-ACV-BUSCA/descobrir.md)). No Período 1 a aba aterrissa magra de propósito: campo de busca e faixa de assuntos, sem destaques e sem histórico. Os filtros avançados de RF-ACV-03 e os links para as páginas de autor, editora e série entram **nesta aba**, e junto com a seção de recomendações de [F-REC-P2P](feature-F-REC-P2P.md) são o que dá corpo à aterrissagem. **Atenção ao nome:** `descobrir.md` corrige a afirmação de que esta feature entregaria "descoberta aberta" com livros em destaque ou mais lidos. Ela entrega filtros e páginas de consulta; curadoria de destaques não é escopo de nenhum RF.
- **Depende de** [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) (busca e página do livro que esta feature estende) e [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md) (autor/editora/série/assunto normalizados e número de ordem), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md).
- **Decisão encerrada em 15/09/2026:** biografia vem da OpenLibrary; na ausência, a seção não é exibida. Testar com/sem biografia. Esta escolha é específica da biografia e não remove o fallback Google Books de ISBN/sinopse.
- **Decisão do dono:** validar `paginasMin <= paginasMax`, faixas positivas e combinações de filtros no schema de entrada antes de atualizar o OpenAPI.
- **Curadoria de editoras** (RF-ACV-11): ~13% da amostra são editoras **portuguesas** (§10.1) e a normalização usa a tabela de sinônimos de [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md) — a página de editora depende da qualidade dessa normalização.
- Stack de `acervo` definida: **NestJS (TypeScript)** (arquitetura §2.1).
- **Alternativa a avaliar, sem mudar o desenho atual:** reutilizar um componente de página de catálogo para autor/editora/série e criar índices adicionais somente após validar o plano de execução das consultas.

## Timeline

### Web e mobile 07/10/2026: implementados na `vicenzo-features` (`47e31be` web, `af7c5d4` mobile), depois de sincronizar a branch com a `desenvolvimento` (25 commits de F-SOCIAL-2, F-NOT-2 e F-LST, por fast-forward). Antes de começar, a base estava verde: `acervo` com 299 testes no Jest 30 que o `npm audit` trouxe, front com 693 e mobile com 498.
- **Web:** os testes foram de 693 para 731 (filtros, URL, folha e painel, chips, vazio com filtros, as três páginas com 404, erro, falha de paginação e cold start, e os links da ficha). Lint e build verdes.
- **Mobile:** os testes foram de 498 para 531 (modelo e validação dos filtros, serviço, controller, folha, páginas de catálogo, ficha e navegação no `router_test`). `analyze`, tokens e `build apk --debug` verdes.
- **Não conferido em execução real:** falta subir `identidade` e `acervo` e entrar com uma conta de dev.

### Ajustes na web 07/10/2026: conferência no navegador pelo dono.
- **Layout do Descobrir:** com filtro ativo, os chips e os resultados desciam para o meio da página. O painel lateral ocupava duas linhas do grid, e o navegador repartia a altura dele entre a linha dos chips e a dos resultados. Agora chips, contagem e resultados são um bloco só na coluna da direita.
- **Filtros:** o bloco foi para cima de `Assuntos`, ficou recolhível (começa fechado) e o sufixo virou `págs`. O `CampoTexto` reserva à direita o espaço do sufixo.
- Segunda rodada:
  - o painel passou para 280px;
  - o bloco Filtros anima ao recolher e expandir (altura e opacidade em `dur-base`, seta girando) e, fechado, fica `inert`;
  - o `Tentar de novo` dos avisos de erro do Descobrir e da página de catálogo foi para uma linha própria, porque estava desalinhando o texto do ícone.
- 734 testes; lint e build verdes.

### Fechamento 07/10/2026: verificação final e merge da `vicenzo-features` em `desenvolvimento`.
- **`acervo`:** lint, 299 unitários, 125 de integração em Postgres de container e build.
- **Ingestão:** 111 testes; os 8 de banco ficam pulados sem a variável de banco.
- **Front:** lint, 734 testes, build e `npm audit` alto zerado depois de `53305f2`.
- **Mobile:** tokens, `analyze` e 531 testes.
- **Critérios cobertos por teste:** filtros e combinações; páginas paginadas e série por número; livro pessoal fora da busca e das páginas (`busca.int-spec.ts` "nunca traz livro pessoal, mesmo só com filtros" e `catalogo.int-spec.ts` "livro pessoal nunca aparece nas páginas"); assunto acionável.
- **Ficam abertos:** a biografia (falta o script), o mobile no emulador e o DES.

### Migration 02/10/2026: `0005` aplicada no banco de dev (`le-ai`, São Paulo) pelo dono, com `npm run db:migrate`. Próximo passo de dados: rodar o script `biografias` com o dump de autores.

### Backend 02/10/2026: implementado na branch `vicenzo-features`, contrato publicado antes (`83bc4ab`) e trocado para `implemented` ao fim.
- **Migration:** `0005`.
- **Código:** filtros em `GET /livros`, páginas de autor, editora e série, `editoraId`/`serie` na página do livro, biografia na importação por ISBN e o script `biografias`.
- **Testes, todos verdes:**
  - acervo: 299 unitários e 125 de integração em Postgres real, com o novo `catalogo.int-spec.ts` e casos novos em `busca`, `livro-oficial` e `consumo-importacao`;
  - ingestão: 119 testes, incluindo os de banco.
  - As saídas do `textoPuro` (TS) e do `texto_puro` (Python) foram conferidas iguais nos mesmos casos.
- **Desempenho medido** com `EXPLAIN ANALYZE` no banco de dev (11.019 livros, 8.126 autores, 1.374 séries), em transação `READ ONLY` e ainda sem a `0005`:
  - o pior caso foi a página de `editora=companhia`, com 154 ms de execução e 118 ms de plano na primeira consulta;
  - `ano=2019` e a faixa de páginas ficaram abaixo de 25 ms;
  - as três páginas de catálogo ficaram abaixo de 6 ms.
  - Conclusão: RNF-DES-01 folgado e índice de ano/páginas dispensado, como previa a alternativa "índices só após medir". Web e mobile não iniciados.

### Revisão 15/09/2026: grupo definiu OpenLibrary como fonte de biografia e omissão quando ausente. DER atualizado; implementação não iniciada.

### Revisão 01/09/2026: reúso de página de catálogo e índices orientados por medição registrados apenas como alternativas de implementação.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-ACV-DESCOBERTA no [periodo-2/README.md](README.md), de RF-ACV-03/10/11/12/21 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2 e da RN-21. Continua a fronteira que [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) fixou (filtros avançados, páginas de consulta e assunto acionável no P2); origem da bio do autor registrada como pendência, sem inventar fonte.

### Revisão 29/08/2026: paginação da série foi explicitada. A biografia deixou de aceitar ausência como solução definitiva: sua fonte continua decisão humana bloqueante de RF-ACV-10, sem antecipar nova integração.

### Dono 29/09/2026: feature atribuída a **Vicenzo Fonseca** na [divisão do Período 2](README.md#divisão-do-período-2-entre-5-pessoas).
