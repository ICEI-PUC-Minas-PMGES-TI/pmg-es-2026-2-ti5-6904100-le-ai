# F-NOT-2 — Notificações em tempo real

**Período:** 2 · **Prioridade:** desejavel
**Dono:** Kayke · **Serviços afetados:** `social` (backend) + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.10 (RF-NOT-06) e §2.1 (escopo web). Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §6 (Render/cold start), §2.7. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar a **entrega em tempo real** das notificações — o cliente recebe sem recarga manual. Continua [F-NOT](../periodo-1/feature-F-NOT.md) (que entregou a lista in-app). Fecha o requisito **Desejável**:

- **RF-NOT-06** o sistema deve entregar notificações ao cliente **em tempo real**, sem necessidade de recarga manual.

É entrega **in-app em tempo real** — **não** push FCM (RF-NOT-07 é Opcional/Período 3). **Fora do escopo web** (§2.1: notificações não fazem parte do cliente Vue).

RNF atendidos: **RNF-ERR-09** (hibernação do Render tratada — reconexão, não erro), **RNF-ERR-03** (reconexão com backoff), **RNF-SEC-01/02** (o canal só entrega ao dono autenticado), **RNF-ARQ-04** (serviço stateless — o dado vive no banco; a conexão é transporte).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | implementado | canal **SSE** `GET /notificacoes/tempo-real` no serviço `social`; validação no Render free pendente |
| Backend | implementado | `social`: notificação nova empurrada após o commit, com total de não lidas; canal encerra na expiração do JWT |
| Web | **não aplicável** | notificações estão **fora do escopo web** (`REQUISITOS.md` §2.1) |
| Mobile | implementado | canal SSE no shell com reconexão silenciosa e backoff; badge, item novo no topo, aviso `N novas notificações` com a lista rolada e sincronização sem duplicar; validação em DES pendente |

## Especificação

### Backend / API — `social`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. **Não** introduz evento de domínio novo nem novo tipo de notificação: reusa a **criação de notificação** de [F-NOT](../periodo-1/feature-F-NOT.md); esta feature adiciona a **camada de transporte** em tempo real.

- **Canal de tempo real** por usuário **autenticado** (token de [F-AUT](../periodo-1/feature-F-AUT.md)) — **SSE** (decisão fixada; ver Pendências). O canal só entrega ao **dono** (SEC-01/02). O token de acesso nunca vai em query string/log; o protocolo escolhido usa cabeçalho ou handshake protegido.
- **Expiração da sessão:** a conexão não pode sobreviver indefinidamente ao JWT curto. O servidor encerra o canal quando o token expira; o app renova pelo fluxo de F-AUT e reconecta com backoff, sem criar um mecanismo de sessão paralelo.
- **Empurrar (RF-NOT-06):** quando o consumidor de notificações de [F-NOT](../periodo-1/feature-F-NOT.md) **grava uma notificação**, ela é **empurrada** à(s) conexão(ões) ativa(s) do destinatário, junto com a **contagem de não lidas** atualizada (badge). A gravação continua sendo a fonte de verdade; o tempo real é só a entrega antecipada.
- **Sem estado essencial na conexão (RNF-ARQ-04):** a notificação vive no banco (F-NOT); a conexão é transporte. Em **instância única** do plano gratuito do Render, o fan-out à conexão do destinatário é **in-process** a partir do consumidor; um **backplane** (pub/sub) só é necessário se o serviço escalar para múltiplas instâncias (registrado como consideração).

### App Flutter (`code/mobile`)

- **Conexão de tempo real** que recebe as notificações e atualiza a lista/badge de [F-NOT](../periodo-1/feature-F-NOT.md) **sem recarga manual**; usa `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md). Alvo de demonstração Android.
- **Degradação graciosa / cold start (RNF-ERR-09):** a **hibernação do Render** derruba a conexão; o cliente trata isso como **reconexão** (com backoff — RNF-ERR-03), não erro, e enquanto desconectado **volta à lista paginada** de [F-NOT](../periodo-1/feature-F-NOT.md) (RF-NOT-02) — nada se perde, pois a notificação está no banco. Ao reconectar, sincroniza as não lidas.

### Frontend Web (`code/front`)

- **Fora de escopo:** notificações não fazem parte do cliente web (§2.1). Registrado no Status e no DoD.

## Critérios de aceite

- [ ] Uma notificação recém-criada aparece no cliente **sem recarga manual**, empurrada pelo canal de tempo real (RF-NOT-06), com a contagem de não lidas atualizada.
- [ ] O canal só entrega ao **dono autenticado** (SEC-01/02); token inválido não conecta.
- [ ] Token expirado encerra o canal; o app renova e reconecta sem expor credencial em URL/log.
- [ ] A queda da conexão (cold start/hibernação) é tratada como **reconexão com backoff** (RNF-ERR-09/03), com **fallback** para a lista paginada de [F-NOT](../periodo-1/feature-F-NOT.md); nenhuma notificação se perde.
- [ ] Ao reconectar, o cliente **sincroniza** as não lidas (sem duplicar as já exibidas).
- [x] A escolha de transporte (WS × SSE) está fixada e registrada.
- [ ] A entrega em tempo real funciona no app **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `social`, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes automatizados: autenticação/autorização, expiração do token, destinatário correto e não lidas; mobile: renovação, reconexão, fallback e sincronização sem duplicar (RNF-TST-02, RNF-TST-04 e RNF-TST-06)
- [ ] **Spec OpenAPI de `social`** — o endpoint de tempo real (handshake/rota do canal) documentado em `docs/api/social.yaml` no que for expressável; o protocolo do canal (WS/SSE) descrito junto
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)) — **web N/A** (notificações fora do escopo web, §2.1); justificativa registrada aqui em vez de remover o item
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** validar em DES que o **WebSocket/SSE funciona no plano gratuito do Render** com a hibernação (reconexão após cold start) — a viabilidade do transporte em free tier é o risco técnico desta feature.

## Pendências

- **Telas (design P2):** tempo real, badge e reconexão silenciosa na edição consolidada [`notificacoes.md`](../../design/periodo-2/notificacoes/notificacoes.md) ([protótipo](../../design/periodo-2/notificacoes/prototipos/notificacoes.html)) (só mobile), prompt escrito e protótipo exportado em 29/09/2026. A ratificar: aviso `N novas notificações` só com a lista rolada e sem sumir por tempo; nenhum banner em outras telas. Contratos a confirmar: contagem de novas na sincronização da reconexão; formato do tempo relativo (`agora`).
- **Depende de** [F-NOT](../periodo-1/feature-F-NOT.md) (criação de notificação e lista/fallback), [F-AUT](../periodo-1/feature-F-AUT.md) (autenticação do canal), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md).
- **Decisão de transporte: SSE (fixada em 03/10/2026).** O fluxo é só servidor → cliente; `SseEmitter` já vem no `spring-boot-starter-webmvc`; o token vai em `Authorization: Bearer` e passa pela mesma cadeia JWT das outras rotas (nada em URL); o Flutter consome com o pacote `http` já presente. Heartbeat (comentário SSE) a cada 25 s contra corte por ociosidade do proxy; ao parar o serviço os canais são encerrados antes do shutdown gracioso para não segurar o deploy.
- **Backplane:** desnecessário em instância única; se o serviço escalar, o fan-out às conexões exige um pub/sub — registrado como consideração, não implementado.
- **Sem evento/tipo novo:** não estende o mapa de mensageria — sem divergência de baseline; a entrega é transporte sobre a notificação já criada por [F-NOT](../periodo-1/feature-F-NOT.md).
- **Push FCM** (RF-NOT-07) e **preferências** (RF-NOT-05) permanecem no Período 3.
- Stack de `social` definida: **Spring (Java)** (arquitetura §2.1).

## Timeline

### Mobile 03/10/2026: `CanalDeNotificacoes` abre o SSE pelo `ApiClient.abrirFluxo` (token no cabeçalho, renovação em `401`) enquanto o shell está montado e o app em primeiro plano; queda, cold start e expiração reconectam com backoff exponencial de 1 s a 30 s mais jitter, sem nada na tela, e sessão que não renova encerra o canal. O badge segue o total de cada evento; na tela, a notificação nova entra no topo com a animação de chegada, ou espera no aviso `N novas notificações` se a lista está rolada (a lista não se move); a reconexão recarrega a primeira página e mescla por id. **Divergência registrada:** a linha `N não lidas` continua fixa acima da lista, como no Período 1 (o protótipo P2 a faz rolar junto); para a lista não pular, ela só surge por notificação já na lista, e as que esperam no aviso entram só no número. Falta a validação em DES.

### Backend 03/10/2026: transporte fixado em **SSE**. `social` ganhou `GET /notificacoes/tempo-real`: abre com `sincronizacao` (total de não lidas), empurra `notificacao` (mesmo formato da lista + total) depois do commit da gravação, só ao destinatário, sem reentregar duplicata; o canal termina na expiração do JWT e no shutdown. Spec em `docs/api/social.yaml`; testes de integração cobrem 401, dono, duplicata e expiração. Mobile e validação em DES pendentes.

### Revisão 01/09/2026: SSE registrado como alternativa preferencial a avaliar, sem antecipar a decisão técnica de transporte.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-NOT-2 no [periodo-2/README.md](README.md) e de RF-NOT-06 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.10. Entrega em tempo real fixada como camada de transporte sobre a notificação de F-NOT (sem evento novo), com fallback à lista e reconexão no cold start; escolha WS × SSE e viabilidade no Render registradas como pendências.

### Revisão 29/08/2026: o canal foi alinhado ao token curto de F-AUT: encerra na expiração e reutiliza refresh/reconexão do cliente, sem token em URL e sem sessão paralela. Backplane continua fora do escopo de instância única.

### Dono 29/09/2026: feature atribuída a **Kayke** na [divisão do Período 2](README.md#divisão-do-período-2-entre-5-pessoas).
