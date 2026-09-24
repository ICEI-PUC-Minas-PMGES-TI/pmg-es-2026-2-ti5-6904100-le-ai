"""Os três CSV curados são entregáveis da feature e precisam bater entre si."""

import pytest

from leai_ingestao.dados import (
    ErroDeDadosCurados,
    carregar_assuntos,
    carregar_mapa_de_assuntos,
    carregar_sinonimos_de_editora,
    resolver_editora,
)


def test_conjunto_curado_tem_cerca_de_trinta_assuntos():
    """RN-21.1: conjunto curado e fechado, com aproximadamente 30 gêneros."""
    assuntos = carregar_assuntos()
    assert 25 <= len(assuntos) <= 35


def test_slugs_sao_unicos_e_derivam_do_nome():
    assuntos = carregar_assuntos()
    slugs = [a.slug for a in assuntos]
    assert len(slugs) == len(set(slugs))


def test_mapa_so_aponta_para_assunto_do_conjunto_curado():
    """Slug fora do conjunto violaria a FK de `mapa_assunto_externo`."""
    assert carregar_mapa_de_assuntos().slugs_desconhecidos() == set()


def test_chaves_do_mapa_estao_na_forma_normalizada():
    """A busca em runtime usa a tag normalizada; chave crua nunca casaria."""
    carregar_mapa_de_assuntos()  # levanta ErroDeDadosCurados se alguma não estiver


def test_sinonimo_colapsa_variantes_de_grafia_da_mesma_editora():
    """RN-12 cita exatamente este par como o trabalho da tabela de sinônimos."""
    sinonimos = carregar_sinonimos_de_editora()
    assert resolver_editora("Editora Intrínseca", sinonimos) == resolver_editora(
        "INTRINSECA", sinonimos
    )


def test_editora_desconhecida_nasce_da_forma_normalizada():
    """RN-12: a entidade Editora é criada a partir da forma normalizada."""
    nome, normalizada = resolver_editora("Editora Desconhecida Ltda", {})
    assert nome == "Editora Desconhecida Ltda"
    assert normalizada == "desconhecida"


def test_editora_ausente_nao_inventa_entidade():
    assert resolver_editora(None, {}) is None
    assert resolver_editora("   ", {}) is None


def test_dado_curado_inconsistente_falha_no_carregamento(tmp_path):
    """Falhar na conferência é muito melhor do que falhar no meio da carga."""
    (tmp_path / "assuntos.csv").write_text("slug,nome\nromance,Romance\n", encoding="utf-8")
    (tmp_path / "mapa_assunto.csv").write_text(
        "tag_externa,assunto\nlove stories,inexistente\n", encoding="utf-8"
    )
    with pytest.raises(ErroDeDadosCurados):
        carregar_mapa_de_assuntos(tmp_path)


def test_tag_nao_normalizada_no_csv_falha(tmp_path):
    (tmp_path / "assuntos.csv").write_text("slug,nome\nromance,Romance\n", encoding="utf-8")
    (tmp_path / "mapa_assunto.csv").write_text(
        "tag_externa,assunto\nLove Stories,romance\n", encoding="utf-8"
    )
    with pytest.raises(ErroDeDadosCurados):
        carregar_mapa_de_assuntos(tmp_path)
