# F-ACV-CADASTRO — Cadastro de livros (ISBN + pessoal)

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** a definir · **Serviços afetados:** `acervo` (backend) + web + mobile

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
| Infra / Dados | em andamento | `livro`, `importacao_livro`, `idempotencia_acervo`, `outbox_acervo` e `v_livro_referencia_v1` versionados e implantados; faltam recibo, broker, fila, allowlist e preset Cloudinary |
| Backend | não iniciado | `acervo`: importação assíncrona por ISBN + CRUD e consulta autorizada de livro pessoal |
| Web | não iniciado | fluxo assíncrono por ISBN + formulário e página de livro pessoal |
| Mobile | não iniciado | mesmas telas + upload de capa direto ao Cloudinary |

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

**Propriedade do fluxo:** F-ACV-CADASTRO é dona da transação que grava `importacao_livro` + `outbox_acervo`, do schema de `data` e do consumidor de domínio que consulta as fontes e converge o livro/estado. [P0-MSG](../periodo-0/feature-P0-MSG.md) é dono do dispatcher, envelope, publisher confirm, conexão/topologia, validação genérica, recibo `mensagem_processada`, ACK, retry `1/5/15 s` e DLQ. O efeito do consumidor e seu recibo são atômicos; reentrega por `eventId` não repete efeito, e a unicidade de ISBN-13 garante convergência semântica entre solicitações distintas. A tabela de recibo e todo o runtime AMQP ainda não estão implementados.

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

- [ ] Cadastro por ISBN valida **formato + dígito verificador** e nunca aceita URL do usuário (SEC-38).
- [ ] ISBN **já existente** → `409` que leva à **página do livro existente** (RF-ACV-07, RN-02).
- [ ] ISBN novo cria solicitação e responde `202`; `livro.importacao_solicitada` é obrigatório, idempotente e leva aos estados documentados.
- [ ] A criação/reprocessamento grava estado e outbox atomicamente; falha do broker não desfaz o `202`, e replay da mesma `Idempotency-Key` não cria segunda solicitação/outbox.
- [ ] ISBN **não encontrado** em nenhuma fonte é distinguido de fonte indisponível e oferece cadastro pessoal; `falha_transitoria` permite reprocessamento autenticado e idempotente da mesma solicitação (RF-ACV-06).
- [ ] A busca externa usa allowlist, timeout, limite, backoff, circuit breaker e sem redirect externo (SEC-39, RNF-ERR-08); dados são normalizados antes de persistir (SEC-33).
- [ ] Rate limiting ativo no cadastro por ISBN (SEC-18).
- [ ] Livro pessoal é criado **sem ISBN**, com nº de páginas obrigatório; capa opcional passa por validação de tipo/tamanho/dimensões (SEC-20); fica **fora** da busca (SEC-06).
- [ ] Editar/excluir livro pessoal é **exclusivo do dono** (SEC-02) e a exclusão pede confirmação (RNF-USA-04).
- [ ] O dono abre seu livro pessoal diretamente; terceiro abre somente por atividade válida e visível do feed, com RN-08/RN-15 revalidadas. ID ou referência forjada não concede acesso.
- [ ] Página pessoal em modo consulta mostra nota/resenha atuais do dono e não oferece estante, favorito, leitura ou progresso ao terceiro.
- [ ] Exclusão do livro invalida imediatamente a página e a atividade deixa de ser exibível pelo contrato `v_livro_referencia_v1`.
- [ ] Repetir escritas com a mesma `Idempotency-Key` não repete importação, upload lógico, edição ou exclusão (RNF-ERR-04).
- [ ] Solicitações concorrentes do mesmo ISBN convergem para um único livro e todas terminam apontando ao mesmo id (RNF-ARQ-05).
- [ ] O evento usa exchange/routing/fila/DLQ, `businessKey=importacao:<importacaoId>` e `data { importacaoId, solicitanteId, isbn13 }` exatamente como os contratos canônicos; schema/envelope inválido vai à DLQ sem executar domínio.
- [ ] Seed reproduzível contém ao menos um livro pessoal ligado ao dono e referências válidas/inválidas de acesso (RNF-TST-08).
- [ ] Fluxos de cadastro (oficial e pessoal) funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `acervo`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: contratos HTTP e códigos `201/202/204/400/401/403/404/409/429/503` aplicáveis; ISBN inválido/duplicado/inexistente/indisponível; concorrência do mesmo ISBN; estados; URL por allowlist; CRUD e consulta pessoal com dono, nota/resenha, feed válido, não-seguidor, perfil privado, referência forjada e livro excluído (RNF-TST-02)
- [ ] Teste assíncrono cobre atomicidade solicitação+outbox, envelope/data canônicos, publisher confirm, consumo+recibo atômicos, duplicação por `eventId`, convergência por ISBN entre eventos distintos, retry `1/5/15 s`, ACK pós-commit e DLQ de `livro.importacao_solicitada` (RNF-TST-03)
- [ ] Testes web/mobile cobrem acompanhamento da importação, autorização da página pessoal e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `acervo` atualizado em `docs/api/acervo.yaml`** com cadastro, acompanhamento de importação, livro pessoal e `v_livro_referencia_v1`
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** manter a **allowlist de domínios** de fontes externas (OpenLibrary, Google Books) versionada e por ambiente; documentar a política de retentativa/circuit breaker da chamada externa.

## Pendências

- **Depende de** [F-ACV-INGESTAO](feature-F-ACV-INGESTAO.md) para o modelo compartilhado e a normalização RN-12, não para executar o dump; a baseline física comum já existe. Depende ainda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e Cloudinary/P-09 para capa.
- **Dependência bloqueante do ISBN assíncrono:** [P0-MSG](../periodo-0/feature-P0-MSG.md) ainda tem somente as outboxes implantadas; faltam `mensagem_processada`, conexão, dispatcher, consumer genérico, retry e DLQ. O CRUD de livro pessoal pode avançar sem broker, mas o fluxo oficial por ISBN não pode ser declarado concluído nem demonstrado em DES antes dessa entrega.
- **Dependências de composição:** [F-ACV-BUSCA](feature-F-ACV-BUSCA.md) fornece a página oficial usada no redirecionamento do `409`; [F-FEED](feature-F-FEED.md) fornece `v_atividade_livro_pessoal_v1`; [F-PERFIL](feature-F-PERFIL.md) fornece `v_perfil_referencia_v1`/`v_seguimento_aceito_v1`; [F-AVA](feature-F-AVA.md) fornece `v_nota_publicacao_v1`/`v_resenha_publicacao_v1`. As VIEWs já existem na baseline do DER, mas os comportamentos das features donas não estão implementados. A via por lista continua dependente de [F-LST](../periodo-2/feature-F-LST.md).
- **Compartilha `acervo` com [F-ACV-BUSCA](feature-F-ACV-BUSCA.md) e [F-ACV-INGESTAO](feature-F-ACV-INGESTAO.md)** — a baseline já fixou a entidade física `livro`; mudanças posteriores devem ser coordenadas e feitas por migration incremental (plano §6).
- A via por lista para livro pessoal depende de F-LST (Período 2). O endpoint deve aceitar nova via somente após existir contrato equivalente ao de atividade; não aceitar mero `listaId` sem validação server-side.
- **Assuntos em livro pessoal** (RF-ACV-22) ficam **fora** — são **F-ACV-OPC** (Período 3, opcional).
- Confirmar cobertura da **fonte secundária Google Books** por ISBN (medição pendente registrada no `REQUISITOS.md` §10.1) — não bloqueia, mas afeta a taxa de acerto.
- Stack de `acervo` definida: **NestJS (TypeScript)** (arquitetura §2.1).

## Timeline

### Alinhamento 17/09/2026: contratos HTTP foram alinhados ao OpenAPI planejado de `acervo`; evento alinhado ao catálogo/schema canônico (`businessKey`, `data`, exchange, fila e DLQ). Registradas a divisão de propriedade entre F-ACV-CADASTRO e P0-MSG, a dependência bloqueante do runtime AMQP, os testes de outbox/consumo e as dependências de composição. Status de dados corrigido para reconhecer o DER implantado sem declarar backend implementado.

### Revisão 28/08/2026: importação por ISBN fixada como fluxo assíncrono obrigatório com acompanhamento e rota explícita de reprocessamento; resiliência externa, idempotência e testes foram completados. A consulta de livro pessoal ganhou autorização explícita pela via feed e contratos entre schemas, mantendo a via por lista para F-LST.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-ACV-CADASTRO no [periodo-1/README.md](README.md), de RF-ACV-05..09 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2, das RN-02/RN-03 e dos RNF de SSRF (SEC-38/39). Busca externa por allowlist e livro pessoal owner-only fixados; assuntos em livro pessoal adiados ao Período 3.
