# F-FEED — Feed e interações sociais

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** a definir · **Serviços afetados:** `social` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.9 (RF-SOC-09, 10, 11, 12, 14), RN-09, RN-10, RN-08, RN-15. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §3.2, §4.2, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar o **"ver amigos lendo"** do ciclo de valor: o **feed cronológico** e as **interações sociais** sobre as atividades. Fecha os requisitos **Essenciais**:

- **RF-SOC-09** visualizar um **feed cronológico** com as atividades dos leitores que segue;
- **RF-SOC-10** o sistema **publica como atividade**: início, retomada, conclusão e abandono de leitura, e publicação de resenha;
- **RF-SOC-11** **curtir** atividades do feed;
- **RF-SOC-12** **comentar** atividades e **responder** a comentários (RN-10);
- **RF-SOC-14** ao responder a uma resposta, **pré-preencher a menção `@username`** ao autor respondido, no mesmo nível de aninhamento.

O feed é o caminho **mais lido** do app: guarda **snapshot** no evento (nome do usuário, título e capa no momento), em vez de hidratar por join a cada scroll (arquitetura §3.2.4). Consome os eventos de [F-EST](feature-F-EST.md)/[F-AVA](feature-F-AVA.md) e `v_seguimento_aceito_v1` de [F-PERFIL](feature-F-PERFIL.md).

RNF atendidos: **RNF-SEC-03** (acesso a conteúdo de perfil privado validado no servidor), **RNF-SEC-06** (livro pessoal só pelas duas vias, RN-15), **RNF-SEC-14** (comentário tratado como texto, escape na web), **RNF-SEC-18** (rate limiting em curtir/comentar/mencionar), **RNF-DES-02** (feed paginado), **RNF-ERR-06/07** (consumidor idempotente + DLQ), **RNF-ARQ-06** (fluxos assíncronos via broker).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | tabelas sociais; VIEW `v_atividade_livro_pessoal_v1`; consumidores dos eventos de atividade |
| Backend | não iniciado | `social`: feed + publicação de atividade (snapshot) + curtir/comentar |
| Web | não iniciado | feed + curtir + comentar/responder com menção pré-preenchida |
| Mobile | não iniciado | mesmas telas |

## Especificação

### Backend / API — `social`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Conteúdo do usuário tratado como texto (escape — SEC-14). Escritas aceitam `Idempotency-Key` conforme o [README do período](README.md#regras-de-implementação-compartilhadas).

- **Publicação de atividade (RF-SOC-10)** — `social` consome `leitura.iniciada`, `leitura.retomada`, `leitura.finalizada`, `leitura.abandonada` e `resenha.publicada`. Os schemas versionados exigem autor, livro, tipo do fato e snapshot mínimo de nome/username/avatar, título/autor/capa. Ao consumir, grava uma `atividade` com esse snapshot (arquitetura §3.2.4). `resenha.excluida` remove fisicamente a atividade da resenha e, por cascade, suas curtidas e comentários; uma nova publicação cria outra atividade. Consumidores são idempotentes por `eventId` e chave do fato, com validação de schema e DLQ.
- **`GET /feed?page=`** (RF-SOC-09, RN-09) — feed **paginado** (RNF-DES-02) com atividades dos leitores que o usuário segue, em ordem cronológica decrescente. Usa `v_seguimento_aceito_v1`; ao deixar de seguir, as atividades somem. Combina `v_livro_referencia_v1` para não exibir atividade cujo alvo esteja ausente/inativo (RN-09). Respeita RN-08/RN-15 sem ler tabelas cruas.
- Atividade de livro pessoal gera link para `GET /livros/pessoal/{id}?via=feed&referenciaId=<atividadeId>`. `v_atividade_livro_pessoal_v1` expõe apenas atividades ativas, seu autor/dono e o livro referenciado. `acervo` exige também que o solicitante siga o autor por `v_seguimento_aceito_v1`; perfil público não transforma atividade fora do feed do solicitante em via válida. Conhecer os ids não concede autorização.
- **`POST /atividades/{id}/curtir`** / **`DELETE`** (RF-SOC-11) — curtir/descurtir atividade que ainda integra o feed do solicitante. O servidor revalida visibilidade por RN-08/RN-09 antes da escrita; conhecer o id não autoriza interação. Rate limiting (SEC-18).
- **`POST /atividades/{id}/comentarios`** (RF-SOC-12, RN-10) — comentar somente em atividade ainda visível ao solicitante, com revalidação server-side de RN-08/RN-09, e **aninhamento de um nível** (comentário → resposta). Resposta a uma resposta é armazenada como irmã sob o mesmo comentário-raiz; o servidor deriva e valida o usuário respondido pelo comentário-alvo, sem confiar apenas no texto pré-preenchido. No Período 1, publica `comentario.respondido` para esse destinatário conhecido. Resolver um `@username` digitado livremente e publicar `usuario.mencionado` pertence a RF-SOC-15/F-SOCIAL-2. Rate limiting em comentar/responder (SEC-18).
- **`GET /atividades/{id}/comentarios?page=`** — lista apenas comentários-raiz paginados, com limite server-side.
- **`GET /comentarios/{raizId}/respostas?cursor=`** — pagina as respostas diretas da raiz, preservando um único nível. As duas listagens só retornam comentários de atividade visível ao solicitante sob RN-08/RN-09 (RNF-DES-02).

**Eventos produzidos** (§5.2, consumidos por [F-NOT](feature-F-NOT.md)): `atividade.curtida`, `atividade.comentada` e `comentario.respondido`. Publicados **após** a escrita. Todo payload versionado contém `destinatarioId`, autor da ação, atividade/comentário, chave de negócio e envelope de P0-MSG. F-FEED garante a publicação; F-NOT garante a notificação. `usuario.mencionado` entra com a resolução de menções de F-SOCIAL-2; uma resposta não publica os dois eventos para o mesmo destinatário.

**Menção no Período 1 (RF-SOC-14 vs RF-SOC-15):** ao **responder**, o cliente **pré-preenche o texto** `@username` (RF-SOC-14, Essencial), e `comentario.respondido` notifica o usuário derivado do comentário-alvo. A resolução de menção digitada livremente, seu link e o evento `usuario.mencionado` (RF-SOC-15) são desejáveis e entram no Período 2 ([F-SOCIAL-2](../periodo-2/README.md)). Isso evita duas notificações para o mesmo ato de responder.

**Modelo de dados** (schema `social`): `atividade` (autor, tipo, snapshot, referência ao livro e evento de origem), `curtida` (atividade, usuário — única por par), `comentario` (atividade, autor, texto, comentário-raiz opcional, usuário respondido, timestamps). A FK entre resposta e raiz pode usar cascade para preparar RN-10.5, mas esta feature não expõe exclusão de comentário; o endpoint entra em F-SOCIAL-2. Expõe `v_atividade_livro_pessoal_v1`, com nome distinto das tabelas.

### Frontend Web (`code/front`)

- **Feed** paginado (scroll incremental) com card de atividade (componente de [P0-DS](../periodo-0/feature-P0-DS.md)); **curtir**; **comentar e responder** com a menção `@username` pré-preenchida ao responder uma resposta; link de livro pessoal carrega a referência da atividade. Comentário renderizado com escape (SEC-14). Cliente HTTP trata cold start, timeout e backoff somente em operações idempotentes.

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); feed é uma das áreas principais da navegação. Alvo de demonstração Android.

## Critérios de aceite

- [ ] O feed mostra, em **ordem cronológica decrescente** e **paginado**, as atividades de quem o usuário segue via `v_seguimento_aceito_v1`; ao deixar de seguir, somem; atividade de **livro excluído** não aparece via `v_livro_referencia_v1` (RN-09).
- [ ] Início/retomada/conclusão/abandono e criação de resenha viram **atividade com snapshot**; edição não gera outra; exclusão da resenha remove a atividade antiga; consumidor é idempotente e usa DLQ.
- [ ] Curtir/descurtir funciona (uma curtida por usuário+atividade) somente enquanto a atividade estiver visível ao solicitante; rate limiting ativo (SEC-18).
- [ ] Comentar e responder exigem atividade visível e respeitam **um nível**; resposta a resposta é irmã com destinatário derivado do comentário e `@username` pré-preenchido (RN-08, RN-09, RN-10, RF-SOC-14). Exclusão fica em F-SOCIAL-2.
- [ ] Comentários e respostas possuem paginação/limite server-side e só são listados quando a atividade é visível (RNF-DES-02, RN-08, RN-09).
- [ ] Resposta publica somente `comentario.respondido` para o destinatário validado, com rate limiting; a criação da notificação é critério de F-NOT. `usuario.mencionado` fica em F-SOCIAL-2.
- [ ] **RN-08 e RN-15** são respeitados: conteúdo de perfil privado e livro pessoal só aparecem a quem tem acesso, revalidado no servidor (SEC-03/06).
- [ ] `atividade.curtida`, `atividade.comentada` e `comentario.respondido` são publicados após a escrita, sem duplicar resposta como menção.
- [ ] `v_atividade_livro_pessoal_v1` comprova a via feed; referência forjada ou atividade inativa não autoriza página de livro pessoal.
- [ ] Repetir escrita com a mesma `Idempotency-Key` não duplica curtida, comentário ou resposta (RNF-ERR-04).
- [ ] Feed e interações funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `social`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: feed sob RN-08/RN-09/RN-15, alvo excluído, via de livro pessoal, curtida, paginação de comentários/respostas, destinatário e idempotência (RNF-TST-02)
- [ ] Testes assíncronos cobrem schemas, snapshots, exclusão/recriação de resenha, consumo duplicado/DLQ e publicação dos eventos de notificação (RNF-TST-03)
- [ ] Testes web/mobile cobrem paginação, interações, link de livro pessoal e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `social` atualizado em `docs/api/social.yaml`** com feed/curtidas/comentários
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** fechar com [F-EST](feature-F-EST.md)/[F-AVA](feature-F-AVA.md) os schemas versionados de snapshot e publicar `v_atividade_livro_pessoal_v1` para a autorização em `acervo`.

## Pendências

- **Depende de** [F-PERFIL](feature-F-PERFIL.md) (`v_seguimento_aceito_v1`), [F-EST](feature-F-EST.md)/[F-AVA](feature-F-AVA.md) (eventos que viram atividade), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md) (broker, envelope, DLQ, idempotência).
- **Compartilha `social` com [F-NOT](feature-F-NOT.md)** — quem chegar primeiro fixa a estrutura; sinalizar no grupo (plano §6).
- **Ficam fora (Período 2):** editar/excluir o próprio comentário (RF-SOC-13) e menção arbitrária resolvida como link (RF-SOC-15) — **F-SOCIAL-2**. Denúncia é F-MOD. **Notificações** em tempo real pertencem a RF-NOT-06/F-NOT-2; feed em tempo real não possui RF.
- Stack de `social` definida: **Spring (Java)** (arquitetura §2.1).

## Timeline

### Revisão 01/09/2026: eventos de atividade formalizados e consumo de `resenha.excluida` acrescentado para remover a atividade antiga fisicamente.

### Revisão 28/08/2026: eventos de atividade receberam nomes e payload mínimo; VIEWs de identidade/acervo passaram a governar privacidade e alvo excluído. A via feed para livro pessoal ganhou contrato verificável; menção arbitrária e exclusão de comentários voltaram ao Período 2; respostas ganharam rota paginada própria e deixaram de gerar notificação duplicada de menção; critérios produtor/consumidor e testes deixaram de ser circulares.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-FEED no [periodo-1/README.md](README.md), de RF-SOC-09/10/11/12/14 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.9, das RN-09/RN-10/RN-08/RN-15 e da arquitetura §3.2/§4.2/§5.2. Snapshot na atividade e um nível de aninhamento fixados; menção-link e edição de comentário adiadas ao Período 2.
