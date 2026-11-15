# Inventário de testes: acervo + identidade (F-CONTA-2, F-ACV-DESCOBERTA, F-ACV-NOTA)

Levantado em 14/11/2026 sobre o código no disco (igual à `origin/desenvolvimento`), só leitura. Os nomes de teste foram copiados do código: `@DisplayName` no Java, cadeia `describe › it` no Jest/Vitest (pela indentação dos blocos), `group › test/testWidgets` no Flutter e `def test_` no pytest. Contagem: cada `@Test`/`it`/`test`/`testWidgets`/`def test_` vale 1, parametrizado também vale 1.

Prefixos como em §9.6 (`ID/`, `SO/`, `AC/` = `code/back/acervo/`, `LE/` = `code/back/leitura/`, `WEB/`, `MOB/`, `ING/`).

Nenhum caso abaixo repete um caso do Período 1 em §9.6. Onde um teste do P1 foi ampliado por estas features, isso está em "Divergências e estranhezas".

---

## 1. F-CONTA-2 — Exclusão de conta (CT-CNT)

Dono: **Henrique Carvalho**. RF-AUT-07, RN-23, RNF-SEC-35/36/41/42, RNF-ERR-06/07, RNF-SEC-32. Serviço dono `identidade`; consumidores de `conta.excluida` em `leitura`, `social` e `acervo`; web e mobile.

### 1.1 Arquivos de teste

| Arquivo | Testes no arquivo | Da feature | Cobre |
|---|---|---|---|
| `ID/integracao/ExclusaoDeContaIntegracaoTest.java` | 11 | 11 | RF-AUT-07; RN-23.1 a 23.7; pedido, senha errada/429, confirmação, idempotência, login restrito, cancelar, 410, reserva de username, job, recibo e envelope anonimizados; log sem senha (SEC-36, parcial) |
| `ID/integracao/GuardaDeExclusaoIntegracaoTest.java` | 2 | 2 | RN-23.7 (matriz de remoção do schema `identidade`) |
| `ID/messaging/ContaExcluidaSchemaTest.java` | 3 | 3 | RNF-SEC-32, schema `conta.excluida.v1` sem PII |
| `ID/auth/service/AdminIntegracaoTest.java` | 7 | 1 | admin não pede exclusão (403) |
| `ID/integracao/ContratosDePerfilIntegracaoTest.java` | 4 | 2 | RN-23.2: VIEWs `v_perfil_referencia_v1` e `v_seguimento_aceito_v1` omitem conta pendente |
| `ID/integracao/PerfilDeOutroIntegracaoTest.java` | 9 | 1 | RN-23.2: perfil 404 e fora da busca |
| `ID/integracao/SeguimentoIntegracaoTest.java` | 14 | 1 (indireto) | RN-23.2: listas escondem conta em exclusão (é o teste do CT-PER-14) |
| `ID/integracao/SuspensaoDeContaIntegracaoTest.java` | 19 | 3 (interação com F-MOD-OPC) | exclusão pendente × suspensão |
| `SO/conta/service/ConsumidorDeContaExcluidaIntegracaoTest.java` | 5 | 5 | RN-23.5/23.7 no `social`: remoção, anonimização, repetição |
| `SO/conta/service/GuardaDeExclusaoIntegracaoTest.java` | 2 | 2 | RN-23.7 (matriz do `social`) |
| `SO/messaging/ContaExcluidaSchemaTest.java` | 3 | 3 | RNF-SEC-32 |
| `SO/integracao/DenunciaIntegracaoTest.java` | 14 | 1 (indireto, F-MOD) | RN-23.2: resenha de autora em exclusão é 404 |
| `AC/test/integracao/consumo-conta-excluida.int-spec.ts` | 5 | 5 | RN-23.5/23.7 no `acervo`; RNF-ERR-06/07; RNF-SEC-32 |
| `AC/test/integracao/guarda-exclusao.int-spec.ts` | 2 | 2 | RN-23.7 (matriz do `acervo`) |
| `AC/test/integracao/livro-pessoal.int-spec.ts` | 32 | 1 (indireto) | RN-23.2: dono em exclusão não libera livro pessoal pela lista |
| `LE/test/integracao/consumo-conta-excluida.int-spec.ts` | 4 | 4 | RN-23.5/23.7 no `leitura`; RNF-ERR-06/07; RNF-SEC-32 |
| `LE/test/integracao/guarda-exclusao.int-spec.ts` | 2 | 2 | RN-23.7 (matriz do `leitura`) |
| `LE/test/integracao/estante.int-spec.ts` | 30 | 1 (indireto) | RN-23.2: estante de conta fora da VIEW é 404 |
| `LE/test/integracao/reacao.int-spec.ts` | 26 | 1 (indireto) | RN-23.2: leitora fora da VIEW não reage |
| `WEB/views/conta/ExcluirContaView.spec.ts` | 9 | 9 | tela de exclusão, 422, 429, rede, cold start, timeout (RNF-TST-05/06) |
| `WEB/views/conta/RecuperarContaView.spec.ts` | 9 | 9 | recuperação, cancelar, acesso vencido, sair, cold start, timeout |
| `WEB/services/auth.spec.ts` | 10 | 4 | login de recuperação, `DELETE /me/conta`, cancelar com token de recuperação, 401 sem renovar |
| `WEB/views/auth/LoginView.spec.ts` | 12 | 1 | login de conta em exclusão abre a recuperação |
| `WEB/views/auth/CadastroView.spec.ts` | 11 | 1 (parcial) | RNF-SEC-42: só confere "Versão 1.1" da política |
| `MOB/features/conta/exclusao_test.dart` | 25 | 25 (1 é interação F-MOD-OPC) | prazo, AuthService, SessionController, telas Excluir/Recuperar/Exclusão solicitada, timeout |
| `MOB/app/router_test.dart` | 31 | 4 | 202 limpa sessão e `TokenStore`; guarda da recuperação; cancelar; sem acesso vai ao login |
| `MOB/features/auth/login_page_test.dart` | 11 | 1 | login de recuperação sem sessão |
| **Total** | | **27 arquivos, 105 testes** (96 diretos + 9 indiretos/parciais) | |

### 1.2 Casos previstos

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-CNT-01 | RF-AUT-07, RN-23.1, RN-23.2, RN-23.3, RNF-SEC-36 | Pedir a exclusão com senha e confirmação | 202 com prazo de exatamente 30 dias; conta fora de `v_perfil_referencia_v1`; refresh antigo dá 401; recibo `pendente`; log sem a senha | integração | `ID/integracao/ExclusaoDeContaIntegracaoTest.java` › "pedir responde 202 com 30 dias, oculta a conta e revoga as renovações" |
| CT-CNT-02 | RN-23.1 | Senha errada cinco vezes e uma sexta tentativa | 422 com a mensagem da tela, nada muda; a sexta é 429 | integração | `ID/integracao/ExclusaoDeContaIntegracaoTest.java` › "senha errada é 422 sem mudar nada; a sexta tentativa depois de 5 erros é 429" |
| CT-CNT-03 | RN-23.1 | Pedido com `confirmacao: false` | 400 e conta continua visível | integração | `ID/integracao/ExclusaoDeContaIntegracaoTest.java` › "sem confirmação explícita é 400" |
| CT-CNT-04 | RN-23.1, RNF-ERR-04 | Repetir o pedido com a mesma `Idempotency-Key` | Mesma resposta 202 e um só recibo | integração | `ID/integracao/ExclusaoDeContaIntegracaoTest.java` › "repetir a chave devolve a mesma janela, sem abrir outra" |
| CT-CNT-05 | RN-23.1, §8 (admin) | Administrador pede a exclusão | 403 e o login continua normal | integração | `ID/auth/service/AdminIntegracaoTest.java` › "admin não pede exclusão da conta (F-CONTA-2): 403, e o login continua normal" |
| CT-CNT-06 | RN-23.3 | Login de conta com exclusão pendente | Acesso `recuperacao_exclusao` sem refresh; com ele `GET /me` é 401; o token normal não cancela (401) | integração | `ID/integracao/ExclusaoDeContaIntegracaoTest.java` › "login de conta pendente dá acesso de recuperação, sem refresh e só para cancelar" |
| CT-CNT-07 | RN-23.4 | Cancelar dentro do prazo | 204; conta volta à VIEW; login volta a dar `sessao`; recibo `cancelada`; cancelar de novo é 204 | integração | `ID/integracao/ExclusaoDeContaIntegracaoTest.java` › "cancelar no prazo restaura a conta e o login volta a dar sessão normal" |
| CT-CNT-08 | RN-23.4 | Cancelar com o prazo vencido, antes do job | 410 `RECURSO_EXPIRADO` e a conta segue oculta | integração | `ID/integracao/ExclusaoDeContaIntegracaoTest.java` › "cancelar com o prazo vencido e a conta ainda não finalizada é 410" |
| CT-CNT-09 | RN-23.6 | Cadastro com o username de uma conta pendente | 409 | integração | `ID/integracao/ExclusaoDeContaIntegracaoTest.java` › "username e e-mail continuam reservados durante a janela" |
| CT-CNT-10 | RN-23.5, autorização | Job chamado sem `X-Scheduler-Token` ou com token errado | 401 nos dois | integração | `ID/integracao/ExclusaoDeContaIntegracaoTest.java` › "o job exige o token do agendador" |
| CT-CNT-11 | RN-23.5, RN-23.6, RN-23.7 | Job com uma conta vencida e outra no prazo | Só a vencida sai (com o grafo social por CASCADE); recibo concluído sem referência; idempotência apagada; `conta.excluida` na outbox; login vira 401; segunda execução finaliza 0 | integração | `ID/integracao/ExclusaoDeContaIntegracaoTest.java` › "o job finaliza só as vencidas, anonimiza o recibo e grava conta.excluida" |
| CT-CNT-12 | RN-23.7 | Execução do job depois de `conta.excluida` publicado | Envelope com `chave_negocio` e `payload` nulos e `anonimizado_em` preenchido | integração | `ID/integracao/ExclusaoDeContaIntegracaoTest.java` › "depois de publicado, o envelope de conta.excluida é anonimizado na execução seguinte" |
| CT-CNT-13 | RN-23.2, RN-08 | Outro leitor abre o perfil ou busca uma conta pendente | 404 no perfil e nada na busca | integração | `ID/integracao/PerfilDeOutroIntegracaoTest.java` › "conta suspensa ou em exclusão é 404 no perfil e não aparece na busca" |
| CT-CNT-14 | RN-23.2 | Seguimento com um dos lados em exclusão | Some de `v_seguimento_aceito_v1`, mas a relação continua gravada | integração | `ID/integracao/ContratosDePerfilIntegracaoTest.java` › "seguimento some quando qualquer um dos lados fica suspenso ou pede exclusão" |
| CT-CNT-15 | RN-23.2, RN-08 | Seguidor abre a estante de conta fora da VIEW de perfil | 404, mesmo seguindo | integração | `LE/test/integracao/estante.int-spec.ts` › estante (integração) › GET /perfis/{usuarioId}/estante (RN-08) › "conta suspensa ou em exclusão (fora da VIEW) é 404, mesmo para seguidor" |
| CT-CNT-16 | RNF-SEC-32, RN-23.7 | Envelope de `conta.excluida` com dado pessoal além do `usuarioId` | Recusado pelo schema | unitário | `ID/messaging/ContaExcluidaSchemaTest.java` › "conta.excluida com dado pessoal a mais é recusado" |
| CT-CNT-17 | RN-23.7 | Tabela nova no schema sem destino na exclusão (leitura, acervo, social, identidade) | O teste da guarda reprova; cada cascata declarada existe com `ON DELETE CASCADE` | integração | `LE/test/integracao/guarda-exclusao.int-spec.ts` › guarda da exclusão de conta (integração) › "toda tabela do schema tem destino na exclusão, e só um"; `AC/test/integracao/guarda-exclusao.int-spec.ts` › guarda da exclusão de conta (integração) › "toda tabela do schema tem destino na exclusão, e só um"; `SO/conta/service/GuardaDeExclusaoIntegracaoTest.java` › "toda tabela do schema tem destino na exclusão, e só um"; `ID/integracao/GuardaDeExclusaoIntegracaoTest.java` › "toda tabela do schema tem destino na exclusão, e só um" |
| CT-CNT-18 | RN-23.5, RN-23.7 | `leitura` consome `conta.excluida` com massa de duas contas | Apaga o que é da conta e as reações de outros às resenhas dela; anonimiza recibos e outbox publicada; a outra conta fica intacta | mensageria | `LE/test/integracao/consumo-conta-excluida.int-spec.ts` › consumo de conta.excluida (integração) › "remove o que é da conta, e as reações de outros às resenhas dela" |
| CT-CNT-19 | RNF-ERR-06 | `leitura` recebe o mesmo `eventId` duas vezes | Um recibo só e dois ACK | mensageria | `LE/test/integracao/consumo-conta-excluida.int-spec.ts` › consumo de conta.excluida (integração) › "reentrega do mesmo eventId não repete efeito" |
| CT-CNT-20 | RNF-ERR-07, RNF-SEC-32 | `leitura` recebe `data` com campo a mais (e-mail) | NACK para a DLQ e nada apagado | mensageria | `LE/test/integracao/consumo-conta-excluida.int-spec.ts` › consumo de conta.excluida (integração) › "data fora do schema vai para a DLQ sem apagar nada" |
| CT-CNT-21 | RN-23.5, RN-23.7, RN-14.7 | `acervo` consome `conta.excluida` | Apaga livros pessoais (capa no Cloudinary), projeção de nota com recálculo do agregado e importações; anonimiza recibos e outbox; livro oficial e livro de outra conta ficam | mensageria | `AC/test/integracao/consumo-conta-excluida.int-spec.ts` › consumo de conta.excluida (integração) › "remove o que é da conta e preserva o de outra pessoa" |
| CT-CNT-22 | RN-23.7 | Livro oficial cuja única nota era da conta excluída | Fica sem agregado | mensageria | `AC/test/integracao/consumo-conta-excluida.int-spec.ts` › consumo de conta.excluida (integração) › "livro sem nenhuma nota restante fica sem agregado" |
| CT-CNT-23 | RNF-ERR-06 | `acervo` recebe o mesmo `eventId` duas vezes | Capa apagada uma vez só e dois ACK | mensageria | `AC/test/integracao/consumo-conta-excluida.int-spec.ts` › consumo de conta.excluida (integração) › "reentrega do mesmo eventId não repete efeito" |
| CT-CNT-24 | RNF-ERR-07, RNF-SEC-32 | `acervo` recebe `data` fora do schema | NACK para a DLQ e nada apagado | mensageria | `AC/test/integracao/consumo-conta-excluida.int-spec.ts` › consumo de conta.excluida (integração) › "data fora do schema vai para a DLQ sem apagar nada" |
| CT-CNT-25 | RN-23.5, RN-23.7 | `social` trata `conta.excluida` com massa de duas contas | Remove atividades, comentários, curtidas, listas, recomendações, notificações e o que pende do conteúdo dela; o da outra fica | mensageria | `SO/conta/service/ConsumidorDeContaExcluidaIntegracaoTest.java` › "remove o que é da conta e o que pende do conteúdo dela; o da outra fica" |
| CT-CNT-26 | RN-23.7 | `social`: recibos, outbox e log de moderação que citam a conta | Anonimizados; eventos pendentes apagados | mensageria | `SO/conta/service/ConsumidorDeContaExcluidaIntegracaoTest.java` › "recibos e eventos que citam a conta são anonimizados; pendentes saem" |
| CT-CNT-27 | RNF-ERR-06 | `social` recebe o evento duas vezes | Não falha e não apaga dado de outra conta | mensageria | `SO/conta/service/ConsumidorDeContaExcluidaIntegracaoTest.java` › "entregar de novo não falha nem apaga o que não é da conta" |
| CT-CNT-28 | RN-23.1, RN-23.3 | Web: confirmar a exclusão | Sessão local apagada e ida para `Exclusão solicitada` com a data do servidor | web | `WEB/views/conta/ExcluirContaView.spec.ts` › ExcluirContaView › "confirmado, limpa a sessão local e vai para Exclusão solicitada com a data do servidor" |
| CT-CNT-29 | RN-23.1 | Web: senha errada | Banner, campo limpo e caixa marcada | web | `WEB/views/conta/ExcluirContaView.spec.ts` › ExcluirContaView › "senha errada mostra o banner, limpa o campo e mantém a caixa marcada" |
| CT-CNT-30 | RN-23.3 | Web: login de conta em exclusão | Não inicia sessão, guarda o acesso de recuperação e abre `/conta/recuperar` | web | `WEB/views/auth/LoginView.spec.ts` › LoginView › "conta em exclusão não inicia sessão: guarda o acesso de recuperação e abre a recuperação" |
| CT-CNT-31 | RN-23.4 | Web: cancelar a exclusão; acesso vencido | `Conta recuperada` e acesso descartado; 401 vira alerta com `Entrar de novo` | web | `WEB/views/conta/RecuperarContaView.spec.ts` › RecuperarContaView › "cancelar com sucesso descarta o acesso e mostra Conta recuperada" |
| CT-CNT-32 | RNF-TST-06 | Web: timeout ao cancelar | Exclusão continua agendada e o acesso é mantido, sem tratar como vencido | web | `WEB/views/conta/RecuperarContaView.spec.ts` › RecuperarContaView › "timeout mantém a exclusão agendada e o acesso, sem tratar como acesso vencido" |
| CT-CNT-33 | RN-23.3 | Mobile: 202 do pedido | Sessão e `TokenStore` limpos antes da tela final; voltar leva ao login | mobile | `MOB/app/router_test.dart` › F-CONTA-2 › "excluir conta: o 202 apaga a sessão e o armazenamento antes da tela final" |
| CT-CNT-34 | RN-23.3 | Mobile: acesso de recuperação | Fica só em memória e não conta como sessão | mobile | `MOB/features/conta/exclusao_test.dart` › SessionController › "o acesso de recuperação fica só em memória e não conta como sessão" |
| CT-CNT-35 | RN-23.4 | Mobile: cancelar a exclusão | Usa o token de recuperação e descarta o acesso | mobile | `MOB/features/conta/exclusao_test.dart` › RecuperarContaPage › "cancelar usa o token de recuperação e descarta o acesso" |
| CT-CNT-36 | RNF-TST-06 | Mobile: timeout no pedido | Erro de envio, com a senha preservada | mobile | `MOB/features/conta/exclusao_test.dart` › ExcluirContaPage › "timeout vira o erro de envio, com a senha preservada" |

São 36 casos, acima da faixa típica, porque a feature atravessa quatro serviços e dois clientes. Se for preciso enxugar, CT-CNT-14, 22, 29 e 32 são os que menos acrescentam.

### 1.3 Sem teste aparente (candidatos a lacuna)

| Item | O que procurei e onde | Situação |
|---|---|---|
| RN-23.1: `DELETE /me/conta` sem `Authorization` (401) e sem `Idempotency-Key` (400) | `/me/conta` em `code/back/identidade/src/test` (só `ExclusaoDeContaIntegracaoTest`, `AdminIntegracaoTest` e `SuspensaoDeContaIntegracaoTest` usam a rota, sempre com token e chave) | sem teste |
| RN-23.6: e-mail reservado durante a janela | `ExclusaoDeContaIntegracaoTest` › "username e e-mail continuam reservados durante a janela" | o teste só repete o username com e-mail novo; o e-mail reservado não é testado |
| RN-23.6: depois da exclusão definitiva, username e e-mail ficam livres | `ExclusaoDeContaIntegracaoTest` (só confere login 401 depois do job) | sem teste |
| RN-23.3: validade de 15 minutos do token de recuperação no servidor | `ID/**` (nenhum teste com token de recuperação vencido; os clientes testam a reação ao 401) | sem teste no backend |
| RN-23.7: avatar apagado no Cloudinary pelo `identidade` (`conta/service/RemocaoDeAsset.java`) | `RemocaoDeAsset` e `destroy` em `code/back/identidade/src/test` | sem teste (no `acervo`, a remoção da capa é verificada por mock em CT-CNT-21) |
| RNF-SEC-35: auditoria do cancelamento e do job | `CapturedOutput` só em "pedir responde 202…" | só o log do pedido é conferido |
| RNF-TST-03 no `social`: recibo de idempotência e DLQ de `conta.excluida` | `SO/conta/service/ConsumidorDeContaExcluidaIntegracaoTest.java` chama `consumidor.handle()` direto; `SO/messaging/MessageValidatorTest.java` não cita `conta.excluida` | sem teste de recibo nem de DLQ para este evento (a própria feature reconhece em 25/10) |
| RNF-TST-03: publicação real de `conta.excluida` (outbox → broker) | `ExclusaoDeContaIntegracaoTest` simula a publicação com `UPDATE outbox_identidade`; o dispatcher fica desligado | sem teste de publicação do evento |
| RNF-SEC-42: texto da política sobre retenção e exclusão | `WEB/views/auth/CadastroView.spec.ts` confere só "Versão 1.1"; nenhum teste mobile cita a versão 1.1 nem os 30 dias da política | parcial na web, ausente no mobile |
| Web: tela `ExclusaoSolicitadaView.vue`, linha `Excluir conta` em `ConfiguracoesView` e `guardaDeSessao` com estado de recuperação | `WEB/views/conta/` (sem spec para `ExclusaoSolicitadaView`), `WEB/views/auth/ConfiguracoesView.spec.ts` (5 testes, nenhum com "Excluir conta"), `WEB/router/index.spec.ts` (8 testes, nenhum de recuperação) | sem teste (no mobile, as três coisas têm teste) |
| Critério "fluxo em DES ponta a ponta" | — | manual, ainda não executado (DoD aberto) |

### 1.4 Divergências e estranhezas

- **Tabela × arquivo de feature:** bate (dono `identidade`, consumidores em `leitura`, `social` e `acervo`, web e mobile, RF-AUT-07). O arquivo de feature acrescenta os RNF que atende: RNF-SEC-35/36/40/41/42/44, RNF-USA-04, RNF-ERR-06/07/10.
- **Nota desatualizada no arquivo de feature (25/10/2026):** ele diz que "o mobile não testa a limpeza da sessão e do secure storage no `202`". O teste existe desde 08/10/2026 (commit `0d9cd54`): `MOB/app/router_test.dart` › F-CONTA-2 › "excluir conta: o 202 apaga a sessão e o armazenamento antes da tela final" confere `tokenStore.value` nulo. O item do DoD sobre web/mobile pode ser revisto.
- **Teste que não prova tudo o que o nome diz:** "username e e-mail continuam reservados durante a janela" só testa o username.
- **Asserção fraca:** "o job finaliza só as vencidas…" aceita `finalizadas >= 1`, porque outro teste da classe pode deixar conta vencida no mesmo banco.
- **DLQ em memória:** no `leitura` e no `acervo`, os casos de DLQ usam `BrokerEmMemoria` e conferem o NACK. O encaminhamento à fila `.dlq` pela topologia não é exercitado.
- **Ocultação por VIEW simulada:** os testes de `leitura` e `acervo` que citam "suspensa ou em exclusão" (CT-CNT-15 e os indiretos) removem a linha de uma VIEW de teste, sem passar pela coluna `exclusao_solicitada_em`. O comentário em `LE/test/integracao/perfis.int-spec.ts` (linha 12) explica isso.
- **Comentário desatualizado:** o Javadoc de `SO/conta/service/ConsumidorDeContaExcluidaIntegracaoTest.java` diz que o schema de `conta.excluida` está em `MessageValidatorTest`. Ele está em `SO/messaging/ContaExcluidaSchemaTest.java`.
- **Mistura com outras features:** `AC/.../consumo-conta-excluida.int-spec.ts` › "os assuntos dos livros pessoais da conta vão junto" toca dados da F-ACV-OPC (RF-ACV-22), mas o comportamento é da F-CONTA-2 e foi contado aqui. Cinco testes são interação com a F-MOD-OPC: `SO/…/ConsumidorDeContaExcluidaIntegracaoTest.java` › "F-MOD-OPC: suspensão e reativação da conta excluída são anonimizadas, com o motivo", `MOB/features/conta/exclusao_test.dart` › ExcluirContaPage › "F-MOD-OPC: conta suspensa encerra a sessão pela suspensão, sem o erro de envio" e os 3 de `ID/integracao/SuspensaoDeContaIntegracaoTest.java` ("alvo inexistente ou com exclusão pendente é 404", "suspensão prevalece sobre a exclusão pendente no login: 403, sem acesso de recuperação", "pedido de exclusão com o token de acesso de conta suspensa é 403").
- **Pulados sem banco:** todas as classes Java de integração usam `@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE")`. Sem a variável, elas não rodam e não acusam falha. Não há `@Disabled`, `it.skip` nem `skip` nos arquivos da feature.

---

## 2. F-ACV-DESCOBERTA — Filtros e páginas de autor/editora/série (CT-DES)

Dono: **Vicenzo Fonseca**. RF-ACV-03, 10, 11, 12, 21; RN-03, RN-12, RN-21; RNF-SEC-06, RNF-DES-01/02/03. Serviço `acervo`, web e mobile.

### 2.1 Arquivos de teste

| Arquivo | Testes no arquivo | Da feature | Cobre |
|---|---|---|---|
| `AC/test/integracao/catalogo.int-spec.ts` | 12 | 12 | RF-ACV-10/11/12, RNF-SEC-06, RNF-DES-02, 401/404/400 |
| `AC/src/livros/catalogo/catalogo.service.spec.ts` | 8 | 8 | RF-ACV-10/11/12, biografia em texto puro, 404 |
| `AC/test/integracao/busca.int-spec.ts` | 28 | 6 | RF-ACV-03 (bloco "filtros avançados (RF-ACV-03)"), RN-03; a validação "%j → 400 no campo %s" ganhou casos de filtro, mas é o teste do CT-BUS-04 |
| `AC/src/livros/busca/busca.service.spec.ts` | 15 | 6 | RF-ACV-03: só filtros basta, sem critério é 400, faixa invertida é 400 |
| `AC/src/livros/busca/dto/busca.dto.spec.ts` | 9 | 3 | RF-ACV-03: validação e mensagens dos filtros |
| `AC/test/integracao/livro-oficial.int-spec.ts` | 17 | 2 | RF-ACV-21, `editoraId` e `serie` na ficha |
| `AC/test/integracao/consumo-importacao.int-spec.ts` | 15 | 3 | RF-ACV-10: biografia na importação por ISBN |
| `AC/src/livros/importacao/dominio/openlibrary.fonte.spec.ts` | 12 | 2 | RF-ACV-10: `bio` da OpenLibrary |
| `ING/test_biografia.py` | 9 | 9 | RF-ACV-10: extração e limpeza da biografia do dump |
| `ING/test_carga_banco.py` | 17 | 1 | RF-ACV-10: subcomando `biografias` idempotente |
| `WEB/views/catalogo/PaginaDeCatalogoView.spec.ts` | 10 | 10 | páginas de autor/editora/série, paginação, erro, 404, cold start |
| `WEB/views/DescobrirView.spec.ts` | 27 | 9 | filtros avançados |
| `WEB/livros/filtrosDaBusca.spec.ts` | 7 | 7 | chips, URL, validação da faixa |
| `WEB/livros/useBuscaDeLivros.spec.ts` | 22 | 5 | filtros na busca e na paginação |
| `WEB/services/acervo.spec.ts` | 19 | 3 | filtros na URL, rotas de catálogo, 404 |
| `WEB/views/livros/LivroOficialView.spec.ts` | 31 | 3 | links da ficha e assuntos (RF-ACV-21) |
| `MOB/features/catalogo/pagina_de_catalogo_page_test.dart` | 9 | 9 | páginas de autor/editora/série |
| `MOB/features/descobrir/descobrir_page_test.dart` | 22 | 8 | folha de filtros, assunto vindo da ficha |
| `MOB/features/descobrir/busca_de_livros_controller_test.dart` | 16 | 4 | filtros no controller |
| `MOB/features/descobrir/busca_service_test.dart` | 13 | 4 | filtros e páginas no serviço |
| `MOB/features/descobrir/filtros_da_busca_test.dart` | 5 | 5 | chips e validação da faixa |
| `MOB/features/descobrir/faixa_e_folha_test.dart` | 2 | 2 | regressões da conferência no emulador |
| `MOB/features/livros/livro_oficial_page_test.dart` | 40 | 5 | grupo "links da ficha e assuntos (F-ACV-DESCOBERTA)" |
| `MOB/app/router_test.dart` | 31 | 1 | ficha → autor e assunto → busca filtrada |
| **Total** | | **24 arquivos, 127 testes** | |

### 2.2 Casos previstos

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-DES-01 | RF-ACV-03 | Filtrar por trecho do autor | Casa sem acento, palavra por palavra, no mesmo autor | integração | `AC/test/integracao/busca.int-spec.ts` › busca de livros oficiais (integração) › filtros avançados (RF-ACV-03) › "filtra por trecho do autor, sem acento, palavra por palavra no mesmo autor" |
| CT-DES-02 | RF-ACV-03, RN-12 | Filtrar por editora, inclusive pelo sinônimo ("cia das letras") | Acha a editora curada | integração | `AC/test/integracao/busca.int-spec.ts` › busca de livros oficiais (integração) › filtros avançados (RF-ACV-03) › "filtra pela editora e pelos sinônimos da curadoria" |
| CT-DES-03 | RF-ACV-03 | Filtrar por série | Só livros da série | integração | `AC/test/integracao/busca.int-spec.ts` › busca de livros oficiais (integração) › filtros avançados (RF-ACV-03) › "filtra pela série" |
| CT-DES-04 | RF-ACV-03 | Filtrar por ano exato e por faixa de páginas, com um lado só | Restringe corretamente nos três casos | integração | `AC/test/integracao/busca.int-spec.ts` › busca de livros oficiais (integração) › filtros avançados (RF-ACV-03) › "filtra por ano exato e por faixa de páginas, com cada lado sozinho" |
| CT-DES-05 | RF-ACV-03, RF-ACV-02 | Combinar filtros entre si, com o texto e com o assunto | Interseção (AND) dos critérios | integração | `AC/test/integracao/busca.int-spec.ts` › busca de livros oficiais (integração) › filtros avançados (RF-ACV-03) › "combina os filtros entre si, com o q e com o assunto" |
| CT-DES-06 | RNF-SEC-06, RN-03 | Busca só com filtros que casariam um livro pessoal | O livro pessoal nunca aparece | integração | `AC/test/integracao/busca.int-spec.ts` › busca de livros oficiais (integração) › filtros avançados (RF-ACV-03) › "nunca traz livro pessoal, mesmo só com filtros" |
| CT-DES-07 | RF-ACV-03 | Busca sem texto, assunto nem filtro | 400 no campo `q` com "Informe um texto de busca, um assunto ou um filtro." | unitário | `AC/src/livros/busca/busca.service.spec.ts` › BuscaService › "recusa busca sem nenhum critério, no campo q" |
| CT-DES-08 | RF-ACV-03 | `paginasMin` maior que `paginasMax` | 400 no campo `paginasMax` | unitário | `AC/src/livros/busca/busca.service.spec.ts` › BuscaService › "recusa paginasMin maior que paginasMax, no campo paginasMax" |
| CT-DES-09 | RF-ACV-03 | Filtro vazio, longo demais, ano 0 ou 10000, páginas 0 ou não numéricas | Recusado no campo certo | unitário | `AC/src/livros/busca/dto/busca.dto.spec.ts` › BuscaLivrosQueryDto › "recusa o filtro %j" |
| CT-DES-10 | RF-ACV-10 | Página de autor com biografia | 200 com `id`, `nome`, `biografia` e livros | integração | `AC/test/integracao/catalogo.int-spec.ts` › páginas de autor, editora e série (integração) › autor › "devolve a forma exata, com biografia e livros" |
| CT-DES-11 | RF-ACV-10 | Autor sem biografia na fonte | `biografia: null` e a lista continua utilizável | integração | `AC/test/integracao/catalogo.int-spec.ts` › páginas de autor, editora e série (integração) › autor › "sem biografia na fonte, devolve null" |
| CT-DES-12 | RF-ACV-10, RNF-DES-02 | Paginar os livros do autor | Nenhum livro repetido nem perdido entre as páginas | integração | `AC/test/integracao/catalogo.int-spec.ts` › páginas de autor, editora e série (integração) › autor › "pagina sem repetir nem perder livro entre as páginas" |
| CT-DES-13 | RF-ACV-11 | Página de editora | Só os livros da editora, pela ordem do ano do grupo | integração | `AC/test/integracao/catalogo.int-spec.ts` › páginas de autor, editora e série (integração) › editora › "lista só os livros da editora, pela ordem do ano do grupo" |
| CT-DES-14 | RF-ACV-12, RN-12 | Página de série com volumes numerados e sem número | Pelo número de ordem; sem número no fim, por título; autores listados | integração | `AC/test/integracao/catalogo.int-spec.ts` › páginas de autor, editora e série (integração) › série › "ordena pelo número, com os sem número no fim por título, e lista os autores" |
| CT-DES-15 | RNF-SEC-06, RN-03 | Livro pessoal com o mesmo autor, editora e série | Nunca aparece nas três páginas | integração | `AC/test/integracao/catalogo.int-spec.ts` › páginas de autor, editora e série (integração) › "livro pessoal nunca aparece nas páginas" |
| CT-DES-16 | RF-ACV-10/11/12 | Id inexistente e id malformado nas três rotas | 404 `RECURSO_NAO_ENCONTRADO` e 400 no campo `id` | integração | `AC/test/integracao/catalogo.int-spec.ts` › páginas de autor, editora e série (integração) › "/%s/{id} responde 404 para id inexistente e 400 para id malformado" |
| CT-DES-17 | RNF-DES-02 | `limit=51` na página de catálogo | 400 | integração | `AC/test/integracao/catalogo.int-spec.ts` › páginas de autor, editora e série (integração) › "recusa limit acima do teto" |
| CT-DES-18 | Autorização | Página de autor sem token | 401 | integração | `AC/test/integracao/catalogo.int-spec.ts` › páginas de autor, editora e série (integração) › "exige autenticação" |
| CT-DES-19 | RF-ACV-21, RN-21 | Usar o id de cada assunto da página do livro como filtro | `GET /livros?assunto=<id>` traz o livro | integração | `AC/test/integracao/livro-oficial.int-spec.ts` › página do livro oficial (integração) › GET /livros/{id} › "cada assunto da página filtra a busca pelo próprio id (RF-ACV-21)" |
| CT-DES-20 | RF-ACV-11, RF-ACV-12 | Página do livro com editora e série numerada | `editoraId` e `serie { id, nome, numero }` para os links | integração | `AC/test/integracao/livro-oficial.int-spec.ts` › página do livro oficial (integração) › GET /livros/{id} › "a ficha traz editora e série com número, para os links (F-ACV-DESCOBERTA)" |
| CT-DES-21 | RF-ACV-10, RNF-SEC-33 | Importação por ISBN de autor que já existe | Completa a biografia vazia e nunca sobrescreve a existente | integração | `AC/test/integracao/consumo-importacao.int-spec.ts` › consumo de livro.importacao_solicitada (integração) › biografia do autor (F-ACV-DESCOBERTA) › "autor que já existia sem biografia a recebe; a existente nunca é sobrescrita" |
| CT-DES-22 | RF-ACV-10 | Subcomando `biografias` rodado duas vezes | Preenche só quem não tem; a segunda rodada não muda nada | script (banco) | `ING/test_carga_banco.py` › `test_biografias_preenche_so_quem_nao_tem_e_reexecutar_nao_muda_nada` |
| CT-DES-23 | RF-ACV-03 | Web: abrir o Descobrir com filtros na URL e remover um chip | Os filtros viram chips; remover um tira só aquele | web | `WEB/views/DescobrirView.spec.ts` › DescobrirView › filtros avançados (F-ACV-DESCOBERTA) › "abre com os filtros da URL, e remover um chip tira só aquele filtro" |
| CT-DES-24 | RF-ACV-10 | Web: autor sem biografia | A seção não existe, nem o título | web | `WEB/views/catalogo/PaginaDeCatalogoView.spec.ts` › PaginaDeCatalogoView › "autor sem biografia: a seção não existe, nem o título" |
| CT-DES-25 | RF-ACV-12 | Web: página de série | "Livro N" pela ordem e os sem número no fim | web | `WEB/views/catalogo/PaginaDeCatalogoView.spec.ts` › PaginaDeCatalogoView › "série: autoria com link, "Livro N" pela ordem e os sem número no fim" |
| CT-DES-26 | RF-ACV-21 | Web: tocar num assunto da página do livro | Leva ao Descobrir filtrado; sem assuntos, a seção some | web | `WEB/views/livros/LivroOficialView.spec.ts` › LivroOficialView › "assuntos levam ao Descobrir filtrado; sem assuntos, a seção some" |
| CT-DES-27 | RNF-TST-06, RNF-ERR-09 | Web: página de catálogo com cold start | Aviso de carregamento, sem erro | web | `WEB/views/catalogo/PaginaDeCatalogoView.spec.ts` › PaginaDeCatalogoView › "carregando com cold start avisa, sem erro" |
| CT-DES-28 | RF-ACV-03 | Mobile: faixa de páginas invertida na folha | Não envia e a folha continua aberta | mobile | `MOB/features/descobrir/descobrir_page_test.dart` › filtros avançados (F-ACV-DESCOBERTA) › "faixa invertida não envia e mantém a folha aberta" |
| CT-DES-29 | RF-ACV-10 | Mobile: página de autor | Tipo no header, nome, contagem, biografia com a fonte e livros | mobile | `MOB/features/catalogo/pagina_de_catalogo_page_test.dart` › "autor: tipo no header, nome, contagem, biografia com a fonte e os livros" |
| CT-DES-30 | RF-ACV-10, RF-ACV-21 | Mobile: da ficha do livro, abrir o autor e tocar num assunto | Autor abre na aba Descobrir; o assunto filtra a busca | mobile | `MOB/app/router_test.dart` › "da ficha do livro: o autor abre na aba Descobrir e o assunto filtra a busca" |

### 2.3 Sem teste aparente (candidatos a lacuna)

| Item | O que procurei e onde | Situação |
|---|---|---|
| RNF-DES-01: leitura ≤1s p95 em DES | — | sem teste automatizado; há só a medição manual com `EXPLAIN ANALYZE` em dev (Timeline de 02/10/2026); o critério em DES segue aberto |
| RNF-DES-03: índice trigram do nome da série (migration `0005`) | `AC/test/integracao/*.int-spec.ts` (nenhum confere índice) | sem teste; o CHECK `autor_biografia_ck` da mesma migration é coberto de forma indireta por "biografia só de marcação vira null, sem violar o CHECK" |
| "As páginas não têm ações de perfil" (critério de aceite) | `PaginaDeCatalogoView.spec.ts` e `pagina_de_catalogo_page_test.dart` | nenhum teste afirma a ausência de ações |
| Critério "biografia em DES" | — | depende de dados e do deploy; não é teste |
| Mobile: página de catálogo aberta da aba Perfil (`$raiz/autor/$id`, divergência registrada) | `MOB/app/router_test.dart` | só o caminho pela aba Descobrir é testado |

Cada RF de servidor (03, 10, 11, 12, 21) tem caso no backend.

### 2.4 Divergências e estranhezas

- **Tabela × arquivo de feature:** bate (serviço `acervo`, web e mobile, RF-ACV-03/10/11/12/21).
- **Teste do P1 ampliado:** `AC/test/integracao/busca.int-spec.ts` › busca de livros oficiais (integração) › validação › "%j → 400 no campo %s" (é o CT-BUS-04) ganhou casos de `autor`, `ano`, `paginasMin` e `paginasMax`. Não virou caso novo, para não repetir; CT-DES-09 usa o unitário do DTO. Se o plano quiser, o CT-BUS-04 pode citar também RF-ACV-03.
- **Teste reaproveitado do P1:** `AC/src/common/texto-puro.spec.ts` (10 testes) é da sinopse (commit `4796380`, 26/09/2026) e não foi contado. A biografia em texto puro é coberta por `catalogo.service.spec.ts` › CatalogoService › autor › "entrega a biografia como texto puro, sem marcação da fonte" e pelos testes de biografia da importação.
- **Pulados sem banco:** `ING/test_carga_banco.py` tem `pytestmark = pytest.mark.banco` e faz `pytest.skip` sem `DATABASE_URL_TESTE` (a Timeline registra "os 8 de banco ficam pulados sem a variável"). Os `*.int-spec.ts` do `acervo` também exigem o banco de teste.
- **Fora desta feature, no mesmo arquivo:** `AC/test/integracao/consumo-importacao.int-spec.ts` › "chave de autor unificada liga o livro ao canônico, sem recriar o duplicado nem levar a biografia" é da unificação de autores (F-ACV-INGESTAO) e não foi contado.

---

## 3. F-ACV-NOTA — Nota geral e cache de capas (CT-NOG)

Dono: **Renato Douglas**. RF-ACV-15, 16, 17, **e RF-ACV-04 (distribuição)**; RN-06, RN-12, RN-14; RNF-ARQ-06, RNF-ERR-06/07, RNF-SEC-20/32/33/39. Serviço `acervo` (+ ingestão), web e mobile.

### 3.1 Arquivos de teste

| Arquivo | Testes no arquivo | Da feature | Cobre |
|---|---|---|---|
| `AC/test/integracao/consumo-notas.int-spec.ts` | 5 | 5 | RF-ACV-16: projeção por `nota.alterada`, duplicada, fora de ordem, livro pessoal, DLQ |
| `AC/test/integracao/backfill-notas.int-spec.ts` | 4 | 4 | backfill da VIEW, idempotência, concorrência com o consumidor |
| `AC/test/integracao/consumo-capas.int-spec.ts` | 8 | 8 | RF-ACV-17, RN-14.2/3/4/5/7, DLQ, backfill de capas |
| `AC/test/integracao/livro-oficial.int-spec.ts` | 17 | 4 | RF-ACV-16, RF-ACV-04, RN-06.1/2/3 na página |
| `AC/test/integracao/consumo-importacao.int-spec.ts` | 15 | 2 | RF-ACV-15: nota na importação por ISBN |
| `AC/src/livros/notas/notas-da-pagina.spec.ts` | 5 | 5 | 11 faixas, ausência sem zero, arredondamento único |
| `AC/src/livros/capas/envio-de-capa.spec.ts` | 8 | 8 | upload assinado, recusa × indisponibilidade |
| `AC/src/livros/capas/validacao-de-imagem.spec.ts` | 3 | 3 | RNF-SEC-20 |
| `AC/src/livros/importacao/dominio/http-externo.spec.ts` | 29 | 12 | RNF-SEC-39 no `baixarImagem` |
| `AC/src/livros/importacao/dominio/openlibrary.fonte.spec.ts` | 12 | 4 | RF-ACV-15, RN-06.3, RNF-SEC-33 (`ratings.json`) |
| `AC/src/livros/importacao/dominio/google-books.fonte.spec.ts` | 2 | 2 | RF-ACV-15 pela fonte secundária |
| `ING/test_notas.py` | 4 | 4 | RF-ACV-15: leitura, validação e média do `ol_dump_ratings` |
| `ING/test_carga_banco.py` | 17 | 1 | RF-ACV-15: subcomando `notas`, réplica por obra, limpeza na recarga |
| `WEB/components/livros/NotasDoLivro.spec.ts` | 6 | 6 | RF-ACV-16, RN-06.1/2/3 |
| `WEB/components/livros/HistogramaDeNotas.spec.ts` | 6 | 6 | RF-ACV-04 (distribuição) |
| `WEB/livros/useLivroOficial.spec.ts` | 24 | 8 | recarga das notas depois da escrita |
| `WEB/views/livros/LivroOficialView.spec.ts` | 31 | 5 | grupo "notas (F-ACV-NOTA)" |
| `MOB/features/livros/notas_do_livro_test.dart` | 14 | 14 | RF-ACV-16, RF-ACV-04, acessibilidade, tema escuro |
| `MOB/features/livros/livro_oficial_controller_test.dart` | 7 | 7 | recarga das notas |
| `MOB/features/livros/livro_oficial_service_test.dart` | 8 | 4 | leitura dos campos de nota, ausência sem zero |
| `MOB/features/livros/livro_oficial_page_test.dart` | 40 | 5 | grupo "notas do livro (F-ACV-NOTA)" |
| **Total** | | **21 arquivos, 117 testes** | |

### 3.2 Casos previstos

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-NOG-01 | RF-ACV-16, RNF-ARQ-06 | `nota.alterada` de nota criada, atualizada e excluída | A projeção individual e o agregado convergem para a VIEW `v_nota_publicacao_v1` | mensageria | `AC/test/integracao/consumo-notas.int-spec.ts` › consumo de nota.alterada (integração) › "criada, atualizada e excluída convergem para a VIEW, com o agregado junto" |
| CT-NOG-02 | RNF-ERR-06 | Mesmo `eventId` entregue duas vezes | Sem efeito repetido | mensageria | `AC/test/integracao/consumo-notas.int-spec.ts` › consumo de nota.alterada (integração) › "entrega duplicada do mesmo eventId não repete efeito" |
| CT-NOG-03 | RF-ACV-16 | Evento velho chega depois do novo | O estado atual não é desfeito | mensageria | `AC/test/integracao/consumo-notas.int-spec.ts` › consumo de nota.alterada (integração) › "fora de ordem: o evento velho que chega por último não desfaz o estado atual" |
| CT-NOG-04 | RN-06.5, RN-03 | `nota.alterada` de livro pessoal ou inexistente | ACK sem efeito | mensageria | `AC/test/integracao/consumo-notas.int-spec.ts` › consumo de nota.alterada (integração) › "livro pessoal ou inexistente é confirmado sem efeito (RN-06.5)" |
| CT-NOG-05 | RNF-ERR-07, RNF-SEC-32 | `data` fora do schema | DLQ sem gravar nada | mensageria | `AC/test/integracao/consumo-notas.int-spec.ts` › consumo de nota.alterada (integração) › "data fora do schema vai para a DLQ sem gravar nada" |
| CT-NOG-06 | RF-ACV-16 | `backfill:notas` sobre projeção desatualizada | Insere o que falta, corrige o que mudou e apaga o que ficou velho | integração | `AC/test/integracao/backfill-notas.int-spec.ts` › backfill da nota dos leitores (integração) › "insere o que falta, corrige o que mudou e apaga o que ficou velho" |
| CT-NOG-07 | RF-ACV-16 | Backfill e consumidor ao mesmo tempo, em duas conexões | O backfill que espera a trava relê a VIEW e não deixa linha velha | integração | `AC/test/integracao/backfill-notas.int-spec.ts` › backfill da nota dos leitores (integração) › junto com o consumidor, em duas conexões › "o backfill que espera o consumidor relê a VIEW e não deixa linha velha" |
| CT-NOG-08 | RF-ACV-16, RN-06.1, RN-06.3 | Página de livro só com nota geral | Nota dos leitores nula e distribuição vazia | integração | `AC/test/integracao/livro-oficial.int-spec.ts` › página do livro oficial (integração) › nota geral e nota dos leitores (RF-ACV-16, RF-ACV-04) › "só a nota geral: sem nota dos leitores e sem distribuição (RN-06.1)" |
| CT-NOG-09 | RF-ACV-16, RN-06 | Livro com as duas notas | Indicadores separados, nunca combinados | integração | `AC/test/integracao/livro-oficial.int-spec.ts` › página do livro oficial (integração) › nota geral e nota dos leitores (RF-ACV-16, RF-ACV-04) › "as duas, separadas e nunca combinadas" |
| CT-NOG-10 | RF-ACV-04, RN-06.2 | Livro só com nota dos leitores | A contagem é a soma das 11 faixas | integração | `AC/test/integracao/livro-oficial.int-spec.ts` › página do livro oficial (integração) › nota geral e nota dos leitores (RF-ACV-16, RF-ACV-04) › "só a nota dos leitores: a contagem é a soma das 11 faixas" |
| CT-NOG-11 | RF-ACV-16 | Média de 53 notas com soma 225 | 4,2, arredondada uma vez só | integração | `AC/test/integracao/livro-oficial.int-spec.ts` › página do livro oficial (integração) › nota geral e nota dos leitores (RF-ACV-16, RF-ACV-04) › "arredonda uma vez só, sobre os valores individuais (53 notas, soma 225: 4,2)" |
| CT-NOG-12 | RF-ACV-15, RNF-SEC-33 | Dump de ratings com linhas inválidas e obras fora do acervo | Descarta e conta as inválidas e agrega só as obras do acervo | script | `ING/test_notas.py` › `test_valida_descarta_conta_e_agrega_so_as_obras_do_acervo` |
| CT-NOG-13 | RF-ACV-15, RN-06.6 | Subcomando `notas` em simulação, gravação, repetição e recarga sem a obra | Réplica por obra nas edições; segunda rodada não muda nada; obra que saiu do dump fica sem nota; `atualizado_em` intacto | script (banco) | `ING/test_carga_banco.py` › `test_notas_replica_por_obra_limpa_na_recarga_e_nao_toca_atualizado_em` |
| CT-NOG-14 | RF-ACV-15 | Importação por ISBN com nota na fonte | Grava a nota e a contagem | integração | `AC/test/integracao/consumo-importacao.int-spec.ts` › consumo de livro.importacao_solicitada (integração) › nota geral na inserção (F-ACV-NOTA) › "grava a nota e a contagem que a fonte trouxe" |
| CT-NOG-15 | RN-06.3, RN-12, RNF-SEC-33 | `ratings.json` com média nula, contagem zero, fora da faixa ou sem `summary` | Nota ausente, nunca zero | unitário | `AC/src/livros/importacao/dominio/openlibrary.fonte.spec.ts` › OpenLibraryFonte › nota geral pelo ratings.json (F-ACV-NOTA) › "%s deixa a nota ausente, nunca zero" |
| CT-NOG-16 | RF-ACV-17, RN-14.2, RN-14.4 | `livro.adicionado_a_estante` de livro oficial sem cópia | Capa enviada ao Cloudinary; `v_livro_referencia_v1` e a página passam a usar a cópia (`origem: propria`) | mensageria | `AC/test/integracao/consumo-capas.int-spec.ts` › cache de capas oficiais (integração) › "livro.adicionado_a_estante cacheia a capa, com o asset junto, e a página passa a usar a cópia" |
| CT-NOG-17 | RF-ACV-17 | `leitura.iniciada` de livro sem cópia | Também cacheia | mensageria | `AC/test/integracao/consumo-capas.int-spec.ts` › cache de capas oficiais (integração) › "leitura.iniciada de livro sem cópia também cacheia" |
| CT-NOG-18 | RN-14.3, RNF-ERR-06 | Segundo evento do mesmo livro | Não baixa nem envia de novo | mensageria | `AC/test/integracao/consumo-capas.int-spec.ts` › cache de capas oficiais (integração) › "o segundo evento do mesmo livro não baixa nem envia de novo (RN-14.3)" |
| CT-NOG-19 | RN-14.7 | Evento de livro pessoal ou inexistente | Ignorado | mensageria | `AC/test/integracao/consumo-capas.int-spec.ts` › cache de capas oficiais (integração) › "livro pessoal e livro inexistente são ignorados (RN-14.7)" |
| CT-NOG-20 | RN-14.5, RNF-SEC-20 | Origem 404, 403 ou imagem inválida | ACK sem cópia; o livro segue com a capa externa | mensageria | `AC/test/integracao/consumo-capas.int-spec.ts` › cache de capas oficiais (integração) › "%s: ACK sem cópia, e o livro segue com a capa externa" |
| CT-NOG-21 | RN-14.5, RNF-ERR-07, RNF-ERR-08 | Origem indisponível (502) | Retentativas do runtime, circuito aberto e DLQ, sem recibo | mensageria | `AC/test/integracao/consumo-capas.int-spec.ts` › cache de capas oficiais (integração) › "origem indisponível passa pelas retentativas do runtime e vai para a DLQ" |
| CT-NOG-22 | RF-ACV-17 | `backfill:capas` | Cacheia os oficiais distintos da estante sem cópia, um por vez | integração | `AC/test/integracao/consumo-capas.int-spec.ts` › cache de capas oficiais (integração) › "backfill: oficiais distintos da estante sem cópia, um por vez" |
| CT-NOG-23 | RNF-SEC-20 | Imagem baixada com tipo, tamanho ou dimensões fora do limite | Recusada | unitário | `AC/src/livros/capas/validacao-de-imagem.spec.ts` › validarImagem (RNF-SEC-20) › "recusa %s" |
| CT-NOG-24 | RNF-SEC-39 | Download da capa com redirecionamento para fora da allowlist | Recusado | unitário | `AC/src/livros/importacao/dominio/http-externo.spec.ts` › HttpExterno › baixarImagem (cache de capas, F-ACV-NOTA) › "recusa redirecionamento para fora da allowlist" |
| CT-NOG-25 | RF-ACV-16, RN-06.3 | Web: só nota geral | Bloco dos leitores em "Sem nota", sem estrela e sem zero | web | `WEB/components/livros/NotasDoLivro.spec.ts` › NotasDoLivro › "só nota geral: o bloco dos leitores fica em "Sem nota", sem estrela e sem zero" |
| CT-NOG-26 | RF-ACV-04 | Web: histograma | Onze linhas de 5 a 0, lidas como "5 estrelas, 12 leitores" | web | `WEB/components/livros/HistogramaDeNotas.spec.ts` › HistogramaDeNotas › "onze linhas de 5 a 0, lidas como "5 estrelas, 12 leitores"" |
| CT-NOG-27 | RF-ACV-16 | Web: salvar e remover a própria nota | Recarrega as notas em silêncio, sem mexer nas resenhas | web | `WEB/views/livros/LivroOficialView.spec.ts` › LivroOficialView › notas (F-ACV-NOTA) › "salvar e remover a própria nota recarregam as notas em silêncio, sem mexer nas resenhas" |
| CT-NOG-28 | RF-ACV-16, RN-06.3 | Mobile: nenhuma nota | Dois "Sem nota", sem estrela, sem 0,0 e sem histograma | mobile | `MOB/features/livros/notas_do_livro_test.dart` › "nenhuma nota: dois Sem nota, sem estrela, sem 0,0 e sem histograma" |
| CT-NOG-29 | RN-06.3 | Mobile: indicador fora do contrato na resposta | Descartado, nunca vira zero | mobile | `MOB/features/livros/livro_oficial_service_test.dart` › notas (F-ACV-NOTA) › "indicador fora do contrato é descartado, nunca vira zero" |
| CT-NOG-30 | RF-ACV-16, RF-ACV-04 | Mobile: as duas notas | As duas e o histograma, entre a barra de ação e "Sua avaliação" | mobile | `MOB/features/livros/livro_oficial_page_test.dart` › notas do livro (F-ACV-NOTA) › "as duas notas e o histograma, entre a barra de ação e "Sua avaliação"" |

Cada RF de servidor (15, 16, 17 e 04/distribuição) tem caso no backend. RF-ACV-15 também tem casos de script.

### 3.3 Sem teste aparente (candidatos a lacuna)

| Item | O que procurei e onde | Situação |
|---|---|---|
| RN-06.5 nos clientes: a página do **livro pessoal** não mostra nenhum dos dois indicadores | `Nota geral`, `notaGeral` e `NotasDoLivro` nos specs de livro pessoal da web e nos testes do mobile | sem teste nos clientes; no backend, o consumidor ignora o livro pessoal (CT-NOG-04) e `GET /livros/{id}` dá 404 para ele (CT-BUS-09) |
| RN-14.6: sem expiração por tempo | `consumo-capas.int-spec.ts` | não há código de expiração para testar; CT-NOG-18 mostra que a cópia não é refeita, não que ela é permanente |
| Fila de capas não registrada sem credencial do Cloudinary (pendência) | `consumo-capas.int-spec.ts`, `capa.consumer.ts` | sem teste do comportamento sem credencial |
| RNF-TST-03, lado da publicação: `nota.alterada` e `livro.adicionado_a_estante` são publicados pelo `leitura` | — | fora desta feature (F-AVA e F-EST); aqui o evento é publicado pelo próprio teste no broker em memória |
| RN-14.4 para os demais serviços: snapshots do `social` lendo `capa_resolvida` | `SO/**` | sem teste no `social`; a VIEW é conferida no `acervo` (CT-NOG-16) |
| RF-ACV-17 + DES, cobertura real e dimensionamento | — | registrado na Timeline e no "item próprio" do DoD (manual, 23/10 e 05/11/2026), sem teste |

### 3.4 Divergências e estranhezas

- **Tabela × arquivo de feature:** o serviço (`acervo`, web e mobile) bate. O arquivo de feature também traz para esta feature a **distribuição das notas do livro (RF-ACV-04)**, que não está na lista que recebi (RF-ACV-15, 16, 17). Os testes de histograma e de faixas foram contados aqui. RF-ACV-15 e 17 são "de sistema"; o subcomando `notas` da ingestão (`ING/`) é parte da feature.
- **Teste de P1 com a regra de resolução:** `AC/src/livros/capa.spec.ts` (resolverCapa, 3 testes) já existia na F-ACV-BUSCA (commit `e3cf8b1`, 26/09/2026) e não foi contado. A parte nova (cópia própria na VIEW e na página) está em CT-NOG-16.
- **Mudança em código de outra feature:** `http-externo.spec.ts` › HttpExterno › "recusa porta explícita já na URL inicial" veio com a F-ACV-NOTA (o arquivo de feature cita "porta na URL inicial"), mas está fora do bloco `baixarImagem` e não foi contado. O consumidor de `conta.excluida` do `acervo` ganhou a trava e o recálculo do agregado desta feature; o teste correspondente ("livro sem nenhuma nota restante fica sem agregado") foi contado na F-CONTA-2 (CT-CNT-22).
- **DLQ em memória:** como na F-CONTA-2, os casos de DLQ conferem o NACK no `BrokerEmMemoria`, não a chegada na fila `.dlq`.
- **Pulados sem banco:** `ING/test_carga_banco.py` faz `pytest.skip` sem `DATABASE_URL_TESTE`.
- **Não confundir com a F-ACV-OPC:** os testes de recarga do dump em `ING/test_carga_banco.py` (`test_recarga_*`, `test_livro_que_saiu_dos_filtros_continua_intacto`, `test_carga_inicial_sobre_base_existente_nao_atualiza_nada`) e `AC/test/integracao/assuntos-livro-pessoal.int-spec.ts` são da F-ACV-OPC (RF-ACV-14 e 22) e ficaram fora. O "limpa na recarga" de CT-NOG-13 é a nova execução do subcomando `notas`, não o comando de recarga do RF-ACV-14.

---

## Resumo

| Feature | Arquivos | Testes da feature | Casos previstos | Lacunas candidatas |
|---|---|---|---|---|
| F-CONTA-2 (CT-CNT) | 27 | 105 (96 diretos + 9 indiretos/parciais) | 36 | 11 |
| F-ACV-DESCOBERTA (CT-DES) | 24 | 127 | 30 | 5 |
| F-ACV-NOTA (CT-NOG) | 21 | 117 | 30 | 6 |
