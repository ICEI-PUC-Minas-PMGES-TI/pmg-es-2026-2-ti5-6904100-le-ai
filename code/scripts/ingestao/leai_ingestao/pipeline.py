"""Fases 1 e 2 da carga: filtrar o dump de edições e resolver autor/assunto.

O dump de edições não é autossuficiente. A edição referencia autor por
`/authors/OL...A` e obra por `/works/OL...W`; o **nome** do autor mora em
`ol_dump_authors` e os **assuntos** moram majoritariamente na obra, em
`ol_dump_works`. Uma passada só não resolve, e carregar os três dumps inteiros
em memória é inviável — daí duas fases de arquivo para arquivo, cada uma em
streaming, antes de qualquer coisa tocar o banco.

Na fase 2 a ordem importa: o dump de obras é lido antes do de autores. Edição
sem autor utilizável herda o primeiro autor da obra, e essa chave também
precisa de nome.

Tudo aqui é I/O de arquivo e lógica pura: roda sem banco e sem `psycopg`, que é
o que permite o CI validar a carga contra a amostra reproduzível.
"""

from __future__ import annotations

import json
from collections import Counter
from dataclasses import asdict, dataclass, field
from pathlib import Path

from .assuntos import MapaDeAssuntos
from .biografia import extrair_biografia
from .dump import chave_curta, ler_registros, primeiro_autor_da_obra
from .edicao import normalizar
from .normalizacao import nome_de_autor_utilizavel


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
    obras_sem_autor: set[str] = set()

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
                # Edição sem `authors` é comum no acervo brasileiro da fonte; o
                # autor vem da obra, resolvido na fase 2 (`resolver_obras`).
                if not registro.autores_ol:
                    obras_sem_autor.add(registro.ol_work_key)

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
            {
                "autores": sorted(autores),
                "obras": sorted(obras),
                "obras_sem_autor": sorted(obras_sem_autor),
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    return resumo


def resolver_autores(caminho_dump: Path, chaves: set[str], saida: Path, formato: str = "auto") -> int:
    """Fase 2b: extrai `chave -> nome` só dos autores que a carga precisa.

    `chaves` são as da edição somadas às que `resolver_obras` tirou da obra —
    por isso o dump de obras é lido antes deste.

    Autor cujo nome é só marcador de catálogo (`[author not identified]`) não
    ganha linha: sem nome utilizável ele conta como ausente, e a carga cai no
    primeiro autor da obra (`nome_de_autor_utilizavel`).
    """
    encontrados = 0
    saida.parent.mkdir(parents=True, exist_ok=True)

    with open(saida, "w", encoding="utf-8") as destino:
        for bruto in ler_registros(caminho_dump, formato):
            chave = chave_curta(bruto.get("key"))
            if chave not in chaves:
                continue
            nome = (bruto.get("name") or bruto.get("personal_name") or "").strip()
            if not nome_de_autor_utilizavel(nome):
                continue
            destino.write(
                json.dumps({"ol_author_key": chave, "nome": nome}, ensure_ascii=False) + "\n"
            )
            encontrados += 1

    return encontrados


def extrair_biografias(
    caminho_dump: Path, chaves: set[str], formato: str = "auto"
) -> tuple[list[tuple[str, str]], int]:
    """Biografias do dump de autores, só das chaves pedidas (RF-ACV-10).

    Devolve `([(chave, biografia)], autores_encontrados)`: quantos dos autores
    pedidos apareceram no dump, com ou sem biografia, para o resumo mostrar a
    diferença entre "a fonte não tem" e "não estava no dump". As chaves são as
    dos autores já carregados, poucos milhares, então a lista cabe em memória.
    """
    biografias: list[tuple[str, str]] = []
    encontrados = 0
    for bruto in ler_registros(caminho_dump, formato):
        chave = chave_curta(bruto.get("key"))
        if chave not in chaves:
            continue
        encontrados += 1
        biografia = extrair_biografia(bruto)
        if biografia:
            biografias.append((chave, biografia))
    return biografias, encontrados


def resolver_obras(
    caminho_dump: Path,
    chaves: set[str],
    mapa: MapaDeAssuntos,
    saida_assuntos: Path,
    saida_autor_obra: Path,
    formato: str = "auto",
) -> tuple[int, int]:
    """Fase 2a: numa passada só pelo dump de obras, assuntos e autor da obra.

    Assuntos: as tags livres da obra saem traduzidas em slugs curados (RN-21).
    O mapeamento acontece aqui, não na carga: assim o arquivo intermediário já
    sai com o conjunto fechado, e as tags livres da origem nunca chegam perto do
    banco — RN-12 é explícito que elas não são armazenadas.

    Autor da obra: grava a chave do primeiro autor (`primeiro_autor_da_obra`)
    de TODA obra pedida, não só das obras cuja edição veio sem `authors`. O
    autor da edição pode ser marcador de catálogo (`[author not identified]`),
    e isso só se descobre na passada pelos autores, que roda depois desta;
    quando acontece, a carga precisa do autor da obra já anotado. Essas chaves
    ainda precisam de nome, então entram no conjunto de `resolver_autores`.

    Devolve `(obras_com_assunto, obras_com_autor)`.
    """
    com_assunto = 0
    com_autor = 0
    saida_assuntos.parent.mkdir(parents=True, exist_ok=True)
    saida_autor_obra.parent.mkdir(parents=True, exist_ok=True)

    with open(saida_assuntos, "w", encoding="utf-8") as assuntos, open(
        saida_autor_obra, "w", encoding="utf-8"
    ) as autor_obra:
        for bruto in ler_registros(caminho_dump, formato):
            chave = chave_curta(bruto.get("key"))
            if chave not in chaves:
                continue

            autor = primeiro_autor_da_obra(bruto)
            if autor:
                autor_obra.write(
                    json.dumps({"ol_work_key": chave, "ol_author_key": autor}, ensure_ascii=False)
                    + "\n"
                )
                com_autor += 1

            slugs = mapa.mapear(_tags_da_obra(bruto))
            if not slugs:
                # Livro sem assunto reconhecido é estado válido (RN-21.4).
                continue

            assuntos.write(
                json.dumps({"ol_work_key": chave, "assuntos": slugs}, ensure_ascii=False) + "\n"
            )
            com_assunto += 1

    return com_assunto, com_autor


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


def carregar_obras_sem_autor(caminho: Path) -> set[str]:
    """Obras cuja edição aceita veio sem `authors`, também anotadas na fase 1."""
    dados = json.loads(caminho.read_text(encoding="utf-8"))
    return set(dados.get("obras_sem_autor") or [])


def carregar_autor_obra(caminho: Path) -> dict[str, str]:
    """Lê o `obra -> autor` produzido por `resolver_obras`."""
    autor_por_obra: dict[str, str] = {}
    with open(caminho, encoding="utf-8") as arquivo:
        for linha in arquivo:
            if linha.strip():
                registro = json.loads(linha)
                autor_por_obra[registro["ol_work_key"]] = registro["ol_author_key"]
    return autor_por_obra
