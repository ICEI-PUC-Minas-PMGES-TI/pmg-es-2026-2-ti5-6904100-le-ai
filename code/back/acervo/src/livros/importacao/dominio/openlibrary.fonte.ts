import { FonteDeMetadados, MetadadosLivro } from './fonte-metadados';
import { HttpExterno } from './http-externo';
import { PoliticaDeResiliencia } from './politica-resiliencia';

/**
 * Fonte primária: OpenLibrary (§10.1).
 *
 * Sem chave de API e sem custo, mas **exige `User-Agent` identificando a
 * aplicação**. A cobertura de ISBNs brasileiros é inconsistente, e é justamente
 * por isso que existe a fonte secundária.
 *
 * A URL é montada aqui a partir do ISBN já validado, nunca recebida
 * (RNF-SEC-38). A capa é referenciada por `cover_id`, não por ISBN, para escapar
 * do limite de taxa daquele caminho (§10.1).
 */
const BASE = 'https://openlibrary.org';
const CAPA = 'https://covers.openlibrary.org/b/id/{id}-L.jpg';

interface EdicaoOpenLibrary {
  key?: string;
  title?: string;
  number_of_pages?: number;
  publishers?: string[];
  publish_date?: string;
  covers?: number[];
  works?: { key?: string }[];
  authors?: { key?: string }[];
}

export class OpenLibraryFonte implements FonteDeMetadados {
  readonly nome = 'openlibrary';

  constructor(
    private readonly http: HttpExterno,
    private readonly resiliencia: PoliticaDeResiliencia,
  ) {}

  async buscarPorIsbn(isbn13: string): Promise<MetadadosLivro | null> {
    const url = new URL(`${BASE}/isbn/${encodeURIComponent(isbn13)}.json`);

    const bruto = (await this.resiliencia.executar(this.nome, () =>
      this.http.buscarJson(this.nome, url),
    )) as EdicaoOpenLibrary | null;

    if (!bruto || !bruto.title?.trim()) {
      return null;
    }

    const capaId = (bruto.covers ?? []).find(
      (id) => typeof id === 'number' && id > 0,
    );

    return {
      isbn13,
      titulo: bruto.title.trim(),
      // Só as chaves; resolver o nome exigiria uma consulta por autor, e o
      // consumidor decide se vale a ida extra.
      autores: (bruto.authors ?? [])
        .map((autor) => autor.key?.split('/').pop())
        .filter((chave): chave is string => Boolean(chave)),
      editora: bruto.publishers?.[0]?.trim() ?? null,
      anoPublicacao: extrairAno(bruto.publish_date),
      paginas:
        typeof bruto.number_of_pages === 'number'
          ? bruto.number_of_pages
          : null,
      capaUrl: capaId ? CAPA.replace('{id}', String(capaId)) : null,
      olEditionKey: bruto.key?.split('/').pop() ?? null,
      olWorkKey: bruto.works?.[0]?.key?.split('/').pop() ?? null,
    };
  }
}

/** `publish_date` é texto livre na origem ("2019", "Jan 2019", "2019-03-01"). */
export function extrairAno(bruto: string | undefined): number | null {
  const encontrado = /(1[0-9]{3}|20[0-9]{2})/.exec(bruto ?? '');
  return encontrado ? Number(encontrado[1]) : null;
}
