# F-CONTA-2 — Exclusão de conta

**Período:** 2 · **Prioridade:** desejavel
**Dono:** a definir · **Serviços afetados:** `identidade` (dono) + `leitura` + `social` + `acervo` (consumidores) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.1 (RF-AUT-07) e §8 (Privacidade e LGPD). Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §4.2, §5.2, §7. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Permitir que o leitor solicite a exclusão, recupere a conta em até **30 dias** e, vencido o prazo, tenha dados e conteúdos removidos definitivamente. Continua [F-AUT](../periodo-1/feature-F-AUT.md). Fecha o requisito **Desejável**:

- **RF-AUT-07** solicitar exclusão, recuperar em até 30 dias e remover definitivamente dados/conteúdo após o prazo.

RNF atendidos: **RNF-SEC-41** (recuperação em 30 dias + remoção definitiva), **RNF-SEC-40/42/44**, **RNF-USA-04**, **RNF-ERR-06/07/10** e **RNF-SEC-35/36**.

> **Tensão de prioridade (baseline).** RF-AUT-07 está classificado **Desejável** e alocado ao Período 2, mas **RNF-SEC-41 pertence ao conjunto de segurança declarado Essencial** (§8). [F-AUT](../periodo-1/feature-F-AUT.md) já registrou que **não** marca RNF-SEC-41 como atendido enquanto o grupo não resolver o agendamento pelo controle de mudança (plano §3). Esta feature **implementa** a capacidade — e, entregue, é o que satisfaz RNF-SEC-41 —, mas **não reclassifica** prioridade nem antecipa a decisão de baseline.

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | job diário, outbox de `conta.excluida` e consumidores de limpeza |
| Backend | não iniciado | solicitar/cancelar exclusão, login restrito, finalização após 30 dias e fan-out |
| Web | não iniciado | solicitação irreversível após o prazo + tela restrita de recuperação |
| Mobile | não iniciado | mesmas telas + limpeza da sessão/secure storage |

## Especificação

### Backend / API — `identidade` (dono do fluxo)

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas).

- **`DELETE /me/conta`** (RF-AUT-07, RN-23) — exige `Authorization`, **senha atual**, confirmação explícita e `Idempotency-Key`. Registra `exclusao_solicitada_em`, `exclusao_prevista_em = +30 dias` e recibo técnico sem PII; revoga todos os refresh tokens e responde `202` com a data limite. Username/e-mail continuam reservados.
- **Conta pendente:** `v_perfil_referencia_v1` e `v_seguimento_aceito_v1` omitem a conta, ocultando perfil e conteúdo sem remover dados. Login válido emite token curto com escopo exclusivo de recuperação, sem refresh; qualquer outra rota protegida retorna negação.
- **`POST /me/conta/cancelar-exclusao`** — aceita apenas o token restrito, limpa a solicitação, marca o recibo como cancelado e restaura a visibilidade pelas VIEWs. Não publica evento de restauração porque nenhum dado foi apagado.
- **Job diário interno:** processa solicitações vencidas. Na mesma transação, remove identidade, tokens, grafo social e tentativas de login, marca o recibo concluído e grava `conta.excluida` na outbox. Assets e dados dos demais schemas são removidos pelos consumidores.

### Fan-out de limpeza (cross-schema)

A exclusão definitiva atravessa os quatro schemas, e **nenhum serviço lê/escreve tabela de outro**. `conta.excluida` é contrato aprovado e cada serviço remove o que é seu:

| Serviço | Dados do usuário | Ação |
|---|---|---|
| `leitura` | estante/favoritos, leituras, progresso, notas, resenhas, reações, frases, desafios, estatísticas e streak | remover definitivamente; anonimizar ledgers/outbox para retenção técnica |
| `social` | atividades, comentários/respostas, curtidas, notificações, listas, recomendações, denúncias e snapshots | remover definitivamente; reter auditoria/ledgers/outbox somente anonimizados |
| `acervo` | livros pessoais/capas, `nota_leitor_projecao` e importações solicitadas | remover definitivamente; anonimizar ledgers/outbox; livro oficial não é afetado |

Cada consumidor é **idempotente** (RNF-ERR-06) e com **DLQ** (RNF-ERR-07); a mensagem é validada por schema (SEC-32). Payload versionado com `usuarioId`, `eventId`, `occurredAt`, `correlationId` e chave de negócio `usuarioId`.

**Retenção aprovada, incorporada em 15/09/2026:** recibos, ledgers, outboxes e auditoria técnica permanecem por prazo indeterminado **após anonimização**. A limpeza remove referências pessoais, chaves/payloads/respostas/hashes correlacionáveis e texto livre identificável; UUID opaco não basta. Dados de domínio, denúncias e conteúdo da conta continuam sendo removidos após os 30 dias. Expiração de tokens e prazo operacional de replay não mudam: `replay_ate` limita reutilização da resposta, não a retenção do registro anônimo. Outbox pendente é tratada sem perder o evento de limpeza nem republicar conteúdo excluído; publicar/confirmar a limpeza e então anonimizar seu envelope. A matriz final por tabela é item obrigatório antes das migrations.

### Frontend Web (`code/front`)

- **Tela de exclusão:** informa os 30 dias, a ocultação imediata e a remoção definitiva; exige senha e modal destrutivo. Depois da solicitação, limpa a sessão normal. Novo login abre somente a tela de recuperação com data limite e ação `Cancelar exclusão`.

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData`; ao solicitar, limpa **secure storage** e sessão normal. Alvo de demonstração Android.

## Critérios de aceite

- [ ] Solicitar exige senha + modal, responde `202` com prazo de 30 dias, revoga refresh tokens e oculta conta/conteúdo sem apagar dados.
- [ ] Login de conta pendente oferece somente cancelar exclusão; cancelamento dentro do prazo restaura visibilidade sem perda de dados.
- [ ] O job finaliza apenas solicitações vencidas e grava `conta.excluida` atomicamente na outbox.
- [ ] `conta.excluida` remove definitivamente dados e conteúdo em `leitura`, `social` e `acervo`; consumidores são idempotentes e usam DLQ.
- [ ] A operação é registrada em log de auditoria (SEC-35) **sem** dado pessoal excedente (SEC-36).
- [ ] A política de privacidade informa retenção e exclusão (SEC-42).
- [ ] O fluxo de exclusão funciona **em DES** ponta a ponta (identidade → limpeza nos demais serviços).

## Definition of Done

(plano §10)

- [ ] Código (backend `identidade` + consumidores em `leitura`/`social`/`acervo`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração: prazo, ocultação, login restrito, cancelamento, username/e-mail reservados, job vencido, recibo sem PII, inventário por schema e invalidação de sessão
- [ ] Testes assíncronos do fan-out: publicação, consumo idempotente, entrega duplicada e DLQ em cada serviço consumidor (RNF-TST-03)
- [ ] Testes web/mobile cobrem confirmação, login restrito, cancelamento, limpeza de sessão/secure storage e indisponibilidade/timeout (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `identidade` atualizado** com solicitar/cancelar exclusão e endpoint interno do job; schema de `conta.excluida` documentado
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** documentar a matriz de remoção/anonimização, incluindo `anonimizado_em`, FKs opcionais de auditoria e saneamento de eventos pendentes; testar retenção indeterminada sem PII nem conteúdo da conta.

## Pendências

- **Depende de** [F-AUT](../periodo-1/feature-F-AUT.md) (sessão, invalidação de refresh, modelo `usuario`), [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (grafo de seguidores a limpar) e das features que detêm dados do usuário nos demais serviços ([F-EST](../periodo-1/feature-F-EST.md)/[F-PRG](../periodo-1/feature-F-PRG.md)/[F-AVA](../periodo-1/feature-F-AVA.md)/[F-EST-2](feature-F-EST-2.md), [F-FEED](../periodo-1/feature-F-FEED.md)/[F-NOT](../periodo-1/feature-F-NOT.md), [F-ACV-CADASTRO](../periodo-1/feature-F-ACV-CADASTRO.md)); [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md) (broker do fan-out).
- **Divergência de baseline — prioridade:** RF-AUT-07 é Desejável (P2), mas RNF-SEC-41 é Essencial (§8). O grupo deve resolver o agendamento pelo controle de mudança (plano §3); esta feature não altera a baseline.
- **Depende também de** F-AVA-2, F-DSF, F-STA, F-GAM, F-LST, F-REC-P2P e F-MOD para fechar o inventário dos dados criados no Período 2.
- **Alternativa a avaliar, sem mudar o desenho atual:** verificar se o recibo `exclusao_conta` pode reutilizar a infraestrutura do ledger idempotente sem perder o estado dos 30 dias.
- Stack de cada serviço definida (arquitetura §2.1): `identidade`/`social` em Spring, `acervo`/`leitura` em NestJS.

## Timeline

### Revisão 15/09/2026: grupo aprovou retenção técnica/auditoria sem prazo, exclusivamente anonimizada; mantidos os 30 dias e a remoção de conteúdo/dados pessoais. DER e critérios de limpeza ajustados; implementação não iniciada.

### Revisão 01/09/2026: janela de recuperação fixada em 30 dias, login restrito e cancelamento definidos; remoção passou a ocorrer somente após o prazo, por job + `conta.excluida` em outbox, com limpeza física nos quatro schemas.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-CONTA-2 no [periodo-2/README.md](README.md), de RF-AUT-07 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.1 e dos RNF de LGPD §8. Fan-out de limpeza cross-schema descrito como contrato pretendido; tensão RNF-SEC-41 × RF-AUT-07, evento fora dos fluxos fechados e política anonimizar-vs-remover registrados como pendências de baseline, sem reclassificação autônoma.

### Revisão 29/08/2026: inventário de limpeza passou a incluir os dados criados no Período 2 e corrigiu o ownership de avatar/capas. A idempotência foi definida por recibo técnico curto e resposta `202`, sem exigir reautenticação impossível depois da exclusão nem introduzir orquestração adicional.
