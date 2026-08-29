# F-AVA — Nota e resenha

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** a definir · **Serviços afetados:** `leitura` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.5 (RF-AVA-01..04), RN-06, RN-07, RN-04.5. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.2, §4.2, §5.1, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Permitir que o leitor **avalie e opine sobre um livro** — nota e resenha —, o conteúdo que alimenta a página do livro e o feed. Fecha os requisitos **Essenciais**:

- **RF-AVA-01** atribuir uma **nota de 0 a 5 estrelas, com meia estrela**, editável a qualquer momento;
- **RF-AVA-02** escrever **uma resenha por livro**, editável;
- **RF-AVA-03** marcar a resenha como **contendo spoiler** (exibida oculta até revelar);
- **RF-AVA-04** **excluir** a resenha.

Nota e resenha pertencem ao **livro, não à leitura** (RN-04.5, RN-06, RN-07): uma por usuário por livro, sobrevivem a abandono, não duplicam por releitura e não exigem leitura concluída. Ficam em `leitura` (arquitetura §3.2.1); a página do livro consome VIEW versionada e o feed consome evento de publicação.

RNF atendidos: **RNF-SEC-02** (propriedade no servidor), **RNF-SEC-13** (validação por esquema — faixa da nota, limite da resenha), **RNF-SEC-14** (conteúdo do usuário tratado como texto, escape na web), **RNF-USA-04** (confirmação na exclusão), **RNF-ARQ-06** (evento `nota.alterada` para a projeção em `acervo`).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | tabelas `nota`/`resenha`; VIEWs `v_nota_publicacao_v1`/`v_resenha_publicacao_v1` |
| Backend | não iniciado | `leitura`: CRUD de nota e resenha (uma por usuário+livro) |
| Web | não iniciado | seletor de estrelas + editor de resenha (texto puro) + spoiler |
| Mobile | não iniciado | mesmas telas |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Operações **síncronas** (§7.2: criação de nota e de resenha não são assíncronas; confirmam ao autor, evento publicado após a escrita). Valida **propriedade** (SEC-02), **esquema** (SEC-13) e livro/tipo/dono por `v_livro_referencia_v1`, sem ler tabela crua de `acervo`. IDs não sequenciais (SEC-05). PUT e DELETE aceitam `Idempotency-Key`.

- **`PUT /livros/{id}/nota`** (RF-AVA-01, RN-06) — cria/atualiza a nota do leitor para o livro. Valores permitidos: **0; 0,5; 1; … 5** (passos de 0,5) — fora da escala → `422`. **Uma nota por usuário por livro**, editável. `DELETE /livros/{id}/nota` remove com confirmação no cliente (RNF-USA-04). Ambas publicam **`nota.alterada`** (§5.2) para a projeção em `acervo`, distinguindo operação `upsert | delete`.
- **`PUT /livros/{id}/resenha`** (RF-AVA-02, RF-AVA-03, RN-07) — cria/atualiza **uma resenha por usuário por livro**, editável, **não** dependente de leitura concluída. **Texto cru**, limite **5.000 caracteres** contados sobre o texto (RN-07); armazenado como texto (renderizado no cliente com escape — SEC-14). Marcação de **spoiler** opcional e reversível (RF-AVA-03). `DELETE /livros/{id}/resenha` exclui (RF-AVA-04, confirmação no cliente — RNF-USA-04).
- **`GET /livros/{id}/minha-avaliacao`** — retorna a nota e a resenha atuais do usuário autenticado para preencher edição em nova sessão; ausência de uma delas é representada como ausente, nunca como valor vazio inventado.
- **Livro pessoal:** apenas o **dono** escreve nota/resenha (RN-03); a resenha do dono é visível a terceiros que cheguem por feed/lista (RN-15) — as **reações e denúncias** a essa resenha são do Período 2 ([F-AVA-2](../periodo-2/README.md)/F-MOD).
- **`GET /perfis/{usuarioId}/resenhas?page=`** — composição paginada de RF-SOC-02. Combina `v_perfil_referencia_v1` e `v_seguimento_aceito_v1`: perfil privado exige próprio usuário ou seguidor aceito (RN-08, SEC-03).

**Eventos produzidos:**
- `nota.alterada` (§5.2): payload versionado com autor, livro, operação `upsert | delete`, valor quando aplicável e chave de negócio usuário+livro. É o caminho **incremental** da projeção após o backfill inicial de F-ACV-NOTA.
- `resenha.publicada`: emitido somente na primeira publicação, não em edição, com autor e snapshot mínimo de usuário/livro, resenha, spoiler e chave do fato. [F-FEED](feature-F-FEED.md) cria a atividade; esta feature termina na publicação conforme o contrato.

**VIEWs expostas por `leitura`** (arquitetura §4.2), com nomes distintos das tabelas:
- `v_resenha_publicacao_v1` — consumida pela página de livro oficial e pela página autorizada de livro pessoal em `acervo`; contém autor suficiente para aplicar RN-08/RN-15.
- `v_nota_publicacao_v1` — consumida pela página autorizada de livro pessoal para exibir somente a nota do dono e, futuramente, pela recomendação e pelo backfill inicial da projeção. A atualização incremental da projeção usa `nota.alterada`.

O feed não consome VIEW de resenha; consome exclusivamente `resenha.publicada`.

**Modelo de dados** (schema `leitura`): `nota` (usuário, livro, valor 0–5 em passos de 0,5) e `resenha` (usuário, livro, texto cru ≤5.000, flag spoiler, timestamps). Chave única (usuário, livro) em ambas.

### Frontend Web (`code/front`)

- **Seletor de estrelas** com meia estrela (componente de [P0-DS](../periodo-0/feature-P0-DS.md)); carrega a avaliação atual e remover nota exige confirmação. **Editor de resenha** em **texto puro** (Markdown é Período 2), contador de 5.000, toggle de **spoiler**; resenha com spoiler exibida **oculta** exigindo ação para revelar. Excluir com confirmação. Conteúdo renderizado com **escape** (SEC-14). Perfil usa listagem paginada autorizada; cliente HTTP aplica timeout/backoff apenas a operações idempotentes.

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md). Alvo de demonstração Android.

## Critérios de aceite

- [ ] Nota aceita apenas os valores 0..5 em **passos de 0,5** (RN-06); fora da escala → `422`; é **uma por usuário+livro**, editável e removível.
- [ ] Resenha é **uma por usuário+livro**, editável, **texto cru ≤5.000** (RN-07), **sem** exigir leitura concluída.
- [ ] `minha-avaliacao` recupera nota/resenha atuais para edição e respeita propriedade.
- [ ] **Spoiler** marca/desmarca e a resenha é exibida oculta até revelar (RF-AVA-03).
- [ ] Excluir resenha funciona com confirmação (RF-AVA-04, RNF-USA-04).
- [ ] Remover nota exige confirmação; PUT/DELETE repetidos com a mesma chave não repetem efeitos (RNF-USA-04, RNF-ERR-04).
- [ ] `nota.alterada` distingue upsert/delete e alimenta incrementalmente a projeção após backfill; `resenha.publicada` ocorre apenas na primeira publicação. Os efeitos consumidores são aceitos em F-ACV-NOTA/F-FEED.
- [ ] As VIEWs permitem à página autorizada de livro pessoal mostrar somente nota/resenha do dono; `v_resenha_publicacao_v1` também atende a página oficial sob RN-08. Nenhuma alimenta o feed.
- [ ] Resenhas do perfil são paginadas e negadas server-side a não seguidor de perfil privado (RNF-DES-02, SEC-03).
- [ ] Em **livro pessoal**, só o dono escreve nota/resenha (RN-03).
- [ ] Nota e resenha funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: faixa/passo, unicidade, livro pessoal, limite/texto cru, spoiler, exclusões, paginação/privacidade do perfil e idempotência (RNF-TST-02)
- [ ] Testes assíncronos de F-AVA cobrem schema/publicação após a transação, repetição sem segundo fato e edição sem segunda `resenha.publicada`; consumo, retentativa e DLQ pertencem a F-ACV-NOTA/F-FEED (RNF-TST-03)
- [ ] Testes web/mobile cobrem estrelas, spoiler, confirmações, perfil privado e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com nota/resenha/perfil + `v_nota_publicacao_v1` e `v_resenha_publicacao_v1`
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** publicar as VIEWs versionadas e os dois schemas de evento com responsabilidades não sobrepostas: página por VIEW de resenha, feed por evento de resenha e projeção por evento de nota.

## Pendências

- **Depende de** [F-ACV-BUSCA](feature-F-ACV-BUSCA.md)/[F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md) (livro para avaliar), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md) (broker para `nota.alterada` e evento de resenha).
- **Compartilha `leitura` com [F-EST](feature-F-EST.md) e [F-PRG](feature-F-PRG.md)** — sinalizar no grupo antes de mexer no serviço (plano §6).
- **Ficam fora (Período 2):** curtir/descurtir e contadores de resenha (RF-AVA-05/08), frases/trechos (RF-AVA-06/07, RN-11), **Markdown** (RF-AVA-09, RN-13) — todos **F-AVA-2**. No Período 1 a resenha é **texto puro**; nada de parser Markdown ainda.
- A **projeção nota dos leitores** e a **nota geral** (RF-ACV-15/16) são **F-ACV-NOTA** (Período 2). Antes de consumir novos `nota.alterada`, essa feature deve fazer backfill de `v_nota_publicacao_v1`, pois eventos do Período 1 não são presumidos retidos.
- **Evento de atividade:** `resenha.publicada` é necessário ao snapshot de F-FEED, mas não consta entre os seis fluxos fechados em `REQUISITOS.md` §7.2/arquitetura §5.2. Aprovar sua inclusão nos documentos-mestre ou definir integração alternativa antes de implementar.
- Stack de `leitura` ainda pendente (P0-INFRA).

## Timeline

### Revisão 28/08/2026: VIEWs foram renomeadas e tiveram consumidores delimitados; `nota.alterada` e `resenha.publicada` receberam semântica única. Foram adicionados contrato de livro, perfil paginado sob RN-08, confirmação de remoção de nota e idempotência; testes de publisher foram separados dos testes de consumo/DLQ.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-AVA no [periodo-1/README.md](README.md), de RF-AVA-01..04 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.5, das RN-06/RN-07/RN-04.5 e da arquitetura §3.2/§4.2. Nota/resenha fixadas como pertencentes ao livro (não à leitura) em `leitura`, com VIEWs de saída; reações, frases e Markdown adiados ao Período 2.
