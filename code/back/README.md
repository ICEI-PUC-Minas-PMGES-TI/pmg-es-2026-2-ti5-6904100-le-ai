# Backend — Lê Ai (microsserviços)

Backend em **microsserviços**, consumido por HTTP/JSON pelos clientes web e mobile, com mensageria **RabbitMQ** para os fluxos assíncronos e **PostgreSQL no Neon** (um schema por serviço). Duas stacks convivem: **Spring (Java)** e **NestJS (TypeScript)** — a alocação por serviço é decisão da equipe e fica registrada no `AGENTS.md` de cada serviço.

> Serviços **ainda não iniciados** — apenas a estrutura de pastas. Cada pasta receberá o projeto e as instruções de build/execução no período-0.

| Serviço | Domínio | Requisitos |
|---|---|---|
| [`identidade/`](identidade) | Usuário, autenticação, perfil, privacidade, seguidores, solicitações | AUT, SOC-01 a 08 |
| [`acervo/`](acervo) | Livro, autor, editora, série, busca, ingestão, sinopse, capas, nota agregada | ACV |
| [`leitura/`](leitura) | Estante, leitura, progresso, sessão, nota, resenha, frases, desafios, streak, estatísticas | EST, PRG, AVA, DSF, STA, GAM |
| [`social/`](social) | Feed, atividades, comentários, listas, recomendações, notificações, moderação | SOC-09 a 15, LST, REC, NOT, MOD |

**Acesso entre schemas:** nenhum serviço lê a tabela crua de outro schema — apenas por **VIEW** exposta e mantida pelo serviço dono, versionada junto do spec OpenAPI. Cada serviço publicará seu contrato em `docs/api/`, diretório planejado no período-0. Decomposição completa em [`../../docs/orquestador/documento-de-arquitetura.md`](../../docs/orquestador/documento-de-arquitetura.md) §3–5.
