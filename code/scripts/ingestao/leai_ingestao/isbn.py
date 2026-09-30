"""Validação e normalização de ISBN-13 (RN-02, RNF-SEC-38).

Mesmas regras do serviço `acervo` (`src/common/isbn.ts`). As duas implementações
existem porque a ingestão é um script Python e o cadastro por ISBN é um endpoint
NestJS; os casos de teste são os mesmos dos dois lados, de propósito.
"""

from __future__ import annotations

# A coluna `acervo.livro.isbn13` tem CHECK `~ '^[0-9]{13}$'`, e o contrato HTTP
# restringe ainda mais, a `^97[89][0-9]{10}$`. Prefixo diferente de 978/979 não é
# ISBN-13 de livro.
PREFIXOS_VALIDOS = ("978", "979")

_SEPARADORES = {"-", " ", "‐", "‑", "‒", "–", "—", "."}


def normalizar(bruto: str | None) -> str | None:
    """Remove separadores e devolve os 13 dígitos, ou ``None`` se não for ISBN-13.

    Aceita as formas que as fontes externas e o leitor realmente escrevem
    (``978-85-359-1484-9``, ``978 85 359 1484 9``), sem nunca aceitar uma URL:
    tudo que não for dígito depois da limpeza invalida a entrada.
    """
    if not bruto:
        return None

    digitos = "".join(c for c in bruto.strip() if c not in _SEPARADORES)
    if len(digitos) != 13 or not digitos.isdigit():
        return None
    if not digitos.startswith(PREFIXOS_VALIDOS):
        return None
    if not digito_verificador_confere(digitos):
        return None
    return digitos


def digito_verificador_confere(isbn13: str) -> bool:
    """Confere o 13º dígito pelo algoritmo do EAN-13 (pesos 1 e 3 alternados)."""
    if len(isbn13) != 13 or not isbn13.isdigit():
        return False

    soma = 0
    for posicao, digito in enumerate(isbn13[:12]):
        soma += int(digito) * (3 if posicao % 2 else 1)

    esperado = (10 - (soma % 10)) % 10
    return esperado == int(isbn13[12])


def primeiro_valido(candidatos: list[str] | None) -> str | None:
    """Primeiro ISBN-13 válido de uma lista da fonte externa.

    O dump traz ``isbn_13`` como lista, e edições reais trazem entradas
    inválidas (ISBN-10 no campo errado, string vazia, lixo). Quem chama quer um
    ISBN utilizável, não a lista inteira.
    """
    for candidato in candidatos or []:
        normalizado = normalizar(candidato)
        if normalizado:
            return normalizado
    return None
