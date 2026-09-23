"""Autor da obra como plano B da edição sem `authors`.

O critério é o do importador por ISBN do serviço `acervo`
(`openlibrary.fonte.ts`): só o primeiro da lista da obra, na ordem da fonte,
sem olhar o papel, e com a chave validada.
"""

import pytest

from leai_ingestao.dump import primeiro_autor_da_obra


def autor(chave, papel="/type/author_role"):
    return {"type": {"key": papel}, "author": {"key": chave}}


def test_devolve_o_primeiro_na_ordem_da_fonte():
    obra = {"authors": [autor("/authors/OL10000015A"), autor("/authors/OL10000016A")]}
    assert primeiro_autor_da_obra(obra) == "OL10000015A"

    invertida = {"authors": [autor("/authors/OL10000016A"), autor("/authors/OL10000015A")]}
    assert primeiro_autor_da_obra(invertida) == "OL10000016A"


@pytest.mark.parametrize("obra", [{}, {"authors": []}, {"authors": None}, {"authors": "OL1A"}])
def test_obra_sem_lista_de_autores_nao_tem_autor(obra):
    assert primeiro_autor_da_obra(obra) is None


@pytest.mark.parametrize(
    "primeiro",
    [
        autor("/authors/OL10000015W"),        # chave de obra, não de autor
        autor("/authors/../OL1A/x"),          # caminho forjado
        autor("/authors/OL1A\n"),             # quebra de linha no fim
        autor(""),
        {"type": {"key": "/type/author_role"}},  # sem `author`
        {"author": "sem objeto"},
        "/authors/OL10000015A",               # item que não é objeto
        None,
    ],
)
def test_primeiro_malformado_nao_pula_para_o_segundo(primeiro):
    """Pular para o segundo poderia promover o tradutor a autor."""
    obra = {"authors": [primeiro, autor("/authors/OL10000016A")]}
    assert primeiro_autor_da_obra(obra) is None
