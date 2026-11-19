# Plano — E6-03: Avaliação da Arquitetura (ATAM) com medições em DES

> Plano de 19/11/2026, ainda não revisado. Prompt: [`prompt-E6-03-atam-em-des.md`](prompt-E6-03-atam-em-des.md). Regras comuns: [`prompt-E6-contexto-comum.md`](prompt-E6-contexto-comum.md). Na etapa 2, este plano prevalece sobre o prompt nos detalhes.

## 0. Situação em 19/11/2026

- **O DES roda a v0.2.1.** `gh release list`: `v0.2.1` (Latest, 03/11/2026), `v0.2.0` (03/11) e `v0.1.0` (30/09). O último merge na `main` é o `f1f5c7e` (PR #60, 03/11, "APK de DES alcança os serviços do Render"). A `origin/desenvolvimento` está 102 commits à frente da `main`, com o Período 3 inteiro: F-MOD-OPC (#61), F-ACV-OPC (#62), F-STA-OPC (#63), a entrega do Vicenzo (#64), F-NOT-OPC (#65), E6-01 (#66), E6-02 e E6-05.
- **O Período 3 chega ao DES com o merge da `main`, feito pelo grupo** no congelamento de código e deploy de produção (24/11). A entrega é em 01/12.
- **Como a etapa 2 confirma a versão do DES:** pelo MCP do Render (`list_deploys`, commit do último deploy de cada serviço), se o workspace estiver confirmado (pendência P1). Sem isso, chama uma rota que só existe no Período 3 (escolher uma das adicionadas em `git diff origin/main origin/desenvolvimento -- docs/api/`): 404 em DES confirma a v0.2.1.
- **O que o Período 3 muda nas áreas medidas** (`git diff --stat origin/main origin/desenvolvimento`):
  - **busca do `acervo`** (`busca.repository.ts`, `busca.service.ts`): sem mudança. Só `resenhas.repository.ts` mudou (refatoração da RN-08 das resenhas, `c022120`, L-01);
  - **mensageria** (`acervo/src/messaging`, `identidade/.../messaging`): sem mudança;
  - **fila offline do app** (`mobile/lib/features/progresso`): sem mudança;
  - **contratos** (`docs/api/*.yaml`): os quatro mudaram (identidade +281, acervo +112, leitura +157, social +466 linhas);
  - **segurança:** a F-MOD-OPC acrescenta conta suspensa (conteúdo oculto em feed, listas, notificações e recomendações) e o painel de moderação novo.

Decisões já fechadas pelo Renato em 19/11/2026 (não perguntar de novo):

1. **Uso do DES normal e leve, autorizado:** criar 2 a 3 contas de demonstração com e-mail `.invalid` pelo `/auth/register`, usar o app normalmente e fazer medições leves de latência. **Proibido no DES:** carga pesada, apagar dados, esvaziar fila, publicação em massa e mudar configuração do Render, do Neon (`le-ai-oregon`) ou da CloudAMQP (`Le-ai-oregon`). As contas são compartilhadas com a E6-04 e estão definidas uma vez só, na seção 2.
2. **Medir agora com a v0.2.1 e refazer na etapa 4 só o que o Período 3 mudar** (seção 7). O documento diz, em cada medida, a versão e a data.
3. **Sem PR:** merge direto das tarefas E6 na `desenvolvimento`. A etapa 3 vira "revisão, commit, push da branch `renato-e6-03` e merge direto pelo orquestrador".

## 1. Onde cada medição roda

| Cenário | Onde | Por quê |
|---|---|---|
| 1. Perfil privado | **DES** (v0.2.1), com as contas de demonstração | só leitura e uso normal; é o que o cenário pede |
| 2. IDOR e livro pessoal | **DES** | as tentativas negadas não alteram nada. As positivas (livro pessoal e lista do próprio dono) são uso normal |
| 3. Busca sob carga | **DES**, carga leve (seção 3.3) | p95 só tem valor no ambiente hospedado |
| 4. Cold start e fila offline | **DES**: web (Edge headless) e APK `v0.2.1` no emulador | hibernação só existe no Render. O modo avião é do emulador, não do DES |
| 5. Mensageria | **Local**: `identidade` + `acervo` na máquina, com **RabbitMQ e Postgres em Docker** | forçar falha (broker fora, erro transitório, schema inválido) derrubaria o DES. Publicar `ping.teste` no DES exigiria `P0_PING_ENABLED=true` no Render, que é mudança de configuração proibida. Docker não afeta nem o broker de dev (`Le-ai`, São Paulo), que é compartilhado. **Complemento passivo em DES:** leitura, sem consumir, das contagens das filas e DLQs do `Le-ai-oregon` depois do uso normal (seção 3.5.6) |
| 6. Contratos e acoplamento | **DES** para os specs em runtime. **Repositório** (`f1f5c7e` e, na etapa 4, a `main` nova) para a análise estática | o spec em runtime é público e só se lê |

O documento declara o ambiente em cada medida: "DES (Render/Neon/CloudAMQP Oregon, v0.2.1, dd/mm/2026)" ou "local (Docker, commit `xxxxxxx`)".

## 2. Contas de demonstração no DES (compartilhadas com a E6-04)

Criadas uma vez só, pela etapa 2 da E6-03 ou da E6-04, a que rodar primeiro, sempre pelo `POST /auth/register` do DES (`https://leai-identidade.onrender.com`) ou pela tela de cadastro da web. Nunca direto no banco. Ficam no DES depois da entrega. Nomes fictícios: nenhum dado de colega ou pessoa real.

| Papel | `username` | `displayName` | E-mail | Perfil | O que precisa ter (uso normal do app) |
|---|---|---|---|---|---|
| Leitora principal (alvo do cenário 1) | `leai.demo.marina` | Marina Demo | `marina@demo.leai.invalid` | **privado** | estante com 6 a 8 livros oficiais em status variados; 1 leitura em andamento com 2 ou 3 registros de progresso; 1 leitura concluída com nota e **resenha**; 1 frase; 1 lista com 1 livro oficial e **1 livro pessoal**; 1 desafio. Na E6-04, é a conta das telas principais |
| Segundo leitor (controle positivo) | `leai.demo.caio` | Caio Demo | `caio@demo.leai.invalid` | público | **seguidor aceito** da Marina (solicita e a Marina aceita); **1 livro pessoal** na estante e numa lista pública dele; 1 resenha no mesmo livro oficial resenhado pela Marina. Na E6-04, é quem segue, comenta e recomenda |
| Intrusa (cenários 1 e 2) | `leai.demo.bia` | Bia Demo | `bia@demo.leai.invalid` | público | não segue ninguém; estante com 1 ou 2 livros, só para ter sessão normal |

- **Data de nascimento:** fictícia de adulto (por exemplo, 01/01/1995).
- **Senha:** uma senha forte por conta, gerada pelo agente na criação (≥ 16 caracteres aleatórios, fora da lista de senhas comuns). **Nunca no repositório**, nem em evidência, log ou print. Fica em `C:\Users\Renato\.leai\contas-demo-des.env`, fora do repositório, com as linhas `LEAI_DEMO_MARINA_SENHA=`, `LEAI_DEMO_CAIO_SENHA=` e `LEAI_DEMO_BIA_SENHA=`. Os scripts leem desse arquivo. O Renato copia as três para o gerenciador de senhas dele, e a E6-04 e o pitch usam esse mesmo arquivo.
- **Rate limit do cadastro e do login:** 60 requisições por minuto por IP no `identidade` (`RateLimitFilter`, `leai.rate-limit.auth-por-minuto`). Os scripts fazem **um login por conta por execução** e reaproveitam o token, renovando por `/auth/refresh` quando der 401. Assim, nem chegam perto do limite.
- **Ações sociais** (seguir, curtir, comentar) têm limite por usuário (`LimitePorUsuario` no `identidade` e no `social`). O roteiro faz menos de 10 por conta.
- **Ids:** os ids que a Bia "conhece" (usuário da Marina, livro pessoal do Caio, lista, leitura, progresso, atividade) são coletados pelo script na sessão do dono e passados à sessão da Bia, simulando quem os descobriu. As evidências podem conter ids (UUID não sequencial) e e-mails `.invalid`, mas **nunca** token, refresh token ou senha. O script remove o `Authorization` antes de gravar.
- **Admin:** a E6-03 não precisa de admin até a etapa 4 (pendência P2).

## 3. Roteiro por cenário (etapa 2)

### 3.0 Preparação (antes de medir)

1. `git fetch` e `git worktree add -b renato-e6-03 ../le-ai-e6-03 origin/desenvolvimento`. O plano e o Andamento ficam na `renato-features`.
2. Scripts de medição em `code/scripts/atam/`, versionados na branch da tarefa: Node 22 com `fetch` nativo, sem dependência nova, salvo o `playwright-core` já usado nas capturas, instalado no scratchpad e não no repositório. Arquivos:
   - `contas.mjs`: cria as contas se não existirem e monta os dados da seção 2;
   - `cenario-1-2.mjs`: acessos negados e controles positivos;
   - `cenario-3-carga.mjs`: carga leve com latência bruta;
   - `cenario-4-cold-start.mjs`;
   - `cenario-6-specs.mjs`: comparação dos specs;
   - `p95.mjs`: cálculo do percentil a partir do JSON bruto;
   - `README.md`: como rodar.

   Os scripts leem `LEAI_DES_*` e as senhas do arquivo fora do repositório e se recusam a rodar contra URL que não seja `*.onrender.com` ou `localhost`.
3. **Acordar os serviços:** um `GET /health` em cada um, com horário e tempo de resposta gravados (`cenario-4-health-acordar.txt`). Esse primeiro tempo já é medida do cenário 4 se o serviço estava hibernado. Serviço fora do ar ou com deploy falhando: ler os logs pelo MCP do Render (se P1) e relatar. Não corrigir o DES.
4. **Consumo antes:** `mcp__neon__get_project_consumption` do `le-ai-oregon` e, se P1, `get_metrics` do Render. Repetir no fim, para registrar o impacto real (seção 3.3).
5. **Evidências** em `docs/evidencias/atam/`, com nomes `cenario-N-<assunto>.{json,txt,png}`. PNG comprimido (≤ 300 KB, `pngquant` ou redimensionar para 1280 px de largura). JSON sem token. Um `docs/evidencias/atam/README.md` curto lista cada arquivo, o ambiente, a data e o commit.

### 3.1 Cenário 1 — perfil privado (DES)

Ferramenta: `cenario-1-2.mjs`. Evidência: `cenario-1-acessos.json`, uma entrada por requisição com papel, método, rota, status, `X-Correlation-Id`, se o corpo contém o conteúdo protegido e o trecho do corpo sem dado sensível. Mais um `cenario-1-resumo.txt` em tabela.

Para cada rota abaixo, três chamadas: **Bia** (não segue), **Caio** (seguidor aceito, controle positivo) e **sem token** (esperado 401). O status esperado de cada negação é o que o contrato de `docs/api/` da `f1f5c7e` declara (403 ou 404). O script lê o contrato e compara.

| Serviço | Rota (alvo: Marina) | Esperado para a Bia |
|---|---|---|
| leitura | `GET /perfis/{marinaId}/estante` | negado |
| leitura | `GET /perfis/{marinaId}/resenhas` | negado |
| leitura | `GET /perfis/{marinaId}/estatisticas` | negado |
| social | `GET /perfis/{marinaId}/listas` e `GET /listas/{listaDaMarina}` | negado |
| social | `GET /atividades/{atividadeDaMarina}` e `GET /feed` da Bia | negado / sem atividade da Marina |
| identidade | `GET /seguidores/{leai.demo.marina}` | negado |
| identidade | `GET /perfis/{leai.demo.marina}` e `GET /perfis?q=marina` (busca) | encontra o perfil, mas a resposta não traz conteúdo protegido (o contrato diz que perfil privado "pode ser encontrado") |
| acervo | `GET /livros/{livroResenhado}/resenhas` | a resenha da Marina **não** aparece para a Bia; aparece para o Caio; a do Caio aparece para os dois |

Medida: `negadas / tentativas não autorizadas = 100%` e `vazamentos = 0`. Os controles positivos provam que a negação vem da privacidade, não de rota quebrada.

**Achado de segurança** (alguma rota devolve conteúdo da Marina para a Bia): parar a etapa e relatar em destaque, sem corrigir código (prompt, etapa 2, item 4).

### 3.2 Cenário 2 — IDOR e livro pessoal (DES)

Mesmo script e formato: `cenario-2-acessos.json` e `cenario-2-resumo.txt`. Alvo: o livro pessoal do Caio (`livroPessoalCaio`) e o da Marina.

| # | Quem | Tentativa | Esperado |
|---|---|---|---|
| 1 | Bia | `GET /livros/pessoal/{livroPessoalCaio}` sem `via` | negado |
| 2 | Bia | o mesmo com `via=lista&referenciaId={listaDoCaio}` (lista pública que contém o livro) | **permitido** (via válida, RN-15) |
| 3 | Bia | `via=lista` com uma lista do Caio que **não** contém o livro | negado |
| 4 | Bia | `via=feed` com `referenciaId` de atividade que não é do livro, ou inexistente | negado |
| 5 | Bia | livro pessoal da **Marina** com `via=lista&referenciaId={listaDaMarina}` | negado (perfil privado revalidado na página) |
| 6 | Caio | o mesmo do 5 | permitido (seguidor aceito) |
| 7 | Bia | adicionar `livroPessoalCaio` à estante (`POST /estante`, um pedido por status) | negado |
| 8 | Bia | `PUT /livros/{livroPessoalCaio}/favorito` | negado |
| 9 | Bia | iniciar leitura (`POST /leituras`) com `livroPessoalCaio` | negado |
| 10 | Bia | `GET /livros?q=<título do livro pessoal>` | não aparece (RNF-SEC-06) |
| 11 | Bia | IDOR em recursos da Marina: `GET /leituras/{leituraDaMarina}`, `POST /leituras/{leituraDaMarina}/progresso`, `DELETE /progresso/{progressoDaMarina}`, `PATCH /listas/{listaDaMarina}` | negado, e um `GET` do dono confirma que nada mudou |

As tentativas 7 a 9 e 11 são negadas e não gravam nada. Se alguma passar, é achado de segurança: parar e relatar, e registrar no relatório o que ficou gravado (sem apagar).

### 3.3 Cenário 3 — busca sob carga leve (DES)

- **Rota:** `GET https://leai-acervo.onrender.com/livros?q=<termo>&limite=20`, com o token da Bia. A busca **não tem rate limit** na v0.2.1 (o `@RateLimit` do `acervo` só está em `GET /livros/{id}`, com 60 por identidade e 600 por IP por minuto). A carga não abre página de livro, para não disparar consulta à OpenLibrary.
- **Consultas reais do acervo de DES:** antes da carga, o script faz buscas de descoberta normais e escolhe **3 títulos, 3 autores e 3 ISBN-13** que retornam resultado, mais **1 termo amplo** com muitos resultados (por exemplo, "amor"), como pior caso do índice. A lista fica em `cenario-3-consultas.json`. Os clientes revezam as 10 consultas.
- **Aquecimento:** `GET /health` até responder em menos de 2 s, depois 20 buscas descartadas. O cold start fica fora, como manda o RNF-DES-01.
- **Perfil da carga** (ciclo fechado, cada cliente faz uma requisição por vez, **teto global de 10 req/s**):

  | Fase | Clientes concorrentes | Duração | Requisições (máx.) |
  |---|---|---|---|
  | A — linha de base | 1 | 30 s | ~100 |
  | B | 5 | 60 s | ≤ 600 |
  | C | 10 | 60 s | ≤ 600 |

  São no máximo ~1.300 buscas em ~3 min, o equivalente a uns poucos leitores digitando ao mesmo tempo. Isso cabe no "medições leves de latência" do OK do Renato. **Sem** 20 clientes e sem rodar sem teto (pendência P3).
- **Saída bruta:** `cenario-3-latencias.json`, uma linha por requisição com fase, consulta, início, duração em ms, status e `X-Correlation-Id`. O `p95.mjs` calcula p50, p95, p99 e máximo por fase e por tipo de consulta (nearest-rank, documentado no script), e grava `cenario-3-resumo.txt`. Erros (status ≠ 200) são contados à parte e entram como risco se houver.
- **Rede no meio:** a medição é do cliente no Brasil até Oregon e inclui a ida e volta. O script mede também `GET /health` na mesma sessão, uma mediana de 20 chamadas, como linha de base da rede, e o documento informa as duas coisas. Se P1 estiver fechada, o tempo do lado do servidor vem dos logs de requisição do Render (`list_logs`, tipo `request`, `responseTimeMs`) na mesma janela e é a medida principal; o tempo do cliente fica como o que o usuário sente.
- **Critério:** p95 ≤ 1.000 ms na fase C. Passou ou não, registrar como está.
- **Impacto no plano gratuito** (conferido pelo consumo antes e depois, item 3.0.4):
  - **Neon `le-ai-oregon`** (autoscaling de 0,25 a 2 CU): ~1.300 consultas indexadas em 3 min mantêm o compute acordado por alguns minutos a mais do que o uso normal. É ordem de grandeza de minutos de CU no mês, desprezível perto da cota. O armazenamento não muda, porque nada é gravado.
  - **Render free:** as horas de instância contam só enquanto o serviço está acordado. A sessão acorda os 4 serviços por ~1 a 2 h, o mesmo que uma sessão de teste manual. O tráfego de saída é de ~1.300 × ~10 KB ≈ 13 MB, desprezível.
  - **Sem efeito em outros usuários**, porque só a fase C chega a 10 req/s.
- **Complemento (RNF-DES-01, leitura em geral, fora do cenário):** 30 requisições sequenciais, sem concorrência, de `GET /estante` (Marina), `GET /feed` (Caio) e `GET /perfis/{marinaId}/estante` (Caio), com p95 de cada uma. Entra como informação, não como medida do cenário 3.

### 3.4 Cenário 4 — cold start e fila offline (DES)

**4a. Cold start (RNF-ERR-09).**

1. Só vale com o serviço hibernado: o Render free hiberna depois de ~15 min sem tráfego. Rodar no começo da sessão, antes de qualquer outra chamada. Se P1 estiver fechada, conferir pelos eventos/logs do Render que o serviço estava suspenso.
2. `cenario-4-cold-start.mjs`: `GET /health` em cada serviço, **um de cada vez**, com o tempo até a primeira resposta gravado (`cenario-4-cold-start.json`) e um segundo `GET /health` logo depois, para comparação.
3. **Web:** com os serviços hibernados (outra janela de ≥ 15 min sem tráfego), o Edge headless (`playwright-core`, `channel: 'msedge'`) abre `https://leai-web.onrender.com`, faz login como Marina e tira print a cada ~5 s até a tela carregar, esperando 700 ms antes de cada print. Evidência: `cenario-4-web-cold-start-NN.png`, com o estado de carregamento prolongado, sem tela de erro, e o tempo total. O texto exato do aviso de carregamento sai do código da web na `f1f5c7e`.
4. **App:** o mesmo com o APK `v0.2.1` (`gh release download v0.2.1`) no emulador `Pixel_8_API_35`, print por `adb exec-out screencap -p`. Se não houver nova janela de hibernação na sessão, o app fica só com o item 4b e o motivo vai para o relatório.

**4b. Fila offline (RNF-ERR-05, RNF-ERR-04).**

1. APK `v0.2.1` no emulador, logado como Marina, na leitura em andamento.
2. Modo avião: `adb shell cmd connectivity airplane-mode enable`. Registrar **2 progressos** pela tela (páginas distintas). Print do estado pendente (`cenario-4-app-offline.png`).
3. Desligar o modo avião e esperar o reenvio (intervalo de 30 s, `fila_de_progresso.dart`). Print depois do envio.
4. Pela API, como Marina, listar os progressos da leitura (`GET /leituras/{id}/progresso`): **exatamente os 2 novos**, sem duplicata (`cenario-4-progressos.json`).
5. **Duplicação explícita:** um `POST /leituras/{id}/progresso` por `curl`, repetido com a **mesma** `Idempotency-Key`. A resposta é a mesma e há um registro só. É escrita normal da Marina.
6. Evidência textual em `cenario-4-resumo.txt`.

### 3.5 Cenário 5 — mensageria (local, Docker)

Ambiente: `identidade` e `acervo` na máquina, no commit `f1f5c7e` (mesma versão do DES), em worktree descartável no scratchpad. **RabbitMQ em Docker** (`rabbitmq:<versão>-management`, com a versão major do `Le-ai-oregon` lida pelo `mcp__cloudamqp__get_instance`) e **Postgres 17 em Docker**. O `.env` local aponta só para `localhost`. Antes de subir, conferir que nenhuma variável aponta para Neon ou CloudAMQP. Ordem de boot: `identidade` primeiro (Flyway cria as VIEWs que o `acervo` lê), depois `acervo` (Drizzle). Se a subida em Postgres limpo falhar por dependência de schema, seguir o mesmo caminho dos testes de integração do CI e registrar.

1. **Prova Spring → Nest:** subir o `identidade` com `P0_PING_ENABLED=true` e `AMQP_ENABLED=true`. O `P0PingProducer` grava o `ping.teste` na outbox, e o dispatcher publica em `leai.events.identidade`. O `acervo` consome em `leai.p0.ping` e grava `acervo.p0_ping`. Evidência: `cenario-5-ping.txt`, com os logs das duas stacks filtrados pelo mesmo `correlationId`, a linha da outbox `publicada` e a linha do consumidor.
2. **`eventId` duplicado:** republicar o envelope idêntico pela API HTTP de gerenciamento do RabbitMQ local (`POST /api/exchanges/%2F/leai.events.identidade/publish`). Esperado: um único efeito e um único recibo (`SELECT count(*)` no Postgres local). Evidência: `cenario-5-duplicado.txt`.
3. **Schema inválido:** publicar um envelope com `data` fora do schema `ping.teste.v1`. Esperado: DLQ imediata (`leai.p0.ping.dlq` +1), sem retentativa, e a fila principal segue consumindo (publicar um ping válido logo depois e ver que ele é consumido). Evidência: `cenario-5-dlq-schema.txt`.
4. **Falha transitória (1/5/15 s):** com um ping válido em trânsito, parar o Postgres do `acervo` (`docker pause`) para provocar erro técnico. Os logs do consumidor devem mostrar as tentativas com intervalos de ~1, 5 e 15 s, e depois `nack(requeue=false)` e DLQ. Durante a espera, publicar um ping válido noutra fila de outro consumidor, se houver, ou registrar que o `prefetch=1` segura só essa entrega, como diz o desenho da P0-MSG. Retomar o Postgres (`docker unpause`). Evidência: `cenario-5-retry.txt`, com os timestamps e os intervalos calculados.
5. **Broker fora (outbox, RNF-ERR-10):** `docker stop` do RabbitMQ e, em seguida, uma escrita que gera evento no `identidade` (um `POST /auth/register` local, que gera evento de cadastro, ou outro produtor equivalente da v0.2.1, escolhido pelo catálogo). Esperado: HTTP 2xx, linha da outbox `pendente` e o dispatcher tentando sem derrubar a requisição. `docker start` do RabbitMQ: a linha passa a `publicada` em segundos. Evidência: `cenario-5-broker-fora.txt`, com o estado da outbox antes e depois e o horário.
6. **Complemento passivo em DES (só leitura):** depois do uso normal dos cenários 1, 2 e 4, que gera eventos reais (estante, seguidor, progresso), ler as contagens de mensagens das filas e DLQs do `Le-ai-oregon` pela API de gerenciamento com `GET /api/queues`, sem consumir nem esvaziar nada. A credencial vem do `mcp__cloudamqp__get_instance` e não é gravada. Mostra que as filas reais consomem e que as DLQs não cresceram com o uso. Evidência: `cenario-5-des-filas.json`, só nomes e contagens. Se a credencial não vier pelo MCP, pular e relatar.
7. **Testes automatizados correspondentes (RNF-TST-03):** citar pelo nome os testes de mensageria que já existem (outbox, confirm, duplicação, validação, retry e DLQ, nas duas stacks) e anexar a saída do último CI verde da `desenvolvimento` (`gh run view`). É evidência complementar, não substituta.

Limpeza: nada a limpar no DES. Os containers locais são removidos no fim.

### 3.6 Cenário 6 — contratos e acoplamento (DES + repositório)

1. **Specs em runtime × YAML:** baixar `GET /v3/api-docs` (`identidade` e `social`, springdoc) e `GET /docs-json` (`acervo` e `leitura`, `@nestjs/swagger`; confirmar o caminho, já que o `SwaggerModule.setup('docs')` está em `main.ts`). Gravar em `cenario-6-runtime-<servico>.json`. `cenario-6-specs.mjs` normaliza os dois lados para o conjunto `(método, caminho, operationId)` e compara com os YAMLs de `docs/api/` **na `f1f5c7e`**, considerando só as operações `implemented` (`x-contract-status`/`x-implementation-status`). Também compara os códigos de status declarados. Saída: `cenario-6-diferencas.txt`, com as contagens por serviço e cada divergência. Divergência é resultado, não erro do script.
2. **Acoplamento só por VIEW, HTTP ou evento:** análise estática na `f1f5c7e`. Procurar, no código de cada serviço, SQL que referencie schema de outro serviço fora de `v_*_v1` (`git grep` por `identidade\.`, `acervo\.`, `leitura\.` e `social\.` nos outros três) e `import` de pacote de outro serviço. Também citar os testes de contrato das cópias de VIEW e de schema de evento que o CI roda (E6-02, L-35; comparação de schema copiado × canônico, da P0-MSG). Evidência: `cenario-6-acoplamento.txt`, com os comandos e o resultado.
3. **`ping.teste` Spring → Nest com o mesmo envelope:** a prova é a do 3.5.1, já que o mesmo JSON Schema é validado nas duas stacks. Aqui só se referencia.

## 4. Tabelas ATAM propostas para `docs/8.avaliacao_arquitetura.md` (§8.2)

Os cenários de §8.1 **não mudam**: o comentário do topo do arquivo diz que derivam do orquestador. A etapa 2 só preenche medições, acrescenta tabelas e revisa as Considerações. A tabela de Segurança existente ganha só o valor medido.

**Desempenho**

| Campo | Texto proposto |
|---|---|
| Atributo | Desempenho |
| Requisito | Requisições de leitura respondem em até 1 s no p95, desconsiderada a hibernação (RNF-DES-01); busca apoiada em índices (RNF-DES-03); vários clientes concorrentes sobre serviços sem estado (RNF-ARQ-04) |
| Preocupação | A busca por título, autor e ISBN é a leitura mais cara (índice textual sobre o acervo inteiro) e a mais usada; o banco em Oregon e o plano gratuito limitam o fôlego |
| Cenário(s) | Cenário 3 |
| Ambiente | DES (Render free + Neon `le-ai-oregon` 0,25–2 CU, Oregon), serviço aquecido, v0.2.1 |
| Estímulo | 1, 5 e 10 clientes concorrentes buscando títulos, autores e ISBN reais por 30 a 60 s |
| Mecanismo | Índices de busca normalizados (sem acento, por trecho) no `acervo`; paginação com teto de 50; serviços sem estado; banco na mesma região dos serviços |
| Medida de resposta | p95 ≤ 1.000 ms com 10 clientes. Medido: p50/p95/p99 por fase, com a ida e volta da rede informada à parte |

**Disponibilidade/Resiliência**

| Campo | Texto proposto |
|---|---|
| Atributo | Disponibilidade e resiliência |
| Requisito | Hibernação tratada como carregamento prolongado (RNF-ERR-09); fila offline de progresso no app (RNF-ERR-05); escrita idempotente (RNF-ERR-04); consumidor idempotente, retentativa e DLQ (RNF-ERR-06/07); outbox transacional (RNF-ERR-10) |
| Preocupação | O plano gratuito hiberna; a rede móvel cai; o broker pode ficar indisponível; uma mensagem envenenada não pode travar a fila |
| Cenário(s) | Cenário 4 e Cenário 5 |
| Ambiente | Cenário 4 em DES (v0.2.1); cenário 5 local, em Docker (RabbitMQ + Postgres), no commit da v0.2.1 |
| Estímulo | Primeira requisição a um serviço hibernado; progresso registrado sem rede; mensagem com schema inválido; erro técnico transitório no consumidor; broker parado durante uma escrita; mesma mensagem entregue duas vezes |
| Mecanismo | Estado de carregamento prolongado nos clientes; fila local com `Idempotency-Key` por intenção e reenvio a cada 30 s; outbox com dispatcher e publisher confirm; recibo de `eventId` na mesma transação do efeito; retentativa no consumidor em 1/5/15 s e DLQ por fila |
| Medida de resposta | Cold start: tempo até a primeira resposta por serviço e nenhuma tela de erro. Offline: 2 de 2 registros entregues, 0 duplicados. Mensageria: 1 efeito por `eventId`; DLQ imediata para schema inválido; intervalos medidos ≈ 1/5/15 s e DLQ; escrita confirmada com o broker fora e publicada após a volta |

**Manutenibilidade/Interoperabilidade**

| Campo | Texto proposto |
|---|---|
| Atributo | Manutenibilidade e interoperabilidade |
| Requisito | Web services independentes por HTTP/JSON (RNF-ARQ-01); contrato OpenAPI versionado por serviço (RNF-ARQ-03); integração entre serviços só por VIEW versionada, HTTP ou evento com JSON Schema |
| Preocupação | Duas stacks (Spring e NestJS) e banco físico único facilitam acoplamento escondido (tabela crua, tipo interno) e deriva entre contrato e implementação |
| Cenário(s) | Cenário 6 |
| Ambiente | DES (specs em runtime, v0.2.1) e repositório na `f1f5c7e` |
| Estímulo | Uma feature altera o contrato de um serviço |
| Mecanismo | Quatro OpenAPI em `docs/api/`, specs gerados em runtime; VIEWs `v_*_v1` por schema; envelope e JSON Schemas canônicos em `docs/mensageria/`, com cópia conferida pelo CI; `ping.teste` validado nas duas stacks |
| Medida de resposta | Operações implementadas no runtime × YAML: divergências contadas por serviço (meta 0). Referências a tabela crua ou a biblioteca interna de outro serviço: 0. Mesmo envelope validado em Spring e Nest |

**Considerações** (revisar com os resultados; ponto de partida):

- **Riscos:** os transversais implementados duas vezes (já listado); o plano gratuito (cold start de dezenas de segundos na primeira impressão do usuário; teto de CU do Neon); o retry no próprio consumidor com `prefetch=1` segura a fila daquele consumidor por até ~21 s por mensagem com falha transitória; a DLQ sem redrive automático depende de ação manual.
- **Pontos de sensibilidade:** o p95 da busca depende do índice e da região do banco (a mudança para Oregon em 25/09 tirou ~170 ms por consulta); a privacidade depende de cada endpoint de listagem revalidar o seguimento; o reenvio offline depende da chave de idempotência ser da intenção, não da tentativa.
- **Tradeoffs:** retry em processo em vez de árvore de filas de retry (simples, sem plugin, ao custo de bloquear a fila durante a espera); outbox (consistência ao custo de latência de publicação de até ~1 s pelo polling); banco único com VIEWs (junções e teto do plano gratuito, ao custo de acoplamento físico).

Também na etapa 2: o status do topo da §8.2, a seção "Evidências dos testes realizados" com links para `docs/evidencias/atam/` e uma **avaliação final** curta por atributo (atende / atende com ressalva / não atende, com o risco que fica). Conferir se o `docs/README.md` (SUMÁRIO) precisa de subseção nova.

## 5. Etapas seguintes (com a mudança de processo)

- **Etapa 2 — Medir e escrever:** como no prompt, com o roteiro da seção 3. Commit na `renato-e6-03`: `docs: avaliação da arquitetura com as medições em DES`. Se houver scripts, vão num commit `test(atam): scripts de medição da avaliação da arquitetura` antes do de docs. Depois da validação por agentes de contexto limpo, push da branch. Andamento e README na `renato-features`.
- **Etapa 3 — Revisão independente e merge direto:** revisão com contexto limpo como no prompt (inclusive reproduzir uma negação do cenário 1 e a comparação de um spec do cenário 6), correções em `docs: correções da revisão da avaliação da arquitetura`, integração da `origin/desenvolvimento`, **commit, push da branch `renato-e6-03` e merge direto na `desenvolvimento` pelo orquestrador, sem PR** (decisão do Renato de 19/11/2026). Fechamento do contexto comum: Andamento, README, contribuição semanal (Semana 3 ou 4) e Kanban (se houver card, para "Concluído"; se não houver, perguntar no relatório).
- **Etapa 4 — Pós-Período 3:** seção 7. Mesmo processo de merge direto.

## 6. Estimativa

| Etapa | Horas |
|---|---|
| 2 — preparação e scripts (3.0) | 3 |
| 2 — contas e dados de demonstração (seção 2, por API ou pela web) | 1,5 |
| 2 — cenários 1 e 2 | 1,5 |
| 2 — cenário 3 | 1,5 |
| 2 — cenário 4 (web e emulador, com as janelas de hibernação) | 2,5 |
| 2 — cenário 5 local | 3 |
| 2 — cenário 6 | 1,5 |
| 2 — escrita do `8.avaliacao_arquitetura.md` e do README das evidências | 3 |
| 2 — validação por agentes e correções | 2 |
| 3 — revisão independente e merge | 2,5 |
| 4 — refazer o que o Período 3 mudou | 3,5 |
| **Total** | **≈ 25,5 h** (≈ 19,5 h na etapa 2) |

As janelas de hibernação do cenário 4 (≥ 15 min sem tráfego cada) são espera, não trabalho. A etapa 2 encaixa nelas o cenário 5 local.

## 7. O que dá para medir já e o que espera o merge da `main`

| Item | Agora (DES v0.2.1) | Depois do merge da `main` (etapa 4) |
|---|---|---|
| Cenário 1, perfil privado | tudo | **refazer as rotas de listagem e a página do livro** e acrescentar a **conta suspensa** (F-MOD-OPC): conteúdo de conta suspensa oculto no feed, em listas, notificações e recomendações. Precisa de admin (pendência P2) |
| Cenário 2, IDOR e livro pessoal | tudo | rodar de novo o script inteiro, que é barato: a F-ACV-OPC mexe no livro pessoal (assuntos) |
| Cenário 3, busca | tudo | só se a busca ou o volume do acervo mudarem: o código da busca não mudou no Período 3, mas a **recarga do dump** da F-ACV-OPC no DES é pendência do grupo e, se rodar, muda o volume. Conferir com `git diff` da busca e a contagem de livros |
| Cenário 4, cold start e fila offline | tudo | só se o cliente mudar o tratamento (a fila offline não mudou). APK do release novo: repetir o 4b se a versão mudar |
| Cenário 5, mensageria | tudo (local) | não muda (a mensageria não mudou). Repetir a leitura passiva das filas de DES (3.5.6), porque a F-NOT-OPC e a F-MOD-OPC trazem consumidores novos |
| Cenário 6, contratos | runtime da v0.2.1 × YAML da `f1f5c7e` | **refazer inteiro**: os quatro YAMLs mudaram no Período 3 |

**De quem depende o merge da `main`:** do grupo, no congelamento de código e deploy de produção de **24/11/2026** (plano de projeto §3). O Renato participa como membro do grupo, mas a E6-03 não faz esse merge. Se o merge atrasar para depois de ~28/11, a etapa 4 fica sem tempo de rodar antes da entrega de 01/12. Nesse caso, o documento fica com as medições da v0.2.1, e a avaliação final registra o que ficou sem medir na versão final.

## 8. Pendências para o Renato

**P1. Workspace do Render para o MCP.** O MCP do Render não tem workspace selecionado, e a ferramenta exige confirmação humana antes de escolher. Sem ele, não há leitura de logs, eventos nem métricas do Render.
- (a) **Recomendada:** o Renato confirma o workspace do Lê Aí no início da etapa 2. Com isso, a etapa 2 lê o tempo do lado do servidor (`responseTimeMs`) para o cenário 3, confirma a hibernação no cenário 4 e confere o commit em deploy.
- (b) Seguir sem o MCP do Render: o cenário 3 fica só com a latência do cliente (com a rede informada à parte), e a versão é confirmada pela rota do Período 3.

**P2. Admin no DES para a etapa 4 (conta suspensa, F-MOD-OPC).** Esta decisão é a mesma da E6-04 (painel de moderação). Fechar uma vez para as duas.
- (a) **Recomendada:** usar a conta admin do DES, com credencial passada pelo Renato fora do repositório, para suspender e depois reativar a `leai.demo.bia` na etapa 4, só ela.
- (b) Medir a conta suspensa só em dev (local), declarando "dev" no documento.
- (c) Não medir a conta suspensa: fica como lacuna na avaliação final.

**P3. Concorrência do cenário 3.** O prompt sugeria 10 a 20 clientes. O OK de 19/11 é de "medições leves".
- (a) **Recomendada:** até 10 clientes, teto de 10 req/s, ~1.300 requisições em ~3 min (seção 3.3). Cabe no OK já dado.
- (b) Acrescentar uma fase de 20 clientes por 60 s, ainda com teto de 10 req/s. Pouco ganho: com o teto, mais clientes só aumentam a fila do lado do cliente.
- (c) 20 clientes sem teto. Exige OK explícito, porque deixa de ser leve.

**P4. Onde guardar as senhas das contas de demonstração.**
- (a) **Recomendada:** `C:\Users\Renato\.leai\contas-demo-des.env` (fora do repositório), criado pelo agente que criar as contas, com cópia no gerenciador de senhas do Renato.
- (b) Só no gerenciador de senhas do Renato. Nesse caso, ele as informa ao agente na sessão da etapa 2, e os scripts as leem de variável de ambiente.
