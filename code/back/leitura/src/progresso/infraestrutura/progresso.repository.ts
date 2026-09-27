import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, max, sql } from 'drizzle-orm';
import type { DrizzleDB } from '../../db/drizzle.module';
import { atualizacaoProgresso, leitura } from '../../db/schema';
import type { Tx } from '../../db/tipos';

type Executor = DrizzleDB | Tx;

export type LeituraDoProgresso = Pick<
  typeof leitura.$inferSelect,
  'id' | 'usuarioId' | 'livroId' | 'status' | 'paginaAtual'
>;

export type ProgressoRegistro = typeof atualizacaoProgresso.$inferSelect;

export interface NovoProgresso {
  leituraId: string;
  ordem: number;
  pagina: number;
  paginasLidas: number;
  minutos: number;
  registradoEmDispositivo: Date;
  fusoHorarioDispositivo: string;
  dataLocal: string;
  chaveIdempotencia: string;
}

export interface CorrecaoDoProgresso {
  pagina: number;
  paginasLidas: number;
  minutos: number;
}

const colunasLeitura = {
  id: leitura.id,
  usuarioId: leitura.usuarioId,
  livroId: leitura.livroId,
  status: leitura.status,
  paginaAtual: leitura.paginaAtual,
};

@Injectable()
export class ProgressoRepository {
  async buscarLeituraDoUsuario(
    executor: Executor,
    leituraId: string,
    usuarioId: string,
  ): Promise<LeituraDoProgresso | null> {
    const [linha] = await executor
      .select(colunasLeitura)
      .from(leitura)
      .where(and(eq(leitura.id, leituraId), eq(leitura.usuarioId, usuarioId)))
      .limit(1);
    return linha ?? null;
  }

  async bloquearLeituraDoUsuario(
    tx: Tx,
    leituraId: string,
    usuarioId: string,
  ): Promise<LeituraDoProgresso | null> {
    const [linha] = await tx
      .select(colunasLeitura)
      .from(leitura)
      .where(and(eq(leitura.id, leituraId), eq(leitura.usuarioId, usuarioId)))
      .for('update');
    return linha ?? null;
  }

  async buscarLeituraIdDoProgresso(
    executor: Executor,
    progressoId: string,
    usuarioId: string,
  ): Promise<string | null> {
    const [linha] = await executor
      .select({ leituraId: atualizacaoProgresso.leituraId })
      .from(atualizacaoProgresso)
      .innerJoin(leitura, eq(leitura.id, atualizacaoProgresso.leituraId))
      .where(
        and(
          eq(atualizacaoProgresso.id, progressoId),
          eq(leitura.usuarioId, usuarioId),
        ),
      )
      .limit(1);
    return linha?.leituraId ?? null;
  }

  async existeChave(tx: Tx, chaveIdempotencia: string): Promise<boolean> {
    const [linha] = await tx
      .select({ id: atualizacaoProgresso.id })
      .from(atualizacaoProgresso)
      .where(eq(atualizacaoProgresso.chaveIdempotencia, chaveIdempotencia))
      .limit(1);
    return linha !== undefined;
  }

  async maiorOrdem(tx: Tx, leituraId: string): Promise<number> {
    const [linha] = await tx
      .select({ ordem: max(atualizacaoProgresso.ordem) })
      .from(atualizacaoProgresso)
      .where(eq(atualizacaoProgresso.leituraId, leituraId));
    return linha?.ordem ?? 0;
  }

  listarDaLeitura(tx: Tx, leituraId: string): Promise<ProgressoRegistro[]> {
    return tx
      .select()
      .from(atualizacaoProgresso)
      .where(eq(atualizacaoProgresso.leituraId, leituraId))
      .orderBy(asc(atualizacaoProgresso.ordem));
  }

  async listarPagina(
    executor: Executor,
    leituraId: string,
    offset: number,
    limite: number,
  ): Promise<{ linhas: ProgressoRegistro[]; totalItens: number }> {
    const [linhas, [total]] = await Promise.all([
      executor
        .select()
        .from(atualizacaoProgresso)
        .where(eq(atualizacaoProgresso.leituraId, leituraId))
        .orderBy(desc(atualizacaoProgresso.ordem))
        .limit(limite)
        .offset(offset),
      executor
        .select({ totalItens: count() })
        .from(atualizacaoProgresso)
        .where(eq(atualizacaoProgresso.leituraId, leituraId)),
    ]);
    return { linhas, totalItens: total?.totalItens ?? 0 };
  }

  async inserir(tx: Tx, dados: NovoProgresso): Promise<ProgressoRegistro> {
    const [linha] = await tx
      .insert(atualizacaoProgresso)
      .values(dados)
      .returning();
    return linha;
  }

  async corrigir(
    tx: Tx,
    progressoId: string,
    correcao: CorrecaoDoProgresso,
  ): Promise<ProgressoRegistro> {
    const [linha] = await tx
      .update(atualizacaoProgresso)
      .set({ ...correcao, atualizadoEm: sql`now()` })
      .where(eq(atualizacaoProgresso.id, progressoId))
      .returning();
    return linha;
  }

  async excluir(tx: Tx, progressoIds: string[]): Promise<void> {
    await tx
      .delete(atualizacaoProgresso)
      .where(inArray(atualizacaoProgresso.id, progressoIds));
  }

  async registrarAtividade(
    tx: Tx,
    leituraId: string,
    paginaAtual: number,
  ): Promise<void> {
    await tx
      .update(leitura)
      .set({
        paginaAtual,
        ultimaAtividadeEm: sql`now()`,
        inatividadeVersao: sql`${leitura.inatividadeVersao} + 1`,
      })
      .where(eq(leitura.id, leituraId));
  }
}
