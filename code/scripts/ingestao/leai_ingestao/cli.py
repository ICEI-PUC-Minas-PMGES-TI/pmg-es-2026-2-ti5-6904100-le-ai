"""Linha de comando da carga inicial (F-ACV-INGESTAO).

Quatro subcomandos, na ordem em que se usa:

    semear    popula os dados curados versionados no schema `acervo`
    filtrar   fase 1: seleciona edições elegíveis do dump (RN-12)
    resolver  fase 2: resolve nome de autor e assuntos da obra (RN-21)
    carregar  fase 3: COPY para staging e upsert nas tabelas reais

`conferir` existe à parte e não toca o banco: valida os três CSV curados entre
si. É o que o CI roda, junto dos testes.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import carga as carga_mod
from . import execucao as execucao_mod
from . import pipeline
from .dados import (
    DIRETORIO_PADRAO,
    ErroDeDadosCurados,
    carregar_assuntos,
    carregar_mapa_de_assuntos,
    carregar_sinonimos_de_editora,
)


def _url_do_banco(args) -> str:
    import os

    url = args.database_url or os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit(
            "DATABASE_URL não informada. Use --database-url ou a variável de ambiente.\n"
            "Segredo nunca é versionado (RNF-SEC-11)."
        )
    return url


def comando_conferir(args) -> int:
    """Valida os dados curados sem tocar o banco."""
    try:
        assuntos = carregar_assuntos(args.dados)
        sinonimos = carregar_sinonimos_de_editora(args.dados)
        mapa = carregar_mapa_de_assuntos(args.dados)
    except ErroDeDadosCurados as erro:
        print(f"dados curados inconsistentes: {erro}", file=sys.stderr)
        return 1

    print(
        f"assuntos={len(assuntos)} sinonimos_editora={len(sinonimos)} mapa_assunto={len(mapa)}"
    )
    if not 25 <= len(assuntos) <= 35:
        print(
            f"aviso: RN-21.1 fala em aproximadamente 30 assuntos, e há {len(assuntos)}.",
            file=sys.stderr,
        )
    return 0


def comando_semear(args) -> int:
    assuntos = carregar_assuntos(args.dados)
    sinonimos = carregar_sinonimos_de_editora(args.dados)
    mapa = carregar_mapa_de_assuntos(args.dados)

    import csv

    with open(Path(args.dados or DIRETORIO_PADRAO) / "mapa_assunto.csv", encoding="utf-8") as f:
        pares = [(l["tag_externa"], l["assunto"]) for l in csv.DictReader(f)]

    with carga_mod.conectar(_url_do_banco(args)) as conexao:
        contagem = carga_mod.semear(conexao, assuntos, sinonimos, pares)

    print(json.dumps(contagem, ensure_ascii=False))
    return 0


def comando_filtrar(args) -> int:
    resumo = pipeline.filtrar(
        args.dump,
        args.saida,
        args.saida_chaves,
        formato=args.formato,
        limite=args.limite,
    )
    print(json.dumps(resumo.como_dict(), ensure_ascii=False, indent=2))
    return 0


def comando_resolver(args) -> int:
    autores, obras = pipeline.carregar_chaves(args.chaves)
    resultado = {}

    if args.dump_autores:
        resultado["autores"] = pipeline.resolver_autores(
            args.dump_autores, autores, args.saida_autores, formato=args.formato
        )
    if args.dump_obras:
        resultado["obras_com_assunto"] = pipeline.resolver_assuntos(
            args.dump_obras,
            obras,
            carregar_mapa_de_assuntos(args.dados),
            args.saida_assuntos,
            formato=args.formato,
        )

    print(json.dumps(resultado, ensure_ascii=False, indent=2))
    return 0


def comando_carregar(args) -> int:
    sinonimos = carregar_sinonimos_de_editora(args.dados)

    with carga_mod.conectar(_url_do_banco(args)) as conexao:
        with execucao_mod.registrada(conexao, args.tipo) as execucao:
            execucao.processados = args.processados or 0
            execucao.descartados = args.descartados or 0
            totais = carga_mod.carregar(
                conexao,
                args.candidatos,
                args.autores,
                args.assuntos,
                sinonimos,
                limite=args.limite,
            )
            execucao.inseridos = totais.livros

        print(json.dumps({"execucao": execucao.id, **totais.como_dict()}, ensure_ascii=False, indent=2))

        # RNF-DES-04 (teto de 20% do plano) e RNF-DES-05 (índice é o custo
        # dominante): imprime o número para a Timeline da feature registrar.
        print("\ntabela                          dados      índices", file=sys.stderr)
        for nome, dados, indices in carga_mod.medir_armazenamento(conexao):
            print(f"{nome:28} {dados/1048576:9.1f}MB {indices/1048576:9.1f}MB", file=sys.stderr)

    return 0


def construir_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="leai_ingestao",
        description="Carga inicial da base oficial a partir do data dump do OpenLibrary "
        "(RF-ACV-13, RF-ACV-20).",
    )
    parser.add_argument("--dados", type=Path, default=None, help="diretório dos CSV curados")
    sub = parser.add_subparsers(dest="comando", required=True)

    p = sub.add_parser("conferir", help="valida os dados curados, sem banco")
    p.set_defaults(func=comando_conferir)

    p = sub.add_parser("semear", help="popula assunto, sinonimo_editora e mapa_assunto_externo")
    p.add_argument("--database-url")
    p.set_defaults(func=comando_semear)

    p = sub.add_parser("filtrar", help="fase 1: seleciona edições elegíveis do dump")
    p.add_argument("--dump", type=Path, required=True)
    p.add_argument("--saida", type=Path, default=Path("trabalho/candidatos.jsonl"))
    p.add_argument("--saida-chaves", type=Path, default=Path("trabalho/chaves.json"))
    p.add_argument("--formato", choices=("auto", "tsv", "jsonl"), default="auto")
    p.add_argument("--limite", type=int, default=None, help="teto de edições aceitas (RNF-DES-04)")
    p.set_defaults(func=comando_filtrar)

    p = sub.add_parser("resolver", help="fase 2: resolve nomes de autor e assuntos da obra")
    p.add_argument("--chaves", type=Path, default=Path("trabalho/chaves.json"))
    p.add_argument("--dump-autores", type=Path, default=None)
    p.add_argument("--dump-obras", type=Path, default=None)
    p.add_argument("--saida-autores", type=Path, default=Path("trabalho/autores.jsonl"))
    p.add_argument("--saida-assuntos", type=Path, default=Path("trabalho/assuntos.jsonl"))
    p.add_argument("--formato", choices=("auto", "tsv", "jsonl"), default="auto")
    p.set_defaults(func=comando_resolver)

    p = sub.add_parser("carregar", help="fase 3: COPY para staging e upsert no schema acervo")
    p.add_argument("--database-url")
    p.add_argument("--candidatos", type=Path, default=Path("trabalho/candidatos.jsonl"))
    p.add_argument("--autores", type=Path, default=Path("trabalho/autores.jsonl"))
    p.add_argument("--assuntos", type=Path, default=Path("trabalho/assuntos.jsonl"))
    p.add_argument("--tipo", choices=("carga_inicial", "recarga"), default="carga_inicial")
    p.add_argument("--limite", type=int, default=None)
    p.add_argument("--processados", type=int, default=None, help="total lido na fase 1")
    p.add_argument("--descartados", type=int, default=None, help="total descartado na fase 1")
    p.set_defaults(func=comando_carregar)

    return parser


def main(argv: list[str] | None = None) -> int:
    args = construir_parser().parse_args(argv)
    return args.func(args)
