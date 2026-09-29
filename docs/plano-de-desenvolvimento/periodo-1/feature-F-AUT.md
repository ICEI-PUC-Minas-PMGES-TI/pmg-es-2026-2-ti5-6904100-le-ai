# F-AUT — Autenticação e conta

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** Henrique Carvalho · **Serviços afetados:** `identidade` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.1. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §2.6, §7. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar o **fluxo completo de autenticação e conta** do serviço `identidade`, retomando o esqueleto navegável de [P0-NAV](../periodo-0/feature-P0-NAV.md) (cadastro/login/`me` mínimos) e implementando o que ele deixou explicitamente de fora: sessão persistente com **token de renovação revogável**, **recuperação de senha por e-mail**, **troca de senha**, **logout** e **login de administrador**.

É o alicerce de identidade sobre o qual todo o resto do Período 1 se apoia — sem sessão confiável não há estante, feed nem perfil. Fecha os requisitos **Essenciais** de AUT:

- **RF-AUT-01** cadastro (e-mail, username único, nome de exibição, data de nascimento, senha) — já iniciado em P0-NAV, consolidado aqui;
- **RF-AUT-02** login por **e-mail ou username**;
- **RF-AUT-03** emissão de **token de acesso curto** + **token de renovação** para sessão persistente;
- **RF-AUT-04** recuperação de senha por e-mail com token de uso único e prazo (via **Brevo**, P-02);
- **RF-AUT-05** troca da própria senha informando a senha atual;
- **RF-AUT-06** logout invalidando o token de renovação;
- **RF-AUT-08** login de administrador pelo mesmo fluxo, com credenciais por variável de ambiente.

RNF atendidos: **RNF-SEC-08** (HTTPS), **RNF-SEC-09** (hash Argon2/bcrypt/scrypt), **RNF-SEC-10** (token de reset aleatório, uso único, 1h, armazenado como hash), **RNF-SEC-11** (segredos por ambiente), **RNF-SEC-17** (rate limiting em auth/cadastro/reset), **RNF-SEC-27** (senha ≥8 + lista de comuns), **RNF-SEC-28** (mensagens anti-enumeração), **RNF-SEC-29** (bloqueio progressivo), **RNF-SEC-30** (token de acesso curto, renovação revogável, invalidada no logout e na troca de senha), **RNF-SEC-31** (admin forte por ambiente), **RNF-SEC-35/36** (log de falhas de auth e troca de senha, sem senha/token no log), **RNF-SEC-43** (recusa de menores de 18), **RNF-SEC-40/42** (mínimo de dados, política de privacidade).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | em andamento | `WEB_BASE_URL` entrou no `render.yaml` (base do link de recuperação); `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e o Brevo seguem `sync: false`. **Antes do deploy:** `ADMIN_PASSWORD` em DES precisa ter 16+ caracteres e vir junto de `ADMIN_EMAIL`, senão o serviço não sobe. Prova real do Brevo (P-02) pendente. CI com Postgres 17 para a integração |
| Dados | concluído | tabelas de 16/09 em uso, sem migration nova: `refresh_token`, `reset_token`, `idempotencia_identidade`; `usuario.atualizado_em` passou a ser gravado na troca de senha |
| Backend | concluído localmente | as 7 operações de F-AUT implementadas e `implemented` no OpenAPI; `Idempotency-Key` obrigatória em todas as escritas; admin provisionado no arranque; 132 testes (unitários e integração com Postgres real). Não está em DES |
| Web | concluído localmente | sessão com refresh e renovação no `401` serializada entre abas (Web Locks), logout, telas de recuperar, redefinir e alterar senha, configurações, política de privacidade no cadastro e nas configurações; 205 testes. Não está em DES |
| Mobile | concluído localmente | refresh no secure storage, renovação deduplicada, logout, as mesmas telas, app link declarado (verificação pendente); 131 testes, APK de debug gerado. Não testado em emulador |

## Especificação

### Backend / API — `identidade`

Todos os endpoints herdam de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) o **corpo de erro padrão + correlation-id** e mensagens em pt-BR (RNF-USA-05); acesso a dados por ORM/consulta parametrizada (RNF-SEC-12). O esqueleto de `register`/`login`/`me` já existe em P0-NAV; esta feature **não o reescreve**, apenas completa o comportamento e adiciona os endpoints abaixo.

Todas as escritas aceitam `Idempotency-Key` conforme a convenção do [README do período](README.md#regras-de-implementação-compartilhadas). Repetir chave e payload devolve o resultado original sem repetir efeitos, inclusive envio de e-mail; reutilizar a chave com payload diferente retorna conflito. O contrato entra no OpenAPI.

**Contrato HTTP canônico:** [`docs/api/identidade.yaml`](../../api/identidade.yaml). Os nomes de operação, parâmetros, schemas, respostas e `x-implementation-status` daquele arquivo prevalecem sobre exemplos resumidos desta feature. A presença de uma operação planejada no OpenAPI não declara implementação.

| Operação canônica | Segurança | Entrada canônica | Saída de sucesso canônica | Situação em 24/09 |
|---|---|---|---|---|
| `POST /auth/register` | pública | header `IdempotencyKey`; schema `CadastroRequisicao` | `201` `Usuario` | implementada; lista de senhas comuns e chave obrigatória por F-AUT |
| `POST /auth/login` | pública | header `IdempotencyKey`; schema `LoginRequisicao` | `200` `Sessao` | implementada, com `refreshToken` e claim `papel` |
| `POST /auth/refresh` | pública | header `IdempotencyKey`; schema `RefreshRequisicao` | `200` `Sessao` | implementada |
| `POST /auth/logout` | pública | header `IdempotencyKey`; schema `RefreshRequisicao` | `204`, sem corpo | implementada |
| `POST /auth/password/forgot` | pública | header `IdempotencyKey`; schema `EsqueciSenhaRequisicao` | `202` `MensagemResposta` | implementada |
| `POST /auth/password/reset` | pública | header `IdempotencyKey`; schema `RedefinirSenhaRequisicao` | `204`, sem corpo | implementada |
| `POST /auth/password/change` | `bearerAuth` | header `IdempotencyKey`; schema `AlterarSenhaRequisicao` | `204`, sem corpo | implementada |
| `GET /me` | `bearerAuth` | sem corpo | `200` `Usuario` | implementada por P0-NAV |

Componentes compartilhados usados por este recorte: `bearerAuth`, parâmetro `IdempotencyKey`; respostas `RequisicaoInvalida`, `NaoAutenticado`, `IdempotenciaEmConflito`, `LimiteExcedido` e `ServicoIndisponivel`; schemas `Erro`, `Token` e `Sessao`. Implementação e testes devem usar exatamente os nomes e limites do OpenAPI, sem criar DTO paralelo incompatível.

- **`POST /auth/register`** (RF-AUT-01) — consolida o de P0-NAV: e-mail, **username único**, nome de exibição, **data de nascimento**, senha. A implementação já fixou **bcrypt com custo 12**, opção admitida por SEC-09; senha **≥8 caracteres com verificação contra lista de senhas comuns** (SEC-27); **recusa <18 anos** pela data de nascimento (SEC-43); conflito de e-mail/username → `409`. Coleta mínima de dados pessoais (SEC-40). RNF-SEC-28 vale para login e recuperação, não para o conflito de cadastro.
- **`POST /auth/login`** (RF-AUT-02, RF-AUT-03) — autentica por **e-mail ou username** + senha e emite:
  ```json
  // 200
  { "accessToken": "<jwt>", "tokenType": "Bearer", "expiresIn": 900, "refreshToken": "<opaco>" }
  ```
  Token de acesso **curto** (SEC-30). Credencial inválida → `401` **sem revelar** se o identificador existe (SEC-28). **Bloqueio temporário progressivo por identidade** após falhas sucessivas (SEC-29) e **rate limiting por IP e identidade** (SEC-17). Login serve **também ao administrador** (RF-AUT-08): a conta admin é fixa e única, provisionada por `ADMIN_EMAIL`/`ADMIN_PASSWORD` (SEC-31), sem tela de criação.
- **`POST /auth/refresh`** (RF-AUT-03, SEC-30) — troca um **refresh token** válido por um novo par acesso+refresh, com **rotação** (o refresh usado é invalidado). Refresh armazenado como registro **revogável** na tabela `refresh_token`. Refresh inválido/revogado → `401`.
- **`POST /auth/logout`** (RF-AUT-06, SEC-30) — invalida o refresh token corrente (revoga o registro). Idempotente.
- **`POST /auth/password/change`** (RF-AUT-05, SEC-30) — exige `Authorization` + **senha atual** + nova senha (mesma política SEC-27). Em sucesso, **invalida todos os refresh tokens** do usuário (força novo login nos demais dispositivos). Senha atual incorreta ou senha nova comum → `422`; conta administradora → `403`. Registrado em log de auditoria (SEC-35), sem expor a senha (SEC-36).
- **`POST /auth/password/forgot`** (RF-AUT-04, SEC-10) — recebe e-mail; **sempre responde `202` com o mesmo corpo** exista ou não a conta (anti-enumeração, SEC-28). Se existir, gera **token aleatório criptográfico, de uso único, validade máxima de 1h, armazenado como hash** (`reset_token`) e envia link por **Brevo** (P-02, remetente verificado). Timeout, retentativa com backoff e circuit breaker são obrigatórios; status, corpo e tempo observável não podem revelar existência da conta ou resultado individual do provedor. A resposta confirma apenas o recebimento da solicitação, não a entrega do e-mail. Rate limiting (SEC-17).
- **`POST /auth/password/reset`** (RF-AUT-04) — recebe token + nova senha; valida hash/validade/uso único, troca a senha (SEC-27), **consome o token** e **invalida os refresh tokens** do usuário. Token desconhecido, adulterado, vencido ou usado → sempre `410 RECURSO_EXPIRADO` com a mesma mensagem (o protótipo exige tratamento igual para os três); `400` fica para a senha nova.

**Middleware de auth** — herdado de P0-NAV: valida o token de acesso, injeta a identidade, `401` quando ausente/inválido; serviço **stateless** (RNF-ARQ-04). Falhas de autenticação e autorização são **logadas** (SEC-35), nunca com senha/token/hash (SEC-36).

[F-CONTA-2](../periodo-2/feature-F-CONTA-2.md) estende o login: conta com exclusão pendente recebe acesso restrito somente a `POST /me/conta/cancelar-exclusao`, sem refresh token nem acesso às demais rotas.

**Modelo de dados** (schema `identidade`): a migration [`V20260915120000__completa_schema_identidade.sql`](../../../code/back/identidade/src/main/resources/db/migration/V20260915120000__completa_schema_identidade.sql) já foi versionada, validada em PostgreSQL 17 e aplicada no Neon em 16/09, conforme o [`DER`](../../diagramas/DER.md#checklist-do-neon). Ela amplia `usuario` e cria `refresh_token`, `reset_token`, `tentativa_login`, `idempotencia_identidade` e `outbox_identidade`. F-AUT implementa o uso dessas estruturas; não deve recriá-las nem editar migration aplicada. Qualquer ajuste exige nova migration timestampada e revisão humana.

**Mensageria e ownership:** esta feature **não** produz nem consome evento de domínio do [catálogo canônico](../../mensageria/catalogo.md); `seguidor.novo` e `solicitacao.*` pertencem a [F-PERFIL](feature-F-PERFIL.md). [P0-MSG](../periodo-0/feature-P0-MSG.md) é pré-requisito apenas se o grupo aprovar o envio assíncrono do e-mail: P0-MSG possui envelope, topologia, dispatcher, retry e DLQ; F-AUT possuiria o contrato e o produtor do eventual evento de e-mail. Nenhum schema desse evento existe hoje, portanto ele não pode ser inventado na implementação sem decisão pelo controle de mudança. A tabela `outbox_identidade` já implantada é infraestrutura de dados, não evidência de publisher funcional. **Decidido em 24/09/2026:** envio assíncrono em processo, sem evento, sem outbox e sem P0-MSG (ver pendências); a dependência de P0-MSG deixa de valer para esta feature.

### Frontend Web (`code/front`)

- Telas de **recuperação de senha** (pedir e-mail → confirmação neutra) e **redefinição** (via link com token) e **troca de senha** (área autenticada), usando **só os tokens** de [P0-DS](../periodo-0/feature-P0-DS.md).
- **Sessão persistente:** guarda o refresh, faz **renovação silenciosa** do token de acesso antes de expirar, e trata `401` disparando refresh e, em falha, redireciona ao login. Cliente HTTP central injeta `Authorization` + `X-Correlation-Id`, aplica timeout e backoff somente a operações idempotentes (RNF-ERR-03) e trata **cold start** do Render como carregamento (RNF-ERR-09).
- **Logout** limpa a sessão local e chama `/auth/logout`.
- Validação de formulário reforça, não substitui, a validação do servidor. O cadastro e as configurações dão acesso à **política de privacidade** versionada, informando dados coletados, finalidade e retenção (SEC-42).

### App Flutter (`code/mobile`)

- Mesmas telas (recuperação, redefinição por link, troca de senha), usando o `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md).
- **Armazenamento seguro do refresh token** (secure storage); renovação silenciosa e mesma política de `401`; secure storage nunca em log.
- Cadastro e configurações dão acesso à mesma **política de privacidade** da web, com dados coletados, finalidade e retenção (SEC-42).
- Alvo de demonstração é Android (APK do CI, [P0-CI](../periodo-0/feature-P0-CI.md)).

## Critérios de aceite

Marcado = verificado localmente por teste em 24/09/2026. Nada foi verificado em DES ainda.

- [x] Cadastro cria usuário com senha **hasheada** (SEC-09), ≥8 e fora da lista de comuns (SEC-27); **menor de 18** recusado (SEC-43); conflito de e-mail/username → `409`.
- [x] Login por e-mail **ou** username emite acesso curto + refresh; credencial inválida → `401` **sem revelar** existência (SEC-28); após N falhas, **bloqueio progressivo** por identidade (SEC-29); rate limiting ativo (SEC-17).
- [x] Admin entra pelo mesmo login com credenciais de ambiente (SEC-31); não há tela de criação de admin.
- [x] `POST /auth/refresh` rotaciona o par e **invalida** o refresh usado; refresh revogado → `401`.
- [x] `POST /auth/logout` invalida o refresh; repetir é idempotente.
- [x] Troca de senha exige senha atual e **invalida os refresh** existentes (SEC-30).
- [ ] `forgot` responde igual exista ou não a conta (SEC-28); quando existe, envia link Brevo com token **hash, uso único, ≤1h** (SEC-10); `reset` troca a senha, consome o token e invalida os refresh. *Tudo testado com o Brevo simulado; falta a entrega real (P-02).*
- [x] Web e mobile mantêm **sessão persistente** com renovação silenciosa; cold start é carregamento, não erro (RNF-ERR-09).
- [x] Logs registram falhas de auth e troca de senha (SEC-35) **sem** senha/token/hash (SEC-36).
- [ ] Política de privacidade versionada informa dados coletados, finalidade e retenção e está acessível no cadastro e nas configurações de web e mobile (SEC-42). *Acesso feito nos quatro lugares; o texto ainda é o mock do protótipo, o final é do grupo.*
- [x] Repetir uma escrita com a mesma `Idempotency-Key` não repete efeito; chave reutilizada com payload diferente retorna conflito (RNF-ERR-04).
- [ ] Fluxo cadastro→login→refresh→troca de senha→logout e recuperação por e-mail funcionam **em DES**.

## Definition of Done

(plano §10 — obrigatórios para toda feature)

- [x] Código (backend `identidade`, web, mobile) em `desenvolvimento` (commits locais de 24/09; push pendente)
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md)): depende do push
- [x] Testes unitários e de integração com banco real/container: register (hash/18+/mínimo/lista de comuns), login (e-mail/username, inválido anti-enumeração, bloqueio progressivo e admin de ambiente), refresh (rotação atômica, replay e revogação), logout repetido, troca de senha (senha atual e invalidação de todos os refresh), forgot/reset (resposta indistinguível para conta existente/inexistente, token somente em hash, uso único, expiração em 1h, concorrência de consumo e invalidação de refresh) e replay/conflito de `Idempotency-Key` (RNF-TST-02)
- [ ] Testes de contrato validam requisições/respostas e códigos contra os componentes canônicos de [`identidade.yaml`](../../api/identidade.yaml), inclusive que login atual evolui de `Token` para `Sessao` sem uma rota administrativa paralela. *Não há teste de contrato automatizado; o spec foi alinhado à mão e passa no `redocly lint`*
- [x] E-mail assíncrono em processo (decisão de 24/09, sem evento nem outbox): testes simulam retentativa com backoff e o disjuntor do Brevo sem quebrar o `202` uniforme
- [x] Testes dos serviços/estado web e mobile cobrem sessão, logout, política de privacidade e tratamento de indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [x] **Spec OpenAPI de `identidade` atualizado em `docs/api/identidade.yaml`** com as rotas de conta/sessão (sobre o esqueleto de P0-NAV)
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver

**Item próprio:** o modelo físico compartilhado de `usuario` (privacidade e contadores incluídos) já foi fixado pela migration de 15/09. F-AUT e [F-PERFIL](feature-F-PERFIL.md) devem reutilizá-lo e coordenar qualquer nova migration no serviço `identidade` (plano §6).

## Pendências

**Decisões de projeto tomadas em 24/09/2026** (registradas aqui por serem da feature; nenhuma altera `docs/orquestador/`):

1. **Refresh na web em `localStorage`**, com rotação e detecção de reuso: token revogado reapresentado derruba todas as renovações do usuário. Cookie `httpOnly` seria de terceiro entre `leai-web` e `leai-identidade` (`onrender.com` está na Public Suffix List). Superfície de XSS aceita e compensada pela rotação.
2. **E-mail de recuperação assíncrono em processo**: a requisição só grava o recibo e agenda, depois do commit, a busca da conta, o token e o envio (executor com 3 tentativas, backoff 2 s/8 s e disjuntor). Não é durável: reinício perde o que estava na fila e a pessoa pede de novo. Não cria evento no catálogo nem usa P0-MSG. Outbox/worker fica como evolução.
3. **Admin provisionado no arranque** a partir de `ADMIN_EMAIL`/`ADMIN_PASSWORD`, sem coluna de papel: o papel sai do id da linha provisionada e vai na claim `papel` do token. Senha do admin com 16+ caracteres; configuração pela metade impede o boot; o admin não troca nem recupera senha pela API.
4. Validade do refresh de **30 dias** (os documentos não fixavam valor); teto de **5 links de recuperação por conta por hora**; link com o token no **fragmento** (`#token=`).

**Divergências protótipo × implementação:**

- **E-mail em Configurações** (decisão do dono em 25/09/2026): `GET /me` passou a devolver o schema `UsuarioProprio`, com o e-mail do próprio dono; cadastro, busca, listas e perfis de terceiros continuam sem e-mail.
- **Alterar senha mantém a sessão do aparelho refazendo o login** com a senha nova depois do `204`, porque o contrato revoga todas as renovações, inclusive a do aparelho que pediu. Se esse login falhar, a sessão local cai quando o acesso vencer (15 min).
- **Renovação reativa**, no primeiro `401`, e não antes de expirar como a especificação da web descreve: um `401` a mais por sessão parada há mais de 15 min.
- `reset` usa `410` para todo token inválido (a especificação original falava em `400`/`410`); `change` usa `422` para os dois erros de senha.
- **Login e cadastro seguem o protótipo de F-AUT, não o prompt de P0-NAV** (teste de aceite de 25/09/2026). O protótipo, que é o desenho aprovado (`docs/design/AGENTS.md` §10), trouxe na web uma coluna esquerda nova (frase "Sua estante digital, seu progresso de leitura, sua comunidade leitora." e linha de apoio em `editorial`, ilustração do unDraw sobre círculo `musgo-fundo`), um selo de 56px acima do título e ícones Phosphor dentro dos campos, na web e no mobile. Os prompts `periodo-0/P0-NAV/login.md` §5 e `cadastro.md` pedem o contrário: frase "Registre suas leituras..." em `title-lg`, "sem imagem, sem ilustração", e só o `Eye` na senha. Os prompts ficaram desatualizados e precisam ser revistos. Recuperar e redefinir senha mantêm a frase antiga, mas também têm a leitora na coluna (o registro anterior dizia o contrário, por engano).
- **Serifa fora dos três usos editoriais:** a frase e a linha de apoio da coluna ilustrada usam Newsreader (peso 600 acrescentado ao import de fontes da web), e o `documento-de-design.md` restringe a serifa a resenha, trechos e sinopse. Implementado como no protótipo; conflito com o orquestrador para o grupo decidir.
- **Validação do cadastro ao sair do campo**, na web e no mobile: o erro aparece no `blur` e o campo revalida a cada digitação depois de tocado. `cadastro.md` §4.1 dizia "a validação acontece no envio"; o botão continua ativo o tempo todo, que era a parte que o prompt protegia.
- **"Confirmar senha" no cadastro** (decisão do dono em 25/09/2026): validação só no cliente, como em redefinir senha; o corpo de `POST /auth/register` não muda.
- **Spinner no envio** do login e do cadastro: os protótipos desenham um indicador girando, o que o `documento-de-design.md` proíbe ("não existe spinner girando"). Implementado como no protótipo, com o arco parado quando o sistema pede menos animação; conflito para o grupo decidir.
- **Botão esmaecido a 45%** no envio (componente compartilhado); os protótipos de login e cadastro usam 40%, e os de conta, 45%.
- **Lockup da marca**: o tamanho do wordmark segue o `documento-de-design.md` §3.7 (caixa alta alinhada ao símbolo, cerca de 1,4 vez a altura); os protótipos usam três proporções diferentes para o mesmo lockup. A cor no escuro também segue o documento (`musgo-claro`), e não o `papel` ou as duas cores dos protótipos.
- O "." depois de "Política de privacidade" continua; no app, o parágrafo inteiro do aviso abre a política, para o alvo de toque ter pelo menos 48.
- **Título "Privacidade" no celular** (decisão do dono em 29/09/2026): o protótipo de configurações desenha "Política de privacidade" em duas linhas no header. No app (configurações e política do cadastro) e na web abaixo de 768px o título é "Privacidade", em uma linha, para caber ao lado da seta e do sino; a web a partir de 768px mantém "Política de privacidade". Na web isso vem de `meta.tituloCurto` no `CabecalhoTela` e na página pública; os links "Política de privacidade" (linha de Configurações e aviso do cadastro) não mudam.

**Em aberto:**

- **Texto final da política de privacidade** (SEC-42) é entrega do grupo. Hoje web e mobile mostram o mock do protótipo, num componente só por plataforma (`PoliticaDePrivacidade.vue`, `politica_de_privacidade.dart`).
- **Prova real do Brevo** (P-02): remetente verificado e entrega em DES. Até lá o critério de `forgot` fica aberto.
- **App link do Android:** o intent-filter de `https://leai-web.onrender.com/redefinir-senha` está no manifesto, mas abrir direto no app exige `assetlinks.json` no `leai-web` com a SHA-256 da chave de release, que não existe. Sem ele o link abre no navegador e a tela web resolve.
- **Testes de contrato** automatizados contra `identidade.yaml` não existem (item do DoD).
- **`ControleDeTentativas` em memória** (RNF-ARQ-04): aceitável com uma instância no Render; migrar para `tentativa_login` se escalar. A senha atual da troca de senha não passa por ele, só pelo limite por IP.
- **Filtro de bearer do Spring Security recusa token vencido com `401` mesmo em rota pública.** Web e mobile contornam mandando as rotas públicas sem `Authorization`; ignorar o bearer nessas rotas no servidor fica como melhoria.
- **Formatação do mobile:** o código não segue o `dart format` padrão e o CI não confere; rodar o formatador em lote reformata dezenas de arquivos. Decisão do grupo.
- **Divergência de baseline:** exclusão de conta (RF-AUT-07) está alocada a **F-CONTA-2** (Período 2, desejável), mas RNF-SEC-41 pertence ao conjunto de segurança declarado Essencial. O grupo precisa resolver a prioridade pelo controle de mudança; esta feature não declara RNF-SEC-41 atendido nem altera a baseline.
- Compartilhamento do serviço `identidade` com [F-PERFIL](feature-F-PERFIL.md): sinalizar no grupo antes de propor nova migration ou alterar entidades/DTOs compartilhados (plano §6).
- **Depende futuramente de F-CONTA-2:** preservar um ponto de extensão no login/middleware para o acesso restrito de recuperação de conta, sem antecipar sua implementação no Período 1.
- **Depende de** [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md) para DES e de [P0-CI](../periodo-0/feature-P0-CI.md) para o CI.

## Timeline

### 29/09/2026: título "Privacidade" no celular. Mobile: `PoliticaDePrivacidadePage` usa `CabecalhoTela(titulo: 'Privacidade')` em uma linha, e o parâmetro `tituloEmDuasLinhas` saiu do `CabecalhoTela`. Web: `RouteMeta.tituloCurto` (rota `politica-de-privacidade`) repassado pelo `ShellAutenticado` ao `CabecalhoTela`, e o mesmo par de spans no `h1` de `PoliticaPublica`; "Privacidade" abaixo de 768px, "Política de privacidade" a partir dele. Divergência do protótipo registrada em Pendências.

### Organização 27/09/2026: refatoração estrutural, sem mudança de comportamento, contrato, rota ou migration. Backend: `auth/` (25 classes soltas) dividido em `controller/`, `dto/`, `service/`, `validacao/` e `model/`, no padrão do `social`; testes movidos para o pacote da classe testada. Viraram `public` só os membros chamados de outra camada: `GestorDeRenovacao.hash`, e as constantes `ServicoDeAutenticacao.CREDENCIAL_INVALIDA` e `PoliticaDeSenha.SENHA_COMUM`, lidas pelos testes. Web: views de F-AUT em `views/auth/` (com `validacaoDeSenha.ts`) e `PoliticaDePrivacidade`/`PoliticaPublica` em `components/auth/`. Estrutura registrada nos `AGENTS.md` do `identidade` e da web. Testes: `identidade` 191 (69 de integração ignorados, sem Postgres local), web 557, as mesmas contagens de antes da mudança.

### Revisão contra os protótipos 25/09/2026: telas de F-AUT conferidas lado a lado com os protótipos renderizados (web e app) depois da mudança do §10 de `docs/design/AGENTS.md`. Contrato: `GET /me` devolve `UsuarioProprio` com o e-mail (backend, `identidade.yaml`, clientes). Web: família Space Grotesk dos títulos (o Tailwind v4 descartava a `fontFamily` dos tokens, e todo título do front saía em Manrope), leitora também em recuperar e redefinir, estados de envio esmaecidos com a legenda centralizada, ordem erro/helper, aviso de sessões depois da confirmação, Configurações com e-mail, Alterar senha com os botões lado a lado, diálogos de 360px, header com o link `← Configurações`. App: o símbolo da marca saía cortado (o `flutter_svg` ignora `transform-origin`; a origem foi incorporada na matriz do SVG, sem mudar o desenho), botão primário plano e desabilitado em `musgo` esmaecido, os mesmos estados da web e "Confirmar senha". Testes: `identidade` 190 (com integração, 0 ignorados), web 286, mobile 201.

### Teste de aceite 25/09/2026: correções do teste manual do dono. Senha da lista com espaço nas pontas (`leai2026 `) passava na verificação de RNF-SEC-27; a comparação agora ignora espaço nas pontas, sem alterar a senha gravada (`PoliticaDeSenha`, 4 casos novos). `leai2026` sem espaço já era recusada no servidor local; se o teste foi em DES, a causa é outra: a lista de senhas comuns ainda não está na `main`. Login e cadastro alinhados ao protótipo de F-AUT (coluna ilustrada, selo, ícones nos campos) e cadastro com validação ao sair do campo, na web e no mobile; divergências dos prompts registradas em Pendências. Testes: `identidade` 190 unitários (integração não rodada, sem Postgres local), web 265, mobile 168.

### Implementação 24/09/2026: backend, web e mobile de F-AUT implementados em 14 etapas (plano de execução do dono), commits de `b5cc565` a este fechamento em `desenvolvimento`. Backend: idempotência sobre `idempotencia_identidade` com recibo cifrado para respostas com token, lista de senhas comuns, refresh rotativo com detecção de reuso, logout, troca de senha, recuperação com envio assíncrono em processo, admin provisionado pelo ambiente e `Idempotency-Key` obrigatória em todas as escritas; CI ganhou Postgres para a integração. OpenAPI alinhado (7 operações `implemented`). Web e mobile: sessão com refresh e renovação no `401` (serializada entre abas na web), logout e as telas de recuperar, redefinir e alterar senha, configurações e política de privacidade no cadastro e nas configurações. Testes: `identidade` 132, web 205, mobile 131. Não verificado em DES; texto final da política e prova do Brevo pendentes. Decisões e divergências na seção de pendências.

### Atribuição e verificação 24/09/2026: feature assumida por Henrique Carvalho, junto de [F-PERFIL](feature-F-PERFIL.md). Estado conferido no código de `desenvolvimento` (`d7b1a3f`): no backend só existem as operações `implemented` do OpenAPI (`register`, `login`, `/me`); as cinco operações próprias de F-AUT seguem `planned`. CI do `identidade` verde no último push (`2c01f63`, 20/09). Em DES, `leai-identidade` responde `/health` 200 após cold start de ~165 s, ainda com a versão de `main` (16/09). Registrados o CORS sem `Idempotency-Key`, as lacunas herdadas de P0-NAV e os protótipos disponíveis; corrigido o estado de P0-MSG, cujo runtime não está mais "não iniciado".

### Consolidação 17/09/2026: operações e componentes HTTP alinhados ao contrato canônico expandido de `identidade`; estado físico das tabelas e outbox implantadas separado do estado funcional; ownership de eventual mensageria de e-mail, pré-requisito P0-MSG, dependências e matriz mínima de testes explicitados sem declarar o escopo F-AUT implementado.

### Revisão 01/09/2026: extensão de login restrito para recuperação de conta em F-CONTA-2 registrada, sem ampliar o escopo do Período 1.

### Revisão 28/08/2026: idempotência de escritas, resposta anti-enumeração uniforme, resiliência do Brevo, política de privacidade nas duas plataformas e testes obrigatórios explicitados. A topologia de e-mail e a contradição RF-AUT-07 × RNF-SEC-41 foram registradas como decisões de baseline, sem reclassificação autônoma.

### Implementação parcial 19/09/2026: criado `EmailNotificationService` com cliente HTTP da API transacional do Brevo, timeout de conexão/leitura, corpo texto para recuperação de senha e tratamento neutro de falhas. O endpoint `forgot`, o token persistido e retry/circuit breaker permanecem pendentes desta feature.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-AUT no [periodo-1/README.md](README.md), de RF-AUT-01..06/08 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.1 e dos RNF de segurança §8. Fronteira com [P0-NAV](../periodo-0/feature-P0-NAV.md) (esqueleto) e com F-CONTA-2 (exclusão de conta, Período 2) explicitada.
