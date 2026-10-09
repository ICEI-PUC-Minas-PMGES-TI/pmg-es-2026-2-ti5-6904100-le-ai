# F-GAM — Sequência diária (streak)

**Período:** 2 · **Prioridade:** desejavel
**Dono:** Vicenzo Fonseca · **Serviços afetados:** `leitura` (backend) + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.12 (RF-GAM-01, 02, 03), RN-18, §2.1. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar a **sequência diária de leitura (streak)** — o mecanismo de hábito que recompensa dias com leitura efetiva. **Fora do escopo web** (§2.1: gamificação não faz parte do cliente Vue). Fecha os requisitos **Desejáveis**:

- **RF-GAM-01** manter a **sequência diária**, incrementada em cada dia com registro de progresso (RN-18);
- **RF-GAM-02** visualizar a **sequência atual** e a **maior sequência já alcançada**;
- **RF-GAM-03** **zerar** a sequência quando um dia se encerra sem registro de progresso.

RNF atendidos: **RNF-ARQ-06** (atualização por fluxo assíncrono), **RNF-ERR-06/07** (consumidor idempotente + DLQ), **RNF-SEC-02** (dados do próprio usuário), **RNF-SEC-32** (schema de mensagem).

O escopo de gamificação é **só o streak** (mais os desafios de [F-DSF](feature-F-DSF.md)): **medalhas e ranking estão fora** (§11).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | concluído (baseline DER) | `leitura.dia_leitura` e `leitura.sequencia_leitura` já estavam na migration `0001_..._modelo_der`, inclusive com o último fuso e seu instante de referência; **sem migration nova**. Fila `leai.leitura.metricas` (+ `.dlq`) declarada pelo runtime de P0-MSG |
| Backend | implementado (08/10/2026) | `GET /me/sequencia`, consumidor de métricas `leitura.metricas` de `progresso.registrado`, recálculo na exclusão de trecho, zeramento derivado na consulta, backfill `npm run backfill:sequencia` |
| Web | não aplicável | **fora do escopo web** (§2.1) |
| Mobile | implementado (08/10/2026) | bloco "Sequência diária" no Meu perfil, com o componente de streak que P0-DS não construiu |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). Só os dados do **próprio usuário** (SEC-02).

- **Atualização (RF-GAM-01):** consome `progresso.registrado`, contrato aprovado, e marca o dia usando a data local persistida por F-PRG, com schema, idempotência e DLQ.
- **`GET /me/sequencia`** (RF-GAM-02) — **sequência atual** e **maior já alcançada**.

**Regras de RN-18:**
- Um dia **conta** quando há **≥1 atualização de progresso com ≥1 página lida** (RN-18.1) — concluir/iniciar/abandonar **não** conta por si.
- Contada em **dias de calendário no fuso do dispositivo** no momento do registro (RN-18.2).
- Incrementa **no máximo 1×/dia**, independentemente de quantas atualizações (RN-18.3).
- **Zerada (RF-GAM-03, RN-18.4)** quando um dia de calendário **se encerra sem registro**. Capturas offline sincronizadas depois recompõem os dias e recalculam a sequência atual e a maior; não há compensação por dia sem leitura nem registro manual retroativo.
- **Maior sequência preservada** (RN-18.6), ainda que a atual zere.
- Medida em **dias com leitura**, nunca em tempo (RN-18.7).

**Zeramento — implementação enxuta:** é derivado ao consultar/atualizar a sequência, sem job novo. O serviço compara o último dia com leitura ao dia corrente calculado no **último fuso registrado pelo dispositivo**; havendo dia vazio, a atual é 0 e a maior permanece. Novo progresso atualiza o fuso conhecido. Isso usa apenas os dados persistidos por F-PRG e não depende do fuso de quem consulta.

**Modelo de dados** (schema `leitura`): dias com leitura por usuário (data local), último fuso do dispositivo, sequência atual e maior sequência. Sem leitura cruzada de outro schema.

**Chegada tardia e correções:** derivar os dias qualificáveis dos progressos atuais, inclusive depois de edição/exclusão permitida. Captura antiga sincronizada depois não substitui o último fuso por um fuso obsoleto: persistir também o instante de referência do último fuso. Recalcular as sequências pelas datas ordenadas; não simplesmente incrementar um contador por chegada de mensagem.

### App Flutter (`code/mobile`)

- Exibe a **sequência atual** e a **maior alcançada**; usa `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md) (componente de streak). Alvo de demonstração Android.

## Critérios de aceite

- [x] Um dia conta para a sequência só com **≥1 progresso com ≥1 página lida** (RN-18.1); concluir/iniciar/abandonar não conta.
- [x] A sequência usa **data local** do dispositivo (RN-18.2) e incrementa **1×/dia** no máximo (RN-18.3).
- [x] A sequência zera sem registro, mas sincronização offline recompõe os dias e a sequência atual/maior sem duplicação; continua proibida criação manual retroativa (RN-18.5).
- [x] **Sequência atual** e **maior alcançada** aparecem corretamente; a maior é preservada quando a atual zera (RF-GAM-02, RN-18.6).
- [x] Consumo é idempotente e cobre retentativa/DLQ.
- [x] Zeramento derivado usa o último fuso registrado e não cria job próprio.
- [ ] A sequência funciona no app **em DES**. Entra no merge de fechamento do Período 2; antes de o binding subir, rodar o backfill no DES.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, mobile) mergeado em `desenvolvimento` (hoje na `vicenzo-features`)
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md)): localmente, lint, `tsc`, 221 testes unitários e 226 de integração do `leitura`; `flutter analyze` e 572 testes do mobile, todos verdes
- [x] Testes unitários e de integração com banco real/container: página lida, 1×/dia, mudança/último fuso, zeramento por dia vazio, maior sequência e idempotência (RNF-TST-02). Ficam em `src/sequencia/dominio/sequencia.spec.ts` e `test/integracao/sequencia.int-spec.ts`
- [x] Testes cobrem consumo duplicado, retentativa e DLQ (RNF-TST-02/03)
- [x] Testes mobile cobrem exibição da sequência e indisponibilidade/timeout com API simulada (RNF-TST-04/06), em `test/features/sequencia/sequencia_test.dart`
- [x] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com o endpoint de sequência
- [x] Catálogo de mensageria atualizado: consumidor `leitura.metricas` de `progresso.registrado` em `docs/mensageria/catalogo.md`
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)). Entra no merge de fechamento do Período 2
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver (ver [Divergências](#divergências))

## Implementação (08/10/2026)

**Backend (`code/back/leitura`):**
- **`src/sequencia/`:** `SequenciaService.recalcular(tx, usuarioId)` reconstrói `dia_leitura` e `sequencia_leitura` a partir das datas locais dos progressos atuais do leitor; nunca incrementa contador por mensagem.
  - O recálculo é serializado por leitor com `pg_advisory_xact_lock`.
  - O último fuso é o da captura mais recente no dispositivo (`registrado_em_dispositivo`), não o da última a chegar: uma captura offline antiga não troca o fuso conhecido.
  - O zeramento (RN-18.4) é derivado na consulta, em `dominio/sequencia.ts` (`sequenciaVigente`): a atual vale enquanto o último dia com leitura for hoje ou ontem no último fuso registrado; depois disso é 0, e a maior permanece.
- **`GET /me/sequencia`:** responde `{ sequenciaAtual, maiorSequencia, ultimoDiaComLeitura }`, só do próprio leitor. Sem progresso, `0/0/null`.
- **`src/metricas/`:** `ProgressoRegistradoConsumer` (`leitura.metricas`, fila `leai.leitura.metricas` no exchange do próprio `leitura`). Valida o `data` (SEC-32) e recalcula no `tx` do recibo.
  - É o consumidor de métricas único previsto no [README do P2](README.md): F-DSF e F-STA acrescentam o efeito delas e a routing key `leitura.finalizada`.
  - Mensagem atrasada de um progresso já excluído só recalcula o estado atual, então não o ressuscita.
- **Exclusão de trecho** (`ProgressoService.excluirTrecho`) recalcula no mesmo `tx`, sem evento (como pede F-PRG).
- **Backfill:** `npm run backfill:sequencia` (`node dist/sequencia/backfill.js` no build). É idempotente e recompõe todo leitor com progresso ou com sequência gravada.

**Mobile (`code/mobile`):**
- `features/sequencia/` traz `SequenciaService` e `SequenciaDoPerfil`, ligados ao Meu perfil por `PerfilPage.sequencia`.
- O bloco entra depois dos contadores e dos pedidos, a 24 deles e a 32 das seções de leitura.
- Tem skeleton de 104 px (também no skeleton da página), banner próprio de falha com "Tentar de novo" e recarga silenciosa 3 s depois de cada `ProgressoService.alteracoes`. A espera existe porque o registro chega à sequência pelo consumo assíncrono.
- O componente é `design/widgets/cartao_de_sequencia.dart`. Foi conferido contra o protótipo com as fontes reais, no claro e no escuro, com sequência ativa e zerada.

## Divergências

- **Cor do número e da chama no tema claro: `musgo`, não `broto`.** Decisão do dono em 08/10/2026.
  - O §4.8 do design e o protótipo pedem `broto` (`#8AA274`), que sobre `papel-elevado` dá 2,31:1, abaixo do 3:1 de texto grande. `musgo` dá 6,15:1. É o mesmo desvio das colunas de F-STA (`estatisticas.md`).
  - No escuro segue `broto-vivo`.
  - Vive em `theme.streakColor` (`theme_extras.dart`).
  - O `documento-de-design.md` não foi alterado; ver pendência.
- **Artboard "Sequência zerada, recorde mantido":** o protótipo mostra `Recorde: 0`, mas `meu-perfil.md` §5.3 e a RN-18.6 mantêm o recorde. A implementação mostra o recorde que vier do servidor; com a atual zerada, segue o valor real.
- **Plural:** o protótipo só mostra plurais. Com 1, o texto fica "1 dia seguido" e "Recorde: 1 dia".
- **Recorde num texto só:** a linha "Recorde: N dias" é um texto único, para quebrar em tela estreita em vez de transbordar. O visual é o mesmo do protótipo.

## Pendências

- **Telas (design P2):** streak (§4.8, só mobile, recorde mantido com a sequência zerada) na edição consolidada [`meu-perfil.md`](../../design/periodo-2/meu-perfil/meu-perfil.md) ([protótipo](../../design/periodo-2/meu-perfil/prototipos/meu-perfil.html)), prompt escrito e protótipo exportado em 29/09/2026. Lembrete de sequência (RF-GAM-05) fica para o P3 com o push. **Conflito `broto` × 3:1:** resolvido na implementação com `musgo` no claro (ver [Divergências](#divergências)). Falta o grupo decidir se o §4.8 do `documento-de-design.md` passa a dizer `musgo`; até lá, fica a divergência registrada.
- **Remoção da estante não recalcula a sequência** (decisão do dono, 08/10/2026). Remover um livro da estante apaga em cascata a leitura e os progressos dele, mas a F-GAM não se pendura nesse caminho, que é da F-EST. Até o próximo progresso registrado ou trecho excluído pelo leitor, `GET /me/sequencia` mostra os valores antigos. No recálculo seguinte, os dias que vinham só daquele livro deixam de contar, porque a apuração sempre parte dos progressos atuais.
- **Backfill antes do binding no DES:** `progresso.registrado` era publicado sem fila. No merge de fechamento do P2, rodar `npm run backfill:sequencia` no `leitura` do DES (antes ou junto da primeira subida do consumidor) para recompor quem registrou progresso antes. Localmente vale o mesmo para o banco de dev.
- **Componente de streak:** a F-GAM construiu o componente de §4.8 (`CartaoDeSequencia`), que [P0-DS](../periodo-0/feature-P0-DS.md) deixou para depois.
- **Depende de** [F-PRG](../periodo-1/feature-F-PRG.md) (`progresso.registrado` **com data local persistida** — RN-18.2), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md), [P0-MSG](../periodo-0/feature-P0-MSG.md).
- **Decisão do grupo incorporada em 15/09/2026:** sincronização recompõe a sequência pelas datas capturadas; testar múltiplos dias, mudança de fuso e correção/exclusão do progresso. Nenhuma tabela de sessão remota é necessária.
- **Alternativa a avaliar, sem mudar o desenho atual:** derivar sequência diretamente das datas locais de progresso e adicionar cache apenas se houver necessidade medida.
- **Fronteira:** **calendário de dias com progresso** (RF-GAM-04) e **lembrete push** (RF-GAM-05, depende de push/P-04) são Opcionais → **F-GAM-OPC** (Período 3).
- **Compartilha `leitura`** com as demais features de leitura — sinalizar no grupo (plano §6). A sequência é limpa por [F-CONTA-2](feature-F-CONTA-2.md) na exclusão.
- Stack de `leitura` definida: **NestJS (TypeScript)** (arquitetura §2.1).

## Timeline

### Implementação 08/10/2026: backend e mobile implementados na `vicenzo-features`, depois de trazer a `desenvolvimento`.
- O consumidor de métricas `leitura.metricas` nasce aqui e serve depois a DSF e STA.
- Sem migration nova: as tabelas são da baseline DER.
- Decisões do dono: `musgo` no lugar de `broto` no tema claro (contraste) e remoção da estante sem recálculo imediato.
- Testes verdes localmente. Falta o merge em `desenvolvimento` e, no fechamento do período, o DES com o backfill.

### Revisão 15/09/2026: recomposição offline aprovada, inclusive após zeramento; critérios e modelo temporal ajustados. Implementação permanece não iniciada.

### Revisão 01/09/2026: `progresso.registrado` aprovado; chegada tardia offline registrada para decisão do dono e derivação direta mantida apenas como alternativa de avaliação.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-GAM no [periodo-2/README.md](README.md), de RF-GAM-01/02/03 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.12 e da RN-18. Streak medido em dias com leitura pela data local de F-PRG; consumo de `progresso.registrado` marcado como fluxo candidato de §7.2 (pendência de baseline); calendário e lembrete push adiados ao Período 3.

### Revisão 29/08/2026: zeramento foi simplificado para derivação no próprio serviço usando dias locais e o último fuso registrado; não há job novo. Calendário e lembrete continuam no Período 3.

### Dono 29/09/2026: feature atribuída a **Vicenzo Fonseca** na [divisão do Período 2](README.md#divisão-do-período-2-entre-5-pessoas).
