# Inventário de testes — opcionais do Período 3 (F-MOD-OPC, F-ACV-OPC, F-STA-OPC, F-DSF-OPC)

Levantado em 14/11/2026, somente leitura, sobre o disco (igual à `origin/desenvolvimento`, `7d988ac`). F-DSF-OPC lida de `origin/vicenzo-features` (`90bdd24`) por `git show`.

Convenções:

- Prefixos de caminho como no plano §9.6 (`ID/`, `SO/`, `AC/`, `LE/`, `WEB/`, `MOB/`, `ING/`).
- Contagem: `@Test`/`@ParameterizedTest`, `it`/`test`/`it.each`, `test`/`testWidgets`, `def test_`. Parametrizado conta 1.
- "Da feature" = teste criado (ou renomeado) pela feature. Testes **pré-existentes** que exercitam o comportamento ganham `*` e não entram no total de novos.
- Nenhum `@Disabled`, `it.skip`, `xit` ou `skip:` nos arquivos listados. Os testes de integração do Spring e o `test_carga_banco.py` são pulados sem `DATABASE_URL_TESTE` (comportamento já descrito no plano §9.4).
- Casos que o plano já tem e **não** são repetidos aqui: CT-PER-14 (listas de seguidores escondem conta oculta) e CT-AVA-11 (conta fora da VIEW de perfil não escreve resenha).
- Cada nome citado foi conferido no código por script (busca literal do nome no arquivo; para F-DSF-OPC, no conteúdo de `git show origin/vicenzo-features:<caminho>`).

---

## 1. F-MOD-OPC — Suspensão de conta (CT-MDO)

**Dono:** Renato Douglas. **RFs:** RF-MOD-04 (com RF-MOD-05 de auditoria). **Serviços:** `social` (painel e auditoria) + `identidade` (efeito), web e mobile, como informado. Ver divergências (o efeito também alcança `leitura` e `acervo` pelas VIEWs).

### 1.1. Arquivos de teste

| # | Arquivo | Testes no arquivo | Da feature | Cobre |
|---|---|---|---|---|
| 1 | `ID/integracao/SuspensaoDeContaIntegracaoTest.java` | 19 | 19 | RF-MOD-04, SEC-01/04/30, RNF-ERR-04, RNF-USA-05, RN-08 (reativação), comando cross-service no lado dono |
| 2 | `ID/integracao/SuspensaoSemTokenIntegracaoTest.java` | 1 | 1 | `MODERACAO_TOKEN` ausente: 503 |
| 3 | `ID/auth/service/SuspensaoComAdminIntegracaoTest.java` | 2 | 2 | SEC-04 (admin único provisionado); admin não é suspenso |
| 4 | `ID/config/AppPropertiesTest.java` | 7 | 1 | tamanho mínimo do `MODERACAO_TOKEN` |
| 5 | `ID/integracao/ContratosDePerfilIntegracaoTest.java` | 4 | 2* | VIEWs públicas omitem suspensa; seguimento some com lado suspenso |
| 6 | `ID/integracao/PerfilDeOutroIntegracaoTest.java` | 9 | 1* | perfil e busca: suspensa é 404 |
| 7 | `ID/integracao/SeguimentoIntegracaoTest.java` | 14 | 1* | já é CT-PER-14 |
| 8 | `SO/integracao/SuspensaoDeContaIntegracaoTest.java` | 19 | 19 | RF-MOD-04, RF-MOD-05, SEC-04/35/36/37, RNF-ERR-04, timeout/503/409 do comando |
| 9 | `SO/integracao/OcultacaoDeContaSuspensaIntegracaoTest.java` | 12 | 12 | ocultação em comentários, notificações, curtidas e menções |
| 10 | `SO/feed/service/MascaraDeMencoesTest.java` | 6 | 6 | máscara "um leitor" na edição de comentário (unitário) |
| 11 | `SO/feed/service/ServicoDeFeedIntegracaoTest.java` | 13 | 1 | contadores do feed sem conta suspensa |
| 12 | `SO/conta/service/ConsumidorDeContaExcluidaIntegracaoTest.java` | 5 | 1 | auditoria de conta anonimizada na exclusão |
| 13 | `SO/moderacao/service/TimeoutDosClientesTest.java` | 1 | 1 | timeout de leitura × de conexão nos clientes HTTP |
| 14 | `SO/integracao/NotificacaoControllerIntegracaoTest.java` | 15 | 2* | ator e remetente suspensos nas notificações |
| 15 | `SO/integracao/RecomendacaoControllerIntegracaoTest.java` | 9 | 1* | recebidas sem remetente suspenso |
| 16 | `SO/integracao/ListaControllerIntegracaoTest.java` | 24 | 1* | listas de conta suspensa: 404 |
| 17 | `LE/test/integracao/reacao.int-spec.ts` | 26 | 1 (+1*) | reações de conta suspensa nas contagens |
| 18 | `LE/test/integracao/perfis.int-spec.ts` | 13 | 1 | reação de suspensa nas resenhas do perfil |
| 19 | `LE/test/integracao/resenha.int-spec.ts` | 20 | 1 | `minha-avaliacao` sem reação de suspensa (CT-AVA-11 já no plano) |
| 20 | `LE/test/integracao/estante.int-spec.ts` | 30 | 1* | estante de conta suspensa: 404 |
| 21 | `AC/test/integracao/livro-pessoal.int-spec.ts` | 32 | 1* | dono suspenso não libera o livro pessoal pela lista |
| 22 | `AC/test/integracao/livro-oficial.int-spec.ts` | 17 | 1* | resenha de autor fora da VIEW some da página do livro |
| 23 | `WEB/components/moderacao/DialogoSuspensao.spec.ts` | 10 | 10 | RNF-USA-04 (confirmação com motivo), espera, timeout, 503, reativação |
| 24 | `WEB/views/perfil/PerfilDeOutroView.admin.spec.ts` | 10 | 10 | ação no perfil do admin, visão da conta suspensa, leitor vê "Perfil não encontrado" |
| 25 | `WEB/views/moderacao/PainelModeracaoView.spec.ts` | 17 | 5 | painel: suspender/reativar pela denúncia, registro com motivo |
| 26 | `WEB/views/auth/LoginView.spec.ts` | 12 | 5 | banner de conta suspensa no login |
| 27 | `WEB/session.spec.ts` | 16 | 3 | motivo do logout forçado entre abas |
| 28 | `WEB/services/renovacao.spec.ts` | 9 | 1 | 403 `CONTA_SUSPENSA` na renovação encerra a sessão |
| 29 | `WEB/router/index.spec.ts` | 8 | 1 | guarda de sessão leva ao login com o motivo |
| 30 | `WEB/components/feed/ModalComentarios.spec.ts` | 23 | 1 | 409 `COMENTARIO_DESATUALIZADO` (máscara) |
| 31 | `MOB/core/session/session_controller_test.dart` | 14 | 3 | logout uma vez, sem loop; timeout/503 não saem por suspensão |
| 32 | `MOB/features/auth/login_page_test.dart` | 11 | 4 | banner de conta suspensa |
| 33 | `MOB/features/sessao/sessao_test.dart` | 18 | 1 | aviso de leitura descartada |
| 34 | `MOB/app/router_test.dart` | 31 | 1 | navegação do logout forçado |
| 35 | `MOB/features/conta/exclusao_test.dart` | 25 | 1 | 403 do pedido de exclusão encerra pela suspensão |
| 36 | `MOB/features/feed/folha_comentarios_test.dart` | 15 | 1 | 409 de apresentação mudada |
| 37 | `MOB/features/notificacoes/rotas_notificacoes_test.dart` | 8 | 1* | ator oculto leva ao próprio perfil |

**Total:** 37 arquivos; **113 testes da feature** (identidade 23, social 40, leitura 3, web 36, mobile 11) e **13 pré-existentes** que exercitam a ocultação.

### 1.2. Casos previstos

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-MDO-01 | RF-MOD-04, RNF-SEC-04 | Leitor chama suspender ou reativar no `social` | 403; o `identidade` nem é chamado e nada vai ao log | integração | `SO/integracao/SuspensaoDeContaIntegracaoTest.java` › "Leitor recebe 403 ao suspender ou reativar, e o identidade nem é chamado" |
| CT-MDO-02 | RF-MOD-04, RNF-SEC-01, RNF-SEC-04 | Rota interna do `identidade` sem JWT, sem ou com `X-Moderacao-Token` errado, ou com JWT de leitor | 401, 401 e 403 | integração | `ID/integracao/SuspensaoDeContaIntegracaoTest.java` › "rota interna: sem JWT 401; admin sem token ou com token errado 401; leitor 403" |
| CT-MDO-03 | RF-MOD-04, RNF-SEC-04 | Papel admin num token de outro `sub` que não a conta provisionada | 403 | integração | `ID/auth/service/SuspensaoComAdminIntegracaoTest.java` › "com o admin provisionado, papel admin de outro sub é 403" |
| CT-MDO-04 | RF-MOD-04 | Suspender a conta administradora | 422 | integração | `ID/auth/service/SuspensaoComAdminIntegracaoTest.java` › "a conta administradora não é suspensa: 422" |
| CT-MDO-05 | RF-MOD-04, RNF-SEC-30 | Admin suspende uma conta | Renovações revogadas; a conta some das VIEWs públicas e fica na da moderação | integração | `ID/integracao/SuspensaoDeContaIntegracaoTest.java` › "admin suspende: revoga as renovações, some das VIEWs públicas e fica na da moderação" |
| CT-MDO-06 | RF-MOD-04, RF-MOD-05, RNF-SEC-35 | Suspender e depois reativar pelo painel | Uma linha de auditoria para cada ação, com o motivo e o instante devolvido pelo `identidade` | integração | `SO/integracao/SuspensaoDeContaIntegracaoTest.java` › "Suspender e reativar: um log cada, com o motivo e o instante do identidade" |
| CT-MDO-07 | RF-MOD-04, RNF-ERR-04 | Repetir a suspensão no `identidade` | `alterado:false` e o mesmo `suspensoEm` | integração | `ID/integracao/SuspensaoDeContaIntegracaoTest.java` › "repetir a suspensão devolve alterado:false e o mesmo suspensoEm" |
| CT-MDO-08 | RF-MOD-05, RNF-ERR-04 | Dois cliques com chaves diferentes, ou conta já suspensa | Uma linha de auditoria só | integração | `SO/integracao/SuspensaoDeContaIntegracaoTest.java` › "Dois cliques com chaves diferentes, ou a conta já suspensa: uma linha só" |
| CT-MDO-09 | RNF-ERR-04 | Mesma `Idempotency-Key` repetida | Devolve o recibo sem chamar o `identidade` de novo | integração | `SO/integracao/SuspensaoDeContaIntegracaoTest.java` › "Mesma chave repetida devolve o recibo sem chamar o identidade de novo" |
| CT-MDO-10 | RF-MOD-04 (comando cross-service) | `identidade` não responde a tempo | 504 sem log; a retentativa com a mesma chave grava a linha | integração | `SO/integracao/SuspensaoDeContaIntegracaoTest.java` › "Timeout: 504 sem log; a retentativa com a mesma chave grava a linha que faltou" |
| CT-MDO-11 | RF-MOD-04 (comando cross-service) | `identidade` fora do ar | 503 e nenhum log (sem estado local falso) | integração | `SO/integracao/SuspensaoDeContaIntegracaoTest.java` › "identidade parado: 503, nenhum log; religado, a mesma chave grava uma linha" |
| CT-MDO-12 | RNF-ERR-04 | Timeout, reativação e reenvio da suspensão antiga | Os dois logs ficam e a conta não volta a ser suspensa | integração | `SO/integracao/SuspensaoDeContaIntegracaoTest.java` › "Timeout, reativar e reenviar a suspensão: os dois logs ficam e a conta não volta a ser suspensa" |
| CT-MDO-13 | RNF-ERR-04 | O mesmo `X-Comando-Id` reenviado ao `identidade` depois da reativação | Devolve o resultado gravado; não suspende de novo | integração | `ID/integracao/SuspensaoDeContaIntegracaoTest.java` › "o mesmo comando reenviado depois da reativação devolve o resultado gravado e não suspende de novo" |
| CT-MDO-14 | RNF-ERR-04 | Duas intenções reservadas; a mais nova roda primeiro | A antiga vira 409 sem efeito | integração | `SO/integracao/SuspensaoDeContaIntegracaoTest.java` › "Duas intenções reservadas: a mais nova roda primeiro, e a antiga vira 409 sem efeito" |
| CT-MDO-15 | RF-MOD-04, RNF-USA-05 | Login de conta suspensa com a senha certa e com a errada | Certa: 403 `CONTA_SUSPENSA`; errada: o 401 único, sem enumerar contas | integração | `ID/integracao/SuspensaoDeContaIntegracaoTest.java` › "login de conta suspensa: senha certa 403 CONTA_SUSPENSA, senha errada o 401 único" |
| CT-MDO-16 | RF-MOD-04, RNF-SEC-30 | Renovar com o token que a suspensão revogou | 403, sem alarme de reuso | integração | `ID/integracao/SuspensaoDeContaIntegracaoTest.java` › "renovar com o token que a suspensão revogou é 403, sem log de reuso" |
| CT-MDO-17 | RF-MOD-04 | Redefinir a senha de conta suspensa | O login seguinte continua 403 | integração | `ID/integracao/SuspensaoDeContaIntegracaoTest.java` › "redefinir a senha não contorna a suspensão: o login seguinte continua 403" |
| CT-MDO-18 | RF-MOD-04, RN-08 | Reativar a conta | Login, renovação e VIEWs voltam, com a privacidade e os seguidores de antes | integração | `ID/integracao/SuspensaoDeContaIntegracaoTest.java` › "reativar devolve login, renovação e as VIEWs, com privacidade e seguidores de antes" |
| CT-MDO-19 | RF-MOD-04 | Contadores do perfil com seguidor suspenso | Não contam a conta suspensa e voltam a contar na reativação | integração | `ID/integracao/SuspensaoDeContaIntegracaoTest.java` › "contadores do perfil não contam conta suspensa e voltam a contar na reativação" |
| CT-MDO-20 | RF-MOD-04, RNF-ARQ-05 | Login durante a transação de suspensão | Espera o commit e recebe 403, sem sessão viva | integração | `ID/integracao/SuspensaoDeContaIntegracaoTest.java` › "login no meio da suspensão espera ela commitar e recebe 403, sem sessão viva" |
| CT-MDO-21 | RF-MOD-04 | Comentário raiz de conta suspensa | Some com a thread inteira, e as contagens acompanham | integração | `SO/integracao/OcultacaoDeContaSuspensaIntegracaoTest.java` › "Raiz de conta suspensa some com a thread inteira, e as contagens a acompanham" |
| CT-MDO-22 | RF-MOD-04 | Notificação cujo autor da atividade foi suspenso | Vira "um leitor", sem links | integração | `SO/integracao/OcultacaoDeContaSuspensaIntegracaoTest.java` › "Notificação: autor da atividade oculto vira \"um leitor\", sem links" |
| CT-MDO-23 | RF-MOD-04 | Menção a conta suspensa | Vira "um leitor" no texto, sem link, e volta na reativação | integração | `SO/integracao/OcultacaoDeContaSuspensaIntegracaoTest.java` › "Menção a conta suspensa vira \"um leitor\" no texto, sem link, e volta na reativação" |
| CT-MDO-24 | RF-MOD-04 | Reação de conta suspensa numa resenha | Sai das contagens e da VIEW, e volta na reativação | integração | `LE/test/integracao/reacao.int-spec.ts` › reações à resenha (integração) › reagir em livro oficial › "F-MOD-OPC: reação de conta suspensa sai das contagens e da VIEW, e volta na reativação" |
| CT-MDO-25 | RF-MOD-05, RNF-SEC-36, RNF-SEC-37 | Registro com linhas de conteúdo | A linha de conteúdo não traz motivo nem alvo de conta | integração | `SO/integracao/SuspensaoDeContaIntegracaoTest.java` › "Linha de conteúdo não traz motivo nem alvo de conta (RNF-SEC-36)" |
| CT-MDO-26 | RF-MOD-04 | Admin procura conta suspensa por username; leitor tenta o mesmo | Admin acha, com o motivo vigente; leitor 403 | integração | `SO/integracao/SuspensaoDeContaIntegracaoTest.java` › "Admin acha a conta pelo username, também suspensa, com o motivo vigente; leitor 403" |
| CT-MDO-27 | RF-MOD-04, RNF-USA-04 | Web: abrir o dialog de suspensão | Confirmar desabilitado sem motivo, foco no motivo | web | `WEB/components/moderacao/DialogoSuspensao.spec.ts` › DialogoSuspensao › "copy do design, foco no motivo e confirmar desabilitado sem motivo" |
| CT-MDO-28 | RNF-TST-06 | Web: timeout ao suspender | Banner de não confirmada, motivo mantido e reenvio com a mesma chave | web | `WEB/components/moderacao/DialogoSuspensao.spec.ts` › DialogoSuspensao › "timeout: banner de não confirmada, motivo mantido e o reenvio com a mesma chave" |
| CT-MDO-29 | RF-MOD-04, RF-MOD-05 | Web: registro de moderação | Linhas de conta com o motivo; `Reativar conta` só na suspensão vigente | web | `WEB/views/moderacao/PainelModeracaoView.spec.ts` › PainelModeracaoView › "registro: linhas de conta com o motivo; Reativar conta só na suspensão vigente" |
| CT-MDO-30 | RF-MOD-04 | Web: leitor abre o perfil de conta suspensa | Continua "Perfil não encontrado", sem consultar a moderação | web | `WEB/views/perfil/PerfilDeOutroView.admin.spec.ts` › PerfilDeOutroView, administrador › "para o leitor, a conta suspensa continua Perfil não encontrado, sem consultar a moderação" |
| CT-MDO-31 | RF-MOD-04, RNF-SEC-30 | Web: renovação recusada com `CONTA_SUSPENSA` | Encerra a sessão uma vez, com o motivo, sem nova renovação | web | `WEB/services/renovacao.spec.ts` › createRenovador › "F-MOD-OPC: 403 CONTA_SUSPENSA encerra a sessão uma vez, com o motivo, sem nova renovação" |
| CT-MDO-32 | RF-MOD-04, RNF-USA-05 | Web: login de conta suspensa com a senha certa | Banner âmbar, campos sem erro e senha limpa | web | `WEB/views/auth/LoginView.spec.ts` › LoginView › "conta suspensa com a senha certa: banner âmbar, campos sem erro e senha limpa" |
| CT-MDO-33 | RF-MOD-04 | Mobile: renovação recusada com `CONTA_SUSPENSA` | Sai uma vez, com o aviso gravado antes de notificar | mobile | `MOB/core/session/session_controller_test.dart` › renovar › "F-MOD-OPC: CONTA_SUSPENSA sai uma vez, com o aviso gravado antes de notificar" |
| CT-MDO-34 | RNF-TST-06 | Mobile: timeout ou 503 na renovação | Não sai por suspensão | mobile | `MOB/core/session/session_controller_test.dart` › renovar › "F-MOD-OPC: timeout e 503 na renovação não saem por suspensão" |
| CT-MDO-35 | RF-MOD-04, RNF-USA-05 | Mobile: login de conta suspensa com a senha certa | Banner âmbar, sem erro nos campos, senha limpa | mobile | `MOB/features/auth/login_page_test.dart` › "conta suspensa com a senha certa: banner âmbar, sem erro nos campos, senha limpa" |

### 1.3. Sem teste aparente (candidatos a lacuna) — dono: Renato

| # | Item | Requisito | O que procurei e onde |
|---|---|---|---|
| MDO-L1 | Rotas `POST /admin/usuarios/{id}/suspender` e `/reativar` **sem token** (401) no `social` | RNF-SEC-01 | Nomes e corpos de `SO/integracao/SuspensaoDeContaIntegracaoTest.java` (só leitor 403 e admin); só há o 401 genérico de `SegurancaIntegracaoTest` (CT-TRV-05) |
| MDO-L2 | Atividade de autor suspenso **some do feed** e volta na reativação, no `social`, contra a VIEW real | RF-MOD-04, RN-09 | `SO/feed/service/ServicoDeFeedIntegracaoTest.java` e `SO/feed/repository/FeedRepositorioIntegracaoTest.java`: nenhum teste com autor suspenso; a massa recria uma cópia local de `identidade.v_seguimento_aceito_v1`. A VIEW real é testada só no `identidade` (`ContratosDePerfilIntegracaoTest` › "seguimento some quando qualquer um dos lados fica suspenso ou pede exclusão") |
| MDO-L3 | Serviço web de moderação (`services/moderacao.ts`: suspender, reativar e busca por username, com `Idempotency-Key`) sem spec próprio | RNF-TST-05 | Não existe `WEB/services/moderacao.spec.ts`; `DialogoSuspensao.spec.ts`, `PainelModeracaoView.spec.ts` e `PerfilDeOutroView.admin.spec.ts` simulam o serviço inteiro |
| MDO-L4 | Nota dos leitores **continua** contando a conta suspensa (decisão 4, de propósito) | RF-MOD-04 (decisão registrada) | Nenhum teste fixa o comportamento escolhido em `acervo` (`nota_leitor_projecao`) nem em `leitura` |
| MDO-L5 | Mobile: 403 das escritas do `leitura` dentro dos 15 minutos do token (divergência aceita) | RF-MOD-04 | `CONTA_SUSPENSA` aparece em 5 arquivos do mobile, todos de sessão, login, exclusão e roteador; nenhum de escrita no `leitura` |
| MDO-L6 | Fluxo em DES | critério de aceite | Manual, pendente para o merge na `main` |

### 1.4. Divergências e estranhezas

- **Serviços:** além de `social` e `identidade`, a feature mexeu no `leitura` (migration `0007`, VIEW `v_resenha_publicacao_v1`, contagens de reação) e o efeito chega ao `acervo` pelas VIEWs. Os testes de `LE/` e `AC/` acima são dessa extensão.
- **Modelo de dados:** a especificação diz "nenhuma tabela nova", mas a revisão do PR #61 criou `comando_de_conta` nos dois serviços (registrado nas Pendências).
- **DoD:** "CI verde" continua desmarcado no arquivo de feature, embora o PR #61 esteja mergeado. Os números de teste citados mudam ao longo do arquivo (233/274 nos critérios; 242/288 e 294 na Timeline).
- `ID/auth/service/SuspensaoComAdminIntegracaoTest.java` é de integração, mas está no pacote `auth/service`.
- `SO/config/AppPropertiesTest.java` › "MODERACAO_TOKEN é opcional, mas preenchido precisa de 32 caracteres (F-MOD)" é da F-MOD (P2), não desta feature; não foi contado.
- **Risco de deriva:** os testes do feed no `social` (`ServicoDeFeedIntegracaoTest`) criam a própria versão das VIEWs do `identidade`, com o filtro `suspenso = false`. Eles provam o filtro de uma cópia, não o da VIEW real.
- Os testes `*` de P1/P2 (perfil, estante, listas, notificações, recomendações, livro pessoal) gravam a suspensão por SQL (`UPDATE usuario SET suspenso = true, suspenso_em = now()`), não pelo comando. Provam a regra da VIEW, não o fluxo do admin.

---

## 2. F-ACV-OPC — Extras de acervo (CT-ACO)

**Dono:** Renato Douglas. **RFs:** RF-ACV-14 (recarga manual do dump) e RF-ACV-22 (assuntos no livro pessoal). **Serviços:** `acervo` + script de ingestão, web e mobile, como informado. RF-ACV-14 não tem tela (coluna Web "—" no `REQUISITOS.md`).

### 2.1. Arquivos de teste

| # | Arquivo | Testes no arquivo | Da feature | Cobre |
|---|---|---|---|---|
| 1 | `AC/test/integracao/assuntos-livro-pessoal.int-spec.ts` | 13 | 13 | RF-ACV-22, RN-21.1/21.2/21.4/21.5, RN-03, RN-15, SEC-02/06/13, RNF-ERR-04 |
| 2 | `AC/src/livros/pessoal/livro-pessoal.service.spec.ts` | 22 | 6 | normalização, 400 antes de gravar, FK violada, modo consulta |
| 3 | `AC/test/integracao/consumo-conta-excluida.int-spec.ts` | 5 | 1 | assuntos do livro pessoal saem com a conta |
| 4 | `ING/test_carga_banco.py` | 17 | 6 (+1*) | RF-ACV-14, RN-02, RN-12, RN-14.6, RN-19.2, RN-21.3/21.4, RNF-ARQ-05 |
| 5 | `WEB/components/livros/CampoAssuntos.spec.ts` | 8 | 8 | campo do formulário, aviso a partir do 6º |
| 6 | `WEB/components/livros/SeletorDeAssuntos.spec.ts` | 13 | 13 | seletor sem texto livre, carga, falha, acessibilidade |
| 7 | `WEB/livros/useSeletorDeAssuntos.spec.ts` | 8 | 8 | composable: carga, filtro, cold start e timeout |
| 8 | `WEB/services/acervo.spec.ts` | 19 | 3 | corpo de criar e editar com `assuntos` |
| 9 | `WEB/views/livros/LivroPessoalFormView.spec.ts` | 15 | 5 | formulário: 400 no campo, timeout da lista, edição |
| 10 | `WEB/views/livros/LivroPessoalView.spec.ts` | 18 | 3 | linha `Assuntos` para o dono e no modo consulta |
| 11 | `MOB/features/livros/campo_assuntos_test.dart` | 7 | 7 | campo do formulário |
| 12 | `MOB/features/livros/seletor_de_assuntos_test.dart` | 19 | 19 | seletor, teclado, falha, acessibilidade |
| 13 | `MOB/features/livros/livro_pessoal_service_test.dart` | 8 | 8 | contrato de `assuntos` no serviço |
| 14 | `MOB/features/livros/livro_pessoal_form_page_test.dart` | 17 | 5 | formulário: 503, timeout, 400 |
| 15 | `MOB/features/livros/livro_pessoal_page_test.dart` | 19 | 6 | linha `Assuntos` |

**Total:** 15 arquivos; **111 testes da feature** (acervo 20, script 6, web 40, mobile 45). O `*` em `ING/` é `test_notas_replica_por_obra_limpa_na_recarga`, da F-ACV-NOTA (P2).

### 2.2. Casos previstos

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-ACO-01 | RF-ACV-14, RN-02, RNF-ARQ-05 | Recarga da amostra modificada, duas vezes | A 1ª insere só o livro novo e atualiza os alterados; a 2ª não muda nada; `ingestao_execucao` registra `recarga`/`concluida` com os totais | script | `ING/test_carga_banco.py` › `test_recarga_atualiza_uma_vez_e_a_segunda_nao_muda_nada` |
| CT-ACO-02 | RF-ACV-14, RN-03, RN-14.6, RN-19.2, RN-06.6 | Recarga sobre livros com capa própria, sinopse, notas, livro pessoal e livro do Google Books | Nada disso é apagado nem sobrescrito, também depois do `notas` | script | `ING/test_carga_banco.py` › `test_recarga_preserva_o_que_nao_vem_do_dump` |
| CT-ACO-03 | RF-ACV-14, RN-12, RN-21.3, RN-21.4 | Dump com título, capa externa e assuntos novos; obra sem tag mapeada | Aplica o que o dump traz; obra sem tag mapeada mantém os assuntos; nenhum assunto novo é criado | script | `ING/test_carga_banco.py` › `test_recarga_aplica_o_que_o_dump_traz_e_mantem_o_que_ele_nao_traz` |
| CT-ACO-04 | RF-ACV-14, RN-12 | Série ausente ou trocada no dump | O número acompanha a série | script | `ING/test_carga_banco.py` › `test_recarga_numero_da_serie_acompanha_a_serie` |
| CT-ACO-05 | RF-ACV-14, RN-12 | Livro existente passa a violar um filtro (ex.: sem capa) | Continua intacto na base | script | `ING/test_carga_banco.py` › `test_livro_que_saiu_dos_filtros_continua_intacto` |
| CT-ACO-06 | RF-ACV-14 | Carga inicial (sem `--tipo recarga`) sobre base existente | Só acrescenta; não atualiza nada | script | `ING/test_carga_banco.py` › `test_carga_inicial_sobre_base_existente_nao_atualiza_nada` |
| CT-ACO-07 | RF-ACV-22, RN-21.1 | Criar livro pessoal com assuntos do conjunto curado | Grava e devolve em ordem alfabética | integração | `AC/test/integracao/assuntos-livro-pessoal.int-spec.ts` › assuntos do livro pessoal (integração) › criar › "grava os assuntos e devolve em ordem alfabética" |
| CT-ACO-08 | RF-ACV-22, RN-21.2 | Mais de 5 e mais de 100 assuntos | Mais de 5 é aceito (o aviso é do cliente); mais de 100 é recusado | integração | `AC/test/integracao/assuntos-livro-pessoal.int-spec.ts` › assuntos do livro pessoal (integração) › criar › "aceita mais de 5 (o aviso é só do cliente) e recusa mais de 100" |
| CT-ACO-09 | RF-ACV-22, RN-21.4, RNF-SEC-13 | Id fora do conjunto curado | 400 no campo `assuntos` e nada gravado | integração | `AC/test/integracao/assuntos-livro-pessoal.int-spec.ts` › assuntos do livro pessoal (integração) › rejeições (RN-21.4) › "id fora do conjunto curado: 400 no campo e nada gravado" |
| CT-ACO-10 | RF-ACV-22, RN-21.4, RNF-SEC-13 | Texto livre, número ou não-array em `assuntos` | 400 com a mensagem em pt-BR | integração | `AC/test/integracao/assuntos-livro-pessoal.int-spec.ts` › assuntos do livro pessoal (integração) › rejeições (RN-21.4) › "%s: 400 com a mensagem em pt-BR" |
| CT-ACO-11 | RF-ACV-22 | Editar: substituir, omitir e esvaziar (`[]` e `null`) | Substitui, preserva quando ausente, esvazia | integração | `AC/test/integracao/assuntos-livro-pessoal.int-spec.ts` › assuntos do livro pessoal (integração) › editar › "substitui, preserva quando ausente e esvazia com [] e com null" |
| CT-ACO-12 | RNF-ERR-04 | Mesma `Idempotency-Key` com a lista em outra ordem ou caixa | Replay, não 409 | integração | `AC/test/integracao/assuntos-livro-pessoal.int-spec.ts` › assuntos do livro pessoal (integração) › idempotência › "a mesma chave com a lista em outra ordem ou caixa é replay, não 409" |
| CT-ACO-13 | RF-ACV-22, RN-03, RNF-SEC-02 | Terceiro abre o livro pelo feed e tenta editar os assuntos | Vê os assuntos; a edição é 403 | integração | `AC/test/integracao/assuntos-livro-pessoal.int-spec.ts` › assuntos do livro pessoal (integração) › propriedade e leitura (RN-03, RN-15) › "terceiro que vê o livro pelo feed recebe os assuntos e não consegue editá-los" |
| CT-ACO-14 | RN-03, RN-15 | Terceiro pela lista do dono e sem via | Pela lista vê; sem via, 403 | integração | `AC/test/integracao/assuntos-livro-pessoal.int-spec.ts` › assuntos do livro pessoal (integração) › propriedade e leitura (RN-03, RN-15) › "terceiro pela lista vê os assuntos; sem via, 403" |
| CT-ACO-15 | RN-03, RN-21.5, RNF-SEC-06 | Livro pessoal com assunto | Fora da busca, do filtro, do `totalItens`, da página de autor, da `v_livro_recomendacao_v1` e da contagem de `GET /assuntos` | integração | `AC/test/integracao/assuntos-livro-pessoal.int-spec.ts` › assuntos do livro pessoal (integração) › isolamento (RN-03, RNF-SEC-06) › "o livro pessoal com assunto não aparece em busca, filtro, contagem, página de autor nem na VIEW de recomendação" |
| CT-ACO-16 | RF-ACV-22, RN-21.4 | Corrida: assunto some entre a validação e a gravação | A FK violada vira o mesmo 400 | unitário | `AC/src/livros/pessoal/livro-pessoal.service.spec.ts` › assuntos do livro pessoal (F-ACV-OPC) › "a FK violada na gravação vira o mesmo 400" |
| CT-ACO-17 | RF-ACV-22, RN-23 | `conta.excluida` de dono com livro pessoal com assuntos | Os vínculos de assunto vão junto | mensageria | `AC/test/integracao/consumo-conta-excluida.int-spec.ts` › consumo de conta.excluida (integração) › "os assuntos dos livros pessoais da conta vão junto" |
| CT-ACO-18 | RF-ACV-22, RN-21.4 | Web: busca no seletor sem resultado | Aponta a escolha mais próxima e não oferece criar assunto | web | `WEB/components/livros/SeletorDeAssuntos.spec.ts` › SeletorDeAssuntos › "sem resultado aponta a escolha mais próxima e não oferece criar" |
| CT-ACO-19 | RN-21.2 | Web: 6º assunto escolhido | O helper vira aviso, que não é erro | web | `WEB/components/livros/CampoAssuntos.spec.ts` › CampoAssuntos › "a partir do 6º, o helper vira um aviso que não é erro, anunciado uma vez" |
| CT-ACO-20 | RNF-TST-06 | Web: lista de assuntos em timeout | O seletor mostra a falha e o livro ainda salva sem assuntos | web | `WEB/views/livros/LivroPessoalFormView.spec.ts` › LivroPessoalFormView › assuntos (F-ACV-OPC) › "lista indisponível por timeout: o seletor mostra a falha e o livro ainda salva sem assuntos" |
| CT-ACO-21 | RF-ACV-22, RN-03 | Web: terceiro em modo consulta | Vê a linha `Assuntos`; sem assunto, ela some | web | `WEB/views/livros/LivroPessoalView.spec.ts` › LivroPessoalView › linha Assuntos da ficha (F-ACV-OPC) › "terceiro em modo consulta vê a mesma linha; sem assunto, também some" |
| CT-ACO-22 | RF-ACV-22, RN-21.4 | Mobile: busca no seletor sem resultado | Não oferece criar assunto | mobile | `MOB/features/livros/seletor_de_assuntos_test.dart` › folha do seletor › "busca sem resultado não oferece criar assunto" |
| CT-ACO-23 | RNF-TST-06 | Mobile: lista de assuntos em 503 | Não impede salvar; o livro vai sem assuntos | mobile | `MOB/features/livros/livro_pessoal_form_page_test.dart` › assuntos (F-ACV-OPC) › "503 da lista não impede salvar: o livro vai sem assuntos" |
| CT-ACO-24 | RF-ACV-22 | Mobile: 400 de assuntos do servidor | Aparece no campo, sem banner, com foco em `Alterar` | mobile | `MOB/features/livros/livro_pessoal_form_page_test.dart` › assuntos (F-ACV-OPC) › "400 de assuntos aparece no campo, sem banner, com o foco em Alterar" |
| CT-ACO-25 | RNF-TST-04 | Mobile: contrato do serviço | Edição manda sempre o array, vazio para limpar | mobile | `MOB/features/livros/livro_pessoal_service_test.dart` › DadosLivroPessoal.paraJson › "edição manda sempre o array, vazio para limpar" |

### 2.3. Sem teste aparente (candidatos a lacuna) — dono: Renato

| # | Item | Requisito | O que procurei e onde |
|---|---|---|---|
| ACO-L1 | Isolamento nas páginas de **editora** e **série** | RN-03, RNF-SEC-06, critério "não aparecem em ... páginas de autor/editora/série" | O teste de isolamento (`assuntos-livro-pessoal.int-spec.ts`, linhas 326–370) só consulta busca, filtro, `/autores/{id}`, `v_livro_recomendacao_v1` e `GET /assuntos`; nenhuma chamada a `/editoras` ou `/series` |
| ACO-L2 | `POST`/`PATCH /livros/pessoal` com `assuntos` **sem token** (401) | RNF-SEC-01 | Nenhum `401` em `assuntos-livro-pessoal.int-spec.ts` nem em `livro-pessoal.int-spec.ts`; os 401 do `acervo` estão em `autenticacao.int-spec.ts`, `busca.int-spec.ts` e `catalogo.int-spec.ts` |
| ACO-L3 | Recarga aplica a tabela de **sinônimos de editora** sem criar variante que a carga inicial já unificou | RN-12 | `test_carga_banco.py`: a amostra modificada usa uma editora nova ("Editora Nova Recarga"); nenhum teste de recarga passa um sinônimo de editora existente |
| ACO-L4 | Mobile: formulário de **edição** chega com os assuntos preenchidos e esvaziar manda `[]` (a web tem `"edição: chega preenchido pelo detalhe, e esvaziar manda o array vazio"`) | RF-ACV-22 | `livro_pessoal_form_page_test.dart`, grupo `assuntos (F-ACV-OPC)`: 5 testes, todos de criação, 503, timeout e 400; só o serviço testa o array vazio na edição |
| ACO-L5 | Recarga real (volume e fração do plano Neon) e fluxo em DES | RF-ACV-14, RNF-DES-04/05, item próprio do DoD | Manual, pendência do grupo; não automatizável |

### 2.4. Divergências e estranhezas

- **RN-21.2 × servidor:** o servidor aceita até 100 assuntos; o teto de 5 é só aviso do cliente (decisão do dono). O teste CT-ACO-08 fixa isso.
- O nome do teste de isolamento fala de "página de autor" e cumpre o que diz; o critério de aceite promete também editora e série (ACO-L1).
- A recarga só foi validada na amostra, em Postgres descartável; nunca no Neon.
- CT-ACO-10 é `it.each` com três casos (`texto livre`, `número`, `não-array`); o nome no código é `'%s: 400 com a mensagem em pt-BR'`.

---

## 3. F-STA-OPC — Distribuição de notas (CT-STO)

**Dona:** Ana Luiza de Freitas (o pedido não dizia o dono). **RF:** RF-STA-04, com RN-06, RN-08 e RN-03. **Serviços:** `leitura`, web e mobile, como informado. Mergeada pelo PR #63 (`c456e88`, 08/11/2026), CI verde no PR.

### 3.1. Arquivos de teste

| # | Arquivo | Testes no arquivo | Da feature | Cobre |
|---|---|---|---|---|
| 1 | `LE/src/estatisticas/dominio/estatisticas.spec.ts` | 22 | 5 | RN-06 (11 faixas, sem arredondar), RN-06.3 (ausente × zero), soma |
| 2 | `LE/test/integracao/estatisticas.int-spec.ts` | 28 | 3 (+1*) | RF-STA-04, RN-03 (livro pessoal conta), ciclo da nota, coerência com a média, período, RN-08 |
| 3 | `WEB/components/estatisticas/GraficoDeNotas.spec.ts` | 7 | 7 | 11 colunas, vazio, teclado, tabela |
| 4 | `WEB/views/perfil/PerfilDeOutroView.spec.ts` | 25 | 2 | histograma compacto no perfil alheio |
| 5 | `MOB/features/estatisticas/graficos_de_notas_test.dart` | 6 | 6 | 11 colunas, vazio, toque, teclado, tabela |
| 6 | `MOB/features/estatisticas/estatisticas_do_perfil_test.dart` | 12 | 3 | histograma no perfil alheio; não no próprio |
| 7 | `MOB/features/estatisticas/estatisticas_service_test.dart` | 7 | 1 (+2 ajustados) | contrato: distribuição sem as 11 faixas é inválida |

**Total:** 7 arquivos; **27 testes da feature** (leitura 8, web 9, mobile 10). O `*` é `"sem token é 401"` de `GET /me/estatisticas` (F-STA).

### 3.2. Casos previstos

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-STO-01 | RF-STA-04, RN-06.3 | Leitor sem nenhuma nota | Distribuição ausente, nunca onze zeros | unitário | `LE/src/estatisticas/dominio/estatisticas.spec.ts` › montarDistribuicao (RF-STA-04) › "sem nenhuma nota a distribuição é ausente, nunca onze zeros" |
| CT-STO-02 | RF-STA-04, RN-06 | Leitor com ao menos uma nota | As onze faixas, inclusive as de contagem zero | unitário | `LE/src/estatisticas/dominio/estatisticas.spec.ts` › montarDistribuicao (RF-STA-04) › "com ao menos uma nota traz as onze faixas, inclusive as de contagem zero" |
| CT-STO-03 | RF-STA-04, RN-06 | Entrada fora de ordem, com meia estrela | Ordena pela escala e não funde meia estrela com estrela cheia | unitário | `LE/src/estatisticas/dominio/estatisticas.spec.ts` › montarDistribuicao (RF-STA-04) › "ordena pela escala, não pela entrada, e não funde meia estrela com estrela cheia" |
| CT-STO-04 | RF-STA-04 | Valor fora da escala | Não entra no total, que continua igual à soma das faixas | unitário | `LE/src/estatisticas/dominio/estatisticas.spec.ts` › montarDistribuicao (RF-STA-04) › "valor fora da escala não entra no total, que continua igual à soma das faixas" |
| CT-STO-05 | RF-STA-04, RN-03, RN-06, RF-STA-02 | `/me/estatisticas` com notas em livros oficiais e pessoal; depois editar e remover notas | Onze faixas; livro pessoal conta; `total` = `notaMedia.quantidade`; editar e remover mudam na hora; sem notas volta a `null` | integração | `LE/test/integracao/estatisticas.int-spec.ts` › estatísticas (integração) › GET /me/estatisticas › "distribuição de notas: onze faixas, ausente sem nota, coerente com a média e com o ciclo da nota" |
| CT-STO-06 | RF-STA-04 | Notas em anos diferentes | A distribuição segue o período: ano, acumulado e ano sem nota | integração | `LE/test/integracao/estatisticas.int-spec.ts` › estatísticas (integração) › GET /me/estatisticas › "distribuição de notas segue o período: ano, acumulado e ano sem nota" |
| CT-STO-07 | RF-STA-04, RN-08, RNF-SEC-03 | Perfil privado: não seguidor e depois seguidor aceito | Não seguidor 403; seguidor vê a distribuição do ano; ano sem nota `null` | integração | `LE/test/integracao/estatisticas.int-spec.ts` › estatísticas (integração) › GET /perfis/{usuarioId}/estatisticas (RN-08) › "o perfil devolve a distribuição do ano, ausente sem nota, e privado a respeita (RN-08)" |
| CT-STO-08 | RNF-SEC-01 | `/me/estatisticas` sem token | 401 (teste da F-STA, que agora devolve também a distribuição) | integração | `LE/test/integracao/estatisticas.int-spec.ts` › estatísticas (integração) › GET /me/estatisticas › "sem token é 401" |
| CT-STO-09 | RF-STA-04 | Web: gráfico com notas | Onze notas no eixo, contagem sobre cada uma e coluna só onde há livro | web | `WEB/components/estatisticas/GraficoDeNotas.spec.ts` › GraficoDeNotas › "onze notas no eixo, contagem sobre cada uma e coluna só onde há livro" |
| CT-STO-10 | RN-06.3 | Web: período sem nota | Não desenha gráfico, só a frase | web | `WEB/components/estatisticas/GraficoDeNotas.spec.ts` › GraficoDeNotas › "sem nota no período não desenha gráfico, só a frase" |
| CT-STO-11 | RF-STA-04, RNF-USA-03 | Web: navegação por teclado | Setas, Home e End movem; Esc fecha o balão | web | `WEB/components/estatisticas/GraficoDeNotas.spec.ts` › GraficoDeNotas › "setas movem entre as notas, Home e End vão às pontas e Esc fecha o balão" |
| CT-STO-12 | RF-STA-04 | Web: `Ver como tabela` | Lista as onze notas e fecha com o total | web | `WEB/components/estatisticas/GraficoDeNotas.spec.ts` › GraficoDeNotas › "a tabela lista as onze notas e fecha com o total" |
| CT-STO-13 | RF-STA-04, RN-08 | Web: perfil alheio sem nota no ano | O card traz a frase e nenhum gráfico | web | `WEB/views/perfil/PerfilDeOutroView.spec.ts` › PerfilDeOutroView › Estatísticas do ano (F-STA) › "sem nota no ano, o card traz a frase e nenhum gráfico" |
| CT-STO-14 | RF-STA-04 | Mobile: gráfico com notas | Onze notas no eixo, contagem em todas e coluna só onde há livro | mobile | `MOB/features/estatisticas/graficos_de_notas_test.dart` › "onze notas no eixo, contagem em todas e coluna só onde há livro" |
| CT-STO-15 | RN-06.3 | Mobile: período sem nota | Só a frase, sem gráfico nem tabela | mobile | `MOB/features/estatisticas/graficos_de_notas_test.dart` › "sem nota no período: só a frase, sem gráfico nem tabela" |
| CT-STO-16 | RNF-TST-04 | Mobile: resposta sem as onze faixas | Resposta inválida (`invalidResponse`) | mobile | `MOB/features/estatisticas/estatisticas_service_test.dart` › "distribuição que não traz as onze faixas é resposta inválida" |
| CT-STO-17 | RF-STA-04, RN-08 | Mobile: perfil de outro leitor | Histograma compacto com as notas do ano, mesmo sem leitura | mobile | `MOB/features/estatisticas/estatisticas_do_perfil_test.dart` › bloco isolado › "outro leitor: histograma compacto com as notas do ano, mesmo sem leitura" |
| CT-STO-18 | RF-STA-04 | Mobile: o próprio perfil | Não mostra o histograma | mobile | `MOB/features/estatisticas/estatisticas_do_perfil_test.dart` › bloco isolado › "o próprio perfil não mostra o histograma" |

### 3.3. Sem teste aparente (candidatos a lacuna) — dona: Ana Luiza

| # | Item | Requisito | O que procurei e onde |
|---|---|---|---|
| STO-L1 | Releitura não duplica faixa | RN-06, critério "releitura não duplica bucket" | `estatisticas.int-spec.ts`: a única releitura (linhas 400–411) é do teste de duração, sem nota; os três testes da distribuição não releem |
| STO-L2 | Web: resposta fora do contrato da distribuição (o DoD diz que web e mobile cobrem) | RNF-TST-05/06 | `WEB/services/leitura.ts` só ganhou os tipos `FaixaDeNota`/`DistribuicaoNotas`, sem validação, e não há teste dele no PR #63; só o mobile tem o caso (CT-STO-16) |
| STO-L3 | O card `Notas que você deu` montado no **painel** (`EstatisticasView` / `estatisticas_page`), entre `Médias` e `Páginas por mês` | RF-STA-04 | `WEB/views/perfil/EstatisticasView.spec.ts` e `MOB/features/estatisticas/estatisticas_page_test.dart` não mudaram no PR #63; o gráfico só é testado como componente isolado |
| STO-L4 | `total` e `notaMedia.quantidade` sem divergência sob escrita concorrente (`REPEATABLE READ`) | RF-STA-02/04 (decisão da revisão) | Nenhum teste concorrente em `estatisticas.int-spec.ts` |
| STO-L5 | Perfil **público** com notas: qualquer leitor vê a distribuição | RF-STA-04, RN-08 | `"perfil público: qualquer leitor vê só os totais do ano"` só confere `distribuicaoNotas: null` (leitor sem nota); o caso com dado é só o privado com seguidor (CT-STO-07) |
| STO-L6 | Contraste WCAG AA do gráfico; fluxo em DES | RNF-USA-03; critério de aceite | Sem teste automatizado (verificação visual/manual) |

### 3.4. Divergências e estranhezas

- **Arquivo de feature desatualizado:** o Status diz "implementado, aguardando CI" e "testes de integração escritos, ainda não rodados", e os 10 critérios de aceite e os itens de DoD de código/CI/testes estão desmarcados. Mas o PR #63 foi mergeado em 08/11/2026 com o CI verde, inclusive o `leitura`.
- `MOB/.../estatisticas_service_test.dart`: além do teste novo, a feature acrescentou asserções de distribuição a dois testes antigos ("o período vai sempre explícito, ano ou acumulado" e "média sem denominador vem nula; sem registro nenhum, `semRegistro`"), sem renomeá-los.
- Divergência de design registrada pela dona: a frase de ajuda do card (`Cada livro conta uma vez…`) foi retirada.

---

## 4. F-DSF-OPC — Histórico de janelas de desafio (CT-DSO)

> **PRÉ-LEVANTAMENTO DE PR ABERTO.** A feature **não está na `desenvolvimento`**. Ela está no PR #64 (`vicenzo-features` → `desenvolvimento`, aberto, CI verde), commits `8d7ada4`, `3198511`, `20543a3` e `05f957f` (07/11/2026). Os arquivos foram lidos por `git show origin/vicenzo-features:<caminho>`. Nomes e contagens podem mudar até o merge.

**Dono:** Vicenzo Fonseca. **RF:** RF-DSF-05, com RN-20 (1, 6, 7, 8, 9, 10) e RF-DSF-04. **Serviços:** `leitura` + **só mobile**. Web fora de escopo (`REQUISITOS.md` §2.1; coluna Web ❌), o que confirma o "mobile?" do pedido.

### 4.1. Arquivos de teste (em `origin/vicenzo-features`)

| # | Arquivo | Testes no arquivo | Da feature | Cobre |
|---|---|---|---|---|
| 1 | `LE/test/integracao/desafios.int-spec.ts` | 47 | 11 (bloco `histórico de janelas`) + 6 reusados da F-DSF | RF-DSF-05, RN-20.6/7/8/9/10, RNF-DES-02, SEC-01/02, RF-DSF-04; consumo (RNF-ERR-06/07, RNF-TST-03) pelos testes da F-DSF |
| 2 | `MOB/features/desafios/historico_do_desafio_test.dart` | 18 | 18 | textos, agrupamento, controlador paginado, serviço |
| 3 | `MOB/features/desafios/historico_do_desafio_page_test.dart` | 17 | 17 | tela: lista, cumprida × não, pausa × vazia, vazio, erros, timeout, sem rede, acessibilidade |
| 4 | `MOB/features/desafios/desafios_page_test.dart` | 23 | 2 | item `Ver histórico` no menu |
| 5 | `MOB/features/desafios/rotas_desafios_test.dart` | 5 | 2 | rota do histórico |

**Total:** 5 arquivos; **50 testes da feature** (leitura 11, mobile 39). O arquivo de feature fala em "11 casos novos", o que bate.

### 4.2. Casos previstos

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-DSO-01 | RF-DSF-05, RNF-SEC-01 | Histórico sem token; id malformado | 401; 400 | integração | `LE/test/integracao/desafios.int-spec.ts` › desafios (integração) › histórico de janelas (RF-DSF-05, F-DSF-OPC) › "sem token é 401; id malformado é 400" |
| CT-DSO-02 | RF-DSF-05, RN-20.9 | Desafio criado há alguns períodos, com janelas sem progresso | Só as encerradas, da mais recente à da criação; as vazias com zero e não cumpridas | integração | `LE/test/integracao/desafios.int-spec.ts` › desafios (integração) › histórico de janelas (RF-DSF-05, F-DSF-OPC) › "lista só as encerradas, da mais recente à da criação, com as vazias não cumpridas (RN-20.9)" |
| CT-DSO-03 | RF-DSF-05, RN-20.8 | Janela que acabou de terminar, sem fato novo | Entra pela consulta (selagem preguiçosa), sem job | integração | `LE/test/integracao/desafios.int-spec.ts` › desafios (integração) › histórico de janelas (RF-DSF-05, F-DSF-OPC) › "a janela que acabou de terminar entra pela consulta, sem outro registro" |
| CT-DSO-04 | RF-DSF-05 | Desafio sem janela encerrada | Lista vazia | integração | `LE/test/integracao/desafios.int-spec.ts` › desafios (integração) › histórico de janelas (RF-DSF-05, F-DSF-OPC) › "sem janela encerrada é lista vazia" |
| CT-DSO-05 | RF-DSF-05, RN-20.7, RN-20.10 | Editar o desafio e depois sincronizar captura offline de janela antiga | Cada janela mantém a configuração de quando valeu; a captura tardia corrige a janela antiga pelo consumidor | mensageria | `LE/test/integracao/desafios.int-spec.ts` › desafios (integração) › histórico de janelas (RF-DSF-05, F-DSF-OPC) › "cada janela mantém a configuração de quando valeu, e a captura tardia a corrige (RN-20.7/20.10)" |
| CT-DSO-06 | RF-DSF-05, RN-20.6 | Janelas com pausa inteira, parcial e nenhuma | Campo `pausa` com `inteira`, `parcial` e `nenhuma` | integração | `LE/test/integracao/desafios.int-spec.ts` › desafios (integração) › histórico de janelas (RF-DSF-05, F-DSF-OPC) › "marca a pausa por janela: inteira, parcial ou nenhuma (RN-20.6)" |
| CT-DSO-07 | RN-20.6 | Pausa ainda aberta | Cobre as janelas encerradas desde o início dela | integração | `LE/test/integracao/desafios.int-spec.ts` › desafios (integração) › histórico de janelas (RF-DSF-05, F-DSF-OPC) › "pausa aberta cobre as janelas encerradas desde o início dela" |
| CT-DSO-08 | RF-DSF-05, RNF-DES-02 | Paginação, `limite=500`, `page=0` e `limite=0` | Mais recentes primeiro; limite rebaixado a 50; 400 para 0 | integração | `LE/test/integracao/desafios.int-spec.ts` › desafios (integração) › histórico de janelas (RF-DSF-05, F-DSF-OPC) › "pagina com limite do servidor (RNF-DES-02)" |
| CT-DSO-09 | RF-DSF-05, RNF-SEC-02 | Outro leitor ou id inexistente | 404, sem materializar janela nenhuma | integração | `LE/test/integracao/desafios.int-spec.ts` › desafios (integração) › histórico de janelas (RF-DSF-05, F-DSF-OPC) › "é só do dono: de outra pessoa ou inexistente é 404, sem materializar (SEC-02)" |
| CT-DSO-10 | RF-DSF-04, RF-DSF-05 | Excluir o desafio | O histórico vai junto; a consulta passa a 404 | integração | `LE/test/integracao/desafios.int-spec.ts` › desafios (integração) › histórico de janelas (RF-DSF-05, F-DSF-OPC) › "excluir o desafio leva o histórico junto (RF-DSF-04)" |
| CT-DSO-11 | RNF-ERR-06, RNF-TST-03 | Reentrega do mesmo `eventId` ao consumidor que sela (teste da F-DSF) | Não repete efeito | mensageria | `LE/test/integracao/desafios.int-spec.ts` › desafios (integração) › consumo (RNF-ERR-06/07, RNF-TST-03) › "reentrega do mesmo eventId não repete efeito" |
| CT-DSO-12 | RNF-ERR-07, RNF-TST-03 | Falha persistente no consumidor (teste da F-DSF) | Vai para a DLQ sem recibo | mensageria | `LE/test/integracao/desafios.int-spec.ts` › desafios (integração) › consumo (RNF-ERR-06/07, RNF-TST-03) › "falha persistente vai para a DLQ sem recibo" |
| CT-DSO-13 | RF-DSF-05 | Mobile: lista de janelas | Agrupadas, com a meta de cada uma e sem porcentagem | mobile | `MOB/features/desafios/historico_do_desafio_page_test.dart` › "mostra as janelas encerradas agrupadas, com a meta de cada uma e sem porcentagem" |
| CT-DSO-14 | RF-DSF-05, RNF-USA-03 | Mobile: cumprida × não cumprida | Forma e palavra diferentes (não só cor) | mobile | `MOB/features/desafios/historico_do_desafio_page_test.dart` › "cumprido e não cumprido têm forma e palavra diferentes" |
| CT-DSO-15 | RN-20.6, RN-20.9 | Mobile: semana pausada × semana vazia | Distinguem-se só pela linha de pausa | mobile | `MOB/features/desafios/historico_do_desafio_page_test.dart` › "a semana pausada se distingue da semana vazia só pela linha de pausa" |
| CT-DSO-16 | RF-DSF-05 | Mobile: sem janela encerrada | O vazio diz quando a janela corrente fecha, sem botão | mobile | `MOB/features/desafios/historico_do_desafio_page_test.dart` › "sem janela encerrada, o vazio diz quando a corrente fecha, sem botão" |
| CT-DSO-17 | RNF-TST-06 | Mobile: timeout depois das retentativas | Erro do serviço com "Tentar de novo" | mobile | `MOB/features/desafios/historico_do_desafio_page_test.dart` › "timeout depois das retentativas é erro do serviço, com \"Tentar de novo\"" |
| CT-DSO-18 | RNF-TST-06 | Mobile: sem rede ao abrir | Aviso de sem conexão, não erro | mobile | `MOB/features/desafios/historico_do_desafio_page_test.dart` › "sem rede ao abrir: aviso de sem conexão, não erro" |
| CT-DSO-19 | RNF-TST-04 | Mobile: janela fora do contrato | Resposta inválida | mobile | `MOB/features/desafios/historico_do_desafio_test.dart` › DesafiosService.listarJanelas › "janela fora do contrato é resposta inválida" |
| CT-DSO-20 | RNF-TST-04, RNF-DES-02 | Mobile: páginas seguintes | Acumula sem repetir período e diz quando acabou | mobile | `MOB/features/desafios/historico_do_desafio_test.dart` › HistoricoDoDesafio › "acumula as páginas sem repetir período e diz quando acabou" |

### 4.3. Sem teste aparente (candidatos a lacuna) — dono: Vicenzo

| # | Item | Requisito | O que procurei e onde |
|---|---|---|---|
| DSO-L1 | O histórico independe do fuso de quem consulta | RN-20.1, critério de aceite | Bloco `histórico de janelas`: nenhum teste varia o fuso do consultante; os testes de fuso (`"fuso para trás: ..."`, `"fuso para a frente: ..."`) são da edição (F-DSF) e não chamam `GET /desafios/{id}/janelas` |
| DSO-L2 | Selagem pelo **consumidor** quando chega fato de janela posterior (sem consulta) | RN-20.8, critério "dentro do consumidor de `progresso.registrado`/`leitura.finalizada`" | CT-DSO-05 corrige janela antiga pelo consumidor, e `"um fato de hoje não refaz as janelas encerradas de outros dias"` (F-DSF) é vizinho; nenhum teste prova que o fato posterior **sela** a janela anterior sem passar pela consulta |
| DSO-L3 | Exclusão de conta limpa o histórico | critério "a exclusão de conta o limpa por F-CONTA-2" | Só a guarda estrutural (`LE/test/integracao/guarda-exclusao.int-spec.ts`, tabelas com destino na exclusão); `consumo-conta-excluida.int-spec.ts` não cita desafio nem `janela_desafio` |
| DSO-L4 | Fluxo em DES | critério de aceite / DoD | Pendente: PR aberto, merge de fechamento |

### 4.4. Divergências e estranhezas

- **PR aberto:** o arquivo de feature na `desenvolvimento` é a versão anterior (sem as seções de implementação). Esta análise usou a versão da `vicenzo-features`.
- **Teto da paginação:** o arquivo diz "`page` e `limite` fora da faixa são 400", mas o teste mostra que `limite=500` é **rebaixado a 50** (200), e só `page=0` e `limite=0` dão 400. O comportamento é coerente com "teto 50 no servidor"; o texto é que generaliza.
- Duplicata, retry e DLQ do histórico **não** têm teste próprio: o DoD declara o reuso dos testes da F-DSF no mesmo consumidor (CT-DSO-11 e 12).
- O critério "nenhuma tabela nova" é verificável pelo diff do PR (sem migration), não por teste.
