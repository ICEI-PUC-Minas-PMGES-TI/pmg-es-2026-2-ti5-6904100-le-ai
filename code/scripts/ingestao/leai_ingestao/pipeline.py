"""Fases 1 e 2 da carga: filtrar o dump de edições e resolver autor/assunto.

O dump de edições não é autossuficiente. A edição referencia autor por
`/authors/OL...A` e obra por `/works/OL...W`; o **nome** do autor mora em
`ol_dump_authors` e os **assuntos** moram majoritariamente na obra, em
`ol_dump_works`. Uma passada só não resolve, e carregar os três dumps inteiros
em memória é inviável — daí duas fases de arquivo para arquivo, cada uma em
streaming, antes de qualquer coisa tocar o banco.

Tudo aqui é I/O de arquivo e lógica pura: roda sem banco e sem `psycopg`, que é
o que permite o CI validar a carga contra a amostra reproduzível.
"""

from __future__ import annotations

import json
from collections import Counter
from dataclasses import asdict, dataclass, field
from pathlib import Path

from .assuntos import MapaDeAssuntos
from .dump import chave_curta, ler_registros
from .edicao import normalizar


@dataclass
class ResumoDaFiltragem:
    """Contagem do que entrou e do que saiu, por motivo (RN-12)."""

    lidos: int = 0
    aceitos: int = 0
    descartados: int = 0
    duplicados: int = 0
    por_motivo: dict[str, int] = field(default_factory=dict)

    def como_dict(self) -> dict:
        return asdict(self)


def filtrar(
    caminho_dump: Path,
    saida_candidatos: Path,
    saida_chaves: Path,
    formato: str = "auto",
    limite: int | None = None,
) -> ResumoDaFiltragem:
    """Fase 1: seleciona as edições elegíveis e anota as chaves a resolver.

    A deduplicação por ISBN-13 e por `ol_edition_key` acontece já aqui, em
    memória: são dois conjuntos de strings curtas, muito menores que o dump, e
    filtrar cedo evita mandar duplicata para o `COPY`. O banco ainda garante a
    unicidade pelos índices `livro_isbn13_uidx` e `livro_ol_edition_key_uidx` —
    isto é otimização, não a garantia.
    """
    resumo = ResumoDaFiltragem()
    motivos: Counter[str] = Counter()
    isbns_vistos: set[str] = set()
    edicoes_vistas: set[str] = set()
    autores: set[str] = set()
    obras: set[str] = set()

    saida_candidatos.parent.mkdir(parents=True, exist_ok=True)

    with open(saida_candidatos, "w", encoding="utf-8") as destino:
        for bruto in ler_registros(caminho_dump, formato):
            resumo.lidos += 1

            registro, motivo = normalizar(bruto)
            if registro is None:
                resumo.descartados += 1
                motivos[motivo] += 1
                continue

            if registro.isbn13 in isbns_vistos or (
                registro.ol_edition_key and registro.ol_edition_key in edicoes_vistas
            ):
                resumo.duplicados += 1
                motivos["duplicado"] += 1
                continue

            isbns_vistos.add(registro.isbn13)
            if registro.ol_edition_key:
                edicoes_vistas.add(registro.ol_edition_key)
            autores.update(registro.autores_ol)
            if registro.ol_work_key:
                obras.add(registro.ol_work_key)

            destino.write(json.dumps(asdict(registro), ensure_ascii=False) + "\n")
            resumo.aceitos += 1

            if limite is not None and resumo.aceitos >= limite:
                break

    # Descarte e duplicata são coisas diferentes para `ingestao_execucao`, mas o
    # CHECK `ingestao_execucao_totais_ck` só conhece descartados; a separação
    # fica no resumo, e o total somado vai para a tabela.
    resumo.descartados += resumo.duplicados
    resumo.por_motivo = dict(sorted(motivos.items()))

    saida_chaves.write_text(
        json.dumps(
            {"autores": sorted(autores), "obras": sorted(obras)},
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    return resumo


def resolver_autores(caminho_dump: Path, chaves: set[str], saida: Path, formato: str = "auto") -> int:
    """Fase 2a: extrai `chave -> nome` só dos autores que a carga precisa."""
    encontrados = 0
    saida.parent.mkdir(parents=True, exist_ok=True)

    with open(saida, "w", encoding="utf-8") as destino:
        for bruto in ler_registros(caminho_dump, formato):
            chave = chave_curta(bruto.get("key"))
            if chave not in chaves:
                continue
            nome = (bruto.get("name") or bruto.get("personal_name") or "").strip()
            if not nome:
                continue
            destino.write(
                json.dumps({"ol_author_key": chave, "nome": nome}, ensure_ascii=False) + "\n"
            )
            encontrados += 1

    return encontrados


def resolver_assuntos(
    caminho_dump: Path,
    chaves: set[str],
    mapa: MapaDeAssuntos,
    saida: Path,
    formato: str = "auto",
) -> int:
    """Fase 2b: traduz as tags livres da obra em slugs curados (RN-21).

    O mapeamento acontece aqui, não na carga: assim o arquivo intermediário já
    sai com o conjunto fechado, e as tags livres da origem nunca chegam perto do
    banco — RN-12 é explícito que elas não são armazenadas.
    """
    com_assunto = 0
    saida.parent.mkdir(parents=True, exist_ok=True)

    with open(saida, "w", encoding="utf-8") as destino:
        for bruto in ler_registros(caminho_dump, formato):
            chave = chave_curta(bruto.get("key"))
            if chave not in chaves:
                continue

            slugs = mapa.mapear(_tags_da_obra(bruto))
            if not slugs:
                # Livro sem assunto reconhecido é estado válido (RN-21.4).
                continue

            destino.write(
                json.dumps({"ol_work_key": chave, "assuntos": slugs}, ensure_ascii=False) + "\n"
            )
            com_assunto += 1

    return com_assunto


def _tags_da_obra(obra: dict) -> list[str]:
    """Junta os campos de tag livre que a obra pode trazer."""
    tags: list[str] = []
    for campo in ("subjects", "subject_places", "subject_times"):
        for item in obra.get(campo) or []:
            if isinstance(item, str):
                tags.append(item)
    return tags


def carregar_chaves(caminho: Path) -> tuple[set[str], set[str]]:
    """Lê o arquivo de chaves produzido pela fase 1."""
    dados = json.loads(caminho.read_text(encoding="utf-8"))
    return set(dados.get("autores") or []), set(dados.get("obras") or [])
