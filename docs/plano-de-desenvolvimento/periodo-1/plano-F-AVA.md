# Plano — F-AVA (Nota e resenha)

> **Versão de 26/09/2026**, já com os ajustes de uma revisão independente. Conferida contra o código de `leitura`, `acervo`, `social`, `identidade`, front, mobile, CI, `render.yaml` e os dois brokers (consulta só de leitura). Este arquivo é autossuficiente: a sessão que o produziu não estará disponível no próximo PC.

## Andamento

- **Fatia 0 (infra do `leitura`): concluída e na `desenvolvimento` em 27/09/2026.** CI verde.
- **Fatias 1, 2 e 3 (nota, resenha, perfil): concluídas e na `desenvolvimento` em 27/09**, nos três lados, com CI verde e teste manual na web e no mobile. O Renato decidiu mergear sem esperar a revisão do Kayke nos commits do `social` (migration de autor anulável e feed); a revisão continua pendente.
- **Fatia 4:** contrato marcado como implementado e conferido contra o `/docs`; `AGENTS.md` do `leitura` e do `social`, histórico da mensageria e arquivo da feature atualizados. **Falta DES**, que depende do PR `desenvolvimento → main`. O `JWT_SECRET` do `leai-leitura` já está no Render (27/09); o do `leai-acervo` e o do `leai-social` faltam.
- **`common-v1`:** corrigido em 26/09 por decisão do Renato (autor anulável), a comunicar ao grupo; cópias do identidade e do social atualizadas no mesmo commit.
- **Diferenças do que foi implementado em relação ao texto abaixo:**
  - **Editor no mobile:** abre no navegador raiz, acima do shell, em vez de uma rota com `parentNavigatorKey`. Esconde a barra inferior sem mexer no `router.dart`.
  - **Serviço do `leitura` nos clientes:** nasceu na fatia 1, com as chamadas de verdade, e não vazio na fatia 0.
  - **Perfil:** "Ver mais resenhas" na própria seção, no lugar da página "Ver todas". No mobile, a lista entra pela seção do Henrique por um parâmetro opcional (`resenhas`), e o livro oficial aberto pelo perfil fica na aba Perfil (`rotaDoLivroOficial(deps, raiz: '/perfil')`).
  - **Migration do `social`:** `V20260927002000__snap_livro_autor_anulavel.sql`, só o `DROP NOT NULL`.
  - Divergências de design registradas em `feature-F-AVA.md` (Pendências).

## Contexto

F-AVA é o "dar nota e escrever sobre o livro" do ciclo de valor:
- nota de 0 a 5 com meia estrela, editável e removível (RF-AVA-01, RN-06);
- uma resenha por livro, editável, texto puro de até 5.000 caracteres (RF-AVA-02, RN-07);
- spoiler que esconde a resenha até o leitor revelar (RF-AVA-03);
- excluir a resenha, com confirmação (RF-AVA-04, RNF-USA-04).

Nota e resenha pertencem ao **livro**, não à leitura (RN-04.5). Em livro pessoal, só o dono escreve (RN-03). Toda escrita aceita `Idempotency-Key` (RNF-ERR-04).

Dono: Renato. Serviço: `leitura` (NestJS), mais web e mobile. F-ACV-BUSCA terminou em 26/09 e já está na `desenvolvimento`.

**Onde estamos (26/09):**
- **Banco:** nada a migrar no `leitura`. `nota`, `resenha`, `idempotencia_leitura`, `outbox_leitura`, `mensagem_processada` e as VIEWs `v_resenha_publicacao_v1`/`v_nota_publicacao_v1` já existem.
- **`leitura`:** só tem health, filtro de erro, correlation-id e o módulo de mensageria (conexão, publisher, despachante da outbox). Falta o resto: JWT, idempotência, erros de negócio, validação do `data` dos eventos, testes de integração.
- **Clientes:** nenhum dos dois fala com o `leitura`. Não existe `VITE_LEITURA_BASE_URL` nem `LEITURA_BASE_URL`, e a página do livro não tem espaço para "Sua avaliação" (os testes exigem que o texto não apareça: `LivroOficialView.spec.ts:46`, `livro_oficial_page_test.dart:93`).
- **Social (Kayke):** o consumidor de `resenha.publicada`/`resenha.excluida` na fila `leai.social.feed` já existe (`ConsumidorDeAtividade.java`). O feed também **lê** as VIEWs de resenha e nota do `leitura` (`ServicoDeFeed.java:224`) e mostra o texto da resenha **sem olhar o spoiler** (`ItemAtividade.vue:148`).
- **Brokers:** no de dev, `leai.social.feed` existe, sem consumidor. No de DES, não há nenhuma fila.

### Prazo e cortes

A Sprint 4 fecha em **29/09/2026**, terça-feira.
- **Gatilho:** se a web da fatia 1 não fechar até o fim de 27/09, sigo para o back da fatia 2 e deixo a web para depois.
- **Ordem de corte, se faltar tempo:**
  1. a página `Ver todas` do perfil;
  2. as telas do perfil. O back fica, porque o teste de RN-08 é obrigatório (AGENTS §9) e é pouco código;
  3. o editor de resenha na web. Sem ele, os botões de resenha da web ficam escondidos.
- **Na web ficam sempre**, por serem baratos e fecharem o RF-AVA-03: "Sua avaliação", o painel de nota e o spoiler escondido no livro pessoal e no feed.
- **OK do grupo** para o `common-v1` até 27/09.
- **DES:** se o PR `desenvolvimento → main` não sair até 29/09, fica registrado como pendente.

## Decisões

### Gerais
- **Branch:** `renato-features`, com merge em `desenvolvimento` ao fim de cada fatia (`git merge --no-edit`). A fatia 0 entra primeiro e sozinha, porque a Ana precisa dela.
- **Fatias:** 0 infra do `leitura` → 1 nota → 2 resenha → 3 resenhas no perfil → 4 contrato, docs e DES. Dentro de cada fatia: back → mobile → web → merge, respeitando o gatilho do prazo.
- **Fonte visual:** os protótipos `.html`. O `.md` vale para regras e copy. Onde os dois divergem, segue o `.html` e registra (lista na fatia 4).
- **Commits:** só a linha em Conventional Commits, sem corpo e sem `Co-Authored-By`. Um commit por assunto.
- **Node:** 22 no `leitura` (`.nvmrc`), 24.19 no front, como em F-ACV-BUSCA.

### Contratos que você decide sozinho (avisando quem consome)

**`docs/api/leitura.yaml`** (rotas ainda `planned`, sem consumidor em produção):
1. `servers` passa para `http://localhost:3001`. Local, o `leitura` roda na 3001, porque o acervo já usa a 3000. No Render, a porta vem do próprio Render.
2. **400 × 422:**
   - **400** para corpo malformado: tipo errado, campo faltando ou sobrando, UUID inválido, `Idempotency-Key` ausente ou inválida.
   - **422** para dado bem formado que fere a regra: nota fora de 0..5 ou fora do passo de 0,5; resenha vazia (só espaços) ou com mais de 5.000 caracteres.
3. **Contagem de caracteres por code point**, igual ao `char_length` do CHECK `resenha_texto_ck`, nos três lados.
   - Servidor: `[...texto].length`, nunca o `@MaxLength` do class-validator, que conta diferente do banco. Por segurança, o erro 23514 do `resenha_texto_ck` também vira 422.
   - Web: `[...texto].length`. Flutter: `texto.runes.length`.
   - Emoji de um code point conta 1. Emoji composto conta mais: 👍🏽 e ❤️ contam 2. O texto do contrato e o teste dizem isso.
4. `ResenhaEntrada.spoiler` obrigatório, sem o `default: false`. Hoje o campo é `required` e tem default ao mesmo tempo.
5. **Livro inexistente, inativo ou pessoal de outra pessoa → 404** em todas as rotas de F-AVA, nunca 403. Conhecer o id não revela que o livro existe (RNF-SEC-06), como no acervo. O 403 fica só para perfil privado em `/perfis/{id}/resenhas`.
6. **DELETE sem nada para apagar → 204, sem evento.**
7. **PUT de nota com o mesmo valor já salvo → 200, sem gravar e sem evento.**
8. **Resenhas do perfil:** `GET /perfis/{usuarioId}/resenhas` passa a devolver `PaginaResenhasPerfil`. Cada item é `ResenhaDoPerfil`: os campos de `Resenha`, mais `livro { id, tipo, titulo, autor (anulável), capaUrl (anulável) }` e `nota` (anulável). É o que o card do Henrique pede (`docs/design/periodo-1/F-PERFIL/meu-perfil.md:307`).
   - Ordem: mais recentes primeiro.
   - Livro inativo não aparece.
   - Avisar o Henrique.
9. **Escopo da idempotência:** `operacao = <operationId>:<livroId>`, por exemplo `salvarNota:<livroId>`. É o "ator + método + caminho canônico" do spec. Janela de 24 h.
   - Difere do acervo, onde reusar a chave em outro livro dá 409.
   - Alinhar com a Ana, para o `leitura` inteiro usar a mesma regra.

**`docs/api/acervo.yaml`:** `v_livro_referencia_v1.autor_exibicao` passa a `nullable: true` (L60). A VIEW já devolve NULL nos 701 livros oficiais sem autor, e o contrato dizia o contrário. Avisar o Vicenzo.

**`docs/mensageria`** (os schemas de F-AVA ficam como estão):
- `nota.alterada.v1`: `criada | atualizada | excluida`, chave `nota:<usuarioId>:<livroId>`. É publicado sem consumidor, de propósito; F-ACV-NOTA fará backfill.
- `resenha.publicada.v1`: só na criação, com `atualizacao=false`. Os dados do usuário vêm de `identidade.v_perfil_referencia_v1`, e os do livro de `acervo.v_livro_referencia_v1`.
- `resenha.excluida.v1`: na exclusão.
- A mudança do `LivroSnapshot.autor` **não** é decisão sua: está em "Precisa do grupo".

**UI (vira divergência registrada, não pedido ao grupo):**
- **"Sua avaliação" mostra a resenha do próprio leitor.** Nem o `.md` nem o `.html` desenham esse estado. O bloco fica assim:
  - título `Sua avaliação` e a linha de estrelas de 24 px com o valor (ou estrelas vazias + `Sem nota`);
  - a linha de estrelas é um **botão com nome**, por exemplo "Sua nota: 4,5. Alterar", e abre o painel de nota;
  - **sem resenha:** botão textual `Escrever resenha`;
  - **com resenha:** o texto em Newsreader (o dono vê mesmo com spoiler), `Publicada em <data>`, a marca `Contém spoiler` com `EyeSlash` 16 px quando for o caso, e o botão `Editar resenha`;
  - `Escrever a primeira`, na lista vazia, só aparece se o leitor ainda não tem resenha.
- **O bloco carrega sozinho.** Se o `leitura` estiver lento (cold start) ou fora, a página abre igual, e o bloco mostra skeleton ou "Não foi possível carregar sua avaliação" com `Tentar de novo`.
- **O bloco recarrega** ao voltar do editor e do painel, na web e no mobile.

### Precisa do grupo (`docs/orquestador`)
1. **Corrigir o `common-v1`:** `LivroSnapshot.autor` passa a `{"type": ["string", "null"], "minLength": 1}`. Isso altera um schema já commitado, o que a regra de imutabilidade proíbe (arquitetura L229, plano-de-projeto L305).
   - O argumento: nenhum evento que carrega `LivroSnapshot` foi publicado até hoje.
   - Prazo do OK: **27/09**.
   - O plano B (`common-v2` + `resenha.publicada.v2`) não sai mais barato, porque o consumidor do Kayke teria de aceitar a v2 também.
2. **O feed lê VIEWs do `leitura`.** Três textos dizem que o feed guarda snapshot em vez de fazer join: a arquitetura §3.2, item 4 (`documento-de-arquitetura.md:139`), o `leitura.yaml:23` e o `feature-F-AVA.md:52`. Mas o `ServicoDeFeed` lê `v_resenha_publicacao_v1` e `v_nota_publicacao_v1`. O grupo ratifica ou reverte. Até lá, F-AVA não muda nenhuma coluna das duas VIEWs.
3. **Resenhas de livro pessoal no perfil.** Pelo RN-15, terceiros só chegam ao livro pessoal pelo feed ou pela lista do dono. O plano segue a leitura literal: no perfil, **só o dono** vê as próprias resenhas de livro pessoal. O grupo confirma.
4. **Componentes novos para o `documento-de-design.md`:**
   - painel de nota e seletor de 32 px;
   - toggle de spoiler;
   - contador de caracteres com três faixas de cor;
   - área de texto longa sem borda;
   - bloco "Sua avaliação" com a resenha própria.

   São os pendentes de `avaliar-livro.md` §7 e `escrever-resenha.md` §7, mais o bloco novo. Junto, o contraste do toggle ligado: texto `ambar` sobre `ambar-fundo` dá cerca de 1,9:1, abaixo do AA do RNF-USA-03. No código, o toggle leva reforço de peso 600 e ícone.

### Avisos
- **Ana**, antes de começar: a fatia 0 é a infra que ela também vai usar (JWT, idempotência, erros, correlation-id, harness, CI, porta 3001, `contratos-externos.ts`). Combinar para ninguém fazer em dobro, e alinhar o escopo da chave de idempotência. Depois do OK do grupo, ela passa a usar `LivroSnapshot.autor` anulável.
- **Kayke:** `resenha.*` saem na fatia 2. Nós mudamos o `social` e o feed, e ele revisa **tudo**:
  - a migration;
  - `Atividade.java`;
  - a cópia do schema;
  - `social.yaml`;
  - `ItemAtividade.vue` (autor vazio e spoiler escondido).

  A fila `leai.social.feed` precisa existir no DES (fatia 4).
- **Henrique:** novo contrato de resenhas do perfil, que nós ligamos nos componentes dele (fatia 3). A cópia do `common-v1` no `identidade` muda junto com a de `docs/mensageria` (fatia 2).
- **Vicenzo:** `autor_exibicao` anulável. A página do livro pessoal ganha "Sua avaliação" para o dono, e o spoiler passa a ser escondido no modo consulta.

## Pré-requisitos no PC

1. **Variáveis:** as do documento `le-ai-variaveis-de-ambiente.md` (fora do repositório), seguindo a seção 0 dele. No `code/back/leitura/.env`:
   - `PORT=3001`;
   - `JWT_SECRET` com o mesmo valor do identidade (32 caracteres ou mais);
   - `AMQP_ENABLED=false` até a fatia 2.
2. **Ferramentas:** `npm ci` em `code/back/leitura`, `code/back/acervo` e `code/front`; `flutter pub get` em `code/mobile`; AVD `Pixel_8_API_35`; JDK 21 para `social` e `identidade`.
3. **Docker:** o mesmo container de F-ACV-BUSCA, com **um banco separado** para o `leitura`. Os harnesses do acervo e do leitura recriam os mesmos schemas.
   ```bash
   docker exec leai-pg-teste createdb -U postgres leai_teste_leitura
   ```
4. **Branch:** `git fetch` e `git merge origin/desenvolvimento` na `renato-features`.
5. **Smoke test:** subir identidade, acervo e leitura, chamar `GET /health` em cada um e fazer login na web local.

---

## Fatia 0 — Infra do `leitura` (merge cedo)

Copiar do acervo, adaptando nomes. Não existe pacote compartilhado entre os serviços; a regra é copiar.

**0.1 Autenticação.** `code/back/acervo/src/auth/*`:
- guard global via `APP_GUARD`, `@Publico`, `@UsuarioAtual`, HS256 com issuer `identidade`;
- dependência `jsonwebtoken`;
- `/health` marcado `@Publico`;
- em `src/config/env.ts`, `JWT_SECRET` com mínimo de 32 e obrigatório em produção (hoje é opcional e sem mínimo).

**0.2 Bootstrap e correlation-id.**
- `configurar-app.ts` + `validacao.ts`, com `ValidationPipe` usando `forbidNonWhitelisted` e o `exceptionFactory` de erro por campo. O mesmo usado pelo `main.ts` e pelos testes.
- `correlation.middleware.ts` do acervo, que **só aceita UUID**. O atual (`leitura/src/common/correlation.middleware.ts:19`) aceita qualquer texto, e `outbox_leitura.correlation_id` é `uuid NOT NULL`: um `X-Correlation-Id: abc` derrubaria a gravação com 500 (`acervo/AGENTS.md:60`).

**0.3 Erros.**
- `erros-de-negocio.ts`, `pg-erros.ts`, `hash-payload.ts`, e o `all-exceptions.filter.ts` do acervo. O atual (L39) não devolve `campos` nem cabeçalhos.
- Classe nova `EntidadeInvalida(campos)` → 422 `ENTIDADE_NAO_PROCESSAVEL`, com `campos`. O código já existe em `error-codes.ts`.

**0.4 Idempotência.**
- `common/idempotencia/*` do acervo: é serviço, não interceptor, e grava o recibo na mesma transação do efeito.
- Apontar para `idempotencia_leitura`. **Atenção:** o índice único é `idempotencia_leitura_subject_operacao_chave_uk`, com predicado `subject_ref IS NOT NULL AND chave IS NOT NULL`, diferente do acervo. O tratamento do 23505 tem de usar esse nome.
- Escopo da chave como no item 9 das Decisões.

**0.5 Limite de requisições.** `common/rate-limit/*`, com **um escopo por rota** (`acervo/AGENTS.md:82`), para usar nas escritas de F-AVA: publicar resenha gera atividade social.

**0.6 VIEWs de outros serviços.** `src/db/contratos-externos.ts`, no molde do acervo (`.existing()`):
- `acervo.v_livro_referencia_v1`;
- `identidade.v_perfil_referencia_v1`;
- `identidade.v_seguimento_aceito_v1`.

**0.7 Mensageria.**
- `OutboxRepository.inserir(tx, { tipo, versao, chaveNegocio, payload })` + `eventos.ts`, copiados de `acervo/src/livros/outbox/`.
- No `message-validator.ts`, entram `registerDataSchema` e `ajv.addSchema(common-v1)`. Nenhum serviço TypeScript resolve hoje o `$ref` para `common-v1.schema.json`; o `$id` do common já casa com o `$ref` relativo.
- `MessagingModule` passa a exportar o validador.
- **O `data` de cada evento é validado no `inserir`.** Um evento fora do contrato desfaz a transação (500) em vez de cair na DLQ do serviço de outra pessoa. Para dado estranho do acervo não virar 500, quem monta o evento limpa antes:
  - `capaUrl` e `avatarUrl` que não sejam URL válida viram `null`;
  - valor numérico lido por SQL cru é convertido para número.
- `src/messaging/schemas/` com cópias idênticas + `schemas.spec.ts`, que compara com `docs/mensageria`.

**0.8 Testes de integração.** `test/integracao/` e `jest-integracao.json`, copiados do acervo:
- `ambiente.ts` com `search_path=leitura`; recusa Neon e Render.
- `app.ts` com `tokenDe()`.
- `banco.ts` com as VIEWs de acervo e identidade como **tabelas**, e `migrationsSchema 'leitura'`.
- `massa.ts` com livro oficial, pessoal, sem autor e inativo; perfil público e privado; seguimento.
- `broker-em-memoria.ts`, para o teste outbox → despachante → envelope válido (RNF-TST-03).
- Script `test:integration`.

**0.9 CI.** `ci-back-leitura.yml` ganha o serviço Postgres 17 e o passo `npm run test:integration`, no molde de `ci-back-acervo.yml:38-81`, e o filtro `docs/mensageria/schemas/**`.

**0.10 Ambiente.**
- `.env.example` com `PORT=3001`.
- `render.yaml`:
  - `JWT_SECRET` (`sync: false`, mesmo valor do identidade) no `leai-leitura`;
  - `VITE_LEITURA_BASE_URL=https://leai-leitura.onrender.com` no `leai-web`. A variável entra no build: sem ela, a web do DES chama `undefined/…`;
  - o CORS do `leitura` já está certo (`render.yaml:77-78`).
- **Web:** `VITE_LEITURA_BASE_URL` em `.env.example` e `env.d.ts`, e `src/services/leitura.ts` vazio, no molde do `acervo.ts` (`baseUrl`, `fetch`, `getToken` injetáveis).
- **Mobile:** `LEITURA_BASE_URL` em `app_config.dart` (padrão `localhost:3001`), `LeituraService` sobre o `ApiClient`, e `--dart-define=LEITURA_BASE_URL=http://10.0.2.2:3001` no `code/mobile/AGENTS.md`.

**0.11 Testes da fatia.**
- autenticação: sem token, token inválido, issuer errado;
- correlation-id malformado substituído por um UUID;
- idempotência: mesma chave e payload reproduzem a resposta; payload diferente → 409; chave inválida → 400;
- filtro de erro com 422 e `campos`;
- `schemas.spec`.

**0.12 Merge e aviso.** CI verde, merge em `desenvolvimento`, aviso à Ana. Registrar a infra no `code/back/leitura/AGENTS.md`.

---

## Fatia 1 — Nota (back → mobile → web → merge)

### 1.1 Contrato primeiro
Itens 1, 2, 5, 6, 7 e 9 das Decisões, aplicados a `salvarNota`, `excluirNota` e `consultarMinhaAvaliacao`.

### 1.2 Backend (`src/avaliacoes/`: controller, service, repository, specs)

**Livro:** lido de `v_livro_referencia_v1`.
- Aceito se estiver `ativo` e for oficial, ou pessoal com `dono_id` igual ao leitor. Caso contrário, 404.
- VIEW inacessível (`ehFalhaDeContratoExterno`) → 503.

**`PUT /livros/:livroId/nota`:**
- `valor` precisa ser número (400); fora de 0..5 ou fora do passo de 0,5 → 422.
- Tudo dentro de `idempotencia.executar`.
- `INSERT … ON CONFLICT (usuario_id, livro_id) DO UPDATE … WHERE nota.valor IS DISTINCT FROM excluded.valor RETURNING (xmax = 0) AS criada`:
  - linha nova → evento `criada`;
  - linha atualizada → `atualizada`;
  - sem linha → mesmo valor: 200, sem evento.
- Duas chaves diferentes ao mesmo tempo geram uma nota só.

**`DELETE /livros/:livroId/nota`:** `DELETE … RETURNING`. Se apagou, evento `excluida` com `nota: null`. Sempre 204.

**`GET /livros/:livroId/minha-avaliacao`:** `{ livroId, nota | null, resenha | null }`.

**Rate limit:** `@RateLimit` nas escritas, com escopo por rota, por exemplo 60 por minuto por identidade.

### 1.3 Testes do backend
- **Unitários:** os 11 valores (inclusive 0), −0,5, 5,5, 4,3, `"4"`, `null`.
- **Integração:**
  - oficial, pessoal do dono, pessoal alheio (404), inativo (404), inexistente (404);
  - criar, atualizar, mesmo valor sem evento, excluir, excluir sem nota;
  - forma exata de `Nota` e `MinhaAvaliacao`;
  - evento validado contra o schema, com a chave de negócio certa;
  - atomicidade nota + outbox;
  - repetição com a mesma chave sem segunda linha na outbox;
  - payload diferente → 409;
  - criação concorrente;
  - 401;
  - outbox → despachante → envelope válido no `broker-em-memoria`;
  - VIEW ausente → 503, num arquivo próprio.

### 1.4 Mobile
- **Serviço:** `LeituraService.salvarNota`, `excluirNota` e `obterMinhaAvaliacao`, com parse defensivo e modelos `Nota`, `Resenha` e `MinhaAvaliacao`.
- **Estrelas (`lib/design/widgets/`):**
  - `EstrelasDeNota` (exibição, 16 e 24 px), extraída do `_Estrelas` privado de `livro_pessoal_page.dart:406`;
  - `SeletorDeNota` (entrada, 32 px): alvo de 48 px, meia estrela pela metade esquerda, arraste horizontal, e valor lido em texto pelo leitor de tela.
- **`PainelDeNota`:** `mostrarFolhaInferior`, com
  - card do livro (capa 60×90);
  - seletor;
  - `num-display`, ou `Sem nota`, ou `0` com `Você deu nota 0 a este livro.`;
  - `Salvar nota` desabilitado sem valor;
  - `Remover nota` em rubi, só com nota salva;
  - estados `Salvando` e erro, com a mesma chave por intenção (`ChaveDaIntencao.para`, `lib/features/conta/validacao_de_senha.dart:22`);
  - `Escrever resenha` **escondido nesta fatia**, porque ainda não há editor.
- **Remover nota:** o sheet dá lugar ao dialog centrado (`confirmarNoModal`), como pede o design 4.5. `Cancelar` volta ao painel.
- **Página do livro oficial:**
  - `AvaliacaoController` carrega `minha-avaliacao` em paralelo com a página;
  - o bloco "Sua avaliação" fica entre o hero e a Sinopse;
  - nesta fatia, sem os botões de resenha.
- **Página do livro pessoal, visão do dono:** o mesmo bloco substitui "Sua nota" e "Você ainda não avaliou este livro."
- **Testes novos:**
  - painel com os 4 estados, confirmação, e erro reenviado com a mesma chave;
  - seletor: toque, meia estrela, semântica;
  - bloco com o `leitura` fora do ar e a página abrindo mesmo assim.
- **Testes que quebram e precisam de ajuste:**
  - `livro_oficial_page_test.dart:93`, que passa a esperar o bloco;
  - `DependenciasDeLivros` ganha `leitura`: 3 trechos de `test/app/router_test.dart` (L139, L301, L401) e o `_acervoPorRota`;
  - `livro_pessoal_page_test.dart:59` (o construtor ganha o serviço do leitura) e L87, L121, L134;
  - `test/features/livros/apoio.dart` ganha um `leituraSimulado`.

### 1.5 Web
- **Serviço:** `leitura.ts`, com spec por `fetch` injetado e `novaChaveIdempotencia()` (`api.ts:75`).
- **`SeletorDeNota.vue`:**
  - `role="slider"`, `aria-valuetext` `4,5` ou `Sem nota`;
  - setas mudam em passos de 0,5;
  - hover pré-visualiza em 60% de opacidade, com o valor em `grafite-suave`.

  `EstrelasNota.vue` continua para exibição.
- **`PainelDeNota.vue`:**
  - sobre `SobreposicaoModal` (sheet abaixo de 768 px; dialog de 460 px, a largura do `.html`);
  - `Remover nota` à esquerda, `Escrever resenha` + `Salvar nota` à direita. `Escrever resenha` fica escondido nesta fatia;
  - **a confirmação troca o conteúdo do mesmo modal**, em vez de abrir um segundo modal por cima: dois modais disputariam o foco, e o design diz que o painel "dá lugar" ao diálogo (`avaliar-livro.md:271`).
- **Composable e bloco:** `useMinhaAvaliacao` e `BlocoSuaAvaliacao.vue`.
  - Na `LivroOficialView`, o bloco entra entre o cabeçalho (`order-2`) e a sinopse (`order-3`).
  - Na `LivroPessoalView`, entra na visão do dono.
- **Testes que quebram e precisam de ajuste:**
  - `LivroOficialView.spec.ts:46`, que passa a esperar o bloco;
  - `LivroPessoalView.spec.ts:70/91/106`;
  - `vi.mock` do serviço de leitura em todo spec que monta `/livros/:id` (`LivroOficialView`, `CadastroIsbnView`, `LivroPessoalView`).

### 1.6 Merge
CI verde e merge em `desenvolvimento`.

---

## Fatia 2 — Resenha (back → mobile → web → merge)

### 2.1 Contrato
- Itens 3 e 4 das Decisões.
- `autor_exibicao` anulável no `acervo.yaml`.
- Com o OK do grupo, `LivroSnapshot.autor` anulável no `common-v1`. **No mesmo commit**, atualizar as cópias do `leitura`, do `social` e do `identidade`. O `EventosDePerfilSchemaTest.java:104-119` do identidade compara a cópia dele, e o CI do identidade não roda quando só `docs/` muda: a quebra apareceria depois, no push de outra pessoa.

### 2.2 Backend

**`PUT /livros/:livroId/resenha`:**
- `texto` precisa ser string e `spoiler` booleano (400).
- Só espaços, ou mais de 5.000 code points → 422 (item 3 das Decisões).
- O texto é guardado exatamente como chegou. O servidor não interpreta nem gera HTML; o escape é do cliente.
- `INSERT … ON CONFLICT DO UPDATE … RETURNING id, (xmax = 0) AS criada`.
- **Na criação:** monta os dados do usuário e do livro (URLs inválidas viram `null`) e grava `resenha.publicada` (`resenha:<id>:publicada`).
- **Na edição:** sem evento.
- Conta fora de `v_perfil_referencia_v1` (suspensa ou em exclusão) → 403.

**`DELETE /livros/:livroId/resenha`:** `DELETE … RETURNING id` e `resenha.excluida`. As reações caem em cascata.

**`minha-avaliacao`:** passa a trazer a resenha.

### 2.3 Testes do backend
- **Limites:** 1, 5.000, 5.001; só espaços; emoji de um code point conta 1 e 👍🏽/❤️ contam 2; HTML guardado cru; 23514 → 422.
- **Spoiler:** liga e desliga sem evento.
- **Criação:** uma `publicada` válida contra o schema, com:
  - livro sem autor (`autor: null`);
  - livro pessoal (`autor_informado`);
  - avatar nulo;
  - capa com URL malformada virando `null`.
- **Edição:** sem segunda `publicada`.
- **Exclusão:** `excluida`. Recriar gera novo id e nova `publicada`.
- **Resto:** idempotência, os 404, atomicidade, conta suspensa → 403, e outbox → despachante → envelope válido para os dois eventos.

### 2.4 `social` (feito por nós, revisado pelo Kayke)
- **Migration Flyway** `V<timestamp>__snap_livro_autor_anulavel.sql`, com timestamp maior que `V20260925140000`:
  - só o `DROP NOT NULL` de `snap_livro_autor`. O CHECK `atividade_snap_livro_autor_preenchido` já aceita NULL e não muda;
  - no topo, um comentário SQL dizendo que veio de F-AVA, em 26/09, e por quê.
- **`Atividade.java:62`:** tirar o `nullable = false` da coluna.
- **Checkpoint humano:** Renato revisa e Kayke aprova antes de subir.
  - **O Flyway aplica sozinho** quando alguém sobe o `social` local contra o banco de dev. Combinar com o Kayke quando, porque ele tem a `V20260925140000` pendente no dev.
  - Combinar também o número da versão, para ele não criar outra menor em paralelo.
- **O consumidor não muda,** mas há uma armadilha: o `catch (DataIntegrityViolationException)` de `ConsumidorDeAtividade.java:104` também engole o erro de NOT NULL.
  - Um evento com autor nulo que chegue antes da migration faz a atividade **sumir sem erro e sem ir para a DLQ**.
  - Por isso a migration precisa estar aplicada (dev e DES) antes do primeiro evento com autor nulo.
  - O teste novo confere que a linha foi gravada.
  - Sugerir ao Kayke estreitar esse `catch` para as duas unicidades.
- **Feed (`ItemAtividade.vue`):**
  - L122: esconde a linha do autor quando vier vazia;
  - L148: a resenha com spoiler fica **fora do DOM** até "Mostrar mesmo assim", como no `CardResenha`. Hoje ela aparece aberta, o que fere o RF-AVA-03;
  - o spec do componente cobre os dois casos.
- **Resto:**
  - `LivroSnapshot.autor` anulável no `social.yaml`;
  - teste em `ConsumidorDeAtividadeIntegracaoTest` com livro sem autor, conferindo a linha gravada.
- **Para o agente do Kayke saber o que aconteceu:**
  - nota datada em `code/back/social/AGENTS.md` com o quê, por quê e onde (migration, `Atividade.java`, schema, `social.yaml`, `ItemAtividade.vue`, e a armadilha do `catch`);
  - a mesma informação numa seção **nova** de histórico em `docs/mensageria/README.md`;
  - a pendência em `feature-F-AVA.md`.

  Não editamos o `feature-F-FEED.md`, que é dele (AGENTS §5.3).
- **Para a Ana:** nota em `code/back/leitura/AGENTS.md` de que `LivroSnapshot.autor` é anulável.

### 2.5 Mensageria local
Só aqui `AMQP_ENABLED=true` no `leitura` local, **depois** que a migration do `social` estiver aplicada no banco de dev e depois de avisar o time.
- A fila `leai.social.feed` já existe no dev. Os eventos esperam lá até um `social` local consumir, e as atividades vão para o banco de dev do time.
- O `nota.alterada` não tem fila e se perde, de propósito.

### 2.6 Mobile
- **Editor `EscreverResenhaPage`, em tela cheia:**
  - rota `resenha` dentro da rota do livro, com `parentNavigatorKey` apontando para uma `navigatorKey` nova no `GoRouter` (`router.dart`). Assim a barra inferior some, como pede o design. Hoje toda rota autenticada fica dentro do shell;
  - header com `X`, `Resenha` e `Publicar` / `Salvar` / `Publicando`;
  - card do livro com a nota, ou `Sem nota` + `Dar nota` (abre o painel);
  - `TextField` sem borda em Newsreader, **sem `maxLength`**: o texto nunca é cortado;
  - barra acima do teclado com `ToggleSpoiler` (novo, 48 px, `Semantics(toggled:)`, peso 600 e ícone quando ligado), contador com três faixas (`ambar` a partir de 4.750, `rubi` acima de 5.000) e `Trash` quando for edição;
  - aviso de spoiler e erro de limite **acima** da barra, como no `.html`;
  - erro com `BannerAviso`;
  - o contador é anunciado só ao cruzar faixa;
  - descartar com texto não salvo pede confirmação (`X` e `PopScope`);
  - excluir usa `confirmarNoModal`;
  - depois de publicar ou excluir, volta ao livro e o bloco recarrega.
- **`Escrever resenha` no painel de nota:**
  - aparece em todos os estados;
  - se a nota mudou, salva primeiro; se o salvamento falhar, mostra o erro e fica no painel, sem abrir o editor;
  - sem mudança na nota, abre o editor direto.
- **"Sua avaliação":** ganha a resenha própria e `Escrever resenha` / `Editar resenha`. A lista vazia ganha `Escrever a primeira`.
- **Livro pessoal:** visão do dono com o editor; no modo consulta, o spoiler fica escondido. Extrair `_BlocoDeSpoiler` (`livro_oficial_page.dart:363`) para `lib/design/widgets/`.
- **"Mostrar mesmo assim":** o foco vai para o texto revelado.
- **Testes:** contador (faixas, code points), texto acima do limite não cortado e `Publicar` desabilitado, spoiler, descarte, exclusão, erro preservando o texto, `Escrever resenha` do painel com salvamento que falha.

### 2.7 Web
- **Rotas:** `livros/:id/resenha` e `livros/pessoal/:id/resenha`.
  - Meta `fechar` e uma meta nova `semBarraInferior` no `ShellAutenticado`: abaixo de 768 px vale o desenho mobile, que esconde a barra (`escrever-resenha.md:200` e `:342`).
  - A rota mantém a aba de origem.
  - O `X` sem histórico leva à página do livro.
- **Ações no header:** `Cancelar` + `Publicar`, por `Teleport` para `#cabecalho-acoes`.
- **Sair sem salvar pede confirmação:** Esc, navegar para fora (`onBeforeRouteLeave` + `DialogoConfirmacao`, padrão de `EditarPerfilView.vue:301`), e fechar a aba ou recarregar (`beforeunload`) (`escrever-resenha.md:354`).
- **Depois de publicar ou excluir:** sair com `router.replace`, para o voltar do navegador não reabrir o editor. O bloco recarrega.
- **`EscreverResenhaView.vue`:**
  - duas colunas a partir de 768 px: esquerda de 280 px fixa, com capa 240×360, título, autor, estrelas e data; direita com o texto limitado a 68ch e a barra fixa no rodapé da área de conteúdo;
  - uma coluna abaixo de 768 px.
- **Componentes novos:** `AreaDeTextoLonga` (o `CampoAreaTexto` tem borda), `ToggleSpoiler` (`aria-pressed`, peso 600 e ícone quando ligado) e `ContadorDeCaracteres`.
- **`Trash` também na web**, na barra do rodapé. O artboard web de edição não desenha o gatilho; registrar.
- **"Sua avaliação", lista vazia e `Escrever resenha` do painel:** como no mobile.
- **`LivroPessoalView`:** no modo consulta, passa a respeitar o spoiler, reusando a lógica do `CardResenha` (hoje ignora, L249-279).
- **"Mostrar mesmo assim":** o foco vai para o texto revelado.
- **Testes:** os mesmos do mobile e o texto do spoiler fora do DOM.

### 2.8 Merge
CI verde (leitura, social, identidade e front) e merge em `desenvolvimento`.

---

## Fatia 3 — Resenhas no perfil (back → mobile → web → merge)

### 3.1 Contrato
Item 8 das Decisões.

### 3.2 Backend: `GET /perfis/:usuarioId/resenhas?page&limite`
- **Perfil:** lido de `v_perfil_referencia_v1`. Ausente (inexistente, suspenso ou em exclusão) → 404.
- **Privacidade (RN-08):** próprio, público ou seguidor aceito; senão 403.
- **Consulta:** junta `v_livro_referencia_v1` (só ativo) e a nota do autor (LEFT JOIN).
- **Livro pessoal:** só para o próprio dono.
- **Paginação:** base 1, `limite` até 50, contagem separada.

### 3.3 Testes do backend
- matriz RN-08: público, privado visto pelo dono, privado com seguidor, privado sem seguidor (403), ausente (404);
- pessoal oculto para terceiros;
- livro inativo fora;
- autor nulo, nota nula;
- `limite` 51 → 400;
- forma exata.

### 3.4 Mobile e web
- **Card:** entra no `SecoesDeLeitura` do Henrique (`widgets_de_identidade.dart:199`, `SecoesDeLeitura.vue:117`), com as 2 mais recentes.
  - Mobile: capa 40×60, título, autor, estrelas de 16 px + valor e trecho de 3 linhas em Newsreader.
  - Web: coluna única de até 720 px, capa 60×90.
- **Spoiler:** terceiros veem `Esta resenha contém spoiler` com a ação `Mostrar mesmo assim` no lugar do trecho, com o texto fora do DOM até revelar (RF-AVA-03).
- **Tocar no card:** abre o livro na aba Perfil.
  - Mobile: `rotaDoLivroOficial(deps, raiz: '/perfil')`.
  - Web: `?origem=perfil` na meta `aba` da rota `livro-oficial`.
- **`Ver todas`:** abre uma lista paginada com o mesmo card, no padrão de conexões (`conexoes_page.dart`, `ConexoesView.vue`). **É o primeiro corte.**
- **Testes:** perfil próprio, de outro, privado negado, vazio, spoiler.

### 3.5 Merge
CI verde e merge em `desenvolvimento`. Avisar o Henrique para atualizar a pendência dele.

---

## Fatia 4 — Contrato, docs e DES

**`docs/api/leitura.yaml`:**
- `x-implementation-status: implemented` nas 5 operações de F-AVA;
- `info.description` atualizado;
- conferir contra o `/docs` em runtime.

**`docs/mensageria/README.md`:** a seção de histórico criada na fatia 2, com a data do OK do grupo.

**`code/back/leitura/AGENTS.md`:** infra da fatia 0 e regras de F-AVA:
- 422;
- code points;
- 404 para livro inacessível;
- DELETE sem alvo → 204;
- validação do `data` no `inserir`, com a limpeza das URLs;
- correlation-id só UUID.

**`feature-F-AVA.md`:**
- status por camada;
- decisões;
- Timeline;
- corrigir L25 e L96, que dizem que o P0-MSG não está pronto (está desde 19/09).

**Divergências e pendências a registrar em `feature-F-AVA.md`:**
- resenha própria em "Sua avaliação", que o design não desenha, e a copy do erro do bloco;
- dialog de nota com 460 px (`.html`) em vez de 420 (`.md`);
- aviso de spoiler e erro de limite acima da barra;
- `Trash` na web;
- página `Ver todas` do perfil;
- spoiler escondido no trecho do perfil, no modo consulta do livro pessoal e no feed;
- contagem por code point, com emoji composto contando mais de 1;
- 404 no lugar de 403;
- contraste do toggle de spoiler (ambar sobre ambar-fundo);
- **RNF-TST-03 ponta a ponta de `resenha.*` com o consumidor do F-FEED:** F-AVA cobre até o envelope válido no broker em memória; o resto fica pendente com o Kayke;
- **ordem dos eventos:** o despachante segura só a linha que falhou, então um `excluida` pode sair antes do `publicada`. Hoje o feed ignoraria o `excluida` e depois criaria a atividade. É raro, mas fica registrado e avisado ao Kayke;
- as 4 decisões do grupo e a nota ao agente do Kayke.

**DES (DoD):**
- Depende do PR `desenvolvimento → main`. Se não sair até 29/09, fica registrado como pendente.
- **Antes do merge na main:** `JWT_SECRET` do `leai-leitura` configurado no painel do Render. Ele passa a ser obrigatório em produção, e sem ele o `leitura` não sobe.
- A `VITE_LEITURA_BASE_URL` do `leai-web` já vem da fatia 0.
- APK com `LEITURA_BASE_URL` do DES.
- **Antes da primeira resenha no DES:**
  - a migration do `social` aplicada (vai no deploy dele);
  - `leai.social.feed` existe e tem consumidor no `Le-ai-oregon` (skill `cloudamqp-status`). Hoje não há fila nenhuma lá. O `social` cria a fila quando sobe.
- **Se a fila não existir,** mudar `AMQP_ENABLED` para `"false"` no próprio `render.yaml` (commit), não pelo painel: o `render.yaml:79-80` fixa `"true"`, e uma sincronização do Blueprint desfaria a mudança. A outbox segura as linhas, e o despachante publica depois.
- F-AVA não tem migration no `leitura`.

---

## Verificação

- **leitura:** `npm run lint && npm run build && npm test && npm run test:integration`, a última com `DATABASE_URL_TESTE=postgresql://postgres:teste@localhost:55432/leai_teste_leitura`.
- **social e identidade:** testes do Maven conforme o `AGENTS.md` de cada um (o do identidade confere a cópia do `common-v1`).
- **Web:** `npm run lint && npm run build && npm test` em `code/front`.
- **Mobile:** `dart run tool/generate_tokens.dart --check && flutter analyze && flutter test && flutter build apk --debug`.
- **Manual** (web e AVD), com identidade, acervo e leitura locais sobre o banco e o broker de dev:
  - dar nota 0 e ver `0`, não `Sem nota`; dar 4,5; remover com confirmação;
  - escrever uma resenha com spoiler e vê-la em "Sua avaliação";
  - entrar com outra conta, que segue ou vê perfil público, e ver a resenha escondida na lista e no feed até revelar;
  - editar sem nova linha `resenha.publicada` na outbox (conferir por SQL); excluir; recriar e ver um id novo;
  - uma resenha num livro sem autor vira atividade no feed, sem a linha do autor;
  - repetir com a mesma chave (reenviar depois de erro) sem duplicar;
  - perfil público, privado seguido e privado não seguido.
- **Modo escuro:** conferir os 6 artboards escuros (3 da nota, 3 da resenha): fundo escurecido, folha em `noite-elevada`, contador e toggle nos tons `-claro`.
- **CI verde** na `renato-features` em cada fatia.

## Riscos e o que fica fora

- **Prazo de 29/09:** 3 dias para 4 fatias. Gatilho e ordem de corte em "Prazo e cortes".
- **Infra em dobro com a Ana:** combinar antes da fatia 0.
- **Migration no serviço de outra pessoa:** o Flyway aplica sozinho no banco de dev compartilhado. Só com o OK do Kayke e na hora combinada.
- **Atividade que some sem erro:** o `catch` do consumidor do feed engole o NOT NULL. A migration vem antes do primeiro evento com autor nulo (2.4 e 2.5).
- **Evento perdido:** o publisher não usa `mandatory`, então um evento publicado sem a fila existir some. No DES, conferir a fila antes (fatia 4).
- **OK do grupo que não chega até 27/09:** o plano B (v2) também exige mudança no `social`.
- **Banco e broker de dev compartilhados:** as resenhas de teste aparecem no feed do time.
- **Fora do escopo:**
  - curtir e descurtir, frases e Markdown (F-AVA-2);
  - nota geral e nota dos leitores (F-ACV-NOTA);
  - estrelas e `@username` no card das resenhas da página, divergência já registrada em F-ACV-BUSCA;
  - fila offline do mobile (RNF-ERR-05);
  - o feed mobile do Kayke.
