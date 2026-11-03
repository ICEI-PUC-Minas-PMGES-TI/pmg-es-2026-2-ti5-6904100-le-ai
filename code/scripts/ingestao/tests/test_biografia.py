"""Biografia do dump de autores (F-ACV-DESCOBERTA, RF-ACV-10).

Mesmos casos de `textoPuro` no serviço `acervo`, que trata o mesmo campo na
importação por ISBN: os dois caminhos têm de gravar o mesmo texto.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from leai_ingestao.biografia import LIMITE_DA_BIOGRAFIA, extrair_biografia, texto_puro
from leai_ingestao.pipeline import extrair_biografias

AMOSTRA = Path(__file__).resolve().parent.parent / "amostra"


def test_bio_em_texto():
    assert extrair_biografia({"bio": "Escritora mineira."}) == "Escritora mineira."


def test_bio_em_objeto_type_text():
    registro = {"bio": {"type": "/type/text", "value": "Escritora mineira."}}
    assert extrair_biografia(registro) == "Escritora mineira."


@pytest.mark.parametrize(
    "registro",
    [{}, {"bio": ""}, {"bio": "   "}, {"bio": {"type": "/type/text"}}, {"bio": 42}, {"bio": "<p> </p>"}],
)
def test_sem_biografia_utilizavel_e_none(registro):
    assert extrair_biografia(registro) is None


def test_tira_html_e_markdown_de_referencia_da_openlibrary():
    bruto = (
        "Joaquim Maria <b>Machado de Assis</b> foi um escritor.<br>Nasceu no Rio "
        "([fonte][1]).\n\n----\n\n[1]: https://pt.wikipedia.org/wiki/Machado"
    )
    assert texto_puro(bruto) == "Joaquim Maria Machado de Assis foi um escritor.\nNasceu no Rio ."


def test_decodifica_entidades_sem_transformar_texto_em_tag():
    assert texto_puro("5 &lt; 7 &amp; &lt;b&gt;negrito&lt;/b&gt;") == "5 < 7 & negrito"


def test_link_e_enfase_markdown_ficam_so_com_o_texto():
    assert texto_puro("Ver [Wikipédia](https://pt.wikipedia.org) e **destaque**.") == (
        "Ver Wikipédia e destaque."
    )


def test_tira_caractere_de_controle_e_colapsa_espacos():
    assert texto_puro("Escritora\x00  mineira\t\tbrasileira") == "Escritora mineira brasileira"


def test_corta_na_fronteira_de_palavra_no_teto_do_check():
    bruto = "palavra " * 400
    cortado = texto_puro(bruto)
    assert len(cortado) <= LIMITE_DA_BIOGRAFIA
    assert cortado.endswith("palavra…")


def test_extrai_da_amostra_so_as_chaves_pedidas():
    dump = AMOSTRA / "autores_amostra.jsonl"

    biografias, encontrados = extrair_biografias(
        dump, {"OL10000001A", "OL10000002A", "OL10000003A", "OL99999999A"}
    )

    assert encontrados == 3
    assert dict(biografias) == {
        "OL10000001A": "Escritor e geógrafo baiano, autor de *Torto arado* .",
        "OL10000003A": "Joaquim Maria Machado de Assis foi um escritor brasileiro.",
    }
