import { FonteIndisponivel } from '../../importacao/dominio/fonte-metadados';
import { HttpExterno } from '../../importacao/dominio/http-externo';
import { PoliticaDeResiliencia } from '../../importacao/dominio/politica-resiliencia';
import {
  FonteDeSinopse,
  LivroParaSinopse,
  obterSinopse,
} from './fonte-de-sinopse';
import { GoogleBooksSinopseFonte } from './google-books-sinopse.fonte';
import { OpenLibrarySinopseFonte } from './openlibrary-sinopse.fonte';

const LIVRO: LivroParaSinopse = {
  id: 'l1',
  isbn13: '9788535914849',
  olWorkKey: 'OL9W',
  olEditionKey: 'OL1M',
};

/** `HttpExterno` falso por caminho: ausente é 404 (`null`), `Error` é lançado. */
function httpCom(respostas: Record<string, unknown>) {
  const buscarJson = jest.fn(async (_fonte: string, url: URL) => {
    const chave = url.pathname + url.search;
    const resposta = respostas[chave] ?? respostas[url.pathname];
    if (resposta === undefined) return null;
    if (resposta instanceof Error) throw resposta;
    return resposta;
  });
  return { http: { buscarJson } as unknown as HttpExterno, buscarJson };
}

const semEspera = () =>
  new PoliticaDeResiliencia({ esperasMs: [], esperar: async () => undefined });

describe('OpenLibrarySinopseFonte', () => {
  it('usa a descrição da obra, em texto ou em { value }', async () => {
    const { http } = httpCom({
      '/works/OL9W.json': {
        description: { type: '/type/text', value: 'Da obra.' },
      },
    });
    await expect(
      new OpenLibrarySinopseFonte(http, semEspera()).buscar(LIVRO),
    ).resolves.toBe('Da obra.');
  });

  it('sem descrição na obra, cai na da edição', async () => {
    const { http, buscarJson } = httpCom({
      '/works/OL9W.json': { title: 'Sem descrição' },
      '/books/OL1M.json': { description: 'Da edição.' },
    });
    await expect(
      new OpenLibrarySinopseFonte(http, semEspera()).buscar(LIVRO),
    ).resolves.toBe('Da edição.');
    expect(buscarJson).toHaveBeenCalledTimes(2);
  });

  it('sem chaves da OpenLibrary, procura pelo ISBN e segue para a obra', async () => {
    const { http } = httpCom({
      '/isbn/9788535914849.json': { works: [{ key: '/works/OL77W' }] },
      '/works/OL77W.json': { description: 'Achada pelo ISBN.' },
    });
    await expect(
      new OpenLibrarySinopseFonte(http, semEspera()).buscar({
        ...LIVRO,
        olWorkKey: null,
        olEditionKey: null,
      }),
    ).resolves.toBe('Achada pelo ISBN.');
  });

  it('chave fora do formato não vira URL', async () => {
    const { http, buscarJson } = httpCom({});
    await new OpenLibrarySinopseFonte(http, semEspera()).buscar({
      ...LIVRO,
      olWorkKey: '../../admin',
      olEditionKey: 'OL1M?x=1',
    });
    expect(
      buscarJson.mock.calls.map(([, url]) => (url as URL).pathname),
    ).toEqual(['/isbn/9788535914849.json']);
  });

  it('responde null quando nada tem descrição', async () => {
    const { http } = httpCom({
      '/works/OL9W.json': {},
      '/books/OL1M.json': {},
    });
    await expect(
      new OpenLibrarySinopseFonte(http, semEspera()).buscar(LIVRO),
    ).resolves.toBeNull();
  });
});

describe('GoogleBooksSinopseFonte', () => {
  it('lê volumeInfo.description do ISBN, com a chave de API quando existe', async () => {
    const { http, buscarJson } = httpCom({
      '/books/v1/volumes': {
        items: [{ volumeInfo: { description: '<p>Do Google.</p>' } }],
      },
    });
    await expect(
      new GoogleBooksSinopseFonte(http, semEspera(), 'chave').buscar(LIVRO),
    ).resolves.toBe('<p>Do Google.</p>');
    const url = buscarJson.mock.calls[0][1] as URL;
    expect(url.searchParams.get('q')).toBe('isbn:9788535914849');
    expect(url.searchParams.get('key')).toBe('chave');
  });

  it('lista vazia é ausência', async () => {
    const { http } = httpCom({ '/books/v1/volumes': { totalItems: 0 } });
    await expect(
      new GoogleBooksSinopseFonte(http, semEspera()).buscar(LIVRO),
    ).resolves.toBeNull();
  });
});

describe('obterSinopse', () => {
  const fonte = (
    nome: string,
    resposta: string | null | Error,
  ): FonteDeSinopse => ({
    nome,
    buscar: jest.fn(async () => {
      if (resposta instanceof Error) throw resposta;
      return resposta;
    }),
  });

  it('para na primeira fonte com texto e devolve o texto limpo', async () => {
    const google = fonte('google-books', 'não deveria ser consultado');
    await expect(
      obterSinopse(
        [fonte('openlibrary', '<b>Texto</b> da obra.'), google],
        LIVRO,
      ),
    ).resolves.toEqual({ status: 'disponivel', texto: 'Texto da obra.' });
    expect(google.buscar).not.toHaveBeenCalled();
  });

  it('a primeira sem texto passa para a segunda', async () => {
    await expect(
      obterSinopse(
        [fonte('openlibrary', null), fonte('google-books', 'Do Google.')],
        LIVRO,
      ),
    ).resolves.toEqual({ status: 'disponivel', texto: 'Do Google.' });
  });

  it('texto que só tinha marcação conta como sem texto', async () => {
    await expect(
      obterSinopse(
        [fonte('openlibrary', '<p> </p>'), fonte('google-books', null)],
        LIVRO,
      ),
    ).resolves.toEqual({ status: 'ausente' });
  });

  it('as duas respondendo sem texto é ausente', async () => {
    await expect(
      obterSinopse(
        [fonte('openlibrary', null), fonte('google-books', null)],
        LIVRO,
      ),
    ).resolves.toEqual({ status: 'ausente' });
  });

  it('uma fora do ar e a outra sem texto é falha transitória, não ausente', async () => {
    await expect(
      obterSinopse(
        [
          fonte('openlibrary', new FonteIndisponivel('openlibrary', 'timeout')),
          fonte('google-books', null),
        ],
        LIVRO,
      ),
    ).resolves.toEqual({ status: 'falha_transitoria' });
  });

  it('a fonte fora do ar não impede a outra de ter o texto', async () => {
    await expect(
      obterSinopse(
        [
          fonte('openlibrary', new FonteIndisponivel('openlibrary', '503')),
          fonte('google-books', 'Achei.'),
        ],
        LIVRO,
      ),
    ).resolves.toEqual({ status: 'disponivel', texto: 'Achei.' });
  });

  it('erro inesperado sobe, para o runtime mandar ao retry e à DLQ', async () => {
    await expect(
      obterSinopse([fonte('openlibrary', new Error('bug no parser'))], LIVRO),
    ).rejects.toThrow('bug no parser');
  });
});
