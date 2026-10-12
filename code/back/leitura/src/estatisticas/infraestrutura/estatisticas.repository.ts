import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.module';
import {
  atualizacaoProgresso,
  estatisticaMensal,
  leitura,
  nota,
} from '../../db/schema';
import type { Tx } from '../../db/tipos';
import { FUSO_HORARIO_PADRAO } from '../../leituras/aplicacao/leituras.service';
import type { BaldeMensal } from '../dominio/estatisticas';

const COLUNAS_DO_BALDE = {
  ano: estatisticaMensal.ano,
  mes: estatisticaMensal.mes,
  livrosConcluidos: estatisticaMensal.livrosConcluidos,
  paginasLidas: estatisticaMensal.paginasLidas,
  minutosLidos: estatisticaMensal.minutosLidos,
  diasComLeitura: estatisticaMensal.diasComLeitura,
  diasEmLivrosConcluidos: estatisticaMensal.diasEmLivrosConcluidos,
  notasQuantidade: estatisticaMensal.notasQuantidade,
  notasSoma: estatisticaMensal.notasSoma,
};

/**
 * Baldes mensais das estatísticas (F-STA), só do schema `leitura`. Os
 * progressos não têm `usuario_id` próprio: toda leitura deles passa pela
 * `leitura` dona, filtrando pelo usuário (SEC-02).
 */
@Injectable()
export class EstatisticasRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Serializa o recálculo do mesmo leitor até o fim da transação. Vem depois
   * das travas da sequência e dos desafios, na mesma ordem em todo chamador.
   */
  async travar(tx: Tx, usuarioId: string): Promise<void> {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`estatisticas:${usuarioId}`}))`,
    );
  }

  /**
   * Recompõe todos os meses do leitor a partir do estado atual (RF-STA-05),
   * nunca somando o `data` de evento: uma mensagem atrasada de um progresso
   * já excluído não o ressuscita.
   *
   * - Progresso conta no mês da sua data local, inclusive de leitura
   *   abandonada (RN-04, invariante 2) e de sincronização offline tardia
   *   (RN-18.2); páginas são as derivadas de cada atualização (RN-17.1).
   * - Leitura concluída conta no mês de `data_fim`, com a duração inclusiva
   *   `data_fim − data_inicio + 1`; releitura abandonada (`incompleta`) não
   *   tem `finalizada_em` e fica fora.
   * - Nota conta no mês em que foi dada pela última vez, no fuso padrão, já
   *   que a nota não guarda o fuso do dispositivo.
   */
  async recompor(tx: Tx, usuarioId: string): Promise<void> {
    await tx
      .delete(estatisticaMensal)
      .where(eq(estatisticaMensal.usuarioId, usuarioId));
    await tx.execute(sql`
      INSERT INTO ${estatisticaMensal}
        (usuario_id, ano, mes, livros_concluidos, paginas_lidas, minutos_lidos,
         dias_com_leitura, dias_em_livros_concluidos, notas_quantidade,
         notas_soma, recalculado_em)
      SELECT ${usuarioId}, f.ano, f.mes,
             sum(f.livros)::int, sum(f.paginas)::int, sum(f.minutos)::int,
             sum(f.dias)::int, sum(f.dias_livros)::int,
             sum(f.notas_quantidade)::int, sum(f.notas_soma), now()
        FROM (
          SELECT extract(year FROM p.data_local)::int AS ano,
                 extract(month FROM p.data_local)::int AS mes,
                 0::bigint AS livros,
                 sum(p.paginas_lidas)::bigint AS paginas,
                 sum(p.minutos)::bigint AS minutos,
                 count(DISTINCT p.data_local)::bigint AS dias,
                 0::bigint AS dias_livros,
                 0::bigint AS notas_quantidade,
                 0::numeric AS notas_soma
            FROM ${atualizacaoProgresso} p
            JOIN ${leitura} l ON l.id = p.leitura_id
           WHERE l.usuario_id = ${usuarioId}
           GROUP BY 1, 2
          UNION ALL
          SELECT extract(year FROM l.data_fim)::int,
                 extract(month FROM l.data_fim)::int,
                 count(*)::bigint, 0, 0, 0,
                 sum(l.data_fim - l.data_inicio + 1)::bigint,
                 0, 0
            FROM ${leitura} l
           WHERE l.usuario_id = ${usuarioId}
             AND l.finalizada_em IS NOT NULL
           GROUP BY 1, 2
          UNION ALL
          SELECT extract(year FROM n.atualizado_em AT TIME ZONE ${FUSO_HORARIO_PADRAO})::int,
                 extract(month FROM n.atualizado_em AT TIME ZONE ${FUSO_HORARIO_PADRAO})::int,
                 0, 0, 0, 0, 0,
                 count(*)::bigint,
                 sum(n.valor)::numeric
            FROM ${nota} n
           WHERE n.usuario_id = ${usuarioId}
           GROUP BY 1, 2
        ) f
       GROUP BY f.ano, f.mes
    `);
  }

  async baldes(usuarioId: string, ano?: number): Promise<BaldeMensal[]> {
    return this.db
      .select(COLUNAS_DO_BALDE)
      .from(estatisticaMensal)
      .where(
        and(
          eq(estatisticaMensal.usuarioId, usuarioId),
          ano === undefined ? undefined : eq(estatisticaMensal.ano, ano),
        ),
      )
      .orderBy(asc(estatisticaMensal.ano), asc(estatisticaMensal.mes));
  }

  /**
   * Data do primeiro registro de leitura (progresso ou fim de leitura
   * concluída), para o "desde" do acumulado; nulo sem nenhum.
   */
  async primeiroRegistro(usuarioId: string): Promise<string | null> {
    const resultado = await this.db.execute<{ data: string | null }>(sql`
      SELECT to_char(least(
               (SELECT min(p.data_local)
                  FROM ${atualizacaoProgresso} p
                  JOIN ${leitura} l ON l.id = p.leitura_id
                 WHERE l.usuario_id = ${usuarioId}),
               (SELECT min(l.data_fim)
                  FROM ${leitura} l
                 WHERE l.usuario_id = ${usuarioId}
                   AND l.finalizada_em IS NOT NULL)
             ), 'YYYY-MM-DD') AS data
    `);
    return resultado.rows[0]?.data ?? null;
  }

  /**
   * Para o backfill: quem tem progresso, leitura concluída ou nota, e quem já
   * tem balde gravado (que pode ter ficado sem nada e precisa ser limpo).
   */
  async usuariosParaRecalcular(): Promise<string[]> {
    const resultado = await this.db.execute<{ usuario_id: string }>(sql`
      SELECT l.usuario_id FROM ${leitura} l
       WHERE l.finalizada_em IS NOT NULL
          OR EXISTS (SELECT 1 FROM ${atualizacaoProgresso} p
                      WHERE p.leitura_id = l.id)
      UNION
      SELECT n.usuario_id FROM ${nota} n
      UNION
      SELECT e.usuario_id FROM ${estatisticaMensal} e
    `);
    return resultado.rows.map((l) => l.usuario_id);
  }
}
