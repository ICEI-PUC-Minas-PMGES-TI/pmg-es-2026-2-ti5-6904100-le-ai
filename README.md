# Lê Ai

**Lê Ai** é um aplicativo social de leitura — no modelo Skoob/Letterboxd — cujo objetivo é **aumentar a adesão à leitura entre leitores brasileiros com 18 anos ou mais**. A tese de produto é que o hábito de leitura pode ser sustentado por três mecanismos: **registro** (ver o que já foi lido), **meta** (ter um alvo curto e alcançável) e **pertencimento** (ver amigos lendo). O aplicativo entrega os três.

O produto principal é um **app mobile nativo em Flutter**, acompanhado de uma **aplicação web em Vue + Tailwind** que cobre um subconjunto de funcionalidades (consulta, catálogo e conteúdo escrito). O backend segue arquitetura de **microsserviços** (Spring e NestJS) sobre **PostgreSQL no Neon**, com **RabbitMQ** para os fluxos assíncronos. O escopo completo, o modelo de domínio e as regras de negócio estão em [`docs/orquestador/REQUISITOS.md`](docs/orquestador/REQUISITOS.md) — a **fonte de verdade** do projeto —, e as decisões de arquitetura em [`docs/orquestador/documento-de-arquitetura.md`](docs/orquestador/documento-de-arquitetura.md).

## Integrantes

- Vicenzo Fonseca de Mello Souza
- Renato Douglas Nascimento Silva de Oliveira
- Henrique Moreira Gomes de Carvalho
- Kayke Emanoel de Souza Santos
- Ana Luiza de Freitas Rodrigues

## Orientadores

- Leonardo Vilela Cardoso
- Artur Martins Mol
- João Paulo Carneiro Aramuni

## Instruções de utilização

> O sistema está em fase inicial de desenvolvimento (período-0). Esta seção será complementada com o passo a passo de instalação de dependências e execução assim que a primeira versão executável de cada cliente e serviço estiver disponível.

O código do projeto vive em [`code/`](code/):

- [`code/mobile/`](code/mobile) — app **Flutter** (produto principal)
- [`code/front/`](code/front) — SPA **web em Vue + Tailwind**
- [`code/back/`](code/back) — **microsserviços** de backend: `identidade`, `acervo`, `leitura` e `social`

A documentação vive em [`docs/`](docs/), com destaque para [`docs/orquestador/REQUISITOS.md`](docs/orquestador/REQUISITOS.md) (fonte de verdade do produto), [`docs/orquestador/plano-de-projeto.md`](docs/orquestador/plano-de-projeto.md) (processo de trabalho do grupo) e [`docs/orquestador/documento-de-arquitetura.md`](docs/orquestador/documento-de-arquitetura.md) (decisões de arquitetura). As convenções para desenvolvimento — inclusive para agentes de IA — estão em [`AGENTS.md`](AGENTS.md).
