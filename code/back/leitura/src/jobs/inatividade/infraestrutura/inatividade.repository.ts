import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, lt } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../../db/drizzle.module';
import { leitura, limiarInatividade } from '../../../db/schema';
import type { Tx } from '../../../db/tipos';
import type { TipoLimiar } from '../../../leituras/dominio/maquina-estados';

const STATUS_EM_ANDAMENTO = 'lendo';

export interface LeituraEmAndamento {
  id: string;
  usuarioId: string;
  livroId: string;
  dataInicio: string;
  ultimaAtividadeEm: Date;
  inatividadeVersao: number;
}

export interface NovoLimiar {
  leituraId: string;
  inatividadeVersao: number;
  limiarDias: number;
  tipo: TipoLimiar;
  eventId: string;
}

const COLUNAS = {
  id: leitura.id,
  usuarioId: leitura.usuarioId,
  livroId: leitura.livroId,
  dataInicio: leitura.dataInicio,
  ultimaAtividadeEm: leitura.ultimaAtividadeEm,
  inatividadeVersao: leitura.inatividadeVersao,
};

@Injectable()
export class InatividadeRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Ids das leituras em andamento cuja última atividade é anterior a `limite`. Usa o índice
   * `leitura_inatividade_idx (status, ultima_atividade_em)`; o estado é relido
   * com lock em `bloquearEmAndamento`.
   */
  async idsInativosAntesDe(limite: Date): Promise<string[]> {
    const linhas = await this.db
      .select({ id: leitura.id })
      .from(leitura)
      .where(
        and(
          eq(leitura.status, STATUS_EM_ANDAMENTO),
          lt(leitura.ultimaAtividadeEm, limite),
        ),
      )
      .orderBy(asc(leitura.ultimaAtividadeEm));
    return linhas.map(({ id }) => id);
  }

  /**
   * Relê e trava a leitura. Uma atividade concorrente espera o job terminar, e
   * uma leitura que deixou de estar em andamento desde a varredura é ignorada.
   */
  async bloquearEmAndamento(
    tx: Tx,
    leituraId: string,
  ): Promise<LeituraEmAndamento | null> {
    const [linha] = await tx
      .select(COLUNAS)
      .from(leitura)
      .where(
        and(eq(leitura.id, leituraId), eq(leitura.status, STATUS_EM_ANDAMENTO)),
      )
      .for('update');
    return linha ?? null;
  }

  /**
   * Registra o limiar do ciclo. `false` quando já existia: a UK
   * `(leitura_id, inatividade_versao, limiar_dias)` é a deduplicação semântica
   * do job, independente da `Idempotency-Key`.
   */
  async registrarLimiar(tx: Tx, limiar: NovoLimiar): Promise<boolean> {
    const inseridas = await tx
      .insert(limiarInatividade)
      .values(limiar)
      .onConflictDoNothing({
        target: [
          limiarInatividade.leituraId,
          limiarInatividade.inatividadeVersao,
          limiarInatividade.limiarDias,
        ],
      })
      .returning({ id: limiarInatividade.id });
    return inseridas.length > 0;
  }
}
