# P0-DEPLOY — Deploy em DES (Render + Neon)

**Período:** 0 · **Prioridade:** fundação
**Dono:** Renato Douglas · **Serviços afetados:** transversal (4 serviços + site estático Vue) + banco Neon

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md). Ambientes: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §4. Infra: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §6. Em caso de conflito, o `REQUISITOS.md` ganha.

## Objetivo

Colocar o sistema **rodando de verdade em DES/HML** a cada merge em `main` (plano §4): os 4 serviços de backend e o site estático Vue hospedados no **Render (plano gratuito)**, sobre o **PostgreSQL no Neon**, com um schema por serviço. Desde 25/09/2026 o DES/HML tem **projeto Neon e broker próprios em Oregon**, na mesma região do Render, separados dos de desenvolvimento em São Paulo (ver [Ambientes de dados](#ambientes-de-dados-desde-25092026)). É a peça que garante que "release da sprint" seja algo que roda, não código na máquina de alguém — e a que descobre problemas de deploy no período-0, antes de qualquer feature (plano §13, risco "Deploy descoberto tarde").

O deploy acontece **só de código versionado, por pipeline automatizado** (RNF-SEC-34), com **segredos apenas no painel do Render e no GitHub Secrets** (RNF-SEC-11). Os clientes já tratam a **hibernação/cold start** do free tier como carregamento prolongado, não erro (RNF-ERR-09).

Requisitos atendidos: **RNF-ARQ-07** (PostgreSQL/Neon), **RNF-ARQ-08** (Render free tier para serviços e site estático), **RNF-SEC-08** (HTTPS/TLS), **RNF-SEC-11** (segredos por ambiente), **RNF-SEC-21** (CORS restrito às origens de DES), **RNF-SEC-34** (deploy versionado via pipeline), **RNF-ERR-09** (cold start), **RNF-DES-04** (acervo ≤ 20% do limite do Neon).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | concluído | `render.yaml` (blueprint) na raiz; segredos só no painel (`sync: false`). Desde 25/09/2026 são dois projetos Neon e dois CloudAMQP: dev em São Paulo e DES em Oregon |
| Backend | concluído | os **4 serviços no ar em DES** respondendo `GET /health` 200 (acervo, leitura, identidade, social); auto-deploy a cada push na `main` |
| Web | concluído | site estático `leai-web` no ar, com rewrite de SPA funcionando |
| Mobile | não aplicável | não é deployado no Render; APK virá do CI ([P0-CI](feature-P0-CI.md)) |

## Especificação

### Infra — Render (blueprint)

**`render.yaml`** na raiz descreve o ambiente de forma versionada (Infrastructure as Code), evitando cliques manuais irreprodutíveis:

```yaml
# render.yaml (esqueleto — comandos concretos por serviço dependem da stack alocada)
services:
  # --- 4 serviços de backend (web services) ---
  - type: web
    name: leai-identidade
    runtime: docker          # ou "node"/"java" conforme a stack do serviço
    rootDir: code/back/identidade
    plan: free               # hiberna após ~15 min (arquitetura §3.3)
    healthCheckPath: /health # RNF-OBS-02
    envVars:
      - key: DATABASE_URL
        sync: false          # segredo — preenchido no painel (RNF-SEC-11)
      - key: DB_SCHEMA
        value: identidade
      - key: AMQP_URL
        sync: false
      - key: CORS_ALLOWED_ORIGINS
        value: https://leai-web.onrender.com
      - key: BREVO_API_KEY # segredo do Brevo, somente no identidade
        sync: false
      - key: BREVO_SMTP_KEY # segredo do Brevo, somente no identidade
        sync: false
      - key: BREVO_SMTP_HOST
        value: smtp-relay.brevo.com
      - key: BREVO_SMTP_PORT
        value: "587"
      - key: BREVO_SENDER_EMAIL # remetente verificado no Brevo
        sync: false
      - key: BREVO_SENDER_NAME
        value: Lê Ai
      - key: JWT_SECRET
        sync: false
      - key: ADMIN_EMAIL
        sync: false
      - key: ADMIN_PASSWORD
        sync: false
  # ... leai-acervo, leai-leitura, leai-social (mesmo padrão, DB_SCHEMA próprio) ...

  # --- site estático Vue ---
  - type: web
    name: leai-web
    runtime: static
    rootDir: code/front
    buildCommand: npm ci && npm run build
    staticPublishPath: dist
    envVars:
      - key: VITE_API_BASE_URL
        value: https://leai-<servico>.onrender.com   # URL por serviço (sem gateway)
    headers:                 # RNF-SEC-16/23/24
      - path: /*
        name: Content-Security-Policy
        value: "default-src 'self'; ..."   # restritivo — detalhar com F-AUT/web
```

Pontos:

- **Plano gratuito** para os 4 serviços + static site (RNF-ARQ-08). Cada serviço **hiberna após ~15 min** de inatividade e a primeira chamada leva 30–60 s (arquitetura §3.3) — tratado nos clientes por RNF-ERR-09; nada de erro na 1ª requisição.
- **HTTPS** é terminado pelo Render (RNF-SEC-08).
- **CORS** de cada serviço restrito à origem do site em DES (RNF-SEC-21), sem curinga.
- **Deploy a cada merge em `main`** (auto-deploy do Render conectado ao repo, ou disparado pelo pipeline de [P0-CI](feature-P0-CI.md)) — só código versionado (RNF-SEC-34). Nada de deploy manual de branch local.

### Ambientes de dados (desde 25/09/2026)

Existem **dois bancos e dois brokers**, um par por ambiente. **Não há replicação entre eles**: o que se grava num não aparece no outro.

| | Desenvolvimento (local) | DES/HML (Render, branch `main`) |
|---|---|---|
| Banco Neon | projeto `le-ai` (`quiet-meadow-93392126`), **AWS São Paulo** (`aws-sa-east-1`) | projeto `le-ai-oregon` (`jolly-art-87595662`), **AWS Oregon** (`aws-us-west-2`) |
| Broker CloudAMQP | instância `Le-ai` (403307), **São Paulo** | instância `Le-ai-oregon` (404379), **Oregon** (`us-west-2`) |
| Quem conecta | os serviços rodando na máquina de cada dev | os 4 serviços do Render, também em Oregon |

- **Credenciais:** nos dois bancos a role é `leaidb_prd` e o banco é `leai-db-prd`. Só mudam o host e a senha, que ficam fora do repositório: no painel do Render para o DES e no `.env` de cada dev para o local.
- **Por que Oregon:** o Render roda em Oregon e não tem região na América do Sul. Com o banco em São Paulo, cada consulta do DES pagava cerca de 170 ms de ida e volta, o que ameaçava os 1 s de RNF-DES-01. Na mesma região da AWS a latência é de ~1 ms.
- **Por que manter São Paulo:** o dev local, a partir do Brasil, continua perto do banco.
- **Dados divergem:** o banco de Oregon nasceu de uma cópia única do de São Paulo (ver Timeline de 25/09). Contas criadas num ambiente não existem no outro, e uma recarga de ingestão precisa rodar em cada banco-alvo.
- **Levar dados de um ambiente para o outro:** é cópia manual, única e completa (`pg_dump` + `pg_restore`), que substitui o destino. Precisa ser combinada com o time. Replicação contínua foi descartada porque:
  - os dois recebem escrita, e a replicação lógica para no primeiro conflito;
  - ela não replica DDL nem sequences;
  - no Neon, a replicação lógica não pode ser desligada depois de ligada e impede a hibernação do compute.
- **Migrations:** as que um dev aplica localmente só alteram o banco de dev. O DES recebe as migrations quando a `main` é deployada (Drizzle no `start:prod` dos serviços Nest; Flyway no boot dos serviços Spring).
- **Testes de integração** continuam em Postgres descartável no Docker ou no service container do CI, nunca no Neon.

### Infra — Neon (PostgreSQL)

- **Um schema por serviço** (`identidade`, `acervo`, `leitura`, `social`) em cada projeto — separação lógica no mesmo cluster (arquitetura §4.1).
- **Uma branch por projeto** (`production`). Não há branch de banco por dev dentro do projeto; o que separa os ambientes são os dois projetos da seção acima.
- **Conexão do DES:** usa o **host direto** do endpoint, sem `-pooler`. No host direto o `options=-csearch_path%3D<schema>` é aceito, e as migrations do Flyway e do Drizzle dispensam o pooler em modo transação.
- **Janela de manutenção:** o plano gratuito não permite editá-la. A do projeto de Oregon é segunda-feira, 12h–13h UTC (9h–10h em Brasília); a de São Paulo é sábado, 04h–05h UTC.
- Migrations rodam por serviço no deploy (a ferramenta é configurada em [P0-INFRA](feature-P0-INFRA.md)); cada serviço migra só o seu schema, e migration é revisada por humano antes de subir (plano §5).
- Dimensionamento: o **acervo não deve passar de 20% do limite** do plano, com o índice de busca como custo dominante (RNF-DES-04/05) — a monitorar quando a ingestão entrar (feature F-ACV-INGESTAO, Período 1).

### Segredos e configuração (RNF-SEC-11, RNF-SEC-34)

- `.env.example` versionado (definido em [P0-INFRA](feature-P0-INFRA.md)); **`.env` nunca** no repositório.
- Valores reais só no **painel do Render** (`sync: false`) e no **GitHub Secrets** (para o que o pipeline precisar). Nada de segredo em `render.yaml`.
- URLs de DES conhecidas alimentam `CORS_ALLOWED_ORIGINS` e `VITE_API_BASE_URL`.

### Mobile

O app não é hospedado no Render: o **APK de DES é artefato do CI** a cada merge em `main` (definido em [P0-CI](feature-P0-CI.md)), apontando para a base URL de DES. Aqui só se garante que a base URL de DES existe e responde.

## Critérios de aceite

- [x] Os 4 serviços sobem no Render e respondem `GET /health` `200` (verificado em 12/09/2026 nas 4 URLs).
- [x] O site Vue é buildado e servido como static site no Render (rewrite de SPA validado).
- [x] Merge em `main` dispara deploy automático dos serviços/site (`autoDeploy: true`).
- [x] Projeto Neon criado com os 4 schemas; branch de DES ok. **Sem branch por dev (decisão de 12/09/2026).**
- [x] Cada serviço conecta ao **seu** schema e roda suas migrations no deploy — fechado em 16/09/2026 com o modelo físico do DER (59 tabelas + 9 VIEWs) aplicado no Neon. O Flyway (`identidade`, `social`) roda no boot e o Drizzle (`acervo`, `leitura`) antes da API; como os 4 serviços sobem e respondem `/health` `200` em `main`, as migrations aplicaram sem falha.
- [x] Nenhum segredo em `render.yaml` nem no repositório; todos no painel (`sync: false`).
- [x] HTTPS ativo; CORS restrito à origem do site de DES.
- [x] Web trata o cold start como carregamento (timeout de 90 s no cliente); o mobile passou a tratá-lo também em [P0-NAV](feature-P0-NAV.md). Medido em 17/09/2026, o cold start real ficou entre ~44 s (Node) e ~135–195 s (Spring em Docker) — acima dos 30–60 s estimados, o que torna o keep-alive relevante para dia de demonstração.

## Definition of Done

(plano §10)

- [x] Configuração (`render.yaml`, Dockerfiles dos serviços Spring) mergeada — **em `main`** (a branch `desenvolvimento` ainda não foi criada; decisão do grupo de commitar na `main` nesta base do P0).
- [x] CI verde ([P0-CI](feature-P0-CI.md)) — workflows validados e verdes no GitHub (17/09/2026)
- [x] Testes automatizados dos casos de uso — **N/A de teste unitário**: validação operacional. Evidência: `GET /health` 200 nas 4 URLs + site 200 (12/09/2026, ver Timeline).
- [x] Spec OpenAPI do serviço atualizado em `docs/api/` — **N/A**: feature de infraestrutura, não altera contrato.
- [x] **Fluxo funcionando em DES/HML** — os 4 serviços e o site estão de pé em DES.
- [x] Arquivo da feature atualizado: status, pendências, timeline.
- [x] Divergência protótipo × implementação registrada, se houver (N/A).

**Item próprio:** deixar documentado o passo a passo de provisionamento (Render + Neon) para reprodução — ver seção abaixo.

## Provisionamento (como reproduzir)

**Neon (banco):**
1. Um projeto por ambiente: o de DES/HML na mesma região do Render (`aws-us-west-2`) e o de desenvolvimento em `aws-sa-east-1` (ver [Ambientes de dados](#ambientes-de-dados-desde-25092026)). Em cada um, a branch default é a `production`.
2. Criar os 4 schemas no SQL Editor: `CREATE SCHEMA IF NOT EXISTS identidade; ...acervo; ...leitura; ...social;`
3. `DATABASE_URL` por serviço = mesma URL, mudando só o schema-alvo (não é necessário `search_path` na URL — o Drizzle qualifica pelo `pgSchema()`; o Spring, pelo `DB_SCHEMA`). **Formato compatível com o driver:** `postgresql://<user>:<pass>@<host>/<db>?sslmode=require`, **sem** `channel_binding=require` (o `node-postgres` não suporta). Com o host `-pooler`, **sem** `options=-csearch_path`, que o pooler rejeita. Com o host direto, que é o que o DES usa desde 25/09/2026, o `options=-csearch_path%3D<schema>` é aceito.
4. Migrations de domínio (quando existirem): rodar apontando para a URL **direct** do Neon.

**Render (via blueprint `render.yaml` na raiz):**
1. New → Blueprint → conectar o repo; o Render cria os 5 serviços.
2. Serviços Node (`acervo`, `leitura`): runtime `node`, build `npm ci --include=dev && npm run build` (as CLIs de build são devDependencies), start `node dist/main.js`.
3. Serviços Spring (`identidade`, `social`): runtime `docker` — cada um tem um `Dockerfile` (o Render não tem runtime Java nativo).
4. Preencher no painel os `sync: false`: `DATABASE_URL` (por serviço), `JWT_SECRET`/`ADMIN_EMAIL`/`ADMIN_PASSWORD` e as credenciais do Brevo (`BREVO_API_KEY`, `BREVO_SMTP_KEY`, `BREVO_SENDER_EMAIL`) no `identidade`, além de `VITE_API_BASE_URL` (web). `AMQP_URL` fica vazio até o P0-MSG criar a fila.
5. Ajustar `CORS_ALLOWED_ORIGINS`/`VITE_API_BASE_URL` para as URLs reais do Render após a criação.

**URLs em DES:** `https://leai-{acervo,leitura,identidade,social}.onrender.com` (health em `/health`) e o site `https://leai-web.onrender.com`.

## Pendências

- **Depende de [P0-INFRA](feature-P0-INFRA.md)** (projetos deployáveis) e de [P0-CI](feature-P0-CI.md) (pipeline que dispara o deploy versionado — RNF-SEC-34).
- **Runtime no Render — resolvido (12/09/2026):** `acervo`/`leitura` no runtime **Node** nativo; `identidade`/`social` via **Docker** (o Render não tem runtime Java nativo) — há um `Dockerfile` em cada serviço Spring.
- **Confirmar limites vigentes do plano gratuito do Neon** (armazenamento, horas de compute, nº de branches) — parte dos "itens a validar no período-0" (arquitetura §8); ver também [P0-MSG](feature-P0-MSG.md).
- **Gateway × URL por serviço — decidido (12/09/2026): URL por serviço** (sem gateway). O front usa a URL de cada serviço em DES e o CORS de cada backend fica restrito à origem do site; o cliente passa a ter uma base URL por serviço.
- Estratégia de **keep-alive** contra hibernação em dia de demonstração (ex.: ping agendado) — opcional, avaliar com o `schedule` de [P0-MSG](feature-P0-MSG.md).
- ~~**Migrations de domínio ainda não rodadas** — não há tabelas no P0.~~ — **feito (16/09/2026):** modelo físico do DER aplicado no Neon (59 tabelas + 9 VIEWs), via URL **direct**, com revisão humana (plano §5). A baseline física existir não implica feature de Período 1 implementada.
- ~~**`AMQP_URL` vazio** nos 4 serviços até o [P0-MSG](feature-P0-MSG.md) criar a fila no CloudAMQP~~. **Feito (25/09/2026):** os 4 serviços do Render apontam para o broker `Le-ai-oregon`. O código deployado na `main` (`0dfb8d0`) ainda não tem runtime AMQP, então nenhum serviço conecta ao broker. O primeiro uso real vem com o merge `desenvolvimento` → `main`.
- **Sem branch de banco por dev — decidido (12/09/2026), revisto em 25/09/2026:** na prática o time desenvolvia localmente contra o próprio banco de DES. Desde 25/09 o DES tem projeto próprio em Oregon, e o projeto antigo, em São Paulo, virou o banco de desenvolvimento (ver [Ambientes de dados](#ambientes-de-dados-desde-25092026)). **Incorporação ao orquestrador (plano §4, arquitetura §6) e ao `AGENTS.md` raiz: feita em 25/09/2026, com autorização explícita do dono.**
  - Arquivos atualizados: plano §4, arquitetura v1.7 (§1, §4.1 e §6), `AGENTS.md` raiz (§3 e §7), `.env.example` raiz e README da ingestão.
  - Os documentos da disciplina (`docs/1.`–`8.`) foram conferidos e não mudam: nenhum projeta o plano §4 nem a arquitetura §6, e "PostgreSQL no Neon com schema por serviço" continua verdadeiro.

## Timeline

### Ambientes separados e DES em Oregon 25/09/2026

**Motivação.** O Render roda em Oregon e o banco estava em São Paulo, a cerca de 170 ms por consulta, o que ameaçava RNF-DES-01. O Neon não muda a região de um projeto existente.

**Decisão do dono.** Criar um projeto para o DES em Oregon e manter o de São Paulo como banco de desenvolvimento, sem replicação.

**Execução.**
- Projeto `le-ai-oregon` criado com PG 17, role `leaidb_prd`, banco `leai-db-prd` e autoscaling de 0,25 a 2 CU.
- Cópia com `pg_dump -Fc --no-owner --no-acl` e `pg_restore --single-transaction --exit-on-error`, ambos na versão 17.11. O restore terminou sem erro nem aviso.
- O banco de origem só tinha as ACLs padrão do Neon, e o único dono de objetos era o `leaidb_prd`, então descartar dono e ACL não perdeu nada.

**Conferência.**
- As 101 linhas de conferência são idênticas nos dois bancos: contagem exata de cada uma das 67 tabelas (40.854 linhas, 11.019 livros), valores das 6 sequences, objetos por schema, constraints, as 2 funções, os 2 triggers e as extensões.
- As tabelas de controle vieram junto: `acervo` com 4 migrations, `identidade` com 6, `leitura` com 5 e `social` com 4.
- Nada foi gravado em São Paulo entre o dump e a troca.

**Troca no Render.**
- `DATABASE_URL`, e `DATABASE_PASSWORD` nos serviços Spring, foram trocados um serviço por vez, com host direto. O `AMQP_URL` dos 4 aponta para o broker novo `Le-ai-oregon`.
- O redeploy usou o commit `0dfb8d0` da `main`, que em relação ao anterior (`5a93950`) só altera o `CITATION.cff`.
- **Evidência:**
  - os 4 serviços `live`, com `GET /health` 200 e o site 200;
  - o Flyway do `identidade` e do `social` loga `Database: jdbc:postgresql://ep-lively-bread-ar07oy7t.c-4.us-west-2...` e "up to date";
  - `pg_stat_activity` mostra, em Oregon, 4 conexões JDBC mais 2 do `node-postgres`, e **zero** conexões em São Paulo.
- O aviso do Flyway "schema has a version newer than the latest available migration" já existia antes: o banco tem migrations da `desenvolvimento` que ainda não chegaram à `main`.

**Não saiu como planejado.** Igualar a janela de manutenção à antiga foi recusado pelo plano gratuito. O projeto de São Paulo continua ativo como banco de dev, sem nenhuma mudança de credencial.

### Reverificação 17/09/2026: DES conferido de novo, agora com o modelo físico do DER já aplicado. `GET /health` `200` nos quatro serviços (`acervo`, `leitura`, `identidade`, `social`) e `200` no site `leai-web`. Como os serviços Spring rodam Flyway no boot e os Nest rodam as migrations antes da API, o fato de os quatro subirem em `main` comprova que as migrations do DER aplicaram sem falha — o critério de "cada serviço roda suas migrations no deploy" foi fechado. Cold start medido: ~44 s nos serviços Node e ~135–195 s nos Spring em Docker, acima da estimativa de 30–60 s registrada no `render.yaml`. Pendência remanescente de infraestrutura: `AMQP_URL` continua vazio nos quatro serviços, aguardando [P0-MSG](feature-P0-MSG.md).

### DES no ar 12/09/2026: os 4 serviços de backend e o site estático subiram em DES no Render, sobre o Neon (banco único, 4 schemas). Verificado: `GET /health` 200 em `leai-{acervo,leitura,identidade,social}.onrender.com` (corpo `{status,service,time}` + correlation-id ecoado), 404 com corpo de erro padrão, e `leai-web.onrender.com` servindo o SPA (rewrite de rota ok). Entregues: `render.yaml` (blueprint), `Dockerfile` dos serviços Spring, segredos só no painel (`sync: false`). Percalços resolvidos no caminho: (1) build falhava com `nest: not found` porque `NODE_ENV=production` pulava as devDependencies → `npm ci --include=dev`; (2) conexão ao Neon caía → TLS explícito no pool `pg` e `DATABASE_URL` sem `options=-csearch_path` (rejeitado pelo pooler) nem `channel_binding=require` (não suportado pelo `node-postgres`); (3) o health mascarava o erro → passou a logar a causa real (`e.cause`) e devolver corpo genérico (RNF-SEC-22). Pendências: migrations de domínio e `AMQP_URL` (P0-MSG).

### Decisões 12/09/2026: (1) **sem gateway — URL por serviço** (o front usa a URL de cada serviço; CORS restrito à origem do site); (2) **sem branch de banco por dev no Neon** — o Neon serve só o DES/HML e o local usa Postgres local. A (2) alterou o orquestrador (plano §4 e arquitetura §6, bump para v1.4) e o `AGENTS.md` raiz, com autorização humana explícita (controle de mudança, plano §3). A (1) vivia só nos arquivos de feature (P0-DEPLOY e P0-NAV).

### Criação 25/08/2026: arquivo criado a partir do escopo de P0-DEPLOY no [periodo-0/README.md](README.md), do [`plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §4 e do [`documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §6. Runtime no Render e limites do Neon mantidos como pendências a validar no período-0.
