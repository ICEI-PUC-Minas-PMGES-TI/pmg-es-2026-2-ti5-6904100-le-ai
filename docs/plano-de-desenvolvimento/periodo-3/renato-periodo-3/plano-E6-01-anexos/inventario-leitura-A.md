# Inventário de testes — grupo leitura-A (F-EST-2, F-SESSAO, F-AVA-2)

Levantamento feito sobre o código no disco (idêntico à `origin/desenvolvimento`), em 14/11/2026. Nomes de teste copiados do código e conferidos com busca no arquivo. Contagem: cada `it`/`test`/`testWidgets`/`@Test`/`@ParameterizedTest` conta 1; `it.each` e laço `for` que gera testes contam 1. Nenhum `skip`, `todo`, `only`, `xit` ou `@Disabled` nos arquivos citados.

Prefixos: `LE/` = `code/back/leitura/`, `WEB/` = `code/front/src/`, `MOB/` = `code/mobile/test/`, `SO/` = `code/back/social/src/test/java/br/com/leai/social/`, `AC/` = `code/back/acervo/`.

---

## 1. F-EST-2 — Favoritos, histórico e buscas (CT-ES2)

**Dono:** Ana Luiza de Freitas · **Serviços:** `leitura` + web + mobile · **RFs:** RF-EST-09, RF-EST-10, RF-EST-13 · **RN/RNF citadas:** RN-04, RN-15, RNF-SEC-02, RNF-SEC-07, RNF-DES-02, RNF-ERR-04.

Commits de origem dos testes: `4f5ad9d` e `bc98d35` (backend, 16/10), `515a953` (web, 16/10), `6eab416` (mobile, 17/10).

### 1.1 Arquivos de teste

| Arquivo | Testes no arquivo | Da feature | Cobre |
|---|---|---|---|
| `LE/test/integracao/favoritos.int-spec.ts` | 8 | 8 | RF-EST-09 (marcar, desmarcar, consultar, listar `/me/favoritos`, `favorito`/`totalFavoritos` na estante), RNF-ERR-04, RNF-SEC-07/RN-15 (403 em pessoal de outra), favorito independente de RN-04, estante de perfil sem favoritos; RF-EST-13 (busca `q` com status, `%` e `_` literais) |
| `LE/test/integracao/historico.int-spec.ts` | 7 | 7 | RF-EST-10 (só finalizadas, uma ocorrência por conclusão, duas no mesmo ano, agrupamento/filtro por ano, pesquisa título/autor em todos os anos combinada com ano, paginação com teto 50), RNF-SEC-02 (histórico e progresso de terceiro), progresso finalizado somente leitura (POST e DELETE 409) |
| `LE/test/integracao/estante.int-spec.ts` | 30 | 0 novos | só ajuste: "adiciona como Quero ler e grava o evento na outbox" (CT-EST-05) passou a conferir `favorito: false` no item |
| `WEB/views/HistoricoView.spec.ts` | 2 | 2 | RF-EST-10 na web (ano, pesquisa, filtro, "Carregar mais", abrir ocorrência), RNF-TST-06 (503) |
| `WEB/views/EstanteView.spec.ts` | 20 | 2 | RF-EST-13 (busca no header, vazio leva ao acervo), RF-EST-09 (pill `Favoritos`, card `Fora da estante`, marca de favorito) |
| `WEB/components/estante/AcoesLeitura.spec.ts` | 13 | 1 (+1 ajustado) | RF-EST-09 otimista com reversão e mesma chave; o `it.each` "%s mostra só as ações de RN-04" (CT-EST-21) passou a esperar `Favoritar` em cada status |
| `WEB/views/ProgressoView.spec.ts` | 13 | 1 | RF-EST-10 modo histórico (conclusão, tipo, datas, sem registrar/excluir) |
| `WEB/views/livros/LivroOficialView.spec.ts` | 31 | 0 novos (1 ajustado) | "fora da estante: só Adicionar à estante, que abre as ações de entrada" passou a esperar `Favoritar` |
| `WEB/views/livros/LivroPessoalView.spec.ts` | 18 | 0 novos (3 ajustados) | listas de ações com `Favoritar` |
| `MOB/features/estante/favoritos_e_historico_test.dart` | 5 | 5 | RF-EST-09 (favoritar otimista, mesma chave), RF-EST-13 (busca), RF-EST-10 (histórico, indisponibilidade, modo histórico do progresso) |
| `MOB/features/livros/livro_oficial_page_test.dart`, `MOB/features/progresso/progresso_test.dart` | 40 / 34 | 0 | só stub de `/favorito` na API simulada |

**Total F-EST-2:** 26 testes novos da feature (backend 15, web 6, mobile 5) em 7 arquivos, mais 5 testes antigos ajustados.

### 1.2 Casos previstos

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-ES2-01 | RF-EST-09, RNF-ERR-04 | Marcar duas vezes, desmarcar duas vezes e consultar | PUT 200 com `favorito`/`favoritadoEm`, repetição igual e uma linha só; DELETE 204 nas duas; GET devolve `favorito: false` | integração | `LE/test/integracao/favoritos.int-spec.ts` › favoritos e busca na estante (integração) › marcar e desmarcar › "é idempotente e não duplica a relação" |
| CT-ES2-02 | RNF-ERR-04 | Reenviar o PUT com a mesma `Idempotency-Key` depois de desmarcar | Mesma resposta, sem recriar o favorito | integração | `LE/test/integracao/favoritos.int-spec.ts` › favoritos e busca na estante (integração) › marcar e desmarcar › "reenviar a mesma chave repete a resposta sem refazer o efeito" |
| CT-ES2-03 | RNF-SEC-07, RN-15 | Favoritar livro pessoal de outra pessoa, livro inativo e o próprio livro pessoal | 403, 404 e 200; só um favorito gravado | integração | `LE/test/integracao/favoritos.int-spec.ts` › favoritos e busca na estante (integração) › marcar e desmarcar › "recusa livro pessoal de outra pessoa e livro inativo" |
| CT-ES2-04 | RF-EST-09, RN-04 | Favoritar livro fora da estante | Nenhuma linha em `estante` nem em `leitura`; `GET /estante/{id}` 404 | integração | `LE/test/integracao/favoritos.int-spec.ts` › favoritos e busca na estante (integração) › marcar e desmarcar › "favoritar fora da estante não cria vínculo nem leitura" |
| CT-ES2-05 | RF-EST-09, RNF-SEC-02 | Listar favoritos dentro e fora da estante, buscar por `q` e consultar como outra pessoa | Os dois, `status` nulo para o de fora, busca sem diferenciar maiúsculas; lista vazia para a outra pessoa | integração | `LE/test/integracao/favoritos.int-spec.ts` › favoritos e busca na estante (integração) › GET /me/favoritos › "lista dentro e fora da estante, só do próprio leitor" |
| CT-ES2-06 | RF-EST-09 | Estante com um favorito, um comum e um favorito fora da estante | `favorito` certo em cada item; `totalFavoritos` = 2 | integração | `LE/test/integracao/favoritos.int-spec.ts` › favoritos e busca na estante (integração) › estante › "marca o favorito no item e conta favoritos de dentro e de fora" |
| CT-ES2-07 | RF-EST-09, RN-08 | Estante consultada pelo perfil | Sem `favorito` no item e sem `totalFavoritos` | integração | `LE/test/integracao/favoritos.int-spec.ts` › favoritos e busca na estante (integração) › estante › "a estante de outro perfil não revela favoritos" |
| CT-ES2-08 | RF-EST-13 | Buscar na estante por título, por autor, combinado com `status=LENDO`, e por `%` e `_` | Só os livros que casam; status restringe; `%` e `_` tratados como literais | integração | `LE/test/integracao/favoritos.int-spec.ts` › favoritos e busca na estante (integração) › estante › "busca por título ou autor, combinada com o status" |
| CT-ES2-09 | RF-EST-10, RN-04 | Leitura e releitura finalizadas do mesmo livro no mesmo ano, mais uma releitura e uma leitura abandonadas | Só as duas finalizadas, da mais recente, releitura marcada, `anos` e `totais` certos | integração | `LE/test/integracao/historico.int-spec.ts` › histórico de leituras (integração) › "conta só leituras finalizadas, uma ocorrência por conclusão, da mais recente" |
| CT-ES2-10 | RF-EST-10 | Conclusões em 2025 (iniciada em 2024) e 2026, filtrando `ano=2025` | Agrupado pelo ano da data de fim; filtro devolve uma; `anos` ignora o filtro | integração | `LE/test/integracao/historico.int-spec.ts` › histórico de leituras (integração) › "agrupa por ano da data de fim e filtra por ano" |
| CT-ES2-11 | RF-EST-10 | Pesquisar por título, por autor, por título com ano e por `%` | Todas as ocorrências do livro em todos os anos; ano restringe; `%` não é curinga | integração | `LE/test/integracao/historico.int-spec.ts` › histórico de leituras (integração) › "pesquisa título ou autor em todos os anos e combina com o ano" |
| CT-ES2-12 | RF-EST-10, RNF-DES-02 | Paginar com `limite=2` e pedir `limite=51` | Duas páginas corretas; 400 acima do teto | integração | `LE/test/integracao/historico.int-spec.ts` › histórico de leituras (integração) › "pagina com teto do servidor" |
| CT-ES2-13 | RNF-SEC-02 | Outra pessoa consulta o próprio histórico | Vazio, sem anos e totais zerados | integração | `LE/test/integracao/historico.int-spec.ts` › histórico de leituras (integração) › "não mostra leituras de outra pessoa" |
| CT-ES2-14 | RF-EST-10, RN-17 | Dono consulta as atualizações de uma leitura finalizada e tenta registrar e excluir | 200 com `somenteLeitura: true`; POST 409; DELETE 409 | integração | `LE/test/integracao/historico.int-spec.ts` › histórico de leituras (integração) › atualizações de uma ocorrência finalizada › "o dono consulta em modo somente leitura e não registra nem exclui" |
| CT-ES2-15 | RNF-SEC-02 | Outra pessoa consulta o progresso de uma leitura finalizada pelo `leituraId` | 404 | integração | `LE/test/integracao/historico.int-spec.ts` › histórico de leituras (integração) › atualizações de uma ocorrência finalizada › "nega a ocorrência finalizada de outra pessoa" |
| CT-ES2-16 | RF-EST-09, RNF-ERR-04 | Web: favoritar nas ações com 503 e tentar de novo | Volta a `Favoritar` com aviso; a nova tentativa usa a mesma chave e vira `Remover dos favoritos` | web | `WEB/components/estante/AcoesLeitura.spec.ts` › AcoesLeitura › "favoritar é otimista e volta ao estado anterior, com aviso, quando o servidor falha" |
| CT-ES2-17 | RF-EST-09 | Web: pill `Favoritos` | Lista os favoritos, inclusive `Fora da estante`, com a marca; contagem 2 no pill | web | `WEB/views/EstanteView.spec.ts` › EstanteView › "o pill Favoritos lista os favoritos, inclusive fora da estante, sem mexer nos totais da estante" |
| CT-ES2-18 | RF-EST-13 | Web: buscar na estante com status ativo, sem resultado | `q` e status na URL e na chamada; vazio oferece `Buscar no acervo` com o termo | web | `WEB/views/EstanteView.spec.ts` › EstanteView › "a busca filtra por título e autor dentro do status ativo e, sem resultado, oferece o acervo" |
| CT-ES2-19 | RF-EST-10 | Web: histórico por ano, carregar mais, pesquisar, filtrar e abrir | Grupos por ano, `q` sem ano, depois com ano, ocorrência abre `/estante/leituras/{id}/progresso` | web | `WEB/views/HistoricoView.spec.ts` › HistoricoView › "agrupa por ano, pesquisa em todos os anos, filtra por ano, pagina e abre a ocorrência" |
| CT-ES2-20 | RNF-TST-06 | Web: histórico com o serviço indisponível | Erro e `Tentar de novo` que recarrega | web | `WEB/views/HistoricoView.spec.ts` › HistoricoView › "com o serviço indisponível mostra o erro e tenta de novo" |
| CT-ES2-21 | RF-EST-10 | Web: progresso de ocorrência concluída | Releitura, data de conclusão e início, sem excluir nem registrar | web | `WEB/views/ProgressoView.spec.ts` › ProgressoView › "ocorrência concluída do histórico mostra conclusão, tipo e datas, sem ações" |
| CT-ES2-22 | RF-EST-09, RNF-ERR-04 | Mobile: favoritar nas ações com 503 | Volta e avisa; reenvio com a mesma chave em todas as tentativas | mobile | `MOB/features/estante/favoritos_e_historico_test.dart` › "favoritar nas ações é otimista, volta e avisa na falha, e o reenvio usa a mesma chave" |
| CT-ES2-23 | RF-EST-13 | Mobile: busca na estante | `status` e `q` na consulta; vazio leva o termo ao acervo | mobile | `MOB/features/estante/favoritos_e_historico_test.dart` › "a busca da estante filtra dentro do status e, sem resultado, leva o termo ao acervo" |
| CT-ES2-24 | RF-EST-10 | Mobile: histórico | Página 2 ao rolar, `q` sem ano, depois com ano, abre a ocorrência | mobile | `MOB/features/estante/favoritos_e_historico_test.dart` › HistoricoPage › "agrupa por ano, pagina, pesquisa em todos os anos, filtra por ano e abre a ocorrência" |
| CT-ES2-25 | RNF-TST-06 | Mobile: histórico indisponível | Erro e nova tentativa | mobile | `MOB/features/estante/favoritos_e_historico_test.dart` › HistoricoPage › "serviço indisponível mostra o erro e tenta de novo" |
| CT-ES2-26 | RF-EST-10 | Mobile: progresso de ocorrência concluída | Concluída, releitura, datas, `somente consulta`, sem registrar nem excluir | mobile | `MOB/features/estante/favoritos_e_historico_test.dart` › "ocorrência concluída abre o progresso no modo histórico, sem registrar nem excluir" |

### 1.3 Sem teste aparente (candidatos a lacuna) — dono: Ana Luiza de Freitas

1. **Sem token (RNF-SEC-01):** nenhum 401 para `PUT/DELETE/GET /livros/{id}/favorito`, `GET /me/favoritos` e `GET /me/historico`. Procurei `401` em `LE/test/integracao/`: o "sem token é 401" de `estante.int-spec.ts` cobre só `/estante`, `/estante/{id}`, `/perfis/{id}/estante` e `/livros/{id}/conclusoes`.
2. **Favoritar pela página do livro (web e mobile):** o botão `Heart` e `GET /livros/{id}/favorito` na página não têm teste de marcar/desmarcar. Na web, `LivroOficialView.spec.ts` só confere `Favoritar` na lista de ações; no mobile, `livro_oficial_page_test.dart` só simula a resposta de `/favorito`.
3. **Mobile, filtro `Favoritos` e marca no card:** nenhum teste do pill `Favoritos`, do card `Fora da estante` nem de `/me/favoritos` no app (busca por `favorit` em `MOB/` só acha `favoritos_e_historico_test.dart` e os stubs).
4. **Timeout (RNF-TST-06):** os testes web e mobile da feature simulam só 503; nenhum simula tempo esgotado, embora o DoD fale em "indisponibilidade/timeout".
5. **Serviços web (RNF-TST-05):** `WEB/services/leitura.spec.ts` não tem casos para `marcarFavorito`, `desmarcarFavorito`, `consultarFavorito`, `listarFavoritos` e `listarHistorico`. Esses métodos só aparecem como mocks.
6. **Critério "Favoritos e histórico funcionam em DES":** desmarcado no arquivo da feature. É verificação manual.

### 1.4 Divergências e observações

- Serviços, RFs e clientes conferem com a tabela recebida. O arquivo cita também RN-04 e RN-15 (e RN-08 na Timeline de criação).
- A Timeline não traz números de teste, só "no mínimo combinado com a dona". Isso explica as lacunas 2 e 3.
- Divergências registradas pela dona e refletidas nos testes: a duração conta os dois dias (`duracaoDias: 15` de 20/12 a 03/01) e "N leituras concluídas" na pesquisa conta só as ocorrências carregadas. O teste web confere `3 leituras concluídas` com `totais.leituras`.
- Pendência aberta: a busca usa `ILIKE` e não ignora acentos. Nenhum teste cobre acento, o que está coerente com a pendência.

---

## 2. F-SESSAO — Sessão de leitura cronometrada (CT-SES) — só mobile

**Dono:** Ana Luiza de Freitas · **Serviços:** mobile (reuso de `POST /leituras/{id}/progresso` de F-PRG, sem endpoint novo) · **RFs:** RF-PRG-05 a RF-PRG-12 · **RN/RNF:** RN-16 (1 a 20), RN-17, RNF-ERR-04, RNF-ERR-05, RNF-USA-04, RNF-TST-04.

Sem caso web, porque a feature é fora do escopo web (§10.9), e sem caso de backend próprio, porque não há endpoint novo. O lado servidor do registro (zerar inatividade, RN-16.12, e 422/409/404) já está em CT-PRG-03 a CT-PRG-09 do Período 1.

### 2.1 Arquivos de teste

| Arquivo | Testes no arquivo | Da feature | Cobre |
|---|---|---|---|
| `MOB/features/sessao/sessao_test.dart` | 18 | 17 (16 de F-SESSAO, commits `1d21411` de 17/10 e `2a563fe` de 23/10, mais 1 de F-MOD-OPC sobre logout, `a43abef`) | RF-PRG-05/06/07/09/10/11/12; RN-16.1, 2, 3, 5, 7, 9, 10, 11, 14 a 20; RN-17 (arredondamento, teto 720, página base); RNF-ERR-04/05; decisão de 22/10 (token vencido). O teste "F-MOD-OPC: conta suspensa com sessão de leitura ativa mantém o aviso de suspensão" é de F-MOD-OPC e não entra na conta |
| `MOB/features/estante/estante_test.dart` | 31 | 1 (ajustado por F-SESSAO em `1d21411`) | RF-PRG-05/RN-16.1: `iniciarSessao` só em Lendo e Relendo. É o mesmo teste do CT-EST-22 |
| `MOB/app/router_test.dart`, `MOB/features/auth/login_page_test.dart` | — | 0 | relacionados, mas de F-MOD-OPC (suspensão com leitura ativa leva ao login com o banner) |

**Total F-SESSAO:** 18 testes em 2 arquivos (17 + 1 compartilhado com CT-EST-22).

### 2.2 Casos previstos

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-SES-01 | RF-PRG-05, RN-16.1, RN-16.2, RN-16.10 | Iniciar em Quero ler, depois em Relendo e de novo com sessão ativa | Recusa, aceita, recusa; nenhuma chamada ao servidor | mobile | `MOB/features/sessao/sessao_test.dart` › SessaoController › "só inicia em Lendo ou Relendo e uma por aparelho" |
| CT-SES-02 | RF-PRG-05, RN-16.1 | Ações oferecidas por status | `Iniciar sessão` só em Lendo e Relendo (mesmo teste de CT-EST-22) | mobile | `MOB/features/estante/estante_test.dart` › acoesDisponiveis (RN-04) › "cada status oferece só as transições válidas, destrutiva por último" |
| CT-SES-03 | RF-PRG-06, RN-16.3, RN-16.4, RN-16.20 | Navegar para `/perfil` e `/descobrir` com sessão ativa, em pausa e pendente, e depois de descartar | Toda rota volta a `/sessao`, inclusive na pausa; pendente vai à confirmação; descartada volta à origem e libera a navegação | mobile | `MOB/features/sessao/sessao_test.dart` › modo de foco › "a sessão ativa leva toda rota à tela da sessão e a pendente à de confirmação" |
| CT-SES-04 | RF-PRG-09, RF-PRG-10, RN-16.5, RN-16.9 | Reabrir o app 47 min 12 s depois | Sessão em andamento com o tempo derivado do relógio | mobile | `MOB/features/sessao/sessao_test.dart` › SessaoController › "o tempo vem do relógio e a sessão é recuperada ao reabrir o app" |
| CT-SES-05 | RF-PRG-10 | Formatar o cronômetro e a contagem da pausa | `0:47:12`, `11:59:59`, `6:38` | mobile | `MOB/features/sessao/sessao_test.dart` › regras › "cronômetro em h:mm:ss sem zero à esquerda na hora" |
| CT-SES-06 | RF-PRG-07, RN-16.11 | Converter tempo medido em minutos | 29 s vira 1; 47:29 vira 47; 47:30 vira 48; 13 h vira 720 | mobile | `MOB/features/sessao/sessao_test.dart` › regras › "arredonda para o minuto mais próximo, com mínimo de 1 e teto de 12 horas" |
| CT-SES-07 | RF-PRG-07, RN-16.7, RN-17.2 | Validar a página do encerramento | Igual à atual é válida; menor, acima do total ou ausente é recusada com a mensagem | mobile | `MOB/features/sessao/sessao_test.dart` › regras › "página igual à atual é válida; menor ou acima do total não" |
| CT-SES-08 | RN-16.7 | Encerrar informando a página atual | Nenhum POST; sessão e armazenamento local apagados | mobile | `MOB/features/sessao/sessao_test.dart` › SessaoController › "página igual à atual encerra sem chamar o servidor" |
| CT-SES-09 | RF-PRG-11, RF-PRG-12, RN-16.14 a RN-16.18 | Ler 10 min, pausar 5, retomar, ler 5, pausar 5 e deixar esgotar | Pausa não conta; retomar acumula 15 min; pausa esgotada fica `pausaEsgotada` com 15 min, e retomar não a revive | mobile | `MOB/features/sessao/sessao_test.dart` › SessaoController › "a pausa não conta tempo, retomar acumula e pausa esgotada preserva o lido" |
| CT-SES-10 | RN-16.11 | Sessão com 12 h 30 min cronometrados | `expirada`; encerrar envia 720 minutos e a página | mobile | `MOB/features/sessao/sessao_test.dart` › SessaoController › "acima de 12 horas fica expirada e registra no máximo 720 minutos" |
| CT-SES-11 | RF-PRG-07, RNF-ERR-05 | Encerrar sem rede | Registro na fila com página 131 e 47 minutos; só então a sessão some | mobile | `MOB/features/sessao/sessao_test.dart` › SessaoController › "sem rede o registro vai para a fila e só então a sessão some" |
| CT-SES-12 | RNF-ERR-04 | Encerrar com 503 e repetir depois de reabrir o app | Sessão mantida com erro; a nova tentativa usa a mesma chave e o mesmo corpo (instante e fuso) | mobile | `MOB/features/sessao/sessao_test.dart` › SessaoController › "erro do servidor mantém a sessão e a nova tentativa reusa chave e instante" |
| CT-SES-13 | RN-17.2 | Encerrar com 422 porque outro aparelho avançou | Página base vira 140, mensagem própria, sessão mantida | mobile | `MOB/features/sessao/sessao_test.dart` › SessaoController › "página recusada porque outro aparelho avançou atualiza a página base" |
| CT-SES-14 | RN-16.2 (decisão de 22/10) | Token vencido sem renovação com sessão ativa | Sessão encerrada sem registro e aviso de expiração para a tela de entrada | mobile | `MOB/features/sessao/sessao_test.dart` › conta dona da sessão › "token vencido sem renovação encerra a sessão e deixa o aviso para a entrada" |
| CT-SES-15 | RN-16.2 | Renovar o token da mesma conta | Sessão mantida | mobile | `MOB/features/sessao/sessao_test.dart` › conta dona da sessão › "renovar o token da mesma conta mantém a sessão" |
| CT-SES-16 | RN-16.2 | Abrir o app sem conta logada e com sessão guardada | Sessão descartada | mobile | `MOB/features/sessao/sessao_test.dart` › conta dona da sessão › "abrir o app sem conta logada descarta a sessão guardada de antes" |
| CT-SES-17 | RN-16.2 | Saída da conta com sessão ativa (caminho defensivo) | Sessão e armazenamento apagados, sem aviso nem marca de leitura descartada | mobile | `MOB/features/sessao/sessao_test.dart` › conta dona da sessão › "sair da conta encerra a sessão em andamento e apaga o que foi guardado" |
| CT-SES-18 | RN-16.2 | Logout voluntário revogando o refresh (adicionado por F-MOD-OPC) | Refresh revogado, sessão apagada, sem marca de leitura descartada | mobile | `MOB/features/sessao/sessao_test.dart` › conta dona da sessão › "logout voluntário com sessão de leitura ativa não marca leitura descartada" |
| CT-SES-19 | RF-PRG-08, RN-16.8, RNF-USA-04 | Cancelar uma sessão em andamento | Pede confirmação, descarta o tempo, não faz POST | mobile | — (sem teste; ver 2.3) |

### 2.3 Sem teste aparente (candidatos a lacuna) — dono: Ana Luiza de Freitas

1. **Cancelar (RF-PRG-08, RN-16.8, RNF-USA-04):** nenhum teste cancela uma sessão em andamento. `descartar()` só aparece no teste do modo de foco, sobre a sessão pendente, e ali não se confere a ausência de POST. Também não há teste do diálogo de confirmação. Busquei `cancelar`, `descartar` e `confirmar` em `MOB/features/sessao/`.
2. **Telas da sessão sem teste de widget:** `/sessao` e `/sessao/pendente` não têm `testWidgets`. Ficam sem cobertura o cronômetro na tela (RF-PRG-10 só por `formatarCronometro`), o botão voltar do sistema bloqueado (RN-16.4), as opções de pausa na tela e o "zero motion".
3. **Durações de pausa 10 e 15 min:** só a pausa de 5 min é exercida. Nada confere que só 5, 10 e 15 são aceitos (RF-PRG-11).
4. **Reabrir com sessão ativa leva direto a `/sessao` (RN-16.5):** coberto pela função `guardaDaSessao`. No `router_test.dart` não há teste da guarda de sessão no roteador real; lá a sessão de leitura só aparece no caso de F-MOD-OPC.
5. **Encerrar sessão pendente (pausa esgotada) informando a página:** nenhum teste encerra com página a partir de `pausaEsgotada`. Também não há teste de descartar a sessão expirada (RN-16.11 e RN-16.19 dizem "informar a página ou descartar").
6. **Aviso de expiração na tela de entrada:** o critério da decisão de 22/10 pede que "a tela de entrada informe o motivo". `login_page_test.dart` só testa o banner de suspensão (F-MOD-OPC). Para a expiração, o teste é só no controlador (`consumirAvisoDeSaida`).
7. **Metadados `registradoEmDispositivo`/`fusoHorarioDispositivo`:** nenhum teste confere que vão no corpo nem seus valores. O CT-SES-12 prova só que o corpo da nova tentativa é idêntico ao da primeira.
8. **Fluxo em DES:** critério e DoD desmarcados. É verificação manual.

### 2.4 Divergências e observações

- A tabela recebida ("SÓ MOBILE; leitura sem endpoint novo") confere com o arquivo da feature.
- **Critério desmarcado com teste:** "Token vencido sem renovação encerra a sessão sem registro de progresso, e a tela de entrada informa o motivo" está `[ ]`. O comportamento está implementado (decisão de 22/10) e tem teste no controlador (CT-SES-14). Falta só a parte da tela (lacuna 6).
- **DoD desmarcado:** "Arquivo da feature atualizado" e "Divergência protótipo × implementação registrada" estão `[ ]`, mas o arquivo já tem Timeline de 25/10 e divergências registradas.
- **Teste que contradiz a regra no nome:** "sair da conta encerra a sessão em andamento e apaga o que foi guardado". A decisão de 22/10 e a RN-16.2 dizem que sair com sessão ativa "não é possível", porque o modo de foco bloqueia as Configurações. O teste chama `SessionController.sair()` direto, num caminho defensivo que a interface não alcança. Não prova a regra de produto, só que a sessão não sobrevive a uma saída.
- O DoD aponta só `sessao_test.dart`, mas F-SESSAO também ajustou `estante_test.dart` (`iniciarSessao`).

---

## 3. F-AVA-2 — Reações, Markdown e frases (CT-AV2)

**Dono:** Renato Douglas · **Serviços:** `leitura` (backend) + `social` (consumidor de `resenha.curtida`) + `acervo` (contagens e `minhaReacao` nas resenhas) + web + mobile · **RFs:** RF-AVA-05 a RF-AVA-09 · **RN/RNF:** RN-07, RN-08, RN-11, RN-13, RN-15, RNF-SEC-02/03/06/14/15/18, RNF-DES-02, RNF-USA-04, RNF-ERR-04, RNF-TST-03.

Commits de origem: `ca9da42` (reações), `93aa6a9` (frases) e `11020b1` (Markdown), todos de 09/10.

### 3.1 Arquivos de teste

| Arquivo | Testes no arquivo | Da feature | Cobre |
|---|---|---|---|
| `LE/test/integracao/reacao.int-spec.ts` | 26 | 25 (1 é de F-MOD-OPC) | RF-AVA-05/08, RN-08, RN-15 (via feed e lista), RNF-SEC-18 (429), RNF-ERR-04, concorrência, publicação de `resenha.curtida` só na primeira curtida, envelope válido (RNF-TST-03, lado produtor) |
| `LE/test/integracao/reacao-sem-contratos.int-spec.ts` | 1 | 1 | Via feed sem o contrato do `social`: 503 |
| `LE/test/integracao/frase.int-spec.ts` | 15 | 14 (1 é de F-MOD) | RF-AVA-06/07, RN-11 (página, 500 code points, 10 por livro, concorrência), RN-08, RN-15 (pessoal só do dono), RNF-DES-02, RNF-ERR-04, RNF-SEC-02 |
| `LE/src/reacoes/regras.spec.ts` | 6 | 6 | `mudancaAoReagir`: quando gravar e quando notificar |
| `LE/src/frases/regras.spec.ts` | 3 | 3 | RN-11: code points, só espaços ou invisíveis, faixa da página |
| `LE/test/integracao/perfis.int-spec.ts`, `LE/test/integracao/resenha.int-spec.ts` | — | 0 novos | só ajustes de contrato (`curtidas`, `descurtidas`, `minhaReacao`) |
| `AC/test/integracao/livro-oficial.int-spec.ts` | 17 | 1 | RF-AVA-08 e `minhaReacao` na página do livro oficial |
| `AC/test/integracao/livro-pessoal.int-spec.ts` | 32 | 1 | RF-AVA-08 e RN-15.4: resenha do dono com contagens para quem chegou pela via |
| `SO/notificacao/service/ConsumidorDeNotificacaoIntegracaoTest.java` | 7 | 2 (+1 parametrizado por `EventoDeNotificacao`, que inclui `RESENHA_CURTIDA`) | Consumo, idempotência semântica, livro pessoal |
| `SO/notificacao/service/ConsumidorDeNotificacaoBrokerTest.java` | 5 | 1 (+1 de binding compartilhado) | DLQ por schema; binding `resenha.curtida` |
| `SO/integracao/NotificacaoControllerIntegracaoTest.java` | 15 | 1 | Notificação `RESENHA_CURTIDA` na API, com livro e frase |
| `WEB/livros/useReacao.spec.ts` | 9 | 9 | Reação otimista, via de RN-15, 429/503/timeout, mesma chave, toques rápidos |
| `WEB/components/livros/ReacoesDaResenha.spec.ts` | 5 | 5 | RF-AVA-08 (contagens separadas, zero real), reação ativa, via, reversão, só leitura |
| `WEB/markdown/resenha.spec.ts` | 12 | 10 (2 são de F-MOD) | RN-13.1 a 13.4 (26 casos compartilhados), RNF-SEC-15, prévia sem marcação, faixa fora do subconjunto |
| `WEB/markdown/edicao.spec.ts` | 11 | 11 | Barra e atalhos do editor; `Enter` na lista |
| `WEB/views/livros/EscreverResenhaView.spec.ts` | 26 | 11 (describe "Markdown (F-AVA-2)") | RF-AVA-09 (Visualizar), RNF-SEC-15 na pré-visualização, RN-07 (marcação no contador), RN-13.3 |
| `WEB/components/livros/CardResenha.spec.ts` | 9 | 2 | Render em Markdown; resenha antiga com quebras |
| `WEB/components/feed/ItemAtividade.spec.ts` | 15 | 1 | Prévia do feed sem marcação |
| `WEB/views/perfil/PerfilDeOutroView.spec.ts` | 25 | 1 | Trecho do perfil sem marcação |
| `WEB/livros/frases.spec.ts` | 5 | 5 | Textos e validação do formulário (500 code points, página) |
| `WEB/components/livros/AdicionarFrase.spec.ts` | 8 | 8 | RF-AVA-06: validação, contador, página acima do total, mesma chave, cota estourada, descarte |
| `WEB/components/livros/SecaoFrases.spec.ts` | 4 | 4 | Seção da página do livro, limite de 10, 503 e timeout |
| `WEB/views/livros/FrasesDoLivroView.spec.ts` | 8 | 5 (3 são de F-MOD) | RF-AVA-07: lista, cota, excluir só a própria com confirmação, falhas |
| `MOB/features/avaliacao/reacoes_test.dart` | 12 | 12 | Reações otimistas, via, DELETE, 503 e queda de rede, só leitura |
| `MOB/features/avaliacao/frases_test.dart` | 13 | 13 | Seção, folha de adicionar, página da lista, excluir com confirmação |
| `MOB/features/avaliacao/markdown_edicao_test.dart` | 13 | 13 | Edição Markdown, `Enter` na lista |
| `MOB/features/avaliacao/markdown_resenha_test.dart` | 11 | 9 (2 são de F-MOD) | RN-13.4 (26 casos compartilhados), literal fora do subconjunto, `TextoDaResenha` |
| `MOB/features/avaliacao/escrever_resenha_test.dart` | 20 | 6 (group "Markdown (F-AVA-2)") | Barra, Visualizar, faixa |
| `MOB/features/avaliacao/resenhas_do_perfil_test.dart` | 8 | 1 | Trecho sem marcação |
| `MOB/features/feed/item_atividade_test.dart` | 9 | 1 | Prévia sem marcação |
| `MOB/features/notificacoes/notificacoes_page_test.dart` | 17 | 1 | `RESENHA_CURTIDA` na lista de notificações |
| `MOB/features/notificacoes/rotas_notificacoes_test.dart` | 8 | 1 | Rota da notificação: livro oficial ou pessoal |

**Total F-AVA-2:** 184 testes da feature em 31 arquivos: `leitura` 49, `acervo` 2, `social` 4 (+2 compartilhados), web 72, mobile 57.

### 3.2 Casos previstos

São mais casos que o típico porque a feature junta cinco RFs, três serviços e mensageria.

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-AV2-01 | RF-AVA-05, RF-AVA-08 | Curtir resenha de livro oficial | 200 com `minhaReacao`, `curtidas` 1 e `descurtidas` 0; `resenha.curtida` na outbox para a autora com chave `resenha:{id}:curtida:{reator}` | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › reagir em livro oficial › "curtir responde o estado e publica resenha.curtida para a autora" |
| CT-AV2-02 | RF-AVA-05, RF-AVA-08 | Alternar para descurtida e retirar | Contagens só com as reações ativas; nenhuma publicação nova | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › reagir em livro oficial › "alternar e retirar não publicam, e as contagens só veem reações ativas" |
| CT-AV2-03 | RF-AVA-05 | Retirar e curtir de novo | Uma publicação só; `primeira_curtida_em` preservada | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › reagir em livro oficial › "retirar e recurtir não notifica de novo" |
| CT-AV2-04 | RF-AVA-05 | Descurtir, curtir, descurtir e curtir | Descurtida não notifica; uma notificação na primeira curtida | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › reagir em livro oficial › "descurtir antes e curtir depois notifica uma vez, na primeira curtida" |
| CT-AV2-05 | RF-AVA-05, RNF-ERR-04 | Repetir a mesma reação | Mesmo estado, nada novo gravado ou publicado | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › reagir em livro oficial › "repetir a mesma reação não grava nada novo" |
| CT-AV2-06 | RF-AVA-05 | Três curtidas simultâneas da mesma leitora, com chaves diferentes | Três 200, uma linha e uma publicação | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › reagir em livro oficial › "duas curtidas simultâneas da mesma leitora, com chaves diferentes, notificam uma vez" |
| CT-AV2-07 | RNF-ERR-04 | Mesma `Idempotency-Key` com outro tipo de reação | 409 `CHAVE_IDEMPOTENCIA_CONFLITANTE` | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › idempotência › "mesma chave com outro tipo é 409" |
| CT-AV2-08 | RF-AVA-05 | Reagir à própria resenha | 422 `REACAO_PROPRIA`, nada gravado | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › quem pode reagir › "reagir à própria resenha é 422 REACAO_PROPRIA" |
| CT-AV2-09 | RN-08, RNF-SEC-03 | Autora privada, sem e depois com seguimento | 404 no PUT e no DELETE; 200 seguindo | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › quem pode reagir › "autora privada: sem seguimento é 404 no PUT e no DELETE; com seguimento, reage" |
| CT-AV2-10 | RNF-SEC-02, RNF-SEC-05 | Resenha inexistente, livro inativo, autora fora da VIEW de perfil | 404 nos três | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › quem pode reagir › "resenha inexistente, livro inativo e autora fora da VIEW de perfil são 404" |
| CT-AV2-11 | RF-AVA-05 | Leitora suspensa ou em exclusão tenta reagir | 403, nada gravado | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › quem pode reagir › "leitora fora da VIEW de perfil (suspensa ou em exclusão) recebe 403" |
| CT-AV2-12 | RN-15, RNF-SEC-06 | Reagir à resenha de livro pessoal sem informar a via | 404, mesmo com o perfil público | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › livro pessoal (RN-15) › "sem via é 404, mesmo com o perfil público" |
| CT-AV2-13 | RN-15.4 | Pelo feed, seguindo a dona | Reage, e a notificação leva o livro pessoal | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › livro pessoal (RN-15) › "pelo feed, quem segue reage e a notificação leva o livro pessoal" |
| CT-AV2-14 | RN-15, RNF-SEC-06 | Pelo feed, com atividade de outro livro ou forjada | 404 | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › livro pessoal (RN-15) › "pelo feed, atividade de outro livro ou forjada é 404" |
| CT-AV2-15 | RN-15.5, RN-08 | Pela lista, com perfil privado | Exige seguimento | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › livro pessoal (RN-15) › "pela lista, perfil privado exige seguimento" |
| CT-AV2-16 | RN-15, RNF-SEC-06 | Pela lista, com lista de outro livro, excluída ou forjada | 404 | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › livro pessoal (RN-15) › "pela lista, lista de outro livro, excluída ou forjada é 404" |
| CT-AV2-17 | RNF-SEC-18 | 61 reações seguidas da mesma identidade | 429 com `Retry-After` | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › "acima do limite por identidade responde 429 com Retry-After" |
| CT-AV2-18 | RF-AVA-08 | Contagens no perfil e em "minha avaliação" | `curtidas`, `descurtidas` e `minhaReacao` nas duas respostas | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › "as contagens chegam ao perfil e à minha-avaliacao da autora" |
| CT-AV2-19 | RF-AVA-08 | Página do livro oficial no `acervo` | Cada resenha com as contagens e só a reação de quem está vendo | integração | `AC/test/integracao/livro-oficial.int-spec.ts` › página do livro oficial (integração) › resenhas e RN-08 › "cada resenha traz as contagens e só a reação de quem está vendo (F-AVA-2)" |
| CT-AV2-20 | RF-AVA-08, RN-15.4 | Página do livro pessoal aberta por terceiro pela via | Resenha do dono com contagens e a reação de quem vê | integração | `AC/test/integracao/livro-pessoal.int-spec.ts` › livro pessoal (integração) › terceiro (RN-15) › "a resenha do dono traz as contagens e a reação de quem chegou pela via (F-AVA-2)" |
| CT-AV2-21 | RN-15 (contrato externo) | Reagir pelo feed sem a VIEW do `social` | 503 | integração | `LE/test/integracao/reacao-sem-contratos.int-spec.ts` › reação sem o contrato do social (integração) › "reagir pelo feed responde 503" |
| CT-AV2-22 | RNF-TST-03 (publicação) | Despachar a outbox depois de uma curtida | Envelope `resenha.curtida` válido no schema, com a chave semântica, na fila de notificações | mensageria | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › "resenha.curtida sai do despachante como envelope válido" |
| CT-AV2-23 | RNF-TST-03 (consumo) | `social` consome `RESENHA_CURTIDA` e lista a notificação | Tipo `RESENHA_CURTIDA`, livro do destino e "X curtiu sua resenha de Y." | mensageria | `SO/integracao/NotificacaoControllerIntegracaoTest.java` › "curtida em resenha traz o livro do destino e a frase da curtida" |
| CT-AV2-24 | RNF-TST-03 (idempotência) | Mesma resenha e mesmo reator entregues com outro `eventId` | Uma notificação só | mensageria | `SO/notificacao/service/ConsumidorDeNotificacaoIntegracaoTest.java` › "mesma resenha e mesmo leitor com outro eventId nao duplica a curtida" |
| CT-AV2-25 | RNF-TST-03, RN-15 | Curtida em resenha de livro pessoal | `dados` guarda `resenhaId` e `livro.tipo = pessoal`; sem `leitura_ref` | mensageria | `SO/notificacao/service/ConsumidorDeNotificacaoIntegracaoTest.java` › "curtida em resenha de livro pessoal guarda a resenha e o tipo do livro" |
| CT-AV2-26 | RNF-TST-03 (DLQ), RNF-SEC-32 | Mensagem sem `resenhaId` | Rejeitada pelo schema, `basicNack` sem requeue (DLQ), nada gravado | mensageria | `SO/notificacao/service/ConsumidorDeNotificacaoBrokerTest.java` › "curtida em resenha sem resenhaId e rejeitada pelo schema e vai para a DLQ" |
| CT-AV2-27 | RF-AVA-06, RN-11 | Cadastrar frase com página | 201 na forma do contrato | integração | `LE/test/integracao/frase.int-spec.ts` › frases (integração) › cadastrar › "guarda a frase com a página e devolve a forma do contrato" |
| CT-AV2-28 | RN-11 | Página acima do total, zero, ausente ou fracionária | 422 com a mensagem do total; 422; 400; 400 | integração | `LE/test/integracao/frase.int-spec.ts` › frases (integração) › cadastrar › "página fora do livro, zero ou ausente é recusada" |
| CT-AV2-29 | RN-11 | 500 emojis, 501 caracteres, só espaços ou invisíveis | 201; 422 com o excedente; 422 | integração | `LE/test/integracao/frase.int-spec.ts` › frases (integração) › cadastrar › "texto conta code points: 500 emojis passam, 501 não; só espaços é 422" |
| CT-AV2-30 | RN-11 | 11ª frase do leitor no livro | 422 `LIMITE_DE_FRASES`; outra pessoa ainda cadastra | integração | `LE/test/integracao/frase.int-spec.ts` › frases (integração) › cadastrar › "a 11ª frase do leitor no livro é 422 LIMITE_DE_FRASES" |
| CT-AV2-31 | RN-11 | Com 9 guardadas, duas simultâneas | Uma 201 e uma 422; 10 no total | integração | `LE/test/integracao/frase.int-spec.ts` › frases (integração) › cadastrar › "com 9 guardadas, duas simultâneas deixam só uma passar" |
| CT-AV2-32 | RN-15, RNF-SEC-02 | Livro pessoal de outra pessoa, inativo ou inexistente; conta sem perfil | 404 nos três; 403 | integração | `LE/test/integracao/frase.int-spec.ts` › frases (integração) › cadastrar › "livro pessoal de outra pessoa, inativo ou inexistente é 404; conta sem perfil é 403" |
| CT-AV2-33 | RNF-ERR-04 | Repetir a chave com o mesmo corpo e com outro corpo | Mesma resposta; 409; uma frase | integração | `LE/test/integracao/frase.int-spec.ts` › frases (integração) › cadastrar › "mesma chave repete a resposta; com outro corpo é 409" |
| CT-AV2-34 | RF-AVA-07 | Listar frases de todos | Mais recentes primeiro, `minha` marcada, `minhasFrases` e `limitePorLivro` | integração | `LE/test/integracao/frase.int-spec.ts` › frases (integração) › listar › "mostra as frases de todos, mais recentes primeiro, com a cota de quem pede" |
| CT-AV2-35 | RN-08 | Frase de autora privada | Some para quem não segue; aparece para a autora e para quem segue | integração | `LE/test/integracao/frase.int-spec.ts` › frases (integração) › listar › "frase de autor privado só aparece para quem o segue (RN-08)" |
| CT-AV2-36 | RN-15.2 | Frases de livro pessoal consultadas por terceiro | Dono lista; terceiro recebe 404 | integração | `LE/test/integracao/frase.int-spec.ts` › frases (integração) › listar › "livro pessoal: só o dono lista" |
| CT-AV2-37 | RNF-DES-02 | Paginar com `limite=2` e pedir `limite=51` | Páginas corretas; 400 acima do teto | integração | `LE/test/integracao/frase.int-spec.ts` › frases (integração) › listar › "pagina com teto de 50" |
| CT-AV2-38 | RF-AVA-07, RNF-SEC-02 | Excluir a própria, a de outra pessoa e uma inexistente | 204; 404; 404 | integração | `LE/test/integracao/frase.int-spec.ts` › frases (integração) › excluir › "exclui a própria; a de outra pessoa ou inexistente é 404" |
| CT-AV2-39 | RNF-SEC-15, RN-13.1 | Web: `<script>`, `<img onerror>`, link `javascript:`, imagem e `<a>` | Nenhum vira HTML | web | `WEB/markdown/resenha.spec.ts` › renderização segura (RNF-SEC-15) › "%s não vira HTML" |
| CT-AV2-40 | RN-13.3 | Web: HTML digitado | Aparece escapado como texto | web | `WEB/markdown/resenha.spec.ts` › renderização segura (RNF-SEC-15) › "HTML digitado aparece escapado, como texto" |
| CT-AV2-41 | RN-13.4 | Web: 26 casos compartilhados com o mobile | Mesma árvore do JSON compartilhado | web | `WEB/markdown/resenha.spec.ts` › árvore da resenha (casos compartilhados com o mobile) › "%s" |
| CT-AV2-42 | RN-13.4 | Mobile: os mesmos 26 casos | Mesma árvore do JSON compartilhado | mobile | `MOB/features/avaliacao/markdown_resenha_test.dart` › árvore da resenha (casos compartilhados com a web) › nome dinâmico `caso['nome']` (um teste por caso do JSON) |
| CT-AV2-43 | RF-AVA-09 | Web: alternar para `Visualizar` e voltar a `Escrever` | Resenha formatada sem barra; volta com o texto e o cursor | web | `WEB/views/livros/EscreverResenhaView.spec.ts` › EscreverResenhaView › Markdown (F-AVA-2) › "Visualizar mostra a resenha formatada, sem barra, e Escrever volta com o texto e o cursor" |
| CT-AV2-44 | RNF-SEC-15, RN-13.2 | Web: HTML digitado na pré-visualização | Não entra no DOM | web | `WEB/views/livros/EscreverResenhaView.spec.ts` › EscreverResenhaView › Markdown (F-AVA-2) › "HTML digitado não entra no DOM da pré-visualização (RNF-SEC-15)" |
| CT-AV2-45 | RN-13.3 | Web: marcação fora do subconjunto na pré-visualização | Aparece literal, com a faixa; o subconjunto não liga a faixa | web | `WEB/views/livros/EscreverResenhaView.spec.ts` › EscreverResenhaView › Markdown (F-AVA-2) › "marcação fora do subconjunto aparece literal, com a faixa; o subconjunto não liga a faixa" |
| CT-AV2-46 | RN-07 | Web: aplicar negrito e conferir o contador | A marcação entra na contagem de 5.000 | web | `WEB/views/livros/EscreverResenhaView.spec.ts` › EscreverResenhaView › Markdown (F-AVA-2) › "negrito envolve a seleção, fica ativo e a marcação entra no contador" |
| CT-AV2-47 | RN-13.3, RN-13.4 | Mobile: link, título e HTML na resenha | Aparecem literais | mobile | `MOB/features/avaliacao/markdown_resenha_test.dart` › TextoDaResenha › "link, título e HTML aparecem literais" |
| CT-AV2-48 | RF-AVA-09 | Mobile: `Visualizar` | Resenha formatada, sem barra e sem teclado | mobile | `MOB/features/avaliacao/escrever_resenha_test.dart` › Markdown (F-AVA-2) › "Visualizar mostra a resenha formatada, sem barra e sem teclado" |
| CT-AV2-49 | RF-AVA-08 | Web: contagens na resenha | Curtidas e descurtidas separadas, singular e zero como contagem real | web | `WEB/components/livros/ReacoesDaResenha.spec.ts` › ReacoesDaResenha › "mostra as duas contagens separadas, com singular e zero como contagem real" |
| CT-AV2-50 | RF-AVA-05, RN-15 | Web: tocar em curtir | Muda na hora e chama o `leitura` com a via | web | `WEB/components/livros/ReacoesDaResenha.spec.ts` › ReacoesDaResenha › "tocar curte na hora e chama o leitura com a via" |
| CT-AV2-51 | RNF-TST-06 | Web: reação com 429, 503 e timeout | Volta ao estado anterior com a mensagem | web | `WEB/livros/useReacao.spec.ts` › useReacao › "falha %s volta ao estado anterior com a mensagem" |
| CT-AV2-52 | RF-AVA-05, RN-15 | Mobile: contagens e curtida com via | Mostra as duas contagens; PUT com `via` e `referenciaId` | mobile | `MOB/features/avaliacao/reacoes_test.dart` › ReacoesDaResenha › "mostra as duas contagens e envia a curtida com a via" |
| CT-AV2-53 | RNF-TST-06 | Mobile: reação com 503 e queda de rede | Volta ao estado anterior e avisa | mobile | `MOB/features/avaliacao/reacoes_test.dart` › ReacoesDaResenha › "falha ($nome) volta ao estado anterior e avisa" |
| CT-AV2-54 | RF-AVA-06, RN-11 | Web: enviar a frase com os campos vazios | As duas mensagens, sem chamar o servidor | web | `WEB/components/livros/AdicionarFrase.spec.ts` › AdicionarFrase › "valida ao enviar: campos vazios mostram as duas mensagens e não chamam o servidor" |
| CT-AV2-55 | RF-AVA-07, RNF-USA-04 | Web: excluir a própria frase | Confirmação mostrando a frase, sai da lista e é anunciada | web | `WEB/views/livros/FrasesDoLivroView.spec.ts` › FrasesDoLivroView › "excluir pede confirmação mostrando a frase, tira da lista e anuncia" |
| CT-AV2-56 | RN-11 | Mobile: cota estourada no servidor | Campos travados e ações trocadas | mobile | `MOB/features/avaliacao/frases_test.dart` › FolhaAdicionarFrase › "cota estourada no servidor trava os campos e troca as ações" |
| CT-AV2-57 | RF-AVA-07, RNF-USA-04 | Mobile: excluir a própria frase | Confirmação mostrando a frase; sai da lista | mobile | `MOB/features/avaliacao/frases_test.dart` › FrasesDoLivroPage › "excluir confirma mostrando a frase e tira da lista" |
| CT-AV2-58 | RF-AVA-09 (decisão 3) | Web: prévia da resenha no feed | Sem a marcação, cada bloco numa linha | web | `WEB/components/feed/ItemAtividade.spec.ts` › ItemAtividade › "a prévia da resenha sai sem a marcação do Markdown (F-AVA-2)" |
| CT-AV2-59 | RF-AVA-05 (notificação) | Mobile: notificação `RESENHA_CURTIDA` | Ícone ThumbsUp; abre o livro da resenha | mobile | `MOB/features/notificacoes/notificacoes_page_test.dart` › "curtida em resenha aparece com o ThumbsUp e leva ao livro da resenha" |
| CT-AV2-60 | RF-AVA-05, RN-15 (decisão 8) | Mobile: rota da notificação de curtida | Livro oficial ou pessoal, conforme `livro.tipo` | mobile | `MOB/features/notificacoes/rotas_notificacoes_test.dart` › "curtida em resenha leva a pagina do livro da resenha, oficial ou pessoal" |

### 3.3 Sem teste aparente (candidatos a lacuna) — dono: Renato Douglas

1. **Sem token (RNF-SEC-01):** nenhum 401 para `PUT/DELETE /resenhas/{id}/reacao`, `POST/GET /livros/{id}/frases` e `DELETE /frases/{id}`. Procurei `401` em `LE/test/integracao/`: nada em `reacao.int-spec.ts` nem em `frase.int-spec.ts`. O 401 genérico de `infra.int-spec.ts` usa uma rota de teste (`eco`).
2. **Excluir a resenha limpa as reações** (decisão do grupo de 15/09): a exclusão pelo autor (`resenha.int-spec.ts` › exclusão) não confere `reacao_resenha`. Só a remoção pela moderação confere (`LE/test/integracao/moderacao.int-spec.ts` › "remove a resenha de qualquer autor, leva as reações e publica resenha.excluida", que é de F-MOD).
3. **Trecho de frase como texto (RNF-SEC-14):** nenhum teste web ou mobile mostra que HTML numa frase aparece literal. Procurei `<script`, `<b>` e `escap` nos specs de frases.
4. **Página do livro pessoal repassa `via` e `referenciaId` da rota:** na web isso só aparece no composable (`useReacao` › "leva a via de RN-15 e retira pelo DELETE") e no componente. `LivroPessoalView.spec.ts` só ganhou fixtures (`curtidas`/`descurtidas`/`minhaReacao`), sem teste de reação vindo da rota.
5. **Nenhum HTML gerado ou persistido no servidor (RN-13):** não há teste de backend dizendo que a resenha com marcação é guardada e devolvida crua. É implícito, porque o backend não mudou.
6. **Serviços web (RNF-TST-05):** `WEB/services/*.spec.ts` não têm casos para `reagir`, `retirarReacao`, `listarFrases`, `cadastrarFrase` e `excluirFrase`. Só há mocks.
7. **Timeout no mobile para frases:** `frases_test.dart` simula só 503. A web cobre 503 e timeout em `SecaoFrases`.
8. **"Mesmo se a primeira foi suprimida por preferência":** o `social` ainda não lê preferência (fica para F-NOT-OPC, segundo o arquivo). A garantia vem do produtor (`primeira_curtida_em`, CT-AV2-03) e do `UNIQUE` do consumidor (CT-AV2-24). Não há teste com a preferência desligada.

### 3.4 Divergências e observações

- **Serviços:** a tabela recebida diz "web e mobile", mas o arquivo da feature lista também `social` (mapeamento do consumidor de `resenha.curtida`), e o Status e a Timeline registram mudanças em `acervo` (contagens e `minhaReacao`). Os dois têm testes da feature: 4 em `SO/` (+2 compartilhados) e 2 em `AC/`. RFs (05 a 09) conferem.
- **Testes de outras features nos mesmos arquivos** (não contados): "F-MOD-OPC: reação de conta suspensa sai das contagens e da VIEW, e volta na reativação" (`reacao.int-spec.ts`); "o administrador vê também a frase de autor privado que não segue (F-MOD)" (`frase.int-spec.ts`); o describe "trecho corrido (card da denúncia, F-MOD)" em `WEB/markdown/resenha.spec.ts` e em `MOB/.../markdown_resenha_test.dart`; o describe "administrador (F-MOD)" em `FrasesDoLivroView.spec.ts`; "CardResenha: denunciar (F-MOD)".
- **Nome dinâmico:** no mobile, os 26 casos compartilhados geram um `test` por caso com `caso['nome']`. Na web é o `it.each` "%s". Os dois contam 1 aqui, mas rodam 26 vezes cada.
- **Nome que não diz tudo:** "alternar e retirar não publicam, e as contagens só veem reações ativas" espera 2 publicações. Elas são das primeiras curtidas de duas pessoas diferentes, antes de alternar. Correto, mas a leitura rápida engana.
- "resenha.curtida sai do despachante como envelope válido" usa o `BrokerEmMemoria`. A ponta a ponta com o broker real até o `social` não tem teste automatizado. O consumo é testado separadamente no `social` com envelope montado no teste.
- Os números da Timeline (`leitura` 219 unitários e 252 de integração, web 865, app 646) são da suíte inteira em 09/10, não da feature.
