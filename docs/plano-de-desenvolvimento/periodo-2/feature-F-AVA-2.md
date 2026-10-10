# F-AVA-2 — Reações, Markdown e frases

**Período:** 2 · **Prioridade:** desejavel
**Dono:** Renato Douglas · **Serviços afetados:** `leitura` (backend) + `social` (mapeamento de notificação) + web + mobile

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
| Infra | implementado | Tabelas `reacao_resenha` e `frase` do baseline de 16/09, sem migration nova para elas. A VIEW `leitura.v_reacao_resenha_v1` (reações ativas) entrou pela migration `0005`, revisada pelo Renato e aplicada no banco de dev em 09/10 |
| Backend | implementado | `leitura`: reações (`PUT`/`DELETE /resenhas/{id}/reacao`, `resenha.curtida` só na primeira curtida) e frases (`GET`/`POST /livros/{id}/frases`, `DELETE /frases/{id}`). `social`: notificação `RESENHA_CURTIDA`. `acervo`: contagens e `minhaReacao` nas resenhas da página do livro e do livro pessoal |
| Web | implementado | Reações com contagens, frases (seção, lista completa e cadastro), resenha em Markdown e editor com barra e `Visualizar` |
| Mobile | implementado | Mesmo escopo da web, mais a notificação `RESENHA_CURTIDA` |


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

- [x] Curtir, retirar e recurtir não gera outra notificação para a mesma resenha/reator, mesmo se a primeira foi suprimida por preferência; contagens consideram somente reações ativas.

- [x] Reação é **uma por usuário+resenha**, alternável e idempotente (RF-AVA-05, RNF-ERR-04); acesso revalidado sob **RN-08** (oficial) e **RN-15** (pessoal); rate limiting ativo (SEC-18).
- [x] O servidor recusa reação à própria resenha; livro pessoal exige via feed/lista válida e referência forjada é negada.
- [x] **Contagens de curtidas e descurtidas separadas** aparecem a quem tem acesso à resenha (RF-AVA-08).
- [x] `resenha.curtida` é publicado após a escrita, com destinatário = autor da resenha, e consumido uma vez por `social`.
- [x] Frase exige **página** e **≤500 caracteres**, com **máximo de 10** por usuário+livro (RN-11); listar é paginado; excluir é **owner-only** com confirmação; frases de livro pessoal são exclusivas do dono.
- [x] Resenha aceita o **subconjunto Markdown** (RN-13) com **preview**; HTML/link/imagem/código/tabela **não** são interpretados; parser com HTML **desabilitado** e saída **sanitizada** na web (SEC-15); marcação não suportada exibida literal; mesmo subconjunto em web e mobile.
- [ ] Reações, frases e Markdown funcionam **em DES**. Débito: entra no merge de fechamento do Período 2.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura` + mapeamento consumidor em `social`, web, mobile) mergeado em `desenvolvimento`. Merge local feito em 09/10/2026; falta o push, que o Renato faz
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md)), a conferir depois do push, inclusive o `--check` dos tokens, que no Windows acusa só o CRLF
- [x] Testes unitários e de integração com banco real/container: reação única/alternável, revalidação de acesso RN-08/RN-15, contagens, limite/página das frases, idempotência (RNF-TST-02)
- [x] Testes assíncronos cobrem publicação, consumo em `social`, destinatário, duplicação semântica e DLQ de `resenha.curtida` (RNF-TST-03)
- [x] Testes web/mobile cobrem reações, **render/sanitização do Markdown** (SEC-15), preview, frases e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [x] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com reações, frases, contagens e o schema de `resenha.curtida`; a adição de contagens a `v_resenha_publicacao_v1` documentada
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)). Débito do merge de fechamento
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver

**Item próprio:** fixar a mesma configuração de **subconjunto Markdown** para os dois clientes (RN-13.4) — resenha deve renderizar igual em web e mobile. **Feito:** os dois clientes passam pelos 26 casos de [`docs/design-system/markdown-resenha-casos.json`](../../design-system/markdown-resenha-casos.json).

## Pendências

- **Telas (design P2):** implementadas a partir de [`pagina-do-livro.md`](../../design/periodo-2/pagina-do-livro/pagina-do-livro.md), [`frases-do-livro.md`](../../design/periodo-2/F-AVA-2/frases-do-livro.md), [`adicionar-frase.md`](../../design/periodo-2/F-AVA-2/adicionar-frase.md), [`escrever-resenha.md`](../../design/periodo-2/escrever-resenha/escrever-resenha.md), [`meu-perfil.md`](../../design/periodo-2/meu-perfil/meu-perfil.md), [`perfil-de-outro-leitor.md`](../../design/periodo-2/perfil-de-outro-leitor/perfil-de-outro-leitor.md), [`livro-pessoal.md`](../../design/periodo-2/livro-pessoal/livro-pessoal.md) e [`notificacoes.md`](../../design/periodo-2/notificacoes/notificacoes.md). Os contratos que estavam "a confirmar" ficaram assim: `GET /livros/{id}/frases` traz `minhasFrases` e `limitePorLivro`; o formulário de frase usa o total de páginas do livro, que é obrigatório no contrato `v_livro_referencia_v1`; o endpoint de resenhas do perfil traz as contagens e `minhaReacao`; a página do livro pessoal repassa `via` e `referenciaId` da rota ao reagir. O plano de execução está em [`renato-periodo-2/plano-F-AVA-2.md`](renato-periodo-2/plano-F-AVA-2.md).
- **Decisões do dono (07/10/2026), a comunicar ao grupo; não esperam resposta:**
  1. Resenhas antigas, gravadas em texto puro, passam a ser exibidas como Markdown. O texto gravado não muda e não há migration.
  2. `Enter` simples quebra a linha, igual nos dois parsers.
  3. Prévias sem marcação: o feed e o card do perfil, que cortam o texto em poucas linhas, mostram o texto sem marcação, com cada bloco numa linha. A resenha inteira aparece formatada na página do livro, em "Sua avaliação" e no livro pessoal.
  4. Frases seguem o RN-08: a frase de autor privado só aparece para quem o segue e para o próprio autor.
  5. Tachado só com `~~texto~~` nos dois clientes. O limite de 5.000 conta code points, incluindo a marcação.
  6. Ratificações de design, seguindo o protótipo: `0 descurtidas` aparece; negrito em Newsreader 600; a pré-visualização não esconde spoiler; faixa quando há marcação fora do subconjunto; `Enter` continua a lista, e `Enter` num item vazio sai dela.
  7. A reação de quem está vendo chega pela `acervo`, por uma VIEW nova do `leitura`, `v_reacao_resenha_v1 (resenha_id, usuario_id, tipo)`, só com as reações ativas.
  8. A notificação `RESENHA_CURTIDA` abre a página do livro: a oficial, ou a pessoal quando `livro.tipo = pessoal`. O `resenhaId` fica em `dados` da notificação, mas não vai para a resposta.
  9. A copy da curtida em atividade do `social` não muda.
  10. As contagens da própria resenha aparecem também na página do livro oficial, só para leitura, porque o RF-AVA-08 vale para todos que têm acesso.
  11. O menu `DotsThree` da resenha fica para a F-MOD; aqui as reações são botões.
- **Divergências registradas:**
  - **Notificação (decisão 8):** o design diz que ela abre "na resenha da leitora"; ela abre a página do livro, sem rolar até a resenha.
  - **Copy das curtidas (decisão 9):** `ATIVIDADE_CURTIDA` de uma atividade de resenha e `RESENHA_CURTIDA` têm o mesmo texto, "X curtiu sua resenha de Y.", contrariando [`notificacoes.md`](../../design/periodo-2/notificacoes/notificacoes.md) linhas 40 a 45. O rótulo acessível também é igual, porque o ícone é decorativo.
  - **Contagens na própria resenha do livro oficial (decisão 10):** o protótipo não as mostra; o próprio design marca isso como "a decidir" em `livro-pessoal.md`.
  - **Barra de formatação na web:** a web põe a barra no topo em qualquer largura (escrever-resenha.md §4.5); a posição junto do rodapé (§4.1) é a do app. Quando a coluna não comporta a alternância e a barra lado a lado (no celular e em janelas de até uns 1.100px com a barra lateral aberta), a barra quebra para a linha de baixo, sem rolagem horizontal.
  - **Prévia do feed na web:** o trecho passou a respeitar as quebras de linha (`whitespace-pre-line`), como o card do perfil e o app. Antes, as quebras de uma resenha antiga sumiam no feed web.
  - **Deploy:** se o `acervo` subir antes da migration `0005` do `leitura`, a resenha do dono no livro pessoal vem `null` e `GET /livros/{id}/resenhas` responde 503 até a VIEW existir. No merge de fechamento, migrar o `leitura` antes de publicar o `acervo`.
- **Preferência de notificação:** o `social` ainda não lê a preferência (fica para a F-NOT-OPC). O critério "mesmo se suprimida por preferência" é garantido pelo produtor (`primeira_curtida_em`) e pelo `UNIQUE (destinatario_id, tipo, chave_negocio)` da notificação.
- **Débitos:**
  - **Copy das duas curtidas, com o Kayke** (decisão 9).
  - **DES:** reações, frases e Markdown entram no DES no merge de fechamento do Período 2, com a migration `0005` aplicada no banco de Oregon antes do `acervo`.
- **Código de outras pessoas alterado** (registrado no `AGENTS.md` de cada serviço e cliente; avisar os donos no grupo):
  - Kayke: consumidor de notificações do `social` (`EventoDeNotificacao`, `TipoNotificacao`, `RedacaoDeNotificacao`, `docs/api/social.yaml`), notificações do app (tipo, ícone e rota) e a prévia do feed (`ItemAtividade.vue` e `item_atividade.dart`).
  - Vicenzo: `acervo` (repositórios de resenhas, DTO do livro pessoal, `contratos-externos.ts`, fixture de integração) e `acervo_service.dart`.
  - Henrique: cards de resenha do perfil (contagens e reações).
- **Observações para outros donos, achadas no teste manual de 09/10:**
  - **Vicenzo:** o `acervo` local caiu uma vez com `Connection terminated unexpectedly`, quando o Neon fechou uma conexão ociosa. O erro do `Client` do `pg` não é tratado e derruba o processo. Não é desta feature.
  - **Kayke:** no app, o perfil de outro leitor aberto pelo feed (`rotas_feed.dart`) não recebe `resenhas` nem `estante`, então mostra "ainda não escreveu resenhas" e "ainda não tem livros na estante" sem consultar nada. Pela aba Perfil, a mesma tela funciona.
- **Contas de teste no banco de dev:** `fava2_ana` (pública), `fava2_bruno` (pública, segue a Ana) e `fava2_clara` (privada), com e-mail `@teste.leai.invalid`; a senha está com o Renato. Ficaram com resenhas, reações, frases, o livro pessoal "Diário de leituras da Ana" e a lista "Cadernos da Ana". Podem ser excluídas pela F-CONTA-2 quando não forem mais úteis.
- **Depende de** [F-AVA](../periodo-1/feature-F-AVA.md) (resenha e `v_resenha_publicacao_v1`), [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (RN-08), [F-NOT](../periodo-1/feature-F-NOT.md) (base da notificação), [F-ACV-CADASTRO](../periodo-1/feature-F-ACV-CADASTRO.md)/[F-FEED](../periodo-1/feature-F-FEED.md)/[F-LST](feature-F-LST.md) (livro pessoal e duas vias de RN-15), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md), [P0-MSG](../periodo-0/feature-P0-MSG.md).
- **Compartilha `leitura` com [F-EST](../periodo-1/feature-F-EST.md)/[F-PRG](../periodo-1/feature-F-PRG.md)/[F-AVA](../periodo-1/feature-F-AVA.md)** e demais features de leitura desta leva — sinalizar no grupo (plano §6).
- **Denúncia de resenha** e **remoção direta de frase pela moderação** (RN-11) são de **F-MOD** — frase não possui fluxo de denúncia.
- `resenha.curtida` **já é** fluxo fechado de §7.2 — sem divergência de baseline.
- **Decisão do grupo incorporada em 15/09/2026:** recurtir não renotifica. Preservar o marco da primeira curtida e a chave semântica mesmo após retirada da reação; excluir a resenha limpa suas reações. Preferência desabilitada não pode ser contornada por recurtida.
- Stack de `leitura` definida: **NestJS (TypeScript)** (arquitetura §2.1).

## Timeline

### 09/10/2026: implementação, testes e teste manual. Três commits na `renato-features`, mergeados localmente na `desenvolvimento` (o push fica com o Renato):

- `ca9da42` **curtir e descurtir resenhas:** reações no `leitura` com a VIEW `v_reacao_resenha_v1`, `resenha.curtida` com schema canônico e cópias de runtime, notificação `RESENHA_CURTIDA` no `social`, contagens e `minhaReacao` no `acervo`, e os botões na web e no app (página do livro, livro pessoal pelo feed e pela lista, perfis e "Sua avaliação" só leitura).
- `93aa6a9` **frases e trechos dos livros:** frases no `leitura` (RN-11 com o 23514 do trigger virando 422 `LIMITE_DE_FRASES`, RN-08 por autor, livro pessoal só do dono), seção `Frases e trechos`, lista completa e cadastro na web e no app.
- `11020b1` **resenha em Markdown com pré-visualização:** `markdown-it` 14.3.2 e `DOMPurify` 3.4.16 na web, pacote `markdown` 7.3.1 no app, com os 26 casos compartilhados; editor com `Escrever | Visualizar` e a barra de seis botões; prévias sem marcação no feed e no perfil. O backend não mudou.

Testes, todos passando: `leitura` 219 unitários e 252 de integração; `acervo` 305 e 146; `social` 175 no `verify`; web 865; app 646; lint, build, `flutter analyze` e `flutter build apk --debug` limpos. Teste manual com os quatro serviços locais sobre o banco e o broker de dev, na web (Edge automatizado, 1440 e 390px, claro e escuro) e no app (emulador Pixel 8): curtir, alternar e retirar com as contagens na hora; recurtir sem segunda notificação (conferido na outbox e em `social.notificacao`); notificação em tempo real no app, abrindo o livro; leitora privada sem seguimento recebendo 404; livro pessoal pelo feed e pela lista, com referência de outra lista e forjada recusadas; frases com página fora do total, limite de 10, exclusão com confirmação e frase de autora privada escondida; os seis formatos pela barra, pelo teclado e pelo `Enter`; link, imagem, título, tabela e HTML literais, com a faixa; resenha antiga com a quebra de linha; feed e perfil sem marcação; limite contando a formatação; a mesma resenha lado a lado na web e no app.

### Revisão 15/09/2026: recurtida sem nova notificação aprovada; DER prevê marco da primeira curtida e reação inativa sem contagem. Implementação não iniciada.

### Revisão 01/09/2026: semântica de nova curtida após remoção registrada para decisão do dono da feature.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-AVA-2 no [periodo-2/README.md](README.md), de RF-AVA-05..09 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.5 e das RN-07/RN-11/RN-13/RN-15. Reações fixadas em `leitura` (arch §3.2, ajuste 1) com `resenha.curtida` no fluxo fechado; Markdown como subconjunto renderizado no cliente; frases com página obrigatória.

### Revisão 28/08/2026: precisão de referência — a alocação das reações em `leitura` está no **§3.2, ajuste 1** da arquitetura (não há heading formal §3.2.1); citação corrigida no cabeçalho e na Especificação.

### Revisão 29/08/2026: autorização contextual de reação em livro pessoal passou a exigir uma das duas vias de RN-15; frases pessoais ficaram owner-only. A regra “resenha de outro” foi fechada e a feature passou a entregar também o consumidor de `resenha.curtida` em `social`.

### Dono 29/09/2026: feature atribuída a **Renato Douglas** na [divisão do Período 2](README.md#divisão-do-período-2-entre-5-pessoas).
