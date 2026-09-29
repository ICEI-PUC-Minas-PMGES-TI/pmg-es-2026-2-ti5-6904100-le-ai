# F-PERFIL — Perfil, privacidade e seguidores

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** Henrique Carvalho · **Serviços afetados:** `identidade` (backend) + web + mobile

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
| Infra | em andamento | preset Cloudinary `leai_avatares` criado e provado no console em 24/09 (unsigned, pasta `avatares`, jpg/png/webp, `c_limit` 1024 px); `CLOUDINARY_CLOUD_NAME` do `identidade` e `VITE_CLOUDINARY_AVATAR_PRESET` do `leai-web` no `render.yaml`. Runtime de [P0-MSG](../periodo-0/feature-P0-MSG.md) sem prova em DES, então os eventos ainda não saíram da outbox em ambiente nenhum |
| Dados | concluído | estrutura de 16/09 em uso, sem migration nova. Seed reproduzível (RNF-TST-08) no perfil Spring `seed`, provado contra Postgres local; **não aplicado em DES** |
| Backend | concluído localmente | as 12 operações implementadas e `implemented` no OpenAPI; eventos na outbox na transação do fato; limites de 30/min em busca e seguir; 186 testes no serviço (integração com Postgres real). Não está em DES |
| Web | concluído localmente | meu perfil, editar perfil com avatar direto ao Cloudinary, buscar leitor, perfil de outro leitor, conexões e solicitações; 264 testes. Não está em DES. Sem estante e resenhas (dependem de `leitura`) |
| Mobile | concluído localmente | as mesmas telas; 167 testes, APK de debug gerado. Não testado em emulador. Sem estante e resenhas |

## Especificação

### Backend / API — `identidade`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) o corpo de erro padrão + correlation-id e mensagens pt-BR (RNF-USA-05). Todo acesso a conteúdo restrito de perfil privado revalida **relação de seguidor aceita no servidor** (RNF-SEC-03), em **todos** os endpoints de conteúdo, inclusive listagens. A busca exata continua retornando apenas os campos públicos definidos em RN-08. IDs de recurso **não sequenciais** (SEC-05). Escritas aceitam `Idempotency-Key` conforme o [README do período](README.md#regras-de-implementação-compartilhadas).

**Contrato HTTP canônico:** [`docs/api/identidade.yaml`](../../api/identidade.yaml). Os nomes de operação, parâmetros, schemas, respostas e `x-implementation-status` daquele arquivo prevalecem sobre exemplos resumidos desta feature. Desde 24/09 as doze operações abaixo estão `implemented` (backend; não verificadas em DES), com as descrições alinhadas ao comportamento real.

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

Componentes compartilhados deste recorte: schemas `Privacidade`, `RelacaoPerfil`, `Avatar`, `ContadoresPerfil`, `PerfilResumo`, `Perfil`, `ResultadoSeguir`, `SolicitacaoSeguir`, `PaginaSolicitacoes`, `PaginaPerfis` e `Erro`; respostas `RequisicaoInvalida`, `PaginacaoInvalida`, `NaoAutenticado`, `NaoEncontrado`, `IdempotenciaEmConflito`, `LimiteExcedido` e `ServicoIndisponivel`. Implementação e testes devem usar exatamente esses componentes, inclusive página baseada em zero e `size` máximo 50.

- **`GET /me/perfil`** e **`PUT /me/perfil`** (RF-SOC-01) — edita nome de exibição, **biografia**, **avatar** e **privacidade** (`publico`/`privado`, RF-SOC-04). Biografia tratada como texto na renderização (escape — SEC-14). Avatar por **Cloudinary unsigned upload** (P-09): o cliente envia direto ao Cloudinary e manda a URL/ID. **Decisão de 24/09 (SEC-20 × SEC-38):** o servidor **nunca baixa a imagem**, porque validar os bytes de uma URL enviada pelo cliente seria o SSRF que SEC-38 proíbe; ele confere a origem (HTTPS em `res.cloudinary.com`, cloud do projeto, `image/upload`, pasta `avatares/`, `publicId` coerente, extensão jpg/jpeg/png/webp), e tipo, tamanho e dimensões ficam no preset e na validação pelos bytes nos clientes. Mesma regra que `acervo` usa para a capa.
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

**Eventos produzidos e ownership:** F-PERFIL/`identidade` é dona da escrita do fato, da linha em `outbox_identidade`, dos schemas de `data` e da publicação no exchange `leai.events.identidade`; [F-NOT](feature-F-NOT.md)/`social` é dona da fila `leai.social.notificacoes`, do consumo idempotente e da criação da notificação. [P0-MSG](../periodo-0/feature-P0-MSG.md) é pré-requisito e dono do [envelope v1](../../mensageria/schemas/envelope-v1.schema.json), dispatcher, publisher confirms, conexão/topologia, retry e DLQ. A outbox já está implantada e o runtime de P0-MSG (dispatcher, confirms, retry e DLQ) foi implementado nas duas stacks em 20/09/2026, provado localmente de `identidade` para `acervo`; falta a prova em DES/HML.

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

Marcado = verificado localmente por teste em 24/09/2026. Nada foi verificado em DES ainda.

- [ ] Editar perfil altera nome/bio/avatar/privacidade; avatar passa por validação de tipo/tamanho/dimensões no servidor (SEC-20). *A edição dos quatro campos está feita e testada. A validação do avatar no servidor é só de origem, por decisão de 24/09 (ver Especificação e Pendências): tipo, tamanho e dimensões ficam no preset e nos clientes. O texto do critério pede validação no servidor, então ele fica aberto até o grupo aceitar a troca.*
- [ ] Perfil privado só mostra estante/resenhas/notas/listas/estatísticas a **seguidor aceito**; a checagem é **server-side** em todos os endpoints, inclusive busca e listagem (RN-08, SEC-03). *A parte de `identidade` está feita: `conteudoRestrito` e `relacao` são calculados no servidor em perfil, busca, listas e caixa, e as duas VIEWs são o contrato. Estante, resenhas e listas vivem em `leitura` e `social`, que ainda não expõem as rotas de perfil.*
- [x] Busca encontra leitor **só por username exato**; prefixo/parcial não retorna nada e não há sugestão (SEC-19/44).
- [x] Seguir perfil público é **imediato**; perfil privado gera **solicitação** que o destinatário aceita/recusa.
- [x] Auto-seguimento e auto-solicitação são recusados pelo domínio (`409`) e por CHECK no banco.
- [x] Solicitações recebidas possuem inbox paginada e só o destinatário aceita/recusa (pedido alheio é `404`, sem confirmar que existe).
- [x] Deixar de seguir e remover seguidor funcionam e pedem confirmação (RNF-USA-04), na web e no mobile.
- [x] Listas próprias de seguidores/seguidos são paginadas e owner-only; perfis de terceiros não expõem o grafo como diretório (RNF-DES-02, SEC-19/44).
- [ ] `seguidor.novo`, `solicitacao.criada` e `solicitacao.aceita` são publicados após a escrita com payload versionado e destinatário correto; a geração da notificação é aceita em [F-NOT](feature-F-NOT.md). *Os três são gravados na outbox na transação do fato, com `data` validado contra o schema do catálogo, `businessKey` e destinatário conferidos em teste. A publicação em si é do dispatcher de P0-MSG, que ainda não roda em DES.*
- [x] `v_perfil_referencia_v1` expõe privacidade e identidade pública; `v_seguimento_aceito_v1` expõe apenas seguimentos aceitos, sem colisão com nomes de tabelas. *Definidas pela migration de 16/09; documentadas como contrato em `identidade.yaml` em 24/09.*
- [x] Repetir uma escrita com a mesma `Idempotency-Key` não repete seguimento, solicitação ou decisão (RNF-ERR-04).
- [x] Seed reproduzível cobre perfil público, privado, seguidor aceito, solicitação pendente e não-seguidor (RNF-TST-08). *Provado em Postgres local; não aplicado em DES.*
- [x] Mudar de público para privado **não** remove seguidores.
- [ ] Fluxo perfil→seguir/solicitar→aceitar→listas funciona **em DES**.

## Definition of Done

(plano §10)

- [x] Código (backend `identidade`, web, mobile) em `desenvolvimento` (commits locais de 24/09; push pendente)
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md)): depende do push
- [x] Testes unitários e de integração com banco real/container, **com prioridade obrigatória para RN-08 (RNF-TST-01 e RNF-TST-02)**: seguir público/privado, inbox paginada e exclusiva do destinatário, aceitar/recusar, deixar de seguir/remover, listas próprias, busca exata, idempotência e negativa de conteúdo privado por não-seguidor (`conteudoRestrito`)
- [ ] Matriz RN-08 cobre público, privado com dono, seguidor aceito e não-seguidor em perfil, busca e cada leitura/listagem de conteúdo; suspensão e exclusão pendente não vazam pelas VIEWs; mudança público→privado preserva seguidores. *Coberto em perfil, busca, listas, caixa e sobre o seed; conta suspensa e com exclusão pendente somem da API. Faltam as leituras de conteúdo (de `leitura`/`social`) e um teste que consulte as VIEWs diretamente.*
- [ ] Testes de contrato HTTP validam requisições/respostas, `401`/`403`/`404` sem IDOR, paginação zero-based/limite 50 e todos os componentes canônicos de [`identidade.yaml`](../../api/identidade.yaml). *`401`, `404` sem IDOR e paginação estão cobertos na integração; não há teste de contrato automatizado contra o spec (mesma lacuna de F-AUT).*
- [ ] Teste do produtor cobre, para os três eventos, validação do envelope + schema de `data`, `businessKey`, destinatário/snapshot corretos e atomicidade domínio+outbox; replay da mesma `Idempotency-Key` não cria segunda relação, solicitação ou linha de outbox (RNF-TST-03/ERR-10). *Tudo coberto, menos a atomicidade provada por falha forçada: ela vem da transação única, sem teste que derrube a escrita no meio.*
- [ ] Testes genéricos de dispatcher, publisher confirm, broker indisponível, retry e DLQ são entregues por P0-MSG; testes de consumo duplicado/recibo e criação da notificação são entregues por F-NOT. *Não são desta feature.*
- [x] Testes web/mobile cobrem estado dos botões, conteúdo restrito e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [x] **Spec OpenAPI de `identidade` atualizado em `docs/api/identidade.yaml`** com perfil/seguidores/solicitações e as VIEWs `v_perfil_referencia_v1`/`v_seguimento_aceito_v1` documentadas como contratos
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver

**Item próprio:** publicar as duas VIEWs versionadas como contratos estáveis — delas dependem [F-FEED](feature-F-FEED.md), `acervo`, `leitura` e a recomendação futura.

## Pendências

**Decisões de projeto tomadas em 24/09/2026** (registradas aqui por serem da feature; nenhuma altera `docs/orquestador/`):

1. **Avatar validado pela origem, não pelos bytes** (SEC-20 × SEC-38): o servidor confere que a URL é do Cloudinary do projeto, na pasta `avatares/`, com `publicId` coerente e extensão aceita, e nunca baixa a imagem. Tipo, tamanho e dimensões ficam no preset `leai_avatares` e na validação pelos bytes nos clientes (jpg/png/webp, até 5 MB, 100 a 6000 px, os mesmos limites da capa). É a regra que o `acervo` já usa para capa. **Pede aceite do grupo**, porque o critério de aceite fala em validação no servidor.
2. **Limites por usuário de 30 por minuto**, em memória: busca exata (defensivo, SEC-19/44) e seguir/pedir (SEC-18). Nenhuma fonte fixa os números.
3. **Biografia com teto técnico de 1000 caracteres**; o limite de produto continua indefinido (ver abaixo).
4. **Seguir de novo com relação ou pedido existente é `409`**, como o contrato manda; o replay da mesma chave devolve o `201` original. Pedido de outra pessoa é `404` em aceitar e recusar, não `403`, para não confirmar que o id existe; o `403` e o componente `NaoAutorizado` saíram do contrato.
5. **Aceitar quando quem pediu já seguia** fecha o pedido sem contar de novo e publica `solicitacao.aceita` com o seguimento existente. Deixar de seguir e remover seguidor sem relação respondem `204`.
6. **Contadores mantidos por `UPDATE` atômico** na transação, sempre na mesma ordem de id, em vez de `COUNT` na leitura. As listas escondem contas suspensas ou com exclusão pendente, então `totalElements` pode ficar abaixo do contador do perfil.
7. **Seed reproduzível, não só idempotente**: cada execução devolve as quatro contas (`seed.ana`, `seed.bruno`, `seed.caio`, `seed.duda`) e as relações entre elas ao estado fixo, com os ids de `SEED_ACERVO`. A senha vem de `SEED_SENHA` e não fica no repositório, porque a massa pode ir para o Neon de DES. Recusa o perfil `prod`.

**Decisões do dono em 25/09/2026**, na revisão contra os protótipos renderizados (regra nova de `docs/design/AGENTS.md` §10: o protótipo `.html` é a fonte visual, e falta de contrato vira pergunta ao dono, não corte):

8. **Biografia no `PerfilResumo`**: a busca e as listas (seguidores, seguindo, solicitações) mostram a bio, como no protótipo. Contrato alterado em `identidade.yaml` e no backend; a bio já era pública em qualquer privacidade (RN-08), então nada novo fica exposto.
9. **Estante e Resenhas desenhadas no estado vazio** (artboard 04 de meu-perfil) no meu perfil e no perfil de outro leitor, com as abas da web, até `leitura` expor os dados. Sem "livros lidos" nos contadores enquanto o dado não existir. Com `conteudoRestrito`, as seções não aparecem (RN-08).

**Divergências protótipo × implementação** (web e mobile):

- **Estante e Resenhas sempre vazias** até [F-EST](feature-F-EST.md)/[F-AVA](feature-F-AVA.md) entregarem `listarEstantePerfil` e `listarResenhasPerfil`; sem "Ver todas" nas resenhas (não há destino) e sem a grade de capas no skeleton.
- **Sem pronome de gênero.** Os protótipos escrevem "ele"/"ela" deduzindo pelo nome ("As atividades dela saem do seu feed"). O produto não guarda gênero, e adivinhar pelo nome erra com gente real; as frases usam "essa pessoa" e o primeiro nome. **Sugestão para o grupo:** corrigir os prompts e protótipos.
- "Você vê este perfil porque Beatriz aceitou sua solicitação" segue como "porque segue Beatriz": quem seguiu com o perfil ainda público não teve pedido aceito, e a frase do protótipo seria falsa nesse caso (mantida na revisão de 25/09).
- **Sem o estado "consulta parcial"** da busca: distinguir `rafa` de um nome inexistente exigiria o servidor revelar que existem nomes começando assim (RNF-SEC-19). A ilustração do vazio comum entrou.
- Imagem recusada mostra o motivo real no lugar do mock "JPG ou PNG de até 5 MB". A biografia perdeu o contador `n/1000` (o protótipo não tem), mas o teto técnico de 1000 continua validado.
- **Estado vazio "solto"**: os protótipos de F-PERFIL usam ícone de 32px sem círculo e bloco centralizado na vertical; o componente compartilhado ganhou essa variante, e o círculo de 72px "alinhado ao topo" continua para os livros. A regra do topo estava só nos comentários do componente, não no `documento-de-design.md`.
- **Header sem divisor** nas telas de F-PERFIL e na aba Perfil; as outras abas do shell mantêm o divisor fixo (simplificação de P0-NAV). A ilustração "leitor encontrado" ganhou variante escura (a sombra do chão em `#f2f2f2` fazia uma mancha clara no escuro, também presente no protótipo).
- Skeleton web de Conexões com 6 cards, contra 8 no protótipo. Skeletons sem o fade de entrada: o projeto não tem animação de entrada em skeleton nenhum.
- Depois de aceitar um pedido, o foco não vai para o item seguinte; a mudança é anunciada pela contagem.

**Em aberto:**

- **Cancelar um pedido enviado** não tem rota no contrato nem requisito; o protótipo registra a mesma pendência.
- **Pedidos pendentes quando o perfil volta a público** continuam pendentes; nenhuma fonte define se deveriam virar seguimento.
- **Limite de produto da biografia** (hoje só o teto técnico de 1000).
- **Seed em DES:** depende do deploy de F-PERFIL e de alguém rodar com `SEED_SENHA`. A parte de estados de leitura é de F-EST e a de `social` das features donas.
- **Eventos em DES:** dependem da prova de P0-MSG; a criação da notificação é de [F-NOT](feature-F-NOT.md).
- **Testes de contrato** automatizados contra `identidade.yaml` e teste de atomicidade com falha forçada (itens do DoD).
- **Limites e bloqueios em memória** (`LimitePorUsuario`): aceitável com uma instância no Render (RNF-ARQ-04).
- **Comentário desatualizado em outra feature:** `code/back/acervo/src/db/contratos-externos.ts` diz que F-PERFIL não está implementada. É arquivo do `acervo`; fica para o dono.
- **Divergência de baseline em RF-SOC-02:** listas pertencem a F-LST no Período 2. RF-SOC-02 não é marcado integralmente fechado até o grupo resolver a alocação das listas pelo controle de mudança.
- **Compartilha o serviço `identidade` com [F-AUT](feature-F-AUT.md):** nenhuma migration nova foi criada; coordenar qualquer ajuste de entidade ou DTO compartilhado (plano §6).
- **Depende futuramente de F-CONTA-2:** as VIEWs e as rotas já ocultam conta com exclusão pendente sem remover dados.
- **Depende de** [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md) para DES, [P0-CI](../periodo-0/feature-P0-CI.md) para o CI e [P0-MSG](../periodo-0/feature-P0-MSG.md) para a publicação dos eventos.

## Timeline

### Organização 27/09/2026: refatoração estrutural, sem mudança de comportamento, contrato, rota ou migration. Backend: `perfil/` e `seguimento/` divididos em `controller/`, `dto/`, `service/`, `validacao/` e `config/`, no padrão do `social`; `ValidadorDeAvatarTest` foi para `perfil/validacao/`. Viraram `public` só os membros chamados de outra camada: `PerfilResposta.proprio`/`de`, `Pagina.de`/`validar` e `ResultadoSeguir.seguindo`/`pendente`. Web: views de F-PERFIL em `views/perfil/`. Estrutura registrada nos `AGENTS.md` do `identidade` e da web. Testes: `identidade` 191 (69 de integração ignorados, sem Postgres local), web 557, as mesmas contagens de antes da mudança.

### Revisão contra os protótipos 25/09/2026: telas de F-PERFIL conferidas lado a lado com os protótipos renderizados (web e app, cerca de 100 artboards) depois da mudança do §10 de `docs/design/AGENTS.md`. Contrato: `biografia` no `PerfilResumo` (backend, `identidade.yaml`, clientes). Web e app: avatar sem foto com as iniciais sobre `musgo-fundo` (os protótipos definem esse estado, ao contrário do registrado antes), Estante e Resenhas no vazio, abas da web, busca com o campo no header, chip de privacidade, biografia e as duas ilustrações do unDraw, estados vazios com ícone solto, skeletons, banners de erro com a ação dentro, diálogos de 360px, header web com o link `← Perfil`, contadores com divisor de altura total, edição de perfil em duas colunas com o contador do nome à direita. Componentes compartilhados ganharam as variantes como opção, sem mudar as telas de livros. Testes: `identidade` 190 (com integração, 0 ignorados), web 286, mobile 201.

### Teste de aceite 25/09/2026: contadores de seguidores e seguindo do Meu perfil na web corrigidos. O divisor era borda do próprio link (`divide-x`/`divide-y`), que tem `rounded-base`, e se curvava com o raio; no desktop o link também não tinha padding horizontal, então o hover encostava no texto. O divisor passou para a célula, sem raio, e o link ganhou padding e hover arredondado recuados do separador. Na web, número à esquerda e rótulo na ponta direita da coluna (`justify-between`), como no protótipo. Conferido em screenshot nos dois tamanhos, com e sem hover. Web 265 testes.

### Implementação 24/09/2026: backend, web e mobile de F-PERFIL implementados em 10 etapas (plano de execução do dono), de `5d7772d` a este fechamento em `desenvolvimento`. Backend: perfil próprio com avatar validado pela origem, perfil de outro leitor e busca exata (RN-08 com `relacao` e `conteudoRestrito`), seguir/pedir/aceitar/recusar/desfazer com contadores atômicos e os três eventos na outbox (o `MessageValidator` passou a conhecer os schemas, que antes prenderiam os eventos), listas próprias paginadas e seed reproduzível; correção de parâmetro malformado que respondia `500`. OpenAPI com as 12 operações `implemented` e as duas VIEWs documentadas como contrato. Web e mobile: meu perfil, editar perfil com avatar direto ao Cloudinary, buscar leitor, perfil de outro leitor, conexões e solicitações; o mobile ganhou `PUT` e um modal de confirmação compartilhado. Testes: `identidade` 186, web 264, mobile 167. Não verificado em DES. Decisões e divergências na seção de pendências.

### Atribuição e verificação 24/09/2026: feature assumida por Henrique Carvalho, junto de [F-AUT](feature-F-AUT.md). Estado conferido no código de `desenvolvimento` (`d7b1a3f`): o `identidade` não tem controller, entidade nem repositório de perfil, seguidor ou solicitação; as doze operações de perfil do OpenAPI seguem `planned`; web e mobile têm só a aba Perfil placeholder de P0-NAV. Corrigidos o estado de P0-MSG e do Cloudinary, e registrados o CORS sem `Idempotency-Key` e os protótipos disponíveis.

### Consolidação 17/09/2026: operações e componentes HTTP alinhados ao contrato canônico expandido de `identidade`; estado físico de tabelas, VIEWs e outbox implantadas separado do estado funcional; schemas de evento ligados diretamente ao catálogo, com envelope, produtor/consumidor e fronteiras de P0-MSG/F-NOT explicitados; dependências e matriz mínima de testes consolidadas sem declarar backend ou clientes implementados.

### Revisão 15/09/2026: impacto das decisões do grupo registrado — extensão de opt-out em F-REC-ALG e ocultação/restauração por suspensão em F-MOD-OPC. Contratos derivados atualizados; implementação não iniciada.

### Revisão 01/09/2026: auto-seguimento/auto-solicitação explicitamente proibidos e protegidos por CHECK no DER.

### Revisão 01/09/2026: contratos de perfil/seguimento passaram a ocultar contas com exclusão pendente e a restaurá-las por cancelamento sem fan-out reverso.

### Revisão 28/08/2026: VIEWs receberam nomes não conflitantes e contratos mínimos de privacidade/seguimento; eventos, idempotência, inbox e listas próprias owner-only foram fechados sem dependência circular com F-NOT e sem criar diretório de usuários. A divergência de listas em RF-SOC-02 foi registrada como pendência de baseline.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-PERFIL no [periodo-1/README.md](README.md), de RF-SOC-01..08 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.9, da RN-08 e da arquitetura §3.1/§4.2/§5.2. Relação de seguimento fixada como contrato de saída de `identidade`; composição de RF-SOC-02 com `leitura`/`social` registrada como pendência de amadurecimento.
