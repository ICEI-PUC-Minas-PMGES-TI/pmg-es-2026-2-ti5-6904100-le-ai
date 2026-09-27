import { HttpExterno } from '../../importacao/dominio/http-externo';
import { PoliticaDeResiliencia } from '../../importacao/dominio/politica-resiliencia';
import {
  descricaoDaOpenLibrary,
  FonteDeSinopse,
  LivroParaSinopse,
} from './fonte-de-sinopse';

const BASE = 'https://openlibrary.org';
const CHAVE_OBRA = /^OL[0-9]+W$/;
const CHAVE_EDICAO = /^OL[0-9]+M$/;

interface ComDescricao {
  description?: unknown;
  works?: { key?: string }[];
}

/**
 * Sinopse da OpenLibrary (RN-19.3): a descrição da **obra**, depois a da
 * **edição**. Livro sem as chaves da OpenLibrary (o cadastrado pelo Google
 * Books) é procurado pelo ISBN, e a edição achada leva à obra.
 *
 * As URLs são montadas aqui a partir de chaves validadas por formato, nunca de
 * texto recebido (RNF-SEC-38). Não edita a fonte da importação: as duas
 * consultas têm formas e políticas diferentes.
 */
export class OpenLibrarySinopseFonte implements FonteDeSinopse {
  readonly nome = 'openlibrary';

  constructor(
    private readonly http: HttpExterno,
    private readonly resiliencia: PoliticaDeResiliencia,
  ) {}

  async buscar(livro: LivroParaSinopse): Promise<string | null> {
    const obra = valida(livro.olWorkKey, CHAVE_OBRA);
    const edicao = valida(livro.olEditionKey, CHAVE_EDICAO);

    if (obra) {
      const texto = descricaoDaOpenLibrary(
        (await this.json(`/works/${obra}.json`))?.description,
      );
      if (texto) return texto;
    }
    if (edicao) {
      const texto = descricaoDaOpenLibrary(
        (await this.json(`/books/${edicao}.json`))?.description,
      );
      if (texto) return texto;
    }
    if (obra || edicao) {
      return null;
    }

    const porIsbn = await this.json(
      `/isbn/${encodeURIComponent(livro.isbn13)}.json`,
    );
    const daEdicao = descricaoDaOpenLibrary(porIsbn?.description);
    if (daEdicao) return daEdicao;
    const obraDaEdicao = valida(
      porIsbn?.works?.[0]?.key?.split('/').pop() ?? null,
      CHAVE_OBRA,
    );
    if (!obraDaEdicao) return null;
    return descricaoDaOpenLibrary(
      (await this.json(`/works/${obraDaEdicao}.json`))?.description,
    );
  }

  private async json(caminho: string): Promise<ComDescricao | null> {
    const url = new URL(`${BASE}${caminho}`);
    return (await this.resiliencia.executar(this.nome, () =>
      this.http.buscarJson(this.nome, url),
    )) as ComDescricao | null;
  }
}

function valida(chave: string | null, formato: RegExp): string | null {
  return chave && formato.test(chave) ? chave : null;
}
