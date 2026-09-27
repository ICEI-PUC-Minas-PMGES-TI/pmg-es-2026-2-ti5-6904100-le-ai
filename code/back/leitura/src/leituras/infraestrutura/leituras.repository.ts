import { Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { DrizzleDB } from '../../db/drizzle.module';
import { estante, leitura } from '../../db/schema';
import type { Tx } from '../../db/tipos';
import type { StatusEstante, StatusLeitura } from '../dominio/maquina-estados';

type Executor = DrizzleDB | Tx;

export type LeituraRegistro = typeof leitura.$inferSelect;

export interface EstanteRegistro {
  id: string;
  usuarioId: string;
  livroId: string;
  status: StatusEstante;
  vezesLido: number;
}

const colunasEstante = {
  id: estante.id,
  usuarioId: estante.usuarioId,
  livroId: estante.livroId,
  status: estante.status,
  vezesLido: estante.vezesLido,
};

export interface NovaLeitura {
  estanteId: string;
  usuarioId: string;
  livroId: string;
  releitura: boolean;
  dataInicio: string;
  ultimaAtividadeEm: Date;
}

export interface MudancaDeLeitura {
  status: StatusLeitura;
  incompleta?: boolean;
  dataFim?: string;
  finalizadaEm?: Date;
  finalizacaoFusoHorario?: string;
  finalizacaoDataLocal?: string;
  ultimaAtividadeEm?: Date;
  novoCicloDeInatividade?: boolean;
}

@Injectable()
export class LeiturasRepository {
  async garantirEstante(
    tx: Tx,
    usuarioId: string,
    livroId: string,
  ): Promise<void> {
    await tx
      .insert(estante)
      .values({ usuarioId, livroId, status: 'quero_ler' })
      .onConflictDoNothing({ target: [estante.usuarioId, estante.livroId] });
  }

  async bloquearEstante(
    tx: Tx,
    usuarioId: string,
    livroId: string,
  ): Promise<EstanteRegistro | null> {
    const [linha] = await tx
      .select(colunasEstante)
      .from(estante)
      .where(
        and(eq(estante.usuarioId, usuarioId), eq(estante.livroId, livroId)),
      )
      .for('update');
    return (linha as EstanteRegistro | undefined) ?? null;
  }

  async bloquearEstantePorId(
    tx: Tx,
    estanteId: string,
  ): Promise<EstanteRegistro | null> {
    const [linha] = await tx
      .select(colunasEstante)
      .from(estante)
      .where(eq(estante.id, estanteId))
      .for('update');
    return (linha as EstanteRegistro | undefined) ?? null;
  }

  async bloquearLeituraMaisRecente(
    tx: Tx,
    estanteId: string,
  ): Promise<LeituraRegistro | null> {
    const [linha] = await tx
      .select()
      .from(leitura)
      .where(eq(leitura.estanteId, estanteId))
      .orderBy(desc(leitura.criadoEm), desc(leitura.id))
      .limit(1)
      .for('update');
    return linha ?? null;
  }

  async buscarLeitura(
    executor: Executor,
    leituraId: string,
  ): Promise<LeituraRegistro | null> {
    const [linha] = await executor
      .select()
      .from(leitura)
      .where(eq(leitura.id, leituraId))
      .limit(1);
    return linha ?? null;
  }

  async buscarLeituraDoUsuario(
    executor: Executor,
    leituraId: string,
    usuarioId: string,
  ): Promise<{ leitura: LeituraRegistro; vezesLido: number } | null> {
    const [linha] = await executor
      .select({ leitura, vezesLido: estante.vezesLido })
      .from(leitura)
      .innerJoin(estante, eq(estante.id, leitura.estanteId))
      .where(and(eq(leitura.id, leituraId), eq(leitura.usuarioId, usuarioId)))
      .limit(1);
    return linha ?? null;
  }

  async inserirLeitura(tx: Tx, dados: NovaLeitura): Promise<LeituraRegistro> {
    const [linha] = await tx
      .insert(leitura)
      .values({ ...dados, status: 'lendo' })
      .returning();
    return linha;
  }

  async atualizarLeitura(
    tx: Tx,
    leituraId: string,
    { novoCicloDeInatividade, ...campos }: MudancaDeLeitura,
  ): Promise<LeituraRegistro> {
    const [linha] = await tx
      .update(leitura)
      .set({
        ...campos,
        ...(novoCicloDeInatividade
          ? { inatividadeVersao: sql`${leitura.inatividadeVersao} + 1` }
          : {}),
      })
      .where(eq(leitura.id, leituraId))
      .returning();
    return linha;
  }

  async atualizarEstante(
    tx: Tx,
    estanteId: string,
    status: StatusEstante,
    deltaVezesLido: number,
  ): Promise<EstanteRegistro> {
    const [linha] = await tx
      .update(estante)
      .set({
        status,
        vezesLido: sql`${estante.vezesLido} + ${deltaVezesLido}`,
        atualizadoEm: new Date(),
      })
      .where(eq(estante.id, estanteId))
      .returning(colunasEstante);
    return linha as EstanteRegistro;
  }
}
