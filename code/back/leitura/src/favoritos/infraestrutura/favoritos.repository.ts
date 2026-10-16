import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { comContratoExterno } from '../../common/contrato-externo';
import { vLivroReferencia } from '../../db/contratos-externos';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.module';
import { estante, favorito } from '../../db/schema';
import type { Tx } from '../../db/tipos';
import type { StatusEstante } from '../../leituras/dominio/maquina-estados';
import type {
  Executor,
  TipoLivro,
} from '../../referencias/referencias-externas.service';

export interface LinhaFavorito {
  livroId: string;
  tipo: TipoLivro;
  titulo: string;
  autor: string | null;
  capaUrl: string | null;
  status: StatusEstante | null;
  favoritadoEm: Date;
}

@Injectable()
export class FavoritosRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async marcar(tx: Tx, usuarioId: string, livroId: string): Promise<Date> {
    await tx
      .insert(favorito)
      .values({ usuarioId, livroId })
      .onConflictDoNothing({ target: [favorito.usuarioId, favorito.livroId] });
    return (await this.favoritadoEm(usuarioId, livroId, tx)) as Date;
  }

  async favoritadoEm(
    usuarioId: string,
    livroId: string,
    executor: Executor = this.db,
  ): Promise<Date | null> {
    const [linha] = await executor
      .select({ criadoEm: favorito.criadoEm })
      .from(favorito)
      .where(
        and(eq(favorito.usuarioId, usuarioId), eq(favorito.livroId, livroId)),
      );
    return linha?.criadoEm ?? null;
  }

  async desmarcar(tx: Tx, usuarioId: string, livroId: string): Promise<void> {
    await tx
      .delete(favorito)
      .where(
        and(eq(favorito.usuarioId, usuarioId), eq(favorito.livroId, livroId)),
      );
  }

  listar(
    usuarioId: string,
    offset: number,
    limite: number,
  ): Promise<LinhaFavorito[]> {
    return comContratoExterno(async () => {
      const linhas = await this.db
        .select({
          livroId: favorito.livroId,
          tipo: vLivroReferencia.tipo,
          titulo: vLivroReferencia.titulo,
          autor: vLivroReferencia.autorExibicao,
          capaUrl: vLivroReferencia.capaResolvida,
          status: estante.status,
          favoritadoEm: favorito.criadoEm,
        })
        .from(favorito)
        .innerJoin(
          vLivroReferencia,
          eq(vLivroReferencia.livroId, favorito.livroId),
        )
        .leftJoin(
          estante,
          and(
            eq(estante.usuarioId, favorito.usuarioId),
            eq(estante.livroId, favorito.livroId),
          ),
        )
        .where(this.visiveis(usuarioId))
        .orderBy(desc(favorito.criadoEm), desc(favorito.id))
        .limit(limite)
        .offset(offset);
      return linhas.map((linha) => ({
        ...linha,
        tipo: linha.tipo as TipoLivro,
        titulo: linha.titulo as string,
        status: linha.status as StatusEstante | null,
      }));
    });
  }

  contar(usuarioId: string): Promise<number> {
    return comContratoExterno(async () => {
      const [{ total }] = await this.db
        .select({ total: count() })
        .from(favorito)
        .innerJoin(
          vLivroReferencia,
          eq(vLivroReferencia.livroId, favorito.livroId),
        )
        .where(this.visiveis(usuarioId));
      return total;
    });
  }

  private visiveis(usuarioId: string) {
    return and(
      eq(favorito.usuarioId, usuarioId),
      eq(vLivroReferencia.ativo, true),
    );
  }
}
