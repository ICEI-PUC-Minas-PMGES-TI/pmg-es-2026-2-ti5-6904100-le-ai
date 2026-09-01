# F-MOD — Moderação

**Período:** 2 · **Prioridade:** desejavel
**Dono:** a definir · **Serviços afetados:** `social` (backend) + `leitura` (remoção de resenha/frase) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.11 (RF-MOD-01, 02, 03, 05), RN-11, RN-15. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §4.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar a **moderação de conteúdo** — a denúncia pelos leitores e o painel do administrador. Fecha os requisitos **Desejáveis**:

- **RF-MOD-01** **denunciar resenhas e comentários**, com **motivo** e descrição opcional; resenhas de **livros pessoais** são denunciáveis nas mesmas condições (RN-15.4);
- **RF-MOD-02** o administrador visualiza um painel com as **denúncias pendentes**, ordenadas por data;
- **RF-MOD-03** o administrador **remove** o conteúdo denunciado ou **arquiva** a denúncia como improcedente;
- **RF-MOD-05** o sistema registra em **log de auditoria** toda ação de moderação (autor, alvo, ação, timestamp).

RNF atendidos: **RNF-SEC-04** (painel e operações restritos ao **administrador**, no servidor), **RNF-SEC-18** (rate limiting na denúncia), **RNF-SEC-35/37** (log de auditoria de ações de moderação, consultável), **RNF-SEC-36** (sem dado sensível excedente no log), **RNF-DES-02** (painel paginado), **RNF-USA-04** (confirmação na remoção).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | tabelas `denuncia` e `log_moderacao`; comando de remoção cross-service a `leitura` |
| Backend | não iniciado | `social`: denúncia/painel/auditoria; `leitura`: remoção autorizada de resenha/frase |
| Web | não iniciado | denunciar (leitor) + painel de moderação (admin) |
| Mobile | não iniciado | denunciar resenha/comentário (o painel admin é web) |

## Especificação

### Backend / API — `social`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas).

- **`POST /denuncias`** (RF-MOD-01) — denuncia um alvo `resenha | comentario` (id), com **motivo** (enum), descrição opcional e, para livro pessoal, `via=feed|lista` + `referenciaId`. Antes de gravar, o servidor comprova que o solicitante vê o comentário/atividade sob RN-08/RN-09 ou a resenha sob RN-08/RN-15; conhecer o id não autoriza denúncia. **Rate limiting** (SEC-18). Conteúdo da descrição tratado como texto/escape (SEC-14).
- **Painel do administrador (RF-MOD-02)** — `GET /admin/denuncias?page=` lista as **pendentes ordenadas por data** (paginado — RNF-DES-02). **Restrito ao administrador, verificado no servidor** (SEC-04; a conta admin vem de [F-AUT](../periodo-1/feature-F-AUT.md), RF-AUT-08). O painel exibe o conteúdo denunciado: comentário local + resenha via `v_resenha_publicacao_v1`.
- **Ação de moderação (RF-MOD-03)** — `POST /admin/denuncias/{id}/remover` ou `/arquivar` (admin, SEC-04):
  - **arquivar** → marca a denúncia como improcedente;
  - **remover comentário** → `social` remove diretamente (e suas respostas, RN-10.5);
  - **remover resenha** → `social` chama comando HTTP interno autenticado e idempotente em `leitura`; após confirmação, a atividade associada é removida. Timeout mantém a denúncia pendente para retry, sem estado local falso.
- **Remoção direta de frase (RN-11):** `DELETE /admin/frases/{id}` é restrito ao admin e usa o mesmo contrato autorizado com `leitura`. Não exige denúncia prévia e sempre gera auditoria.
- **Auditoria (RF-MOD-05, SEC-35/37):** toda ação é gravada com autor, alvo, ação e timestamp, sem dado sensível excedente (SEC-36). **`GET /admin/moderacao/logs?page=`** permite consulta paginada, restrita ao admin.

**Escopo da denúncia:** apenas resenhas e comentários (RF-MOD-01). Listas, frases, perfis e livros não têm fluxo de denúncia; frases usam a remoção direta de RN-11.

**Modelo de dados** (schema `social`): `denuncia` (denunciante, alvo tipo+id, motivo, descrição opcional, estado pendente/removida/arquivada, timestamps) e `log_moderacao` (admin, alvo, ação, timestamp). A remoção de resenha em `leitura` é registrada no log ainda que a escrita ocorra lá.

**Contratos consumidos para autorização:** `v_resenha_publicacao_v1`, `v_perfil_referencia_v1`/`v_seguimento_aceito_v1`, `v_atividade_livro_pessoal_v1` e `v_lista_livro_pessoal_v1`. Comentário é validado localmente contra a visibilidade da atividade.

### Frontend Web (`code/front`)

- **Denunciar** resenha/comentário com confirmação explícita; painel admin de denúncias/logs. Ao visualizar frases, a conta admin recebe remoção direta com confirmação; não se cria nova listagem administrativa. Guarda de rota não substitui verificação server-side.

### App Flutter (`code/mobile`)

- **Denunciar** resenha/comentário com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md). O **painel de moderação** é da web (admin) — o mobile não o expõe. Alvo de demonstração Android.

## Critérios de aceite

- [ ] Denunciar resenha/comentário exige acesso atual ao alvo; resenha de livro pessoal exige via válida de RN-15; rate limiting ativo (SEC-18).
- [ ] Enviar denúncia exige confirmação explícita no cliente (RNF-USA-04).
- [ ] O painel de pendentes por data é **restrito ao admin**, verificado no servidor (RF-MOD-02, SEC-04); paginado (RNF-DES-02).
- [ ] Remover comentário o apaga (e as respostas, RN-10.5); **remover resenha** aciona a **remoção autorizada em `leitura`**; arquivar marca improcedente (RF-MOD-03); remoção pede confirmação (RNF-USA-04).
- [ ] Resenha removida deixa de aparecer em atividade associada; frase pode ser removida diretamente pelo admin sem denúncia (RN-11).
- [ ] Toda ação é registrada no log e consultável por `GET /admin/moderacao/logs`, somente pelo admin, sem dado sensível excedente (RF-MOD-05, SEC-35/36/37).
- [ ] Não-admin recebe `403` no painel/ações; ocultar na interface não substitui a checagem (SEC-01/04).
- [ ] Denúncia e moderação funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `social` + remoção em `leitura`, web, mobile de denúncia) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: visibilidade do alvo, via RN-15 válida/forjada, autorização admin, remover comentário/resenha/frase, ocultação da atividade, arquivar, consultar auditoria e rate limiting (RNF-TST-02)
- [ ] Teste da remoção cross-service de resenha/frase cobre comando autorizado, idempotência e falha sem estado local falso (RNF-TST-02; RNF-TST-03 se o contrato aprovado for assíncrono)
- [ ] Testes web/mobile cobrem denúncia; web cobre painel/log admin; ambos tratam indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Specs OpenAPI**: `docs/api/social.yaml` com denúncia, painel e auditoria; `docs/api/leitura.yaml` com remoção administrativa de resenha/frase
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** fixar com `leitura` um contrato único de remoção de resenha/frase por moderação, incluindo revalidação, retorno idempotente e auditoria em `social`.

## Pendências

- **Depende de** [F-AUT](../periodo-1/feature-F-AUT.md) (admin), [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (RN-08), [F-FEED](../periodo-1/feature-F-FEED.md) (comentários/via feed), [F-LST](feature-F-LST.md) (via lista), [F-AVA](../periodo-1/feature-F-AVA.md)/[F-AVA-2](feature-F-AVA-2.md) (resenhas/frases), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md).
- **Decisão do dono:** fixar enum de motivos e limite da descrição antes da migration.
- **Alternativa avaliada e adotada:** comando HTTP interno autenticado/idempotente para remoção; não criar evento ou saga para um comando administrativo que precisa de resposta.
- **Fronteira:** **suspender conta** (RF-MOD-04) é Opcional → **F-MOD-OPC** (Período 3).
- **Compartilha `social`** com as demais features sociais — sinalizar no grupo (plano §6).
- Stack de `social` e de `leitura` ainda pendentes (P0-INFRA).

## Timeline

### Revisão 01/09/2026: remoção cross-service fechada por HTTP interno autenticado/idempotente; mobile corrigido no escopo; limites de denúncia ficaram para o dono.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-MOD no [periodo-2/README.md](README.md), de RF-MOD-01/02/03/05 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.11 e das RN-11/RN-15. Painel restrito ao admin e auditoria fixados; a remoção cross-service de resenha registrada como pendência de baseline; suspensão de conta adiada ao Período 3.

### Revisão 29/08/2026: denúncia passou a exigir visibilidade server-side do alvo; foram declarados consulta do log, remoção direta de frases e ocultação da atividade de resenha removida. Mobile de denúncia foi incluído no DoD sem antecipar suspensão de conta.
