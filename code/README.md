# Código — Lê Ai

Raiz do código do projeto. A estrutura segue a divisão de plataformas e a decomposição em microsserviços definidas em [`docs/orquestador/documento-de-arquitetura.md`](../docs/orquestador/documento-de-arquitetura.md). Cada subprojeto tem seu próprio `AGENTS.md` com as convenções da stack.

> Os projetos ainda **não foram iniciados** — por ora existe apenas a estrutura de pastas. Este README será complementado com instruções de build e execução conforme cada subprojeto arrancar (período-0).

| Pasta | Papel | Stack |
|---|---|---|
| [`mobile/`](mobile) | App mobile — **produto principal**, escopo funcional completo | Flutter |
| [`front/`](front) | SPA web — subconjunto de funcionalidades | Vue + Tailwind CSS |
| [`back/`](back) | Microsserviços de backend | Spring (Java) e NestJS (TypeScript) |

Os quatro serviços de backend (`identidade`, `acervo`, `leitura`, `social`) vivem em [`back/`](back). Convenções gerais de trabalho — branches, commits, DoD, segurança — estão no [`AGENTS.md`](../AGENTS.md) da raiz.
