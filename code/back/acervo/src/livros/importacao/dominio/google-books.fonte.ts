import { FonteDeMetadados, MetadadosLivro } from './fonte-metadados';
import { HttpExterno } from './http-externo';
import { PoliticaDeResiliencia } from './politica-resiliencia';
import { extrairAno } from './openlibrary.fonte';

/**
 * Fonte secundária: Google Books (§10.1).
 *
 * Consultada **apenas quando a primária não retorna resultado**. A cobertura
 * por ISBN permanece não medida: na P-14 (16/08/2026), 69% das consultas foram
 * bloqueadas por cota e 31% não tinham ISBN-13 em português. É pendência
 * registrada no arquivo da feature — não bloqueia, mas afeta a taxa de acerto.
 *
 * Resultado vazio aqui significa `totalItems: 0`, não erro HTTP: a API responde
 * 200 com lista vazia quando não conhece o ISBN.
 */
const BASE = 'https://www.googleapis.com/books/v1/volumes';

interface VolumeGoogle {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    pageCount?: number;
    imageLinks?: { thumbnail?: string };
  };
}

export class GoogleBooksFonte implements FonteDeMetadados {
  readonly nome = 'google-books';

  constructor(
    private readonly http: HttpExterno,
    private readonly resiliencia: PoliticaDeResiliencia,
    private readonly apiKey?: string,
  ) {}

  async buscarPorIsbn(isbn13: string): Promise<MetadadosLivro | null> {
    const url = new URL(BASE);
    url.searchParams.set('q', `isbn:${isbn13}`);
    url.searchParams.set('maxResults', '1');
    if (this.apiKey) {
      url.searchParams.set('key', this.apiKey);
    }

    const bruto = (await this.resiliencia.executar(this.nome, () =>
      this.http.buscarJson(this.nome, url),
    )) as { totalItems?: number; items?: VolumeGoogle[] } | null;

    const info = bruto?.items?.[0]?.volumeInfo;
    if (!info?.title?.trim()) {
      return null;
    }

    return {
      isbn13,
      titulo: info.title.trim(),
      autores: (info.authors ?? [])
        .map((nome) => nome.trim())
        .filter(Boolean)
        .map((nome) => ({ nome, olAuthorKey: null })),
      editora: info.publisher?.trim() ?? null,
      anoPublicacao: extrairAno(info.publishedDate),
      paginas: typeof info.pageCount === 'number' ? info.pageCount : null,
      // A thumbnail do Google vem em http; a capa persistida precisa ser https.
      capaUrl: info.imageLinks?.thumbnail?.replace(/^http:/, 'https:') ?? null,
      olEditionKey: null,
      olWorkKey: null,
    };
  }
}
