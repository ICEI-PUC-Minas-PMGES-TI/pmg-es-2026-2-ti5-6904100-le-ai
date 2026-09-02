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
| Infra | não iniciado | consumidor de `livro.importacao_solicitada`; tabela de solicitação; allowlist; preset Cloudinary |
| Backend | não iniciado | `acervo`: importação assíncrona por ISBN + CRUD e consulta autorizada de livro pessoal |
| Web | não iniciado | fluxo assíncrono por ISBN + formulário e página de livro pessoal |
| Mobile | não iniciado | mesmas telas + upload de capa direto ao Cloudinary |

## Especificação

### Backend / API — `acervo`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Todas as escritas aceitam `Idempotency-Key` conforme o [README do período](README.md#regras-de-implementação-compartilhadas).

- **`POST /livros/oficial`** (RF-ACV-05, RF-ACV-06, RF-ACV-07) — recebe **apenas o ISBN** (nunca uma URL — SEC-38). Fluxo:
  1. **Valida** formato e **dígito verificador** do ISBN-13 (SEC-38);
  2. Se o ISBN **já existe** na base oficial (RN-02: ISBN-13 é chave natural única) → **`409`** com o id do livro existente, para o cliente **redirecionar à página** (RF-ACV-07);
  3. Senão, cria uma solicitação idempotente, publica obrigatoriamente **`livro.importacao_solicitada`** (§7.2) e responde **`202`** com `importacaoId` e estado `pendente`;
  4. O consumidor busca metadados na ordem **OpenLibrary → Google Books**, com URL construída pelo servidor a partir de allowlist (SEC-38/39), `User-Agent`, timeout, limite de resposta, retentativa com backoff, circuit breaker e proibição de redirect fora da allowlist (SEC-39, RNF-ERR-08);
  5. Dados externos são **validados e normalizados antes de persistir** (SEC-33), como na ingestão (RN-12);
  6. Se nenhuma fonte conhecer o ISBN, encerra como `nao_encontrado`. Durante retentativas por indisponibilidade, permanece `pendente`; somente após esgotar a política passa a `falha_transitoria`, sem confundir ausência com falha do provedor.
  - **`GET /livros/importacoes/{id}`** retorna `pendente | concluida | nao_encontrado | falha_transitoria`; em `concluida`, inclui o id do livro; em `nao_encontrado`, oferece cadastro pessoal. Só o solicitante consulta sua solicitação.
  - **`POST /livros/importacoes/{id}/reprocessar`** — somente o solicitante pode reenfileirar uma solicitação em `falha_transitoria`. Responde `202`, mantém o mesmo `importacaoId`/ISBN normalizado e converge para o livro existente se outra execução tiver concluído. Estado diferente retorna `409`; `Idempotency-Key` impede reenvio duplicado.
  - **Rate limiting** por IP e identidade (SEC-18).
- **`POST /livros/pessoal`** (RF-ACV-08) — cria **livro pessoal** do dono: título, autor, **nº de páginas** (obrigatório — progresso por página exige total), e **opcionalmente** sinopse (texto puro, digitada, sem busca externa — RN-19.8) e **capa por upload** (Cloudinary unsigned, validada por tipo/tamanho/dimensões — SEC-20, RN-14.7). **Sem ISBN** (RN-02: campo ausente, não vazio). Fica **fora** de busca, catálogo, filtros e páginas de autor/editora/série (RN-03, SEC-06).
- **`PATCH /livros/pessoal/{id}`** e **`DELETE /livros/pessoal/{id}`** (RF-ACV-09) — editar/excluir, **exclusivo do dono** (RN-03, validado no servidor — SEC-02). Exclusão é ação destrutiva → confirmação no cliente (RNF-USA-04); ao excluir, cessa o acesso de terceiros que chegavam por feed/lista (RN-15.6).
- **`GET /livros/pessoal/{id}`** — o dono acessa diretamente. Terceiro só acessa no Período 1 com `via=feed&referenciaId=<atividadeId>`; o servidor prova que a atividade está ativa, pertence ao dono, referencia o livro **e integra o feed do solicitante por seguimento aceito**, mesmo quando o perfil do dono é público (RN-08/RN-09/RN-15). A página combina as VIEWs de F-AVA para mostrar a nota e a resenha atuais do dono. Conhecer o id, forjar `via` ou usar atividade de outro livro retorna negação. A via por lista será acrescentada por F-LST sem enfraquecer esta checagem.

**Evento produzido e consumido:** `livro.importacao_solicitada` (produtor e consumidor em `acervo`, §5.2). O payload versionado contém `importacaoId`, `solicitanteId`, ISBN-13 normalizado e a chave de negócio baseada no ISBN/solicitante, além do envelope de P0-MSG. O consumidor valida o schema, é idempotente e usa retentativa/DLQ; reentrega não cria segundo livro nem segunda solicitação.

**Contratos consumidos:** `v_atividade_livro_pessoal_v1` de [F-FEED](feature-F-FEED.md), `v_perfil_referencia_v1`/`v_seguimento_aceito_v1` de [F-PERFIL](feature-F-PERFIL.md) e `v_nota_publicacao_v1`/`v_resenha_publicacao_v1` de [F-AVA](feature-F-AVA.md). Servem somente à autorização e ao modo consulta da página pessoal; nenhuma tabela crua externa é lida.

**Modelo de dados** (schema `acervo`): reaproveita a entidade `Livro` da ingestão ([F-ACV-INGESTAO](feature-F-ACV-INGESTAO.md)), com **flag oficial/pessoal**, `dono` (só pessoal), ISBN **ausente** em pessoal, URLs de capa (externa/própria) conforme RN-14; adiciona `importacao_livro` com solicitante, ISBN, estado, livro resultante/erro e timestamps. A feature completa `v_livro_referencia_v1` para livros pessoais e exclusão/estado ativo.

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
- [ ] Seed reproduzível contém ao menos um livro pessoal ligado ao dono e referências válidas/inválidas de acesso (RNF-TST-08).
- [ ] Fluxos de cadastro (oficial e pessoal) funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `acervo`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: ISBN inválido/duplicado/inexistente/indisponível; concorrência do mesmo ISBN; estados/retry; URL por allowlist; CRUD e consulta pessoal com dono, nota/resenha, feed válido, não-seguidor, perfil privado, referência forjada e livro excluído (RNF-TST-02)
- [ ] Teste assíncrono cobre publicação, consumo, duplicação e DLQ de `livro.importacao_solicitada` (RNF-TST-03)
- [ ] Testes web/mobile cobrem acompanhamento da importação, autorização da página pessoal e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `acervo` atualizado em `docs/api/acervo.yaml`** com cadastro, acompanhamento de importação, livro pessoal e `v_livro_referencia_v1`
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** manter a **allowlist de domínios** de fontes externas (OpenLibrary, Google Books) versionada e por ambiente; documentar a política de retentativa/circuit breaker da chamada externa.

## Pendências

- **Depende de** [F-ACV-INGESTAO](feature-F-ACV-INGESTAO.md) (entidade `Livro` e normalização RN-12 reaproveitadas), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md) (broker/backoff da importação; Cloudinary/P-09 para capa).
- **Compartilha `acervo` com [F-ACV-BUSCA](feature-F-ACV-BUSCA.md) e [F-ACV-INGESTAO](feature-F-ACV-INGESTAO.md)** — quem chegar primeiro fixa a entidade `Livro`; sinalizar no grupo (plano §6).
- A via por lista para livro pessoal depende de F-LST (Período 2). O endpoint deve aceitar nova via somente após existir contrato equivalente ao de atividade; não aceitar mero `listaId` sem validação server-side.
- **Assuntos em livro pessoal** (RF-ACV-22) ficam **fora** — são **F-ACV-OPC** (Período 3, opcional).
- Confirmar cobertura da **fonte secundária Google Books** por ISBN (medição pendente registrada no `REQUISITOS.md` §10.1) — não bloqueia, mas afeta a taxa de acerto.
- Stack de `acervo` definida: **NestJS (TypeScript)** (arquitetura §2.1).

## Timeline

### Revisão 28/08/2026: importação por ISBN fixada como fluxo assíncrono obrigatório com acompanhamento e rota explícita de reprocessamento; resiliência externa, idempotência e testes foram completados. A consulta de livro pessoal ganhou autorização explícita pela via feed e contratos entre schemas, mantendo a via por lista para F-LST.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-ACV-CADASTRO no [periodo-1/README.md](README.md), de RF-ACV-05..09 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2, das RN-02/RN-03 e dos RNF de SSRF (SEC-38/39). Busca externa por allowlist e livro pessoal owner-only fixados; assuntos em livro pessoal adiados ao Período 3.
