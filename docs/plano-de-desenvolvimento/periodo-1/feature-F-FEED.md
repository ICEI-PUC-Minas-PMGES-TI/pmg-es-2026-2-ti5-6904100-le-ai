# F-FEED — Feed e interações sociais

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** Kayke · **Serviços afetados:** `social` (backend) + web + mobile

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
| Infra | parcial | Pendente: validar declaração de `leai.social.feed`, retry 1/5/15 e `leai.social.feed.dlq` contra um RabbitMQ real. O consumidor só recebe eventos quando `leitura` (F-PRG/F-AVA) publicar `leitura.*`/`resenha.*` |
| Dados | parcial | Pendente: aplicar no Neon a migration `V20260925140000__adiciona_comentario_respondido_id.sql` |
| Backend | concluído | — |
| Web | concluído | — |
| Mobile | concluído | — |

## Especificação

### Backend / API — `social`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Conteúdo do usuário tratado como texto (escape — SEC-14). Escritas aceitam `Idempotency-Key` conforme o [README do período](README.md#regras-de-implementação-compartilhadas).

**Pré-requisito de execução:** o DER já implantado não substitui [P0-MSG](../periodo-0/feature-P0-MSG.md). O consumidor só pode entrar em DES depois de P0-MSG entregar conexão/dispatcher reutilizáveis, envelope/validador, `mensagem_processada`, publisher confirms e a política operacional de retry/DLQ; até lá não há ingestão de eventos nem publicação da outbox.

- **Publicação de atividade (RF-SOC-10)** — pela fila durável `leai.social.feed`, ligada ao exchange `leai.events.leitura`, `social` consome exatamente `leitura.iniciada`, `leitura.retomada`, `leitura.finalizada`, `leitura.abandonada`, `resenha.publicada` e `resenha.excluida`, todos v1 conforme [`docs/mensageria`](../../mensageria/catalogo.md). Os cinco primeiros trazem em `data` os ids e snapshots canônicos `usuario`/`livro`; o tipo do fato vem de `type`, e a chave estável vem de `businessKey` no envelope, não do `data`. Ao consumir publicação, grava uma `atividade` com o snapshot (arquitetura §3.2.4). `resenha.excluida` remove fisicamente a atividade da resenha e, por cascade, suas curtidas e comentários; uma nova publicação cria outra atividade.
- **Consumo idempotente** — valida envelope v1 e o schema selecionado por `(type, version)` antes do domínio. Efeito e recibo `(consumidor, event_id)` são gravados na mesma transação; recibo repetido recebe ACK sem repetir o efeito. A unicidade física por `event_id` e por fato complementa o recibo: `businessKey` segue exatamente o catálogo, inclusive os ciclos legítimos de retomada/abandono identificados por `eventId`. ACK só ocorre após commit.
- **`GET /feed?page={page}&size={size}`** (RF-SOC-09, RN-09) — feed **paginado** (página iniciada em zero, `size` de 1 a 50, padrão 20) com atividades dos leitores que o usuário segue, em ordem cronológica decrescente. Usa `v_seguimento_aceito_v1`; ao deixar de seguir, as atividades somem. Combina `v_livro_referencia_v1` para não exibir atividade cujo alvo esteja ausente/inativo (RN-09). O contrato de seguimento já omite contas suspensas/em exclusão; a consulta também não expõe conteúdo sem seguimento aceito. Respeita RN-08/RN-15 sem ler tabelas cruas.
- **`GET /atividades/{atividadeId}`** — retorna detalhe somente se a atividade ainda integrar o feed do solicitante sob RN-08/RN-09; recurso existente mas invisível responde como não encontrado, sem permitir enumeração.
- Atividade de livro pessoal gera link para `GET /livros/pessoal/{id}?via=feed&referenciaId=<atividadeId>`. `v_atividade_livro_pessoal_v1` expõe apenas atividades ativas, seu autor/dono e o livro referenciado. `acervo` exige também que o solicitante siga o autor por `v_seguimento_aceito_v1`; perfil público não transforma atividade fora do feed do solicitante em via válida. Conhecer os ids não concede autorização.
- **`POST /atividades/{atividadeId}/curtir`** / **`DELETE /atividades/{atividadeId}/curtir`** (RF-SOC-11) — curtir/descurtir atividade que ainda integra o feed do solicitante. O servidor revalida visibilidade por RN-08/RN-09 antes da escrita; conhecer o id não autoriza interação. Rate limiting (SEC-18).
- **`POST /atividades/{atividadeId}/comentarios`** (RF-SOC-12, RN-10) — sem `comentarioRespondidoId`, cria comentário-raiz; com o campo, responde ao comentário indicado. Comentar exige atividade ainda visível ao solicitante, com revalidação server-side de RN-08/RN-09, e **aninhamento de um nível** (comentário → resposta). Resposta a uma resposta é armazenada como irmã sob o mesmo comentário-raiz; o servidor deriva e valida raiz e usuário respondido pelo comentário-alvo, sem confiar apenas no texto pré-preenchido. No Período 1, publica `comentario.respondido` para esse destinatário conhecido. Resolver um `@username` digitado livremente e publicar `usuario.mencionado` pertence a RF-SOC-15/F-SOCIAL-2. Rate limiting em comentar/responder (SEC-18).
- **`GET /atividades/{atividadeId}/comentarios?page={page}&size={size}`** — lista apenas comentários-raiz, do mais antigo para o mais recente, com página iniciada em zero e `size` máximo 50.
- **`GET /comentarios/{comentarioRaizId}/respostas?cursor={cursor}&limit={limit}`** — pagina por cursor opaco as respostas irmãs sob a raiz, com `limit` máximo 50 e um único nível. As duas listagens só retornam comentários de atividade visível ao solicitante sob RN-08/RN-09 (RNF-DES-02).

**Eventos produzidos** (§5.2, consumidos por [F-NOT](feature-F-NOT.md) na fila `leai.social.notificacoes`): `atividade.curtida` v1 (`destinatarioId`, `atividadeId`, `autorAcao`; `businessKey=atividade:<atividadeId>:curtida:<autorAcaoId>`), `atividade.comentada` v1 (`destinatarioId`, `atividadeId`, `comentarioId`, `autorAcao`; `businessKey=comentario:<comentarioId>`) e `comentario.respondido` v1 (os mesmos campos mais `comentarioAlvoId`; mesma forma de `businessKey`). A alteração de domínio e a linha de `outbox_social` são gravadas **na mesma transação**; o dispatcher de P0-MSG monta o envelope e publica no exchange `leai.events.social` com routing key igual a `type`. F-FEED garante a publicação; F-NOT garante o efeito de notificação. `usuario.mencionado` entra com a resolução de menções de F-SOCIAL-2; uma resposta não publica os dois eventos para o mesmo destinatário.

**Retry/DLQ:** `leai.social.feed.dlq` liga-se ao exchange direto `leai.dead-letter` pela routing key `leai.social.feed`. Envelope, schema ou versão inválida e erro permanente vão imediatamente à DLQ; erro técnico transitório tenta novamente após 1, 5 e 15 segundos e, após a terceira tentativa, usa `nack(requeue=false)`. Não há redrive automático; o redrive é manual após corrigir a causa.

**Menção no Período 1 (RF-SOC-14 vs RF-SOC-15):** ao **responder**, o cliente **pré-preenche o texto** `@username` (RF-SOC-14, Essencial), e `comentario.respondido` notifica o usuário derivado do comentário-alvo. A resolução de menção digitada livremente, seu link e o evento `usuario.mencionado` (RF-SOC-15) são desejáveis e entram no Período 2 ([F-SOCIAL-2](../periodo-2/README.md)). Isso evita duas notificações para o mesmo ato de responder.

**Modelo de dados** (schema `social`): `atividade` (autor, tipo, snapshot, referência ao livro e evento de origem), `curtida` (atividade, usuário — única por par), `comentario` (atividade, autor, texto, comentário-raiz opcional, usuário respondido, timestamps). A FK entre resposta e raiz pode usar cascade para preparar RN-10.5, mas esta feature não expõe exclusão de comentário; o endpoint entra em F-SOCIAL-2. Expõe `v_atividade_livro_pessoal_v1`, com nome distinto das tabelas.

### Frontend Web (`code/front`)

- **Feed** paginado (scroll incremental) com card de atividade (componente de [P0-DS](../periodo-0/feature-P0-DS.md)); **curtir**; **comentar e responder** com a menção `@username` pré-preenchida ao responder uma resposta; link de livro pessoal carrega a referência da atividade. Comentário renderizado com escape (SEC-14). Cliente HTTP trata cold start, timeout e backoff somente em operações idempotentes.

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); feed é uma das áreas principais da navegação. Alvo de demonstração Android.

## Critérios de aceite

- [x] O feed mostra, em **ordem cronológica decrescente** e **paginado**, as atividades de quem o usuário segue via `v_seguimento_aceito_v1`; ao deixar de seguir, somem; atividade de **livro excluído** não aparece via `v_livro_referencia_v1` (RN-09).
- [ ] Início/retomada/conclusão/abandono e criação de resenha viram **atividade com snapshot**; edição não gera outra; exclusão da resenha remove a atividade antiga; consumidor é idempotente e usa DLQ. *(26/09: snapshot, exclusão com cascade e idempotência testados contra Postgres; DLQ só verificável com broker real.)*
- [ ] `leai.social.feed` possui somente os seis bindings canônicos; envelope/data inválido vai direto a `leai.social.feed.dlq`, e falha transitória percorre 1/5/15 segundos antes da DLQ. *(Topologia declarada no código; falta validar contra RabbitMQ.)*
- [x] Curtir/descurtir funciona (uma curtida por usuário+atividade) somente enquanto a atividade estiver visível ao solicitante; rate limiting ativo (SEC-18).
- [x] Comentar e responder exigem atividade visível e respeitam **um nível**; resposta a resposta é irmã com destinatário derivado do comentário e `@username` pré-preenchido (RN-08, RN-09, RN-10, RF-SOC-14). Exclusão fica em F-SOCIAL-2.
- [x] Comentários e respostas possuem paginação/limite server-side e só são listados quando a atividade é visível (RNF-DES-02, RN-08, RN-09).
- [x] Resposta publica somente `comentario.respondido` para o destinatário validado, com rate limiting; a criação da notificação é critério de F-NOT. `usuario.mencionado` fica em F-SOCIAL-2.
- [x] **RN-08 e RN-15** são respeitados: conteúdo de perfil privado e livro pessoal só aparecem a quem tem acesso, revalidado no servidor (SEC-03/06). *(Em `social`: visibilidade via `v_seguimento_aceito_v1` e link `via=feed`; a autorização final da página de livro pessoal é do `acervo`.)*
- [ ] `atividade.curtida`, `atividade.comentada` e `comentario.respondido` são publicados após a escrita, sem duplicar resposta como menção. *(Linhas da outbox gravadas e conferidas contra os schemas; a publicação pelo dispatcher depende do broker.)*
- [ ] Escrita de interação e `outbox_social` são atômicas; no consumo, efeito e recibo são atômicos, ACK ocorre após commit e reentrega do mesmo `eventId` não repete efeito. *(Atomicidade da outbox e reentrega testadas; ACK pós-commit depende do broker.)*
- [ ] `v_atividade_livro_pessoal_v1` comprova a via feed; referência forjada ou atividade inativa não autoriza página de livro pessoal.
- [x] Repetir escrita com a mesma `Idempotency-Key` não duplica curtida, comentário ou resposta (RNF-ERR-04).
- [x] Feed e interações funcionam **em DES**.

## Definition of Done

(plano §10)

- [x] Código (backend `social`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [x] Testes unitários e de integração com banco real/container: feed sob RN-08/RN-09/RN-15, alvo excluído, via de livro pessoal, curtida, paginação de comentários/respostas, destinatário e idempotência (RNF-TST-02)
- [ ] Testes assíncronos de integração cobrem os seis bindings de entrada, envelope e schemas v1 canônicos, snapshots, exclusão/recriação de resenha, atomicidade efeito+recibo, reentrega do mesmo `eventId`, duplicação semântica, ACK pós-commit, retry 1/5/15 e `leai.social.feed.dlq`; publicação testa outbox atômica e os três eventos de notificação (RNF-TST-03)
- [x] Testes web/mobile cobrem paginação, interações, link de livro pessoal e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [x] **Spec OpenAPI de `social` atualizado em `docs/api/social.yaml`** com feed/curtidas/comentários
- [x] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver

**Item próprio:** fechar com [F-EST](feature-F-EST.md)/[F-AVA](feature-F-AVA.md) os schemas versionados de snapshot e publicar `v_atividade_livro_pessoal_v1` para a autorização em `acervo`.

## Pendências

- **Depende de** [F-PERFIL](feature-F-PERFIL.md) (`v_seguimento_aceito_v1`), [F-EST](feature-F-EST.md)/[F-AVA](feature-F-AVA.md) (eventos que viram atividade), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md) (broker, envelope, DLQ, idempotência).
- **Compartilha `social` com [F-NOT](feature-F-NOT.md)** — quem chegar primeiro fixa a estrutura; sinalizar no grupo (plano §6).
- **Migration incremental:** `V20260925140000__adiciona_comentario_respondido_id.sql` adiciona `comentario_respondido_id` (FK composta com `atividade_id`, `ON DELETE SET NULL`); falta aplicar no Neon.
- **Ficam fora (Período 2):** editar/excluir o próprio comentário (RF-SOC-13) e menção arbitrária resolvida como link (RF-SOC-15) — **F-SOCIAL-2**. Denúncia é F-MOD. **Notificações** em tempo real pertencem a RF-NOT-06/F-NOT-2; feed em tempo real não possui RF.
- Stack de `social` definida: **Spring (Java)** (arquitetura §2.1).
- **Nota da resenha (26/09):** `ResenhaSnapshot` ganhou `nota` (anulável), lida de `leitura.v_nota_publicacao_v1`, e o item de resenha mostra as estrelas como pede o §4.
- **Divergências protótipo × implementação (mobile, 27/09):** as mesmas decisões de produto da web valem no app — curtir pulsa o coração e solta 6 partículas em musgo, e "Ler resenha" não navega. Falha ao curtir aparece num `SnackBar`, em vez do banner da web. Respostas além da primeira página carregam por "Ver mais respostas", pelo cursor da API.
- **Divergências protótipo × implementação (web, 26/09):** "Ler resenha" não navega, porque a página de resenha é de F-AVA; o carregamento mostra 3 itens de skeleton em vez dos 4 da web (§5.4); o modal carrega só a primeira página de comentários-raiz, sem "carregar mais". Por decisão do produto (26/09), a coluna de 760px da web fica centralizada na área de conteúdo, e não alinhada à esquerda como pede o §5. Também por decisão do produto (26/09), curtir mostra o coração pulsando e 8 partículas em musgo, contrariando o §4.2 e o §10 (sem animação no curtir); o efeito roda mesmo com `prefers-reduced-motion`, também por decisão do produto.
- **Decisão de produto (29/09): curtida otimista, web e app.** Curtir e descurtir mudam o item na hora (`curtidaPeloSolicitante` e `totalCurtidas` ± 1, mínimo 0) e o botão não trava. O último toque vale: por atividade há no máximo uma requisição em voo, cada uma com a própria `Idempotency-Key`, e, se ao terminar o item exibido difere do confirmado, a requisição que falta segue até convergir. Ao convergir, o total devolvido pelo servidor corrige o contador. Se a requisição falha (inclusive `429`), o item volta ao último estado confirmado e o erro aparece como antes (banner na web, `SnackBar` no app). Recarregar a lista descarta as intenções pendentes. Implementação em `src/feed/useCurtidas.ts` (web) e `lib/features/feed/curtidas_otimistas.dart` (app).
- **Falta para fechar:** validar fila, retry e DLQ contra RabbitMQ real; CI verde; aplicar a migration incremental no Neon.

## Timeline

### 29/09/2026: curtida otimista na web e no app, por decisão do produto: o item muda no toque, o botão não trava, o último toque vale e a falha volta ao último estado confirmado. Ver Pendências.

### 29/09/2026: ajustes do teste no celular. O botão de alternar respostas do app ("Ver N respostas", "Ocultar respostas", "Ver mais respostas") ganhou respiro à direita, para o realce do toque não terminar colado na última letra; "Ler resenha" e "Responder" ganharam respiro dos dois lados, com o texto ainda alinhado ao trecho e ao comentário. A folha de comentários passou a abrir pelo navegador raiz: o scrim cobre a barra inferior, como pede o §4, e a folha enxerga o teclado (dentro da aba, o `Scaffold` do shell consumia a altura dele, e o campo e a faixa "Respondendo a" transbordavam). Com o teclado aberto, a folha vai até o topo, porque nos 88% eles não cabiam acima dele.

### 27/09/2026: app mobile de F-FEED implementado em `code/mobile/lib/features/feed/` — feed paginado, os cinco tipos, curtir, comentários em bottom sheet com resposta em um nível e menção pré-preenchida, e os estados de carregamento, vazio, erro, cold start e 429, com testes de serviço, widget e roteador; mergeado em `desenvolvimento`.

### 26/09/2026: backend `social` e web de F-FEED implementados, com validação E2E via HTTP e checagem no navegador (web e mobile). Pendências de broker registradas acima.

### Decisão de produto 25/09/2026: o autor pode curtir, comentar e ver o detalhe/comentários da própria atividade, sem precisar se seguir. `GET /feed` continua listando só atividades de quem o leitor segue (RN-09); atividade inativa ou de livro excluído segue invisível também para o autor.

### Migration incremental 25/09/2026: `V20260925140000__adiciona_comentario_respondido_id.sql` fecha a pendência de `comentarioRespondidoId` registrada em 17/09 — a coluna nova guarda o id do comentário-alvo (raiz ou resposta), com revisão humana antes do commit e sem alterar a migration já aplicada. `Comentario`, `ServicoDeInteracao` e `ComentarioResposta` foram ajustados; suite de `social` (105 testes) verde contra Postgres real depois da mudança.

### 25/09/2026: início da implementação em `social`. A infraestrutura de mensageria de P0-MSG já está entregue (evento `ping.teste`, 19/09); o consumidor de atividade depende de `leitura` (F-PRG/F-AVA) publicar os eventos de origem.

### Alinhamento 17/09/2026: rotas foram igualadas ao `docs/api/social.yaml`; eventos, exchanges, fila `leai.social.feed`, recibo/efeito transacional e retry/DLQ foram igualados ao catálogo e ao P0-MSG. O status passou a reconhecer o DER implantado no Neon sem confundi-lo com implementação do serviço, e o refinamento de `comentarioRespondidoId` foi registrado como pendência incremental.

### Revisão 01/09/2026: eventos de atividade formalizados e consumo de `resenha.excluida` acrescentado para remover a atividade antiga fisicamente.

### Revisão 28/08/2026: eventos de atividade receberam nomes e payload mínimo; VIEWs de identidade/acervo passaram a governar privacidade e alvo excluído. A via feed para livro pessoal ganhou contrato verificável; menção arbitrária e exclusão de comentários voltaram ao Período 2; respostas ganharam rota paginada própria e deixaram de gerar notificação duplicada de menção; critérios produtor/consumidor e testes deixaram de ser circulares.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-FEED no [periodo-1/README.md](README.md), de RF-SOC-09/10/11/12/14 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.9, das RN-09/RN-10/RN-08/RN-15 e da arquitetura §3.2/§4.2/§5.2. Snapshot na atividade e um nível de aninhamento fixados; menção-link e edição de comentário adiadas ao Período 2.
