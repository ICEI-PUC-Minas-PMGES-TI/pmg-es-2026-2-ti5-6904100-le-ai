# F-PRG — Progresso manual

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** a definir · **Serviços afetados:** `leitura` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.4 (RF-PRG-01..04), RN-17, RN-05. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §5.1, §5.3. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar o **registro manual de progresso** — o "acompanhar progresso" do ciclo de valor — sobre a leitura em andamento de [F-EST](feature-F-EST.md). Fecha os requisitos **Essenciais**:

- **RF-PRG-01** registrar uma atualização informando **em qual página parou** e **quanto tempo gastou**;
- **RF-PRG-02** calcular e exibir a **página atual** e o **percentual concluído**, derivados;
- **RF-PRG-03** visualizar e **excluir** atualizações de uma leitura em andamento, **recalculando** a página atual;
- **RF-PRG-04** **rejeitar** atualização cuja página seja **≤ página atual** ou **> total de páginas** do livro.

O registro sempre usa **a página em que o leitor parou** (valor absoluto e monotônico — RN-17); páginas lidas e percentual são sempre **derivados**, nunca informados. Cada registro **zera o contador de inatividade** da leitura (RN-05), interligando com [F-EST](feature-F-EST.md).

RNF atendidos: **RNF-ERR-04** (chave de idempotência na escrita — retentativa não duplica), **RNF-ERR-05** (fila offline no mobile para registros de progresso), **RNF-SEC-02** (propriedade da leitura no servidor), **RNF-SEC-13** (validação por esquema no servidor), **RNF-ARQ-05** (concorrência sem perda).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | tabela `atualizacao_progresso` no schema `leitura` |
| Backend | não iniciado | `leitura`: registrar/listar/excluir progresso + cálculo derivado |
| Web | não iniciado | registrar progresso + barra de página atual/percentual |
| Mobile | não iniciado | mesmas telas + **fila offline** (RNF-ERR-05) |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Operação **síncrona** (§7.2: registro de progresso não é assíncrono; confirma ao autor). Valida **propriedade** da leitura (SEC-02), **esquema** de entrada (SEC-13) e obtém o total de páginas por `v_livro_referencia_v1`, sem ler tabela crua de `acervo`. IDs não sequenciais (SEC-05). POST e DELETE aceitam `Idempotency-Key`.

- **`POST /leituras/{id}/progresso`** (RF-PRG-01, RF-PRG-04, RN-17) — recebe **página em que parou** (absoluta), **tempo gasto** e metadados automáticos `registradoEmDispositivo` + `fusoHorarioDispositivo` (IANA, não editáveis no formulário). O servidor valida esses metadados e deriva/persiste a data local de RN-18.2, inclusive quando uma fila offline envia depois. Valida (RN-17.2, RF-PRG-04): página **> página atual** e **≤ total de páginas** do livro; violação → `422` com mensagem clara (pt-BR). Aceita **chave de idempotência** (RNF-ERR-04): reenvio da mesma chave não cria registro duplicado. A leitura precisa estar em **Lendo** ou **Relendo** ([F-EST](feature-F-EST.md), RN-04). O registro **zera o contador de inatividade** (RN-05) e retorna o resumo derivado atualizado.
- Na mesma transação, grava `progresso.registrado` na outbox com atualização, páginas derivadas, minutos, instante e data/fuso locais. F-DSF, F-STA e F-GAM consomem o contrato aprovado; eventos anteriores ao início dos consumidores são cobertos por backfill.
- Registros concorrentes da mesma leitura são serializados por lock/controle otimista sobre a leitura. Página anterior e páginas lidas são calculadas dentro da mesma transação; a segunda escrita revalida contra a página já confirmada, evitando duas atualizações derivadas da mesma base (RNF-ARQ-05).
- **`GET /leituras/{id}/progresso?page=`** (RF-PRG-02 e RF-PRG-03) — lista paginada, ordenada e com limite máximo imposto pelo servidor (RNF-DES-02). Cada resposta inclui metadados de resumo independentes da página: `paginaAtual`, `totalPaginas` e `percentualConcluido`.
- **`DELETE /progresso/{id}`** (RF-PRG-03, RN-17.4) — exclui uma atualização de leitura em andamento, **recalcula a página atual** a partir das restantes e retorna o resumo derivado atualizado. É **Essencial** justamente porque, com entrada absoluta e monotônica, um valor digitado alto demais bloqueia os registros seguintes (RN-17.4). Exige confirmação explícita no cliente (RNF-USA-04).

**Valores derivados (RN-17), calculados pelo sistema e só exibidos:**
- **Páginas lidas** de uma atualização = `página informada − página atual anterior` (RN-17.1).
- **Página atual** = maior página informada até o momento (RN-17.3).
- **Percentual concluído** = página atual ÷ total do livro (RN-17.5).

**Modelo de dados** (schema `leitura`): `atualizacao_progresso` (leitura, página informada, tempo gasto, instante/fuso informados automaticamente pelo dispositivo, data local derivada — para streak futuro, RN-18.2 —, chave de idempotência, timestamps).

### Frontend Web (`code/front`)

- **Registrar progresso** (página + tempo) na leitura em andamento; exibir **página atual** e **percentual** (barra de progresso), lista paginada e **excluir com confirmação** e recálculo. Validação no cliente **reforça** a do servidor (RF-PRG-04). Só tokens de [P0-DS](../periodo-0/feature-P0-DS.md) (componente de progresso). Cliente HTTP usa timeout/backoff apenas em operações idempotentes e preserva a chave em reenvio.

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md), lista incremental e confirmação de exclusão. **Fila offline** (RNF-ERR-05): detecta ausência de conectividade, enfileira localmente e reenvia em **FIFO por leitura**, um registro por vez, usando a mesma chave de idempotência. Falha de validação pausa a fila daquela leitura e pede correção, sem enviar páginas posteriores fora de ordem. Alvo de demonstração Android.

## Critérios de aceite

- [ ] Registrar progresso grava página + tempo e **recusa** página ≤ atual ou > total (RF-PRG-04, RN-17.2) com mensagem clara.
- [ ] **Página atual** e **percentual** são derivados corretamente (RN-17) e exibidos; o leitor nunca informa páginas lidas nem percentual.
- [ ] POST, DELETE e a listagem expõem resumo coerente (`paginaAtual`, `totalPaginas`, `percentualConcluido`), inclusive em nova sessão e após recálculo.
- [ ] Excluir uma atualização **recalcula** a página atual a partir das restantes (RF-PRG-03, RN-17.4).
- [ ] A lista de atualizações é paginada com teto server-side; exclusão exige confirmação (RNF-DES-02, RNF-USA-04).
- [ ] Reenvio com a **mesma chave de idempotência** não cria registro duplicado (RNF-ERR-04).
- [ ] Escritas concorrentes da mesma leitura não derivam da mesma página anterior; fila offline reenvia FIFO por leitura (RNF-ARQ-05, RNF-ERR-05).
- [ ] No mobile, registros feitos **offline** são enfileirados e reenviados ao voltar a conexão, sem duplicar (RNF-ERR-05).
- [ ] Cada registro **zera o contador de inatividade** da leitura (RN-05, integra [F-EST](feature-F-EST.md)).
- [ ] Data local é derivada do instante/fuso capturados automaticamente no dispositivo e preservada no reenvio offline (RN-18.2).
- [ ] `progresso.registrado` é gravado atomicamente na outbox e publicado com os campos necessários a DSF, STA e GAM.
- [ ] Operações validam **propriedade** da leitura (SEC-02).
- [ ] Registrar/exibir/excluir progresso funciona **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: propriedade, total de páginas, validação, cálculo/resumo, paginação, recálculo, fuso/data local, idempotência e POSTs concorrentes na mesma leitura (RNF-TST-02)
- [ ] Testes web/mobile cobrem estado, confirmação, paginação e indisponibilidade/timeout; mobile cobre a **fila offline** e reenvio com a mesma chave (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com os endpoints de progresso
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

## Pendências

- **Depende de** [F-EST](feature-F-EST.md) (leitura em andamento e máquina de estados; compartilham o serviço `leitura` — sinalizar no grupo antes de mexer, plano §6), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md).
- **Sessão de leitura cronometrada** (RF-PRG-05..12, RN-16) fica **fora** — é **F-SESSAO** (Período 2). A entrada de página desta feature é a mesma que a sessão usará ao encerrar; manter o contrato compatível.
- **Decisão da feature:** definir como progresso offline, capturado no dia correto e sincronizado depois, afeta streak e janelas já encerradas; distinguir esse caso de registro retroativo, que continua proibido por RN-18.
- Persistir a **data local** da atualização (RN-18.2) desde já, para a sequência diária (Período 2) não exigir retrabalho.
- Stack de `leitura` definida: **NestJS (TypeScript)** (arquitetura §2.1).

- **Prompts de tela em [`docs/design/periodo-1/F-PRG/`](../../design/periodo-1/F-PRG/):** `registrar-progresso.md` e `atualizacoes-de-progresso.md`. **RF-PRG-02 não tem prompt próprio:** a página atual e o percentual aparecem como barra de progresso em [`F-EST/estante.md`](../../design/periodo-1/F-EST/estante.md) e em [`F-ACV-BUSCA/pagina-do-livro.md`](../../design/periodo-1/F-ACV-BUSCA/pagina-do-livro.md), conforme a regra de recorte do [`docs/design/AGENTS.md`](../../design/AGENTS.md) §2.
- **Componentes que nascem no protótipo e ainda não estão na fonte:** o **aviso de registro enfileirado offline** (RNF-ERR-05; desenhado como linha em `ambar` no contexto, porque o design §7.6 proíbe toast com fundo saturado), a **linha de três valores com divisor vertical** (o §7.3 diz o que não fazer, mas não desenha a alternativa) e a **tabela de dados da web**, que o documento não tem em nenhuma seção. Incorporar ao `documento-de-design.md` pelo controle de mudança do plano §3.
- **A confirmação de exclusão de atualização informa o resultado do recálculo**, não uma frase genérica sobre irreversibilidade, porque é esse número que o leitor precisa para decidir (RN-17.4). Fixado na seção 8 de `atualizacoes-de-progresso.md`.

## Timeline

### Revisão 01/09/2026: `progresso.registrado` aprovado e ligado à outbox; chegada tardia da fila offline registrada para decisão do dono da feature.

### Revisão 28/08/2026: total de páginas passou a vir do contrato de `acervo`; resumo derivado, metadados automáticos de fuso/data local, concorrência, fila FIFO, listagem paginada, confirmação de exclusão, idempotência e testes foram explicitados.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-PRG no [periodo-1/README.md](README.md), de RF-PRG-01..04 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.4, da RN-17 e da arquitetura §5.1/§5.3. Entrada absoluta de página e valores derivados fixados; sessão cronometrada adiada ao Período 2; data local já persistida para o streak futuro.
