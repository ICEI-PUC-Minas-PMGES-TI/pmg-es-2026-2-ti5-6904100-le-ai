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
| Infra | não iniciado | sem `render.yaml`; projeto Neon a provisionar |
| Backend | não iniciado | 4 web services no Render |
| Web | não iniciado | static site (build do Vue) no Render |
| Mobile | não iniciado | não é deployado no Render; APK vem do CI ([P0-CI](feature-P0-CI.md)) |

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

- [ ] Os 4 serviços sobem no Render e respondem `GET /health` `200` (após o cold start).
- [ ] O site Vue é buildado e servido como static site no Render.
- [ ] Merge em `main` dispara deploy automático dos serviços/site (sem passo manual).
- [ ] Projeto Neon criado com os 4 schemas; branch fixa de DES + branches por dev funcionando.
- [ ] Cada serviço conecta ao **seu** schema e roda suas migrations no deploy.
- [ ] Nenhum segredo em `render.yaml` nem no repositório; todos no painel/Secrets.
- [ ] HTTPS ativo; CORS restrito à origem do site de DES.
- [ ] Web e mobile tratam o cold start como carregamento, não erro (RNF-ERR-09) — validar chamando um serviço recém-hibernado.

## Definition of Done

(plano §10)

- [ ] Configuração (`render.yaml`, docs de provisionamento) mergeada em `desenvolvimento`
- [ ] CI verde ([P0-CI](feature-P0-CI.md))
- [ ] Testes automatizados dos casos de uso — **N/A de teste unitário**: a validação é operacional (health `200` em DES, deploy disparado por merge); registrar evidência (URLs + prints/log) em vez de remover o item
- [ ] Spec OpenAPI do serviço atualizado em `docs/api/` — **N/A**: feature de infraestrutura, não altera contrato
- [ ] **Fluxo funcionando em DES/HML** — é o próprio objeto desta feature; marcar como concluído quando os 4 serviços e o site estiverem de pé em DES
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver (N/A)

**Item próprio:** deixar documentado o passo a passo de provisionamento (Render + Neon) para reprodução, já que o plano gratuito não permite tudo por IaC.

## Pendências

- **Depende de [P0-INFRA](feature-P0-INFRA.md)** (projetos deployáveis) e de [P0-CI](feature-P0-CI.md) (pipeline que dispara o deploy versionado — RNF-SEC-34).
- **Runtime de cada serviço no Render** (`docker` vs `node`/`java` nativo) depende da stack alocada (pendência de P0-INFRA) e da disponibilidade no free tier.
- **Confirmar limites vigentes do plano gratuito do Neon** (armazenamento, horas de compute, nº de branches) — parte dos "itens a validar no período-0" (arquitetura §8); ver também [P0-MSG](feature-P0-MSG.md).
- Avaliar necessidade de um **gateway/entrada única** vs 4 URLs distintas para o cliente (afeta `VITE_API_BASE_URL` e CORS). Não bloqueia DES; decidir com [P0-NAV](feature-P0-NAV.md).
- Estratégia de **keep-alive** contra hibernação em dia de demonstração (ex.: ping agendado) — opcional, avaliar com o `schedule` de [P0-MSG](feature-P0-MSG.md).

## Timeline

### Criação 25/08/2026: arquivo criado a partir do escopo de P0-DEPLOY no [periodo-0/README.md](README.md), do [`plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §4 e do [`documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §6. Runtime no Render e limites do Neon mantidos como pendências a validar no período-0.
