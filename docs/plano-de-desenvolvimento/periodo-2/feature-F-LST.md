# F-LST — Listas

**Período:** 2 · **Prioridade:** desejavel
**Dono:** a definir · **Serviços afetados:** `social` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.6 (RF-LST-01..06), RN-15, RN-08. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §4.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar as **listas de livros** — o leitor curando coleções próprias e vendo as de quem segue. Fecha os requisitos **Desejáveis**:

- **RF-LST-01** criar listas com **título e descrição**;
- **RF-LST-02** **adicionar, remover e reordenar** livros nas suas listas;
- **RF-LST-03** **editar e excluir** suas listas;
- **RF-LST-04** visualizar listas de outros leitores, **respeitando a privacidade do perfil** (RN-08);
- **RF-LST-05** adicionar **seus próprios livros pessoais** às suas listas (RN-15.1);
- **RF-LST-06** ao ver a lista de outro que contenha livro pessoal, abrir a página daquele livro em **modo consulta**, **sem ação de adicionar à estante** (RN-15.2/3).

Fecha também a parte de **listas** da composição do perfil (RF-SOC-02) que [F-PERFIL](../periodo-1/feature-F-PERFIL.md) registrou como pendência de baseline.

RNF atendidos: **RNF-SEC-02** (propriedade da lista no servidor), **RNF-SEC-03** (listas de perfil privado só a seguidor aceito), **RNF-SEC-06/07** (livro pessoal fora de busca; terceiros não agem sobre ele), **RNF-SEC-14** (título/descrição tratados como texto/escape), **RNF-DES-02** (listagens paginadas), **RNF-USA-04** (confirmação na exclusão), **RNF-ERR-04** (idempotência).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | tabelas `lista`/`lista_item`; VIEW `v_lista_livro_pessoal_v1` |
| Backend | não iniciado | `social`: CRUD de listas, itens ordenados, leitura sob RN-08, via RN-15 |
| Web | não iniciado | criar/editar listas, reordenar, ver listas de outros |
| Mobile | não iniciado | mesmas telas |

## Especificação

### Backend / API — `social`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Título/descrição tratados como texto (escape — SEC-14). Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas).

- **`POST /listas`** (RF-LST-01), **`PATCH /listas/{id}`** (editar título/descrição), **`DELETE /listas/{id}`** (RF-LST-03, confirmação — RNF-USA-04) — **owner-only** (SEC-02).
- **`POST /listas/{id}/livros`**, **`DELETE /listas/{id}/livros/{livroId}`** e **`PUT /listas/{id}/ordem`** (lista completa de `itemIds`) (RF-LST-02) — operações owner-only; a reordenação valida que os ids pertencem à lista e aplica a ordem em uma transação. O livro é validado por `v_livro_referencia_v1` (existe/ativo); listas podem conter livros oficiais e os pessoais do próprio dono.
- **`GET /listas/{id}`**, **`GET /listas/{id}/livros?cursor=`** e **`GET /perfis/{usuarioId}/listas?page=`** (RF-LST-04) — metadados da lista e itens/listas paginados com teto server-side (RNF-DES-02), sob RN-08: dono e perfil público veem; perfil privado só a seguidor aceito. `social` não lê tabela crua de `identidade`.
- **Livro pessoal em lista (RF-LST-05, RN-15.1):** apenas o **dono** adiciona **seus próprios** livros pessoais a **suas** listas — o servidor checa por `v_livro_referencia_v1` que `tipo=pessoal` **e** `dono=solicitante`. Ninguém adiciona livro pessoal de outro a uma lista sua.
- **Via RN-15 para terceiros (RF-LST-06):** a lista do dono é a **segunda via** de acesso de terceiros a um livro pessoal (a primeira é o feed — [F-FEED](../periodo-1/feature-F-FEED.md)). `social` expõe **`v_lista_livro_pessoal_v1`** (lista **ativa** do dono, dono, livro referenciado); `acervo` autoriza `GET /livros/pessoal/{id}?via=lista&referenciaId=<listaId>` exigindo que o solicitante **tenha acesso à lista** sob RN-08 (dono público, próprio, ou privado seguido) — espelhando o contrato de `v_atividade_livro_pessoal_v1` do feed. A página é **modo consulta**: metadados, capa, nota/resenha do dono, **sem** ação de adicionar à estante/favoritar/iniciar leitura (RN-15.3, SEC-06/07, validado no servidor). Conhecer os ids **não** concede acesso.

**Sem eventos e sem notificações** — listas não geram atividade de feed nem notificação (§7.2).

**VIEWs consumidas:** `v_livro_referencia_v1` (acervo), `v_perfil_referencia_v1`/`v_seguimento_aceito_v1` (identidade). **VIEW exposta:** `v_lista_livro_pessoal_v1` (para autorização em `acervo`), nome distinto das tabelas.

**Modelo de dados** (schema `social`): `lista` (dono, título, descrição, timestamps) e `lista_item` (lista, livro, ordem) — a ordem sustenta o reordenar de RF-LST-02.

### Frontend Web (`code/front`)

- **Criar/editar/excluir** listas; **adicionar/remover/reordenar** livros (drag ou controles de ordem); **ver listas de outros** sob RN-08; abrir livro pessoal de lista alheia em **modo consulta** (sem ação de estante). Usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md). Exclusão com confirmação.

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); reordenação por gesto. Alvo de demonstração Android.

## Critérios de aceite

- [ ] Criar/editar/excluir listas é **owner-only** (SEC-02); exclusão pede confirmação (RNF-USA-04).
- [ ] Adicionar/remover/**reordenar** livros mantém a ordem (RF-LST-02).
- [ ] Reordenação com item alheio ou ausente é recusada e não deixa ordem parcial; itens usam cursor/teto server-side.
- [ ] Listas de outros respeitam **RN-08** server-side (privado só a seguidor aceito — SEC-03), paginadas (RNF-DES-02).
- [ ] O dono adiciona **só seus próprios** livros pessoais às suas listas (RF-LST-05, RN-15.1); livro pessoal de terceiro é recusado.
- [ ] Livro pessoal em lista alheia abre em **modo consulta** via `v_lista_livro_pessoal_v1`/`?via=lista`, **sem** ação de estante (RF-LST-06, RN-15.3); referência forjada não autoriza.
- [ ] Repetir escrita com a mesma `Idempotency-Key` não duplica lista/item (RNF-ERR-04).
- [ ] Listas funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `social`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: CRUD/propriedade, reordenação atômica, paginação de itens, RN-08, livro pessoal do próprio dono, via lista e idempotência (RNF-TST-02)
- [ ] Testes web/mobile cobrem reordenação, listas de perfil privado e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `social` atualizado em `docs/api/social.yaml`** com listas/itens e a VIEW `v_lista_livro_pessoal_v1` documentada como contrato
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** publicar `v_lista_livro_pessoal_v1` como espelho de `v_atividade_livro_pessoal_v1` — as **duas vias** de RN-15 (feed e lista) usam a mesma autorização em `acervo`.

## Pendências

- **Telas (design P2):** entrada `Adicionar à lista` no menu `DotsThree` do header da [`pagina-do-livro.md`](../../design/periodo-2/pagina-do-livro/pagina-do-livro.md) (lote 2). Lote 3, prompts escritos em 29/09/2026, protótipos pendentes: [`lista.md`](../../design/periodo-2/F-LST/lista.md), [`listas-do-leitor.md`](../../design/periodo-2/F-LST/listas-do-leitor.md) (índice; na web é a aba `Listas` do perfil), [`criar-lista.md`](../../design/periodo-2/F-LST/criar-lista.md) (criar, editar e excluir) e [`adicionar-a-lista.md`](../../design/periodo-2/F-LST/adicionar-a-lista.md). **Contrato pendente:** `PUT /listas/{id}/ordem` exige todos os `itemIds`, mas os itens são paginados; o índice precisa de contagem, três primeiras capas e `atualizadaEm`; o sheet precisa saber se cada lista já contém o livro; criar a partir do livro pede `POST /listas` que aceite o livro (senão a lista pode ficar sem ele). Limites provisórios no protótipo: 80 caracteres no título e 300 na descrição.
- **Depende de** [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (`v_perfil_referencia_v1`/`v_seguimento_aceito_v1`), [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md)/[F-ACV-CADASTRO](../periodo-1/feature-F-ACV-CADASTRO.md) (`v_livro_referencia_v1` e a página autorizada de livro pessoal em `acervo`), [F-FEED](../periodo-1/feature-F-FEED.md) (padrão da via de acesso a livro pessoal), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md).
- **Coordenar com `acervo`** o handler de `?via=lista` na página de livro pessoal, espelhando o de `?via=feed`.
- **Compartilha `social`** com as demais features sociais e é limpo por [F-CONTA-2](feature-F-CONTA-2.md) na exclusão — sinalizar no grupo (plano §6).
- Stack de `social` definida: **Spring (Java)** (arquitetura §2.1).
- **Decisão do dono:** fixar limites de título/descrição e o comportamento de adicionar novamente livro já presente antes da migration.
- **Alternativa a avaliar, sem mudar o desenho atual:** retornar metadados e primeira página de itens no detalhe da lista e usar controles acessíveis de ordem antes de exigir drag-and-drop.

## Timeline

### Revisão 01/09/2026: limites de entrada/duplicidade registrados para o dono e alternativa de API/reordenação mantida apenas para avaliação.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-LST no [periodo-2/README.md](README.md), de RF-LST-01..06 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.6 e das RN-15/RN-08. Segunda via de RN-15 (lista do dono) fixada com `v_lista_livro_pessoal_v1`, espelho da via feed de F-FEED; fecha a composição de listas de RF-SOC-02 pendente em F-PERFIL.

### Revisão 29/08/2026: reordenação e paginação de itens ganharam contratos HTTP explícitos e transação owner-only, sem ampliar o escopo funcional de RF-LST-02/04.
