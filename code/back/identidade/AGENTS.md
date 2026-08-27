# AGENTS.md — Serviço `identidade`

Complementa o [`AGENTS.md`](../../../AGENTS.md) da raiz (regras gerais) e o [`code/back/README.md`](../README.md) (visão dos serviços). Fonte de verdade: [`docs/orquestador/REQUISITOS.md`](../../../docs/orquestador/REQUISITOS.md); arquitetura: [`docs/orquestador/documento-de-arquitetura.md`](../../../docs/orquestador/documento-de-arquitetura.md).

## Domínio

Usuário, autenticação, perfil, privacidade, seguidores e solicitações de seguir. Requisitos: **AUT** e **SOC-01 a SOC-08**.

## Stack e dados

- **Stack:** Spring ou NestJS — **a definir pela equipe**; até a decisão, não escolher framework nem criar scaffolding por conta própria. Registrar aqui quando decidido.
- **Schema:** `identidade`, no PostgreSQL único do Neon. Só este serviço cria migration das suas tabelas.
- Leitura por outros serviços apenas via **VIEW** exposta e mantida por este serviço (ex.: relação de seguir para a recomendação algorítmica em `social`).

> Projeto **ainda não iniciado** — apenas a estrutura de pastas. Estrutura interna, padrão de teste e comandos de build entram aqui quando arrancar.

## Pontos de atenção (ver `REQUISITOS.md` §8)

- Senhas com Argon2/bcrypt/scrypt; token de acesso curto e renovação **revogável** (invalidada no logout e na troca de senha).
- Token de recuperação de senha: aleatório criptográfico, uso único, validade 1h, armazenado como hash. E-mail transacional por **Brevo**; processamento assíncrono permanece candidato, ainda não definido.
- **Rate limiting** em auth/cadastro/recuperação; mensagens de login que não revelam se e-mail/username existe; bloqueio progressivo por identidade.
- **Privacidade de perfil** (RN-08): validação de relação de seguidor aceita em todos os endpoints, incluindo listagem e busca. Descoberta **só por username exato** — sem enumeração, listagem ou sugestão.
- Conta de **administrador** fixa e única, provisionada por variável de ambiente.
- Publica eventos: `seguidor.novo`, `solicitacao.*`.
- Cadastro recusa menores de 18 anos (RNF-SEC-43).
