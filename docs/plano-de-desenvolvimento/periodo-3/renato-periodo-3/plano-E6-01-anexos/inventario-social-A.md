# Inventário de testes: grupo social-A (F-SOCIAL-2, F-MOD, F-NOT-2)

> Revisado em 15/11/2026 (etapa 2): 8 correções aplicadas.

Levantamento sobre o código da `desenvolvimento` (cópia no disco), em 14/11/2026. Somente leitura. Nomes copiados do código e conferidos com Grep no arquivo.

Prefixos: `SO/` = `code/back/social/src/test/java/br/com/leai/social/`, `LE/` = `code/back/leitura/`, `WEB/` = `code/front/src/`, `MOB/` = `code/mobile/test/`.

Formato da coluna do teste, como no §9.6: Java `arquivo › "@DisplayName"`; Jest/Vitest `arquivo › describe › "it"` (com o describe aninhado quando há); Flutter `arquivo › group › "nome"` (sem group quando o teste está no topo).

Observação geral: todos os `*IntegracaoTest` do `social` levam `@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE")`. Sem essa variável eles são ignorados, e por isso só rodam no CI, que tem Postgres. Não há `@Disabled`, `.skip`, `.only`, `.todo` nem `skip:` em `code/back`, `code/front/src` e `code/mobile/test`.

---

## 1. F-SOCIAL-2: edição de comentário e menções (CT-SOC)

Dono: **Kayke**. Serviços: `social`, web e mobile. RF-SOC-13 e RF-SOC-15; RN-10 e RN-08.

### 1.1 Arquivos de teste

| Arquivo | Testes no arquivo | Da feature | Cobre |
|---|---|---|---|
| `SO/integracao/InteracaoControllerIntegracaoTest.java` | 9 | 7 | RF-SOC-13 (PATCH/DELETE, dono, cascade, idempotência), RF-SOC-15, RN-10.1, RN-10.2, RN-10.3, RN-10.5, edição sem nova notificação, dedup com `comentario.respondido`, citext. Os outros 2 são curtir, do Período 1 (CT-FEE-11/12) |
| `SO/notificacao/service/ConsumidorDeNotificacaoIntegracaoTest.java` | 7 | 1 (parametrizado) | Consumo de `usuario.mencionado` → notificação `usuario_mencionado` (a invocação `USUARIO_MENCIONADO` do `@EnumSource`; é o mesmo teste do CT-NOT-01) |
| `WEB/components/feed/ModalComentarios.spec.ts` | 23 | 7 | Menção como link, escape, só o autor tem o menu, editar, 429 de menção, excluir a raiz com confirmação, falha ao excluir. Mais 1 da F-MOD e 1 da F-MOD-OPC no mesmo `describe` |
| `MOB/features/feed/folha_comentarios_test.dart` | 15 | 5 | Menção abre o perfil, editar, 429 de menção, excluir a raiz, falha ao excluir. Mais 1 da F-MOD e 1 da F-MOD-OPC |
| `MOB/features/notificacoes/notificacoes_page_test.dart` | 17 | 1 | Tipo `usuarioMencionado` na lista, com a frase do servidor e o destino feed |
| **Total** | | **21 testes em 5 arquivos** | |

Ficam de fora porque são da F-MOD-OPC, embora mexam na edição com menção: `SO/feed/service/MascaraDeMencoesTest.java` (6), `SO/integracao/OcultacaoDeContaSuspensaIntegracaoTest.java` (6 dos 12 tratam de menção a conta suspensa e da `versao` na edição), `ModalComentarios.spec.ts` › "apresentação mudada desde a leitura: 409 pede recarga e preserva o texto no campo" e `folha_comentarios_test.dart` › "apresentação mudada desde a leitura: 409 pede recarga e preserva o texto".

### 1.2 Casos previstos

São 21 casos, com 7 web e 6 mobile, acima do limite de 4 + 4 do §3. Corte sugerido (regra 2, o par web/mobile que prova o mesmo): CT-SOC-12, 13 e 14 (ficam os mobile 17, 18 e 19), CT-SOC-20 (fica o web 15) e CT-SOC-16 (a menção resolvida fica no web 09 e no backend 04; o nome do teste está desatualizado, §1.4). Sem eles, ficam 16: 4 web (09, 10, 11, 15) e 4 mobile (17, 18, 19, 21).

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-SOC-01 | RF-SOC-13, RNF-SEC-02 | Editar e excluir o comentário de outra pessoa | 403 `ACESSO_NEGADO`, texto intacto | integração | `SO/integracao/InteracaoControllerIntegracaoTest.java` › "Editar e excluir comentário de outra pessoa responde 403 e não muda nada" |
| CT-SOC-02 | RF-SOC-13, RN-10.5, RNF-ERR-04 | Excluir o próprio comentário-raiz que tem resposta e menção | 204; resposta e menções saem por cascade; a mesma chave repete 204; outra chave dá 404 | integração | `SO/integracao/InteracaoControllerIntegracaoTest.java` › "DELETE da raiz remove respostas e menções por cascade e é idempotente pela chave" |
| CT-SOC-03 | RF-SOC-13, RF-SOC-15 | Editar o próprio comentário mantendo, tirando e depois recolocando menções | 200 com `editado: true` e nível `RAIZ`; menções reprocessadas; só o destinatário novo recebe `usuario.mencionado` | integração | `SO/integracao/InteracaoControllerIntegracaoTest.java` › "PATCH reprocessa menções e só notifica destinatário novo" |
| CT-SOC-04 | RF-SOC-15, RN-10.1 | Comentário com `@existente`, `@inexistente` e o mesmo username repetido com outra caixa | O existente vira menção nas duas posições; o inexistente fica texto; 2 ocorrências gravadas e 1 evento | integração | `SO/integracao/InteracaoControllerIntegracaoTest.java` › "Menção existente vira link, inexistente fica texto e repetida notifica uma vez" |
| CT-SOC-05 | RN-10.2, RF-NOT-01 | Resposta que menciona o autor do comentário respondido | Só `comentario.respondido`, nenhum `usuario.mencionado` | integração | `SO/integracao/InteracaoControllerIntegracaoTest.java` › "Resposta que menciona o alvo só gera comentario.respondido, sem dupla notificação" |
| CT-SOC-06 | RN-10.3, RNF-SEC-18 | Comentário com mais menções que o limite por minuto | 429 "Muitas menções seguidas"; nenhum comentário gravado | integração | `SO/integracao/InteracaoControllerIntegracaoTest.java` › "Menções acima do limite recusam a escrita com 429 sem gravar comentário" |
| CT-SOC-07 | RF-SOC-15 | Username `citext` na VIEW de perfil, como no `identidade` | `autorAcao.username` sai como string nos payloads do comentário e da menção | integração | `SO/integracao/InteracaoControllerIntegracaoTest.java` › "Username citext (como em identidade) sai como texto no autorAcao da outbox" |
| CT-SOC-08 | RN-10.2, RF-NOT-01 | Consumo de `usuario.mencionado` | Uma notificação `usuario_mencionado` para o destinatário (invocação `USUARIO_MENCIONADO`; mesmo teste do CT-NOT-01) | mensageria | `SO/notificacao/service/ConsumidorDeNotificacaoIntegracaoTest.java` › "cada evento gera uma notificacao do tipo certo para o destinatario do evento" |
| CT-SOC-09 | RF-SOC-15, RN-10.1 | Web: comentário com menção resolvida e outra inexistente | Só a resolvida vira link para `perfil-de-outro`; o resto continua texto | web | `WEB/components/feed/ModalComentarios.spec.ts` › ModalComentarios › comentário próprio (F-SOCIAL-2) › "menção resolvida vira link para o perfil; username inexistente continua texto" |
| CT-SOC-10 | RNF-SEC-14 | Web: comentário com HTML | Exibido como texto, sem montar elemento | web | `WEB/components/feed/ModalComentarios.spec.ts` › ModalComentarios › comentário próprio (F-SOCIAL-2) › "texto com HTML é exibido como texto, nunca interpretado" |
| CT-SOC-11 | RF-SOC-13, RNF-SEC-02 | Web: abrir o menu do comentário de outra pessoa | O menu só tem `Denunciar comentário`, sem Editar e Excluir | web | `WEB/components/feed/ModalComentarios.spec.ts` › ModalComentarios › comentário próprio (F-SOCIAL-2) › "comentário de outra pessoa só oferece Denunciar comentário, que abre a denúncia por cima (F-MOD)" |
| CT-SOC-12 | RF-SOC-13 | Web: editar o próprio comentário | Texto vai ao campo; a lista só muda depois do servidor; marca `· editado` | web | `WEB/components/feed/ModalComentarios.spec.ts` › ModalComentarios › comentário próprio (F-SOCIAL-2) › "editar leva o texto ao campo, só troca a lista depois do servidor e marca editado" |
| CT-SOC-13 | RN-10.3 | Web: 429 de menções ao salvar a edição | Alerta próprio e texto preservado no campo | web | `WEB/components/feed/ModalComentarios.spec.ts` › ModalComentarios › comentário próprio (F-SOCIAL-2) › "limite de menções ao salvar mostra o alerta e preserva o texto no campo" |
| CT-SOC-14 | RF-SOC-13, RN-10.5, RNF-USA-04 | Web: excluir a raiz que tem resposta | A confirmação cita quem respondeu; somem as duas; emite a contagem 2 | web | `WEB/components/feed/ModalComentarios.spec.ts` › ModalComentarios › comentário próprio (F-SOCIAL-2) › "excluir raiz com resposta confirma citando quem respondeu, remove as duas e informa a contagem" |
| CT-SOC-15 | RF-SOC-13, RNF-TST-06 | Web: 503 ao excluir | O comentário fica e o erro aparece na confirmação | web | `WEB/components/feed/ModalComentarios.spec.ts` › ModalComentarios › comentário próprio (F-SOCIAL-2) › "falha ao excluir mantém o comentário e mostra o erro na confirmação" |
| CT-SOC-16 | RF-SOC-15 | Mobile: tocar na menção resolvida | Abre o perfil do mencionado; só o trecho resolvido é tocável | mobile | `MOB/features/feed/folha_comentarios_test.dart` › comentário próprio (F-SOCIAL-2) › "menção resolvida abre o perfil; comentário alheio não tem menu" |
| CT-SOC-17 | RF-SOC-13 | Mobile: editar o próprio comentário | `PATCH /comentarios/{id}`; o texto só muda depois do servidor; marca `· editado` | mobile | `MOB/features/feed/folha_comentarios_test.dart` › comentário próprio (F-SOCIAL-2) › "editar troca o texto só depois do servidor e marca editado" |
| CT-SOC-18 | RN-10.3 | Mobile: 429 de menções ao salvar | Alerta próprio e texto preservado | mobile | `MOB/features/feed/folha_comentarios_test.dart` › comentário próprio (F-SOCIAL-2) › "limite de menções mostra o alerta e preserva o texto" |
| CT-SOC-19 | RF-SOC-13, RN-10.5, RNF-USA-04 | Mobile: excluir a raiz que tem resposta | Confirmação com a contagem; `DELETE`; somem as duas | mobile | `MOB/features/feed/folha_comentarios_test.dart` › comentário próprio (F-SOCIAL-2) › "excluir raiz com resposta confirma, remove as duas e avisa a contagem" |
| CT-SOC-20 | RF-SOC-13, RNF-TST-06 | Mobile: 503 ao excluir | O comentário fica, com a explicação | mobile | `MOB/features/feed/folha_comentarios_test.dart` › comentário próprio (F-SOCIAL-2) › "falha ao excluir mantém o comentário e explica" |
| CT-SOC-21 | RN-10.2, RF-NOT-01 | Mobile: notificação de menção | Mostra a frase do servidor e leva ao feed | mobile | `MOB/features/notificacoes/notificacoes_page_test.dart` › "mencao aparece com a frase do servidor e leva ao feed" |

Outros testes da feature: `ModalComentarios.spec.ts` › "comentário de outra pessoa não oferece editar nem excluir" (trocado no CT-SOC-11: só confere que falta o botão `Ações do seu comentário`, sem abrir o menu `Ações do comentário`).

### 1.3 Lacunas candidatas (dono: Kayke)

| # | Critério / regra | O que procurei e onde | Situação |
|---|---|---|---|
| 1 | RN-10.4 e critério "Link de perfil privado abre nome/avatar/biografia; conteúdo protegido restrito; a menção notifica normalmente" | "privad" em `InteracaoControllerIntegracaoTest`, `ModalComentarios.spec.ts` e `folha_comentarios_test.dart` | Sem teste em nenhuma camada |
| 2 | RNF-TST-03 de `usuario.mencionado`: schema, ligação da fila, DLQ, reentrega do mesmo `eventId` e dedup semântico pela chave `mencao:` | `MessageValidatorTest` (nenhum caso do schema `usuario.mencionado.v1`); `ConsumidorDeNotificacaoBrokerTest` › "a fila de notificacoes recebe os eventos de identidade, leitura e social" (verifica 10 bindings, mas não o de `usuario.mencionado`); "reentrega do mesmo eventId nao duplica" usa só `SEGUIDOR_NOVO` | Só o consumo feliz, pelo teste parametrizado (CT-SOC-08). O próprio arquivo da feature deixa esse item do DoD desmarcado |
| 3 | "`usuario.mencionado` é publicado com destinatário correto" | Helper `eventosDeMencao` em `InteracaoControllerIntegracaoTest` | Conta as linhas da outbox com `chave_negocio LIKE 'mencao:<comentarioId>:%'`, mas não lê o `destinatarioId` do payload |
| 4 | RN-10 na edição e na exclusão de uma **resposta**: mantém o nível `RESPOSTA`; excluir uma resposta não mexe na raiz | Mesmo arquivo | Só há casos sobre a raiz (`"nivel":"RAIZ"` e DELETE da raiz) |
| 5 | RNF-SEC-13 no PATCH: texto vazio ou acima de 2000 caracteres | "2000" em `InteracaoControllerIntegracaoTest` e `ServicoDeFeedValidacaoTest` | Sem teste da edição |
| 6 | Idempotência do PATCH com a mesma `Idempotency-Key` | `InteracaoControllerIntegracaoTest` | Só o DELETE tem replay; cada PATCH usa uma chave nova |
| 7 | Regras do `ResolvedorDeMencoes`: ponto final e e-mail não viram menção (decisão de 03/10) e RNF-TST-01 (teste unitário) | Teste para `ResolvedorDeMencoes` em `SO/feed/` | Não existe teste unitário; a resolução só é exercida pela integração |
| 8 | RNF-TST-06 nos clientes: indisponibilidade e timeout ao editar e excluir | "503" e "timeout" em `ModalComentarios.spec.ts` e `folha_comentarios_test.dart` | Edição sem 503 nem timeout; exclusão sem timeout, na web e no mobile. O único 503 é o da exclusão (CT-SOC-15 e 20). Pendência já registrada no arquivo da feature |
| 9 | "Duas ocorrências do mesmo `@username` renderizadas nas posições corretas" nos clientes | Mesmos specs | O backend prova as posições (CT-SOC-04), mas os clientes testam uma menção só |
| 10 | Rotas novas `PATCH`/`DELETE /comentarios/{id}` sem token | `InteracaoControllerIntegracaoTest` | Coberto só pelo caso genérico CT-TRV-05 |
| 11 | "Edição/exclusão e menção-link funcionam em DES" | Arquivo da feature | Critério desmarcado; não é teste automatizado |

### 1.4 Divergências e estranhezas

- Serviço, RFs e clientes batem com a tabela que você passou.
- O arquivo da feature cita "`InteracaoControllerIntegracaoTest`, 9 testes verdes". São 9 no arquivo, mas 2 são de curtir, do Período 1; a F-SOCIAL-2 tem 7.
- Todos os critérios de aceite estão desmarcados, e no DoD seguem abertos os testes assíncronos, os testes web/mobile de RN-08 e timeout, a spec e o DES.
- **Nome de teste desatualizado:** `MOB/features/feed/folha_comentarios_test.dart` › "menção resolvida abre o perfil; comentário alheio não tem menu". Desde a F-MOD, o comentário alheio tem menu ("Ações do comentário", com `Denunciar comentário`). O teste só confere que o tooltip "Ações do seu comentário" aparece uma vez, então a segunda metade do nome não é provada e já não vale.
- O CT-SOC-03 passou a depender da F-MOD-OPC: o commit `4510993` (06/11) exige a `versao` da apresentação na edição com menção, e o teste a envia.
- O CT-SOC-08 usa o mesmo teste do CT-NOT-01. Se o plano não aceitar repetir o teste, a cobertura assíncrona de `usuario.mencionado` fica toda como lacuna (item 2).

---

## 2. F-MOD: moderação (CT-MOD)

Dono: **Renato Douglas**. Serviços conforme o arquivo da feature: `social` + **`leitura`** (remoção de resenha e frase) + web + mobile (só a denúncia; o painel é só web). RF-MOD-01, 02, 03 e 05; RN-11, RN-15.4, RN-23.7.

### 2.1 Arquivos de teste

| Arquivo | Testes no arquivo | Da feature | Cobre |
|---|---|---|---|
| `SO/integracao/DenunciaIntegracaoTest.java` | 14 | 14 | RF-MOD-01, RN-08, RN-15.4 (vias feed/lista e via forjada), 422 na própria, repetição, idempotência, validação, RNF-SEC-18 |
| `SO/integracao/ModeracaoIntegracaoTest.java` | 13 | 13 | RNF-SEC-04, RF-MOD-02 (fila por cursor), RF-MOD-03 (arquivar, remover comentário e resenha, timeout, indisponibilidade, 409), RN-11 (frase), RF-MOD-05, RNF-SEC-36/37 |
| `SO/moderacao/service/ServicoDeDenunciaTest.java` | 3 | 3 | Motivo aparado, obrigatório, até 500 code points (unitário) |
| `SO/common/RateLimitFilterTest.java` | 10 | 1 | Limite por IP no `POST /denuncias` |
| `SO/config/AppPropertiesTest.java` | 6 | 1 | `MODERACAO_TOKEN` opcional, com 32 caracteres quando preenchido |
| `SO/conta/service/ConsumidorDeContaExcluidaIntegracaoTest.java` | 5 | 2 | RN-23.7: um teste só da F-MOD ("conteúdo que a moderação já apagou...") e um compartilhado com a exclusão de conta ("remove o que é da conta...", que ganhou denúncias e logs) |
| `SO/moderacao/service/TimeoutDosClientesTest.java` | 1 | 1 (compartilhado) | Timeout de leitura × de conexão no `ClienteDeLeitura`; o javadoc o atribui à validação da F-MOD-OPC |
| `LE/test/integracao/moderacao.int-spec.ts` | 6 | 6 | Comando interno: token, remoção de resenha com `resenha.excluida`, replay depois de timeout, resenha inexistente, frase, 400 |
| `LE/src/moderacao/moderacao-token.guard.spec.ts` | 3 | 3 | Guard do `X-Moderacao-Token` (401 e 503) |
| `LE/src/common/redacao-do-log.spec.ts` | 1 | 1 | RNF-SEC-36: o token da moderação sai do log |
| `LE/src/auth/verificador-jwt.service.spec.ts` | 12 | 1 | Papel `admin` só com o claim exato |
| `LE/test/integracao/frase.int-spec.ts` | 15 | 1 | O admin vê a frase de autor privado (RN-11) |
| `LE/test/integracao/consumo-conta-excluida.int-spec.ts` | 4 | 1 | Anonimiza o recibo da remoção (RN-23.7) |
| `WEB/components/moderacao/DialogoDenunciar.spec.ts` | 10 | 10 | Denúncia em dois passos, escape, spoiler, 429, falha, 404 e descarte |
| `WEB/moderacao/useDenunciar.spec.ts` | 7 | 7 | Validação, code points, via, mesma chave no reenvio, 429/404, partida a frio |
| `WEB/moderacao/textos.spec.ts` | 5 | 5 | Textos do painel e do registro |
| `WEB/views/moderacao/PainelModeracaoView.spec.ts` | 17 | 12 | Fila, detalhe, arquivar, remover com confirmação, 504/409, indisponível, auditoria. Os outros 5 são da F-MOD-OPC (suspender e reativar) |
| `WEB/components/feed/ModalComentarios.spec.ts` | 23 | 1 | Denunciar o comentário de outra pessoa |
| `WEB/components/livros/CardResenha.spec.ts` | 9 | 2 | Menu `Denunciar resenha` só na resenha alheia |
| `WEB/views/livros/LivroPessoalView.spec.ts` | 18 | 2 | Denúncia com a via de RN-15.4; o dono não vê o menu |
| `WEB/views/livros/FrasesDoLivroView.spec.ts` | 8 | 3 | Remoção direta de frase pelo admin (RN-11) |
| `WEB/router/index.spec.ts` | 8 | 1 | Guarda de `/moderacao` |
| `WEB/session.spec.ts` | 16 | 3 | Papel lido do token. Os outros 3 com "F-MOD-OPC" ficam fora |
| `WEB/components/SidebarNavegacao.spec.ts` | 7 | 2 | Item `Moderação` só para o admin |
| `WEB/views/auth/ConfiguracoesView.spec.ts` | 5 | 1 | Linha `Moderação` abaixo de 768px |
| `MOB/features/moderacao/folha_denunciar_test.dart` | 9 | 9 | Folha de denúncia: dois passos, validação, via, 429/falha com a mesma chave, 404, partida a frio |
| `MOB/features/feed/folha_comentarios_test.dart` | 15 | 1 | Denunciar o comentário de outra pessoa |
| `MOB/features/livros/livro_oficial_page_test.dart` | 40 | 1 | Menu `Denunciar resenha` |
| `MOB/features/livros/livro_pessoal_page_test.dart` | 19 | 1 | Denúncia com a via que abriu a página |
| **Total** | | **109 testes em 29 arquivos** (`social` 35, `leitura` 13, web 49, mobile 12) | |

Ficam de fora porque são da F-MOD-OPC: `SO/integracao/SuspensaoDeContaIntegracaoTest.java`, `SO/integracao/OcultacaoDeContaSuspensaIntegracaoTest.java`, `WEB/components/moderacao/DialogoSuspensao.spec.ts`, `WEB/views/perfil/PerfilDeOutroView.admin.spec.ts`, os 5 testes de suspensão do `PainelModeracaoView.spec.ts`, os 3 "F-MOD-OPC" do `session.spec.ts`, o 1 do `router/index.spec.ts`, o caso "F-MOD-OPC: suspensão e reativação..." do `ConsumidorDeContaExcluidaIntegracaoTest` e, no `identidade`, `AppPropertiesTest` › "MODERACAO_TOKEN: vazio sobe, curto não sobe, com 32 caracteres sobe (F-MOD-OPC)".

### 2.2 Casos previstos

São 34 casos, acima da faixa típica, porque a feature tem 4 RFs, a RN-11 e a remoção entre serviços. Há 6 casos web (26 a 31), acima do limite de 4 do §3. Corte sugerido: CT-MOD-26 e 28, que mostram a apresentação (a regra fica no CT-MOD-01 e no 11). Sem eles, ficam 32, acima do alvo ≤ 30; o resto é o único caso de uma regra, de autorização (CT-MOD-22 é o único 401 do comando interno) ou de mensageria, e fica.

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-MOD-01 | RF-MOD-01, RN-08 | Denunciar comentário em atividade que o leitor vê | 201; autor, livro e atividade gravados | integração | `SO/integracao/DenunciaIntegracaoTest.java` › "Comentário em atividade visível é denunciado, com autor, livro e atividade gravados" |
| CT-MOD-02 | RF-MOD-01, RN-08, RNF-SEC-05 | Denunciar comentário em atividade que o leitor não vê | 404, igual a inexistente | integração | `SO/integracao/DenunciaIntegracaoTest.java` › "Comentário em atividade que o leitor não vê é 404, igual a inexistente" |
| CT-MOD-03 | RF-MOD-01, RN-08 | Denunciar resenha de autora privada | 404 sem seguir; 201 com seguimento aceito | integração | `SO/integracao/DenunciaIntegracaoTest.java` › "Resenha de autora privada: 404 sem seguir, 201 com seguimento aceito" |
| CT-MOD-04 | RF-MOD-01, RN-15.4 | Resenha de livro pessoal pela lista da dona | Perfil público basta; perfil privado exige seguir | integração | `SO/integracao/DenunciaIntegracaoTest.java` › "Livro pessoal pela lista: perfil público basta; privada exige seguir" |
| CT-MOD-05 | RF-MOD-01, RN-15, RNF-SEC-06 | Resenha de livro pessoal sem via, ou com via forjada | 404 | integração | `SO/integracao/DenunciaIntegracaoTest.java` › "Livro pessoal sem via, com via de outro livro ou de quem não é dona é 404" |
| CT-MOD-06 | RF-MOD-01, RNF-SEC-13 | Motivo vazio, motivo com 501 caracteres, tipo inválido ou falta de chave | 400 | integração | `SO/integracao/DenunciaIntegracaoTest.java` › "Motivo vazio, com 501 caracteres, tipo inválido ou sem chave é 400" |
| CT-MOD-07 | RF-MOD-01, RNF-SEC-13 | Limite do motivo em code points | 500 emojis passam; 501 não | unitário | `SO/moderacao/service/ServicoDeDenunciaTest.java` › "O limite de 500 conta code points: 500 emojis passam, 501 não" |
| CT-MOD-08 | RF-MOD-01 | Repetir a denúncia pendente sobre o mesmo alvo | 200 com a existente, sem outra linha | integração | `SO/integracao/DenunciaIntegracaoTest.java` › "Repetir a denúncia pendente devolve a existente com 200, sem outra linha" |
| CT-MOD-09 | RNF-SEC-18 | Mais de dez denúncias por minuto | 429 | integração | `SO/integracao/DenunciaIntegracaoTest.java` › "Passar de dez denúncias por minuto é 429 (RNF-SEC-18)" |
| CT-MOD-10 | RF-MOD-02, RNF-SEC-04, RNF-SEC-01 | Painel, registro e arquivar sem papel admin; painel sem token | 403 para leitor e para token sem papel; 401 sem token; admin recebe 200 | integração | `SO/integracao/ModeracaoIntegracaoTest.java` › "Painel e ações só com papel admin: leitor e token sem papel são 403, sem token 401" |
| CT-MOD-11 | RF-MOD-02, RNF-DES-02 | Fila de pendentes | Da mais antiga para a mais recente, com conteúdo e contexto, paginada por cursor; cursor inválido dá 400 | integração | `SO/integracao/ModeracaoIntegracaoTest.java` › "Fila da mais antiga para a mais recente, com conteúdo, contexto e cursor" |
| CT-MOD-12 | RF-MOD-03, RF-MOD-05 | Arquivar uma de duas denúncias do mesmo alvo | Só a escolhida vira `arquivada`; um log `arquivar_denuncia` sem detalhe; repetir dá 409 | integração | `SO/integracao/ModeracaoIntegracaoTest.java` › "Arquivar fecha só a escolhida, registra e não repete" |
| CT-MOD-13 | RF-MOD-03, RN-10.5 | Remover um comentário-raiz denunciado | A raiz e a resposta somem; as denúncias das duas fecham; um log; o `leitura` não é chamado | integração | `SO/integracao/ModeracaoIntegracaoTest.java` › "Remover comentário-raiz leva as respostas e fecha as denúncias delas, com um log" |
| CT-MOD-14 | RF-MOD-03 | Remover uma resenha denunciada | Chama o `leitura` com o token e a chave fixa por alvo; fecha todas as denúncias do alvo e as dos comentários da atividade; log com autor e livro | integração | `SO/integracao/ModeracaoIntegracaoTest.java` › "Remover resenha pede ao leitura com o token e a chave fixa, e fecha tudo do alvo" |
| CT-MOD-15 | RF-MOD-03, RNF-ERR-08 | Timeout do `leitura` depois de apagar | 504; a denúncia fica pendente com a marca; arquivar dá 409 `REMOCAO_EM_ANDAMENTO`; o reenvio com a mesma chave fecha com um log | integração | `SO/integracao/ModeracaoIntegracaoTest.java` › "Timeout depois de o leitura apagar: pendente, sem arquivar; o reenvio fecha com um log" |
| CT-MOD-16 | RF-MOD-03, RNF-ERR-08 | `leitura` fora do ar | Uma retentativa, 503, denúncia pendente e nenhum log | integração | `SO/integracao/ModeracaoIntegracaoTest.java` › "leitura fora do ar: uma retentativa, 503 e a denúncia pendente" |
| CT-MOD-17 | RF-MOD-03 | Resenha que a autora já excluiu, ou recibo vencido | 409 `CONTEUDO_JA_EXCLUIDO`, marca limpa e nenhum log | integração | `SO/integracao/ModeracaoIntegracaoTest.java` › "Resenha já excluída pela autora, ou recibo vencido: 409, marca limpa e sem log" |
| CT-MOD-18 | RF-MOD-03, RF-MOD-05 | Dois cliques em remover, com chaves diferentes | O segundo dá 409 `DENUNCIA_JA_RESOLVIDA`; fica um log só | integração | `SO/integracao/ModeracaoIntegracaoTest.java` › "Dois cliques com chaves diferentes: o segundo é 409 e fica um log só" |
| CT-MOD-19 | RN-11, RF-MOD-05 | Remover frase sem denúncia | 204 (o replay também); uma chamada ao `leitura` com a chave fixa; log de frase sem `denuncia_id` | integração | `SO/integracao/ModeracaoIntegracaoTest.java` › "Remover frase sem denúncia: leitura com a chave fixa, 204 e um log de frase" |
| CT-MOD-20 | RF-MOD-05, RNF-SEC-36, RNF-SEC-37 | Consultar o registro de auditoria | Da mais recente para a mais antiga, por cursor, sem motivo nem texto do conteúdo | integração | `SO/integracao/ModeracaoIntegracaoTest.java` › "Registro da mais recente para a mais antiga, sem motivo nem texto, e com cursor" |
| CT-MOD-21 | RN-23.7 | `conta.excluida` da autora de conteúdo que a moderação já removeu | Denúncias saem e o log é anonimizado, achados pelo autor gravado | mensageria | `SO/conta/service/ConsumidorDeContaExcluidaIntegracaoTest.java` › "conteúdo que a moderação já apagou é achado pelo autor gravado (F-MOD, RN-23.7)" |
| CT-MOD-22 | RNF-SEC-04 | Comando interno do `leitura` sem o token, ou com o token errado | 401, e a resenha continua | integração | `LE/test/integracao/moderacao.int-spec.ts` › remoção pela moderação, comando interno (F-MOD, integração) › "sem o token ou com o token errado é 401, e nada sai" |
| CT-MOD-23 | RF-MOD-03 | `leitura` remove a resenha pela moderação | Remove a resenha de qualquer autor com as reações e publica `resenha.excluida` (a atividade sai pelo consumidor do feed, CT-FEE-09) | integração | `LE/test/integracao/moderacao.int-spec.ts` › remoção pela moderação, comando interno (F-MOD, integração) › "remove a resenha de qualquer autor, leva as reações e publica resenha.excluida" |
| CT-MOD-24 | RF-MOD-03, RNF-ERR-04 | Mesma chave reenviada depois de um timeout | Repete `removida: true`, sem outro evento | integração | `LE/test/integracao/moderacao.int-spec.ts` › remoção pela moderação, comando interno (F-MOD, integração) › "a mesma chave depois de um timeout repete removida: true, sem outro evento" |
| CT-MOD-25 | RNF-SEC-36 | Cabeçalhos logados no `leitura` | O token da moderação e o bearer saem redigidos | unitário | `LE/src/common/redacao-do-log.spec.ts` › redação do log (RNF-SEC-36) › "tira o token da moderação, o do agendador e o bearer dos cabeçalhos logados" |
| CT-MOD-26 | RF-MOD-01, RNF-USA-04 | Web: segundo passo da denúncia | Repete o motivo e foca "Voltar ao motivo", que volta com o texto intacto | web | `WEB/components/moderacao/DialogoDenunciar.spec.ts` › DialogoDenunciar › "passo 2 repete o motivo e foca Voltar ao motivo, que volta com o texto intacto" |
| CT-MOD-27 | RF-MOD-01, RNF-TST-06 | Web: falha de conexão e 429 ao enviar | Banner certo em cada caso, motivo preservado | web | `WEB/components/moderacao/DialogoDenunciar.spec.ts` › DialogoDenunciar › "falha de conexão e 429 mostram o banner certo, com o motivo preservado" |
| CT-MOD-28 | RF-MOD-02 | Web: abrir o painel | Fila da mais antiga, com a primeira selecionada e o detalhe completo | web | `WEB/views/moderacao/PainelModeracaoView.spec.ts` › PainelModeracaoView › "fila da mais antiga com a primeira selecionada e o detalhe completo" |
| CT-MOD-29 | RF-MOD-03, RNF-USA-04, RNF-TST-06 | Web: remover com confirmação e timeout | Pede confirmação; o 504 deixa a denúncia com o banner; o reenvio usa a mesma chave | web | `WEB/views/moderacao/PainelModeracaoView.spec.ts` › PainelModeracaoView › "remover pede confirmação; 504 deixa a denúncia com o banner e o reenvio usa a mesma chave" |
| CT-MOD-30 | RF-MOD-05, RNF-SEC-36 | Web: aba de auditoria | Lista as ações, sem motivo nem texto | web | `WEB/views/moderacao/PainelModeracaoView.spec.ts` › PainelModeracaoView › "aba de auditoria lista as ações, sem motivo nem texto" |
| CT-MOD-31 | RN-11, RNF-USA-04 | Web: admin remove uma frase | Confirma; só tira da lista depois do servidor; a falha fica no diálogo | web | `WEB/views/livros/FrasesDoLivroView.spec.ts` › FrasesDoLivroView › administrador (F-MOD) › "remover confirma, só tira da lista depois do servidor e a falha fica no dialog" |
| CT-MOD-32 | RF-MOD-01, RNF-USA-04 | Mobile: denunciar o comentário de outra pessoa | O menu só tem "Denunciar comentário"; a folha empilha, revisa e envia o motivo aparado | mobile | `MOB/features/feed/folha_comentarios_test.dart` › denunciar comentário de outra pessoa (F-MOD) › "o menu só tem Denunciar comentário, e a denúncia empilha e envia" |
| CT-MOD-33 | RF-MOD-01, RN-15.4 | Mobile: denunciar a resenha da dona de um livro pessoal | O corpo leva a via que abriu a página | mobile | `MOB/features/livros/livro_pessoal_page_test.dart` › "terceiro denuncia a resenha do dono com a via que abriu a página (F-MOD)" |
| CT-MOD-34 | RF-MOD-01, RNF-TST-06, RNF-ERR-04 | Mobile: falha e 429 ao enviar | Banner certo; tentar de novo repete a mesma chave | mobile | `MOB/features/moderacao/folha_denunciar_test.dart` › "falha e 429 mostram o banner certo; tentar de novo repete a mesma chave" |

Outros nomes úteis para trocar ou acrescentar: `SO/integracao/DenunciaIntegracaoTest.java` › "Denunciar o próprio comentário é 422", "Mesma chave e mesmo corpo repetem a resposta; outra pessoa denuncia à parte", "Livro pessoal pelo feed exige seguir, mesmo com perfil público"; `SO/integracao/ModeracaoIntegracaoTest.java` › "Frase que já não existe é 409; leitor recebe 403", "Conteúdo apagado pelo autor vem nulo, e o perfil fora da VIEW também"; `WEB/router/index.spec.ts` › guardaDeSessao › "/moderacao só para o papel admin; leitor vai para /estante (F-MOD)"; `LE/test/integracao/frase.int-spec.ts` › frases (integração) › listar › "o administrador vê também a frase de autor privado que não segue (F-MOD)".

### 2.3 Lacunas candidatas (dono: Renato Douglas)

| # | Critério / regra | O que procurei e onde | Situação |
|---|---|---|---|
| 1 | "Não-admin recebe 403 nas ações": `POST /admin/denuncias/{id}/remover` | `ModeracaoIntegracaoTest` › "Painel e ações só com papel admin..." | O teste cobre `GET /admin/denuncias`, `GET /admin/moderacao/logs` e `/arquivar`, e o "Frase que já não existe..." cobre o `DELETE /admin/frases`. O `/remover` com leitor não é chamado |
| 2 | "Resenha removida deixa de aparecer em atividade associada" | `ModeracaoIntegracaoTest` › "Remover resenha pede ao leitura..." | A atividade é apagada pelo helper `removerComoOLeitura` do próprio teste, que simula o `leitura` e o feed. A cadeia real (`leitura` publica `resenha.excluida` → consumidor do `social`) só é coberta em partes: CT-MOD-23 e CT-FEE-09. Não há teste ponta a ponta |
| 3 | Divergência registrada: "repetir a remoção de uma frase já removida responde 204, sem outro log, por 24 horas; depois, 409" | `ModeracaoIntegracaoTest` › "Remover frase sem denúncia..." e `LE/.../moderacao.int-spec.ts` › "remove a frase de qualquer autor pela moderação, com replay pela mesma chave" | Só o replay com a **mesma** chave. Sem caso de outra chave dentro de 24 h nem do 409 depois de 24 h |
| 4 | RNF-SEC-14 no painel web (conteúdo denunciado como texto) | "v-html", "<img", "escape" em `PainelModeracaoView.spec.ts` | Só o `DialogoDenunciar` testa escape e ausência de `v-html`; o painel não |
| 5 | Denúncia de resenha na página do livro **oficial** na web | Specs com "Denunciar" em `WEB/` | O `CardResenha.spec.ts` só prova que o menu emite `denunciar`; nenhuma view do livro oficial abre o diálogo. O mobile tem o caso equivalente |
| 6 | RNF-TST-01: teste unitário das regras de acesso da denúncia (RN-08/RN-15.4) | `SO/moderacao/service/` | Há só `ServicoDeDenunciaTest` (motivo); as regras de acesso são testadas só por integração, como a L-01 do plano |
| 7 | Débito: notificações `RESENHA_CURTIDA` continuam depois da remoção da resenha | — | Registrado como débito, não como critério; sem teste |
| 8 | "Denúncia e moderação funcionam em DES" | Arquivo da feature | Validado manualmente em 05/11/2026; não é automatizado |
| 9 | Rotas novas sem token: `POST /denuncias`, `POST /admin/denuncias/{id}/remover`, `DELETE /admin/frases/{id}` e `GET /admin/moderacao/logs` | "401" em `ModeracaoIntegracaoTest` e `DenunciaIntegracaoTest` | Só `GET /admin/denuncias` sem token tem 401 (CT-MOD-10). As outras ficam com o caso genérico, que cobre o filtro, não a rota. O `/arquivar` também não tem 401 próprio |

### 2.4 Divergências e estranhezas

- **Serviços:** a tabela que você passou diz "social; web e mobile", mas o arquivo da feature inclui o **`leitura`** (comando interno de remoção de resenha e frase, papel `admin` no `VerificadorJwt`, redação do log). São 13 testes no `leitura`.
- Paginação: a especificação diz `?page=`, mas o código usa cursor (`?cursor=`, `limite`). É divergência registrada no próprio arquivo, e os testes seguem o cursor.
- `SO/moderacao/service/TimeoutDosClientesTest.java` diz no javadoc que é "Validação da F-MOD-OPC (06/11/2026)", mas testa também o `ClienteDeLeitura` da F-MOD. Contei como compartilhado.
- `SO/conta/service/ConsumidorDeContaExcluidaIntegracaoTest.java` › "remove o que é da conta e o que pende do conteúdo dela; o da outra fica" é do dono da exclusão de conta (Henrique) e ganhou denúncias e logs da F-MOD. Mistura as duas features.
- Todos os critérios e itens do DoD estão marcados, o que bate com os testes encontrados, exceto o item 2 das lacunas (a ocultação da atividade é provada por simulação).

---

## 3. F-NOT-2: notificações em tempo real (CT-NT2)

Dono: **Kayke**. Serviços: `social` + mobile. RF-NOT-06. Web fora do escopo (§2.1), então não há caso web.

### 3.1 Arquivos de teste

| Arquivo | Testes no arquivo | Da feature | Cobre |
|---|---|---|---|
| `SO/integracao/NotificacaoControllerIntegracaoTest.java` | 15 | 4 | Canal SSE: 401 sem token ou com token inválido; sincronização e push só ao dono, com o total; reentrega não empurra de novo; encerramento na expiração do JWT |
| `MOB/core/api_client_test.dart` | 24 | 4 | `abrirFluxo`: token no cabeçalho e URL sem query; renovação em 401; sessão que não renova; falha de rede |
| `MOB/features/notificacoes/canal_de_notificacoes_test.dart` | 8 | 8 | Decodificação SSE (heartbeat, cortes), tipo desconhecido, backoff exponencial com teto de 30 s, reconexão em 1 s, sessão encerrada, desconectar, jitter |
| `MOB/features/notificacoes/notificacoes_page_test.dart` | 17 | 4 | Group `tempo real (RF-NOT-06)`: item novo no topo com o badge, sem duplicar, aviso com a lista rolada, queda e sincronização |
| **Total** | | **20 testes em 4 arquivos** | |

### 3.2 Casos previstos

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-NT2-01 | RF-NOT-06, RNF-SEC-01 | Abrir o canal sem token ou com token inválido | 401; o canal não abre | integração | `SO/integracao/NotificacaoControllerIntegracaoTest.java` › "tempo real: sem token ou com token invalido o canal nao abre" |
| CT-NT2-02 | RF-NOT-06, RNF-SEC-02 | Canal aberto; chegam uma notificação de outro leitor e uma do dono | Abre com `sincronizacao` e o total; empurra só a do dono, com o total atualizado | integração | `SO/integracao/NotificacaoControllerIntegracaoTest.java` › "tempo real: abre sincronizando as nao lidas e empurra a notificacao nova do dono" |
| CT-NT2-03 | RF-NOT-06, RNF-ERR-06 | O mesmo evento entregue duas vezes ao consumidor com o canal aberto | Empurra uma vez só | mensageria | `SO/integracao/NotificacaoControllerIntegracaoTest.java` › "tempo real: reentrega do mesmo evento nao empurra de novo" |
| CT-NT2-04 | RF-NOT-06, RNF-SEC-01 | O token do canal expira | O servidor encerra o canal | integração | `SO/integracao/NotificacaoControllerIntegracaoTest.java` › "tempo real: o servidor encerra o canal quando o token expira" |
| CT-NT2-05 | RF-NOT-06, RNF-SEC-36 | Mobile: abrir o canal | `GET /notificacoes/tempo-real` com `Authorization: Bearer` e `Accept: text/event-stream`; URL sem query | mobile | `MOB/core/api_client_test.dart` › abrirFluxo (SSE) › "abre com o token da sessao no cabecalho e devolve o corpo como stream" |
| CT-NT2-06 | RF-NOT-06, RF-AUT-03 | Mobile: token vencido na abertura | Renova uma vez e reabre com o token novo | mobile | `MOB/core/api_client_test.dart` › abrirFluxo (SSE) › "token vencido renova a sessao uma vez e reabre com o token novo" |
| CT-NT2-07 | RF-NOT-06, RF-AUT-03 | Mobile: sessão que não renova | `ApiException` 401 com o código do corpo | mobile | `MOB/core/api_client_test.dart` › abrirFluxo (SSE) › "sessao que nao renova vira ApiException 401 com o codigo do corpo" |
| CT-NT2-08 | RF-NOT-06 | Mobile: canal com sessão encerrada | Encerra sem tentar de novo | mobile | `MOB/features/notificacoes/canal_de_notificacoes_test.dart` › "sessao que nao renova encerra o canal sem insistir" |
| CT-NT2-09 | RF-NOT-06 | Mobile: fluxo SSE com heartbeat e pedaços que cortam linha e caractere | Decodifica `sincronizacao` e `notificacao`, ignorando o heartbeat | mobile | `MOB/features/notificacoes/canal_de_notificacoes_test.dart` › "decodifica sincronizacao e notificacao, ignorando heartbeat e cortes no meio" |
| CT-NT2-10 | RF-NOT-06 | Mobile: tipo de notificação desconhecido no canal | Ignora o item, mas atualiza o total | mobile | `MOB/features/notificacoes/canal_de_notificacoes_test.dart` › "tipo desconhecido ainda atualiza o total" |
| CT-NT2-11 | RNF-ERR-03, RNF-ERR-09, RNF-TST-06 | Mobile: serviço fora (cold start) | Novas tentativas com backoff 1, 2, 4, 8, 16 e 30 s, com teto de 30 s | mobile | `MOB/features/notificacoes/canal_de_notificacoes_test.dart` › "servico fora: tenta de novo com backoff exponencial ate o teto" |
| CT-NT2-12 | RNF-ERR-09 | Mobile: queda depois de conectar (expiração, deploy, hibernação) | Reconecta em 1 s; o evento recebido zera o backoff | mobile | `MOB/features/notificacoes/canal_de_notificacoes_test.dart` › "queda depois de conectar reconecta em 1 s, e o evento zera o backoff" |
| CT-NT2-13 | RNF-ERR-03 | Mobile: jitter da espera | Soma no máximo metade da espera | unitário | `MOB/features/notificacoes/canal_de_notificacoes_test.dart` › "jitter soma no maximo metade da espera" |
| CT-NT2-14 | RF-NOT-06 | Mobile: desconectar com reconexão pendente | Cancela a reconexão; conectar abre de novo | mobile | `MOB/features/notificacoes/canal_de_notificacoes_test.dart` › "desconectar cancela a reconexao pendente; conectar volta a abrir" |
| CT-NT2-15 | RNF-TST-06 | Mobile: falha de rede na abertura | `ApiException` de rede | mobile | `MOB/core/api_client_test.dart` › abrirFluxo (SSE) › "falha de rede na abertura vira ApiException de rede" |
| CT-NT2-16 | RF-NOT-06 | Mobile: notificação nova com a tela aberta | Entra no topo como "agora"; badge e "N não lidas" atualizam; nenhuma nova leitura da lista | mobile | `MOB/features/notificacoes/notificacoes_page_test.dart` › tempo real (RF-NOT-06) › "notificacao nova entra no topo com o badge, sem recarga" |
| CT-NT2-17 | RF-NOT-06 | Mobile: a mesma notificação entregue duas vezes | Aparece uma vez | mobile | `MOB/features/notificacoes/notificacoes_page_test.dart` › tempo real (RF-NOT-06) › "a mesma notificacao entregue duas vezes aparece uma vez" |
| CT-NT2-18 | RF-NOT-06 | Mobile: notificações novas com a lista rolada | O aviso "N novas notificações" acumula sem mover a lista; tocar leva ao topo com as novas | mobile | `MOB/features/notificacoes/notificacoes_page_test.dart` › tempo real (RF-NOT-06) › "com a lista rolada, o aviso acumula e tocar leva ao topo com as novas" |
| CT-NT2-19 | RNF-ERR-09, RF-NOT-02 | Mobile: queda do canal enquanto chega uma notificação | Sem banner de erro; reconecta e sincroniza o que chegou, sem duplicar | mobile | `MOB/features/notificacoes/notificacoes_page_test.dart` › tempo real (RF-NOT-06) › "queda reconecta sem aviso e sincroniza o que chegou, sem duplicar" |

Teste restante da feature, sem caso próprio: `canal_de_notificacoes_test.dart` › "desconectar fecha a conexao aberta".

### 3.3 Lacunas candidatas (dono: Kayke)

| # | Critério / regra | O que procurei e onde | Situação |
|---|---|---|---|
| 1 | "Empurrada após o commit": gravação desfeita não é empurrada | `NotificacaoControllerIntegracaoTest` (4 casos de tempo real) | Só o caminho feliz; sem caso de rollback |
| 2 | Heartbeat a cada 25 s no servidor | Testes do `social` com "heartbeat" | O servidor não tem teste; só o cliente ignora o heartbeat (CT-NT2-09) |
| 3 | Canais encerrados antes do shutdown gracioso | `SO/` | Sem teste |
| 4 | Fan-out a várias conexões do mesmo destinatário | `NotificacaoControllerIntegracaoTest` | Cada teste abre um canal só |
| 5 | App: o canal conecta com o shell montado e o app em primeiro plano, e desconecta em `paused` (`ShellAutenticado.didChangeAppLifecycleState`) | "AppLifecycleState", "ShellAutenticado" e "conectar(" em `MOB/` | Nenhum teste do ciclo de vida do shell; o `CanalDeNotificacoes` só é testado isolado e na página de notificações |
| 6 | Token fora do log do servidor | `SO/` | O mobile prova a URL sem query (CT-NT2-05); nada prova a ausência no log do `social` |
| 7 | Fallback explícito à lista paginada enquanto desconectado (critério 4) | `notificacoes_page_test.dart` | Sem caso explícito. Durante a queda, o CT-NT2-19 só confere que não aparece `BannerAviso`, não que a lista continua na tela; a página sempre lê por REST, então o fallback é só implícito |
| 8 | "A entrega em tempo real funciona no app em DES" e o item próprio (SSE no Render free com hibernação) | Arquivo da feature | Desmarcados, sem validação registrada; não é automatizável |

### 3.4 Divergências e estranhezas

- Serviço e clientes batem: `social` + mobile; web não se aplica.
- No arquivo da feature, os critérios de aceite estão desmarcados, exceto a escolha do transporte, embora o DoD de testes esteja marcado. Os testes existem para os critérios 1 a 5; ficam abertos o DES e os itens finais do DoD (DES, arquivo atualizado, divergência do protótipo).
- No `"tempo real: reentrega do mesmo evento nao empurra de novo"`, a primeira leitura depois da sincronização só confere `id` não nulo. A prova está no evento seguinte, que tem de ser a notificação nova. O teste vale, mas é indireto.
- O CT-NT2-03 chama `consumidor.handle` direto, sem broker. Classifiquei como mensageria, como os CT-NOT-01/02 do plano; também caberia como integração.
