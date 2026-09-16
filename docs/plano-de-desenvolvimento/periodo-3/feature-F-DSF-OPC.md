# F-DSF-OPC — Histórico de janelas de desafio

**Período:** 3 · **Prioridade:** opcional
**Dono:** a definir · **Serviços afetados:** `leitura` (backend) + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.7 (RF-DSF-05), RN-20 (1, 6, 7, 8), RN-04, §2.1 (escopo web). Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Dar memória aos desafios de [F-DSF](../periodo-2/feature-F-DSF.md). Hoje o leitor vê apenas a janela corrente: no dia seguinte, a semana que ele cumpriu deixa de existir, e a "meta" — um dos três mecanismos do produto — não acumula prova nenhuma de constância. **Fora do escopo web** (§2.1: desafios não fazem parte do cliente Vue). Fecha o requisito **Opcional**:

- **RF-DSF-05** manter o **histórico de janelas concluídas** de cada desafio, indicando **cumprimento ou não**.

A feature **expõe o histórico** já persistido por F-DSF desde P2 para permitir recomposição offline (decisão do grupo incorporada em 15/09/2026). `janela_desafio` guarda configuração do período, acumulado, cumprimento e encerramento, inclusive nas janelas sem progresso. Nenhuma tabela, job, evento ou consumidor novo: a materialização é feita nos fluxos existentes e na consulta.

RNF atendidos: **RNF-SEC-02** (histórico exclusivo do dono), **RNF-SEC-12** (consulta parametrizada), **RNF-DES-02** (listagem paginada com limite do servidor), **RNF-ERR-06/07** (selagem idempotente no consumidor existente + DLQ), **RNF-ARQ-05** (concorrência resolvida no banco).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | reuso de snapshots e pausas retidos em F-DSF; nenhuma tabela nova |
| Backend | não iniciado | `leitura`: selagem da janela encerrada e listagem do histórico por desafio |
| Web | **não aplicável** | desafios estão **fora do escopo web** (`REQUISITOS.md` §2.1) |
| Mobile | não iniciado | histórico de janelas de cada desafio, com cumprimento |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). Valida **propriedade** (SEC-02). A feature não acrescenta escrita HTTP: a única mutação é a selagem, que ocorre dentro de fluxos que já existem.

**Selagem da janela encerrada (RF-DSF-05, RN-20.8)**

- Quando uma janela deixa de ser corrente, registra-se seu encerramento. Unidade, periodicidade, alvo e fuso históricos são preservados; `cumprida` compara acumulado com o alvo daquele snapshot. **O resultado é corrigível** por captura offline e correções de progresso autorizadas, sem reescrever a configuração histórica (RN-20.7/10).
- A selagem é **preguiçosa**: acontece quando chega uma contribuição posicionada em janela posterior — pelo **consumidor que F-DSF já mantém** — ou na consulta do histórico. **Sem job agendado e sem evento próprio**, na mesma disciplina que [F-GAM](../periodo-2/feature-F-GAM.md) usou para derivar o zeramento da sequência.
- A selagem e o recálculo são **idempotentes**: repetir o mesmo fato não duplica contribuição nem altera o resultado já convergido; captura tardia válida pode corrigir o resultado. Falhas seguem DLQ (RNF-ERR-06/07).
- **Imutabilidade (RN-20.7):** alterar unidade, janela ou valor-alvo recalcula **apenas a janela corrente**. Janela já selada **não é reescrita** por edição posterior do desafio — é essa garantia que dá sentido ao histórico.

**O que entra no histórico**

- Entram **todos os períodos encerrados desde a janela de criação**, inclusive sem contribuição: acumulado zero e não cumprido. Não criar períodos anteriores à janela de criação. Backfill da primeira janela considera os fatos já registrados nela (RN-20.2).
- Antes de editar a configuração, F-DSF materializa os períodos decorridos com a configuração anterior, incluindo vazios; a consulta não tenta reconstruí-los usando o desafio atual.
- A janela é posicionada pela **data local do fato** (RN-20.1), o mesmo critério de `contribuicao_desafio.data_local` que F-DSF já usa; o histórico não depende do fuso de quem consulta.
- **Pausa (RN-20.6):** registros capturados durante a pausa não contam, ainda que sincronizados depois. A janela corrente não é avaliada enquanto pausada; períodos encerrados sem progresso aparecem com zero e não cumpridos conforme RN-20.9. Retomar não inclui fatos da pausa.

**Listagem (RF-DSF-05)**

- **`GET /desafios/{id}/janelas?page=`** — janelas encerradas, mais recentes primeiro, com início, fim, unidade, periodicidade, meta, acumulado e cumprimento do snapshot histórico. Paginada com limite server-side e exclusiva do dono. A razão acumulado/meta nunca usa a configuração atual do desafio.
- **Excluir o desafio** (RF-DSF-04) remove seu histórico junto: sem o desafio não sobra superfície por onde acessar a listagem, e um histórico órfão só ocuparia espaço.

**Modelo de dados** (schema `leitura`): nenhuma tabela nova. Usa os snapshots, contribuições únicas por janela/fato e pausas retidas de F-DSF. O encerramento de uma janela não impede corrigir seu resultado pela chegada offline ou correção autorizada da origem.

**Recorte de período:** dados de recálculo, configuração histórica e cumprimento pertencem a F-DSF/P2; somente a listagem e a interface do histórico são P3. Cortar esta opcional não pode eliminar a correção offline aprovada.

**Eventos:** **nenhum evento novo**. A selagem é efeito local dentro do consumidor aprovado de F-DSF, coerente com o escopo enxuto do período: não se cria evento para separar funções internas ao mesmo serviço.

### App Flutter (`code/mobile`)

- **Histórico do desafio**: lista paginada das janelas seladas, mais recentes primeiro, com o intervalo, o acumulado e a marcação de **cumprida ou não** — visualmente distintas, sem depender só de cor (RNF-USA-03). Sem edição: o histórico é somente leitura. Usa `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md) (componente de progresso de [F-DSF](../periodo-2/feature-F-DSF.md)). Alvo de demonstração Android.

### Frontend Web (`code/front`)

- **Fora de escopo:** desafios não fazem parte do cliente web (`REQUISITOS.md` §2.1), como já registrado em [F-DSF](../periodo-2/feature-F-DSF.md). Registrado no Status e no DoD.

## Critérios de aceite

- [ ] Janela encerrada preserva configuração histórica; acumulado/cumprimento refletem correções offline idempotentes (RF-DSF-05, RN-20.10).
- [ ] A selagem ocorre **sem job e sem evento novo**, dentro do consumidor de `progresso.registrado`/`leitura.finalizada` que F-DSF já mantém.
- [ ] Reprocessar o mesmo fato não duplica efeitos; chegada tardia atualiza o resultado da janela original com seu snapshot e suas pausas; falhas seguem DLQ.
- [ ] Editar unidade, janela ou valor-alvo recalcula **só a janela corrente**; janelas seladas permanecem intactas (RN-20.7).
- [ ] Períodos sem progresso aparecem como não cumpridos; não existem períodos anteriores à janela de criação; pausa exclui fatos capturados em seu intervalo.
- [ ] A janela é posicionada pela **data local do fato** (RN-20.1) e o histórico independe do fuso de quem consulta.
- [ ] A listagem é **paginada com limite do servidor**, ordenada da mais recente para a mais antiga (RF-DSF-05, RNF-DES-02).
- [ ] O histórico é **exclusivo do dono** do desafio; terceiro com o id recebe negação (SEC-02).
- [ ] Excluir o desafio remove seu histórico (RF-DSF-04); a exclusão de conta o limpa por F-CONTA-2.
- [ ] Nenhuma tabela nova é criada — o histórico usa os snapshots de `janela_desafio` de F-DSF.
- [ ] O histórico funciona no app **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários/integração: snapshots após edição, vazios não cumpridos, pausas, criação no meio do período, conclusão pelo dia da ação, paginação, propriedade e exclusão do desafio
- [ ] Testes assíncronos: captura offline corrige histórico, duplicação não duplica contribuição, correção de origem usa o estado atual, retry/DLQ (RNF-TST-03)
- [ ] Testes mobile cobrem a lista de janelas, a marcação de cumprimento, o estado sem histórico e indisponibilidade/timeout com API simulada (RNF-TST-04/06)
- [ ] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com a listagem de janelas do desafio
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)) — **web N/A** (desafios fora do escopo web, §2.1); justificativa registrada aqui em vez de remover o item
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** validar que a interface usa unidade/periodicidade/meta do snapshot e distingue período sem progresso de histórico inexistente.

## Pendências

- **Depende de** [F-DSF](../periodo-2/feature-F-DSF.md) (desafios, janela corrente, consumidor de progresso/finalização, registro de pausas), [F-PRG](../periodo-1/feature-F-PRG.md) (`progresso.registrado` e a data local do fato), [F-EST](../periodo-1/feature-F-EST.md) (`leitura.finalizada`, RN-04), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md), [P0-MSG](../periodo-0/feature-P0-MSG.md).
- **Decisões encerradas em 15/09/2026:** snapshots aprovados; vazios aparecem como não cumpridos; pausas excluem fatos por ocorrência; offline corrige resultados encerrados. Exposição do histórico permanece P3, preservação necessária ao offline fica em P2.
- **Alternativa a avaliar, sem mudar o desenho atual:** a alternativa já registrada em [F-DSF](../periodo-2/feature-F-DSF.md) — calcular a janela corrente por consulta a progresso/leitura e persistir **apenas** os snapshots históricos — cai exatamente sobre esta feature; avaliar junto, não em separado.
- **Compartilha `leitura`** com as demais features de leitura — sinalizar no grupo (plano §6). Desafios e histórico são limpos por [F-CONTA-2](../periodo-2/feature-F-CONTA-2.md) na exclusão de conta.
- Stack de `leitura` definida: **NestJS (TypeScript)** (arquitetura §2.1).

## Timeline

### Revisão 15/09/2026: grupo aprovou configuração histórica, períodos vazios e correções offline. Substituído o recorte de apenas janelas com contribuição; encerramento não congela resultados contra sincronização legítima. Planejamento/DER atualizados; implementação não iniciada.

### Criação 01/09/2026: arquivo criado a partir do escopo de F-DSF-OPC no [periodo-3/README.md](README.md), de RF-DSF-05 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.7 e da RN-20 (1, 6, 7, 8). Histórico fixado como retenção e selagem de `janela_desafio`, que já existe para a janela corrente, com `cumprida` preenchido no encerramento; selagem preguiçosa dentro do consumidor aprovado de F-DSF, sem job, evento ou tabela nova. O recorte "só janelas com atividade" foi adotado e registrado para confirmação de quem implementar, e a ausência do alvo vigente na janela selada foi levantada como extensão de DER a propor pelo controle de mudança, sem migration antecipada.
