import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { vLivroReferencia, vPerfilReferencia } from '../db/contratos-externos';
import type { DrizzleDB } from '../db/drizzle.module';
import { nota, reacaoResenha, resenha } from '../db/schema';
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

export interface PerfilDeReferencia {
  id: string;
  username: string;
  nomeExibicao: string;
  avatarUrl: string | null;
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

  /**
   * Linha de `identidade.v_perfil_referencia_v1`. A VIEW já omite conta suspensa ou em
   * exclusão: sem linha, o leitor não publica.
   */
  async perfilDeReferencia(
    leitor: Leitor,
    usuarioId: string,
  ): Promise<PerfilDeReferencia | null> {
    const [linha] = await leitor
      .select({
        id: vPerfilReferencia.id,
        username: vPerfilReferencia.username,
        nomeExibicao: vPerfilReferencia.nomeExibicao,
        avatarUrl: vPerfilReferencia.avatarUrl,
      })
      .from(vPerfilReferencia)
      .where(eq(vPerfilReferencia.id, usuarioId))
      .limit(1);

    return (linha as PerfilDeReferencia | undefined) ?? null;
  }

  /**
   * Cria ou atualiza a resenha numa instrução só: duas chaves diferentes criando a primeira
   * resenha ao mesmo tempo geram uma linha e um evento (`ON CONFLICT` pelo índice único
   * `resenha_usuario_livro_uk`). `xmax = 0` indica linha inserida.
   */
  async salvarResenha(
    tx: Tx,
    usuarioId: string,
    livroId: string,
    texto: string,
    spoiler: boolean,
  ): Promise<ResenhaGravada & { criada: boolean }> {
    const [linha] = await tx
      .insert(resenha)
      .values({ usuarioId, livroId, texto, spoiler })
      .onConflictDoUpdate({
        target: [resenha.usuarioId, resenha.livroId],
        set: { texto, spoiler, atualizadoEm: sql`now()` },
      })
      .returning({
        id: resenha.id,
        usuarioId: resenha.usuarioId,
        livroId: resenha.livroId,
        texto: resenha.texto,
        spoiler: resenha.spoiler,
        criadoEm: resenha.criadoEm,
        atualizadoEm: resenha.atualizadoEm,
        criada: sql<boolean>`(xmax = 0)`,
      });

    return linha;
  }

  /** Id da resenha removida, ou `null` quando não havia resenha. */
  async excluirResenha(
    tx: Tx,
    usuarioId: string,
    livroId: string,
  ): Promise<string | null> {
    const [removida] = await tx
      .delete(resenha)
      .where(
        and(eq(resenha.usuarioId, usuarioId), eq(resenha.livroId, livroId)),
      )
      .returning({ id: resenha.id });

    return removida?.id ?? null;
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

  /** Curtidas e descurtidas ativas da resenha (RF-AVA-08), contadas à parte. */
  async contagensDaResenha(
    leitor: Leitor,
    resenhaId: string,
  ): Promise<{ curtidas: number; descurtidas: number }> {
    const [linha] = await leitor
      .select({
        curtidas: sql<string>`count(*) filter (where ${reacaoResenha.ativa} and ${reacaoResenha.tipo} = 'curtida')`,
        descurtidas: sql<string>`count(*) filter (where ${reacaoResenha.ativa} and ${reacaoResenha.tipo} = 'descurtida')`,
      })
      .from(reacaoResenha)
      .where(eq(reacaoResenha.resenhaId, resenhaId));

    return {
      curtidas: Number(linha?.curtidas ?? 0),
      descurtidas: Number(linha?.descurtidas ?? 0),
    };
  }
}
