import { HttpExterno } from '../../importacao/dominio/http-externo';
import { PoliticaDeResiliencia } from '../../importacao/dominio/politica-resiliencia';
import { FonteDeSinopse, LivroParaSinopse } from './fonte-de-sinopse';

const BASE = 'https://www.googleapis.com/books/v1/volumes';

/**
 * Sinopse do Google Books (RN-19.3): `volumeInfo.description` do volume do
 * ISBN. Vem em HTML com frequência, e é o `textoPuro` que o limpa. A API
 * responde 200 com lista vazia quando não conhece o ISBN, e isso é ausência.
 */
export class GoogleBooksSinopseFonte implements FonteDeSinopse {
  readonly nome = 'google-books';

  constructor(
    private readonly http: HttpExterno,
    private readonly resiliencia: PoliticaDeResiliencia,
    private readonly apiKey?: string,
  ) {}

  async buscar(livro: LivroParaSinopse): Promise<string | null> {
    const url = new URL(BASE);
    url.searchParams.set('q', `isbn:${livro.isbn13}`);
    url.searchParams.set('maxResults', '1');
    if (this.apiKey) {
      url.searchParams.set('key', this.apiKey);
    }

    const bruto = (await this.resiliencia.executar(this.nome, () =>
      this.http.buscarJson(this.nome, url),
    )) as { items?: { volumeInfo?: { description?: unknown } }[] } | null;

    const descricao = bruto?.items?.[0]?.volumeInfo?.description;
    return typeof descricao === 'string' ? descricao : null;
  }
}
