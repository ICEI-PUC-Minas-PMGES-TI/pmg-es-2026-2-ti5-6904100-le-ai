# F-SOCIAL-2 — Comentários (edição) e menções-link

**Período:** 2 · **Prioridade:** desejavel
**Dono:** a definir · **Serviços afetados:** `social` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.9 (RF-SOC-13, 15), RN-10, RN-08. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §4.2, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Completar as **interações de comentário** que [F-FEED](../periodo-1/feature-F-FEED.md) deixou explicitamente para o Período 2: a **edição/exclusão** dos próprios comentários e a **resolução de menções `@username`** para link de perfil. Fecha os requisitos **Desejáveis**:

- **RF-SOC-13** o leitor deve poder **editar e excluir** seus comentários;
- **RF-SOC-15** menções `@username` devem ser **resolvidas para o perfil correspondente e exibidas como link**, quando o username existir.

RNF atendidos: **RNF-SEC-02** (propriedade do comentário no servidor), **RNF-SEC-03** (conteúdo protegido do perfil revalidado sob RN-08), **RNF-SEC-14** (conteúdo tratado como texto, escape na web), **RNF-SEC-18** (rate limiting em menção), **RNF-USA-04** (confirmação na exclusão), **RNF-ERR-06/07** (produção e consumo idempotentes com DLQ).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | associação de menções; publisher e mapeamento consumidor de `usuario.mencionado` |
| Backend | não iniciado | `social`: editar/excluir comentário, resolver menções, publicar evento e gerar notificação |
| Web | não iniciado | editar/excluir comentário; menção renderizada como link (sob RN-08) |
| Mobile | não iniciado | mesmas telas |

## Especificação

### Backend / API — `social`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Conteúdo do usuário tratado como texto (escape — SEC-14). Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas).

- **`PATCH /comentarios/{id}`** (RF-SOC-13) — edita o **próprio** comentário (owner-only, SEC-02); mantém o mesmo nível de aninhamento (RN-10). A edição **reprocessa as menções** do texto (ver resolução abaixo). Só o autor edita.
- **`DELETE /comentarios/{id}`** (RF-SOC-13) — exclui fisicamente o **próprio** comentário após modal irreversível. Excluir raiz remove fisicamente suas respostas por `ON DELETE CASCADE` (RN-10.5); não há estado de comentário excluído.
- **Resolução de menção (RF-SOC-15, RN-10):** ao criar/editar comentário, o servidor resolve cada **`@username` livremente digitado** no texto: se o username **existir** (via `v_perfil_referencia_v1`), a menção vira um **link para o perfil**; caso contrário, **permanece texto comum** (RN-10.1). O link sempre pode abrir a identidade pública definida por RN-08 (nome, avatar e biografia); estante, leituras, listas, estatísticas, resenhas e notas continuam restritas no serviço dono. Menção sujeita a **rate limiting** (SEC-18, RN-10.3), impedindo notificação em massa de quem não segue o autor.
- **Evento produzido e consumido:** **`usuario.mencionado`** (§7.2, fluxo de notificação fechado). Payload versionado com `destinatarioId` (mencionado), autor, comentário, `eventId`, `occurredAt`, `correlationId` e chave semântica `(comentarioId, mencionadoId)`. F-SOCIAL-2 publica após a escrita e acrescenta ao consumidor de [F-NOT](../periodo-1/feature-F-NOT.md) o mapeamento que grava a notificação, com validação de schema, idempotência e DLQ.
- **Sem dupla notificação:** [F-FEED](../periodo-1/feature-F-FEED.md) já publica `comentario.respondido` para o alvo **derivado da resposta**. `usuario.mencionado` cobre **apenas** menções **adicionais/distintas** desse alvo; uma resposta **não** gera os dois eventos para o **mesmo** destinatário (contrato registrado em F-FEED). A resolução dedup ocorre no servidor antes de publicar.
- **Edição sem spam:** o servidor compara o conjunto resolvido antes/depois da edição e só publica para destinatário novo. A chave `(comentarioId, mencionadoId)` impede segundo efeito se uma menção inalterada for reprocessada ou removida e reinserida.

**VIEW consumida** (arquitetura §4.2): `v_perfil_referencia_v1`, de [F-PERFIL](../periodo-1/feature-F-PERFIL.md), para resolver `@username` → identidade pública. Cada serviço revalida RN-08 ao servir seu conteúdo restrito; `social` não lê tabela crua de `identidade`.

**Modelo de dados:** reaproveita `comentario` sem `excluido_em` e adiciona `comentario_mencao` por **ocorrência** (comentário, mencionado, posição; única por comentário+posição). O mesmo usuário pode aparecer várias vezes; publicação de notificação usa destinatários distintos. Não persiste HTML.

### Frontend Web (`code/front`)

- **Editar/excluir** o próprio comentário; exclusão física usa modal irreversível com acento `rubi`. Menções resolvidas abrem a identidade pública do perfil; conteúdo protegido continua sujeito a RN-08.

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md). Alvo de demonstração Android.

## Critérios de aceite

- [ ] Editar/excluir comentário é owner-only; exclusão é física, pede confirmação irreversível e a raiz remove respostas por cascade.
- [ ] `@username` existente vira **link de perfil**; inexistente **permanece texto** (RN-10.1).
- [ ] Link de perfil privado abre nome/avatar/biografia; conteúdo protegido permanece restrito sob RN-08, e a menção notifica normalmente (RN-10.4).
- [ ] Menção sofre **rate limiting** (SEC-18, RN-10.3).
- [ ] `usuario.mencionado` é publicado após a escrita, com destinatário correto; **não** há dupla notificação quando a menção coincide com o alvo de resposta já coberto por `comentario.respondido`.
- [ ] Editar um comentário reprocessa as menções sem renotificar destinatário inalterado.
- [ ] Duas ocorrências do mesmo `@username` são renderizadas nas posições corretas e geram no máximo uma notificação por edição.
- [ ] Edição/exclusão e menção-link funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `social`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: propriedade na edição/exclusão, cascade da raiz, resolução de menção existente/inexistente, dedup contra `comentario.respondido`, idempotência (RNF-TST-02)
- [ ] Testes assíncronos cobrem schema/publicação, consumo, destinatário, duplicação semântica e DLQ de `usuario.mencionado` (RNF-TST-03)
- [ ] Testes web/mobile cobrem edição/exclusão, renderização de menção-link sob RN-08 e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `social` atualizado em `docs/api/social.yaml`** com editar/excluir comentário e o schema de `usuario.mencionado`
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** entregar junto o produtor e o mapeamento consumidor de `usuario.mencionado`, preservando o contrato de F-FEED que impede dupla notificação com `comentario.respondido`.

## Pendências

- **Depende de** [F-FEED](../periodo-1/feature-F-FEED.md) (comentários, `comentario.respondido`, FK cascade preparada), [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (`v_perfil_referencia_v1`), [F-NOT](../periodo-1/feature-F-NOT.md) (base da notificação), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md).
- **Compartilha `social` com [F-FEED](../periodo-1/feature-F-FEED.md)** e demais features sociais — sinalizar no grupo antes de mexer (plano §6).
- `usuario.mencionado` já pertence ao fluxo aprovado de notificações — sem divergência de baseline.
- **Decisão da feature:** fixar limite de caracteres do comentário e regras de posição após edição antes da migration.
- **Alternativa a avaliar, sem mudar o desenho atual:** persistir apenas o conjunto de mencionados e resolver posições no cliente; a implementação prevista mantém cada posição por decisão do grupo.
- Stack de `social` definida: **Spring (Java)** (arquitetura §2.1).
- **Telas (design P2):** editar e excluir o próprio comentário (`DotsThree`, edição no campo do rodapé com a barra `Editando comentário`, confirmação que avisa que as respostas saem junto) e menção resolvida como link em `musgo` entram na edição consolidada [`comentarios.md`](../../design/periodo-2/comentarios/comentarios.md) ([protótipo](../../design/periodo-2/comentarios/prototipos/comentarios.html)), prompt escrito e protótipo exportado em 29/09/2026. Decisões a ratificar: marcador `· editado`, lista desabilitada durante a edição, cancelar edição sem confirmar, `Ctrl` + `Enter` salva na web, confirmação mobile em sheet empilhado, sem toast depois de editar ou excluir, autor da atividade não remove comentário alheio. **Contratos a confirmar:** `editadoEm` no comentário; quantidade de respostas que saem com a raiz (a copy da confirmação usa o número); se o rate limit de menção recusa o comentário ou só a notificação; renderização de menção a conta oculta depois (suspensa ou com exclusão pendente).

## Timeline

### Revisão 01/09/2026: exclusão física/cascade confirmada; menção passou a ser modelada por ocorrência e posição, permitindo repetição do mesmo usuário com notificação deduplicada.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-SOCIAL-2 no [periodo-2/README.md](README.md), de RF-SOC-13/15 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.9 e da RN-10. Continua a fronteira que [F-FEED](../periodo-1/feature-F-FEED.md) fixou (edição de comentário e menção-link no P2); dedup de notificação entre `comentario.respondido` e `usuario.mencionado` registrado como contrato a fechar.

### Revisão 29/08/2026: identidade pública de perfil privado alinhada a RN-08; menções passaram a ter associação e chave semântica para edição sem spam. A feature passou a entregar também o mapeamento consumidor/DLQ de `usuario.mencionado` em `social`.
