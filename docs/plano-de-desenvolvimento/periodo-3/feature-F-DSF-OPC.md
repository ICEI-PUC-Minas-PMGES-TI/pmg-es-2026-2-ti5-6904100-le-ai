# F-DSF-OPC — Histórico de janelas de desafio

**Período:** 3 · **Prioridade:** opcional
**Dono:** Vicenzo Fonseca · **Serviços afetados:** `leitura` (backend) + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.7 (RF-DSF-05), RN-20 (1, 6, 7, 8), RN-04, §2.1 (escopo web). Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Dar memória aos desafios de [F-DSF](../periodo-2/feature-F-DSF.md). Hoje o leitor vê apenas a janela corrente: no dia seguinte, a semana que ele cumpriu deixa de existir, e a "meta" — um dos três mecanismos do produto — não acumula prova nenhuma de constância. **Fora do escopo web** (§2.1: desafios não fazem parte do cliente Vue). Fecha o requisito **Opcional**:

- **RF-DSF-05** manter o **histórico de janelas concluídas** de cada desafio, indicando **cumprimento ou não**.

A feature **expõe o histórico** já persistido por F-DSF desde P2 para permitir recomposição offline (decisão do grupo incorporada em 15/09/2026). `janela_desafio` guarda configuração do período, acumulado, cumprimento e encerramento, inclusive nas janelas sem progresso. Nenhuma tabela, job, evento ou consumidor novo: a materialização é feita nos fluxos existentes e na consulta.

RNF atendidos: **RNF-SEC-02** (histórico exclusivo do dono), **RNF-SEC-12** (consulta parametrizada), **RNF-DES-02** (listagem paginada com limite do servidor), **RNF-ERR-06/07** (selagem idempotente no consumidor existente + DLQ), **RNF-ARQ-05** (concorrência resolvida no banco).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | concluído (baseline DER) | reuso de snapshots e pausas retidos em F-DSF; **nenhuma tabela nem migration nova** |
| Backend | implementado (07/11/2026) | `leitura`: `GET /desafios/{id}/janelas`, com a selagem pela materialização da consulta e a pausa de cada janela |
| Web | **não aplicável** | desafios estão **fora do escopo web** (`REQUISITOS.md` §2.1) |
| Mobile | implementado (07/11/2026) | `code/mobile/lib/features/desafios/`: tela `Histórico` e item `Ver histórico` no menu do card |

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

## Implementação do backend (07/11/2026)

Na `vicenzo-features`, em cima da `desenvolvimento` com o Período 2 fechado. Módulo `src/desafios/` de F-DSF, sem módulo novo.

- **Rota:** `GET /desafios/{desafioId}/janelas?page=&limite=` (`listarJanelasDesafio`), paginada como `GET /desafios`: página base 1, limite padrão 20 e teto 50 no servidor, `page` e `limite` fora da faixa são 400.
- **Propriedade:** desafio inexistente ou de outra pessoa é **404**, como nas escritas de F-DSF. A conferência vem antes da materialização: o id de outra pessoa não cria janela nenhuma.
- **Selagem:** a consulta chama a mesma materialização da listagem (`materializarSePreciso`, extraído de `listar`). A janela que terminou desde a última leitura é encerrada e recomposta ali, sem job e sem evento. O consumidor de métricas de F-DSF continua selando quando chega fato de janela posterior; nada mudou nele.
- **Ordem:** `inicio` desc, depois `fim` desc e `id`, para a ordem ser estável quando uma edição de periodicidade deixa janelas de tamanhos diferentes começando no mesmo dia.
- **Pausa por janela (contrato novo, decisão do dono em 07/11/2026):** cada janela traz `pausa: inteira | parcial | nenhuma`, calculada no SQL cruzando `pausa_desafio` com o intervalo da janela no fuso dela (da meia-noite do primeiro dia à meia-noite seguinte ao último). `inteira` exige **uma** pausa cobrindo tudo; pausar e retomar dentro da janela é `parcial`, porque houve um intervalo em que o desafio contou. Sem o campo, a semana pausada ficaria igual à semana vazia, que é justamente o que o protótipo quer separar.
- **Resposta:** `inicio`, `fim`, `unidade`, `periodicidade`, `valorAlvo`, `acumulado`, `cumprida` e `pausa`, todos do snapshot da janela (RN-20.7). A data de criação do rodapé vem do próprio `Desafio`, que o app já tem.
- **Testes:** 11 casos novos em `test/integracao/desafios.int-spec.ts` (bloco `histórico de janelas`): ordem e vazias não cumpridas desde a janela de criação, janela recém-terminada selada pela consulta, lista vazia, snapshot após edição com captura offline tardia corrigindo a janela antiga pelo consumidor, pausa inteira/parcial/nenhuma, pausa aberta, pausar e retomar dentro da janela, paginação e teto, 401/400/404 sem materializar e exclusão levando o histórico. Duplicata, retry e DLQ do consumidor são os de F-DSF no mesmo arquivo: o caminho de selagem é o mesmo. Rodada completa: lint, build, 290 unitários e 372 de integração (Postgres 17 descartável), sem falha.

## Implementação do mobile (07/11/2026)

- **Entrada:** `Ver histórico` no topo do menu do card, no ativo e no pausado (`ClockCounterClockwise`, uma linha só, rótulo acessível `Ver histórico do desafio <título>`), conforme a edição consolidada `desafios.md` de P3. `DesafiosPage.aoVerHistorico` é obrigatório.
- **Rota:** `/perfil/desafios/:id/historico` (`rotaHistoricoDoDesafio`), com o `Desafio` por `extra`, como a edição: o contrato não tem `GET /desafios/{id}`. Sem `extra` (link direto), volta para a lista.
- **Tela** (`historico_do_desafio_page.dart`): header com o título do desafio (número em mono) e `Histórico` ou `Histórico · Pausado desde …`; grupos por mês (diárias e semanais, pelo dia em que a janela começa), por ano (mensais) ou sem grupo (anuais), com o cabeçalho preso ao topo por `SliverMainAxisGroup` + `PinnedHeaderSliver`; linha de janela com `CheckCircle` fill ou `Circle` e a palavra, barra sobre a meta da própria janela, fração com unidade e a linha de pausa; marca de mudança derivada no cliente entre vizinhas (unidade, período, meta, nessa ordem); rodapé de criação no fim da lista; vazio que diz quando a janela corrente fecha; esqueleto, aviso de serviço iniciando depois de 3 s, banner de erro e de sem conexão, e a linha de falha ao carregar mais no fim da lista. Carregar mais por rolagem, sem botão; se a primeira página não enche a tela, a seguinte é pedida sozinha. `Mais janelas carregadas` é anunciado sem mover o foco.
- **Estado** (`historico_do_desafio.dart`): `HistoricoDoDesafio`, no molde de `ListaPaginada`, mas guardando o tipo da falha (sem rede × servidor), que a tela precisa para escolher o banner. `agruparHistorico` monta grupos e marcas a partir da lista acumulada, então a comparação atravessa páginas.
- **Textos** em `textos_do_historico.dart`; modelo `JanelaEncerrada`/`PausaDaJanela` e `DesafiosService.listarJanelas` em `desafios_service.dart`.
- **Mudou no que é compartilhado:** `CabecalhoTela` ganhou `conteudoDoTitulo` e `subtitulo`, opcionais (com eles o header cresce até duas linhas de título; sem eles, nada muda); `BannerAviso` ganhou `iconeNaCorDaVariante`, para o `WifiSlash` em `ambar`. A barra do card virou `BarraDeProgressoDeDesafio` (sem semântica) por baixo de `BarraDoDesafio`, para a linha do histórico usar a mesma barra.
- **Testes:** `historico_do_desafio_test.dart` (textos, agrupamento, controlador, serviço) e `historico_do_desafio_page_test.dart` (lista, marcação, pausa × vazia, rodapé, cabeçalho preso, carregar mais e falha nele, vazio, pausado, erro, timeout, sem rede, esqueleto e serviço iniciando, semântica, fonte grande, escuro), mais os casos do menu em `desafios_page_test.dart` e da rota em `rotas_desafios_test.dart`. Suíte inteira: 943 testes, `flutter analyze` limpo.
- **Conferência visual:** sem `/dev/kvm` no WSL o emulador não sobe; a tela foi renderizada em PNG por um teste temporário com as fontes reais (Manrope, Space Grotesk, JetBrains Mono, Phosphor) e comparada com os artboards 4.1, 4.2, 4.4, 4.8, 4.9, 6.1 e o menu 4.2 de `desafios`, exportados com Playwright. Diferenças restantes em Divergências.

## Critérios de aceite

- [x] Janela encerrada preserva configuração histórica; acumulado/cumprimento refletem correções offline idempotentes (RF-DSF-05, RN-20.10).
- [x] A selagem ocorre **sem job e sem evento novo**, dentro do consumidor de `progresso.registrado`/`leitura.finalizada` que F-DSF já mantém (e na consulta do histórico).
- [x] Reprocessar o mesmo fato não duplica efeitos; chegada tardia atualiza o resultado da janela original com seu snapshot e suas pausas; falhas seguem DLQ.
- [x] Editar unidade, janela ou valor-alvo recalcula **só a janela corrente**; janelas seladas permanecem intactas (RN-20.7).
- [x] Períodos sem progresso aparecem como não cumpridos; não existem períodos anteriores à janela de criação; pausa exclui fatos capturados em seu intervalo.
- [x] A janela é posicionada pela **data local do fato** (RN-20.1) e o histórico independe do fuso de quem consulta.
- [x] A listagem é **paginada com limite do servidor**, ordenada da mais recente para a mais antiga (RF-DSF-05, RNF-DES-02).
- [x] O histórico é **exclusivo do dono** do desafio; terceiro com o id recebe negação (SEC-02).
- [x] Excluir o desafio remove seu histórico (RF-DSF-04); a exclusão de conta o limpa por F-CONTA-2.
- [x] Nenhuma tabela nova é criada — o histórico usa os snapshots de `janela_desafio` de F-DSF.
- [ ] O histórico funciona no app **em DES** — entra no merge de fechamento do Período 3.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [x] Testes unitários/integração: snapshots após edição, vazios não cumpridos, pausas, criação no meio do período, conclusão pelo dia da ação, paginação, propriedade e exclusão do desafio (conclusão pelo dia da ação e criação no meio do período seguem cobertas pelos testes de F-DSF, que alimentam as mesmas janelas)
- [x] Testes assíncronos: captura offline corrige histórico, duplicação não duplica contribuição, correção de origem usa o estado atual, retry/DLQ (RNF-TST-03) (a captura tardia está no bloco do histórico; duplicata, exclusão de trecho, retry e DLQ são os de F-DSF, sobre o mesmo consumidor)
- [x] Testes mobile cobrem a lista de janelas, a marcação de cumprimento, o estado sem histórico e indisponibilidade/timeout com API simulada (RNF-TST-04/06)
- [x] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com a listagem de janelas do desafio
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)) — **web N/A** (desafios fora do escopo web, §2.1); justificativa registrada aqui em vez de remover o item. Entra no merge de fechamento do Período 3.
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver

**Item próprio:** validar que a interface usa unidade/periodicidade/meta do snapshot e distingue período sem progresso de histórico inexistente. **Feito:** a linha usa só o snapshot da janela (`130 de 120 minutos` numa semana de agosto) e o vazio (`Nenhum ano encerrado ainda`) é outra tela, diferente da janela com zero.

## Pendências

- **Telas (design P3):** lote 1, prompt escrito em 11/10/2026: [`historico-do-desafio.md`](../../design/periodo-3/F-DSF-OPC/historico-do-desafio.md) ([protótipo](../../design/periodo-3/F-DSF-OPC/prototipos/historico-do-desafio.html)) (só mobile, janelas encerradas paginadas, vazias como não cumpridas, meta alterada sinalizada). Entrada pelo item `Ver histórico` no menu do card, na edição consolidada [`desafios.md`](../../design/periodo-3/desafios/desafios.md) ([protótipo](../../design/periodo-3/desafios/prototipos/desafios.html)) (lote 3, prompt escrito em 11/10/2026, item no topo do menu com `ClockCounterClockwise`). Contratos a confirmar: pausa por janela e data de criação do desafio na listagem de janelas. Protótipos exportados em 21/10/2026. **Contratos resolvidos em 07/11/2026:** a pausa por janela entrou na listagem (`pausa`); a data de criação vem do `Desafio` que abre a tela.
- **Depende de** [F-DSF](../periodo-2/feature-F-DSF.md) (desafios, janela corrente, consumidor de progresso/finalização, registro de pausas), [F-PRG](../periodo-1/feature-F-PRG.md) (`progresso.registrado` e a data local do fato), [F-EST](../periodo-1/feature-F-EST.md) (`leitura.finalizada`, RN-04), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md), [P0-MSG](../periodo-0/feature-P0-MSG.md).
- **Decisões encerradas em 15/09/2026:** snapshots aprovados; vazios aparecem como não cumpridos; pausas excluem fatos por ocorrência; offline corrige resultados encerrados. Exposição do histórico permanece P3, preservação necessária ao offline fica em P2.
- **Alternativa a avaliar, sem mudar o desenho atual:** a alternativa já registrada em [F-DSF](../periodo-2/feature-F-DSF.md) — calcular a janela corrente por consulta a progresso/leitura e persistir **apenas** os snapshots históricos — cai exatamente sobre esta feature; avaliar junto, não em separado.
- **Compartilha `leitura`** com as demais features de leitura — sinalizar no grupo (plano §6). Desafios e histórico são limpos por [F-CONTA-2](../periodo-2/feature-F-CONTA-2.md) na exclusão de conta.
- Stack de `leitura` definida: **NestJS (TypeScript)** (arquitetura §2.1).
- **Propostas do prompt adotadas na implementação, a ratificar pelo grupo:** agrupamento por mês (diárias e semanais, pelo dia em que a semana começa) e por ano (mensais), anuais sem grupo; marca de mudança derivada no cliente; sem total de janelas cumpridas; correção tardia sem aviso.
- **Incorporação ao `documento-de-design.md`** dos componentes que nasceram no prompt (linha de janela encerrada, marcação de resultado em dois desenhos, marca de mudança, rodapé de criação, banner de sem conexão e linha de falha ao carregar mais): controle de mudança, não feito aqui.

## Divergências protótipo × implementação

- **Pausa `inteira` é por instante, não por dia.** O mock diz `pausado durante toda a semana` para a semana de 17 a 23/08 com a pausa começando na própria segunda. Pelo contrato, a semana só é `inteira` se a pausa já valia à meia-noite de segunda; pausada às 9 h, sai `Desafio pausado em parte desta semana`, porque o que foi registrado de madrugada contou. Decisão do dono (07/11/2026): a linha não pode afirmar uma pausa que não houve.
- **Marca de mudança na troca de grupo:** o protótipo só desenha a marca dentro do mesmo grupo. Quando a mudança cai entre grupos, ela fecha o grupo da janela nova, antes do cabeçalho seguinte.
- **Semana que atravessa o ano** sai como `29 de dezembro a 4 de janeiro`, sem ano: o protótipo não desenha o caso, e o grupo já diz o ano.
- **Vazio:** usa o `EstadoVazio` do design system, com o ícone e o título dele (ícone um pouco maior e título na fonte de display); os números do texto (`2026`, `1º`, `2027`) não saem em mono, porque o componente só aceita texto simples.
- **`Tentar de novo` da falha ao carregar mais** é o `BotaoTextual`, com o padding interno dele: fica alguns pixels antes da margem direita, onde o protótipo o encosta.
- **Números mono dentro do nome da janela** saem no peso 500 do JetBrains Mono, não no 600 do protótipo: o `google_fonts` fixa a família no peso de origem do `num-inline`, e o `copyWith` de peso não troca a fonte. É o mesmo do título dos cards de F-DSF.
- **Header sem divisor** mesmo com a lista rolando por baixo, a mesma simplificação da lista de Desafios (`semDivisor`).
- **Conferência sem aparelho:** a comparação foi feita com a tela renderizada em teste, com as fontes reais, e não no emulador (sem KVM no WSL). Falta ver no Android antes do fechamento do período.

## Timeline

### Implementação 07/11/2026: backend e mobile implementados na `vicenzo-features`, sobre a `desenvolvimento` com o Período 2 fechado (inclui a F-MOD-OPC).

`GET /desafios/{id}/janelas` no `leitura` (selagem pela materialização da consulta, 404 para quem não é dono, paginação com teto, `pausa` por janela como contrato novo decidido pelo dono) e a tela `Histórico` no app, com o item `Ver histórico` no menu do card. Sem migration, tabela, job ou evento novos. `docs/api/leitura.yaml` atualizado. Testes: `leitura` com 290 unitários e 372 de integração; mobile com 943 testes e `analyze` limpo. `CabecalhoTela` e `BannerAviso` ganharam parâmetros opcionais (registrado no `AGENTS.md` do mobile). Não enviado ao remoto: aguarda a revisão do dono.


### Revisão 15/09/2026: grupo aprovou configuração histórica, períodos vazios e correções offline. Substituído o recorte de apenas janelas com contribuição; encerramento não congela resultados contra sincronização legítima. Planejamento/DER atualizados; implementação não iniciada.

### Criação 01/09/2026: arquivo criado a partir do escopo de F-DSF-OPC no [periodo-3/README.md](README.md), de RF-DSF-05 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.7 e da RN-20 (1, 6, 7, 8). Histórico fixado como retenção e selagem de `janela_desafio`, que já existe para a janela corrente, com `cumprida` preenchido no encerramento; selagem preguiçosa dentro do consumidor aprovado de F-DSF, sem job, evento ou tabela nova. O recorte "só janelas com atividade" foi adotado e registrado para confirmação de quem implementar, e a ausência do alvo vigente na janela selada foi levantada como extensão de DER a propor pelo controle de mudança, sem migration antecipada.
