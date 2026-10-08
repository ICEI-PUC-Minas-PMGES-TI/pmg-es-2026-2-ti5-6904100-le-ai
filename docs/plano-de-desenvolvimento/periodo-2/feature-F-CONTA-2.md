# F-CONTA-2 — Exclusão de conta

**Período:** 2 · **Prioridade:** desejavel
**Dono:** Henrique Carvalho · **Serviços afetados:** `identidade` (dono) + `leitura` + `social` + `acervo` (consumidores) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.1 (RF-AUT-07) e §8 (Privacidade e LGPD). Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §4.2, §5.2, §7. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Permitir que o leitor solicite a exclusão, recupere a conta em até **30 dias** e, vencido o prazo, tenha dados e conteúdos removidos definitivamente. Continua [F-AUT](../periodo-1/feature-F-AUT.md). Fecha o requisito **Desejável**:

- **RF-AUT-07** solicitar exclusão, recuperar em até 30 dias e remover definitivamente dados/conteúdo após o prazo.

RNF atendidos: **RNF-SEC-41** (recuperação em 30 dias + remoção definitiva), **RNF-SEC-40/42/44**, **RNF-USA-04**, **RNF-ERR-06/07/10** e **RNF-SEC-35/36**.

> **Tensão de prioridade (baseline).** RF-AUT-07 está classificado **Desejável** e alocado ao Período 2, mas **RNF-SEC-41 pertence ao conjunto de segurança declarado Essencial** (§8). [F-AUT](../periodo-1/feature-F-AUT.md) já registrou que **não** marca RNF-SEC-41 como atendido enquanto o grupo não resolver o agendamento pelo controle de mudança (plano §3). Esta feature **implementa** a capacidade — e, entregue, é o que satisfaz RNF-SEC-41 —, mas **não reclassifica** prioridade nem antecipa a decisão de baseline.

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | implementado | workflow `job-exclusao-conta.yml`, outbox de `conta.excluida` e as três filas de consumo prontos (07 e 08/10/2026); segredos cadastrados no Render e no GitHub em 08/10/2026. Falta o fluxo em DES |
| Backend | implementado | `identidade` em 07/10/2026 (pedir, login de recuperação, cancelar e job, 206 testes) e consumidores de `conta.excluida` em `leitura`, `social` e `acervo` em 08/10/2026; falta o fluxo em DES |
| Web | implementado | 08/10/2026: Excluir conta (Configurações), Exclusão solicitada e Recuperar conta, login de recuperação e política 1.1; 752 testes, lint e build verdes. Conferido no navegador em 08/10 contra o `identidade` local (1440 e 390 px); falta o fluxo em DES |
| Mobile | implementado | 08/10/2026: Excluir conta (Configurações), Exclusão solicitada e Recuperar conta, login de recuperação, limpeza da sessão e do secure storage no `202` e política 1.1; 555 testes (24 novos) e `flutter analyze` verdes. Conferido no emulador em 08/10 (Pixel 8, API 35) contra o `identidade` local; falta o fluxo em DES |

## Especificação

### Backend / API — `identidade` (dono do fluxo)

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas).

- **`DELETE /me/conta`** (RF-AUT-07, RN-23) — exige `Authorization`, **senha atual**, confirmação explícita e `Idempotency-Key`. Registra `exclusao_solicitada_em`, `exclusao_prevista_em = +30 dias` e recibo técnico sem PII; revoga todos os refresh tokens e responde `202` com a data limite. Username/e-mail continuam reservados.
- **Conta pendente:** `v_perfil_referencia_v1` e `v_seguimento_aceito_v1` omitem a conta, ocultando perfil e conteúdo sem remover dados. Login válido emite token curto com escopo exclusivo de recuperação, sem refresh; qualquer outra rota protegida retorna negação.
- **`POST /me/conta/cancelar-exclusao`** — aceita apenas o token restrito, limpa a solicitação, marca o recibo como cancelado e restaura a visibilidade pelas VIEWs. Não publica evento de restauração porque nenhum dado foi apagado.
- **Job diário interno:** processa solicitações vencidas. Na mesma transação, remove identidade, tokens, grafo social e tentativas de login, marca o recibo concluído e grava `conta.excluida` na outbox. Assets e dados dos demais schemas são removidos pelos consumidores.

### Fan-out de limpeza (cross-schema)

A exclusão definitiva atravessa os quatro schemas, e **nenhum serviço lê/escreve tabela de outro**. `conta.excluida` é contrato aprovado e cada serviço remove o que é seu:

| Serviço | Dados do usuário | Ação |
|---|---|---|
| `leitura` | estante/favoritos, leituras, progresso, notas, resenhas, reações, frases, desafios, estatísticas e streak | remover definitivamente; anonimizar ledgers/outbox para retenção técnica |
| `social` | atividades, comentários/respostas, curtidas, notificações, listas, recomendações, denúncias e snapshots | remover definitivamente; reter auditoria/ledgers/outbox somente anonimizados |
| `acervo` | livros pessoais/capas, `nota_leitor_projecao` e importações solicitadas | remover definitivamente; anonimizar ledgers/outbox; livro oficial não é afetado |

Cada consumidor é **idempotente** (RNF-ERR-06) e com **DLQ** (RNF-ERR-07); a mensagem é validada por schema (SEC-32). Payload versionado com `usuarioId`, `eventId`, `occurredAt`, `correlationId` e chave de negócio `usuarioId`.

**Retenção aprovada, incorporada em 15/09/2026:** recibos, ledgers, outboxes e auditoria técnica permanecem por prazo indeterminado **após anonimização**. A limpeza remove referências pessoais, chaves/payloads/respostas/hashes correlacionáveis e texto livre identificável; UUID opaco não basta. Dados de domínio, denúncias e conteúdo da conta continuam sendo removidos após os 30 dias. Expiração de tokens e prazo operacional de replay não mudam: `replay_ate` limita reutilização da resposta, não a retenção do registro anônimo. Outbox pendente é tratada sem perder o evento de limpeza nem republicar conteúdo excluído; publicar/confirmar a limpeza e então anonimizar seu envelope. A matriz final por tabela é item obrigatório antes das migrations.

### Frontend Web (`code/front`)

- **Tela de exclusão:** informa os 30 dias, a ocultação imediata e a remoção definitiva; exige senha e modal destrutivo. Depois da solicitação, limpa a sessão normal. Novo login abre somente a tela de recuperação com data limite e ação `Cancelar exclusão`.

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData`; ao solicitar, limpa **secure storage** e sessão normal. Alvo de demonstração Android.

## Critérios de aceite

- [ ] Solicitar exige senha + modal, responde `202` com prazo de 30 dias, revoga refresh tokens e oculta conta/conteúdo sem apagar dados.
- [ ] Login de conta pendente oferece somente cancelar exclusão; cancelamento dentro do prazo restaura visibilidade sem perda de dados.
- [ ] O job finaliza apenas solicitações vencidas e grava `conta.excluida` atomicamente na outbox.
- [ ] `conta.excluida` remove definitivamente dados e conteúdo em `leitura`, `social` e `acervo`; consumidores são idempotentes e usam DLQ.
- [ ] A operação é registrada em log de auditoria (SEC-35) **sem** dado pessoal excedente (SEC-36).
- [ ] A política de privacidade informa retenção e exclusão (SEC-42).
- [ ] O fluxo de exclusão funciona **em DES** ponta a ponta (identidade → limpeza nos demais serviços).

## Definition of Done

(plano §10)

- [ ] Código (backend `identidade` + consumidores em `leitura`/`social`/`acervo`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração: prazo, ocultação, login restrito, cancelamento, username/e-mail reservados, job vencido, recibo sem PII, inventário por schema e invalidação de sessão
- [ ] Testes assíncronos do fan-out: publicação, consumo idempotente, entrega duplicada e DLQ em cada serviço consumidor (RNF-TST-03)
- [ ] Testes web/mobile cobrem confirmação, login restrito, cancelamento, limpeza de sessão/secure storage e indisponibilidade/timeout (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `identidade` atualizado** com solicitar/cancelar exclusão e endpoint interno do job; schema de `conta.excluida` documentado
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** documentar a matriz de remoção/anonimização, incluindo `anonimizado_em`, FKs opcionais de auditoria e saneamento de eventos pendentes; testar retenção indeterminada sem PII nem conteúdo da conta.

## Plano de implementação

Plano de 07/10/2026, feito a partir do código em `desenvolvimento` (levantamento do `identidade`, dos três consumidores e das telas). Serve para retomar a feature em qualquer máquina ou sessão. Cada etapa termina com testes verdes e com o status acima atualizado. Os caminhos são relativos à raiz do repositório.

| Etapa | Escopo | Situação |
|---|---|---|
| 1 | Contrato: `docs/api/identidade.yaml` e `conta.excluida` em `docs/mensageria` | **concluída em 07/10/2026** |
| 2 | Backend `identidade` (Spring): solicitar, login restrito, cancelar, job e workflow | **concluída em 07/10/2026** |
| 3 | Consumidores de `conta.excluida` em `leitura`, `social` e `acervo` | **concluída em 08/10/2026** |
| 4 | Web (`code/front`) | **concluída em 08/10/2026** e conferida no navegador no mesmo dia |
| 5 | Mobile (`code/mobile`) | **concluída em 08/10/2026** e conferida no emulador no mesmo dia |
| 6 | Fechamento: segredos no Render e no GitHub, DES, status e timeline | **segredos cadastrados em 08/10/2026**; falta o fluxo em DES, depois do merge na `main` |

### O que já existe (levantado em 07/10)

- **Banco do `identidade`**, desde a migration `V20260915120000__completa_schema_identidade.sql`:
  - `usuario.exclusao_solicitada_em` e `usuario.exclusao_prevista_em`, com CHECK de +30 dias exatos;
  - recibo `exclusao_conta` com status `pendente`/`cancelada`/`concluida`, `replay_ate`, `anonimizado_em`, CHECK de anonimização e índice `exclusao_conta_processamento_idx`;
  - `refresh_token`, `reset_token`, `seguidor` e `solicitacao_seguir` com `ON DELETE CASCADE` para `usuario`;
  - `tentativa_login` sem FK, que precisa ser apagada pela identidade (e-mail e username).

  **Não há migration prevista.** Se aparecer alguma, ela passa por revisão humana antes de subir.
- **VIEWs** `v_perfil_referencia_v1` e `v_seguimento_aceito_v1`: já omitem a conta com `exclusao_solicitada_em` preenchida. A ocultação no pedido não exige mudança em nenhum outro serviço.
- **Outbox** `outbox_identidade` com dispatcher (`messaging/OutboxDispatcherService.java`). Exchange `leai.events.identidade`. Tipo novo exige schema em `src/main/resources/messaging/schemas/` e registro no `MessageValidator`.
- **Consumidores** com recibo idempotente, retry e DLQ nos três serviços:
  - `social`: `messaging/AmqpConsumerService.java`, no molde de `notificacao/service/ConsumidorDeNotificacao.java`;
  - `acervo`: `src/messaging/amqp-consumer.service.ts`, no molde de `src/livros/sinopse/sinopse.consumer.ts`;
  - `leitura`: o mesmo runtime do `acervo`, ainda sem nenhum consumidor registrado. `conta.excluida` será o primeiro.
- **Job agendado:** o modelo é `.github/workflows/job-inatividade.yml` com `code/back/leitura/src/jobs/inatividade/api/scheduler-token.guard.ts`: header `X-Scheduler-Token`, comparação em tempo constante e `Idempotency-Key`.
- **Falta tudo no código:**
  - nada lê ou grava `exclusao_conta`;
  - não existe token restrito, e o login e o refresh não olham `exclusao_solicitada_em`;
  - o `identidade` não tem endpoint interno nem workflow;
  - não há schema de `conta.excluida`;
  - nenhum serviço tem credencial para apagar asset do Cloudinary.

### Decisões do dono (07/10/2026)

- **Token restrito com chave própria.** O acesso de recuperação é assinado com uma chave separada. `leitura`, `social` e `acervo` o recusam com 401 pela assinatura, sem nenhuma mudança neles. **Ajuste na implementação (07/10/2026):** a chave é derivada do `JWT_SECRET` por HMAC, em vez de vir de um segredo novo `JWT_RECUPERACAO_SECRET`. O efeito é o mesmo, porque os outros serviços validam com o `JWT_SECRET` cru, e não é preciso cadastrar mais um segredo no Render. Ele vale 15 minutos, sem refresh, e o `identidade` só o aceita em `POST /me/conta/cancelar-exclusao`.
- **Senha errada em `DELETE /me/conta`:**
  - responde 422 `ENTIDADE_NAO_PROCESSAVEL`, como o "alterar senha" da F-AUT;
  - depois de 5 erros em 15 minutos por usuário, responde 429 `MUITAS_REQUISICOES` (`LimitePorUsuario`);
  - isso cobre os estados "Senha incorreta" e "Muitas tentativas" de `excluir-conta.md`.
- **Conteúdo de outros pendurado no da conta é apagado junto**, pelo CASCADE que o modelo já tem. Isso inclui:
  - comentários e curtidas nas atividades da conta;
  - respostas abaixo dos comentários-raiz dela;
  - reações às resenhas dela.
- **Assets do Cloudinary são apagados de verdade** (RN-23.7): o avatar pelo `identidade` e as capas de livro pessoal pelo `acervo`. Para isso, os dois serviços recebem `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`.
- **Padrões adotados, sem decisão em aberto:**
  - o job roda todo dia às 06:00 UTC, como o de inatividade, e finaliza só as solicitações com `prevista_em <= now()`;
  - o cancelamento vale até a finalização, e pode ser feito até o job rodar;
  - a resposta do login restrito traz as duas datas e é distinguível do login normal.

### Etapa 1: contrato

- **`docs/api/identidade.yaml`**: remover a frase que tira o RF-AUT-07 do contrato (por volta da linha 24) e incluir:
  - **`DELETE /me/conta`**:
    - corpo `{senha, confirmacao: true}` e `Idempotency-Key`;
    - `202 {exclusaoSolicitadaEm, exclusaoPrevistaEm}`;
    - erros: 422 para senha errada ou confirmação ausente, 429, e 403 para a conta administradora.
  - **`POST /auth/login`**: a resposta ganha a variante de recuperação `{tipo: "recuperacao_exclusao", accessToken, expiresIn: 900, exclusaoSolicitadaEm, exclusaoPrevistaEm, username, nomeExibicao}`, sem `refreshToken`. O login normal passa a trazer `tipo: "sessao"`, uma mudança aditiva.
  - **`POST /auth/renovar`**: conta pendente responde 401, porque os refresh já foram revogados no pedido.
  - **`POST /me/conta/cancelar-exclusao`**:
    - aceita só o token de recuperação, com `Idempotency-Key`;
    - responde 204;
    - prazo vencido responde 410 `RECURSO_EXPIRADO`;
    - token normal responde 401.
  - **`POST /internal/jobs/exclusao-conta`**:
    - exige `X-Scheduler-Token` e `Idempotency-Key`;
    - responde 200 com `{finalizadas}`;
    - sem token responde 401.
- **`docs/mensageria`**:
  - criar `schemas/conta.excluida.v1.schema.json` com `data: {usuarioId}` e chave de negócio `conta:<usuarioId>`;
  - incluir o evento em `catalogo.md`;
  - filas `leai.leitura.conta`, `leai.social.conta` e `leai.acervo.conta`, cada uma com sua `.dlq`;
  - copiar o schema para cada serviço consumidor.

### Etapa 2: backend `identidade`

- **Configuração:**
  - `AppProperties` ganha `jwtRecuperacaoSecret`, `schedulerToken`, `cloudinaryApiKey` e `cloudinaryApiSecret`;
  - `.env.example` e `render.yaml` atualizados.
- **Token de recuperação:**
  - `JwtConfig` ganha um par encoder/decoder de recuperação;
  - `SecurityConfig` ganha uma `SecurityFilterChain` própria (`securityMatcher` em `/me/conta/cancelar-exclusao`) com esse decoder;
  - a cadeia principal continua com o decoder normal, então o token de recuperação falha lá com 401;
  - `EmissorDeToken.emitirRecuperacao` usa `escopo=recuperacao_exclusao` e 15 minutos.
- **Login** (`ServicoDeAutenticacao.entrar`): depois da senha válida, conta com `exclusao_solicitada_em` preenchida recebe o token de recuperação, sem `sessaoPara`. `renovar` recusa conta pendente.
- **Solicitar** (`ServicoDeExclusaoDeConta`, pacote novo `conta/`), no molde de `alterarSenha`:
  - bloqueia a conta administradora;
  - trava a linha com `buscarParaAtualizar` e confere a senha;
  - grava as duas datas por JDBC (`exclusao_prevista_em` não está mapeada na entidade) e o recibo `exclusao_conta`;
  - revoga os refresh com `revogarAtivos`;
  - grava um log de auditoria só com o UUID;
  - idempotência pelo `ServicoDeIdempotencia`, com operações novas em `OperacaoIdempotente`.
- **Cancelar:**
  - limpa as datas e marca o recibo como `cancelada`;
  - não publica evento (RN-23.4).
- **Job** (`/internal/jobs/exclusao-conta`, rota pública protegida por um filtro de `X-Scheduler-Token`). Para cada recibo vencido, em uma transação:
  1. ler `avatar_asset_id`, e-mail e username;
  2. apagar `tentativa_login` e `usuario` (o CASCADE leva tokens e o grafo social);
  3. anonimizar `idempotencia_identidade` do usuário e as linhas publicadas da outbox que o citam, e apagar as pendentes que o citam;
  4. concluir e anonimizar o recibo;
  5. gravar `conta.excluida` na outbox.

  Depois do commit, apagar o avatar no Cloudinary. Uma falha nessa parte fica no log e não desfaz a exclusão.

  Na mesma execução, anonimizar os envelopes de `conta.excluida` já publicados.
- **Workflow:** `.github/workflows/job-exclusao-conta.yml`, cópia do de inatividade, com os segredos `IDENTIDADE_URL` e `IDENTIDADE_SCHEDULER_TOKEN`.
- **Testes de integração** em `integracao/`, no molde de `AlterarSenhaIntegracaoTest`. Casos:
  - pedido 202 com as datas;
  - senha errada 422 e 429 no sexto erro;
  - admin 403;
  - refresh revogado;
  - perfil fora das VIEWs;
  - login restrito sem refresh;
  - token restrito recusado em `GET /me`;
  - token normal recusado no cancelar;
  - cancelar restaura;
  - prazo vencido 410;
  - username e e-mail reservados durante o prazo;
  - job só finaliza vencidos;
  - recibo anonimizado;
  - evento na outbox;
  - token do job ausente ou errado 401.

  Teste de schema do evento no molde de `EventosDePerfilSchemaTest`.

### Etapa 3: consumidores

Cada consumidor apaga o que é do próprio serviço em uma transação, junto do recibo de `mensagem_processada`. Repetir o evento não tem efeito (RNF-ERR-06), e a falha vai para a DLQ (RNF-ERR-07). Linhas pendentes da outbox que citam o usuário são **apagadas**, porque o CHECK de `leitura` e `social` só permite anonimizar linha publicada, e publicá-las republicaria conteúdo excluído.

| Serviço | Apaga | Anonimiza |
|---|---|---|
| `leitura` | `reacao_resenha` do usuário; `resenha` (leva as reações de outros); `frase`, `favorito`, `nota`; `estante` (leva leitura, progresso e limiar); `desafio` (leva janela, contribuição e pausa); `sequencia_leitura`, `dia_leitura`, `estatistica_usuario`, `estatistica_mensal` e `estatistica_anual` | `idempotencia_leitura` por `subject_ref`; `outbox_leitura` publicada com o usuário em `payload` ou `chave_negocio` |
| `social` | antes de tudo, guardar os `origem_id` de resenha das atividades do usuário; `denuncia` feita por ele ou contra comentário ou resenha dele; `atividade` (leva curtidas e comentários de outros); `curtida_atividade` e `comentario` dele (leva as respostas abaixo); `comentario_mencao` dele; `lista` (leva os itens); `recomendacao` enviada ou recebida; `sugestao_descartada`; `notificacao` para ele ou com ele como ator ou autor da atividade; `preferencia_notificacao`; `dispositivo_push` | `comentario.respondido_usuario_id` de outros := NULL; `log_moderacao` com alvo dele (`alvo_id`, `denuncia_id` e `detalhe`); `idempotencia_social`; `outbox_social` publicada |
| `acervo` | livros `pessoal` do dono, depois de apagar as capas no Cloudinary (leva projeções e agregados do próprio livro); `nota_leitor_projecao` dele, recalculando `nota_livro_agregada` dos livros afetados; `importacao_livro` solicitada por ele | `idempotencia_acervo`; `outbox_acervo` com o usuário no payload |

O livro oficial nunca é afetado. Em cada serviço, há testes de integração para:
- a matriz inteira, com massa de dois usuários, para provar que o outro fica intacto;
- a entrega duplicada;
- o envelope inválido indo para a DLQ;
- a retenção dos registros técnicos sem dado pessoal.

Os consumidores ficam no código de outros donos, como prevê a [divisão do Período 2](README.md#o-que-ainda-cruza-entre-pessoas), e são avisados no grupo.

### Etapa 4: web

- **Serviços:**
  - `services/conta.ts` com `solicitarExclusao` e `cancelarExclusao`, e `novaChaveIdempotencia` por intenção;
  - `services/auth.ts`: `entrar` passa a distinguir `tipo: "recuperacao_exclusao"`.
- **Sessão** (`session.ts`): estado de recuperação separado da sessão normal, guardado só em memória e descartado ao sair, ao cancelar ou ao expirar.
- **Rotas:**
  - `perfil/configuracoes/excluir-conta` no shell;
  - `/conta/exclusao-solicitada` e `/conta/recuperar` fora do shell;
  - a `guardaDeSessao` respeita o estado de recuperação.
- **Telas:**
  - `ExcluirContaView.vue`, com senha, caixa de confirmação e `DialogoConfirmacao` destrutivo;
  - `ExclusaoSolicitadaView.vue`;
  - `RecuperarContaView.vue`, com "Faltam N dias", a faixa `ambar` no último dia e o estado "Acesso expirado";
  - item `Excluir conta` em `ConfiguracoesView.vue`;
  - texto da política em `PoliticaDePrivacidade.vue`.
- **Testes Vitest:** confirmação, senha errada, 429, erro reenviando com a mesma chave, login restrito, cancelar, acesso expirado e timeout.

### Etapa 5: mobile

- **Serviços:**
  - `features/conta/exclusao_service.dart`;
  - `auth_service.dart` distingue o login de recuperação;
  - `SessionController` ganha o estado de recuperação, guardado só em memória e não no secure storage.
- **Exclusão solicitada:** limpa o `TokenStore` e a sessão antes de mostrar a tela.
- **Telas e rotas:**
  - `excluir_conta_page.dart`, empilhada pelas Configurações, com confirmação em `mostrarFolhaInferior`;
  - `exclusao_solicitada_page.dart` e `recuperar_conta_page.dart`, fora do shell;
  - rotas em `app/router.dart`;
  - linha `Excluir conta` em `configuracoes_page.dart`;
  - texto em `politica_de_privacidade.dart`.
- **Testes:** os mesmos casos da web, com `MockClient`, e a limpeza do secure storage.

### Etapa 6: fechamento

- **Segredos no Render:**
  - `identidade`: `SCHEDULER_TOKEN`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` (já declarados no `render.yaml`);
  - `acervo`: as duas do Cloudinary.
- **Segredos no GitHub:** `IDENTIDADE_URL` e `IDENTIDADE_SCHEDULER_TOKEN`.
- **Ponta a ponta em DES:** pedir, cancelar e pedir de novo. Depois, com uma conta de teste cujo prazo foi antecipado no banco de DES (operação manual, combinada com o grupo), disparar o job por `workflow_dispatch` e conferir a limpeza nos quatro schemas. O endpoint não aceita data de referência: um parâmetro desses permitiria finalizar uma conta antes dos 30 dias.

### Verificação

- `identidade` e `social`: `./mvnw verify` com `DATABASE_URL_TESTE` em Postgres descartável.
- `leitura` e `acervo`: `npm run lint && npm test && npm run test:integration` com `DATABASE_URL_TESTE`.
- Web: `npm run lint && npm test && npm run build`.
- Mobile: `flutter analyze && flutter test && flutter build apk --debug`.

## Pendências

- **Token de acesso normal depois do pedido (07/10/2026).** O pedido revoga todas as renovações, mas o token de acesso já emitido continua válido até expirar (no máximo 15 minutos), porque ele não tem estado (RNF-ARQ-04), como no logout da F-AUT. Os clientes descartam a sessão ao receber o 202. No servidor, o conteúdo da conta já fica oculto para os outros pelas VIEWs. Fica registrado como risco residual do RN-23.3, sem mudança prevista.
- **Resíduos conhecidos da limpeza (08/10/2026), sem mudança prevista:**
  - O `social` não guarda as frases da conta, então o `log_moderacao` de uma frase dela continua com `alvo_id` (UUID opaco de um registro que não existe mais) e `detalhe`.
  - Texto livre de outros leitores que cita `@username` da conta excluída fica como está. Depois da exclusão, o username deixa de identificar uma conta (RN-23.6).
  - Respostas idempotentes de outros leitores que ecoem algum dado da conta só são anonimizadas quando vence o `replay_ate` delas, nos serviços que limpam por janela.
- **Web: divergências do protótipo (08/10/2026), a conferir na revisão visual:**
  - Na web, `Excluir conta` abre como tela empilhada sobre Configurações, igual a `Alterar senha` hoje, e não na coluna direita das Configurações com o item aberto (`excluir-conta.md` §5). O título da página vem do header do shell (`Excluir conta`), e o `Excluir sua conta` aparece como `h2` acima da abertura.
  - Abaixo de 768px, a confirmação usa o `DialogoConfirmacao` do projeto (a `SobreposicaoModal` vira folha), com o foco inicial em `Cancelar`.
  - A caixa de confirmação é o checkbox nativo com `accent-musgo`, de 20px, e não um desenho próprio com `Check` de 14px.
  - Sem o e-mail (`GET /me` falhou), a consequência 4 cita só o `@username`.
  - O acesso de recuperação fica só em memória: recarregar `/conta/recuperar` leva ao login, e a pessoa entra de novo. A tela `Exclusão solicitada` recebe a data pela query (`?ate=`) e sobrevive ao recarregar.
- **Mobile: divergências do protótipo (08/10/2026), conferidas no emulador e mantidas:**
  - O header de `Excluir conta` tem o divisor sempre visível, a mesma simplificação do `CabecalhoTela` em todo o app, e não só quando o conteúdo rola por baixo.
  - Os dias que faltam (`Faltam 23 dias`) estão em `caption` `grafite`, como na web, e não em `num-inline`.
  - A folha de confirmação é a `confirmarAcaoDestrutiva` do projeto, que não põe o foco inicial em `Cancelar`.
  - Durante o envio, a seta de voltar continua desenhada, mas não responde (o `PopScope` também segura o voltar do sistema).
  - O acesso de recuperação fica só em memória: fechar o app na tela de recuperação leva ao login na próxima abertura.
- ~~**Credencial do Cloudinary a criar (dono, etapa 6).** Gerar a API key e o secret no painel do Cloudinary e cadastrar em `identidade` e `acervo` no Render. Sem elas, o job registra o `publicId` no log e o avatar fica no Cloudinary.~~ — **resolvida em 08/10/2026:** chave própria criada no Cloudinary e cadastrada em `identidade` e `acervo` no Render.

- **Depende de** [F-AUT](../periodo-1/feature-F-AUT.md) (sessão, invalidação de refresh, modelo `usuario`), [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (grafo de seguidores a limpar) e das features que detêm dados do usuário nos demais serviços ([F-EST](../periodo-1/feature-F-EST.md)/[F-PRG](../periodo-1/feature-F-PRG.md)/[F-AVA](../periodo-1/feature-F-AVA.md)/[F-EST-2](feature-F-EST-2.md), [F-FEED](../periodo-1/feature-F-FEED.md)/[F-NOT](../periodo-1/feature-F-NOT.md), [F-ACV-CADASTRO](../periodo-1/feature-F-ACV-CADASTRO.md)); [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md) (broker do fan-out).
- **Divergência de baseline — prioridade:** RF-AUT-07 é Desejável (P2), mas RNF-SEC-41 é Essencial (§8). O grupo deve resolver o agendamento pelo controle de mudança (plano §3); esta feature não altera a baseline.
- **Depende também de** F-AVA-2, F-DSF, F-STA, F-GAM, F-LST, F-REC-P2P e F-MOD para fechar o inventário dos dados criados no Período 2.
- **Alternativa a avaliar, sem mudar o desenho atual:** verificar se o recibo `exclusao_conta` pode reutilizar a infraestrutura do ledger idempotente sem perder o estado dos 30 dias.
- Stack de cada serviço definida (arquitetura §2.1): `identidade`/`social` em Spring, `acervo`/`leitura` em NestJS.
- **Telas (design P2):** [`excluir-conta.md`](../../design/periodo-2/F-CONTA-2/excluir-conta.md) ([protótipo](../../design/periodo-2/F-CONTA-2/prototipos/excluir-conta.html)) (W+M; mobile em tela empilhada pelas Configurações, web na coluna direita das Configurações; senha, caixa de confirmação explícita e confirmação destrutiva; termina em `Exclusão solicitada` sem shell) e [`recuperar-conta.md`](../../design/periodo-2/F-CONTA-2/recuperar-conta.md) ([protótipo](../../design/periodo-2/F-CONTA-2/prototipos/recuperar-conta.html)) (W+M, sem shell, data limite, `Cancelar exclusão` e `Sair`; depois de cancelar volta ao login), prompts escritos e protótipos exportados em 29/09/2026. A entrada `Excluir conta` e o texto novo da política (versão 1.1, mock) entram na edição consolidada [`configuracoes.md`](../../design/periodo-2/configuracoes/configuracoes.md) ([protótipo](../../design/periodo-2/configuracoes/prototipos/configuracoes.html)). Decisões a ratificar: linha `Excluir conta` sem `rubi`, confirmação em bottom sheet no mobile (o modal de sair do P1 é card centrado), caixa de marcar além do modal, faixa `ambar` só no último dia, `Sair` da recuperação sem confirmação. **Contratos a confirmar** (resolvidos no [plano de 07/10/2026](#decisões-do-dono-07102026)): resposta e rate limit da senha errada em `DELETE /me/conta`; login restrito devolvendo `exclusao_solicitada_em`/`exclusao_prevista_em` e distinguível do normal; cancelamento sem sessão normal (o protótipo volta ao login); validade do acesso restrito (estado `Acesso expirado`); se o dia limite conta como "até" e a hora do job. **Conflito:** a política ainda diz "Registros de acesso ficam por 6 meses", e a RN-23.7 fixa retenção técnica indeterminada após anonimização; o texto final é do grupo.

## Timeline

### Revisão 15/09/2026: grupo aprovou retenção técnica/auditoria sem prazo, exclusivamente anonimizada; mantidos os 30 dias e a remoção de conteúdo/dados pessoais. DER e critérios de limpeza ajustados; implementação não iniciada.

### Revisão 01/09/2026: janela de recuperação fixada em 30 dias, login restrito e cancelamento definidos; remoção passou a ocorrer somente após o prazo, por job + `conta.excluida` em outbox, com limpeza física nos quatro schemas.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-CONTA-2 no [periodo-2/README.md](README.md), de RF-AUT-07 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.1 e dos RNF de LGPD §8. Fan-out de limpeza cross-schema descrito como contrato pretendido; tensão RNF-SEC-41 × RF-AUT-07, evento fora dos fluxos fechados e política anonimizar-vs-remover registrados como pendências de baseline, sem reclassificação autônoma.

### Revisão 29/08/2026: inventário de limpeza passou a incluir os dados criados no Período 2 e corrigiu o ownership de avatar/capas. A idempotência foi definida por recibo técnico curto e resposta `202`, sem exigir reautenticação impossível depois da exclusão nem introduzir orquestração adicional.

### Dono 29/09/2026: feature atribuída a **Henrique Carvalho** na [divisão do Período 2](README.md#divisão-do-período-2-entre-5-pessoas).

### Plano 07/10/2026: plano de implementação em seis etapas escrito a partir do código em `desenvolvimento`, com a matriz de remoção e anonimização por tabela dos três consumidores. Decisões do dono: token de recuperação com chave própria, senha errada com 422 e limite de 5 erros em 15 minutos, conteúdo de outros pendurado no da conta apagado junto e assets do Cloudinary apagados de verdade. Os contratos a confirmar da pendência de telas ficaram resolvidos no plano, exceto o texto da política, que é do grupo.

### Contrato 07/10/2026: etapa 1 concluída. `identidade.yaml` ganhou `DELETE /me/conta`, `POST /me/conta/cancelar-exclusao` e `POST /internal/jobs/exclusao-conta` (status `planned`), a variante `AcessoDeRecuperacao` no login (discriminada por `tipo`), o 401 de conta pendente no refresh e os esquemas de segurança `recuperacaoAuth` e `schedulerToken`. O spec segue válido no Redocly, com os mesmos 4 avisos de antes. `conta.excluida.v1` criado em `docs/mensageria/schemas/` e incluído no catálogo, com as filas `leai.<servico>.conta`.

### Backend identidade 07/10/2026: etapa 2 concluída. Pacote `conta/` com `DELETE /me/conta`, `POST /me/conta/cancelar-exclusao` e `POST /internal/jobs/exclusao-conta`. O login passou a devolver `RespostaDeLogin` (sessão normal ou acesso de recuperação, pelo campo `tipo`), e o refresh recusa conta pendente. A rota de cancelar tem cadeia própria no `SecurityConfig`, com o decoder de recuperação; a chave é derivada do `JWT_SECRET` (ajuste em Decisões do dono). O job finaliza uma conta por transação: apaga `tentativa_login` e `usuario` (o CASCADE leva tokens e grafo social), anonimiza recibos de idempotência e eventos que citam a conta, apaga eventos pendentes e recibos cancelados dela, conclui e anonimiza o recibo e grava `conta.excluida`; o avatar é apagado no Cloudinary depois do commit (`RemocaoDeAsset`). Na mesma execução, anonimiza os envelopes de `conta.excluida` já publicados e os recibos de idempotência fora da janela de replay. Workflow `job-exclusao-conta.yml` (06:00 UTC); `SCHEDULER_TOKEN` e as credenciais do Cloudinary declarados no `render.yaml` e no `.env.example`. `identidade.yaml` passou as três rotas para `implemented`. `./mvnw verify` com Postgres descartável: 206 testes, nenhuma falha (11 de integração em `ExclusaoDeContaIntegracaoTest`, 1 em `AdminIntegracaoTest` e 3 em `ContaExcluidaSchemaTest`). Sem migration.

### Consumidores 08/10/2026: etapa 3 concluída. `conta.excluida` tem consumidor nos três serviços, com fila própria no exchange do `identidade`:

- **`acervo`** (`src/conta/`): apaga livros pessoais e capas no Cloudinary, projeção de nota com recálculo do agregado, e importações; anonimiza recibos e outbox. Unitários: 302. Integração: 143 (4 novos).
- **`leitura`** (`src/conta/`, primeiro consumidor do serviço): apaga reações, resenhas, frases, favoritos, notas, estante, desafios, sequência e estatísticas; anonimiza recibos e outbox. O runtime do `leitura` não validava o `data` no consumo, então o consumidor chama `validarDados` antes de qualquer efeito. Unitários: 209. Integração: 212 (3 novos).
- **`social`** (`conta/service/ConsumidorDeContaExcluida`): apaga atividades, comentários, menções, curtidas, listas, recomendações, sugestões, notificações, preferências, dispositivos e denúncias ligadas à conta; anonimiza `log_moderacao`, recibos e outbox. `./mvnw verify`: 194 testes (6 novos).

Matriz na Etapa 3 e resíduos conhecidos em Pendências. Junto, `npm audit fix` sem quebra no `leitura` (`proxy-addr`), que deixava o CI vermelho desde o commit do contrato. `AGENTS.md` dos três serviços registram a mudança. Catálogo de mensageria sem a marca de planejado.

### Web 08/10/2026: etapa 4 implementada em `code/front`.

- **Configurações:** linha e item `Excluir conta`, que abrem `/perfil/configuracoes/excluir-conta` (`views/conta/ExcluirContaView.vue`). A tela tem as quatro consequências com a data limite calculada no aparelho, senha, caixa de confirmação, aviso, botão destrutivo e o `DialogoConfirmacao`. Senha errada (422) vira banner `rubi` com o campo limpo e a caixa marcada; o limite (429) vira alerta `ambar` com o campo desabilitado; a falha de rede preserva a senha e reenvia com a mesma chave. No `202`, a sessão local é apagada antes de ir para `/conta/exclusao-solicitada?ate=<data do servidor>`.
- **Login:** `services/auth.ts` distingue `tipo: recuperacao_exclusao`. O acesso de recuperação fica só em memória (`contaEmExclusao.ts`), e o login leva a `/conta/recuperar` (`RecuperarContaView.vue`), com data, "Faltam N dias", faixa `ambar` no último dia, cancelar (mesma chave a cada reenvio), erro, acesso vencido (401, com `Entrar de novo`), `Conta recuperada` e `Sair` sem confirmação.
- **Componentes:** `LayoutAutenticacao` ganhou `somenteMarca` (coluna esquerda só com o lockup) e `EstadoTerminal` ganhou o tom `grafite`.
- **Política:** versão 1.1, com retenção e exclusão (SEC-42), no texto de `configuracoes.md`. O conflito "Registros de acesso ficam por 6 meses" continua com o grupo.
- **Testes:** `npm run lint`, `npm test` (752 testes, 18 novos) e `npm run build` verdes.

Divergências na pendência "Web: divergências do protótipo". Conferência no navegador na entrada seguinte.

### Conferência web 08/10/2026: fluxo da etapa 4 percorrido no Chrome headless contra o `identidade` local (banco de dev, mensageria desligada), com a conta de teste `teste.conta2` (`conta2@teste.leai.invalid`), em 1440 e 390 px: item `Excluir conta` nas Configurações, botão desabilitado sem senha e sem a caixa, confirmação (modal no desktop, folha no celular), senha errada com 422 e banner `rubi` mantendo a caixa marcada, `202` com a sessão local apagada e `Exclusão solicitada` com a data do servidor (sobrevive ao recarregar), login de recuperação levando a `/conta/recuperar` com "Faltam 30 dias", cancelamento com `204` e `Conta recuperada`, e login normal de volta. Nenhuma correção necessária. A conta de teste ficou ativa no banco de dev para a conferência do mobile.

### Mobile 08/10/2026: etapa 5 implementada em `code/mobile`.

- **Login:** `AuthService.entrar` devolve `LoginComSessao` ou `LoginDeRecuperacao`, pelo campo `tipo`. O acesso de recuperação (`core/session/acesso_de_recuperacao.dart`) fica só em memória no `SessionController`, nunca no secure storage; guardá-lo avisa o roteador, e a guarda leva do login a `/conta/recuperar`. Cadastro e alterar senha tratam o tipo novo sem mudar de comportamento.
- **Excluir conta:** linha nova no fim do grupo `Privacidade e dados` das Configurações, que abre `configuracoes/excluir-conta` (`excluir_conta_page.dart`), com as quatro consequências, senha, caixa de confirmação própria (20px, `musgo` quando marcada), a folha destrutiva, o banner `rubi` da senha errada (campo limpo e com foco, caixa marcada), o alerta `ambar` do limite, a falha de envio com a mesma chave no reenvio e o aviso de cold start. No `202`, o roteador limpa a sessão e o secure storage antes de ir para `/conta/exclusao-solicitada?ate=`; o voltar do sistema ali leva ao login.
- **Recuperar conta:** `recuperar_conta_page.dart`, fora do shell, com data, dias que faltam, faixa `ambar` no último dia, cancelar com a mesma chave, erro, acesso vencido (`Entrar de novo`, sem `Sair`), `Conta recuperada` e `Sair` sem confirmação.
- **Política:** versão 1.1 com o texto da web.
- **Testes:** `flutter analyze` sem avisos e `flutter test` com 555 testes, 24 novos (`test/features/conta/exclusao_test.dart` e quatro de rota em `router_test.dart`).

A conferência no emulador fica pendente: esta máquina não tem o Android SDK. Divergências na pendência "Mobile: divergências do protótipo".

### Testes de indisponibilidade 08/10/2026: web e mobile ganharam os casos de cold start (`Excluindo`/`Cancelando` com o aviso, sem erro) e de timeout (vira o erro de envio ou de cancelamento, com a senha e o acesso de recuperação preservados), que o DoD pede (RNF-TST-05/06): 17 testes no `views/conta` da web e 23 em `exclusao_test.dart` no mobile. Desde esta data o dono desenvolve na branch `henrique-features`, levada à `desenvolvimento` por PR; CI verde nela (`ci-front` e `ci-mobile`).

### Conferência no emulador 08/10/2026: fluxo da etapa 5 percorrido no Pixel 8 (API 35) contra o `identidade` local (banco de dev, mensageria desligada), com a conta `teste.conta2`: linha `Excluir conta` nas Configurações, tela com o botão desabilitado em outline `rubi` a 40%, senha errada (banner `rubi`, campo limpo com foco e borda de erro, caixa marcada), `202` levando a `Exclusão solicitada` com a data do servidor, voltar do sistema levando ao login, login de recuperação com "Faltam 30 dias", cancelamento e `Conta recuperada`. **Uma correção:** a folha de confirmação abria pelo navegador da aba e ficava acima da barra inferior, fora do scrim (§4.3 pede a barra sob o scrim, sem resposta ao toque). Passou a abrir pelo navegador raiz, como as outras folhas do app, e foi conferida de novo no emulador. A conta de teste continua ativa no banco de dev. O Android SDK foi instalado nesta máquina para a conferência.

### Segredos 08/10/2026: etapa 6, parte de configuração, feita pelo dono. Render: `SCHEDULER_TOKEN`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` no `leai-identidade`, e as duas do Cloudinary no `leai-acervo` (chave própria criada no Cloudinary para a exclusão). GitHub: `IDENTIDADE_URL` e `IDENTIDADE_SCHEDULER_TOKEN`, com o mesmo token do Render. Os dois serviços responderam `/health` 200 depois do redeploy. Os valores só passam a ter efeito quando o código da F-CONTA-2 chegar à `main`; falta o fluxo em DES.
