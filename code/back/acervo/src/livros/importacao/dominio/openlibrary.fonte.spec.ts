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
      { nome: 'Machado de Assis', olAuthorKey: 'OL10000003A' },
    ]);
    expect(metadados?.olEditionKey).toBe('OL1M');
    expect(metadados?.olWorkKey).toBe('OL9W');
    expect(metadados?.capaUrl).toBe(
      'https://covers.openlibrary.org/b/id/10520483-L.jpg',
    );
  });

  it('não transforma chave malformada em caminho de URL (SEC-38)', async () => {
    const { fonte, buscarJson } = fonteCom({
      [`/isbn/${ISBN}.json`]: {
        ...EDICAO,
        authors: [{ key: '/authors/../../admin' }, { key: '/authors/x?y=1' }],
      },
    });

    const metadados = await fonte.buscarPorIsbn(ISBN);

    expect(metadados?.autores).toEqual([]);
    expect(buscarJson).toHaveBeenCalledTimes(1);
  });

  it('omite autor que a fonte não conhece sem perder o livro', async () => {
    const { fonte } = fonteCom({ [`/isbn/${ISBN}.json`]: EDICAO });

    const metadados = await fonte.buscarPorIsbn(ISBN);

    expect(metadados?.titulo).toBe(EDICAO.title);
    expect(metadados?.autores).toEqual([]);
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
