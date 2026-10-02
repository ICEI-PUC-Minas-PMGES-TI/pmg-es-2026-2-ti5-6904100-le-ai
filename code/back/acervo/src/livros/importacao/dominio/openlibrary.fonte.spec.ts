import { FonteIndisponivel } from './fonte-metadados';
import { HttpExterno } from './http-externo';
import { OpenLibraryFonte } from './openlibrary.fonte';
import { PoliticaDeResiliencia } from './politica-resiliencia';

const ISBN = '9788535914849';

function fonteCom(respostas: Record<string, unknown>) {
  const buscarJson = jest.fn(async (_fonte: string, url: URL) => {
    const caminho = url.pathname;
    if (!(caminho in respostas)) return null;
    const resposta = respostas[caminho];
    if (resposta instanceof Error) throw resposta;
    return resposta;
  });
  const http = { buscarJson } as unknown as HttpExterno;
  const resiliencia = new PoliticaDeResiliencia({
    esperasMs: [],
    esperar: async () => undefined,
  });
  return { fonte: new OpenLibraryFonte(http, resiliencia), buscarJson };
}

const EDICAO = {
  key: '/books/OL1M',
  title: 'Memórias Póstumas de Brás Cubas',
  number_of_pages: 288,
  publishers: ['Penguin-Companhia'],
  publish_date: '2014',
  covers: [10520483],
  works: [{ key: '/works/OL9W' }],
  authors: [{ key: '/authors/OL10000003A' }],
};

describe('OpenLibraryFonte', () => {
  it('resolve o nome do autor pela chave da edição', async () => {
    const { fonte } = fonteCom({
      [`/isbn/${ISBN}.json`]: EDICAO,
      '/authors/OL10000003A.json': { name: 'Machado de Assis' },
    });

    const metadados = await fonte.buscarPorIsbn(ISBN);

    expect(metadados?.autores).toEqual([
      { nome: 'Machado de Assis', olAuthorKey: 'OL10000003A', biografia: null },
    ]);
    expect(metadados?.olEditionKey).toBe('OL1M');
    expect(metadados?.olWorkKey).toBe('OL9W');
    expect(metadados?.capaUrl).toBe(
      'https://covers.openlibrary.org/b/id/10520483-L.jpg',
    );
  });

  it.each([
    ['texto', 'Machado de Assis foi um escritor brasileiro.'],
    [
      'objeto /type/text',
      {
        type: '/type/text',
        value: 'Machado de Assis foi um escritor brasileiro.',
      },
    ],
  ])(
    'traz a biografia do autor quando o bio vem como %s',
    async (_forma, bio) => {
      const { fonte } = fonteCom({
        [`/isbn/${ISBN}.json`]: EDICAO,
        '/authors/OL10000003A.json': { name: 'Machado de Assis', bio },
      });

      const metadados = await fonte.buscarPorIsbn(ISBN);

      expect(metadados?.autores).toEqual([
        {
          nome: 'Machado de Assis',
          olAuthorKey: 'OL10000003A',
          biografia: 'Machado de Assis foi um escritor brasileiro.',
        },
      ]);
    },
  );

  it.each([[''], ['   '], [{ type: '/type/text' }], [42]])(
    'bio vazio ou em forma desconhecida (%j) conta como sem biografia',
    async (bio) => {
      const { fonte } = fonteCom({
        [`/isbn/${ISBN}.json`]: EDICAO,
        '/authors/OL10000003A.json': { name: 'Machado de Assis', bio },
      });

      const metadados = await fonte.buscarPorIsbn(ISBN);

      expect(metadados?.autores[0].biografia).toBeNull();
    },
  );

  it('não transforma chave malformada em caminho de URL (SEC-38)', async () => {
    const { fonte, buscarJson } = fonteCom({
      [`/isbn/${ISBN}.json`]: {
        ...EDICAO,
        authors: [{ key: '/authors/../../admin' }, { key: '/authors/x?y=1' }],
      },
    });

    const metadados = await fonte.buscarPorIsbn(ISBN);

    expect(metadados?.autores).toEqual([]);
    const caminhos = buscarJson.mock.calls.map(([, url]) => url.pathname);
    expect(caminhos).toEqual([`/isbn/${ISBN}.json`, '/works/OL9W.json']);
  });

  it('omite autor que a fonte não conhece sem perder o livro', async () => {
    const { fonte } = fonteCom({ [`/isbn/${ISBN}.json`]: EDICAO });

    const metadados = await fonte.buscarPorIsbn(ISBN);

    expect(metadados?.titulo).toBe(EDICAO.title);
    expect(metadados?.autores).toEqual([]);
  });

  it('sem autor na edição, usa só o primeiro autor da obra', async () => {
    const { fonte } = fonteCom({
      [`/isbn/${ISBN}.json`]: { ...EDICAO, authors: undefined },
      '/works/OL9W.json': {
        authors: [
          { author: { key: '/authors/OL118077A' } },
          { author: { key: '/authors/OL16029200A' } },
        ],
      },
      '/authors/OL118077A.json': { name: 'George Orwell' },
      '/authors/OL16029200A.json': { name: 'Prefaciador' },
    });

    const metadados = await fonte.buscarPorIsbn(ISBN);

    expect(metadados?.autores).toEqual([
      { nome: 'George Orwell', olAuthorKey: 'OL118077A', biografia: null },
    ]);
  });

  it('autor da edição que é marcador de catálogo cede lugar ao autor da obra', async () => {
    const { fonte } = fonteCom({
      [`/isbn/${ISBN}.json`]: {
        ...EDICAO,
        authors: [{ key: '/authors/OL2965820A' }],
      },
      '/authors/OL2965820A.json': { name: '[author not identified]' },
      '/works/OL9W.json': {
        authors: [{ author: { key: '/authors/OL6789787A' } }],
      },
      '/authors/OL6789787A.json': { name: 'Austin Kleon' },
    });

    const metadados = await fonte.buscarPorIsbn(ISBN);

    expect(metadados?.autores).toEqual([
      { nome: 'Austin Kleon', olAuthorKey: 'OL6789787A', biografia: null },
    ]);
  });

  it('propaga indisponibilidade na consulta do autor', async () => {
    const { fonte } = fonteCom({
      [`/isbn/${ISBN}.json`]: EDICAO,
      '/authors/OL10000003A.json': new FonteIndisponivel('openlibrary', '503'),
    });

    await expect(fonte.buscarPorIsbn(ISBN)).rejects.toBeInstanceOf(
      FonteIndisponivel,
    );
  });
});
