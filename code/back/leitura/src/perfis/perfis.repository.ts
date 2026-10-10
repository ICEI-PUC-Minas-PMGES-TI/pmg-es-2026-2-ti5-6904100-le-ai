import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, SQL, sql } from 'drizzle-orm';
import {
  vLivroReferencia,
  vPerfilReferencia,
  vSeguimentoAceito,
} from '../db/contratos-externos';
import { DRIZZLE, DrizzleDB } from '../db/drizzle.module';
import { nota, reacaoResenha, resenha } from '../db/schema';

export interface PerfilParaAutorizar {
  id: string;
  privacidade: string;
}

export interface LinhaDeResenhaDoPerfil {
  id: string;
  usuarioId: string;
  livroId: string;
  texto: string;
  spoiler: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  livroTipo: string;
  livroTitulo: string;
  livroAutor: string | null;
  livroCapa: string | null;
  nota: number | null;
  curtidas: string;
  descurtidas: string;
  minhaReacao: string | null;
}

@Injectable()
export class PerfisRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** A VIEW já omite conta suspensa ou em exclusão: sem linha, o perfil não existe para ninguém. */
  async perfil(usuarioId: string): Promise<PerfilParaAutorizar | null> {
    const [linha] = await this.db
      .select({
        id: vPerfilReferencia.id,
        privacidade: vPerfilReferencia.privacidade,
      })
      .from(vPerfilReferencia)
      .where(eq(vPerfilReferencia.id, usuarioId))
      .limit(1);
    return (linha as PerfilParaAutorizar | undefined) ?? null;
  }

  async segue(seguidorId: string, seguidoId: string): Promise<boolean> {
    const [linha] = await this.db
      .select({ seguidoId: vSeguimentoAceito.seguidoId })
      .from(vSeguimentoAceito)
      .where(
        and(
          eq(vSeguimentoAceito.seguidorId, seguidorId),
          eq(vSeguimentoAceito.seguidoId, seguidoId),
        ),
      )
      .limit(1);
    return linha !== undefined;
  }

  /**
   * Resenhas do autor com o livro e a nota dele. Só livro ativo; livro pessoal só quando quem
   * pede é o próprio dono (RN-15). Mais recentes primeiro, com o id desempatando.
   *
   * Cada resenha traz as contagens de reações ativas (RF-AVA-08) e a reação de quem pede.
   */
  async pagina(
    autorId: string,
    incluirPessoais: boolean,
    page: number,
    limite: number,
    solicitanteId: string,
  ): Promise<{ linhas: LinhaDeResenhaDoPerfil[]; total: number }> {
    const filtro: SQL = and(
      eq(resenha.usuarioId, autorId),
      eq(vLivroReferencia.ativo, true),
      incluirPessoais ? undefined : eq(vLivroReferencia.tipo, 'oficial'),
    ) as SQL;

    const linhas = await this.db
      .select({
        id: resenha.id,
        usuarioId: resenha.usuarioId,
        livroId: resenha.livroId,
        texto: resenha.texto,
        spoiler: resenha.spoiler,
        criadoEm: resenha.criadoEm,
        atualizadoEm: resenha.atualizadoEm,
        livroTipo: vLivroReferencia.tipo,
        livroTitulo: vLivroReferencia.titulo,
        livroAutor: vLivroReferencia.autorExibicao,
        livroCapa: vLivroReferencia.capaResolvida,
        nota: nota.valor,
        curtidas: sql<string>`(select count(*) from ${reacaoResenha} where ${reacaoResenha.resenhaId} = ${resenha.id} and ${reacaoResenha.ativa} and ${reacaoResenha.tipo} = 'curtida')`,
        descurtidas: sql<string>`(select count(*) from ${reacaoResenha} where ${reacaoResenha.resenhaId} = ${resenha.id} and ${reacaoResenha.ativa} and ${reacaoResenha.tipo} = 'descurtida')`,
        minhaReacao: sql<
          string | null
        >`(select ${reacaoResenha.tipo} from ${reacaoResenha} where ${reacaoResenha.resenhaId} = ${resenha.id} and ${reacaoResenha.usuarioId} = ${solicitanteId} and ${reacaoResenha.ativa})`,
      })
      .from(resenha)
      .innerJoin(
        vLivroReferencia,
        eq(vLivroReferencia.livroId, resenha.livroId),
      )
      .leftJoin(
        nota,
        and(
          eq(nota.usuarioId, resenha.usuarioId),
          eq(nota.livroId, resenha.livroId),
        ),
      )
      .where(filtro)
      .orderBy(desc(resenha.criadoEm), desc(resenha.id))
      .limit(limite)
      .offset((page - 1) * limite);

    const [contagem] = await this.db
      .select({ total: count() })
      .from(resenha)
      .innerJoin(
        vLivroReferencia,
        eq(vLivroReferencia.livroId, resenha.livroId),
      )
      .where(filtro);

    return {
      linhas: linhas as LinhaDeResenhaDoPerfil[],
      total: Number(contagem?.total ?? 0),
    };
  }
}
