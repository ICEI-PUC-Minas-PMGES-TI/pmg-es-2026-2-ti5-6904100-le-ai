# F-MOD-OPC — Suspensão de conta

**Período:** 3 · **Prioridade:** opcional
**Dono:** Renato Douglas · **Serviços afetados:** `social` (painel e auditoria) + `identidade` (efeito na conta) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.11 (RF-MOD-04, com RF-MOD-05 de auditoria), §4 (ator Administrador). Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §4.2, §7. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Dar à moderação a única sanção que atinge o **autor**, e não apenas o conteúdo: remover uma resenha resolve um caso, suspender resolve um padrão. Fecha o requisito **Opcional**:

- **RF-MOD-04** o administrador suspende e reativa a conta; suspensão oculta perfil e conteúdo de terceiros preservando os dados.

A suspensão fecha a escada de moderação de [F-MOD](../periodo-2/feature-F-MOD.md): arquivar → remover conteúdo → **suspender a conta**. É a mesma fronteira cross-service já enfrentada lá — o painel vive em `social`, o efeito vive em `identidade` —, resolvida pelo **mesmo padrão**: comando autenticado ao serviço dono, que revalida e aplica; `social` não escreve no schema `identidade` (arquitetura §4.2). Toda ação entra no log de auditoria de **RF-MOD-05**, já entregue por F-MOD.

RNF atendidos: **RNF-SEC-04** (operação restrita ao administrador, verificada no servidor), **RNF-SEC-30** (revogação de sessão), **RNF-SEC-35/37** (log de ação de moderação, consultável), **RNF-SEC-36** (sem dado sensível excedente no log), **RNF-ERR-04** (comando idempotente), **RNF-USA-04** (confirmação em ação destrutiva), **RNF-USA-05** (mensagem pt-BR sem detalhe técnico).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | implementado, aplicado no dev (06/11/2026) | migrations `V20261105120000__suspensao_de_conta` (`identidade`: `suspenso_em`, `reativado_em`, CHECK e VIEW `v_conta_moderacao_v1`) e `V20261105120000__auditoria_de_conta` (`social`: CHECK e índice único das linhas de conta em `log_moderacao`); `MODERACAO_TOKEN` no `leai-identidade` a cadastrar no Render |
| Backend | implementado, em revisão no [PR #61](https://github.com/ICEI-PUC-Minas-PMGES-TI/pmg-es-2026-2-ti5-6904100-le-ai/pull/61) | `identidade`: `/internal/moderacao/usuarios/{id}/suspensao` e `/reativacao`, 403 `CONTA_SUSPENSA` em login, renovação e pedido de exclusão; `social`: `/admin/usuarios/{id}/suspender` e `/reativar`, auditoria, ocultação de comentários e notificações |
| Web | implementado, em revisão no PR #61 | suspender e reativar no painel (pela denúncia e pela linha vigente do registro), etiqueta, faixa, registro com o motivo; logout com banner e banner no login |
| Mobile | implementado, em revisão no PR #61 | **sem painel**; logout uma vez na renovação negada, banner de conta suspensa no login |

## Especificação

### Backend / API — `social` (painel e auditoria)

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas).

- **`POST /admin/usuarios/{id}/suspender`** (RF-MOD-04) — **restrito ao administrador, verificado no servidor** (SEC-04; a conta admin é fixa e única, vem de [F-AUT](../periodo-1/feature-F-AUT.md)/RF-AUT-08). Aceita **motivo** para a auditoria. `social` **não** grava em `identidade`: envia o comando autorizado ao serviço dono e só registra a auditoria **após a confirmação**, sem estado local otimista.
- **`POST /admin/usuarios/{id}/reativar`** — operação simétrica aprovada em RF-MOD-04 (v1.5), com as mesmas restrições e auditoria; restaura a visibilidade conforme a privacidade vigente.
- **Auditoria (RF-MOD-05, SEC-35/37):** suspensão e reativação gravam em `log_moderacao` (admin, alvo, ação, motivo, timestamp), sem dado sensível excedente (SEC-36), consultáveis pelo `GET /admin/moderacao/logs` já existente em [F-MOD](../periodo-2/feature-F-MOD.md).
- **Idempotência:** suspender conta já suspensa (ou reativar conta ativa) responde sucesso sem segunda escrita e **sem** segunda linha de auditoria.
- **Alcance:** a suspensão é a única ação de moderação sobre a **conta**. Não denuncia-se um perfil (RF-MOD-01 cobre só resenhas e comentários) — a suspensão parte da avaliação do admin sobre denúncias de conteúdo já existentes.

### Backend / API — `identidade` (efeito)

- **Aplicar a suspensão:** marca a conta como suspensa e **revoga os refresh tokens ativos** (SEC-30); o access token remanescente expira no seu prazo curto. O comando **revalida a autorização** — conhecer o endpoint interno não basta —, é **idempotente** e devolve confirmação para que `social` audite.
- **Efeito no acesso (RF-MOD-04):** conta suspensa **não autentica** — login e renovação de token são negados com mensagem pt-BR clara, sem detalhe técnico (RNF-USA-05) e sem revelar informação que ajude a enumerar contas. A recuperação de senha não contorna a suspensão.
- **O que a suspensão NÃO faz:** não apaga conteúdo (remoção é o fluxo de [F-MOD](../periodo-2/feature-F-MOD.md)), não exclui a conta (isso é [F-CONTA-2](../periodo-2/feature-F-CONTA-2.md)/RF-AUT-07) e não desfaz seguidores. É bloqueio de acesso, e é reversível pela reativação.
- **Visibilidade aprovada:** perfil, resenhas, atividades, comentários, listas e demais conteúdos da conta suspensa ficam ocultos aos demais leitores, inclusive em snapshots, notificações e sugestões. Consultas/entregas revalidam o estado por contrato; reativar restaura a visibilidade sob RN-08. Não apagar conteúdo nem marcar permanentemente atividades como inativas por suspensão.

**Modelo de dados:** em `identidade`, o campo de suspensão em `usuario`, já previsto no DER como item do Período 3. Em `social`, **nenhuma tabela nova** — reusa `log_moderacao` de [F-MOD](../periodo-2/feature-F-MOD.md).

**Contratos:** as VIEWs públicas de identidade omitem contas suspensas. O painel consulta o alvo também suspenso por `GET /interno/usuarios/{id}/moderacao`, autorizado ao administrador e exposto por identidade. Comandos `POST /interno/usuarios/{id}/suspender` e `/reativar` aplicam a mudança e retornam estado/id para auditoria em social; todos revalidam autorização e idempotência. Rotas ilustrativas, a versionar nos specs ao implementar, sem acesso a tabelas cruas.

**Eventos:** **nenhum**. A ação administrativa usa o comando HTTP interno já adotado por [F-MOD](../periodo-2/feature-F-MOD.md), coerente com o escopo enxuto do período: não se cria evento para uma operação que precisa de resposta imediata ao administrador.

### Frontend Web (`code/front`)

- **Ação de suspender/reativar** no painel de moderação, a partir de uma denúncia ou do perfil do leitor, com **confirmação explícita** (RNF-USA-04) e campo de motivo. O estado suspenso é visível no painel e no log. Guarda de rota **não substitui** a verificação server-side. Usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md).

### App Flutter (`code/mobile`)

- **Não expõe painel** de moderação (é web, como em [F-MOD](../periodo-2/feature-F-MOD.md)). O que o mobile faz é **tratar a própria sessão suspensa**: negação do servidor na renovação ou em qualquer chamada autenticada leva a mensagem pt-BR clara e **logout**, sem estado inconsistente nem loop de retentativa. `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md). Alvo de demonstração Android.

## Critérios de aceite

Evidência de 05 e 06/11/2026: testes automáticos (`identidade` 233, `social` 274, web 1064, mobile 897) e teste manual local contra o banco de dev (web no Edge em 1440 e 390 px, claro e escuro; app no emulador `Pixel_8_API_35`).

- [x] Suspender e reativar são **restritos ao administrador**, verificados no servidor; não-admin recebe negação (RF-MOD-04, SEC-01/04). `/admin/**` exige o papel no `social` (leitor 403, também no manual), e o `identidade` revalida o JWT repassado (`SuspensaoDeContaIntegracaoTest.autorizacaoEmCamadas`, `SuspensaoComAdminIntegracaoTest`).
- [x] `social` **não escreve** no schema `identidade`: o efeito ocorre por comando autorizado ao serviço dono, que **revalida** (§4.2). Comando HTTP com `X-Moderacao-Token` mais o JWT do admin; o `social` só lê a VIEW `v_conta_moderacao_v1`.
- [x] Conta suspensa **não autentica** e tem os refresh tokens **revogados**; a sessão ativa cai ao expirar o access token (SEC-30). Login 403 só com a senha certa, renovação 403 (também com o token revogado, sem alarme de reuso), reset de senha não contorna; no manual, web e app saíram na renovação seguinte.
- [x] Suspensão oculta perfil/conteúdo aos demais leitores sem apagar; reativação restaura acesso/visibilidade sob RN-08. Painel autorizado consegue localizar e reativar conta suspensa. Manual: B deixou de ver perfil, feed, atividade, resenha no livro e no perfil e a thread do comentário, e voltou a ver tudo depois da reativação feita pela linha do registro com a denúncia já arquivada. Comentários e notificações em `OcultacaoDeContaSuspensaIntegracaoTest`.
- [x] Suspender conta já suspensa é **idempotente** e não gera segunda linha de auditoria (RNF-ERR-04). Repetição, dois cliques e retentativa depois de timeout caem no mesmo episódio (`SuspensaoDeContaIntegracaoTest`); no manual, suspender de novo com outra chave manteve uma linha.
- [x] Toda suspensão/reativação aparece no `GET /admin/moderacao/logs` com autor, alvo, ação, motivo e timestamp, sem dado sensível excedente (RF-MOD-05, SEC-35/36/37). O motivo aparece só nas linhas de conta.
- [x] A ação pede **confirmação** no cliente antes de executar (RNF-USA-04). Dialog com motivo obrigatório (`DialogoSuspensao.spec.ts`, manual).
- [x] Mensagem ao leitor suspenso é pt-BR, clara e sem detalhe técnico, e não permite enumerar contas (RNF-USA-05). Copy do design; senha errada continua a mensagem única (teste e manual).
- [x] O mobile de um leitor suspenso faz **logout** com mensagem, sem loop de retentativa (`session_controller_test.dart`, manual no emulador).
- [ ] Suspensão e reativação funcionam **em DES**. Depois do merge na `main`, com os segredos no Render.

## Definition of Done

(plano §10)

- [ ] Código (backend `social` + efeito em `identidade`, web, tratamento no mobile) mergeado em `desenvolvimento`. Está no [PR #61](https://github.com/ICEI-PUC-Minas-PMGES-TI/pmg-es-2026-2-ti5-6904100-le-ai/pull/61), aguardando a revisão.
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md)). Conferir no PR antes do merge.
- [x] Testes unitários e de integração com banco real/container: autorização admin, negativa para não-admin, suspensão bloqueando login e renovação, revogação de refresh tokens, idempotência, reativação e registro de auditoria (RNF-TST-02). `SuspensaoDeContaIntegracaoTest`, `SuspensaoSemTokenIntegracaoTest` e `SuspensaoComAdminIntegracaoTest` no `identidade`; `SuspensaoDeContaIntegracaoTest` e `OcultacaoDeContaSuspensaIntegracaoTest` no `social`, em Postgres 17 descartável.
- [x] Teste do comando cross-service cobre autorização, revalidação em `identidade`, repetição idempotente e falha **sem** estado local falso em `social` (RNF-TST-02). O `identidade` simulado (`IdentidadeSimulada`) num `HttpServer` do JDK: timeout, retentativa, 503, 404, 422 e 403.
- [x] Testes web/mobile: web cobre a ação com confirmação e o log; mobile cobre a sessão suspensa levando a logout; ambos tratam indisponibilidade/timeout com API simulada (RNF-TST-04/05/06). `DialogoSuspensao.spec.ts`, `PainelModeracaoView.spec.ts`, `renovacao.spec.ts`, `session.spec.ts` e `LoginView.spec.ts`; `session_controller_test.dart`, `login_page_test.dart` e `sessao_test.dart`.
- [x] **Specs OpenAPI**: `docs/api/social.yaml` com as ações de suspensão/reativação do painel; `docs/api/identidade.yaml` com o comando autorizado e o efeito na autenticação (validado pelo `ContratoHttp` nos testes do `identidade`).
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)). Depois do merge na `main`.
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver (Pendências)

**Item próprio** (cumprido, com a divergência registrada nas Pendências): fixar com `identidade` **um único contrato** de ação administrativa sobre a conta (autorização, revalidação, retorno idempotente e auditoria em `social`), reaproveitando o desenho que [F-MOD](../periodo-2/feature-F-MOD.md) já fechou para a remoção de resenha — não dois padrões diferentes para o mesmo problema.

## Pendências

### Implementação de 05 e 06/11/2026 (Renato)

Plano em [`renato-periodo-3/plano-F-MOD-OPC.md`](renato-periodo-3/plano-F-MOD-OPC.md), com as decisões do dono 1 a 13 de 05/11/2026. Ratificadas ali as propostas do design que estavam "a ratificar" abaixo: motivo obrigatório também na reativação (até 500 code points); suspender não resolve as denúncias; no login, a suspensão prevalece sobre a exclusão pendente; o admin no app vê `Perfil não encontrado`; o registro mostra só o motivo do admin (RNF-SEC-36).

**Divergências (registradas e aceitas pelo dono no plano):**
- Leitura da conta pelo painel por VIEW nova, `identidade.v_conta_moderacao_v1` (inclui as suspensas, omite a exclusão pendente), no lugar do `GET /interno/usuarios/{id}/moderacao` ilustrado acima. Os comandos continuam HTTP.
- Rotas internas em `/internal/moderacao/usuarios/{id}/suspensao` e `/reativacao`, no padrão do `leitura`, e não `/interno/...`.
- O motivo vai em `log_moderacao.detalhe`, que existia e nunca era preenchida: sem coluna nova.
- **Item próprio do DoD:** o contrato reaproveita o da F-MOD (`X-Moderacao-Token`, timeout e retentativa, auditoria só depois da confirmação), com duas diferenças: o JWT do admin vai repassado junto (só o segredo não basta) e a idempotência no `identidade` é pelo estado, sem recibo, porque um recibo por alvo devolveria um episódio velho depois de suspender, reativar e suspender de novo.
- Logout forçado na web igual ao mobile, com o banner `Sua sessão foi encerrada porque esta conta foi suspensa.`, sem artboard (decisão 6).
- Reativar também pela ação `Reativar conta` na linha da suspensão vigente do registro, sem artboard (decisão 10): é o caminho que sobra quando a denúncia já foi resolvida.
- Perfil web do admin (feito em 06/11, depois do corte da decisão 10): o `DotsThree` de moderação fica no topo do conteúdo, alinhado à direita, e não no header, porque o `Voltar` mora no shell. A visão da conta suspensa usa `GET /admin/usuarios?username=` (VIEW da moderação), e `Conta de @x` no registro virou link.
- Menção a conta suspensa: o `@username` vira "um leitor" no texto, sem link, em vez de sumir; volta na reativação.
- No mobile, dentro dos 15 minutos do token de acesso, o `leitura` responde 403 às escritas, e o logout só vem na renovação seguinte.
- Na mesma janela de 15 minutos, o `identidade` (seguir, pedir para seguir) e o `social` (comentar, curtir, mencionar, recomendar) não barram as escritas da conta suspensa: o conteúdo novo já nasce oculto, e as notificações a terceiros saem com "Um leitor", sem link. Aceito na revisão de 06/11/2026, em vez de barrar as escritas no código do Henrique e do Kayke.
- O 403 `CONTA_SUSPENSA` do pedido de exclusão não ganhou tratamento novo na web (decisão 13). No mobile, desde a revisão de 06/11/2026, ele encerra a sessão pela suspensão (`aoContaSuspensa`), em vez de mostrar "Verifique sua conexão".
- A ordem da etapa 3 do prompt mudou: a validação de contexto limpo e o teste manual rodaram em paralelo à revisão do PR (decisão 9).

**Débitos:** fechados em 06/11/2026 (perfil web do admin; curtidas, reações e seguidores/seguidos sem a conta suspensa; menção mascarada; aviso de leitura descartada no app; renovações revogadas apagadas na reativação, sem alarme de reuso; menu com o desenho do design, 280px e tons). Fica só a nota dos leitores, que continua contando a conta suspensa (decisão 4, de propósito).

**Código de outras pessoas** (nota datada nos `AGENTS.md` de cada um e lista no PR):
- Henrique (`identidade`): migration, `ServicoDeAutenticacao`, `AutenticacaoController`, `ServicoDeExclusaoDeConta`, `CodigoErro`, `AppProperties`, `ContaAdministradora`, `Usuario`, `SeedDeIdentidade`, `application.yml`, `.env.example`, pacote novo `moderacao/` e três testes que gravavam `suspenso` por SQL; no `social`, um caso em `ConsumidorDeContaExcluidaIntegracaoTest`; nos clientes, `session.ts`, `services/renovacao.ts`, `router/index.ts`, `LoginView.vue`, `ui/AvisoFlutuante.vue` (prop `icone`), `session_controller.dart` e `login_page.dart`.
- Kayke (`social`): `ComentarioRepository`, `ServicoDeInteracao`, `ServicoDeFeed`, `RedacaoDeNotificacao`, `NotificacaoRepository`, `ServicoDeNotificacao`, `MassaDeRecomendacao` e dois testes ajustados às assinaturas novas.
- Ana: `features/sessao/sessao_controller.dart` passou a avisar a leitura descartada na suspensão (06/11), com testes em `sessao_test.dart`.
- Henrique, em 06/11: `UsuarioRepositorio`, `PerfilResposta`, `ServicoDePerfil` (contadores), `ServicoDeSuspensao` e, no web, `PerfilDeOutroView.vue`. Kayke: `CurtidaAtividadeRepository`. Leitura: migration `0007` (VIEW `v_resenha_publicacao_v1`) e as contagens de reação. Grupo: `ui/MenuDeAcoes.vue` e `ui/FolhaAcoes.vue`.
- Grupo: `render.yaml` (`MODERACAO_TOKEN` no `leai-identidade`, `IDENTIDADE_BASE_URL` no `leai-social`).
- Revisão de 06/11/2026 — Henrique: migration `V20261106130000__data_da_revogacao` (`refresh_token.revogado_em`), `GestorDeRenovacao`, `ServicoDeAutenticacao` (trava `FOR SHARE` em `entrar` e `renovar`), `UsuarioRepositorio`, `GlobalExceptionHandler`, `docs/api/identidade.yaml`; no web, `session.ts`, `LoginView.vue` e `PerfilDeOutroView.vue`; no mobile, `excluir_conta_page.dart` (F-CONTA-2). Kayke: `ServicoDeInteracao.editar` e `ResolvedorDeMencoes`. Grupo: `ui/SobreposicaoModal.vue` (prop `idDaDescricao`). Acervo: a frase das contagens em `docs/api/acervo.yaml`.

**Render:** `MODERACAO_TOKEN` com o mesmo valor no `leai-identidade`, `leai-social` e `leai-leitura`, cadastrado em 06/11 pelo MCP; os três redeploys ficaram `live`. As migrations rodam no deploy quando o código chegar na `main`.

### Histórico (antes da implementação)

- **Telas (design P3):** lote 3, prompt de edição escrito em 11/10/2026: [`perfil-de-outro-leitor.md`](../../design/periodo-3/perfil-de-outro-leitor/perfil-de-outro-leitor.md) ([protótipo](../../design/periodo-3/perfil-de-outro-leitor/prototipos/perfil-de-outro-leitor.html)) (web, `DotsThree` de moderação no header só para o admin, dialog `Suspender conta` com motivo obrigatório até 500 caracteres, espera, falha, visão do admin da conta suspensa com `Reativar conta`; para os demais leitores, W+M, a conta suspensa é o `Perfil não encontrado` já existente). Lote 4, prompts escritos em 11/10/2026: [`painel-de-moderacao.md`](../../design/periodo-3/painel-de-moderacao/painel-de-moderacao.md) ([protótipo](../../design/periodo-3/painel-de-moderacao/prototipos/painel-de-moderacao.html)) (web, `DotsThree` da conta do autor no detalhe da denúncia, o mesmo dialog, autor suspenso na fila e no detalhe, linhas de conta no registro com o motivo do admin) e [`login.md`](../../design/periodo-3/login/login.md) ([protótipo](../../design/periodo-3/login/prototipos/login.html)) (W+M, banner `Conta suspensa` só depois de credenciais corretas, sessão encerrada por suspensão no mobile). A ratificar também: suspender não resolve a denúncia; suspensão prevalece sobre exclusão pendente no login; logout forçado na web declarado sem artboard. Contrato a confirmar também: marca de autor suspenso no payload da denúncia. A ratificar: motivo obrigatório também na reativação; admin no app vê `Perfil não encontrado`. **Motivo no registro, decidido em 11/10/2026 (Henrique, a ratificar pelo dono):** o registro de auditoria mostra só o motivo do admin na suspensão e na reativação; motivo de denúncia e conteúdo removido continuam fora (RNF-SEC-36). Hoje `log_moderacao` não tem coluna de motivo: a migration desta feature precisa acrescentá-la. Contratos a confirmar: `GET /interno/usuarios/{id}/moderacao` com identidade, data, hora e motivo; data e hora na resposta de suspender. Protótipos exportados em 21/10/2026.
- **Depende de** [F-MOD](../periodo-2/feature-F-MOD.md) (painel, log de auditoria e o padrão cross-service), [F-AUT](../periodo-1/feature-F-AUT.md) (conta admin, refresh tokens, logout), [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (`v_perfil_referencia_v1`), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md).
- **Padrão cross-service já fechado:** [F-MOD](../periodo-2/feature-F-MOD.md) adotou **comando HTTP interno autenticado e idempotente** para a remoção de resenha, em vez de evento ou saga — um comando administrativo precisa de resposta. F-MOD-OPC segue esse mesmo padrão, sem repropô-lo.
- **Decisões encerradas em 15/09/2026:** conteúdo suspenso oculto, reativação permitida. Implementar/versionar o contrato HTTP administrativo descrito acima e testar ocultação também em snapshots/notificações; especificação não significa endpoint implementado.
- **Compartilha `social`** com as demais features sociais e **`identidade`** com [F-AUT](../periodo-1/feature-F-AUT.md)/[F-CONTA-2](../periodo-2/feature-F-CONTA-2.md) — sinalizar no grupo antes de mexer (plano §6).
- Stack definida (arquitetura §2.1): `social` e `identidade` em Spring.

## Timeline

### Revisão 06/11/2026: a feature inteira (`7411f07..HEAD`) revisada por cinco agentes de contexto limpo (`identidade`, `social`, `leitura`/`acervo`, web, mobile). Nenhum achado alto. Os quatro médios foram corrigidos com teste: (1) a VIEW `v_resenha_publicacao_v1` do `leitura` depende de `identidade.v_perfil_referencia_v1` no próprio banco, agora documentado com as armadilhas nos dois `AGENTS.md` e nos `x-database-contracts`; (2) o admin via "Perfil não encontrado" quando a consulta da moderação falhava; (3) a reativação apagava todas as renovações revogadas da conta, e agora apaga só as que a suspensão revogou (migration `V20261106130000`, aplicada no banco de dev em 06/11/2026); (4) editar comentário apagava a menção a conta suspensa. Também corrigidos: corrida login/renovação × suspensão (trava `FOR SHARE`), contadores do próprio suspenso, 503 sem `MODERACAO_TOKEN` logado como erro, 400 das rotas internas no contrato, banner de suspensão sumindo com campos vazios e 403 do pedido de exclusão no app, foco e descrições de acessibilidade no diálogo, banner de suspensão por URL na web, resposta atrasada no perfil web, comentários desatualizados e testes que faltavam (`MODERACAO_TOKEN` curto, contadores, filtros do `leitura`, navegação do logout forçado no app). Ficaram de propósito: a busca do admin por username com `lower()` (mesmo padrão de `PerfisDeReferencia`, com a massa de teste em `text`, e ação rara), o motivo só com espaço não separável (o mesmo `strip()` da denúncia, e os clientes já recusam). Testes: `identidade` 239, `social` 278, `leitura` 290 + 361, web 1078, mobile 903.

### Débitos 06/11/2026: fechados os débitos da feature, com testes (`OcultacaoDeContaSuspensaIntegracaoTest`, `SuspensaoDeContaIntegracaoTest` do `identidade` e do `social`, `reacao.int-spec.ts`, `PerfilDeOutroView.admin.spec.ts`, `login_page_test.dart`, `sessao_test.dart`). Migration `0007` do `leitura` aplicada no banco de dev com o OK do dono.

### Validação 06/11/2026: quatro validadores de contexto limpo (`identidade`, `social`, web, mobile), sem achado importante. Os menores foram corrigidos com teste no commit `fix`: timeout de conexão sem retentativa nos dois clientes do `social`, motivo com U+0000 suspendendo sem log, ícone do toast, contador do motivo, foco ao cancelar, alinhamento do registro, fila a 390px, banner repetido ao recarregar o login e dois banners no app. Migrations aplicadas no banco de dev com o OK do dono. Teste manual completo do roteiro do plano: web no Edge (1440 e 390 px, claro e escuro), app no emulador, `identidade` parado sem auditoria falsa e reativação pelo registro.

### Implementação 05/11/2026: backend (`identidade` e `social`), web e mobile em dois commits na `renato-features`, e o [PR #61](https://github.com/ICEI-PUC-Minas-PMGES-TI/pmg-es-2026-2-ti5-6904100-le-ai/pull/61) para a `desenvolvimento`. Testes: `identidade` 233, `social` 273, web 1063, mobile 897.

### Planejamento 05/11/2026: [plano](renato-periodo-3/plano-F-MOD-OPC.md) revisado em duas rodadas de contexto limpo (15 + 9 achados), com as decisões do dono 1 a 13.

### Revisão 15/09/2026: grupo aprovou ocultação e reativação; consulta administrativa do alvo separada das VIEWs públicas filtradas. Planejamento e DER atualizados; implementação não iniciada.

### Revisão 01/09/2026: alinhado ao passe de consistência — o padrão cross-service deixou de ser tratado como aberto, já que F-MOD o fechou como comando HTTP interno autenticado/idempotente; permanece pendente apenas o contrato específico de suspensão, que `docs/4.modelagem.md` ainda lista.

### Criação 01/09/2026: arquivo criado a partir do escopo de F-MOD-OPC no [periodo-3/README.md](README.md) e de RF-MOD-04 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.11, reusando o padrão cross-service e o log de auditoria de F-MOD. Suspensão fixada como bloqueio de acesso com revogação de sessão, sem remover conteúdo nem excluir conta; reativação incluída como extensão mínima e sinalizada como tal; a visibilidade do conteúdo de conta suspensa ficou como pendência do grupo.
