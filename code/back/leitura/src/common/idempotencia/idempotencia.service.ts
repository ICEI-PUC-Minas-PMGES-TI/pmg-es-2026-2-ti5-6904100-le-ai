import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../db/drizzle.module';
import { idempotenciaLeitura } from '../../db/schema';
import type { Tx } from '../../db/tipos';
import { ChaveIdempotenciaConflitante } from '../erros-de-negocio';
import { hashDoPayload } from '../hash-payload';
import { ehViolacaoDeUnicidade } from '../pg-erros';
import type { EscopoIdempotente } from './escopo-idempotente.decorator';
import {
  INDICE_UNICO_IDEMPOTENCIA,
  JANELA_REPLAY_HORAS,
} from './idempotencia.constantes';

/** O que o handler devolve e o que fica gravado para o replay. */
export interface RespostaIdempotente<T> {
  status: number;
  corpo: T;
}

export interface ContextoIdempotente extends EscopoIdempotente {
  /** Ator autenticado: o escopo da chave é ator + método + caminho canônico. */
  subjectRef: string;
  /**
   * O que identifica o efeito: o corpo já validado e normalizado. Os parâmetros
   * de rota já estão na operação canônica. Reusar a chave com payload diferente
   * é 409.
   */
  payload: unknown;
}

/**
 * Idempotência das escritas HTTP (RNF-ERR-04), sobre `leitura.idempotencia_leitura`.
 *
 * É um serviço chamado pelo handler, **não** um interceptor. Um interceptor
 * global só enxerga a resposta depois do `return`, ou seja, fora da transação:
 * um crash entre o commit do efeito e a gravação do recibo deixaria o efeito
 * aplicado sem recibo, e a repetição da chave produziria um segundo efeito. O
 * recibo precisa ser a última operação da mesma transação, e isso obriga o
 * handler a entregar a função que roda dentro dela.
 */
@Injectable()
export class IdempotenciaService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async executar<T>(
    contexto: ContextoIdempotente,
    efeito: (tx: Tx) => Promise<RespostaIdempotente<T>>,
  ): Promise<RespostaIdempotente<T>> {
    const payloadHash = hashDoPayload(contexto.payload);

    const anterior = await this.buscarRecibo(contexto);
    if (anterior) {
      return this.replayOuConflito<T>(anterior, payloadHash);
    }

    try {
      return await this.db.transaction(async (tx) => {
        const resposta = await efeito(tx);
        await this.gravarRecibo(tx, contexto, payloadHash, resposta);
        return resposta;
      });
    } catch (erro) {
      // Duas requisições com a mesma chave passaram juntas pela leitura acima e
      // as duas executaram. O segundo INSERT bate no índice único — e, como o
      // Postgres o faz esperar a transação vencedora commitar, quando o 23505
      // chega aqui a linha vencedora já está visível. O rollback desfez o efeito
      // duplicado; basta reler e devolver o replay.
      if (!ehViolacaoDeUnicidade(erro, INDICE_UNICO_IDEMPOTENCIA)) {
        throw erro;
      }

      const vencedor = await this.buscarRecibo(contexto);
      if (!vencedor) {
        throw erro;
      }
      return this.replayOuConflito<T>(vencedor, payloadHash);
    }
  }

  private async buscarRecibo(contexto: ContextoIdempotente) {
    const [linha] = await this.db
      .select({
        statusHttp: idempotenciaLeitura.statusHttp,
        resposta: idempotenciaLeitura.resposta,
        payloadHash: idempotenciaLeitura.payloadHash,
        replayAte: idempotenciaLeitura.replayAte,
      })
      .from(idempotenciaLeitura)
      .where(
        and(
          eq(idempotenciaLeitura.subjectRef, contexto.subjectRef),
          eq(idempotenciaLeitura.operacao, contexto.operacao),
          eq(idempotenciaLeitura.chave, contexto.chave),
          isNull(idempotenciaLeitura.anonimizadoEm),
        ),
      )
      .limit(1);

    return linha ?? null;
  }

  private replayOuConflito<T>(
    recibo: {
      statusHttp: number;
      resposta: unknown;
      payloadHash: string | null;
      replayAte: Date;
    },
    payloadHash: string,
  ): RespostaIdempotente<T> {
    if (recibo.payloadHash !== payloadHash) {
      throw new ChaveIdempotenciaConflitante();
    }

    // Chave certa, payload certo, mas fora da janela de replay: reexecutar seria
    // pior do que recusar, porque a resposta original já não existe para ser
    // devolvida. O cliente gera uma chave nova.
    if (recibo.replayAte.getTime() < Date.now()) {
      throw new ChaveIdempotenciaConflitante();
    }

    return { status: recibo.statusHttp, corpo: recibo.resposta as T };
  }

  private async gravarRecibo(
    tx: Tx,
    contexto: ContextoIdempotente,
    payloadHash: string,
    resposta: RespostaIdempotente<unknown>,
  ): Promise<void> {
    await tx.insert(idempotenciaLeitura).values({
      subjectRef: contexto.subjectRef,
      operacao: contexto.operacao,
      chave: contexto.chave,
      payloadHash,
      statusHttp: resposta.status,
      // O CHECK `idempotencia_leitura_anonimizacao_ck` exige `resposta` não nula
      // em linha viva. O 204 de remoção não tem corpo, e grava `{}`.
      resposta: (resposta.corpo ?? {}) as Record<string, unknown>,
      replayAte: sql`now() + interval '${sql.raw(String(JANELA_REPLAY_HORAS))} hours'`,
    });
  }
}
