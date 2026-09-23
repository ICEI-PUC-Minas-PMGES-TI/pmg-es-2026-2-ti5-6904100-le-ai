# F-ACV-CADASTRO — Cadastro de livros (ISBN + pessoal)

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** Vicenzo Fonseca · **Serviços afetados:** `acervo` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2 (RF-ACV-05..09), RN-02, RN-03. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §2.2, §2.5, §3.2, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Permitir que o leitor **acrescente livros ao sistema** por dois caminhos — o **livro oficial por ISBN** (buscado em fonte externa) e o **livro pessoal** cadastrado à mão — cobrindo o acervo que a ingestão em massa não trouxe. Fecha os requisitos **Essenciais**:

- **RF-ACV-05** cadastrar um livro na base oficial **informando o ISBN**; o sistema busca metadados em fonte externa e cria o registro;
- **RF-ACV-06** ISBN **não encontrado** em nenhuma fonte → mensagem específica + oferta de **cadastro pessoal**;
- **RF-ACV-07** ISBN **já existente** na base oficial → **bloqueia** e direciona à página do livro existente;
- **RF-ACV-08** cadastrar um **livro pessoal** (título, autor, nº páginas e, opcionalmente, sinopse e capa por upload);
- **RF-ACV-09** **editar e excluir** os livros pessoais que cadastrou.

RNF atendidos: **RNF-SEC-38** (ISBN validado por formato + dígito verificador; **URL da fonte construída pelo servidor por allowlist**, nunca URL do usuário), **RNF-SEC-39** (timeout, limite de resposta, sem redirecionamento fora da allowlist), **RNF-SEC-18** (rate limiting no cadastro por ISBN), **RNF-SEC-20** (upload de capa valida tipo/tamanho/dimensões), **RNF-SEC-02** (propriedade do livro pessoal validada no servidor), **RNF-SEC-33** (dado externo validado/normalizado antes de persistir), **RNF-ERR-08** (resiliência da chamada externa: timeout, backoff, circuit breaker), **RNF-USA-04** (confirmação na exclusão). Imagens: **Cloudinary** (P-09).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra / Dados | em andamento | tabelas, VIEWs, allowlist e o recibo `mensagem_processada` (migrations de P0-MSG) implantados. Faltam o preset unsigned do Cloudinary (P-09) e `AMQP_URL` preenchida no painel do Render |
| Backend | implementado | `acervo`: as sete operações e o **consumidor ligado ao runtime AMQP de P0-MSG** desde 22/09/2026. 168 testes unitários e 32 de integração contra Postgres; ponta a ponta verificado localmente com RabbitMQ e OpenLibrary reais |
| Web | não iniciado | prompts e protótipos prontos; implementação não começou |
| Mobile | implementado | as quatro telas em `code/mobile/lib/features/livros/`, 99 testes do app verdes; **não rodado em emulador** (a máquina da sessão não tinha AVD) |
| Design | concluído, com divergências | prompts e protótipos HTML versionados em `docs/design/periodo-1/F-ACV-CADASTRO/`; divergências registradas em Pendências |

## Especificação

### Backend / API — `acervo`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Todas as escritas aceitam `Idempotency-Key` conforme o [README do período](README.md#regras-de-implementação-compartilhadas). O contrato HTTP canônico é `docs/api/acervo.yaml`, atualmente marcado como `planned`; a existência das tabelas e VIEWs não torna estas operações implementadas.

- **`POST /livros/oficial`** (`operationId: solicitarImportacaoPorIsbn`; RF-ACV-05, RF-ACV-06, RF-ACV-07) — recebe `SolicitarImportacao`, com **apenas o ISBN** (nunca uma URL — SEC-38), e exige `Idempotency-Key`. Fluxo:
  1. **Valida** formato e **dígito verificador** do ISBN-13 (SEC-38);
  2. Se o ISBN **já existe** na base oficial (RN-02: ISBN-13 é chave natural única) → **`409`** com o id do livro existente, para o cliente **redirecionar à página** (RF-ACV-07);
  3. Senão, grava `importacao_livro` e a linha de `outbox_acervo` de **`livro.importacao_solicitada`** na mesma transação e responde **`202`** com `ImportacaoAceita { importacaoId, status: pendente }` e header `Location`, sem aguardar o broker ou as fontes externas;
  4. O consumidor busca metadados na ordem **OpenLibrary → Google Books**, com URL construída pelo servidor a partir de allowlist (SEC-38/39), `User-Agent`, timeout, limite de resposta, retentativa com backoff, circuit breaker e proibição de redirect fora da allowlist (SEC-39, RNF-ERR-08);
  5. Dados externos são **validados e normalizados antes de persistir** (SEC-33), como na ingestão (RN-12);
  6. Se nenhuma fonte conhecer o ISBN, encerra como `nao_encontrado`. Durante retentativas por indisponibilidade, permanece `pendente`; somente após esgotar a política passa a `falha_transitoria`, sem confundir ausência com falha do provedor.
  - **`GET /livros/importacoes/{id}`** (`operationId: obterImportacaoPorIsbn`) retorna `Importacao` com `pendente | concluida | nao_encontrado | falha_transitoria`; em `concluida`, `livroId` é preenchido; `permiteCadastroPessoal=true` somente em `nao_encontrado`. Só o solicitante consulta (`403` para acesso negado; `404` para recurso inexistente/indisponível).
  - **`POST /livros/importacoes/{id}/reprocessar`** (`operationId: reprocessarImportacaoPorIsbn`) — somente o solicitante pode reenfileirar uma solicitação em `falha_transitoria`. Exige `Idempotency-Key`, responde `202` com `ImportacaoAceita`, mantém o mesmo `importacaoId`/ISBN normalizado e grava a mudança para `pendente` e a nova outbox na mesma transação. Converge para o livro existente se outra execução já o criou; estado diferente ou chave reutilizada com outro corpo retorna `409`.
  - **Rate limiting** por IP e identidade (SEC-18).
- **`POST /livros/pessoal`** (`operationId: criarLivroPessoal`) — exige `Idempotency-Key`, recebe `LivroPessoalEntrada` e responde `201` com `LivroPessoalDetalhe` e `Location`. Cria **livro pessoal** do dono: título, autor, **nº de páginas** e, opcionalmente, sinopse em texto puro e `capaUrl` do asset já enviado diretamente ao Cloudinary e validado (SEC-20, RN-14.7). **Sem ISBN** (RN-02: campo ausente, não vazio). Fica **fora** de busca, catálogo, filtros e páginas de autor/editora/série (RN-03, SEC-06).
- **`PATCH /livros/pessoal/{id}`** (`operationId: atualizarLivroPessoal`) e **`DELETE /livros/pessoal/{id}`** (`operationId: excluirLivroPessoal`, resposta `204` sem corpo) — exigem `Idempotency-Key`; editar/excluir é **exclusivo do dono** (RN-03, validado no servidor — SEC-02). Exclusão é ação destrutiva, com confirmação no cliente (RNF-USA-04); ao excluir, `ativo=false` faz o livro deixar de ser utilizável pelos contratos e cessa o acesso de terceiros (RN-15.6).
- **`GET /livros/pessoal/{id}`** (`operationId: obterLivroPessoal`) — o dono acessa sem `via`. Terceiro só acessa no Período 1 com `via=feed&referenciaId=<atividadeId>`; o servidor prova que a atividade está ativa, pertence ao dono, referencia o mesmo livro **e integra o feed do solicitante por seguimento aceito**, mesmo quando o perfil do dono é público (RN-08/RN-09/RN-15). A página combina as VIEWs de F-AVA para mostrar a nota e a resenha atuais do dono. Conhecer o id, forjar `via` ou usar atividade de outro livro retorna negação. A via por lista será acrescentada por F-LST sem enfraquecer esta checagem.

**Contrato assíncrono canônico:** `livro.importacao_solicitada`, versão `1`, produzido e consumido por `acervo`. Publicação em `leai.events.acervo`, routing key exata `livro.importacao_solicitada`; consumo pela fila `leai.acervo.importacao`, com DLQ `leai.acervo.importacao.dlq`. A `businessKey` do envelope é exatamente `importacao:<importacaoId>`. O `data` segue `docs/mensageria/schemas/livro.importacao_solicitada.v1.schema.json` e contém **somente** `importacaoId`, `solicitanteId` e `isbn13` normalizado; a chave de negócio não é repetida no `data`. `outbox_acervo.payload` persiste somente esse `data`, e o dispatcher de P0-MSG monta o envelope v1.

**Propriedade do fluxo:** F-ACV-CADASTRO é dona da transação que grava `importacao_livro` + `outbox_acervo`, do schema de `data` e do consumidor de domínio que consulta as fontes e converge o livro/estado. [P0-MSG](../periodo-0/feature-P0-MSG.md) é dono do dispatcher, envelope, publisher confirm, conexão/topologia, validação genérica, recibo `mensagem_processada`, ACK, retry `1/5/15 s` e DLQ. O efeito do consumidor e seu recibo são atômicos; reentrega por `eventId` não repete efeito, e a unicidade de ISBN-13 garante convergência semântica entre solicitações distintas. O runtime AMQP e a tabela de recibo foram entregues por P0-MSG em 19/09/2026; o consumidor desta feature (`ImportacaoConsumer`, consumidor `acervo.importacao`) está registrado nele desde 22/09/2026 e escreve o efeito com o `tx` do recibo.

**Contratos consumidos:** `v_atividade_livro_pessoal_v1` de [F-FEED](feature-F-FEED.md), `v_perfil_referencia_v1`/`v_seguimento_aceito_v1` de [F-PERFIL](feature-F-PERFIL.md) e `v_nota_publicacao_v1`/`v_resenha_publicacao_v1` de [F-AVA](feature-F-AVA.md). Servem somente à autorização e ao modo consulta da página pessoal; nenhuma tabela crua externa é lida.

**Modelo de dados** (schema `acervo`): a migration baseline implantada em 16/09/2026 já contém `livro` com `tipo=oficial|pessoal`, dono, ISBN ausente em pessoal, capas e estado ativo; `importacao_livro` com os quatro estados canônicos; `idempotencia_acervo`; `outbox_acervo`; e `v_livro_referencia_v1` com exatamente `livro_id`, `tipo`, `dono_id`, `paginas`, `titulo`, `autor_exibicao`, `capa_resolvida`, `ativo`. Esses objetos são infraestrutura habilitadora, não implementação dos handlers, produtor ou consumidor.

**Concorrência por ISBN:** solicitações simultâneas, ainda que tenham chaves de idempotência diferentes, convergem por ISBN-13 normalizado. A criação usa upsert/controle de concorrência; se outro consumidor criar primeiro, a solicitação restante termina `concluida` apontando para o mesmo livro, nunca em DLQ por violação da unicidade (RNF-ARQ-05).

### Frontend Web (`code/front`)

- **Fluxo "adicionar por ISBN"**: campo de ISBN → solicitação `202` → acompanhamento até criar/mostrar existente/indicar não encontrado ou indisponibilidade; `nao_encontrado` oferece cadastro pessoal. Usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md).
- **Formulário e página de livro pessoal**: título, autor, nº páginas, sinopse e capa opcionais; upload direto ao Cloudinary; consulta do dono; abertura pelo link de atividade do feed; exibição da nota/resenha do dono; edição e exclusão com confirmação. Cold start tratado como carregamento (RNF-ERR-09).
- O cliente HTTP aplica timeout e retentativa somente em operações idempotentes; a `Idempotency-Key` preservada acompanha eventual reenvio (RNF-ERR-03/04).

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); upload de capa direto ao Cloudinary e abertura autorizada a partir do feed. Alvo de demonstração Android.

## Critérios de aceite

- [x] Cadastro por ISBN valida **formato + dígito verificador** e nunca aceita URL do usuário (SEC-38).
- [x] ISBN **já existente** → `409` que leva à **página do livro existente** (RF-ACV-07, RN-02); o corpo carrega `livroId`.
- [x] ISBN novo cria solicitação e responde `202`; `livro.importacao_solicitada` é obrigatório, idempotente e leva aos estados documentados. *Provado contra Postgres com dispatcher, publisher e consumidor reais sobre broker em memória, e à mão com RabbitMQ e OpenLibrary reais em 22/09/2026.*
- [x] A criação/reprocessamento grava estado e outbox atomicamente; falha do broker não desfaz o `202`, e replay da mesma `Idempotency-Key` não cria segunda solicitação/outbox. *Teste de integração derruba a outbox com trigger e confere que solicitação e recibo de idempotência também não entram.*
- [x] ISBN **não encontrado** em nenhuma fonte é distinguido de fonte indisponível e oferece cadastro pessoal; `falha_transitoria` permite reprocessamento autenticado e idempotente da mesma solicitação (RF-ACV-06).
- [x] A busca externa usa allowlist, timeout, limite, backoff, circuit breaker e sem redirect externo (SEC-39, RNF-ERR-08); dados são normalizados antes de persistir (SEC-33).
- [x] Rate limiting ativo no cadastro por ISBN (SEC-18), por IP e por identidade.
- [ ] Livro pessoal é criado **sem ISBN**, com nº de páginas obrigatório; capa opcional passa por validação de tipo/tamanho/dimensões (SEC-20); fica **fora** da busca (SEC-06). *Criação sem ISBN e páginas obrigatórias, feito e provado contra o banco. O app mobile valida **tipo real pelos bytes, 5 MB e dimensões** antes de enviar; o servidor valida host, caminho e extensão da URL e nunca baixa a imagem. Falta o preset unsigned do Cloudinary de P-09, que é a segunda barreira.*
- [x] Editar/excluir livro pessoal é **exclusivo do dono** (SEC-02); a confirmação está especificada nos prompts de tela e entra com o cliente (RNF-USA-04).
- [x] O dono abre seu livro pessoal diretamente; terceiro abre somente por atividade válida e visível do feed, com RN-08/RN-15 revalidadas. ID ou referência forjada não concede acesso.
- [x] Página pessoal em modo consulta mostra nota/resenha atuais do dono e não oferece estante, favorito, leitura ou progresso ao terceiro. *As VIEWs de F-AVA retornam vazio hoje, e os campos saem `null`.*
- [x] Exclusão do livro invalida imediatamente a página e a atividade deixa de ser exibível pelo contrato `v_livro_referencia_v1`.
- [x] Repetir escritas com a mesma `Idempotency-Key` não repete importação, upload lógico, edição ou exclusão (RNF-ERR-04).
- [x] Solicitações concorrentes do mesmo ISBN convergem para um único livro e todas terminam apontando ao mesmo id (RNF-ARQ-05). *Duas entregas processadas em paralelo contra Postgres terminam `concluida` no mesmo `livroId`, sem DLQ.*
- [x] O evento usa exchange/routing/fila/DLQ, `businessKey=importacao:<importacaoId>` e `data { importacaoId, solicitanteId, isbn13 }` exatamente como os contratos canônicos; schema/envelope inválido vai à DLQ sem executar domínio. *`data` com campo extra vai à DLQ sem abrir transação; a cópia runtime do schema é comparada com a canônica em teste.*
- [x] Seed reproduzível contém ao menos um livro pessoal ligado ao dono e referências válidas/inválidas de acesso (RNF-TST-08). *`npm run db:seed`, idempotente, com ids fixos em `SEED_ACERVO`. A atividade do feed e o seguimento são gravados pelos seeds de F-FEED e F-PERFIL, que apontam para esses ids.*
- [ ] Fluxos de cadastro (oficial e pessoal) funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `acervo`, web, mobile) mergeado em `desenvolvimento` — backend e mobile implementados em `vicenzo-features`; web não iniciado
- [x] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md)) — verde localmente em 22/09/2026: `acervo` com lint, build, 168 unitários e 32 de integração (o `ci-back-acervo.yml` agora sobe Postgres); mobile com `flutter analyze` e 99 testes. Confirmar no GitHub Actions depois do push
- [ ] Testes unitários e de integração com banco real/container: contratos HTTP e códigos `201/202/204/400/401/403/404/409/429/503` aplicáveis; ISBN inválido/duplicado/inexistente/indisponível; concorrência do mesmo ISBN; estados; URL por allowlist; CRUD e consulta pessoal com dono, nota/resenha, feed válido, não-seguidor, perfil privado, referência forjada e livro excluído (RNF-TST-02) — *cobertos contra Postgres: 201, 202, 204, 400, 403, 404, 409, duplicado, inexistente, indisponível, concorrência, estados, CRUD, feed válido, não-seguidor, atividade de outro livro, referência forjada e livro excluído. Faltam na integração 401, 429 e 503 (cobertos só em unitário) e o caso de perfil privado, que depende da semântica de F-PERFIL na VIEW*
- [x] Teste assíncrono cobre atomicidade solicitação+outbox, envelope/data canônicos, publisher confirm, consumo+recibo atômicos, duplicação por `eventId`, convergência por ISBN entre eventos distintos, retry `1/5/15 s`, ACK pós-commit e DLQ de `livro.importacao_solicitada` (RNF-TST-03) — *contra Postgres, com o dispatcher, o publisher e o consumidor reais sobre um broker em memória; o broker real foi exercitado à mão com RabbitMQ local em 22/09/2026*
- [ ] Testes web/mobile cobrem acompanhamento da importação, autorização da página pessoal e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06) — *mobile feito: acompanhamento, 409, indisponível e reprocessar, 429, falha de rede com retentativa e mesma chave, modo dono × consulta, 403/404 como indisponível, upload e recusa de capa; web não iniciado*
- [x] **Spec OpenAPI de `acervo` atualizado em `docs/api/acervo.yaml`** — as sete operações desta feature em `implemented`; a nota da importação passou a descrever o fluxo ligado ao runtime de P0-MSG
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver — protótipos versionados em 22/09/2026; divergências do mobile em Pendências, "Divergências protótipo × prompt × implementação"

**Item próprio:** ~~manter a **allowlist de domínios** de fontes externas versionada e por ambiente; documentar a política de retentativa/circuit breaker~~ — **feito (18/09/2026):** `FONTES_HOSTS_PERMITIDOS` no `.env.example` e no schema de env, com padrão `openlibrary.org,covers.openlibrary.org,www.googleapis.com`; política de 1/5/15 s com circuit breaker por fonte documentada em `dominio/politica-resiliencia.ts` e coberta por teste.

## Pendências

- **Depende de** [F-ACV-INGESTAO](feature-F-ACV-INGESTAO.md) para o modelo compartilhado e a normalização RN-12, não para executar o dump; a baseline física comum já existe. Depende ainda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e Cloudinary/P-09 para capa.
- **Runtime de P0-MSG usado, e tocado.** O consumidor de importação usa o runtime que [P0-MSG](../periodo-0/feature-P0-MSG.md) entregou em 19/09/2026. Para cumprir o contrato "efeito de domínio e recibo gravados na mesma transação", o `MessageHandler` de `acervo` **e de `leitura`** passou a receber o `tx` do recibo (commit `fix(messaging)` de 22/09/2026): antes o efeito caía em outra conexão do pool, fora da transação. No Spring nada mudou, porque o `TransactionTemplate` já prende a transação à thread. Também entrou `MessageValidator.registerDataSchema` em `acervo`. **Avisar o dono de P0-MSG**, que não é desta feature; o arquivo de P0-MSG não foi editado. O validador de `leitura` ainda não valida `data` por schema, e os consumidores futuros de `leitura` vão precisar disso.
- **Demonstração em DES depende de `AMQP_URL`.** Sem o valor do CloudAMQP no painel do Render, a importação fica em `pendente` em DES.
- **A busca externa roda dentro da transação do recibo.** No pior caso (timeouts e backoff `1/5/15 s` nas duas fontes) a transação fica aberta por dezenas de segundos no Neon. Aceitável no volume do MVP; separar a consulta do efeito exigiria recibo em duas fases.
- **Google Books sem chave responde 429 por cota** (medido em 22/09/2026, como na P-14). Sem `GOOGLE_BOOKS_API_KEY`, a fonte secundária praticamente não existe.
- **Dependências de composição:** [F-ACV-BUSCA](feature-F-ACV-BUSCA.md) fornece a página oficial usada no redirecionamento do `409`; [F-FEED](feature-F-FEED.md) fornece `v_atividade_livro_pessoal_v1`; [F-PERFIL](feature-F-PERFIL.md) fornece `v_perfil_referencia_v1`/`v_seguimento_aceito_v1`; [F-AVA](feature-F-AVA.md) fornece `v_nota_publicacao_v1`/`v_resenha_publicacao_v1`. As VIEWs já existem na baseline do DER, mas os comportamentos das features donas não estão implementados. A via por lista continua dependente de [F-LST](../periodo-2/feature-F-LST.md).
- **Compartilha `acervo` com [F-ACV-BUSCA](feature-F-ACV-BUSCA.md) e [F-ACV-INGESTAO](feature-F-ACV-INGESTAO.md)** — a baseline já fixou a entidade física `livro`; mudanças posteriores devem ser coordenadas e feitas por migration incremental (plano §6).
- A via por lista para livro pessoal depende de F-LST (Período 2). O endpoint deve aceitar nova via somente após existir contrato equivalente ao de atividade; não aceitar mero `listaId` sem validação server-side.
- **Assuntos em livro pessoal** (RF-ACV-22) ficam **fora** — são **F-ACV-OPC** (Período 3, opcional).
- Confirmar cobertura da **fonte secundária Google Books** por ISBN (medição pendente registrada no `REQUISITOS.md` §10.1) — não bloqueia, mas afeta a taxa de acerto. O cliente já aceita `GOOGLE_BOOKS_API_KEY`, que amplia a cota e tornaria a medição viável.
- **Integração: o que ainda falta.** 401, 429 e 503 estão cobertos só em unitário; o caso de perfil privado na autorização RN-15 depende da semântica que F-PERFIL der à `v_perfil_referencia_v1`. O fixture cria as VIEWs externas como tabelas; quando os donos entregarem, vale trocar pelas definições reais.
- **Web não iniciado.** O cliente HTTP da web tem as mesmas lacunas que o mobile tinha: sem `Idempotency-Key`, sem retentativa e com `ApiError` descartando `livroId` e `campos`.
- **Mobile não foi rodado em emulador.** Os testes de widget cobrem os estados, mas a sessão não tinha AVD nem simulador. O upload real de capa depende do preset unsigned do Cloudinary (P-09) e de `--dart-define=CLOUDINARY_UPLOAD_PRESET`.
- **Contrato: o nome do dono só chega junto da resenha.** `LivroPessoalDetalhe` não traz nome nem avatar do dono; eles existem só em `resenhaDoDono`. Sem resenha, o terceiro vê a etiqueta `Livro pessoal` sem a linha de atribuição, e a seção de nota vira `Nota de quem cadastrou`. Proposta ao grupo: acrescentar `dono { nome, avatarUrl }` ao contrato, lido de `v_perfil_referencia_v1`.
- **Componentes novos nascidos nos prompts** precisam de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3: área de upload de imagem com seus quatro estados, cartão de progresso de operação longa, faixa informativa neutra, etiqueta `Livro pessoal`, linha de atribuição de dono, zona de exclusão e o modo consulta como variante de página — este último será reaproveitado por F-LST na via por lista.
- **GRANT entre schemas no Neon.** `acervo` consulta VIEWs de `leitura`, `social` e `identidade` em runtime. Se o grupo separar roles por serviço, é preciso `GRANT USAGE` nos três schemas e `GRANT SELECT` nas VIEWs. Falha de permissão é tratada como 503, mas continua sendo falha, e o GRANT não pode entrar em migration de `acervo` porque os objetos são de outros donos.
- Stack de `acervo` definida: **NestJS (TypeScript)** (arquitetura §2.1).

### Divergências protótipo × prompt × implementação

Os protótipos HTML das quatro telas foram versionados em 22/09/2026. Divergências do próprio protótipo em relação ao prompt, que a implementação resolve seguindo o **prompt**:

- *Cadastro por ISBN* não desenha a variante de oito segundos ("Ainda procurando.") nem um estado de `429`; mostra o ISBN preenchido sem hífen e mistura Torto Arado com o ISBN de Brás Cubas no artboard de duplicata; o placeholder de capa tem raio, e o documento de design pede canto vivo.
- *Cadastro pessoal* intitula o mobile `Novo livro` (o prompt diz `Novo livro pessoal`), acrescenta placeholders de sinopse e páginas que não estão no §8 e só desenha o erro de tamanho da capa.
- *Livro pessoal*, na web, usa copy genérica no diálogo de exclusão, e o prompt manda repetir a do cadastro pessoal, nomeando o livro.
- Nos quatro: sombras pretas no modo escuro (o sistema pede sombra no hue de `tinta`), overlays com rgba fixo e a marca escrita "Lê Aí" em vez de "Lê Ai". Vêm do projeto no Claude Design e afetam os protótipos anteriores também.

Divergências da implementação mobile em relação ao protótipo, todas por falta de contrato ou de feature vizinha:

- O card de livro encontrado e o de duplicata mostram **só o ISBN**, com placeholder de capa: `Importacao` e o `409` trazem apenas `livroId`, e `GET /livros/{id}` é de [F-ACV-BUSCA](feature-F-ACV-BUSCA.md), ainda planejado. `Abrir página do livro` leva a um placeholder até lá.
- Na página do dono não há bloco de leitura (status, progresso, `Registrar progresso`), que é de F-EST/F-PRG, nem os botões `Avaliar`, `Editar nota` e `Editar resenha`, que são de F-AVA. O texto `Você ainda não avaliou este livro.` aparece sem o botão.
- No modo consulta não há curtir, descurtir nem `Denunciar` (F-AVA e moderação).
- O estado `429` do cadastro por ISBN usa a mensagem do servidor num banner de alerta, e a recusa de capa por dimensão usa uma copy nova, `A imagem precisa ter entre 100 e 6000 pixels de lado.` Nenhuma das duas está no prompt.

## Timeline

### Implementação 22/09/2026: fluxo por ISBN ligado ponta a ponta, integração com banco e mobile. Com o runtime AMQP de [P0-MSG](../periodo-0/feature-P0-MSG.md) já em `desenvolvimento`, `ImportacaoConsumer` registra a fila `leai.acervo.importacao` e o schema canônico de `data`, e `ConvergenciaRepository` converge o livro com o `tx` do recibo — o que exigiu passar esse `tx` ao handler no consumidor Nest de `acervo` e de `leitura`, porque o efeito caía fora da transação do recibo. A normalização RN-12 de autor e editora ganhou a versão TypeScript com os mesmos casos do script Python, e a tabela de sinônimos passou a ser consultada antes de criar editora. Os testes de integração contra Postgres (32 casos, com service container no CI) acharam um bug real: o replay de excluir e de reprocessar com a mesma `Idempotency-Key` respondia 404 e 409, porque a propriedade e o estado eram verificados antes do recibo. O teste ponta a ponta com RabbitMQ local e a OpenLibrary de verdade achou mais dois, invisíveis com fonte simulada: `/isbn/{isbn}.json` sempre redireciona para `/books/{olid}.json`, e o `HttpExterno` recusava todo redirect, então a fonte primária nunca funcionaria em produção; e muitas edições não têm autor, só a obra tem. Redirect agora é seguido só dentro da allowlist, e o autor vem da obra como plano B; `978-85-359-1484-9` importa como "1984", de George Orwell. Entrou o seed de RNF-TST-08 (`npm run db:seed`). No mobile, as quatro telas foram implementadas a partir dos protótipos, com o `ApiClient` ganhando `patch`/`delete`, `Idempotency-Key`, retentativa só em operação idempotente e erro com `status`, `livroId` e `campos`; a capa sobe direto ao Cloudinary depois de validada pelos bytes. Protótipos HTML versionados, e as divergências registradas. Web e a demonstração em DES seguem pendentes.

### Implementação 18/09/2026: backend de `acervo` implementado em `vicenzo-features`, com as sete operações do contrato entregues e marcadas `implemented` em [`acervo.yaml`](../../api/acervo.yaml). Como esta é a primeira feature com endpoint autenticado no serviço, três transversais nasceram aqui: validação do JWT HS256 emitido pelo `identidade` com guard **global** (rota nova nasce protegida, `/health` se libera com `@Publico()`); idempotência sobre `idempotencia_acervo` como **serviço chamado pelo handler**, e não interceptor, porque o recibo precisa ser a última operação da mesma transação do efeito; e o porte do padrão de erro de negócio do `identidade`, que permitiu o `409` de ISBN existente carregar `livroId` (RF-ACV-07) e o `400` carregar `campos`. O correlation-id passou a exigir UUID, porque `outbox_acervo.correlation_id` é `uuid NOT NULL` e um header malformado derrubaria a transação inteira do `202`. A importação por ISBN grava `importacao_livro` e a linha de outbox na mesma transação (RNF-ERR-10), com `data` e `businessKey` conferindo com o schema canônico; a corrida do mesmo ISBN **não** é serializada, porque a convergência é do consumidor por unicidade de ISBN-13 (RNF-ARQ-05). A autorização RN-15 do livro pessoal verifica as quatro condições em uma consulta só — atividade ativa, do dono, do mesmo livro, com seguimento aceito — e exige o seguimento **mesmo com perfil público**, que é mais restritivo e não tem ramo condicional para furar. O consumidor que consulta OpenLibrary e depois Google Books está implementado com allowlist, timeout, limite de resposta lido em streaming, recusa de redirect, backoff 1/5/15 s e circuit breaker, e distingue ausência de indisponibilidade; **não tem acionador**, por decisão registrada: o dispatcher é de [P0-MSG](../periodo-0/feature-P0-MSG.md), e até lá a importação fica em `pendente`. Lint, build e 125 testes verdes, todos sem banco e sem rede. `JWT_SECRET` e `CLOUDINARY_CLOUD_NAME` declarados no [`render.yaml`](../../../render.yaml) — o primeiro precisa ser idêntico ao do `identidade`, sob pena de todo token válido dar 401 em DES. Escritos também os quatro prompts de tela em `docs/design/periodo-1/F-ACV-CADASTRO/`, que não existiam. Web, mobile, testes de integração com banco e os protótipos HTML seguem pendentes. Status, critérios, DoD e pendências atualizados.

### Alinhamento 17/09/2026: contratos HTTP foram alinhados ao OpenAPI planejado de `acervo`; evento alinhado ao catálogo/schema canônico (`businessKey`, `data`, exchange, fila e DLQ). Registradas a divisão de propriedade entre F-ACV-CADASTRO e P0-MSG, a dependência bloqueante do runtime AMQP, os testes de outbox/consumo e as dependências de composição. Status de dados corrigido para reconhecer o DER implantado sem declarar backend implementado.

### Revisão 28/08/2026: importação por ISBN fixada como fluxo assíncrono obrigatório com acompanhamento e rota explícita de reprocessamento; resiliência externa, idempotência e testes foram completados. A consulta de livro pessoal ganhou autorização explícita pela via feed e contratos entre schemas, mantendo a via por lista para F-LST.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-ACV-CADASTRO no [periodo-1/README.md](README.md), de RF-ACV-05..09 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2, das RN-02/RN-03 e dos RNF de SSRF (SEC-38/39). Busca externa por allowlist e livro pessoal owner-only fixados; assuntos em livro pessoal adiados ao Período 3.
