import { Inject, Injectable } from '@nestjs/common';
import { and, count, countDistinct, desc, eq, sql } from 'drizzle-orm';
import { tituloOuAutorContem } from '../../common/busca-textual';
import { comContratoExterno } from '../../common/contrato-externo';
import { vLivroReferencia } from '../../db/contratos-externos';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.module';
import { leitura } from '../../db/schema';
import type { TipoLivro } from '../../referencias/referencias-externas.service';

export interface FiltroHistorico {
  ano?: number;
  q?: string;
}

export interface LinhaHistorico {
  leituraId: string;
  livroId: string;
  tipo: TipoLivro;
  titulo: string;
  autor: string | null;
  capaUrl: string | null;
  dataInicio: string;
  dataFim: string;
  releitura: boolean;
  paginaFinal: number;
  totalPaginas: number | null;
}

const anoDoFim = sql<number>`extract(year from ${leitura.dataFim})::int`;

@Injectable()
export class HistoricoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  listar(
    usuarioId: string,
    filtro: FiltroHistorico,
    offset: number,
    limite: number,
  ): Promise<LinhaHistorico[]> {
    return comContratoExterno(async () => {
      const linhas = await this.db
        .select({
          leituraId: leitura.id,
          livroId: leitura.livroId,
          tipo: vLivroReferencia.tipo,
          titulo: vLivroReferencia.titulo,
          autor: vLivroReferencia.autorExibicao,
          capaUrl: vLivroReferencia.capaResolvida,
          dataInicio: leitura.dataInicio,
          dataFim: leitura.dataFim,
          releitura: leitura.releitura,
          paginaFinal: leitura.paginaAtual,
          totalPaginas: vLivroReferencia.paginas,
        })
        .from(leitura)
        .innerJoin(
          vLivroReferencia,
          eq(vLivroReferencia.livroId, leitura.livroId),
        )
        .where(this.onde(usuarioId, filtro))
        .orderBy(
          desc(leitura.dataFim),
          desc(leitura.finalizadaEm),
          desc(leitura.id),
        )
        .limit(limite)
        .offset(offset);
      return linhas.map((linha) => ({
        ...linha,
        tipo: linha.tipo as TipoLivro,
        titulo: linha.titulo as string,
        dataFim: linha.dataFim as string,
      }));
    });
  }

  totais(
    usuarioId: string,
    filtro: FiltroHistorico,
  ): Promise<{ livros: number; leituras: number }> {
    return comContratoExterno(async () => {
      const [linha] = await this.db
        .select({
          livros: countDistinct(leitura.livroId),
          leituras: count(),
        })
        .from(leitura)
        .innerJoin(
          vLivroReferencia,
          eq(vLivroReferencia.livroId, leitura.livroId),
        )
        .where(this.onde(usuarioId, filtro));
      return linha;
    });
  }

  anos(usuarioId: string): Promise<{ ano: number; total: number }[]> {
    return this.db
      .select({ ano: anoDoFim, total: count() })
      .from(leitura)
      .where(concluidasDo(usuarioId))
      .groupBy(anoDoFim)
      .orderBy(desc(anoDoFim));
  }

  private onde(usuarioId: string, filtro: FiltroHistorico) {
    return and(
      concluidasDo(usuarioId),
      filtro.ano === undefined ? undefined : eq(anoDoFim, filtro.ano),
      filtro.q ? tituloOuAutorContem(filtro.q) : undefined,
    );
  }
}

function concluidasDo(usuarioId: string) {
  return and(
    eq(leitura.usuarioId, usuarioId),
    eq(leitura.status, 'lido'),
    eq(leitura.incompleta, false),
  );
}
