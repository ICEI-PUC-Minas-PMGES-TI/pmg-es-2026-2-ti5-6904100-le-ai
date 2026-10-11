# Plano — F-AVA-2 (Reações, Markdown e frases)

> **Executado em 09/10/2026.** Os quatro commits saíram como planejado. O que mudou na execução está na timeline e nas Pendências de [`../feature-F-AVA-2.md`](../feature-F-AVA-2.md), que prevalece sobre este plano.

> Plano de 07/10/2026, **revisado em 08/10/2026** com os achados da revisão independente (`revisao-plano-F-AVA-2.md`). Primeiro passo da execução: copiar este arquivo para `docs/plano-de-desenvolvimento/periodo-2/renato-periodo-2/plano-F-AVA-2.md`, que fica sendo a versão de trabalho.

## Contexto

A F-AVA-2 é a primeira das três features do Renato no Período 2. Ela fecha os requisitos Desejáveis de avaliação e destrava a F-MOD, que remove frases:

- **RF-AVA-05:** curtir e descurtir resenhas de outros, inclusive em livro pessoal acessível;
- **RF-AVA-06 e 07:** frases e trechos, com página obrigatória;
- **RF-AVA-08:** contagens de curtidas e descurtidas separadas;
- **RF-AVA-09:** Markdown na resenha, com pré-visualização.

**Fontes:**
- `feature-F-AVA-2.md`;
- REQUISITOS RN-07, RN-08, RN-11, RN-13 e RN-15;
- prompts de design em `docs/design/periodo-2/`: pagina-do-livro, livro-pessoal, meu-perfil, perfil-de-outro-leitor, escrever-resenha, F-AVA-2/frases-do-livro e adicionar-frase, notificacoes.

Protótipo é referência visual. Em conflito, o REQUISITOS vence.

## Regras de execução (pedidas pelo Renato)

- **Pré-requisito 0:** `git fetch` e `git merge --ff-only origin/desenvolvimento` na `renato-features`.
  - Em 08/10 ela estava 42 commits atrás e nenhum à frente.
  - O remoto trouxe a F-ACV-DESCOBERTA (web e mobile), a etapa 3 da F-LST (via lista no `acervo`) e a F-CONTA-2.
  - **Reler antes de editar** os arquivos que esses commits tocaram:
    - backend: `acervo/src/db/contratos-externos.ts`, `acervo/test/integracao/banco.ts`, `leitura/src/app.module.ts`;
    - docs: `leitura/AGENTS.md`, `docs/api/acervo.yaml`, `docs/mensageria/catalogo.md`;
    - web: `LivroOficialView.vue`, `services/acervo.ts`;
    - mobile: `livro_oficial_page.dart`, `livro_oficial.dart`, `acervo_service.dart`.
- **Branch `renato-features`**, com merge na `desenvolvimento` no fim. **Sem push**: o Renato revisa e sobe.
- **Quatro commits**, cada um com só a linha de mensagem: sem descrição, sem `Co-Authored-By`, autor RenatoDNS (o git já está configurado). Cada `feat` leva backend, web, mobile, contratos, testes e o `AGENTS.md` dos serviços tocados:
  1. `feat: curtir e descurtir resenhas`
  2. `feat: frases e trechos dos livros`
  3. `feat: resenha em markdown com pre-visualizacao`
  4. `docs: F-AVA-2 concluida`, com o arquivo da feature, este plano, o README da pasta e a nota na F-MOD.
- **`git add` por caminho** em todo commit. A pasta `renato-periodo-2/` (que ainda não está no Git) só entra no commit 4.
- **Testes antes de cada commit:** o commit só sai com todas as camadas prontas e os testes automáticos verdes. O teste manual vem logo depois de cada `feat`. Correção achada nele entra no mesmo commit, se ainda não foi feito, ou num `fix:` específico.
- **`--check` dos tokens:** no Windows (`core.autocrlf=true`), o `--check` acusa diferença só pelo CRLF dos artefatos gerados. Localmente valem `flutter analyze`, `flutter test` e `flutter build apk --debug`, e o `--check` fica com a CI depois do push. **Não regenerar os tokens.**
- **A migration é revisada pelo Renato antes de ir para o banco de dev** (AGENTS §5.6). A execução para, mostra o SQL e espera o OK.
- O que depende de outra pessoa vira **débito** no arquivo da feature, e a execução segue sem esperar.
- Não editar `docs/orquestador/*`, nem arquivos de feature de outras pessoas (AGENTS §5.3).

## Decisões do dono (a comunicar ao grupo; não esperam resposta)

1. **Resenhas antigas** passam a ser exibidas como Markdown. O texto gravado não muda e não há migration.
2. **Enter simples quebra a linha**, igual nos dois parsers.
3. **Prévias sem marcação:** feed e card do perfil (3 ou 4 linhas) mostram o texto sem marcação. A resenha inteira aparece formatada na página do livro, em "Sua avaliação" e no livro pessoal.
4. **Frases seguem o RN-08:** a frase de autor privado só aparece para quem o segue e para o próprio autor.
5. **Tachado só com `~~texto~~`** nos dois clientes. O limite de 5.000 conta code points, incluindo a marcação.
6. **Ratificações de design**, seguindo o protótipo:
   - `0 descurtidas` aparece;
   - negrito em Newsreader 600;
   - pré-visualização não esconde spoiler;
   - faixa quando há marcação fora do subconjunto;
   - Enter continua a lista, e Enter num item vazio sai dela.
7. **A reação de quem está vendo chega pela `acervo`.** Uma VIEW nova do `leitura`, `v_reacao_resenha_v1 (resenha_id, usuario_id, tipo)` com só as reações ativas, deixa a página do livro receber `minhaReacao` junto das resenhas.
8. **A notificação abre a página do livro**: a oficial, ou a pessoal quando `livro.tipo = pessoal`. O `resenhaId` fica guardado em `dados` da notificação, mas não vai para a resposta. Divergência registrada: o design diz "na resenha da leitora".
9. **Copy da curtida em atividade do `social` não muda.** Divergência registrada: com isso, `ATIVIDADE_CURTIDA` de uma resenha e `RESENHA_CURTIDA` têm o mesmo texto ("X curtiu sua resenha de Y."), contrariando `notificacoes.md:40-45`. O rótulo acessível também fica igual, porque o ícone é decorativo. **Débito:** decidir com o Kayke depois.
10. **Contagens da própria resenha aparecem também na página do livro oficial**, só para leitura, porque o RF-AVA-08 vale para todos que têm acesso. Divergência do protótipo registrada (o próprio design marca isso como "a decidir", em `livro-pessoal.md:410`).
11. **O menu `DotsThree` da resenha fica para a F-MOD.** A F-AVA-2 não precisa dele, porque as reações são botões.

## Dependências de outras pessoas

| O quê | De quem | Situação |
|---|---|---|
| Via lista no `acervo` (F-LST etapa 3) | Henrique, combinado com o Vicenzo | **Concluída em 08/10** (`b2d76cc`). O `leitura` reproduz a regra de `viaLista`, e não há débito. |
| Remoção de `reacao_resenha` e `frase` na exclusão de conta | Henrique (F-CONTA-2) | **Já entregue** em `leitura/src/conta/conta-excluida.consumer.ts`. A F-AVA-2 não cria tabela nova (a VIEW não guarda dados). |
| Copy das duas curtidas | Kayke | **Débito** (decisão 9) |
| DES | merge de fechamento do Período 2 | **Débito** padrão |
| Migration `0005` do `leitura` | Ana e Vicenzo também trabalham no `leitura` | Em 08/10 ninguém tinha criado uma `0005`. Conferir no `git fetch`; se outra aparecer, renumerar com `when` maior. |

**Código de outras pessoas que esta feature toca**, sem esperar ninguém. Registrar a mudança no `AGENTS.md` do serviço, como a F-AVA fez, e avisar o dono no grupo:

| De quem | Onde | Arquivos |
|---|---|---|
| Kayke | `social` | consumidor de notificações, `docs/api/social.yaml` e o Javadoc de `LivroDaNotificacaoResposta` |
| Kayke | mobile | notificações (tipo, ícone e rota) |
| Kayke | web e mobile | prévia do feed: `ItemAtividade.vue` e `item_atividade.dart` |
| Vicenzo | `acervo` (livro pessoal) | `leitura-do-dono.repository.ts`, `livro-pessoal.dto.ts`, `contratos-externos.ts`, `test/integracao/banco.ts`, `livro-pessoal.int-spec.ts` |
| Vicenzo | mobile | `acervo_service.dart` |

**Quem depende desta feature:** a F-MOD, que também é do Renato. A nota de "pronto" vai em `feature-F-MOD.md`.

## Pré-requisitos no PC

- Abrir o Docker Desktop. Hoje ele não está rodando, e os testes de integração usam o container `leai-pg-teste` na porta 55432, com um banco por serviço.
- `.env` dos serviços apontando para o banco e o broker **de dev**. O `leitura` e o `social` sobem com AMQP ligado para o teste da notificação.
- AVD `Pixel_8_API_35`, Flutter 3.47, Node e JDK 21 (já instalados).

---

## Commit 1 — `feat: curtir e descurtir resenhas`

### `leitura` (NestJS)

- **Migration escrita à mão `0005_<AAAAMMDDhhmmss>_cria_v_reacao_resenha_v1.sql`:**
  - SQL: `CREATE VIEW leitura.v_reacao_resenha_v1 AS SELECT resenha_id, usuario_id, tipo FROM leitura.reacao_resenha WHERE ativa`.
  - Entrada no `drizzle/meta/_journal.json` com `when` igual à hora atual. Ele precisa ser maior que o `max(created_at)` de `leitura.__drizzle_migrations` no dev, ou o migrator ignora a migration sem erro.
  - VIEW também declarada em `src/db/schema.ts`.
  - **Não usar `db:generate`**, porque o snapshot está defasado.
  - O Renato revisa o SQL. Depois do `db:migrate` no dev, conferir que a VIEW existe.
- **`src/db/contratos-externos.ts`:** `social.v_atividade_livro_pessoal_v1 (atividade_id, dono_id, livro_id)` e `social.v_lista_livro_pessoal_v1 (lista_id, dono_id, livro_id)`, com `.existing()`.
- **Módulo `src/reacoes/`:** controller, service, repository, dto, `regras.ts` e specs.
  - **Rotas:**
    - `PUT /resenhas/:resenhaId/reacao` com corpo `{ tipo: 'curtida'|'descurtida', via?: 'feed'|'lista', referenciaId?: uuid }`;
    - `DELETE /resenhas/:resenhaId/reacao?via&referenciaId`.
    - As duas respondem `{ minhaReacao, curtidas, descurtidas }`.
  - **Infraestrutura reaproveitada:**
    - `@UsuarioAtual()` e `@IdempotencyKey()` (que é obrigatório);
    - `IdempotenciaService.executar`, com operações novas em `OPERACOES`. `via` e `referenciaId` entram no payload do hash;
    - `RateLimitGuard`, com um `escopo` por rota (60 por identidade e 120 por IP a cada 60 s);
    - pipe de UUID em minúsculas e as classes de `erros-de-negocio.ts`;
    - o tratamento de 503 por contrato externo indisponível. Ele é privado em `AvaliacoesService`, então extrair para `common/` ou copiar o padrão.
  - **Regras, as mesmas no PUT e no DELETE:**
    1. A resenha existe; se não, 404.
    2. O livro (`v_livro_referencia_v1`) está ativo; se não, 404.
    3. Resenha do próprio leitor: **422 `REACAO_PROPRIA`**.
    4. O autor está em `v_perfil_referencia_v1`; se não, 404.
    5. O **reator** também está em `v_perfil_referencia_v1`, porque é dele o `autorAcao` do evento. Se não estiver (suspenso ou em exclusão), **403**, como em `salvarResenha`.
    6. **Livro oficial:** RN-08, ou seja, autor público ou seguimento aceito.
    7. **Livro pessoal:** `via` e `referenciaId` são obrigatórios.
       - `feed`: a regra de `acervo/src/livros/pessoal/autorizacao-rn15.service.ts` (atividade, seguimento aceito e perfil).
       - `lista`: a regra de `viaLista` do mesmo arquivo (lista ativa do dono contendo o livro, mais perfil público ou seguimento aceito).
    - Falha de acesso responde **404**. Quem perde o acesso não remove a reação, que continua contada.
  - **Escrita atômica:**
    - `INSERT ... ON CONFLICT DO NOTHING`, depois `SELECT ... FOR UPDATE`, depois `UPDATE`. O PG 17 não tem `OLD` em `RETURNING`.
    - Remover é `ativa = false`. A linha fica guardada, e com ela o `primeira_curtida_em`.
    - Curtir com `primeira_curtida_em` nulo preenche a coluna e publica **`resenha.curtida`** na mesma transação (`OutboxRepository.inserir`).
    - Recurtir ou alternar não publica. Descurtida nunca publica. Excluir a resenha já limpa as reações (cascata).
  - **Evento `resenha.curtida` v1:**
    - `data` = `{ destinatarioId, resenhaId, autorAcao: UsuarioSnapshot, livro: LivroSnapshot }`, com chave `resenha:<resenhaId>:curtida:<autorAcaoId>` (no formato do `catalogo.md`).
    - Schema canônico em `docs/mensageria/schemas/resenha.curtida.v1.schema.json`, no molde de `atividade.curtida.v1`, mais a linha nova no `catalogo.md`.
    - Cópia de runtime em `src/messaging/schemas/` (o `schemas.spec.ts` confere a cópia) e registro no `onModuleInit`.
- **Contagens onde o próprio `leitura` serve resenha:**
  - `GET /perfis/:usuarioId/resenhas`: `curtidas`, `descurtidas` e `minhaReacao`;
  - `GET /livros/:livroId/minha-avaliacao`: as contagens entram só em `MinhaAvaliacao.resenha`, por um schema novo `MinhaResenha` (`allOf: [Resenha]` mais as duas contagens). A resposta do `PUT /livros/{livroId}/resenha` não muda, porque `Resenha` tem `additionalProperties: false` e há recibos de idempotência gravados.
- **Testes de integração** (`test/integracao/reacao.int-spec.ts`):
  - **Fixture:** o schema `social` com as duas tabelas falsas, no DROP e no `limpar()` de `banco.ts`.
  - **Regras de reação:** reação única e alternável; retirar e recurtir sem evento novo; duas curtidas simultâneas do mesmo reator, com chaves diferentes, geram um evento só; reação à própria resenha dá 422; reator sem perfil dá 403.
  - **Acesso:** público, privado seguido e privado não seguido (404). Livro pessoal pelo feed e pela lista: válido, forjado, lista de outro livro e lista excluída. 503 sem contrato. O DELETE revalida o acesso.
  - **Robustez:** idempotência (replay e payload diferente dá 409) e 429.
  - **Evento e leitura:** envelope válido no broker em memória; contagens no perfil e em `minha-avaliacao`.
  - **Unitários:** `regras.spec.ts`.

### `social` (Spring, código do Kayke)

- `EventoDeNotificacao.java` ganha a linha `resenha.curtida`:
  - exchange `leai.events.leitura`, tipo `RESENHA_CURTIDA`, ator `autorAcao`;
  - `camposCopiados` com `resenhaId`, o que exige o campo `RESENHA_ID` em `DadosDeNotificacao`. O `livro` é copiado como hoje.
- `TipoNotificacao.java` ganha `RESENHA_CURTIDA("resenha_curtida")`. O CHECK já aceita esse valor, então não há migration.
- `RedacaoDeNotificacao.java`: "X curtiu sua resenha de Y.".
- `MessagingConstants.java`, `MessageValidator.EVENTOS_V1` e a cópia do schema em `resources/messaging/schemas/`. **Conferir à mão** que a cópia é igual ao canônico, porque o `social` não tem teste para isso.
- **Testes:**
  - `ConsumidorDeNotificacaoIntegracaoTest`: mesma resenha e mesmo reator com outro `eventId` não duplica;
  - `ConsumidorDeNotificacaoBrokerTest`: `resenha.curtida` sem `resenhaId` vai para a DLQ sem gravar; binding novo em `amarraAsTresOrigens`;
  - `EventosDeNotificacaoDeTeste`: `resenhaId` no `Fato`, case em `chaveDeNegocio` e em `dados()` (o compilador não cobra este) e um caso com `livro` pessoal.
- **Registrar na feature:** a preferência de notificação ainda não é lida pelo `social` (fica para a F-NOT-OPC). O critério "mesmo se suprimida por preferência" é garantido pelo produtor (`primeira_curtida_em`) e pelo `UNIQUE (destinatario_id, tipo, chave_negocio)`.

### `acervo` (NestJS)

- `src/db/contratos-externos.ts`:
  - declarar `leitura.v_reacao_resenha_v1`;
  - contagens como `bigint`, convertidas com `Number()`.
- O fixture `test/integracao/banco.ts` passa a usar `bigint` nas contagens e ganha a VIEW nova como tabela falsa.
- `src/livros/busca/resenhas.repository.ts` (página do livro) e `src/livros/pessoal/leitura-do-dono.repository.ts` (visitante do livro pessoal) selecionam as contagens e fazem LEFT JOIN na VIEW nova, filtrada por quem está vendo.
- `ResenhaResumoDto` em `livro-pessoal.dto.ts`: `curtidas`, `descurtidas` e `minhaReacao`. Se faltar `id` na resenha do dono, o DTO também ganha `id`.
- **Testes de integração** do livro oficial e do livro pessoal (`livro-pessoal.int-spec.ts`).
- **Comportamento a registrar:** no deploy, se o `acervo` subir antes da migration do `leitura`, as resenhas vêm `null` e `GET /resenhas` dá 503 até a VIEW existir.

### Web (`code/front`)

- `services/leitura.ts`: `reagir(resenhaId, tipo, via?)` e `removerReacao(...)`, com **uma chave por intenção** (padrão de `src/livros/useMinhaAvaliacao.ts`). Tipos novos em `services/acervo.ts` e `services/leitura.ts`.
- **Componente `components/livros/ReacoesDaResenha.vue`:**
  - `ThumbsUp` e `ThumbsDown` de 20 px; alvo de 48 px; `aria-pressed`;
  - rótulo acessível com a contagem;
  - ativo em `fill` `musgo`;
  - copy `12 curtidas`, `1 curtida`, `0 descurtidas`;
  - atualização otimista no molde de `feed/useCurtidas.ts`. Erro, 429, 503 ou timeout revertem e mostram `Não foi possível registrar sua reação. Tente de novo em alguns instantes.`;
  - aparece **mesmo com o spoiler oculto**;
  - variante só leitura com ícones de 16 px.
- **Onde entra:**
  - `CardResenha.vue` (página do livro);
  - visitante em `LivroPessoalView.vue`, repassando `via` e `referenciaId` da rota;
  - `components/perfil/CardResenhaDoPerfil.vue`: botões no perfil de outro leitor, só leitura no meu perfil;
  - `BlocoSuaAvaliacao.vue`: só leitura, **no livro oficial e no pessoal** (decisão 10).
- **Testes** (Vitest): alternar, otimismo e reversão, 429, 503 e timeout com API simulada, e copy no singular e no plural.

### Mobile (`code/mobile`)

- `features/avaliacao/leitura_service.dart`: `reagir` e `removerReacao`, **sem** mexer em `alteracoes`. Senão, o perfil recarrega e atropela o otimismo.
- **Modelos:**
  - `ResenhaDoDono` (`features/livros/acervo_service.dart`) ganha `id`, `curtidas`, `descurtidas` e `minhaReacao`;
  - os modelos de `livro_oficial.dart` e do perfil ganham os três campos.
- **Widget `ReacoesDaResenha`**, no molde de `feed/curtidas_otimistas.dart`. O estado local vem da resposta `{ minhaReacao, curtidas, descurtidas }`.
  - Onde entra: `_Resenha` em `livro_oficial_page.dart`, o visitante em `livro_pessoal_page.dart`, `_CardDaResenha` em `resenhas_do_perfil.dart` e `bloco_sua_avaliacao.dart` (só leitura, oficial e pessoal).
- **Notificações:**
  - `notificacao.dart`: tipo novo em `_doContrato`;
  - `notificacoes_page.dart`: ícone `ThumbsUp`;
  - `rotas_notificacoes.dart`: destino por `livro.tipo`, com `rotaLivroOficial` e `rotaLivroPessoalNaEstante` de `rotas_livros.dart`.
- **Testes de widget** com `MockClient`, incluindo 503 e timeout, mais os casos novos em `notificacoes_page_test.dart` e `rotas_notificacoes_test.dart`.

### Contratos e documentação

- **`docs/api/leitura.yaml`:**
  - rotas de reação, com `resenha.curtida` citado na descrição do PUT;
  - `ResenhaDoPerfil` com contagens e `MinhaResenha`;
  - `v_reacao_resenha_v1` em `x-database-contracts`;
  - `info.description` sem a frase "reações e Markdown não fazem parte";
  - `x-implemented-by: F-AVA-2`.
- **`docs/api/social.yaml`:** `resenha.curtida` vai para os consumidos e `RESENHA_CURTIDA` para os valores. O `leitura` passa a constar como consumidor das duas VIEWs de via.
- **`docs/api/acervo.yaml`:** `ResenhaResumo`, mais a dependência de `v_reacao_resenha_v1` nas `x-implementation-notes`.
- **Modelo de dados:** `v_reacao_resenha_v1` em `docs/diagramas/DER.md` (tabela "Views de contrato") e em `docs/4.modelagem.md`. O `leitura` também entra como consumidor das VIEWs de via no `4.modelagem.md`.
- **`AGENTS.md`:**
  - `code/back/leitura`: regras de reação;
  - `code/back/social` e `code/back/acervo`: "mudança feita pela F-AVA-2".

## Commit 2 — `feat: frases e trechos dos livros`

### `leitura`

- **Módulo `src/frases/`.**
  - **Rotas:**
    - `GET /livros/:livroId/frases?page&limite` (padrão 20, máximo 50) → `{ itens: [{ id, texto, pagina, criadoEm, autor: { id, username, nome, avatarUrl }, minha }], paginacao, minhasFrases, limitePorLivro: 10 }`. Ordem: mais recente primeiro, desempate por id.
    - `POST /livros/:livroId/frases` `{ texto, pagina }` → 201.
    - `DELETE /frases/:fraseId` → 204 quando a frase é sua; 404 quando não existe ou é de outro.
  - **Acesso:**
    - Livro oficial ativo: RN-08 por autor (público, seguido ou o próprio leitor).
    - Livro pessoal: só o dono; os outros recebem 404.
    - Livro inativo ou inexistente: 404.
    - Quem cadastra precisa estar em `v_perfil_referencia_v1`; se não estiver, 403.
  - **Validação** (`EntidadeInvalida` com `campos`, na convenção `ENTIDADE_NAO_PROCESSAVEL`):
    - `texto` com 1 a 500 code points, recusando só espaços, caracteres invisíveis ou `\u0000`, como em `regras.ts`;
    - `pagina` ≥ 1 e ≤ `paginas`, que é `NOT NULL` na `v_livro_referencia_v1`. Por isso o limite superior vale sempre, e a variante do design para livro sem total não se aplica.
  - **Limite de 10:** conferir antes, dentro da transação.
    - O trigger `frase_limite_trigger` levanta 23514. Estender `pg-erros.ts` para ler o campo `where` do erro do `pg` e reconhecer `validar_limite_frases`.
    - Os dois casos dão **422 `LIMITE_DE_FRASES`**. O trigger já usa advisory lock, então a concorrência está resolvida no banco.
  - **Proteção:** idempotência no POST e no DELETE; rate limit no POST (20 por minuto) e no DELETE (30 por minuto). Nenhum evento é publicado.
- **Integração** (`frase.int-spec.ts`):
  - **Validação:** página e texto (limites e code points); 11ª frase recusada, inclusive com duas requisições concorrentes.
  - **Acesso:** RN-08 na listagem; livro pessoal só do dono; excluir a de outro dá 404; cadastrar sem perfil dá 403.
  - **Lista e robustez:** paginação e teto; `minhasFrases`; idempotência.

### Web

- `services/leitura.ts`: `listarFrases`, `criarFrase`, `excluirFrase`.
- **Seção `Frases e trechos`** (`components/livros/SecaoFrases.vue`):
  - título com a contagem e as 3 mais recentes;
  - cada frase em Newsreader itálico, com borda de 2 px `musgo-fundo` e a linha `Página 57 · @username` / `você`;
  - links `Ver todas as frases` e `+ Adicionar frase`;
  - estado vazio com `Adicionar a primeira`.
  - Entra em `LivroOficialView.vue` e em `LivroPessoalView.vue`, só para o dono.
- **Rota `livros/:id/frases`** (e a do livro pessoal), `FrasesDoLivroView.vue`:
  - rolagem infinita, com estados de carregando e de erro (`Tentar de novo`, `frases-do-livro.md:379-400`);
  - linha da cota, que no limite troca o botão pela linha `Info`;
  - `Trash` só nas próprias, com `DialogoConfirmacao` mostrando a frase (pelo slot) e o anúncio `Frase excluída. 13 frases.`
- **`AdicionarFrase.vue`** sobre `SobreposicaoModal`, no molde de `RegistrarProgresso.vue`:
  - contador por code point com `components/livros/ContadorDeCaracteres.vue`, que fica `rubi` sem `maxlength`;
  - página com a ajuda `Entre 1 e {total}`;
  - `Enter` no campo de página e `Ctrl+Enter` enviam;
  - mesma chave no reenvio;
  - o descarte só pergunta quando há trecho;
  - a frase nova vai para o topo e recebe o foco;
  - limite atingido no servidor desabilita os campos e mostra `Ver minhas frases` / `Fechar`.
- **Testes** Vitest dos componentes e da view, inclusive 503 e timeout ao listar e criar.

### Mobile

- Os mesmos três métodos no service.
- `SecaoFrases` nas páginas do livro oficial e do livro pessoal (só o dono).
- `FrasesDoLivroPage`: rolagem paginada, carregando e erro, cota, exclusão por `confirmarAcaoDestrutiva` e anúncio.
- **`AdicionarFrase`** com `showModalBottomSheet` direto no navegador raiz, no molde de `folha_comentarios.dart:42-55`, porque `mostrarFolhaInferior` não tem parâmetro de altura. Altura de até 92%.
- Testes de widget, inclusive 503 e timeout.

### Contratos

- `docs/api/leitura.yaml`: rotas e schemas de frases.
- `code/back/leitura/AGENTS.md`: regras de frases e o tratamento do 23514 do trigger.

## Commit 3 — `feat: resenha em markdown com pre-visualizacao`

O backend não muda. Em `leitura.yaml`, só a descrição de `ResenhaEntrada` passa a citar o subconjunto do RN-13.

### Casos compartilhados (paridade do RN-13.4)

- Arquivo canônico `docs/design-system/markdown-resenha-casos.json`, no mesmo modelo do `tokens.json`, que o mobile já lê dessa pasta. Os testes dos dois clientes leem o arquivo direto.
- O caminho entra no filtro de `.github/workflows/ci-front.yml` e de `ci-mobile.yml`.
- **Casos obrigatórios:**
  - os seis formatos e combinações;
  - `~um~` literal;
  - `\*escapado\*`;
  - `&amp;` e `<b>` literais;
  - `_x_` e `__x__`;
  - `snake_case_word`;
  - `3.` começando em 3;
  - lista dentro de citação;
  - dois espaços no fim da linha;
  - `***x***`;
  - link, imagem, `# título`, código e tabela literais;
  - quebra simples.

### Web

- **Dependências:** `markdown-it` e `dompurify`, em versões fixas (com os tipos, se o `dompurify` não trouxer).
- **`src/markdown/resenha.ts`:**
  - **Configuração do `markdown-it`:** `html: false`, `linkify: false`, `breaks: true`, e `disable` em `link`, `image`, `autolink`, `backticks`, `code`, `fence`, `table`, `heading`, `lheading`, `hr`, `reference`, `html_block`, `html_inline` e `entity`. Um teste confere que o `disable` não lança, porque ele lança quando o nome da regra não existe.
  - **Funções:** `renderizarResenha(texto)` passa a saída pelo `DOMPurify`, só com `p`, `br`, `strong`, `em`, `s`, `ul`, `ol`, `li` e `blockquote`. `textoSemMarcacao(texto)` monta o texto a partir dos tokens.
- **`components/livros/TextoDaResenha.vue`:** `v-html` só com a saída sanitizada, no estilo do design.
  - Formatado em `CardResenha`, `BlocoSuaAvaliacao` e no visitante do `LivroPessoalView`.
  - Sem marcação em `CardResenhaDoPerfil` e `ItemAtividade`.
- **Editor (`EscreverResenhaView.vue`):**
  - abas `Escrever | Visualizar`;
  - barra `TextB` / `TextItalic` / `TextStrikethrough` | `ListBullets` / `ListNumbers` / `Quotes`;
  - envolve a seleção ou insere o par, e tocar de novo remove;
  - prefixo por linha;
  - Enter continua a lista; `Ctrl/Cmd+B` e `Ctrl/Cmd+I`;
  - modo e cursor preservados;
  - prévia sem barra, com o estado vazio `Eye` e a faixa pelo critério de `escrever-resenha.md:356`;
  - copy nova do excesso, "contando a formatação".
  - A lógica de edição fica em `src/markdown/edicao.ts`.
- **Testes:** XSS (`<script>`, `<img onerror>`, `javascript:`, entidades), os casos compartilhados e a barra e o Enter.

### Mobile

- **Dependência:** pacote `markdown` (dart-lang), sem `flutter_markdown`, que foi descontinuado.
- **`lib/features/avaliacao/markdown_resenha.dart`:**
  - `Document(encodeHtml: false, withDefaultBlockSyntaxes: false, withDefaultInlineSyntaxes: false, blockSyntaxes: [EmptyBlockSyntax(), BlockquoteSyntax(), UnorderedListSyntax(), OrderedListSyntax(), ParagraphSyntax()], inlineSyntaxes: [EscapeSyntax(), EmphasisSyntax.asterisk(), EmphasisSyntax.underscore(), TachadoDuplo(), LineBreakSyntax()])`;
  - `TachadoDuplo` é uma `DelimiterSyntax` que só aceita `~~`;
  - a quebra simples vira `\n` no `Text.rich`;
  - renderizador próprio da AST para widgets, e `textoSemMarcacao`.
- **Widget `TextoDaResenha`** nos mesmos lugares da web; sem marcação em `_CardDaResenha` e em `item_atividade.dart`.
- **Editor (`escrever_resenha_page.dart`):** abas de 48 px; faixa da barra acima da barra de spoiler e contador; lógica em `markdown_edicao.dart`.
- **Testes:** os casos compartilhados e testes de widget da prévia e da barra.

### Contratos

- `code/front/AGENTS.md` e `code/mobile/AGENTS.md`: regra do subconjunto e dos casos compartilhados.

## Commit 4 — `docs: F-AVA-2 concluida`

- **`feature-F-AVA-2.md`:**
  - status por camada; DoD; timeline;
  - decisões do dono a comunicar;
  - **divergências registradas:** decisões 8, 9 e 10, os detalhes de design não seguidos e o comportamento no deploy do `acervo`;
  - preferência de notificação ainda não lida;
  - **débitos:** copy das curtidas com o Kayke; DES no merge de fechamento;
  - contas de teste criadas no dev.
- **`renato-periodo-2/`:**
  - este plano;
  - `README.md` atualizado:
    - item 1: o DES foi conferido em 07/10;
    - item 2: as decisões foram tomadas pelo dono em 07/10;
    - item 3: concluído, sem a pendência da via lista, feita pelo Henrique em 08/10;
    - item 4: a F-MOD abre o menu `DotsThree` da resenha e não reaproveita `textoSemMarcacao` no trecho de 3 linhas, porque `F-MOD/denunciar.md:281` preserva o itálico;
    - item 6: a F-CONTA-2 já foi entregue, e as tabelas novas da F-MOD e da F-ACV-NOTA precisam ser avisadas ao Henrique para entrar nos consumidores de `conta.excluida`.
- **`feature-F-MOD.md`:** nota de que frases e reações estão prontas.

---

## Verificação

**Automática, antes de cada commit** (comandos dos `AGENTS.md`):

| Onde | Comandos |
|---|---|
| `leitura` | `npx eslint "src/**/*.ts" --rule '{"prettier/prettier": ["error", {"endOfLine": "auto"}]}'`, `npm run build`, `npm test`, `npm run test:integration` com `DATABASE_URL_TESTE=postgresql://postgres:teste@localhost:55432/leai_teste_leitura` |
| `acervo` | o mesmo, no banco de teste dele |
| `social` | `./mvnw verify`, com `DATABASE_URL_TESTE` |
| Web | `npm run lint && npm run build && npm test` |
| Mobile | `flutter analyze && flutter test && flutter build apk --debug` (o `--check` dos tokens fica com a CI) |

**Manual, feita pelo Claude depois de cada `feat`:**

- **Ambiente:**
  - `identidade` (8080), `social` (8081), `acervo` (3000) e `leitura` (3001) no banco e no broker de dev;
  - web com `npm run dev`, conferida no navegador com captura de tela;
  - mobile no AVD com `flutter run` e os `--dart-define` de `10.0.2.2`, conferido por `adb exec-out screencap` e toques via `adb shell input`.
- **Contas novas no dev:** três, com e-mail `@teste.leai.invalid` — A pública, B pública e C privada, com e sem seguimento.
- **Reações:**
  - B curte a resenha de A na página do livro, e as contagens mudam na hora;
  - alternar e retirar;
  - recurtir não gera segunda notificação (conferir por SQL na `outbox_leitura` e em `social.notificacao`);
  - A recebe no mobile a notificação `ThumbsUp` em tempo real, e o toque abre o livro;
  - C privada: B sem seguir não vê nem reage (404 pela API);
  - a própria resenha tem só a contagem para leitura;
  - **livro pessoal de A:**
    - pelo feed, B reage;
    - **pela lista** (A põe o livro numa lista), B, que é público e não segue A, abre e reage;
    - um leitor sem seguimento, com o perfil de C privado, recebe 404;
    - `referenciaId` de outra lista e `referenciaId` forjado são recusados;
  - perfil de outro leitor com botões; meu perfil só leitura;
  - 429 com reversão.
- **Frases:**
  - página fora do total e sem página;
  - chegar a 10 e ver a linha de limite;
  - excluir a própria com confirmação;
  - a frase da C some para quem não a segue;
  - livro pessoal: só o dono vê a seção.
- **Markdown:**
  - os seis formatos na barra e na prévia;
  - link, imagem, `# título` e `<b>` literais;
  - resenha antiga com quebras de linha continua legível;
  - feed e perfil sem marcação;
  - limite contando a formatação;
  - a mesma resenha lado a lado na web e no mobile.
- **Modo claro e escuro**; web a 1440 e a 390 px.
- **Cuidados:**
  - o banco e o broker de dev são de todo o time;
  - se a notificação não chegar, olhar a DLQ antes de depurar, porque um `social` antigo de outra pessoa pode estar consumindo a mesma fila.

**Depois do push do Renato:** CI verde na `renato-features` e na `desenvolvimento`, incluindo o `--check` dos tokens.

## Riscos

- **Snapshot do Drizzle defasado e `when` da migration:** a migration é escrita à mão e revisada pelo Renato, e depois é preciso conferir que a VIEW existe.
- **Duas bibliotecas de Markdown:** os casos compartilhados nos dois clientes garantem a paridade.
- **`v-html`:** só com a saída do DOMPurify, e o teste de XSS é obrigatório.
- **Código de outros:** o feed e as notificações do Kayke e o livro pessoal do Vicenzo recebem mudanças pequenas, registradas no `AGENTS.md` e avisadas no grupo.
- **Página do livro:** o Vicenzo acabou de mexer nela (F-ACV-DESCOBERTA), e a Ana ainda vai mexer (F-EST-2). É preciso reler antes de editar.
