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
| Infra | não iniciado | P0-MSG ainda não entregou conexão, dispatcher, recibo, validação runtime, retry e DLQ; a outbox física isolada não implementa mensageria |
| Dados | concluído (baseline físico) | DER implantado no Neon em 16/09: `nota`, `resenha`, índices/uniquidade, `idempotencia_leitura`, `outbox_leitura`, `v_nota_publicacao_v1` e `v_resenha_publicacao_v1`; isso não implementa os casos de uso |
| Backend | não iniciado | `leitura`: CRUD de nota e resenha (uma por usuário+livro) |
| Web | não iniciado | seletor de estrelas + editor de resenha (texto puro) + spoiler |
| Mobile | não iniciado | mesmas telas |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Operações **síncronas** (§7.2: criação de nota e de resenha não são assíncronas; confirmam ao autor, com domínio e outbox gravados na mesma transação). Valida **propriedade** (SEC-02), **esquema** (SEC-13) e livro/tipo/dono pelo contrato `acervo.v_livro_referencia_v1` (`livro_id`, `tipo`, `dono_id`, `paginas`, `titulo`, `autor_exibicao`, `capa_resolvida`, `ativo`), sem ler tabela crua de `acervo`. IDs não sequenciais (SEC-05). Todas as escritas abaixo exigem `Idempotency-Key` conforme [`docs/api/leitura.yaml`](../../api/leitura.yaml): o escopo é ator+método+caminho canônico; mesma chave e payload reproduzem status/corpo sem novo efeito ou evento, e chave reutilizada com payload diferente retorna `409`.

- **`PUT /livros/{livroId}/nota`** (RF-AVA-01, RN-06) — cria/atualiza a nota do leitor para o livro e responde `200` com `Nota`. Valores permitidos: **0; 0,5; 1; … 5** (passos de 0,5) — fora da escala → `422`. **Uma nota por usuário por livro**, editável. **`DELETE /livros/{livroId}/nota`** responde `204` e remove com confirmação no cliente (RNF-USA-04). Ambas gravam `nota.alterada` na outbox.
- **`PUT /livros/{livroId}/resenha`** (RF-AVA-02, RF-AVA-03, RN-07) — cria/atualiza **uma resenha por usuário por livro**, responde `200` com `Resenha`, não depende de leitura concluída e recebe `texto` e `spoiler`. **Texto cru** de 1 a **5.000 caracteres**, incluindo marcação (RN-07), armazenado sem HTML; Markdown é Período 2. Marcação de **spoiler** é reversível. **`DELETE /livros/{livroId}/resenha`** exclui fisicamente, responde `204` e exige confirmação irreversível no cliente (RF-AVA-04, RNF-USA-04).
- **`GET /livros/{livroId}/minha-avaliacao`** — retorna `MinhaAvaliacao { livroId, nota, resenha }`; `nota` e `resenha` são anuláveis, nunca valores inventados.
- **Livro pessoal:** apenas o **dono** escreve nota/resenha (RN-03); a resenha do dono é visível a terceiros que cheguem por feed/lista (RN-15) — as **reações e denúncias** a essa resenha são do Período 2 ([F-AVA-2](../periodo-2/README.md)/F-MOD).
- **`GET /perfis/{usuarioId}/resenhas?page={n}&limite={n}`** — composição paginada de RF-SOC-02; `page` começa em 1 e `limite` tem máximo 50. Combina `identidade.v_perfil_referencia_v1` e `identidade.v_seguimento_aceito_v1`: perfil privado exige próprio usuário ou seguidor aceito; conta suspensa/em exclusão não aparece (RN-08, SEC-03).

**Eventos produzidos:**
- [`nota.alterada.v1`](../../mensageria/schemas/nota.alterada.v1.schema.json): `data` contém `usuarioId`, `livroId`, `operacao` (`criada | atualizada | excluida`) e `nota` (nula somente na exclusão); `businessKey = nota:<usuarioId>:<livroId>`. F-AVA é dona/produtora do schema. O catálogo marca `acervo` como **consumidor futuro**, portanto no Período 1 o evento é publicado sem fila acumuladora; F-ACV-NOTA faz backfill antes de criar o binding.
- [`resenha.publicada.v1`](../../mensageria/schemas/resenha.publicada.v1.schema.json): emitido na criação, não em edição, preservando a decisão vigente; `data` contém `usuarioId`, `resenhaId`, `livroId`, `atualizacao=false`, `usuario` (`UsuarioSnapshot`) e `livro` (`LivroSnapshot`), sem texto nem spoiler; `businessKey = resenha:<resenhaId>:publicada`. Após exclusão, uma nova resenha recebe novo ID e produz novo evento. O campo `atualizacao` existe no contrato canônico, mas F-AVA não publica edição no Período 1.
- [`resenha.excluida.v1`](../../mensageria/schemas/resenha.excluida.v1.schema.json): emitido na exclusão física com `usuarioId`, `resenhaId` e `livroId`; `businessKey = resenha:<resenhaId>:excluida`. F-FEED, dona da fila `leai.social.feed`, remove a atividade antiga e suas interações. F-AVA é dona/produtora dos dois schemas de resenha; P0-MSG é dono somente do envelope e do transporte.

**VIEWs expostas por `leitura`** (arquitetura §4.2), já implantadas pelo DER e ainda sem composição funcional:
- `v_resenha_publicacao_v1` (`resenha_id`, `usuario_id`, `livro_id`, `texto`, `spoiler`, `criado_em`, `atualizado_em`, `curtidas`, `descurtidas`) — consumida pela página de livro oficial e pela página autorizada de livro pessoal em `acervo`. Não contém nome/avatar nem decide visibilidade: `acervo` compõe `usuario_id` com as VIEWs de `identidade` e revalida RN-08/RN-15.
- `v_nota_publicacao_v1` (`usuario_id`, `livro_id`, `valor`) — consumida pela página autorizada de livro pessoal para exibir somente a nota do dono e, futuramente, pelo backfill de F-ACV-NOTA. A atualização incremental usa `nota.alterada`.

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
- [ ] Excluir resenha é físico, usa confirmação irreversível e publica `resenha.excluida`; recriar gera nova resenha e nova atividade (RF-AVA-04, RNF-USA-04).
- [ ] Remover nota exige confirmação; PUT/DELETE repetidos com a mesma chave não repetem efeitos (RNF-USA-04, RNF-ERR-04).
- [ ] `nota.alterada.v1` distingue `criada`, `atualizada` e `excluida`; criação/exclusão publicam `resenha.publicada.v1` (`atualizacao=false`) e `resenha.excluida.v1` com os campos e business keys canônicos. Os efeitos consumidores são aceitos em F-ACV-NOTA/F-FEED.
- [ ] As VIEWs permitem à página autorizada de livro pessoal mostrar somente nota/resenha do dono; `v_resenha_publicacao_v1` também atende a página oficial sob RN-08. Nenhuma alimenta o feed.
- [ ] Resenhas do perfil são paginadas e negadas server-side a não seguidor de perfil privado (RNF-DES-02, SEC-03).
- [ ] Em **livro pessoal**, só o dono escreve nota/resenha (RN-03).
- [ ] Nota e resenha funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: faixa/passo incluindo nota `0`, unicidade, validação de `v_livro_referencia_v1` (oficial, pessoal do dono, pessoal alheio e inativo), limite/texto cru, spoiler, exclusões, formas exatas das respostas, paginação com `limite`, privacidade/suspensão e idempotência HTTP (mesma chave+payload reproduz resposta e não duplica domínio/outbox; payload diferente → `409`) (RNF-TST-02)
- [ ] Testes assíncronos de F-AVA cobrem schemas canônicos, atomicidade domínio+outbox, operações/valores de `nota.alterada`, snapshots de `resenha.publicada`, repetição HTTP sem segunda linha de outbox e edição sem segunda `resenha.publicada`. O teste ponta a ponta de RNF-TST-03 para `resenha.*` inclui o consumidor F-FEED; consumo/backfill de `nota.alterada` pertence a F-ACV-NOTA. Dispatcher, confirm, recibo, retry e DLQ genéricos pertencem a P0-MSG.
- [ ] Testes web/mobile cobrem estrelas, spoiler, confirmações, perfil privado e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `leitura` em `docs/api/leitura.yaml` implementado sem divergência** para nota/resenha/minha avaliação/perfil e contratos de VIEW; trocar `x-implementation-status: planned` somente após a implementação
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** publicar as VIEWs versionadas e os dois schemas de evento com responsabilidades não sobrepostas: página por VIEW de resenha, feed por evento de resenha e projeção por evento de nota.

## Pendências

- **Depende de** [F-ACV-BUSCA](feature-F-ACV-BUSCA.md)/[F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md) (livro para avaliar), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md). **P0-MSG é pré-requisito bloqueante para concluir a publicação:** `outbox_leitura` já existe, mas conexão CloudAMQP, dispatcher com confirm, `mensagem_processada`, validação runtime dos schemas, retry/DLQ e prova em DES ainda não existem.
- **Compartilha `leitura` com [F-EST](feature-F-EST.md) e [F-PRG](feature-F-PRG.md)** — sinalizar no grupo antes de mexer no serviço (plano §6).
- **Ficam fora (Período 2):** curtir/descurtir e contadores de resenha (RF-AVA-05/08), frases/trechos (RF-AVA-06/07, RN-11), **Markdown** (RF-AVA-09, RN-13) — todos **F-AVA-2**. No Período 1 a resenha é **texto puro**; nada de parser Markdown ainda.
- A **projeção nota dos leitores** e a **nota geral** (RF-ACV-15/16) são **F-ACV-NOTA** (Período 2). Antes de consumir novos `nota.alterada`, essa feature deve fazer backfill de `v_nota_publicacao_v1`, pois eventos do Período 1 não são presumidos retidos.
- Stack de `leitura` definida: **NestJS (TypeScript)** (arquitetura §2.1).

- **Prompts de tela em [`docs/design/periodo-1/F-AVA/`](../../design/periodo-1/F-AVA/):** `avaliar-livro.md` e `escrever-resenha.md`. **A exibição da nota e das resenhas não tem prompt próprio:** ela é elemento que esta feature acrescenta a [`F-ACV-BUSCA/pagina-do-livro.md`](../../design/periodo-1/F-ACV-BUSCA/pagina-do-livro.md), incluindo o estado de resenha de terceiro com spoiler oculto, conforme a regra de recorte do [`docs/design/AGENTS.md`](../../design/AGENTS.md) §2.
- **Nota ausente e nota zero são estados distintos na interface, por RN-06.** Ausente é o texto `Sem nota`; `0` é uma nota válida e aparece como `0`. O protótipo traz os dois artboards lado a lado justamente porque as estrelas são idênticas nos dois casos e só o texto distingue. Ausente nunca é representado como `0,0` nem como traço.
- **Componentes que nascem no protótipo e ainda não estão na fonte:** o **painel de dar nota** (o §4.3 define o componente de estrela, não o painel em que ele vive), o **toggle de spoiler** e o **contador de caracteres permanente** com as três faixas de cor. Incorporar ao `documento-de-design.md` pelo controle de mudança do plano §3.
- **A área de texto da resenha é exceção declarada ao input do design §4.2:** sem borda e sem fundo próprio, em Newsreader, ocupando o corpo da tela. O §4.2 define o campo curto com borda e fundo `papel-elevado`, que não serve a texto de 5.000 caracteres.

## Timeline

### Revisão 17/09/2026: endpoints e parâmetros alinhados a `docs/api/leitura.yaml`; operações, campos, business keys e ownership alinhados ao catálogo e aos schemas canônicos. Registrados os contratos exatos das VIEWs e do livro cross-schema, o baseline DER já implantado sem alegar implementação, P0-MSG como bloqueio, a semântica de idempotência e a divisão dos testes. `nota.alterada.v1` foi consolidado com a faixa completa de 0 a 5 de RN-06.

### Revisão 01/09/2026: exclusão física de resenha e `resenha.excluida` aprovados; recriação gera novo registro e nova atividade, com publicação pela outbox.

### Revisão 28/08/2026: VIEWs foram renomeadas e tiveram consumidores delimitados; `nota.alterada` e `resenha.publicada` receberam semântica única. Foram adicionados contrato de livro, perfil paginado sob RN-08, confirmação de remoção de nota e idempotência; testes de publisher foram separados dos testes de consumo/DLQ.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-AVA no [periodo-1/README.md](README.md), de RF-AVA-01..04 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.5, das RN-06/RN-07/RN-04.5 e da arquitetura §3.2/§4.2. Nota/resenha fixadas como pertencentes ao livro (não à leitura) em `leitura`, com VIEWs de saída; reações, frases e Markdown adiados ao Período 2.
