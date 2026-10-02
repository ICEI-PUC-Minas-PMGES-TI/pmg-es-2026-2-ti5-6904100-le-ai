import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../db/drizzle.module';
import { autor, editora, serie } from '../../db/schema';

/** Teto dos autores na linha de autoria da série (RNF-DES-02). */
const AUTORES_DA_SERIE = 50;

/**
 * Cabeçalho das páginas de autor, editora e série (RF-ACV-10/11/12). Os livros
 * vêm do `BuscaRepository`, pelo mesmo caminho da busca.
 *
 * Autor, editora e série são entidades do catálogo, sem dono e sem conteúdo de
 * usuário: o cabeçalho existe mesmo quando nenhum livro oficial ativo aponta
 * para ele, e a página responde com a lista vazia.
 */
@Injectable()
export class CatalogoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async autor(
    id: string,
  ): Promise<{ id: string; nome: string; biografia: string | null } | null> {
    const [linha] = await this.db
      .select({ id: autor.id, nome: autor.nome, biografia: autor.biografia })
      .from(autor)
      .where(eq(autor.id, id));
    return linha ?? null;
  }

  async editora(id: string): Promise<{ id: string; nome: string } | null> {
    const [linha] = await this.db
      .select({ id: editora.id, nome: editora.nome })
      .from(editora)
      .where(eq(editora.id, id));
    return linha ?? null;
  }

  async serie(id: string): Promise<{ id: string; nome: string } | null> {
    const [linha] = await this.db
      .select({ id: serie.id, nome: serie.nome })
      .from(serie)
      .where(eq(serie.id, id));
    return linha ?? null;
  }

  /**
   * Autores distintos dos livros oficiais ativos da série, por nome sem acento.
   * Livro pessoal nunca tem série (CHECK `livro_oficial_pessoal_ck`), e o
   * predicado literal garante isso também aqui.
   */
  async autoresDaSerie(id: string): Promise<{ id: string; nome: string }[]> {
    const { rows } = await this.db.execute<{ id: string; nome: string }>(sql`
      SELECT a.id, a.nome
      FROM acervo.livro l
      JOIN acervo.livro_autor la ON la.livro_id = l.id
      JOIN acervo.autor a ON a.id = la.autor_id
      WHERE l.serie_id = ${id} AND l.tipo = 'oficial' AND l.ativo
      GROUP BY a.id, a.nome
      ORDER BY acervo.f_busca_normalizar(a.nome), a.id
      LIMIT ${AUTORES_DA_SERIE}
    `);
    return rows;
  }
}
