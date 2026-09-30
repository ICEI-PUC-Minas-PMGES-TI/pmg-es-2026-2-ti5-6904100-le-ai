# F-AVA-2 — Reações, Markdown e frases

**Período:** 2 · **Prioridade:** desejavel
**Dono:** a definir · **Serviços afetados:** `leitura` (backend) + `social` (mapeamento de notificação) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.5 (RF-AVA-05..09), RN-07, RN-11, RN-13, RN-15. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.2 (ajuste 1), §4.2, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Completar a **avaliação e o conteúdo** que [F-AVA](../periodo-1/feature-F-AVA.md) deixou para o Período 2. Fecha os requisitos **Desejáveis**:

- **RF-AVA-05** reagir a resenhas de outros com **curtida ou descurtida**, **uma reação por resenha**, inclusive em resenhas de **livros pessoais** a que se tenha acesso;
- **RF-AVA-06** cadastrar **frases/trechos** de um livro, com **página de referência obrigatória** (RN-11);
- **RF-AVA-07** visualizar as frases de um livro e **excluir as suas**;
- **RF-AVA-08** exibir a **contagem de curtidas e descurtidas separadamente**, visível a quem tem acesso à resenha;
- **RF-AVA-09** aceitar **Markdown** na resenha (subconjunto de RN-13) com **pré-visualização**.

RNF atendidos: **RNF-SEC-02** (propriedade no servidor), **RNF-SEC-03/06** (acesso à resenha sob RN-08/RN-15), **RNF-SEC-14** (conteúdo tratado como texto/escape), **RNF-SEC-15** (Markdown com HTML desabilitado + sanitização), **RNF-SEC-18** (rate limiting em reagir), **RNF-DES-02** (frases paginadas), **RNF-USA-04** (confirmação na exclusão), **RNF-ERR-04** (idempotência).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | tabelas `reacao_resenha` e `frase`; publisher e mapeamento consumidor de `resenha.curtida` |
| Backend | não iniciado | `leitura`: reações/frases/Markdown; `social`: novo tipo de notificação |
| Web | não iniciado | reações + contagens, editor Markdown com preview, frases |
| Mobile | não iniciado | mesmas telas |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas).

- **Reações à resenha (RF-AVA-05/08, arch §3.2 (ajuste 1) — ficam em `leitura`, junto da resenha, não em `social`):**
  - `PUT /resenhas/{id}/reacao` (`curtida | descurtida`) e `DELETE /resenhas/{id}/reacao` — **uma reação por usuário+resenha**, alternável; idempotente (RNF-ERR-04). RF-AVA-05 limita a reação a resenha **de outro**: o servidor rejeita a própria. Rate limiting (SEC-18).
  - **Acesso revalidado no servidor:** para resenha de **livro oficial**, sob **RN-08** (autor público ou privado seguido). Para **livro pessoal**, a escrita recebe `via=feed|lista` e `referenciaId`, valida a via pelas VIEWs de F-FEED/F-LST e reaplica RN-08/RN-15; conhecer resenha/livro não autoriza (SEC-06). Usa os contratos versionados, sem ler tabelas cruas externas.
  - **Contagens separadas (RF-AVA-08):** `curtidas` e `descurtidas` por resenha, expostas a quem tem acesso — **adição compatível** ao contrato `v_resenha_publicacao_v1` e ao endpoint que serve resenhas na página do livro ([F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md)) e no perfil, documentada junto do spec.
  - Publica **`resenha.curtida`** apenas na primeira curtida do par resenha/reator, com destinatário = autor e chave semântica `(resenhaId, reatorId)`. Retirar/recurtir ou alternar descurtida/curtida não renotifica. A reação retém `primeira_curtida_em` mesmo inativa; contagens ignoram reações inativas. F-AVA-2 entrega o mapeamento consumidor em social, com schema, idempotência e DLQ; descurtida não notifica.
- **Frases/trechos (RF-AVA-06/07, RN-11):** `POST /livros/{id}/frases` — texto **≤500 caracteres**, **página de referência obrigatória**, **máximo de 10 por usuário+livro** (`422` ao exceder). `GET /livros/{id}/frases?page=` — lista **paginada** (RNF-DES-02). `DELETE /frases/{id}` — exclui a **própria** frase (SEC-02, confirmação — RNF-USA-04). Livro oficial segue o fluxo normal; em livro pessoal, somente o dono cadastra/consulta frases, pois o modo consulta de RN-15 expõe a terceiros apenas metadados, capa, nota e resenha. Frases são removíveis diretamente pela moderação, sem denúncia (RN-11 → [F-MOD](feature-F-MOD.md)). Conteúdo tratado como texto/escape (SEC-14).
- **Markdown na resenha (RF-AVA-09, RN-13, SEC-15):** a resenha (texto cru de [F-AVA](../periodo-1/feature-F-AVA.md)) passa a aceitar o **subconjunto**: negrito, itálico, tachado, lista ordenada, lista não ordenada e citação em bloco. **Proibidos:** HTML embutido, links, imagens, blocos de código e tabelas. Continua **armazenada como texto cru** (≤5.000 — RN-07), **renderizada no cliente**; nenhum HTML gerado/persistido no servidor. O limite de 5.000 conta sobre o texto cru **incluindo a marcação** (RN-07).

**Modelo de dados** (schema `leitura`): `reacao_resenha` (resenha, usuário, tipo `curtida|descurtida` — única por par) e `frase` (livro, usuário, texto ≤500, página, timestamps). A resenha de [F-AVA](../periodo-1/feature-F-AVA.md) não muda de forma — só passa a ser renderizada como Markdown no cliente.

**Contratos consumidos para autorização:** `v_perfil_referencia_v1`/`v_seguimento_aceito_v1` (RN-08), `v_livro_referencia_v1` (tipo/dono/ativo), `v_atividade_livro_pessoal_v1` e `v_lista_livro_pessoal_v1` (duas vias de RN-15).

### Frontend Web (`code/front`)

- **Reações** (curtir/descurtir) na resenha com **contagens separadas** visíveis; **editor de resenha com Markdown + pré-visualização**, parser com **HTML desabilitado** e **saída sanitizada antes do DOM** (SEC-15), marcação não suportada exibida **literal**; **frases** com página obrigatória, lista paginada e exclusão das próprias (confirmação). Usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md).

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); **mesmo subconjunto Markdown** que a web (RN-13.4), renderizado sem HTML embutido. Alvo de demonstração Android.

## Critérios de aceite

- [ ] Curtir, retirar e recurtir não gera outra notificação para a mesma resenha/reator, mesmo se a primeira foi suprimida por preferência; contagens consideram somente reações ativas.

- [ ] Reação é **uma por usuário+resenha**, alternável e idempotente (RF-AVA-05, RNF-ERR-04); acesso revalidado sob **RN-08** (oficial) e **RN-15** (pessoal); rate limiting ativo (SEC-18).
- [ ] O servidor recusa reação à própria resenha; livro pessoal exige via feed/lista válida e referência forjada é negada.
- [ ] **Contagens de curtidas e descurtidas separadas** aparecem a quem tem acesso à resenha (RF-AVA-08).
- [ ] `resenha.curtida` é publicado após a escrita, com destinatário = autor da resenha, e consumido uma vez por `social`.
- [ ] Frase exige **página** e **≤500 caracteres**, com **máximo de 10** por usuário+livro (RN-11); listar é paginado; excluir é **owner-only** com confirmação; frases de livro pessoal são exclusivas do dono.
- [ ] Resenha aceita o **subconjunto Markdown** (RN-13) com **preview**; HTML/link/imagem/código/tabela **não** são interpretados; parser com HTML **desabilitado** e saída **sanitizada** na web (SEC-15); marcação não suportada exibida literal; mesmo subconjunto em web e mobile.
- [ ] Reações, frases e Markdown funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura` + mapeamento consumidor em `social`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: reação única/alternável, revalidação de acesso RN-08/RN-15, contagens, limite/página das frases, idempotência (RNF-TST-02)
- [ ] Testes assíncronos cobrem publicação, consumo em `social`, destinatário, duplicação semântica e DLQ de `resenha.curtida` (RNF-TST-03)
- [ ] Testes web/mobile cobrem reações, **render/sanitização do Markdown** (SEC-15), preview, frases e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com reações, frases, contagens e o schema de `resenha.curtida`; a adição de contagens a `v_resenha_publicacao_v1` documentada
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** fixar a mesma configuração de **subconjunto Markdown** para os dois clientes (RN-13.4) — resenha deve renderizar igual em web e mobile.

## Pendências

- **Telas (design P2):** seção `Frases e trechos`, reações com contagens separadas e resenha em Markdown renderizado entram na edição consolidada [`pagina-do-livro.md`](../../design/periodo-2/pagina-do-livro/pagina-do-livro.md) ([protótipo](../../design/periodo-2/pagina-do-livro/prototipos/pagina-do-livro.html)), prompt escrito em 28/09/2026, protótipo exportado em 29/09/2026. [`frases-do-livro.md`](../../design/periodo-2/F-AVA-2/frases-do-livro.md) (lista completa, excluir a própria, remoção direta pelo admin na web) e [`adicionar-frase.md`](../../design/periodo-2/F-AVA-2/adicionar-frase.md) (sheet no mobile, dialog na web, cota de 10 por livro de RN-11), prompts escritos em 29/09/2026, protótipos pendentes; contratos a confirmar: cota e contagem total em `GET /livros/{id}/frases`, total de páginas no formulário. Editor Markdown (barra com os 6 itens do RN-13 e alternância `Escrever | Visualizar`) na edição consolidada [`escrever-resenha.md`](../../design/periodo-2/escrever-resenha/escrever-resenha.md) ([protótipo](../../design/periodo-2/escrever-resenha/prototipos/escrever-resenha.html)), prompt escrito e protótipo exportado em 29/09/2026; a ratificar: negrito em Newsreader 600 (o design só lista 400 e 500), pré-visualização sem ocultar spoiler, faixa quando há marcação fora do subconjunto, `Enter` continua a lista. **Contratos a decidir:** resenhas do P1 em texto puro passam a ser lidas como Markdown; tachado exige extensão GFM igual nos dois parsers (RN-13.4); quebra de linha simples; contagem do limite por code point ou UTF-16, igual no cliente e no servidor; tratamento da marcação na prévia do feed. **Conflito a decidir:** nenhuma fonte diz se as frases seguem RN-08 como as resenhas; as contagens de reação só estão confirmadas no endpoint de resenhas. Decisão a ratificar: contagem zero exibida como `0 descurtidas`. Lotes 6 e 7, prompts escritos em 29/09/2026; protótipos exportados em 29/09/2026: contagens de reação nas edições [`meu-perfil.md`](../../design/periodo-2/meu-perfil/meu-perfil.md) ([protótipo](../../design/periodo-2/meu-perfil/prototipos/meu-perfil.html)) e [`perfil-de-outro-leitor.md`](../../design/periodo-2/perfil-de-outro-leitor/perfil-de-outro-leitor.md) ([protótipo](../../design/periodo-2/perfil-de-outro-leitor/prototipos/perfil-de-outro-leitor.html)) (reagir); frases do dono, reações ativas e contagens visíveis ao dono na edição [`livro-pessoal.md`](../../design/periodo-2/livro-pessoal/livro-pessoal.md) ([protótipo](../../design/periodo-2/livro-pessoal/prototipos/livro-pessoal.html)). Contratos a confirmar: contagens e reação de quem olha no endpoint de resenhas do perfil; `via` e `referenciaId` guardados pela página do livro pessoal para reagir.
- **Depende de** [F-AVA](../periodo-1/feature-F-AVA.md) (resenha e `v_resenha_publicacao_v1`), [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (RN-08), [F-NOT](../periodo-1/feature-F-NOT.md) (base da notificação), [F-ACV-CADASTRO](../periodo-1/feature-F-ACV-CADASTRO.md)/[F-FEED](../periodo-1/feature-F-FEED.md)/[F-LST](feature-F-LST.md) (livro pessoal e duas vias de RN-15), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md), [P0-MSG](../periodo-0/feature-P0-MSG.md).
- **Compartilha `leitura` com [F-EST](../periodo-1/feature-F-EST.md)/[F-PRG](../periodo-1/feature-F-PRG.md)/[F-AVA](../periodo-1/feature-F-AVA.md)** e demais features de leitura desta leva — sinalizar no grupo (plano §6).
- **Denúncia de resenha** e **remoção direta de frase pela moderação** (RN-11) são de **F-MOD** — frase não possui fluxo de denúncia.
- `resenha.curtida` **já é** fluxo fechado de §7.2 — sem divergência de baseline.
- **Decisão do grupo incorporada em 15/09/2026:** recurtir não renotifica. Preservar o marco da primeira curtida e a chave semântica mesmo após retirada da reação; excluir a resenha limpa suas reações. Preferência desabilitada não pode ser contornada por recurtida.
- Stack de `leitura` definida: **NestJS (TypeScript)** (arquitetura §2.1).

## Timeline

### Revisão 15/09/2026: recurtida sem nova notificação aprovada; DER prevê marco da primeira curtida e reação inativa sem contagem. Implementação não iniciada.

### Revisão 01/09/2026: semântica de nova curtida após remoção registrada para decisão do dono da feature.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-AVA-2 no [periodo-2/README.md](README.md), de RF-AVA-05..09 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.5 e das RN-07/RN-11/RN-13/RN-15. Reações fixadas em `leitura` (arch §3.2, ajuste 1) com `resenha.curtida` no fluxo fechado; Markdown como subconjunto renderizado no cliente; frases com página obrigatória.

### Revisão 28/08/2026: precisão de referência — a alocação das reações em `leitura` está no **§3.2, ajuste 1** da arquitetura (não há heading formal §3.2.1); citação corrigida no cabeçalho e na Especificação.

### Revisão 29/08/2026: autorização contextual de reação em livro pessoal passou a exigir uma das duas vias de RN-15; frases pessoais ficaram owner-only. A regra “resenha de outro” foi fechada e a feature passou a entregar também o consumidor de `resenha.curtida` em `social`.
