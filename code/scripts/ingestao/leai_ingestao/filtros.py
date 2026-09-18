"""Filtro de elegibilidade da edição na carga inicial (RN-12, §10.1).

O dump de edições tem dezenas de GB e o teto de armazenamento é RNF-DES-04, então
o descarte acontece **aqui**, em streaming, antes de qualquer coisa ir para o
Neon. RN-12 fecha a regra: "Livros sem ISBN-13, sem total de páginas ou sem capa
são descartados na carga inicial: progresso por página exige total de páginas".

§10.1 acrescenta a ressalva que muda o desenho: `language:por` no nível da OBRA é
pouco confiável (26% da amostra não tinha edição em português real), então o
filtro de idioma é aplicado no nível da EDIÇÃO.
"""

from __future__ import annotations

from dataclasses import dataclass

from . import isbn as isbn_mod

IDIOMA_PORTUGUES = "/languages/por"

# §10.1: "excluir autopublicação (`Independently Published`) com metadado pobre".
# Comparado contra a forma normalizada da editora.
EDITORAS_EXCLUIDAS = {
    "independently published",
    "independently",
    "createspace independent",
    "createspace independent platform",
    "kindle direct",
    "kindle direct publishing",
    "lulu com",
    "lulu",
    "amazon digital services",
    "clube de autores",
    "autografia",
}

MOTIVO_SEM_ISBN = "sem_isbn13"
MOTIVO_SEM_PAGINAS = "sem_paginas"
MOTIVO_SEM_CAPA = "sem_capa"
MOTIVO_OUTRO_IDIOMA = "outro_idioma"
MOTIVO_SEM_TITULO = "sem_titulo"
MOTIVO_AUTOPUBLICACAO = "autopublicacao"


@dataclass(frozen=True)
class Veredito:
    """Resultado do filtro. `motivo` só existe quando a edição é descartada."""

    aceita: bool
    motivo: str | None = None

    @staticmethod
    def ok() -> "Veredito":
        return Veredito(True)

    @staticmethod
    def descarte(motivo: str) -> "Veredito":
        return Veredito(False, motivo)


def edicao_em_portugues(edicao: dict) -> bool:
    """Idioma no nível da edição, nunca o da obra (§10.1, ressalva 1)."""
    for idioma in edicao.get("languages") or []:
        if isinstance(idioma, dict) and idioma.get("key") == IDIOMA_PORTUGUES:
            return True
    return False


def total_de_paginas(edicao: dict) -> int | None:
    """`number_of_pages` positivo. O CHECK `livro_paginas_positivas_ck` exige > 0."""
    bruto = edicao.get("number_of_pages")
    if isinstance(bruto, bool) or not isinstance(bruto, int):
        return None
    return bruto if bruto > 0 else None


def id_da_capa(edicao: dict) -> int | None:
    """Primeiro `cover_id` utilizável.

    O dump usa -1 como marcador de capa ausente. §10.1 manda referenciar a capa
    por `cover_id`, não por ISBN, para escapar do limite de taxa daquele caminho.
    """
    for cover in edicao.get("covers") or []:
        if isinstance(cover, bool) or not isinstance(cover, int):
            continue
        if cover > 0:
            return cover
    return None


def avaliar(edicao: dict, editora_normalizada: str = "") -> Veredito:
    """Aplica todos os descartes de RN-12 e §10.1 na ordem mais barata primeiro."""
    if not (edicao.get("title") or "").strip():
        return Veredito.descarte(MOTIVO_SEM_TITULO)
    if not edicao_em_portugues(edicao):
        return Veredito.descarte(MOTIVO_OUTRO_IDIOMA)
    if isbn_mod.primeiro_valido(edicao.get("isbn_13")) is None:
        return Veredito.descarte(MOTIVO_SEM_ISBN)
    if total_de_paginas(edicao) is None:
        return Veredito.descarte(MOTIVO_SEM_PAGINAS)
    if id_da_capa(edicao) is None:
        return Veredito.descarte(MOTIVO_SEM_CAPA)
    if editora_normalizada in EDITORAS_EXCLUIDAS:
        return Veredito.descarte(MOTIVO_AUTOPUBLICACAO)
    return Veredito.ok()
