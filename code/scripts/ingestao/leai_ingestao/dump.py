"""Leitura em streaming dos data dumps do OpenLibrary (§10.1).

Os dumps são TSV de 5 colunas — tipo, chave, revisão, última modificação e o
registro em JSON — comprimidos em gzip e na ordem de dezenas de GB. Nada aqui
carrega arquivo em memória: tudo é gerador, linha a linha.

A amostra reproduzível versionada em `amostra/` é JSONL simples, para ser legível
e diffável no repositório. Os dois formatos entram pela mesma porta.
"""

from __future__ import annotations

import gzip
import json
from collections.abc import Iterator
from pathlib import Path

COLUNAS_DO_DUMP = 5


def _abrir(caminho: Path):
    """Abre texto puro ou gzip conforme a extensão, sempre em UTF-8."""
    if str(caminho).endswith(".gz"):
        return gzip.open(caminho, "rt", encoding="utf-8", errors="replace")
    return open(caminho, "rt", encoding="utf-8", errors="replace")


def ler_registros(caminho: Path, formato: str = "auto") -> Iterator[dict]:
    """Gera os registros JSON de um dump TSV ou de um arquivo JSONL.

    Linha malformada é pulada em silêncio, de propósito: um dump de dezenas de
    GB tem lixo, e abortar a carga inteira por uma linha quebrada seria pior do
    que ignorá-la. O total de linhas lidas continua sendo contado por quem chama,
    então a diferença aparece em `ingestao_execucao`.
    """
    if formato == "auto":
        formato = "jsonl" if ".jsonl" in str(caminho) else "tsv"

    with _abrir(caminho) as arquivo:
        for linha in arquivo:
            linha = linha.rstrip("\n")
            if not linha:
                continue

            if formato == "jsonl":
                bruto = linha
            else:
                partes = linha.split("\t")
                if len(partes) < COLUNAS_DO_DUMP:
                    continue
                bruto = partes[4]

            try:
                registro = json.loads(bruto)
            except (json.JSONDecodeError, ValueError):
                continue

            if isinstance(registro, dict):
                yield registro


def chave_curta(referencia) -> str | None:
    """Extrai `OL123W` de `{"key": "/works/OL123W"}` ou de `"/works/OL123W"`.

    O dump referencia autor e obra por caminho; o banco guarda só o
    identificador (`autor.ol_author_key`, `livro.ol_work_key`).
    """
    if isinstance(referencia, dict):
        referencia = referencia.get("key")
    if not isinstance(referencia, str) or not referencia:
        return None
    return referencia.rsplit("/", 1)[-1] or None


def chaves_de(edicao: dict, campo: str) -> list[str]:
    """Todas as chaves curtas de um campo de lista (`authors`, `works`)."""
    chaves = []
    for item in edicao.get(campo) or []:
        chave = chave_curta(item)
        if chave and chave not in chaves:
            chaves.append(chave)
    return chaves
