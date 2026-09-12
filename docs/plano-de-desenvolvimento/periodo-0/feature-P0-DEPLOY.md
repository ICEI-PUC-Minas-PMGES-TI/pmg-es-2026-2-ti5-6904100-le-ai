# P0-DEPLOY — Deploy em DES (Render + Neon)

**Período:** 0 · **Prioridade:** fundação
**Dono:** a definir · **Serviços afetados:** transversal (4 serviços + site estático Vue) + banco Neon

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md). Ambientes: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §4. Infra: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §6. Em caso de conflito, o `REQUISITOS.md` ganha.

## Objetivo

Colocar o sistema **rodando de verdade em DES/HML** a cada merge em `main` (plano §4): os 4 serviços de backend e o site estático Vue hospedados no **Render (plano gratuito)**, sobre o **PostgreSQL no Neon** (projeto único, schema por serviço, branch de banco por dev). É a peça que garante que "release da sprint" seja algo que roda, não código na máquina de alguém — e a que descobre problemas de deploy no período-0, antes de qualquer feature (plano §13, risco "Deploy descoberto tarde").

O deploy acontece **só de código versionado, por pipeline automatizado** (RNF-SEC-34), com **segredos apenas no painel do Render e no GitHub Secrets** (RNF-SEC-11). Os clientes já tratam a **hibernação/cold start** do free tier como carregamento prolongado, não erro (RNF-ERR-09).

Requisitos atendidos: **RNF-ARQ-07** (PostgreSQL/Neon), **RNF-ARQ-08** (Render free tier para serviços e site estático), **RNF-SEC-08** (HTTPS/TLS), **RNF-SEC-11** (segredos por ambiente), **RNF-SEC-21** (CORS restrito às origens de DES), **RNF-SEC-34** (deploy versionado via pipeline), **RNF-ERR-09** (cold start), **RNF-DES-04** (acervo ≤ 20% do limite do Neon).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | concluído | `render.yaml` (blueprint) na raiz; projeto Neon provisionado com os 4 schemas; segredos só no painel (`sync: false`) |
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
        value: https://leai-<gateway-ou-por-servico>.onrender.com
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

### Infra — Neon (PostgreSQL)

- **Um projeto Neon**, com **um schema por serviço** (`identidade`, `acervo`, `leitura`, `social`) — separação lógica no mesmo cluster (arquitetura §4.1).
- **Branch de banco por desenvolvedor** para o ambiente local, e **uma branch fixa para DES/HML** (plano §4; arquitetura §6). Cada dev trabalha isolado sem sujar o banco de DES.
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
- [~] Projeto Neon criado com os 4 schemas (feito); branch fixa de DES ok; **branch por dev ainda pendente**.
- [ ] Cada serviço conecta ao **seu** schema e roda suas migrations no deploy — conexão ok; **migrations de domínio ainda não rodadas** (não há tabelas no P0).
- [x] Nenhum segredo em `render.yaml` nem no repositório; todos no painel (`sync: false`).
- [x] HTTPS ativo; CORS restrito à origem do site de DES.
- [~] Web trata o cold start como carregamento (timeout de 90 s no cliente); **mobile ainda não iniciado**.

## Definition of Done

(plano §10)

- [x] Configuração (`render.yaml`, Dockerfiles dos serviços Spring) mergeada — **em `main`** (a branch `desenvolvimento` ainda não foi criada; decisão do grupo de commitar na `main` nesta base do P0).
- [ ] CI verde ([P0-CI](feature-P0-CI.md))
- [x] Testes automatizados dos casos de uso — **N/A de teste unitário**: validação operacional. Evidência: `GET /health` 200 nas 4 URLs + site 200 (12/09/2026, ver Timeline).
- [x] Spec OpenAPI do serviço atualizado em `docs/api/` — **N/A**: feature de infraestrutura, não altera contrato.
- [x] **Fluxo funcionando em DES/HML** — os 4 serviços e o site estão de pé em DES.
- [x] Arquivo da feature atualizado: status, pendências, timeline.
- [x] Divergência protótipo × implementação registrada, se houver (N/A).

**Item próprio:** deixar documentado o passo a passo de provisionamento (Render + Neon) para reprodução — ver seção abaixo.

## Provisionamento (como reproduzir)

**Neon (banco):**
1. Um projeto único; a branch default é a de DES/HML.
2. Criar os 4 schemas no SQL Editor: `CREATE SCHEMA IF NOT EXISTS identidade; ...acervo; ...leitura; ...social;`
3. `DATABASE_URL` por serviço = mesma URL, mudando só o schema-alvo (não é necessário `search_path` na URL — o Drizzle qualifica pelo `pgSchema()`; o Spring, pelo `DB_SCHEMA`). **Formato compatível com o driver:** `postgresql://<user>:<pass>@<host-pooler>/<db>?sslmode=require` — **sem** `options=-csearch_path` (o pooler do Neon rejeita) e **sem** `channel_binding=require` (o `node-postgres` não suporta).
4. Migrations de domínio (quando existirem): rodar apontando para a URL **direct** do Neon.

**Render (via blueprint `render.yaml` na raiz):**
1. New → Blueprint → conectar o repo; o Render cria os 5 serviços.
2. Serviços Node (`acervo`, `leitura`): runtime `node`, build `npm ci --include=dev && npm run build` (as CLIs de build são devDependencies), start `node dist/main.js`.
3. Serviços Spring (`identidade`, `social`): runtime `docker` — cada um tem um `Dockerfile` (o Render não tem runtime Java nativo).
4. Preencher no painel os `sync: false`: `DATABASE_URL` (por serviço), `JWT_SECRET`/`ADMIN_EMAIL`/`ADMIN_PASSWORD` (identidade), `VITE_API_BASE_URL` (web). `AMQP_URL` fica vazio até o P0-MSG criar a fila.
5. Ajustar `CORS_ALLOWED_ORIGINS`/`VITE_API_BASE_URL` para as URLs reais do Render após a criação.

**URLs em DES:** `https://leai-{acervo,leitura,identidade,social}.onrender.com` (health em `/health`) e o site `https://leai-web.onrender.com`.

## Pendências

- **Depende de [P0-INFRA](feature-P0-INFRA.md)** (projetos deployáveis) e de [P0-CI](feature-P0-CI.md) (pipeline que dispara o deploy versionado — RNF-SEC-34).
- **Runtime no Render — resolvido (12/09/2026):** `acervo`/`leitura` no runtime **Node** nativo; `identidade`/`social` via **Docker** (o Render não tem runtime Java nativo) — há um `Dockerfile` em cada serviço Spring.
- **Confirmar limites vigentes do plano gratuito do Neon** (armazenamento, horas de compute, nº de branches) — parte dos "itens a validar no período-0" (arquitetura §8); ver também [P0-MSG](feature-P0-MSG.md).
- Avaliar necessidade de um **gateway/entrada única** vs 4 URLs distintas para o cliente (afeta `VITE_API_BASE_URL` e CORS). Não bloqueia DES; decidir com [P0-NAV](feature-P0-NAV.md).
- Estratégia de **keep-alive** contra hibernação em dia de demonstração (ex.: ping agendado) — opcional, avaliar com o `schedule` de [P0-MSG](feature-P0-MSG.md).
- **Migrations de domínio ainda não rodadas** — não há tabelas no P0; quando entrarem, rodar via URL **direct** do Neon, revisadas por humano (plano §5).
- **`AMQP_URL` vazio** nos 4 serviços até o [P0-MSG](feature-P0-MSG.md) criar a fila no CloudAMQP (hoje nenhum serviço conecta ao broker no boot).
- **Branch de banco por dev no Neon** ainda não criada (DES usa a branch default) — cada dev cria a sua para o local.
- **`VITE_API_BASE_URL` / gateway:** decisão gateway único × URL por serviço segue aberta (afeta a base URL do front e o CORS) — decidir com [P0-NAV](feature-P0-NAV.md).

## Timeline

### DES no ar 12/09/2026: os 4 serviços de backend e o site estático subiram em DES no Render, sobre o Neon (banco único, 4 schemas). Verificado: `GET /health` 200 em `leai-{acervo,leitura,identidade,social}.onrender.com` (corpo `{status,service,time}` + correlation-id ecoado), 404 com corpo de erro padrão, e `leai-web.onrender.com` servindo o SPA (rewrite de rota ok). Entregues: `render.yaml` (blueprint), `Dockerfile` dos serviços Spring, segredos só no painel (`sync: false`). Percalços resolvidos no caminho: (1) build falhava com `nest: not found` porque `NODE_ENV=production` pulava as devDependencies → `npm ci --include=dev`; (2) conexão ao Neon caía → TLS explícito no pool `pg` e `DATABASE_URL` sem `options=-csearch_path` (rejeitado pelo pooler) nem `channel_binding=require` (não suportado pelo `node-postgres`); (3) o health mascarava o erro → passou a logar a causa real (`e.cause`) e devolver corpo genérico (RNF-SEC-22). Pendências: migrations de domínio, `AMQP_URL` (P0-MSG), branch por dev no Neon e a decisão de gateway.

### Criação 25/08/2026: arquivo criado a partir do escopo de P0-DEPLOY no [periodo-0/README.md](README.md), do [`plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §4 e do [`documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §6. Runtime no Render e limites do Neon mantidos como pendências a validar no período-0.
