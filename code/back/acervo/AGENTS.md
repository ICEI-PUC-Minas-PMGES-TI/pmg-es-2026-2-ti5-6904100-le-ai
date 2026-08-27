# AGENTS.md — Serviço `acervo`

Complementa o [`AGENTS.md`](../../../AGENTS.md) da raiz (regras gerais) e o [`code/back/README.md`](../README.md) (visão dos serviços). Fonte de verdade: [`docs/orquestador/REQUISITOS.md`](../../../docs/orquestador/REQUISITOS.md); arquitetura: [`docs/orquestador/documento-de-arquitetura.md`](../../../docs/orquestador/documento-de-arquitetura.md).

## Domínio

Livro (oficial e pessoal), autor, editora, série, busca e filtros, ingestão, sinopse, capas e **nota agregada** (materializada). Requisitos: **ACV**.

## Stack e dados

- **Stack:** Spring ou NestJS — **a definir pela equipe** (recomendação da arquitetura: mesma stack que `leitura`). Até a decisão, não escolher framework nem criar scaffolding por conta própria. Registrar aqui quando decidido.
- **Schema:** `acervo`, no PostgreSQL único do Neon. É o serviço **mais dependente de busca e filtro relacional** — índices sobre título, autor e ISBN (RNF-DES-03).
- **Nota dos leitores (agregada)** é uma projeção local alimentada pelo evento `nota.alterada`; nunca lê a tabela privada `leitura.nota`.

> Projeto **ainda não iniciado** — apenas a estrutura de pastas.

## Pontos de atenção (ver `REQUISITOS.md`)

- **Livro = edição** (RN-01); **ISBN-13** é chave natural única do livro oficial (RN-02). **Livro pessoal não tem ISBN** e fica fora de busca, catálogo, filtros e páginas de autor/editora/série (RNF-SEC-06).
- **Cadastro por ISBN:** ISBN validado por formato e dígito verificador; URL da fonte externa construída pelo servidor a partir de **allowlist** — nunca aceitar URL do usuário (RNF-SEC-38/39, anti-SSRF). Fontes: OpenLibrary → Google Books.
- **Sinopse** e **capas** por **cache sob demanda**, não na carga inicial (RN-19, RN-14). Ordem de exibição da capa: cópia própria → URL externa → placeholder.
- **Assuntos** normalizados de conjunto curado e fechado na ingestão (RN-21); tag externa sem correspondência não cria assunto.
- **Nota geral** externa é somente-leitura, importada quando a fonte fornece (RN-06); nunca combinada com a nota dos leitores.
- Ingestão via **script utilitário** (carga do dump OpenLibrary), não serviço; dados externos validados e normalizados antes de persistir (RNF-SEC-33).
- Produz/consome: `livro.importacao_solicitada`, `livro.pagina_aberta`, `livro.adicionado_a_estante` (consome, cache de capa), `nota.alterada` (consome, refresh da agregada).
