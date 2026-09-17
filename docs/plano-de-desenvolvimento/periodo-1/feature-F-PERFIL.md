# F-PERFIL — Perfil, privacidade e seguidores

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** a definir · **Serviços afetados:** `identidade` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.9 (RF-SOC-01..08) e RN-08. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §4.2, §5.2, §2.5. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar o **núcleo social de identidade**: o perfil do leitor, sua **privacidade** e o **grafo de seguidores** — a peça que faz "ver amigos lendo" ser possível. Fecha os requisitos **Essenciais** de perfil e social do serviço `identidade`:

- **RF-SOC-01** editar o próprio perfil (nome de exibição, biografia, **avatar**, privacidade);
- **RF-SOC-02** visualizar o perfil de outro leitor; no Período 1, identidade, contadores, estante e resenhas são compostos com as features disponíveis. A exigência de listas conflita com F-LST no Período 2 e permanece pendência de baseline, sem ser declarada integralmente fechada aqui;
- **RF-SOC-03** buscar outro leitor **apenas por username exato**;
- **RF-SOC-04** definir o perfil como **público ou privado**;
- **RF-SOC-05** **seguir** um perfil público, com efeito imediato;
- **RF-SOC-06** **solicitar seguir** um perfil privado; o destinatário **aceita ou recusa**;
- **RF-SOC-07** deixar de seguir e remover um seguidor;
- **RF-SOC-08** visualizar suas próprias listas de **seguidores** e **seguidos**.

O controle de acesso de perfil privado (**RN-08**) é um dos três itens de **prioridade obrigatória de teste** (RNF-TST-01) e é validado **no servidor** em todo endpoint (RNF-SEC-03), incluindo listagem e busca.

RNF atendidos: **RNF-SEC-01/02/03** (controle de acesso e propriedade no servidor), **RNF-SEC-05** (IDs não sequenciais), **RNF-SEC-18** (rate limiting em seguir), **RNF-SEC-19/44** (descoberta só por username exato, sem enumeração/diretório), **RNF-SEC-20** (upload de avatar valida tipo/tamanho/dimensões), **RNF-DES-02** (listagens paginadas), **RNF-USA-04** (confirmação em ação destrutiva). Serviço de imagens: **Cloudinary** (P-09).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | em andamento | schema/objetos no Neon implantados; preset/prova Cloudinary P-09 e runtime RabbitMQ de P0-MSG ainda pendentes |
| Dados | concluído | campos de perfil, `seguidor`, `solicitacao_seguir`, `idempotencia_identidade`, `outbox_identidade` e VIEWs `v_perfil_referencia_v1`/`v_seguimento_aceito_v1` versionados e aplicados no Neon em 16/09; estrutura pronta não implica casos de uso implementados |
| Backend | não iniciado | `identidade`: perfil, privacidade, seguir/solicitar, listas, busca por username |
| Web | não iniciado | tela de perfil (próprio/de outro), edição, busca por username, seguidores/seguidos |
| Mobile | não iniciado | mesmas telas + upload de avatar direto ao Cloudinary |

## Especificação

### Backend / API — `identidade`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) o corpo de erro padrão + correlation-id e mensagens pt-BR (RNF-USA-05). Todo acesso a conteúdo restrito de perfil privado revalida **relação de seguidor aceita no servidor** (RNF-SEC-03), em **todos** os endpoints de conteúdo, inclusive listagens. A busca exata continua retornando apenas os campos públicos definidos em RN-08. IDs de recurso **não sequenciais** (SEC-05). Escritas aceitam `Idempotency-Key` conforme o [README do período](README.md#regras-de-implementação-compartilhadas).

**Contrato HTTP canônico:** [`docs/api/identidade.yaml`](../../api/identidade.yaml). Os nomes de operação, parâmetros, schemas, respostas e `x-implementation-status` daquele arquivo prevalecem sobre exemplos resumidos desta feature. Todas as operações abaixo estão `planned` em 17/09; sua presença no OpenAPI e a existência das tabelas não declaram implementação.

| Operação canônica | Entrada canônica | Saída de sucesso canônica |
|---|---|---|
| `GET /me/perfil` | `bearerAuth` | `200` `Perfil` |
| `PUT /me/perfil` | `bearerAuth`, `IdempotencyKey`, `EditarPerfilRequisicao` | `200` `Perfil` |
| `GET /perfis` | `bearerAuth`, query `UsernameExato` | `200` array de zero ou um `PerfilResumo` |
| `GET /perfis/{username}` | `bearerAuth`, path `UsernamePath` | `200` `Perfil` |
| `POST /perfis/{username}/seguir` | `bearerAuth`, `UsernamePath`, `IdempotencyKey` | `201` `ResultadoSeguir` |
| `DELETE /perfis/{username}/seguir` | `bearerAuth`, `UsernamePath`, `IdempotencyKey` | `204`, sem corpo |
| `GET /solicitacoes` | `bearerAuth`, `Page`, `Size` | `200` `PaginaSolicitacoes` |
| `POST /solicitacoes/{id}/aceitar` | `bearerAuth`, `SolicitacaoId`, `IdempotencyKey` | `204`, sem corpo |
| `POST /solicitacoes/{id}/recusar` | `bearerAuth`, `SolicitacaoId`, `IdempotencyKey` | `204`, sem corpo |
| `DELETE /seguidores/{username}` | `bearerAuth`, `UsernamePath`, `IdempotencyKey` | `204`, sem corpo |
| `GET /me/seguidores` | `bearerAuth`, `Page`, `Size` | `200` `PaginaPerfis` |
| `GET /me/seguidos` | `bearerAuth`, `Page`, `Size` | `200` `PaginaPerfis` |

Componentes compartilhados deste recorte: schemas `Privacidade`, `RelacaoPerfil`, `Avatar`, `ContadoresPerfil`, `PerfilResumo`, `Perfil`, `ResultadoSeguir`, `SolicitacaoSeguir`, `PaginaSolicitacoes`, `PaginaPerfis` e `Erro`; respostas `RequisicaoInvalida`, `PaginacaoInvalida`, `NaoAutenticado`, `NaoAutorizado`, `NaoEncontrado`, `IdempotenciaEmConflito`, `LimiteExcedido` e `ServicoIndisponivel`. Implementação e testes devem usar exatamente esses componentes, inclusive página baseada em zero e `size` máximo 50.

- **`GET /me/perfil`** e **`PUT /me/perfil`** (RF-SOC-01) — edita nome de exibição, **biografia**, **avatar** e **privacidade** (`publico`/`privado`, RF-SOC-04). Biografia tratada como texto na renderização (escape — SEC-14). Avatar por **Cloudinary unsigned upload** (P-09): o cliente envia direto ao Cloudinary e manda a URL/ID; o servidor **valida tipo real, tamanho e dimensões** (SEC-20) e fixa pasta/tipos/tamanho no preset.
- **`GET /perfis/{username}`** (RF-SOC-02, RN-08) — retorna o perfil de outro leitor. **Nome, avatar e biografia são visíveis a todos**; estante, leituras, listas, estatísticas, resenhas e notas seguem RN-08 (públicos a todos **ou** só a seguidores aceitos, conforme a privacidade). O conteúdo de estante/resenha vem de `leitura` e listas de `social`; **este endpoint entrega a identidade + contadores**, e os clientes compõem o resto chamando os serviços donos, que **revalidam** a privacidade. Perfil privado a não-seguidor → identidade pública + indicação de conteúdo restrito (não `403` do perfil inteiro).
- **`GET /perfis?username=<exato>`** (RF-SOC-03, SEC-19) — busca **por username exato apenas**. Sem correspondência → vazio. **Proibida** enumeração por prefixo, listagem ou sugestão (SEC-19/44). Pode receber rate limiting defensivo, sem atribuí-lo a RNF-SEC-18, que trata ações sociais e cadastro por ISBN.
- **Seguir/solicitar:**
  - **`POST /perfis/{username}/seguir`** — perfil **público**: cria seguimento **imediato** (RF-SOC-05) e publica `seguidor.novo`. Perfil **privado**: cria **solicitação** pendente (RF-SOC-06) e publica `solicitacao.criada`.
  - **`POST /solicitacoes/{id}/aceitar`** / **`/recusar`** (RF-SOC-06) — o destinatário decide; aceitar cria o seguimento e publica `solicitacao.aceita`; recusar descarta.
  - **`GET /solicitacoes?page=`** — inbox paginada das solicitações recebidas pelo usuário autenticado, necessária para aceitar/recusar; limite imposto pelo servidor.
  - **`DELETE /perfis/{username}/seguir`** (RF-SOC-07) — deixar de seguir, com confirmação no cliente.
  - **`DELETE /seguidores/{username}`** (RF-SOC-07) — remover um seguidor (ação destrutiva → confirmação no cliente, RNF-USA-04).
  - Rate limiting em seguir/solicitar (SEC-18).
  - O servidor recusa seguir ou solicitar seguimento ao próprio usuário; o banco aplica `seguidor_id <> seguido_id` e `solicitante_id <> alvo_id`.
- **`GET /me/seguidores?page=`** e **`GET /me/seguidos?page=`** (RF-SOC-08) — listas próprias **paginadas** (RNF-DES-02), acessíveis somente ao usuário autenticado. Não há listagem dos seguidores/seguidos de terceiros, evitando transformar o grafo em diretório de usuários (SEC-19/44).

**Regras de RN-08 (matriz de privacidade):**

| Recurso | Público | Privado |
|---|---|---|
| Encontrado por username exato | Sim | Sim |
| Nome, avatar, biografia | Todos | Todos |
| Estante, leituras, listas, estatísticas, resenhas, notas | Todos | Só seguidores aceitos |
| Seguir | Imediato | Requer solicitação aceita |

Mudar de **público para privado não remove** seguidores existentes.

**Eventos produzidos e ownership:** F-PERFIL/`identidade` é dona da escrita do fato, da linha em `outbox_identidade`, dos schemas de `data` e da publicação no exchange `leai.events.identidade`; [F-NOT](feature-F-NOT.md)/`social` é dona da fila `leai.social.notificacoes`, do consumo idempotente e da criação da notificação. [P0-MSG](../periodo-0/feature-P0-MSG.md) é pré-requisito e dono do [envelope v1](../../mensageria/schemas/envelope-v1.schema.json), dispatcher, publisher confirms, conexão/topologia, retry e DLQ. A outbox já está implantada, mas o runtime de P0-MSG ainda não está implementado.

| Evento `(type, version)` | Quando F-PERFIL grava na outbox | `businessKey` | Schema canônico de `data` | Campos de `data` |
|---|---|---|---|---|
| `seguidor.novo`, `1` | seguimento imediato de perfil público ou aceite de solicitação, na mesma transação do `seguidor` | `seguimento:<seguimentoId>` | [`seguidor.novo.v1`](../../mensageria/schemas/seguidor.novo.v1.schema.json) | `destinatarioId`, `seguimentoId`, `seguidor` (`UsuarioSnapshot`) |
| `solicitacao.criada`, `1` | criação de solicitação pendente para perfil privado, na mesma transação | `solicitacao:<solicitacaoId>` | [`solicitacao.criada.v1`](../../mensageria/schemas/solicitacao.criada.v1.schema.json) | `destinatarioId`, `solicitacaoId`, `solicitante` (`UsuarioSnapshot`) |
| `solicitacao.aceita`, `1` | aceite e criação do seguimento, na mesma transação | `solicitacao:<solicitacaoId>` | [`solicitacao.aceita.v1`](../../mensageria/schemas/solicitacao.aceita.v1.schema.json) | `destinatarioId`, `solicitacaoId`, `seguimentoId`, `perfilAceitante` (`UsuarioSnapshot`) |

`eventId`, `type`, `version`, `occurredAt`, `correlationId` e `businessKey` pertencem ao envelope, não ao `data`; a outbox persiste somente o `data` em `payload`, e o dispatcher monta o envelope. `UsuarioSnapshot` é definido em [`common-v1.schema.json`](../../mensageria/schemas/common-v1.schema.json). O [catálogo](../../mensageria/catalogo.md) é a fonte canônica de produtor, consumidor e business key. A criação da notificação e os recibos de consumo são critérios de F-NOT, não desta feature.

**VIEWs expostas por `identidade`** (arquitetura §4.2), com nomes distintos das tabelas:
- `v_perfil_referencia_v1` — colunas físicas e contratuais `id`, `username`, `nome_exibicao`, `avatar_url`, `privacidade` e `opt_out_recomendacao`; permite distinguir perfil público de privado, montar snapshots sem ler `usuario` e dá a F-REC-ALG/P3 o sinal de opt-out já previsto no contrato.
- `v_seguimento_aceito_v1` — pares seguidor → seguido **somente com seguimento aceito**.

As duas VIEWs omitem contas com `exclusao_solicitada_em` preenchido. Durante os 30 dias de recuperação, perfil, conteúdo e relações deixam de ser visíveis sem apagar os dados; cancelar a exclusão restaura automaticamente as linhas contratuais.

F-MOD-OPC/P3 também omite contas suspensas e seus seguimentos das VIEWs públicas; reativar restaura a visibilidade sob RN-08. Consulta administrativa autorizada de identidade permite ao painel localizar alvos suspensos. Serviços revalidam a presença do perfil antes de exibir conteúdo/snapshot; conhecer ids não contorna ocultação.

`acervo`, `leitura` e `social` combinam os dois contratos para aplicar RN-08: conteúdo é visível se o perfil for público, se o solicitante for o próprio dono ou se houver seguimento aceito. As VIEWs são versionadas e documentadas junto do spec OpenAPI.

**Modelo de dados** (schema `identidade`): a migration [`V20260915120000__completa_schema_identidade.sql`](../../../code/back/identidade/src/main/resources/db/migration/V20260915120000__completa_schema_identidade.sql) já foi versionada, validada em PostgreSQL 17 e aplicada no Neon em 16/09, conforme o [`DER`](../../diagramas/DER.md#checklist-do-neon). Ela amplia `usuario`, cria `seguidor`, `solicitacao_seguir`, `idempotencia_identidade`, `outbox_identidade` e as duas VIEWs. F-PERFIL implementa o uso dessas estruturas; não deve recriá-las nem editar migration aplicada. Qualquer ajuste exige nova migration timestampada e revisão humana.

### Frontend Web (`code/front`)

- **Tela de perfil** (próprio e de outro), **edição** de perfil (nome, bio, avatar, privacidade), **busca por username exato**, e listas próprias de **seguidores/seguidos** — usando só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md).
- Upload de avatar direto ao Cloudinary (unsigned preset). Botões de seguir/solicitar/deixar de seguir com estado correto por privacidade; inbox paginada para aceitar/recusar; **confirmação** ao deixar de seguir e ao remover seguidor (RNF-USA-04).
- Conteúdo restrito de perfil privado exibido como restrito (não como erro).

### App Flutter (`code/mobile`)

- Mesmas telas, com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); upload de avatar direto ao Cloudinary. Alvo de demonstração Android.

## Critérios de aceite

- [ ] Editar perfil altera nome/bio/avatar/privacidade; avatar passa por validação de tipo/tamanho/dimensões no servidor (SEC-20).
- [ ] Perfil privado só mostra estante/resenhas/notas/listas/estatísticas a **seguidor aceito**; a checagem é **server-side** em todos os endpoints, inclusive busca e listagem (RN-08, SEC-03).
- [ ] Busca encontra leitor **só por username exato**; prefixo/parcial não retorna nada e não há sugestão (SEC-19/44).
- [ ] Seguir perfil público é **imediato**; perfil privado gera **solicitação** que o destinatário aceita/recusa.
- [ ] Auto-seguimento e auto-solicitação são recusados pelo domínio e por CHECK no banco.
- [ ] Solicitações recebidas possuem inbox paginada e só o destinatário aceita/recusa.
- [ ] Deixar de seguir e remover seguidor funcionam e pedem confirmação (RNF-USA-04).
- [ ] Listas próprias de seguidores/seguidos são paginadas e owner-only; perfis de terceiros não expõem o grafo como diretório (RNF-DES-02, SEC-19/44).
- [ ] `seguidor.novo`, `solicitacao.criada` e `solicitacao.aceita` são publicados após a escrita com payload versionado e destinatário correto; a geração da notificação é aceita em [F-NOT](feature-F-NOT.md).
- [ ] `v_perfil_referencia_v1` expõe privacidade e identidade pública; `v_seguimento_aceito_v1` expõe apenas seguimentos aceitos, sem colisão com nomes de tabelas.
- [ ] Repetir uma escrita com a mesma `Idempotency-Key` não repete seguimento, solicitação ou decisão (RNF-ERR-04).
- [ ] Seed reproduzível cobre perfil público, privado, seguidor aceito, solicitação pendente e não-seguidor (RNF-TST-08).
- [ ] Mudar de público para privado **não** remove seguidores.
- [ ] Fluxo perfil→seguir/solicitar→aceitar→listas funciona **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `identidade`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container, **com prioridade obrigatória para RN-08 (RNF-TST-01 e RNF-TST-02)**: seguir público/privado, inbox paginada e exclusiva do destinatário, aceitar/recusar, deixar de seguir/remover, listas próprias, busca exata, idempotência e negativa de conteúdo privado por não-seguidor
- [ ] Matriz RN-08 cobre público, privado com dono, seguidor aceito e não-seguidor em perfil, busca e cada leitura/listagem de conteúdo; suspensão e exclusão pendente não vazam pelas VIEWs; mudança público→privado preserva seguidores
- [ ] Testes de contrato HTTP validam requisições/respostas, `401`/`403`/`404` sem IDOR, paginação zero-based/limite 50 e todos os componentes canônicos de [`identidade.yaml`](../../api/identidade.yaml)
- [ ] Teste do produtor cobre, para os três eventos, validação do envelope + schema de `data`, `businessKey`, destinatário/snapshot corretos e atomicidade domínio+outbox; replay da mesma `Idempotency-Key` não cria segunda relação, solicitação ou linha de outbox (RNF-TST-03/ERR-10)
- [ ] Testes genéricos de dispatcher, publisher confirm, broker indisponível, retry e DLQ são entregues por P0-MSG; testes de consumo duplicado/recibo e criação da notificação são entregues por F-NOT
- [ ] Testes web/mobile cobrem estado dos botões, conteúdo restrito e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `identidade` atualizado em `docs/api/identidade.yaml`** com perfil/seguidores/solicitações e as VIEWs `v_perfil_referencia_v1`/`v_seguimento_aceito_v1` documentadas como contratos
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** publicar as duas VIEWs versionadas como contratos estáveis — delas dependem [F-FEED](feature-F-FEED.md), `acervo`, `leitura` e a recomendação futura.

## Pendências

- **Depende de** [F-AUT](feature-F-AUT.md)/[P0-NAV](../periodo-0/feature-P0-NAV.md) (identidade autenticada; P0-NAV já fornece access token e middleware, F-AUT completa a sessão), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md). P0-MSG ainda precisa entregar Cloudinary/P-09 para avatar e conexão/dispatcher/confirms/retry/DLQ para os eventos; as tabelas de outbox implantadas não satisfazem esse pré-requisito funcional.
- **Compartilha o serviço `identidade` com [F-AUT](feature-F-AUT.md)** — privacidade e contadores já estão fixados na migration implantada; coordenar qualquer nova migration ou alteração de entidades/DTOs compartilhados (plano §6).
- **Divergência de baseline em RF-SOC-02:** estante/resenhas vêm de `leitura` ([F-EST](feature-F-EST.md)/[F-AVA](feature-F-AVA.md)), mas listas pertencem a F-LST no Período 2. No Período 1, o perfil compõe identidade, contadores, estante e resenhas disponíveis; RF-SOC-02 não é marcado integralmente fechado até o grupo resolver a alocação das listas pelo controle de mudança.
- **Depende futuramente de F-CONTA-2:** as VIEWs devem ocultar conta com exclusão pendente sem remover dados durante os 30 dias.
- Definir o **preset Cloudinary de avatar** (pasta/tipos/tamanho) com [P0-MSG](../periodo-0/feature-P0-MSG.md).
- Stack do serviço `identidade` definida: **Spring (Java)** (arquitetura §2.1).

## Timeline

### Consolidação 17/09/2026: operações e componentes HTTP alinhados ao contrato canônico expandido de `identidade`; estado físico de tabelas, VIEWs e outbox implantadas separado do estado funcional; schemas de evento ligados diretamente ao catálogo, com envelope, produtor/consumidor e fronteiras de P0-MSG/F-NOT explicitados; dependências e matriz mínima de testes consolidadas sem declarar backend ou clientes implementados.

### Revisão 15/09/2026: impacto das decisões do grupo registrado — extensão de opt-out em F-REC-ALG e ocultação/restauração por suspensão em F-MOD-OPC. Contratos derivados atualizados; implementação não iniciada.

### Revisão 01/09/2026: auto-seguimento/auto-solicitação explicitamente proibidos e protegidos por CHECK no DER.

### Revisão 01/09/2026: contratos de perfil/seguimento passaram a ocultar contas com exclusão pendente e a restaurá-las por cancelamento sem fan-out reverso.

### Revisão 28/08/2026: VIEWs receberam nomes não conflitantes e contratos mínimos de privacidade/seguimento; eventos, idempotência, inbox e listas próprias owner-only foram fechados sem dependência circular com F-NOT e sem criar diretório de usuários. A divergência de listas em RF-SOC-02 foi registrada como pendência de baseline.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-PERFIL no [periodo-1/README.md](README.md), de RF-SOC-01..08 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.9, da RN-08 e da arquitetura §3.1/§4.2/§5.2. Relação de seguimento fixada como contrato de saída de `identidade`; composição de RF-SOC-02 com `leitura`/`social` registrada como pendência de amadurecimento.
