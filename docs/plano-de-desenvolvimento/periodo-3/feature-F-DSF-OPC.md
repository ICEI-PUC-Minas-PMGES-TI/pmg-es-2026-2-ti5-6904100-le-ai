# F-DSF-OPC — Histórico de janelas de desafio

**Período:** 3 · **Prioridade:** opcional
**Dono:** a definir · **Serviços afetados:** `leitura` (backend) + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.7 (RF-DSF-05), RN-20 (1, 6, 7, 8), RN-04, §2.1 (escopo web). Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Dar memória aos desafios de [F-DSF](../periodo-2/feature-F-DSF.md). Hoje o leitor vê apenas a janela corrente: no dia seguinte, a semana que ele cumpriu deixa de existir, e a "meta" — um dos três mecanismos do produto — não acumula prova nenhuma de constância. **Fora do escopo web** (§2.1: desafios não fazem parte do cliente Vue). Fecha o requisito **Opcional**:

- **RF-DSF-05** manter o **histórico de janelas concluídas** de cada desafio, indicando **cumprimento ou não**.

A feature **retém e expõe**; não modela do zero. A entidade `janela_desafio` já existe desde o Período 2, porque a janela corrente de RF-DSF-03 depende dela, e o campo **`cumprida` já está marcado como P3** no DER, com a anotação "histórico retido em DSF-05/P3". O que muda é que a janela deixa de ser descartada ao encerrar: passa a ser **selada** e listável. Nenhuma tabela nova, nenhum job novo, nenhum evento novo e nenhum consumidor adicional — a selagem viaja no consumidor de `progresso.registrado`/`leitura.finalizada` que F-DSF já tem, ambos **contratos aprovados** (arquitetura §5.2).

RNF atendidos: **RNF-SEC-02** (histórico exclusivo do dono), **RNF-SEC-12** (consulta parametrizada), **RNF-DES-02** (listagem paginada com limite do servidor), **RNF-ERR-06/07** (selagem idempotente no consumidor existente + DLQ), **RNF-ARQ-05** (concorrência resolvida no banco).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | retenção de `janela_desafio` + uso do campo `cumprida` (P3); nenhuma tabela nova |
| Backend | não iniciado | `leitura`: selagem da janela encerrada e listagem do histórico por desafio |
| Web | **não aplicável** | desafios estão **fora do escopo web** (`REQUISITOS.md` §2.1) |
| Mobile | não iniciado | histórico de janelas de cada desafio, com cumprimento |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). Valida **propriedade** (SEC-02). A feature não acrescenta escrita HTTP: a única mutação é a selagem, que ocorre dentro de fluxos que já existem.

**Selagem da janela encerrada (RF-DSF-05, RN-20.8)**

- Quando uma janela deixa de ser a corrente, ela é **selada**: o `acumulado` que tinha é congelado e `cumprida` recebe o resultado da comparação com o valor-alvo vigente **naquela janela** (RN-20.8 — cumprida quando o acumulado atinge o alvo, ainda que o registro que a completou pertença a leitura iniciada em janela anterior).
- A selagem é **preguiçosa**: acontece quando chega uma contribuição posicionada em janela posterior — pelo **consumidor que F-DSF já mantém** — ou na consulta do histórico. **Sem job agendado e sem evento próprio**, na mesma disciplina que [F-GAM](../periodo-2/feature-F-GAM.md) usou para derivar o zeramento da sequência.
- A selagem é **idempotente**: reprocessar o mesmo fato não sela duas vezes nem altera janela já selada; falha após o máximo de tentativas vai para **DLQ** sem travar a fila (RNF-ERR-06/07).
- **Imutabilidade (RN-20.7):** alterar unidade, janela ou valor-alvo recalcula **apenas a janela corrente**. Janela já selada **não é reescrita** por edição posterior do desafio — é essa garantia que dá sentido ao histórico.

**O que entra no histórico**

- Entram as janelas em que **houve contribuição** — que é como `janela_desafio` já nasce hoje, pelo vínculo com `contribuicao_desafio`. Janela sem nenhuma contribuição **não vira linha** e não aparece na listagem.
- **Consequência a declarar, não a esconder:** a listagem **não distingue** "janela vazia" de "o desafio ainda não existia", e a taxa de cumprimento lida do histórico fica **otimista**, porque o denominador ignora as janelas em branco. O ganho é não materializar linha especulativa — um desafio diário produziria cerca de 365 registros por ano, quase todos vazios. Ver Pendências: a escolha está registrada para **confirmação de quem for implementar**.
- A janela é posicionada pela **data local do fato** (RN-20.1), o mesmo critério de `contribuicao_desafio.data_local` que F-DSF já usa; o histórico não depende do fuso de quem consulta.
- **Pausa (RN-20.6):** desafio pausado não acumula e sua janela corrente não é avaliada. Com o recorte acima, uma janela inteiramente contida numa pausa simplesmente não gera linha e não é lançada como não cumprida.

**Listagem (RF-DSF-05)**

- **`GET /desafios/{id}/janelas?page=`** — janelas seladas do desafio, **mais recentes primeiro**, cada uma com início, fim, acumulado e **cumprida ou não**. **Paginada com limite imposto pelo servidor** (RNF-DES-02) e **exclusiva do dono** do desafio (SEC-02); id conhecido por terceiro retorna negação.
- **Excluir o desafio** (RF-DSF-04) remove seu histórico junto: sem o desafio não sobra superfície por onde acessar a listagem, e um histórico órfão só ocuparia espaço.

**Modelo de dados** (schema `leitura`): **nenhuma tabela nova**. Usa `janela_desafio` — já existente para a janela corrente — passando a **retê-la** após o encerramento e a preencher o campo `cumprida`, que o DER marca como P3. As constraints já previstas (`uma janela por desafio+intervalo`, `valor_alvo > 0`, `inicio <= fim`, contadores não negativos) sustentam a integridade do histórico sem regra adicional.

**Recorte de período a declarar:** `janela_desafio` é entidade do **Período 2** — RF-DSF-03 depende dela para a janela corrente. Do Período 3 são apenas **o campo `cumprida` e a retenção**. Sem esse recorte, RN-20.7 estaria mandando preservar um histórico que só existiria numa feature opcional, e o corte de F-DSF-OPC deixaria a regra sem referente.

**Eventos:** **nenhum evento novo**. A selagem é efeito local dentro do consumidor aprovado de F-DSF, coerente com o escopo enxuto do período: não se cria evento para separar funções internas ao mesmo serviço.

### App Flutter (`code/mobile`)

- **Histórico do desafio**: lista paginada das janelas seladas, mais recentes primeiro, com o intervalo, o acumulado e a marcação de **cumprida ou não** — visualmente distintas, sem depender só de cor (RNF-USA-03). Sem edição: o histórico é somente leitura. Usa `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md) (componente de progresso de [F-DSF](../periodo-2/feature-F-DSF.md)). Alvo de demonstração Android.

### Frontend Web (`code/front`)

- **Fora de escopo:** desafios não fazem parte do cliente web (`REQUISITOS.md` §2.1), como já registrado em [F-DSF](../periodo-2/feature-F-DSF.md). Registrado no Status e no DoD.

## Critérios de aceite

- [ ] Janela encerrada é **selada** com o acumulado congelado e `cumprida` conforme RN-20.8 (RF-DSF-05).
- [ ] A selagem ocorre **sem job e sem evento novo**, dentro do consumidor de `progresso.registrado`/`leitura.finalizada` que F-DSF já mantém.
- [ ] Reprocessar o mesmo fato **não sela duas vezes** nem altera janela já selada; falha repetida vai para **DLQ** sem travar a fila (RNF-ERR-06/07).
- [ ] Editar unidade, janela ou valor-alvo recalcula **só a janela corrente**; janelas seladas permanecem intactas (RN-20.7).
- [ ] Só janelas **com contribuição** entram no histórico; janela inteiramente pausada não é lançada como não cumprida (RN-20.6).
- [ ] A janela é posicionada pela **data local do fato** (RN-20.1) e o histórico independe do fuso de quem consulta.
- [ ] A listagem é **paginada com limite do servidor**, ordenada da mais recente para a mais antiga (RF-DSF-05, RNF-DES-02).
- [ ] O histórico é **exclusivo do dono** do desafio; terceiro com o id recebe negação (SEC-02).
- [ ] Excluir o desafio remove seu histórico (RF-DSF-04); a exclusão de conta o limpa por F-CONTA-2.
- [ ] Nenhuma tabela nova é criada — o histórico usa `janela_desafio` e o campo `cumprida`.
- [ ] O histórico funciona no app **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: selagem no encerramento, cumprida/não cumprida no limite exato do alvo, imutabilidade frente a edição do desafio, janela sem contribuição ausente do histórico, janela dentro de pausa, data local, paginação, propriedade e exclusão em cascata (RNF-TST-02)
- [ ] Testes assíncronos: selagem disparada pelo consumidor existente com entrega duplicada, reprocessamento e DLQ, sem segunda selagem nem alteração de janela já selada (RNF-TST-03)
- [ ] Testes mobile cobrem a lista de janelas, a marcação de cumprimento, o estado sem histórico e indisponibilidade/timeout com API simulada (RNF-TST-04/06)
- [ ] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com a listagem de janelas do desafio
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)) — **web N/A** (desafios fora do escopo web, §2.1); justificativa registrada aqui em vez de remover o item
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** levar ao grupo a **extensão de DER** descrita nas Pendências — selar o valor-alvo vigente junto da janela — e registrar na Timeline a confirmação (ou a troca) do recorte "só janelas com atividade" por quem implementar a feature.

## Pendências

- **Depende de** [F-DSF](../periodo-2/feature-F-DSF.md) (desafios, janela corrente, consumidor de progresso/finalização, registro de pausas), [F-PRG](../periodo-1/feature-F-PRG.md) (`progresso.registrado` e a data local do fato), [F-EST](../periodo-1/feature-F-EST.md) (`leitura.finalizada`, RN-04), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md), [P0-MSG](../periodo-0/feature-P0-MSG.md).
- **Decisões do dono — recorte do histórico, pendente de confirmação de quem implementar:** o desenho acima registra **apenas janelas com contribuição**. A alternativa é materializar **todas** as janelas decorridas, inclusive as vazias como não cumpridas, o que dá uma taxa de cumprimento honesta e um calendário sem buracos, ao custo de linha especulativa (cerca de 365 por ano num desafio diário) e de uma regra explícita para janelas anteriores à criação do desafio. Confirmar antes de implementar.
- **Extensão de DER proposta — alvo vigente na janela:** `janela_desafio` guarda `inicio`, `fim`, `acumulado` e `cumprida`, mas **não** o valor-alvo daquela janela. Como editar o desafio altera o alvo (RF-DSF-04), renderizar a razão "acumulado/alvo" a partir do alvo **atual** falsificaria retroativamente o histórico que RN-20.7 manda preservar. O booleano `cumprida` sozinho já atende à letra de RF-DSF-05; exibir a razão exige selar também o alvo. Propor o campo pelo controle de mudança (plano §3) e **não migrar antes da decisão**; até lá, a listagem mostra cumprimento sem a razão.
- **Decisão do dono herdada de F-DSF:** tratamento de pausa que começa numa janela e termina em outra, ou que atravessa mudança de fuso. Afeta quais janelas chegam a ser seladas.
- **Recorte de período de `janela_desafio`:** a entidade é do Período 2 (janela corrente de RF-DSF-03); só `cumprida` e a retenção são do Período 3. Confirmar essa leitura com o dono de F-DSF para que o corte desta feature não deixe RN-20.7 sem referente.
- **Alternativa a avaliar, sem mudar o desenho atual:** a alternativa já registrada em [F-DSF](../periodo-2/feature-F-DSF.md) — calcular a janela corrente por consulta a progresso/leitura e persistir **apenas** os snapshots históricos — cai exatamente sobre esta feature; avaliar junto, não em separado.
- **Compartilha `leitura`** com as demais features de leitura — sinalizar no grupo (plano §6). Desafios e histórico são limpos por [F-CONTA-2](../periodo-2/feature-F-CONTA-2.md) na exclusão de conta.
- Stack de `leitura` definida: **NestJS (TypeScript)** (arquitetura §2.1).

## Timeline

### Criação 01/09/2026: arquivo criado a partir do escopo de F-DSF-OPC no [periodo-3/README.md](README.md), de RF-DSF-05 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.7 e da RN-20 (1, 6, 7, 8). Histórico fixado como retenção e selagem de `janela_desafio`, que já existe para a janela corrente, com `cumprida` preenchido no encerramento; selagem preguiçosa dentro do consumidor aprovado de F-DSF, sem job, evento ou tabela nova. O recorte "só janelas com atividade" foi adotado e registrado para confirmação de quem implementar, e a ausência do alvo vigente na janela selada foi levantada como extensão de DER a propor pelo controle de mudança, sem migration antecipada.
