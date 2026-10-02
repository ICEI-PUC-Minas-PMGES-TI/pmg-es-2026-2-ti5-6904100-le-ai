import type { Pool } from 'pg';

/** ISBN-13 válido a partir de 12 dígitos, com o dígito verificador calculado. */
export function isbn(doze: string): string {
  const soma = [...doze].reduce(
    (total, digito, i) => total + Number(digito) * (i % 2 === 0 ? 1 : 3),
    0,
  );
  return `${doze}${(10 - (soma % 10)) % 10}`;
}

export interface ExtrasDoLivroOficial {
  /** Fixar o id deixa o desempate da ordenação previsível no teste. */
  id?: string;
  ano?: number | null;
  editoraId?: string | null;
  autores?: string[];
  assuntos?: string[];
  capaPropria?: string | null;
  paginas?: number;
  serieId?: string | null;
  numeroSerie?: number | null;
}

export async function inserirLivroOficial(
  pool: Pool,
  isbn13: string,
  titulo = 'Livro oficial de teste',
  extras: ExtrasDoLivroOficial = {},
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO acervo.livro
       (id, isbn13, titulo, paginas, ano_publicacao, editora_id,
        capa_url_externa, capa_url_propria, capa_asset_id, tipo,
        serie_id, numero_serie)
     VALUES (coalesce($1::uuid, gen_random_uuid()), $2, $3, $7, $4, $5,
             'https://covers.openlibrary.org/b/id/1-L.jpg', $6::text,
             CASE WHEN $6::text IS NULL THEN NULL ELSE 'capas/teste' END, 'oficial',
             $8, $9)
     RETURNING id`,
    [
      extras.id ?? null,
      isbn13,
      titulo,
      extras.ano ?? null,
      extras.editoraId ?? null,
      extras.capaPropria ?? null,
      extras.paginas ?? 200,
      extras.serieId ?? null,
      extras.numeroSerie ?? null,
    ],
  );
  const livroId = rows[0].id;
  for (const autorId of extras.autores ?? []) {
    await pool.query(
      `INSERT INTO acervo.livro_autor (livro_id, autor_id) VALUES ($1, $2)`,
      [livroId, autorId],
    );
  }
  for (const assuntoId of extras.assuntos ?? []) {
    await pool.query(
      `INSERT INTO acervo.livro_assunto (livro_id, assunto_id) VALUES ($1, $2)`,
      [livroId, assuntoId],
    );
  }
  return livroId;
}

/**
 * Livro pessoal com o mínimo que o CHECK `livro_oficial_pessoal_ck` exige. Os
 * assuntos existem porque o dono os escolhe (RN-21.5), e a busca precisa
 * ignorá-los mesmo assim.
 */
export async function inserirLivroPessoal(
  pool: Pool,
  donoId: string,
  titulo: string,
  assuntos: string[] = [],
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO acervo.livro
       (titulo, paginas, tipo, dono_id, autor_informado, sinopse_status)
     VALUES ($1, 120, 'pessoal', $2, 'Autora Pessoal', 'ausente')
     RETURNING id`,
    [titulo, donoId],
  );
  for (const assuntoId of assuntos) {
    await pool.query(
      `INSERT INTO acervo.livro_assunto (livro_id, assunto_id) VALUES ($1, $2)`,
      [rows[0].id, assuntoId],
    );
  }
  return rows[0].id;
}

export async function inserirAutor(
  pool: Pool,
  nome: string,
  biografia: string | null = null,
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO acervo.autor (nome, nome_normalizado, biografia)
     VALUES ($1, lower($1), $2) RETURNING id`,
    [nome, biografia],
  );
  return rows[0].id;
}

export async function inserirSerie(pool: Pool, nome: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO acervo.serie (nome, nome_normalizado)
     VALUES ($1, lower($1)) RETURNING id`,
    [nome],
  );
  return rows[0].id;
}

/** Forma externa já normalizada, como a curadoria grava (RN-12). */
export async function inserirSinonimoDeEditora(
  pool: Pool,
  formaExterna: string,
  editoraId: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO acervo.sinonimo_editora (forma_externa, editora_id)
     VALUES ($1, $2)`,
    [formaExterna, editoraId],
  );
}

export async function inserirEditora(
  pool: Pool,
  nome: string,
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO acervo.editora (nome, nome_normalizado)
     VALUES ($1, lower($1)) RETURNING id`,
    [nome],
  );
  return rows[0].id;
}

export async function inserirAssunto(
  pool: Pool,
  nome: string,
  slug: string,
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO acervo.assunto (nome, slug) VALUES ($1, $2) RETURNING id`,
    [nome, slug],
  );
  return rows[0].id;
}
