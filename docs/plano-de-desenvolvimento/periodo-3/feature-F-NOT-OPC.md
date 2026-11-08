# F-NOT-OPC — Preferências de notificação + push

**Período:** 3 · **Prioridade:** opcional
**Dono:** Kayke · **Serviços afetados:** `social` (backend) + mobile (sem web — ver Status)

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.10 (RF-NOT-05, 07), §2.1 (escopo web), §10.3, §10.5. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §2.7 (P-04), §4.4, §5.2, §6. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Fechar a camada de notificações: dar ao leitor **controle sobre o que recebe** e entregar a notificação **fora do aplicativo**, em push. Fecha os requisitos **Opcionais**:

- **RF-NOT-05** habilitar/desabilitar **cada tipo de notificação individualmente**;
- **RF-NOT-07** entregar notificações por **push** em dispositivo móvel.

Push é **extensão do fluxo assíncrono já definido**, não remodelagem: a arquitetura §5.2 já registra o consumidor de notificações como "social (+ FCM em Android)", e §2.7 decidiu **FCM em Android, in-app no iOS** (P-04) — push no iOS exigiria conta paga no Apple Developer Program. A demonstração ocorre em **Android**; no iOS o leitor continua recebendo tudo pela lista in-app de [F-NOT](../periodo-1/feature-F-NOT.md). O que é genuinamente novo aqui é o **registro de dispositivo** e o **filtro por tipo**.

RNF atendidos: **RNF-SEC-02** (só o dono lê e altera suas preferências e seus dispositivos), **RNF-SEC-11** (credencial do Firebase por variável de ambiente, nunca versionada), **RNF-SEC-13** (validação por schema da entrada), **RNF-SEC-32** (mensagem validada antes de processar), **RNF-ERR-06/07** (envio idempotente + DLQ), **RNF-ERR-03/08** (timeout, retentativa com backoff e circuit breaker na chamada ao FCM), **RNF-ARQ-06** (fluxo assíncrono), **RNF-USA-05** (mensagens pt-BR sem detalhe técnico).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | parcial | tabelas `preferencia_notificacao`, `dispositivo_push` e `envio_push` (migration `V20261108120000`) aplicadas no banco de dev; **falta** projeto Firebase, `google-services.json` e segredo do FCM em DES |
| Backend | implementado, validação pendente | `social`: preferências, filtro no consumidor, registro/revogação de dispositivo e envio FCM idempotente; testes de integração escritos e compilam, **não rodaram** (sem Postgres de teste) |
| Web | **não aplicável** | notificações estão **fora do escopo web** (`REQUISITOS.md` §2.1) |
| Mobile | implementado, validação pendente | tela de preferências, permissão, registro/refresh/revogação do token e abertura pela notificação; **não testado em Android real** |

## Especificação

### Backend / API — `social`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Só o **dono** lê e altera suas preferências e seus dispositivos (SEC-02). Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas).

**Preferências por tipo (RF-NOT-05)**

- **`GET /me/notificacoes/preferencias`** — devolve todos os tipos disponíveis com seu estado, inclusive os nunca alterados.
- **`PUT /me/notificacoes/preferencias`** — atualiza o conjunto idempotentemente; tipo desconhecido é rejeitado (SEC-13).
- **Onde o filtro age:** no consumidor, antes de gravar a notificação. Tipo desabilitado não gera in-app nem push; evento é reconhecido sem DLQ. Padrão: tudo habilitado. Desabilitar não remove notificações existentes; reabilitar não recupera eventos suprimidos.
- **Granularidade aprovada, incorporada em 15/09/2026:** uma preferência por usuário e tipo de `NOTIFICACAO`, sem agrupamento. Qualquer tipo que passe a gerar notificações também precisa ser configurável.

**Push FCM em Android (RF-NOT-07)**

- **`POST /me/dispositivos-push`** — registra ou renova o token FCM do dispositivo (`plataforma=android`). Token é **único**: reenviar o mesmo token do mesmo usuário atualiza o registro em vez de duplicar; token que migre de conta passa a pertencer à conta atual, para que o aparelho não receba notificação de quem não está logado nele.
- **`DELETE /me/dispositivos-push/{id}`** — revoga o dispositivo. O **logout** de [F-AUT](../periodo-1/feature-F-AUT.md) revoga o token daquele aparelho: sem isso, um aparelho deslogado continuaria recebendo push.
- **Envio:** o mesmo consumidor de F-NOT, depois de gravar a notificação e respeitando a preferência do tipo e a visibilidade atual do conteúdo, envia ao FCM para os dispositivos ativos. Não há novo fluxo de domínio.
- **Idempotência e falhas (RNF-ERR-06/07/03/08):** o envio é idempotente por `(notificacaoId, dispositivo)` — reentrega da mesma mensagem não gera segundo push. Resposta de token inválido/não registrado **marca o dispositivo como inativo** e **não** é tratada como falha reprocessável. Indisponibilidade do FCM usa timeout, retentativa com backoff e circuit breaker; esgotadas as tentativas, vai para **DLQ** sem travar a fila e **sem** desfazer a notificação in-app já gravada — a lista in-app é a garantia, o push é a conveniência.
- **Conteúdo do push:** título e corpo curtos em pt-BR, sem dado sensível (SEC-36), mais a referência do item para abrir a tela correta. O push **não** substitui a leitura autenticada: ao abrir, o cliente busca o dado no servidor.
- **iOS:** nenhum envio. O leitor recebe tudo pela lista in-app (RF-NOT-02), conforme P-04.

**Modelo de dados** (schema `social`): `preferencia_notificacao` (usuário + tipo de notificação como chave, habilitada) e `dispositivo_push` (usuário, token FCM único, plataforma android, ativo, timestamps, revogado em). Ambas são P3; preferências reutilizam o domínio de tipos de `notificacao`.

**Eventos:** **nenhum evento novo**. A feature acrescenta um efeito de saída ao consumidor existente.

### App Flutter (`code/mobile`)

- **Tela de preferências de notificação** com um controle por tipo, usando `ThemeData` de P0-DS.
- **Push:** integração com `firebase_messaging` (§10.5); solicitação da **permissão de notificação** (obrigatória a partir do Android 13) com recusa tratada sem quebrar o app — sem permissão, o leitor segue com a lista in-app; **registro e refresh** do token no servidor; **revogação no logout**; ao tocar na notificação, o app abre o item correspondente. Alvo de demonstração **Android**.
- Cliente HTTP com timeout e retentativa só em operações idempotentes, conforme as regras compartilhadas.

### Frontend Web (`code/front`)

- **Fora de escopo:** notificações não fazem parte do cliente web (`REQUISITOS.md` §2.1), como já registrado em [F-NOT](../periodo-1/feature-F-NOT.md). Registrado no Status e no DoD.

## Critérios de aceite

- [ ] GET/PUT cobrem cada tipo individualmente; tipo desconhecido é rejeitado; só o dono acessa/edita suas preferências.
- [ ] Tipo desabilitado não gera in-app nem push; evento é reconhecido sem DLQ e o histórico anterior permanece intacto.
- [ ] Registrar o mesmo token duas vezes **não duplica** dispositivo; token que muda de conta passa a pertencer à conta atual.
- [ ] O **logout revoga** o token daquele aparelho, que deixa de receber push.
- [ ] Notificação gravada gera **um** push por dispositivo ativo; reentrega do mesmo evento **não** gera segundo push (RNF-ERR-06).
- [ ] Token inválido/não registrado **inativa** o dispositivo e não é reprocessado; indisponibilidade do FCM usa backoff e termina em **DLQ** sem travar a fila (RNF-ERR-03/07/08).
- [ ] Falha no push **não** impede nem desfaz a notificação in-app.
- [ ] O push não carrega dado sensível e, ao ser tocado, leva à tela correta com busca autenticada (SEC-36).
- [ ] Recusar a permissão de notificação no Android mantém o aplicativo funcional, com a lista in-app.
- [ ] Push **não** é enviado a iOS (P-04); o leitor iOS recebe pela lista in-app.
- [ ] Preferências e push funcionam **em DES**, com push demonstrado em **dispositivo Android real**.

## Definition of Done

(plano §10)

- [ ] Código (backend `social`, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: leitura/escrita de preferências, filtro por tipo antes da gravação, propriedade, registro/renovação/revogação de token, unicidade do token e idempotência HTTP (RNF-TST-02)
- [ ] Testes assíncronos: envio por dispositivo ativo, duplicação por `eventId` sem segundo push, token inválido inativando o dispositivo, indisponibilidade do FCM com backoff e DLQ, e notificação in-app preservada quando o push falha (RNF-TST-03)
- [ ] Testes mobile cobrem preferências, permissão concedida e recusada, registro/revogação de token, abertura pela notificação e indisponibilidade/timeout com API simulada (RNF-TST-04/06)
- [x] **Spec OpenAPI de `social` atualizado em `docs/api/social.yaml`** com preferências e registro de dispositivo push
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)) — **web N/A** (notificações fora do escopo web, §2.1); justificativa registrada aqui em vez de remover o item
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver (ver Pendências)

**Item próprio:** manter o catálogo de tipos configuráveis alinhado aos tipos gerados e documentar o comportamento de push e token inválido.

## Pendências

- **Telas (design P3):** lote 1, prompt escrito em 11/10/2026: [`preferencias-de-notificacao.md`](../../design/periodo-3/F-NOT-OPC/preferencias-de-notificacao.md) ([protótipo](../../design/periodo-3/F-NOT-OPC/prototipos/preferencias-de-notificacao.html)) (só mobile, um switch por tipo, aviso de notificações desligadas no aparelho). Entrada pelo item `Notificações` em `Configurações`, no grupo `Conta`, abaixo de `Alterar senha`, na edição consolidada [`configuracoes.md`](../../design/periodo-3/configuracoes/configuracoes.md) ([protótipo](../../design/periodo-3/configuracoes/prototipos/configuracoes.html)) (lote 2, prompt escrito em 11/10/2026). Protótipos exportados em 21/10/2026.
- **Depende de** [F-NOT](../periodo-1/feature-F-NOT.md) (lista, consumidor e tipos), [F-AUT](../periodo-1/feature-F-AUT.md) (logout revogando o dispositivo), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md), [P0-MSG](../periodo-0/feature-P0-MSG.md).
- **Decisão encerrada em 15/09/2026:** preferência individual por tipo, sem mapa de categorias. Implementar o contrato e validar todos os tipos presentes.
- **Validações do período-0 que esta feature consome:** emissão de **push FCM em dispositivo Android real** e o **projeto Firebase** com a credencial em variável de ambiente/GitHub Secrets (arquitetura §8, SEC-11). Firebase é usado **somente** para FCM — nenhum dado de domínio no Firestore (§4.4).
- **Fronteira:** o transporte **em tempo real** in-app é [F-NOT-2](../periodo-2/feature-F-NOT-2.md) (Período 2), não esta feature; as duas coexistem — tempo real dentro do app, push fora dele.
- **Consumidora direta:** [F-GAM-OPC](feature-F-GAM-OPC.md) depende deste push para que o lembrete de sequência tenha função (§5.12) — ordenar as duas features na sprint.
- **Compartilha `social`** com as demais features sociais — sinalizar no grupo (plano §6). Preferências e dispositivos são limpos por [F-CONTA-2](../periodo-2/feature-F-CONTA-2.md) na exclusão de conta.
- Stack de `social` definida: **Spring (Java)** (arquitetura §2.1).
- **Divergência (decisão do grupo): DLQ do push.** A spec manda o envio indisponível terminar em DLQ. O push roda depois do commit, fora da fila AMQP, então não há DLQ aplicável: esgotadas as 3 tentativas (backoff 0,5 s e 1 s) ou com o circuito aberto (30 s), o push daquela notificação **se perde** e só há log estruturado; a lista in-app é a garantia. Reenvio de verdade (varredura de notificações sem `envio_push`) não foi implementado.
- **Saída forçada não revoga o dispositivo:** refresh recusado, suspensão e exclusão de conta não chamam `DELETE /me/dispositivos-push/{id}` (o token de acesso já é inválido). O aparelho continua registrado para a conta anterior até o próximo login no aparelho reatribuir o token.
- **`INVALID_ARGUMENT` do FCM inativa o dispositivo** (junto de `UNREGISTERED` e `SENDER_ID_MISMATCH`), para token lixo não abrir o circuit breaker. Um payload malformado nosso inativaria dispositivos; o payload é fixo e pequeno.
- **Limite de 10 dispositivos ativos por usuário:** ao passar disso, o mais antigo é inativado. `POST /me/dispositivos-push` entra no rate limit por IP (60/min compartilhado com as interações).
- **Conteúdo na tela de bloqueio:** o corpo do push traz o nome do ator e o título do livro; `LEITURA_EM_RISCO` e `LEITURA_EXPIRADA` revelam hábito de leitura e o `AndroidConfig` não define visibilidade privada. O grupo decide se aceita ou se passa a corpo genérico por tipo (SEC-36).
- **Bug anterior no `common` do `social`, não corrigido:** JSON malformado ou com tipo errado (ex.: `habilitada: "abc"`) cai no handler `Throwable` e provavelmente responde 500 em vez de 400; vale para todos os endpoints.
- **Push real depende de:** projeto Firebase (só FCM), `google-services.json` em `code/mobile/android/app/` (fora do git; decidir como o CI o recebe), `applicationId` definitivo (hoje `com.example.le_ai_mobile`) e `FIREBASE_CREDENTIALS_JSON` em DES. Sem a credencial, o backend sobe com o envio desativado.
- **Divergências protótipo × implementação (mobile):** o ícone `ArrowSquareOut` do aviso de push negado fica à esquerda do texto (o `BotaoTextual` só aceita ícone à esquerda); o rótulo acessível da seta de voltar é "Voltar" (rótulo fixo do `CabecalhoTela`); o toque durante o salvamento de uma linha é ignorado; o título do push é "Lê Aí".
- **Componentes novos a incorporar ao `documento-de-design.md`** (pelo controle de mudança do grupo): switch, linha de preferência, aviso de permissão negada e ícones `BellSlash` e `ArrowSquareOut`.
- **Documentos de outras features/orquestador a atualizar pelo grupo** (este arquivo não os altera): `documento-de-arquitetura.md` §2.7 (linha 148, "FCM ainda não implementado") e §8 (linha 405, push "adiado"); `periodo-3/README.md` e `feature-F-GAM-OPC.md`, que ainda dizem "categoria"; `feature-F-AVA-2.md` e `renato-periodo-2/plano-F-AVA-2.md`, que dizem que o `social` ainda não lê a preferência.
- **Abertura pela notificação:** sem item na primeira página de `GET /notificacoes`, o app abre a lista de notificações. `AberturaPorPush` não tem teste automatizado.

## Timeline

### Implementação 08/11/2026: contrato, preferências, dispositivos e envio FCM no `social`; tela de preferências e push no mobile. Migration `envio_push` (chave `(notificacao, dispositivo)`) aplicada no banco de dev. Revisão independente de backend, mobile e segurança corrigiu: `DELETE` do dispositivo sem `Idempotency-Key` (a revogação no logout nunca funcionava), corridas do logout com registro de token em voo, falha inesperada num dispositivo pulando os demais, janela de entrega a conta errada na migração de token e título "Lê Aí". Pendentes: validação em Postgres e em Android real, e as decisões listadas em Pendências.

### Revisão 15/09/2026: grupo aprovou controle individual por tipo para qualquer notificação. DER e especificação atualizados; implementação permanece não iniciada.

### Criação 01/09/2026: arquivo criado a partir do escopo de F-NOT-OPC no [periodo-3/README.md](README.md), de RF-NOT-05/07 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.10 e das decisões P-04 (§10.5, arquitetura §2.7). Push fixado como saída do consumidor de notificações já existente, sem evento nem fila nova; filtro de categoria posicionado antes da gravação, com padrão habilitado e sem efeito retroativo; o mapa tipo→categoria permaneceu como pendência do grupo, e a garantia de entrega ficou na lista in-app, não no push.
