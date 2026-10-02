import { NaoEncontrado } from '../../common/erros-de-negocio';
import type { LinhaDeLivroEncontrado } from '../busca/busca.repository';
import type { BuscaService, Paginado } from '../busca/busca.service';
import type { CatalogoRepository } from './catalogo.repository';
import { CatalogoService } from './catalogo.service';

const ID = '7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f';

function linha(
  parcial: Partial<LinhaDeLivroEncontrado> = {},
): LinhaDeLivroEncontrado {
  return {
    id: '5f0c6d1e-2f0a-4b8e-9a51-2b7f3c9d8e01',
    titulo: 'Harry Potter e a pedra filosofal',
    anoPublicacao: 2000,
    paginas: 264,
    editora: 'Rocco',
    capaUrlPropria: null,
    capaUrlExterna: 'https://covers.openlibrary.org/b/id/1-L.jpg',
    autores: [],
    assuntos: [],
    numeroSerie: 1,
    ...parcial,
  };
}

describe('CatalogoService', () => {
  let repositorio: jest.Mocked<
    Pick<CatalogoRepository, 'autor' | 'editora' | 'serie' | 'autoresDaSerie'>
  >;
  let busca: { paginar: jest.Mock };
  let servico: CatalogoService;

  /** Faz o `paginar` mapear as linhas dadas, como o real faz. */
  function paginarCom(linhas: LinhaDeLivroEncontrado[]) {
    busca.paginar.mockImplementation(
      (
        _criterios,
        _paginacao,
        mapear: (l: LinhaDeLivroEncontrado) => unknown,
      ) =>
        Promise.resolve<Paginado<unknown>>({
          itens: linhas.map(mapear),
          page: 1,
          limit: 20,
          totalItens: linhas.length,
          totalPaginas: linhas.length > 0 ? 1 : 0,
        }),
    );
  }

  beforeEach(() => {
    repositorio = {
      autor: jest.fn(),
      editora: jest.fn(),
      serie: jest.fn(),
      autoresDaSerie: jest.fn().mockResolvedValue([]),
    };
    busca = { paginar: jest.fn() };
    paginarCom([]);
    servico = new CatalogoService(
      repositorio as unknown as CatalogoRepository,
      busca as unknown as BuscaService,
    );
  });

  describe('autor', () => {
    it('lista os livros do autor pela ordem do ano do grupo, repassando a paginação', async () => {
      repositorio.autor.mockResolvedValue({
        id: ID,
        nome: 'Conceição Evaristo',
        biografia: null,
      });

      await servico.autor(ID, { page: 2, limit: 10 });

      expect(busca.paginar).toHaveBeenCalledWith(
        { autorId: ID, ordem: 'ano-do-grupo' },
        { page: 2, limit: 10 },
        expect.any(Function),
      );
    });

    it('devolve null sem biografia, e a seção não é exibida', async () => {
      repositorio.autor.mockResolvedValue({
        id: ID,
        nome: 'Jeferson Tenório',
        biografia: null,
      });

      const pagina = await servico.autor(ID, {});

      expect(pagina).toMatchObject({
        id: ID,
        nome: 'Jeferson Tenório',
        biografia: null,
        livros: { itens: [], totalItens: 0 },
      });
    });

    it('entrega a biografia como texto puro, sem marcação da fonte', async () => {
      repositorio.autor.mockResolvedValue({
        id: ID,
        nome: 'Conceição Evaristo',
        biografia:
          'Escritora <b>mineira</b>, nascida em 1946.\n\n[1]: https://pt.wikipedia.org',
      });

      const { biografia } = await servico.autor(ID, {});

      expect(biografia).toBe('Escritora mineira, nascida em 1946.');
    });

    it('responde 404 quando o autor não existe', async () => {
      repositorio.autor.mockResolvedValue(null);
      await expect(servico.autor(ID, {})).rejects.toBeInstanceOf(NaoEncontrado);
    });
  });

  describe('editora', () => {
    it('lista os livros da editora pela ordem do ano do grupo', async () => {
      repositorio.editora.mockResolvedValue({ id: ID, nome: 'Pallas' });
      paginarCom([linha()]);

      const pagina = await servico.editora(ID, {});

      expect(busca.paginar).toHaveBeenCalledWith(
        { editoraId: ID, ordem: 'ano-do-grupo' },
        {},
        expect.any(Function),
      );
      expect(pagina.livros.itens[0]).not.toHaveProperty('numeroNaSerie');
    });

    it('responde 404 quando a editora não existe', async () => {
      repositorio.editora.mockResolvedValue(null);
      await expect(servico.editora(ID, {})).rejects.toThrow(
        'Não encontramos esta editora.',
      );
    });
  });

  describe('série', () => {
    it('lista pela ordem da série, com o número de ordem em cada card', async () => {
      repositorio.serie.mockResolvedValue({ id: ID, nome: 'Harry Potter' });
      repositorio.autoresDaSerie.mockResolvedValue([
        { id: 'a1', nome: 'J. K. Rowling' },
      ]);
      paginarCom([linha(), linha({ id: 'outro', numeroSerie: null })]);

      const pagina = await servico.serie(ID, {});

      expect(busca.paginar).toHaveBeenCalledWith(
        { serieId: ID, ordem: 'serie' },
        {},
        expect.any(Function),
      );
      expect(pagina.autores).toEqual([{ id: 'a1', nome: 'J. K. Rowling' }]);
      expect(pagina.livros.itens.map((i) => i.numeroNaSerie)).toEqual([
        1,
        null,
      ]);
    });

    it('responde 404 quando a série não existe', async () => {
      repositorio.serie.mockResolvedValue(null);
      await expect(servico.serie(ID, {})).rejects.toThrow(
        'Não encontramos esta série.',
      );
    });
  });
});
