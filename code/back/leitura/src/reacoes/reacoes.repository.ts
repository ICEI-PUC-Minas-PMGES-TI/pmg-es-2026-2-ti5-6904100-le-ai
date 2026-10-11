import { Injectable } from '@nestjs/common';
import { and, eq, exists, or, sql } from 'drizzle-orm';
import {
  vAtividadeLivroPessoal,
  vListaLivroPessoal,
  vPerfilReferencia,
  vSeguimentoAceito,
} from '../db/contratos-externos';
import type { DrizzleDB } from '../db/drizzle.module';
import { reacaoResenha, resenha } from '../db/schema';
import type { Tx } from '../db/tipos';
import type { ReacaoGravada, TipoDeReacao } from './regras';

type Leitor = DrizzleDB | Tx;

export interface ResenhaAlvo {
  id: string;
  autorId: string;
  livroId: string;
}

/** Pedido de acesso de terceiro ao livro pessoal do dono, por uma das vias de RN-15. */
export interface PedidoPelaVia {
  referenciaId: string;
  livroId: string;
  donoId: string;
  solicitanteId: string;
}

export interface EstadoDasReacoes {
  minhaReacao: TipoDeReacao | null;
  curtidas: number;
  descurtidas: number;
}

@Injectable()
export class ReacoesRepository {
  async resenha(
    leitor: Leitor,
    resenhaId: string,
  ): Promise<ResenhaAlvo | null> {
    const [linha] = await leitor
      .select({
        id: resenha.id,
        autorId: resenha.usuarioId,
        livroId: resenha.livroId,
      })
      .from(resenha)
      .where(eq(resenha.id, resenhaId))
      .limit(1);
    return linha ?? null;
  }

  /**
   * Via do feed, na mesma regra do `acervo` (`autorizacao-rn15.service.ts`): atividade ativa
   * do dono sobre esse livro **e** seguimento aceito, mesmo com perfil público. O feed só
   * existe entre quem segue.
   */
  async viaFeed(tx: Tx, pedido: PedidoPelaVia): Promise<boolean> {
    const linhas = await tx
      .select({ atividadeId: vAtividadeLivroPessoal.atividadeId })
      .from(vAtividadeLivroPessoal)
      .innerJoin(
        vSeguimentoAceito,
        and(
          eq(vSeguimentoAceito.seguidoId, vAtividadeLivroPessoal.donoId),
          eq(vSeguimentoAceito.seguidorId, pedido.solicitanteId),
        ),
      )
      .innerJoin(
        vPerfilReferencia,
        eq(vPerfilReferencia.id, vAtividadeLivroPessoal.donoId),
      )
      .where(
        and(
          eq(vAtividadeLivroPessoal.atividadeId, pedido.referenciaId),
          eq(vAtividadeLivroPessoal.livroId, pedido.livroId),
          eq(vAtividadeLivroPessoal.donoId, pedido.donoId),
        ),
      )
      .limit(1);
    return linhas.length > 0;
  }

  /**
   * Via da lista, na mesma regra do `acervo`: lista ativa do dono com esse livro, dono na VIEW
   * de perfil e perfil público **ou** seguimento aceito. Difere da via do feed de propósito:
   * a lista é recurso de perfil, e RN-08 deixa a de perfil público visível a todos.
   */
  async viaLista(tx: Tx, pedido: PedidoPelaVia): Promise<boolean> {
    const linhas = await tx
      .select({ listaId: vListaLivroPessoal.listaId })
      .from(vListaLivroPessoal)
      .innerJoin(
        vPerfilReferencia,
        eq(vPerfilReferencia.id, vListaLivroPessoal.donoId),
      )
      .where(
        and(
          eq(vListaLivroPessoal.listaId, pedido.referenciaId),
          eq(vListaLivroPessoal.livroId, pedido.livroId),
          eq(vListaLivroPessoal.donoId, pedido.donoId),
          or(
            eq(vPerfilReferencia.privacidade, 'publico'),
            exists(
              tx
                .select({ seguidoId: vSeguimentoAceito.seguidoId })
                .from(vSeguimentoAceito)
                .where(
                  and(
                    eq(vSeguimentoAceito.seguidoId, vListaLivroPessoal.donoId),
                    eq(vSeguimentoAceito.seguidorId, pedido.solicitanteId),
                  ),
                ),
            ),
          ),
        ),
      )
      .limit(1);
    return linhas.length > 0;
  }

  /**
   * Cria a reação se o par ainda não tem nenhuma. `ON CONFLICT DO NOTHING` pelo índice único
   * `reacao_resenha_resenha_usuario_uk` serializa duas primeiras reações simultâneas: a
   * segunda espera a primeira e não insere. `true` quando inseriu.
   */
  async criarSeNaoExiste(
    tx: Tx,
    resenhaId: string,
    usuarioId: string,
    tipo: TipoDeReacao,
  ): Promise<boolean> {
    const inseridas = await tx
      .insert(reacaoResenha)
      .values({
        resenhaId,
        usuarioId,
        tipo,
        ativa: true,
        primeiraCurtidaEm: tipo === 'curtida' ? sql`now()` : null,
      })
      .onConflictDoNothing({
        target: [reacaoResenha.resenhaId, reacaoResenha.usuarioId],
      })
      .returning({ id: reacaoResenha.id });
    return inseridas.length > 0;
  }

  /**
   * A reação do par, travada até o fim da transação (`FOR UPDATE`): ler a primeira curtida e
   * gravar a mudança sem outra transação no meio, porque o PG 17 não devolve o valor antigo
   * no `RETURNING`.
   */
  async travar(
    tx: Tx,
    resenhaId: string,
    usuarioId: string,
  ): Promise<ReacaoGravada | null> {
    const [linha] = await tx
      .select({
        tipo: reacaoResenha.tipo,
        ativa: reacaoResenha.ativa,
        primeiraCurtidaEm: reacaoResenha.primeiraCurtidaEm,
      })
      .from(reacaoResenha)
      .where(
        and(
          eq(reacaoResenha.resenhaId, resenhaId),
          eq(reacaoResenha.usuarioId, usuarioId),
        ),
      )
      .for('update')
      .limit(1);
    return linha ?? null;
  }

  async atualizar(
    tx: Tx,
    resenhaId: string,
    usuarioId: string,
    tipo: TipoDeReacao,
    primeiraCurtida: boolean,
  ): Promise<void> {
    await tx
      .update(reacaoResenha)
      .set({
        tipo,
        ativa: true,
        atualizadoEm: sql`now()`,
        ...(primeiraCurtida ? { primeiraCurtidaEm: sql`now()` } : {}),
      })
      .where(
        and(
          eq(reacaoResenha.resenhaId, resenhaId),
          eq(reacaoResenha.usuarioId, usuarioId),
        ),
      );
  }

  /**
   * Retira a reação sem apagar a linha: `primeira_curtida_em` continua guardada, e recurtir
   * depois não gera outra notificação. Contagens ignoram reação inativa.
   */
  async retirar(tx: Tx, resenhaId: string, usuarioId: string): Promise<void> {
    await tx
      .update(reacaoResenha)
      .set({ ativa: false, atualizadoEm: sql`now()` })
      .where(
        and(
          eq(reacaoResenha.resenhaId, resenhaId),
          eq(reacaoResenha.usuarioId, usuarioId),
          eq(reacaoResenha.ativa, true),
        ),
      );
  }

  /** Contagens separadas (RF-AVA-08) e a reação de quem pediu, numa consulta. */
  async estado(
    leitor: Leitor,
    resenhaId: string,
    usuarioId: string,
  ): Promise<EstadoDasReacoes> {
    const [linha] = await leitor
      .select({
        curtidas: sql<string>`count(*) filter (where ${reacaoResenha.ativa} and ${reacaoResenha.tipo} = 'curtida')`,
        descurtidas: sql<string>`count(*) filter (where ${reacaoResenha.ativa} and ${reacaoResenha.tipo} = 'descurtida')`,
        minhaReacao: sql<
          string | null
        >`max(${reacaoResenha.tipo}) filter (where ${reacaoResenha.ativa} and ${reacaoResenha.usuarioId} = ${usuarioId})`,
      })
      .from(reacaoResenha)
      .where(eq(reacaoResenha.resenhaId, resenhaId));

    return {
      minhaReacao: (linha?.minhaReacao as TipoDeReacao | null) ?? null,
      curtidas: Number(linha?.curtidas ?? 0),
      descurtidas: Number(linha?.descurtidas ?? 0),
    };
  }
}
