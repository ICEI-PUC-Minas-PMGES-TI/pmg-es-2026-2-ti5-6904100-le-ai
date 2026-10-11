import { Inject, Injectable } from '@nestjs/common';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../db/drizzle.module';
import {
  atualizacaoProgresso,
  diaLeitura,
  leitura,
  sequenciaLeitura,
} from '../db/schema';
import type { Tx } from '../db/tipos';
import type { EstadoSequencia } from './dominio/sequencia';

export interface UltimoFuso {
  fusoHorario: string;
  registradoEm: Date;
}

export interface NovaSequencia {
  sequenciaAtual: number;
  maiorSequencia: number;
  ultimoDia: string;
  ultimoFusoHorario: string;
  ultimoFusoRegistradoEm: Date;
}

/**
 * Dias com leitura e sequência (F-GAM), só do schema `leitura`. Toda leitura
 * dos progressos passa pela `leitura` dona deles, filtrando pelo usuário
 * (SEC-02); o progresso não tem `usuario_id` próprio.
 */
@Injectable()
export class SequenciaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Serializa o recálculo do mesmo leitor até o fim da transação: consumidor
   * e exclusão de trecho concorrentes não se sobrescrevem.
   */
  async travar(tx: Tx, usuarioId: string): Promise<void> {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`sequencia:${usuarioId}`}))`,
    );
  }

  /**
   * Datas locais com progresso, já distintas. Todo progresso tem ao menos uma
   * página lida (CHECK `paginas_lidas > 0`, RN-18.1); concluir, iniciar ou
   * abandonar não criam linha aqui.
   */
  async datasComLeitura(tx: Tx, usuarioId: string): Promise<string[]> {
    const linhas = await tx
      .selectDistinct({ data: atualizacaoProgresso.dataLocal })
      .from(atualizacaoProgresso)
      .innerJoin(leitura, eq(leitura.id, atualizacaoProgresso.leituraId))
      .where(eq(leitura.usuarioId, usuarioId))
      .orderBy(asc(atualizacaoProgresso.dataLocal));
    return linhas.map((l) => l.data);
  }

  /**
   * Fuso da captura mais recente no dispositivo, não da última a chegar: uma
   * captura offline antiga sincronizada depois não troca o fuso conhecido.
   */
  async ultimoFuso(tx: Tx, usuarioId: string): Promise<UltimoFuso | null> {
    const [linha] = await tx
      .select({
        fusoHorario: atualizacaoProgresso.fusoHorarioDispositivo,
        registradoEm: atualizacaoProgresso.registradoEmDispositivo,
      })
      .from(atualizacaoProgresso)
      .innerJoin(leitura, eq(leitura.id, atualizacaoProgresso.leituraId))
      .where(eq(leitura.usuarioId, usuarioId))
      .orderBy(
        desc(atualizacaoProgresso.registradoEmDispositivo),
        desc(atualizacaoProgresso.criadoEm),
      )
      .limit(1);
    return linha ?? null;
  }

  async substituirDias(
    tx: Tx,
    usuarioId: string,
    datas: readonly string[],
  ): Promise<void> {
    await tx.delete(diaLeitura).where(eq(diaLeitura.usuarioId, usuarioId));
    if (datas.length > 0) {
      await tx
        .insert(diaLeitura)
        .values(datas.map((data) => ({ usuarioId, data })));
    }
  }

  async salvar(tx: Tx, usuarioId: string, nova: NovaSequencia): Promise<void> {
    const valores = { ...nova, atualizadoEm: new Date() };
    await tx
      .insert(sequenciaLeitura)
      .values({ usuarioId, ...valores })
      .onConflictDoUpdate({ target: sequenciaLeitura.usuarioId, set: valores });
  }

  async remover(tx: Tx, usuarioId: string): Promise<void> {
    await tx
      .delete(sequenciaLeitura)
      .where(eq(sequenciaLeitura.usuarioId, usuarioId));
  }

  async obter(usuarioId: string): Promise<EstadoSequencia | null> {
    const [linha] = await this.db
      .select({
        sequenciaAtual: sequenciaLeitura.sequenciaAtual,
        maiorSequencia: sequenciaLeitura.maiorSequencia,
        ultimoDia: sequenciaLeitura.ultimoDia,
        ultimoFusoHorario: sequenciaLeitura.ultimoFusoHorario,
      })
      .from(sequenciaLeitura)
      .where(eq(sequenciaLeitura.usuarioId, usuarioId));
    return linha ?? null;
  }

  /**
   * Para o backfill: quem tem progresso e quem já tem sequência gravada (que
   * pode ter ficado sem progresso nenhum e precisa sair).
   */
  async usuariosParaRecalcular(): Promise<string[]> {
    const comProgresso = this.db
      .selectDistinct({ usuarioId: leitura.usuarioId })
      .from(leitura)
      .innerJoin(
        atualizacaoProgresso,
        eq(atualizacaoProgresso.leituraId, leitura.id),
      );
    const comSequencia = this.db
      .select({ usuarioId: sequenciaLeitura.usuarioId })
      .from(sequenciaLeitura);
    const linhas = await comProgresso.union(comSequencia);
    return linhas.map((l) => l.usuarioId);
  }
}
