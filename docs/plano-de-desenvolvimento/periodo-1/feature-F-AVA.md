# F-AVA — Nota e resenha

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** Renato Douglas · **Serviços afetados:** `leitura` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.5 (RF-AVA-01..04), RN-06, RN-07, RN-04.5. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.2, §4.2, §5.1, §5.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Permitir que o leitor **avalie e opine sobre um livro** — nota e resenha —, o conteúdo que alimenta a página do livro e o feed. Fecha os requisitos **Essenciais**:

- **RF-AVA-01** atribuir uma **nota de 0 a 5 estrelas, com meia estrela**, editável a qualquer momento;
- **RF-AVA-02** escrever **uma resenha por livro**, editável;
- **RF-AVA-03** marcar a resenha como **contendo spoiler** (exibida oculta até revelar);
- **RF-AVA-04** **excluir** a resenha.

Nota e resenha pertencem ao **livro, não à leitura** (RN-04.5, RN-06, RN-07): uma por usuário por livro, sobrevivem a abandono, não duplicam por releitura e não exigem leitura concluída. Ficam em `leitura` (arquitetura §3.2.1); a página do livro consome VIEW versionada e o feed consome evento de publicação.

RNF atendidos: **RNF-SEC-02** (propriedade no servidor), **RNF-SEC-13** (validação por esquema — faixa da nota, limite da resenha), **RNF-SEC-14** (conteúdo do usuário tratado como texto, escape na web), **RNF-USA-04** (confirmação na exclusão), **RNF-ARQ-06** (evento `nota.alterada` para a projeção em `acervo`).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | concluído | P0-MSG pronto desde 19/09. Fatia 0 (27/09) na `desenvolvimento`: JWT, idempotência HTTP, 422, correlation-id UUID, outbox com validação do `data` e `common-v1`, harness de integração e CI com Postgres no `leitura` |
| Dados | concluído (baseline físico) | DER implantado no Neon em 16/09. F-AVA não cria migration no `leitura`; a do `social` (autor anulável) está na `desenvolvimento` desde 27/09, com a revisão do Kayke pendente |
| Backend | concluído | Nota, resenha, `minha-avaliacao` e resenhas do perfil (27/09), com `nota.alterada`, `resenha.publicada` e `resenha.excluida` validados contra os schemas. Falta DES |
| Web | concluído | Painel de nota, "Sua avaliação" com a resenha própria, editor de resenha, spoiler no livro pessoal e no feed, resenhas no perfil. Falta DES |
| Mobile | concluído | Mesmo escopo da web, com o editor em tela cheia. Falta DES |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Operações **síncronas** (§7.2: criação de nota e de resenha não são assíncronas; confirmam ao autor, com domínio e outbox gravados na mesma transação). Valida **propriedade** (SEC-02), **esquema** (SEC-13) e livro/tipo/dono pelo contrato `acervo.v_livro_referencia_v1` (`livro_id`, `tipo`, `dono_id`, `paginas`, `titulo`, `autor_exibicao`, `capa_resolvida`, `ativo`), sem ler tabela crua de `acervo`. IDs não sequenciais (SEC-05). Todas as escritas abaixo exigem `Idempotency-Key` conforme [`docs/api/leitura.yaml`](../../api/leitura.yaml): o escopo é ator+método+caminho canônico; mesma chave e payload reproduzem status/corpo sem novo efeito ou evento, e chave reutilizada com payload diferente retorna `409`.

- **`PUT /livros/{livroId}/nota`** (RF-AVA-01, RN-06) — cria/atualiza a nota do leitor para o livro e responde `200` com `Nota`. Valores permitidos: **0; 0,5; 1; … 5** (passos de 0,5) — fora da escala → `422`. **Uma nota por usuário por livro**, editável. **`DELETE /livros/{livroId}/nota`** responde `204` e remove com confirmação no cliente (RNF-USA-04). Ambas gravam `nota.alterada` na outbox.
- **`PUT /livros/{livroId}/resenha`** (RF-AVA-02, RF-AVA-03, RN-07) — cria/atualiza **uma resenha por usuário por livro**, responde `200` com `Resenha`, não depende de leitura concluída e recebe `texto` e `spoiler`. **Texto cru** de 1 a **5.000 caracteres**, incluindo marcação (RN-07), armazenado sem HTML; Markdown é Período 2. Marcação de **spoiler** é reversível. **`DELETE /livros/{livroId}/resenha`** exclui fisicamente, responde `204` e exige confirmação irreversível no cliente (RF-AVA-04, RNF-USA-04).
- **`GET /livros/{livroId}/minha-avaliacao`** — retorna `MinhaAvaliacao { livroId, nota, resenha }`; `nota` e `resenha` são anuláveis, nunca valores inventados.
- **Livro pessoal:** apenas o **dono** escreve nota/resenha (RN-03); a resenha do dono é visível a terceiros que cheguem por feed/lista (RN-15) — as **reações e denúncias** a essa resenha são do Período 2 ([F-AVA-2](../periodo-2/README.md)/F-MOD).
- **`GET /perfis/{usuarioId}/resenhas?page={n}&limite={n}`** — composição paginada de RF-SOC-02; `page` começa em 1 e `limite` tem máximo 50. Combina `identidade.v_perfil_referencia_v1` e `identidade.v_seguimento_aceito_v1`: perfil privado exige próprio usuário ou seguidor aceito; conta suspensa/em exclusão não aparece (RN-08, SEC-03).

**Eventos produzidos:**
- [`nota.alterada.v1`](../../mensageria/schemas/nota.alterada.v1.schema.json): `data` contém `usuarioId`, `livroId`, `operacao` (`criada | atualizada | excluida`) e `nota` (nula somente na exclusão); `businessKey = nota:<usuarioId>:<livroId>`. F-AVA é dona/produtora do schema. O catálogo marca `acervo` como **consumidor futuro**, portanto no Período 1 o evento é publicado sem fila acumuladora; F-ACV-NOTA faz backfill antes de criar o binding.
- [`resenha.publicada.v1`](../../mensageria/schemas/resenha.publicada.v1.schema.json): emitido na criação, não em edição, preservando a decisão vigente; `data` contém `usuarioId`, `resenhaId`, `livroId`, `atualizacao=false`, `usuario` (`UsuarioSnapshot`) e `livro` (`LivroSnapshot`), sem texto nem spoiler; `businessKey = resenha:<resenhaId>:publicada`. Após exclusão, uma nova resenha recebe novo ID e produz novo evento. O campo `atualizacao` existe no contrato canônico, mas F-AVA não publica edição no Período 1.
- [`resenha.excluida.v1`](../../mensageria/schemas/resenha.excluida.v1.schema.json): emitido na exclusão física com `usuarioId`, `resenhaId` e `livroId`; `businessKey = resenha:<resenhaId>:excluida`. F-FEED, dona da fila `leai.social.feed`, remove a atividade antiga e suas interações. F-AVA é dona/produtora dos dois schemas de resenha; P0-MSG é dono somente do envelope e do transporte.

**VIEWs expostas por `leitura`** (arquitetura §4.2), já implantadas pelo DER e ainda sem composição funcional:
- `v_resenha_publicacao_v1` (`resenha_id`, `usuario_id`, `livro_id`, `texto`, `spoiler`, `criado_em`, `atualizado_em`, `curtidas`, `descurtidas`) — consumida pela página de livro oficial e pela página autorizada de livro pessoal em `acervo`. Não contém nome/avatar nem decide visibilidade: `acervo` compõe `usuario_id` com as VIEWs de `identidade` e revalida RN-08/RN-15.
- `v_nota_publicacao_v1` (`usuario_id`, `livro_id`, `valor`) — consumida pela página autorizada de livro pessoal para exibir somente a nota do dono e, futuramente, pelo backfill de F-ACV-NOTA. A atualização incremental usa `nota.alterada`.

O feed não consome VIEW de resenha; consome exclusivamente `resenha.publicada`.

**Modelo de dados** (schema `leitura`): `nota` (usuário, livro, valor 0–5 em passos de 0,5) e `resenha` (usuário, livro, texto cru ≤5.000, flag spoiler, timestamps). Chave única (usuário, livro) em ambas.

### Frontend Web (`code/front`)

- **Seletor de estrelas** com meia estrela (componente de [P0-DS](../periodo-0/feature-P0-DS.md)); carrega a avaliação atual e remover nota exige confirmação. **Editor de resenha** em **texto puro** (Markdown é Período 2), contador de 5.000, toggle de **spoiler**; resenha com spoiler exibida **oculta** exigindo ação para revelar. Excluir com confirmação. Conteúdo renderizado com **escape** (SEC-14). Perfil usa listagem paginada autorizada; cliente HTTP aplica timeout/backoff apenas a operações idempotentes.

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md). Alvo de demonstração Android.

## Critérios de aceite

- [x] Nota aceita apenas os valores 0..5 em **passos de 0,5** (RN-06); fora da escala → `422`; é **uma por usuário+livro**, editável e removível.
- [x] Resenha é **uma por usuário+livro**, editável, **texto cru ≤5.000** (RN-07), **sem** exigir leitura concluída.
- [x] `minha-avaliacao` recupera nota/resenha atuais para edição e respeita propriedade.
- [x] **Spoiler** marca/desmarca e a resenha é exibida oculta até revelar (RF-AVA-03).
- [x] Excluir resenha é físico, usa confirmação irreversível e publica `resenha.excluida`; recriar gera nova resenha e nova atividade (RF-AVA-04, RNF-USA-04).
- [x] Remover nota exige confirmação; PUT/DELETE repetidos com a mesma chave não repetem efeitos (RNF-USA-04, RNF-ERR-04).
- [x] `nota.alterada.v1` distingue `criada`, `atualizada` e `excluida`; criação/exclusão publicam `resenha.publicada.v1` (`atualizacao=false`) e `resenha.excluida.v1` com os campos e business keys canônicos. Os efeitos consumidores são aceitos em F-ACV-NOTA/F-FEED.
- [ ] As VIEWs permitem à página autorizada de livro pessoal mostrar somente nota/resenha do dono; `v_resenha_publicacao_v1` também atende a página oficial sob RN-08. Nenhuma alimenta o feed. *(Hoje o feed lê as duas VIEWs; decisão do grupo pendente, ver Pendências.)*
- [x] Resenhas do perfil são paginadas e negadas server-side a não seguidor de perfil privado (RNF-DES-02, SEC-03).
- [x] Em **livro pessoal**, só o dono escreve nota/resenha (RN-03).
- [ ] Nota e resenha funcionam **em DES**.

## Definition of Done

(plano §10)

- [x] Código (backend `leitura`, web, mobile) mergeado em `desenvolvimento`
- [x] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [x] Testes unitários e de integração com banco real/container: faixa/passo incluindo nota `0`, unicidade, validação de `v_livro_referencia_v1` (oficial, pessoal do dono, pessoal alheio e inativo), limite/texto cru, spoiler, exclusões, formas exatas das respostas, paginação com `limite`, privacidade/suspensão e idempotência HTTP (mesma chave+payload reproduz resposta e não duplica domínio/outbox; payload diferente → `409`) (RNF-TST-02)
- [x] Testes assíncronos de F-AVA cobrem schemas canônicos, atomicidade domínio+outbox, operações/valores de `nota.alterada`, snapshots de `resenha.publicada`, repetição HTTP sem segunda linha de outbox e edição sem segunda `resenha.publicada`. O teste ponta a ponta de RNF-TST-03 para `resenha.*` inclui o consumidor F-FEED; consumo/backfill de `nota.alterada` pertence a F-ACV-NOTA. *(O ponta a ponta com o consumidor do F-FEED está em Pendências.)* Dispatcher, confirm, recibo, retry e DLQ genéricos pertencem a P0-MSG.
- [x] Testes web/mobile cobrem estrelas, spoiler, confirmações, perfil privado e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [x] **Spec OpenAPI de `leitura` em `docs/api/leitura.yaml` implementado sem divergência** para nota/resenha/minha avaliação/perfil e contratos de VIEW; trocar `x-implementation-status: planned` somente após a implementação
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver

**Item próprio:** publicar as VIEWs versionadas e os dois schemas de evento com responsabilidades não sobrepostas: página por VIEW de resenha, feed por evento de resenha e projeção por evento de nota.

## Pendências

- **Plano de implementação:** [`plano-F-AVA.md`](plano-F-AVA.md) (fatias 0 a 4, decisões e divergências).
- **Revisão do Kayke (não bloqueia mais: o Renato decidiu mergear na `desenvolvimento` em 27/09):** a migration `V20260927002000__snap_livro_autor_anulavel.sql`, `Atividade.java`, a cópia do `common-v1`, `docs/api/social.yaml` e `ItemAtividade.vue` (autor vazio e spoiler escondido no feed) foram feitos por F-AVA com autorização do Renato. Registro em `code/back/social/AGENTS.md`.
- **Decisões do grupo pendentes:** correção do `common-v1` sem nova versão (feita em 26/09 por decisão do Renato, a comunicar); o feed lê as VIEWs do `leitura`, contra a arquitetura §3.2 item 4; resenhas de livro pessoal no perfil só para o dono (RN-15); componentes novos para o `documento-de-design.md`.
- **DES:** falta o PR `desenvolvimento → main`. O `JWT_SECRET` do `leai-leitura` foi configurado no Render em 27/09, com o mesmo valor do `leai-identidade`. Antes da primeira resenha, conferir `leai.social.feed` no `Le-ai-oregon`.
- **`JWT_SECRET` no Render (achado em 27/09):** `leai-acervo` e `leai-social` não têm a variável. O acervo da `desenvolvimento` recusa subir em produção sem ela, e o social lê `JWT_SECRET` com valor vazio por padrão. Precisa estar configurado antes do PR para a `main`.
- **Contas de teste no banco de dev:** `teste.fava.a` e `teste.fava.b` (e-mail `@teste.leai.invalid`), criadas no teste manual de 27/09. A conta A tem o livro pessoal "Diário FAVA" (dois, pelos reenvios do roteiro), nota e resenhas; as linhas da `outbox_leitura` dela ficaram `pendente`, porque o `leitura` local rodou com `AMQP_ENABLED=false`, e saem para a fila do feed quando alguém subir o `leitura` com mensageria no banco de dev.

- **Depende de** [F-ACV-BUSCA](feature-F-ACV-BUSCA.md)/[F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md) (livro para avaliar), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md). P0-MSG está pronto desde 19/09 (dispatcher com confirm, `mensagem_processada`, validação, retry e DLQ); falta só a prova em DES, que depende do PR `desenvolvimento → main`.
- **RNF-TST-03 ponta a ponta de `resenha.*`:** F-AVA prova até o envelope válido no broker em memória (`resenha.int-spec.ts`); o consumo pelo F-FEED fica com o Kayke.
- **Ordem dos eventos:** o despachante segura só a linha que falhou, então um `resenha.excluida` pode sair antes do `resenha.publicada` da mesma resenha. Raro; registrado em `code/back/social/AGENTS.md`.
- **Divergências do protótipo e do plano, decididas na implementação:**
  - "Sua avaliação" mostra a resenha do próprio leitor (texto, data, marca `Contém spoiler` e `Editar resenha`); nem o `.md` nem o `.html` desenham esse estado. O dono vê o próprio texto mesmo com spoiler. Copy nova: "Não foi possível carregar sua avaliação." com `Tentar de novo`.
  - Dialog de nota com 460px (`.html`), não 420 (`.md`). Na web, a confirmação de remover troca o conteúdo do mesmo modal em vez de abrir um segundo.
  - No mobile, o painel usa o bottom sheet do sistema (`mostrarFolhaInferior`: fundo `papel`, raio 20), não o `papel-elevado` com raio 24 do prompt.
  - Aviso de spoiler e erro de limite ficam acima da barra do editor, como no `.html`.
  - `Trash` também na web, na barra do editor (o artboard web de edição não desenha o gatilho).
  - Copy nova do descarte: "Descartar a resenha?", "O que você escreveu aqui não foi salvo e será perdido.", "Descartar" e "Continuar escrevendo". Copy nova do erro ao excluir: "Não foi possível excluir sua resenha. Tente de novo."
  - O limite no singular: "passou do limite em 1 caractere".
  - Na web, o editor aberto direto pelo endereço fica só leitura até a resenha salva chegar; se ela não carregar, mostra "Não foi possível carregar sua resenha." com `Tentar de novo` (copy nova).
  - No mobile, o editor abre no navegador raiz (acima do shell) em vez de uma rota com `parentNavigatorKey`: esconde a barra inferior sem mexer no `router.dart`, mas não tem URL própria.
  - Na web, o editor ganhou a meta `semBarraInferior` e a meta `voltarPara` (o `X` sem histórico volta à página do livro).
  - Perfil: "Ver mais resenhas" carrega a próxima página na própria seção, no lugar de uma página "Ver todas" separada. Com spoiler, terceiros veem o bloco oculto com `Mostrar mesmo assim`.
  - Contagem de caracteres por code point: emoji composto (👍🏽, ❤️) conta mais de 1, igual nos três lados.
  - 404, nunca 403, para livro inacessível; DELETE sem nada para apagar responde 204 sem evento; nota com o mesmo valor não gera evento.
  - **Os DELETE não conferem o livro** (27/09, depois da validação): apagam só o que é do leitor, e remover nota ou resenha continua possível depois que o livro fica inativo (RN-06, RF-AVA-04). Antes, um livro pessoal excluído deixava nota e resenha presas para sempre.
  - Contrato do `leitura` com 413 (`CORPO_MUITO_GRANDE`), 429 e 503 nas operações de F-AVA; `page` de 1 a 10.000; texto só com caracteres invisíveis ou com o caractere nulo é 422; token sem `exp` é 401; ids de caminho em minúsculas.
  - Copy nova, nos dois clientes: "Não foi possível remover sua nota. Verifique sua conexão e tente de novo."
  - Resenhas do perfil: 5 por página, com "Ver mais resenhas" trazendo mais 5; o design mostra 2 e um "Ver todas".
  - Com spoiler ligado e texto acima do limite, só o erro de limite aparece (ele é o que bloqueia).
  - Web, componentes compartilhados do P0-DS usados como estão: o painel de nota (`SobreposicaoModal`) tem fundo `papel` e raio 24, não `papel-elevado` e raio 20; as confirmações (`DialogoConfirmacao`) têm 360px, não 400, e abaixo de 768px abrem como folha inferior, não como dialog de 320px; abaixo de 768px o título "Resenha" do editor (`CabecalhoTela`) sai em `display` à esquerda, não em `title` centralizado; e o `Publicar` desabilitado é `grafite` a 60%, não `grafite-suave`. Mudar esses componentes mexe no app inteiro, então fica para o grupo.
  - O texto `ambar` sobre `ambar-fundo` do toggle de spoiler fica abaixo do AA (RNF-USA-03); o peso 600 e o ícone reforçam o estado. Pendência de design.
- **Validação independente (27/09):** três agentes de contexto limpo (backend, web, mobile) conferiram F-AVA contra requisitos, contrato e design. Corrigidos no mesmo dia: chave de idempotência reaproveitada depois de um sucesso nos dois clientes (dar a mesma nota depois de remover não gravava nada); editor web liberado vazio quando a resenha salva não carregou; `Esc` de modal saindo do editor; foco perdido depois de "Mostrar mesmo assim"; resenhas do perfil no mobile que não recarregavam; voltar do Android durante o envio; semântica sem ação de toque no toggle e na linha de estrelas; título em Roboto no mobile; exclusão em livro inativo; URL de capa com acento, caractere nulo, `page` enorme e corpo grande dando 500. Continuam em aberto:
  - Conta suspensa (fora de `v_perfil_referencia_v1`) ainda dá nota durante a vida do token, enquanto a resenha já responde 403.
  - `/docs` e `/docs-json` públicos também em produção, como no acervo.
  - No card do perfil (web), o trecho truncado não é anunciado como truncado (`meu-perfil.md` §9).
  - Testes de F-AVA no mobile cobrem 500 e 503, mas timeout e queda de rede só no `api_client_test`.
  - Para outras features, só avisado: no feed (F-FEED, Kayke), o botão "Ler resenha" de `ItemAtividade.vue` não faz nada; em `cadastro_isbn_page.dart:324` (F-ACV-CADASTRO, Vicenzo), `textTheme.titleSmall` não existe no tema e sai em Roboto; no `acervo`, corpo acima de 100 KB dá 500 e token sem `exp` é aceito (mesma infra que o `leitura` corrigiu). O ajudante de teste `montarNaRota` ganhou o parâmetro opcional `historico: 'navegador'`.
- **Compartilha `leitura` com [F-EST](feature-F-EST.md) e [F-PRG](feature-F-PRG.md)** — sinalizar no grupo antes de mexer no serviço (plano §6).
- **Ficam fora (Período 2):** curtir/descurtir e contadores de resenha (RF-AVA-05/08), frases/trechos (RF-AVA-06/07, RN-11), **Markdown** (RF-AVA-09, RN-13) — todos **F-AVA-2**. No Período 1 a resenha é **texto puro**; nada de parser Markdown ainda.
- A **projeção nota dos leitores** e a **nota geral** (RF-ACV-15/16) são **F-ACV-NOTA** (Período 2). Antes de consumir novos `nota.alterada`, essa feature deve fazer backfill de `v_nota_publicacao_v1`, pois eventos do Período 1 não são presumidos retidos.
- Stack de `leitura` definida: **NestJS (TypeScript)** (arquitetura §2.1).

- **Prompts de tela em [`docs/design/periodo-1/F-AVA/`](../../design/periodo-1/F-AVA/):** `avaliar-livro.md` e `escrever-resenha.md`. **A exibição da nota e das resenhas não tem prompt próprio:** ela é elemento que esta feature acrescenta a [`F-ACV-BUSCA/pagina-do-livro.md`](../../design/periodo-1/F-ACV-BUSCA/pagina-do-livro.md), incluindo o estado de resenha de terceiro com spoiler oculto, conforme a regra de recorte do [`docs/design/AGENTS.md`](../../design/AGENTS.md) §2.
- **Nota ausente e nota zero são estados distintos na interface, por RN-06.** Ausente é o texto `Sem nota`; `0` é uma nota válida e aparece como `0`. O protótipo traz os dois artboards lado a lado justamente porque as estrelas são idênticas nos dois casos e só o texto distingue. Ausente nunca é representado como `0,0` nem como traço.
- **Componentes que nascem no protótipo e ainda não estão na fonte:** o **painel de dar nota** (o §4.3 define o componente de estrela, não o painel em que ele vive), o **toggle de spoiler** e o **contador de caracteres permanente** com as três faixas de cor. Incorporar ao `documento-de-design.md` pelo controle de mudança do plano §3.
- **A área de texto da resenha é exceção declarada ao input do design §4.2:** sem borda e sem fundo próprio, em Newsreader, ocupando o corpo da tela. O §4.2 define o campo curto com borda e fundo `papel-elevado`, que não serve a texto de 5.000 caracteres.

## Timeline

### 29/09/2026: o painel de nota, aberto pelo navegador raiz, ficava com o botão "Remover nota" cortado pela barra de navegação do sistema (edge-to-edge no Android; `useSafeArea` não protege a base). `mostrarFolhaInferior` passou a somar `MediaQuery.paddingOf(context).bottom` ao padding inferior. Sheets abertos dentro de uma aba não mudam. Teste widget novo.

### 27/09/2026: validação independente. Três agentes de contexto limpo validaram backend, web e mobile; os defeitos confirmados foram corrigidos no mesmo dia (lista em Pendências). Testes: `leitura` 96 unitários e 92 de integração, web 452, mobile 302, todos passando.

### 27/09/2026: teste manual e merge. Testado na web (Edge automatizado, desktop e celular) e no mobile (emulador Pixel 8), com identidade, acervo e leitura locais sobre o banco de dev: nota 0 distinta de "Sem nota", 4,5, remover com confirmação, resenha com spoiler, contador, descarte, edição sem segundo `resenha.publicada` (conferido na outbox), exclusão, recriação com id novo, perfil próprio com resenha de livro pessoal, perfil de outra conta com spoiler escondido até revelar. Três correções: o editor web ficava editável antes de a resenha salva chegar (o texto digitado era trocado por ela); no mobile, o painel de nota não cobria a barra inferior e a área de texto do editor tinha a borda do tema. `JWT_SECRET` do `leai-leitura` configurado no Render. Fatias 1 a 4 mergeadas na `desenvolvimento`.

### 27/09/2026: fatias 2, 3 e 4. Resenha pronta no backend (`PUT`/`DELETE /livros/{id}/resenha`, `resenha.publicada` só na criação, `resenha.excluida`), no mobile e na web (editor sem barra inferior, contador por code point, toggle de spoiler, confirmação ao sair, resenha própria em "Sua avaliação", "Escrever a primeira", spoiler escondido no modo consulta do livro pessoal e no feed). Resenhas do perfil (`GET /perfis/{id}/resenhas`, RN-08 e RN-15) com livro e nota, nos cards do Henrique. Contrato marcado como implementado e conferido contra o `/docs` em runtime. Falta DES e a revisão do Kayke no `social`.

### 27/09/2026: fatias 0 e 1. Infra comum do `leitura` na `desenvolvimento` (para F-AVA, F-EST e F-PRG). Nota pronta no backend (`PUT`/`DELETE /livros/{id}/nota`, `GET /livros/{id}/minha-avaliacao`, `nota.alterada` validado contra o schema), no mobile e na web (painel de nota com meia estrela, nota zero distinta de ausente, "Sua avaliação" nas páginas do livro). `LivroSnapshot.autor` passou a aceitar `null` no `common-v1` e o `social` foi ajustado para livro sem autor, aguardando a revisão do Kayke.

### Revisão 17/09/2026: endpoints e parâmetros alinhados a `docs/api/leitura.yaml`; operações, campos, business keys e ownership alinhados ao catálogo e aos schemas canônicos. Registrados os contratos exatos das VIEWs e do livro cross-schema, o baseline DER já implantado sem alegar implementação, P0-MSG como bloqueio, a semântica de idempotência e a divisão dos testes. `nota.alterada.v1` foi consolidado com a faixa completa de 0 a 5 de RN-06.

### Revisão 01/09/2026: exclusão física de resenha e `resenha.excluida` aprovados; recriação gera novo registro e nova atividade, com publicação pela outbox.

### Revisão 28/08/2026: VIEWs foram renomeadas e tiveram consumidores delimitados; `nota.alterada` e `resenha.publicada` receberam semântica única. Foram adicionados contrato de livro, perfil paginado sob RN-08, confirmação de remoção de nota e idempotência; testes de publisher foram separados dos testes de consumo/DLQ.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-AVA no [periodo-1/README.md](README.md), de RF-AVA-01..04 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.5, das RN-06/RN-07/RN-04.5 e da arquitetura §3.2/§4.2. Nota/resenha fixadas como pertencentes ao livro (não à leitura) em `leitura`, com VIEWs de saída; reações, frases e Markdown adiados ao Período 2.
