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
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from .dados import AutorUnificado, resolver_editora
from .normalizacao import (
    nome_de_autor_utilizavel,
    normalizar_editora,
    normalizar_nome_autor,
    normalizar_serie,
)

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
# todo autor tem chave, e é sempre por ela que se deduplica (RN-12). Chave que o
# `unificar` já juntou a outro autor (`autor_chave_unificada`) não vira autor de
# novo: o vínculo vai para o canônico em `SQL_LIVRO_AUTOR`.
SQL_AUTOR = """
INSERT INTO acervo.autor (nome, nome_normalizado, ol_author_key)
SELECT DISTINCT ON (s.ol_author_key) s.nome, s.nome_normalizado, s.ol_author_key
  FROM stg_autor s
 WHERE s.ol_author_key IS NOT NULL AND btrim(s.nome) <> ''
   AND NOT EXISTS (
         SELECT 1 FROM acervo.autor_chave_unificada u WHERE u.ol_author_key = s.ol_author_key
       )
 ORDER BY s.ol_author_key, s.nome
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
SELECT l.id, coalesce(u.autor_id, a.id)
  FROM stg_livro_autor s
  JOIN acervo.livro l ON l.isbn13 = s.isbn13
  LEFT JOIN acervo.autor_chave_unificada u ON u.ol_author_key = s.ol_author_key
  LEFT JOIN acervo.autor a ON a.ol_author_key = s.ol_author_key
 WHERE coalesce(u.autor_id, a.id) IS NOT NULL
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
    autor_obra: Path,
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
    autor_por_obra = _ler_autor_por_obra(autor_obra)

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

                # Vale só a chave que resolveu para nome utilizável: autor sem
                # nome ou marcador de catálogo (`[author not identified]`)
                # conta como ausente. Sem nenhuma, entra o primeiro autor da
                # obra, o mesmo plano B do importador por ISBN do serviço
                # `acervo`; se ele também não resolver, o livro fica sem autor.
                chaves_de_autor = [
                    chave for chave in registro.get("autores_ol") or [] if chave in nomes_de_autor
                ]
                if not chaves_de_autor:
                    da_obra = autor_por_obra.get(registro.get("ol_work_key") or "")
                    if da_obra in nomes_de_autor:
                        chaves_de_autor = [da_obra]

                for chave in chaves_de_autor:
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


def unificar(conexao, autores_unificados: list[AutorUnificado]) -> dict:
    """Junta autores, editoras e séries duplicados. Quem chama faz o commit.

    Duas causas de duplicado, tratadas nesta ordem:

    1. **Autor cadastrado mais de uma vez na fonte**, com chaves OpenLibrary
       diferentes. A carga deduplica pela chave, então só a curadoria de
       `autores_unificados.csv` junta os dois. Os vínculos vão para o canônico, o
       duplicado some (com a biografia, que muitas vezes é de um homônimo) e a
       chave fica em `autor_chave_unificada` para a carga e a importação por
       ISBN não o recriarem.
    2. **Nome decomposto (NFD) na fonte**, que a normalização antiga quebrava
       ("joa o"). A chave de cada linha é recalculada a partir do nome em NFC, e
       a editora ou série que passar a colidir com outra é juntada a ela.

    Reexecutar não muda nada. Sem a tabela `autor_chave_unificada` (banco ainda
    sem a migration), junta os dados e só deixa de registrar as chaves.
    """
    with conexao.cursor() as cursor:
        cursor.execute("SELECT to_regclass('acervo.autor_chave_unificada') IS NOT NULL")
        tem_tabela_de_chaves = cursor.fetchone()[0]

        resumo = {"autores": _unificar_autores(cursor, autores_unificados, tem_tabela_de_chaves)}
        resumo["autores"].update(_renormalizar_autores(cursor))
        resumo["editoras"] = _renormalizar_por_nome(cursor, "editora", normalizar_editora)
        resumo["series"] = _renormalizar_por_nome(cursor, "serie", normalizar_serie)

        # O que ainda se repete depois da curadoria: homônimo de verdade (fica
        # assim de propósito) ou duplicado novo, para a próxima rodada do CSV.
        cursor.execute(
            """
            SELECT min(nome) FROM acervo.autor
             GROUP BY nome_normalizado HAVING count(*) > 1 ORDER BY 1
            """
        )
        resumo["autores_com_nome_repetido"] = [linha[0] for linha in cursor.fetchall()]
    return resumo


def _unificar_autores(cursor, unificados: list[AutorUnificado], tem_tabela_de_chaves: bool) -> dict:
    cursor.execute(
        """
        CREATE TEMP TABLE stg_autor_unificado (
          ol_author_key text, ol_author_key_canonica text, nome text
        ) ON COMMIT DROP
        """
    )
    _copiar(
        cursor,
        "stg_autor_unificado",
        ["ol_author_key", "ol_author_key_canonica", "nome"],
        ((u.chave, u.canonica, u.nome) for u in unificados),
    )
    # Par que vale neste banco: o duplicado ainda existe e o canônico também.
    # Na reexecução o duplicado já não existe, e o par só garante a chave.
    cursor.execute(
        """
        CREATE TEMP TABLE stg_par_autor ON COMMIT DROP AS
        SELECT d.id AS duplicado_id, c.id AS canonico_id
          FROM stg_autor_unificado s
          JOIN acervo.autor d ON d.ol_author_key = s.ol_author_key
          JOIN acervo.autor c ON c.ol_author_key = s.ol_author_key_canonica
        """
    )
    cursor.execute(
        """
        SELECT count(*) FROM stg_autor_unificado s
         WHERE EXISTS (SELECT 1 FROM acervo.autor d WHERE d.ol_author_key = s.ol_author_key)
           AND NOT EXISTS (
                 SELECT 1 FROM acervo.autor c WHERE c.ol_author_key = s.ol_author_key_canonica
               )
        """
    )
    sem_canonico = cursor.fetchone()[0]

    # A PK de `livro_autor` é (livro, autor): o livro que já tem os dois só perde
    # o vínculo do duplicado.
    cursor.execute(
        """
        INSERT INTO acervo.livro_autor (livro_id, autor_id)
        SELECT la.livro_id, p.canonico_id
          FROM acervo.livro_autor la JOIN stg_par_autor p ON p.duplicado_id = la.autor_id
        ON CONFLICT DO NOTHING
        """
    )
    vinculos_novos = cursor.rowcount
    cursor.execute(
        """
        DELETE FROM acervo.livro_autor la
         USING stg_par_autor p WHERE la.autor_id = p.duplicado_id
        """
    )
    cursor.execute(
        "DELETE FROM acervo.autor a USING stg_par_autor p WHERE a.id = p.duplicado_id"
    )
    removidos = cursor.rowcount

    # Grafia de exibição curada. A chave normalizada se acerta logo depois, em
    # `_renormalizar_autores`.
    cursor.execute(
        """
        UPDATE acervo.autor a SET nome = s.nome
          FROM (SELECT DISTINCT ol_author_key_canonica, nome FROM stg_autor_unificado) s
         WHERE a.ol_author_key = s.ol_author_key_canonica AND a.nome <> s.nome
        """
    )
    nomes_ajustados = cursor.rowcount

    chaves_registradas = None
    if tem_tabela_de_chaves:
        cursor.execute(
            """
            INSERT INTO acervo.autor_chave_unificada (ol_author_key, autor_id)
            SELECT s.ol_author_key, c.id
              FROM stg_autor_unificado s
              JOIN acervo.autor c ON c.ol_author_key = s.ol_author_key_canonica
            ON CONFLICT (ol_author_key) DO UPDATE SET autor_id = EXCLUDED.autor_id
             WHERE acervo.autor_chave_unificada.autor_id <> EXCLUDED.autor_id
            """
        )
        chaves_registradas = cursor.rowcount

    return {
        "pares_no_csv": len(unificados),
        "duplicados_removidos": removidos,
        "vinculos_movidos": vinculos_novos,
        "pares_sem_canonico_no_banco": sem_canonico,
        "nomes_ajustados": nomes_ajustados,
        "tabela_de_chaves": tem_tabela_de_chaves,
        "chaves_registradas": chaves_registradas,
    }


def _renormalizar_autores(cursor) -> dict:
    """Recalcula a chave de autor a partir do nome em NFC.

    Autor com chave da fonte pode repetir nome normalizado (o índice único só
    vale sem chave), então aqui não se junta nada: quem é a mesma pessoa é
    decisão da curadoria. Só o autor sem chave (vindo do Google Books) tem
    índice único por nome; se a nova chave já for de outro sem chave, a linha
    fica como está e é contada.
    """
    cursor.execute("SELECT id, nome, nome_normalizado, ol_author_key FROM acervo.autor")
    linhas = cursor.fetchall()
    sem_chave = {chave for _, _, chave, ol in linhas if ol is None}
    renormalizados = conflitos = 0

    for id_, nome, chave, ol_author_key in linhas:
        nome_nfc = unicodedata.normalize("NFC", nome)
        nova = normalizar_nome_autor(nome_nfc)
        if (nome_nfc, nova) == (nome, chave):
            continue
        if ol_author_key is None and nova != chave:
            if nova in sem_chave:
                conflitos += 1
                continue
            sem_chave.discard(chave)
            sem_chave.add(nova)
        cursor.execute(
            "UPDATE acervo.autor SET nome = %s, nome_normalizado = %s WHERE id = %s",
            (nome_nfc, nova, id_),
        )
        renormalizados += 1

    return {"renormalizados": renormalizados, "sem_chave_em_conflito": conflitos}


# Tabelas com chave única por nome normalizado e as colunas que apontam para
# elas. São constantes deste módulo, nunca entrada: por isso podem compor o SQL.
_REFERENCIAS_POR_NOME = {
    "editora": ["acervo.livro.editora_id", "acervo.sinonimo_editora.editora_id"],
    "serie": ["acervo.livro.serie_id"],
}


def _renormalizar_por_nome(cursor, tabela: str, normalizar) -> dict:
    """Recalcula a chave de editora ou série e junta as que passarem a colidir.

    Fica com a linha que já tinha a chave certa; sem ela, com a de mais livros.
    """
    referencias = _REFERENCIAS_POR_NOME[tabela]
    cursor.execute(f"SELECT id, nome, nome_normalizado FROM acervo.{tabela}")
    linhas = cursor.fetchall()
    dona_da_chave = {chave: id_ for id_, _, chave in linhas}

    grupos: dict[str, list[tuple]] = {}
    for id_, nome, chave in linhas:
        nome_nfc = unicodedata.normalize("NFC", nome)
        nova = normalizar(nome_nfc)
        if (nome_nfc, nova) != (nome, chave):
            grupos.setdefault(nova, []).append((id_, nome_nfc, chave))

    unificadas = renormalizadas = 0
    for nova, membros in grupos.items():
        ids = [id_ for id_, _, _ in membros]
        canonico = dona_da_chave.get(nova)
        if canonico is None:
            cursor.execute(
                f"SELECT {tabela}_id, count(*) FROM acervo.livro"
                f" WHERE {tabela}_id = ANY(%s) GROUP BY 1",
                (ids,),
            )
            livros = dict(cursor.fetchall())
            canonico = max(ids, key=lambda id_: (livros.get(id_, 0), str(id_)))

        duplicados = [id_ for id_ in ids if id_ != canonico]
        if duplicados:
            for referencia in referencias:
                esquema_tabela, coluna = referencia.rsplit(".", 1)
                cursor.execute(
                    f"UPDATE {esquema_tabela} SET {coluna} = %s WHERE {coluna} = ANY(%s)",
                    (canonico, duplicados),
                )
            cursor.execute(f"DELETE FROM acervo.{tabela} WHERE id = ANY(%s)", (duplicados,))
            unificadas += cursor.rowcount

        for id_, nome_nfc, _ in membros:
            if id_ == canonico:
                cursor.execute(
                    f"UPDATE acervo.{tabela} SET nome = %s, nome_normalizado = %s WHERE id = %s",
                    (nome_nfc, nova, id_),
                )
                renormalizadas += 1

    return {"unificadas": unificadas, "renormalizadas": renormalizadas}


def chaves_sem_biografia(conexao) -> set[str]:
    """Chaves OpenLibrary dos autores que ainda não têm biografia."""
    with conexao.cursor() as cursor:
        cursor.execute(
            """
            SELECT ol_author_key FROM acervo.autor
             WHERE ol_author_key IS NOT NULL AND biografia IS NULL
            """
        )
        return {linha[0] for linha in cursor.fetchall()}


def gravar_biografias(conexao, biografias: list[tuple[str, str]]) -> int:
    """Grava as biografias numa transação e devolve quantos autores mudaram.

    `COPY` para staging e um `UPDATE` só, como a carga. `biografia IS NULL` no
    `UPDATE` faz a reexecução não mudar nada e nunca sobrescreve a biografia que
    a importação por ISBN já gravou. Quem chama faz o commit.
    """
    with conexao.cursor() as cursor:
        cursor.execute(
            "CREATE TEMP TABLE stg_biografia (ol_author_key text, biografia text) ON COMMIT DROP"
        )
        _copiar(cursor, "stg_biografia", ["ol_author_key", "biografia"], biografias)
        cursor.execute(
            """
            UPDATE acervo.autor a
               SET biografia = s.biografia
              FROM stg_biografia s
             WHERE a.ol_author_key = s.ol_author_key AND a.biografia IS NULL
            """
        )
        return cursor.rowcount


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
    # `resolver_autores` já não grava marcador de catálogo; filtrar de novo aqui
    # protege a carga de um `autores.jsonl` gerado antes dessa regra.
    return {
        r["ol_author_key"]: r["nome"]
        for r in _ler_jsonl(caminho)
        if nome_de_autor_utilizavel(r["nome"])
    }


def _ler_autor_por_obra(caminho: Path) -> dict[str, str]:
    return {r["ol_work_key"]: r["ol_author_key"] for r in _ler_jsonl(caminho)}


def _ler_assuntos_por_obra(caminho: Path) -> dict[str, list[str]]:
    return {r["ol_work_key"]: r["assuntos"] for r in _ler_jsonl(caminho)}
