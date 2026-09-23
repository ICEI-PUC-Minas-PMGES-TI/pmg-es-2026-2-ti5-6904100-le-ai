"""Normalização de autor, editora e série (RN-12)."""

import pytest

from leai_ingestao import normalizacao as n


@pytest.mark.parametrize(
    "entrada,esperado",
    [
        ("Editora Intrínseca", "intrínseca"),
        ("Rocco Ltda.", "rocco"),
        ("Companhia das Letras Ltda", "companhia das letras"),
        ("  EDITORA   ROCCO  ", "rocco"),
        ("Editora 34", "34"),
    ],
)
def test_editora_perde_sufixo_societario_e_moldura_de_ramo(entrada, esperado):
    assert n.normalizar_editora(entrada) == esperado


@pytest.mark.parametrize(
    "entrada",
    ["Globo Livros", "Universo dos Livros", "Geração Editorial", "DarkSide Books"],
)
def test_palavra_de_ramo_no_fim_faz_parte_da_marca(entrada):
    """Cortar "Livros"/"Editorial" no fim estragaria a marca; só o início é moldura."""
    assert n.normalizar_editora(entrada) == n.normalizar_nome(entrada)


def test_editora_preserva_acento_porque_o_sinonimo_resolve():
    """RN-12 cita "Intrinseca"/"Intrínseca" como caso da TABELA DE SINÔNIMOS.

    Se a normalização removesse acento, as duas colapsariam sozinhas e o exemplo
    da regra não existiria. Este teste trava essa decisão.
    """
    assert n.normalizar_editora("Intrinseca") != n.normalizar_editora("Intrínseca")


def test_editora_sozinha_nao_vira_vazio():
    assert n.normalizar_editora("Editora") == "editora"
    assert n.normalizar_editora("") == ""
    assert n.normalizar_editora(None) == ""


def test_autor_deduplica_por_caixa_e_acento():
    assert n.normalizar_nome_autor("José Saramago") == n.normalizar_nome_autor("JOSE  saramago")


# Os mesmos casos de `code/back/acervo/src/common/normalizacao.spec.ts`, de
# propósito: se as duas implementações divergirem, uma das suítes quebra.
@pytest.mark.parametrize(
    "nome",
    ["[author not identified]", "[Unknown]", "Unknown", "Autor desconhecido", "   "],
)
def test_marcador_de_catalogo_nao_e_nome_de_autor(nome):
    assert n.nome_de_autor_utilizavel(nome) is False


@pytest.mark.parametrize("nome", ["Austin Kleon", "Anônimo", "Machado de Assis"])
def test_nome_real_continua_valendo(nome):
    assert n.nome_de_autor_utilizavel(nome) is True


def test_slug_respeita_o_check_do_banco():
    import re

    padrao = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    for nome in ["Ficção científica", "Saúde e bem-estar", "Jovem adulto", "Crônica"]:
        assert padrao.match(n.slugificar(nome)), nome


@pytest.mark.parametrize(
    "entrada,nome,numero",
    [
        ("Harry Potter, #3", "Harry Potter", 3),
        ("Crônicas de Duna 1", "Crônicas de Duna", 1),
        ("Trilogia da Fundação", "Trilogia da Fundação", None),
        ("Série #0", "Série", None),  # CHECK livro_numero_serie_ck exige > 0
    ],
)
def test_serie_separa_nome_do_numero_de_ordem(entrada, nome, numero):
    assert n.nome_da_serie_sem_numero(entrada) == nome
    assert n.extrair_numero_da_serie(entrada) == numero
