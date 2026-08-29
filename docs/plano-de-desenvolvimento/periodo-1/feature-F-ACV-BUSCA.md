# F-ACV-BUSCA — Busca e página do livro

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** a definir · **Serviços afetados:** `acervo` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2 (RF-ACV-01, 02, 04, 18, 19), RN-19, RN-21, RN-14. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §2.2, §3.2, §4.2, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar o **caminho de descoberta do acervo** — o "encontrar um livro" do ciclo de valor: a **busca paginada** de livros oficiais e a **página do livro**. Fecha os requisitos **Essenciais**:

- **RF-ACV-01** buscar por **título, autor, editora ou ISBN**, com resultados **paginados**;
- **RF-ACV-02** filtrar resultados por **assunto**;
- **RF-ACV-04** ver a **página do livro** com metadados, capa, **sinopse** e resenhas de outros leitores;
- **RF-ACV-18** obter e persistir a **sinopse sob demanda** na primeira abertura da página (RN-19);
- **RF-ACV-19** a página permanece **utilizável sem sinopse**, exibindo a ausência sem erro.

Consome o acervo carregado por [F-ACV-INGESTAO](feature-F-ACV-INGESTAO.md) e os livros cadastrados por [F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md).

RNF atendidos: **RNF-DES-01** (leitura ≤1s p95, sem cold start), **RNF-DES-02** (paginação com teto de itens), **RNF-DES-03** (índices sobre título/autor/ISBN), **RNF-SEC-05** (IDs não sequenciais / anti-IDOR), **RNF-SEC-06** (livro pessoal fora da busca/catálogo), **RNF-ERR-08/09** (resiliência da fonte externa e cold start), **RNF-ARQ-06** (sinopse por fluxo assíncrono).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | índices de busca; estado de sinopse; consumidor de `livro.pagina_aberta` |
| Backend | não iniciado | `acervo`: `GET /livros` (busca+filtro) e `GET /livros/{id}` (página) + busca de sinopse |
| Web | não iniciado | tela de busca com filtro por assunto + página do livro |
| Mobile | não iniciado | mesmas telas |

## Especificação

### Backend / API — `acervo`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs de livro **não sequenciais** (SEC-05). **Livro pessoal nunca aparece** em busca, catálogo, filtro ou páginas de autor/editora/série (SEC-06, RN-03); sua página autorizada pertence a [F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md).

- **`GET /livros`** (RF-ACV-01, RF-ACV-02) — busca **paginada** de livros oficiais por **título, autor, editora ou ISBN**, com **filtro por assunto** (RF-ACV-02, RN-21). Usa índices adequados (RNF-DES-03); teto de itens por página imposto pelo servidor (RNF-DES-02). Ordenação por relevância; **agrupamento visual por título+autor** é mitigação de interface de RN-01 (o modelo continua por edição). Retorno inclui, por item: id, título, autor(es), editora, ano, nº páginas, **capa resolvida** (ver ordem RN-14.4), assuntos.
- **`GET /livros/{id}`** (RF-ACV-04) — página do livro oficial: metadados, capa, **sinopse** (ver abaixo) e resenhas paginadas de outros leitores. Exibir e tornar assuntos acionáveis pertence integralmente a RF-ACV-21/F-ACV-DESCOBERTA (Período 2). As resenhas vêm de `leitura` pela VIEW **`v_resenha_publicacao_v1`** exposta por [F-AVA](feature-F-AVA.md); `acervo` combina autor da resenha com `v_perfil_referencia_v1` e `v_seguimento_aceito_v1` para retornar apenas autores públicos, o próprio solicitante ou perfis privados que ele segue (RN-08, SEC-03). `acervo` não lê tabelas cruas. Nota geral e nota dos leitores ficam ausentes, nunca zero, até F-ACV-NOTA.
- **`GET /livros/{id}/resenhas?cursor=`** — pagina as resenhas permitidas pelo mesmo filtro server-side de RN-08, com teto de itens e cursor opaco; `GET /livros/{id}` pode incluir a primeira página e seu próximo cursor, mas as páginas seguintes usam esta rota (RNF-DES-02).
- **Sinopse sob demanda** (RF-ACV-18, RF-ACV-19, RN-19):
  - A sinopse **não** foi carregada na ingestão (RN-19.1). O livro mantém `sinopse_status = nao_consultada | pendente | disponivel | ausente | falha_transitoria`. Na primeira abertura, uma atualização concorrente segura muda para `pendente` e publica **uma** `livro.pagina_aberta`; estados `disponivel` e `ausente` são terminais para a busca automática.
  - O consumidor busca na ordem **OpenLibrary → Google Books → ausente** (RN-19.3), com allowlist, timeout, limite de resposta, backoff e circuit breaker (SEC-39, RNF-ERR-08). Em sucesso persiste texto puro ≤4.000 e marca `disponivel`; quando ambas as fontes respondem sem sinopse, marca `ausente`. Ao esgotar tentativas antes da DLQ, marca `falha_transitoria`; uma abertura posterior pode reenfileirar de forma controlada com nova chave, sem ficar eternamente `pendente`. Marcação externa é removida (RN-19.6).
  - A busca é **assíncrona e não bloqueia a renderização** (RN-19.5): a página abre já; a sinopse aparece quando disponível. **Ausência é estado válido** e não gera erro (RF-ACV-19, RN-19.4). Sinopse **não** integra o índice de busca (RN-19.7).
- **Resolução da capa** na exibição (RN-14.4): **cópia própria (Cloudinary), se existir → URL externa → placeholder**. O cache da cópia própria é alimentado por outro fluxo (RN-14, disparado por `livro.adicionado_a_estante` de [F-EST](feature-F-EST.md)); aqui apenas se **consome** a ordem de resolução.

**Eventos:** produz e consome **`livro.pagina_aberta`** (produtor e consumidor em `acervo`, §5.2). O payload versionado contém `livroId` e chave de negócio `livroId`, além do envelope de P0-MSG. Consumidor valida schema e é idempotente também pelo estado persistido, não apenas por `eventId`.

**VIEWs consumidas** (arquitetura §4.2): `v_resenha_publicacao_v1` de `leitura` e `v_perfil_referencia_v1`/`v_seguimento_aceito_v1` de `identidade`, para compor a página sob RN-08. `v_nota_publicacao_v1` não atualiza a projeção de `acervo`; F-ACV-NOTA consome `nota.alterada`.

### Frontend Web (`code/front`)

- **Tela de busca** com campo único (título/autor/editora/ISBN), **filtro por assunto**, paginação e agrupamento visual por título+autor; usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md) (card de livro).
- **Página do livro**: metadados, capa (com placeholder no fallback), sinopse e resenhas paginadas permitidas por RN-08. Enquanto `sinopse_status=pendente`, o cliente consulta novamente `GET /livros/{id}` com intervalo crescente e limite de tentativas/tempo; para em `disponivel`, `ausente` ou `falha_transitoria`, sem polling infinito. Ausência é exibida sem erro e falha transitória permite nova tentativa em abertura/atualização posterior. Cold start tratado como carregamento (RNF-ERR-09); cliente HTTP usa timeout e backoff apenas em operações idempotentes.

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); paginação incremental de busca e resenhas; mesma resolução de capa e tratamento de sinopse ausente/carregando. Alvo de demonstração Android.

## Critérios de aceite

- [ ] Busca retorna livros oficiais por título/autor/editora/ISBN, **paginada** com teto de itens (RNF-DES-02) e usando índices (RNF-DES-03); **livro pessoal nunca** aparece (SEC-06).
- [ ] Filtro por assunto restringe os resultados (RN-21).
- [ ] Página do livro abre com metadados/capa e resenhas **paginadas**, filtradas server-side por RN-08 via contratos versionados, sem ler tabelas cruas.
- [ ] Na 1ª abertura, `livro.pagina_aberta` é publicado uma vez; sinopse encontrada vira texto puro ≤4.000 e estado `disponivel`; resposta válida sem sinopse vira `ausente` e não repete consultas futuras; indisponibilidade continua reprocessável.
- [ ] A página **abre sem esperar** a sinopse; **ausência de sinopse** é exibida sem erro (RF-ACV-19).
- [ ] Capa resolve na ordem cópia própria → externa → placeholder (RN-14.4).
- [ ] Nota geral/dos leitores aparecem como **ausentes** (não zero) enquanto F-ACV-NOTA não existir.
- [ ] Busca e página do livro funcionam **em DES**, com leitura ≤1s p95 desconsiderando cold start (RNF-DES-01).

## Definition of Done

(plano §10)

- [ ] Código (backend `acervo`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: busca/filtro/paginação; exclusão de livro pessoal; paginação e autorização de resenhas para perfil público, privado seguido e privado não seguido; estados concorrentes da sinopse (RNF-TST-02)
- [ ] Fluxo assíncrono da sinopse testado em publicação, consumo, ausência terminal, falha pós-retentativa sem `pendente` órfão, duplicação e DLQ (RNF-TST-03)
- [ ] Testes web/mobile cobrem paginação, polling limitado da sinopse, ausência/carregamento e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `acervo` atualizado em `docs/api/acervo.yaml`** com `GET /livros`, `GET /livros/{id}` e paginação de resenhas
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

## Pendências

- **Depende de** [F-ACV-INGESTAO](feature-F-ACV-INGESTAO.md) (acervo carregado com índices e assuntos), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md) (broker para `livro.pagina_aberta`; fontes externas OpenLibrary/Google Books).
- **Consome `v_resenha_publicacao_v1`** de [F-AVA](feature-F-AVA.md) e os contratos de privacidade de [F-PERFIL](feature-F-PERFIL.md) — coordenar colunas e índices antes de implementar.
- **Nota geral / nota dos leitores e projeção `nota.alterada`** ficam em **F-ACV-NOTA** (Período 2); aqui aparecem como ausentes. A **distribuição de notas do livro** citada condicionalmente em RF-ACV-04 não possui feature explícita e deve ser alocada pelo grupo, sem confundi-la com F-STA-OPC.
- **Filtro avançado** (autor/editora/série/ano/faixa de páginas, RF-ACV-03) e **páginas de autor/editora/série** (RF-ACV-10/11/12) e **assunto acionável** (RF-ACV-21) são **F-ACV-DESCOBERTA** (Período 2).
- Stack de `acervo` ainda pendente (recomendação da arquitetura: `acervo` e `leitura` na mesma stack — P0-INFRA).

## Timeline

### Revisão 28/08/2026: paginação e filtro de resenhas por RN-08 foram definidos com VIEWs versionadas; assunto acionável retornou ao Período 2. A sinopse ganhou estado terminal para ausência, resiliência completa, idempotência semântica e polling limitado no cliente; a distribuição de notas sem feature foi registrada.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-ACV-BUSCA no [periodo-1/README.md](README.md), de RF-ACV-01/02/04/18/19 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2, das RN-19/RN-21/RN-14 e da arquitetura §3.2/§4.2/§5.2. Sinopse fixada como fluxo assíncrono sob demanda; notas agregadas e descoberta avançada explicitamente adiadas ao Período 2.
