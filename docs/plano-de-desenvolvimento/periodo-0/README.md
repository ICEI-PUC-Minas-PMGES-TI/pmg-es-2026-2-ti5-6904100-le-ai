# Período 0 — Fundação

> Infra, CI, deploy em DES e navegabilidade. **Não é guiado por RF** — vem do `../../orquestador/plano-de-projeto.md` §3 e do `../../orquestador/documento-de-arquitetura.md` §8 ("itens a validar no período-0"). Entrega o "código parcial com navegabilidade" cobrado em 01/09, já com CI e deploy em DES.
>
> Ver o mapa geral em [../README.md](../README.md).

**Janela:** dentro da Sprint 3 · **Alvo:** ~01/09 (ligada à Entrega 2 e à Entrega 3).

As frentes abaixo são a base sobre a qual toda feature de domínio roda. Fecham antes de qualquer feature de Período 1.

| ID | Feature | Serviço | Prioridade | Escopo |
|---|---|---|---|---|
| P0-INFRA | Scaffolding do monorepo e serviços | — | fundação | `code/{mobile,front,back/{identidade,acervo,leitura,social}}`; `AGENTS.md` por serviço; `.env.example`; esqueleto de cada serviço com health check (RNF-OBS-02), corpo de erro padrão (RNF-ERR-01) e correlation-id no log (RNF-OBS-01) |
| P0-CI | Pipeline CI/CD | — | fundação | GitHub Actions com filtro por caminho; lint/build/test por serviço; artefato APK do Flutter a cada merge em `main` |
| P0-DEPLOY | Deploy em DES | — | fundação | Render (4 serviços + site estático Vue) + Neon (projeto único, schema por serviço, branch de banco por dev) |
| P0-MSG | Mensageria e integrações base | — | fundação | RabbitMQ/CloudAMQP conectado (uma conexão por serviço); validar viabilidade free-tier: GitHub Actions `schedule` (fallback cron-job.org), Cloudinary, Brevo, FCM |
| P0-DS | Design system base | — | fundação | Tokens do `../../orquestador/documento-de-design.md` traduzidos para web (Tailwind config/CSS vars) e Flutter `ThemeData` |
| P0-NAV | Navegabilidade + shell de auth + docs de API | — | fundação | Cadastro/login mínimos ligando web+mobile ao `identidade`; navegação entre as telas principais; Swagger UI agregado (`docker-compose.docs.yml`) + scaffolding de `docs/api/` |

**Notas**
- `P0-NAV` entrega apenas o esqueleto navegável de autenticação; a feature completa `F-AUT` (Período 1) implementa o fluxo inteiro de AUT.
- Serviço marcado `—` porque estas frentes são transversais (não pertencem a um único serviço de domínio). O dono é registrado quando a frente é assumida.

## Arquivos de feature

Template em `../../orquestador/plano-de-projeto.md` §9. As 6 frentes do Período 0 estão detalhadas:

- [P0-INFRA — Scaffolding do monorepo e serviços](feature-P0-INFRA.md)
- [P0-CI — Pipeline CI/CD](feature-P0-CI.md)
- [P0-DEPLOY — Deploy em DES (Render + Neon)](feature-P0-DEPLOY.md)
- [P0-MSG — Mensageria e integrações base](feature-P0-MSG.md)
- [P0-DS — Design system base](feature-P0-DS.md)
- [P0-NAV — Navegabilidade + shell de auth + docs de API](feature-P0-NAV.md)
