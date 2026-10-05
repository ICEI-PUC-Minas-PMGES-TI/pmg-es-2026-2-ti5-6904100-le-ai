# F-LST — Listas

**Período:** 2 · **Prioridade:** desejavel
**Dono:** Henrique Carvalho · **Serviços afetados:** `social` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.6 (RF-LST-01..06), RN-15, RN-08. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §4.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar as **listas de livros** — o leitor curando coleções próprias e vendo as de quem segue. Fecha os requisitos **Desejáveis**:

- **RF-LST-01** criar listas com **título e descrição**;
- **RF-LST-02** **adicionar, remover e reordenar** livros nas suas listas;
- **RF-LST-03** **editar e excluir** suas listas;
- **RF-LST-04** visualizar listas de outros leitores, **respeitando a privacidade do perfil** (RN-08);
- **RF-LST-05** adicionar **seus próprios livros pessoais** às suas listas (RN-15.1);
- **RF-LST-06** ao ver a lista de outro que contenha livro pessoal, abrir a página daquele livro em **modo consulta**, **sem ação de adicionar à estante** (RN-15.2/3).

Fecha também a parte de **listas** da composição do perfil (RF-SOC-02) que [F-PERFIL](../periodo-1/feature-F-PERFIL.md) registrou como pendência de baseline.

RNF atendidos: **RNF-SEC-02** (propriedade da lista no servidor), **RNF-SEC-03** (listas de perfil privado só a seguidor aceito), **RNF-SEC-06/07** (livro pessoal fora de busca; terceiros não agem sobre ele), **RNF-SEC-14** (título/descrição tratados como texto/escape), **RNF-DES-02** (listagens paginadas), **RNF-USA-04** (confirmação na exclusão), **RNF-ERR-04** (idempotência).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | implementado | tabelas `lista`/`lista_item` e VIEW `v_lista_livro_pessoal_v1` do modelo de 16/09; migration `V20261005100000__limites_lista.sql` (80/300) revisada pelo dono em 05/10, aplicada no banco de dev na próxima subida do `social` |
| Backend | em andamento | `social` implementado em 05/10/2026: as 10 rotas `implemented` no `social.yaml`, 24 testes de integração e 6 unitários verdes; falta a via lista no `acervo` (etapa 3) |
| Web | implementado | 05/10/2026: lista (dono e terceiro), índice, aba e seção `Listas` do perfil, criar/editar/excluir, `Adicionar à lista` nas páginas de livro oficial e pessoal; 32 testes novos. Conferido no navegador em 05/10 contra os protótipos (web e mobile, conta do dono no ambiente local); falta o fluxo em DES e o modo terceiro com dados reais |
| Mobile | implementado | 05/10/2026: seção `Listas` do perfil (próprio e de outro leitor, abas Perfil e Feed), índice, lista (dono e terceiro, menu do item e modo `Reordenar` por gesto), criar/editar/excluir em tela cheia, `Adicionar à lista` no livro oficial (menu `Mais ações` novo) e no pessoal do dono; 36 testes novos. Conferido no emulador em 05/10 com duas contas no ambiente local (dona e terceiro); falta o fluxo em DES |

## Especificação

### Backend / API — `social`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Título/descrição tratados como texto (escape — SEC-14). Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas).

Contrato completo em [`docs/api/social.yaml`](../../api/social.yaml) (tag `listas`, publicado em 30/09/2026 antes da implementação).

- **`POST /listas`** (RF-LST-01, aceita `livroId` opcional para criar a lista já com o livro), **`PATCH /listas/{id}`** (editar título/descrição), **`DELETE /listas/{id}`** (RF-LST-03, exclusão lógica, confirmação — RNF-USA-04) — **owner-only** (SEC-02). Título de 1 a 80 caracteres, descrição até 300.
- **`POST /listas/{id}/livros`**, **`DELETE /listas/{id}/livros/{livroId}`** e **`PUT /listas/{id}/livros/{itemId}/posicao`** (move um item por vez; os itens entre a posição antiga e a nova se deslocam na mesma transação) (RF-LST-02) — operações owner-only. Livro já presente responde 200 com o item existente, sem duplicar nem mudar de posição. Remover compacta as posições. O livro é validado por `v_livro_referencia_v1` (existe/ativo); listas podem conter livros oficiais e os pessoais do próprio dono.
- **`GET /listas/{id}`**, **`GET /listas/{id}/livros?cursor=`**, **`GET /perfis/{usuarioId}/listas?page=`** e **`GET /me/listas?livroId=`** (RF-LST-04; o último alimenta o sheet `Adicionar à lista` com `contemLivro`) — metadados da lista e itens/listas paginados com teto server-side (RNF-DES-02), sob RN-08: dono e perfil público veem; perfil privado só a seguidor aceito, e a negação responde 403 `ACESSO_NEGADO` com mensagem de perfil privado. O índice traz contagem, até três capas e `atualizadaEm`. `social` não lê tabela crua de `identidade`.
- **Livro pessoal em lista (RF-LST-05, RN-15.1):** apenas o **dono** adiciona **seus próprios** livros pessoais a **suas** listas — o servidor checa por `v_livro_referencia_v1` que `tipo=pessoal` **e** `dono=solicitante`. Ninguém adiciona livro pessoal de outro a uma lista sua.
- **Via RN-15 para terceiros (RF-LST-06):** a lista do dono é a **segunda via** de acesso de terceiros a um livro pessoal (a primeira é o feed — [F-FEED](../periodo-1/feature-F-FEED.md)). `social` expõe **`v_lista_livro_pessoal_v1`** (lista **ativa** do dono, dono, livro referenciado); `acervo` autoriza `GET /livros/pessoal/{id}?via=lista&referenciaId=<listaId>` exigindo que o solicitante **tenha acesso à lista** sob RN-08 (dono público, próprio, ou privado seguido) — espelhando o contrato de `v_atividade_livro_pessoal_v1` do feed. A página é **modo consulta**: metadados, capa, nota/resenha do dono, **sem** ação de adicionar à estante/favoritar/iniciar leitura (RN-15.3, SEC-06/07, validado no servidor). Conhecer os ids **não** concede acesso.

**Sem eventos e sem notificações** — listas não geram atividade de feed nem notificação (§7.2).

**VIEWs consumidas:** `v_livro_referencia_v1` (acervo), `v_perfil_referencia_v1`/`v_seguimento_aceito_v1` (identidade). **VIEW exposta:** `v_lista_livro_pessoal_v1` (para autorização em `acervo`), nome distinto das tabelas.

**Modelo de dados** (schema `social`): `lista` (dono, título, descrição, timestamps) e `lista_item` (lista, livro, ordem) — a ordem sustenta o reordenar de RF-LST-02. As tabelas e a VIEW `v_lista_livro_pessoal_v1` **já existem** desde a migration do modelo (`V20260916024928__cria_modelo_social.sql`), com `UNIQUE(lista_id, livro_id)` e `UNIQUE(lista_id, ordem)` adiável; a F-LST acrescenta só uma migration com os limites de título e descrição.

### Frontend Web (`code/front`)

- **Criar/editar/excluir** listas; **adicionar/remover/reordenar** livros (drag ou controles de ordem); **ver listas de outros** sob RN-08; abrir livro pessoal de lista alheia em **modo consulta** (sem ação de estante). Usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md). Exclusão com confirmação.

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); reordenação por gesto. Alvo de demonstração Android.

## Critérios de aceite

- [ ] Criar/editar/excluir listas é **owner-only** (SEC-02); exclusão pede confirmação (RNF-USA-04).
- [ ] Adicionar/remover/**reordenar** livros mantém a ordem (RF-LST-02).
- [ ] Reordenação com item alheio ou ausente é recusada e não deixa ordem parcial; itens usam cursor/teto server-side.
- [ ] Listas de outros respeitam **RN-08** server-side (privado só a seguidor aceito — SEC-03), paginadas (RNF-DES-02).
- [ ] O dono adiciona **só seus próprios** livros pessoais às suas listas (RF-LST-05, RN-15.1); livro pessoal de terceiro é recusado.
- [ ] Livro pessoal em lista alheia abre em **modo consulta** via `v_lista_livro_pessoal_v1`/`?via=lista`, **sem** ação de estante (RF-LST-06, RN-15.3); referência forjada não autoriza.
- [ ] Repetir escrita com a mesma `Idempotency-Key` não duplica lista/item (RNF-ERR-04).
- [ ] Listas funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `social`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: CRUD/propriedade, reordenação atômica, paginação de itens, RN-08, livro pessoal do próprio dono, via lista e idempotência (RNF-TST-02)
- [ ] Testes web/mobile cobrem reordenação, listas de perfil privado e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `social` atualizado em `docs/api/social.yaml`** com listas/itens e a VIEW `v_lista_livro_pessoal_v1` documentada como contrato
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** publicar `v_lista_livro_pessoal_v1` como espelho de `v_atividade_livro_pessoal_v1` — as **duas vias** de RN-15 (feed e lista) usam a mesma autorização em `acervo`.

## Plano de implementação

Plano de 30/09/2026 para retomar a feature em qualquer máquina ou sessão. Ordem de execução; cada etapa termina com testes verdes e atualização do status acima. Caminhos relativos à raiz do repositório.

| Etapa | Escopo | Situação |
|---|---|---|
| 1 | Contrato em `docs/api/social.yaml` e `docs/api/acervo.yaml` | **concluída em 30/09/2026** |
| 2 | Backend `social` (Spring) | **concluída em 05/10/2026** |
| 3 | Via lista no `acervo` (NestJS, código do Vicenzo) | **delegada ao Vicenzo em 05/10/2026**; ver Pendências |
| 4 | Web (`code/front`) | **concluída em 05/10/2026** (validação em DES na etapa 6) |
| 5 | Mobile (`code/mobile`) | **concluída em 05/10/2026**, conferida no emulador (validação em DES na etapa 6) |
| 6 | Fechamento: DES, status, pendências e timeline | pendente |

### Etapa 2: backend `social`

- **Migration nova** `code/back/social/src/main/resources/db/migration/V<timestamp>__limites_lista.sql`, com versão maior que `V20260927002000`. **Não editar** `V20260916024928__cria_modelo_social.sql`: o Flyway valida os scripts aplicados. Conteúdo: CHECK `char_length(titulo) <= 80` e `descricao IS NULL OR char_length(descricao) <= 300`. Revisão humana antes de subir.
- **Pacote** `br.com.leai.social.lista/{controller,dto,entity,repository,service}`, no molde de `feed/`:
  - Entidades `Lista` e `ItemDeLista` com construtor protegido e fábrica estática (modelo `feed/entity/Atividade.java`).
  - DTOs `record` com `@Schema(name=...)` igual ao nome no yaml e Bean Validation (`@NotBlank @Size(max=80)`, `@Size(max=300)`), modelo `feed/dto/CriarComentarioRequisicao.java`.
  - `ListaController`: usuário por `@AuthenticationPrincipal Jwt` e `UUID.fromString(token.getSubject())` (modelo `FeedController.java`); escritas pelo par `executar`/`semCorpo` com `ServicoDeIdempotencia` (copiar de `InteracaoController.java`). Acrescentar as operações em `common/idempotencia/OperacaoIdempotente.java` com o `operationId` do yaml (`criarLista`, `editarLista`, `excluirLista`, `adicionarLivroNaLista`, `removerLivroDaLista`, `moverLivroNaLista`).
  - `ServicoDeListas`:
    - escrita owner-only; lista alheia responde 404;
    - livro validado por `acervo.v_livro_referencia_v1`: `ativo` e (`tipo='oficial'` ou `tipo='pessoal'` com `dono_id` = solicitante); caso contrário 422 (modelo de consulta em lote: `ServicoDeFeed.buscarTiposLivro`);
    - adicionar com `INSERT ... ON CONFLICT (lista_id, livro_id) DO NOTHING RETURNING`; se já existia, ler e responder 200 com o item; novo item em `max(ordem)+1` (modelo `ServicoDeInteracao`);
    - mover em uma transação com `SET CONSTRAINTS <unique de (lista_id, ordem)> DEFERRED` (conferir o nome real da constraint no banco), deslocando o intervalo; posição fora de `1..n` responde 400;
    - remover apaga o item e compacta as ordens seguintes;
    - toda escrita atualiza `lista.atualizado_em`; excluir faz `ativo=false`;
    - RN-08 (primeira checagem de privacidade do `social`): dono vê; `identidade.v_perfil_referencia_v1.privacidade='publico'` vê; privado exige `EXISTS identidade.v_seguimento_aceito_v1`; negado responde **403 `ACESSO_NEGADO`** com a mensagem "Este perfil é privado. Siga para ver as listas." (padrão de `code/back/leitura/src/perfis/perfis.service.ts`; SQL de referência em `code/back/acervo/src/livros/busca/resenhas.repository.ts`); dono ausente da VIEW responde 404;
    - rate limit por usuário nas escritas com um bean `LimitePorUsuario` em `common/LimitesDeInteracao.java`.
  - Repositório: objetos de outros schemas sempre qualificados (`acervo.`, `identidade.`), porque o `search_path` é `social`. Itens por cursor `(ordem, id)` no molde de `feed/repository/CursorComentario.java`; índice paginado com `common/Paginacao.java` (20 padrão, 50 máximo) e três capas por `LATERAL` sobre `lista_item` com `v_livro_referencia_v1`.
- **Testes** de integração estendendo `integracao/IntegracaoComPostgres.java` com `@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")`, copiando o `@BeforeEach` de `InteracaoControllerIntegracaoTest.java` que cria as VIEWs de `identidade` e `acervo`. Casos: CRUD owner-only, limites 80/300, livro repetido responde 200 sem duplicar, livro pessoal de outro recusado, mover no início/meio/fim/fora do intervalo sem ordem parcial, remover compacta, cursor e teto, RN-08 (dono, público, privado seguido, privado não seguido 403), `Idempotency-Key` repetida e com payload diferente (409), `contemLivro` em `/me/listas`. Unitários de validação no molde de `ServicoDeFeedValidacaoTest`.
- Ao terminar: trocar `planned-periodo-2` por `implemented` nas rotas de listas do `social.yaml` (inclusive em `x-database-contracts`).

### Etapa 3: via lista no `acervo`

> **Executor: Vicenzo Fonseca** (dono do código de livro pessoal no `acervo`), por decisão do dono da F-LST em 05/10/2026. O lado do `social` já está pronto e em `desenvolvimento`: a VIEW `social.v_lista_livro_pessoal_v1` é alimentada pelas rotas de listas, e os itens de livro pessoal saem com `link.via = "lista"` e `link.referenciaId = <listaId>`. Esta seção é o roteiro completo; o estado de 05/10 e o que ainda bloqueia estão na pendência "Via lista no `acervo`".

- **Antes de tudo, no controller:** hoje `livro-pessoal.controller.ts:95` recusa com 400 qualquer `via` diferente de `feed` **antes** de chamar o serviço, então até o **dono** recebe 400 ao abrir o próprio livro com `via=lista`. Aceitar `lista` nesse teste já resolve o dono, porque `LivroPessoalService.obter` libera o dono sem olhar a via.
- `code/back/acervo/src/db/contratos-externos.ts`: declarar `vListaLivroPessoal` (`social.v_lista_livro_pessoal_v1`, colunas `lista_id`, `dono_id`, `livro_id`) com `.existing()`.
- `src/livros/pessoal/autorizacao-rn15.service.ts`: `Via = 'feed' | 'lista'`; ramo de lista em uma consulta: `vListaLivroPessoal` (lista = `referenciaId`, livro, dono) com `vPerfilReferencia` do dono e `privacidade='publico' OR EXISTS vSeguimentoAceito`. **Difere da via feed**, que exige seguimento mesmo com perfil público. Manter `ehFalhaDeContratoExterno` → 503.
- `src/livros/pessoal/livro-pessoal.controller.ts`: `@ApiQuery enum ['feed','lista']` e a mensagem do 400.
- Testes: tabela falsa `social.v_lista_livro_pessoal_v1` em `CONTRATOS_EXTERNOS` e `TABELAS_DE_DADOS` de `test/integracao/banco.ts`; helper `publicarEmLista` e casos em `test/integracao/livro-pessoal.int-spec.ts` (público sem seguir passa, privado seguido passa, privado não seguido 403, lista de outro livro, referência forjada, lista excluída, 503); casos `via: 'lista'` em `livro-pessoal.service.spec.ts`.
- Regras que o ramo de lista precisa respeitar (RN-15, RN-08), todas revalidadas no `acervo`, nunca confiadas ao `social` nem ao cliente:
  - a lista `referenciaId` está ativa (só listas ativas estão na VIEW), é do dono do livro e contém aquele livro;
  - o dono do livro está em `v_perfil_referencia_v1` (suspenso ou em exclusão não libera);
  - perfil do dono `publico` libera qualquer leitor autenticado, **sem exigir seguimento**; `privado` exige linha em `v_seguimento_aceito_v1` do solicitante para o dono;
  - falhou qualquer item: 403, como na via feed. Lista excluída ou livro removido da lista cortam o acesso na hora (RN-15.6), já que a linha some da VIEW;
  - acesso pela lista é sempre **modo consulta** (RN-15.3): nenhuma escrita é liberada por esta via.
- Ao terminar: em `docs/api/acervo.yaml`, trocar o texto "Via lista (F-LST, Período 2, planejada)" (por volta da linha 538) pela regra implementada e incluir `lista` no enum de `via`; registrar a mudança na seção "Mudanças feitas por outras features" do `code/back/acervo/AGENTS.md`, se for o costume do serviço; e avisar o dono da F-LST para marcar a etapa 3 como concluída aqui.

### Etapa 4: web

- `code/front/src/services/listas.ts` (`createListasService` sobre `createApiClient`, `novaChaveIdempotencia` por intenção) com spec no molde de `social.spec.ts`; `services/acervo.ts`: `ViaDeAcesso.via` aceita `'lista'`.
- `components/perfil/SecoesDeLeitura.vue`: terceira aba `listas`, com navegação por setas genérica; novo `ListasDoPerfil.vue` (mosaico, `usePaginacao`, `FimDaLista`) em `views/perfil/PerfilView.vue` (com `Nova lista`) e `PerfilDeOutroView.vue` (bloco RN-08 no 403).
- `router/index.ts`: rotas `perfil/listas/:id` e `leitores/:username/listas/:id`; `abaDoLivroPessoal` resolve `via=lista` para `/perfil`; caso novo em `router/abas.spec.ts`.
- `ListaView.vue` (arrastar e botões subir/descer chamando `/posicao`; remover sem confirmação; livro pessoal de outro com `query: {via: 'lista', referenciaId: listaId}`, modelo `components/feed/ItemAtividade.vue`), `FormularioDeLista.vue` (`SobreposicaoModal`, `CampoTexto`/`CampoAreaTexto`, `ContadorDeCaracteres`, `DialogoConfirmacao` na exclusão) e `AdicionarALista.vue` (`GET /me/listas?livroId=`).
- `views/livros/LivroPessoalView.vue`: `acesso` aceita `via=lista`, item `Adicionar à lista` na `FolhaAcoes` e no botão web, estado indisponível com "Voltar à lista" (texto em `docs/design/periodo-2/livro-pessoal/livro-pessoal.md`).
- `views/livros/LivroOficialView.vue`: o menu `DotsThree` é do Renato como integrador; combinar e só encaixar `Adicionar à lista`.
- Toast "Lista excluída." não existe como componente: criar um pequeno em `components/ui/` ou usar `BannerAviso`, e registrar a divergência.
- Testes Vitest com `testes/montarNaRota.ts` e `vi.mock` dos serviços: reordenação, perfil privado, timeout com API simulada, `via=lista`.

### Etapa 5: mobile

- `code/mobile/lib/features/listas/`: `listas_service.dart` (`ApiClient`, `AppConfig.socialBaseUrl`, `ValueNotifier<int> alteracoes`), `rotas_listas.dart` com `DependenciasDeListas.padrao` (modelo `feed/rotas_feed.dart`), `lista_page.dart` (`ReorderableListView` para o dono, primeiro do projeto), `lista_form_page.dart` (`CampoTexto`, `CabecalhoTela(fechar: true)`, `PopScope` + `confirmarNoModal`, `confirmarAcaoDestrutiva`), `folha_adicionar_a_lista.dart` (`mostrarFolhaInferior` pelo navegador raiz) e `listas_do_perfil.dart`.
- `lib/app/router.dart`: parâmetro `listas:` em `buildRouter`, rotas sob `/perfil` e `/feed/leitores/:username`.
- `lib/features/perfil/widgets_de_identidade.dart`: slot `listas` em `SecoesDeLeitura`, ligado em `perfil_page.dart` e `perfil_de_outro_page.dart` dentro do ramo não privado.
- `lib/features/livros/livro_pessoal_page.dart`: item em `_abrirMenu` e estado indisponível dependente da via; `livro_oficial_page.dart` ganha `acoes` com `DotsThree`, combinado com o Renato.
- Testes em `test/features/listas/*` (reordenação, privado, timeout com `MockClient`), caso `via: 'lista'` em `test/features/livros/livro_pessoal_page_test.dart` e rota em `test/app/router_test.dart`. Registrar `lib/features/listas/` no `code/mobile/AGENTS.md`.

### Etapa 6: fechamento

- Commits Conventional em `desenvolvimento` com `git pull --rebase` antes; validação em DES depois do merge em `main`.
- Atualizar status, pendências e timeline deste arquivo.

### Verificação

- `social`: em `code/back/social`, `./mvnw verify` com `DATABASE_URL_TESTE` apontando para Postgres local descartável, nunca o Neon.
- `acervo`: em `code/back/acervo`, `npm run lint && npm test && npm run test:integration` com `DATABASE_URL_TESTE`.
- Web: em `code/front`, `npm run lint && npm test && npm run build`; roteiro manual com `npm run dev`.
- Mobile: em `code/mobile`, `flutter analyze && flutter test && flutter build apk --debug`; roteiro no emulador com `--dart-define=SOCIAL_BASE_URL=http://10.0.2.2:8081`.
- Roteiro manual nas duas plataformas: criar lista, adicionar pelo livro, reordenar, ver lista de perfil privado sem seguir (bloco RN-08) e abrir livro pessoal de lista alheia em modo consulta.

## Pendências

- **Telas (design P2):** entrada `Adicionar à lista` no menu `DotsThree` do header da [`pagina-do-livro.md`](../../design/periodo-2/pagina-do-livro/pagina-do-livro.md) ([protótipo](../../design/periodo-2/pagina-do-livro/prototipos/pagina-do-livro.html)) (lote 2). Lote 3, prompts escritos e protótipos exportados em 29/09/2026: [`lista.md`](../../design/periodo-2/F-LST/lista.md) ([protótipo](../../design/periodo-2/F-LST/prototipos/lista.html)), [`listas-do-leitor.md`](../../design/periodo-2/F-LST/listas-do-leitor.md) ([protótipo](../../design/periodo-2/F-LST/prototipos/listas-do-leitor.html)) (índice; na web é a aba `Listas` do perfil), [`criar-lista.md`](../../design/periodo-2/F-LST/criar-lista.md) ([protótipo](../../design/periodo-2/F-LST/prototipos/criar-lista.html)) (criar, editar e excluir) e [`adicionar-a-lista.md`](../../design/periodo-2/F-LST/adicionar-a-lista.md) ([protótipo](../../design/periodo-2/F-LST/prototipos/adicionar-a-lista.html)). **Contrato pendente:** `PUT /listas/{id}/ordem` exige todos os `itemIds`, mas os itens são paginados; o índice precisa de contagem, três primeiras capas e `atualizadaEm`; o sheet precisa saber se cada lista já contém o livro; criar a partir do livro pede `POST /listas` que aceite o livro (senão a lista pode ficar sem ele). Limites provisórios no protótipo: 80 caracteres no título e 300 na descrição. Lotes 6 e 7, prompts escritos em 29/09/2026; protótipos exportados em 29/09/2026: seção `Listas` e aba `Listas` na web nas edições [`meu-perfil.md`](../../design/periodo-2/meu-perfil/meu-perfil.md) ([protótipo](../../design/periodo-2/meu-perfil/prototipos/meu-perfil.html)) (com `Nova lista`) e [`perfil-de-outro-leitor.md`](../../design/periodo-2/perfil-de-outro-leitor/perfil-de-outro-leitor.md) ([protótipo](../../design/periodo-2/perfil-de-outro-leitor/prototipos/perfil-de-outro-leitor.html)); `Adicionar à lista` no `DotsThreeVertical` do modo dono e segunda via de acesso do terceiro (pela lista) na edição [`livro-pessoal.md`](../../design/periodo-2/livro-pessoal/livro-pessoal.md) ([protótipo](../../design/periodo-2/livro-pessoal/prototipos/livro-pessoal.html)). Contrato a confirmar: `GET /perfis/{id}/listas` com contagem e capas.
- **Depende de** [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (`v_perfil_referencia_v1`/`v_seguimento_aceito_v1`), [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md)/[F-ACV-CADASTRO](../periodo-1/feature-F-ACV-CADASTRO.md) (`v_livro_referencia_v1` e a página autorizada de livro pessoal em `acervo`), [F-FEED](../periodo-1/feature-F-FEED.md) (padrão da via de acesso a livro pessoal), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md).
- **Via lista no `acervo` (etapa 3) — com o Vicenzo, aberta desde 05/10/2026. Bloqueia RF-LST-06 e o Definition of Done da F-LST.** O dono da F-LST fez só a parte dele (`social`, web e mobile); a autorização da página de livro pessoal é código do `acervo` e fica com o Vicenzo. Roteiro completo na [Etapa 3](#etapa-3-via-lista-no-acervo). Estado até lá, conferido no código em 05/10:
  - livro oficial em lista: funciona;
  - **dono** abrindo o próprio livro pessoal pela lista: o `acervo` responde 400 a `via=lista`. **Contorno nos clientes:** quando `pertenceAoSolicitante` é verdadeiro, web e mobile abrem o livro **sem** `via`/`referenciaId`, e o `acervo` já libera o dono. Quando a etapa 3 entrar, o contorno pode ficar: é inofensivo;
  - **terceiro** abrindo livro pessoal de lista alheia (RF-LST-06): o `acervo` responde 400, e os clientes mostram o estado "livro indisponível" com "Voltar à lista". A falha é segura: ninguém vê o que não devia;
  - aceite: o roteiro manual "abrir livro pessoal de lista alheia em modo consulta" e os casos de integração da etapa 3 passam só depois dela.
- **Compartilha `social`** com as demais features sociais e é limpo por [F-CONTA-2](feature-F-CONTA-2.md) na exclusão — sinalizar no grupo (plano §6).
- Stack de `social` definida: **Spring (Java)** (arquitetura §2.1).
- ~~**Decisão do dono:** fixar limites de título/descrição e o comportamento de adicionar novamente livro já presente antes da migration.~~ — **decidido (30/09/2026):** título até 80 e descrição até 300 caracteres (ratifica os protótipos); livro já presente responde 200 com o item existente.
- ~~**Contrato pendente de reordenação e do sheet**~~ — **decidido (30/09/2026):** `PUT /ordem` com todos os `itemIds` substituído por `PUT /listas/{id}/livros/{itemId}/posicao`, que funciona com itens paginados; `POST /listas` aceita `livroId`; `GET /me/listas?livroId=` informa `contemLivro`; o índice traz contagem, três capas e `atualizadaEm`.
- **Alternativa a avaliar, sem mudar o desenho atual:** controles acessíveis de subir e descer na web, além do arrastar, usando a mesma rota de posição.
- ~~**Revisão humana da migration**~~ — **revisada e aprovada pelo dono em 05/10/2026.** `V20261005100000__limites_lista.sql` ficou acima de `V20261003180000` (F-NOT-2, 03/10), e não de `V20260927002000` como o plano previa.
- ~~**Livro que fica inativo deixa buraco na posição exibida.**~~ — **decidido (05/10/2026): renumerar na leitura, só no `social`.** Excluir livro pessoal faz `ativo = false` no `acervo`, e o item continua em `lista_item`. A `posicao` do contrato passou a ser a visível (lugar entre os livros ativos, contínua a partir de 1); a posição gravada fica interna, para o cursor e para mover. `moverLivroNaLista` recebe a posição visível, valida contra a quantidade de livros ativos e a traduz para a posição gravada; item de livro inativo responde 404. Descartado: compactar por evento do `acervo`, que exigiria schema novo, outbox no `acervo` e consumidor com DLQ. A linha do livro inativo continua em `lista_item` até a lista ser excluída ou a F-CONTA-2 limpar a conta.
- **Web: divergências do protótipo (05/10/2026), a conferir na revisão visual:**
  - Abaixo de 768px, o formulário de lista abre como folha da `SobreposicaoModal`, e não como tela cheia sobreposta (`criar-lista.md` §1).
  - Menu do item no mobile: a `FolhaAcoes` não tem o cabeçalho com capa e `Posição 3 de 7`; a posição vai no rótulo acessível.
  - Sem pronome de gênero, como em F-PERFIL: `Só quem Beatriz aceita como seguidor vê as listas.` no lugar de "as listas dela".
  - Na web, o `DotsThree` do livro oficial fica no header (`#cabecalho-acoes`), e não no canto do conteúdo.
  - Falha ao remover um livro da lista mostra um toast `rubi` (não desenhado), e o livro volta à posição.
  - Bloco de restrição do perfil de outro leitor: `Envie uma solicitação para ver a estante, as resenhas e as listas de Beatriz.` (sem "as estatísticas", que são da F-STA).
- **Mobile: divergências do protótipo (05/10/2026), a conferir no emulador:**
  - Reordenar por gesto usa o `SliverReorderableList` do Flutter: as linhas abrem espaço para a levantada, mas não há a linha de inserção de 2px `musgo` (`lista.md` §4.3).
  - Remover tira a linha sem o fade de saída em `dur-base` (§4.2); a contagem e as posições atualizam na hora.
  - Excluir a lista volta para a tela de onde se abriu a lista (seção do perfil ou índice), com o aviso `Lista excluída.`, e não sempre para o índice (`criar-lista.md` §4.8). Voltar ao índice a partir da seção empilharia um índice que a pessoa não abriu.
  - O formulário em tela cheia segue o protótipo (abre pelo navegador raiz, cobre a barra e não tem sino), ao contrário da web. O card do livro no formulário não traz a linha `Editora · ano · páginas`, como na web.
  - Sem pronome de gênero, como na web: `Só quem Beatriz aceita como seguidor vê as listas.`
  - No Feed, o livro oficial aberto por uma lista vai para a aba Descobrir, como o próprio feed faz: a aba Feed não tem a rota do livro oficial (código do Kayke). Na aba Perfil, abre na própria aba.
  - O texto do livro pessoal indisponível mudou também para quem chega pelo feed (`Quem o cadastrou pode ter excluído o livro ou deixado de compartilhá-lo.`), como pede a edição P2 de `livro-pessoal.md` §4.5 e como a web já fazia.
- **Menu `Mais ações` da página do livro oficial criado pela F-LST.** O protótipo P2 põe ali `Adicionar à lista` (F-LST) e `Recomendar a um leitor` (F-REC-P2P). A página é do Renato como integrador, e o menu não existia: entrou `ui/MenuDeAcoes.vue` (folha no mobile, dropdown na web) só com o item da lista. Avisar o Renato e o Kayke: `Recomendar` entra só acrescentando um item em `acoesDoMenu` de `LivroOficialView.vue`. No app, o menu é a folha de `_abrirMenu` em `livro_oficial_page.dart` (card do livro e `Adicionar à lista`); `Recomendar a um leitor` entra como mais um item ali.
- **Decisões de implementação da etapa 2 (05/10/2026):**
  - Pacote `lista/{controller,dto,model,repository,service}` com SQL parametrizado (`JdbcTemplate`), e não entidades JPA como o plano previa, no molde de `NotificacaoRepository`: inclusão com `ON CONFLICT`, lock `FOR UPDATE` da lista em toda escrita e deslocamento de posições num único `UPDATE`, que uma entidade em cache não acompanharia.
  - Livro inexistente responde o mesmo 422 do livro pessoal de outro leitor, para não confirmar que o livro alheio existe.
  - Rate limit por usuário de 30 escritas por minuto (`limiteDeListas`), o mesmo valor das outras interações, por falta de número próprio na especificação.
  - O dono fora de `v_perfil_referencia_v1` (suspenso ou em exclusão) recebe 404 também nas próprias listas.

## Timeline

### Revisão 01/09/2026: limites de entrada/duplicidade registrados para o dono e alternativa de API/reordenação mantida apenas para avaliação.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-LST no [periodo-2/README.md](README.md), de RF-LST-01..06 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.6 e das RN-15/RN-08. Segunda via de RN-15 (lista do dono) fixada com `v_lista_livro_pessoal_v1`, espelho da via feed de F-FEED; fecha a composição de listas de RF-SOC-02 pendente em F-PERFIL.

### Revisão 29/08/2026: reordenação e paginação de itens ganharam contratos HTTP explícitos e transação owner-only, sem ampliar o escopo funcional de RF-LST-02/04.

### Dono 29/09/2026: feature atribuída a **Henrique Carvalho** na [divisão do Período 2](README.md#divisão-do-período-2-entre-5-pessoas).

### Contrato 30/09/2026: rotas de listas publicadas em `social.yaml` antes da implementação (status `planned-periodo-2`), com `v_lista_livro_pessoal_v1` em `x-database-contracts`, e `via=lista` planejada em `acervo.yaml`. Decisões do dono: limites 80/300, livro repetido responde 200, reordenação por item (`/posicao` no lugar de `/ordem`), `livroId` opcional na criação, `contemLivro` no `/me/listas` e 403 de perfil privado.

### Backend 05/10/2026: etapa 2 implementada no `social`. As 10 rotas de listas e `v_lista_livro_pessoal_v1` passaram a `implemented` no `social.yaml`. Migration `V20261005100000__limites_lista.sql` escrita e testada só em Postgres descartável, aguardando revisão. `./mvnw verify` com `DATABASE_URL_TESTE` local: 181 testes, nenhuma falha (23 novos em `ListaControllerIntegracaoTest`, 6 em `RegrasDeListaTest`). Decisões e a pendência do livro inativo registradas em Pendências.

### Revisão 05/10/2026: migration aprovada pelo dono. Posição visível nas listas: livro pessoal excluído não abre mais buraco na numeração nem desloca o mover (opção de renumerar na leitura, só no `social`). `./mvnw verify` local: 188 testes, nenhuma falha.

### Web 05/10/2026: etapa 4 implementada em `code/front`. Rotas `/perfil/listas`, `/perfil/listas/:id`, `/leitores/:username/listas` e `/leitores/:username/listas/:id`; aba `Listas` no perfil (web) e seção com as três mais recentes (abaixo de 768px); reordenar por alça (ponteiro e teclado), botões e menu do item, com volta da ordem e `Tentar de novo` na falha; criar, editar e excluir no dialog; `Adicionar à lista` no livro oficial (menu `Mais ações` novo) e no pessoal do dono. `npm run lint`, `npm test` (689 testes) e `npm run build` verdes. Divergências na pendência "Web: divergências do protótipo".

### Conferência 05/10/2026: web conferida no navegador (Chrome, 1440 e 390 de largura, tema escuro) com a conta do dono no ambiente local: aba e seção `Listas`, índice, lista do dono, menu do item, modo `Reordenar`, arrastar pela alça com o mouse (ordem salva no servidor), editar e confirmar exclusão no mesmo dialog, lista vazia, `Mais ações` do livro oficial, `Adicionar à lista` e criar a partir do livro com o aviso `Ver lista`. Ajustes da conferência: capa de 60 por 90px no dialog da web e linha de inserção por baixo da linha levantada. Listas de teste excluídas ao fim. A migration `V20261005100000` foi aplicada no banco de dev ao subir o `social`. O modo terceiro (perfil público, privado, livro pessoal com `via=lista`) ficou coberto pelos testes, sem dados reais de outra conta.

### Delegação 05/10/2026: etapa 3 (via lista no `acervo`) passou ao Vicenzo, dono do código de livro pessoal. A etapa 3 virou roteiro com as regras de autorização e o bloqueio atual do controller; a pendência registra o estado intermediário e o contorno do dono nos clientes. O dono da F-LST segue com web e mobile.

### Mobile 05/10/2026: etapa 5 implementada em `code/mobile/lib/features/listas/`. Seção `Listas` no meu perfil e no perfil de outro leitor (abas Perfil e Feed), índice em `/perfil/listas` e `leitores/:username/listas`, lista com menu do item e modo `Reordenar` (`SliverReorderableList`), formulário em tela cheia, folha `Adicionar à lista` no livro oficial (menu `Mais ações`) e no pessoal do dono, e o livro pessoal pela lista em `/perfil/livro-pessoal/:id`. O dono abre o próprio livro pessoal sem `via`; o terceiro vê o indisponível com `Voltar à lista` enquanto o `acervo` responde 400 (etapa 3). `flutter analyze` sem avisos, `flutter test` (496 testes, 36 novos) e `flutter build apk --debug` verdes. `dart run tool/generate_tokens.dart --check` falha por artefatos desatualizados desde o commit `119e639`, que mudou o `tokens.json` sem regenerar o Flutter; não é desta etapa. Divergências na pendência "Mobile: divergências do protótipo".

### Conferência 05/10/2026: app conferido no emulador (Pixel 8, API 35) com os quatro serviços locais e duas contas de teste criadas no banco de dev (`flst_dona` e `flst_leitor`). Como dona: seção `Listas` vazia e com listas, criar lista em tela cheia, `Mais ações` do livro oficial, `Adicionar à lista` marcando e somando, criar lista a partir do livro com o aviso e `Ver lista` (abre a lista na aba Perfil), editar e excluir com confirmação e o aviso `Lista excluída.`, índice com mosaicos, menu do item (`Mover para cima` gravado no servidor), modo `Reordenar` com arraste pela alça (ordem gravada), livro pessoal com o selo `PESSOAL` abrindo a página do dono e o menu do livro pessoal com `Adicionar à lista` no topo e a faixa de livro pessoal. Como terceiro: seção `Listas` no perfil da dona, lista só de leitura com `Lista de Marina Teste`, e o livro pessoal pela lista no indisponível com `Voltar à lista`, como esperado até a etapa 3. O perfil privado (RN-08) ficou nos testes. Ajustes da conferência, nas duas plataformas quando cabia: confirmação de exclusão sem "a ordem dos 1 livro" (`textoDaExclusao`, também na web), divisores das linhas com a margem lateral, menu do item pelo navegador raiz (o scrim cobre a barra) e `CaretRight` a `space-5` da borda. `flutter test` (498 testes) e, na web, `npm run lint`, `npm test` (693 testes) e `npm run build` verdes.
