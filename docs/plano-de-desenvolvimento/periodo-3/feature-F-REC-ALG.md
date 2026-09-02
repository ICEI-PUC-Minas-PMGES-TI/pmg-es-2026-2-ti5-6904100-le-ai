# F-REC-ALG — Recomendação algorítmica + descarte em lote

**Período:** 3 · **Prioridade:** opcional
**Dono:** a definir · **Serviços afetados:** `social` (backend) + `acervo` (VIEW de contrato) + web + mobile

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
| Infra | não iniciado | tabela `sugestao_descartada`; VIEW `v_livro_recomendacao_v1` exposta por `acervo` |
| Backend | não iniciado | `social`: duas consultas de sugestão, motivo, descarte individual e descarte em lote P2P |
| Web | não iniciado | seção algorítmica da aba Recomendações, motivo, descartar, pergunta de lote |
| Mobile | não iniciado | mesmas telas + supressão local da pergunta de lote (RN-22.13) |

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

**Gatilho e supressão da pergunta de lote (RN-22.12/13) — regra de fronteira cliente/servidor.** A pergunta *"Deseja remover todas as recomendações atuais do livro X?"* é oferecida ao **terceiro descarte individual** de recomendações do **mesmo livro**, havendo outras pendentes daquele livro. O servidor apenas informa, na resposta do descarte individual, quantas recomendações **daquele livro** restam ativas; **a decisão de perguntar e a supressão da pergunta são estado local do cliente** (RN-22.13, §10.8): recusada, a pergunta não volta para aquele livro **durante a sessão corrente do aplicativo**, e volta a ser elegível ao reabrir. O servidor **não** persiste essa supressão — comportamento deliberado, não simplificação.

**Privacidade (RN-08, §10.7).** O sinal social considera **apenas leitores que o usuário segue com solicitação aceita**, o que satisfaz RN-08 por construção. A contagem exibida no motivo exige a mesma verificação, e **identificar quem leu** está sujeito a RN-08 — perfil privado não é exposto por atribuição de sugestão. A verificação ocorre no servidor, a cada consulta, e não em estado copiado.

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
- [ ] A pergunta de lote é oferecida ao **terceiro** descarte do mesmo livro; recusada, **não volta na sessão** e **volta** após reabrir o aplicativo (RN-22.12/13); o servidor não guarda essa supressão.
- [ ] A aba continua funcionando com a seção algorítmica vazia (RF-REC-14).
- [ ] Sugestões e descarte em lote funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `social`, VIEW em `acervo`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: as duas consultas com massa controlada, pisos mínimos, cada uma das três exclusões, motivo coerente com o critério, descarte idempotente, RN-08 negando sinal de não-seguido e o descarte em lote com/sem itens restantes (RNF-TST-02)
- [ ] Testes assíncronos — **N/A**: a feature não produz nem consome evento. Justificativa registrada aqui em vez de remover o item
- [ ] Testes web/mobile cobrem as duas seções, o motivo, o descarte, o gatilho da pergunta de lote, a **supressão por sessão** e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Specs OpenAPI**: `docs/api/social.yaml` com sugestões, descarte e descarte em lote; `docs/api/acervo.yaml` documentando `v_livro_recomendacao_v1` como contrato entre schemas
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** fechar com `acervo` o contrato de **`v_livro_recomendacao_v1`** (campos, estabilidade, versionamento junto do spec) **antes** da migration, e registrar na Timeline os **pisos mínimos** calibrados na massa de DES.

## Pendências

- **A "aba Recomendações" é seção da aba `Descobrir`.** Espelha a pendência de [F-REC-P2P](../periodo-2/feature-F-REC-P2P.md), decidida em 01/09/2026: a barra de navegação tem quatro itens e a recomendação vive dentro de `Descobrir`. Esta feature preenche a **subseção algorítmica** dessa seção, não uma área nova.
- **Depende de** [F-REC-P2P](../periodo-2/feature-F-REC-P2P.md) (aba, tabela de recomendação, operação de remoção), [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (`v_seguimento_aceito_v1`, RN-08), [F-EST](../periodo-1/feature-F-EST.md) (`v_estante_publica_v1`), [F-AVA](../periodo-1/feature-F-AVA.md) (`v_nota_publicacao_v1`), [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md)/[F-ACV-DESCOBERTA](../periodo-2/feature-F-ACV-DESCOBERTA.md) (assuntos, autor e série normalizados), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md).
- **Divergência de baseline — novo contrato entre schemas:** `v_livro_recomendacao_v1` está prevista no DER e em `docs/4.modelagem.md` §4.2 como item do Período 3, mas seu conteúdo ainda não foi acordado com o dono (`acervo`). Fechar pelo controle de mudança do plano §3 antes de migrar.
- **Pendência aberta — opt-out de recomendações:** `REQUISITOS.md` §10.7 deixa em aberto se o leitor pode optar por não ter suas leituras usadas nas recomendações de outros (recomendação registrada lá: sim, como chave no perfil). O DER marca `usuario.opt_out_recomendacao` como `PENDENTE`, com instrução de **não migrar antes da decisão**. Esta feature **não decide**: consome o sinal social sem o filtro até que o grupo resolva, e registra que o filtro entra como um `AND` na primeira seção quando a decisão sair.
- **Qualidade depende de RN-21:** sem a normalização de assuntos, a seção "Do seu gosto" degenera em "mais livros do mesmo autor" (§10.7). O conjunto curado e a tabela de mapeamento são entregáveis de [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md).
- **Assunto de livro pessoal como sinal de gosto:** [F-ACV-OPC](feature-F-ACV-OPC.md) permite assuntos em livro pessoal; se contam como sinal na estante **do próprio leitor** é decisão do grupo. Livro pessoal de terceiro continua excluído por RF-REC-10.
- **Desempenho:** as duas consultas são as mais pesadas de `social` e correm sobre um plano gratuito que hiberna (RNF-ERR-09). Limite fixo por seção e os índices de RNF-DES-03 são a mitigação; medir em DES antes do congelamento de 17/11.
- **Compartilha `social`** com as demais features sociais — sinalizar no grupo (plano §6). Sugestões descartadas são limpas por [F-CONTA-2](../periodo-2/feature-F-CONTA-2.md) na exclusão de conta.
- Stack definida (arquitetura §2.1): `social` em Spring, `acervo` em NestJS.

## Timeline

### Criação 01/09/2026: arquivo criado a partir do escopo de F-REC-ALG no [periodo-3/README.md](README.md), de RF-REC-08..12/17 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.13, das decisões registradas em §10.7/§10.8 e das RN-08/RN-15/RN-21/RN-22.12/13. Cálculo em tempo de consulta e ausência de estrutura derivada reafirmados; `v_livro_recomendacao_v1` registrada como contrato a fechar com `acervo`; descarte em lote fixado como quarta via da mesma operação de remoção de F-REC-P2P, com a supressão da pergunta explicitamente local ao cliente; opt-out de §10.7 mantido como pendência, sem antecipar a decisão do grupo.
