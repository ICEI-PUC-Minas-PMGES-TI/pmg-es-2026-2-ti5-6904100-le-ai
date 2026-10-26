"""Nota geral por obra a partir do `ol_dump_ratings` (F-ACV-NOTA, RF-ACV-15).

O dump de avaliações é um TSV de 4 colunas, uma linha por avaliação individual:
a obra (`/works/OL…W`), a edição (`/books/OL…M` ou `\\N`), a nota inteira de 1 a
5 e a data. Não há usuário nem agregado. A nota geral de uma obra é a média das
suas linhas, arredondada a 1 casa (`ROUND_HALF_UP`), com a contagem de linhas.

Linhas repetidas entram na conta: sem usuário, não há como saber se são a mesma
avaliação. Linha que não passa na validação (SEC-33) é descartada e contada.

Tudo em streaming, como `dump.py`: o arquivo nunca é carregado inteiro.
"""

from __future__ import annotations

import re
from collections.abc import Iterator
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

from .dump import _abrir

# Mesmo formato do `ol_work_key` gravado no livro e de `CHAVE_OBRA` do `acervo`.
_CHAVE_OBRA = re.compile(r"^/works/(OL[0-9]+W)$")
_NOTA = re.compile(r"^[1-5]$")
_UMA_CASA = Decimal("0.1")


@dataclass
class ResumoDasAvaliacoes:
    """Contagens da leitura e a nota por obra (`OL…W` → média e quantidade)."""

    lidas: int = 0
    descartadas: int = 0
    obras_no_dump: int = 0
    notas: dict[str, tuple[Decimal, int]] = field(default_factory=dict)


def avaliacoes(caminho: Path, resumo: ResumoDasAvaliacoes) -> Iterator[tuple[str, int]]:
    """Gera `(OL…W, nota)` das linhas válidas e conta lidas e descartadas."""
    with _abrir(caminho) as arquivo:
        for linha in arquivo:
            linha = linha.rstrip("\r\n")
            if not linha:
                continue
            resumo.lidas += 1
            partes = linha.split("\t")
            chave = _CHAVE_OBRA.match(partes[0]) if len(partes) >= 3 else None
            if chave is None or not _NOTA.match(partes[2]):
                resumo.descartadas += 1
                continue
            yield chave.group(1), int(partes[2])


def media(soma: int, quantidade: int) -> Decimal:
    """Média com 1 casa, meia para cima: 4,25 vira 4,3 (e não 4,2, como no `round`)."""
    return (Decimal(soma) / Decimal(quantidade)).quantize(_UMA_CASA, rounding=ROUND_HALF_UP)


def agregar(caminho: Path, obras_do_acervo: set[str]) -> ResumoDasAvaliacoes:
    """Lê o dump e calcula a nota das obras que existem no acervo.

    Só elas vão ao banco: o resto do dump (a grande maioria) seria tráfego à
    toa até o Neon. As obras do dump inteiro são contadas para o resumo.
    """
    resumo = ResumoDasAvaliacoes()
    obras: set[str] = set()
    somas: dict[str, list[int]] = {}
    for obra, nota in avaliacoes(caminho, resumo):
        obras.add(obra)
        if obra in obras_do_acervo:
            soma = somas.setdefault(obra, [0, 0])
            soma[0] += nota
            soma[1] += 1
    resumo.obras_no_dump = len(obras)
    resumo.notas = {obra: (media(s, q), q) for obra, (s, q) in somas.items()}
    return resumo
