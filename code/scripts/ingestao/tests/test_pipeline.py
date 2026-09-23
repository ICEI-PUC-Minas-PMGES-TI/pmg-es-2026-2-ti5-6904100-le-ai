"""Pipeline de filtragem e resolução contra a amostra reproduzível.

A amostra em `amostra/` é o que o CI executa: RNF-TST-08 pede massa
reproduzível, e o DoD da feature diz explicitamente que o CI não roda o dump
inteiro, valida o script contra uma amostra.
"""

import json
from pathlib import Path

import pytest

from leai_ingestao import cli
from leai_ingestao.dados import carregar_mapa_de_assuntos, carregar_sinonimos_de_editora, resolver_editora
from leai_ingestao.pipeline import (
    carregar_autor_obra,
    carregar_chaves,
    carregar_obras_sem_autor,
    filtrar,
    resolver_autores,
    resolver_obras,
)

AMOSTRA = Path(__file__).resolve().parent.parent / "amostra"

ACEITOS_NA_AMOSTRA = 15
DESCARTADOS_NA_AMOSTRA = 8


@pytest.fixture
def filtrada(tmp_path):
    resumo = filtrar(
        AMOSTRA / "edicoes_amostra.jsonl",
        tmp_path / "candidatos.jsonl",
        tmp_path / "chaves.json",
    )
    return resumo, tmp_path


def test_amostra_produz_totais_coerentes(filtrada):
    resumo, _ = filtrada
    assert resumo.aceitos == ACEITOS_NA_AMOSTRA
    assert resumo.descartados == DESCARTADOS_NA_AMOSTRA
    assert resumo.lidos == resumo.aceitos + resumo.descartados
    # É o invariante do CHECK `ingestao_execucao_totais_ck`.
    assert resumo.descartados + resumo.aceitos <= resumo.lidos


def test_amostra_cobre_todos_os_motivos_de_descarte(filtrada):
    resumo, _ = filtrada
    assert set(resumo.por_motivo) == {
        "autopublicacao",
        "outro_idioma",
        "sem_capa",
        "sem_isbn13",
        "sem_paginas",
        "sem_titulo",
    }


def test_amostra_da_livros_oficiais_suficientes_para_o_seed(filtrada):
    """Critério de aceite: a amostra fornece livros oficiais para RNF-TST-08."""
    resumo, _ = filtrada
    assert resumo.aceitos >= 10


def test_candidato_tem_capa_externa_e_nunca_sinopse(filtrada):
    """RN-12/RN-14.1: a URL externa é sempre persistida. RN-19.1: sinopse não."""
    _, saida = filtrada
    for linha in (saida / "candidatos.jsonl").read_text(encoding="utf-8").splitlines():
        registro = json.loads(linha)
        assert registro["capa_url_externa"].startswith("https://covers.openlibrary.org/b/id/")
        assert registro["paginas"] > 0
        assert len(registro["isbn13"]) == 13
        assert "sinopse" not in registro
        assert "nota_geral" not in registro


def test_reexecutar_a_mesma_amostra_nao_duplica(tmp_path):
    """Deduplicação por ISBN-13 e por `ol_edition_key` (RN-02)."""
    dobrada = tmp_path / "dobrada.jsonl"
    original = (AMOSTRA / "edicoes_amostra.jsonl").read_text(encoding="utf-8")
    dobrada.write_text(original + original, encoding="utf-8")

    resumo = filtrar(dobrada, tmp_path / "c.jsonl", tmp_path / "k.json")

    assert resumo.aceitos == ACEITOS_NA_AMOSTRA
    assert resumo.duplicados == ACEITOS_NA_AMOSTRA
    isbns = [json.loads(l)["isbn13"] for l in (tmp_path / "c.jsonl").read_text().splitlines()]
    assert len(isbns) == len(set(isbns))


def test_limite_corta_a_carga(tmp_path):
    """RNF-DES-04: o teto de 20% do plano Neon se materializa como `--limite`."""
    resumo = filtrar(
        AMOSTRA / "edicoes_amostra.jsonl", tmp_path / "c.jsonl", tmp_path / "k.json", limite=3
    )
    assert resumo.aceitos == 3


def _resolver_obras(saida: Path, mapa=None) -> tuple[int, int]:
    """Fase 2a contra a amostra, como o `resolver` da CLI roda."""
    _, obras = carregar_chaves(saida / "chaves.json")
    return resolver_obras(
        AMOSTRA / "obras_amostra.jsonl",
        obras,
        carregar_obras_sem_autor(saida / "chaves.json"),
        mapa or carregar_mapa_de_assuntos(),
        saida / "s.jsonl",
        saida / "autor_obra.jsonl",
    )


def test_so_a_edicao_sem_authors_pede_o_autor_da_obra(filtrada):
    _, saida = filtrada
    assert carregar_obras_sem_autor(saida / "chaves.json") == {"OL20000015W"}

    _, com_autor = _resolver_obras(saida)

    # Da obra vem só o primeiro autor; o tradutor que vem depois fica de fora.
    assert com_autor == 1
    assert carregar_autor_obra(saida / "autor_obra.jsonl") == {"OL20000015W": "OL10000015A"}


def test_resolve_apenas_os_autores_que_a_carga_precisa(filtrada):
    _, saida = filtrada
    autores, _ = carregar_chaves(saida / "chaves.json")
    _resolver_obras(saida)
    autor_por_obra = carregar_autor_obra(saida / "autor_obra.jsonl")
    chaves = autores | set(autor_por_obra.values())
    encontrados = resolver_autores(AMOSTRA / "autores_amostra.jsonl", chaves, saida / "a.jsonl")

    # O que a carga vincula: o autor da edição ou, sem ele, o primeiro da obra.
    precisa = set()
    for linha in (saida / "candidatos.jsonl").read_text(encoding="utf-8").splitlines():
        registro = json.loads(linha)
        precisa.update(registro["autores_ol"] or [autor_por_obra[registro["ol_work_key"]]])

    assert encontrados == len(chaves)
    resolvidos = {json.loads(l)["ol_author_key"] for l in (saida / "a.jsonl").read_text().splitlines()}
    assert resolvidos == precisa
    assert "OL10000015A" in resolvidos
    # O tradutor, segundo na lista da obra, não é resolvido.
    assert "OL10000016A" not in resolvidos
    # O autor do livro autopublicado foi descartado junto com a edição.
    assert "OL10000014A" not in resolvidos


def _resolver_pela_cli(saida: Path, *dumps: str) -> None:
    argv = [
        "resolver",
        "--chaves", str(saida / "chaves.json"),
        "--saida-autores", str(saida / "a.jsonl"),
        "--saida-assuntos", str(saida / "s.jsonl"),
        "--saida-autor-obra", str(saida / "autor_obra.jsonl"),
    ]
    if "autores" in dumps:
        argv += ["--dump-autores", str(AMOSTRA / "autores_amostra.jsonl")]
    if "obras" in dumps:
        argv += ["--dump-obras", str(AMOSTRA / "obras_amostra.jsonl")]
    assert cli.main(argv) == 0


def test_cli_resolve_obras_antes_de_autores(filtrada):
    """Com os dois dumps, o autor herdado da obra já sai com nome."""
    _, saida = filtrada
    _resolver_pela_cli(saida, "autores", "obras")
    resolvidos = {json.loads(l)["ol_author_key"] for l in (saida / "a.jsonl").read_text().splitlines()}
    assert "OL10000015A" in resolvidos
    assert "OL10000016A" not in resolvidos


def test_cli_recusa_autores_antes_das_obras_sem_autor(filtrada):
    _, saida = filtrada
    with pytest.raises(SystemExit, match="--dump-obras"):
        _resolver_pela_cli(saida, "autores")
    assert not (saida / "a.jsonl").exists()

    # Em duas chamadas, na ordem certa, funciona.
    _resolver_pela_cli(saida, "obras")
    _resolver_pela_cli(saida, "autores")
    assert "OL10000015A" in (saida / "a.jsonl").read_text()


def test_assuntos_saem_mapeados_e_dentro_do_teto(filtrada):
    _, saida = filtrada
    mapa = carregar_mapa_de_assuntos()
    _resolver_obras(saida, mapa)

    slugs_validos = mapa.slugs_alvo()
    por_obra = {}
    for linha in (saida / "s.jsonl").read_text(encoding="utf-8").splitlines():
        registro = json.loads(linha)
        por_obra[registro["ol_work_key"]] = registro["assuntos"]
        assert 1 <= len(registro["assuntos"]) <= 5
        assert set(registro["assuntos"]) <= slugs_validos

    # A obra com dez tags, incluindo duas que não mapeiam, sai com cinco.
    assert len(por_obra["OL20000009W"]) == 5
    assert "nonsense tag" not in por_obra["OL20000009W"]


def test_obra_sem_assunto_reconhecido_nao_gera_linha(filtrada):
    """RN-21.4: livro sem assunto reconhecido fica sem assunto."""
    _, saida = filtrada
    _resolver_obras(saida)
    chaves = {json.loads(l)["ol_work_key"] for l in (saida / "s.jsonl").read_text().splitlines()}
    assert "OL29000001W" not in chaves


def test_normalizacao_de_editora_se_aplica_na_amostra(filtrada):
    """"Editora Intrínseca" e "Rocco Ltda." chegam à carga já colapsadas."""
    _, saida = filtrada
    sinonimos = carregar_sinonimos_de_editora()
    resolvidas = set()
    for linha in (saida / "candidatos.jsonl").read_text(encoding="utf-8").splitlines():
        registro = json.loads(linha)
        editora = resolver_editora(registro["editora_nome"], sinonimos)
        if editora:
            resolvidas.add(editora[0])

    assert "Intrínseca" in resolvidas
    assert "Rocco" in resolvidas
    assert "Companhia das Letras" in resolvidas
    assert "Editora 34" in resolvidas
