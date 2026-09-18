"""Normalização de autor, editora e série na ingestão (RN-12).

RN-12 é explícito sobre editora: "normaliza (minúsculas, remoção de pontuação e
de sufixos societários) e aplica tabela de sinônimos mantida pelo grupo", e cita
"Intrinseca"/"Intrínseca" como o par que a tabela resolve. Isso fixa uma decisão
que não é óbvia: **a normalização de editora não remove acentos**. Se removesse,
as duas grafias colapsariam sozinhas e o exemplo da regra não faria sentido.
Série segue a editora, porque RN-12 diz "normalizada da mesma forma".

Autor é o caso oposto: não tem tabela de sinônimos, e sua forma normalizada é
chave de deduplicação pura, nunca exibida (`autor.nome` guarda a forma de
exibição). Por isso `normalizar_nome_autor` **remove** acentos — sem isso,
"José Saramago" e "Jose Saramago" viram dois autores.
"""

from __future__ import annotations

import re
import unicodedata

# Formas societárias que aparecem no fim do nome e não fazem parte da marca.
_SUFIXOS_SOCIETARIOS = {
    "ltda", "limitada", "sa", "s a", "eireli", "me", "epp", "mei",
    "inc", "ltd", "llc", "gmbh", "bv", "srl", "plc", "co",
}

# Palavras de ramo que emolduram o nome sem identificar a editora. Removidas só
# do INÍCIO: no fim elas costumam ser parte da marca, e cortá-las estragaria
# "Globo Livros", "Universo dos Livros" e "Geração Editorial". No início são
# moldura: "Editora Rocco" é Rocco. "Editora 34" vira "34", e é a tabela de
# sinônimos que devolve o nome de marca.
_PALAVRAS_DE_RAMO = {
    "editora", "editoras", "editorial", "edicoes", "edições", "edicao", "edição",
    "publishers", "publisher", "publishing", "publicacoes", "publicações",
    "press", "books", "book", "livros", "editores", "editor",
}

_PONTUACAO = re.compile(r"[^\w\s]", flags=re.UNICODE)
_ESPACOS = re.compile(r"\s+")


def remover_acentos(texto: str) -> str:
    """Decompõe e descarta os diacríticos, preservando as letras base."""
    decomposto = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in decomposto if not unicodedata.combining(c))


def _base(texto: str) -> str:
    """Minúsculas, sem pontuação, espaços colapsados. Acentos preservados."""
    sem_pontuacao = _PONTUACAO.sub(" ", texto.casefold())
    return _ESPACOS.sub(" ", sem_pontuacao).strip()


def _remover_nas_pontas(tokens: list[str], descartaveis: set[str]) -> list[str]:
    """Remove tokens descartáveis do início e do fim, nunca do miolo.

    O miolo importa: "Companhia das Letras" tem que sobreviver inteira.
    """
    inicio, fim = 0, len(tokens)
    while inicio < fim and tokens[inicio] in descartaveis:
        inicio += 1
    while fim > inicio and tokens[fim - 1] in descartaveis:
        fim -= 1
    return tokens[inicio:fim]


def _remover_no_inicio(tokens: list[str], descartaveis: set[str]) -> list[str]:
    """Remove tokens descartáveis apenas do início."""
    inicio = 0
    while inicio < len(tokens) and tokens[inicio] in descartaveis:
        inicio += 1
    return tokens[inicio:]


def normalizar_nome(texto: str | None) -> str:
    """Forma normalizada de um nome livre. Base de editora e série (RN-12)."""
    if not texto:
        return ""
    return _base(texto)


def normalizar_editora(texto: str | None) -> str:
    """Forma normalizada da editora: base + sufixo societário + palavra de ramo.

    É a chave de `acervo.editora.nome_normalizado` (índice único) e a chave de
    busca em `acervo.sinonimo_editora.forma_externa`.
    """
    base = normalizar_nome(texto)
    if not base:
        return ""

    tokens = base.split(" ")
    tokens = _remover_nas_pontas(tokens, _SUFIXOS_SOCIETARIOS)
    candidato = _remover_no_inicio(tokens, _PALAVRAS_DE_RAMO)

    # "Editora" sozinha não vira string vazia: sem nada para identificar a
    # editora, é melhor manter o que veio do que inventar uma entidade anônima.
    return " ".join(candidato) if candidato else " ".join(tokens)


def normalizar_serie(texto: str | None) -> str:
    """Forma normalizada da série. RN-12: "normalizada da mesma forma"."""
    return normalizar_nome(texto)


def normalizar_nome_autor(texto: str | None) -> str:
    """Chave de deduplicação do autor: base + remoção de acentos (RN-12)."""
    base = normalizar_nome(texto)
    return remover_acentos(base)


def normalizar_tag(texto: str | None) -> str:
    """Chave de busca em `acervo.mapa_assunto_externo` (RN-21.3).

    Tags da origem são livres, majoritariamente em inglês e cheias de variação
    de caixa e pontuação. Aqui acento some: a tag nunca é exibida, só casada.
    """
    return remover_acentos(normalizar_nome(texto))


def slugificar(texto: str | None) -> str:
    """Slug ASCII para `acervo.assunto.slug`.

    O CHECK `assunto_slug_formato_ck` exige `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
    """
    base = remover_acentos(normalizar_nome(texto))
    base = re.sub(r"[^a-z0-9]+", "-", base)
    return base.strip("-")


def extrair_numero_da_serie(texto: str | None) -> int | None:
    """Número de ordem opcional embutido na série (RN-12).

    A origem escreve a série como texto livre com o volume dentro
    ("Harry Potter, #3", "Duna 2"). O CHECK `livro_numero_serie_ck` exige
    positivo, então zero e negativo são descartados.
    """
    if not texto:
        return None
    encontrados = re.findall(r"\d+", texto)
    if not encontrados:
        return None
    numero = int(encontrados[-1])
    return numero if numero > 0 else None


def nome_da_serie_sem_numero(texto: str | None) -> str:
    """Nome da série sem o volume, para não criar uma série por volume."""
    if not texto:
        return ""
    sem_numero = re.sub(r"[,;]?\s*#?\s*\d+\s*$", "", texto.strip())
    return sem_numero.strip() or texto.strip()
