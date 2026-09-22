import type { Pool } from 'pg';

/** ISBN-13 válido a partir de 12 dígitos, com o dígito verificador calculado. */
export function isbn(doze: string): string {
  const soma = [...doze].reduce(
    (total, digito, i) => total + Number(digito) * (i % 2 === 0 ? 1 : 3),
    0,
  );
  return `${doze}${(10 - (soma % 10)) % 10}`;
}

export async function inserirLivroOficial(
  pool: Pool,
  isbn13: string,
  titulo = 'Livro oficial de teste',
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO acervo.livro (isbn13, titulo, paginas, capa_url_externa, tipo)
     VALUES ($1, $2, 200, 'https://covers.openlibrary.org/b/id/1-L.jpg', 'oficial')
     RETURNING id`,
    [isbn13, titulo],
  );
  return rows[0].id;
}
