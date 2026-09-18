"""Transformação de uma edição do dump no registro que vai ao banco (RN-12).

Esta é a fronteira onde o dado externo deixa de ser texto livre da origem e
passa a ser um registro validado e normalizado (RNF-SEC-33). Nada além dos
campos necessários aos requisitos é persistido (RNF-DES-05).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from . import filtros
from . import isbn as isbn_mod
from .dump import chave_curta, chaves_de
from .normalizacao import (
    extrair_numero_da_serie,
    nome_da_serie_sem_numero,
    normalizar_editora,
    normalizar_serie,
)

URL_DA_CAPA = "https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"

# `livro.titulo` é `text`, mas o contrato HTTP limita a 500 e o índice de busca
# é o item dominante do armazenamento (RNF-DES-05).
LIMITE_TITULO = 500
LIMITE_NOME = 200

_ANO = re.compile(r"(1[0-9]{3}|20[0-9]{2})")


@dataclass
class EdicaoNormalizada:
    """Uma linha de `acervo.livro` mais as associações que ela precisa."""

    isbn13: str
    ol_edition_key: str | None
    ol_work_key: str | None
    titulo: str
    ano_publicacao: int | None
    paginas: int
    capa_url_externa: str
    editora_nome: str | None
    editora_normalizada: str | None
    serie_nome: str | None
    serie_normalizada: str | None
    numero_serie: int | None
    autores_ol: list[str] = field(default_factory=list)


def _cortar(texto: str | None, limite: int) -> str | None:
    if not texto:
        return None
    limpo = " ".join(str(texto).split())
    if not limpo:
        return None
    return limpo[:limite]


def ano_de_publicacao(edicao: dict) -> int | None:
    """Ano da EDIÇÃO a partir de `publish_date`, que é texto livre.

    §10.1 avisa que `first_publish_year` é da obra original, não da edição —
    usar aquele campo excluiria o cânone de vestibular. Aqui só se lê a data da
    própria edição, e formato irreconhecível vira ausência, não erro:
    `ano_publicacao` é nullable.
    """
    bruto = edicao.get("publish_date")
    if not isinstance(bruto, str):
        return None
    encontrado = _ANO.search(bruto)
    return int(encontrado.group(1)) if encontrado else None


def primeiro_texto(edicao: dict, campo: str) -> str | None:
    """Primeiro item textual não vazio de um campo de lista da origem."""
    for item in edicao.get(campo) or []:
        if isinstance(item, str) and item.strip():
            return item.strip()
    return None


def normalizar(edicao: dict) -> tuple[EdicaoNormalizada | None, str | None]:
    """Aplica RN-12 e devolve `(registro, None)` ou `(None, motivo_do_descarte)`."""
    editora_bruta = primeiro_texto(edicao, "publishers")
    editora_normalizada = normalizar_editora(editora_bruta)

    veredito = filtros.avaliar(edicao, editora_normalizada)
    if not veredito.aceita:
        return None, veredito.motivo

    serie_bruta = primeiro_texto(edicao, "series")
    serie_nome = _cortar(nome_da_serie_sem_numero(serie_bruta), LIMITE_NOME) if serie_bruta else None

    registro = EdicaoNormalizada(
        isbn13=isbn_mod.primeiro_valido(edicao.get("isbn_13")),
        ol_edition_key=chave_curta(edicao.get("key")),
        ol_work_key=(chaves_de(edicao, "works") or [None])[0],
        titulo=_cortar(edicao.get("title"), LIMITE_TITULO),
        ano_publicacao=ano_de_publicacao(edicao),
        paginas=filtros.total_de_paginas(edicao),
        capa_url_externa=URL_DA_CAPA.format(cover_id=filtros.id_da_capa(edicao)),
        editora_nome=_cortar(editora_bruta, LIMITE_NOME),
        editora_normalizada=editora_normalizada or None,
        serie_nome=serie_nome,
        serie_normalizada=normalizar_serie(serie_nome) or None if serie_nome else None,
        numero_serie=extrair_numero_da_serie(serie_bruta),
        autores_ol=chaves_de(edicao, "authors"),
    )
    return registro, None
