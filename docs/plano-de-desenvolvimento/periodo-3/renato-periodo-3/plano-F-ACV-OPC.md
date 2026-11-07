# Plano — F-ACV-OPC (Extras de acervo)

> Plano de 06/11/2026, revisado no mesmo dia com 12 achados (veredito: aprovar com ajustes) e com a decisão 9 do dono.

## Contexto

**Requisitos:**
- **RF-ACV-22:** o leitor informa assuntos do conjunto curado ao cadastrar e editar um livro pessoal. Eles não afetam contadores de catálogo (RN-21.5, RN-03).
- **RF-ACV-14:** recarga manual do dump para atualizar a base oficial, idempotente e sem apagar dado local.
- **RNFs:** SEC-02/06/12/13/33, DES-04/05, ARQ-05, TST-02..08.

**Fontes:**
- arquivo da feature: `periodo-3/feature-F-ACV-OPC.md`;
- REQUISITOS §5.2, RN-02, RN-03, RN-12, RN-14, RN-19, RN-21, §10.1 e §10.2;
- design P3: `cadastro-pessoal` e `livro-pessoal`;
- features estendidas: F-ACV-INGESTAO, F-ACV-CADASTRO, F-ACV-BUSCA, F-ACV-NOTA e F-ACV-DESCOBERTA.

**Prazo:** congelamento de features em **17/11/2026**. O merge na `main` e o DES ficam para o fechamento de novembro, com o grupo.

**Base:** `origin/desenvolvimento` em `e1b3b3a`. A `renato-features` está 1 commit à frente (docs) e 0 atrás.

### O que já existe — schema `acervo`

- **`assunto`** (`code/back/acervo/drizzle/0001_20260916110700_modelo_der.sql:3-9`): `id`, `nome`, `slug`. O conjunto curado são todas as linhas.
  - Os 31 assuntos vêm de `code/scripts/ingestao/dados/assuntos.csv`, gravados pelo `semear` (`carga.py:283-300`).
  - O `seed.ts` do serviço só cria 2 (`src/db/seed.ts:83-87`).
- **`livro_assunto`** (`0001:179-183`):
  - PK `(livro_id, assunto_id)`;
  - FK de livro **ON DELETE CASCADE** (`:270`) e de assunto **ON DELETE RESTRICT** (`:271`).
  - **Nenhum CHECK ou trigger impede livro pessoal.** A massa de teste já grava assunto em pessoal (`test/integracao/massa.ts:69-93`).
- **Apagar o livro pessoal:**
  - o `DELETE` HTTP é lógico (`ativo=false`, `livro-pessoal.repository.ts:128-140`), e as linhas de `livro_assunto` ficam, com o livro inativo e filtrado em todo lugar;
  - `conta-excluida.consumer.ts:101-104` faz `DELETE` real, e o CASCADE leva `livro_assunto` (guarda em `test/integracao/guarda-exclusao.int-spec.ts:20-23`).
- **`ingestao_execucao`** (`0001:91-113`):
  - o CHECK de tipo **já aceita `recarga`** (`:100`);
  - totais de processados, descartados e inseridos, com `descartados + inseridos <= processados`;
  - não há coluna de "atualizados".
- **`livro`** (`0001:115-177`):
  - `tipo` e `dono_id`;
  - `atualizado_em` sem trigger, que é o relógio da sinopse (`livro-oficial.repository.ts:39-47`);
  - `capa_url_externa`, `capa_url_propria` + `capa_asset_id`, `sinopse`/`sinopse_status`, `nota_geral`/`nota_geral_qtd`.
  - O CHECK `livro_oficial_pessoal_ck` (`:152-175`) proíbe isbn, chaves OL, editora, série e nota em livro pessoal.
  - A nota dos leitores fica em `nota_leitor_projecao` (CASCADE).
- **Conclusão: nenhuma das duas partes precisa de migration.**

### O que já existe — livro pessoal (`acervo`, Vicenzo)

- **Rotas** (`src/livros/pessoal/livro-pessoal.controller.ts`):
  - `POST` (:51-75), `GET` (:77-108), `PATCH` (:110-152) e `DELETE` (:154-174);
  - o PATCH filtra as chaves por `CAMPOS_ATUALIZAVEIS` (:37-43, :126-142): ausente preserva, `null` limpa.
- **DTOs com class-validator** (`dto/livro-pessoal.dto.ts:22-102`):
  - o `ValidationPipe` usa `forbidNonWhitelisted` (`src/configurar-app.ts:41-48`);
  - **hoje, mandar `assuntos` dá 400 "Este campo não é aceito."**
- **Service:**
  - `criar` (`livro-pessoal.service.ts:43-76`) e `atualizar` (:135-189) rodam dentro de `idempotencia.executar`;
  - a propriedade é conferida dentro do efeito, por `exigirPropriedade` (:218-230): 404 para livro inexistente ou inativo, 403 para outro dono.
- **Leitura:** dono, ou terceiro pela RN-15 em `autorizacao-rn15.service.ts:40-169` (feed com seguimento aceito; lista com perfil público ou seguimento). A resposta `LivroPessoalDetalheDto` (`dto:150-174`, montada em `service.ts:253-279`) **não tem assuntos**.
- **Idempotência:**
  - o hash do payload é canônico, mas **arrays mantêm a ordem** (`src/common/hash-payload.ts:23-24`), então `[a,b]` e `[b,a]` dão hashes diferentes;
  - o recibo e o efeito ficam na mesma transação (`idempotencia.service.ts:43-76`).
- **Erro de validação:** 400 `REQUISICAO_INVALIDA` com `campos[{campo, mensagem}]` (`src/common/erros-de-negocio.ts:38-45`; `acervo.yaml:800-815`). O `acervo` não tem 422 de negócio, então o padrão é único no serviço.
- **`GET /assuntos` já existe** (F-ACV-BUSCA, Renato):
  - `busca.controller.ts:21-31` e `busca.repository.ts:139-146`;
  - ordem `f_busca_normalizar(nome), nome`, limite de 100, autenticado;
  - clientes: web `services/acervo.ts:322-326`, mobile `acervo_service.dart:248-256`.
  - **É reaproveitado.**
- **Ficha do oficial:** devolve `assuntos: [{id, nome}]` (`busca.repository.ts:103-112`, `AssuntoResumoDto` em `dto/busca.dto.ts:156-159`). O livro pessoal usa o mesmo formato.

### Inventário de isolamento (toda leitura de `livro_assunto`/`assunto`)

| # | Onde | Filtra oficial? | Efeito de assunto em livro pessoal | Dono |
|---|---|---|---|---|
| A | `busca.repository.ts:103-112`, `assuntos` do resumo (busca, páginas, ficha) | só sobre ids já filtrados (`encontrados`, :205-209; ficha `livro-oficial.repository.ts:74`) | nenhum | Renato (BUSCA) |
| B | `busca.repository.ts:280-284`, `q` casa o nome do assunto | o CTE `encontrados` exige `tipo='oficial' AND ativo` (:287-292) | descartado | Renato |
| C | `busca.repository.ts:311-316`, filtro `?assunto=` | sim (:238, :291) | nenhum | Renato |
| D | `busca.repository.ts:140-146`, `GET /assuntos` | não lê livro, não conta | nenhum | Renato |
| E | `busca.repository.ts:149-155`, `totalItens` | herda `encontrados` | nenhum | Renato |
| F | páginas de autor, editora e série (`catalogo.service.ts:33-95` → `BuscaService.paginar`) | mesmo predicado literal | nenhum. Pessoal nem pode ter editora ou série (CHECK) | Vicenzo (DESCOBERTA) |
| H | VIEW `v_livro_recomendacao_v1` (`0001:304-324`), usada pela F-REC-ALG | `WHERE l.tipo='oficial' AND l.ativo` (:323) | nenhum (teste em `livro-pessoal.int-spec.ts:165-172`) | Henrique (contrato) |
| I | VIEW `v_livro_referencia_v1` | não lê assunto | — | — |
| J | `conta-excluida.consumer.ts:101-104` | `tipo='pessoal'` | apaga por CASCADE | Henrique |
| K | `carga.py:121-127` (`SQL_LIVRO_ASSUNTO`), JOIN por `isbn13` | pessoal não tem ISBN (CHECK) | nunca casa | Vicenzo |
| L | `code/scripts/ingestao/README.md:99-100`, query manual de conferência por assunto | **não** | **conta livro pessoal** | Vicenzo |
| M | `tests/test_carga_banco.py:144-148, 219-231` | não | nenhum hoje (banco sem pessoal) | Vicenzo |
| N | `src/db/schema.ts:624-660`, definição Drizzle da VIEW H | sim, mesmo filtro | nenhum | Henrique (contrato) |
| O | `src/db/seed.ts:136-145`, grava `livro_assunto` | só livros oficiais | nenhum | Vicenzo |
| P | `test/integracao/seed.int-spec.ts`, conta vínculos e `totalItens` por assunto | não | quebra se alguém der assunto aos pessoais do seed: **o seed não muda** | Vicenzo |

- **`social`, `leitura` e `identidade` não leem assunto.** A F-REC-ALG não começou (`feature-F-REC-ALG.md:27`) e vai ler a VIEW H, que já exclui pessoal.
- **Testes de isolamento que já existem:** `busca.int-spec.ts:296-321` e `:497-504` (pessoal com `romance` não aparece por `q` nem por filtro), `catalogo.int-spec.ts:269-286` e `livro-oficial.int-spec.ts:268-271`.
- **Conclusão:** o isolamento já vale no código. Esta feature acrescenta testes com o livro pessoal criado **pela API** com assuntos, e corrige L.

### O que já existe — script de carga (Vicenzo; `notas` é do Renato)

- **`cli.py`:** `carregar --tipo {carga_inicial,recarga}` (:307-317). O tipo **só vai para `ingestao_execucao`** (:154); o caminho de carga é o mesmo (:157-165).
  - `inseridos` = livros novos (:166);
  - `processados` e `descartados` vêm de flags (:155-156).
- **`carga.py:174-280`:**
  - uma transação; staging `TEMP ... ON COMMIT DROP` com `COPY` (:29-43, :163-171).
  - **Livro existente:**
    - `SQL_LIVRO` é `ON CONFLICT (isbn13) DO NOTHING`, mais `NOT EXISTS` por `ol_edition_key` (:88-105), então **nenhuma coluna de livro existente é atualizada**, nem a capa externa;
    - autor e assunto **só são acrescidos** (:107-128);
    - editora e série novas são inseridas (:47-63).
  - **Não há `DELETE` nem `UPDATE` no `carregar`.** Capa própria, sinopse, `atualizado_em` e nota ficam intactas por omissão.
  - Livro que deixou de passar nos filtros nem chega ao staging, então permanece.
- **`execucao.py:21-117`:** abre a linha com commit imediato; fecha com `concluida`, ou com `falha` e rollback da carga.
- **`notas` (F-ACV-NOTA, Renato):**
  - roda depois de cada carga ou recarga;
  - replica a nota por obra e **limpa a da obra que saiu do dump de ratings** (`carga.py:636-658`, decisão de 23/10);
  - não toca `atualizado_em`;
  - não grava `ingestao_execucao`.
- **Testes:** `tests/test_carga_banco.py`, 11 testes com o marcador `banco`.
  - Idempotência: reexecuta como `carga_inicial` (:216-233).
  - `--tipo recarga` aparece só em :394-422 (unificação).
  - **Não há teste de preservação pelo `carregar`.**
  - O CI `ci-scripts-ingestao.yml` roda o pytest com `postgres:17-alpine` (:38-75).
- **Gêmeos Python/TS** (`code/scripts/ingestao/AGENTS.md:72-77`): chave unificada, NFC, autor utilizável e texto puro. **A recarga não muda nenhum deles.**
- **Operação:**
  - a carga inicial rodou em 24/09 na máquina do Vicenzo: edições 11,7 GB, obras 3,8 GB e autores 0,7 GB (`feature-F-ACV-INGESTAO.md:150`);
  - foram 56,7 M edições lidas e 11.010 aceitas, que é o universo elegível inteiro;
  - o tempo não foi registrado ("carga de horas");
  - o schema `acervo` ficou com ~11 MB, cerca de 2,2% do plano (`:67`).
  - O DES (`le-ai-oregon`) nasceu de `pg_dump`/`pg_restore` em 25/09 (`feature-P0-DEPLOY.md:197-202`). Desde então, **cada recarga roda em cada banco** (:106).
  - Neon em 06/11:
    - dev: 11.012 oficiais, 11 pessoais, 5.869 `livro_assunto`, banco com 33 MB;
    - DES: 11.011 oficiais e 28 MB;
    - nos dois, só as duas execuções `carga_inicial` de 24/09.
  - **Os dumps não estão nesta máquina.**
- **Concorrência:** a sinopse e a capa própria escrevem colunas diferentes da mesma linha (`sinopse.consumer.ts:67-109`, `cache-de-capas.service.ts:97-101`). Um `UPDATE` da recarga que só lista as suas colunas causa espera de lock, não perda de escrita.
- **`leitura`** lê o total de páginas ao vivo da VIEW (`code/back/leitura/src/estante/infraestrutura/estante.repository.ts:52`). Daí a decisão 5.

### O que já existe — clientes (formulários e páginas do Vicenzo)

**Web:**
- **Formulário** `views/livros/LivroPessoalFormView.vue`:
  - o campo novo entra entre :411 e :412;
  - a chave de idempotência acompanha o conteúdo (:71-74, :246-250);
  - em `tratarErroDeEnvio` (:278-299), uma chave `assuntos` hoje cairia no banner;
  - testes em `LivroPessoalFormView.spec.ts`.
- **Página** `views/livros/LivroPessoalView.vue`: a ficha é um `<dl>` só com "Páginas" (:265-272), e `ehDono = !modoConsulta` (:63).
- **Serviço** `services/acervo.ts`: `LivroPessoalDetalhe` (:57-75), `DadosLivroPessoal` (:78-84) e `corpoDoLivroPessoal` (:243-256), que na edição manda tudo.
- **Peças reaproveitáveis:**
  - `SobreposicaoModal` (folha abaixo de 768 px, diálogo acima);
  - o padrão de multi-seleção com busca de `components/recomendacoes/DialogoRecomendar.vue:346-424`;
  - `normalizar()` sem acento (`recomendacoes/useRecomendar.ts:56`);
  - o estado de erro "Não foi possível carregar os assuntos." de `DescobrirView.vue:301-314`.
  - Não existe seletor múltiplo de assuntos.

**Mobile:**
- **Formulário** `features/livros/livro_pessoal_form_page.dart`:
  - o campo novo entra entre :455 e :456;
  - o erro com `campos` (:299-309) gravaria `assuntos` sem widget nem banner.
- **Página** `features/livros/livro_pessoal_page.dart`: a ficha é um `Row` com "Páginas" (:457-469).
- **Serviço** `acervo_service.dart`: `LivroPessoal.fromJson` (:161-211) e `DadosLivroPessoal.paraJson` (:215-241).
- **Peças reaproveitáveis:** `mostrarFolhaInferior` (`design/widgets/folha_inferior.dart`), `CampoDeBuscaDeLivros`, `semAcento` (`descobrir/agrupar_edicoes.dart:76`) e a multi-seleção de `recomendacoes/recomendar_livro_page.dart:529-591`.

**Design:**
- `cadastro-pessoal.md`:
  - seletor :214-321;
  - copies :373-393;
  - acessibilidade :401-407;
  - os 31 nomes em :28.
- `livro-pessoal.md`:
  - linha `Assuntos` depois de `Páginas`, em texto separado por vírgula, alfabética, sem link, some quando vazia (:20-26, :200-204);
  - leitor de tela: "História e Memórias" (:288).

## Decisões do dono (06/11/2026)

1. **Teto de 5:** só o cliente avisa, a partir do 6º assunto, sem bloquear. O servidor aceita ids distintos do conjunto até 100, o mesmo teto do `GET /assuntos` (RN-21.2: "sem limite rígido").
2. **Design P3 ratificado como está:**
   - ficha com os assuntos em texto, não chip, em ordem alfabética, e a linha some quando vazia;
   - fechar o seletor sem `Concluir` (scrim, arrastar, voltar, Esc) descarta;
   - aviso: "Você escolheu N assuntos. Até 5 ajuda a encontrar o livro com mais precisão.";
   - `assuntos[]` também na leitura em modo consulta: o terceiro pela via vê a mesma linha.
3. **Recarga num livro existente que continua no dump:**
   - atualiza título, ano, capa externa, editora e série quando o dump traz valor; ausente mantém;
   - **assuntos:** substitui pelo mapeamento atual só se o livro mapear ao menos um. Se não mapear nenhum, mantém os atuais;
   - **autores:** só acrescenta;
   - nunca toca capa própria, sinopse, `atualizado_em`, nota geral nem projeção.
4. **Execução real:** a feature entrega o modo validado contra a amostra em Postgres descartável e um roteiro de operação. A execução real fica como **pendência do grupo** no fechamento: baixar os dumps, rodar em dev e em DES, e depois `notas`. Aviso ao Vicenzo. Nenhuma etapa roda a recarga no Neon.
5. **Páginas:** a recarga **não atualiza** o total de páginas de livro existente, para não deixar leitura acima de 100% (o `leitura` lê o total ao vivo). Livro novo entra com as páginas do dump. Fica registrado como divergência pequena da decisão 3.
6. **Nota geral:** compatível. O `carregar` preserva a nota. O `notas` roda em seguida, como passo próprio, e segue a fonte (limpa a nota da obra que saiu do dump de ratings, decisão de 23/10 da F-ACV-NOTA). O roteiro manda rodar os dois.
7. **Corte:** se não couber até 17/11, sai a parte (b) inteira e a recarga vira pendência do grupo.
8. **Commits:** poucos, como na F-MOD-OPC (ver a seção "Commits").
9. **`ol_work_key` (da revisão):** a recarga **não mexe** na chave. Um livro importado pelo Google Books, sem chave e com a nota do Google, continua assim mesmo se o ISBN dele aparecer no dump. Assim o `notas` seguinte não troca nem apaga essa nota (AGENTS da ingestão: "livro sem `ol_work_key` fica como está").
- **Não decidido aqui (do grupo):** se os assuntos do livro pessoal do próprio leitor contam na F-REC-ALG ("Do seu gosto"). Continua como pendência no arquivo da feature.

**Decisões técnicas tomadas pelo código:**
- **`GET /assuntos`** de F-ACV-BUSCA é reaproveitado, sem rota nova. Fica registrado na Timeline (item próprio do DoD).
- **Erros:** os dois casos são 400 `REQUISICAO_INVALIDA` com `campos[{campo:'assuntos'}]`.
  - Texto livre ou item que não é UUID: "Escolha os assuntos da lista do Lê Ai."
  - Id inexistente: a copy do design, "Um dos assuntos escolhidos não está mais na lista do Lê Ai. Revise e salve de novo."
- **Normalização de `assuntos`:** **passar para minúsculas**, remover repetidos e **ordenar os ids** antes do hash de idempotência e da gravação. Assim, `[a,b]`, `[b,a]` e `[A,b]` são a mesma intenção. O `@IsUUID` aceita maiúsculas e o Postgres compara uuid sem diferenciar caixa: sem as minúsculas, a conferência por contagem daria um 400 indevido.
- **PATCH:** `assuntos` ausente preserva; `[]` ou `null` limpa, no mesmo padrão dos outros campos opcionais.
- **Exclusão lógica:** mantém as linhas de `livro_assunto`. Elas não aparecem em lugar nenhum, porque o livro fica inativo. Sem mudança.
- **Recarga sem migration:**
  - a "atualização" não ganha coluna em `ingestao_execucao`;
  - o CLI imprime `livros_atualizados` e `vinculos_assunto_removidos`, e a Timeline registra;
  - `inseridos` continua contando só livros novos.
- **A atualização só roda com `--tipo recarga`.** A carga inicial fica idêntica à de hoje.
- **`ol_work_key`:** a recarga não toca a chave (decisão 9).

## Dependências de outras pessoas (avisar no grupo antes e no PR)

- **Vicenzo (`acervo`, livro pessoal — F-ACV-CADASTRO):**
  - `livro-pessoal.controller.ts`, `dto/livro-pessoal.dto.ts`, `livro-pessoal.service.ts`, `livro-pessoal.repository.ts`;
  - testes `test/integracao/livro-pessoal.int-spec.ts` e `test/integracao/catalogo.int-spec.ts` (este de F-ACV-DESCOBERTA);
  - nota datada em `code/back/acervo/AGENTS.md`.
- **Vicenzo (web):**
  - `views/livros/LivroPessoalFormView.vue`, `views/livros/LivroPessoalView.vue`, os tipos de livro pessoal em `services/acervo.ts` e os specs;
  - nota em `code/front/AGENTS.md`.
- **Vicenzo (mobile):**
  - `features/livros/livro_pessoal_form_page.dart`, `livro_pessoal_page.dart`, `acervo_service.dart` e os testes;
  - nota em `code/mobile/AGENTS.md`.
- **Vicenzo (script — F-ACV-INGESTAO):**
  - `leai_ingestao/carga.py` (`carregar`) e `cli.py`;
  - `README.md`: a seção de recarga, a correção da query L e a linha :141, que ainda diz que a recarga "é daquela feature";
  - `tests/test_carga_banco.py`;
  - nota em `code/scripts/ingestao/AGENTS.md`.
- **Kayke:** nada muda. O `normalizar` de `front/src/recomendacoes/useRecomendar.ts:55` é privado e é dele, então a web ganha um helper próprio em `src/livros/`, sem mexer no arquivo.
- **Henrique:** nada muda. A VIEW `v_livro_recomendacao_v1` já exclui livro pessoal e ganha só um teste com pessoal **com** assunto. Ele recebe o aviso da pendência F-REC-ALG.
- **Grupo:** a execução real da recarga em dev e em DES (decisão 4).
- **Próprios (Renato):** `busca.repository.ts` e `GET /assuntos` não mudam. Os componentes novos dos clientes são da feature.

## Pré-requisitos

0. `git fetch`, `git pull --rebase` e a `renato-features` atualizada com a `origin/desenvolvimento`; `codegraph sync`; aviso ao Vicenzo no grupo.
1. Docker com `postgres:17-alpine` na porta 55432 para os testes de integração do `acervo` e para o pytest do script (`DATABASE_URL_TESTE`). Sem ele, os testes `banco` pulam e **não valem como verificação**.
2. Nenhuma migration, então nada a aplicar no dev. Se a revisão apontar uma, vale a regra do prompt: aplicar no dev assim que os testes passarem.
3. Teste manual: contas próprias por `/auth/register` com e-mail `.invalid`. Os quatro serviços locais apontam para o banco de dev.

## Commits (preferência do dono)

| Commit | Conteúdo | Assunto |
|---|---|---|
| 1 | Parte 1 (`acervo`) + Parte 2 (web) + Parte 3 (mobile) + `docs/api/acervo.yaml` + notas nos `AGENTS.md` | `feat(acervo): assuntos do conjunto curado no livro pessoal` |
| 2 | Parte 4 (script, testes, README, nota) | `feat(ingestao): recarga manual do dump sem apagar dado local` |
| 3 | Correções da revisão da própria entrega (etapa 3) | `fix: ajustes da validação da F-ACV-OPC` |
| 4 | `feature-F-ACV-OPC.md`, Andamento, `README.md` da pasta | `docs: F-ACV-OPC implementada` |

- Push depois de cada commit. O PR só sai na etapa 4.
- Antes de cada commit, a verificação de todas as camadas que ele toca.
- Se o corte da decisão 7 vier, o commit 2 não existe.

## Parte 1 (commit 1) — `acervo`: `assuntos[]` no livro pessoal

**DTO** (`dto/livro-pessoal.dto.ts`):
- `assuntos?` em `LivroPessoalEntradaDto` e em `LivroPessoalAtualizacaoDto`;
- validadores: `@IsOptional()`, `@IsArray()`, `@ArrayMaxSize(100)`, `@IsUUID('all', {each:true})`, **cada um com `message` em pt-BR**. O `validacao.ts:24-36` só traduz o `whitelistValidation`, e sem `message` o 400 sairia como "assuntos must be an array". Mensagens:
  - `IsArray` e `IsUUID`: "Escolha os assuntos da lista do Lê Ai.";
  - `ArrayMaxSize`: "Escolha no máximo 100 assuntos.";
- `null` aceito no PATCH;
- `AssuntoResumoDto[]` em `LivroPessoalDetalheDto` (sempre presente, `[]` quando vazio).

**Controller:** `'assuntos'` entra em `CAMPOS_ATUALIZAVEIS` (:37-43).

**Service** (`criar` e `atualizar`):
- normalizar (`null` → `[]`, minúsculas, remover repetidos, ordenar) **antes** de montar o payload do hash;
- dentro do efeito, numa transação:
  1. `exigirPropriedade` (já existe);
  2. `assuntosExistentes(tx, ids)`: menos ids do que o pedido dá 400 `campos[assuntos]` com a copy do design;
  3. grava o livro;
  4. `substituirAssuntos(tx, livroId, ids)`, só quando `assuntos` veio no corpo.
- O `23503` da FK, se o assunto sumir entre a conferência e o insert, vira o mesmo 400 (`err.cause.code`, AGENTS do `acervo`).
- O erro dentro do efeito desfaz tudo e não grava recibo.

**Repositório** (`livro-pessoal.repository.ts`), sempre com o `tx` recebido:
- `assuntosExistentes(tx, ids)`;
- `substituirAssuntos(tx, livroId, ids)`: `DELETE` dos que saíram e `INSERT ... SELECT unnest($ids) ON CONFLICT DO NOTHING`;
- `assuntosDe(executor, livroId)`: `json_agg({id,nome})` na ordem `f_busca_normalizar(nome), nome`, a mesma do `GET /assuntos`.

**Leitura:** `obter` devolve `assuntos` para o dono e no modo consulta. `criar` e `atualizar` devolvem o detalhe com `assuntos`, que também vai para o recibo.

**Testes de integração** (`livro-pessoal.int-spec.ts`, mais `busca.int-spec.ts` e `catalogo.int-spec.ts`):
- **Criar:**
  - com dois assuntos: 201, e a resposta vem em ordem alfabética;
  - sem `assuntos`: continua igual ao de hoje (regressão).
- **Editar:**
  - substitui;
  - `[]` e `null` esvaziam;
  - PATCH sem `assuntos` preserva;
  - repetidos são removidos, inclusive o mesmo id em maiúsculas;
  - mais de 5 é aceito (decisão 1);
  - 101 dá 400.
- **Rejeições, conferindo a mensagem em pt-BR:**
  - id inexistente: 400 com `campos[0].campo='assuntos'` e nada gravado;
  - texto livre (`["Romance"]`), número e não-array (`"Romance"`): 400.
- **Idempotência:** a mesma chave com `[b,a]`, ou com `[B,a]`, depois de `[a,b]` dá replay, não 409.
- **Propriedade:**
  - PATCH com `assuntos` de um leitor **que tem via válida** (segue o dono e vê o livro pelo feed): 403 e nada muda. Prova que poder ler não dá direito de escrever;
  - livro inativo: 404.
- **Leitura:**
  - terceiro pelo feed e pela lista vê `assuntos`;
  - sem via, 403.
- **Isolamento** com livro criado **pela API** com `romance`:
  - não aparece em `GET /livros?q=romance`, em `?assunto=<id>` nem em `totalItens`;
  - não aparece na página de autor nem em `v_livro_recomendacao_v1`;
  - o `GET /assuntos` não muda.
- **Conta excluída:** apagar a conta leva `livro_assunto` (contagem zero para os livros dela).

**Contrato** (`docs/api/acervo.yaml`):
- `assuntos` em `LivroPessoalEntrada`, `LivroPessoalAtualizacao` e `LivroPessoalDetalhe` (obrigatório na resposta);
- exemplo do 400;
- o cabeçalho deixa de dizer que não há associação de assuntos (:5-17);
- F-ACV-OPC em `x-implemented-features`;
- na descrição de `/assuntos`, que ele também alimenta o seletor do livro pessoal.

**Nota** em `code/back/acervo/AGENTS.md`: o quê, por quê, onde, e a armadilha da ordem do array no hash.

## Parte 2 (commit 1) — web

- **`services/acervo.ts`:**
  - `assuntos: AssuntoResumo[]` em `LivroPessoalDetalhe` e `assuntos: string[]` em `DadosLivroPessoal`;
  - `corpoDoLivroPessoal`: na criação manda só com algum assunto; na edição manda sempre o array.
- **Lógica:** `src/livros/useSeletorDeAssuntos.ts` (estado com tempo, testável):
  - estados `carregando | pronto | erro`;
  - `listarAssuntos`, cold start aos 3 s, filtro sem acento com um helper próprio em `src/livros/`. O `normalizar` de `recomendacoes/useRecomendar.ts` é privado e é do Kayke, então não é exportado;
  - seleção provisória que só se aplica no `Concluir`.
- **`components/livros/SeletorDeAssuntos.vue`:** sobre `SobreposicaoModal` (folha abaixo de 768 px, diálogo de 560 px acima).
  - título com a contagem, a frase da lista fixa, busca com `X`;
  - chips `role="checkbox"` com `Check`;
  - `Limpar` e `Concluir`;
  - sem resultado, carregando (skeleton + cold start) e falha (`Tentar de novo`, `Fechar`);
  - foco e região viva como no design.
- **`components/livros/CampoAssuntos.vue`:**
  - gatilho `Escolher assuntos`;
  - chips alfabéticos com `X` (`Remover <nome>`), `Alterar assuntos`;
  - helper; aviso âmbar a partir do 6º (decisão 2);
  - erro de servidor com o foco em `Alterar assuntos`;
  - estado "salvando".
- **`LivroPessoalFormView.vue`:**
  - o campo entre Páginas e Sinopse;
  - na edição, chega preenchido pelo detalhe;
  - `assuntos` entra no conteúdo da chave de idempotência (ids ordenados);
  - `tratarErroDeEnvio` mapeia `assuntos` para o campo;
  - falha ao carregar a lista não bloqueia Salvar.
- **`LivroPessoalView.vue`:** linha `Assuntos` depois de `Páginas`.
  - Texto com vírgulas e um `span` só para leitor de tela com "e" antes do último.
  - Some quando vazia. Igual para o dono e no modo consulta.
- **Testes (vitest):**
  - seletor: busca sem acento, `Concluir` aplica, fechar descarta, `Limpar`, sem resultado, carregando e cold start, falha e `Tentar de novo`;
  - campo: aviso no 6º, `X` remove e o foco vai ao seguinte;
  - formulário:
    - corpo com ids ordenados;
    - 400 `assuntos` vai para o campo;
    - lista indisponível ou timeout com API simulada ainda salva;
    - a chave muda quando os assuntos mudam;
  - página: linha presente e ausente, também em consulta;
  - `acervo.spec.ts`: o corpo.
- **Nota** em `code/front/AGENTS.md`.

## Parte 3 (commit 1) — mobile

- **`acervo_service.dart`:** `assuntos` em `LivroPessoal.fromJson` (reaproveita `AssuntoResumo.deJson`) e em `DadosLivroPessoal.paraJson`, com a mesma regra da web.
- **`features/livros/seletor_de_assuntos_controller.dart`:** `ChangeNotifier` com carregar, filtrar (`semAcento`), seleção provisória e cold start.
- **`features/livros/seletor_de_assuntos.dart`:** `mostrarFolhaInferior` pelo navegador raiz, porque a folha tem campo de texto (AGENTS do mobile).
  - Até 85%, rodapé fixo, chips com `Semantics(checked:)` e alvo de 48 px.
  - Os mesmos estados da web.
- **`features/livros/campo_assuntos.dart`:** gatilho, chips com `X`, `Alterar assuntos`, aviso, erro e `liveRegion`.
- **`livro_pessoal_form_page.dart`:** o campo entre :455 e :456; `assuntos` no conteúdo da chave; `_erros['assuntos']` passa a aparecer no campo.
- **`livro_pessoal_page.dart`:** `Row` `Assuntos` depois de `Páginas`, valor alinhado à direita com até 70% da largura e `Semantics(label: 'Assuntos: X e Y')`.
- **Testes** (`flutter_test` com `MockClient`): os mesmos da web, mais o timeout e o 503 de `/assuntos`, que não impedem salvar.
- **Nota** em `code/mobile/AGENTS.md`.

## Parte 4 (commit 2) — script: modo `recarga`

**`carga.py`:**
- `carregar(..., recarga: bool = False)`;
- com `recarga`, depois de `SQL_LIVRO` e na mesma transação, dois passos novos.

**Passo 1 — `SQL_LIVRO_ATUALIZAR`:**
- `UPDATE acervo.livro l SET ... FROM stg_livro s LEFT JOIN editora e LEFT JOIN serie r WHERE l.isbn13 = s.isbn13 AND l.tipo = 'oficial'`.
- Colunas:
  - `titulo = s.titulo`;
  - `ano_publicacao = coalesce(s.ano_publicacao, l.ano_publicacao)`;
  - `capa_url_externa = s.capa_url_externa`;
  - `editora_id = coalesce(e.id, l.editora_id)`;
  - `serie_id` troca só quando `r.id` não é nulo;
  - `numero_serie = coalesce(s.numero_serie, CASE WHEN r.id = l.serie_id THEN l.numero_serie END)`, também só quando `r.id` não é nulo. Assim, a mesma série sem número no dump mantém o número atual, e uma série nova sem número fica sem número (CHECK `livro_numero_serie_exige_serie_ck`);
  - `ol_work_key` **não é tocada** (decisão 9).
- Só atualiza a linha quando algum valor muda (`IS DISTINCT FROM` no `WHERE`): segunda rodada com 0 atualizados e sem WAL à toa no Neon.
- **Nunca** `paginas`, `atualizado_em`, `ol_work_key`, `capa_url_propria`, `capa_asset_id`, `sinopse*`, `nota_geral*` nem `ativo`.

**Passo 2 — `SQL_LIVRO_ASSUNTO_SUBSTITUIR`:**
- `DELETE` de `livro_assunto` do livro oficial cujo ISBN tem **ao menos um** slug no staging **que casa com `acervo.assunto`** (pelo mesmo JOIN de `SQL_LIVRO_ASSUNTO`), para os assuntos que não estão no novo conjunto. Slug desconhecido não conta: um livro só com slugs desconhecidos mantém todos os assuntos;
- depois, o `SQL_LIVRO_ASSUNTO` existente acrescenta os que faltam;
- livro sem nenhum slug mapeado fica como está (decisão 3).

**Não muda:** autor (só acréscimo, como hoje), filtros, normalização e gêmeos. `TotaisDaCarga` ganha `livros_atualizados` e `vinculos_assunto_removidos`.

**`cli.py`:** passa `recarga = args.tipo == 'recarga'`, imprime os totais novos e mantém `inseridos = livros novos` na `ingestao_execucao`.

**Testes** (`tests/test_carga_banco.py`, marcador `banco`; a amostra modificada é montada em `tmp_path` a partir da reproduzível):
1. **Idempotência:** carga da amostra reproduzível, depois recarga da **amostra modificada** duas vezes.
   - A primeira recarga atualiza: `livros_atualizados > 0` e `vinculos_assunto_removidos > 0`.
   - A segunda tem `livros_atualizados = 0` e `vinculos_assunto_removidos = 0`, e as contagens de livro, autor, editora, série, assunto e `livro_assunto` não mudam. Isso exercita o `IS DISTINCT FROM`.
   - Há execuções `tipo=recarga`, `concluida`, com os totais.
2. **Preservação.** Antes da recarga, gravar:
   - capa própria + asset, sinopse `disponivel` com `atualizado_em` fixo e nota geral;
   - uma linha de `nota_leitor_projecao` **e uma de `nota_livro_agregada`** (lida por `livro-oficial.repository.ts` e `nota-dos-leitores.repository.ts`);
   - um livro pessoal com `livro_assunto`;
   - um livro importado por ISBN fora da amostra;
   - **um livro "do Google" com ISBN que está na amostra**, com nota e sem `ol_work_key`.
   - Depois de recarga + `notas`, tudo continua idêntico, inclusive a nota e a chave vazia do livro do Google (decisão 9).
3. **Atualização com a amostra modificada:**
   - título, capa externa, editora e série novos são aplicados;
   - a mesma série sem número mantém o número atual;
   - páginas diferentes **não** mudam (decisão 5);
   - assuntos mapeados diferentes são substituídos;
   - livro sem tag mapeada, ou só com slugs desconhecidos, mantém os assuntos antigos;
   - autor novo é acrescentado e o antigo fica.
4. **Livro fora dos filtros:** some dos candidatos (sem capa) e continua no banco, intacto e ativo.
5. **Carga inicial sobre base existente:** continua sem atualizar nada (regressão do comportamento de hoje).

**Documentação e nota:**
- **README do script:** seção "Recarga (RF-ACV-14)" com o roteiro de operação.
  1. Baixar os dumps.
  2. `filtrar`, anotando os processados e os descartados.
  3. `resolver`.
  4. `carregar --tipo recarga --processados N --descartados M`.
  5. `notas`.
  6. Conferências com `tipo='oficial'`.
  7. Tamanho do schema antes e depois, e o registro na Timeline (volume e fração do plano Neon).
  8. Um banco por vez, primeiro o dev, com aviso ao grupo.
- **README:** corrigir a query L (`:99-100`) para contar só `tipo='oficial'`.
- **Nota** em `code/scripts/ingestao/AGENTS.md`.

## Contratos

- `POST /livros/pessoal` e `PATCH /livros/pessoal/{id}`: `assuntos?: uuid[]`.
  - No máximo 100, repetidos ignorados.
  - No PATCH, `[]` ou `null` limpa e ausente preserva.
  - 400 `REQUISICAO_INVALIDA` com `campos[{campo:'assuntos'}]` para id inexistente ou texto livre.
  - 403 para quem não é dono, e 404 como hoje.
- `GET /livros/pessoal/{id}`, e as respostas de `POST`/`PATCH`: `assuntos: [{id, nome}]` em ordem alfabética, sempre presente, para o dono e no modo consulta.
- `GET /assuntos`: sem mudança, reaproveitado.
- VIEWs: nenhuma muda. `v_livro_referencia_v1` e `v_livro_recomendacao_v1` ficam iguais.
- Script: `carregar --tipo recarga` passa a atualizar (decisões 3 e 5). `ingestao_execucao` sem mudança de schema.
- Eventos: nenhum.

## Verificação

**Antes de cada commit:**
- **`acervo`:** `npm run lint` (o `␍` do CRLF no Windows não é achado), `npm run build`, `npm test`, e `npm run test:integration` com `DATABASE_URL_TESTE` em Docker.
- **Web:** `npm run lint`, `npm run build`, `npm test`.
- **Mobile:** `flutter analyze`, `flutter test`.
- **Script:** `python -m pytest` com `DATABASE_URL_TESTE` em Docker. Conferir que os testes `banco` **rodaram**, não pularam.

**Manual** (serviços locais e banco de dev; web no Edge headless via `playwright-core` em 1440 e 390 px, claro e escuro; app no emulador `Pixel_8_API_35`):
1. **Leitor A, na web e no app:**
   - cria um livro pessoal com dois assuntos usando a busca do seletor;
   - edita e troca;
   - escolhe 6 e vê o aviso, e salva mesmo assim;
   - esvazia e a linha some.
2. **Fechar sem `Concluir`** descarta. Com o `acervo` parado (ou `/assuntos` falhando), o seletor mostra a falha e o livro **salva** sem assuntos.
3. **Leitor B:**
   - vê a linha `Assuntos` pelo feed (seguindo A) e por uma lista pública de A, sem ações de editar;
   - `curl -X PATCH` de B com `assuntos` dá 403.
4. **Isolamento:** o livro de A não aparece em `Descobrir` por `q` com o nome do assunto, nem no filtro daquele assunto, e o total da busca filtrada não muda.
5. **Recarga** só contra a amostra em Postgres descartável:
   - duas rodadas sem duplicar;
   - capa própria, sinopse, nota e livro pessoal intactos;
   - `ingestao_execucao` com `recarga`.
   - **Nunca no Neon** (decisão 4).

**CI** verde no PR, na etapa 4.

**Fechamento do `feature-F-ACV-OPC.md` (etapa 3):**
- **Ficam desmarcados, com o motivo:**
  - o critério "funciona em DES" e o DoD "fluxo em DES": vêm com o merge na `main`, no fechamento;
  - o item próprio "volume real recarregado": pendência do grupo (decisão 4).
- **"Testes assíncronos":** marcado como N/A com a justificativa que já está no arquivo.
- **Timeline:** o `GET /assuntos` reaproveitado de F-ACV-BUSCA.

## Riscos e plano de corte

- **Editora ou série órfã depois de uma recarga real:** se o dump trocar a editora de um livro, a antiga pode ficar sem livros (o `SQL_EDITORA` já cria a partir de todo o staging). Fica como conferência no roteiro, sem limpeza automática.
- **A recarga real nunca foi cronometrada:** são cerca de 16 GB de dumps e horas de filtragem. O roteiro pede para registrar o tempo e o tamanho. É pendência do grupo (decisão 4).
- **Lock com a sinopse ou a capa durante a recarga:** são colunas disjuntas, então o efeito é espera, não perda. A transação de ~11 mil linhas é curta. O `idle_in_transaction_session_timeout` de 5 min do Neon não pesa, porque o `carregar` lê os arquivos antes de abrir as escritas. Conferir na execução.
- **Muitos arquivos do Vicenzo:** aviso antes, notas nos quatro `AGENTS.md` e lista no PR.
- **F-REC-ALG:** a decisão do grupo sobre o livro pessoal do próprio leitor continua em aberto. A VIEW atual já o exclui, então nada quebra.
- **Corte (decisão 7):** checagem em **13/11**. Se a Parte 3 (mobile) não estiver commitada, a Parte 4 sai inteira, e a recarga vira pendência do grupo no `feature-F-ACV-OPC.md`.

## Estimativa (06/11 → 17/11)

| Bloco | Dias |
|---|---|
| Parte 1, `acervo` + contrato | 1 |
| Parte 2, web | 1,5 |
| Parte 3, mobile | 1,5 |
| Parte 4, script + testes + roteiro | 1,5 |
| Validação de contexto limpo, teste manual, correções, docs | 1,5 |
| Etapas 2 e 4 (revisões e PR) | 1 |
| **Total** | **8** |

Cabe até 17/11 com cerca de 2 dias de folga. A parte (a) sozinha leva 4 dias, mais 1,5 de validação.
