import { Inject, Injectable } from '@nestjs/common';
import { type SQL, and, asc, count, desc, eq, sql } from 'drizzle-orm';
import { ServicoIndisponivel } from '../../common/erros-de-negocio';
import { ehFalhaDeContratoExterno } from '../../common/pg-erros';
import { vLivroReferencia } from '../../db/contratos-externos';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.module';
import { estante, leitura } from '../../db/schema';
import type { Tx } from '../../db/tipos';
import type {
  SnapshotEstante,
  StatusEstante,
  StatusLeitura,
} from '../../leituras/dominio/maquina-estados';
import type { LivroItemEstante, OrdenacaoEstante } from '../dominio/estante';

export interface LinhaEstante {
  livroId: string;
  status: StatusEstante;
  vezesLido: number;
  adicionadoEm: Date;
  leituraEmAndamentoId: string | null;
  ultimaLeitura: UltimaLeitura | null;
  paginaAtual: number | null;
  totalPaginas: number | null;
  livro: LivroItemEstante;
}

export interface UltimaLeitura {
  id: string;
  status: StatusLeitura;
  releitura: boolean;
}

export interface VinculoEstante {
  id: string;
  livroId: string;
  status: StatusEstante;
  vezesLido: number;
  adicionadoEm: Date;
}

export interface FiltroEstante {
  status?: StatusEstante;
  ordenacao: OrdenacaoEstante;
  offset: number;
  limite: number;
}

const progresso = sql`${leitura.paginaAtual}::numeric / nullif(${vLivroReferencia.paginas}, 0)`;

const ORDENACOES: Record<OrdenacaoEstante, SQL[]> = {
  adicionado_desc: [desc(estante.adicionadoEm), desc(estante.id)],
  adicionado_asc: [asc(estante.adicionadoEm), asc(estante.id)],
  titulo_asc: [
    sql`${vLivroReferencia.titulo} asc nulls last`,
    desc(estante.adicionadoEm),
    desc(estante.id),
  ],
  titulo_desc: [
    sql`${vLivroReferencia.titulo} desc nulls last`,
    desc(estante.adicionadoEm),
    desc(estante.id),
  ],
  autor_asc: [
    sql`${vLivroReferencia.autorExibicao} asc nulls last`,
    sql`${vLivroReferencia.titulo} asc nulls last`,
    desc(estante.id),
  ],
  autor_desc: [
    sql`${vLivroReferencia.autorExibicao} desc nulls last`,
    sql`${vLivroReferencia.titulo} asc nulls last`,
    desc(estante.id),
  ],
  progresso_asc: [
    sql`${progresso} asc nulls last`,
    desc(estante.adicionadoEm),
    desc(estante.id),
  ],
  progresso_desc: [
    sql`${progresso} desc nulls last`,
    desc(estante.adicionadoEm),
    desc(estante.id),
  ],
};

const FORA_DA_ESTANTE: SnapshotEstante = {
  status: null,
  vezesLido: 0,
  leituraAtual: null,
  possuiHistorico: false,
};

@Injectable()
export class EstanteRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async travarSnapshot(
    tx: Tx,
    usuarioId: string,
    livroId: string,
  ): Promise<{ vinculo: VinculoEstante | null; snapshot: SnapshotEstante }> {
    const [vinculo] = await tx
      .select({
        id: estante.id,
        livroId: estante.livroId,
        status: estante.status,
        vezesLido: estante.vezesLido,
        adicionadoEm: estante.adicionadoEm,
      })
      .from(estante)
      .where(
        and(eq(estante.usuarioId, usuarioId), eq(estante.livroId, livroId)),
      )
      .for('update');
    if (!vinculo) {
      return { vinculo: null, snapshot: FORA_DA_ESTANTE };
    }

    const [atual] = await tx
      .select({
        status: leitura.status,
        releitura: leitura.releitura,
        incompleta: leitura.incompleta,
        paginaAtual: leitura.paginaAtual,
      })
      .from(leitura)
      .where(eq(leitura.estanteId, vinculo.id))
      .orderBy(desc(leitura.criadoEm), desc(leitura.id))
      .limit(1);

    const status = vinculo.status as StatusEstante;
    return {
      vinculo: { ...vinculo, status },
      snapshot: {
        status,
        vezesLido: vinculo.vezesLido,
        leituraAtual: atual
          ? { ...atual, status: atual.status as StatusLeitura }
          : null,
        possuiHistorico: atual !== undefined,
      },
    };
  }

  async inserir(
    tx: Tx,
    usuarioId: string,
    livroId: string,
    status: StatusEstante,
  ): Promise<VinculoEstante> {
    const [linha] = await tx
      .insert(estante)
      .values({ usuarioId, livroId, status })
      .returning({
        id: estante.id,
        livroId: estante.livroId,
        status: estante.status,
        vezesLido: estante.vezesLido,
        adicionadoEm: estante.adicionadoEm,
      });
    return { ...linha, status: linha.status as StatusEstante };
  }

  async remover(tx: Tx, estanteId: string): Promise<void> {
    await tx.delete(estante).where(eq(estante.id, estanteId));
  }

  async listar(
    usuarioId: string,
    filtro: FiltroEstante,
  ): Promise<{ linhas: LinhaEstante[]; totalItens: number }> {
    const onde = and(
      eq(estante.usuarioId, usuarioId),
      filtro.status ? eq(estante.status, filtro.status) : undefined,
    );

    return this.consultar(async () => {
      const linhas = await this.selecionarLinhas()
        .where(onde)
        .orderBy(...ORDENACOES[filtro.ordenacao])
        .limit(filtro.limite)
        .offset(filtro.offset);

      const [{ total }] = await this.db
        .select({ total: count() })
        .from(estante)
        .where(onde);

      return { linhas: linhas.map(paraLinha), totalItens: total };
    });
  }

  async buscarItem(
    usuarioId: string,
    livroId: string,
  ): Promise<LinhaEstante | null> {
    return this.consultar(async () => {
      const [linha] = await this.selecionarLinhas()
        .where(
          and(eq(estante.usuarioId, usuarioId), eq(estante.livroId, livroId)),
        )
        .limit(1);
      return linha ? paraLinha(linha) : null;
    });
  }

  async contarPorStatus(
    usuarioId: string,
  ): Promise<Map<StatusEstante, number>> {
    const linhas = await this.db
      .select({ status: estante.status, total: count() })
      .from(estante)
      .where(eq(estante.usuarioId, usuarioId))
      .groupBy(estante.status);
    return new Map(
      linhas.map(({ status, total }) => [status as StatusEstante, total]),
    );
  }

  async buscarVezesLido(usuarioId: string, livroId: string): Promise<number> {
    const [linha] = await this.db
      .select({ vezesLido: estante.vezesLido })
      .from(estante)
      .where(
        and(eq(estante.usuarioId, usuarioId), eq(estante.livroId, livroId)),
      )
      .limit(1);
    return linha?.vezesLido ?? 0;
  }

  private selecionarLinhas() {
    const ultima = this.db
      .select({
        id: leitura.id,
        status: leitura.status,
        releitura: leitura.releitura,
        paginaAtual: leitura.paginaAtual,
      })
      .from(leitura)
      .where(eq(leitura.estanteId, estante.id))
      .orderBy(desc(leitura.criadoEm), desc(leitura.id))
      .limit(1)
      .as('ultima_leitura');

    return this.db
      .select({
        livroId: estante.livroId,
        status: estante.status,
        vezesLido: estante.vezesLido,
        adicionadoEm: estante.adicionadoEm,
        leituraEmAndamentoId: leitura.id,
        ultimaLeituraId: ultima.id,
        ultimaLeituraStatus: ultima.status,
        ultimaLeituraReleitura: ultima.releitura,
        paginaAtual: ultima.paginaAtual,
        totalPaginas: vLivroReferencia.paginas,
        titulo: vLivroReferencia.titulo,
        autor: vLivroReferencia.autorExibicao,
        capaUrl: vLivroReferencia.capaResolvida,
      })
      .from(estante)
      .leftJoin(
        leitura,
        and(eq(leitura.estanteId, estante.id), eq(leitura.status, 'lendo')),
      )
      .leftJoinLateral(ultima, sql`true`)
      .leftJoin(vLivroReferencia, eq(vLivroReferencia.livroId, estante.livroId))
      .$dynamic();
  }

  private async consultar<T>(consulta: () => Promise<T>): Promise<T> {
    try {
      return await consulta();
    } catch (erro) {
      if (ehFalhaDeContratoExterno(erro)) {
        throw new ServicoIndisponivel();
      }
      throw erro;
    }
  }
}

interface LinhaConsultada {
  livroId: string;
  status: string;
  vezesLido: number;
  adicionadoEm: Date;
  leituraEmAndamentoId: string | null;
  ultimaLeituraId: string | null;
  ultimaLeituraStatus: string | null;
  ultimaLeituraReleitura: boolean | null;
  paginaAtual: number | null;
  totalPaginas: number | null;
  titulo: string | null;
  autor: string | null;
  capaUrl: string | null;
}

function paraLinha({
  titulo,
  autor,
  capaUrl,
  ultimaLeituraId,
  ultimaLeituraStatus,
  ultimaLeituraReleitura,
  ...linha
}: LinhaConsultada): LinhaEstante {
  return {
    ...linha,
    status: linha.status as StatusEstante,
    ultimaLeitura:
      ultimaLeituraId === null
        ? null
        : {
            id: ultimaLeituraId,
            status: ultimaLeituraStatus as StatusLeitura,
            releitura: ultimaLeituraReleitura as boolean,
          },
    livro: { titulo: titulo as string, autor, capaUrl },
  };
}
