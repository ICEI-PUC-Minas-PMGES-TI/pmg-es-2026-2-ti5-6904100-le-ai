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

ACEITOS_NA_AMOSTRA = 16


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

    assert contagem["assuntos"] == 31
    assert _um(conexao, "SELECT count(*) FROM acervo.assunto")[0] == 31
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
    assert _um(conexao, "SELECT count(*) FROM acervo.assunto")[0] == 31
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


def test_autor_marcador_de_catalogo_cede_ao_autor_da_obra(conexao, capsys, tmp_path):
    """OL30000016M vincula `[author not identified]`; a obra conhece Austin Kleon.

    Mesma regra do importador por ISBN do serviço `acervo`
    (`nomeDeAutorUtilizavel`): nome que é só marcador de catálogo conta como
    ausente, e aí entra o primeiro autor da obra.
    """
    _rodar(capsys, "semear", "--database-url", URL)
    _carga_da_amostra(capsys, tmp_path)

    with conexao.cursor() as cursor:
        cursor.execute(
            """SELECT a.ol_author_key
                 FROM acervo.livro l
                 JOIN acervo.livro_autor la ON la.livro_id = l.id
                 JOIN acervo.autor a ON a.id = la.autor_id
                WHERE l.ol_edition_key = 'OL30000016M'"""
        )
        assert cursor.fetchall() == [("OL10000018A",)]
    # O marcador não vira autor de ninguém.
    assert _um(
        conexao, "SELECT count(*) FROM acervo.autor WHERE nome = '[author not identified]'"
    )[0] == 0
    assert _um(
        conexao,
        """SELECT autor_exibicao FROM acervo.v_livro_referencia_v1 v
             JOIN acervo.livro l ON l.id = v.livro_id
            WHERE l.ol_edition_key = 'OL30000016M'""",
    )[0] == "Austin Kleon"


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


def _biografias(conexao) -> dict[str, str | None]:
    with conexao.cursor() as cursor:
        cursor.execute(
            "SELECT ol_author_key, biografia FROM acervo.autor WHERE ol_author_key IS NOT NULL"
        )
        return dict(cursor.fetchall())


def test_biografias_preenche_so_quem_nao_tem_e_reexecutar_nao_muda_nada(conexao, capsys, tmp_path):
    """F-ACV-DESCOBERTA (RF-ACV-10): o subcomando que o grupo roda depois da carga."""
    _rodar(capsys, "semear", "--database-url", URL)
    _carga_da_amostra(capsys, tmp_path)
    conexao.commit()
    # A importação por ISBN já gravou a deste autor: o script não a sobrescreve.
    with conexao.cursor() as cursor:
        cursor.execute(
            "UPDATE acervo.autor SET biografia = 'Gravada pela importação.' "
            "WHERE ol_author_key = 'OL10000003A'"
        )
    conexao.commit()
    dump = str(AMOSTRA / "autores_amostra.jsonl")

    simulacao = _rodar(
        capsys, "biografias", "--database-url", URL, "--dump-autores", dump, "--dry-run"
    )
    assert simulacao["simulacao"] is True
    assert simulacao["atualizados"] == 0
    assert _biografias(conexao)["OL10000001A"] is None

    resumo = _rodar(capsys, "biografias", "--database-url", URL, "--dump-autores", dump)

    assert resumo["atualizados"] == 1
    assert resumo["com_biografia_no_dump"] == 1
    biografias = _biografias(conexao)
    assert biografias["OL10000001A"] == "Escritor e geógrafo baiano, autor de *Torto arado* ."
    assert biografias["OL10000003A"] == "Gravada pela importação."
    # Quem a fonte não tem continua sem: a seção não aparece na página.
    assert biografias["OL10000002A"] is None

    de_novo = _rodar(capsys, "biografias", "--database-url", URL, "--dump-autores", dump)
    assert de_novo["atualizados"] == 0


def _executar(conexao, consulta: str, *parametros):
    with conexao.cursor() as cursor:
        cursor.execute(consulta, parametros)
    conexao.commit()


def _autores_do_livro(conexao, livro_id) -> list[str]:
    with conexao.cursor() as cursor:
        cursor.execute(
            """SELECT a.ol_author_key FROM acervo.livro_autor la
                 JOIN acervo.autor a ON a.id = la.autor_id
                WHERE la.livro_id = %s ORDER BY 1""",
            (livro_id,),
        )
        return [linha[0] for linha in cursor.fetchall()]


def _livro_de(conexao, ol_author_key: str):
    return _um(
        conexao,
        """SELECT la.livro_id FROM acervo.livro_autor la
             JOIN acervo.autor a ON a.id = la.autor_id
            WHERE a.ol_author_key = %s ORDER BY la.livro_id LIMIT 1""",
        ol_author_key,
    )[0]


def test_unificar_junta_o_duplicado_no_canonico_e_a_carga_nao_o_recria(conexao, capsys, tmp_path):
    """A fonte cadastra a mesma pessoa com outra chave e, às vezes, com a biografia
    de um homônimo (Suzanne Collins nas edições portuguesas de Jogos Vorazes)."""
    _rodar(capsys, "semear", "--database-url", URL)
    _carga_da_amostra(capsys, tmp_path)
    conexao.commit()
    com_os_dois = _livro_de(conexao, "OL10000003A")
    so_do_duplicado = _livro_de(conexao, "OL10000001A")
    _executar(conexao, "UPDATE acervo.autor SET biografia = 'Escritor carioca.' WHERE ol_author_key = 'OL10000003A'")
    _executar(
        conexao,
        """INSERT INTO acervo.autor (nome, nome_normalizado, ol_author_key, biografia)
           VALUES ('Machado de Assis', 'machado de assis', 'OL99999991A', 'Homônimo.')""",
    )
    _executar(
        conexao,
        """INSERT INTO acervo.livro_autor (livro_id, autor_id)
           SELECT l, a.id FROM unnest(%s::uuid[]) l, acervo.autor a WHERE a.ol_author_key = 'OL99999991A'""",
        [com_os_dois, so_do_duplicado],
    )
    dados = tmp_path / "dados"
    dados.mkdir()
    (dados / "autores_unificados.csv").write_text(
        "ol_author_key,ol_author_key_canonica,nome,evidencia\n"
        "OL99999991A,OL10000003A,Machado de Assis,mesmo nome\n",
        encoding="utf-8",
    )
    unificar = ("--dados", str(dados), "unificar", "--database-url", URL)

    simulacao = _rodar(capsys, *unificar, "--dry-run")
    assert simulacao["autores"]["duplicados_removidos"] == 1
    assert _um(conexao, "SELECT count(*) FROM acervo.autor WHERE ol_author_key = 'OL99999991A'")[0] == 1

    resumo = _rodar(capsys, *unificar)

    assert resumo["autores"]["duplicados_removidos"] == 1
    assert resumo["autores"]["vinculos_movidos"] == 1
    assert resumo["autores"]["chaves_registradas"] == 1
    assert _autores_do_livro(conexao, com_os_dois) == ["OL10000003A"]
    assert _autores_do_livro(conexao, so_do_duplicado) == ["OL10000001A", "OL10000003A"]
    assert _um(conexao, "SELECT count(*) FROM acervo.autor WHERE ol_author_key = 'OL99999991A'")[0] == 0
    # A biografia do homônimo vai embora com ele; a do canônico fica.
    assert _biografias(conexao)["OL10000003A"] == "Escritor carioca."

    de_novo = _rodar(capsys, *unificar)
    assert de_novo["autores"]["duplicados_removidos"] == 0
    assert de_novo["autores"]["chaves_registradas"] == 0

    # Uma recarga que ainda traga a chave duplicada liga o livro ao canônico.
    recarga = tmp_path / "recarga"
    recarga.mkdir()
    _rodar(
        capsys, "filtrar",
        "--dump", str(AMOSTRA / "edicoes_amostra.jsonl"),
        "--saida", str(recarga / "todos.jsonl"),
        "--saida-chaves", str(recarga / "chaves.json"),
    )
    candidato = json.loads((recarga / "todos.jsonl").read_text(encoding="utf-8").splitlines()[0])
    candidato["autores_ol"] = ["OL99999991A"]
    (recarga / "candidatos.jsonl").write_text(json.dumps(candidato) + "\n", encoding="utf-8")
    (recarga / "autores.jsonl").write_text(
        json.dumps({"ol_author_key": "OL99999991A", "nome": "Machado de Assis"}) + "\n",
        encoding="utf-8",
    )
    for nome in ("assuntos.jsonl", "autor_obra.jsonl"):
        (recarga / nome).write_text("", encoding="utf-8")
    _rodar(
        capsys, "carregar", "--database-url", URL,
        "--candidatos", str(recarga / "candidatos.jsonl"),
        "--autores", str(recarga / "autores.jsonl"),
        "--assuntos", str(recarga / "assuntos.jsonl"),
        "--autor-obra", str(recarga / "autor_obra.jsonl"),
        "--tipo", "recarga",
    )
    assert _um(conexao, "SELECT count(*) FROM acervo.autor WHERE ol_author_key = 'OL99999991A'")[0] == 0
    livro = _um(conexao, "SELECT id FROM acervo.livro WHERE isbn13 = %s", candidato["isbn13"])[0]
    assert "OL10000003A" in _autores_do_livro(conexao, livro)


def test_unificar_corrige_nome_decomposto_e_junta_editora_e_serie(conexao, capsys, tmp_path):
    """A fonte manda nomes em NFD, e a normalização antiga quebrava a chave
    ("joa o"). Editora e série com a chave quebrada viravam uma segunda entidade."""
    import unicodedata

    nfd = lambda texto: unicodedata.normalize("NFD", texto)  # noqa: E731
    _rodar(capsys, "semear", "--database-url", URL)
    _carga_da_amostra(capsys, tmp_path)
    conexao.commit()
    livro = _livro_de(conexao, "OL10000001A")
    outro = _livro_de(conexao, "OL10000002A")

    _executar(
        conexao,
        """INSERT INTO acervo.editora (nome, nome_normalizado) VALUES
             ('Arquipélago Imaginário', 'arquipélago imaginário'),
             (%s, 'arquipe lago imagina rio')""",
        nfd("Arquipélago Imaginário"),
    )
    _executar(
        conexao,
        """UPDATE acervo.livro SET editora_id =
             (SELECT id FROM acervo.editora WHERE nome_normalizado = 'arquipe lago imagina rio')
            WHERE id = %s""",
        livro,
    )
    _executar(
        conexao,
        """INSERT INTO acervo.sinonimo_editora (forma_externa, editora_id)
           SELECT 'arquipelago imaginario', id FROM acervo.editora WHERE nome_normalizado = 'arquipe lago imagina rio'""",
    )
    _executar(
        conexao,
        "INSERT INTO acervo.serie (nome, nome_normalizado) VALUES (%s, 'colec a o filosofia')",
        nfd("Coleção Filosofia"),
    )
    _executar(
        conexao,
        """UPDATE acervo.livro SET serie_id =
             (SELECT id FROM acervo.serie WHERE nome_normalizado = 'colec a o filosofia')
            WHERE id = %s""",
        outro,
    )
    _executar(
        conexao,
        "UPDATE acervo.autor SET nome = %s, nome_normalizado = 'alui sio azevedo' WHERE ol_author_key = 'OL10000004A'",
        nfd("Aluísio Azevedo"),
    )
    dados = tmp_path / "dados"
    dados.mkdir()
    (dados / "autores_unificados.csv").write_text(
        "ol_author_key,ol_author_key_canonica,nome,evidencia\n", encoding="utf-8"
    )

    resumo = _rodar(capsys, "--dados", str(dados), "unificar", "--database-url", URL)

    assert resumo["editoras"] == {"unificadas": 1, "renormalizadas": 0}
    assert resumo["series"] == {"unificadas": 0, "renormalizadas": 1}
    assert resumo["autores"]["renormalizados"] == 1
    assert _um(
        conexao,
        """SELECT e.nome_normalizado FROM acervo.livro l JOIN acervo.editora e ON e.id = l.editora_id
            WHERE l.id = %s""",
        livro,
    )[0] == "arquipélago imaginário"
    assert _um(
        conexao,
        """SELECT e.nome_normalizado FROM acervo.sinonimo_editora s
             JOIN acervo.editora e ON e.id = s.editora_id WHERE s.forma_externa = 'arquipelago imaginario'""",
    )[0] == "arquipélago imaginário"
    assert _um(
        conexao,
        "SELECT s.nome, s.nome_normalizado FROM acervo.livro l JOIN acervo.serie s ON s.id = l.serie_id WHERE l.id = %s",
        outro,
    ) == ("Coleção Filosofia", "coleção filosofia")
    assert _um(
        conexao, "SELECT nome, nome_normalizado FROM acervo.autor WHERE ol_author_key = 'OL10000004A'"
    ) == ("Aluísio Azevedo", "aluisio azevedo")

    de_novo = _rodar(capsys, "--dados", str(dados), "unificar", "--database-url", URL)
    assert de_novo["editoras"] == de_novo["series"] == {"unificadas": 0, "renormalizadas": 0}
    assert de_novo["autores"]["renormalizados"] == 0
