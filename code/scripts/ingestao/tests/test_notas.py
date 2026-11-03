"""Nota geral pelo `ol_dump_ratings` (F-ACV-NOTA): leitura, validação e média, sem banco."""

from __future__ import annotations

import gzip
from decimal import Decimal
from pathlib import Path

from leai_ingestao.notas import agregar, media

LINHAS = [
    "/works/OL1W\t/books/OL10M\t5\t2018-06-20",
    "/works/OL1W\t\\N\t4\t2019-01-02",
    # Repetida: sem usuário, entra na conta.
    "/works/OL1W\t\\N\t4\t2019-01-02",
    "/works/OL2W\t\\N\t3\t2020-03-04",
    # Obra que não está no acervo: conta como obra do dump, não vai ao banco.
    "/works/OL9W\t\\N\t1\t2020-03-04",
    # Inválidas: chave fora do formato, nota fora de 1 a 5, nota não inteira, colunas a menos.
    "/books/OL10M\t\\N\t5\t2018-06-20",
    "/works/OL3W/x\t\\N\t5\t2018-06-20",
    "/works/OL2W\t\\N\t0\t2018-06-20",
    "/works/OL2W\t\\N\t6\t2018-06-20",
    "/works/OL2W\t\\N\t4.5\t2018-06-20",
    "/works/OL2W\t\\N",
    "",
]


def _dump(tmp_path: Path, linhas: list[str], comprimido: bool = False) -> Path:
    texto = "\n".join(linhas) + "\n"
    if comprimido:
        caminho = tmp_path / "ratings.txt.gz"
        with gzip.open(caminho, "wt", encoding="utf-8") as arquivo:
            arquivo.write(texto)
    else:
        caminho = tmp_path / "ratings.txt"
        caminho.write_text(texto, encoding="utf-8")
    return caminho


def test_valida_descarta_conta_e_agrega_so_as_obras_do_acervo(tmp_path):
    resumo = agregar(_dump(tmp_path, LINHAS), {"OL1W", "OL2W", "OL3W"})

    assert resumo.lidas == 11
    assert resumo.descartadas == 6
    assert resumo.obras_no_dump == 3
    # (5 + 4 + 4) / 3 = 4,333…; a repetida conta.
    assert resumo.notas == {"OL1W": (Decimal("4.3"), 3), "OL2W": (Decimal("3.0"), 1)}


def test_le_o_dump_comprimido(tmp_path):
    resumo = agregar(_dump(tmp_path, LINHAS, comprimido=True), {"OL1W"})

    assert resumo.notas == {"OL1W": (Decimal("4.3"), 3)}


def test_edicao_ausente_e_aceita(tmp_path):
    # `\N` na coluna da edição é o normal no dump: a nota é da obra.
    resumo = agregar(_dump(tmp_path, ["/works/OL5W\t\\N\t2\t2021-01-01"]), {"OL5W"})

    assert resumo.descartadas == 0
    assert resumo.notas == {"OL5W": (Decimal("2.0"), 1)}


def test_media_arredonda_meia_para_cima():
    assert media(17, 4) == Decimal("4.3")  # 4,25
    assert media(9, 2) == Decimal("4.5")
    assert media(13, 3) == Decimal("4.3")  # 4,333…
    assert media(11, 3) == Decimal("3.7")  # 3,666…
    assert media(5, 1) == Decimal("5.0")
