import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { vLivroReferencia } from '../db/contratos-externos';
import type { DrizzleDB } from '../db/drizzle.module';
import { nota, resenha } from '../db/schema';
import type { Tx } from '../db/tipos';

/** Leitura dentro ou fora de uma transação. */
type Leitor = DrizzleDB | Tx;

export interface LivroDeReferencia {
  livroId: string;
  tipo: string;
  donoId: string | null;
  titulo: string;
  autorExibicao: string | null;
  capaResolvida: string | null;
  ativo: boolean;
}

export interface NotaGravada {
  valor: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ResenhaGravada {
  id: string;
  usuarioId: string;
  livroId: string;
  texto: string;
  spoiler: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

@Injectable()
export class AvaliacoesRepository {
  /** Linha de `acervo.v_livro_referencia_v1`, ou `null` se o livro não existe. */
  async livroDeReferencia(
    leitor: Leitor,
    livroId: string,
  ): Promise<LivroDeReferencia | null> {
    const [linha] = await leitor
      .select({
        livroId: vLivroReferencia.livroId,
        tipo: vLivroReferencia.tipo,
        donoId: vLivroReferencia.donoId,
        titulo: vLivroReferencia.titulo,
        autorExibicao: vLivroReferencia.autorExibicao,
        capaResolvida: vLivroReferencia.capaResolvida,
        ativo: vLivroReferencia.ativo,
      })
      .from(vLivroReferencia)
      .where(eq(vLivroReferencia.livroId, livroId))
      .limit(1);

    return (linha as LivroDeReferencia | undefined) ?? null;
  }

  /**
   * Cria ou atualiza a nota numa instrução só, sem corrida entre duas chaves
   * diferentes criando a primeira nota: o `ON CONFLICT` serializa pelo índice
   * único `nota_usuario_livro_uk`.
   *
   * O `setWhere` faz o mesmo valor não gravar nada — nem `atualizado_em`, nem
   * evento. Sem linha devolvida, a nota já tinha esse valor. `xmax = 0` é o
   * jeito do Postgres dizer que a linha devolvida foi inserida, não atualizada.
   */
  async salvarNota(
    tx: Tx,
    usuarioId: string,
    livroId: string,
    valor: number,
  ): Promise<(NotaGravada & { criada: boolean }) | null> {
    const [linha] = await tx
      .insert(nota)
      .values({ usuarioId, livroId, valor })
      .onConflictDoUpdate({
        target: [nota.usuarioId, nota.livroId],
        set: { valor, atualizadoEm: sql`now()` },
        setWhere: sql`${nota.valor} is distinct from excluded.valor`,
      })
      .returning({
        valor: nota.valor,
        criadoEm: nota.criadoEm,
        atualizadoEm: nota.atualizadoEm,
        criada: sql<boolean>`(xmax = 0)`,
      });

    return linha ?? null;
  }

  async notaAtual(
    leitor: Leitor,
    usuarioId: string,
    livroId: string,
  ): Promise<NotaGravada | null> {
    const [linha] = await leitor
      .select({
        valor: nota.valor,
        criadoEm: nota.criadoEm,
        atualizadoEm: nota.atualizadoEm,
      })
      .from(nota)
      .where(and(eq(nota.usuarioId, usuarioId), eq(nota.livroId, livroId)))
      .limit(1);

    return linha ?? null;
  }

  /** `true` quando havia nota para remover. */
  async excluirNota(
    tx: Tx,
    usuarioId: string,
    livroId: string,
  ): Promise<boolean> {
    const removidas = await tx
      .delete(nota)
      .where(and(eq(nota.usuarioId, usuarioId), eq(nota.livroId, livroId)))
      .returning({ id: nota.id });

    return removidas.length > 0;
  }

  async resenhaAtual(
    leitor: Leitor,
    usuarioId: string,
    livroId: string,
  ): Promise<ResenhaGravada | null> {
    const [linha] = await leitor
      .select({
        id: resenha.id,
        usuarioId: resenha.usuarioId,
        livroId: resenha.livroId,
        texto: resenha.texto,
        spoiler: resenha.spoiler,
        criadoEm: resenha.criadoEm,
        atualizadoEm: resenha.atualizadoEm,
      })
      .from(resenha)
      .where(
        and(eq(resenha.usuarioId, usuarioId), eq(resenha.livroId, livroId)),
      )
      .limit(1);

    return linha ?? null;
  }
}
