"""Biografia curta de autor a partir do dump de autores (RF-ACV-10).

A página de autor de F-ACV-DESCOBERTA mostra a biografia da OpenLibrary quando
a fonte tem; sem ela, a seção não aparece. A carga inicial não guardou o `bio`
do dump, e o subcomando `biografias` preenche `acervo.autor.biografia` depois.

O tratamento é o gêmeo de `textoPuro` (`code/back/acervo/src/common/texto-puro.ts`),
que o importador por ISBN usa para o mesmo campo: marcação HTML e o Markdown de
referência da OpenLibrary saem, parágrafos ficam separados por uma linha em
branco, e o texto é cortado na fronteira de palavra no teto do CHECK
`autor_biografia_ck` (migration `0005`). Vazio vira `None`, porque o CHECK
recusa biografia em branco. Se mudar a regra aqui, mude lá.
"""

from __future__ import annotations

import html
import re

LIMITE_DA_BIOGRAFIA = 2000

_QUALQUER_TAG = re.compile(r"<[^>]*>")
_TAG_DECODIFICADA = re.compile(
    r"</?(?:p|br|b|i|em|strong|u|s|small|span|div|li|ul|ol|h[1-6]|a|blockquote|font|sup|sub)"
    r"\b[^<>]*>|<!--[\s\S]*?-->",
    re.IGNORECASE,
)
# `\p{Cc}` menos a quebra de linha e a tabulação, que colapsam adiante.
_CONTROLE = re.compile(r"[\x00-\x08\x0b-\x1f\x7f-\x9f]")


def extrair_biografia(registro: dict) -> str | None:
    """`bio` do registro de autor, já em texto puro, ou `None`.

    No dump o `bio` chega como texto ou como `{"type": "/type/text", "value": ...}`,
    conforme a época do registro. Qualquer outra forma conta como ausência.
    """
    bruto = registro.get("bio")
    if isinstance(bruto, dict):
        bruto = bruto.get("value")
    if not isinstance(bruto, str):
        return None
    return texto_puro(bruto)


def texto_puro(bruto: str, limite: int = LIMITE_DA_BIOGRAFIA) -> str | None:
    texto = _sem_tags(bruto.replace("\r\n", "\n").replace("\r", "\n"), _QUALQUER_TAG)
    # HTML escapado (`&lt;b&gt;`) volta a ser tag ao decodificar, e sai de novo;
    # aqui só nomes de tag HTML conhecidos, para "5 &lt; 7" continuar texto.
    texto = _sem_tags(html.unescape(texto), _TAG_DECODIFICADA)
    texto = _CONTROLE.sub("", texto)
    # Markdown de referência da OpenLibrary.
    texto = re.sub(r"\(\s*\[[^\]]*\]\s*\[\d+\]\s*\)", "", texto)
    texto = re.sub(r"\[([^\]]+)\]\s*\[\d+\]", r"\1", texto)
    texto = re.sub(r"^\s*\[\d+\]:\s*\S+.*$", "", texto, flags=re.MULTILINE)
    texto = re.sub(r"^\s*[-=_*]{3,}\s*$", "", texto, flags=re.MULTILINE)
    # Link e ênfase em Markdown: fica o texto.
    texto = re.sub(r"\[([^\]]+)\]\((?:[^)]+)\)", r"\1", texto)
    texto = re.sub(r"(\*\*|__)(.+?)\1", r"\2", texto)
    texto = re.sub(r"[ \t ]+", " ", texto)
    texto = re.sub(r" *\n *", "\n", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    texto = texto.strip()

    if not texto:
        return None
    return _cortar(texto, limite)


def _sem_tags(texto: str, tag: re.Pattern) -> str:
    """Quebras e fim de bloco viram quebra de linha antes de as tags saírem."""
    texto = re.sub(r"<br\s*/?>", "\n", texto, flags=re.IGNORECASE)
    texto = re.sub(r"</(p|div|li|h[1-6])\s*>", "\n\n", texto, flags=re.IGNORECASE)
    return tag.sub("", texto)


def _cortar(texto: str, limite: int) -> str:
    """Corta na fronteira de palavra, com reticências, sem passar do limite.

    `len` conta code points, como o `char_length` do CHECK.
    """
    if len(texto) <= limite:
        return texto
    inicio = texto[: limite - 1]
    espaco = re.search(r"\s\S*$", inicio)
    corte = inicio[: espaco.start()] if espaco and espaco.start() > limite / 2 else inicio
    return f"{corte.rstrip()}…"
