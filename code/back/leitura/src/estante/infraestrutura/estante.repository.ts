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

/** Linha da estante como a listagem precisa, antes de virar `ItemEstante`. */
export interface LinhaEstante {
  livroId: string;
  status: StatusEstante;
  vezesLido: number;
  adicionadoEm: Date;
  leituraEmAndamentoId: string | null;
  paginaAtual: number | null;
  totalPaginas: number | null;
  livro: LivroItemEstante;
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

/** Fração lida da leitura em andamento; sem leitura em andamento é NULL. */
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

/** Vínculo de estante inexistente: o livro está fora da estante (RN-04). */
const FORA_DA_ESTANTE: SnapshotEstante = {
  status: null,
  vezesLido: 0,
  leituraAtual: null,
  possuiHistorico: false,
};

@Injectable()
export class EstanteRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Estado do vínculo para a máquina de RN-04, com o vínculo travado até o fim
   * da transação: duas remoções ou uma remoção e um início concorrentes não
   * decidem sobre o mesmo snapshot.
   */
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

  /**
   * Página da estante de um usuário, também usada pela estante do perfil.
   *
   * O join direto com `v_livro_referencia_v1` é decisão registrada (F-EST,
   * Timeline 26/09/2026): a arquitetura §4.2 permite ler VIEW de contrato, e
   * ordenar por título, autor ou progresso com paginação só escala em SQL. É o
   * único join com `acervo`: dá o snapshot `livro`, as páginas e a ordenação.
   */
  async listar(
    usuarioId: string,
    filtro: FiltroEstante,
  ): Promise<{ linhas: LinhaEstante[]; totalItens: number }> {
    const onde = and(
      eq(estante.usuarioId, usuarioId),
      filtro.status ? eq(estante.status, filtro.status) : undefined,
    );

    return this.consultar(async () => {
      const linhas = await this.db
        .select({
          livroId: estante.livroId,
          status: estante.status,
          vezesLido: estante.vezesLido,
          adicionadoEm: estante.adicionadoEm,
          leituraEmAndamentoId: leitura.id,
          paginaAtual: leitura.paginaAtual,
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
        .leftJoin(
          vLivroReferencia,
          eq(vLivroReferencia.livroId, estante.livroId),
        )
        .where(onde)
        .orderBy(...ORDENACOES[filtro.ordenacao])
        .limit(filtro.limite)
        .offset(filtro.offset);

      const [{ total }] = await this.db
        .select({ total: count() })
        .from(estante)
        .where(onde);

      return {
        linhas: linhas.map(({ titulo, autor, capaUrl, ...linha }) => ({
          ...linha,
          status: linha.status as StatusEstante,
          livro: { titulo: titulo as string, autor, capaUrl },
        })),
        totalItens: total,
      };
    });
  }

  /** Contagem de cada status, independente do filtro (pill do protótipo). */
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

  /** A listagem lê VIEW de outro schema: falha de contrato é 503, não 500. */
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
