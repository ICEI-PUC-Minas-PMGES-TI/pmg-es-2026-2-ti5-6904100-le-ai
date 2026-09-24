import { sql, type SQL } from 'drizzle-orm';
import {
  normalizarEditora,
  normalizarNomeAutor,
} from '../../common/normalizacao';
import type { Tx } from '../../db/tipos';
import type { AutorExterno, MetadadosLivro } from './dominio/fonte-metadados';
import type { RepositorioDeConvergencia } from './dominio/processador-importacao';

/** Mesmo teto de título do livro pessoal (`LivroPessoalEntrada`). */
const TITULO_MAX = 500;
const PAGINAS_MAX = 20_000;
const ERRO_MAX = 500;

/**
 * Convergência da importação por ISBN sobre o `tx` do consumidor.
 *
 * Uma instância por mensagem, presa à transação que o runtime de P0-MSG abriu
 * para gravar o recibo em `mensagem_processada`: livro, vínculos e estado da
 * importação commitam junto com o recibo, ou nenhum deles commita.
 *
 * Todo INSERT que pode colidir é `ON CONFLICT DO NOTHING` seguido de leitura.
 * É isso que sustenta RNF-ARQ-05: duas importações concorrentes do mesmo ISBN
 * esperam uma pela outra no índice único e as duas terminam no mesmo livro, sem
 * que nenhuma vá para a DLQ por violação de unicidade.
 */
export class ConvergenciaRepository implements RepositorioDeConvergencia {
  constructor(private readonly tx: Tx) {}

  async criarOuObterLivroOficial(metadados: MetadadosLivro): Promise<string> {
    const dados = sanear(metadados);

    const existente = await this.primeiroId(sql`
      SELECT id FROM acervo.livro
       WHERE isbn13 = ${dados.isbn13}
          OR (${dados.olEditionKey}::text IS NOT NULL
              AND ol_edition_key = ${dados.olEditionKey})
       ORDER BY (isbn13 = ${dados.isbn13}) DESC
       LIMIT 1
    `);
    if (existente) return existente;

    const editoraId = await this.editora(dados.editora);

    // `tipo='oficial'` exige, pelo CHECK `livro_oficial_pessoal_ck`, ISBN,
    // capa externa não vazia, sem dono e sem autor informado. `sinopse_status`
    // fica em `nao_consultada`: sinopse é sob demanda (RN-19.1).
    const criado = await this.primeiroId(sql`
      INSERT INTO acervo.livro (
        isbn13, ol_edition_key, ol_work_key, titulo, ano_publicacao, paginas,
        capa_url_externa, tipo, editora_id, ativo
      ) VALUES (
        ${dados.isbn13}, ${dados.olEditionKey}, ${dados.olWorkKey},
        ${dados.titulo}, ${dados.anoPublicacao}, ${dados.paginas},
        ${dados.capaUrl}, 'oficial', ${editoraId}, true
      )
      ON CONFLICT (isbn13) WHERE isbn13 IS NOT NULL DO NOTHING
      RETURNING id
    `);

    if (!criado) {
      // Outra importação do mesmo ISBN commitou entre a leitura e o INSERT. O
      // livro dela é o nosso: é a convergência, não um erro.
      const vencedor = await this.primeiroId(sql`
        SELECT id FROM acervo.livro WHERE isbn13 = ${dados.isbn13}
      `);
      if (!vencedor) {
        throw new Error(`livro com ISBN ${dados.isbn13} sumiu após conflito`);
      }
      return vencedor;
    }

    for (const autor of dados.autores) {
      const autorId = await this.autor(autor);
      await this.tx.execute(sql`
        INSERT INTO acervo.livro_autor (livro_id, autor_id)
        VALUES (${criado}, ${autorId})
        ON CONFLICT DO NOTHING
      `);
    }

    return criado;
  }

  async concluir(importacaoId: string, livroId: string): Promise<void> {
    await this.transitar(
      importacaoId,
      sql`estado = 'concluida', livro_id = ${livroId}, erro = NULL`,
    );
  }

  async marcarNaoEncontrado(importacaoId: string): Promise<void> {
    await this.transitar(
      importacaoId,
      sql`estado = 'nao_encontrado', livro_id = NULL, erro = NULL`,
    );
  }

  async marcarFalhaTransitoria(
    importacaoId: string,
    erro: string,
  ): Promise<void> {
    // O CHECK exige `erro` não vazio em `falha_transitoria`.
    const motivo = erro.trim().slice(0, ERRO_MAX) || 'fonte indisponível';
    await this.transitar(
      importacaoId,
      sql`estado = 'falha_transitoria', livro_id = NULL, erro = ${motivo}`,
    );
  }

  /**
   * Só sai de `pendente`. Uma reentrega tardia não pode reescrever uma
   * importação que outra entrega já encerrou — nem um `reprocessar` que a
   * reabriu depois.
   */
  private async transitar(importacaoId: string, atribuicoes: SQL) {
    await this.tx.execute(sql`
      UPDATE acervo.importacao_livro
         SET ${atribuicoes}, atualizado_em = now()
       WHERE id = ${importacaoId} AND estado = 'pendente'
    `);
  }

  /**
   * Normalização e tabela de sinônimos, nesta ordem (RN-12). A entidade
   * `Editora` nasce da forma normalizada.
   */
  private async editora(nome: string | null): Promise<string | null> {
    const normalizada = normalizarEditora(nome);
    if (!nome || !normalizada) return null;

    const sinonimo = await this.primeiroId(sql`
      SELECT editora_id AS id FROM acervo.sinonimo_editora
       WHERE forma_externa = ${normalizada}
    `);
    if (sinonimo) return sinonimo;

    await this.tx.execute(sql`
      INSERT INTO acervo.editora (nome, nome_normalizado)
      VALUES (${nome}, ${normalizada})
      ON CONFLICT (nome_normalizado) DO NOTHING
    `);
    return this.primeiroId(sql`
      SELECT id FROM acervo.editora WHERE nome_normalizado = ${normalizada}
    `);
  }

  /**
   * RN-12: autor é deduplicado pela chave da fonte quando ela existe, senão
   * pelo nome normalizado. Sem chave, procura primeiro qualquer autor com o
   * mesmo nome — inclusive os que a carga do dump criou com chave —, para que a
   * importação pelo Google Books não crie um "Machado de Assis" paralelo.
   */
  private async autor(autor: AutorExterno): Promise<string> {
    const normalizado = normalizarNomeAutor(autor.nome);

    if (autor.olAuthorKey) {
      await this.tx.execute(sql`
        INSERT INTO acervo.autor (nome, nome_normalizado, ol_author_key)
        VALUES (${autor.nome}, ${normalizado}, ${autor.olAuthorKey})
        ON CONFLICT (ol_author_key) WHERE ol_author_key IS NOT NULL DO NOTHING
      `);
      const id = await this.primeiroId(sql`
        SELECT id FROM acervo.autor WHERE ol_author_key = ${autor.olAuthorKey}
      `);
      if (!id)
        throw new Error(`autor ${autor.olAuthorKey} sumiu após conflito`);
      return id;
    }

    const existente = await this.primeiroId(sql`
      SELECT id FROM acervo.autor
       WHERE nome_normalizado = ${normalizado}
       ORDER BY ol_author_key NULLS LAST
       LIMIT 1
    `);
    if (existente) return existente;

    await this.tx.execute(sql`
      INSERT INTO acervo.autor (nome, nome_normalizado)
      VALUES (${autor.nome}, ${normalizado})
      ON CONFLICT (nome_normalizado) WHERE ol_author_key IS NULL DO NOTHING
    `);
    const id = await this.primeiroId(sql`
      SELECT id FROM acervo.autor
       WHERE nome_normalizado = ${normalizado} AND ol_author_key IS NULL
    `);
    if (!id) throw new Error(`autor "${autor.nome}" sumiu após conflito`);
    return id;
  }

  private async primeiroId(consulta: SQL): Promise<string | null> {
    const resultado = await this.tx.execute(consulta);
    const linhas = (resultado as unknown as { rows: { id: string }[] }).rows;
    return linhas[0]?.id ?? null;
  }
}

/**
 * Dado externo validado e normalizado antes de persistir, nunca confiado por
 * origem (RNF-SEC-33). O processador já descartou o que não tem título,
 * páginas ou capa; aqui se corta o que passaria do tamanho das colunas ou
 * violaria um CHECK, e se exige capa em https.
 */
export function sanear(m: MetadadosLivro) {
  const capa = urlHttps(m.capaUrl);
  if (!capa) throw new Error('capa externa sem URL https válida');

  const anoAtual = new Date().getUTCFullYear();
  const autoresVistos = new Set<string>();

  return {
    isbn13: m.isbn13,
    titulo: m.titulo.trim().slice(0, TITULO_MAX),
    paginas: Math.min(Math.trunc(m.paginas ?? 0), PAGINAS_MAX),
    anoPublicacao:
      m.anoPublicacao && m.anoPublicacao > 0 && m.anoPublicacao <= anoAtual + 1
        ? m.anoPublicacao
        : null,
    capaUrl: capa,
    editora: m.editora?.trim() ? m.editora.trim().slice(0, 200) : null,
    olEditionKey: m.olEditionKey,
    olWorkKey: m.olWorkKey,
    autores: m.autores
      .map((a) => ({ ...a, nome: a.nome.trim().slice(0, 200) }))
      .filter((a) => {
        const chave = a.olAuthorKey ?? normalizarNomeAutor(a.nome);
        if (!a.nome || !normalizarNomeAutor(a.nome) || autoresVistos.has(chave))
          return false;
        autoresVistos.add(chave);
        return true;
      }),
  };
}

function urlHttps(bruta: string | null): string | null {
  if (!bruta) return null;
  try {
    const url = new URL(bruta);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
