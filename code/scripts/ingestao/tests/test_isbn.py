"""ISBN-13: formato e dígito verificador (RN-02, RNF-SEC-38)."""

import pytest

from leai_ingestao import isbn


@pytest.mark.parametrize(
    "entrada",
    ["9788535914849", "978-85-359-1484-9", "978 85 359 1484 9", " 9788535914849 "],
)
def test_aceita_isbn13_valido_com_e_sem_separadores(entrada):
    assert isbn.normalizar(entrada) == "9788535914849"


@pytest.mark.parametrize(
    "entrada",
    [
        "9788535914840",              # dígito verificador errado
        "8535914849",                 # ISBN-10
        "97885359148499",             # 14 dígitos
        "1238535914849",              # prefixo fora de 978/979
        "97885359148X9",              # caractere não numérico
        "https://openlibrary.org/9788535914849",  # URL nunca é aceita (SEC-38)
        "",
        None,
    ],
)
def test_recusa_entrada_invalida(entrada):
    assert isbn.normalizar(entrada) is None


def test_aceita_prefixo_979():
    # 9791234567896: DV calculado pelo mesmo algoritmo do EAN-13.
    assert isbn.digito_verificador_confere("9791234567896")


def test_primeiro_valido_ignora_lixo_da_fonte():
    assert isbn.primeiro_valido(["", "8535914849", "9788535914849"]) == "9788535914849"
    assert isbn.primeiro_valido(["nada", "aqui"]) is None
    assert isbn.primeiro_valido(None) is None
