import {
  AutorExterno,
  FonteDeMetadados,
  MetadadosLivro,
} from './fonte-metadados';
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

/**
 * Teto de autores resolvidos por edição. Cada um custa uma ida a
 * `/authors/{key}.json`; edição com mais que isso é coletânea, e os primeiros
 * bastam para a exibição.
 */
const MAX_AUTORES = 5;
const CHAVE_AUTOR = /^OL[0-9]+A$/;

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
      autores: await this.resolverAutores(bruto.authors ?? []),
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

  /**
   * A edição só traz a chave do autor; o nome vive em `/authors/{key}.json`.
   * A chave é validada antes de virar caminho de URL (RNF-SEC-38), e autor que
   * a fonte não conhece é omitido em vez de derrubar a importação inteira.
   * Indisponibilidade propaga: meia resposta não é resposta.
   */
  private async resolverAutores(
    referencias: { key?: string }[],
  ): Promise<AutorExterno[]> {
    const chaves = referencias
      .map((autor) => autor.key?.split('/').pop())
      .filter((chave): chave is string => !!chave && CHAVE_AUTOR.test(chave))
      .slice(0, MAX_AUTORES);

    const autores: AutorExterno[] = [];
    for (const chave of chaves) {
      const url = new URL(`${BASE}/authors/${chave}.json`);
      const bruto = (await this.resiliencia.executar(this.nome, () =>
        this.http.buscarJson(this.nome, url),
      )) as { name?: string } | null;
      const nome = bruto?.name?.trim();
      if (nome) autores.push({ nome, olAuthorKey: chave });
    }
    return autores;
  }
}

/** `publish_date` é texto livre na origem ("2019", "Jan 2019", "2019-03-01"). */
export function extrairAno(bruto: string | undefined): number | null {
  const encontrado = /(1[0-9]{3}|20[0-9]{2})/.exec(bruto ?? '');
  return encontrado ? Number(encontrado[1]) : null;
}
