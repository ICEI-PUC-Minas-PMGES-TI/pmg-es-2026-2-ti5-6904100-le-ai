# AGENTS.md — Script de ingestão do acervo

Complementa o [`AGENTS.md`](../../../AGENTS.md) da raiz. Fonte de verdade: [`docs/orquestador/REQUISITOS.md`](../../../docs/orquestador/REQUISITOS.md) §5.2 (RF-ACV-13, RF-ACV-20), RN-12, RN-21 e §10.1. Feature: [`F-ACV-INGESTAO`](../../../docs/plano-de-desenvolvimento/periodo-1/feature-F-ACV-INGESTAO.md).

## O que este subprojeto é

**Script utilitário de carga, não um serviço.** A arquitetura §2.1 é explícita: a ingestão fica fora dos quatro serviços de backend, e por isso ela mora em `code/scripts/`, não em `code/back/`.

Consequências que valem como regra:

- **Não há rota HTTP, outbox, fila nem consumidor aqui.** Esta feature não depende de [P0-MSG](../../../docs/plano-de-desenvolvimento/periodo-0/feature-P0-MSG.md) e não produz `livro.importacao_solicitada` — aquele evento pertence à importação individual por ISBN de F-ACV-CADASTRO, que é outro fluxo, no serviço `acervo`.
- **O script escreve direto no schema `acervo`**, por `COPY` e SQL parametrizado. Quem lê esses dados são F-ACV-BUSCA e F-ACV-CADASTRO.
- **Ele roda sob demanda, na mão**, a partir da máquina de alguém do grupo. Não é job agendado, não é deploy no Render.

## Stack

- **Python ≥ 3.11**, biblioteca padrão apenas no núcleo.
- **`psycopg` 3 é extra opcional** (`pip install -e .[banco]`), usado só pelas fases que falam com o Postgres. O núcleo — normalização, ISBN, filtros, assuntos, pipeline — não importa `psycopg`, e é isso que permite rodar a suíte inteira e o CI sem banco e sem libpq.
- **pytest** para os testes (`pip install -e .[dev]`).
- Versões fixadas em `requirements.txt` (RNF-SEC-25).

## Estrutura

| Caminho | Papel |
|---|---|
| `leai_ingestao/isbn.py` | ISBN-13: normalização e dígito verificador (RN-02) |
| `leai_ingestao/normalizacao.py` | RN-12: autor, editora, série, slug, tag |
| `leai_ingestao/assuntos.py` | RN-21: tag externa → assunto curado, com teto por livro |
| `leai_ingestao/filtros.py` | RN-12 e §10.1: descarte da edição inelegível |
| `leai_ingestao/edicao.py` | edição do dump → registro normalizado |
| `leai_ingestao/dump.py` | leitura em streaming de TSV/gzip e JSONL |
| `leai_ingestao/pipeline.py` | fases 1 e 2, de arquivo para arquivo |
| `leai_ingestao/dados.py` | leitura e conferência dos CSV curados |
| `leai_ingestao/carga.py` | fase 3: `COPY` para staging e upsert (**só aqui entra `psycopg`**) |
| `leai_ingestao/execucao.py` | registro em `acervo.ingestao_execucao` |
| `dados/*.csv` | entregáveis de dados da feature, versionados |
| `amostra/*.jsonl` | amostra reproduzível — é o que o CI executa (RNF-TST-08) |

## Comandos

```
pip install -e .[dev]                # testes sem banco
pip install -e .[banco]              # semear e carregar

python -m leai_ingestao conferir     # valida os CSV curados, sem banco
python -m leai_ingestao semear       # popula assunto, sinonimo_editora, mapa_assunto_externo
python -m leai_ingestao filtrar  --dump dumps/ol_dump_editions.txt.gz
python -m leai_ingestao resolver --dump-autores dumps/ol_dump_authors.txt.gz \
                                 --dump-obras   dumps/ol_dump_works.txt.gz
python -m leai_ingestao carregar

python -m pytest                     # suíte completa; os testes `banco` pulam sem Postgres
DATABASE_URL_TESTE=postgresql://postgres:teste@localhost:55432/leai_teste python -m pytest
                                     # inclui a carga da amostra em Postgres descartável
```

`DATABASE_URL` vem do ambiente e **nunca** é versionada (RNF-SEC-11).

## Pontos de atenção

- **O filtro de idioma é no nível da EDIÇÃO.** §10.1 mediu 26% de falso positivo em `language:por` da obra. Não reintroduza o filtro por obra.
- **Descartar é a regra, não a exceção.** RN-12: sem ISBN-13, sem total de páginas ou sem capa, o livro não entra — progresso por página exige total de páginas.
- **A URL de capa externa é sempre persistida e nunca descartada** (RN-12, RN-14.1). A cópia própria é cache sob demanda e **não** é desta feature.
- **Sinopse não é carregada** (RN-19.1, é sob demanda em F-ACV-BUSCA) e **nota geral não é desta feature** (RF-ACV-15 é F-ACV-NOTA, Período 2), mesmo que RN-12 mencione nota geral no texto geral de ingestão.
- **Assunto novo nunca é criado pela ingestão** (RN-21.1/4). O conjunto é curado e fechado; tag que não mapeia é descartada, e livro sem assunto é estado válido. Por isso `SQL_LIVRO_ASSUNTO` faz `JOIN` com `acervo.assunto` em vez de inserir.
- **Deduplicação de autor tem armadilha no schema:** `autor` tem índice único parcial em `ol_author_key` (quando não nulo) **e** em `nome_normalizado` (quando `ol_author_key` é nulo). Na carga do dump todo autor tem chave, então deduplique sempre pela chave. Quem cria autor sem chave é o importador por ISBN do serviço `acervo`.
- **A normalização de editora preserva acento de propósito.** RN-12 cita "Intrinseca"/"Intrínseca" como caso da **tabela de sinônimos**; se a normalização removesse acento, o exemplo da regra não existiria. Variante de grafia se resolve no CSV, não na função.
- **Palavra de ramo só é removida do início.** "Editora Rocco" vira `rocco`; "Globo Livros" e "Universo dos Livros" ficam inteiros, porque no fim a palavra é parte da marca.
- **Edição sem `authors` herda só o PRIMEIRO autor da obra.** É comum no acervo brasileiro da fonte, e a lista da obra mistura autor com tradutor e prefaciador cadastrados como autor. Vale o critério do importador por ISBN do serviço `acervo` (`openlibrary.fonte.ts`): primeiro item, na ordem da fonte, sem filtrar por papel, chave validada por `^OL[0-9]+A$` — e primeiro item malformado dá vazio, **não** pula para o segundo. Os dois caminhos de entrada de livro oficial precisam chegar ao mesmo autor para a mesma edição; se mudar a regra, mude nos dois. Na fase 2 isso obriga ler o dump de obras antes do de autores (`trabalho/autor_obra.jsonl`).
- **Dados curados são decisão do grupo.** Os ~30 assuntos, os sinônimos e o mapeamento entram como proposta; mudança neles é mudança de dado do produto, não refatoração.
- **Nunca concatene entrada em SQL** (RNF-SEC-12) e valide o dado externo antes de persistir (RNF-SEC-33). O staging existe para isso.
