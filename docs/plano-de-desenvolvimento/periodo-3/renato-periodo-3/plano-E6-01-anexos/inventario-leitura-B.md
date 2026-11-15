# Inventário de testes — grupo leitura-B (F-DSF, F-STA, F-GAM)

Levantamento somente leitura sobre o código da `desenvolvimento` (cópia no disco), em 14/11/2026. Fontes: `docs/9.plano_de_testes.md` (§9.6, que não tem casos destas três features), `docs/plano-de-desenvolvimento/periodo-2/feature-F-DSF.md`, `feature-F-STA.md`, `feature-F-GAM.md` e `docs/orquestador/REQUISITOS.md` (§2.1, §5.7, §5.8, §5.12, RN-03, RN-04, RN-08, RN-17, RN-18, RN-20, §8, §9).

**Contagem.** Um `it`/`test`/`testWidgets` = 1, inclusive `it.each` e o `testWidgets` dentro de laço `for` (Dart). Nenhum `skip`, `todo`, `only`, `xit` ou `xdescribe` nos arquivos listados.

**Citação dos testes.** Mesmo formato do plano. Nos `*.int-spec.ts` o `describe` de fora, que só embrulha o arquivo (`desafios (integração)`, `estatísticas (integração)`, `sequência diária (integração)`), fica de fora, como em CT-EST-05; os `describe` internos entram. No Vitest e no Jest unitário, todos os `describe` entram. No Flutter, entra o `group` quando existe. Todos os nomes foram conferidos no arquivo (Grep/leitura).

**Opcionais do P3 fora da conta.** Os testes de distribuição de notas (RF-STA-04, F-STA-OPC) que estão nos mesmos arquivos da F-STA estão contados à parte (coluna "da feature"). Não há teste de F-DSF-OPC ou F-GAM-OPC nos arquivos destas features.

Dono das três features: **Vicenzo Fonseca**.

---

## F-DSF — Desafios (RF-DSF-01..04, 06; `leitura` + mobile)

### Arquivos de teste

| Arquivo | Testes no arquivo | Da feature | O que cobre |
|---|---|---|---|
| `LE/src/desafios/dominio/desafio.spec.ts` | 3 | 3 | RF-DSF-01: teto do valor-alvo por unidade (decisão do dono de 09/10) e mensagem em pt-BR |
| `LE/src/desafios/dominio/janelas.spec.ts` | 13 | 13 | RN-20.1 (diária, semana ISO, mês, ano, hoje no fuso), RN-20.2 e RN-20.9 (janelas a materializar), materialização em dia |
| `LE/test/integracao/desafios.int-spec.ts` | 36 | 36 | RF-DSF-01..04 e 06, RN-20 (unidade × janela), RN-20.2 a 20.10, RN-04 (abandonada e releitura incompleta), RNF-SEC-01/02/05, RNF-ERR-04, RNF-DES-02, backfill, mensageria (fila de métricas, duplicata, retry, DLQ, schema — RNF-ERR-06/07, RNF-SEC-32, RNF-TST-03) |
| `MOB/features/desafios/desafios_service_test.dart` | 6 | 6 | Contrato do serviço: listar, criar com fuso e chave, PATCH só com a mudança, pausar/retomar/excluir, falha não avisa, resposta inválida |
| `MOB/features/desafios/desafios_page_test.dart` | 21 | 21 | RF-DSF-03/04 na lista: cards, pausados, cumprido, cores, vazio, 503, cold start, timeout, menu, pausar, toast com a mesma chave, 409, exclusão, paginação, recarga adiada |
| `MOB/features/desafios/desafio_form_page_test.dart` | 13 | 13 | RF-DSF-01/04 no formulário: validações, teto, 422 no campo, faixas, PATCH só com a mudança, retry com a mesma chave, exclusão |
| `MOB/features/desafios/desafios_do_perfil_test.dart` | 10 | 10 | Bloco `Desafios` do Meu perfil (RF-DSF-03): cards compactos, `Mais N`, só pausados, vazio, falha isolada, recarga, posição na página |
| `MOB/features/desafios/textos_test.dart` | 8 | 8 | Textos do cliente: título, janela, `Faltam`/`Cumprido`, data da pausa, rótulos de leitor de tela, teto, faixas |
| `MOB/features/desafios/rotas_desafios_test.dart` | 3 | 3 | Rotas bloco → lista → edição, edição sem `extra`, `Novo desafio` |
| **Total** | **113** | **113** | 9 arquivos: 52 no backend (16 unitários, 36 de integração/mensageria) e 61 no mobile |

### Casos previstos

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-DSF-01 | RF-DSF-01 | Criar um desafio | 201 com unidade, janela, alvo, fuso, não pausado e a janela corrente zerada | integração | `LE/test/integracao/desafios.int-spec.ts` › CRUD (RF-DSF-01/04) › "cria com a janela corrente zerada" |
| CT-DSF-02 | RF-DSF-01, RN-20 | As 12 combinações de unidade e janela no mesmo leitor | Todas aceitas e ativas ao mesmo tempo (12 na listagem) | integração | `LE/test/integracao/desafios.int-spec.ts` › CRUD (RF-DSF-01/04) › "qualquer unidade combina com qualquer janela, vários ao mesmo tempo (RN-20)" |
| CT-DSF-03 | RF-DSF-01 | Unidade, janela, alvo, fuso ou campo extra inválidos; alvo acima do teto da unidade | 400 no corpo malformado; 422 com `campos.valorAlvo` acima do teto; nada gravado | integração | `LE/test/integracao/desafios.int-spec.ts` › CRUD (RF-DSF-01/04) › "corpo malformado é 400 e alvo acima do teto da unidade é 422" |
| CT-DSF-04 | RF-DSF-01 | Teto do valor-alvo por unidade | 0 e acima de 100.000 páginas/minutos ou 1.000 livros recusados | unitário | `LE/src/desafios/dominio/desafio.spec.ts` › valor-alvo por unidade › "%s recusa %d" |
| CT-DSF-05 | RNF-ERR-04 | Repetir a criação com a mesma `Idempotency-Key` | Mesmo desafio, sem duplicar; outra carga com a chave é 409 | integração | `LE/test/integracao/desafios.int-spec.ts` › CRUD (RF-DSF-01/04) › "repetir a chave devolve o mesmo desafio; outra carga com a chave é 409 (RNF-ERR-04)" |
| CT-DSF-06 | RNF-SEC-01 | Listar e criar sem token | 401 | integração | `LE/test/integracao/desafios.int-spec.ts` › CRUD (RF-DSF-01/04) › "sem token é 401" |
| CT-DSF-07 | RNF-SEC-02, RNF-SEC-05 | Outro leitor tenta pausar, editar e excluir um desafio que não é dele | 404 nas três ações; o desafio não aparece na listagem dele | integração | `LE/test/integracao/desafios.int-spec.ts` › CRUD (RF-DSF-01/04) › "desafio de outra pessoa não existe para quem pede (SEC-02)" |
| CT-DSF-08 | RF-DSF-04 | Excluir um desafio com histórico, pausa e contribuição | 204 (também na repetição com a mesma chave); janelas, contribuições e pausas apagadas | integração | `LE/test/integracao/desafios.int-spec.ts` › CRUD (RF-DSF-01/04) › "excluir leva janelas, contribuições e pausas; repetir a chave é 204" |
| CT-DSF-09 | RF-DSF-03, RNF-DES-02 | Listar desafios ativos e pausados | Ativos por janela mais curta e mais novos primeiro, pausados no fim, paginação com `totalItens` | integração | `LE/test/integracao/desafios.int-spec.ts` › listagem (RF-DSF-03, RNF-DES-02) › "ativos por janela mais curta e mais novos primeiro; pausados no fim; paginada" |
| CT-DSF-10 | RN-20.1 | Janela semanal de várias datas, inclusive domingo | Semana de calendário ISO, de segunda a domingo | unitário | `LE/src/desafios/dominio/janelas.spec.ts` › janelas de calendário (RN-20.1) › "semanal ISO: %s cai em %s a %s" |
| CT-DSF-11 | RN-20.9 | Desafio diário criado há 3 dias, consultado hoje | Períodos decorridos materializados, inclusive vazios, encerrados; o de hoje aberto | integração | `LE/test/integracao/desafios.int-spec.ts` › listagem (RF-DSF-03, RNF-DES-02) › "materializa os períodos decorridos, inclusive vazios, desde a criação (RN-20.9)" |
| CT-DSF-12 | RF-DSF-02, RN-20.5 | Um progresso com páginas e minutos e quatro desafios ativos | Soma nos de páginas (diário e semanal) e no de minutos; o de livros não muda | integração | `LE/test/integracao/desafios.int-spec.ts` › progresso e finalização (RF-DSF-02/06) › "um progresso alimenta todos os desafios compatíveis (RN-20.5)" |
| CT-DSF-13 | RN-20.2 | Desafio anual criado depois de progressos do ano | A janela corrente já soma o registrado desde 1º de janeiro e fica cumprida | integração | `LE/test/integracao/desafios.int-spec.ts` › progresso e finalização (RF-DSF-02/06) › "criado no meio da janela, considera o já registrado nela (RN-20.2)" |
| CT-DSF-14 | RF-DSF-06, RN-20.3, RN-20.4, RN-20.8 | Leitura iniciada há 5 dias e finalizada hoje com data de fim retroativa, releitura finalizada e livro pessoal finalizado | Os três contam no dia da ação, não no `dataFim`; a janela diária fica cumprida | integração | `LE/test/integracao/desafios.int-spec.ts` › progresso e finalização (RF-DSF-02/06) › "livros contam ao finalizar, no dia da ação, inclusive releitura e livro pessoal (RN-20.3/20.4)" |
| CT-DSF-15 | RN-20.3, RN-04 | Leitura abandonada e releitura abandonada (incompleta) | Não contam como livro; só a leitura finalizada conta | integração | `LE/test/integracao/desafios.int-spec.ts` › progresso e finalização (RF-DSF-02/06) › "abandonada e releitura incompleta não contam como livro (RN-04)" |
| CT-DSF-16 | RN-20.10, RN-17.6 | Excluir o último trecho de progresso | O acumulado volta na mesma transação, sem evento | integração | `LE/test/integracao/desafios.int-spec.ts` › progresso e finalização (RF-DSF-02/06) › "excluir trecho de progresso recalcula na mesma transação" |
| CT-DSF-17 | RN-20.7, RN-20.10 | Captura offline de 10 dias atrás chega depois de o alvo ser editado | A semana encerrada é corrigida com o alvo antigo e fica cumprida; a corrente mantém o alvo novo | integração | `LE/test/integracao/desafios.int-spec.ts` › progresso e finalização (RF-DSF-02/06) › "captura offline sincronizada depois corrige a janela encerrada com a configuração dela (RN-20.10)" |
| CT-DSF-18 | RF-DSF-04 | Pausar e retomar, e repetir cada ação | Estado e `pausadoDesde` na resposta; repetir o mesmo estado é 409 | integração | `LE/test/integracao/desafios.int-spec.ts` › pausa (RN-20.6) › "pausar e retomar mostram o estado; repetir o estado é 409" |
| CT-DSF-19 | RN-20.6 | Progressos durante duas pausas, um deles capturado offline e sincronizado depois da retomada | Nada da pausa conta, nem o que chegou depois; desafio nunca pausado recebe tudo; duas pausas retidas | integração | `LE/test/integracao/desafios.int-spec.ts` › pausa (RN-20.6) › "fatos ocorridos durante as pausas não contam, mesmo sincronizados depois; o resto conta" |
| CT-DSF-20 | RN-20.7 | Editar de semanal para mensal no meio do mês | Semanas encerradas intactas com o alvo antigo; o mês corrente recalculado sem conflito de unicidade | integração | `LE/test/integracao/desafios.int-spec.ts` › edição (RN-20.7) › "semanal para mensal preserva as semanas encerradas e recalcula o mês" |
| CT-DSF-21 | RN-20.7 | Trocar a unidade de páginas para minutos | Só a janela corrente usa a unidade nova; a de ontem continua em páginas | integração | `LE/test/integracao/desafios.int-spec.ts` › edição (RN-20.7) › "trocar a unidade só vale da janela corrente em diante" |
| CT-DSF-22 | RF-DSF-02, RF-DSF-06 | Backfill com fatos que nunca chegaram ao consumidor | Recompõe páginas e livros; rodar de novo não duplica | integração | `LE/test/integracao/desafios.int-spec.ts` › "backfill recompõe quem tinha fatos antes do consumidor" |
| CT-DSF-23 | RF-DSF-06, RNF-ARQ-06 | `leitura.finalizada` publicado pela outbox | Roteado à fila `leai.leitura.metricas`, consumido sem nack, desafio de livros soma 1 | mensageria | `LE/test/integracao/desafios.int-spec.ts` › consumo (RNF-ERR-06/07, RNF-TST-03) › "leitura.finalizada chega pela fila de métricas" |
| CT-DSF-24 | RNF-ERR-06 | Reentrega do mesmo `eventId` | Um recibo só e o acumulado não dobra | mensageria | `LE/test/integracao/desafios.int-spec.ts` › consumo (RNF-ERR-06/07, RNF-TST-03) › "reentrega do mesmo eventId não repete efeito" |
| CT-DSF-25 | RNF-ERR-07 | Duas falhas transitórias no recálculo | Retentado; um ack e o efeito acontece uma vez | mensageria | `LE/test/integracao/desafios.int-spec.ts` › consumo (RNF-ERR-06/07, RNF-TST-03) › "falha transitória é retentada e o efeito acontece uma vez" |
| CT-DSF-26 | RNF-ERR-07 | Falha persistente no recálculo | Nack para a DLQ, sem recibo e sem contribuição | mensageria | `LE/test/integracao/desafios.int-spec.ts` › consumo (RNF-ERR-06/07, RNF-TST-03) › "falha persistente vai para a DLQ sem recibo" |
| CT-DSF-27 | RNF-SEC-32 | `leitura.finalizada` com `data` fora do schema | Nack para a DLQ, sem recibo | mensageria | `LE/test/integracao/desafios.int-spec.ts` › consumo (RNF-ERR-06/07, RNF-TST-03) › "leitura.finalizada fora do schema vai para a DLQ sem efeito" |
| CT-DSF-28 | RF-DSF-03 | Mobile: lista de desafios | Cada card com a janela, o acumulado e o que falta, sem porcentagem | mobile | `MOB/features/desafios/desafios_page_test.dart` › "mostra cada desafio com a janela, o acumulado e o que falta, sem porcentagem" |
| CT-DSF-29 | RF-DSF-04 | Mobile: menu de ações de um desafio ativo | Oferece editar, pausar e excluir; editar abre a edição | mobile | `MOB/features/desafios/desafios_page_test.dart` › "o menu do ativo oferece editar, pausar e excluir; editar abre a edição" |
| CT-DSF-30 | RF-DSF-01 | Mobile: criar pelo formulário | Envia unidade, janela, alvo e fuso do aparelho e volta para a lista | mobile | `MOB/features/desafios/desafio_form_page_test.dart` › "criar manda a configuração com o fuso e volta para a lista" |
| CT-DSF-31 | RF-DSF-04, RN-20.7 | Mobile: editar de semanal para mensal | Faixa com o mês novo; PATCH só com a mudança | mobile | `MOB/features/desafios/desafio_form_page_test.dart` › edição › "trocar semanal por mensal: faixa com o mês novo e o plural antigo; PATCH só com a mudança" (nome em duas strings Dart adjacentes) |
| CT-DSF-32 | RNF-ERR-04 | Mobile: falha de rede ao pausar | Toast persistente; "Tentar de novo" reenvia com a mesma chave | mobile | `MOB/features/desafios/desafios_page_test.dart` › "falha ao pausar: toast persistente e \"Tentar de novo\" com a mesma chave" (no código: `'falha ao pausar: toast persistente e "Tentar de novo" com a mesma chave'`) |
| CT-DSF-33 | RNF-TST-06 | Mobile: `leitura` indisponível ao listar | Banner de falha; "Tentar de novo" recarrega | mobile | `MOB/features/desafios/desafios_page_test.dart` › "serviço indisponível mostra o banner e \"Tentar de novo\" recarrega" (no código: `'serviço indisponível mostra o banner e "Tentar de novo" recarrega'`) |
| CT-DSF-34 | RF-DSF-03 | Mobile: bloco `Desafios` no Meu perfil | Dois ativos em cards compactos e `Mais N desafios` contando os pausados | mobile | `MOB/features/desafios/desafios_do_perfil_test.dart` › "dois ativos em cards compactos e \"Mais N desafios\" contando os pausados" (no código: `'dois ativos em cards compactos e "Mais N desafios" contando os pausados'`) |

Outros testes da feature que podem virar caso se o plano quiser mais densidade: `janelas.spec.ts` › janelas de calendário (RN-20.1) › "hoje é o dia local no fuso informado"; `desafios.int-spec.ts` › progresso e finalização (RF-DSF-02/06) › "minutos não informados não contam nem geram contribuição" e "mensagem atrasada de progresso já excluído não o ressuscita"; pausa (RN-20.6) › "livro finalizado durante a pausa não conta"; edição (RN-20.7) › "fuso para trás: a corrente é o hoje do fuso novo, com o alvo novo"; `desafios_page_test.dart` › "timeout cai no banner de falha" e "409 ao retomar (já retomado em outro lugar) recarrega sem toast"; `desafio_form_page_test.dart` › "422 com campos.valorAlvo cai no campo, sem banner".

### Sem teste aparente (candidatos a lacuna) — dono: Vicenzo Fonseca

| Item | O que procurei e onde | Situação |
|---|---|---|
| Critério "Desafios funcionam no app **em DES**" | Critério e DoD da feature | Desmarcado no arquivo de feature; é verificação manual do merge de fechamento do P2, sem teste automatizado (fora de escopo pelo §9.2) |
| 401 em `PATCH`, `DELETE`, `/pausar` e `/retomar` | `desafios.int-spec.ts`: o único teste sem token cobre só `GET /desafios` e `POST /desafios` | Parcial (RNF-SEC-01) |
| RN-20.8 explícita (janela cumprida por registro de leitura iniciada em janela anterior) | Grep por `20.8` e leitura do arquivo de integração | Só implícita: em CT-DSF-14 a leitura começa 5 dias antes e cumpre a janela diária de livros. Nenhum teste com páginas nomeia a regra |
| Mobile: 404 nas ações recarrega a lista em silêncio, e excluir com 404 na edição volta como sucesso (decisão do dono de 10/10) | Grep por `404` em `MOB/features/desafios/`: nenhum resultado (só 409 tem teste) | Sem teste |
| Prova de que a mensagem chega à DLQ | `LE/test/integracao/broker-em-memoria.ts`: o `nack` só é registrado, sem o flag `requeue` nem o roteamento pela DLX | Os testes "vai para a DLQ" provam o nack, não a chegada na `.dlq` nem o `requeue=false` (vale também para F-STA e F-GAM) |

### Divergências e observações

- Serviço, RFs e clientes batem com a tabela recebida: `leitura` + mobile, RF-DSF-01..04 e 06, fora do web (§2.1).
- Números do arquivo de feature desatualizados. Ele diz 23 unitários e 32 de integração (09/10) e 60 mobile (10/10). Hoje: 16 blocos unitários (25 se cada linha de `it.each` contar), 36 de integração (os testes do review de 10/10 entraram) e 61 mobile.
- Nenhum teste em `skip`/`todo`. Nenhum teste com nome que prometa mais do que verifica, salvo a ressalva da DLQ acima.

---

## F-STA — Estatísticas (RF-STA-01, 02, 03, 05; `leitura` + web + mobile)

### Arquivos de teste

| Arquivo | Testes no arquivo | Da feature | O que cobre |
|---|---|---|---|
| `LE/src/estatisticas/dominio/estatisticas.spec.ts` | 22 | 17 (5 de RF-STA-04, `montarDistribuicao`) | Período da consulta, médias com e sem denominador (RF-STA-02), resumo do ano e do acumulado (RF-STA-01), anos do seletor, série dos gráficos (RF-STA-03) |
| `LE/test/integracao/estatisticas.int-spec.ts` | 28 | 25 (3 de RF-STA-04: dois em `GET /me/estatisticas`, um no perfil) | RF-STA-01/02/03/05, RN-04 (inv. 2), RN-17, RN-18.2, exclusão de trecho, ciclo da nota, backfill, RN-08 no perfil, RNF-SEC-01/02, validação, mensageria (duplicata, retry, DLQ, mensagem atrasada) |
| `WEB/services/leitura.spec.ts` | 25 | 3 (`describe` "estatísticas (F-STA)") | URLs e período de `/me/estatisticas`, `/graficos` e `/perfis/{id}/estatisticas`, 403 como `ApiError` |
| `WEB/estatisticas/escala.spec.ts` | 5 | 5 | Escala do eixo Y (1-2-5, no máximo quatro marcas) |
| `WEB/estatisticas/formatos.spec.ts` | 4 | 4 | Milhar e decimal pt-BR, tempo em partes, datas e "hoje" de São Paulo |
| `WEB/estatisticas/textos.spec.ts` | 10 | 10 | Linha do período, médias ausentes, subtítulo, rótulo direto, balão, leitor de tela |
| `WEB/estatisticas/useEstatisticas.spec.ts` | 3 | 3 | Período na rota e itens do seletor |
| `WEB/components/estatisticas/GraficoDeColunas.spec.ts` | 9 | 9 | RF-STA-03: colunas por mês, rótulo único, balão no hover e no teclado, tabela, acumulado por ano, sem dados |
| `WEB/views/perfil/EstatisticasView.spec.ts` | 10 | 10 | Painel: totais, médias e gráficos, seletor, rota, acumulado, médias ausentes, vazio, timeout e 503, skeleton, resposta atrasada, seta só no celular |
| `WEB/views/perfil/PerfilView.spec.ts` | 14 | 3 (`describe` "Estatísticas do ano (F-STA)") | Bloco do Meu perfil: totais, vazio, falha isolada |
| `WEB/views/perfil/PerfilDeOutroView.spec.ts` | 25 | 5 (+2 de RF-STA-04 no mesmo `describe`) | Bloco no perfil de outro leitor sob RN-08: visível, restrito, 403/404, ano sem leitura, falha |
| `MOB/features/estatisticas/estatisticas_service_test.dart` | 7 | 6 (1 de RF-STA-04) | Período explícito, médias nulas, perfil, 403, resposta inválida, período da rota |
| `MOB/features/estatisticas/dominio_test.dart` | 11 | 11 | Escala, formatos, textos e seletor (espelho do web) |
| `MOB/features/estatisticas/estatisticas_page_test.dart` | 17 | 17 | Painel e gráfico de colunas: períodos, rota, acumulado, médias ausentes, vazio, 503, timeout, skeleton, resposta atrasada, recarga silenciosa, escuro, rótulo único, mês zero, toque, TalkBack, tabela |
| `MOB/features/estatisticas/estatisticas_do_perfil_test.dart` | 12 | 9 (3 de RF-STA-04: histograma do perfil alheio) | Bloco no Meu perfil e no perfil de outro leitor: totais, vazio, falha, 403/404, posição, RN-08 |
| `MOB/features/estatisticas/rotas_estatisticas_test.dart` | 2 | 2 | Bloco → painel com o período na rota, rota direta |
| **Total** | **204** | **139** | 16 arquivos: 42 no backend (17 unitários, 25 de integração/mensageria), 52 no web e 45 no mobile |

Fora desta conta, por serem só de RF-STA-04 (F-STA-OPC): `WEB/components/estatisticas/GraficoDeNotas.spec.ts` (7) e `MOB/features/estatisticas/graficos_de_notas_test.dart` (6).

### Casos previstos

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-STA-01 | RNF-SEC-01 | Painel e gráficos sem token | 401 | integração | `LE/test/integracao/estatisticas.int-spec.ts` › GET /me/estatisticas › "sem token é 401" |
| CT-STA-02 | RF-STA-01, RF-STA-02 | Leitor sem nenhuma leitura | Ano corrente com totais zerados e médias ausentes (`null`), nunca zero | integração | `LE/test/integracao/estatisticas.int-spec.ts` › GET /me/estatisticas › "sem leitura, o ano corrente zerado e médias ausentes" |
| CT-STA-03 | RF-STA-01 | `periodo` inválido (`26`, `todos`, ano com sufixo, `0999`) | 400 com o campo `periodo` | integração | `LE/test/integracao/estatisticas.int-spec.ts` › GET /me/estatisticas › "periodo=%s responde 400 no campo periodo" |
| CT-STA-04 | RF-STA-01, RF-STA-02 | Leituras em dois anos, consultadas por ano, no acumulado e no ano corrente | Livros, páginas e tempo por ano e no acumulado; páginas/dia e dias/livro corretos; seletor com os anos que têm registro | integração | `LE/test/integracao/estatisticas.int-spec.ts` › GET /me/estatisticas › "totais por ano, acumulado e anos do seletor (RF-STA-01/02)" |
| CT-STA-05 | RNF-SEC-02 | Outro leitor consulta o próprio painel | Vê só os dados dele (zero), não os de quem leu | integração | `LE/test/integracao/estatisticas.int-spec.ts` › GET /me/estatisticas › "só mostra os dados do próprio leitor (SEC-02)" |
| CT-STA-06 | RF-STA-02, RN-04 (inv. 2) | Vários progressos e livros no mesmo dia; uma das leituras é abandonada | O dia conta uma vez no denominador; páginas da leitura abandonada entram no total | integração | `LE/test/integracao/estatisticas.int-spec.ts` › GET /me/estatisticas › "um dia com vários progressos e livros conta uma vez; páginas de leitura abandonada contam (RN-04)" |
| CT-STA-07 | RF-STA-02 | Leitura com intervalo abandonado e releitura, ambas concluídas | Dias por livro com duração inclusiva, contando o intervalo, e a releitura como outra ocorrência | integração | `LE/test/integracao/estatisticas.int-spec.ts` › GET /me/estatisticas › "dias por livro: duração inclusiva, com o intervalo abandonado e releituras à parte" |
| CT-STA-08 | RF-STA-02 | Criar, editar e remover notas | Nota média e quantidade corrigidas na hora; nota sozinha não abre ano | integração | `LE/test/integracao/estatisticas.int-spec.ts` › GET /me/estatisticas › "criar, editar e remover nota corrigem a média e a quantidade" |
| CT-STA-09 | RF-STA-01, RN-17.6 | Excluir o último trecho de progresso | Páginas, tempo e dias com leitura corrigidos na mesma transação | integração | `LE/test/integracao/estatisticas.int-spec.ts` › GET /me/estatisticas › "excluir trecho de progresso corrige páginas, tempo e dias na mesma transação" |
| CT-STA-10 | RF-STA-03, RN-18.2 | Progresso offline de fevereiro sincronizado em setembro; captura em outro fuso | Cada registro cai no mês da data local do dispositivo | integração | `LE/test/integracao/estatisticas.int-spec.ts` › GET /me/estatisticas › "progresso conta na data local do dispositivo, mesmo sincronizado depois (RN-18.2)" |
| CT-STA-11 | RF-STA-03 | Gráficos de um ano e do acumulado | Ano: um ponto por mês desde o primeiro registro, páginas e livros; acumulado: um ponto por ano | integração | `LE/test/integracao/estatisticas.int-spec.ts` › GET /me/estatisticas/graficos (RF-STA-03) › "no ano, um ponto por mês desde o primeiro com registro; no acumulado, um por ano" |
| CT-STA-12 | RF-STA-05 | Backfill do histórico anterior ao consumidor | Totais recompostos; baldes de quem ficou sem dado apagados; rodar de novo não muda nada | integração | `LE/test/integracao/estatisticas.int-spec.ts` › GET /me/estatisticas › "backfill recompõe o histórico e limpa quem ficou sem nada" |
| CT-STA-13 | RN-08 | Perfil público visto por qualquer leitor | 200 só com os três totais do ano | integração | `LE/test/integracao/estatisticas.int-spec.ts` › GET /perfis/{usuarioId}/estatisticas (RN-08) › "perfil público: qualquer leitor vê só os totais do ano" |
| CT-STA-14 | RN-08, RNF-SEC-03 | Perfil privado visto por quem não segue | 403 `ACESSO_NEGADO` | integração | `LE/test/integracao/estatisticas.int-spec.ts` › GET /perfis/{usuarioId}/estatisticas (RN-08) › "perfil privado sem seguimento aceito responde 403" |
| CT-STA-15 | RN-08 | Perfil privado visto por seguidor aceito | 200 com os totais | integração | `LE/test/integracao/estatisticas.int-spec.ts` › GET /perfis/{usuarioId}/estatisticas (RN-08) › "perfil privado com seguimento aceito vê os totais" |
| CT-STA-16 | RN-08 | Perfil sem linha na VIEW de perfil | 404 | integração | `LE/test/integracao/estatisticas.int-spec.ts` › GET /perfis/{usuarioId}/estatisticas (RN-08) › "perfil ausente da VIEW responde 404" |
| CT-STA-17 | RF-STA-05, RNF-ERR-06 | Reentrega do mesmo `eventId` de `progresso.registrado` | Dois acks, um recibo, páginas sem dobrar | mensageria | `LE/test/integracao/estatisticas.int-spec.ts` › consumo (RNF-ERR-06/07, RNF-TST-03) › "reentrega do mesmo eventId não repete efeito" |
| CT-STA-18 | RF-STA-05, RNF-ERR-07 | Duas falhas transitórias no recálculo | Retentado; efeito uma vez | mensageria | `LE/test/integracao/estatisticas.int-spec.ts` › consumo (RNF-ERR-06/07, RNF-TST-03) › "falha transitória é retentada e o efeito acontece uma vez" |
| CT-STA-19 | RF-STA-05, RNF-ERR-07 | Falha persistente no recálculo | Nack para a DLQ, sem recibo e sem baldes | mensageria | `LE/test/integracao/estatisticas.int-spec.ts` › consumo (RNF-ERR-06/07, RNF-TST-03) › "falha persistente vai para a DLQ sem recibo e sem baldes" |
| CT-STA-20 | RF-STA-05, RN-17.6 | Evento de um progresso já excluído chega depois | Ack; o progresso não volta aos totais | mensageria | `LE/test/integracao/estatisticas.int-spec.ts` › consumo (RNF-ERR-06/07, RNF-TST-03) › "mensagem atrasada de progresso já excluído não o ressuscita" |
| CT-STA-21 | RF-STA-02 | Média sem denominador | Ausente (`null`), nunca zero | unitário | `LE/src/estatisticas/dominio/estatisticas.spec.ts` › médias › "sem denominador fica ausente, nunca zero (RF-STA-02)" |
| CT-STA-22 | RF-STA-01 | Resumo do acumulado a partir dos baldes mensais | Soma todos os meses: totais e médias | unitário | `LE/src/estatisticas/dominio/estatisticas.spec.ts` › resumo do período › "o acumulado soma todos os meses" |
| CT-STA-23 | RF-STA-01, RF-STA-02, RF-STA-03 | Web: abrir o painel | Totais, médias e os dois gráficos do ano corrente em pt-BR | web | `WEB/views/perfil/EstatisticasView.spec.ts` › EstatisticasView › "abre no ano corrente com totais, médias e gráficos em pt-BR (5.1)" |
| CT-STA-24 | RF-STA-02 | Web: período sem denominador | A média vira frase, nunca zero | web | `WEB/views/perfil/EstatisticasView.spec.ts` › EstatisticasView › "média sem denominador vira frase, nunca zero (5.3)" |
| CT-STA-25 | RNF-TST-06 | Web: tempo esgotado e serviço fora do ar | Banner com "Tentar de novo", seletor mantido; tentar de novo recarrega | web | `WEB/views/perfil/EstatisticasView.spec.ts` › EstatisticasView › "%s vira o banner com Tentar de novo, mantendo o seletor (RNF-TST-04/06)" |
| CT-STA-26 | RF-STA-03 | Web: alternar o gráfico para a tabela | Uma `<table>` de verdade no lugar da área, só naquele card | web | `WEB/components/estatisticas/GraficoDeColunas.spec.ts` › GraficoDeColunas › "Ver como tabela troca a área por uma tabela de verdade, só neste card" |
| CT-STA-27 | RF-STA-01 | Web: bloco "Estatísticas do ano" no Meu perfil | Totais do ano corrente e "Ver estatísticas" levando ao painel | web | `WEB/views/perfil/PerfilView.spec.ts` › PerfilView › Estatísticas do ano (F-STA) › "os totais do ano corrente, com Ver estatísticas levando ao painel" |
| CT-STA-28 | RN-08 | Web: perfil de outro leitor com conteúdo restrito | Nem pede as estatísticas; o bloco não aparece | web | `WEB/views/perfil/PerfilDeOutroView.spec.ts` › PerfilDeOutroView › Estatísticas do ano (F-STA) › "perfil restrito nem pede as estatísticas" |
| CT-STA-29 | RN-08 | Web: 403 ou 404 do `leitura` no perfil de outro leitor | O bloco some | web | `WEB/views/perfil/PerfilDeOutroView.spec.ts` › PerfilDeOutroView › Estatísticas do ano (F-STA) › "%d do leitura esconde o bloco" |
| CT-STA-30 | RF-STA-01, RF-STA-02, RF-STA-03 | Mobile: abrir o painel | Totais, médias e os dois gráficos do ano corrente em pt-BR | mobile | `MOB/features/estatisticas/estatisticas_page_test.dart` › "abre no ano corrente com totais, médias e gráficos em pt-BR (4.1)" |
| CT-STA-31 | RNF-TST-06 | Mobile: serviço responde 503 | Banner com "Tentar de novo", faixa de períodos mantida | mobile | `MOB/features/estatisticas/estatisticas_page_test.dart` › "503 vira o banner com Tentar de novo, mantendo a faixa (4.9)" |
| CT-STA-32 | RF-STA-03 | Mobile: alternar o gráfico para a tabela | Tabela no lugar da área, com "até hoje" no mês corrente | mobile | `MOB/features/estatisticas/estatisticas_page_test.dart` › gráfico de colunas › "Ver como tabela troca a área pela tabela, com \"até hoje\" no mês corrente" (no código: `'Ver como tabela troca a área pela tabela, com "até hoje" no mês corrente'`) |
| CT-STA-33 | RN-08 | Mobile: perfil privado sem seguimento | Nem pede as estatísticas; a frase de restrição as cita | mobile | `MOB/features/estatisticas/estatisticas_do_perfil_test.dart` › no perfil de outro leitor › "privado sem seguimento: nem pede as estatísticas, e a frase de restrição as cita" |
| CT-STA-34 | RN-08 | Mobile: 403 ou 404 do `leitura` no perfil de outro leitor | O bloco some | mobile | `MOB/features/estatisticas/estatisticas_do_perfil_test.dart` › bloco isolado › "$status do leitura esconde o bloco do outro leitor" |

Outros testes da feature que podem virar caso: `estatisticas.int-spec.ts` › GET /perfis/{usuarioId}/estatisticas (RN-08) › "o próprio leitor vê o perfil privado dele", "usuarioId malformado responde 400 no campo usuarioId" e "%s responde 400"; `EstatisticasView.spec.ts` › EstatisticasView › "a resposta atrasada de um período anterior é descartada"; `estatisticas_page_test.dart` › "tempo esgotado também vira o banner (RNF-TST-04/06)" e "aviso de leitura recarrega em silêncio depois de 3 s"; `PerfilView.spec.ts` › PerfilView › Estatísticas do ano (F-STA) › "falha só no bloco, com Tentar de novo; o perfil continua de pé".

### Sem teste aparente (candidatos a lacuna) — dono: Vicenzo Fonseca

| Item | O que procurei e onde | Situação |
|---|---|---|
| Critério "O painel funciona **em DES**" (migration 0006 e backfill) | Critério e DoD | Desmarcado; verificação manual do fechamento do P2 |
| RNF-USA-03: contraste dos gráficos (colunas `musgo`, `musgo-claro` no escuro), parte do critério de RF-STA-03 | Grep por `musgo`, `contraste` e `cor` em `GraficoDeColunas.spec.ts`, `EstatisticasView.spec.ts` e `estatisticas_page_test.dart`: nenhum resultado | Sem teste. O mobile "modo escuro desenha sem erro" só prova que o tema escuro não lança exceção |
| RN-03: livro pessoal conta nos totais do dono | `estatisticas.int-spec.ts`: livro pessoal só aparece no teste de distribuição de notas (RF-STA-04, OPC) | Sem teste para RF-STA-01/02 |
| RNF-SEC-32 no efeito de estatísticas | `estatisticas.int-spec.ts` › consumo: não há mensagem fora do schema | Coberto no mesmo `MetricasConsumer` por CT-DSF-27 (`leitura.finalizada`) e CT-GAM-17 (`progresso.registrado`), não pelo arquivo da feature |
| RF-STA-05: consumo de `leitura.finalizada` no bloco de consumo | `estatisticas.int-spec.ts` › consumo usa só `progresso.registrado` | Só implícito: CT-STA-04 e CT-STA-11 finalizam leituras e passam pelo `processar()` (outbox → fila → consumidor) |
| 401 em `GET /perfis/{usuarioId}/estatisticas` | O teste "sem token é 401" cobre `/me/estatisticas` e `/me/estatisticas/graficos` | Sem teste para o endpoint de perfil |
| Conta suspensa (RN-08, suspensão) | "perfil ausente da VIEW responde 404" usa um id que nunca foi inserido; o comentário do teste diz "inexistente, suspensa ou em exclusão" | O teste prova só a conta inexistente; a suspensa fica inferida pela VIEW |
| Prova de chegada na DLQ | Ver F-DSF | Igual ao F-DSF: prova o nack |

### Divergências e observações

- Serviço, RFs e clientes batem com a tabela recebida: `leitura` + web + mobile; RF-STA-05 é só de servidor (coluna Web "—" no `REQUISITOS.md`).
- O arquivo de feature já registra que a spec fala em "editar o último progresso", que não existe desde 29/09/2026 (F-PRG). Só a exclusão de trecho recalcula, e é ela que os testes cobrem.
- Arquivos que misturam F-STA com F-STA-OPC (RF-STA-04), contados à parte acima: `estatisticas.spec.ts` (5), `estatisticas.int-spec.ts` (3), `PerfilDeOutroView.spec.ts` (2), `estatisticas_service_test.dart` (1) e `estatisticas_do_perfil_test.dart` (3). As respostas de `/me/estatisticas` e do perfil já trazem `distribuicaoNotas`, então os testes de F-STA usam `toEqual` com esse campo `null`.
- Números do arquivo de feature: 23 unitários e 31 de integração batem quando cada linha de `it.each` conta como teste (17 + 6 linhas de `recusa %p`; 25 + 3 + 3 linhas dos dois `it.each`). Os "54 novos" do mobile são de 12/10; hoje há 45 da F-STA nos arquivos de estatísticas (contagem por bloco, sem os da OPC).
- Nenhum teste em `skip`/`todo`.

---

## F-GAM — Sequência diária (RF-GAM-01..03; `leitura` + mobile)

### Arquivos de teste

| Arquivo | Testes no arquivo | Da feature | O que cobre |
|---|---|---|---|
| `LE/src/sequencia/dominio/sequencia.spec.ts` | 12 | 12 | `apurar` (RN-18.3, RN-18.5 pela ordem de chegada, RN-18.6, viradas de mês e ano) e `sequenciaVigente` (RF-GAM-03, RN-18.4, último fuso do dispositivo) |
| `LE/test/integracao/sequencia.int-spec.ts` | 14 | 14 | RF-GAM-01/02/03, RN-18.2 a 18.6, RNF-SEC-01/02, exclusão de trecho, backfill, mensageria (duplicata, retry, DLQ, schema, mensagem atrasada) |
| `MOB/features/sequencia/sequencia_test.dart` | 14 | 14 | RF-GAM-02 no Meu perfil: atual, recorde, zerada, singular, cores, skeleton, 503, timeout, contrato inválido, recarga silenciosa, posição e falha isolada |
| **Total** | **40** | **40** | 3 arquivos: 26 no backend e 14 no mobile |

O `MetricasConsumer` é o mesmo de F-DSF e F-STA. Os testes de consumo de `desafios.int-spec.ts` e `estatisticas.int-spec.ts` passam pelo mesmo consumidor, mas verificam o efeito da feature deles.

### Casos previstos

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-GAM-01 | RNF-SEC-01 | Consultar a sequência sem token | 401 | integração | `LE/test/integracao/sequencia.int-spec.ts` › GET /me/sequencia › "sem token é 401" |
| CT-GAM-02 | RF-GAM-02 | Leitor sem progresso | `0/0` e último dia nulo | integração | `LE/test/integracao/sequencia.int-spec.ts` › GET /me/sequencia › "sem progresso, zeros e último dia nulo" |
| CT-GAM-03 | RNF-SEC-02 | Outro leitor consulta a própria sequência | Vê só a dele (0), não a de quem leu (2) | integração | `LE/test/integracao/sequencia.int-spec.ts` › GET /me/sequencia › "só mostra a sequência do próprio leitor (SEC-02)" |
| CT-GAM-04 | RF-GAM-01, RN-18.3 | Três progressos no mesmo dia | Sequência 1; um só dia gravado | integração | `LE/test/integracao/sequencia.int-spec.ts` › "vários progressos no mesmo dia contam uma vez (RN-18.3)" |
| CT-GAM-05 | RF-GAM-01 | Dias consecutivos com leitura | Um trecho só, atual e maior iguais ao número de dias | unitário | `LE/src/sequencia/dominio/sequencia.spec.ts` › apurar (RN-18) › "dias consecutivos formam um trecho só" |
| CT-GAM-06 | RF-GAM-03, RN-18.4, RN-18.6 | Três dias seguidos, depois dias vazios, depois um novo dia | Atual zera e a maior fica 3; o novo dia recomeça em 1 | integração | `LE/test/integracao/sequencia.int-spec.ts` › "dias seguidos somam; um dia vazio zera a atual e preserva a maior (RN-18.4, 18.6)" |
| CT-GAM-07 | RF-GAM-03, RN-18.4 | Último dia com leitura foi anteontem | Um dia inteiro se encerrou sem leitura: atual 0 | unitário | `LE/src/sequencia/dominio/sequencia.spec.ts` › sequenciaVigente (RF-GAM-03, RN-18.4) › "anteontem: um dia se encerrou sem leitura, zera" |
| CT-GAM-08 | RF-GAM-03, RN-18.4 | Último dia com leitura foi ontem | O dia de hoje ainda não terminou: a sequência segue vigente | unitário | `LE/src/sequencia/dominio/sequencia.spec.ts` › sequenciaVigente (RF-GAM-03, RN-18.4) › "leu ontem: o dia de hoje ainda não terminou, segue vigente" |
| CT-GAM-09 | RN-18.2 | Mesmo instante consultado com último fuso em São Paulo e em Tóquio | O "hoje" é o do último fuso do dispositivo, não o de quem consulta | unitário | `LE/src/sequencia/dominio/sequencia.spec.ts` › sequenciaVigente (RF-GAM-03, RN-18.4) › "o hoje é o do último fuso do dispositivo, não o de quem consulta" |
| CT-GAM-10 | RN-18.2 | Captura antiga em outro fuso chega depois da mais recente | O último fuso continua o da captura mais recente | integração | `LE/test/integracao/sequencia.int-spec.ts` › "captura antiga não troca o último fuso conhecido" |
| CT-GAM-11 | RN-18.5 | Progresso de ontem, capturado offline, chega depois de a sequência zerar | Os dias se recompõem: atual e maior passam a 3 | integração | `LE/test/integracao/sequencia.int-spec.ts` › "captura offline sincronizada depois recompõe os dias, mesmo após zerar (RN-18.5)" |
| CT-GAM-12 | RN-18.6 | Trecho de 4 dias, buraco e trecho de 2 | Atual 2 e maior 4 | unitário | `LE/src/sequencia/dominio/sequencia.spec.ts` › apurar (RN-18) › "buraco reinicia o trecho e a maior fica preservada (RN-18.6)" |
| CT-GAM-13 | RF-GAM-01, RN-17.6 | Excluir o progresso de hoje | Recalculado na mesma transação: volta a 1, último dia ontem | integração | `LE/test/integracao/sequencia.int-spec.ts` › "excluir trecho de progresso recalcula na mesma transação" |
| CT-GAM-14 | RF-GAM-01 | Backfill de progressos anteriores ao consumidor | Sequência recomposta; rodar de novo não muda | integração | `LE/test/integracao/sequencia.int-spec.ts` › "backfill recompõe quem tinha progresso antes do consumidor" |
| CT-GAM-15 | RNF-ERR-06 | Reentrega do mesmo `eventId` de `progresso.registrado` | Dois acks, um recibo, sequência 1 | mensageria | `LE/test/integracao/sequencia.int-spec.ts` › consumo (RNF-ERR-06/07, RNF-TST-03) › "reentrega do mesmo eventId não repete efeito" |
| CT-GAM-16 | RNF-ERR-07 | Falha persistente no recálculo | Nack para a DLQ, sem recibo e sem sequência gravada | mensageria | `LE/test/integracao/sequencia.int-spec.ts` › consumo (RNF-ERR-06/07, RNF-TST-03) › "falha persistente vai para a DLQ sem recibo" |
| CT-GAM-17 | RNF-SEC-32 | `progresso.registrado` com `dataLocal` fora do schema | Nack para a DLQ, sem efeito | mensageria | `LE/test/integracao/sequencia.int-spec.ts` › consumo (RNF-ERR-06/07, RNF-TST-03) › "data fora do schema vai para a DLQ sem efeito" |
| CT-GAM-18 | RF-GAM-01, RN-17.6 | Evento de um progresso já excluído chega depois | Ack; a sequência continua zerada e nenhum dia é gravado | mensageria | `LE/test/integracao/sequencia.int-spec.ts` › "mensagem atrasada de progresso já excluído não o ressuscita" |
| CT-GAM-19 | RF-GAM-02 | Mobile: bloco "Sequência diária" no Meu perfil | Pede `/me/sequencia` e mostra a atual, o recorde e a regra | mobile | `MOB/features/sequencia/sequencia_test.dart` › "pede /me/sequencia e mostra a atual, o recorde e a regra" |
| CT-GAM-20 | RF-GAM-02, RN-18.6 | Mobile: sequência zerada com recorde | Não é erro: "leia hoje para começar" e o recorde mantido | mobile | `MOB/features/sequencia/sequencia_test.dart` › "zerada não é erro: \"leia hoje para começar\" e o recorde mantido (RN-18.6)" (no código: `'zerada não é erro: "leia hoje para começar" e o recorde mantido (RN-18.6)'`) |
| CT-GAM-21 | RNF-TST-06 | Mobile: serviço indisponível | Banner do bloco; "Tentar de novo" recarrega | mobile | `MOB/features/sequencia/sequencia_test.dart` › "serviço indisponível mostra o banner do bloco e \"Tentar de novo\" recarrega" (no código: `'serviço indisponível mostra o banner do bloco e "Tentar de novo" recarrega'`) |
| CT-GAM-22 | RNF-TST-06 | Mobile: timeout no cold start | Também vira o banner do bloco | mobile | `MOB/features/sequencia/sequencia_test.dart` › "timeout (cold start) também cai no banner do bloco" |
| CT-GAM-23 | RF-GAM-01, RNF-ARQ-06 | Mobile: progresso registrado no app | O bloco recarrega em silêncio depois do consumo assíncrono | mobile | `MOB/features/sequencia/sequencia_test.dart` › "progresso registrado recarrega em silêncio depois do consumo assíncrono" |

Outros testes da feature que podem virar caso: `sequencia.spec.ts` › apurar (RN-18) › "dia repetido conta uma vez (RN-18.3)" e "a ordem de chegada não importa: offline tardio recompõe o trecho"; `sequencia.int-spec.ts` › consumo (RNF-ERR-06/07, RNF-TST-03) › "falha transitória é retentada e o efeito acontece uma vez"; `sequencia_test.dart` › "resposta fora do contrato vira erro, não número inventado", "número e chama em musgo no claro e broto-vivo no escuro (contraste)" e no Meu perfil › "falha da sequência não derruba o perfil".

### Sem teste aparente (candidatos a lacuna) — dono: Vicenzo Fonseca

| Item | O que procurei e onde | Situação |
|---|---|---|
| Critério "A sequência funciona no app **em DES**" (com o backfill antes do binding) | Critério e DoD | Desmarcado; verificação manual do fechamento do P2 |
| RN-18.1, lado negativo: "concluir/iniciar/abandonar não conta" (está no critério de aceite) | Grep por `finaliz` e `abandon` em `sequencia.int-spec.ts` e `sequencia.spec.ts`: nenhum resultado. `apurar` recebe só datas | Sem teste. Nenhum teste prova que `leitura.finalizada` ou um início sem progresso deixa a sequência como está |
| RN-18.5, segunda parte: proibida a criação manual retroativa | Grep por `retroativ` e `futur` nos `*.spec.ts` do `leitura`: só a data de início no futuro da F-EST | Sem teste. Os próprios testes mandam `registradoEmDispositivo` no passado para simular o offline, e nada verifica limite |
| RN-18.7: medida em dias, nunca em tempo | Nenhum teste da sequência manda minutos | Só implícita |
| Remover livro da estante não recalcula até o próximo progresso (decisão do dono, 08/10) | Pendência da feature | Comportamento documentado, sem teste (nem a favor nem contra) |
| Prova de chegada na DLQ | Ver F-DSF | Igual: prova o nack |

### Divergências e observações

- Serviço, RFs e clientes batem com a tabela recebida: `leitura` + mobile, RF-GAM-01..03, fora do web (§2.1).
- O DoD aponta os testes em `src/sequencia/dominio/sequencia.spec.ts`, `test/integracao/sequencia.int-spec.ts` e `test/features/sequencia/sequencia_test.dart`, e confere: os três existem.
- RN-18.1, "≥1 página lida": todo progresso aceito tem página maior que a atual (RN-17.2), então a condição vale por construção, sem teste próprio.
- Nenhum teste em `skip`/`todo`.

---

## Resumo

| Feature | Arquivos | Testes da feature | Casos previstos | Lacunas candidatas |
|---|---|---|---|---|
| F-DSF | 9 | 113 | 34 | 5 |
| F-STA | 16 (+2 só da OPC, fora da conta) | 139 | 34 | 8 |
| F-GAM | 3 | 40 | 23 | 6 |
