# AGENTS.md — Serviço `social`

Complementa o [`AGENTS.md`](../../../AGENTS.md) da raiz (regras gerais) e o [`code/back/README.md`](../README.md) (visão dos serviços). Fonte de verdade: [`docs/orquestador/REQUISITOS.md`](../../../docs/orquestador/REQUISITOS.md); arquitetura: [`docs/orquestador/documento-de-arquitetura.md`](../../../docs/orquestador/documento-de-arquitetura.md).

## Domínio

Feed e atividades, curtidas de atividade, comentários, listas, recomendações (P2P e algorítmica), notificações e moderação. Requisitos: **SOC-09 a 15, LST, REC, NOT, MOD**.

## Stack e dados

- **Stack:** Spring ou NestJS — **a definir pela equipe**. Até a decisão, não escolher framework nem criar scaffolding por conta própria. Registrar aqui quando decidido.
- **Schema:** `social`, no PostgreSQL único do Neon.
- **Recomendação algorítmica** é hospedada aqui, lendo **VIEWs** de `leitura` (estante, nota), `identidade` (seguir) e `acervo` (assunto) — nunca tabelas cruas. Calculada em tempo de consulta, sem estrutura derivada (`REQUISITOS.md` §10.7).
- **Feed guarda snapshot** no evento de atividade (nome do usuário, título e capa do livro no momento), em vez de hidratar por join a cada scroll.

> Projeto **ainda não iniciado** — apenas a estrutura de pastas.

## Pontos de atenção (ver `REQUISITOS.md`)

- É o **consumidor** do fluxo de **notificações in-app** (fan-out); adiciona FCM em Android (arquitetura §5.2). Curtida de **atividade de feed** fica aqui; curtida de **resenha** fica em `leitura`.
- **Comentários (RN-10):** um nível de aninhamento; resposta a resposta é irmã, com menção `@username`. Menção resolve só se o username existir; sujeita a rate limiting.
- **Recomendação P2P (RN-22):** só entre seguimento mútuo; sem aceitar/recusar; expira em 90 dias; limite de 50 ativas por par; quatro vias de remoção convergem para a mesma operação. Livro pessoal não é recomendável.
- **Moderação (RF-MOD):** apenas resenhas e comentários são denunciáveis; painel restrito ao administrador (verificação no servidor); toda ação em **log de auditoria**.
- Todo consumidor de mensagem é **idempotente** e valida schema; falha após o máximo de tentativas vai para **DLQ**.
- **Rate limiting** em ações sociais — seguir, curtir, comentar, mencionar, denunciar (RNF-SEC-18).
