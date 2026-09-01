# F-AUT — Autenticação e conta

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** a definir · **Serviços afetados:** `identidade` (backend) + web + mobile

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
| Infra | não iniciado | tabelas `refresh_token` e `reset_token`; integração Brevo (P-02) |
| Backend | não iniciado | `identidade`: refresh/logout/troca e recuperação de senha + admin sobre o esqueleto de P0-NAV |
| Web | não iniciado | telas de recuperação/troca de senha + sessão persistente (renovação silenciosa) e logout |
| Mobile | não iniciado | mesmas telas + secure storage do refresh + sessão persistente |

## Especificação

### Backend / API — `identidade`

Todos os endpoints herdam de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) o **corpo de erro padrão + correlation-id** e mensagens em pt-BR (RNF-USA-05); acesso a dados por ORM/consulta parametrizada (RNF-SEC-12). O esqueleto de `register`/`login`/`me` já existe em P0-NAV; esta feature **não o reescreve**, apenas completa o modelo e adiciona os endpoints abaixo.

Todas as escritas aceitam `Idempotency-Key` conforme a convenção do [README do período](README.md#regras-de-implementação-compartilhadas). Repetir chave e payload devolve o resultado original sem repetir efeitos, inclusive envio de e-mail; reutilizar a chave com payload diferente retorna conflito. O contrato entra no OpenAPI.

- **`POST /auth/register`** (RF-AUT-01) — consolida o de P0-NAV: e-mail, **username único**, nome de exibição, **data de nascimento**, senha. Hash Argon2/bcrypt/scrypt (SEC-09); senha **≥8 caracteres com verificação contra lista de senhas comuns** (SEC-27); **recusa <18 anos** pela data de nascimento (SEC-43); conflito de e-mail/username → `409`. Coleta mínima de dados pessoais (SEC-40). RNF-SEC-28 vale para login e recuperação, não para o conflito de cadastro.
- **`POST /auth/login`** (RF-AUT-02, RF-AUT-03) — autentica por **e-mail ou username** + senha e emite:
  ```json
  // 200
  { "accessToken": "<jwt>", "tokenType": "Bearer", "expiresIn": 900, "refreshToken": "<opaco>" }
  ```
  Token de acesso **curto** (SEC-30). Credencial inválida → `401` **sem revelar** se o identificador existe (SEC-28). **Bloqueio temporário progressivo por identidade** após falhas sucessivas (SEC-29) e **rate limiting por IP e identidade** (SEC-17). Login serve **também ao administrador** (RF-AUT-08): a conta admin é fixa e única, provisionada por `ADMIN_EMAIL`/`ADMIN_PASSWORD` (SEC-31), sem tela de criação.
- **`POST /auth/refresh`** (RF-AUT-03, SEC-30) — troca um **refresh token** válido por um novo par acesso+refresh, com **rotação** (o refresh usado é invalidado). Refresh armazenado como registro **revogável** na tabela `refresh_token`. Refresh inválido/revogado → `401`.
- **`POST /auth/logout`** (RF-AUT-06, SEC-30) — invalida o refresh token corrente (revoga o registro). Idempotente.
- **`POST /auth/password/change`** (RF-AUT-05, SEC-30) — exige `Authorization` + **senha atual** + nova senha (mesma política SEC-27). Em sucesso, **invalida todos os refresh tokens** do usuário (força novo login nos demais dispositivos). Senha atual incorreta → `401`/`422`. Registrado em log de auditoria (SEC-35), sem expor a senha (SEC-36).
- **`POST /auth/password/forgot`** (RF-AUT-04, SEC-10) — recebe e-mail; **sempre responde `202` com o mesmo corpo** exista ou não a conta (anti-enumeração, SEC-28). Se existir, gera **token aleatório criptográfico, de uso único, validade máxima de 1h, armazenado como hash** (`reset_token`) e envia link por **Brevo** (P-02, remetente verificado). Timeout, retentativa com backoff e circuit breaker são obrigatórios; status, corpo e tempo observável não podem revelar existência da conta ou resultado individual do provedor. A resposta confirma apenas o recebimento da solicitação, não a entrega do e-mail. Rate limiting (SEC-17).
- **`POST /auth/password/reset`** (RF-AUT-04) — recebe token + nova senha; valida hash/validade/uso único, troca a senha (SEC-27), **consome o token** e **invalida os refresh tokens** do usuário. Token inválido/expirado → `400`/`410` com mensagem genérica.

**Middleware de auth** — herdado de P0-NAV: valida o token de acesso, injeta a identidade, `401` quando ausente/inválido; serviço **stateless** (RNF-ARQ-04). Falhas de autenticação e autorização são **logadas** (SEC-35), nunca com senha/token/hash (SEC-36).

[F-CONTA-2](../periodo-2/feature-F-CONTA-2.md) estende o login: conta com exclusão pendente recebe acesso restrito somente a `POST /me/conta/cancelar-exclusao`, sem refresh token nem acesso às demais rotas.

**Modelo de dados** (schema `identidade`, migration revisada por humano — plano §5):
- `usuario` (herdado de P0-NAV; confirmar campos: e-mail, username único, nome de exibição, data de nascimento, hash de senha, privacidade default, timestamps).
- `refresh_token` — id opaco não sequencial (SEC-05), dono, hash do token, revogado/expiração, timestamps.
- `reset_token` — hash do token, dono, expiração (≤1h), consumido.

**Eventos:** esta feature **não** produz eventos de domínio no fluxo assíncrono de §7.2 (os eventos de identidade — `seguidor.novo`, `solicitacao.*` — pertencem a [F-PERFIL](feature-F-PERFIL.md)).

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

- [ ] Cadastro cria usuário com senha **hasheada** (SEC-09), ≥8 e fora da lista de comuns (SEC-27); **menor de 18** recusado (SEC-43); conflito de e-mail/username → `409`.
- [ ] Login por e-mail **ou** username emite acesso curto + refresh; credencial inválida → `401` **sem revelar** existência (SEC-28); após N falhas, **bloqueio progressivo** por identidade (SEC-29); rate limiting ativo (SEC-17).
- [ ] Admin entra pelo mesmo login com credenciais de ambiente (SEC-31); não há tela de criação de admin.
- [ ] `POST /auth/refresh` rotaciona o par e **invalida** o refresh usado; refresh revogado → `401`.
- [ ] `POST /auth/logout` invalida o refresh; repetir é idempotente.
- [ ] Troca de senha exige senha atual e **invalida os refresh** existentes (SEC-30).
- [ ] `forgot` responde igual exista ou não a conta (SEC-28); quando existe, envia link Brevo com token **hash, uso único, ≤1h** (SEC-10); `reset` troca a senha, consome o token e invalida os refresh.
- [ ] Web e mobile mantêm **sessão persistente** com renovação silenciosa; cold start é carregamento, não erro (RNF-ERR-09).
- [ ] Logs registram falhas de auth e troca de senha (SEC-35) **sem** senha/token/hash (SEC-36).
- [ ] Política de privacidade versionada informa dados coletados, finalidade e retenção e está acessível no cadastro e nas configurações de web e mobile (SEC-42).
- [ ] Repetir uma escrita com a mesma `Idempotency-Key` não repete efeito; chave reutilizada com payload diferente retorna conflito (RNF-ERR-04).
- [ ] Fluxo cadastro→login→refresh→troca de senha→logout e recuperação por e-mail funcionam **em DES**.

## Definition of Done

(plano §10 — obrigatórios para toda feature)

- [ ] Código (backend `identidade`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: register (hash/18+/mínimo/lista de comuns), login (e-mail/username, inválido anti-enumeração, bloqueio progressivo), refresh (rotação/revogação), logout, troca de senha (invalida refresh), forgot/reset (token hash/uso único/1h) e idempotência (RNF-TST-02)
- [ ] Testes dos serviços/estado web e mobile cobrem sessão, logout, política de privacidade e tratamento de indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `identidade` atualizado em `docs/api/identidade.yaml`** com as rotas de conta/sessão (sobre o esqueleto de P0-NAV)
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** confirmar com o dono de [F-PERFIL](feature-F-PERFIL.md) o modelo final de `usuario` (campo de privacidade, contadores) — as duas features compartilham o serviço `identidade`; quem chegar primeiro fixa a estrutura (plano §6).

## Pendências

- **Depende de** [P0-NAV](../periodo-0/feature-P0-NAV.md) (esqueleto register/login/me e formato de token), [P0-INFRA](../periodo-0/feature-P0-INFRA.md) (serviço de pé, erro/health/correlation-id), [P0-DS](../periodo-0/feature-P0-DS.md) (tokens), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md) (DES) e [P0-CI](../periodo-0/feature-P0-CI.md). O envio de e-mail depende da validação **Brevo** de [P0-MSG](../periodo-0/feature-P0-MSG.md) (P-02).
- **Divergência de baseline:** exclusão de conta (RF-AUT-07) está alocada a **F-CONTA-2** (Período 2, desejável), mas RNF-SEC-41 pertence ao conjunto de segurança declarado Essencial. O grupo precisa resolver a prioridade pelo controle de mudança; esta feature não declara RNF-SEC-41 atendido nem altera a baseline.
- Biblioteca de JWT e de secure storage (mobile) a fixar no arranque; stack do serviço (`identidade`) ainda pendente (Spring vs NestJS — P0-INFRA).
- **Decisão bloqueante do envio de e-mail:** o fluxo é candidato assíncrono em §7.2, mas não foi aprovado. Antes de implementar, o grupo deve escolher entre aceite durável assíncrono (por exemplo, outbox/worker) ou chamada síncrona. Em ambos, `forgot` preserva `202` uniforme; no modo síncrono, falha do Brevo fica apenas em log/métrica e o usuário pode repetir a solicitação, pois expor `503` somente para conta existente violaria SEC-28. A escolha e o tratamento da tensão com a mensagem clara de RNF-ERR-08 devem ser registrados pelo controle de mudança.
- Compartilhamento do serviço `identidade` com [F-PERFIL](feature-F-PERFIL.md): sinalizar no grupo antes de mexer no modelo `usuario` (plano §6).
- **Depende futuramente de F-CONTA-2:** preservar um ponto de extensão no login/middleware para o acesso restrito de recuperação de conta, sem antecipar sua implementação no Período 1.

## Timeline

### Revisão 01/09/2026: extensão de login restrito para recuperação de conta em F-CONTA-2 registrada, sem ampliar o escopo do Período 1.

### Revisão 28/08/2026: idempotência de escritas, resposta anti-enumeração uniforme, resiliência do Brevo, política de privacidade nas duas plataformas e testes obrigatórios explicitados. A topologia de e-mail e a contradição RF-AUT-07 × RNF-SEC-41 foram registradas como decisões de baseline, sem reclassificação autônoma.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-AUT no [periodo-1/README.md](README.md), de RF-AUT-01..06/08 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.1 e dos RNF de segurança §8. Fronteira com [P0-NAV](../periodo-0/feature-P0-NAV.md) (esqueleto) e com F-CONTA-2 (exclusão de conta, Período 2) explicitada.
