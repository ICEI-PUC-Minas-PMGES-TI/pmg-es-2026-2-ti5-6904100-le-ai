# AGENTS.md — Serviço `leitura`

Complementa o [`AGENTS.md`](../../../AGENTS.md) da raiz (regras gerais) e o [`code/back/README.md`](../README.md) (visão dos serviços). Fonte de verdade: [`docs/orquestador/REQUISITOS.md`](../../../docs/orquestador/REQUISITOS.md); arquitetura: [`docs/orquestador/documento-de-arquitetura.md`](../../../docs/orquestador/documento-de-arquitetura.md).

## Domínio

Núcleo do produto. Estante, leitura, progresso, sessão cronometrada, nota, resenha (com curtidas), frases/trechos, desafios, sequência diária (streak), estatísticas e histórico. Requisitos: **EST, PRG, AVA, DSF, STA, GAM**. É o maior serviço, mantido inteiro porque tudo gira em torno da mesma agregação (usuário + livro + leitura).

## Stack e dados

- **Stack:** **NestJS (TypeScript)** — decidido pela equipe em 02/09/2026 (arquitetura §2.1); mesma stack que `acervo`. Fixado no scaffolding P0-INFRA (11/09/2026): **Node 22 LTS**, gerenciador **npm** (lockfile `package-lock.json`, RNF-SEC-25) e **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`, driver `pg`).
- **Schema:** `leitura`, no PostgreSQL único do Neon. Expõe **VIEWs** de estante e nota consumidas pela recomendação em `social`; a nota agregada em `acervo` é alimentada por evento.
- **Curtida/descurtida de resenha fica aqui**, junto da resenha (não em `social`).

> **Modelo físico do DER (16/09/2026):** as 20 tabelas e as VIEWs de contrato
> de `leitura` foram declaradas no Drizzle e versionadas em migrations. A
> existência da estrutura não significa que as features de domínio estejam
> implementadas.

## Estrutura, comandos e ferramentas (P0-INFRA)

- **Runtime:** Node 22 LTS (`.nvmrc`), **npm** com `package-lock.json` versionado (RNF-SEC-25).
- **ORM/migrations:** **Drizzle** (`drizzle-orm`) + **drizzle-kit**; schema-por-serviço via `pgSchema('leitura')`, com nomes qualificados no SQL e sem depender de `search_path` na `DATABASE_URL`. Migrations em `drizzle/*.sql` (SQL revisável), aplicadas por `npm run db:migrate` — **cada migration revisada por humano** antes de subir (plano §5); só tabelas do schema `leitura`. As **VIEWs de contrato** (estante, nota) para `social` também vivem aqui (arquitetura §4.2).
- **Config:** `@nestjs/config` + validação `zod` (`src/config/env.ts`) — não sobe com env inválida. `.env.example` versionado, `.env` nunca (RNF-SEC-11).
- **Estrutura:**
  - `src/main.ts` — bootstrap: aplica o pipeline de `src/configurar-app.ts` (correlation-id, `helmet` RNF-SEC-24, CORS restrito RNF-SEC-21, `ValidationPipe`) e o Swagger em `/docs`.
  - `src/common/` — `correlation.middleware.ts` + `als.ts` (RNF-OBS-01); `all-exceptions.filter.ts` + `error-codes.ts` → corpo `{ codigo, mensagem, correlationId }` (RNF-ERR-01, pt-BR, sem stack trace).
  - `src/db/` — `drizzle.module.ts` (provider `DRIZZLE`), `schema.ts` (`pgSchema`), `migrate.ts`.
  - `src/health/` — `GET /health` via `@nestjs/terminus` + indicador Drizzle (`SELECT 1`) (RNF-OBS-02).
  - Módulos de feature (`src/estante/`, `src/leituras/`, `src/jobs/inatividade/`) em camadas, com `<modulo>.module.ts` na raiz do módulo e specs ao lado do arquivo:
    - `dominio/` — regras puras (ex.: `maquina-estados.ts`, builders de `eventos.ts`); não importa nada de `@nestjs/*` nem de `drizzle-orm`.
    - `aplicacao/` — services/casos de uso: transação, domínio, outbox, idempotência.
    - `infraestrutura/` — repositories Drizzle.
    - `api/` — controllers, guards HTTP e `dto/` (validação, Swagger).
    - Dependência só para dentro: `api → aplicacao → dominio` e `aplicacao → infraestrutura`. `aplicacao` pode usar os tipos de `api/dto` como contrato de entrada/saída; `dominio` e `infraestrutura` nunca importam `api/`. `common/`, `auth/`, `outbox/`, `referencias/`, `db/` e `messaging/` são transversais e ficam planos. `src/avaliacoes/` e `src/perfis/` (F-AVA) seguem a estrutura plana própria.
- **Comandos:** `npm run start:dev` · `npm run build` · `npm test` · `npm run test:integration` · `npm run lint` · `npm run db:generate` · `npm run db:migrate` · `npm run db:seed` · `npm run backfill:sequencia` · `npm run backfill:desafios`. `npm run start:prod` aplica migrations antes de iniciar a API.
- **Porta local: 3001.** O `acervo` usa a 3000 e os dois sobem juntos. No Render a porta vem do ambiente.
- **Testes:** Jest + ts-jest; unitários em `src/**/*.spec.ts`, integração em `test/integracao/*.int-spec.ts`. **A máquina de estados (RN-04) e a inatividade/abandono (RN-05) são teste obrigatório e prioritário (RNF-TST-01)** — entram com as features de domínio.
- **OpenAPI:** `@nestjs/swagger` em runtime (`/docs`); commitado em [`docs/api/leitura.yaml`](../../../docs/api/leitura.yaml) (RNF-ARQ-03).

## Infra comum das features (F-AVA, fatia 0, 26/09/2026)

Copiada do `acervo` e pronta para F-AVA, F-EST e F-PRG. Não existe pacote compartilhado entre serviços: a regra é copiar e adaptar. Plano: [`plano-F-AVA.md`](../../../docs/plano-de-desenvolvimento/periodo-1/plano-F-AVA.md), fatia 0.

- **Autenticação (`src/auth/`):** `JwtAuthGuard` global (`APP_GUARD`): toda rota nasce protegida. `@Publico()` libera (só `/health`); o Swagger (`/docs`, `/docs-json`) também responde sem token. `@UsuarioAtual()` dá `{ id, username }` do token — nunca aceite o id do solicitante pelo corpo. HS256, issuer `identidade`, `exp` obrigatório (o `jwt.verify` só confere a expiração quando ela existe), `JWT_SECRET` igual ao do `identidade` (mínimo de 32 caracteres, obrigatório em produção; sem ele o serviço não sobe).
- **Pipeline HTTP (`src/configurar-app.ts`):** `trust proxy`, correlation-id, helmet, CORS e `ValidationPipe` com `forbidNonWhitelisted` e `exceptionFactory`. O `main.ts` e os testes usam o mesmo.
- **Correlation-id só UUID.** `outbox_leitura.correlation_id` é `uuid NOT NULL`; um header malformado é trocado por um UUID gerado, senão derrubaria a escrita com 500.
- **Erros (`src/common/erros-de-negocio.ts`):** corpo `{ codigo, mensagem, correlationId }`, com `campos` quando houver.
  - **400** (`ErroDeValidacao`): corpo malformado — tipo errado, campo faltando ou sobrando, UUID inválido, `Idempotency-Key` ausente.
  - **422** (`EntidadeInvalida`, código `ENTIDADE_NAO_PROCESSAVEL`): dado bem formado que fere regra de negócio (nota fora da escala, resenha vazia ou longa demais).
  - 401, 403, 404, 409, 429 (com `Retry-After`) e 503 têm classe própria.
  - Erro do leitor de corpo do Express (não é `HttpException`) sai com o status dele: corpo acima de 100 KB é 413 `CORPO_MUITO_GRANDE`, nunca 500.
  - VIEW de outro serviço inacessível (`ehFalhaDeContratoExterno`, em `pg-erros.ts`) vira 503.
- **Idempotência (`src/common/idempotencia/`):** `IdempotenciaService.executar(contexto, efeito)` roda o efeito e grava o recibo **na mesma transação**; é serviço, não interceptor. `@IdempotencyKey()` exige UUID (400 se faltar).
  - **Escopo diferente do `acervo`:** `operacao = operacaoNoCaminho(OPERACOES.X, idsDoCaminho)`, por exemplo `salvarNota:<livroId>`, porque o `leitura.yaml` define o escopo como ator + método + **caminho canônico**. A mesma chave em outro livro é outra operação (no `acervo` seria 409). Mesma chave com outro corpo: 409. Janela de replay: 24 h.
  - Acrescente as operações da sua feature em `OPERACOES`, com o `operationId` do contrato.
  - O índice único é `idempotencia_leitura_subject_operacao_chave_uk` (predicado `subject_ref is not null and chave is not null`).
- **Limite de requisições (`src/common/rate-limit/`):** `@UseGuards(RateLimitGuard)` + `@RateLimit({ porIdentidade, porIp, janelaSegundos, escopo })` nas escritas que viram atividade ou evento. **Um `escopo` por rota**, senão as rotas dividem o contador.
- **VIEWs de outros serviços (`src/db/contratos-externos.ts`):** `acervo.v_livro_referencia_v1`, `identidade.v_perfil_referencia_v1`, `identidade.v_seguimento_aceito_v1` e, desde F-AVA-2, `social.v_atividade_livro_pessoal_v1` e `social.v_lista_livro_pessoal_v1`, todas `.existing()` e fora do `schema.ts`. O fixture de teste cria as cinco como tabelas. `comContratoExterno` (`src/common/contrato-externo.ts`) transforma a VIEW inacessível em 503. `autor_exibicao` é `NULL` em livro oficial sem autor (701 livros no dev).
- **Outbox (`src/outbox/`):** `OutboxRepository.inserir(tx, { tipo, versao, chaveNegocio, payload })`, sempre com o `tx` da transação do domínio. O `payload` é só o `data` do schema; o despachante de P0-MSG monta o envelope. **O `data` é validado antes do INSERT:** evento fora do contrato desfaz a transação (500) em vez de cair na DLQ de outro serviço. Por isso:
  - registre o schema do seu evento no `onModuleInit` do módulo com `MessageValidator.registerDataSchema(tipo, versao, schema)`, usando a cópia em `src/messaging/schemas/` (idêntica à de `docs/mensageria`, conferida por `schemas.spec.ts`);
  - o `common-v1` já está registrado, então `$ref: "common-v1.schema.json#/..."` resolve;
  - limpe o que vem de fora antes de montar o evento: URL de capa ou avatar malformada vira `null`, e ausência de autor é `null`, nunca texto inventado (`LivroSnapshot.autor` aceita `null` desde 26/09/2026, ver `docs/mensageria/README.md`).
- **Testes de integração (`test/integracao/`):** Postgres descartável, nunca o Neon (`ambiente.ts` recusa). As VIEWs de `acervo` e `identidade` viram **tabelas** no fixture (`banco.ts`), com massa em `massa.ts` (`inserirLivro`, `inserirPerfil`, `seguir`). Nelas, "suspenso" e "em exclusão" são o mesmo caso: sem linha. `limpar()` zera todas as tabelas dos três schemas pelo catálogo, então tabela nova entra sozinha. `broker-em-memoria.ts` prova outbox → despachante → envelope válido. `criarApp([Controller])` aceita rotas só de teste (ver `rota-de-teste.ts`).
  - Local: `DATABASE_URL_TESTE=postgresql://postgres:teste@localhost:55432/leai_teste_leitura npm run test:integration`, com um banco **separado** do usado pelo acervo (`createdb -U postgres leai_teste_leitura` no container), porque os dois fixtures recriam os mesmos schemas.
  - A CI (`ci-back-leitura.yml`) sobe Postgres 17 e roda o mesmo comando.
- **Lint no Windows:** com `core.autocrlf=true`, o checkout vem em CRLF e o `prettier/prettier` acusa todo arquivo. O Git grava LF; para conferir o resto localmente, rode `npx eslint "src/**/*.ts" --rule '{"prettier/prettier": ["error", {"endOfLine": "auto"}]}'`.

## F-AVA — nota e resenha (27/09/2026)

Módulos `src/avaliacoes/` (nota, resenha, minha avaliação) e `src/perfis/` (resenhas do perfil). Contrato em `docs/api/leitura.yaml`; plano em [`plano-F-AVA.md`](../../../docs/plano-de-desenvolvimento/periodo-1/plano-F-AVA.md).

- **Livro:** lido de `acervo.v_livro_referencia_v1`. Inexistente, inativo ou pessoal de outra pessoa é **404, nunca 403**: conhecer o id não revela que o livro existe (RNF-SEC-06). Em livro pessoal só o dono avalia (RN-03). **Os DELETE não conferem o livro:** apagam só o que é do leitor, e remover nota ou resenha continua possível depois que o livro fica inativo.
- **Ids de caminho em minúsculas** (`emMinusculas`, depois do `ParseUUIDPipe`): o mesmo livro sempre com o mesmo `livroId` na resposta e a mesma chave de negócio no evento; no perfil, o dono de perfil privado continua reconhecido.
- **Nota:** `valor` que não é número é 400; fora de 0..5 ou do passo de 0,5 é 422 (`regras.ts`). `INSERT … ON CONFLICT … WHERE nota.valor IS DISTINCT FROM excluded.valor RETURNING (xmax = 0)`: criada, atualizada ou, sem linha, mesmo valor — 200 sem gravar e sem evento.
- **Resenha:** texto cru de 1 a 5.000 **code points** (`[...texto].length`, igual ao `char_length` do CHECK; nunca `@MaxLength`, que conta UTF-16). Só espaços ou caracteres invisíveis (largura zero, BOM) é 422, e o caractere nulo também (o `text` do Postgres não o guarda); o 23514 do `resenha_texto_ck` também vira 422. O texto é guardado como chegou; o escape é do cliente. Conta fora de `v_perfil_referencia_v1` (suspensa ou em exclusão) não publica: 403.
- **DELETE sem nada para apagar:** 204 sem evento, inclusive em livro inexistente ou de outra pessoa.
- **Eventos:** `nota.alterada` (criada, atualizada, excluida; publicado sem consumidor, de propósito), `resenha.publicada` **só na criação** (`atualizacao=false`) e `resenha.excluida`. Schemas registrados no `onModuleInit` do `AvaliacoesModule`. Os snapshots vêm das VIEWs de perfil e de livro; URL de capa ou avatar passa pelo `urlOuNulo`: sai o `href` normalizado (acento vira `%C3%A7`), e o que não for http(s) nem passar no mesmo `format: uri` do validador da outbox vira `null`, e livro sem autor manda `autor: null`.
- **Resenhas do perfil:** RN-08 (próprio, público ou seguidor aceito; senão 403; perfil fora da VIEW é 404). Livro inativo não aparece; resenha de livro pessoal só para o próprio dono (RN-15). Página base 1, de 1 a 10.000 (sem teto, `page=1e20` estourava o `OFFSET`), e `limite` até 50.
- **O feed lê `v_resenha_publicacao_v1` e `v_nota_publicacao_v1`** (`ServicoDeFeed`): não mude as colunas dessas VIEWs sem falar com o dono de F-FEED. A decisão sobre esse consumo está pendente com o grupo.

## F-AVA-2 — reações à resenha (09/10/2026)

Módulo `src/reacoes/` (plano, como `avaliacoes/`). Contrato em `docs/api/leitura.yaml`; plano em [`plano-F-AVA-2.md`](../../../docs/plano-de-desenvolvimento/periodo-2/renato-periodo-2/plano-F-AVA-2.md).

- **Rotas:** `PUT /resenhas/{resenhaId}/reacao` (`{ tipo, via?, referenciaId? }`) e `DELETE` na mesma rota (via na consulta). As duas respondem `{ minhaReacao, curtidas, descurtidas }`, com idempotência (`reagirResenha:<resenhaId>`, `removerReacaoResenha:<resenhaId>`; via e referência entram no hash) e rate limit de 60 por identidade e 120 por IP.
- **Ordem das regras, igual no PUT e no DELETE:** resenha existe; livro ativo; resenha de outro (senão **422 `REACAO_PROPRIA`**); autor na VIEW de perfil; reator na VIEW de perfil (senão **403**, porque é dele o `autorAcao`); acesso. Falha de acesso é **404**.
- **Acesso:** livro oficial sob RN-08. Livro pessoal só com `via` e `referenciaId`, na **mesma regra do `acervo`** (`autorizacao-rn15.service.ts`): `feed` exige atividade ativa e seguimento aceito mesmo com perfil público; `lista` exige lista ativa do dono com o livro e perfil público ou seguimento. Mudou lá, muda aqui.
- **Uma linha por par resenha e leitor.** Retirar é `ativa = false`, nunca DELETE: `primeira_curtida_em` fica guardada, e é ela que faz recurtir, alternar e descurtir **não** publicarem. `resenha.curtida` sai só na primeira curtida, na mesma transação. Escrita sem corrida: `INSERT … ON CONFLICT DO NOTHING`, depois `SELECT … FOR UPDATE` e `UPDATE` (o PG 17 não devolve o valor antigo no `RETURNING`). A regra pura está em `regras.ts` (`mudancaAoReagir`).
- **Contagens só de reações ativas**, nas resenhas do perfil (com `minhaReacao`) e em `minha-avaliacao` (`MinhaResenha`; a resposta do `PUT /resenha` não muda).
- **VIEW nova `v_reacao_resenha_v1`** (migration `0005`, escrita à mão; o snapshot `0005` corrigiu a falta de `proxima_tentativa_em`): reação ativa por resenha e leitor, para o `acervo` devolver `minhaReacao` na página do livro.
- **Testes:** `test/integracao/reacao.int-spec.ts` e `reacao-sem-contratos.int-spec.ts`; unitários em `src/reacoes/regras.spec.ts`.

### Frases e trechos (RN-11)

Módulo `src/frases/`. `GET`/`POST /livros/{livroId}/frases` e `DELETE /frases/{fraseId}`. Não publica evento.

- **Validação** (`regras.ts`): texto de 1 a 500 **code points**, sem ser só espaços ou invisíveis e sem o caractere nulo; página de 1 ao `paginas` de `v_livro_referencia_v1` (obrigatório lá). Os dois são 422 com `campos`; tipo errado é 400.
- **Cota de 10 por leitor e livro:** conferida antes, na transação, e garantida pelo trigger `frase_limite_trigger` (advisory lock), que resolve duas inserções simultâneas. O trigger levanta 23514, o mesmo código de um CHECK: `ehErroDaFuncao` (`pg-erros.ts`) lê o campo `where` do erro para separar `validar_limite_frases` do CHECK. Os dois caminhos dão **422 `LIMITE_DE_FRASES`**.
- **Acesso:** livro oficial lista sob RN-08 por autor (público, seguido ou a própria); livro pessoal só para o dono (404 para os outros), porque o modo consulta de RN-15 não expõe frases. Quem cadastra precisa estar na VIEW de perfil (403).
- **Excluir:** só a própria; inexistente ou de outra pessoa é 404, sem revelar qual. A remoção pela moderação fica com F-MOD.
- **Testes:** `test/integracao/frase.int-spec.ts`; unitários em `src/frases/regras.spec.ts`.

## F-EST — estante e ciclo de leitura

Módulos `src/estante/`, `src/leituras/` e `src/jobs/inatividade/`, com `src/referencias/` (livro e perfil pelas VIEWs de contrato). Contrato em `docs/api/leitura.yaml`.

- **Idempotência:** as escritas usam o mesmo `@IdempotencyKey()` e `IdempotenciaService` de F-AVA; o escopo gravado é `operacaoNoCaminho(OPERACOES.<operationId>, ...idsDoCaminho)`.
- **Eventos:** `leitura.*` e `livro.adicionado_a_estante`, com `eventId` gerado no domínio (a chave de negócio e o registro de limiares de inatividade o usam) e passado a `OutboxRepository.inserir`. Schemas registrados no `onModuleInit` do `LeiturasModule`.
- **Job de inatividade:** `POST /internal/jobs/inatividade` é `@Publico()` e exige `X-Scheduler-Token` igual a `SCHEDULER_TOKEN` (32+ caracteres).

## F-CONTA-2 — consumidor de `conta.excluida` (08/10/2026, Henrique)

- **`src/conta/`** (`ContaModule`, `ContaExcluidaConsumer`): primeiro consumidor do serviço. A fila é `leai.leitura.conta`, no exchange do `identidade`. Apaga tudo o que é da conta excluída, com `usuario_id` em reações, resenhas (o CASCADE leva as reações de outros a elas), frases, favoritos, notas, estante (leva leituras, progresso e limiares), desafios, sequência, dias e estatísticas. Anonimiza os recibos de idempotência dela e os eventos publicados que a citam; os pendentes saem.
- **Validação do `data`:** o `parse` do runtime valida envelope e headers, mas **não** o `data` (até aqui só havia produtor). O consumidor chama `validarDados` antes de qualquer efeito. Consumidor novo precisa fazer o mesmo, ou corrigir o `parse`.
- **Testes:** `test/integracao/consumo-conta-excluida.int-spec.ts`, com o helper `consumidor-sem-espera.ts` copiado do `acervo`.

## F-GAM — sequência diária (08/10/2026)

- **`src/sequencia/`** (`SequenciaModule`): `GET /me/sequencia` e `SequenciaService.recalcular(tx, usuarioId)`, que recompõe `dia_leitura` e `sequencia_leitura` das datas locais dos progressos atuais (nunca incrementa contador), sob `pg_advisory_xact_lock` por leitor. O zeramento (RN-18.4) é derivado na consulta (`dominio/sequencia.ts`, `sequenciaVigente`), no último fuso do dispositivo; não há job. Tabelas da baseline DER (migration 0001), sem migration nova.
- **`src/metricas/`** (`MetricasModule`, `MetricasConsumer`): o consumidor de métricas único de F-GAM, F-DSF e F-STA. Fila `leai.leitura.metricas` no exchange do próprio `leitura`, routing keys `progresso.registrado` e `leitura.finalizada` (esta desde F-DSF). O `processar` ramifica por `envelope.type`; STA acrescenta o efeito dela ali.
- **Exclusão de trecho** (`ProgressoService.excluirTrecho`) chama `recalcular` no mesmo `tx`, sem evento. **Remoção da estante não recalcula** (decisão do dono, 08/10/2026): os dias do livro removido saem no próximo progresso ou exclusão do leitor.
- **Backfill:** `npm run backfill:sequencia` (`node dist/sequencia/backfill.js` no build), idempotente; rodar antes de o binding subir num ambiente.
- **Testes:** `src/sequencia/dominio/sequencia.spec.ts` e `test/integracao/sequencia.int-spec.ts` (API → outbox → despachante → broker em memória → consumidor, com duplicata, retry e DLQ).

## F-DSF — desafios (09/10/2026)

- **`src/desafios/`** (`DesafiosModule`), em camadas: `POST/GET /desafios`, `PATCH/DELETE /desafios/{id}`, `POST /desafios/{id}/pausar` e `/retomar`. Tabelas da baseline DER (migration 0001: `desafio`, `janela_desafio`, `contribuicao_desafio`, `pausa_desafio`), sem migration nova.
- **`DesafiosService.recalcular(tx, usuarioId)`** é o único caminho de escrita de janelas e contribuições: materializa as janelas que faltam até a corrente (inclusive vazias, desde a janela de criação) e recompõe as contribuições de **todas** as janelas do leitor a partir de `atualizacao_progresso` e `leitura`, em SQL set-based (`recomporContribuicoes`). Nunca incrementa. Chamado pelo `MetricasConsumer`, por `ProgressoService.excluirTrecho`, pelas escritas da API e pelo `GET` (que só recompõe se criou janela). Trava com `pg_advisory_xact_lock('desafios:'||usuarioId)`, sempre **depois** do lock da sequência quando os dois são tomados.
- **Regras no SQL:** fato entra na janela pela própria data local (`data_local` do progresso, `finalizacao_data_local` da leitura); a unidade é a do **snapshot da janela**; ocorrência (`registrado_em_dispositivo` ou `finalizada_em`) dentro de `[inicio_em, fim_em)` de uma pausa não conta; minutos zerados não geram contribuição; livro conta com `finalizada_em` preenchido.
- **Janelas** (`dominio/janelas.ts`): calendário no fuso do desafio, semana ISO (segunda a domingo; decisão do dono a ratificar pelo grupo). A janela corrente é a de `fim` mais recente.
- **Edição:** materializa com a configuração antiga, descarta as janelas não terminadas e cria a corrente com a nova. As encerradas guardam o snapshot (RN-20.7).
- **Backfill:** `npm run backfill:desafios` (`node dist/desafios/backfill.js` no build), idempotente; rodar antes de o binding de `leitura.finalizada` subir num ambiente.
- **Testes:** `src/desafios/dominio/*.spec.ts` e `test/integracao/desafios.int-spec.ts` (CRUD, propriedade, idempotência, RN-20.2 a 20.10, pausas, edição, backfill, duplicata, retry e DLQ).

## Pontos de atenção (ver `REQUISITOS.md`) — prioridade de teste

- **Máquina de estados da leitura (RN-04)** — Quero ler / Lendo / Lido / Relendo / Abandonado, releitura, retomada. **Teste obrigatório e prioritário** (RNF-TST-01).
- **Inatividade e abandono automático (RN-05)** — alertas nos dias 20 e 30, abandono no dia 40, via job diário. **Teste obrigatório e prioritário.**
- **Registro de progresso (RN-17):** o leitor informa sempre a **página em que parou** (valor absoluto, monotônico); páginas lidas e percentual são **derivados**. Rejeitar página ≤ atual ou > total (RF-PRG-04).
- **Sessão cronometrada (RN-16):** estado local no dispositivo; o backend só recebe a atualização de progresso resultante do encerramento.
- **Desafios (RN-20)** e **streak (RN-18):** alimentados por `progresso.registrado` e `leitura.finalizada`.
- Nota (RN-06) e resenha (RN-07, Markdown por RN-13) pertencem ao **livro**, não à leitura.
- Publica eventos: `nota.alterada`, `leitura.em_risco`, `leitura.expirada`, `livro.adicionado_a_estante`, `resenha.curtida`, e os que originam atividades/notificações.
- **Fila offline** do cliente móvel (RNF-ERR-05) exige escrita **idempotente** com chave de idempotência (RNF-ERR-04).
