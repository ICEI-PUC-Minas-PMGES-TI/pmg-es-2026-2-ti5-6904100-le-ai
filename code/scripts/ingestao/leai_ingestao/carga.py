"""Fase 3: carga no schema `acervo` por `COPY` e upsert (RNF-SEC-12, §10.1).

Nada de `INSERT` linha a linha e nada de SQL montado por concatenação: os
candidatos entram por `COPY` em tabelas temporárias de staging e de lá são
projetados nas tabelas reais com `INSERT ... SELECT ... ON CONFLICT DO NOTHING`.
É o que §10.1 pede e o que torna a recarga idempotente — reexecutar a mesma
amostra não duplica livro, autor, editora, série nem assunto.

`psycopg` é importado aqui dentro, e só aqui: o resto do pacote roda sem banco e
sem libpq, que é o que permite a suíte de testes rodar em qualquer lugar.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from .dados import resolver_editora
from .normalizacao import normalizar_editora, normalizar_nome_autor

# Staging temporário: morre no fim da transação, nunca polui o schema.
SQL_STAGING = """
CREATE TEMP TABLE stg_livro (
  isbn13 text, ol_edition_key text, ol_work_key text, titulo text,
  ano_publicacao integer, paginas integer, capa_url_externa text,
  editora_nome text, editora_normalizada text,
  serie_nome text, serie_normalizada text, numero_serie integer
) ON COMMIT DROP;

CREATE TEMP TABLE stg_autor (
  ol_author_key text, nome text, nome_normalizado text
) ON COMMIT DROP;

CREATE TEMP TABLE stg_livro_autor (isbn13 text, ol_author_key text) ON COMMIT DROP;
CREATE TEMP TABLE stg_livro_assunto (isbn13 text, slug text) ON COMMIT DROP;
"""

# A entidade Editora nasce da forma normalizada (RN-12). `DISTINCT ON` escolhe
# uma forma de exibição estável para cada chave normalizada.
SQL_EDITORA = """
INSERT INTO acervo.editora (nome, nome_normalizado)
SELECT DISTINCT ON (editora_normalizada) editora_nome, editora_normalizada
  FROM stg_livro
 WHERE editora_normalizada IS NOT NULL AND btrim(editora_normalizada) <> ''
 ORDER BY editora_normalizada, editora_nome
ON CONFLICT (nome_normalizado) DO NOTHING;
"""

SQL_SERIE = """
INSERT INTO acervo.serie (nome, nome_normalizado)
SELECT DISTINCT ON (serie_normalizada) serie_nome, serie_normalizada
  FROM stg_livro
 WHERE serie_normalizada IS NOT NULL AND btrim(serie_normalizada) <> ''
 ORDER BY serie_normalizada, serie_nome
ON CONFLICT (nome_normalizado) DO NOTHING;
"""

# `autor_ol_author_key_uidx` é índice único PARCIAL, então o ON CONFLICT precisa
# repetir o predicado para o Postgres inferir o índice certo. Na carga do dump
# todo autor tem chave, e é sempre por ela que se deduplica (RN-12).
SQL_AUTOR = """
INSERT INTO acervo.autor (nome, nome_normalizado, ol_author_key)
SELECT DISTINCT ON (ol_author_key) nome, nome_normalizado, ol_author_key
  FROM stg_autor
 WHERE ol_author_key IS NOT NULL AND btrim(nome) <> ''
 ORDER BY ol_author_key, nome
ON CONFLICT (ol_author_key) WHERE ol_author_key IS NOT NULL DO NOTHING;
"""

# `tipo='oficial'` implica, pelo CHECK `livro_oficial_pessoal_ck`: isbn13 não
# nulo, dono_id nulo, autor_informado nulo, capa externa não vazia e ativo. O
# filtro da fase 1 já garante os três primeiros; os dois últimos são literais.
# `numero_serie` só pode existir com `serie_id` (livro_numero_serie_exige_serie_ck).
# `sinopse_status` fica no default `nao_consultada`: sinopse não é carregada na
# ingestão (RN-19.1), é obtida sob demanda por F-ACV-BUSCA.
SQL_LIVRO = """
INSERT INTO acervo.livro (
  isbn13, ol_edition_key, ol_work_key, titulo, ano_publicacao, paginas,
  capa_url_externa, tipo, editora_id, serie_id, numero_serie, ativo
)
SELECT s.isbn13, s.ol_edition_key, s.ol_work_key, s.titulo, s.ano_publicacao, s.paginas,
       s.capa_url_externa, 'oficial', e.id, r.id,
       CASE WHEN r.id IS NOT NULL THEN s.numero_serie END,
       true
  FROM stg_livro s
  LEFT JOIN acervo.editora e ON e.nome_normalizado = s.editora_normalizada
  LEFT JOIN acervo.serie   r ON r.nome_normalizado = s.serie_normalizada
 WHERE s.ol_edition_key IS NULL
    OR NOT EXISTS (
         SELECT 1 FROM acervo.livro x WHERE x.ol_edition_key = s.ol_edition_key
       )
ON CONFLICT (isbn13) WHERE isbn13 IS NOT NULL DO NOTHING;
"""

SQL_LIVRO_AUTOR = """
INSERT INTO acervo.livro_autor (livro_id, autor_id)
SELECT l.id, a.id
  FROM stg_livro_autor s
  JOIN acervo.livro l ON l.isbn13 = s.isbn13
  JOIN acervo.autor a ON a.ol_author_key = s.ol_author_key
ON CONFLICT DO NOTHING;
"""

# Assunto NÃO é criado aqui: o conjunto é curado e fechado (RN-21.1), populado
# pelo comando `semear`. Slug fora do conjunto simplesmente não casa o JOIN e
# some, que é o descarte de RN-21.3 acontecendo mais uma vez.
SQL_LIVRO_ASSUNTO = """
INSERT INTO acervo.livro_assunto (livro_id, assunto_id)
SELECT l.id, a.id
  FROM stg_livro_assunto s
  JOIN acervo.livro   l ON l.isbn13 = s.isbn13
  JOIN acervo.assunto a ON a.slug = s.slug
ON CONFLICT DO NOTHING;
"""


@dataclass
class TotaisDaCarga:
    livros: int = 0
    editoras: int = 0
    series: int = 0
    autores: int = 0
    vinculos_autor: int = 0
    vinculos_assunto: int = 0

    def como_dict(self) -> dict:
        return {
            "livros": self.livros,
            "editoras": self.editoras,
            "series": self.series,
            "autores": self.autores,
            "vinculos_autor": self.vinculos_autor,
            "vinculos_assunto": self.vinculos_assunto,
        }


def conectar(url: str):
    """Conexão psycopg. O import é local porque `psycopg` é extra opcional."""
    try:
        import psycopg
    except ModuleNotFoundError as erro:  # pragma: no cover - depende do ambiente
        raise RuntimeError(
            "psycopg não está instalado. Rode `pip install -e .[banco]` para as "
            "operações que falam com o Postgres."
        ) from erro
    return psycopg.connect(url)


def _copiar(cursor, tabela: str, colunas: list[str], linhas) -> int:
    """`COPY` em streaming para uma tabela de staging."""
    total = 0
    alvo = f"COPY {tabela} ({', '.join(colunas)}) FROM STDIN"
    with cursor.copy(alvo) as copia:
        for linha in linhas:
            copia.write_row(linha)
            total += 1
    return total


def carregar(
    conexao,
    candidatos: Path,
    autores: Path,
    assuntos: Path,
    sinonimos: dict[str, str],
    limite: int | None = None,
) -> TotaisDaCarga:
    """Executa a fase 3 inteira em uma transação.

    Ou o lote inteiro entra, ou nada entra: falha no meio não deixa carga
    parcial silenciosa, que é o que o teste operacional da feature exige.
    """
    totais = TotaisDaCarga()
    assuntos_por_obra = _ler_assuntos_por_obra(assuntos)
    nomes_de_autor = _ler_nomes_de_autor(autores)

    with conexao.cursor() as cursor:
        cursor.execute(SQL_STAGING)

        vinculos_autor: list[tuple[str, str]] = []
        vinculos_assunto: list[tuple[str, str]] = []
        autores_usados: set[str] = set()

        def linhas_de_livro():
            for indice, registro in enumerate(_ler_jsonl(candidatos)):
                if limite is not None and indice >= limite:
                    break
                isbn13 = registro["isbn13"]

                for chave in registro.get("autores_ol") or []:
                    if chave in nomes_de_autor:
                        vinculos_autor.append((isbn13, chave))
                        autores_usados.add(chave)

                for slug in assuntos_por_obra.get(registro.get("ol_work_key") or "", ()):
                    vinculos_assunto.append((isbn13, slug))

                editora = resolver_editora(registro.get("editora_nome"), sinonimos)
                yield (
                    isbn13,
                    registro.get("ol_edition_key"),
                    registro.get("ol_work_key"),
                    registro["titulo"],
                    registro.get("ano_publicacao"),
                    registro["paginas"],
                    registro["capa_url_externa"],
                    editora[0] if editora else None,
                    editora[1] if editora else None,
                    registro.get("serie_nome"),
                    registro.get("serie_normalizada"),
                    registro.get("numero_serie"),
                )

        _copiar(
            cursor,
            "stg_livro",
            [
                "isbn13", "ol_edition_key", "ol_work_key", "titulo", "ano_publicacao",
                "paginas", "capa_url_externa", "editora_nome", "editora_normalizada",
                "serie_nome", "serie_normalizada", "numero_serie",
            ],
            linhas_de_livro(),
        )

        _copiar(
            cursor,
            "stg_autor",
            ["ol_author_key", "nome", "nome_normalizado"],
            (
                (chave, nome, normalizar_nome_autor(nome))
                for chave, nome in nomes_de_autor.items()
                if chave in autores_usados
            ),
        )
        _copiar(cursor, "stg_livro_autor", ["isbn13", "ol_author_key"], vinculos_autor)
        _copiar(cursor, "stg_livro_assunto", ["isbn13", "slug"], vinculos_assunto)

        cursor.execute(SQL_EDITORA)
        totais.editoras = cursor.rowcount
        cursor.execute(SQL_SERIE)
        totais.series = cursor.rowcount
        cursor.execute(SQL_AUTOR)
        totais.autores = cursor.rowcount
        cursor.execute(SQL_LIVRO)
        totais.livros = cursor.rowcount
        cursor.execute(SQL_LIVRO_AUTOR)
        totais.vinculos_autor = cursor.rowcount
        cursor.execute(SQL_LIVRO_ASSUNTO)
        totais.vinculos_assunto = cursor.rowcount

    conexao.commit()
    return totais


def semear(conexao, assuntos, sinonimos: dict[str, str], mapa_csv) -> dict:
    """Popula os dados curados versionados desta feature.

    Roda antes da carga: `livro_assunto` só casa com assunto que já existe, e a
    tabela de sinônimos precisa das editoras canônicas.
    """
    contagem = {"assuntos": 0, "editoras": 0, "sinonimos": 0, "mapeamentos": 0}

    with conexao.cursor() as cursor:
        for assunto in assuntos:
            cursor.execute(
                """
                INSERT INTO acervo.assunto (nome, slug) VALUES (%s, %s)
                ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome
                """,
                (assunto.nome, assunto.slug),
            )
            contagem["assuntos"] += 1

        for forma_externa, canonico in sinonimos.items():
            normalizado = normalizar_editora(canonico)
            cursor.execute(
                """
                INSERT INTO acervo.editora (nome, nome_normalizado) VALUES (%s, %s)
                ON CONFLICT (nome_normalizado) DO NOTHING
                """,
                (canonico, normalizado),
            )
            contagem["editoras"] += cursor.rowcount
            cursor.execute(
                """
                INSERT INTO acervo.sinonimo_editora (forma_externa, editora_id)
                SELECT %s, id FROM acervo.editora WHERE nome_normalizado = %s
                ON CONFLICT (forma_externa) DO UPDATE SET editora_id = EXCLUDED.editora_id
                """,
                (forma_externa, normalizado),
            )
            contagem["sinonimos"] += 1

        for tag_externa, slug in mapa_csv:
            cursor.execute(
                """
                INSERT INTO acervo.mapa_assunto_externo (tag_externa, assunto_id)
                SELECT %s, id FROM acervo.assunto WHERE slug = %s
                ON CONFLICT (tag_externa) DO UPDATE SET assunto_id = EXCLUDED.assunto_id
                """,
                (tag_externa, slug),
            )
            contagem["mapeamentos"] += 1

    conexao.commit()
    return contagem


def medir_armazenamento(conexao) -> list[tuple[str, int, int]]:
    """Tamanho de dados e de índice por tabela do schema `acervo`.

    Serve a RNF-DES-04 e RNF-DES-05: o teto é 20% do plano Neon e o índice de
    busca é o custo dominante, então os dois precisam aparecer separados para a
    execução real registrar o número na Timeline da feature.
    """
    with conexao.cursor() as cursor:
        cursor.execute(
            """
            SELECT relname,
                   pg_table_size(c.oid)   AS dados,
                   pg_indexes_size(c.oid) AS indices
              FROM pg_class c
              JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'acervo' AND c.relkind = 'r'
             ORDER BY pg_total_relation_size(c.oid) DESC
            """
        )
        return cursor.fetchall()


def _ler_jsonl(caminho: Path):
    with open(caminho, encoding="utf-8") as arquivo:
        for linha in arquivo:
            linha = linha.strip()
            if linha:
                yield json.loads(linha)


def _ler_nomes_de_autor(caminho: Path) -> dict[str, str]:
    return {r["ol_author_key"]: r["nome"] for r in _ler_jsonl(caminho)}


def _ler_assuntos_por_obra(caminho: Path) -> dict[str, list[str]]:
    return {r["ol_work_key"]: r["assuntos"] for r in _ler_jsonl(caminho)}
