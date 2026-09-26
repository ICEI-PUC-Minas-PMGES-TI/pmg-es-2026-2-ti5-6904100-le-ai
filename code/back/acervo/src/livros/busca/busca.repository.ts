import { Inject, Injectable } from '@nestjs/common';
import { sql, SQL } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../db/drizzle.module';
import { assunto } from '../../db/schema';

export interface CriteriosDeBusca {
  /** Texto já aparado; ausente na busca só por assunto. */
  q?: string;
  /** ISBN-13 normalizado, quando o `q` é um ISBN válido. */
  isbn13?: string | null;
  assuntoId?: string;
  limit: number;
  offset: number;
}

export interface LinhaDeLivroEncontrado {
  id: string;
  titulo: string;
  anoPublicacao: number | null;
  paginas: number;
  editora: string | null;
  capaUrlPropria: string | null;
  capaUrlExterna: string | null;
  autores: { id: string; nome: string }[];
  assuntos: { id: string; nome: string }[];
}

/** Normalização do banco (migration `0004`): sem acento, em minúsculas. */
const normalizar = (valor: SQL | string): SQL =>
  sql`acervo.f_busca_normalizar(${valor})`;

/**
 * Colunas do `LivroOficialResumo` sobre `acervo.livro l` e `acervo.editora ed`,
 * com autores ordenados por nome e assuntos em JSON. A busca e a página do livro
 * montam o resumo pelo mesmo trecho.
 */
export const COLUNAS_DO_RESUMO = sql`
  l.id,
  l.titulo,
  l.ano_publicacao AS "anoPublicacao",
  l.paginas,
  ed.nome AS editora,
  l.capa_url_propria AS "capaUrlPropria",
  l.capa_url_externa AS "capaUrlExterna",
  coalesce(
    (
      SELECT json_agg(json_build_object('id', a.id, 'nome', a.nome)
                      ORDER BY a.nome, a.id)
      FROM acervo.livro_autor la
      JOIN acervo.autor a ON a.id = la.autor_id
      WHERE la.livro_id = l.id
    ),
    '[]'::json
  ) AS autores,
  coalesce(
    (
      SELECT json_agg(json_build_object('id', s.id, 'nome', s.nome)
                      ORDER BY s.nome, s.id)
      FROM acervo.livro_assunto ls
      JOIN acervo.assunto s ON s.id = ls.assunto_id
      WHERE ls.livro_id = l.id
    ),
    '[]'::json
  ) AS assuntos
`;

/**
 * Busca de livros oficiais (RF-ACV-01, RF-ACV-02, RN-21.6).
 *
 * O texto casa **só por trecho** (`LIKE`) em quatro campos, normalizados pela
 * mesma função dos índices GIN. `word_similarity` só ordena, nunca casa: com
 * ele no filtro, "guimaraes rossa" traria Guimarães Rosa, e o design pede
 * "nenhum resultado" nesse caso.
 *
 * Os candidatos saem de um `UNION ALL` com uma subconsulta por campo, cada uma
 * indexável. Um `OR` entre quatro tabelas faria o planner escolher seq scan.
 *
 * O predicado `l.tipo = 'oficial' AND l.ativo` é escrito **literal**, nunca
 * como parâmetro: é assim que o planner prova que o índice parcial de título
 * serve. Livro pessoal nunca aparece (RNF-SEC-06).
 */
@Injectable()
export class BuscaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Conjunto curado e fechado (RN-21.1), com o teto do servidor. */
  async assuntos(): Promise<{ id: string; nome: string }[]> {
    return this.db
      .select({ id: assunto.id, nome: assunto.nome })
      .from(assunto)
      .orderBy(normalizar(sql`${assunto.nome}`), assunto.nome)
      .limit(100);
  }

  /** Total de edições encontradas, independente da página pedida. */
  async contar(criterios: CriteriosDeBusca): Promise<number> {
    const { rows } = await this.db.execute<{ total: number }>(sql`
      WITH ${this.encontrados(criterios)}
      SELECT count(*)::int AS total FROM encontrados
    `);
    return Number(rows[0]?.total ?? 0);
  }

  /**
   * Uma página de edições, na ordem em que as do mesmo grupo chegam contíguas.
   *
   * **Grupo** é título normalizado + autores (RN-01: o cliente agrupa as
   * edições). Livro sem autor usa o próprio `id` como chave: são centenas no
   * acervo carregado, e sem isso todos os "sem autor" de mesmo título virariam
   * uma obra só. A pontuação do grupo é a melhor das suas edições, e dentro do
   * grupo a mais recente vem primeiro.
   *
   * A página é recortada antes de montar autores e assuntos, para o `json_agg`
   * rodar só nas linhas devolvidas.
   */
  async pagina(criterios: CriteriosDeBusca): Promise<LinhaDeLivroEncontrado[]> {
    const { rows } = await this.db.execute<Record<string, unknown>>(sql`
      WITH ${this.encontrados(criterios)},
      ordenados AS (
        SELECT
          e.livro_id,
          l.ano_publicacao,
          g.grupo,
          max(e.pontuacao) OVER (PARTITION BY g.grupo) AS pontuacao_grupo
        FROM encontrados e
        JOIN acervo.livro l ON l.id = e.livro_id
        CROSS JOIN LATERAL (
          SELECT ${normalizar(sql`l.titulo`)} || '|' || coalesce(
            (
              SELECT string_agg(la.autor_id::text, ',' ORDER BY la.autor_id)
              FROM acervo.livro_autor la
              WHERE la.livro_id = l.id
            ),
            l.id::text
          ) AS grupo
        ) g
      ),
      pagina AS (
        SELECT
          o.livro_id,
          row_number() OVER (
            ORDER BY o.pontuacao_grupo DESC, o.grupo,
                     o.ano_publicacao DESC NULLS LAST, o.livro_id
          ) AS posicao
        FROM ordenados o
        ORDER BY posicao
        LIMIT ${criterios.limit} OFFSET ${criterios.offset}
      )
      SELECT ${COLUNAS_DO_RESUMO}
      FROM pagina p
      JOIN acervo.livro l ON l.id = p.livro_id
      LEFT JOIN acervo.editora ed ON ed.id = l.editora_id
      ORDER BY p.posicao
    `);
    return rows as unknown as LinhaDeLivroEncontrado[];
  }

  /**
   * CTE `encontrados (livro_id, pontuacao)`: uma linha por edição oficial que
   * atende os critérios.
   *
   * A pontuação põe o campo antes da semelhança (título > autor > editora >
   * assunto): cada campo soma um degrau de 2, e `word_similarity` vai de 0 a 1,
   * então um degrau nunca é alcançado pelo de baixo. O ISBN exato fica acima de
   * todos. Sem `q`, todos empatam e a ordem é a do grupo, ou seja, por título.
   */
  private encontrados(criterios: CriteriosDeBusca): SQL {
    const filtroDeAssunto = criterios.assuntoId
      ? sql`AND EXISTS (
          SELECT 1 FROM acervo.livro_assunto fa
          WHERE fa.livro_id = l.id AND fa.assunto_id = ${criterios.assuntoId}
        )`
      : sql``;

    if (!criterios.q) {
      return sql`encontrados AS (
        SELECT l.id AS livro_id, 0::float8 AS pontuacao
        FROM acervo.livro l
        WHERE l.tipo = 'oficial' AND l.ativo ${filtroDeAssunto}
      )`;
    }

    const termo = normalizar(criterios.q);
    // `%`, `_` e `\` do texto viram literais, escapados depois de normalizar:
    // o LIKE usa `\` como escape por padrão.
    const padrao = sql`'%' || replace(replace(replace(${termo}, '\\', '\\\\'), '%', '\\%'), '_', '\\_') || '%'`;
    const semelhanca = (campo: SQL): SQL =>
      sql`public.word_similarity(${termo}, ${normalizar(campo)})::float8`;

    const porIsbn = criterios.isbn13
      ? sql`UNION ALL
        SELECT l.id, 8::float8
        FROM acervo.livro l
        WHERE l.isbn13 = ${criterios.isbn13} AND l.tipo = 'oficial' AND l.ativo`
      : sql``;

    return sql`candidatos (livro_id, pontuacao) AS (
        SELECT l.id, 6 + ${semelhanca(sql`l.titulo`)}
        FROM acervo.livro l
        WHERE l.tipo = 'oficial' AND l.ativo
          AND ${normalizar(sql`l.titulo`)} LIKE ${padrao}
        UNION ALL
        SELECT la.livro_id, 4 + ${semelhanca(sql`a.nome`)}
        FROM acervo.autor a
        JOIN acervo.livro_autor la ON la.autor_id = a.id
        WHERE ${normalizar(sql`a.nome`)} LIKE ${padrao}
        UNION ALL
        SELECT l.id, 2 + ${semelhanca(sql`e.nome`)}
        FROM acervo.editora e
        JOIN acervo.livro l ON l.editora_id = e.id
        WHERE ${normalizar(sql`e.nome`)} LIKE ${padrao}
        UNION ALL
        SELECT ls.livro_id, ${semelhanca(sql`s.nome`)}
        FROM acervo.assunto s
        JOIN acervo.livro_assunto ls ON ls.assunto_id = s.id
        WHERE ${normalizar(sql`s.nome`)} LIKE ${padrao}
        ${porIsbn}
      ),
      encontrados AS (
        SELECT c.livro_id, max(c.pontuacao) AS pontuacao
        FROM candidatos c
        JOIN acervo.livro l ON l.id = c.livro_id
        WHERE l.tipo = 'oficial' AND l.ativo ${filtroDeAssunto}
        GROUP BY c.livro_id
      )`;
  }
}
