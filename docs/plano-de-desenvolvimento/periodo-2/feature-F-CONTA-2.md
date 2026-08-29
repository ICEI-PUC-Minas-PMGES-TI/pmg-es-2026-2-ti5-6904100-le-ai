# F-CONTA-2 — Exclusão de conta

**Período:** 2 · **Prioridade:** desejavel
**Dono:** a definir · **Serviços afetados:** `identidade` (dono) + `leitura` + `social` + `acervo` (consumidores) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.1 (RF-AUT-07) e §8 (Privacidade e LGPD). Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §4.2, §5.2, §7. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Permitir que o leitor **exclua a própria conta e seus dados pessoais**, fechando o compromisso de LGPD do produto. Continua [F-AUT](../periodo-1/feature-F-AUT.md), que deixou a exclusão explicitamente para cá. Fecha o requisito **Desejável**:

- **RF-AUT-07** o leitor deve poder excluir a própria conta e seus dados pessoais.

RNF atendidos: **RNF-SEC-41** (excluir a conta com **remoção ou anonimização** dos dados pessoais), **RNF-SEC-40** (mínimo de dados coletados — a exclusão fecha o ciclo de retenção), **RNF-SEC-42** (a política de privacidade informa retenção e exclusão), **RNF-SEC-44** (sem descoberta aberta de perfis, preservada após a saída), **RNF-USA-04** (ação destrutiva exige confirmação), **RNF-ERR-06/07** (consumidores idempotentes + DLQ no fan-out), **RNF-SEC-35** (registrar a operação sensível em log, sem dado pessoal excedente — SEC-36).

> **Tensão de prioridade (baseline).** RF-AUT-07 está classificado **Desejável** e alocado ao Período 2, mas **RNF-SEC-41 pertence ao conjunto de segurança declarado Essencial** (§8). [F-AUT](../periodo-1/feature-F-AUT.md) já registrou que **não** marca RNF-SEC-41 como atendido enquanto o grupo não resolver o agendamento pelo controle de mudança (plano §3). Esta feature **implementa** a capacidade — e, entregue, é o que satisfaz RNF-SEC-41 —, mas **não reclassifica** prioridade nem antecipa a decisão de baseline.

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | fluxo/evento de exclusão; consumidores de limpeza em `leitura`/`social`/`acervo` |
| Backend | não iniciado | `identidade`: endpoint de exclusão com reautenticação + fan-out; consumidores nos demais serviços |
| Web | não iniciado | tela de exclusão de conta (confirmação + reautenticação) nas configurações |
| Mobile | não iniciado | mesma tela + limpeza da sessão/secure storage |

## Especificação

### Backend / API — `identidade` (dono do fluxo)

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas).

- **`DELETE /me/conta`** (RF-AUT-07) — exige `Authorization` **e reautenticação por senha atual** na primeira execução, confirmação explícita no cliente (RNF-USA-04) e `Idempotency-Key`. Registra uma solicitação técnica `exclusao_conta` sem conteúdo pessoal excedente e responde `202`; repetição da mesma chave pelo mesmo subject autenticado consulta esse recibo antes de exigir nova senha, enquanto o token curto ainda for válido. Em sucesso:
  1. **Invalida todos os refresh tokens** do usuário (logout global — reaproveita a invalidação de [F-AUT](../periodo-1/feature-F-AUT.md), SEC-30);
  2. Marca a conta para exclusão e remove/anonimiza em `identidade`: `usuario`, `seguidor` (nos dois sentidos), `solicitacao_seguir`, `refresh_token`, `reset_token` e avatar no Cloudinary;
  3. Publica o **fato de exclusão** para os demais serviços limparem os dados do usuário (fan-out — ver abaixo).
  - O recibo técnico tem retenção curta definida na política e existe apenas para tornar retentativa segura; não preserva e-mail, username, senha ou conteúdo. A operação é auditada (SEC-35/36).

### Fan-out de limpeza (cross-schema)

A exclusão atravessa os quatro schemas, e **nenhum serviço lê/escreve tabela de outro** (arquitetura §4.2). O mecanismo pretendido é um **evento de exclusão** (`conta.excluida`) consumido por cada serviço, que remove/anonimiza o que é seu:

| Serviço | Dados do usuário | Ação |
|---|---|---|
| `leitura` | estante/favoritos, leituras, progresso, notas, resenhas, reações, frases, desafios, estatísticas e streak | remover dados privados; resenha referenciada por terceiros segue a política de anonimização decidida |
| `social` | atividades, comentários, curtidas, notificações, listas, recomendações e denúncias | remover dados privados; comentários referenciados e registros obrigatórios de auditoria são anonimizados conforme a política |
| `acervo` | livros pessoais e respectivas capas no Cloudinary | remover livro/asset pessoal; livro oficial não é afetado |

Cada consumidor é **idempotente** (RNF-ERR-06) e com **DLQ** (RNF-ERR-07); a mensagem é validada por schema (SEC-32). Payload versionado com `usuarioId`, `eventId`, `occurredAt`, `correlationId` e chave de negócio `usuarioId`.

**Política conteúdo-de-terceiros:** conteúdo do usuário que **outros já viram ou referenciaram** (resenha que recebeu curtidas, comentário que recebeu respostas) é **anonimizado** — autor substituído por "usuário removido" — para preservar a integridade dos feeds e threads alheios; dados **estritamente pessoais** (e-mail, sessão, progresso, estante, avatar) são **removidos**. A escolha exata é decisão do grupo (ver Pendências).

### Frontend Web (`code/front`)

- **Tela de exclusão de conta** nas configurações: aviso claro do efeito, **reautenticação por senha** e **confirmação explícita** (RNF-USA-04); ao concluir, limpa a sessão local e leva ao estado deslogado. Usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md). A política de privacidade referenciada (SEC-42) descreve o que é removido e o que é anonimizado.

### App Flutter (`code/mobile`)

- Mesma tela com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); ao concluir, limpa **secure storage** (refresh) e sessão. Alvo de demonstração Android.

## Critérios de aceite

- [ ] A primeira chamada exige senha + confirmação e responde `202`; retentativa autenticada com a mesma chave devolve o recibo sem repetir efeitos (RNF-USA-04, RNF-ERR-04).
- [ ] Concluída a exclusão, **todos os refresh tokens** são invalidados (logout global) e a identidade em `identidade` é removida/anonimizada.
- [ ] O fato de exclusão dispara a limpeza em `leitura`, `social` e `acervo`; consumidores são **idempotentes** e usam **DLQ** (RNF-ERR-06/07).
- [ ] Dados estritamente pessoais são **removidos**; conteúdo visível a terceiros é **anonimizado**, sem quebrar feeds/threads alheios (RNF-SEC-41).
- [ ] A operação é registrada em log de auditoria (SEC-35) **sem** dado pessoal excedente (SEC-36).
- [ ] A política de privacidade informa retenção e exclusão (SEC-42).
- [ ] O fluxo de exclusão funciona **em DES** ponta a ponta (identidade → limpeza nos demais serviços).

## Definition of Done

(plano §10)

- [ ] Código (backend `identidade` + consumidores em `leitura`/`social`/`acervo`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: reautenticação inicial, retry após invalidação de refresh, recibo sem PII, inventário completo por schema e invalidação de sessão (RNF-TST-02)
- [ ] Testes assíncronos do fan-out: publicação, consumo idempotente, entrega duplicada e DLQ em cada serviço consumidor (RNF-TST-03)
- [ ] Testes web/mobile cobrem confirmação, reautenticação, limpeza de sessão/secure storage e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `identidade` atualizado em `docs/api/identidade.yaml`** com a exclusão de conta; consumidores documentam o schema do evento
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** documentar exatamente o que é removido/anonimizado por schema e a retenção curta do recibo idempotente — sem criar armazenamento histórico de dados pessoais.

## Pendências

- **Depende de** [F-AUT](../periodo-1/feature-F-AUT.md) (sessão, invalidação de refresh, modelo `usuario`), [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (grafo de seguidores a limpar) e das features que detêm dados do usuário nos demais serviços ([F-EST](../periodo-1/feature-F-EST.md)/[F-PRG](../periodo-1/feature-F-PRG.md)/[F-AVA](../periodo-1/feature-F-AVA.md)/[F-EST-2](feature-F-EST-2.md), [F-FEED](../periodo-1/feature-F-FEED.md)/[F-NOT](../periodo-1/feature-F-NOT.md), [F-ACV-CADASTRO](../periodo-1/feature-F-ACV-CADASTRO.md)); [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md) (broker do fan-out).
- **Divergência de baseline — prioridade:** RF-AUT-07 é Desejável (P2), mas RNF-SEC-41 é Essencial (§8). O grupo deve resolver o agendamento pelo controle de mudança (plano §3); esta feature não altera a baseline.
- **Divergência de baseline — evento de fan-out:** `conta.excluida` **não consta** entre os seis fluxos assíncronos fechados de `REQUISITOS.md` §7.2/arquitetura §5.2. Aprovar sua inclusão nos documentos-mestre **ou** definir uma **orquestração síncrona** de limpeza antes de implementar (mesmo tratamento das divergências de `leitura.*`).
- **Decisão de política:** o critério exato **anonimizar vs. remover** para cada tipo de conteúdo visível a terceiros (resenha, comentário) é decisão do grupo; registrar antes de implementar.
- Stack de cada serviço ainda pendente (P0-INFRA).

## Timeline

### Criação 28/08/2026: arquivo criado a partir do escopo de F-CONTA-2 no [periodo-2/README.md](README.md), de RF-AUT-07 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.1 e dos RNF de LGPD §8. Fan-out de limpeza cross-schema descrito como contrato pretendido; tensão RNF-SEC-41 × RF-AUT-07, evento fora dos fluxos fechados e política anonimizar-vs-remover registrados como pendências de baseline, sem reclassificação autônoma.

### Revisão 29/08/2026: inventário de limpeza passou a incluir os dados criados no Período 2 e corrigiu o ownership de avatar/capas. A idempotência foi definida por recibo técnico curto e resposta `202`, sem exigir reautenticação impossível depois da exclusão nem introduzir orquestração adicional.
