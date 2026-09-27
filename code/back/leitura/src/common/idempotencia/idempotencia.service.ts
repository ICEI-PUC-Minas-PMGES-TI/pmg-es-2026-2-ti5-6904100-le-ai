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

export interface RespostaIdempotente<T> {
  status: number;
  corpo: T;
}

export interface ContextoIdempotente extends EscopoIdempotente {
  subjectRef: string;
  payload: unknown;
}

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
      resposta: (resposta.corpo ?? {}) as Record<string, unknown>,
      replayAte: sql`now() + interval '${sql.raw(String(JANELA_REPLAY_HORAS))} hours'`,
    });
  }
}
