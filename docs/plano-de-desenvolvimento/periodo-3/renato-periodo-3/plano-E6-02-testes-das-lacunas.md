# Plano — E6-02: Testes que faltam na área do Renato

> **Plano de 16/11/2026, ainda não revisado.** Etapa 1 do [`prompt-E6-02-testes-das-lacunas.md`](prompt-E6-02-testes-das-lacunas.md). Leia antes o [`prompt-E6-contexto-comum.md`](prompt-E6-contexto-comum.md). Na etapa 2, **este plano prevalece sobre o prompt** nos detalhes.

## 0. Resumo

- **Base conferida:** `origin/desenvolvimento` em `1555482` mais o PR #67 (branch `origin/renato-e6-01-dsf`, `2770508`, só documentação), na worktree `le-ai-e6-01-dsf`. Três agentes de contexto limpo leram o código e os testes (backend Nest, backend Spring e script; web e mobile). Os caminhos abaixo são relativos a `code/`, salvo indicação.
- **A numeração que vale é a da §9.8 atual** (`docs/9.plano_de_testes.md`, L-01 a L-44), não a da tabela do prompt nem a dos anexos da E6-01.
- **Entram 16 lacunas (inteiras ou a parte do Renato), todas ainda abertas no código:** L-01 (`acervo` e denúncia), L-02, L-07, L-09, L-10 e L-15 (só a parte do `acervo`), L-13, L-14 e L-20 (as partes das features dele), L-30, L-31, L-32, L-35, L-36, L-37 e L-38.
- **Estimativa:** cerca de **43,5 h de escrita** e **8,5 h** de preparação, documentação e validação na etapa 2; com a etapa 3, **≈ 55 h** de agente e conferência (§7). O corte, se faltar tempo até 24/11, sai do fim da ordem (§3).
- **Já fechada antes desta tarefa:** L-08, fechada no Período 2 (CT-STA-19 e CT-GAM-10), e não é da área do Renato. Nenhuma lacuna da área dele foi fechada desde a E6-01.
- **Avisos a outros donos:** §5. **Pendências para o Renato:** §6 (quatro, nenhuma bloqueia o início da etapa 2).

## 1. Decisões fechadas com o Renato (16/11/2026)

| # | Decisão | Escolha |
|---|---|---|
| 1 | L-01, parte do `acervo` e da denúncia | **Extrair a checagem de RN-08 para função pura e testar unitariamente.** A forma da extração está em §2 e uma variante na pendência P-1. |
| 2 | Lacunas transversais (L-09 CORS, L-10 health check com banco fora, L-15 DLQ no Nest) | **O Renato faz a parte do `acervo`** e avisa o grupo do resto. O `leitura` é da Ana. |
| 3 | Bug revelado por teste | **No código do Renato, corrigir nesta tarefa. Em código alheio, registrar no relatório, e o Renato avisa o dono.** |
| 4 | Ordem e corte | **A do prompt:** RNs prioritárias do RNF-TST-01 primeiro (L-02 e L-01), depois as lacunas das desejáveis, por último as restantes. O que não couber até 24/11 é cortado a partir do fim. |

## 2. Lacunas da área do Renato (entram nesta tarefa)

Cada item traz: onde está o código, a confirmação de que a lacuna existe, o teste proposto (arquivo, nível, nome) e a estimativa. Os nomes seguem o estilo de cada projeto: frase em pt-BR no `it`/`test` (Nest, Vitest, Flutter), `@DisplayName` em pt-BR (Spring) e `test_` com sublinhado (pytest). Prefixos: `AC` = `back/acervo`, `LE` = `back/leitura`, `SO` = `back/social/src`, `ID` = `back/identidade/src`, `WEB` = `front/src`, `MOB` = `mobile`, `ING` = `scripts/ingestao`.

### Bloco 1 — RNs prioritárias do RNF-TST-01

#### L-02 — Nota e resenha sobrevivem ao abandono e não se duplicam na releitura (RN-04) · 1,5 h

- **Código.** Máquina de estados em `LE/src/leituras/dominio/maquina-estados.ts:13-20`, aplicada em `LE/src/leituras/aplicacao/leituras.service.ts` (`iniciarReleitura` :98, `abandonar` :203). Nota e resenha têm `UNIQUE (usuario_id, livro_id)` e nenhuma chave para `leitura` (`LE/src/db/schema.ts:210` e `:234`). `LE/src/avaliacoes/avaliacoes.service.ts:40-44` documenta que elas "pertencem ao livro, não à leitura (RN-04.5)". Os únicos `DELETE` estão em `avaliacoes.repository.ts:126,195,213`, fora do caminho da leitura.
- **Ainda aberta.** `maquina-estados.spec.ts` e `test/integracao/leituras.int-spec.ts` (`describe('releitura')`, :398) não tocam nota nem resenha; `nota.int-spec.ts` e `resenha.int-spec.ts` não passam pelo ciclo.
- **Teste.** Integração em `LE/test/integracao/nota.int-spec.ts` (arquivo de F-AVA, do Renato), num `describe('RN-04: a avaliação é do livro, não da leitura')`, dirigindo o ciclo só por HTTP:
  - "abandonar não apaga a nota nem a resenha";
  - "releitura concluída não duplica nota nem resenha, e a avaliação continua a mesma".
  Conferir `GET` da avaliação e `count(*)` em `leitura.nota` e `leitura.resenha`.
- **Dono.** O teste exercita a máquina de estados de F-EST (Ana), sem editar o código nem o arquivo dela, então não leva nota no `AGENTS.md`. Se revelar bug na máquina de estados, vale a decisão 3 (registrar e avisar a Ana).

#### L-01 (denúncia) — RN-08 sem unitário no `social` · 2 h

- **Código.** `SO/main/java/br/com/leai/social/moderacao/service/ServicoDeDenuncia.java`: `resenhaAcessivel` (:123-155) decide em Java. Autora fora de `v_perfil_referencia_v1` (suspensa ou em exclusão) dá 404 (:134); leitor fora da VIEW, 403 (:135-138); depois `liberado = livro.pessoal() ? liberadoPelaVia(...) : autor.publico() || referencias.segue(eu, autorId)` (:140-146); `liberadoPelaVia` (:158-171). O caminho do comentário (`comentarioAcessivel`, :98-115) decide em SQL, em `AtividadeRepository.visivelPara` e `ComentarioRepository.visivelPara`, que são do Kayke (F-FEED).
- **Ainda aberta.** `ServicoDeDenunciaTest` tem só os três testes do motivo; RN-08 só em `DenunciaIntegracaoTest` (CT-MOD-01 a 05).
- **Extração.** Mover a decisão de :131-146 para um método estático de pacote, no estilo de `normalizarMotivo` (:81), por exemplo `static AcessoAResenha decidirAcessoAResenha(Optional<PerfilDoDono> autora, boolean leitorNaView, boolean livroPessoal, boolean segue, boolean viaValida)`, que devolve liberado, 404 ou 403. As consultas continuam no serviço. O caminho do comentário fica fora (é SQL do Kayke; vai como aviso, §5).
- **Teste.** Unitário em `SO/test/java/br/com/leai/social/moderacao/service/ServicoDeDenunciaTest.java`:
  - "RN-08: resenha de autora pública pode ser denunciada por qualquer leitor";
  - "RN-08: autora privada exige seguimento aceito";
  - "Autora suspensa ou em exclusão é 404, igual a resenha inexistente";
  - "Leitor fora da VIEW de perfis recebe 403";
  - "Livro pessoal sem via válida é 404, mesmo com autora pública (RN-15.4)".
  `DenunciaIntegracaoTest` continua verde sem mudança.

#### L-01 (`acervo`) — RN-08 sem unitário nas resenhas do livro oficial · 2,5 h

- **Código do Renato.** `AC/src/livros/busca/resenhas.repository.ts:52-84` (F-ACV-BUSCA): `JOIN identidade.v_perfil_referencia_v1` (:67, que já tira conta suspensa e em exclusão) e o predicado `p.privacidade = 'publico' OR EXISTS (… v_seguimento_aceito_v1 …)` (:72-78), mais `r.usuario_id <> leitor`. O filtro precisa ficar no SQL por causa do `LIMIT` e do cursor.
- **Fora da área.** `AC/src/livros/pessoal/autorizacao-rn15.service.ts` (`viaFeed` :87-115, `viaLista` :135-170) também aplica RN-08, mas é do Vicenzo (livro pessoal, F-ACV-CADASTRO) e do Henrique (via lista, F-LST), pelo `git log`. Vai como aviso (§5).
- **Ainda aberta.** Só integração: `AC/test/integracao/livro-oficial.int-spec.ts:374` (CT-BUS-10). `livro-oficial.service.spec.ts` não tem RN-08.
- **Extração (variante recomendada da P-1).** Função pura `podeVerResenhaDeOutroLeitor({ leitorId, autorId, privacidade, segue })` num arquivo novo `AC/src/livros/busca/privacidade-de-resenha.ts`. O SQL continua filtrando (paginação), passa a devolver `privacidade` e `segue` (`EXISTS … AS segue`) e o repositório aplica a função em cada linha como guarda final. Assim a função roda em produção e o CT-BUS-10 continua provando o SQL. Autor ausente da VIEW não chega à função (o `JOIN` o tira); a função recebe `privacidade: null` nesse caso e devolve falso, para documentar a regra.
- **Teste.** Unitário em `AC/src/livros/busca/privacidade-de-resenha.spec.ts`:
  - "perfil público: qualquer leitor vê a resenha";
  - "perfil privado: só quem segue com seguimento aceito vê";
  - "autor fora da VIEW de perfis (suspenso ou em exclusão) não aparece";
  - "a resenha do próprio leitor fica de fora da lista de outros leitores".
  Mais um caso no `resenhas.repository` ou no service, se o guarda mudar a contagem da página (não deve: o SQL já filtrou).

### Bloco 2 — Lacunas das desejáveis (F-ACV-NOTA, F-AVA-2, F-MOD e as partes das opcionais nas mesmas lacunas)

#### L-30 — Moderação · 5 h

1. **`POST /admin/denuncias/{id}/remover` por não-admin (403).** Código: `SO/main/java/br/com/leai/social/moderacao/…/ModeracaoController.java:71-80` e a regra `/admin/**` do `SecurityConfig` (:55). Aberta: `somenteAdmin` em `ModeracaoIntegracaoTest.java:69-84` só confere 403 em `GET /admin/denuncias`, `GET /admin/moderacao/logs` e `arquivar`. Teste em `ModeracaoIntegracaoTest`: "Leitor recebe 403 ao remover, a denúncia fica pendente e o leitura não é chamado" (conferir `LEITURA.chamadas()` vazio). 0,5 h.
2. **Resenha removida some do feed de ponta a ponta.** Código: `ServicoDeModeracao.remover` → `ClienteDeLeitura.removerResenha` (`ClienteDeLeitura.java:88`) → `LE/src/moderacao/moderacao.service.ts:48-92` (publica `resenha.excluida`) → `ConsumidorDeAtividade` (`feed/service/ConsumidorDeAtividade.java:73`). Aberta: "Remover resenha pede ao leitura com o token e a chave fixa, e fecha tudo do alvo" (:194) usa a `LeituraSimulada`, e o helper `removerComoOLeitura` (:387-394) apaga a atividade com `DELETE FROM atividade`. Não há harness entre serviços. Teste em `ModeracaoIntegracaoTest`: trocar, num caso novo, o `DELETE` pelo `ConsumidorDeAtividade` real com um envelope `resenha.excluida` válido e conferir `GET /feed` de uma seguidora: "Resenha removida pela moderação some do feed quando o resenha.excluida chega". Junto com o CT-MOD do `leitura` que publica o evento, fecha a cadeia. 1,5 h.
3. **Remoção repetida de frase com outra chave dentro de 24 h, e o 409 depois.** Código: `ServicoDeModeracao.removerFrase` (:288-318), chave fixa por alvo em `ClienteDeLeitura.chaveDoAlvo` (:97-99); no `leitura`, `ModeracaoService.removerFrase` (:95-120) e `IdempotenciaService.replayOuConflito` (`LE/src/common/idempotencia/idempotencia.service.ts:105-124`); log único por `ON CONFLICT (alvo_tipo, alvo_id)` (`ModeracaoRepository.java:347-351`). Comportamento documentado em `feature-F-MOD.md:105`. Aberta: os testes só repetem a mesma chave. Testes:
   - `ModeracaoIntegracaoTest`: "Remover a mesma frase com outra chave do admin repete a chave fixa no leitura e grava um log só" (204, 204, uma linha de log). 0,75 h.
   - `LE/test/integracao/moderacao.int-spec.ts`: "depois da janela de 24 h, a mesma chave fixa é conflito e nada muda" (forçar `replay_ate` no passado por `UPDATE leitura.idempotencia_leitura`). 0,75 h.
4. **Conteúdo denunciado exibido como texto no painel web (RNF-SEC-14).** Código: `WEB/views/moderacao/PainelModeracaoView.vue:516-526` (comentário com `{{ }}`; resenha por `TextoDaResenha`, `v-html` sanitizado em `components/livros/TextoDaResenha.vue:26`). Aberta: o spec do painel não tem carga com HTML. Testes em `WEB/views/moderacao/PainelModeracaoView.spec.ts`: "comentário denunciado com HTML aparece como texto, sem elemento novo" e "resenha denunciada com HTML passa pela sanitização". Modelo: `CardResenha.spec.ts:34-38` e `ModalComentarios.spec.ts:391`. 0,75 h.
5. **Denúncia de resenha pela página do livro oficial na web.** Código: `WEB/views/livros/LivroOficialView.vue:90-100` (`denunciar(resenha)`), `:511` e `:569`. Aberta: `LivroOficialView.spec.ts` não menciona denúncia. Teste nesse spec, no modelo de `LivroPessoalView.spec.ts:184`: "denunciar a resenha de outro leitor abre a denúncia com o alvo certo (F-MOD)". 0,75 h.

#### L-31 — Reações e frases · 3,5 h

1. **Excluir a resenha pelo autor apaga as reações (decisão de 15/09).** Código: `LE/src/avaliacoes/avaliacoes.service.ts:216` → `avaliacoes.repository.ts:195`; as reações saem por `ON DELETE cascade` (`LE/drizzle/0001_20260916110700_modelo_der.sql:292`). Aberta: "exclui fisicamente e publica resenha.excluida" (`resenha.int-spec.ts:295-309`) não cria reação. Teste em `LE/test/integracao/resenha.int-spec.ts` › `describe('exclusão')`: "excluir a resenha leva junto as reações dela" (copiar o `INSERT` de `moderacao.int-spec.ts:64-68`). 0,5 h.
2. **Trecho de frase com HTML exibido como texto.** Web: `WEB/components/livros/FraseCitada.vue:44`; mobile: `MOB/lib/features/avaliacao/frase_citada.dart:39` (e o rótulo de semântica em :30). Aberta nos dois. Testes: `WEB/components/livros/SecaoFrases.spec.ts` › "trecho com HTML aparece como texto, nunca interpretado"; `MOB/test/features/avaliacao/frases_test.dart` › "trecho com marcação aparece literal". 1 h.
3. **Página do livro pessoal repassa `via` e `referenciaId` à reação.** Web: `WEB/views/livros/LivroPessoalView.vue:55-58` e `:434-439`; mobile: `MOB/lib/features/livros/livro_pessoal_page.dart:114-120` e `:571-576`. Aberta: os dois specs só conferem a via na consulta e na denúncia. Testes:
   - `WEB/views/livros/LivroPessoalView.spec.ts`: "terceiro curte a resenha do dono com a via que abriu a página";
   - `MOB/test/features/livros/livro_pessoal_page_test.dart`: "terceiro curte a resenha do dono com a via que abriu a página" (o helper `montar`, :61-95, precisa responder ao `PUT`/`DELETE /resenhas/.../reacao` e registrar a requisição; modelo de asserção em `reacoes_test.dart`).
   2 h.
4. **Recurtir não notifica de novo quando a primeira notificação foi suprimida por preferência.** Ver a pendência P-2: a garantia está toda no `leitura` (CT-AV2-03 prova uma publicação só, por `primeira_curtida_em`), e um teste só do `social` provaria o contrário (o evento suprimido não deixa registro). Recomendado fechar por composição, com a justificativa na §9.8. Incluído na documentação (§7).

#### L-32 — Nota geral e capas · 3,5 h

1. **Fila de capas sem credencial do Cloudinary.** Código: `AC/src/livros/capas/criar-cache-de-capas.ts:31-37` (devolve `null` sem `CLOUDINARY_API_KEY`/`SECRET`) e `AC/src/livros/capas/capa.consumer.ts:54-60` (o `onModuleInit` avisa no log e não declara a fila `leai.acervo.capas`). Aberta: `consumo-capas.int-spec.ts:85-88` sempre passa a chave. Teste unitário novo `AC/src/livros/capas/criar-cache-de-capas.spec.ts` ("sem chave ou segredo do Cloudinary não há cache") e um caso em `capa.consumer` ou na integração: "sem credencial do Cloudinary a fila de capas não é declarada e o serviço sobe". 1 h.
2. **`nota.alterada`, `backfill:notas` e `conta.excluida` deixam `nota_geral` intacta (RN-06.4).** Código: `AC/src/livros/notas/nota-dos-leitores.repository.ts` (`sincronizar` :62, `sincronizarLivro` :99, `recalcularAgregados` :133), `AC/src/livros/notas/backfill.ts:55`, `AC/src/conta/conta-excluida.consumer.ts:69`; coluna em `AC/src/db/schema.ts:78-79`. Aberta: nenhum teste de consumo lê `nota_geral`. Três asserções, cada uma no arquivo do fluxo, com `nota_geral` semeada por `UPDATE` (como `livro-oficial.int-spec.ts:300`):
   - `consumo-notas.int-spec.ts`: "nota.alterada não mexe na nota geral do livro (RN-06.4)";
   - `backfill-notas.int-spec.ts`: "o backfill não mexe na nota geral";
   - `consumo-conta-excluida.int-spec.ts`: "conta excluída tira a nota dos leitores e deixa a nota geral".
   1,5 h.
3. **Livro pessoal sem os dois indicadores nos clientes (RN-06.5).** Os clientes simplesmente não renderizam os indicadores, e nada confere a ausência. Asserções `findsNothing`/`not.toContain` de "Nota geral" e "Nota dos leitores" em:
   - `WEB/views/livros/LivroPessoalView.spec.ts` (dono, :93, e terceiro pelo feed);
   - `MOB/test/features/livros/livro_pessoal_page_test.dart` (no bloco "Nada do que não existe em livro pessoal (RN-02, RN-03)" do teste da :97, e no do terceiro).
   1 h.
4. **Snapshots do `social` lendo a cópia própria da capa (RN-14.4).** O lado do `acervo` já está provado: `consumo-capas.int-spec.ts:198-202` confere que `v_livro_referencia_v1.capa_resolvida` é a cópia própria. O que falta é no `social` (listas do Henrique, recomendações do Kayke), cujos testes recriam a VIEW. Vai como aviso (§5).

#### L-13 — Rotas sem teste próprio de 401 (partes de F-AVA-2, F-MOD, F-MOD-OPC e F-ACV-OPC) · 3 h

- **`leitura` (F-AVA-2):** `PUT`/`DELETE /resenhas/:resenhaId/reacao` (`LE/src/reacoes/reacoes.controller.ts:45,49,86`) e `GET`/`POST /livros/:livroId/frases` e `DELETE /frases/:fraseId` (`LE/src/frases/frases.controller.ts:57,79,112`). Nenhum 401 em `reacao.int-spec.ts` nem em `frase.int-spec.ts`. Testes: "sem token, reagir e retirar a reação são 401 e nada muda" e "sem token, listar, criar e excluir frase são 401". 1 h.
- **`social` (F-MOD e F-MOD-OPC):** `POST /denuncias` (`DenunciaController.java:43`), `arquivar` (:60), `remover` (:71), `DELETE /admin/frases/{id}` (:82), `GET /admin/moderacao/logs` (:135), `suspender` (:106), `reativar` (:121) e `GET /admin/usuarios?username=`. Só `GET /admin/denuncias` tem 401 (CT-MOD-09, `ModeracaoIntegracaoTest.java:80-81`). `registros` e `contaPorUsername` não chamam `admin(token)`: dependem só do `SecurityConfig`, o que reforça o teste. Testes: um caso parametrizado em `ModeracaoIntegracaoTest` ("Sem token, todas as rotas de moderação são 401 e nada é gravado"), um em `DenunciaIntegracaoTest` ("Denunciar sem token é 401") e um em `SuspensaoDeContaIntegracaoTest` ("Suspender e reativar sem token são 401, e o identidade nem é chamado"). 1,5 h.
- **`acervo` (F-ACV-OPC):** `POST /livros/pessoal` (`AC/src/livros/pessoal/livro-pessoal.controller.ts:52`) e `PATCH /livros/pessoal/:id` (:111) com assuntos. Teste em `AC/test/integracao/assuntos-livro-pessoal.int-spec.ts` (arquivo da F-ACV-OPC): "sem token, criar e editar com assuntos são 401 e nada é gravado" (contar `acervo.livro` e `livro_assunto`). 0,5 h.

#### L-20 — Serviços web sem spec (F-AVA-2, F-MOD e F-MOD-OPC) · 3 h

- **`WEB/services/leitura.ts`:** `reagir` (:524), `removerReacao` (:538, via na query), `listarFrases` (:547), `criarFrase` (:552), `excluirFrase` (:556). Nenhum aparece em `leitura.spec.ts`. Testes nesse spec (o arquivo é compartilhado; os casos novos ficam num `describe('reações e frases (F-AVA-2)')`): "reagir envia o tipo, a via e a chave", "retirar a reação vai pelo DELETE com a via na consulta", "lista, cria e exclui frase com a chave recebida". 1 h.
- **`WEB/services/moderacao.ts`:** não existe `moderacao.spec.ts`. Arquivo novo, no estilo de `leitura.spec.ts` e `listas.spec.ts` (helper `resposta()`, `servico(fetchMock)` com `baseUrl`, `getToken` e `esperasDeRetentativaMs: [0, 0]`). Casos: `listarDenuncias` com cursor; `arquivar`, `remover` e `removerFrase` com a chave e **sem retentativa** (`esperasDeRetentativaMs: []`, :115); `contaPorUsername`; `suspenderConta` e `reativarConta` com o motivo; `listarRegistros` com cursor; `aquecerLeitura` ignorando erro e sem chamada quando não há URL (`vi.stubEnv`). Nomes como "remover envia a chave e não retenta quando o serviço responde 503" e "aquecer o leitura ignora a falha". 2 h.

#### L-14 — Tempo esgotado nos clientes (partes de F-ACV-NOTA, F-AVA-2 e F-MOD) · 4,5 h

Como se testa hoje: na web, o timeout é `new ApiError(msg, 0, 'TEMPO_LIMITE_EXCEDIDO')` (`WEB/services/api.ts:201`; modelo "timeout do próprio cliente também é não confirmada", `DialogoSuspensao.spec.ts:140`). No mobile, `TimeoutException` vira `ApiException(kind: ApiFailureKind.coldStart)` (`MOB/lib/core/network/api_client.dart:466-473`); os testes montam um `ApiClient` com `timeout:` curto e um handler que não responde (modelo "tempo esgotado também vira o banner (RNF-TST-04/06)", `estatisticas_page_test.dart:215`).

- **Notas da página do livro (F-ACV-NOTA).** Web: `WEB/livros/useLivroOficial.ts:207-233`; teste em `useLivroOficial.spec.ts` › `describe('recarga das notas')`: "tempo esgotado numa reconsulta é ignorado e a seguinte ainda vale". Mobile: `MOB/lib/features/livros/livro_oficial_controller.dart:202-228`; teste em `livro_oficial_controller_test.dart` (o mesmo cenário). 1,25 h.
- **Frases e reações no mobile (F-AVA-2).** Código em `MOB/lib/features/avaliacao/` (`secao_frases.dart:40-54`, `frases_do_livro_page.dart:95-121` e `:171`, `adicionar_frase.dart:176`, `reacoes.dart:177-196`). Testes: uma entrada de timeout no laço "falha ($nome) volta ao estado anterior e avisa" de `reacoes_test.dart:209-227`, e em `frases_test.dart` o timeout ao listar, criar (mantém o texto e a chave) e excluir. 1,5 h.
- **Denúncia (F-MOD).** Web: `WEB/moderacao/useDenunciar.ts:131-135`; testes em `useDenunciar.spec.ts`: "tempo esgotado vira falha de conexão e repete a mesma chave" e "503 vira falha de conexão e repete a mesma chave" (o 503 também falta, pela §9.8). Mobile: `MOB/lib/features/moderacao/folha_denunciar.dart:198-238`; teste em `folha_denunciar_test.dart`: "tempo esgotado mostra o banner de conexão e mantém o motivo". 1,25 h.
- **Painel de moderação na web (F-MOD).** `WEB/moderacao/usePainelDeModeracao.ts:153-185`. Hoje só o 504 do servidor (`PainelModeracaoView.spec.ts:94`, `TEMPO_ESGOTADO`). Teste no mesmo spec: "tempo esgotado do cliente ao remover deixa a denúncia como não confirmada e o reenvio usa a mesma chave"; e, se couber, o mesmo no arquivar. 0,5 h.
- **Obstáculo no mobile.** `leituraSimulada` e `acervoSimulado` (`MOB/test/features/livros/apoio.dart:31,46`) não têm parâmetro de timeout. Acrescentar um opcional (`timeout`), como `estanteSimulada` em `test/features/estante/apoio_estante.dart:8`, sem mudar as chamadas existentes. `socialSimulado` (`MOB/test/features/feed/apoio.dart:10`) é do Kayke: na denúncia, montar o `ApiClient` dentro do teste, sem mexer no helper dele.
- **Fora da área:** edição e exclusão de comentário são da F-SOCIAL-2 (Kayke) — aviso em §5.

### Bloco 3 — Restantes (opcionais do Renato e Período 1)

#### L-36 — A nota dos leitores continua contando a conta suspensa (decisão 4 da F-MOD-OPC) · 1,5 h

- **Código.** A VIEW de origem `leitura.v_nota_publicacao_v1` (`LE/drizzle/0001_20260916110700_modelo_der.sql:325-329`) não filtra perfil e nunca foi redefinida, ao contrário de `v_resenha_publicacao_v1` (migração 0007, que filtra). No `acervo`, `nota-dos-leitores.repository.ts` (`sincronizar` :62-92, `recalcular` :141-153) e `livro-oficial.repository.ts:86-97` também não filtram. A decisão está em `docs/plano-de-desenvolvimento/periodo-3/feature-F-MOD-OPC.md:112`.
- **Ainda aberta.** Nenhum teste menciona suspensão nas notas.
- **Testes.**
  - `LE/test/integracao/nota.int-spec.ts` (VIEW real do `leitura`): "nota de conta suspensa continua na VIEW de publicação de notas (decisão 4 da F-MOD-OPC)" — apagar a linha da conta em `identidade.v_perfil_referencia_v1` (que nos testes do `leitura` é tabela) e conferir a nota na VIEW. 0,75 h.
  - `AC/test/integracao/consumo-notas.int-spec.ts`: "a nota de quem sumiu da VIEW de perfis continua na média e na contagem" (no `acervo`, as duas VIEWs são tabelas, `AC/test/integracao/banco.ts:26,36-38`; o teste fixa que a projeção não cruza com o perfil). 0,75 h.

#### L-35 — Suspensão contra as VIEWs reais · 3,5 h (com a variante recomendada da P-3)

- **Código.** VIEW real em `ID/main/resources/db/migration/V20260915120000__completa_schema_identidade.sql:281-291` (`v_perfil_referencia_v1`, `WHERE suspenso = false AND exclusao_solicitada_em IS NULL`) e `V20261105120000__suspensao_de_conta.sql:22-31` (`v_conta_moderacao_v1`). Cópias nos testes do `social`: `MassaDeRecomendacao.java:20-70` (usada pela classe do Renato, `OcultacaoDeContaSuspensaIntegracaoTest`, via `MassaDeModeracao`) e mais seis classes do Kayke e do Henrique. No `leitura`, `LE/test/integracao/banco.ts:27-33` cria as VIEWs do `identidade` como tabela, e a suspensão vira `DELETE` (`reacao.int-spec.ts:184`).
- **Ainda aberta.** A VIEW real só é testada no `identidade` (CT-MDO-05). No feed, só os contadores têm caso com conta suspensa.
- **Testes.**
  - Em `SO/test/java/.../OcultacaoDeContaSuspensaIntegracaoTest.java` (do Renato): "Atividade de autora suspensa some do feed e volta na reativação". 1,5 h.
  - Contrato das cópias (P-3, variante recomendada): classe nova do Renato no `social`, `CopiaDasViewsDoIdentidadeTest`, que lê a última migration do `identidade` que define `v_perfil_referencia_v1` e `v_conta_moderacao_v1` e compara o `WHERE` com o das cópias de `MassaDeRecomendacao`: "A cópia da VIEW de perfis nos testes filtra igual à migration do identidade". Uma mudança no filtro real passa a quebrar o teste do `social`. 2 h.

#### L-37 — Mobile: 403 `CONTA_SUSPENSA` nas escritas do `leitura` dentro dos 15 min do token · 1,5 h

- **Código.** Divergência aceita em `feature-F-MOD-OPC.md:107`. A sessão só trata `CONTA_SUSPENSA` na renovação (`MOB/lib/core/session/session_controller.dart:262-265`) e na exclusão de conta (`excluir_conta_page.dart:148-151`). As escritas do `leitura` tratam o 403 como 4xx genérico: `acao_leitura_controller.dart:33-46,85-90` (mostra a mensagem e descarta a chave), `registro_progresso_controller.dart:44-47,85-103`, `fila_de_progresso.dart:111-117` (pausa a fila).
- **Ainda aberta.**
- **Teste.** Arquivo novo do Renato, `MOB/test/features/moderacao/conta_suspensa_nas_escritas_test.dart`, que só importa o `estanteSimulada` da Ana:
  - "403 CONTA_SUSPENSA numa ação da estante mostra a mensagem do servidor, descarta a chave e não encerra a sessão";
  - "403 CONTA_SUSPENSA pausa a fila de progresso sem perder o registro".
  Os testes fixam o comportamento aceito; se ele mudar, a divergência muda junto.

#### L-38 — Recarga do dump com sinônimo de editora já unificado · 2 h

- **Código.** `ING/leai_ingestao/carga.py` `carregar` (:253-372, `--tipo recarga` em `cli.py:165`), com a editora resolvida por `resolver_editora` (`ING/leai_ingestao/dados.py:133-153`) a partir do CSV de sinônimos, e `SQL_EDITORA` (:47-54) e `SQL_LIVRO_ATUALIZAR` (:122-155). `semear` (:380-420) leva o CSV para `acervo.sinonimo_editora`; `unificar` (:428) junta editoras.
- **Ainda aberta.** Os testes de recarga (`test_carga_banco.py:727` e `:882`) usam `_amostra_modificada` (:641-683), cuja editora é nova.
- **Teste.** Banco descartável (`pytest.mark.banco`) em `ING/tests/test_carga_banco.py`, ao lado dos testes de recarga da F-ACV-OPC:
  - `test_recarga_com_sinonimo_de_editora_mantem_a_editora_canonica` — carga inicial, recarga com a edição trazendo uma variante do CSV de uma editora já existente; conferir o mesmo `editora_id`, `totais["editoras"] == 0` e a contagem de `acervo.editora` igual.
  - Se couber: `test_recarga_depois_de_unificar_nao_recria_a_editora_juntada`.
- **Ponto a observar.** A recarga resolve sinônimos pelo CSV, não pela tabela `acervo.sinonimo_editora`. Uma editora juntada só no banco poderia ser recriada na recarga. Se o teste mostrar isso: o caminho da recarga (`carga.py`) é da F-ACV-OPC, e o Renato corrige (decisão 3); se o problema for em `resolver_editora` ou no `semear` (F-ACV-INGESTAO, Vicenzo), registra e avisa.

#### L-07 — Texto só na sinopse não é encontrado pela busca (RN-19) · 1 h

- **Código.** `AC/src/livros/busca/busca.repository.ts` `encontrados` (:231-297): `UNION ALL` sobre título, autor, editora, assunto e ISBN exato; a sinopse nunca entra (doc da classe, :118-133).
- **Ainda aberta.**
- **Teste.** Integração em `AC/test/integracao/busca.int-spec.ts` › `describe('campos pesquisados')`: "texto que só aparece na sinopse não encontra o livro (RN-19)". O helper `inserirLivroOficial` (`massa.ts:25-50`) não tem sinopse: usar `UPDATE acervo.livro SET sinopse = …`.

#### L-10 (`acervo`) — Health check com banco fora · 1,5 h

- **Código.** `AC/src/health/health.controller.ts:35-42` e `AC/src/health/drizzle.health.ts:25-43` (`SELECT 1`; na falha, `down` com "Banco indisponível"); 503 por `AC/src/common/error-codes.ts:58,95-99`.
- **Ainda aberta.** `health.controller.spec.ts` só tem o caso "ok"; o indicador não tem spec.
- **Testes.** Unitário novo `AC/src/health/drizzle.health.spec.ts`: "banco fora do ar deixa o indicador down com a mensagem de banco indisponível"; e em `health.controller.spec.ts`: "banco fora do ar responde 503 no corpo de erro padrão".

#### L-09 (`acervo`) — CORS · 1 h

- **Código.** `AC/src/configurar-app.ts:29-34` (`origin` a partir de `CORS_ALLOWED_ORIGINS`), padrão `http://localhost:5173` em `AC/src/config/env.ts:23-24`.
- **Ainda aberta, e maior que a §9.8 diz:** no `acervo` nem a origem aceita é testada.
- **Teste.** Integração nova `AC/test/integracao/cors.int-spec.ts` (o `criarApp()` já roda `configurarApp`): "origem da lista recebe Access-Control-Allow-Origin" e "origem fora da lista não recebe o cabeçalho de CORS".

#### L-15 (`acervo`) — DLQ provada só pelo `nack` · 3 h

- **Código.** `AC/src/messaging/amqp-consumer.service.ts:106-120` (declara `<fila>.dlq` e os argumentos da DLX) e `nack(message, false, false)` em :145 e :191. O broker em memória `AC/test/integracao/broker-em-memoria.ts` ignora o `requeue` (:38) e os `arguments` (:27-29), e não roteia pela DLX.
- **Ainda aberta.** O `requeue=false` e a DLX só nos unitários (`amqp-consumer.service.spec.ts`, CT-TRV-12).
- **Teste.** Ensinar o broker em memória a guardar os argumentos da fila, registrar o `requeue` e, com `requeue=false`, levar a mensagem para a fila ligada à `x-dead-letter-exchange`. Depois, nos testes do Renato, conferir a mensagem em `broker.filas.get(FILA + '.dlq')`: CT-TRV-13 (`consumo-notas.int-spec.ts:211`) e CT-NOG-19 (`consumo-capas.int-spec.ts`). Nomes atuais mantidos; asserção nova "e a mensagem chega na .dlq". RabbitMQ real (testcontainers e serviço no CI) fica fora: não é dependência hoje e mexeria no CI (P0-CI, Kayke). O CT-CNT-22, do Henrique, ganha a prova de graça se ele quiser trocar a asserção (aviso em §5).

## 3. Ordem e corte

Ordem de execução (decisão 4). O corte sai **de baixo para cima**.

| # | Lacuna | Projeto(s) | Horas | Acumulado |
|---|---|---|---|---|
| 1 | L-02 | `leitura` | 1,5 | 1,5 |
| 2 | L-01 (denúncia) | `social` | 2 | 3,5 |
| 3 | L-01 (`acervo`) | `acervo` | 2,5 | 6 |
| 4 | L-30 | `social`, `leitura`, web | 5 | 11 |
| 5 | L-31 | `leitura`, web, mobile | 3,5 | 14,5 |
| 6 | L-32 | `acervo`, web, mobile | 3,5 | 18 |
| 7 | L-13 | `leitura`, `social`, `acervo` | 3 | 21 |
| 8 | L-20 | web | 3 | 24 |
| 9 | L-14 | web, mobile | 4,5 | 28,5 |
| 10 | L-36 | `leitura`, `acervo` | 1,5 | 30 |
| 11 | L-35 | `social` | 3,5 | 33,5 |
| 12 | L-37 | mobile | 1,5 | 35 |
| 13 | L-38 | script | 2 | 37 |
| 14 | L-07 | `acervo` | 1 | 38 |
| 15 | L-10 (`acervo`) | `acervo` | 1,5 | 39,5 |
| 16 | L-09 (`acervo`) | `acervo` | 1 | 40,5 |
| 17 | L-15 (`acervo`) | `acervo` | 3 | 43,5 |

Com os agentes em paralelo por projeto (§4), a ordem vale **dentro de cada projeto** e para decidir o corte: se em 22/11 o restante não couber até 24/11, cortam-se os itens do fim, e o corte vai para a §9.8 como "fica em aberto".

## 4. Como a etapa 2 roda

- **Branch e worktree:** `git fetch && git worktree add -b renato-e6-02 ../le-ai-e6-02 origin/desenvolvimento`. Este plano, o Andamento e o README ficam na `renato-features`.
- **PR #67 ainda aberto (16/11).** Os testes não dependem dele. Antes de editar o `docs/9.plano_de_testes.md`, integrar a `origin/desenvolvimento`; se o #67 ainda não tiver entrado, fazer `git merge origin/renato-e6-01-dsf` na `renato-e6-02` (só documentação) para editar a §9.8 com L-43 e L-44 já lá.
- **Um agente por projeto, em paralelo, na mesma worktree** (pastas diferentes). Os agentes **não commitam**: o orquestrador commita por projeto, em série, depois da verificação completa. Cada um usa o seu banco no mesmo Postgres de Docker (`docker run -d --name leai-pg-teste -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=leai_teste -p 55432:5432 postgres:17-alpine`, e `CREATE DATABASE` para os outros):

| Agente | Lacunas | Verificação | Banco |
|---|---|---|---|
| `acervo` | L-01, L-07, L-09, L-10, L-13 (parte), L-15, L-32 (1 e 2), L-36 (parte) | `npm run lint`, `npm run build`, `npm test`, `npm run test:integration` (o lint acusa `␍` no Windows: não é achado) | `leai_teste` |
| `leitura` | L-02, L-13 (parte), L-30 (3, lado `leitura`), L-31 (1), L-36 (parte) | os mesmos do `acervo` | `leai_teste_leitura` |
| `social` | L-01 (denúncia), L-13 (parte), L-30 (1, 2 e 3), L-35 | `./mvnw verify` com `DATABASE_URL_TESTE` JDBC | `leai_teste_social` |
| web | L-14 (parte), L-20, L-30 (4 e 5), L-31 (2 e 3), L-32 (3) | `npm run lint`, `npm run build`, `npm test` | — |
| mobile | L-14 (parte), L-31 (2 e 3), L-32 (3), L-37 | `flutter analyze`, `flutter test`; `dart format` **só nos arquivos novos** | — |
| script | L-38 | `python -m pytest` com `DATABASE_URL_TESTE` | `leai_teste_ingestao` |

- **Commits** (só o assunto, pt-BR, sem corpo nem rodapé), um por projeto ou por lacuna: `test(leitura): nota e resenha sobrevivem ao abandono (L-02)`, `refactor(social): decisão de RN-08 da denúncia em função pura (L-01)` seguido do `test(social): …`, e assim por diante. Correção de bug do Renato vai em `fix(...)` próprio, com o teste.
- **Código de outro dono.** Pelo plano, só se **lê** ou **importa** helper alheio. As duas exceções previstas: o parâmetro opcional de timeout em `MOB/test/features/livros/apoio.dart` (verificar o dono pelo `git log`; se não for do Renato, nota datada no `code/mobile/AGENTS.md`) e os casos novos no `WEB/services/leitura.spec.ts`, que é compartilhado com a F-EST-2 (Ana) — nota no `code/front/AGENTS.md`. O `test_carga_banco.py` recebe os testes ao lado dos da F-ACV-OPC; se o agente achar que o bloco é do Vicenzo, nota no `AGENTS.md` do script.
- **Documentação (passo 4 do prompt):** §9.8 com a situação de cada lacuna ("fechada por `arquivo › nome`" ou "fechada por composição: …"); casos novos nas seções das features, continuando os IDs atuais: CT-AVA-19, CT-BUS-17, CT-AV2-32, CT-NOG-26, CT-MOD-32, CT-MDO-30, CT-ACO-24 e CT-TRV-21 em diante (confirmar o último ID no arquivo integrado). §9.7 com os runs novos, se o grupo quiser.
- **Validação:** um agente de contexto limpo por projeto tocado (só lê e testa): cada teste prova o que a lacuna diz? Falha se o comportamento quebrar (mutação mental ou real, desfeita depois)? Os antigos continuam verdes?

## 5. Avisos a outros donos (para o Renato repassar)

Os itens da própria área conferidos no código estão marcados com ✔. Os demais repetem a §9.8 de 16/11 (E6-01, etapa 4 e PR #67), que não foi reconferida no código nesta etapa. Somam-se aos avisos pendentes da E6-01 (plano da E6-01, §2.4, §11, §12 e §13), que o Renato decidiu passar depois.

| Lacuna | Dono | Teste sugerido |
|---|---|---|
| L-01 ✔ | Henrique | `acervo`: `viaLista` em `autorizacao-rn15.service.ts:135-170` decide RN-08 em Drizzle; extrair a decisão (`privacidade`, `segue`, dono presente na VIEW) e testar unitariamente. Mais o `identidade` e as listas no `social` (`RegrasDeListaTest` não tem RN-08) |
| L-01 ✔ | Vicenzo | `acervo`: `viaFeed` em `autorizacao-rn15.service.ts:87-115` (sempre exige seguimento aceito); unitário da decisão |
| L-01 ✔ | Kayke | `social`: `AtividadeRepository.visivelPara` (:60-81) e `ComentarioRepository.visivelPara` (:72), que também decidem a denúncia de comentário; extrair a decisão ou fechar com justificativa |
| L-01 | Ana | `leitura`: unitário de RN-08 onde o serviço filtra por perfil |
| L-03 | Kayke | Consumidores do `social`: retry 1/5/15 s, ACK depois do commit, ligações da fila do feed, rollback com outbox |
| L-04 | Ana | Falha do broker não desfaz a escrita no `leitura` (pendência já em F-EST) |
| L-05 | Ana | Reenvio automático da fila offline no mobile (timer e volta ao primeiro plano) |
| L-06 | Vicenzo | Validação no servidor de título, autor e páginas do livro pessoal; idempotência de editar |
| L-08 | Ana | Já fechada; só atualizar o arquivo de F-PRG, que ainda diz "não tem teste" |
| L-09 | Ana; Henrique e Kayke | CORS no `leitura` (mesmo teste do `acervo`, §2); origem recusada no `identidade` e no `social` |
| L-10 | Ana | Health check do `leitura` com banco fora (mesmo teste do `acervo`) |
| L-11 | Kayke | Limites de paginação e de quantidade de ids ao marcar notificações |
| L-12 | Ana | Agendador real do job de inatividade (ou fechar com a verificação manual registrada) |
| L-13 | Henrique, Kayke, Ana, Vicenzo | 401 próprio nas rotas novas de cada feature (lista na §9.8) |
| L-14 ✔ (comentário) | Kayke | Edição de comentário (503 e timeout) e exclusão (timeout) em `ModalComentarios.spec.ts` e `folha_comentarios_test.dart`; mais as outras telas da §9.8 de Ana, Vicenzo, Kayke e Henrique |
| L-15 ✔ | Henrique; Ana, Vicenzo | No `acervo`, o CT-CNT-22 (Henrique) pode conferir a chegada na `.dlq` com o broker em memória novo; no `leitura`, o mesmo ajuste no broker em memória do `leitura` (CT-CNT-19, CT-DSF-22, CT-STA-18, CT-GAM-13/14) |
| L-16, L-21, L-29, L-33, L-39, L-40, L-41, L-42 | Kayke | Os da §9.8 |
| L-17, L-18, L-19, L-28 | Henrique | Os da §9.8 |
| L-20 ✔ | Ana | Spec de `consultarFavorito`, `marcarFavorito`, `desmarcarFavorito`, `listarFavoritos`, `listarHistorico` e `consultaDoHistorico` em `services/leitura.ts` |
| L-22, L-25, L-26, L-27, L-43, L-44 | Vicenzo | Os da §9.8 |
| L-23, L-24, L-34 | Ana | Os da §9.8 (a L-24 deixa o RF-PRG-08 sem caso nenhum) |
| L-32 ✔ (4) | Henrique e Kayke | Listas e recomendações do `social` leem `capa_resolvida` de uma VIEW recriada no teste; conferir que a cópia própria vence a externa, ou ligar ao contrato da P-3 |
| L-35 ✔ | Kayke e Henrique | As cópias locais das VIEWs do `identidade` nas classes deles (`FeedRepositorioIntegracaoTest`, `ServicoDeFeedIntegracaoTest`, `ServicoDeInteracaoIntegracaoTest`, `InteracaoControllerIntegracaoTest`, `ListaControllerIntegracaoTest`, `NotificacaoControllerIntegracaoTest`); se a P-3 for aprovada, apontá-las para a cópia conferida |

## 6. Pendências para o Renato

Nenhuma bloqueia o início da etapa 2: o plano segue a recomendada de cada uma até o Renato dizer o contrário.

- **P-1. Forma da extração de RN-08 no `acervo` (L-01).** O filtro precisa ficar no SQL por causa da paginação.
  1. **(Recomendada)** Função pura usada como guarda final em cada linha, com o SQL devolvendo `privacidade` e `segue`; o SQL continua filtrando. A função roda em produção, e o CT-BUS-10 segue provando o SQL.
  2. Função que monta o fragmento SQL do predicado, testada pelo texto gerado. Mais fraca: testa a forma, não a regra.
  3. Não extrair no `acervo` e fechar a parte com justificativa em §9.3.3 (contraria a decisão 1).
- **P-2. L-31, recurtir com notificação suprimida por preferência.** A garantia é do `leitura`, que só publica a primeira curtida (CT-AV2-03); o `social` não guarda registro do evento suprimido, então reabilitar e receber o mesmo evento de novo notificaria.
  1. **(Recomendada)** Fechar por composição na §9.8: CT-AV2-03 prova que não há segundo evento, e CT-NOO-07 prova a supressão. 0,5 h, já na documentação.
  2. Teste no `social` que documenta o comportamento (evento suprimido não deixa recibo). Prova o contrário da frase da lacuna e mexe numa classe do Kayke (F-NOT-OPC).
- **P-3. L-35, VIEWs reais.**
  1. **(Recomendada)** Teste de contrato no `social` (classe nova do Renato) que compara o filtro das cópias com a migration do `identidade`, mais o caso do feed. 3,5 h.
  2. Só o caso do feed e fechar o resto por composição (o `identidade` prova a VIEW real no CT-MDO-05; os outros serviços provam "fora da VIEW, fora da tela"). 1,5 h.
  3. Harness que aplica as migrations do `identidade` e do `leitura` no mesmo banco dos testes do `social`. Seis horas ou mais, e decisão com o Henrique e o Kayke. Não recomendada antes de 24/11.
- **P-4. Quando repassar os avisos (§5).** Recomendado: juntar com os avisos pendentes da E6-01 e mandar uma mensagem só ao grupo, logo depois do relatório da etapa 2, com a lista por dono. Alternativa: mandar já, para dar tempo aos donos antes de 24/11.

## 7. Estimativa

| Etapa | Horas (agente + conferência) |
|---|---|
| 2. Realizar e validar | Preparação (worktree, bancos) 0,5 h; escrita 43,5 h (§3), em paralelo por projeto; documentação da §9.6 e da §9.8 3 h; validação 3 h; correções 2 h. **≈ 52 h** |
| 3. Revisão independente e PR | 3 h |
| **Total** | **≈ 55 h** |

Por projeto (escrita): `acervo` ≈ 13 h, `social` ≈ 10 h, `leitura` ≈ 4,5 h, web ≈ 8 h, mobile ≈ 6 h, script 2 h (as lacunas que cruzam projetos estão divididas pela parte de cada um, por aproximação).
