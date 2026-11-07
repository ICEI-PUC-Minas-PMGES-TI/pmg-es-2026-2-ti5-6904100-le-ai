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
from decimal import Decimal
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


def _carga_da_amostra(
    capsys, trabalho: Path, amostra: Path = AMOSTRA, tipo: str = "carga_inicial", ajustar=None
) -> dict:
    """O roteiro do README, na ordem que importa.

    `ajustar(trabalho)` roda entre `resolver` e `carregar`, para simular no
    arquivo intermediário o que a amostra sozinha não produz.
    """
    resumo = _rodar(
        capsys, "filtrar",
        "--dump", str(amostra / "edicoes_amostra.jsonl"),
        "--saida", str(trabalho / "candidatos.jsonl"),
        "--saida-chaves", str(trabalho / "chaves.json"),
    )
    _rodar(
        capsys, "resolver",
        "--chaves", str(trabalho / "chaves.json"),
        "--dump-autores", str(amostra / "autores_amostra.jsonl"),
        "--dump-obras", str(amostra / "obras_amostra.jsonl"),
        "--saida-autores", str(trabalho / "autores.jsonl"),
        "--saida-assuntos", str(trabalho / "assuntos.jsonl"),
        "--saida-autor-obra", str(trabalho / "autor_obra.jsonl"),
    )
    if ajustar:
        ajustar(trabalho)
    totais = _rodar(
        capsys, "carregar",
        "--database-url", URL,
        "--candidatos", str(trabalho / "candidatos.jsonl"),
        "--autores", str(trabalho / "autores.jsonl"),
        "--assuntos", str(trabalho / "assuntos.jsonl"),
        "--autor-obra", str(trabalho / "autor_obra.jsonl"),
        "--processados", str(resumo["lidos"]),
        "--descartados", str(resumo["descartados"]),
        "--tipo", tipo,
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


def _notas_gerais(conexao) -> dict:
    with conexao.cursor() as cursor:
        cursor.execute(
            """SELECT isbn13, ol_work_key, nota_geral, nota_geral_qtd, atualizado_em
                 FROM acervo.livro WHERE tipo = 'oficial'"""
        )
        return {linha[0]: linha[1:] for linha in cursor.fetchall()}


def test_notas_replica_por_obra_limpa_na_recarga_e_nao_toca_atualizado_em(conexao, capsys, tmp_path):
    """F-ACV-NOTA (RF-ACV-15): o subcomando `notas` depois da carga."""
    _rodar(capsys, "semear", "--database-url", URL)
    _carga_da_amostra(capsys, tmp_path)
    conexao.commit()
    # Uma obra com duas edições (a segunda entra com outro ISBN) e outra obra.
    obra, isbn_da_obra = _um(
        conexao,
        "SELECT ol_work_key, isbn13 FROM acervo.livro WHERE ol_work_key IS NOT NULL ORDER BY isbn13 LIMIT 1",
    )
    outra, = _um(
        conexao,
        "SELECT ol_work_key FROM acervo.livro WHERE ol_work_key IS NOT NULL AND ol_work_key <> %s "
        "ORDER BY isbn13 LIMIT 1",
        obra,
    )
    edicoes_da_outra, = _um(conexao, "SELECT count(*) FROM acervo.livro WHERE ol_work_key = %s", outra)
    edicoes_da_obra = 1 + _um(conexao, "SELECT count(*) FROM acervo.livro WHERE ol_work_key = %s", obra)[0]
    _executar(
        conexao,
        """INSERT INTO acervo.livro (isbn13, titulo, paginas, capa_url_externa, tipo, ol_work_key)
           VALUES ('9780000000002', 'Segunda edição', 100, 'https://covers.openlibrary.org/b/id/2-L.jpg',
                   'oficial', %s)""",
        obra,
    )
    # Livro importado pelo Google Books, sem obra: o script não o vê.
    _executar(
        conexao,
        """INSERT INTO acervo.livro (isbn13, titulo, paginas, capa_url_externa, tipo,
                                     nota_geral, nota_geral_qtd)
           VALUES ('9780000000019', 'Do Google', 100, 'https://books.google.com/x', 'oficial', 3.5, 8)""",
    )
    antes = _notas_gerais(conexao)
    dump = tmp_path / "ratings.txt"
    dump.write_text(
        f"/works/{obra}\t\\N\t5\t2020-01-01\n"
        f"/works/{obra}\t\\N\t4\t2020-01-01\n"
        f"/works/{obra}\t\\N\t4\t2020-01-01\n"
        f"/works/{obra}\t\\N\t4\t2020-01-01\n"
        f"/works/{outra}\t\\N\t2\t2020-01-01\n"
        "/works/OL1W\t\\N\t9\t2020-01-01\n",
        encoding="utf-8",
    )

    simulacao = _rodar(capsys, "notas", "--database-url", URL, "--arquivo", str(dump), "--dry-run")
    assert simulacao["simulacao"] is True
    assert simulacao["linhas_lidas"] == 6
    assert simulacao["linhas_descartadas"] == 1
    assert simulacao["edicoes_atualizadas"] == edicoes_da_obra + edicoes_da_outra
    assert _notas_gerais(conexao) == antes

    resumo = _rodar(capsys, "notas", "--database-url", URL, "--arquivo", str(dump))
    assert resumo["obras_do_acervo_com_nota"] == 2
    assert resumo["edicoes_atualizadas"] == edicoes_da_obra + edicoes_da_outra
    assert resumo["edicoes_limpas"] == 0
    depois = _notas_gerais(conexao)
    # (5 + 4 + 4 + 4) / 4 = 4,25: meia para cima, 4,3, nas duas edições da obra.
    assert depois[isbn_da_obra][1:3] == (Decimal("4.3"), 4)
    assert depois["9780000000002"][1:3] == (Decimal("4.3"), 4)
    assert depois["9780000000019"][1:3] == (Decimal("3.5"), 8)
    # O relógio da sinopse não anda.
    assert all(depois[isbn][3] == antes[isbn][3] for isbn in antes)

    de_novo = _rodar(capsys, "notas", "--database-url", URL, "--arquivo", str(dump))
    assert de_novo["edicoes_atualizadas"] == 0

    # Recarga com um dump em que a obra saiu: as duas edições perdem a nota.
    dump.write_text(f"/works/{outra}\t\\N\t2\t2020-01-01\n", encoding="utf-8")
    recarga = _rodar(capsys, "notas", "--database-url", URL, "--arquivo", str(dump))
    assert recarga["edicoes_limpas"] == edicoes_da_obra
    final = _notas_gerais(conexao)
    assert final[isbn_da_obra][1:3] == (None, None)
    assert final["9780000000002"][1:3] == (None, None)
    assert final["9780000000019"][1:3] == (Decimal("3.5"), 8)


# --- Recarga (RF-ACV-14, F-ACV-OPC) ------------------------------------------
#
# A amostra modificada simula o dump de uma recarga: o mesmo acervo, com o que a
# fonte mudou desde a carga inicial. Cada livro abaixo exercita um caso das
# decisões 3 e 5 do dono, de 06/11/2026.

TORTO = "9788588808911"     # título, capa, ano, editora e páginas novos; assunto mapeado trocado
QUARTO = "9788535901481"    # título novo, sem editora e sem ano no dump; só slug desconhecido (`_so_slug_desconhecido`)
CORTICO = "9788535902778"   # obra sem tag mapeada
BRAS = "9788556521040"      # um autor a mais
DUNA = "9788585045272"      # título novo e a mesma série, agora sem número
MESTRE = "9788556520777"    # série nova com número
AIA = "9788535909227"       # série nova sem número
PRINCIPE = "9788525007476"  # perdeu a capa: sai dos filtros
SAPIENS = "9788556520494"   # usado como o livro "do Google" no teste de preservação
NOVO = "9788535901702"      # edição que só existe na recarga

ATUALIZADOS_NA_MODIFICADA = 5  # TORTO, QUARTO, DUNA, MESTRE e AIA; os outros mudam só vínculo, ou nada

CONTAR = """SELECT (SELECT count(*) FROM acervo.livro),
                   (SELECT count(*) FROM acervo.autor),
                   (SELECT count(*) FROM acervo.editora),
                   (SELECT count(*) FROM acervo.serie),
                   (SELECT count(*) FROM acervo.assunto),
                   (SELECT count(*) FROM acervo.livro_autor),
                   (SELECT count(*) FROM acervo.livro_assunto)"""


def _ler_linhas(caminho: Path) -> list[dict]:
    return [json.loads(linha) for linha in caminho.read_text(encoding="utf-8").splitlines() if linha.strip()]


def _gravar_linhas(caminho: Path, registros: list[dict]) -> None:
    caminho.write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in registros), encoding="utf-8"
    )


def _amostra_modificada(destino: Path) -> Path:
    """A amostra reproduzível com as mudanças de uma recarga, montada em `tmp_path`."""
    destino.mkdir()
    edicoes = _ler_linhas(AMOSTRA / "edicoes_amostra.jsonl")
    edicao = {e["key"].rsplit("/", 1)[-1]: e for e in edicoes}
    edicao["OL30000001M"].update(
        title="Torto Arado (edição revista)",
        covers=[99990001],
        publishers=["Editora Nova Recarga"],
        publish_date="2021",
        number_of_pages=999,
    )
    # Título novo junto: a linha é atualizada, e editora e ano têm de sobreviver ao SET.
    del edicao["OL30000002M"]["publishers"], edicao["OL30000002M"]["publish_date"]
    edicao["OL30000002M"]["title"] = "Quarto de Despejo: diário de uma favelada"
    edicao["OL30000003M"]["authors"].append({"key": "/authors/OL10000099A"})
    # Título novo junto: a linha é atualizada, e o número tem de sobreviver ao SET.
    edicao["OL30000009M"].update(title="Duna (nova tradução)", series=["Crônicas de Duna"])
    edicao["OL30000010M"]["series"] = ["Coleção Recarga, #3"]
    edicao["OL30000012M"]["series"] = ["Série Nova Sem Número"]
    edicao["OL30000014M"]["covers"] = []
    edicoes.append({
        "type": {"key": "/type/edition"}, "key": "/books/OL30000017M",
        "title": "Livro novo da recarga", "languages": [{"key": "/languages/por"}],
        "isbn_13": [NOVO], "number_of_pages": 150, "covers": [99990017],
        "publishers": ["Record"], "publish_date": "2026",
        "works": [{"key": "/works/OL20000013W"}], "authors": [{"key": "/authors/OL10000012A"}],
    })
    _gravar_linhas(destino / "edicoes_amostra.jsonl", edicoes)

    obras = _ler_linhas(AMOSTRA / "obras_amostra.jsonl")
    obra = {o["key"].rsplit("/", 1)[-1]: o for o in obras}
    obra["OL20000001W"]["subjects"] = ["Science fiction"]
    obra["OL20000004W"]["subjects"] = ["Nonsense tag"]
    _gravar_linhas(destino / "obras_amostra.jsonl", obras)

    autores = _ler_linhas(AMOSTRA / "autores_amostra.jsonl")
    autores.append(
        {"type": {"key": "/type/author"}, "key": "/authors/OL10000099A", "name": "Autora Nova da Recarga"}
    )
    _gravar_linhas(destino / "autores_amostra.jsonl", autores)
    return destino


def _so_slug_desconhecido(trabalho: Path) -> None:
    """O conjunto curado só produz slug que existe; aqui a obra de QUARTO passa a
    mapear só um slug fora de `acervo.assunto`, que não pode contar."""
    caminho = trabalho / "assuntos.jsonl"
    registros = _ler_linhas(caminho)
    alvo = [r for r in registros if r["ol_work_key"] == "OL20000002W"]
    assert alvo, "a obra de QUARTO deveria ter assunto mapeado na amostra"
    alvo[0]["assuntos"] = ["slug-que-nao-existe"]
    _gravar_linhas(caminho, registros)


def _recarga(capsys, trabalho: Path, amostra: Path) -> dict:
    return _carga_da_amostra(capsys, trabalho, amostra, "recarga", _so_slug_desconhecido)


def _linha(conexao, consulta: str, *parametros) -> dict:
    with conexao.cursor() as cursor:
        cursor.execute(consulta, parametros)
        valores = cursor.fetchone()
        return dict(zip([coluna.name for coluna in cursor.description], valores))


def _livro(conexao, isbn13: str) -> dict:
    return _linha(conexao, "SELECT * FROM acervo.livro WHERE isbn13 = %s", isbn13)


def _assuntos(conexao, livro_id) -> list[str]:
    with conexao.cursor() as cursor:
        cursor.execute(
            """SELECT a.slug FROM acervo.livro_assunto la JOIN acervo.assunto a ON a.id = la.assunto_id
                WHERE la.livro_id = %s ORDER BY 1""",
            (livro_id,),
        )
        return [linha[0] for linha in cursor.fetchall()]


def _todas(conexao, consulta: str) -> list[tuple]:
    with conexao.cursor() as cursor:
        cursor.execute(consulta)
        return cursor.fetchall()


def test_recarga_atualiza_uma_vez_e_a_segunda_nao_muda_nada(conexao, capsys, tmp_path):
    _rodar(capsys, "semear", "--database-url", URL)
    inicial = _carga_da_amostra(capsys, tmp_path / "inicial")
    amostra = _amostra_modificada(tmp_path / "amostra")

    primeira = _recarga(capsys, tmp_path / "recarga-1", amostra)

    totais = primeira["totais"]
    assert totais["livros"] == 1  # só NOVO
    assert totais["livros_atualizados"] == ATUALIZADOS_NA_MODIFICADA
    assert totais["vinculos_assunto_removidos"] > 0
    antes = _um(conexao, CONTAR)

    segunda = _recarga(capsys, tmp_path / "recarga-2", amostra)

    totais = segunda["totais"]
    assert (totais["livros"], totais["livros_atualizados"], totais["vinculos_assunto_removidos"]) == (0, 0, 0)
    assert totais["vinculos_assunto"] == totais["vinculos_autor"] == 0
    assert _um(conexao, CONTAR) == antes
    # `inseridos` continua contando só livro novo.
    lidos_inicial, lidos_recarga = inicial["resumo"]["lidos"], primeira["resumo"]["lidos"]
    assert _todas(
        conexao,
        """SELECT tipo, status, total_processados, total_inseridos
             FROM acervo.ingestao_execucao ORDER BY iniciado_em""",
    ) == [
        ("carga_inicial", "concluida", lidos_inicial, ACEITOS_NA_AMOSTRA),
        ("recarga", "concluida", lidos_recarga, 1),
        ("recarga", "concluida", lidos_recarga, 0),
    ]


def test_recarga_preserva_o_que_nao_vem_do_dump(conexao, capsys, tmp_path):
    """Decisões 3, 6 e 9: capa própria, sinopse, `atualizado_em`, notas, livro
    pessoal, livro importado fora do dump e a chave vazia do livro do Google
    ficam como estão, depois da recarga e depois do `notas` que vem em seguida."""
    _rodar(capsys, "semear", "--database-url", URL)
    # Importado pelo Google Books antes da carga: sem obra, com a nota do Google,
    # e com um ISBN que a amostra também traz.
    _executar(
        conexao,
        """INSERT INTO acervo.livro (isbn13, titulo, paginas, capa_url_externa, tipo,
                                     nota_geral, nota_geral_qtd)
           VALUES (%s, 'Sapiens (Google Books)', 443, 'https://books.google.com/sapiens',
                   'oficial', 3.5, 8)""",
        SAPIENS,
    )
    _carga_da_amostra(capsys, tmp_path / "inicial")
    ratings = tmp_path / "ratings.txt"
    ratings.write_text(
        "/works/OL20000001W\t\\N\t4\t2020-01-01\n"
        "/works/OL20000001W\t\\N\t5\t2020-01-01\n"
        "/works/OL20000013W\t\\N\t1\t2020-01-01\n",
        encoding="utf-8",
    )
    _rodar(capsys, "notas", "--database-url", URL, "--arquivo", str(ratings))
    conexao.commit()

    torto = _livro(conexao, TORTO)["id"]
    _executar(
        conexao,
        """UPDATE acervo.livro
              SET capa_url_propria = 'https://r2.example/capas/torto.jpg', capa_asset_id = 'capas/torto.jpg',
                  sinopse = 'Sinopse gravada pelo acervo.', sinopse_status = 'disponivel',
                  atualizado_em = '2026-01-02T03:04:05Z'
            WHERE id = %s""",
        torto,
    )
    _executar(
        conexao,
        """INSERT INTO acervo.nota_leitor_projecao (usuario_id, livro_id, valor, atualizado_em)
           VALUES (gen_random_uuid(), %s, 4.5, '2026-01-03T00:00:00Z')""",
        torto,
    )
    _executar(
        conexao,
        """INSERT INTO acervo.nota_livro_agregada (livro_id, media, quantidade, atualizado_em)
           VALUES (%s, 4.50, 1, '2026-01-03T00:00:00Z')""",
        torto,
    )
    pessoal = _um(
        conexao,
        """INSERT INTO acervo.livro (titulo, autor_informado, paginas, tipo, dono_id, sinopse_status)
           VALUES ('Meu caderno de contos', 'Autora do leitor', 120, 'pessoal', gen_random_uuid(), 'ausente')
           RETURNING id""",
    )[0]
    importado = _um(
        conexao,
        """INSERT INTO acervo.livro (isbn13, ol_edition_key, ol_work_key, titulo, ano_publicacao, paginas,
                                     capa_url_externa, tipo)
           VALUES ('9780000000002', 'OL39999999M', 'OL29999999W', 'Importado por ISBN', 2010, 100,
                   'https://covers.openlibrary.org/b/id/2-L.jpg', 'oficial')
           RETURNING id""",
    )[0]
    conexao.commit()
    _executar(
        conexao,
        """INSERT INTO acervo.livro_assunto (livro_id, assunto_id)
           SELECT %s, id FROM acervo.assunto WHERE slug = 'fantasia'
           UNION ALL SELECT %s, id FROM acervo.assunto WHERE slug = 'historia'""",
        pessoal, importado,
    )

    colunas_preservadas = """SELECT capa_url_propria, capa_asset_id, sinopse, sinopse_status, atualizado_em,
                                    nota_geral, nota_geral_qtd, paginas, ativo, ol_work_key, ol_edition_key,
                                    criado_em
                               FROM acervo.livro WHERE isbn13 = %s"""

    def retrato() -> dict:
        return {
            "torto": _linha(conexao, colunas_preservadas, TORTO),
            "google": _linha(conexao, colunas_preservadas, SAPIENS),
            "pessoal": _linha(conexao, "SELECT * FROM acervo.livro WHERE id = %s", pessoal),
            "importado": _linha(conexao, "SELECT * FROM acervo.livro WHERE id = %s", importado),
            "assuntos_pessoal": _assuntos(conexao, pessoal),
            "assuntos_importado": _assuntos(conexao, importado),
            "projecao": _todas(conexao, "SELECT * FROM acervo.nota_leitor_projecao"),
            "agregada": _todas(conexao, "SELECT * FROM acervo.nota_livro_agregada"),
        }

    antes = retrato()
    assert antes["torto"]["nota_geral"] == Decimal("4.5")
    assert antes["google"]["ol_work_key"] is None
    assert (antes["google"]["nota_geral"], antes["google"]["nota_geral_qtd"]) == (Decimal("3.5"), 8)
    assert antes["assuntos_pessoal"] == ["fantasia"]
    assert antes["assuntos_importado"] == ["historia"]

    recarga = _recarga(capsys, tmp_path / "recarga", _amostra_modificada(tmp_path / "amostra"))

    assert recarga["totais"]["livros_atualizados"] > 0
    # A linha de TORTO foi atualizada (título novo), e mesmo assim o resto ficou.
    assert _livro(conexao, TORTO)["titulo"] == "Torto Arado (edição revista)"
    assert retrato() == antes

    _rodar(capsys, "notas", "--database-url", URL, "--arquivo", str(ratings))

    assert retrato() == antes


def test_recarga_aplica_o_que_o_dump_traz_e_mantem_o_que_ele_nao_traz(conexao, capsys, tmp_path):
    _rodar(capsys, "semear", "--database-url", URL)
    _carga_da_amostra(capsys, tmp_path / "inicial")
    conexao.commit()
    antes = {isbn: _livro(conexao, isbn) for isbn in (TORTO, QUARTO, CORTICO, BRAS, DUNA, MESTRE, AIA)}
    assuntos_antes = {isbn: _assuntos(conexao, linha["id"]) for isbn, linha in antes.items()}
    assert assuntos_antes[TORTO] and "ficcao-cientifica" not in assuntos_antes[TORTO]
    assert assuntos_antes[QUARTO] and assuntos_antes[CORTICO]
    assert antes[DUNA]["numero_serie"] == 1

    totais = _recarga(capsys, tmp_path / "recarga", _amostra_modificada(tmp_path / "amostra"))["totais"]

    assert totais["livros_atualizados"] == ATUALIZADOS_NA_MODIFICADA
    torto = _livro(conexao, TORTO)
    assert torto["titulo"] == "Torto Arado (edição revista)"
    assert torto["capa_url_externa"] == "https://covers.openlibrary.org/b/id/99990001-L.jpg"
    assert torto["ano_publicacao"] == 2021
    assert _um(conexao, "SELECT nome FROM acervo.editora WHERE id = %s", torto["editora_id"])[0] == (
        "Editora Nova Recarga"
    )
    # Decisão 5: o total de páginas do livro existente não muda.
    assert torto["paginas"] == antes[TORTO]["paginas"] == 264
    # Assunto mapeado diferente substitui o conjunto.
    assert _assuntos(conexao, torto["id"]) == ["ficcao-cientifica"]
    assert totais["vinculos_assunto_removidos"] == len(assuntos_antes[TORTO])
    # Editora e ano ausentes no dump mantêm os atuais; só slug desconhecido mantém os assuntos.
    quarto = _livro(conexao, QUARTO)
    assert quarto["titulo"] == "Quarto de Despejo: diário de uma favelada"
    assert quarto == {**antes[QUARTO], "titulo": quarto["titulo"]}
    assert quarto["editora_id"] is not None and quarto["ano_publicacao"] == 2014
    assert _assuntos(conexao, antes[QUARTO]["id"]) == assuntos_antes[QUARTO]
    # Obra sem tag mapeada mantém os assuntos.
    assert _assuntos(conexao, antes[CORTICO]["id"]) == assuntos_antes[CORTICO]
    # Autor novo é acrescentado e o antigo fica.
    assert _autores_do_livro(conexao, antes[BRAS]["id"]) == ["OL10000003A", "OL10000099A"]
    # A mesma série sem número no dump mantém o número, mesmo com a linha atualizada.
    duna = _livro(conexao, DUNA)
    assert duna["titulo"] == "Duna (nova tradução)"
    assert (duna["serie_id"], duna["numero_serie"]) == (antes[DUNA]["serie_id"], 1)
    serie_e_numero = """SELECT s.nome, l.numero_serie FROM acervo.livro l
                          JOIN acervo.serie s ON s.id = l.serie_id WHERE l.isbn13 = %s"""
    assert _um(conexao, serie_e_numero, MESTRE) == ("Coleção Recarga", 3)
    assert _um(conexao, serie_e_numero, AIA) == ("Série Nova Sem Número", None)


def test_livro_que_saiu_dos_filtros_continua_intacto(conexao, capsys, tmp_path):
    _rodar(capsys, "semear", "--database-url", URL)
    _carga_da_amostra(capsys, tmp_path / "inicial")
    conexao.commit()
    antes = _livro(conexao, PRINCIPE)
    assuntos_antes = _assuntos(conexao, antes["id"])
    autores_antes = _autores_do_livro(conexao, antes["id"])

    _recarga(capsys, tmp_path / "recarga", _amostra_modificada(tmp_path / "amostra"))

    candidatos = _ler_linhas(tmp_path / "recarga" / "candidatos.jsonl")
    assert PRINCIPE not in {c["isbn13"] for c in candidatos}
    depois = _livro(conexao, PRINCIPE)
    assert depois == antes and depois["ativo"] is True
    assert _assuntos(conexao, antes["id"]) == assuntos_antes
    assert _autores_do_livro(conexao, antes["id"]) == autores_antes


def test_carga_inicial_sobre_base_existente_nao_atualiza_nada(conexao, capsys, tmp_path):
    """Regressão: sem `--tipo recarga`, a carga só acrescenta, como antes da F-ACV-OPC."""
    _rodar(capsys, "semear", "--database-url", URL)
    _carga_da_amostra(capsys, tmp_path / "inicial")
    conexao.commit()
    livros_antes = {linha[0]: linha for linha in _todas(conexao, "SELECT * FROM acervo.livro")}
    vinculos_antes = set(_todas(conexao, "SELECT livro_id, assunto_id FROM acervo.livro_assunto"))

    totais = _carga_da_amostra(
        capsys, tmp_path / "de-novo", _amostra_modificada(tmp_path / "amostra"),
        "carga_inicial", _so_slug_desconhecido,
    )["totais"]

    assert (totais["livros"], totais["livros_atualizados"], totais["vinculos_assunto_removidos"]) == (1, 0, 0)
    livros_depois = {linha[0]: linha for linha in _todas(conexao, "SELECT * FROM acervo.livro")}
    assert {chave: livros_depois[chave] for chave in livros_antes} == livros_antes
    assert vinculos_antes <= set(_todas(conexao, "SELECT livro_id, assunto_id FROM acervo.livro_assunto"))
