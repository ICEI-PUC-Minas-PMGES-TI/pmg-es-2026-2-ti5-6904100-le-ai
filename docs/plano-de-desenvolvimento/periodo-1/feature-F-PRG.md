# F-PRG — Progresso manual

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** Ana Luiza de Freitas · **Serviços afetados:** `leitura` (backend) + web + mobile
**Situação:** entregue, **em revisão** (aguarda o aval dos professores para ser marcada como concluída no GitHub Projects) desde 29/09/2026

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.4 (RF-PRG-01..04), RN-17, RN-05. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §5.1, §5.3. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar o **registro manual de progresso** — o "acompanhar progresso" do ciclo de valor — sobre a leitura em andamento de [F-EST](feature-F-EST.md). Fecha os requisitos **Essenciais**:

- **RF-PRG-01** registrar uma atualização informando **em qual página parou** e, opcionalmente, **quanto tempo gastou**;
- **RF-PRG-02** calcular e exibir a **página atual** e o **percentual concluído**, derivados;
- **RF-PRG-03** visualizar atualizações e excluir um registro somente com todos os posteriores, **recalculando** a página e os efeitos derivados;
- **RF-PRG-04** **rejeitar** atualização cuja página seja **≤ página atual** ou **> total de páginas** do livro.

O registro sempre usa **a página em que o leitor parou** (valor absoluto e monotônico — RN-17); páginas lidas e percentual são sempre **derivados**, nunca informados. Cada registro **zera o contador de inatividade** da leitura (RN-05), interligando com [F-EST](feature-F-EST.md).

RNF atendidos: **RNF-ERR-04** (chave de idempotência na escrita — retentativa não duplica), **RNF-ERR-05** (fila offline no mobile para registros de progresso), **RNF-SEC-02** (propriedade da leitura no servidor), **RNF-SEC-13** (validação por esquema no servidor), **RNF-ARQ-05** (concorrência sem perda).

## Status

| Camada | Status | Observação |
|---|---|---|
| Dados | concluído (baseline DER) | `atualizacao_progresso`, `leitura`, `idempotencia_leitura` e `outbox_leitura`, constraints/índices/FKs versionados e aplicados no Neon em 16/09/2026; isso não implementa o domínio |
| Infra | implementado | dispatcher/publicação AMQP de [P0-MSG](../periodo-0/feature-P0-MSG.md) ativos em `leitura`; `progresso.registrado` não tem consumidor atual e não cria fila acumuladora |
| Backend | implementado | `leitura`: registrar/listar e excluir trecho final; tempo opcional e `minutosTotais` no resumo (27/09/2026); edição removida (29/09/2026) |
| Web | implementado | registrar progresso, barra de página atual/percentual e tela de atualizações com exclusão do trecho final (27/09/2026); edição removida (29/09/2026) |
| Mobile | implementado | mesmas telas + **fila offline** FIFO por leitura com pausa em falha de validação (RNF-ERR-05), mergeado pelo PR #42 (29/09/2026) |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. A operação é **síncrona** (§7.2: confirma ao autor); a publicação assíncrona posterior não muda o resultado HTTP. Todo endpoint valida no servidor que a ocorrência pertence ao autenticado (SEC-02), sem acesso público por perfil; conhecer `leituraId`/`progressoId` não concede acesso. Valida o esquema de entrada (SEC-13) e obtém o total de páginas por `v_livro_referencia_v1`, sem ler tabela crua de `acervo`. IDs são não sequenciais (SEC-05). POST e DELETE exigem `Idempotency-Key` UUID com escopo `(ator autenticado, método, caminho canônico)`: mesma chave/payload reproduz status e corpo; payload diferente retorna `409`.

- **`POST /leituras/{leituraId}/progresso`** (RF-PRG-01, RF-PRG-04, RN-17) — recebe exatamente `{ pagina, minutos?, registradoEmDispositivo, fusoHorarioDispositivo }`. `minutos` é opcional, inteiro de 0 a 720; ausente é gravado como 0 (não informado). Página é absoluta; captura e fuso IANA são automáticos e não editáveis. O servidor deriva/persiste `dataLocal`, inclusive no reenvio offline, exige página **> página atual** e **≤ total de páginas** (`422` em violação), e aceita somente ocorrência própria em **Lendo** ou **Relendo**. Sob o mesmo lock/transação, cria o progresso, atualiza `leitura.pagina_atual`, `ultima_atividade_em` e `inatividade_versao` para iniciar novo ciclo de RN-05, e retorna `201` com `{ progresso, resumo }`.
- Na mesma transação, grava `progresso.registrado` na outbox. O contrato canônico v1 usa `businessKey=progresso:<atualizacaoProgressoId>` e `data` exato `{ atualizacaoProgressoId, usuarioId, leituraId, livroId, pagina, paginasLidas, minutos, percentual, registradoEm, fusoHorario, dataLocal }`. Eventos anteriores ao início dos consumidores futuros não ficam acumulados: F-DSF/F-STA/F-GAM fazem backfill antes de criar bindings.
- Registros concorrentes da mesma leitura são serializados por lock/controle otimista sobre a leitura. Página anterior e páginas lidas são calculadas dentro da mesma transação; a segunda escrita revalida contra a página já confirmada, evitando duas atualizações derivadas da mesma base (RNF-ARQ-05).
- **`GET /leituras/{leituraId}/progresso?page=&limite=`** (RF-PRG-02/03) — lista com `limite` máximo 50 e resposta `{ itens, paginacao, resumo, somenteLeitura }`; `resumo` contém `paginaAtual`, `totalPaginas`, `percentualConcluido` e `minutosTotais` (soma dos minutos de todos os registros da leitura) independentemente da página; POST e DELETE retornam o mesmo resumo. Ocorrências encerradas são somente leitura.
- **`DELETE /progresso/{progressoId}`** recebe `{ ultimoProgressoIdConfirmado }`; remove atomicamente o registro indicado e todos os posteriores. Se o ID confirmado não for o último atual, retorna `409` para não apagar escrita concorrente. Retorna `{ idsRemovidos, resumo }`, com página zero se não restar registro; o cliente confirma previamente o alcance e o resultado do recálculo (RNF-USA-04).
- **Efeitos de correção:** DELETE recalcula página, contribuições, estatísticas e dias/sequências dentro do próprio serviço `leitura`, sem criar novo tipo/evento de broker apenas para comunicação interna. Uma entrega tardia de `progresso.registrado` consulta o estado atual por `atualizacaoProgressoId`: não ressuscita registro excluído nem aplica payload anterior à correção. Consumidores deduplicam a entrega por `(consumidor, eventId)` e o efeito semanticamente pelo ID do fato. A ordem usa `atualizacao_progresso.ordem`, única por leitura e atribuída sob lock; timestamps não definem o último.

**Fronteira compartilhada com F-EST/P0-MSG:** F-PRG possui `atualizacao_progresso` e suas mutações; F-EST possui a máquina de estados, a estante e o ciclo de inatividade. F-PRG só altera os campos compartilhados de `leitura` necessários a RN-17/RN-05, na mesma transação e sob o mesmo lock. P0-MSG possui envelope, dispatcher, publisher confirm, recibo, validação, retry e DLQ; F-PRG possui o `data`, a business key e a gravação domínio+outbox. A baseline física já aplicada não deve ser reescrita; ajuste exige nova migration revisada e coordenação com F-EST/F-AVA.

**Valores derivados (RN-17), calculados pelo sistema e só exibidos:**
- **Páginas lidas** de uma atualização = `página informada − página atual anterior` (RN-17.1).
- **Página atual** = maior página informada até o momento (RN-17.3).
- **Percentual concluído** = página atual ÷ total do livro (RN-17.5).

**Modelo de dados** (schema `leitura`, baseline já implantada): `atualizacao_progresso` contém `leitura_id`, `ordem`, `pagina`, `paginas_lidas`, `minutos`, captura/fuso/data local, `chave_idempotencia` e timestamps; FK para `leitura`, unicidade `(leitura_id, ordem)` e unicidade da chave estão aplicadas. `leitura.pagina_atual` guarda o resumo corrente; `idempotencia_leitura` guarda replay HTTP e `outbox_leitura` o evento. A regra de domínio continua no backend: constraint física não substitui propriedade, estado, total de páginas, monotonicidade ou lock.

### Frontend Web (`code/front`)

- Progresso não é editado (corrigir = excluir e registrar de novo); exclusão de intermediário informa e confirma todos os posteriores. A mesma regra vale no Flutter e no servidor. Histórico de leituras finalizadas continua somente leitura.

- **Registrar progresso** (página + tempo) na leitura em andamento; exibir **página atual** e **percentual** (barra de progresso), lista paginada e **excluir com confirmação** e recálculo. Validação no cliente **reforça** a do servidor (RF-PRG-04). Só tokens de [P0-DS](../periodo-0/feature-P0-DS.md) (componente de progresso). Cliente HTTP usa timeout/backoff apenas em operações idempotentes e preserva a chave em reenvio.

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md), lista incremental e confirmação de exclusão. **Fila offline** (RNF-ERR-05): detecta ausência de conectividade, enfileira localmente e reenvia em **FIFO por leitura**, um registro por vez, usando a mesma chave de idempotência. Falha de validação pausa a fila daquela leitura e pede correção, sem enviar páginas posteriores fora de ordem. Alvo de demonstração Android.

## Critérios de aceite

- [x] Registrar progresso grava página e tempo opcional (ausente = 0, não informado; 0 a 720) e **recusa** página ≤ atual ou > total (RF-PRG-04, RN-17.2) com mensagem clara. *`progresso.int-spec.ts` (422, tempo opcional); validação reforçada no cliente.*
- [x] **Página atual** e **percentual** são derivados corretamente (RN-17) e exibidos; o leitor nunca informa páginas lidas nem percentual.
- [x] POST, DELETE e a listagem expõem resumo coerente (`paginaAtual`, `totalPaginas`, `percentualConcluido`, `minutosTotais`), inclusive em nova sessão e após recálculo.
- [x] Excluir intermediário exige excluir todos os posteriores, com confirmação do alcance e transação atômica; sem registros, a página atual é zero (RF-PRG-03, RN-17.6). *`progresso.int-spec.ts` (exclusão em trecho, 409, página zero); confirmação com alcance e recálculo na web e no mobile.*
- [x] A lista de atualizações é paginada com teto server-side; exclusão exige confirmação (RNF-DES-02, RNF-USA-04). *Teto de 50 testado.*
- [x] Reenvio com a **mesma chave de idempotência** e payload reproduz status/corpo sem repetir efeito; reutilizá-la com payload diferente retorna `409` (RNF-ERR-04).
- [x] Escritas concorrentes da mesma leitura não derivam da mesma página anterior; fila offline reenvia FIFO por leitura (RNF-ARQ-05, RNF-ERR-05). *`progresso.int-spec.ts` ("POSTs concorrentes…"); `progresso_test.dart` ("envia FIFO por leitura…").*
- [x] No mobile, registros feitos **offline** são enfileirados e reenviados ao voltar a conexão, sem duplicar (RNF-ERR-05). *`fila_de_progresso.dart`; `progresso_test.dart` (mesma chave e captura, fila sobrevive ao reinício do app).*
- [x] Cada registro **zera o contador de inatividade** da leitura (RN-05, integra [F-EST](feature-F-EST.md)).
- [x] Data local é derivada do instante/fuso capturados automaticamente no dispositivo e preservada no reenvio offline (RN-18.2).
- [ ] POST grava atomicamente a outbox com `businessKey=progresso:<atualizacaoProgressoId>` e payload estritamente compatível com o schema v1; DELETE recalcula os efeitos locais e uma entrega tardia consulta o estado atual sem ressuscitar exclusões. *Outbox atômica, business key e schema cobertos (`progresso.int-spec.ts`); a entrega tardia só terá efeito com os consumidores do Período 2 (F-DSF/F-STA) e não tem teste ainda.*
- [x] Operações validam **propriedade** da leitura (SEC-02).
- [ ] Registrar/exibir/excluir progresso funciona **em DES**. *Entra no merge de fechamento do Período 1: a `main` só recebe o período fechado, e o DES sobe da `main`.*

## Definition of Done

(plano §10)

- [x] Código (backend `leitura`, web, mobile) mergeado em `desenvolvimento` (backend e web em 27/09/2026; mobile pelo PR #42 e remoção da edição em 29/09/2026)
- [x] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md)): `ci-back-leitura`, `ci-front` e `ci-mobile` verdes na `desenvolvimento` em 29/09/2026
- [x] Testes unitários e de integração com PostgreSQL real/container: propriedade/ID alheio, estado em andamento versus encerrado, total de páginas, monotonicidade, cálculo/resumo, paginação/teto 50, ausência de edição, exclusão atômica e conflito do ID confirmado, captura/fuso/data local, idempotência HTTP e POSTs/DELETE concorrentes na mesma leitura (RNF-TST-02). *`test/integracao/progresso.int-spec.ts`.*
- [ ] Testes assíncronos do produtor cobrem domínio+outbox atômicos no POST, schema/business key, entrega tardia após exclusão e falha do broker sem desfazer a escrita; recibo, deduplicação semântica, backfill e DLQ são critérios das features consumidoras (RNF-TST-03). *Domínio+outbox e schema cobertos; faltam entrega tardia após exclusão e falha do broker.*
- [x] Testes web/mobile cobrem estado, confirmação, paginação e indisponibilidade/timeout; mobile cobre a **fila offline** e reenvio com a mesma chave (RNF-TST-04/05/06). *Web: `ProgressoView.spec.ts`, `RegistrarProgresso.spec.ts`, `useRegistroProgresso.spec.ts`; mobile: `progresso_test.dart`.*
- [x] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com os endpoints de progresso (sem o `PATCH`, removido em 29/09/2026)
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)). *Entra no merge de fechamento do Período 1, não é pendência da feature.*
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver (ver Pendências)

## Pendências

- **Depende de** [F-EST](feature-F-EST.md) (leitura em andamento, lock e ciclo de inatividade; a baseline física compartilhada já está aplicada, e nova migration exige coordenação), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md). O runtime de P0-MSG (dispatcher, recibo, retry e DLQ) está implementado desde 19/09/2026.
- **Sessão de leitura cronometrada** (RF-PRG-05..12, RN-16) fica **fora** — é **F-SESSAO** (Período 2). A entrada de página desta feature é a mesma que a sessão usará ao encerrar; manter o contrato compatível.
- **Decisão do grupo incorporada em 15/09/2026:** progresso offline recompõe desafios e sequência pela data de captura, inclusive janelas encerradas. Registro manual retroativo continua proibido. Testar captura anterior a pausa/edição de desafio, sincronização tardia e exclusão do trecho final, incluindo eventos entregues depois da correção.
- **Divergências físicas preservadas:** a divergência de `minutos` foi resolvida em 27/09/2026 — o contrato passou a 0..720, alinhado ao zero que a constraint implantada já permite (o teto 720 segue validado só na aplicação); o contrato HTTP escopa `Idempotency-Key` por ator+método+caminho, enquanto `atualizacao_progresso.chave_idempotencia` está globalmente única. A implementação segue o OpenAPI e o ledger `idempotencia_leitura`; qualquer ajuste físico entra em nova migration revisada, sem reescrever `0001`/`0002`.
- **Divergência protótipo × implementação (edição removida):** os prompts já foram atualizados em 29/09/2026 (`909e763`: `registrar-progresso.md` com o registro pausado na fila e `atualizacoes-de-progresso.md` com "Não ofereça editar"), mas os HTML em [`docs/design/periodo-1/F-PRG/prototipos/`](../../design/periodo-1/F-PRG/prototipos/) são de 15/09/2026 e ainda mostram o botão `Editar` (`atualizacoes-de-progresso.html`) e o artboard `Editar progresso` (`registrar-progresso.html`). A implementação segue RN-17 v1.8, sem edição e sem exclusão isolada de intermediários; os protótipos HTML ficam obsoletos nesses pontos até serem regenerados.
- Persistir a **data local** da atualização (RN-18.2) desde já, para a sequência diária (Período 2) não exigir retrabalho.
- Stack de `leitura` definida: **NestJS (TypeScript)** (arquitetura §2.1).

- **Prompts de tela em [`docs/design/periodo-1/F-PRG/`](../../design/periodo-1/F-PRG/):** `registrar-progresso.md` e `atualizacoes-de-progresso.md`. **RF-PRG-02 não tem prompt próprio:** a página atual e o percentual aparecem como barra de progresso em [`F-EST/estante.md`](../../design/periodo-1/F-EST/estante.md) e em [`F-ACV-BUSCA/pagina-do-livro.md`](../../design/periodo-1/F-ACV-BUSCA/pagina-do-livro.md), conforme a regra de recorte do [`docs/design/AGENTS.md`](../../design/AGENTS.md) §2.
- **Componentes que nascem no protótipo e ainda não estão na fonte:** o **aviso de registro enfileirado offline** (RNF-ERR-05; desenhado como linha em `ambar` no contexto, porque o design §7.6 proíbe toast com fundo saturado), a **linha de três valores com divisor vertical** (o §7.3 diz o que não fazer, mas não desenha a alternativa) e a **tabela de dados da web**, que o documento não tem em nenhuma seção. Incorporar ao `documento-de-design.md` pelo controle de mudança do plano §3.
- **A confirmação de exclusão de atualização informa o resultado do recálculo**, não uma frase genérica sobre irreversibilidade, porque é esse número que o leitor precisa para decidir (RN-17.4). Fixado na seção 8 de `atualizacoes-de-progresso.md`.

## Timeline

### Fechamento 29/09/2026: feature entregue e **em revisão**, aguardando o aval dos professores. Mobile com fila offline FIFO por leitura e pausa em falha de validação (`680c97d`), mergeado pelo PR #42; remoção da edição também na web (`3c4a12e`); correções do mobile por Renato Douglas: a estante recarrega quando a leitura muda em outra tela (`bcbbc90`), a folha de registrar rola em vez de estourar (`43b4aed`) e os sufixos h/min ficam centralizados (`701a1e9`). Prompts de design atualizados sem edição (`909e763`); os protótipos HTML seguem com `Editar` (divergência registrada). Pendências remanescentes: testes de entrega tardia e de falha do broker. O DES chega com o merge de fechamento do Período 1.

### Revisão 29/09/2026: edição de progresso removida por decisão da dona (REQUISITOS v1.8); correção = excluir e registrar de novo. `PATCH /progresso/{progressoId}` retirado do OpenAPI e do backend; exclusão do trecho final e 409 de `ultimoProgressoIdConfirmado` mantidos.

### Revisão 27/09/2026: tempo opcional conforme protótipo; `minutosTotais` no resumo; limiar do aviso de ritmo = 40 páginas acima da média do leitor (média de páginas lidas por registro dos demais registros da leitura; sem outros registros, média 0), calculado no cliente; backend implementado. Web: serviço e regras de progresso (`746eb44`), registrar progresso (`3606403`) e tela de atualizações (`9107a35`).

### Revisão 17/09/2026: HTTP alinhado ao OpenAPI e evento alinhado ao catálogo/schema v1; business key, correções e responsabilidades de deduplicação delimitadas. O payload inclui páginas lidas, minutos, fuso e data local necessários aos consumidores futuros. Baseline de dados marcada como concluída no Neon; backend, AMQP, web e mobile permanecem não iniciados.

### Revisão 15/09/2026: decisões do grupo incorporadas à especificação — edição só do último, exclusão de intermediário com posteriores, ordem explícita e recomposição offline. DER atualizado; implementação e atualização dos protótipos permanecem pendentes.

### Revisão 01/09/2026: `progresso.registrado` aprovado e ligado à outbox; chegada tardia da fila offline registrada para decisão do dono da feature.

### Revisão 28/08/2026: total de páginas passou a vir do contrato de `acervo`; resumo derivado, metadados automáticos de fuso/data local, concorrência, fila FIFO, listagem paginada, confirmação de exclusão, idempotência e testes foram explicitados.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-PRG no [periodo-1/README.md](README.md), de RF-PRG-01..04 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.4, da RN-17 e da arquitetura §5.1/§5.3. Entrada absoluta de página e valores derivados fixados; sessão cronometrada adiada ao Período 2; data local já persistida para o streak futuro.
