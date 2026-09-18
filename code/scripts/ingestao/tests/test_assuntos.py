"""Mapeamento de tags livres para o conjunto curado (RF-ACV-20, RN-21)."""

from leai_ingestao.assuntos import MAXIMO_POR_LIVRO, MapaDeAssuntos

CURADOS = {"ficcao-cientifica", "fantasia", "aventura", "distopia", "politica", "romance"}

MAPA = MapaDeAssuntos.de_pares(
    [
        ("science fiction", "ficcao-cientifica"),
        ("fantasy", "fantasia"),
        ("adventure stories", "aventura"),
        ("dystopias", "distopia"),
        ("politics", "politica"),
        ("love stories", "romance"),
    ],
    CURADOS,
)


def test_traduz_tag_conhecida_ignorando_caixa_acento_e_pontuacao():
    assert MAPA.mapear(["Science Fiction"]) == ["ficcao-cientifica"]
    assert MAPA.mapear(["SCIENCE-FICTION"]) == ["ficcao-cientifica"]
    assert MAPA.mapear(["  science   fiction  "]) == ["ficcao-cientifica"]


def test_descarta_tag_sem_correspondencia():
    """RN-21.3: tag sem correspondência é descartada e não cria assunto novo."""
    assert MAPA.mapear(["Bestseller", "Nonsense tag", "Fantasy"]) == ["fantasia"]


def test_livro_sem_assunto_reconhecido_e_estado_valido():
    """RN-21.4: lista vazia é resultado legítimo, não erro."""
    assert MAPA.mapear(["Uncategorized", "Miscellaneous"]) == []
    assert MAPA.mapear([]) == []
    assert MAPA.mapear(None) == []


def test_respeita_o_teto_por_livro():
    """RN-21.2: recomenda-se no máximo cinco assuntos por livro."""
    tags = ["science fiction", "fantasy", "adventure stories", "dystopias", "politics", "love stories"]
    resultado = MAPA.mapear(tags)
    assert len(resultado) == MAXIMO_POR_LIVRO
    assert resultado == ["ficcao-cientifica", "fantasia", "aventura", "distopia", "politica"]


def test_nao_repete_assunto_quando_varias_tags_apontam_para_ele():
    assert MAPA.mapear(["Science Fiction", "science fiction", "SCIENCE FICTION"]) == [
        "ficcao-cientifica"
    ]


def test_ignora_item_que_nao_e_texto():
    assert MAPA.mapear(["Fantasy", None, 42, {"key": "x"}]) == ["fantasia"]


def test_denuncia_slug_fora_do_conjunto_curado():
    mapa = MapaDeAssuntos.de_pares([("x", "inexistente")], CURADOS)
    assert mapa.slugs_desconhecidos() == {"inexistente"}
