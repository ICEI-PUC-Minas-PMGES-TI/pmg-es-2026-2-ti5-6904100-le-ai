"""Registro de cada carga em `acervo.ingestao_execucao`.

A tabela tem CHECKs que amarram status e totais, e valem como contrato:

- `ingestao_execucao_tipo_ck`: só `carga_inicial` e `recarga`. Não há delta — o
  grupo removeu delta automático do escopo em 15/09/2026.
- `ingestao_execucao_totais_ck`: `descartados + inseridos <= processados`.
- `ingestao_execucao_finalizacao_ck`: `em_execucao` exige `finalizado_em` nulo;
  `concluida` e `falha` exigem `finalizado_em` preenchido e não anterior ao
  início.

Falha não some: a execução é fechada com `status='falha'` e os totais do que
chegou a acontecer, para que uma carga interrompida apareça como interrompida em
vez de sumir do histórico.
"""

from __future__ import annotations

from contextlib import contextmanager

TIPO_CARGA_INICIAL = "carga_inicial"
TIPO_RECARGA = "recarga"


def abrir(conexao, tipo: str = TIPO_CARGA_INICIAL) -> str:
    """Abre a execução e devolve o id. Commit imediato: se a carga morrer no
    meio, a linha `em_execucao` continua no banco como evidência."""
    if tipo not in (TIPO_CARGA_INICIAL, TIPO_RECARGA):
        raise ValueError(f"tipo de execução inválido: {tipo!r}")

    with conexao.cursor() as cursor:
        cursor.execute(
            "INSERT INTO acervo.ingestao_execucao (tipo) VALUES (%s) RETURNING id",
            (tipo,),
        )
        execucao_id = cursor.fetchone()[0]
    conexao.commit()
    return execucao_id


def fechar(conexao, execucao_id: str, *, status: str, processados: int, descartados: int, inseridos: int) -> None:
    """Fecha a execução respeitando `ingestao_execucao_totais_ck`."""
    if status not in ("concluida", "falha"):
        raise ValueError(f"status de fechamento inválido: {status!r}")

    # O CHECK recusaria a linha; truncar aqui dá uma mensagem melhor do que um
    # 23514 vindo do banco no fim de uma carga longa.
    processados = max(processados, descartados + inseridos)

    with conexao.cursor() as cursor:
        cursor.execute(
            """
            UPDATE acervo.ingestao_execucao
               SET status = %s,
                   total_processados = %s,
                   total_descartados = %s,
                   total_inseridos = %s,
                   finalizado_em = now()
             WHERE id = %s
            """,
            (status, processados, descartados, inseridos, execucao_id),
        )
    conexao.commit()


@contextmanager
def registrada(conexao, tipo: str = TIPO_CARGA_INICIAL):
    """Abre a execução, entrega um acumulador e fecha com o status certo.

    Uso:
        with registrada(conexao) as execucao:
            execucao.processados = resumo.lidos
            execucao.inseridos = totais.livros
    """

    class Acumulador:
        def __init__(self, execucao_id: str):
            self.id = execucao_id
            self.processados = 0
            self.descartados = 0
            self.inseridos = 0

    execucao_id = abrir(conexao, tipo)
    acumulador = Acumulador(execucao_id)
    try:
        yield acumulador
    except BaseException:
        fechar(
            conexao,
            execucao_id,
            status="falha",
            processados=acumulador.processados,
            descartados=acumulador.descartados,
            inseridos=acumulador.inseridos,
        )
        raise
    else:
        fechar(
            conexao,
            execucao_id,
            status="concluida",
            processados=acumulador.processados,
            descartados=acumulador.descartados,
            inseridos=acumulador.inseridos,
        )
