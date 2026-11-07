# Plano — F-MOD-OPC (Suspensão de conta)

> Plano de 05/11/2026, revisado no mesmo dia em duas rodadas independentes (15 + 9 achados) e com as decisões do dono 9 a 13.

## Contexto

**Requisitos:**
- **RF-MOD-04:** o administrador suspende e reativa a conta de um leitor. A conta suspensa não autentica e fica com perfil e conteúdo ocultos aos demais leitores, sem que nada seja apagado. A reativação restaura tudo sob RN-08.
- **RF-MOD-05:** auditoria, já entregue pela F-MOD.
- **RNFs:** SEC-04, SEC-30, SEC-35/36/37, ERR-04, USA-04/05.

**Fontes:**
- arquivo da feature: `periodo-3/feature-F-MOD-OPC.md`;
- REQUISITOS: §5.11, RN-08 (parágrafo "Suspensão"), RN-23;
- arquitetura: §4.2;
- design P3: `painel-de-moderacao`, `perfil-de-outro-leitor` e `login`;
- plano da F-MOD: o padrão social → serviço dono.

**Prazo:** PR mergeado na `desenvolvimento` até 17/11 (congelamento de features). DES até 24/11.

**O que já existe na `origin/desenvolvimento` (c51a136). A `renato-features` está 5 à frente (merges e docs) e 0 atrás.**

`identidade` (Henrique):
- **Coluna de suspensão:** `usuario.suspenso boolean NOT NULL DEFAULT false` já existe (`V20260915120000__completa_schema_identidade.sql:18`). Ainda não há coluna de data. A entidade a mapeia como só leitura (`usuario/Usuario.java:76-79`, sem getter), e nenhum código grava nela.
  - Três testes do Henrique gravam `suspenso = true` por SQL: `ContratosDePerfilIntegracaoTest.java:70`, `PerfilDeOutroIntegracaoTest.java:150` e `SeguimentoIntegracaoTest.java:370`.
  - O seed volta a coluna para `false` (`SeedDeIdentidade.java:106`).
- **VIEWs:** `v_perfil_referencia_v1` (:281-291) e `v_seguimento_aceito_v1` (:293-303) **já filtram** `suspenso = false AND exclusao_solicitada_em IS NULL`.
  - Perfil (`ServicoDePerfil.deOutro`, 404 "Não encontramos esse leitor."), busca, seguidores, seguindo e caixa também filtram (`UsuarioRepositorio.java:43-46`, `ServicoDeSeguimento.java:127,176,241,284-289`).
  - Não há GRANT: um único role de banco lê todos os schemas.
- **Login:** `ServicoDeAutenticacao.entrar` (:128-161) não olha `suspenso`. Depois da senha conferir, a exclusão pendente desvia para a recuperação (:150-159).
- **Renovação:**
  - `renovar` (:168-181) filtra só a exclusão pendente;
  - `GestorDeRenovacao.consumir` (:83-110) trata token revogado como **reuso**: lança `RenovacaoReusadaException`, e o controller derruba as sessões e registra WARN (`AutenticacaoController.java:175-178`);
  - `revogarAtivos(usuarioId)` (:138-142) é o método a reusar;
  - erro lançado dentro de `idempotencia.executar` não grava recibo (`ServicoDeIdempotencia.java:113-131`).
- **Token:** o access token vale 15 min (`JwtConfig.java:31`), e os outros serviços o validam sem estado.
- **Admin:** é fixo pelo ambiente (`ProvisionamentoDoAdmin`). `ContaAdministradora` guarda o id em memória e fica **vazia** quando `ADMIN_*` está vazio. O claim `papel` sai de `papelDe`. O identidade não mapeia papel para role.
- **Erros:** `CodigoErro.deStatus` (:61-67) pega o primeiro código de cada status.
- **Exclusão de conta:** `ServicoDeExclusaoDeConta.solicitar` trava a linha (`buscarParaAtualizar`, :112-114) e não olha `suspenso`.
- **Recuperação de senha:** não autentica nem emite token. O reset responde 204 e revoga as renovações.
- **Rotas internas:** só existe `/internal/jobs/exclusao-conta`, com `X-Scheduler-Token` e em `ROTAS_PUBLICAS`. Rota fora de `ROTAS_PUBLICAS` autentica o bearer **antes** do controller (`SecurityConfig.java:106-112`). Nenhum filtro registra headers.
- **Testes:** os de integração exigem `DATABASE_URL_TESTE` local e validam toda chamada contra `docs/api/identidade.yaml` (`ContratoHttp`, que confere segurança só nas respostas 2xx e ignora 5xx).

`social` (F-MOD, Renato; base do Kayke):
- **`log_moderacao`:**
  - as CHECKs já aceitam `suspender_conta`, `reativar_conta` e `alvo_tipo='usuario'` (`V20260916024928__cria_modelo_social.sql:303-308`);
  - **`detalhe text` existe e nunca é preenchida**;
  - a CHECK de anonimização e o `ConsumidorDeContaExcluida` (:64-84) já anulam `detalhe` e já cobrem `alvo_tipo='usuario'`;
  - `registrar` (`ModeracaoRepository.java:329-345`) usa `ON CONFLICT` com o alvo da remoção.
- **Segurança:** `SecurityConfig.java:52-65,115` mapeia `papel=admin` para `ROLE_ADMIN` em `/admin/**`.
- **`ClienteDeLeitura`** é o molde:
  - timeouts de 5 s (conexão) e 60 s (leitura);
  - uma retentativa depois de 2 s, só em falha de conexão ou 502/503/504;
  - timeout vira 504; outra falha vira 503;
  - chave `nameUUIDFromBytes`;
  - o `HttpClient` do JDK não segue redirect.
  - `moderacaoToken` é opcional (`@AssertTrue`, vazio ou 32+). Não há WARN na partida.
- **Painel:**
  - a fila traz só denúncias **pendentes** (`ModeracaoRepository.java:84-98`);
  - autor, denunciante e as pessoas do registro vêm de `v_perfil_referencia_v1` (:117-137): fora da VIEW, a pessoa vira `null`, e a web mostra **"conta excluída"** (`front/src/moderacao/textos.ts:31`);
  - o registro não devolve `detalhe` nem `alvo_id`, e `textos.ts:91-110` não conhece as ações de conta.
- **Comentários (Kayke):**
  - raízes por JPQL paginada (`ComentarioRepository.java:16-22`);
  - respostas nativas (:47-61);
  - contagens derivadas (:28, :31), que alimentam `ServicoDeFeed.java:145`, `ServicoDeInteracao.java:206` e `contarRespostas` (:332-336);
  - `listarRespostas` (:240-248) e `buscarAlvoNaAtividade` (:274-284) não olham o autor;
  - denúncia: `ServicoDeDenuncia.comentarioAcessivel` (:91-100).
- **Notificações (Kayke):**
  - `atoresVisiveis` confere só os atores (`NotificacaoRepository.java:167-170`);
  - o nome do autor da atividade vem do snapshot (:73-92);
  - `ServicoDeNotificacao.java:143-144` devolve `atividadeId`/`comentarioId`;
  - o SSE usa o mesmo mapper (`CanaisDeNotificacao.java:79-85`).
- **Testes:**
  - os fixtures criam `identidade.usuario` falsa com `suspenso` e as VIEWs reais (`MassaDeRecomendacao.java:17-57`), e sete classes repetem `CREATE TABLE IF NOT EXISTS`;
  - `LeituraSimulada.java` é o stub HTTP.

Clientes:
- **Web:**
  - `services/renovacao.ts:66-76` só encerra a sessão com 401;
  - `reagirAoFimDaSessao` (`router/index.ts:476-482`) só redireciona em rota com `requerSessao`;
  - o `storage` só escuta `le-ai-sessao`, e `encerrarSessao` faz `removeItem` (`session.ts:120-125`; testes em `session.spec.ts:67-72`);
  - `ExcluirContaView.vue:83-90` só trata o 422.
- **Mobile:**
  - `session_controller.dart` só faz logout com 401 (:196-198), e `sair()` (:113-117) notifica;
  - `features/sessao/sessao_controller.dart:88-97` (Ana) descarta a sessão de leitura na saída e só avisa quando `saindoPorExpiracao`.

**Inventário de ocultação.** Quase tudo já some pela VIEW, porque as features do P1 e do P2 já trataram "fora da VIEW" como "suspensa ou em exclusão".

| Onde | Como fica oculto | Ação | Dono |
|---|---|---|---|
| Perfil, busca, seguidores e seguindo, caixa (`identidade`) | filtro nos serviços | nada | Henrique |
| Feed e detalhe de atividade (`AtividadeRepository`) | VIEW | nada | Kayke |
| Listas de outro, detalhe e itens (`ReferenciasDeLista.perfil`) | VIEW | nada | Henrique |
| Recomendações P2P recebidas e candidatos | VIEW | nada | Kayke |
| Menções no texto | VIEW | nada | Kayke |
| **Comentários, respostas e as contagens deles** | **não oculta** | **filtrar** (commit 3) | Kayke |
| **Responder ou denunciar comentário oculto** | **não confere o autor** | **filtrar** (commit 3) | Kayke / Renato |
| Notificação cujo ator é suspenso (`ator: null`, "Um leitor", contrato da F-NOT) | VIEW na leitura | nada | Kayke |
| **Notificação "na atividade de X" e links para conteúdo oculto** | **vaza o nome; link dá 404** | **filtrar** (commit 3) | Kayke |
| Snapshots `atividade.snap_usuario_*` | só aparecem via feed filtrado | nada | Kayke |
| Resenhas na página do livro (`acervo`), livro pessoal (RN-15) | VIEW | nada | Renato / Vicenzo |
| Frases do livro (`leitura`), também para o admin | VIEW | nada (o admin não vê conteúdo de conta suspensa, como no design) | Renato |
| Resenhas, estante e estatísticas de outro (`leitura`) | VIEW | nada | vários |
| Desafios, sequência, histórico | só do próprio leitor | nada | — |
| Contagens de curtidas e reações; `qtdSeguidores`/`qtdSeguidos` (`ServicoDeSeguimento.java:163-166`); `@username` do suspenso no texto de respostas (`ModalComentarios.vue:290`, `folha_comentarios.dart:223`) | contam ou mostram o suspenso | **débito** (decisão 3) | vários |
| Nota dos leitores: média e distribuição (`acervo.nota_leitor_projecao`) | conta o suspenso | **mantém** (decisão 4) | Renato |
| Painel de moderação e registro | mostraria "conta excluída" | **VIEW nova** (decisão 1) | Renato |

## Decisões do dono (05/11/2026)

1. **Leitura da conta no painel por VIEW nova:**
   - `identidade` expõe `v_conta_moderacao_v1(id, username, nome_exibicao, avatar_url, privacidade, suspenso, suspenso_em)`, com as suspensas e sem a exclusão pendente;
   - só o pacote `moderacao` do `social` a lê;
   - ela substitui o `GET /interno/usuarios/{id}/moderacao` ilustrado na spec; os comandos continuam HTTP.
2. **Autenticação `social` → `identidade`:**
   - `X-Moderacao-Token` (`MODERACAO_TOKEN`, o padrão da F-MOD) **mais** o JWT do admin repassado;
   - o `identidade` confere a assinatura e `papel=admin`, e também `ContaAdministradora.eh(sub)` quando o admin está provisionado;
   - só o segredo não basta.
3. **Ocultação no código do Kayke:**
   - entram os comentários e a contagem deles, e a notificação;
   - as contagens de curtidas e reações, os contadores de seguidores e o `@username` em respostas ficam como **débito**.
4. **Nota dos leitores:** as notas de conta suspensa **continuam** na média e na distribuição. O agregado é anônimo, como na exclusão pendente.
5. **Ratificadas as propostas do design:**
   - motivo obrigatório também na reativação, com até 500 code points;
   - suspender não resolve as denúncias;
   - no login, a suspensão prevalece sobre a exclusão pendente;
   - o admin no app vê `Perfil não encontrado`;
   - o registro mostra só o motivo do admin (RNF-SEC-36).
6. **Logout forçado na web:** igual ao mobile, com o banner "Sua sessão foi encerrada porque esta conta foi suspensa.". Divergência sem artboard.
7. **Mensagem:** a copy do design, literal.
   - `403 CONTA_SUSPENSA` sai só depois de a senha conferir. Com senha errada, a resposta continua a mensagem única.
   - Na renovação, o mesmo código vai para quem apresenta um refresh token da conta.
8. *(substituída pela 10)*
9. **Prazo e ordem de entrega:**
   - **PR aberto até 13/11**, com os testes automáticos verdes, e mergeado na `desenvolvimento` até **17/11**;
   - os validadores de contexto limpo e o teste manual rodam em **16/11, em paralelo à revisão do colega**, e as correções entram até 17/11. Isso muda a ordem da etapa 3 do prompt, que pedia validar antes do push;
   - merge na `main` e DES até **24/11**.
10. **Corte firme, não condicional: o perfil web inteiro fica fora** (visão do admin da conta suspensa e `DotsThree` no perfil).
    - **Suspender:** pelo `DotsThree` da denúncia.
    - **Reativar:** pelo `DotsThree` da denúncia **e** pela ação `Reativar conta` na linha da suspensão vigente no registro. É o caminho que sobra quando a denúncia já foi resolvida.
    - É divergência sem artboard. O perfil vira débito, a fazer depois de 17/11 se houver período.
11. **Thread de raiz oculta:**
    - um comentário-raiz de conta suspensa leva junto as respostas alheias;
    - não dá para responder nem denunciar o comentário oculto;
    - tudo volta na reativação.
12. **Exclusão pedida por conta suspensa:** `ServicoDeExclusaoDeConta.solicitar` responde 403 `CONTA_SUSPENSA`. Suspender conta em exclusão pendente continua dando 404.
13. *(decidido pelo código e registrado)* **O 403 do pedido de exclusão não ganha tratamento novo nos clientes.**
    - Ele só acontece dentro da janela de 15 min do access token, e os clientes mostram a mensagem do servidor como erro comum.
    - É divergência aceita: `ExcluirContaView.vue` e `excluir_conta_page.dart` não mudam.

**Decisões técnicas tomadas pelo código:**
- **Motivo:** vai em `log_moderacao.detalhe`, sem coluna nova. Diverge do prompt e fica registrado.
- **Rotas internas:** `POST /internal/moderacao/usuarios/{id}/suspensao` e `/reativacao`, no padrão `/internal/moderacao/...` do `leitura`. A spec usava `/interno/...` como ilustração. Fica registrado.
- **Idempotência por estado no `identidade`, sem recibo:**
  - repetir devolve o estado atual com `alterado: false`;
  - um recibo por alvo devolveria um episódio velho depois de suspender, reativar e suspender de novo dentro de 24 h;
  - é divergência do "contrato único" do DoD, junto com o JWT repassado, e fica registrada.
- **Corrida suspender × pedir exclusão:**
  - `UPDATE usuario SET … WHERE id = ? AND NOT suspenso AND exclusao_solicitada_em IS NULL RETURNING suspenso_em`;
  - se não alterou, um `SELECT` decide entre 404 (inexistente ou em exclusão) e o replay (já suspensa);
  - `solicitar` confere `suspenso` na linha **já travada**, depois de :118.
- **Um log por episódio, com qualquer chave:**
  - o `identidade` grava `suspenso_em`/`reativado_em` e devolve o valor do `RETURNING`;
  - o `social` grava o log com `criado_em` igual a esse instante (bind com `Timestamp.from`), por **INSERT próprio**: `ON CONFLICT (alvo_id, acao, criado_em) WHERE alvo_tipo = 'usuario' AND alvo_id IS NOT NULL DO NOTHING`;
  - o predicado é idêntico ao do índice novo, e o índice de remoção não colide.
  - Resultado: repetição, dois cliques ou conta já suspensa não geram segunda linha, e uma retentativa depois de timeout grava a linha que faltou.
- **Suspensão vigente no registro:** uma linha `suspender_conta` é a suspensão vigente quando `v_conta_moderacao_v1.suspenso_em = log.criado_em`.
- **`CONTA_SUSPENSA`:** 403, declarado **depois** de `ACESSO_NEGADO` no enum.
- **Renovação de conta suspensa:**
  - responde 403 `CONTA_SUSPENSA` em `renovar` e no ramo de reuso;
  - sem o WARN de reuso e sem derrubar nada.
- **Recuperação de senha sem mudança:** o login barra. Só ganha teste.
- **Conta administradora não é suspensa:** 422.

## Dependências de outras pessoas (avisar no grupo antes e no PR)

- **Henrique (`identidade`):**
  - migration, `ServicoDeAutenticacao`, `AutenticacaoController`, `ServicoDeExclusaoDeConta`, `SecurityConfig`, `CodigoErro`, `AppProperties`, `Usuario`, `application.yml`, `.env.example`, `docs/api/identidade.yaml` e o pacote novo `moderacao/`;
  - o seed `SeedDeIdentidade.java` e os testes `ContratosDePerfilIntegracaoTest`, `PerfilDeOutroIntegracaoTest` e `SeguimentoIntegracaoTest`;
  - nota datada em `code/back/identidade/AGENTS.md` e comentário no topo da migration.
- **Henrique (clientes):**
  - web: `session.ts`, `services/renovacao.ts`, `views/auth/LoginView.vue`, `router/index.ts`;
  - mobile: `core/session/session_controller.dart` e `features/auth/login_page.dart`, junto com a Ana;
  - notas em `code/front/AGENTS.md` e `code/mobile/AGENTS.md`.
- **Kayke (`social`):**
  - `ComentarioRepository`, `ServicoDeInteracao`, `ServicoDeFeed`, `RedacaoDeNotificacao`, `NotificacaoRepository`, `ServicoDeNotificacao` e o fixture `MassaDeRecomendacao`;
  - os testes `ServicoDeInteracaoIntegracaoTest`, `InteracaoControllerIntegracaoTest` e `NotificacaoControllerIntegracaoTest`;
  - nota em `code/back/social/AGENTS.md`.
- **Henrique (`ConsumidorDeContaExcluida`):** sem mudança. Só ganha teste com linha de conta.
- **Ana:** `features/sessao/sessao_controller.dart` **não é alterado** (ver commit 5).
- **Grupo:** `render.yaml`.

## Pré-requisitos

0. **Antes de codar:**
   - `git fetch` e `git pull --rebase`, com a `renato-features` atualizada pela `origin/desenvolvimento`;
   - `codegraph sync`;
   - aviso a Henrique e Kayke no grupo.
1. **Ponto de parada: o Renato revisa as duas migrations antes de aplicá-las no dev.** Conferir `SELECT count(*) FROM identidade.usuario WHERE suspenso` em dev e no DES.
2. **Segredos no Render**, para o merge na `main`:
   - `MODERACAO_TOKEN` em `leai-identidade`, **com o mesmo valor** do `leai-social`;
   - `IDENTIDADE_BASE_URL` como `value: https://leai-identidade.onrender.com` no `leai-social`.
3. **Admin no teste manual:** token assinado localmente com o `JWT_SECRET` do `.env`, `papel=admin` e `sub` igual ao id da conta `admin` do dev.
   - Não mexer em `ADMIN_EMAIL`/`ADMIN_PASSWORD`: um e-mail diferente derruba a partida (`ProvisionamentoDoAdmin.java:135-139`), e uma senha diferente rotaciona a do admin compartilhado.
   - Os leitores do teste são criados por `/auth/register` com e-mail `.invalid`.

## Commits e push (preferência do dono, 05/11/2026)

Poucos commits, nada granular. O trabalho é dividido em cinco partes, mas elas vão em **três commits**, mais um de correções:

| Commit | Partes | Assunto |
|---|---|---|
| 1 | Partes 1, 2 e 3 (`identidade`, `social` e ocultação), com `docs/api/identidade.yaml` e `docs/api/social.yaml` | `feat(back): suspensão e reativação de conta pela moderação` |
| 2 | Partes 4 e 5 (web e mobile) | `feat(clientes): conta suspensa no painel, no login e no app` |
| — | Push e abertura do PR, logo depois do commit 2 | — |
| 3 | Correções dos validadores e da revisão do colega, juntas | `fix: ajustes da validação da F-MOD-OPC` |
| 4 | Docs: este plano copiado para o repositório, `feature-F-MOD-OPC.md`, Andamento do prompt e `README.md` da pasta | `docs: F-MOD-OPC concluída` |

- **Commit 3** é um só, a menos que a revisão chegue depois de ele já ter subido.
- **Commit 4** pode juntar-se ao 3, se saírem no mesmo momento.
- **Push** depois de cada commit. O agente faz commit e push sem pedir aprovação.
- **Verificação:** antes de cada commit, a de todas as camadas que ele toca.
- **Notas nos `AGENTS.md` alheios:** entram no commit da camada a que pertencem.

## Parte 1 (commit 1) — `identidade`: suspensão e reativação de conta pela moderação

**Migration `V2026110xxxxxxx__suspensao_de_conta.sql`, com comentário no topo dirigido ao Henrique:**
- `ALTER TABLE usuario ADD COLUMN suspenso_em timestamptz, ADD COLUMN reativado_em timestamptz`.
- Backfill defensivo: `UPDATE usuario SET suspenso_em = now() WHERE suspenso AND suspenso_em IS NULL`.
- `CHECK usuario_suspensao_coerente (suspenso = (suspenso_em IS NOT NULL))`.
  - No mesmo commit, os três testes do Henrique gravam `suspenso_em = now()` junto.
  - O seed anula `suspenso_em` e `reativado_em` quando volta `suspenso = false`.
- `CREATE VIEW v_conta_moderacao_v1 …`, com `COMMENT ON VIEW` dizendo que só a moderação do `social` a lê.

**Pacote `moderacao/`:**
- **`ModeracaoInternaController`:** `POST /internal/moderacao/usuarios/{id}/suspensao` e `/reativacao`, sem corpo, **fora** de `ROTAS_PUBLICAS`.
- **Ordem de validação:**
  1. **JWT:** a cadeia do Spring responde 401 se ele faltar ou for inválido.
  2. **`TokenDeModeracao`, no controller:** comparação em tempo constante, como `TokenDoAgendador`. Sem `MODERACAO_TOKEN` configurado, 503 e WARN na partida; com token ausente ou errado, 401.
  3. **Papel:** `papel != admin`, ou `ContaAdministradora` definida e outro `sub`, dá 403 e `log.warn`.
  4. **Alvo:** 404 ou 422.
- **`ServicoDeSuspensao`**, numa transação:
  - o `UPDATE` condicional das decisões técnicas e, se alterou, `revogarAtivos`;
  - a resposta é `{usuarioId, suspenso, suspensoEm, reativadoEm, alterado}`;
  - a reativação é simétrica (`suspenso = false, suspenso_em = NULL, reativado_em = now()`).
- **`Usuario`:** getter `suspenso()`.

**Autenticação e conta:**
- **`CodigoErro.CONTA_SUSPENSA`** depois de `ACESSO_NEGADO`, com a mensagem "Esta conta está suspensa.".
- **`entrar`:** depois de `matches` e antes do ramo de exclusão pendente, 403 `CONTA_SUSPENSA`.
- **`renovar`:** 403 `CONTA_SUSPENSA`.
- **`catch (RenovacaoReusadaException)`:** conta suspensa responde 403, sem `encerrarRenovacoesPorReuso`.
- **`ServicoDeExclusaoDeConta.solicitar`:** depois do lock, conta suspensa responde 403 `CONTA_SUSPENSA`.

**Configuração:**
- `AppProperties.moderacaoToken` com `@AssertTrue`;
- `application.yml`, `.env.example`;
- `render.yaml`: `MODERACAO_TOKEN` com `sync:false`.

**Testes de integração:**
- **Rotas internas:**
  - sem JWT, 401;
  - com JWT de admin e token ausente, errado ou não configurado: 401, 401 e 503;
  - token certo com JWT de leitor: 403;
  - admin: 200, com as renovações revogadas;
  - repetição: `alterado:false` e o mesmo `suspensoEm`;
  - alvo admin: 422; inexistente ou em exclusão: 404.
- **Login e renovação:**
  - login: senha certa dá 403, senha errada dá 401 com a mensagem única;
  - conta suspensa com exclusão pendente, montada por SQL: 403, sem a recuperação;
  - renovação com o token revogado pela suspensão: 403, sem o log de reuso;
  - reset de senha seguido de login: 403.
- **Exclusão:** pedido com token de conta suspensa: 403.
- **Reativação:** devolve login, renovação e as duas VIEWs, e preserva privacidade e seguidores.
- **VIEW nova:** `v_conta_moderacao_v1` traz a conta suspensa com a flag.

**Contrato e nota:**
- **`docs/api/identidade.yaml`:**
  - tag `interno`, scheme `moderacaoToken` e a exigência única `[{bearerAuth: [], moderacaoToken: []}]`;
  - o 403 `CONTA_SUSPENSA` em `/auth/login`, `/auth/refresh` e `DELETE /me/conta`;
  - a VIEW no texto do contrato;
  - vai neste commit, porque o `ContratoHttp` valida contra ele.
- **`code/back/identidade/AGENTS.md`:** nota datada.

## Parte 2 (commit 1) — `social`: suspender e reativar conta no painel de moderação

**Migration `V2026110yyyyyyy__auditoria_de_conta.sql`**, maior que `V20261018120000`:
- `CHECK log_moderacao_conta_coerente`: as ações de conta exigem `alvo_tipo='usuario'` e, se não anonimizado, `detalhe` não nulo com `char_length(detalhe) <= 500`.
- Índice único parcial `log_moderacao_conta_uk (alvo_id, acao, criado_em) WHERE alvo_tipo = 'usuario' AND alvo_id IS NOT NULL`.

**Configuração:**
- `AppProperties.identidadeBaseUrl`;
- WARN na partida sem `MODERACAO_TOKEN`;
- `application.yml`, `.env.example`, `render.yaml` (`IDENTIDADE_BASE_URL`).

**`ClienteDeIdentidade`:** molde do `ClienteDeLeitura`, com `X-Moderacao-Token` e `Authorization: Bearer <JWT do admin>`. Mapeamento de erros:
- 404 continua 404, e 422 continua 422;
- 401 ou 403 viram `log.error` e 503;
- timeout vira 504;
- falha de conexão, depois da retentativa, vira 503.

**Rotas:**
- **`POST /admin/usuarios/{id}/suspender`** e **`/reativar`**:
  - `Idempotency-Key` e o corpo `{motivo}`, com até 500 code points e sem espaço nas pontas; fora disso, 422;
  - `OperacaoIdempotente`: `SUSPENDER_CONTA("suspenderConta")` e `REATIVAR_CONTA("reativarConta")`.
- **Fluxo:**
  1. `consultar` o recibo;
  2. chamar o `identidade` fora de transação;
  3. `executar`, com o INSERT próprio do log;
  4. na reativação com `reativadoEm` nulo, não gravar log;
  5. responder 200 `{usuarioId, suspensa, suspensaEm, reativadaEm}`.
  - Falha ou timeout não grava nada.
- **Pessoas do painel:** `ModeracaoRepository` (:117-137) passa a ler `v_conta_moderacao_v1`. `PessoaDaModeracao` ganha `suspensa` e `suspensaEm`. A exclusão pendente continua `null`.
- **Registro (`GET /admin/moderacao/logs`):** nas linhas de conta, `alvoId`, `alvoConta` (username), `motivo` (o `detalhe`) e **`suspensaoVigente`**, que é `true` quando `v_conta_moderacao_v1.suspenso_em = criado_em`. É o que a web usa para oferecer `Reativar conta` na linha certa.

**Testes (stub `IdentidadeSimulada`):**
- 403 para leitor;
- suspender e reativar com um log cada;
- timeout seguido de retentativa com a mesma chave: um log;
- dois cliques com chaves diferentes: um log;
- conta já suspensa: zero logs novos;
- `identidade` parado: 503 e nenhum log;
- motivo vazio ou com 501;
- `autor.suspensa` na fila;
- registro com `motivo` e `suspensaoVigente`: verdadeiro só na suspensão atual, falso depois de reativar e nas suspensões antigas;
- **reativar a partir do id da linha do registro, com a denúncia já resolvida**;
- anonimização de uma linha de conta;
- fixtures: `ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS suspenso_em` **antes** do `CREATE OR REPLACE VIEW v_conta_moderacao_v1`, em `MassaDeModeracao`/`MassaDeRecomendacao`.

**Contrato e nota:** `docs/api/social.yaml` e a nota em `code/back/social/AGENTS.md`.

## Parte 3 (commit 1) — `social`: ocultação de comentários e notificações de conta suspensa

**Filtro único "comentário visível":** o autor é o próprio leitor ou está em `identidade.v_perfil_referencia_v1`. Uma resposta exige também a raiz visível (decisão 11).

**Comentários (Kayke):**
- **Raízes:** JPQL vira **nativa com `countQuery`**.
- **Respostas:** nativa com o filtro.
- **Contagens:** `countByAtividadeId`/`countByComentarioRaizId` viram nativas e passam a receber `:leitor`, o que muda a assinatura em `ServicoDeFeed.java:145`, `ServicoDeInteracao.java:206` e `contarRespostas` (:332-336).
- **`listarRespostas`:** raiz oculta dá 404.
- **`buscarAlvoNaAtividade`:** alvo oculto dá 404, sem publicar `comentario.respondido` para o suspenso.

**Denúncia (Renato):** `ServicoDeDenuncia.comentarioAcessivel` aplica o filtro e responde 404.

**Notificação (Kayke):**
- O conjunto conferido por `atoresVisiveis` inclui `dados.atividade.autorId`.
- Com autor oculto, "na atividade de um leitor", e `atividadeId`/`comentarioId` nulos.
- **Também `comentarioId` nulo quando o comentário ou a raiz dele não for visível.** Como `dados` não guarda o texto, não há vazamento, só o link.
- O SSE usa o mesmo mapper.
- Na execução, conferir o snapshot de livro da recomendação P2P (`ServicoDeNotificacao.java:170-179`). Se puder trazer livro pessoal de suspenso, anular.

**Efeito colateral:** comentários de conta em exclusão pendente também somem, coerente com a RN-23.

**Testes:**
- raiz e resposta de suspenso;
- thread de raiz oculta;
- contagens;
- 404 ao responder e ao denunciar;
- o próprio autor ainda vê os seus;
- notificações (lista e SSE) com autor de atividade oculto e com comentário em thread oculta;
- tudo volta na reativação.

Os testes caem nas classes do Kayke, que ajustam o fixture.

## Parte 4 (commit 2) — web: suspensão de conta no painel e no login

**Componente e serviço:**
- **`components/moderacao/DialogoSuspensao.vue`:** um componente para suspender e reativar, sobre `DialogoConfirmacao` com `CampoAreaTexto` (limite de 500).
  - Copy literal do design; foco no motivo; destrutivo em outline `rubi`, desabilitado sem motivo.
  - "Suspendendo conta" com aviso aos 3 s.
  - Falha que mantém o motivo e a **mesma `Idempotency-Key`**; a chave só é descartada no sucesso.
  - Toast de sucesso.
- **`services/moderacao.ts`:** `suspenderConta`, `reativarConta` e os tipos novos (`PessoaDaModeracao.suspensa/suspensaEm`; registro com `alvoId`, `alvoConta`, `motivo` e `suspensaoVigente`).

**Painel (`PainelModeracaoView.vue`):**
- `DotsThree` no título do detalhe, que alterna entre `Suspender conta do autor` e `Reativar conta do autor`, e some com "conta excluída".
- Etiqueta `Conta suspensa` na fila e faixa neutra no detalhe.
- O link do card vira a linha de conteúdo oculto.
- O foco volta ao `DotsThree`.

**Registro:**
- `Suspendeu a conta`, `Reativou a conta`, "Conta de @x" (sem link, porque o perfil do admin foi cortado) e o motivo só nas linhas de conta.
- **`Reativar conta` só na linha com `suspensaoVigente`**, abrindo o mesmo diálogo. É divergência sem artboard (decisão 10).

**Sessão e login (Henrique):**
- `services/renovacao.ts`: um 403 `CONTA_SUSPENSA` chama `encerrarSessao({ motivo: 'suspensa' })`, uma vez.
- **`session.ts`:**
  - o motivo vai numa **chave própria**, `le-ai-fim-de-sessao`, gravada antes do `removeItem` da sessão;
  - o listener de `storage` também escuta essa chave, para as outras abas;
  - a chave é **consumida** ao abrir o login e apagada em `iniciarSessao`, e assim o banner não reaparece num logout manual;
  - a chave atual e os testes de `session.spec.ts:67-72` não mudam.
- `router/index.ts`: com o motivo `suspensa`, `/login?motivo=suspensa` **em qualquer rota**. Os outros motivos não mudam.
- `LoginView.vue`:
  - `CONTA_SUSPENSA` no login mostra o banner âmbar `PhProhibit` com as duas linhas, os campos sem erro e o foco no banner;
  - `motivo=suspensa` mostra o banner de sessão encerrada.

**Testes (vitest):**
- diálogo: motivo, limite, espera, falha com a mesma chave, sucesso;
- painel: `DotsThree`, etiqueta, faixa;
- registro: `Reativar conta` só na linha vigente, reativação a partir dela;
- renovação: `CONTA_SUSPENSA` leva a logout com motivo, sem loop, e a outra aba recebe o motivo;
- **logout manual e exclusão de conta não mostram o banner**;
- os dois banners do login;
- timeout e indisponibilidade com API simulada.

**Nota em `code/front/AGENTS.md`.**

## Parte 5 (commit 2) — mobile: sessão encerrada por conta suspensa

**`session_controller.dart` (`_executarRenovacao`, :176-201):**
- `ApiException` com `codigo == 'CONTA_SUSPENSA'` chama `_sairPorSuspensao()`, uma vez.
- Ele grava o aviso (`avisarSaida(suspensa)`) **antes** de `sair()`, porque o `notifyListeners` de `sair()` pode levar ao login antes de o aviso existir.
- **Não liga `saindoPorExpiracao`.** Assim o listener da Ana (`features/sessao/sessao_controller.dart:88-97`) não troca o aviso, e o arquivo dela **não muda**.
- Consequência aceita, a registrar: se houver sessão de leitura ativa, ela é descartada em silêncio, e o aviso "o tempo medido não foi registrado" não aparece para o leitor suspenso.

**`login_page.dart`** (`_tratarErro`, :105-122; aviso, :72 e :183-186): banner âmbar com `PhosphorIconsRegular.prohibit` para `CONTA_SUSPENSA` e para a sessão encerrada, com a copy do design, `Semantics(liveRegion)` e os tokens do `ThemeData`.

**Testes:**
- renovação com `CONTA_SUSPENSA`: logout uma vez, com o aviso já gravado quando o login abre;
- os dois banners;
- timeout e 503 na renovação não fazem logout por suspensão;
- com sessão de leitura ativa, o aviso continua o de suspensão.

**Divergência aceita:** dentro da janela de 15 min, o `leitura` responde 403 "Sua conta não está disponível…" (`leituras.service.ts:542-545`), e o logout só vem na renovação.

**Nota em `code/mobile/AGENTS.md`.**

## PR e etapa 3 em paralelo à revisão

**Abrir o PR:**
- `git fetch` e integração da `origin/desenvolvimento`;
- testes automáticos dos commits 1 e 2 verdes;
- push e `gh pr create --base desenvolvimento --head renato-features`;
- o corpo segue o formato dos PRs anteriores e destaca as migrations, os segredos novos do Render e os avisos a Henrique e Kayke;
- sem linha de atribuição.

**Durante a revisão do colega:**
- os validadores de contexto limpo, um por camada;
- o teste manual da Verificação;
- as correções dos validadores e da revisão, reunidas no commit 3, no mesmo PR;
- depois, o merge na `desenvolvimento`.

**Commit 4 — `docs: F-MOD-OPC concluída`, no mesmo PR (inclui a cópia deste plano em `renato-periodo-3/plano-F-MOD-OPC.md`):**
- **`feature-F-MOD-OPC.md`:**
  - status;
  - critérios e DoD marcados só com evidência (os itens de DES ficam para depois do merge na `main`);
  - Pendências com as decisões, as divergências (VIEW no lugar do `GET /interno`, `/internal/moderacao/...`, `detalhe` como motivo, idempotência por estado e JWT repassado, logout web sem artboard, logout do mobile só na renovação, 403 da exclusão sem tratamento novo, reativar pelo registro sem artboard, ordem da etapa 3), os débitos (o perfil web do admin, as contagens, os contadores de seguidores, o `@username` em respostas, o tempo de leitura descartado) e o código alheio;
  - timeline.
- Atualizar o plano, o `prompt-F-MOD-OPC.md` (Andamento) e o `README.md` da pasta.

**Até 24/11:** merge na `main`, segredos no Render, migrations aplicadas no `le-ai-oregon`, e o fluxo conferido em DES antes de marcar os itens de DES.

## Contratos

**`identidade`:**
- `POST /internal/moderacao/usuarios/{id}/suspensao` e `/reativacao`:
  - `X-Moderacao-Token` mais o bearer do admin;
  - resposta 200 `{usuarioId, suspenso, suspensoEm, reativadoEm, alterado}`;
  - erros 401, 403, 404, 422 e 503.
- 403 `CONTA_SUSPENSA` em `/auth/login`, `/auth/refresh` e `DELETE /me/conta`.
- VIEW `identidade.v_conta_moderacao_v1(id, username, nome_exibicao, avatar_url, privacidade, suspenso, suspenso_em)`, sem a exclusão pendente.

**`social`:**
- `POST /admin/usuarios/{id}/suspender` e `/reativar`:
  - `Idempotency-Key` e o corpo `{motivo}`;
  - resposta 200 `{usuarioId, suspensa, suspensaEm, reativadaEm}`;
  - erros 403, 404, 422, 503 e 504.
- `PessoaDaModeracao` ganha `suspensa` e `suspensaEm`.
- As linhas de conta do registro ganham `alvoId`, `alvoConta`, `motivo` e `suspensaoVigente`.
- Fora por causa do corte: `GET /admin/usuarios?username=`.

**Eventos:** nenhum.

## Verificação

**Antes de cada commit:**
- `identidade` e `social`: `./mvnw verify` com `DATABASE_URL_TESTE` em Postgres local (Docker), nunca no Neon;
- web: `npm run lint`, `npm run build` e `npm test`;
- mobile: `flutter analyze` e `flutter test`.

**Manual, com os quatro serviços locais e `MODERACAO_TOKEN` igual no `identidade` e no `social`:**
1. Criar os leitores A (resenha, comentário com resposta de B, lista) e B (que segue A), e uma denúncia de B contra o comentário de A.
2. Admin, com o token local:
   - suspende A pelo `DotsThree` da denúncia;
   - confere a etiqueta, a faixa e o registro com o motivo;
   - `curl` com token de leitor em `/admin/usuarios/{id}/suspender` dá 403.
3. A no app: na renovação seguinte, faz logout uma vez com o banner, e o login com a senha certa mostra o banner. A na web: o mesmo, também numa segunda aba. O reset de senha seguido de login mantém o banner.
4. B não vê o perfil (`Perfil não encontrado`), a resenha no livro, a atividade no feed, o comentário e a thread dele, a lista nem a recomendação de A. A notificação não mostra o nome de A nem um link quebrado.
5. Suspender de novo (outra chave): zero linhas novas no registro.
6. `identidade` parado: a falha aparece, a conta continua ativa e não há linha no registro. Religado, "Tentar de novo" grava uma linha só.
7. Arquivar a denúncia e **reativar pela linha do registro**: só a linha vigente oferece a ação. A entra de novo, e B volta a ver tudo conforme a privacidade de A.
8. Telas web em 1440 e 390 px, claro e escuro. O app no emulador `Pixel_8_API_35`.

**CI** verde no PR.

## Estimativa

| Bloco | Dias |
|---|---|
| Parte 1, `identidade` | 1,5 |
| Parte 2, `social` | 1,5 |
| Parte 3, ocultação | 1 |
| Parte 4, web, sem o perfil | 1,5 |
| Parte 5, mobile | 0,5 |
| Validação, teste manual, correções, docs | 2 |
| **Total** | **8** |

## Riscos

- **Episódio sem log:** o `identidade` suspendeu, o `social` estourou o timeout e o admin desistiu sem "Tentar de novo". A falha mantém a chave e o motivo, e a retentativa grava a linha. Sem ela, a linha não existe, e a reativação continua possível pela denúncia enquanto ela estiver pendente. Se a denúncia também for resolvida, a conta fica sem caminho na tela. A saída é um `POST /admin/usuarios/{id}/reativar` manual, com token de admin, que funciona e grava o log. A probabilidade é baixa e a correção é manual. Fica registrado.
- **Janela de 15 min do access token:** é aceita pela spec. As escritas do suspenso no `leitura` já dão 403, e o conteúdo novo nasce oculto.
- **O ramo de reuso não distingue a causa da revogação:** `refresh_token` não tem `revogado_em`. Um token vazado e rotacionado antes da suspensão recebe 403 sem o WARN. Risco aceito: a conta já está bloqueada.
- **Muitos arquivos alheios** (Henrique e Kayke): aviso no grupo antes e no PR depois.
