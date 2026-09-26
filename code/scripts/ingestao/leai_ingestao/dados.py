"""Leitura dos dados curados versionados desta feature.

Os três CSV de `dados/` são entregáveis próprios de F-ACV-INGESTAO: o conjunto
curado de assuntos (RN-21.1), a tabela de sinônimos de editora (RN-12) e a
tabela de mapeamento de tag externa para assunto (RN-21.3).

O CSV é a fonte **versionada**; as tabelas `acervo.assunto`,
`acervo.sinonimo_editora` e `acervo.mapa_assunto_externo` são a fonte de
**runtime**, lidas também pelo importador por ISBN do serviço `acervo`. É o que
mantém os dados de normalização em um lugar só, mesmo com a ingestão em Python e
o serviço em TypeScript.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from .assuntos import MapaDeAssuntos
from .normalizacao import normalizar_editora, normalizar_tag, slugificar

DIRETORIO_PADRAO = Path(__file__).resolve().parent.parent / "dados"


@dataclass(frozen=True)
class Assunto:
    slug: str
    nome: str


class ErroDeDadosCurados(ValueError):
    """Dado curado inconsistente. Falha antes da carga, nunca no meio dela."""


def carregar_assuntos(diretorio: Path | None = None) -> list[Assunto]:
    """Conjunto curado e fechado (RN-21.1)."""
    caminho = (diretorio or DIRETORIO_PADRAO) / "assuntos.csv"
    assuntos: list[Assunto] = []
    vistos: set[str] = set()

    with open(caminho, newline="", encoding="utf-8") as arquivo:
        for linha in csv.DictReader(arquivo):
            slug = (linha["slug"] or "").strip()
            nome = (linha["nome"] or "").strip()
            if not slug or not nome:
                raise ErroDeDadosCurados(f"assunto com slug ou nome vazio: {linha!r}")
            # O CHECK `assunto_slug_formato_ck` recusaria a linha no banco; é
            # melhor descobrir aqui do que no meio de uma carga de horas.
            if slugificar(nome) != slug:
                raise ErroDeDadosCurados(
                    f"slug {slug!r} não corresponde ao nome {nome!r} (esperado {slugificar(nome)!r})"
                )
            if slug in vistos:
                raise ErroDeDadosCurados(f"assunto duplicado: {slug!r}")
            vistos.add(slug)
            assuntos.append(Assunto(slug=slug, nome=nome))

    return assuntos


def carregar_sinonimos_de_editora(diretorio: Path | None = None) -> dict[str, str]:
    """`forma externa normalizada -> nome canônico da editora` (RN-12)."""
    caminho = (diretorio or DIRETORIO_PADRAO) / "sinonimos_editora.csv"
    sinonimos: dict[str, str] = {}

    with open(caminho, newline="", encoding="utf-8") as arquivo:
        for linha in csv.DictReader(arquivo):
            forma = (linha["forma_externa"] or "").strip()
            editora = (linha["editora"] or "").strip()
            if not forma or not editora:
                raise ErroDeDadosCurados(f"sinônimo incompleto: {linha!r}")
            if normalizar_editora(forma) != forma:
                raise ErroDeDadosCurados(
                    f"forma externa {forma!r} não está normalizada "
                    f"(esperado {normalizar_editora(forma)!r})"
                )
            if forma in sinonimos:
                raise ErroDeDadosCurados(f"forma externa duplicada: {forma!r}")
            sinonimos[forma] = editora

    return sinonimos


def carregar_mapa_de_assuntos(diretorio: Path | None = None) -> MapaDeAssuntos:
    """Tabela de mapeamento tag externa -> assunto curado (RN-21.3)."""
    diretorio = diretorio or DIRETORIO_PADRAO
    slugs = {a.slug for a in carregar_assuntos(diretorio)}
    pares: list[tuple[str, str]] = []
    vistas: set[str] = set()

    with open(diretorio / "mapa_assunto.csv", newline="", encoding="utf-8") as arquivo:
        for linha in csv.DictReader(arquivo):
            tag = (linha["tag_externa"] or "").strip()
            slug = (linha["assunto"] or "").strip()
            if not tag or not slug:
                raise ErroDeDadosCurados(f"mapeamento incompleto: {linha!r}")
            if normalizar_tag(tag) != tag:
                raise ErroDeDadosCurados(
                    f"tag {tag!r} não está normalizada (esperado {normalizar_tag(tag)!r})"
                )
            if tag in vistas:
                raise ErroDeDadosCurados(f"tag externa duplicada: {tag!r}")
            vistas.add(tag)
            pares.append((tag, slug))

    mapa = MapaDeAssuntos.de_pares(pares, slugs)
    desconhecidos = mapa.slugs_desconhecidos()
    if desconhecidos:
        raise ErroDeDadosCurados(
            "mapeamento aponta para assunto fora do conjunto curado: "
            + ", ".join(sorted(desconhecidos))
        )
    return mapa


def resolver_editora(nome_bruto: str | None, sinonimos: dict[str, str]) -> tuple[str, str] | None:
    """Aplica normalização e tabela de sinônimos, nesta ordem (RN-12).

    Devolve `(nome_de_exibicao, nome_normalizado)`. A entidade `Editora` nasce da
    forma normalizada, e o sinônimo existe para colapsar as variantes que a
    normalização sozinha não junta — "Intrinseca" e "Intrínseca" é o exemplo da
    própria RN-12.
    """
    if not nome_bruto or not nome_bruto.strip():
        return None

    normalizada = normalizar_editora(nome_bruto)
    if not normalizada:
        return None

    canonico = sinonimos.get(normalizada)
    if canonico:
        return canonico, normalizar_editora(canonico)

    return nome_bruto.strip(), normalizada
