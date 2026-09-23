"""Carga da amostra contra Postgres real (DoD de F-ACV-INGESTAO).

Os outros testes provam filtragem, normalização e mapeamento sem banco. Este
arquivo prova o que só o Postgres prova, e **sem o dump**: a amostra versionada
passa pelo mesmo roteiro do README (`semear` → `filtrar` → `resolver` →
`carregar`), grava `ingestao_execucao` com totais coerentes, carrega tudo em uma
transação, e reexecutar não duplica nada.

Pulado quando `DATABASE_URL_TESTE` não está definida. **Nunca aponte para o
Neon**: o fixture derruba e recria o schema `acervo`.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

import pytest

from leai_ingestao import cli

pytestmark = pytest.mark.banco

RAIZ = Path(__file__).resolve().parent.parent
AMOSTRA = RAIZ / "amostra"
MIGRATIONS = RAIZ.parent.parent / "back" / "acervo" / "drizzle"

URL = os.environ.get("DATABASE_URL_TESTE")

ACEITOS_NA_AMOSTRA = 15


@pytest.fixture
def conexao():
    if not URL:
        pytest.skip("DATABASE_URL_TESTE não definida")
    if re.search(r"neon\.tech|\.render\.com", URL):
        pytest.fail("DATABASE_URL_TESTE aponta para banco gerenciado; recusado")
    psycopg = pytest.importorskip("psycopg")

    with psycopg.connect(URL, autocommit=True) as admin:
        admin.execute("DROP SCHEMA IF EXISTS acervo CASCADE")
        admin.execute("CREATE SCHEMA acervo")
        # As migrations reais de `acervo`, na ordem do drizzle-kit. É o mesmo
        # schema que a carga encontra no Neon.
        for arquivo in sorted(MIGRATIONS.glob("*.sql")):
            for comando in arquivo.read_text(encoding="utf-8").split("--> statement-breakpoint"):
                if comando.strip():
                    admin.execute(comando)

    with psycopg.connect(URL) as conexao:
        yield conexao


def _rodar(capsys, *argv) -> dict:
    assert cli.main(list(argv)) == 0
    return json.loads(capsys.readouterr().out.split("\n\n")[0])


def _carga_da_amostra(capsys, trabalho: Path) -> dict:
    """O roteiro do README, na ordem que importa."""
    resumo = _rodar(
        capsys, "filtrar",
        "--dump", str(AMOSTRA / "edicoes_amostra.jsonl"),
        "--saida", str(trabalho / "candidatos.jsonl"),
        "--saida-chaves", str(trabalho / "chaves.json"),
    )
    _rodar(
        capsys, "resolver",
        "--chaves", str(trabalho / "chaves.json"),
        "--dump-autores", str(AMOSTRA / "autores_amostra.jsonl"),
        "--dump-obras", str(AMOSTRA / "obras_amostra.jsonl"),
        "--saida-autores", str(trabalho / "autores.jsonl"),
        "--saida-assuntos", str(trabalho / "assuntos.jsonl"),
        "--saida-autor-obra", str(trabalho / "autor_obra.jsonl"),
    )
    totais = _rodar(
        capsys, "carregar",
        "--database-url", URL,
        "--candidatos", str(trabalho / "candidatos.jsonl"),
        "--autores", str(trabalho / "autores.jsonl"),
        "--assuntos", str(trabalho / "assuntos.jsonl"),
        "--autor-obra", str(trabalho / "autor_obra.jsonl"),
        "--processados", str(resumo["lidos"]),
        "--descartados", str(resumo["descartados"]),
    )
    return {"resumo": resumo, "totais": totais}


def _um(conexao, consulta: str, *parametros):
    with conexao.cursor() as cursor:
        cursor.execute(consulta, parametros)
        return cursor.fetchone()


def test_semear_popula_o_conjunto_curado(conexao, capsys):
    contagem = _rodar(capsys, "semear", "--database-url", URL)

    assert contagem["assuntos"] == 30
    assert _um(conexao, "SELECT count(*) FROM acervo.assunto")[0] == 30
    assert _um(conexao, "SELECT count(*) FROM acervo.sinonimo_editora")[0] == contagem["sinonimos"]
    assert _um(conexao, "SELECT count(*) FROM acervo.mapa_assunto_externo")[0] == contagem["mapeamentos"]


def test_carga_da_amostra_registra_execucao_com_totais_coerentes(conexao, capsys, tmp_path):
    _rodar(capsys, "semear", "--database-url", URL)

    carga = _carga_da_amostra(capsys, tmp_path)

    resumo, totais = carga["resumo"], carga["totais"]
    assert totais["livros"] == resumo["aceitos"] == ACEITOS_NA_AMOSTRA
    status, tipo, processados, descartados, inseridos, finalizado = _um(
        conexao,
        """SELECT status, tipo, total_processados, total_descartados, total_inseridos,
                  finalizado_em IS NOT NULL
             FROM acervo.ingestao_execucao WHERE id = %s""",
        totais["execucao"],
    )
    assert (status, tipo) == ("concluida", "carga_inicial")
    assert (processados, descartados, inseridos) == (
        resumo["lidos"], resumo["descartados"], ACEITOS_NA_AMOSTRA
    )
    assert finalizado


def test_livros_carregados_respeitam_rn12_e_rn21(conexao, capsys, tmp_path):
    _rodar(capsys, "semear", "--database-url", URL)
    _carga_da_amostra(capsys, tmp_path)

    # Todo livro oficial tem capa externa e nenhum traz sinopse (RN-12, RN-19.1).
    assert _um(
        conexao,
        """SELECT count(*) FROM acervo.livro
            WHERE tipo = 'oficial'
              AND (capa_url_externa IS NULL OR sinopse IS NOT NULL
                   OR sinopse_status <> 'nao_consultada')""",
    )[0] == 0
    # Tag sem correspondência não cria assunto (RN-21.3/4) e o teto é 5 (RN-21.2).
    assert _um(conexao, "SELECT count(*) FROM acervo.assunto")[0] == 30
    assert _um(
        conexao,
        """SELECT coalesce(max(n), 0) FROM (
             SELECT count(*) AS n FROM acervo.livro_assunto GROUP BY livro_id) t""",
    )[0] <= 5
    assert _um(conexao, "SELECT count(*) FROM acervo.livro_assunto")[0] > 0
    # O contrato entre schemas enxerga os livros carregados, com autor.
    assert _um(
        conexao,
        """SELECT count(*) FROM acervo.v_livro_referencia_v1
            WHERE tipo = 'oficial' AND ativo AND autor_exibicao IS NOT NULL""",
    )[0] > 0


def test_edicao_sem_authors_herda_so_o_primeiro_autor_da_obra(conexao, capsys, tmp_path):
    """OL30000015M não tem `authors`; a obra lista o autor e depois a tradutora.

    Mesmo critério do importador por ISBN do serviço `acervo`: da obra vem só
    o primeiro, e o livro entra no contrato entre schemas com autor.
    """
    _rodar(capsys, "semear", "--database-url", URL)
    _carga_da_amostra(capsys, tmp_path)

    with conexao.cursor() as cursor:
        cursor.execute(
            """SELECT a.ol_author_key
                 FROM acervo.livro l
                 JOIN acervo.livro_autor la ON la.livro_id = l.id
                 JOIN acervo.autor a ON a.id = la.autor_id
                WHERE l.ol_edition_key = 'OL30000015M'"""
        )
        assert cursor.fetchall() == [("OL10000015A",)]
    # A tradutora nem vira autor: não é vinculada a livro nenhum.
    assert _um(conexao, "SELECT count(*) FROM acervo.autor WHERE ol_author_key = 'OL10000016A'")[0] == 0
    assert _um(
        conexao,
        """SELECT autor_exibicao FROM acervo.v_livro_referencia_v1 v
             JOIN acervo.livro l ON l.id = v.livro_id
            WHERE l.ol_edition_key = 'OL30000015M'""",
    )[0] == "George Orwell"


def test_reexecutar_a_mesma_amostra_nao_duplica_nada(conexao, capsys, tmp_path):
    _rodar(capsys, "semear", "--database-url", URL)
    _carga_da_amostra(capsys, tmp_path)
    contar = """SELECT (SELECT count(*) FROM acervo.livro),
                       (SELECT count(*) FROM acervo.autor),
                       (SELECT count(*) FROM acervo.editora),
                       (SELECT count(*) FROM acervo.serie),
                       (SELECT count(*) FROM acervo.assunto),
                       (SELECT count(*) FROM acervo.livro_autor),
                       (SELECT count(*) FROM acervo.livro_assunto)"""
    antes = _um(conexao, contar)

    _rodar(capsys, "semear", "--database-url", URL)
    segunda = _carga_da_amostra(capsys, tmp_path / "de-novo")

    assert _um(conexao, contar) == antes
    assert segunda["totais"]["livros"] == 0
    assert _um(conexao, "SELECT count(*) FROM acervo.ingestao_execucao WHERE status = 'concluida'")[0] == 2


def test_falha_no_meio_nao_deixa_carga_parcial(conexao, capsys, tmp_path):
    _rodar(capsys, "semear", "--database-url", URL)
    editoras_antes = _um(conexao, "SELECT count(*) FROM acervo.editora")[0]
    resumo = _rodar(
        capsys, "filtrar",
        "--dump", str(AMOSTRA / "edicoes_amostra.jsonl"),
        "--saida", str(tmp_path / "candidatos.jsonl"),
        "--saida-chaves", str(tmp_path / "chaves.json"),
    )
    # Um candidato corrompido depois da fase 1 viola `livro_paginas_positivas_ck`
    # no INSERT de livro, que roda DEPOIS dos de editora e série.
    linhas = (tmp_path / "candidatos.jsonl").read_text(encoding="utf-8").splitlines()
    ultimo = json.loads(linhas[-1])
    ultimo["paginas"] = 0
    linhas[-1] = json.dumps(ultimo, ensure_ascii=False)
    (tmp_path / "candidatos.jsonl").write_text("\n".join(linhas) + "\n", encoding="utf-8")
    for nome in ("autores.jsonl", "assuntos.jsonl", "autor_obra.jsonl"):
        (tmp_path / nome).write_text("", encoding="utf-8")

    with pytest.raises(Exception, match="livro_paginas_positivas_ck"):
        cli.main([
            "carregar", "--database-url", URL,
            "--candidatos", str(tmp_path / "candidatos.jsonl"),
            "--autores", str(tmp_path / "autores.jsonl"),
            "--assuntos", str(tmp_path / "assuntos.jsonl"),
            "--autor-obra", str(tmp_path / "autor_obra.jsonl"),
            "--processados", str(resumo["lidos"]),
            "--descartados", str(resumo["descartados"]),
        ])

    # Nada entrou — nem as editoras, que foram gravadas antes do erro.
    assert _um(conexao, "SELECT count(*) FROM acervo.livro")[0] == 0
    assert _um(conexao, "SELECT count(*) FROM acervo.editora")[0] == editoras_antes
    # E a falha ficou registrada, em vez de sumir do histórico.
    status, inseridos = _um(
        conexao, "SELECT status, total_inseridos FROM acervo.ingestao_execucao"
    )
    assert (status, inseridos) == ("falha", 0)
