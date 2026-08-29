# F-ACV-DESCOBERTA — Filtros e páginas de autor/editora/série

**Período:** 2 · **Prioridade:** desejavel
**Dono:** a definir · **Serviços afetados:** `acervo` (backend) + web + mobile

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
| Infra | não iniciado | índices para filtros (ano, nº páginas) e para páginas de autor/editora/série |
| Backend | não iniciado | `acervo`: filtros avançados em `GET /livros` + endpoints de autor/editora/série + assunto acionável |
| Web | não iniciado | filtros na busca; páginas de autor/editora/série; assuntos clicáveis na página do livro |
| Mobile | não iniciado | mesmas telas |

## Especificação

### Backend / API — `acervo`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). **Livro pessoal nunca aparece** em busca, filtros ou páginas de autor/editora/série (SEC-06, RN-03). Lê as tabelas `Autor/Editora/Serie/Assunto` e associações do **próprio** schema `acervo`, criadas por [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md).

- **`GET /livros`** — estende a busca de [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) com os **filtros de RF-ACV-03**: `autor`, `editora`, `serie`, `ano` e **faixa de nº de páginas** (`paginasMin`/`paginasMax`), combináveis com o filtro por assunto já existente (RF-ACV-02). Paginado com teto (RNF-DES-02) e índices adequados (RNF-DES-03).
- **`GET /autores/{id}`** (RF-ACV-10) — página de autor: **biografia curta** (ver Pendências quanto à origem) + lista **paginada** de livros oficiais daquele autor.
- **`GET /editoras/{id}`** (RF-ACV-11) — página de editora: lista **paginada** de livros oficiais daquela editora.
- **`GET /series/{id}?page=`** (RF-ACV-12) — página de série paginada com teto server-side; livros oficiais ordenados por número de ordem (RN-12).
- **Assunto acionável (RF-ACV-21):** `GET /livros/{id}` (de [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md)) passa a expor os **assuntos** do livro como itens **acionáveis** que apontam para `GET /livros?assunto=<id>` (RN-21: assunto é filtro de busca). Os assuntos já existem desde a ingestão.

Sem novos eventos e sem VIEW cross-schema: a feature lê e serve dados do próprio `acervo`.

### Frontend Web (`code/front`)

- **Filtros avançados** na tela de busca (autor/editora/série/ano/faixa de páginas), combináveis com assunto; **páginas de autor, editora e série** (consulta, sem ações de perfil); **assuntos clicáveis** na página do livro que levam à busca filtrada. Usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md) (card de livro, chips de filtro). Cold start tratado como carregamento (RNF-ERR-09).

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); paginação incremental nas listas. Alvo de demonstração Android.

## Critérios de aceite

- [ ] Busca aceita filtros por **autor, editora, série, ano e faixa de nº de páginas** (RF-ACV-03), combináveis com assunto, paginada e indexada.
- [ ] Páginas de **autor/editora/série** listam os livros oficiais corretos, paginados; a de série ordena por **número de ordem** (RF-ACV-12).
- [ ] Página de autor entrega a biografia curta exigida por RF-ACV-10 a partir da fonte aprovada pelo grupo.
- [ ] Nenhuma dessas páginas/filtros expõe **livro pessoal** (SEC-06, RN-03); elas não têm ações de perfil (não editáveis, sem conteúdo de usuário).
- [ ] Na página do livro, cada **assunto é acionável** e leva à busca filtrada por aquele assunto (RF-ACV-21, RN-21).
- [ ] Filtros e páginas funcionam **em DES**, com leitura ≤1s p95 desconsiderando cold start (RNF-DES-01).

## Definition of Done

(plano §10)

- [ ] Código (backend `acervo`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: filtros/combinações, biografia, série ordenada/paginada, exclusão de livro pessoal e assunto acionável (RNF-TST-02)
- [ ] Testes web/mobile cobrem filtros, navegação às páginas de autor/editora/série e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `acervo` atualizado em `docs/api/acervo.yaml`** com os filtros de `GET /livros` e os endpoints de autor/editora/série
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

## Pendências

- **Depende de** [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) (busca e página do livro que esta feature estende) e [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md) (autor/editora/série/assunto normalizados e número de ordem), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md).
- **Origem da biografia curta do autor (RF-ACV-10)** não está definida e bloqueia o fechamento desse requisito. A ingestão não carrega bio; o grupo deve aprovar uma fonte/estratégia simples antes da implementação. Exibir ausência permanentemente não fecha RF-ACV-10; não inventar integração nem alterar a baseline sem decisão.
- **Curadoria de editoras** (RF-ACV-11): ~13% da amostra são editoras **portuguesas** (§10.1) e a normalização usa a tabela de sinônimos de [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md) — a página de editora depende da qualidade dessa normalização.
- Stack de `acervo` ainda pendente (P0-INFRA).

## Timeline

### Criação 28/08/2026: arquivo criado a partir do escopo de F-ACV-DESCOBERTA no [periodo-2/README.md](README.md), de RF-ACV-03/10/11/12/21 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2 e da RN-21. Continua a fronteira que [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) fixou (filtros avançados, páginas de consulta e assunto acionável no P2); origem da bio do autor registrada como pendência, sem inventar fonte.

### Revisão 29/08/2026: paginação da série foi explicitada. A biografia deixou de aceitar ausência como solução definitiva: sua fonte continua decisão humana bloqueante de RF-ACV-10, sem antecipar nova integração.
