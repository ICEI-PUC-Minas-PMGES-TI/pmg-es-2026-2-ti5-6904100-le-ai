# Plano — F-MOD (Moderação)

> **Executado de 18 a 21/10/2026.** Os commits saíram como planejado, mais um `fix:` achado no teste manual e o merge da `desenvolvimento`. O que mudou na execução está na timeline e nas Pendências de [`../feature-F-MOD.md`](../feature-F-MOD.md), que prevalece sobre este plano.

> Plano de 16/10/2026, **revisado no mesmo dia** com os 25 achados da revisão independente (veredito: aprovado com ajustes) e, depois, com a segunda rodada: contexto gravado na denúncia, a marca `remocao_solicitada_em` e o 409 do recibo vencido.

## Contexto

A F-AVA-2 foi concluída em 09/10/2026 e está em `Em revisão (PR)`. A próxima feature, pela ordem de trabalho de `renato-periodo-2/README.md` (item 4), é a **F-MOD**. A Sprint 5 vai até 03/11, e a F-ACV-NOTA ainda vem depois.

**Requisitos que a feature fecha:**
- RF-MOD-01: denunciar resenha e comentário, com o motivo em texto livre. A resenha de livro pessoal entra pelo RN-15.4.
- RF-MOD-02: painel do admin com as denúncias pendentes, por data.
- RF-MOD-03: remover o conteúdo ou arquivar a denúncia.
- RF-MOD-05: log de auditoria.
- RN-11: remoção direta de frase pelo admin.

**Fontes:**
- `docs/plano-de-desenvolvimento/periodo-2/feature-F-MOD.md`;
- REQUISITOS §5.11, RN-08, RN-10.5, RN-11, RN-15.4, RN-23.7, RNF-ERR-04/08 e RNF-SEC-04/18/35/36/37;
- arquitetura §3.1, §3.2 e §4.2;
- design: `F-MOD/denunciar.md` (DEN), `F-MOD/painel-de-moderacao.md` (PAI), `F-AVA-2/frases-do-livro.md` (FR) e as edições `pagina-do-livro`, `livro-pessoal` e `comentarios`.

**O que já existe na `origin/desenvolvimento` (4ee5e71):**
- As tabelas `denuncia` e `log_moderacao` estão no baseline do `social` (`V20260916024928__cria_modelo_social.sql:267-320`), e o `ConsumidorDeContaExcluida` do Henrique já as anonimiza.
- O JWT sempre traz o claim `papel` (`leitor` ou `admin`), mas nenhum serviço o lê.
- O `social` não faz chamada HTTP.
- A regra de acesso RN-15 nasceu no `acervo` (`src/livros/pessoal/autorizacao-rn15.service.ts`) e foi portada para o `leitura` em `src/reacoes/reacoes.service.ts:153-219` e `reacoes.repository.ts`.

## Decisões do dono (16/10/2026)

**Denúncia:**
- **Motivo:** até 500 code points.
- **Denúncia repetida:** se o mesmo leitor denunciar de novo o mesmo alvo pendente, a resposta é **200 com a denúncia existente**.
- **Remover:** fecha **todas** as pendentes do alvo como `removida`. Isso inclui as respostas de um comentário-raiz e, numa resenha, os comentários da atividade, que saem pelo CASCADE.
- **Arquivar:** fecha **só a denúncia escolhida**.
- **Conteúdo excluído pelo autor:** o painel mostra que ele está indisponível e oferece só `Arquivar`.
- **Fila:** sem o total de pendentes.

**Remoção pelo `leitura` e auditoria:**
- **Autenticação:** `social` → `leitura` com **segredo compartilhado**, no header `X-Moderacao-Token`.
- **Auditoria completa, como no protótipo:** o log ganha `alvo_livro_id` e `atividade_autor_id`, que a anonimização anula.
- **Admin no `leitura`:** o `VerificadorJwt` passa a ler `papel`. O admin vê e remove frases de perfis privados, para que nenhuma frase visível fique fora da moderação.

**Web:**
- **Painel abaixo de 768px:** uma linha `Moderação` em Configurações, só para o admin. Ela não tem design e fica registrada como divergência.

**Execução:**
- **Branch e commits:** `renato-features`, commits só com a linha da mensagem, `git add` por caminho e testes verdes antes de cada commit.
- **Fechamento:** **push e PR para a `desenvolvimento`**, sem linha de atribuição. Um colega revisa, e não há merge local.

**Decisões técnicas da revisão:**
- **Chave para o `leitura`:** a chave de idempotência que o `social` manda é **determinística por alvo**. Assim, um timeout depois de o `leitura` já ter apagado termina em replay, e não em 409 sem log.
- **Cliente HTTP:**
  - timeout de leitura de 60 s, abaixo dos 90 s do cliente web;
  - uma retentativa com espera de 2 s, só em falha de conexão ou 503;
  - aquecimento do `leitura` (`GET /health`) quando o painel abre.
- **Paginação por cursor keyset** nas duas listas do admin, no lugar do `?page=` da spec. Registrar como divergência.
- **Recibos de idempotência mínimos:** só `id`, `estado` e datas. Sem motivo, trecho, `autorId` ou nomes.

## Dependências de outras pessoas (avisar no PR)

- **Henrique:**
  - `ConsumidorDeContaExcluida` do `social`;
  - consumidor `conta.excluida` do `leitura` (`src/conta/conta-excluida.consumer.ts`);
  - `front/src/session.ts`;
  - `ConfiguracoesView.vue`;
  - `lista/repository/ReferenciasDeLista.java`, só leitura e reúso;
  - `MenuDeAcoes.vue`, junto com o Kayke;
  - `SidebarNavegacao.vue`, junto com o Vicenzo.
- **Kayke:**
  - `ComentarioItem.vue` e `ModalComentarios.vue`;
  - `comentario_item.dart` e `folha_comentarios.dart`, com o Vicenzo;
  - `MenuDeAcoes.vue`;
  - `config/SecurityConfig.java` e `integracao/IntegracaoComPostgres.java` do `social`.
- **Vários donos (Henrique, Vicenzo, Kayke e Ana):**
  - `front/src/router/index.ts` e `front/src/testes/montarNaRota.ts`;
  - `mobile/lib/app/router.dart`, só a linha do `social` na aba Feed.

  O `ServicoDeInteracao` e o `ConsumidorDeAtividade` dele **não são alterados**: a moderação apaga por SQL no próprio repositório.
- **Dono do job de inatividade:** o redact do `x-scheduler-token` (achado 2).

## Pré-requisitos

0. **Branch atualizada (feito em 16/10):** a `renato-features` avançou por fast-forward até 4ee5e71 e está 0 à frente e 0 atrás da `origin/desenvolvimento`. Falta copiar este plano para o repositório.
   - **CodeGraph por padrão:** o repositório tem `.codegraph/`, que está no `.gitignore`. Toda leitura e localização de código, antes de cada edição, começa por `codegraph_explore`. `Read` e `Grep` ficam para configs, docs e SQL de migration, e para o que o índice não cobrir.
   - Subagentes recebem a mesma instrução.
   - O índice já reflete a `desenvolvimento` atual (`codegraph sync` feito). Rodar `codegraph sync` de novo depois de cada `git pull`.
1. **Revisão da migration:** a migration do `social` é revisada pelo Renato **antes** de subir o serviço local. O Flyway a aplica no Neon de dev. Na revisão, conferir também que `social.denuncia` está vazia em dev e no DES. Se estiver, `denuncia.alvo_autor_id` nasce `NOT NULL`.
2. **Segredos no Render**, para o merge de fechamento:
   - `MODERACAO_TOKEN` (32 ou mais caracteres) em `leai-leitura` e em `leai-social`;
   - `LEITURA_BASE_URL` como `value:` no `render.yaml`, porque não é segredo.

## Commit 1 — `feat: denunciar resenhas e comentarios`

### `social`: migration `V20261016xxxxxx__moderacao_denuncia_e_auditoria.sql`
- **Em `denuncia`:**
  - índice único parcial `(denunciante_id, alvo_tipo, alvo_id) WHERE estado = 'pendente'`;
  - `CHECK (char_length(motivo) <= 500)`;
  - `alvo_autor_id uuid`, `NOT NULL` se a tabela estiver vazia, com índice;
  - **contexto gravado na criação** (uuid, nulos): `alvo_livro_id`, `atividade_id` e `atividade_autor_id`, com índices em `atividade_id` e `atividade_autor_id`. No comentário, `atividade_id` é a atividade dele; na resenha, é a atividade dela, se existir (`findByTipoAndOrigemId`). Assim o passo 4 da remoção e o `arquivar` não dependem de linhas que o consumidor de `resenha.excluida` já pode ter apagado;
  - `remocao_solicitada_em timestamptz`, a marca de remoção pedida e ainda não confirmada.
- **Em `log_moderacao`:**
  - `alvo_autor_id`, `alvo_livro_id` e `atividade_autor_id` (uuid, nulos), com índices em `alvo_autor_id` e `atividade_autor_id`;
  - a CHECK `log_moderacao_anonimizacao_coerente` passa a exigir as três colunas NULL depois de anonimizado;
  - índice único parcial `(alvo_tipo, alvo_id) WHERE acao = 'remover_conteudo' AND alvo_id IS NOT NULL`, para um único log de remoção por alvo.

### `social`: `ConsumidorDeContaExcluida` (Henrique)
- No `SET` do UPDATE de `log_moderacao`: `alvo_autor_id`, `alvo_livro_id` e `atividade_autor_id` iguais a NULL. Sem isso, a CHECK nova manda a exclusão para a DLQ.
- No `WHERE` do UPDATE: acrescentar `OR alvo_autor_id = ? OR atividade_autor_id = ?`.
- No DELETE de `denuncia`: acrescentar `OR alvo_autor_id = ? OR atividade_autor_id = ?`.
- Testes em `ConsumidorDeContaExcluidaIntegracaoTest` com conteúdo já removido pela moderação: resenha, comentário e frase.

### `social`: pacote novo `moderacao/`
**Rota:** `POST /denuncias`, com `Idempotency-Key`. Corpo: `{alvoTipo, alvoId, motivo, via?, referenciaId?}`.

**Validação:** motivo obrigatório, sem espaço nas pontas e com até 500 code points (`codePointCount`).

**Acesso ao comentário:** a atividade do comentário passa por `AtividadeRepository.visivelPara` (`:59-81`). Sem acesso, 404. Comentário próprio, 422.

**Acesso à resenha:** `AcessoAResenha`, porte da ordem de `reacoes.service.ts:153-219`:
1. resenha inexistente: 404;
2. livro inativo: 404;
3. resenha própria: 422;
4. autor fora de `v_perfil_referencia_v1`: 404;
5. **denunciante fora da VIEW: 403**;
6. livro oficial: perfil público ou seguimento aceito;
7. livro pessoal: `donoId == autor`, mais:
   - pelo **feed**, exige seguimento mesmo com perfil público (`reacoes.repository.ts:54-69`);
   - pela **lista**, basta o perfil público (`:85-116`).

As VIEWs são as de `leitura`, `acervo`, `identidade` e as do `social`. Os helpers vêm de `ReferenciasDeLista`.

**Gravação:**
- `INSERT … ON CONFLICT (denunciante_id, alvo_tipo, alvo_id) WHERE estado = 'pendente' DO NOTHING RETURNING id`, seguido de `SELECT`, como em `reacoes.repository.ts:123-148`. Um 23505 abortaria a transação do recibo.
- Grava `alvo_autor_id` e o contexto (`alvo_livro_id`, `atividade_id`, `atividade_autor_id`).
- Usa `ServicoDeIdempotencia.executar` com `CRIAR_DENUNCIA` (o mesmo operationId do `social.yaml`).
- Responde 201 para denúncia nova e 200 para a existente, com recibo mínimo.

**Limite de taxa:** bean `limiteDeDenunciar` (10 por minuto) em `LimitesDeInteracao` e regra exata para `POST /denuncias` no `RateLimitFilter`.

**Testes de integração** (as VIEWs no fixture):
- comentário visível e invisível;
- os 7 passos acima, incluindo livro inativo, autor em exclusão, feed com perfil público sem seguir (404), lista com perfil público sem seguir (200), `referenciaId` de outro livro ou dono, `donoId` diferente do autor;
- denúncia repetida e a corrida entre duas chaves;
- motivo vazio e com 501 caracteres;
- 429.

### Web (`code/front`)
- **`session.ts`:** `ehAdmin` como `computed` sobre o token (base64url com try/catch; se falhar, é leitor). Assim ele vale em `aplicar()`, no login, na recarga, no `storage` e na sincronização. Não é gravado: `session.spec.ts:37-39` compara o JSON. O helper de token admin vai em `testes/montarNaRota.ts`.
- **`components/moderacao/DialogoDenunciar.vue`**, com o composable `useDenunciar.ts`:
  - **Fluxo:** dois passos (DEN:284-301), e a mesma chave ao tentar de novo.
  - **Estados:** DEN:321-383:
    - aviso de partida a frio aos 3 s no **envio**;
    - âmbar no 429, sem tempo de espera (DEN:352);
    - erro de conexão;
    - conteúdo indisponível;
    - descarte;
    - toast emitido para a tela.
  - **Referência:** `DialogoRecomendar.vue` serve de referência visual, não de molde, porque tem um passo só.
- **`TrechoDaDenuncia.vue`:** renderiza `arvoreDaResenha` em 3 linhas com o itálico e sem `v-html`. O spoiler mostra a frase do design.
- **`ui/MenuDeAcoes.vue`:** prop de tamanho e de tom do ícone (20px grafite) e repasse do slot `cabecalho`, mantendo o padrão atual. Registrar em `code/front/AGENTS.md`.
  - Entra em `CardResenha.vue` para resenha de outra pessoa.
  - Entra em `LivroPessoalView.vue`, ao lado do `h3`, para terceiros, com `via` e `referenciaId` vindos de `acesso`.
- **`ComentarioItem.vue`:**
  - menu também para comentário de outra pessoa (hoje é só do dono, `:137` e `:228`);
  - o `escolher` passa a tratar cada id explicitamente, porque hoje qualquer id que não seja `editar` vira `excluir` (`:104-112`);
  - a altura do dropdown deixa de ser fixa (`:14`);
  - emit `denunciar`, tratado em `ModalComentarios.vue`.
- **Serviço:** `createSocialService` ganha `denunciar`.
- **Testes:** serviço, diálogo, menus e `session` com `ehAdmin`.

### Mobile (`code/mobile`)
- **`features/moderacao/folha_denunciar.dart`**, moldada em `avaliacao/adicionar_frase.dart`:
  - aberta com `rootNavigator: true`;
  - os mesmos estados da web;
  - `SocialService.denunciar`.
- **Trecho:** extrair o `_spans` de `_Bloco` (`markdown_resenha.dart:371-386`) para uma função pública e usar `Text.rich(maxLines: 3)`.
- **`DotsThree`** (`PhosphorIconsRegular.dotsThree`):
  - **Livro oficial:** `_Resenha` usa o `SocialService` que já chega por parâmetro próprio (`rotas_livros.dart:109`, `:202`, `:221`). Não entra em `DependenciasDeLivros`. Na aba Feed, passar `social: depsDeFeed.social` em `app/router.dart:284-289` (o `depsDeFeed` já está em escopo), em vez de esconder o menu.
  - **Livro pessoal:** passar o serviço pela rota (`rotas_livros.dart:263-294`) e esconder o menu se `ResenhaDoDono.id` vier vazio (`acervo_service.dart:113`, `:125`).
  - **Comentários:** menu também para comentário de outra pessoa (`comentario_item.dart:120-142`), com `_MenuDoComentario` parametrizado (`folha_comentarios.dart:1039-1085`).
- **Testes** em `test/features/moderacao/`. Formatar só os arquivos novos.

### Contratos
- **`docs/api/social.yaml`:** `POST /denuncias` e os códigos de erro.
- **`code/back/social/AGENTS.md`:** acrescentar a nota.

## Commit 2 — `feat: painel de moderacao`

### `leitura` (NestJS)
- **Redact do log:** acrescentar `req.headers["x-moderacao-token"]` e `req.headers["x-scheduler-token"]` ao `redact.paths` em `app.module.ts:45-54`, com teste.
- **`ModeracaoTokenGuard`:**
  - cópia de `scheduler-token.guard.ts`, com comparação em tempo constante;
  - `MODERACAO_TOKEN` **opcional** em `env.ts` (mínimo de 32 quando presente); sem ele, a rota responde 503 com o `ServicoIndisponivel` que já existe (`erros-de-negocio.ts:203-209`), e a partida registra um WARN, como o `VerificadorJwt` faz com o `JWT_SECRET` (`verificador-jwt.service.ts:37-47`);
  - entra em `test/integracao/ambiente.ts`.
- **`src/moderacao/`:** `POST /internal/moderacao/resenhas/{id}/remocao`, com `@Publico()` e o guard.
  - **Remoção:** `excluirResenhaPorId`, sem filtro de dono, gera o mesmo `resenha.excluida` no outbox.
  - **Resposta:** `{removida, autorId, livroId}`.
  - **Idempotência:** sujeito `00000000-0000-0000-0000-000000000002` (`SUJEITO_MODERACAO`), operação `operacaoNoCaminho(REMOVER_RESENHA_MODERACAO, id)`.
  - **Limite:** depois de 24 h o recibo vence, e a mesma chave passa a receber **409 `CHAVE_IDEMPOTENCIA_CONFLITANTE`** (`idempotencia.service.ts:122-124`), não `removida:false`. O `social` trata esse 409 à parte (ver o cliente).
- **Consumidor `conta.excluida` (Henrique):** anonimizar também os recibos com `subject_ref = SUJEITO_MODERACAO AND resposta->>'autorId' = usuarioId`.
- **Testes:**
  - token ausente ou errado: 401;
  - token não configurado: 503;
  - replay com o mesmo corpo;
  - resenha inexistente: `removida:false`;
  - outbox gravado uma vez;
  - reações em cascata;
  - anonimização do recibo.
- **Contratos:** `.env.example`, `leitura.yaml` (tag `interno`, scheme `moderacaoToken`) e `AGENTS.md`.

### `social`
**Segurança:**
- Um `JwtAuthenticationConverter` mapeia só `papel == "admin"` para `ROLE_ADMIN`.
- `/admin/**` com `hasRole("ADMIN")`.
- O handler do 403 ganha `log.warn` com o `sub` e o caminho, sem o token (SEC-35).

**Configuração:**
- `LEITURA_BASE_URL` com default `http://localhost:3001`.
- `MODERACAO_TOKEN` opcional, com `@Size(min = 32)` quando presente. Sem ele, a remoção responde 503 e a partida registra um WARN.
- Ajustar `IntegracaoComPostgres.java:57-73` e `AppPropertiesTest`.
- `application.yml`, `.env.example` e `render.yaml`: o token com `sync: false` nos dois serviços e a URL como `value:`.

**Cliente `moderacao/ClienteDeLeitura`:**
- `RestClient` com timeout de conexão de 5 s e de leitura de 60 s.
- Uma retentativa depois de 2 s, só em falha de conexão ou 503.
- Falha vira 503 `LEITURA_INDISPONIVEL`; timeout vira 504.
- **409 do `leitura`** (recibo vencido) é tratado à parte, nunca como falha: com o conteúdo ausente da VIEW, o `social` responde 409 `CONTEUDO_JA_EXCLUIDO` e limpa `remocao_solicitada_em`.
- **Chave determinística:** `UUID.nameUUIDFromBytes(("moderacao:resenha:" + id).getBytes(UTF_8))`.

**Rotas de admin:**
- **Cursor keyset** com `temMais`, no padrão de `feed/repository/CursorComentario.java`.
- **`GET /admin/denuncias?cursor=`:** pendentes em ordem `criado_em, id` crescente, com:
  - denunciante e autor (avatar, @ e nome), por `LEFT JOIN` com fallback para perfil fora da VIEW;
  - motivo inteiro e `criadoEm`;
  - conteúdo: comentário local ou `v_resenha_publicacao_v1`, com a nota e as datas (PAI:293-298);
  - dono e descrição da atividade do comentário (PAI:285);
  - livro, livro pessoal, spoiler, `conteudoDisponivel` e `respostas`;
  - `remocaoNaoConfirmada`, quando alguma pendente do alvo tem `remocao_solicitada_em`. Nesse caso o item não aparece como indisponível, mesmo com a resenha fora da VIEW;
  - os links só quando o admin tem acesso, e omitidos caso contrário (PAI:301).
- **`POST /admin/denuncias/{id}/arquivar`:**
  - com `Idempotency-Key` (`ARQUIVAR_DENUNCIA`);
  - `FOR UPDATE`; se não estiver pendente, 409 `DENUNCIA_JA_RESOLVIDA`;
  - se o alvo tiver `remocao_solicitada_em`, 409 `REMOCAO_EM_ANDAMENTO`: a tela oferece `Tentar de novo` da remoção;
  - se estiver pendente, fecha **só essa** e grava o log com `alvo_autor_id`, `alvo_livro_id` e `atividade_autor_id`, copiados da própria denúncia;
  - devolve os ids fechados.
- **`POST /admin/denuncias/{id}/remover`** (`REMOVER_CONTEUDO_DENUNCIADO`):
  1. Consulta só de leitura do recibo (`ServicoDeIdempotencia.consultar`, reaproveitando `buscarRecibo` e `replayOuConflito`). Se houver recibo, devolve o replay.
  2. Se a denúncia não estiver pendente, 409 `DENUNCIA_JA_RESOLVIDA`. **Só para comentário**, que é local: se ele não existir mais, 409 `CONTEUDO_JA_EXCLUIDO`. Resenha e frase **nunca** são recusadas aqui pela ausência na VIEW, porque num reenvio depois de timeout o `leitura` já apagou e o replay só vem no passo 3.
  3. **Resenha:** grava `remocao_solicitada_em = now()` em **todas as pendentes do alvo**, numa transação curta, e chama o `leitura` fora dela. Com `removida:false` e o conteúdo ausente na VIEW, limpa a marca e responde 409 `CONTEUDO_JA_EXCLUIDO`. Timeout ou falha mantêm a marca e a denúncia pendente.
  4. Na transação de idempotência, **sem recusar depois de o `leitura` confirmar**:
     - fecha como `removida` todas as pendentes do alvo e as de comentário com o mesmo `atividade_id` gravado na denúncia; no comentário-raiz, as das respostas (ids coletados antes do DELETE, que é local e síncrono);
     - limpa `remocao_solicitada_em`;
     - log `INSERT … ON CONFLICT DO NOTHING` no índice único, para um log só, mesmo com dois cliques;
     - `DELETE FROM atividade WHERE tipo = 'resenha_publicada' AND origem_id = ?` por SQL;
     - responde 200 com o estado atual e os ids fechados.
  - **Comentário:** tudo local, com `DELETE` por SQL no repositório da moderação; as respostas saem pelo CASCADE.
- **`GET /admin/moderacao/logs?cursor=`:**
  - em ordem decrescente;
  - o autor aparece sempre como "Administrador" (PAI:242);
  - o alvo é resolvido pelas colunas novas (PAI:235-242);
  - o alvo anonimizado aparece como `conta excluída`.
- **Códigos de erro:** os novos 409 (`DENUNCIA_JA_RESOLVIDA`, `CONTEUDO_JA_EXCLUIDO` e `REMOCAO_EM_ANDAMENTO`) entram em `CodigoErro` depois dos genéricos (`:59-65`), com os operationIds iguais aos do `social.yaml`.

**Testes:**
- 403 para leitor e para token sem `papel`, com sobrecarga `token(id, papel)`;
- cursor;
- arquivar;
- remover um comentário com respostas e uma resenha com comentários denunciados;
- `leitura` simulado com o `HttpServer` do JDK: sucesso, timeout com replay na retentativa e um log só, falha de conexão, `removida:false` e 409 de recibo vencido. **Ao "remover", o stub também apaga a linha da VIEW falsa `leitura.v_resenha_publicacao_v1` e, como faria o consumidor de `resenha.excluida`, a atividade e os comentários**, senão o teste do reenvio passa com o erro presente;
- painel depois de um timeout: o item vem com `remocaoNaoConfirmada` e o `arquivar` responde 409 `REMOCAO_EM_ANDAMENTO`;
- dois cliques com chaves diferentes;
- logs;
- `log.warn` do 403.

**Docs:** `social.yaml` e catálogo de mensageria (`resenha.excluida` também sai da moderação).

### Web
- **Rota `/moderacao`:** `meta.requerAdmin`, com a guarda nova ao lado de `guardaDeSessao`.
- **Entradas:**
  - item `Moderação` (`PhShieldCheck`) depois de um divisor em `SidebarNavegacao.vue`, fora de `ABAS`; ajustar `SidebarNavegacao.spec.ts:34-43`;
  - linha em `ConfiguracoesView.vue` abaixo de 768px.
- **`views/moderacao/PainelModeracaoView.vue`:**
  - aquece o `leitura` ao abrir (`GET ${VITE_LEITURA_BASE_URL}/health`);
  - fila e detalhe, com uma coluna abaixo de 1024px;
  - conteúdo com `TextoDaResenha`;
  - arquivar sem confirmação; remover com `DialogoConfirmacao`;
  - "Removendo…" com aviso aos 3 s (PAI:343-344);
  - banner de remoção não confirmada, com `Tentar de novo` que **reusa a mesma `Idempotency-Key`** da tentativa (PAI:351); a chave só é descartada no sucesso ou num 409;
  - item com `remocaoNaoConfirmada`, ao recarregar: o mesmo banner e `Tentar de novo`, sem `Arquivar`;
  - indisponível com só `Arquivar`;
  - toasts e seleção da próxima denúncia (PAI:317, PAI:358-361), tirando da fila os ids fechados;
  - estados PAI:369-403;
  - aba de auditoria.
- **Serviço:** `src/services/moderacao.ts`.
- **Testes:** guarda, entradas com e sem admin, fila, arquivar, remover (timeout, 409, ids fechados), estado vazio e auditoria.

## Commit 3 — `feat: remocao de frases pela moderacao`

- **`leitura`:**
  - `VerificadorJwt` lê `papel`, e `UsuarioAutenticado` ganha `papel`;
  - a listagem de frases (`frases.repository.ts:25-53`) não aplica o RN-08 para o admin;
  - `POST /internal/moderacao/frases/{id}/remocao`, com o mesmo guard e chave determinística `moderacao:frase:` e resposta `{removida, autorId, livroId}`;
  - `excluirPorId`;
  - `tokenDe` com `papel` nos testes.
- **`social`:**
  - `DELETE /admin/frases/{id}` (`REMOVER_FRASE`), com o mesmo fluxo de recibo, chamada, transação sem recusa e log único (`alvo_tipo = 'frase'`, `alvo_autor_id`, `alvo_livro_id`);
  - 409 `CONTEUDO_JA_EXCLUIDO` só quando o `leitura` responde `removida:false` ou 409 de recibo vencido. O `social` não tem VIEW de frase e não faz checagem prévia;
  - testes e `social.yaml`.
- **Web:**
  - em `FrasesDoLivroView.vue`, com `ehAdmin` e ≥768px: faixa do admin, sem a cota e sem `Adicionar frase`;
  - `FraseCitada.vue` ganha `comRemover` e o emit `remover`;
  - confirmação e erro inline (FR:427-466);
  - o contador `minhas` só diminui quando a frase é do próprio usuário (hoje diminui sempre, `:133`);
  - testes.
- **Mobile:** sem mudança, como no design.

## Commit 4 — `docs: F-MOD concluida`

- **`feature-F-MOD.md`:**
  - status `Em revisão (PR)`, sem marcar "mergeado" nem os itens de DES;
  - critérios e testes marcados;
  - decisões e divergências nas Pendências: keyset no lugar do `page`, linha de Configurações sem design, retentativa única, colunas novas do log e da denúncia, a marca de remoção não confirmada, o caso do recibo vencido depois de 24 h e os componentes a levar ao `documento-de-design.md`, sem editar `docs/orquestador`;
  - débito: as notificações `RESENHA_CURTIDA` ficam depois da remoção;
  - timeline.
- **`plano-F-MOD.md` e `renato-periodo-2/README.md`:** atualizar.
- Nenhum arquivo de outra feature é editado.

## Fechamento: push e PR
- `git push origin renato-features`.
- `gh pr create --base desenvolvimento --head renato-features`, com título `feat: moderação de denúncias, painel e frases (F-MOD)`. Corpo no formato do #53: resumo, Backend, Web, Mobile, Decisões, avisos com @, Testes e DES.
- Destacar:
  - a migration, que pede revisão;
  - os segredos do Render;
  - o redact do `x-scheduler-token`.
- Sem linha de atribuição.

## Verificação
**Antes de cada commit:**
- `social`: `./mvnw verify` com `DATABASE_URL_TESTE`;
- `leitura`: lint, build, `npm test` e `npm run test:integration`;
- web: lint, `vue-tsc` e vitest;
- mobile: `flutter analyze` e `flutter test`.

**Manual, depois de cada `feat`, com os quatro serviços locais e `MODERACAO_TOKEN` nos dois `.env`.**

**Como leitor:**
- denunciar uma resenha oficial;
- denunciar uma resenha pessoal pelo feed e pela lista;
- denunciar um comentário;
- repetir a denúncia;
- provocar o 429;
- confirmar que não há menu no próprio conteúdo.

**Como admin:**
- entrar pela sidebar e por Configurações em 390px;
- arquivar;
- remover um comentário com respostas;
- remover uma resenha com comentários denunciados, conferindo que ela some do livro e do feed e que as denúncias fecham;
- `leitura` parado: a remoção não é confirmada e a denúncia fica pendente;
- `leitura` lento além de 60 s: o reenvio fecha com um log só;
- conteúdo apagado pelo autor: só `Arquivar`;
- remover a frase de um perfil privado;
- aba de auditoria;
- `curl` em `/admin/*` com token de leitor: 403;
- log do `leitura` sem o token.

**App (emulador):** denunciar resenha e comentário.

**Web:** 1440 e 390px, claro e escuro.

**CI** verde no PR.

## Riscos
- O porte da regra de acesso pode divergir da do `leitura`. Os testes espelham os casos de `reacoes`.
- Recibo vencido depois de 24 h: o `leitura` responde 409, e o `social` responde 409 `CONTEUDO_JA_EXCLUIDO`, limpando a marca. Se a remoção tinha sido da moderação, fica sem log. É aceitável, e o caso fica registrado nas Pendências.
- Muitos arquivos de outros donos (seção Dependências). O PR avisa cada um.
