# Plano — E6-01: Test Plan das funcionalidades desejáveis (versão final)

> **Plano de 14/11/2026, revisado em 15/11 com 55 achados (veredito: aprovado com correções, todas aplicadas; nenhum muda decisão do Renato).** Registro da revisão em §10. Etapa 1 do [`prompt-E6-01-plano-de-testes-desejaveis.md`](prompt-E6-01-plano-de-testes-desejaveis.md). Leia antes o [`prompt-E6-contexto-comum.md`](prompt-E6-contexto-comum.md). Na etapa 3, **este plano prevalece sobre o prompt** nos detalhes.

## 0. Resumo

- **O que se faz:** acrescentar ao `docs/9.plano_de_testes.md` as 14 funcionalidades desejáveis do Período 2 e as opcionais do Período 3 que estiverem na `origin/desenvolvimento` quando a etapa 3 rodar. Hoje são F-MOD-OPC, F-ACV-OPC e F-STA-OPC; a F-DSF-OPC está no PR #64. A tarefa **só documenta** testes que existem. O que faltar vira lacuna em §9.8, com o dono da área.
- **Inventário (§2):** feito em 14/11/2026 por seis agentes de contexto limpo sobre o código da `desenvolvimento` (`7d988ac`, idêntico ao da `renato-features`). Cada nome de teste citado foi conferido no arquivo. As listas completas de casos candidatos estão nos [anexos](plano-E6-01-anexos/).
- **Números:**
  - 14 desejáveis: cerca de 1.200 testes da feature levantados e 428 casos candidatos (425 antes da revisão); o alvo depois do corte é cerca de **346 casos**.
  - Opcionais: 95 casos candidatos (98 antes da revisão), alvo de cerca de **85**, ou 67 sem a F-DSF-OPC.
  - Período 1: continua com 190 casos.
- **Lacunas:** 29 lacunas novas propostas, de L-13 a L-44 (§5.8; L-36 a L-38 estão reservadas). Oito são só do Renato: L-30 a L-32 e L-39 a L-43. Ele tem parte em mais cinco: L-13, L-14, L-15, L-20 e L-44. A revisão não criou lacuna nova: acrescentou itens a L-13, L-14, L-16, L-18, L-24, L-27, L-28, L-29, L-31, L-32, L-33, L-34, L-35 e L-39, e encolheu a L-42.

## 1. Decisões fechadas com o Renato (14/11/2026)

| # | Decisão | Escolha |
|---|---|---|
| 1 | Escopo | **14 desejáveis + opcionais do P3 mergeadas.** Entram as que estiverem na `origin/desenvolvimento` quando a etapa 3 rodar (decisão 1b). A F-DSF-OPC (PR #64) já está pré-levantada. Se outras entrarem até lá (F-REC-ALG, F-NOT-OPC, F-GAM-OPC), a etapa 3 faz o inventário delas pelo método do §2 antes de escrever. |
| 2 | Estrutura do §9.6 | **Manter 9.6.1–9.6.11** (inclusive os transversais, que seguem como 9.6.11) e **acrescentar a partir de 9.6.12**, sem renumerar. |
| 3 | Siglas | CT-CNT, CT-SOC, CT-DES, CT-NOG, CT-ES2, CT-SES, CT-AV2, CT-DSF, CT-STA, CT-GAM, CT-LST, CT-REC, CT-MOD, CT-NT2. Para as opcionais: **CT-MDO** (F-MOD-OPC), **CT-ACO** (F-ACV-OPC), **CT-STO** (F-STA-OPC) e **CT-DSO** (F-DSF-OPC). Se entrarem outras: **CT-RAL** (F-REC-ALG), **CT-NOO** (F-NOT-OPC), **CT-GMO** (F-GAM-OPC). Nenhuma colide com as do Período 1 (AUT, PER, BUS, CAD, ING, EST, PRG, AVA, FEE, NOT, TRV). |
| 4 | Densidade | **Um caso por critério de aceite e por RN de cada RF, mais autorização e mensageria quando houver.** O inventário ficou acima dos 10–22 do Período 1 em várias features; o corte está em §3. |
| 5 | §9.7 | **Refazer a tabela** com a execução mais recente de cada workflow na `desenvolvimento`. Se o run mais recente falhou, a tabela diz isso. |

## 2. Inventário dos testes por feature

Método: arquivo de feature (critérios, DoD, Timeline), `REQUISITOS.md` (§5, RNs citadas, §8, §9), CodeGraph e Grep nas camadas `code/back/*`, `code/front/src`, `code/mobile/test` e `code/scripts/ingestao/tests`. Contagem: `it`/`test`/`testWidgets`/`@Test`/`def test_`, com o teste parametrizado contando 1. **Nenhum teste dos arquivos levantados está em `skip`, `todo`, `only` ou `@Disabled`.**

Os casos candidatos, com o nome exato do teste, estão nos anexos (seção "Casos previstos" de cada feature):

| Anexo | Features |
|---|---|
| [`inventario-acervo-identidade.md`](plano-E6-01-anexos/inventario-acervo-identidade.md) | F-CONTA-2, F-ACV-DESCOBERTA, F-ACV-NOTA |
| [`inventario-social-A.md`](plano-E6-01-anexos/inventario-social-A.md) | F-SOCIAL-2, F-MOD, F-NOT-2 |
| [`inventario-social-B.md`](plano-E6-01-anexos/inventario-social-B.md) | F-LST, F-REC-P2P |
| [`inventario-leitura-A.md`](plano-E6-01-anexos/inventario-leitura-A.md) | F-EST-2, F-SESSAO, F-AVA-2 |
| [`inventario-leitura-B.md`](plano-E6-01-anexos/inventario-leitura-B.md) | F-DSF, F-STA, F-GAM |
| [`inventario-opcionais-p3.md`](plano-E6-01-anexos/inventario-opcionais-p3.md) | F-MOD-OPC, F-ACV-OPC, F-STA-OPC, F-DSF-OPC (pré-levantamento do PR #64) |

### 2.1. Resumo por feature — desejáveis do Período 2

| § | Feature | Dono | Camadas com teste | Arquivos | Testes da feature | Casos candidatos | Alvo | Requisitos |
|---|---|---|---|---|---|---|---|---|
| 9.6.12 | F-CONTA-2 — Exclusão de conta | Henrique | ID, LE, AC, SO, WEB, MOB | 27 | 105 | 36 | ≤ 30 | RF-AUT-07, RN-23 |
| 9.6.13 | F-SOCIAL-2 — Edição de comentário e menções | Kayke | SO, WEB, MOB | 5 | 21 | 21 | ≤ 16 | RF-SOC-13, 15, RN-10 |
| 9.6.14 | F-ACV-DESCOBERTA — Filtros e páginas de autor/editora/série | Vicenzo | AC, ING, WEB, MOB | 24 | 127 | 30 | ≤ 25 | RF-ACV-03, 10, 11, 12, 21 |
| 9.6.15 | F-ACV-NOTA — Nota geral e cache de capas | Renato | AC, ING, WEB, MOB | 21 | 117 | 30 | ≤ 25 | RF-ACV-15, 16, 17 (e o histograma de RF-ACV-04), RN-06, RN-14 |
| 9.6.16 | F-EST-2 — Favoritos, histórico e buscas | Ana | LE, WEB, MOB | 7 | 26 | 26 | ≤ 22 | RF-EST-09, 10, 13 |
| 9.6.17 | F-SESSAO — Sessão cronometrada (só mobile) | Ana | MOB | 2 | 18 | 17 | 17 | RF-PRG-05..12, RN-16 |
| 9.6.18 | F-AVA-2 — Reações, Markdown e frases | Renato | LE, AC, SO, WEB, MOB | 31 | 184 | 61 | ≤ 30 | RF-AVA-05..09, RN-13 |
| 9.6.19 | F-DSF — Desafios (só mobile) | Vicenzo | LE, MOB | 9 | 113 | 35 | ≤ 28 | RF-DSF-01..04, 06, RN-20 |
| 9.6.20 | F-STA — Estatísticas | Vicenzo | LE, WEB, MOB | 16 | 139 | 34 | ≤ 28 | RF-STA-01, 02, 03, 05, RN-04, RN-08 |
| 9.6.21 | F-GAM — Sequência diária (só mobile) | Vicenzo | LE, MOB | 3 | 40 | 24 | ≤ 24 | RF-GAM-01..03, RN-18 |
| 9.6.22 | F-LST — Listas | Henrique | SO, AC, LE, WEB, MOB | 19 | 118 | 35 | ≤ 28 | RF-LST-01..06, RN-15 |
| 9.6.23 | F-REC-P2P — Recomendação entre leitores | Kayke | SO, WEB, MOB | 12 | 60 | 26 | ≤ 24 | RF-REC-01..07, 13..16, RN-22 |
| 9.6.24 | F-MOD — Moderação | Renato | SO, LE, WEB, MOB | 29 | 109 | 34 | ≤ 30 | RF-MOD-01, 02, 03, 05, RN-11, RN-15.4, RN-23.7 |
| 9.6.25 | F-NOT-2 — Notificações em tempo real (só mobile) | Kayke | SO, MOB | 4 | 20 | 19 | 19 | RF-NOT-06 |
| | **Total** | | | | **≈ 1.197** | **428** | **≈ 346** | |

Na F-SESSAO, o inventário tinha 19 casos. O CT-SES-19, "cancelar", não tem teste e foi para lacuna (L-24); o CT-SES-02 saiu na revisão porque repete o teste do CT-EST-22. Arquivos que só tangenciam a feature não entram na contagem; estão nos anexos. A revisão de 15/11 acrescentou um caso em F-AVA-2 (RN-13 no servidor), F-DSF (exclusão no mobile), F-GAM (retentativa) e F-LST (SEC-07 no `leitura`); por isso a F-LST ganhou a camada LE.

### 2.2. Resumo por feature — opcionais do Período 3

| § | Feature | Dono | Camadas com teste | Arquivos | Testes da feature | Casos candidatos | Alvo | Requisitos |
|---|---|---|---|---|---|---|---|---|
| 9.6.26 | F-MOD-OPC — Suspensão de conta | Renato | ID, SO, LE, AC, WEB, MOB | 37 | 113 | 35 | ≤ 28 | RF-MOD-04 (com RF-MOD-05) |
| 9.6.27 | F-ACV-OPC — Extras de acervo | Renato | AC, ING, WEB, MOB | 15 | 111 | 25 | ≤ 22 | RF-ACV-14, 22 |
| 9.6.28 | F-STA-OPC — Distribuição de notas | Ana | LE, WEB, MOB | 7 | 27 | 17 | 17 | RF-STA-04 |
| 9.6.29 | F-DSF-OPC — Histórico de janelas (só se o PR #64 estiver mergeado) | Vicenzo | LE, MOB | 5 | 50 | 18 | 18 | RF-DSF-05 |

Na revisão de 15/11 saíram o CT-STO-08 (mesmo teste do CT-STA-01, só o 401) e o CT-DSO-11 e 12 (mesmos testes do CT-DSF-24 e 26; a seção 9.6.29 diz na linha de contexto que a mensageria é a da F-DSF).

A F-DSF-OPC foi levantada com `git show origin/vicenzo-features`. Se o PR #64 entrar, a etapa 3 **confere de novo** os nomes contra a `origin/desenvolvimento`, porque o PR pode mudar antes do merge. Se não entrar, a seção não é criada e a §9.2 a cita como fora do escopo.

### 2.3. Divergências entre a tabela do prompt e os arquivos de feature

Os arquivos de feature prevalecem. A etapa 3 usa estas camadas e estes requisitos:

- **F-AVA-2** também tem testes no `social` (consumidor de `resenha.curtida`, prefixo `SO/`) e no `acervo` (contagens e `minhaReacao`, prefixo `AC/`).
- **F-MOD** também mexe no `leitura`: remoção de resenha e de frase, com 13 testes.
- **F-ACV-NOTA** inclui o histograma da página do livro (RF-ACV-04).
- **F-LST** também mexe no `acervo`: a via `lista` de acesso ao livro pessoal (RF-LST-06), em `AC/test/integracao/livro-pessoal.int-spec.ts`. A recusa de ação de estante sobre livro pessoal de terceiro (RNF-SEC-07) é provada no `leitura` (`LE/test/integracao/estante.int-spec.ts`).
- **F-ACV-DESCOBERTA** e **F-ACV-NOTA** também têm testes no script de ingestão (`ING/`): biografias, notas e réplica por obra.
- **F-CONTA-2** tem consumidores de `conta.excluida` no `leitura`, no `acervo` e no `social`.
- **F-MOD-OPC** também mexe no `leitura` (migration `0007`, VIEW e contagens de reação), e o efeito chega ao `acervo` pelas VIEWs.
- **F-STA-OPC:** a dona é a **Ana Luiza**, não o Vicenzo, que é o dono da F-STA.

### 2.4. Problemas nos arquivos de feature de outros donos

Estes itens não são editados por esta tarefa. Vão como aviso no relatório:

| Feature (dono) | Problema |
|---|---|
| F-CONTA-2 (Henrique) | A entrada de 25/10 diz que o mobile não testa a limpeza da sessão no 202. O teste existe desde 08/10: `MOB/app/router_test.dart` › F-CONTA-2 › "excluir conta: o 202 apaga a sessão e o armazenamento antes da tela final". |
| F-DSF (Vicenzo) | Os números de teste estão desatualizados. O arquivo diz 23 unitários, 32 de integração e 60 mobile; hoje são 16, 36 e 61. |
| F-SESSAO (Ana) | O critério "token vencido sem renovação encerra a sessão" está desmarcado, mas está implementado e testado no controlador. |
| F-REC-P2P (Kayke) | O DoD marca "indisponibilidade/timeout com API simulada" como feito, mas só há testes de falha de rede e de 503. |
| F-STA-OPC (Ana) | O Status diz "aguardando CI" e os critérios estão desmarcados, mas o PR #63 foi mergeado em 08/11 com o CI verde. |
| F-DSF-OPC (Vicenzo) | O texto diz que `limite` fora da faixa é 400; o teste mostra que `limite=500` é rebaixado a 50 e só `page=0` e `limite=0` dão 400. O arquivo também cita RN-20.8 para a selagem na consulta ou no consumo; no REQUISITOS, isso é a RN-20.9 (a RN-20.8 é a janela cumprida por registro de leitura iniciada antes). |
| F-LST (Henrique) | Os itens de teste do DoD seguem desmarcados porque o run 39883097401 "não contava" os 24 testes do `ListaControllerIntegracaoTest`. Eles rodam: no run 42325694285 aparecem pelo `@DisplayName` dos `@Nested` (§5.7). O comentário de `MOB/features/livros/livro_pessoal_page_test.dart:244` ainda diz que o `acervo` recusa `via=lista` com 400, o que contradiz a Timeline de 10/10. |
| F-MOD-OPC (Renato) | "CI verde" continua desmarcado no DoD, embora o PR #61 esteja mergeado. Os números de teste variam ao longo do arquivo. É da área do Renato, mas fora do escopo desta tarefa. |

### 2.5. Testes que provam menos do que o nome diz

Estes testes podem ser citados, mas **só pelo que provam**. O "Resultado esperado" do caso não pode prometer mais que isso:

| Teste | O que de fato prova |
|---|---|
| `ID/.../ExclusaoDeContaIntegracaoTest.java` › "username e e-mail continuam reservados durante a janela" | Só o username. O e-mail reservado é lacuna (L-18). |
| `MOB/...` (F-SOCIAL-2) › "menção resolvida abre o perfil; comentário alheio não tem menu" | O nome está desatualizado: desde a F-MOD o comentário alheio tem o menu Denunciar. O teste só confere o menu do próprio comentário. Citar só para "menção resolvida abre o perfil". |
| `SO/.../ModeracaoIntegracaoTest.java` › "Remover resenha pede ao leitura..." | A atividade é apagada por um helper do teste que simula o `leitura`. Não prova a cadeia real (L-30). |
| `MOB/...` (F-SESSAO) › "sair da conta encerra a sessão em andamento e apaga o que foi guardado" e o caso do logout voluntário (CT-SES-18 do anexo) | Chamam `SessionController.sair()` e `conta.sairRevogando` direto, num caminho que a interface não alcança (RN-16.2). Citar como proteção de dados (decisão de 22/10), não como regra de RN-16.2. |
| `SO/...` (F-REC-P2P) › "Reentrega do mesmo fato não tem efeito adicional" e `SO/conta/service/ConsumidorDeContaExcluidaIntegracaoTest.java` (F-CONTA-2, CT-CNT-27 do anexo) | Chamam o consumidor direto, cada entrega com `eventId` novo, sem a deduplicação do `AmqpConsumerService`. Provam que reprocessar não causa dano; não citar como prova de RNF-ERR-06. |
| `AC/test/integracao/livro-pessoal.int-spec.ts` (F-LST, CT-LST-24 e 25 do anexo) | O 24 apaga à mão a linha da VIEW simulada `v_lista_livro_pessoal_v1`: prova que o `acervo` revalida a cada pedido, não que tirar o livro da lista tira a linha da VIEW real (L-28). O 25 é um `PATCH` de terceiro sem `via`: prova o 403 da edição, não RNF-SEC-07 (que tem caso próprio no `leitura`). |
| `WEB/components/feed/ModalComentarios.spec.ts` (F-SOCIAL-2) › "comentário de outra pessoa não oferece editar nem excluir" | Só confere que falta o botão `Ações do seu comentário`. Quem prova que o comentário alheio não oferece Editar nem Excluir é o teste "comentário de outra pessoa só oferece Denunciar comentário, que abre a denúncia por cima (F-MOD)", citado no CT-SOC-11. |
| `MOB/...` (F-REC-P2P) › "...sem avisar o remetente" | Não prova isso. Quem prova é o caso da outbox vazia depois do descarte (CT-REC-08 do anexo). |
| Testes "vai para a DLQ" do `acervo` e do `leitura` | Provam o `nack`. O broker em memória não guarda o flag `requeue` nem roteia para a `.dlq` (L-15). Resultado esperado: "rejeitada (nack), sem efeito e sem recibo". |
| `LE/...estatisticas.int-spec.ts` › "perfil ausente da VIEW responde 404" | Usa um id que nunca existiu. A conta suspensa fica só inferida. |
| Testes do `social` que ocultam conta suspensa (F-MOD-OPC): feed, comentários, notificações, curtidas e menções (`OcultacaoDeContaSuspensaIntegracaoTest`, CT-MDO-21 a 23 do anexo), e as reações no `leitura` (`reacao.int-spec.ts`, CT-MDO-24) | Usam uma cópia local das VIEWs do `identidade` (no `leitura`, uma tabela no lugar da VIEW, e a suspensão vira `DELETE`). Provam o filtro da cópia, não o da VIEW real (L-39, e risco em §5.9). O Resultado esperado termina com "(VIEW de perfil simulada no teste)". |

## 3. Como cortar até o alvo

A densidade aprovada (decisão 4) é **um caso por critério de aceite e por RN**. O alvo de cada feature está em §2.1 e §2.2. Para chegar a ele, a etapa 3 aplica as regras nesta ordem:

1. **Nunca corta** o único caso de um RF, de um critério de aceite, de uma RN, de autorização ou de mensageria (publicação, consumo, duplicata, DLQ).
2. **Corta primeiro** um segundo caso da mesma regra no mesmo nível. Exemplos: dois testes de integração da mesma validação, ou o caso web e o mobile que provam o mesmo texto ou formato.
3. **Cliente:** no máximo 4 casos web e 4 mobile por feature, salvo nas features só-mobile. Ficam os que provam regra (RN, autorização, fila offline, indisponibilidade ou timeout), não a apresentação.
4. **Unitário + integração da mesma regra:** fica a integração, salvo quando a regra é de RNF-TST-01. Nesse caso ficam os dois.
5. O que for cortado não some: vai para a linha "Outros testes da feature" que o anexo já traz. Essa linha **não** entra no `9.plano_de_testes.md`.

Se, depois das regras, uma feature continuar acima do alvo por ter mais critérios que o alvo comporta, **fica acima**. O alvo é teto indicativo, não critério de aceite.

## 4. Formato de cada caso

- Igual ao §9.6 atual: `ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado | Resultado`. Os níveis são unitário, integração, mensageria, web, mobile e script.
- IDs `CT-<SIGLA>-NN`, renumerados de 01 em diante **depois do corte**, sem buracos. Os IDs do anexo são provisórios.
- Coluna do teste: `PREFIXO/caminho › describe › "nome exato"`, com os prefixos da tabela atual (`ID/`, `SO/`, `AC/`, `LE/`, `WEB/`, `MOB/`, `ING/`).
  - Nos `*.int-spec.ts`, o `describe` de fora, que só embrulha o arquivo, fica de fora, como em CT-EST-05.
  - Nome com aspas duplas internas: cite como está no código. Os anexos indicam os casos (por exemplo, CT-DSF-32 a 34).
  - Nome Dart em duas strings adjacentes: cite a string concatenada.
- **Resultado:** "Passou" só se o teste rodou no run citado em §9.7 (ver §7).

## 5. O que muda em cada seção do `docs/9.plano_de_testes.md`

### 5.0. Cabeçalho

O bloco "Versão final do Período 2 (28/10/2026)" passa a ser **"Versão final (DD/11/2026)"**, com a data da etapa 3. O texto diz que o plano cobre as 10 prioritárias, as 14 desejáveis e as opcionais integradas até a data. O comentário HTML do topo não muda.

### 5.1. §9.1 Objetivo

- A primeira frase passa a falar das funcionalidades prioritárias, desejáveis e das opcionais integradas.
- As três RNs obrigatórias (RN-04, RN-05, RN-08) ficam como estão, com uma frase acrescentada: as regras de maior risco das desejáveis também têm cobertura dedicada. São elas:
  - RN-20 (janelas de desafio);
  - RN-18 (sequência);
  - RN-16 (sessão);
  - RN-23 (exclusão de conta);
  - RN-22 (recomendação);
  - RN-10 (menções);
  - RN-13 (Markdown seguro).

  Antes de citar cada RN, a etapa 3 confere o nome dela no REQUISITOS.

### 5.2. §9.2 Escopo

- Tabela atual renomeada para "Prioritárias (Período 1)".
- Segunda tabela "Desejáveis (Período 2)", com as 14 linhas de §2.1. Colunas: Funcionalidade | Requisitos | Camadas testadas. As camadas seguem as correções de §2.3.
- Terceira tabela "Opcionais (Período 3) integradas até DD/11", com as linhas de §2.2 que estiverem mergeadas.
- **Fora de escopo**, acrescentar:
  - as opcionais ainda não integradas na data, com o nome de cada uma;
  - RNF-DES-01 (p95 ≤ 1 s), que é medição de desempenho em DES e, como os testes de carga, fica fora de escopo;
  - a validação em DES das desejáveis, que é manual e fica no arquivo de cada feature. A frase atual sobre DES/HML já cobre isso; só citar.

### 5.3. §9.3.3 Rastreabilidade

| Requisito | O que acrescentar (IDs finais definidos na etapa 3) |
|---|---|
| RNF-TST-01 | Unitários de regra das desejáveis: janelas (`LE/src/desafios/dominio/janelas.spec.ts`, RN-20.1), sequência (RN-18), teto do desafio, Markdown da resenha (RN-13), estatísticas. Mais as lacunas L-01 e L-44. |
| RNF-TST-02 | Sem mudança no texto: os `*IntegracaoTest` e `*.int-spec.ts` das desejáveis seguem o mesmo padrão. |
| RNF-TST-03 | Acrescentar os casos de mensageria das desejáveis: `conta.excluida` nos três consumidores (CT-CNT), consumo de notas e capas (CT-NOG), `resenha.curtida` (CT-AV2), fila de métricas (CT-DSF, CT-STA, CT-GAM) e `recomendacao.recebida` (CT-REC). Citar as lacunas L-15 e L-16. |
| RNF-TST-04 | Acrescentar o estado da sessão cronometrada (CT-SES) e a fila de ações dos desafios e das listas no mobile. |
| RNF-TST-05 | "Casos web de cada funcionalidade" continua; citar a lacuna L-20 (serviços web sem spec). |
| RNF-TST-06 | Acrescentar os casos de indisponibilidade das desejáveis (503, cold start e timeout onde houver) e a lacuna L-14 (timeout ausente em várias features). |
| RNF-TST-07 | Sem mudança. |
| RNF-TST-08 | A etapa 3 confere se algum seed ganhou dado das desejáveis (desafio, lista, sequência). Se sim, acrescenta o caso; se não, mantém. |

### 5.4. §9.4 Ambiente

A etapa 3 confere e acrescenta só o que for verdade no código:

- o canal SSE (F-NOT-2) é testado com cliente HTTP real contra o servidor de teste no `social` e com fonte de eventos simulada no mobile;
- o Cloudinary da cópia de capas (F-ACV-NOTA) é simulado;
- o relógio e o fuso são injetados nos testes de desafio e sequência.

### 5.5. §9.5 Critérios de aceite

- "Todos os casos de RN-04, RN-05 e RN-08" continua.
- O critério "Cada requisito funcional em escopo tem pelo menos um caso" passa a valer para as desejáveis e as opcionais, com as exceções do que é só de cliente. A etapa 3 confere cada uma no REQUISITOS antes de escrever:
  - RF-PRG-05..12 (sessão cronometrada, sem endpoint novo: casos só mobile);
  - RF-SOC-15 na parte de renderização da menção;
  - **RF-PRG-08 (cancelar a sessão) fica sem caso nenhum**: o único candidato não tem teste. O critério da §9.5 ganha a ressalva "salvo os RFs listados em §9.8 sem caso (RF-PRG-08, L-24)", e a §9.3.3 não o cita como coberto.
- "Lacunas conhecidas... com o período em que serão tratadas" passa a "... com o dono da área".

### 5.6. §9.6 Casos de teste

- Subseções 9.6.12 a 9.6.29, na ordem de §2.1 e §2.2. Antes de 9.6.12, uma frase: "As subseções 9.6.12 a 9.6.25 são as funcionalidades desejáveis do Período 2; a partir de 9.6.26, as opcionais do Período 3 integradas."
- Antes da tabela de cada subseção, uma linha de contexto: requisitos, serviços e clientes, por exemplo "Só mobile: a web não tem a funcionalidade (`REQUISITOS.md` §2.1)."
- As features só-mobile (F-SESSAO, F-DSF, F-GAM, F-NOT-2 e F-DSF-OPC) **não têm caso web**.
- Nenhum caso das desejáveis repete teste já citado no Período 1, com uma exceção. O teste parametrizado de CT-NOT-01 é o único que cobre o consumo de `usuario.mencionado`, e pode ser citado de novo como caso de F-SOCIAL-2, com a nota "mesmo teste de CT-NOT-01". O resto da mensageria de `usuario.mencionado` é a lacuna L-16.
- **Teste já citado em outra subseção nova** (por exemplo, um teste da F-STA que também vale para a F-STA-OPC): só se repete se for a **única** prova de um requisito da subseção nova, com a nota "mesmo teste de CT-XXX-NN". Senão, não entra (a revisão de 15/11 já cortou CT-SES-02, CT-STO-08, CT-DSO-11 e CT-DSO-12 por isso).

### 5.7. §9.7 Execução e resultados

- **Refazer** a tabela com o run mais recente de cada workflow na `desenvolvimento` (§7).
- Situação em 14/11/2026, só como referência. A etapa 3 consulta de novo, porque o PR #64 e outros podem ter disparado runs:

  | Workflow | Run | Data | Commit | Resultado |
  |---|---|---|---|---|
  | `ci-back-identidade` | 42325694283 | 07/11 | `1281aa1` | success |
  | `ci-back-social` | 42325694285 | 07/11 | `1281aa1` | success (294 testes) |
  | `ci-back-acervo` | 42443396410 | 08/11 | `97a2f95` | success |
  | `ci-back-leitura` | 42521957890 | 08/11 | `c456e88` | success |
  | `ci-front` | 42521957824 | 08/11 | `c456e88` | success |
  | `ci-mobile` | 42521957827 | 08/11 | `c456e88` | success |
  | `ci-scripts-ingestao` | 42443396416 | 08/11 | `97a2f95` | success |

- Os workflows `job-exclusao-conta` e `job-inatividade` são agendadores, não testes. Não entram na tabela.
- O texto abaixo da tabela muda: "Todos os N casos deste plano estão entre os testes executados." Esse N é o total final, 190 mais os novos.
- **Nota para quem ler os logs do `social`:** o Surefire lista as classes `@Nested` pelo `@DisplayName` delas, sem o nome da classe externa. Por isso, `ListaControllerIntegracaoTest` aparece com "Tests run: 0", e os 24 testes aparecem em linhas como "criar e editar" e "livros da lista". Isso foi conferido em 14/11 no run 42325694285: as linhas somam os 294 do total. **Não é teste deixado de fora.**

### 5.8. §9.8 Lacunas conhecidas

- **Coluna "Dono"** acrescentada na tabela inteira. Para L-01..L-12, usar a "Área provável" do [`prompt-E6-02`](prompt-E6-02-testes-das-lacunas.md), conferida contra os arquivos de feature.
- **L-01..L-12:** se a E6-02 já tiver fechado alguma quando a etapa 3 rodar, atualizar a situação, com o teste que a fecha. Duas observações do inventário:
  - **L-08** pode estar **parcialmente** fechada. `LE/test/integracao/desafios.int-spec.ts` › "mensagem atrasada de progresso já excluído não o ressuscita" (F-DSF) e o caso equivalente de estatísticas mostram que a contribuição ao desafio e às estatísticas não volta. A etapa 3 lê os dois testes e decide se a L-08 fica "parcial", citando-os.
  - **L-01** ganha as listas (`RegrasDeListaTest` sem RN-08) e a denúncia (regras de acesso só por integração) na mesma linha.
- **Texto de abertura:** "Ficam para o Período 3" passa a "Cada dono cobre as lacunas da sua área (decisão do grupo de 30/10/2026, `assets/atas/ATA-2026-10-30.md`)".
- **Lacunas novas** (L-13 em diante). A etapa 3 confere cada uma no código antes de escrever: se já tiver teste, sai da lista. O formato é o mesmo, com a coluna Dono. Os detalhes de cada item estão na seção "Sem teste aparente" do anexo da feature.

| ID | Lacuna | Requisito | Dono |
|---|---|---|---|
| L-13 | Rotas novas sem teste próprio de 401 (sem token): favorito e histórico; reação e frase; `PATCH`/`DELETE`/pausar/retomar de desafio; estatísticas de perfil; `PATCH`/`DELETE` de comentário; listas; recomendações; `DELETE /me/conta` (e 400 sem `Idempotency-Key`); `POST /denuncias`, `POST /admin/denuncias/{id}/remover`, `POST /admin/denuncias/{id}/arquivar`, `DELETE /admin/frases/{id}` e `GET /admin/moderacao/logs` (só `GET /admin/denuncias` tem); suspender e reativar no `social`; `POST`/`PATCH /livros/pessoal` com assuntos. O 401 genérico (CT-TRV-05) cobre o filtro, não a rota. | RNF-SEC-01 | Ana (F-EST-2), Renato (F-AVA-2, F-MOD, F-MOD-OPC, F-ACV-OPC), Vicenzo (F-DSF, F-STA), Kayke (F-SOCIAL-2, F-REC-P2P), Henrique (F-LST, F-CONTA-2) |
| L-14 | Clientes sem timeout (e, onde dito, sem 503). F-EST-2, na web e no mobile. F-AVA-2: frases no mobile. F-SOCIAL-2: a edição de comentário não tem 503 nem timeout, e a exclusão não tem timeout, na web e no mobile. F-LST e F-REC-P2P, na web e no mobile. | RNF-TST-06 | Ana (F-EST-2), Renato (F-AVA-2), Kayke (F-SOCIAL-2, F-REC-P2P), Henrique (F-LST) |
| L-15 | Nos serviços Nest, os testes "vai para a DLQ" provam o `nack`, mas não o `requeue=false` nem a chegada na `.dlq`: o broker em memória não roteia pela DLX. | RNF-TST-03, RNF-ERR-07 | transversal (P0-INFRA; os testes são de Vicenzo, Renato e Henrique) |
| L-16 | Eventos novos do `social` sem teste assíncrono completo. `usuario.mencionado`: schema, ligação na fila, DLQ, reentrega e `destinatarioId` do payload. `recomendacao.recebida`: publicação real e DLQ específica. `livro.adicionado_a_estante` no `social`: reentrega pelo `AmqpConsumerService` (recibo de `eventId`); o teste atual chama o consumidor direto. | RNF-TST-03, RNF-ERR-06, RNF-SEC-32 | Kayke |
| L-17 | `conta.excluida`: no `social`, o teste chama o handler direto, sem recibo nem DLQ; no `identidade`, a publicação é simulada por `UPDATE` na outbox. | RNF-TST-03 | Henrique |
| L-18 | Exclusão de conta no servidor. Não há teste de: e-mail reservado durante a janela; username e e-mail liberados depois da exclusão definitiva (RN-23.6); token de recuperação vencido em 15 min (RN-23.3); avatar apagado no Cloudinary (RN-23.7); tentativas de login apagadas (RN-23.7); auditoria do cancelamento e do job (RNF-SEC-35); atomicidade usuário + outbox no job (falha ao gravar `conta.excluida` desfaz a finalização); cancelar não grava evento na outbox (RN-23.4); conta em exclusão fora da busca de leitores (só a suspensa é testada). | RF-AUT-07, RN-23 | Henrique |
| L-19 | Exclusão de conta na web: `ExclusaoSolicitadaView`, a linha "Excluir conta" nas Configurações e a guarda de rota com o acesso de recuperação não têm teste. O texto da política 1.1 é parcial na web e ausente no mobile. | RF-AUT-07, RNF-SEC-42 | Henrique |
| L-20 | Serviços web sem spec. `leitura.ts`: `marcarFavorito`, `desmarcarFavorito`, `consultarFavorito`, `listarFavoritos` e `listarHistorico` (F-EST-2), e `reagir`, `retirarReacao` e os métodos de frases (F-AVA-2). `moderacao.ts` (F-MOD-OPC). | RNF-TST-05 | Ana, Renato |
| L-21 | Menções. Faltam: menção a perfil privado (RN-10.4); edição e exclusão de **resposta**; validação (vazio, acima de 2.000) e idempotência do `PATCH`; unitário do `ResolvedorDeMencoes`. Nos clientes, falta o caso de duas menções ao mesmo `@username`. | RF-SOC-13, 15, RN-10 | Kayke |
| L-22 | Descoberta. Não há teste de que as páginas de autor, editora e série não têm ações de perfil, nem do índice trigram da série (RNF-DES-03). No mobile, falta a página de catálogo aberta pela aba Perfil. | RF-ACV-10..12 | Vicenzo |
| L-23 | Favoritos. Não há teste de favoritar e desfavoritar pela página do livro (web e mobile). No mobile, faltam o filtro `Favoritos` e a marca no card `Fora da estante`. | RF-EST-09 | Ana |
| L-24 | Sessão cronometrada. Faltam: cancelar com confirmação (RF-PRG-08, RN-16.8; o RF fica sem caso nenhum); telas `/sessao` e `/sessao/pendente` (cronômetro, voltar bloqueado RN-16.4, pausas de 10 e 15 min RF-PRG-11); encerrar sessão pendente informando a página ou descartando (RN-16.11, 16.19); aviso de expiração na tela de entrada; guarda no roteador real (RN-16.5); metadados do dispositivo no corpo. | RF-PRG-05..12, RN-16 | Ana |
| L-25 | Desafios. A RN-20.8 é coberta só de forma implícita. No mobile, falta o 404 nas ações: recarga silenciosa, e a exclusão volta como sucesso. | RF-DSF-02, 04, RN-20.8 | Vicenzo |
| L-26 | Estatísticas. Não há teste de que livro pessoal conta nos totais (RN-03), nem de conta suspensa no perfil (só inexistente). O contraste dos gráficos (RNF-USA-03) não tem verificação automatizada. | RF-STA-01..03 | Vicenzo |
| L-27 | Sequência. Faltam: concluir, iniciar ou abandonar não conta (RN-18.1); criação manual retroativa proibida (RN-18.5); remover livro da estante não recalcula até o próximo progresso (decisão de 08/10); sequência medida em dias, nunca em tempo (RN-18.7, só implícita). | RF-GAM-01..03, RN-18 | Vicenzo |
| L-28 | Listas. Faltam: limite de escritas (429); reordenar com item de outra lista; idempotência de item e de `PATCH`/`DELETE`; título e descrição como texto (RNF-SEC-14); pedido pendente não libera lista de perfil privado (RN-08); teto de paginação em `/perfis/{id}/listas`; terceiro abrindo o livro pessoal pela lista com sucesso nos clientes; telas web das próprias listas, do índice e da entrada "Adicionar à lista"; tirar o livro da lista tira a linha de `v_lista_livro_pessoal_v1` (RN-15.6; o teste do `acervo` simula a VIEW). | RF-LST-01..06, RN-08, RN-15.6 | Henrique |
| L-29 | Recomendação entre leitores. Faltam: novo envio depois de descarte ou expiração (RN-22.14); limite de 50 contando só as ativas (RN-22.4); entrada "Recomendar a um leitor" na web; a aba funcionando sem a algorítmica (RF-REC-14, só implícita); mensagem de cold start nas recebidas (RNF-ERR-09), não implementada (divergência registrada no arquivo da feature). | RF-REC-01, 14, RN-22, RNF-ERR-09 | Kayke |
| L-30 | Moderação. Faltam: `/remover` chamado por não-admin (403); resenha removida sumindo do feed ponta a ponta (hoje simulada por um helper); remoção repetida de frase com outra chave em 24 h e o 409 depois; conteúdo denunciado como texto no painel web (RNF-SEC-14); denúncia pela página do livro oficial na web. | RF-MOD-01..03, 05 | Renato |
| L-31 | Reações e frases. Faltam: excluir a resenha pelo autor apaga as reações (decisão de 15/09); trecho de frase como texto na web e no mobile (RNF-SEC-14); página do livro pessoal na web repassando `via`/`referenciaId` à reação; nova curtida notifica mesmo se a primeira foi suprimida por preferência (sem teste com a preferência desligada; o `social` ainda não lê a preferência, depende da F-NOT-OPC). | RF-AVA-05..09 | Renato |
| L-32 | Nota geral e capas. Faltam: nos clientes, livro pessoal sem os dois indicadores (RN-06.5); fila de capas sem credencial do Cloudinary; snapshots do `social` lendo `capa_resolvida` (RN-14.4); `nota.alterada`, `backfill:notas` e `conta.excluida` deixam `nota_geral` intacta (RN-06.4; o caso das duas notas separadas monta os dados por SQL). | RF-ACV-15..17, RN-06.4 | Renato |
| L-33 | Tempo real. Faltam: notificação desfeita (rollback) não é empurrada; heartbeat no servidor; canais fechados no shutdown; várias conexões do mesmo usuário; conectar e desconectar com o ciclo de vida do app; token fora do log do servidor; a lista paginada continua na tela enquanto desconectado (fallback só implícito). | RF-NOT-06, RF-NOT-02 | Kayke |
| L-34 | Distribuição de notas. Faltam: releitura não duplica faixa; resposta fora do contrato na web; card montado no painel (web e mobile); perfil público com notas; `total` coerente sob escrita concorrente; contraste WCAG AA do gráfico sem verificação automatizada. | RF-STA-04, RNF-USA-03 | Ana |
| L-35 | Histórico de janelas (só se a F-DSF-OPC entrar). Faltam: independência do fuso de quem consulta; selagem pelo consumidor sem consulta (RN-20.9); exclusão de conta limpando o histórico. | RF-DSF-05 | Vicenzo |
| L-36..L-38 | Reservados para as lacunas das opcionais que entrarem até a etapa 3 (F-REC-ALG, F-NOT-OPC, F-GAM-OPC), pelo mesmo método. Se não houver, a numeração continua sem buraco. | | |
| L-39 | Suspensão. Os testes do `social` (feed, comentários, notificações, curtidas, menções) usam uma cópia local das VIEWs do `identidade`, e os de reação no `leitura` usam uma tabela no lugar da VIEW; nenhum prova, contra a VIEW real, que o conteúdo de autor suspenso some e volta. | RF-MOD-04, RN-09 | Renato |
| L-40 | Suspensão. Nada fixa a decisão 4: a nota dos leitores continua contando a conta suspensa. | RF-MOD-04 | Renato |
| L-41 | Suspensão no mobile. Falta o 403 das escritas no `leitura` dentro dos 15 min do token (divergência aceita). | RF-MOD-04 | Renato |
| L-42 | Assuntos do livro pessoal no mobile: falta a edição chegando com os assuntos preenchidos, e esvaziar mandando `[]`. (Editora e série não são lacuna: o CHECK `livro_oficial_pessoal_ck` proíbe esses campos em livro pessoal.) | RF-ACV-22, RN-03 | Renato |
| L-43 | Recarga do dump. Não há teste de recarga com sinônimo de editora já unificado. | RF-ACV-14, RN-12 | Renato |
| L-44 | RN-08 sem unitário nas regras das desejáveis (listas, denúncia). Se a etapa 3 preferir, junta na L-01 em vez de linha própria. | RNF-TST-01 | Henrique, Renato |

**Ficam fora de §9.8.** A §9.9 e a §9.2 já tratam como manual:

- "Funciona em DES", em quase todas as features;
- RNF-DES-01 (p95);
- recarga real no Neon;
- RN-14.6 (capa sem expiração, que não tem código a testar);
- SSE no Render free com hibernação;
- "nenhuma tabela ou campo novo" (F-STA-OPC e F-DSF-OPC), verificado pelo diff do PR, sem migration, e não por teste.

**Numeração:** as lacunas das opcionais começam em L-39 para que L-13..L-35 fiquem estáveis mesmo que entrem opcionais novas. Na etapa 3, **renumere tudo em sequência** e mantenha a ordem: transversais, desejáveis, opcionais. A tabela acima é a ordem de referência.

### 5.9. §9.9 Riscos — linhas novas

| Risco | Impacto | Mitigação |
|---|---|---|
| Testes do `social` usam cópia local das VIEWs do `identidade` | Uma mudança na VIEW real (por exemplo, filtro de suspensão) não quebra os testes do `social` | A VIEW real é testada no `identidade` (`ContratosDePerfilIntegracaoTest`); lacuna L-39 |
| Validação em DES das desejáveis ainda pendente em várias features | Comportamento com broker real, hibernação do Render (SSE) e dados reais só aparece no DES | Validação manual no merge de fechamento de novembro, registrada nos arquivos de feature |
| DLQ provada só pelo `nack` nos serviços Nest | Configuração errada da DLX só aparece com o broker real | Topologia declarada em código; prova manual com a CloudAMQP; lacuna L-15 |

### 5.10. `docs/README.md` (SUMÁRIO)

O SUMÁRIO lista o §9 só até o nível 9.x. Como nenhuma seção muda de nome, **não muda**. A etapa 3 só confere.

## 6. Como a etapa 3 se divide

1. **Preparação, pelo agente principal:**
   - `git fetch` e a worktree `renato-e6-01` a partir da `origin/desenvolvimento`, como manda o contexto comum;
   - conferir o que entrou na `desenvolvimento` desde 14/11 (`git log 7d988ac..origin/desenvolvimento --merges`): o PR #64 e outras opcionais;
   - se entrou opcional nova, ela vai para o agente 6.
2. **Seis agentes de escrita em paralelo**, um por anexo. Cada um escreve **só** as suas subseções e as suas lacunas num arquivo do scratchpad (`e6-01-<grupo>.md`). Ninguém edita o `9.plano_de_testes.md`.

   | Agente | Subseções | Anexo |
   |---|---|---|
   | 1 | 9.6.12 F-CONTA-2, 9.6.14 F-ACV-DESCOBERTA, 9.6.15 F-ACV-NOTA | `inventario-acervo-identidade.md` |
   | 2 | 9.6.13 F-SOCIAL-2, 9.6.24 F-MOD, 9.6.25 F-NOT-2 | `inventario-social-A.md` |
   | 3 | 9.6.22 F-LST, 9.6.23 F-REC-P2P | `inventario-social-B.md` |
   | 4 | 9.6.16 F-EST-2, 9.6.17 F-SESSAO, 9.6.18 F-AVA-2 | `inventario-leitura-A.md` |
   | 5 | 9.6.19 F-DSF, 9.6.20 F-STA, 9.6.21 F-GAM | `inventario-leitura-B.md` |
   | 6 | 9.6.26 em diante: opcionais (e o inventário das que entraram depois de 14/11) | `inventario-opcionais-p3.md` |

   Cada agente recebe, no prompt: este plano (§3 corte, §4 formato, §2.5 testes que provam menos), o seu anexo, a tabela de lacunas da §5.8 e a ordem de **reconferir cada nome com Grep** no código da worktree. A linha de lacunas que cada um devolve é a da §5.8, ajustada ao que conferiu.
3. **Consolidação, pelo agente principal:** junta as subseções na ordem; escreve §5.0 a §5.5, §5.7, §5.8 (com a renumeração) e §5.9; acerta os IDs citados na §9.3.3.

## 7. Verificação de cada caso

1. **O nome existe exatamente como citado.** Os agentes de escrita conferem por Grep, e a consolidação roda um script que extrai cada `› "..."` do documento e procura o texto literal no arquivo citado. O script fica no scratchpad, não no repositório. Nome em duas strings Dart adjacentes e nome com aspas escapadas são conferidos à mão.
2. **O teste rodou e passou no run citado em §9.7:**
   - run com `conclusion = success`;
   - o arquivo aparece no log como executado: `PASS` no Jest e no Vitest; no Surefire, a linha da classe ou do `@Nested` pelo `@DisplayName` com "Failures: 0, Errors: 0"; no Flutter, o nome do arquivo no relatório;
   - o teste não está em `skip`.

   O Jest sem `--verbose` não lista cada `it`. Por isso, a prova por teste é "arquivo executado + run verde + nenhum skip no arquivo".
3. **O commit do run contém o teste:** o `headSha` do run é igual ou posterior ao commit que criou o teste. Se o teste for mais novo que o último run do workflow (por exemplo, testes do PR #64 num workflow que não rodou depois), o caso fica com Resultado "Não executado no run de referência" e o relatório avisa. **Não marcar "Passou" sem run.**
4. **Totais da §9.7** lidos nos logs (`gh run view <id> --log`): "Tests run" final do Surefire, "Tests:" do Jest (unitários e integração separados), "Tests" do Vitest, "All tests passed!"/contagem do Flutter, "passed" do pytest.
5. **Validação por agentes de contexto limpo** (etapa 3, passo 5 do prompt): um por grupo da §6, só leitura. Eles conferem quatro coisas:
   - o nome do teste;
   - se o teste prova o cenário e o resultado esperado;
   - se o requisito está certo;
   - se algum critério de aceite ficou sem caso e sem lacuna.

## 8. Estimativa

| Etapa | Horas (agente + conferência) |
|---|---|
| 2. Revisar o plano | 1,5 h |
| 3. Realizar e validar | 8 h: preparação 0,5 h; escrita em paralelo 2 h; consolidação, §9.7 e lacunas 2,5 h; validação e correções 3 h. Mais 1–2 h por opcional nova a inventariar. |
| 4. Revisão independente e PR | 2 h |
| **Total** | **≈ 11,5 h**, mais o das opcionais novas |

## 9. Pendências para o Renato (não bloqueiam a etapa 2)

- Avisar os donos dos problemas de §2.4: Henrique (F-CONTA-2 e F-LST), Vicenzo, Ana e Kayke.
- As lacunas da área do Renato que a E6-02 pode tratar são **L-13** (a parte de F-AVA-2, F-MOD, F-MOD-OPC e F-ACV-OPC), **L-14** (a parte de F-AVA-2), **L-15** (a parte do `acervo`), **L-20** (a parte de F-AVA-2 e F-MOD-OPC), **L-30, L-31, L-32, L-39, L-40, L-41, L-42, L-43** e **L-44** (a parte da denúncia).

## 10. Revisão da etapa 2 (15/11/2026)

**Como foi feita.**
- Um script conferiu os 527 nomes de teste citados nos anexos contra o código da `desenvolvimento` (`7d988ac`) e os da F-DSF-OPC contra a `origin/vicenzo-features` (`90bdd24`, PR #64 ainda aberto). Todos existem. Os alertas que sobram são de formato (aspas escapadas, nomes do pytest em crase, nome Dart dinâmico do CT-AV2-42) e foram conferidos à mão.
- Seis revisores de contexto limpo, um por anexo, conferiram os itens do prompt contra os arquivos de feature, o `REQUISITOS.md` e o corpo dos testes. Leram cerca de 400 casos no corpo do teste.
- As correções foram aplicadas nos anexos (cada um tem a nota da revisão no topo) e neste plano.
- Os runs de §5.7 continuam os mais recentes, e nenhum código mudou depois deles.

**Resultado dos itens do prompt.**
- Todo RF em escopo tem caso, com caso no backend quando o requisito é de servidor. A exceção é o **RF-PRG-08** (cancelar a sessão), sem teste nenhum; isso está em §5.5 e na L-24.
- Nenhuma feature só-mobile tem caso web.
- Os 55 achados confirmados (15 em acervo-identidade, 8 em social-A, 4 em social-B, 8 em leitura-A, 10 em leitura-B e 10 nas opcionais) foram de cinco tipos:
  - critérios ou RNs sem caso e sem lacuna: foram para as lacunas listadas em §0;
  - testes existentes que faltavam como caso: CT-AV2-61, CT-DSF-35, CT-GAM-24 e CT-LST-35;
  - resultados esperados que prometiam mais do que o teste prova: foram reescritos, e os testes estão em §2.5;
  - requisitos ou camadas errados;
  - casos repetidos, que saíram: CT-SES-02, CT-STO-08, CT-DSO-11 e CT-DSO-12; a regra está em §5.6.
- **Alvos.**
  - F-SOCIAL-2: o alvo passou para ≤ 16. A regra 3 de §3 limita a 4 casos web e 4 mobile, e os cortes sugeridos estão no anexo.
  - F-MOD: os cortes sugeridos passaram a ser 2 casos web (CT-MOD-26 e 28), não mais de backend. Ela fica com 32 casos, acima do teto de 30, como §3 permite.
- **Avisos novos aos donos**, em §2.4: F-LST (Henrique) e F-DSF-OPC (Vicenzo, RN-20.9).
