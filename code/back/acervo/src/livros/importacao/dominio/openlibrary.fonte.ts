import {
  AutorExterno,
  FonteDeMetadados,
  MetadadosLivro,
} from './fonte-metadados';
import { nomeDeAutorUtilizavel } from '../../../common/normalizacao';
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
const CHAVE_OBRA = /^OL[0-9]+W$/;

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
      autores: await this.autoresDaEdicao(bruto),
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
   * Autor da edição, com a obra como plano B. Muitas edições brasileiras na
   * OpenLibrary não têm `authors` — só a obra tem, e a lista da obra mistura o
   * autor com tradutor e prefaciador cadastrados como autor. Por isso da obra
   * vem **só o primeiro**, que é o autor principal na prática da fonte.
   */
  private async autoresDaEdicao(
    edicao: EdicaoOpenLibrary,
  ): Promise<AutorExterno[]> {
    const daEdicao = await this.resolverAutores(edicao.authors ?? []);
    if (daEdicao.length > 0) {
      return daEdicao;
    }

    const chaveObra = edicao.works?.[0]?.key?.split('/').pop();
    if (!chaveObra || !CHAVE_OBRA.test(chaveObra)) {
      return [];
    }
    const url = new URL(`${BASE}/works/${chaveObra}.json`);
    const obra = (await this.resiliencia.executar(this.nome, () =>
      this.http.buscarJson(this.nome, url),
    )) as { authors?: { author?: { key?: string } }[] } | null;

    const principal = (obra?.authors ?? [])
      .map((autor) => ({ key: autor.author?.key }))
      .slice(0, 1);
    return this.resolverAutores(principal);
  }

  /**
   * A edição só traz a chave do autor; o nome e a biografia (RF-ACV-10) vivem
   * em `/authors/{key}.json`, e vêm na mesma ida.
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
      )) as { name?: string; bio?: unknown } | null;
      const nome = bruto?.name?.trim();
      // Marcador como `[author not identified]` conta como ausência, e aí a obra entra.
      if (nome && nomeDeAutorUtilizavel(nome)) {
        autores.push({
          nome,
          olAuthorKey: chave,
          biografia: extrairBiografia(bruto?.bio),
        });
      }
    }
    return autores;
  }
}

/**
 * `bio` chega como texto ou como `{ type: '/type/text', value }`, conforme a
 * época do registro na OpenLibrary. Qualquer outra forma conta como ausência.
 */
export function extrairBiografia(bruto: unknown): string | null {
  const texto =
    typeof bruto === 'string'
      ? bruto
      : typeof bruto === 'object' &&
          bruto !== null &&
          typeof (bruto as { value?: unknown }).value === 'string'
        ? (bruto as { value: string }).value
        : null;
  return texto?.trim() ? texto : null;
}

/** `publish_date` é texto livre na origem ("2019", "Jan 2019", "2019-03-01"). */
export function extrairAno(bruto: string | undefined): number | null {
  const encontrado = /(1[0-9]{3}|20[0-9]{2})/.exec(bruto ?? '');
  return encontrado ? Number(encontrado[1]) : null;
}
