import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, exists, or, SQL } from 'drizzle-orm';
import { vPerfilReferencia, vSeguimentoAceito } from '../db/contratos-externos';
import type { DrizzleDB } from '../db/drizzle.module';
import { frase } from '../db/schema';
import type { Tx } from '../db/tipos';

type Leitor = DrizzleDB | Tx;

export interface LinhaDeFrase {
  id: string;
  livroId: string;
  usuarioId: string;
  texto: string;
  pagina: number;
  criadoEm: Date;
  autorUsername: string;
  autorNome: string;
  autorAvatarUrl: string | null;
}

@Injectable()
export class FrasesRepository {
  /**
   * Frases do livro que quem pede pode ver, sob RN-08 por autor: perfil público, perfil privado
   * seguido ou a própria frase. O JOIN com a VIEW de perfil já tira conta suspensa ou em
   * exclusão. Mais recentes primeiro, com o id desempatando.
   *
   * Com `todas` (o administrador, F-MOD), sem o filtro de RN-08: frase visível a seguidores não
   * pode ficar fora do alcance da moderação (RN-11).
   */
  async pagina(
    leitor: Leitor,
    livroId: string,
    solicitanteId: string,
    page: number,
    limite: number,
    todas = false,
  ): Promise<{ linhas: LinhaDeFrase[]; total: number }> {
    const filtro = and(
      eq(frase.livroId, livroId),
      todas
        ? undefined
        : or(
            eq(frase.usuarioId, solicitanteId),
            eq(vPerfilReferencia.privacidade, 'publico'),
            exists(
              leitor
                .select({ seguidoId: vSeguimentoAceito.seguidoId })
                .from(vSeguimentoAceito)
                .where(
                  and(
                    eq(vSeguimentoAceito.seguidoId, frase.usuarioId),
                    eq(vSeguimentoAceito.seguidorId, solicitanteId),
                  ),
                ),
            ),
          ),
    ) as SQL;

    const linhas = await leitor
      .select({
        id: frase.id,
        livroId: frase.livroId,
        usuarioId: frase.usuarioId,
        texto: frase.texto,
        pagina: frase.pagina,
        criadoEm: frase.criadoEm,
        autorUsername: vPerfilReferencia.username,
        autorNome: vPerfilReferencia.nomeExibicao,
        autorAvatarUrl: vPerfilReferencia.avatarUrl,
      })
      .from(frase)
      .innerJoin(vPerfilReferencia, eq(vPerfilReferencia.id, frase.usuarioId))
      .where(filtro)
      .orderBy(desc(frase.criadoEm), desc(frase.id))
      .limit(limite)
      .offset((page - 1) * limite);

    const [contagem] = await leitor
      .select({ total: count() })
      .from(frase)
      .innerJoin(vPerfilReferencia, eq(vPerfilReferencia.id, frase.usuarioId))
      .where(filtro);

    return {
      linhas: linhas as LinhaDeFrase[],
      total: Number(contagem?.total ?? 0),
    };
  }

  /** Quantas frases do livro são do leitor: a cota de RN-11. */
  async minhas(
    leitor: Leitor,
    livroId: string,
    usuarioId: string,
  ): Promise<number> {
    const [linha] = await leitor
      .select({ total: count() })
      .from(frase)
      .where(and(eq(frase.livroId, livroId), eq(frase.usuarioId, usuarioId)));
    return Number(linha?.total ?? 0);
  }

  async inserir(
    tx: Tx,
    usuarioId: string,
    livroId: string,
    texto: string,
    pagina: number,
  ): Promise<{ id: string; criadoEm: Date }> {
    const [linha] = await tx
      .insert(frase)
      .values({ usuarioId, livroId, texto, pagina })
      .returning({ id: frase.id, criadoEm: frase.criadoEm });
    return linha;
  }

  /**
   * Remoção pela moderação (F-MOD): pelo id, sem filtro de dono. Devolve quem escreveu e o livro,
   * para a auditoria do `social`; `null` quando já não existia.
   */
  async excluirPorId(
    tx: Tx,
    fraseId: string,
  ): Promise<{ usuarioId: string; livroId: string } | null> {
    const [removida] = await tx
      .delete(frase)
      .where(eq(frase.id, fraseId))
      .returning({ usuarioId: frase.usuarioId, livroId: frase.livroId });
    return removida ?? null;
  }

  /** `true` quando a frase existia e era do leitor; a de outra pessoa nunca é apagada aqui. */
  async excluir(tx: Tx, fraseId: string, usuarioId: string): Promise<boolean> {
    const removidas = await tx
      .delete(frase)
      .where(and(eq(frase.id, fraseId), eq(frase.usuarioId, usuarioId)))
      .returning({ id: frase.id });
    return removidas.length > 0;
  }
}
