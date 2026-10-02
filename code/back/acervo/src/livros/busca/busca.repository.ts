import { Inject, Injectable } from '@nestjs/common';
import { sql, SQL } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../db/drizzle.module';
import { assunto } from '../../db/schema';

/**
 * Ordem da página:
 *
 * - `relevancia`: a da busca (pontuação do grupo; sem `q`, por título);
 * - `ano-do-grupo`: páginas de autor e editora, do grupo de ano mais recente
 *   para o mais antigo, com os grupos sem ano no fim;
 * - `serie`: página de série, pelo número de ordem (RN-12), com os livros sem
 *   número no fim, por título.
 */
export type OrdemDaPagina = 'relevancia' | 'ano-do-grupo' | 'serie';

export interface CriteriosDeBusca {
  /** Texto já aparado; ausente na busca só por filtros. */
  q?: string;
  /** As palavras de `q` (`palavrasDaBusca`); todas casam no mesmo campo. */
  palavras?: string[];
  /** ISBN-13 normalizado, quando o `q` é um ISBN-13 ou ISBN-10 válido. */
  isbn13?: string | null;
  assuntoId?: string;
  /**
   * Palavras dos filtros de texto de RF-ACV-03 (`palavrasDaBusca`): todas
   * precisam aparecer no nome de um mesmo autor, da editora ou da série.
   */
  autorPalavras?: string[];
  editoraPalavras?: string[];
  seriePalavras?: string[];
  ano?: number;
  paginasMin?: number;
  paginasMax?: number;
  /** Páginas de catálogo (RF-ACV-10/11/12): o livro é desse autor, editora ou série. */
  autorId?: string;
  editoraId?: string;
  serieId?: string;
  /** `relevancia` quando ausente. */
  ordem?: OrdemDaPagina;
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
  /** Número de ordem na série; só a página da série o expõe. */
  numeroSerie: number | null;
}

/** Normalização do banco (migration `0004`): sem acento, em minúsculas. */
const normalizar = (valor: SQL | string): SQL =>
  sql`acervo.f_busca_normalizar(${valor})`;

/**
 * `%`, `_` e `\` do texto viram literais, escapados depois de normalizar: o
 * LIKE usa `\` como escape por padrão.
 */
const padrao = (palavra: string): SQL =>
  sql`'%' || replace(replace(replace(${normalizar(palavra)}, '\\', '\\\\'), '%', '\\%'), '_', '\\_') || '%'`;

/** Um `LIKE` por palavra, cada um indexável pelo GIN trigram do campo. */
const contemTodas = (campo: SQL, palavras: string[]): SQL =>
  sql.join(
    palavras.map(
      (palavra) => sql`${normalizar(campo)} LIKE ${padrao(palavra)}`,
    ),
    sql` AND `,
  );

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
  l.numero_serie AS "numeroSerie",
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

/** O campo só com letras e números, separados por um espaço. */
const soPalavras = (valor: SQL): SQL =>
  sql`btrim(regexp_replace(${valor}, '[^[:alnum:]]+', ' ', 'g'))`;

/**
 * Busca de livros oficiais (RF-ACV-01, RF-ACV-02, RN-21.6).
 *
 * O texto casa **só por trecho** (`LIKE`) em quatro campos, normalizados pela
 * mesma função dos índices GIN, e **palavra por palavra**: todas as palavras
 * precisam aparecer no mesmo campo, em qualquer posição (`palavrasDaBusca`).
 * `word_similarity` só ordena, nunca casa: com ele no filtro, "guimaraes rossa"
 * traria Guimarães Rosa, e o design pede "nenhum resultado" nesse caso.
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
   * uma obra só. A pontuação do grupo é a melhor das suas edições, o ano do
   * grupo é o mais recente delas, e dentro do grupo a mais recente vem primeiro.
   * O `livro_id` fecha o desempate: a ordem não muda entre uma página e outra.
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
          l.numero_serie,
          g.grupo,
          max(e.pontuacao) OVER (PARTITION BY g.grupo) AS pontuacao_grupo,
          max(l.ano_publicacao) OVER (PARTITION BY g.grupo) AS ano_grupo
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
            ORDER BY ${ORDEM[criterios.ordem ?? 'relevancia']},
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
   * assunto): cada campo soma um degrau de 2, e a semelhança vai de 0 a 1, então
   * um degrau nunca é alcançado pelo de baixo. Acima deles, o **casamento
   * integral**: título ou autor que, sem pontuação, é exatamente o texto
   * buscado. É o que põe "Dom Casmurro" antes de "Dom Casmurro e os discos
   * voadores" e os livros de Machado de Assis antes dos livros sobre ele. O ISBN
   * exato fica acima de todos. Sem `q`, todos empatam e a ordem é a do grupo, ou
   * seja, por título.
   *
   * A semelhança é `word_similarity` com desempate por `similarity`, que pesa o
   * tamanho do campo: entre dois títulos que contêm o texto, o mais curto vem
   * antes.
   */
  private encontrados(criterios: CriteriosDeBusca): SQL {
    const filtros = this.filtros(criterios);

    if (!criterios.q) {
      return sql`encontrados AS (
        SELECT l.id AS livro_id, 0::float8 AS pontuacao
        FROM acervo.livro l
        WHERE l.tipo = 'oficial' AND l.ativo ${filtros}
      )`;
    }

    const termo = normalizar(criterios.q);
    const palavras = criterios.palavras?.length
      ? criterios.palavras
      : [criterios.q];
    const contemAsPalavras = (campo: SQL): SQL => contemTodas(campo, palavras);
    const semelhanca = (campo: SQL): SQL =>
      sql`(0.75 * public.word_similarity(${termo}, ${normalizar(campo)})
         + 0.25 * public.similarity(${termo}, ${normalizar(campo)}))::float8`;
    const integral = (campo: SQL): SQL =>
      sql`(${soPalavras(normalizar(campo))} = ${soPalavras(termo)}
         AND ${soPalavras(termo)} <> '')`;

    const porIsbn = criterios.isbn13
      ? sql`UNION ALL
        SELECT l.id, 20::float8
        FROM acervo.livro l
        WHERE l.isbn13 = ${criterios.isbn13} AND l.tipo = 'oficial' AND l.ativo`
      : sql``;

    return sql`candidatos (livro_id, pontuacao) AS (
        SELECT l.id,
               CASE WHEN ${integral(sql`l.titulo`)} THEN 12 ELSE 6 END
               + ${semelhanca(sql`l.titulo`)}
        FROM acervo.livro l
        WHERE l.tipo = 'oficial' AND l.ativo
          AND ${contemAsPalavras(sql`l.titulo`)}
        UNION ALL
        SELECT la.livro_id,
               CASE WHEN ${integral(sql`a.nome`)} THEN 10 ELSE 4 END
               + ${semelhanca(sql`a.nome`)}
        FROM acervo.autor a
        JOIN acervo.livro_autor la ON la.autor_id = a.id
        WHERE ${contemAsPalavras(sql`a.nome`)}
        UNION ALL
        SELECT l.id, 2 + ${semelhanca(sql`e.nome`)}
        FROM acervo.editora e
        JOIN acervo.livro l ON l.editora_id = e.id
        WHERE ${contemAsPalavras(sql`e.nome`)}
        UNION ALL
        SELECT ls.livro_id, ${semelhanca(sql`s.nome`)}
        FROM acervo.assunto s
        JOIN acervo.livro_assunto ls ON ls.assunto_id = s.id
        WHERE ${contemAsPalavras(sql`s.nome`)}
        ${porIsbn}
      ),
      encontrados AS (
        SELECT c.livro_id, max(c.pontuacao) AS pontuacao
        FROM candidatos c
        JOIN acervo.livro l ON l.id = c.livro_id
        WHERE l.tipo = 'oficial' AND l.ativo ${filtros}
        GROUP BY c.livro_id
      )`;
  }

  /**
   * Predicados sobre `acervo.livro l` que restringem o conjunto, já com o `AND`
   * na frente: o assunto (RF-ACV-02), os filtros de RF-ACV-03 e o autor, a
   * editora ou a série das páginas de catálogo. Entram no `WHERE` que já tem o
   * predicado literal de livro oficial ativo, então livro pessoal nunca passa
   * (RNF-SEC-06).
   *
   * Os filtros de texto casam como o `q`: por trecho, sem acento e palavra por
   * palavra, todas no nome de um **mesmo** autor. A editora casa também pelos
   * sinônimos da curadoria (RN-12), então "cia das letras" acha a Companhia
   * das Letras.
   */
  private filtros(criterios: CriteriosDeBusca): SQL {
    const partes: SQL[] = [];

    if (criterios.assuntoId) {
      partes.push(sql`EXISTS (
        SELECT 1 FROM acervo.livro_assunto fa
        WHERE fa.livro_id = l.id AND fa.assunto_id = ${criterios.assuntoId}
      )`);
    }
    if (criterios.autorId) {
      partes.push(sql`EXISTS (
        SELECT 1 FROM acervo.livro_autor fla
        WHERE fla.livro_id = l.id AND fla.autor_id = ${criterios.autorId}
      )`);
    }
    if (criterios.editoraId) {
      partes.push(sql`l.editora_id = ${criterios.editoraId}`);
    }
    if (criterios.serieId) {
      partes.push(sql`l.serie_id = ${criterios.serieId}`);
    }
    if (criterios.autorPalavras?.length) {
      partes.push(sql`EXISTS (
        SELECT 1 FROM acervo.livro_autor fla
        JOIN acervo.autor fa ON fa.id = fla.autor_id
        WHERE fla.livro_id = l.id
          AND ${contemTodas(sql`fa.nome`, criterios.autorPalavras)}
      )`);
    }
    if (criterios.editoraPalavras?.length) {
      const palavras = criterios.editoraPalavras;
      partes.push(sql`EXISTS (
        SELECT 1 FROM acervo.editora fe
        WHERE fe.id = l.editora_id
          AND (${contemTodas(sql`fe.nome`, palavras)}
               OR EXISTS (
                 SELECT 1 FROM acervo.sinonimo_editora fse
                 WHERE fse.editora_id = fe.id
                   AND ${contemTodas(sql`fse.forma_externa`, palavras)}
               ))
      )`);
    }
    if (criterios.seriePalavras?.length) {
      partes.push(sql`EXISTS (
        SELECT 1 FROM acervo.serie fs
        WHERE fs.id = l.serie_id
          AND ${contemTodas(sql`fs.nome`, criterios.seriePalavras)}
      )`);
    }
    if (criterios.ano !== undefined) {
      partes.push(sql`l.ano_publicacao = ${criterios.ano}`);
    }
    if (criterios.paginasMin !== undefined) {
      partes.push(sql`l.paginas >= ${criterios.paginasMin}`);
    }
    if (criterios.paginasMax !== undefined) {
      partes.push(sql`l.paginas <= ${criterios.paginasMax}`);
    }

    return partes.length > 0 ? sql`AND ${sql.join(partes, sql` AND `)}` : sql``;
  }
}

/**
 * Início do `ORDER BY` de cada ordem, sobre a CTE `ordenados o`; o desempate
 * por ano da edição e `livro_id` é comum. `o.grupo` começa pelo título
 * normalizado, então ordenar por ele é ordenar por título mantendo as edições
 * do grupo juntas.
 */
const ORDEM: Record<OrdemDaPagina, SQL> = {
  relevancia: sql`o.pontuacao_grupo DESC, o.grupo`,
  'ano-do-grupo': sql`o.ano_grupo DESC NULLS LAST, o.grupo`,
  serie: sql`o.numero_serie ASC NULLS LAST, o.grupo`,
};
