"""Mapeamento de tags livres da origem para o conjunto curado (RF-ACV-20, RN-21).

A origem entrega dezenas de tags por obra, misturando gênero, tema, público e
rótulo comercial. RN-21 fecha o conjunto em ~30 gêneros definidos pelo grupo e
manda **descartar o que não mapeia**: tag sem correspondência não cria assunto
novo, e livro sem nenhum assunto reconhecido é estado válido (RN-21.4).
"""

from __future__ import annotations

from .normalizacao import normalizar_tag

# RN-21.2: "recomenda-se no máximo cinco por livro para preservar a utilidade do
# filtro". Não é limite rígido do modelo, é política da carga.
MAXIMO_POR_LIVRO = 5


class MapaDeAssuntos:
    """Tabela `tag externa normalizada -> slug do assunto curado`.

    Espelha `acervo.mapa_assunto_externo`. A versão em CSV é a fonte versionada;
    a tabela no banco é a fonte de runtime, lida também pelo importador por ISBN
    do serviço `acervo` — os dados de normalização não ficam duplicados entre as
    duas linguagens, só as funções.
    """

    def __init__(self, mapa: dict[str, str], slugs_validos: set[str] | None = None):
        self._mapa = mapa
        self._slugs_validos = slugs_validos

    @classmethod
    def de_pares(cls, pares, slugs_validos=None) -> "MapaDeAssuntos":
        mapa: dict[str, str] = {}
        for tag_externa, slug in pares:
            chave = normalizar_tag(tag_externa)
            if chave:
                mapa[chave] = slug
        return cls(mapa, set(slugs_validos) if slugs_validos else None)

    def __len__(self) -> int:
        return len(self._mapa)

    def slugs_alvo(self) -> set[str]:
        """Todos os slugs que este mapa pode produzir."""
        return set(self._mapa.values())

    def slugs_desconhecidos(self) -> set[str]:
        """Slugs referenciados pelo mapa que não existem no conjunto curado.

        Erro de dado, não de execução: a FK `mapa_assunto_externo_assunto_id_fk`
        recusaria a linha no `semear`, e é melhor falhar na conferência do CSV
        do que no meio de uma carga de horas.
        """
        if self._slugs_validos is None:
            return set()
        return {s for s in self._mapa.values() if s not in self._slugs_validos}

    def mapear(self, tags, maximo: int = MAXIMO_POR_LIVRO) -> list[str]:
        """Traduz as tags da origem em slugs curados, na ordem de aparição.

        Descarta o que não mapeia (RN-21.3), remove repetição e corta no teto.
        Lista vazia é resultado legítimo.
        """
        reconhecidos: list[str] = []
        for tag in tags or []:
            if not isinstance(tag, str):
                continue
            slug = self._mapa.get(normalizar_tag(tag))
            if slug and slug not in reconhecidos:
                reconhecidos.append(slug)
                if len(reconhecidos) >= maximo:
                    break
        return reconhecidos
