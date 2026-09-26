"""Descarte de edição inelegível na carga inicial (RN-12, §10.1)."""

import pytest

from leai_ingestao import filtros


def edicao(**mudancas):
    base = {
        "title": "Torto Arado",
        "languages": [{"key": "/languages/por"}],
        "isbn_13": ["9788588808911"],
        "number_of_pages": 264,
        "covers": [10520481],
    }
    base.update(mudancas)
    return base


def test_aceita_edicao_completa_em_portugues():
    assert filtros.avaliar(edicao()).aceita


@pytest.mark.parametrize(
    "mudancas,motivo",
    [
        ({"isbn_13": []}, filtros.MOTIVO_SEM_ISBN),
        ({"isbn_13": ["8535914849"]}, filtros.MOTIVO_SEM_ISBN),
        ({"number_of_pages": None}, filtros.MOTIVO_SEM_PAGINAS),
        ({"number_of_pages": 0}, filtros.MOTIVO_SEM_PAGINAS),
        ({"covers": []}, filtros.MOTIVO_SEM_CAPA),
        ({"covers": [-1]}, filtros.MOTIVO_SEM_CAPA),
        ({"languages": [{"key": "/languages/eng"}]}, filtros.MOTIVO_OUTRO_IDIOMA),
        ({"languages": []}, filtros.MOTIVO_OUTRO_IDIOMA),
        ({"title": "   "}, filtros.MOTIVO_SEM_TITULO),
    ],
)
def test_descarta_registro_invalido_com_motivo(mudancas, motivo):
    """RN-12: sem ISBN-13, sem total de páginas ou sem capa, o livro é descartado."""
    veredito = filtros.avaliar(edicao(**mudancas))
    assert not veredito.aceita
    assert veredito.motivo == motivo


def test_descarta_autopublicacao():
    """§10.1: excluir autopublicação com metadado pobre."""
    veredito = filtros.avaliar(edicao(), "independently published")
    assert veredito.motivo == filtros.MOTIVO_AUTOPUBLICACAO


def test_idioma_e_avaliado_no_nivel_da_edicao():
    """§10.1, ressalva 1: `language:por` da OBRA é pouco confiável (26% de falso
    positivo na amostra), então o filtro olha só o campo da edição."""
    assert filtros.edicao_em_portugues({"languages": [{"key": "/languages/por"}]})
    assert not filtros.edicao_em_portugues({"subjects": ["Brazilian literature"]})


def test_paginas_recusa_booleano():
    """`True` é `int` em Python e passaria por um `isinstance` ingênuo."""
    assert filtros.total_de_paginas({"number_of_pages": True}) is None
