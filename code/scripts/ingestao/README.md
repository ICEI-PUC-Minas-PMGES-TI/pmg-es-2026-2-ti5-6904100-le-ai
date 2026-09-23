# Ingestão do acervo — carga inicial do dump do OpenLibrary

Implementa **RF-ACV-13** (carga inicial com normalização, RN-12) e **RF-ACV-20** (assuntos normalizados, RN-21) da feature [F-ACV-INGESTAO](../../../docs/plano-de-desenvolvimento/periodo-1/feature-F-ACV-INGESTAO.md).

É um **script utilitário**, rodado na mão por alguém do grupo. Não é serviço, não sobe no Render, não usa fila.

## Por que o pipeline tem três fases

O dump de edições não é autossuficiente. A edição referencia o autor por `/authors/OL…A` e a obra por `/works/OL…W`, mas o **nome** do autor mora em `ol_dump_authors` e os **assuntos** moram na obra, em `ol_dump_works`. Somando os três, são dezenas de GB — não cabem na memória nem no plano gratuito do Neon (RNF-DES-04). Por isso a carga é dividida:

| Fase | Comando | Lê | Escreve |
|---|---|---|---|
| 1 | `filtrar` | dump de edições | candidatos elegíveis + chaves de autor/obra a resolver (e as obras cuja edição veio sem autor) |
| 2 | `resolver` | dumps de obras e autores, nessa ordem | assuntos já mapeados, primeiro autor da obra e nomes de autor (sem marcador de catálogo) |
| 3 | `carregar` | as saídas das fases 1 e 2 | `COPY` para staging e upsert no schema `acervo` |

Cada fase é streaming. **Nada do dump bruto vai para o Neon.**

## Roteiro completo

### 1. Preparar o ambiente

```bash
cd code/scripts/ingestao
python -m venv .venv && source .venv/bin/activate
pip install -e .[banco,dev]
```

### 2. Baixar os dumps

Os dumps ficam em <https://openlibrary.org/developers/dumps> (domínio público, CC0). Baixe os três mais recentes para `dumps/` — o diretório está no `.gitignore`:

```bash
mkdir -p dumps
curl -L -o dumps/ol_dump_editions.txt.gz https://openlibrary.org/data/ol_dump_editions_latest.txt.gz
curl -L -o dumps/ol_dump_authors.txt.gz  https://openlibrary.org/data/ol_dump_authors_latest.txt.gz
curl -L -o dumps/ol_dump_works.txt.gz    https://openlibrary.org/data/ol_dump_works_latest.txt.gz
```

São dezenas de GB comprimidos. Reserve banda e disco: contam o download, o descompactado em streaming e os arquivos intermediários de `trabalho/`.

### 3. Conferir os dados curados

```bash
python -m leai_ingestao conferir
```

Valida os três CSV de `dados/` entre si, sem tocar o banco. Falhar aqui é muito melhor do que falhar depois de horas de carga.

### 4. Semear os dados curados

```bash
export DATABASE_URL='postgresql://...'   # branch de DES; nunca versionar
python -m leai_ingestao semear
```

Popula `acervo.assunto` (os ~30 gêneros de RN-21.1), `acervo.sinonimo_editora` e `acervo.mapa_assunto_externo`. **Rode antes da carga:** `livro_assunto` só casa com assunto que já existe.

### 5. Filtrar (fase 1)

```bash
python -m leai_ingestao filtrar --dump dumps/ol_dump_editions.txt.gz
```

Aplica RN-12 no nível da edição: português, com ISBN-13 válido, com total de páginas e com capa. Descarta autopublicação (§10.1). Imprime os totais por motivo de descarte — guarde esse JSON, ele alimenta o passo 7.

Para dimensionar a carga ao teto de 20% do plano Neon (RNF-DES-04), use `--limite N`.

### 6. Resolver (fase 2)

```bash
python -m leai_ingestao resolver \
  --dump-autores dumps/ol_dump_authors.txt.gz \
  --dump-obras   dumps/ol_dump_works.txt.gz
```

Lê os dois dumps uma vez cada, guardando só o que as chaves da fase 1 pedem. As tags livres da origem já saem traduzidas para o conjunto curado — elas nunca chegam ao banco (RN-12).

**O dump de obras é lido antes do de autores.** Muitas edições brasileiras da OpenLibrary não têm `authors`; só a obra tem, e a lista da obra mistura o autor com tradutor e prefaciador. Para essas edições vale o **primeiro** autor da obra — o mesmo critério do importador por ISBN do serviço `acervo` —, e a passada pelas obras grava `trabalho/autor_obra.jsonl` (`ol_work_key` → `ol_author_key`). Essas chaves também precisam de nome, por isso entram no conjunto da passada pelos autores. Com os dois dumps na mesma chamada, a ordem é garantida pelo comando. Em chamadas separadas, rode `--dump-obras` primeiro: `--dump-autores` sozinho é recusado enquanto houver obra a resolver e `autor_obra.jsonl` não existir.

O mesmo plano B vale para a edição cujo autor é só **marcador de catálogo**: a OpenLibrary tem registros como `/authors/OL2965820A`, de nome `[author not identified]`, vinculados a edições cuja obra conhece o autor verdadeiro (ex.: `9788532528421`, de Austin Kleon). Nome vazio, inteiro entre colchetes ou equivalente a "unknown"/"autor desconhecido" não ganha linha em `autores.jsonl`, e a carga trata a chave como ausente (`nome_de_autor_utilizavel`, gêmeo de `nomeDeAutorUtilizavel` do serviço `acervo`). Como isso só se descobre na passada pelos autores, `autor_obra.jsonl` guarda o primeiro autor de **toda** obra pedida, não só das obras de edição sem `authors`.

### 7. Carregar (fase 3)

```bash
python -m leai_ingestao carregar --processados 1234567 --descartados 1200000
```

Lê `trabalho/candidatos.jsonl`, `autores.jsonl`, `assuntos.jsonl` e `autor_obra.jsonl` (caminhos em `--candidatos`, `--autores`, `--assuntos` e `--autor-obra`). `--processados` e `--descartados` vêm do JSON da fase 1 e alimentam `acervo.ingestao_execucao`. A carga é **uma transação**: ou o lote inteiro entra, ou nada entra.

No fim, o comando imprime o tamanho de dados e de índice por tabela. **Esse número vai para a Timeline da feature** — é item próprio do DoD registrar o volume real carregado e a fração do plano Neon consumida (RNF-DES-04, RNF-DES-05).

### 8. Conferir o resultado

```sql
SELECT * FROM acervo.ingestao_execucao ORDER BY iniciado_em DESC LIMIT 1;
SELECT count(*) FROM acervo.livro WHERE tipo = 'oficial';
SELECT count(*) FROM acervo.livro WHERE tipo = 'oficial' AND capa_url_externa IS NULL;  -- deve ser 0
SELECT a.nome, count(*) FROM acervo.livro_assunto la
  JOIN acervo.assunto a ON a.id = la.assunto_id GROUP BY a.nome ORDER BY 2 DESC;
```

Reexecutar a mesma carga não deve mudar as contagens: a deduplicação por ISBN-13 e `ol_edition_key` torna a operação idempotente.

## Testes

```bash
python -m pytest
```

Roda sem banco e sem rede, contra `amostra/`. A amostra tem 16 edições aceitas e 8 descartadas, uma por motivo de descarte. Uma das aceitas (`OL30000015M`) vem sem `authors`, e a obra dela lista o autor seguido da tradutora: prova que o autor herdado da obra é só o primeiro. Outra (`OL30000016M`) vincula o marcador `[author not identified]`, e a obra dela lista Austin Kleon: prova que o marcador conta como ausente e cede ao autor da obra. É o que o CI executa — o DoD da feature diz que o CI não roda o dump inteiro.

Os testes marcados `banco` (`tests/test_carga_banco.py`) passam a amostra pelo roteiro inteiro — `semear`, `filtrar`, `resolver`, `carregar` — contra um Postgres descartável, com as migrations reais de `acervo`. Provam o registro em `ingestao_execucao`, a transação única (falha no meio não deixa carga parcial e fica registrada como `falha`) e a reexecução sem duplicar. Sem `DATABASE_URL_TESTE` eles são pulados:

```bash
docker run -d --name leai-pg-teste -e POSTGRES_PASSWORD=teste -e POSTGRES_DB=leai_teste \
  -p 55432:5432 postgres:17-alpine
pip install -e .[banco,dev]
DATABASE_URL_TESTE=postgresql://postgres:teste@localhost:55432/leai_teste python -m pytest
```

**Nunca aponte `DATABASE_URL_TESTE` para o Neon:** o fixture derruba e recria o schema `acervo`, e recusa URL de banco gerenciado.

## O que este script deliberadamente não faz

- **Não busca sinopse** (RN-19.1 — sob demanda, em F-ACV-BUSCA).
- **Não importa nota geral** (RF-ACV-15 é F-ACV-NOTA, Período 2).
- **Não baixa capas** (RN-14 — cache sob demanda, disparado pela entrada na estante).
- **Não cria assuntos** (RN-21.1 — conjunto curado e fechado).
- **Não publica evento nenhum.** Recarga manual do dump é RF-ACV-14, alocada a F-ACV-OPC no Período 3; o `tipo=recarga` já existe na tabela, mas a operação é daquela feature.
