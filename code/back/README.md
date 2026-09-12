# Backend — Lê Ai (microsserviços)

Backend em **microsserviços**, consumido por HTTP/JSON pelos clientes web e mobile, com mensageria **RabbitMQ** para os fluxos assíncronos e **PostgreSQL no Neon** (um schema por serviço). Duas stacks convivem: **Spring (Java)** e **NestJS (TypeScript)** — a alocação por serviço foi decidida em 02/09/2026 e fica registrada no `AGENTS.md` de cada serviço.

> Os quatro serviços estão **scaffoldados** (P0-INFRA): sobem, respondem `GET /health` e implementam os transversais. Ainda **sem rota de domínio** — elas chegam com as features. Comandos de build e execução no `AGENTS.md` de cada serviço.

| Serviço | Stack | Porta local | Domínio | Requisitos |
|---|---|---|---|---|
| [`identidade/`](identidade) | Spring Boot 4.1 / JDK 21 | 8080 | Usuário, autenticação, perfil, privacidade, seguidores, solicitações | AUT, SOC-01 a 08 |
| [`acervo/`](acervo) | NestJS 11 / Node 22 | 3000 | Livro, autor, editora, série, busca, ingestão, sinopse, capas, nota agregada | ACV |
| [`leitura/`](leitura) | NestJS 11 / Node 22 | 3000 | Estante, leitura, progresso, sessão, nota, resenha, frases, desafios, streak, estatísticas | EST, PRG, AVA, DSF, STA, GAM |
| [`social/`](social) | Spring Boot 4.1 / JDK 21 | 8081 | Feed, atividades, comentários, listas, recomendações, notificações, moderação | SOC-09 a 15, LST, REC, NOT, MOD |

**Contrato transversal idêntico nas duas stacks** (arquitetura §2.1 — é contrato de saída, não biblioteca compartilhada): `GET /health` → `{ "status": "ok", "service": "<servico>", "time": "<ISO-8601>" }`; corpo de erro `{ codigo, mensagem, correlationId }` em pt-BR, sem detalhe técnico; `X-Correlation-Id` lido do header (ou gerado), presente no log e devolvido na resposta; CORS restrito por allowlist; cabeçalhos de segurança; log estruturado em JSON fora de dev.

**Acesso entre schemas:** nenhum serviço lê a tabela crua de outro schema — apenas por **VIEW** exposta e mantida pelo serviço dono, versionada junto do spec OpenAPI. Cada serviço publica seu contrato em [`../../docs/api/`](../../docs/api). Decomposição completa em [`../../docs/orquestador/documento-de-arquitetura.md`](../../docs/orquestador/documento-de-arquitetura.md) §3–5.
