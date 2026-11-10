# F-REC-ALG — Recomendação algorítmica + descarte em lote

**Período:** 3 · **Prioridade:** opcional
**Dono:** Henrique Carvalho · **Serviços afetados:** `social` (backend) + `acervo` (VIEW) + `identidade` (opt-out) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.13 (RF-REC-08..12, 17), RN-08, RN-15, RN-21, RN-22.12/13, §10.7, §10.8. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §2.2, §3.2 (ajuste 3), §4.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar a **segunda fonte de recomendação** — a algorítmica — na aba que [F-REC-P2P](../periodo-2/feature-F-REC-P2P.md) já construiu, e fechar a última via de remoção de RN-22. Fecha os requisitos **Opcionais**:

- **RF-REC-08** sugerir livros **semelhantes aos que o leitor está lendo**, por atributos do acervo;
- **RF-REC-09** sugerir livros **a partir das leituras de quem o leitor segue**, respeitando RN-08;
- **RF-REC-10** **excluir** das sugestões livros já na estante e livros pessoais de terceiros;
- **RF-REC-11** exibir **o motivo** de cada sugestão;
- **RF-REC-12** **descartar** uma sugestão, que **não reaparece**;
- **RF-REC-17** oferecer o **descarte em lote** das demais recomendações P2P de um livro (RN-22.12/13).

**Decisão herdada de §10.7, não renegociada aqui: as sugestões são calculadas em tempo de consulta.** Não há grafo de similaridade materializado, tabela de arestas, job de recálculo nem invalidação de cache. O documento registra explicitamente que o sistema **não tem pretensão de escalar** além do uso previsto, e o ganho da alternativa só apareceria em volumes que ele não alcança. A única tabela nova é o registro de descarte de sugestão, exigido por RF-REC-12.

RNF atendidos: **RNF-SEC-02/03** (propriedade e privacidade verificadas no servidor), **RNF-SEC-06** (livro pessoal de terceiro fora de superfície de descoberta), **RNF-DES-02** (listagens paginadas com limite do servidor), **RNF-DES-03** (consultas apoiadas nos índices já exigidos), **RNF-ERR-04** (idempotência de escrita), **RNF-ERR-09** (cold start do Render tratado como carregamento).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | implementado | 09/11/2026: `sugestao_descartada` e `v_livro_recomendacao_v1` já existiam desde o DER; entrou a VIEW `v_livro_autor_recomendacao_v1` no `acervo` (migration `0007_20261109120000_view_autor_recomendacao`, revisar antes de aplicar). Sem migration no `social` nem no `identidade`. Falta aplicar em dev e DES |
| Backend | implementado | 09 e 10/11/2026. `social`: `GET /recomendacoes/sugestoes`, `POST /recomendacoes/sugestoes/{livroId}/descartar`, `GET /recomendacoes/recebidas/restantes`, `POST /recomendacoes/descartar-lote` (`SugestaoRepository`, `ServicoDeSugestao`, `SugestaoController`; 8 testes de integração). `identidade`: `optOutRecomendacao` em `GET /me/perfil` e `PATCH /me/perfil` (2 testes). Suítes completas dos três serviços verdes em Postgres local. Falta o fluxo em DES |
| Web | não iniciado | próxima etapa: seção algorítmica em `DescobrirView.vue`, pergunta de lote em `RecomendacoesRecebidasView`, switch em `ConfiguracoesView.vue` |
| Mobile | não iniciado | depois da web: `descobrir_page.dart`, `recomendacoes_recebidas_page.dart`, Configurações |

## Especificação

### Backend / API — `social`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas). A recomendação algorítmica é hospedada em `social` (arquitetura §3.2, ajuste 3), lendo VIEWs de `leitura`, `identidade` e `acervo` — **nunca** tabela crua de outro schema (§4.2).

- **`GET /recomendacoes/sugestoes?page=`** (RF-REC-08/09/10/11) — retorna as sugestões em **duas seções rotuladas**, paginadas e com **limite fixo** de resultados por seção (RNF-DES-02):

  | Seção | Origem do sinal | Consulta (§10.7) |
  |---|---|---|
  | **Quem você segue leu** | leituras **concluídas** por leitores que o usuário segue, com nota alta | junção entre `v_seguimento_aceito_v1`, `v_estante_publica_v1` e `v_nota_publicacao_v1`, com **piso mínimo de leitores** e **de nota média** |
  | **Do seu gosto** | assuntos, autores e séries mais frequentes na estante do leitor | junção entre a estante do leitor (`v_estante_publica_v1`) e `v_livro_recomendacao_v1` por assunto (RN-21), autor e série |

  Os pisos mínimos (quantidade de leitores e nota média) são **parâmetros de configuração**, não constantes espalhadas na consulta, para que o grupo os calibre na massa de DES sem alterar código.
- **Motivo (RF-REC-11)** — cada item carrega o motivo que o originou: `"N pessoas que você segue leram"` na primeira seção; `"Você lê muito <assunto>"` / `"Do mesmo autor de <livro da estante>"` / `"Continuação de <série>"` na segunda. O motivo é **derivado da mesma consulta que gerou a sugestão**, não recomputado depois, para não divergir do critério.
- **Exclusões, aplicadas nas duas seções (RF-REC-10):**
  - livro **já presente na estante** do leitor, em **qualquer status** (`v_estante_publica_v1`);
  - **livro pessoal** — de terceiros por ser inacionável (RN-15, §10.7) e por ficar fora de qualquer superfície de descoberta (SEC-06); o filtro usa `v_livro_referencia_v1` (`tipo`);
  - **sugestões já descartadas** pelo leitor (RF-REC-12).
- **`POST /recomendacoes/sugestoes/{livroId}/descartar`** (RF-REC-12) — grava `sugestao_descartada` com **unicidade por `(usuario, livro)`**, tornando a operação naturalmente idempotente; o livro **não reaparece** em nenhuma das duas seções. Exclusivo do próprio leitor (SEC-02); repetir o descarte não é erro.
- **`POST /recomendacoes/descartar-lote`** (RF-REC-17, RN-22.12) — **descarte em lote das recomendações P2P** de um livro: recebe `livroId` e remove **todas as recomendações daquele livro recebidas pelo autenticado**, convergindo para a mesma operação de remoção de [F-REC-P2P](../periodo-2/feature-F-REC-P2P.md) (§10.8: as quatro vias de remoção são a mesma operação). Restrito ao **destinatário** (SEC-02), **sem** avisar os remetentes (RN-22.11), **sem** restauração (RN-22.14) e idempotente (lote já vazio responde sucesso).

**Gatilho e supressão (RN-22.12/13):** a pergunta é oferecida ao terceiro descarte individual do mesmo livro **na sessão corrente**, havendo recomendações restantes. O servidor informa quantas restam; contador e supressão vivem apenas no cliente. Fechar/reabrir zera ambos: são necessários três novos descartes para voltar a perguntar. Reenvio da mesma operação não incrementa o contador duas vezes.

**Privacidade (RN-08, §10.7).** O sinal social considera **apenas leitores que o usuário segue com solicitação aceita**, o que satisfaz RN-08 por construção. A contagem exibida no motivo exige a mesma verificação, e **identificar quem leu** está sujeito a RN-08 — perfil privado não é exposto por atribuição de sugestão. A verificação ocorre no servidor, a cada consulta, e não em estado copiado.

**Opt-out aprovado:** `identidade` persiste `opt_out_recomendacao`; esta feature estende GET/PUT do próprio perfil e configurações web/mobile. O contrato de perfil expõe o campo para social excluir essas leituras de sinal, contagem e atribuição das sugestões alheias. Suspensão/exclusão pendente também excluem o sinal. Opt-out não altera a visibilidade normal do perfil nem as sugestões recebidas pelo próprio leitor.

**Contrato novo a fechar nesta feature:** **`v_livro_recomendacao_v1`**, exposta e mantida por **`acervo`** (§4.2), com **livro oficial** (id, título, autor de exibição, capa resolvida, estado ativo), **série** e **assuntos normalizados** (RN-21). É a única via pela qual `social` alcança os atributos de catálogo necessários à seção "Do seu gosto"; o DER e `docs/4.modelagem.md` §4.2 já a preveem para o Período 3 e mandam **fechar o contrato aqui, antes da migration**. A view **não** expõe livro pessoal.

**VIEWs consumidas:** `v_livro_recomendacao_v1` (acervo, nova), `v_livro_referencia_v1` (acervo), `v_estante_publica_v1` e `v_nota_publicacao_v1` (leitura), `v_seguimento_aceito_v1` e `v_perfil_referencia_v1` (identidade). `social` não lê tabelas cruas.

**Eventos:** **nenhum**. Coerente com o escopo enxuto do período: produtor e efeito estão no mesmo serviço, e o requisito não exige mensageria. A recomendação algorítmica não notifica (só a P2P notifica — RF-REC-02).

**Modelo de dados** (schema `social`): `sugestao_descartada` (usuário, livro, quando foi descartada), com **unicidade `(usuario_id, livro_id)`** e índice que serve à exclusão nas duas consultas. Nenhuma outra tabela — em particular, **nenhuma** estrutura derivada de similaridade (§10.7).

**Aba unificada (RF-REC-13/14, fechados em F-REC-P2P):** esta feature **preenche a seção algorítmica** da shell já construída. A aba continua funcionando se as sugestões estiverem vazias — a seção some, a P2P permanece.

### Frontend Web (`code/front`)

- **Seção algorítmica da aba Recomendações**, com as duas subseções rotuladas, o **motivo** visível em cada item e a ação **descartar**. Item descartado sai da lista sem recarregar a aba inteira. A **pergunta de descarte em lote** aparece conforme RN-22.12 e sua recusa é suprimida **na sessão do cliente** (RN-22.13). Cold start tratado como carregamento prolongado (RNF-ERR-09). Usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md).

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md). A supressão da pergunta de lote vive na **sessão do aplicativo** e se perde ao fechar e reabrir (RN-22.13). Alvo de demonstração Android.

## Critérios de aceite

- [ ] As duas seções aparecem rotuladas e paginadas com limite do servidor (RF-REC-08/09, RNF-DES-02), com pisos mínimos configuráveis.
- [ ] Nenhuma tabela derivada de similaridade é criada; as sugestões saem de consulta em tempo de execução (§10.7).
- [ ] Cada sugestão exibe **o motivo** correspondente ao critério que a gerou (RF-REC-11).
- [ ] Sugestões excluem livro **já na estante** em qualquer status, **livro pessoal** e **descartados** (RF-REC-10, RN-15, SEC-06).
- [ ] Descartar uma sugestão a impede de **reaparecer** nas duas seções; repetir o descarte é idempotente (RF-REC-12, SEC-02).
- [ ] O sinal social usa **somente seguimento aceito**; perfil privado não é exposto pela atribuição (RN-08, SEC-03).
- [ ] `v_livro_recomendacao_v1` existe, é exposta por `acervo`, **não** inclui livro pessoal e não expõe campo desnecessário (§4.2).
- [ ] O **descarte em lote** remove todas as recomendações P2P daquele livro recebidas pelo autenticado, sem avisar remetentes e sem restauração (RF-REC-17, RN-22.11/12/14).
- [ ] A pergunta ocorre ao terceiro descarte do mesmo livro na sessão; recusada, não volta nela; reabrir zera contagem/supressão e exige três novos descartes. Nada disso é persistido no servidor.
- [ ] Opt-out é configurável pelo dono em web/mobile e exclui suas leituras do sinal e da atribuição nas sugestões alheias, sem ocultar o perfil.
- [ ] A aba continua funcionando com a seção algorítmica vazia (RF-REC-14).
- [ ] Sugestões e descarte em lote funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `social`, VIEW em `acervo`, web, mobile) mergeado em `desenvolvimento` *(backend e VIEW prontos na `henrique-features` em 10/11/2026; web e mobile pendentes)*
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [x] Testes unitários e de integração com banco real/container: as duas consultas com massa controlada, pisos mínimos, cada uma das três exclusões, motivo coerente com o critério, descarte idempotente, RN-08 negando sinal de não-seguido e o descarte em lote com/sem itens restantes (RNF-TST-02) *(`SugestaoControllerIntegracaoTest`, 8 casos, e `PerfilIntegracaoTest`, 2 casos novos, em 09 e 10/11/2026)*
- [ ] Testes assíncronos — **N/A**: a feature não produz nem consome evento. Justificativa registrada aqui em vez de remover o item
- [ ] Testes web/mobile cobrem as duas seções, o motivo, o descarte, o gatilho da pergunta de lote, a **supressão por sessão** e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [x] **Specs OpenAPI**: `docs/api/social.yaml` com sugestões, descarte, restantes e descarte em lote; `docs/api/acervo.yaml` com `v_livro_autor_recomendacao_v1` ao lado de `v_livro_recomendacao_v1`; `docs/api/identidade.yaml` com `optOutRecomendacao` e `PATCH /me/perfil` *(10/11/2026; o teste de contrato do `identidade` valida as respostas contra o spec)*
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** fechar com `acervo` o contrato de **`v_livro_recomendacao_v1`** (campos, estabilidade, versionamento junto do spec) **antes** da migration, e registrar na Timeline os **pisos mínimos** calibrados na massa de DES. *(Contrato fechado em 09/11/2026: a VIEW existente foi mantida como está e ganhou a irmã `v_livro_autor_recomendacao_v1`; os pisos iniciais estão na Timeline e a calibração em DES continua pendente.)*

## Plano de implementação

| Etapa | O quê | Situação |
|---|---|---|
| 1 | `acervo`: VIEW `v_livro_autor_recomendacao_v1` (`schema.ts` + migration `0007`) e spec | **concluída em 09/11/2026** (189 testes de integração verdes) |
| 2 | `social`: consultas de sugestão, descarte, restantes e lote, com testes e spec | **concluída em 10/11/2026** (suíte completa verde: 40 classes) |
| 3 | `identidade`: `optOutRecomendacao` no perfil próprio e `PATCH /me/perfil`, com testes e spec | **concluída em 10/11/2026** (suíte completa verde: 244 testes) |
| 4 | Web (`code/front`): seções `Quem você segue leu` e `Do seu gosto` com motivo, `Mostrar mais` e descarte pelo `DotsThree` em `views/DescobrirView.vue` (reaproveitar `components/recomendacoes/SecaoRecomendacoes.vue`, `ItemRecomendacao.vue` e `MenuDaRecomendacao.vue`); pergunta de lote em `views/recomendacoes/RecomendacoesRecebidasView.vue` sobre `recomendacoes/useDescarteDeRecomendacao.ts` (contador por livro e supressão em memória da sessão); item `Leituras em sugestões` e painel em `views/auth/ConfiguracoesView.vue`; funções novas em `services/social.ts` e `services/perfil.ts`; testes ao lado | pendente |
| 5 | Mobile (`code/mobile`): o mesmo em `features/descobrir/descobrir_page.dart` (reaproveitar `features/recomendacoes/secao_recomendacoes.dart`, `item_recomendacao.dart`, `descarte_de_recomendacoes.dart`), `recomendacoes_recebidas_page.dart` (bottom sheet da pergunta), linha com `switch` em Configurações; `social_service.dart` e `perfil_service.dart`; testes | pendente |
| 6 | Fechamento: aplicar a migration do `acervo` em dev, medir as duas consultas em DES, calibrar os pisos, status e timeline | pendente |

**Contratos fechados para a web e o mobile (10/11/2026)**, resolvendo os "contratos a confirmar" das Pendências:

- **Uma chamada** `GET /recomendacoes/sugestoes` devolve as duas seções (`seguidos` e `gosto`), cada uma com `itens` e `proximoOffset`. `Mostrar mais` chama `?secao=<seguidos|gosto>&offset=<proximoOffset>`; `proximoOffset` nulo é o fim. A paginação é por **offset**, não por página, porque o descarte desloca os itens seguintes. Tamanho da página **4** e teto **24** por seção, do servidor.
- **Texto do motivo montado no servidor** (`motivo.texto`), com `motivo.tipo` (`SEGUIDOS`, `SERIE`, `AUTOR`, `ASSUNTO`) para quem precisar distinguir. O cliente não monta frase.
- **Seção vazia vem com `itens: []`** e o cliente a esconde (RF-REC-14). Com as duas vazias, a aterrissagem fica só com as recebidas.
- **Descarte de sugestão** é `POST /recomendacoes/sugestoes/{livroId}/descartar`, 204, **sem** `Idempotency-Key` (a unicidade de `(usuario, livro)` já torna a repetição um no-op); 404 para livro pessoal, inativo ou inexistente.
- **Restantes do livro não vão na resposta do descarte individual**: `DELETE /recomendacoes/{id}` continua 204. No terceiro descarte do mesmo livro na sessão o cliente chama `GET /recomendacoes/recebidas/restantes?livroId=` e, se houver restantes, abre a pergunta. Contador e supressão vivem só no cliente (RN-22.13).
- **Lote atômico**: `POST /recomendacoes/descartar-lote` com `{livroId}` e `Idempotency-Key`, responde `{removidas}`; lote vazio é 200 com zero; reenvio da mesma chave devolve a mesma contagem.
- **Opt-out**: `GET /me/perfil` devolve `optOutRecomendacao` (só no próprio perfil; nulo no de terceiros) e `PATCH /me/perfil` com `{optOutRecomendacao}` e `Idempotency-Key` grava só esse campo. O `switch` da tela é a frase positiva (`Usar minhas leituras em sugestões` ligado = `optOutRecomendacao: false`).

## Pendências

- **Telas (design P3):** lote 2, prompts de edição escritos em 11/10/2026, sem tela nova (a lista completa de sugestões foi descartada: mais itens carregam na própria seção). [`descobrir.md`](../../design/periodo-3/descobrir/descobrir.md) ([protótipo](../../design/periodo-3/descobrir/prototipos/descobrir.html)) (W+M, seções `Quem você segue leu` e `Do seu gosto` com motivo, `Mostrar mais` e descarte pelo `DotsThree`); [`recomendacoes-recebidas.md`](../../design/periodo-3/recomendacoes-recebidas/recomendacoes-recebidas.md) ([protótipo](../../design/periodo-3/recomendacoes-recebidas/prototipos/recomendacoes-recebidas.html)) (W+M, pergunta de descarte em lote no terceiro descarte do mesmo livro); [`configuracoes.md`](../../design/periodo-3/configuracoes/configuracoes.md) ([protótipo](../../design/periodo-3/configuracoes/prototipos/configuracoes.html)) (W+M, switch `Usar minhas leituras em sugestões` em `Privacidade e dados`, que inverte `opt_out_recomendacao`). Contratos a confirmar: tamanho da página e teto de cada seção, texto do motivo montado no servidor ou no cliente, uma ou duas chamadas, restantes do livro na resposta do descarte individual, lote atômico, `opt_out_recomendacao` em `GET /me` e gravação parcial. Protótipos exportados em 21/10/2026.
- **A "aba Recomendações" é seção da aba `Descobrir`.** Espelha a pendência de [F-REC-P2P](../periodo-2/feature-F-REC-P2P.md), decidida em 01/09/2026: a barra de navegação tem quatro itens e a recomendação vive dentro de `Descobrir`. Esta feature preenche a **subseção algorítmica** dessa seção, não uma área nova.
- **Depende de** [F-REC-P2P](../periodo-2/feature-F-REC-P2P.md) (aba, tabela de recomendação, operação de remoção), [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (`v_seguimento_aceito_v1`, RN-08), [F-EST](../periodo-1/feature-F-EST.md) (`v_estante_publica_v1`), [F-AVA](../periodo-1/feature-F-AVA.md) (`v_nota_publicacao_v1`), [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md)/[F-ACV-DESCOBERTA](../periodo-2/feature-F-ACV-DESCOBERTA.md) (assuntos, autor e série normalizados), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md).
- **Divergência de baseline — contrato entre schemas a levar ao grupo:** `v_livro_recomendacao_v1` (prevista no DER e em `docs/4.modelagem.md` §4.2) foi mantida exatamente como o DER a criou, mas ela só traz o **nome concatenado** dos autores, que não identifica o autor para a sugestão "Do mesmo autor de". Em 09/11/2026 entrou no `acervo` a VIEW irmã **`v_livro_autor_recomendacao_v1`** (`livro_id`, `autor_id`; só livro oficial ativo), documentada em `docs/api/acervo.yaml`. O DER, `docs/4.modelagem.md` §4.2 e a arquitetura §4.2 ainda não a citam: registrar pelo controle de mudança do plano §3 (o agente não altera `docs/orquestador/*`). Avisar o Vicenzo, dono do `acervo`.
- **Decisão encerrada em 15/09/2026:** opt-out aprovado. Implementado em 10/11/2026 no `identidade` (`GET`/`PATCH /me/perfil`) e lido pelo `social` por `v_perfil_referencia_v1`; `docs/api/identidade.yaml` atualizado.
- **Qualidade depende de RN-21:** sem a normalização de assuntos, a seção "Do seu gosto" degenera em "mais livros do mesmo autor" (§10.7). O conjunto curado e a tabela de mapeamento são entregáveis de [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md).
- **Assunto de livro pessoal como sinal de gosto:** [F-ACV-OPC](feature-F-ACV-OPC.md) permite assuntos em livro pessoal. A implementação de 10/11/2026 **não** os conta: o gosto sai da junção da estante do leitor com `v_livro_recomendacao_v1`, que só tem livro oficial, então o livro pessoal do próprio leitor não contribui com série, autor nem assunto. Se o grupo quiser o contrário, é uma VIEW nova do `acervo` (a atual não expõe pessoal de propósito). Livro pessoal de terceiro continua excluído por RF-REC-10.
- **Sinal de "leu" e piso de nota:** conta como leitura concluída a linha de `v_estante_publica_v1` com `status = 'lido'` ou `vezes_lido > 0` (releitura em curso também conta). A nota média vem de `v_nota_publicacao_v1`; livro que nenhum seguido avaliou fica **fora** da seção, porque não há nota para passar no piso. O leitor que descarta a própria estante (`abandonado`) não entra no gosto, mas o livro abandonado continua excluído das sugestões (está na estante). Revisar se a massa de DES mostrar seções vazias demais.
- **Pisos iniciais** (defaults em `application.yml` do `social`, sobrescritos por `SUGESTOES_*`): `minimo-de-leitores=1`, `nota-media-minima=3.5`, `minimo-de-livros-por-assunto=2`, `assuntos-considerados=3`, `tamanho-da-pagina=4`, `teto-por-secao=24`. Calibrar na massa de DES antes do congelamento de 17/11 e registrar aqui.
- **Desempenho:** as duas consultas são as mais pesadas de `social` e correm sobre um plano gratuito que hiberna (RNF-ERR-09). Limite fixo por seção e os índices de RNF-DES-03 são a mitigação; medir em DES antes do congelamento de 17/11.
- **Compartilha `social`** com as demais features sociais — sinalizar no grupo (plano §6). Sugestões descartadas são limpas por [F-CONTA-2](../periodo-2/feature-F-CONTA-2.md) na exclusão de conta.
- Stack definida (arquitetura §2.1): `social` em Spring, `acervo` em NestJS.

## Timeline

### Implementação 09 e 10/11/2026: infra e backend prontos na `henrique-features`; web e mobile ficam para a próxima sessão.

- **`acervo` (09/11):** VIEW `v_livro_autor_recomendacao_v1` em `src/db/schema.ts`, migration `drizzle/0007_20261109120000_view_autor_recomendacao.sql` gerada pelo drizzle-kit (só o `CREATE VIEW`), contrato em `docs/api/acervo.yaml`. Build e 189 testes de integração verdes.
- **`social` (09 e 10/11):** `recomendacao/repository/SugestaoRepository` (as duas consultas em SQL sobre VIEWs, com CTEs: o sinal dos seguidos exclui opt-out e usa `LATERAL` para buscar título/autor/capa só da página; o gosto escolhe por `DISTINCT ON` o motivo mais forte por livro, série > autor > assunto), `service/ServicoDeSugestao` (pisos por `@Value("${leai.sugestoes.*}")`, texto do motivo, página de 4 com teto de 24 por seção), `controller/SugestaoController` (quatro rotas), DTOs `SugestoesResposta`, `DescartarLoteRequisicao`, `DescarteEmLoteResposta`, `RestantesDoLivroResposta`, operação idempotente `DESCARTAR_RECOMENDACOES_DO_LIVRO`, `RecomendacaoRepository.contarRecebidasDoLivro`/`removerAtivasDoLivro`. Testes: `integracao/MassaDeSugestao` (série, assunto, autor, as duas VIEWs do acervo e `leitura.nota` sobre a `MassaDeRecomendacao`) e `SugestaoControllerIntegracaoTest` (8 casos: pisos e exclusões dos seguidos, motivo do gosto, seções vazias, descarte que não reaparece e é por leitor, 404 de pessoal/inexistente, paginação por offset e os 400, lote por destinatário com idempotência e sem outbox, 401 e 400 de entrada). Suíte completa verde (40 classes).
- **`identidade` (10/11):** `Usuario.optOutRecomendacao` (coluna já existia desde 15/09), `PerfilResposta.optOutRecomendacao` (só em `proprio`, nulo em `de`), `PreferenciaDeSugestoesRequisicao`, `ServicoDePerfil.definirOptOutRecomendacao`, `PATCH /me/perfil` com `Idempotency-Key` (`DEFINIR_PREFERENCIA_DE_SUGESTOES`). Dois casos novos em `PerfilIntegracaoTest`. O `ContratoHttp` dos testes valida toda resposta contra `docs/api/identidade.yaml`: o spec precisou do campo e da operação antes de a suíte passar. 244 testes verdes.
- **Specs:** `social.yaml` (quatro operações, schemas `Sugestoes`, `SecaoDeSugestoes`, `Sugestao`, `MotivoDaSugestao`, `RestantesDoLivro`, `DescartarLote`, `DescarteEmLote`), `acervo.yaml` (VIEW nova), `identidade.yaml` (`optOutRecomendacao` em `Perfil`, `PreferenciaDeSugestoes`, `PATCH /me/perfil`, nota da VIEW).
- **Decisões tomadas na implementação** (registradas em Plano de implementação e Pendências): uma chamada com as duas seções e paginação por offset; motivo montado no servidor; endpoint próprio de restantes em vez de alterar a resposta do descarte individual; lote atômico com contagem; descarte de sugestão sem `Idempotency-Key`; livro pessoal do próprio leitor fora do sinal de gosto; pisos iniciais acima.
- **Ambiente:** testes de integração rodados num Postgres descartável em Docker (`leai-pg-teste`, porta 55432), nunca no Neon. O `acervo` precisou de `npm ci` (faltava `image-size`); o `npm run lint` local acusa só CRLF do checkout com `core.autocrlf=true`, que o CI em Linux não vê.

### Revisão 15/09/2026: grupo aprovou opt-out e zeramento de contagem/supressão de descartes ao reabrir. Modelo e critérios atualizados; implementação não iniciada.

### Criação 01/09/2026: arquivo criado a partir do escopo de F-REC-ALG no [periodo-3/README.md](README.md), de RF-REC-08..12/17 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.13, das decisões registradas em §10.7/§10.8 e das RN-08/RN-15/RN-21/RN-22.12/13. Cálculo em tempo de consulta e ausência de estrutura derivada reafirmados; `v_livro_recomendacao_v1` registrada como contrato a fechar com `acervo`; descarte em lote fixado como quarta via da mesma operação de remoção de F-REC-P2P, com a supressão da pergunta explicitamente local ao cliente; opt-out de §10.7 mantido como pendência, sem antecipar a decisão do grupo.
