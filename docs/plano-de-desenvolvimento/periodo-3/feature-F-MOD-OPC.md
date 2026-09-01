# F-MOD-OPC — Suspensão de conta

**Período:** 3 · **Prioridade:** opcional
**Dono:** a definir · **Serviços afetados:** `social` (painel e auditoria) + `identidade` (efeito na conta) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.11 (RF-MOD-04, com RF-MOD-05 de auditoria), §4 (ator Administrador). Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §4.2, §7. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Dar à moderação a única sanção que atinge o **autor**, e não apenas o conteúdo: remover uma resenha resolve um caso, suspender resolve um padrão. Fecha o requisito **Opcional**:

- **RF-MOD-04** o administrador **suspende** a conta de um leitor.

A suspensão fecha a escada de moderação de [F-MOD](../periodo-2/feature-F-MOD.md): arquivar → remover conteúdo → **suspender a conta**. É a mesma fronteira cross-service já enfrentada lá — o painel vive em `social`, o efeito vive em `identidade` —, resolvida pelo **mesmo padrão**: comando autenticado ao serviço dono, que revalida e aplica; `social` não escreve no schema `identidade` (arquitetura §4.2). Toda ação entra no log de auditoria de **RF-MOD-05**, já entregue por F-MOD.

RNF atendidos: **RNF-SEC-04** (operação restrita ao administrador, verificada no servidor), **RNF-SEC-30** (revogação de sessão), **RNF-SEC-35/37** (log de ação de moderação, consultável), **RNF-SEC-36** (sem dado sensível excedente no log), **RNF-ERR-04** (comando idempotente), **RNF-USA-04** (confirmação em ação destrutiva), **RNF-USA-05** (mensagem pt-BR sem detalhe técnico).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | campo de suspensão em `usuario` (`identidade`); reuso de `log_moderacao` (`social`) |
| Backend | não iniciado | `social`: ação no painel + auditoria; `identidade`: aplicar suspensão e revogar sessões |
| Web | não iniciado | ação de suspender/reativar no painel de moderação (admin) |
| Mobile | não iniciado | **sem painel**; trata a própria sessão suspensa com mensagem e logout |

## Especificação

### Backend / API — `social` (painel e auditoria)

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas).

- **`POST /admin/usuarios/{id}/suspender`** (RF-MOD-04) — **restrito ao administrador, verificado no servidor** (SEC-04; a conta admin é fixa e única, vem de [F-AUT](../periodo-1/feature-F-AUT.md)/RF-AUT-08). Aceita **motivo** para a auditoria. `social` **não** grava em `identidade`: envia o comando autorizado ao serviço dono e só registra a auditoria **após a confirmação**, sem estado local otimista.
- **`POST /admin/usuarios/{id}/reativar`** — operação simétrica, mesmas restrições. **Registro explícito:** RF-MOD-04 pede apenas suspender; a reativação é acrescentada como **extensão mínima** para que a sanção não seja irreversível por acidente do painel. É uma linha de código e uma linha de auditoria; se o grupo preferir manter o escopo literal do RF, é o primeiro item a cortar.
- **Auditoria (RF-MOD-05, SEC-35/37):** suspensão e reativação gravam em `log_moderacao` (admin, alvo, ação, motivo, timestamp), sem dado sensível excedente (SEC-36), consultáveis pelo `GET /admin/moderacao/logs` já existente em [F-MOD](../periodo-2/feature-F-MOD.md).
- **Idempotência:** suspender conta já suspensa (ou reativar conta ativa) responde sucesso sem segunda escrita e **sem** segunda linha de auditoria.
- **Alcance:** a suspensão é a única ação de moderação sobre a **conta**. Não denuncia-se um perfil (RF-MOD-01 cobre só resenhas e comentários) — a suspensão parte da avaliação do admin sobre denúncias de conteúdo já existentes.

### Backend / API — `identidade` (efeito)

- **Aplicar a suspensão:** marca a conta como suspensa e **revoga os refresh tokens ativos** (SEC-30); o access token remanescente expira no seu prazo curto. O comando **revalida a autorização** — conhecer o endpoint interno não basta —, é **idempotente** e devolve confirmação para que `social` audite.
- **Efeito no acesso (RF-MOD-04):** conta suspensa **não autentica** — login e renovação de token são negados com mensagem pt-BR clara, sem detalhe técnico (RNF-USA-05) e sem revelar informação que ajude a enumerar contas. A recuperação de senha não contorna a suspensão.
- **O que a suspensão NÃO faz:** não apaga conteúdo (remoção é o fluxo de [F-MOD](../periodo-2/feature-F-MOD.md)), não exclui a conta (isso é [F-CONTA-2](../periodo-2/feature-F-CONTA-2.md)/RF-AUT-07) e não desfaz seguidores. É bloqueio de acesso, e é reversível pela reativação.
- **Visibilidade do conteúdo de conta suspensa** (resenhas, atividades, listas continuarem ou não à mostra) **não é decidida aqui** — ver Pendências.

**Modelo de dados:** em `identidade`, o campo de suspensão em `usuario`, já previsto no DER como item do Período 3. Em `social`, **nenhuma tabela nova** — reusa `log_moderacao` de [F-MOD](../periodo-2/feature-F-MOD.md).

**Contratos consumidos:** `v_perfil_referencia_v1` (identidade) para exibir o alvo no painel. Nenhuma tabela crua de outro schema é lida (§4.2).

**Eventos:** **nenhum**, se o comando autenticado HTTP interno bastar — coerente com o escopo enxuto do período, que proíbe criar evento só para separar funções. A escolha entre comando síncrono e evento é a pendência de baseline abaixo, e é a mesma já aberta em F-MOD.

### Frontend Web (`code/front`)

- **Ação de suspender/reativar** no painel de moderação, a partir de uma denúncia ou do perfil do leitor, com **confirmação explícita** (RNF-USA-04) e campo de motivo. O estado suspenso é visível no painel e no log. Guarda de rota **não substitui** a verificação server-side. Usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md).

### App Flutter (`code/mobile`)

- **Não expõe painel** de moderação (é web, como em [F-MOD](../periodo-2/feature-F-MOD.md)). O que o mobile faz é **tratar a própria sessão suspensa**: negação do servidor na renovação ou em qualquer chamada autenticada leva a mensagem pt-BR clara e **logout**, sem estado inconsistente nem loop de retentativa. `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md). Alvo de demonstração Android.

## Critérios de aceite

- [ ] Suspender e reativar são **restritos ao administrador**, verificados no servidor; não-admin recebe negação (RF-MOD-04, SEC-01/04).
- [ ] `social` **não escreve** no schema `identidade`: o efeito ocorre por comando autorizado ao serviço dono, que **revalida** (§4.2).
- [ ] Conta suspensa **não autentica** e tem os refresh tokens **revogados**; a sessão ativa cai ao expirar o access token (SEC-30).
- [ ] Suspensão **não apaga** conteúdo nem exclui a conta; reativar restaura o acesso.
- [ ] Suspender conta já suspensa é **idempotente** e não gera segunda linha de auditoria (RNF-ERR-04).
- [ ] Toda suspensão/reativação aparece no `GET /admin/moderacao/logs` com autor, alvo, ação, motivo e timestamp, sem dado sensível excedente (RF-MOD-05, SEC-35/36/37).
- [ ] A ação pede **confirmação** no cliente antes de executar (RNF-USA-04).
- [ ] Mensagem ao leitor suspenso é pt-BR, clara e sem detalhe técnico, e não permite enumerar contas (RNF-USA-05).
- [ ] O mobile de um leitor suspenso faz **logout** com mensagem, sem loop de retentativa.
- [ ] Suspensão e reativação funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `social` + efeito em `identidade`, web, tratamento no mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: autorização admin, negativa para não-admin, suspensão bloqueando login e renovação, revogação de refresh tokens, idempotência, reativação e registro de auditoria (RNF-TST-02)
- [ ] Teste do comando cross-service cobre autorização, revalidação em `identidade`, repetição idempotente e falha **sem** estado local falso em `social` (RNF-TST-02; RNF-TST-03 se o contrato aprovado for assíncrono)
- [ ] Testes web/mobile: web cobre a ação com confirmação e o log; mobile cobre a sessão suspensa levando a logout; ambos tratam indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Specs OpenAPI**: `docs/api/social.yaml` com as ações de suspensão/reativação do painel; `docs/api/identidade.yaml` com o comando autorizado e o efeito na autenticação
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** fixar com `identidade` **um único contrato** de ação administrativa sobre a conta (autorização, revalidação, retorno idempotente e auditoria em `social`), reaproveitando o mesmo desenho que [F-MOD](../periodo-2/feature-F-MOD.md) fechar para a remoção de resenha — não dois padrões diferentes para o mesmo problema.

## Pendências

- **Depende de** [F-MOD](../periodo-2/feature-F-MOD.md) (painel, log de auditoria e o padrão cross-service), [F-AUT](../periodo-1/feature-F-AUT.md) (conta admin, refresh tokens, logout), [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (`v_perfil_referencia_v1`), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md).
- **Divergência de baseline — comando cross-service:** ação de `social` sobre a conta em `identidade` **não** consta nos fluxos fechados de §7.2, e o `docs/4.modelagem.md` já lista o contrato de suspensão entre as pendências preservadas. Definir comando autenticado e idempotente (sem inventar evento se HTTP interno bastar) e registrar pelo controle de mudança do plano §3 **antes** de implementar. É a mesma pendência aberta em [F-MOD](../periodo-2/feature-F-MOD.md).
- **Pendência aberta — visibilidade do conteúdo de conta suspensa:** se resenhas, atividades, listas e o perfil de um leitor suspenso continuam visíveis a terceiros. Ocultar tudo se aproxima de remoção em massa sem denúncia; manter tudo visível pode frustrar o motivo da sanção. Decisão do grupo; esta feature entrega o bloqueio de acesso e não altera visibilidade.
- **Pendência aberta — reativação:** acrescentada como extensão mínima e simétrica, fora da letra de RF-MOD-04. Confirmar com o grupo; é o primeiro item a cortar se o escopo apertar.
- **Compartilha `social`** com as demais features sociais e **`identidade`** com [F-AUT](../periodo-1/feature-F-AUT.md)/[F-CONTA-2](../periodo-2/feature-F-CONTA-2.md) — sinalizar no grupo antes de mexer (plano §6).
- Stack de `social` e de `identidade` ainda pendentes (P0-INFRA).

## Timeline

### Criação 01/09/2026: arquivo criado a partir do escopo de F-MOD-OPC no [periodo-3/README.md](README.md) e de RF-MOD-04 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.11, reusando o padrão cross-service e o log de auditoria de F-MOD. Suspensão fixada como bloqueio de acesso com revogação de sessão, sem remover conteúdo nem excluir conta; reativação incluída como extensão mínima e sinalizada como tal; a escolha entre comando síncrono e evento e a visibilidade do conteúdo de conta suspensa ficaram como pendências do grupo.
