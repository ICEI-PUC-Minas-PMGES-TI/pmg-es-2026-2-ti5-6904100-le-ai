import { ErroDeValidacao } from '../../common/erros-de-negocio';
import { BuscaRepository, LinhaDeLivroEncontrado } from './busca.repository';
import { BuscaService } from './busca.service';

const ASSUNTO = '0b8a3a55-5b3c-4b39-9d0f-6a8f1f0c2c11';

function linha(
  parcial: Partial<LinhaDeLivroEncontrado> = {},
): LinhaDeLivroEncontrado {
  return {
    id: '5f0c6d1e-2f0a-4b8e-9a51-2b7f3c9d8e01',
    titulo: 'Torto arado',
    anoPublicacao: 2019,
    paginas: 264,
    editora: 'Todavia',
    capaUrlPropria: null,
    capaUrlExterna: 'https://covers.openlibrary.org/b/id/1-L.jpg',
    autores: [{ id: 'a1', nome: 'Itamar Vieira Junior' }],
    assuntos: [],
    ...parcial,
  };
}

describe('BuscaService', () => {
  let repositorio: jest.Mocked<
    Pick<BuscaRepository, 'assuntos' | 'contar' | 'pagina'>
  >;
  let servico: BuscaService;

  beforeEach(() => {
    repositorio = {
      assuntos: jest.fn(),
      contar: jest.fn().mockResolvedValue(0),
      pagina: jest.fn().mockResolvedValue([]),
    };
    servico = new BuscaService(repositorio as unknown as BuscaRepository);
  });

  it('recusa busca sem q e sem assunto, no campo q', async () => {
    const erro = await servico.buscar({}).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroDeValidacao);
    expect((erro as ErroDeValidacao).extras).toEqual({
      campos: [
        { campo: 'q', mensagem: 'Informe um texto de busca ou um assunto.' },
      ],
    });
    expect(repositorio.pagina).not.toHaveBeenCalled();
  });

  it('aceita busca só por assunto', async () => {
    await servico.buscar({ assunto: ASSUNTO });
    expect(repositorio.pagina).toHaveBeenCalledWith(
      expect.objectContaining({ q: undefined, assuntoId: ASSUNTO }),
    );
  });

  it('usa página 1 e limite 20 por padrão', async () => {
    const pagina = await servico.buscar({ q: 'torto' });
    expect(repositorio.pagina).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 }),
    );
    expect(pagina).toMatchObject({ page: 1, limit: 20 });
  });

  it('calcula o deslocamento e o total de páginas', async () => {
    repositorio.contar.mockResolvedValue(41);
    const pagina = await servico.buscar({ q: 'torto', page: 3, limit: 20 });
    expect(repositorio.pagina).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 40 }),
    );
    expect(pagina).toMatchObject({ totalItens: 41, totalPaginas: 3 });
  });

  it('mantém o total verdadeiro numa página além da última', async () => {
    repositorio.contar.mockResolvedValue(5);
    const pagina = await servico.buscar({ q: 'torto', page: 9 });
    expect(pagina).toMatchObject({ itens: [], totalItens: 5, totalPaginas: 1 });
  });

  it('reconhece ISBN-13 no q, com ou sem hífens', async () => {
    await servico.buscar({ q: '978-85-359-1484-9' });
    expect(repositorio.pagina).toHaveBeenCalledWith(
      expect.objectContaining({ isbn13: '9788535914849' }),
    );
  });

  it('não trata texto comum como ISBN', async () => {
    await servico.buscar({ q: 'torto arado' });
    expect(repositorio.pagina).toHaveBeenCalledWith(
      expect.objectContaining({ isbn13: null }),
    );
  });

  it('mapeia a linha para o resumo do contrato, com nulos explícitos', async () => {
    repositorio.contar.mockResolvedValue(1);
    repositorio.pagina.mockResolvedValue([
      linha({ editora: null, anoPublicacao: null, autores: [] }),
    ]);

    const { itens } = await servico.buscar({ q: 'torto' });

    expect(itens).toEqual([
      {
        id: '5f0c6d1e-2f0a-4b8e-9a51-2b7f3c9d8e01',
        titulo: 'Torto arado',
        autores: [],
        editora: null,
        anoPublicacao: null,
        paginas: 264,
        capa: {
          url: 'https://covers.openlibrary.org/b/id/1-L.jpg',
          origem: 'externa',
        },
        assuntos: [],
      },
    ]);
  });

  it('lista os assuntos dentro de itens', async () => {
    repositorio.assuntos.mockResolvedValue([{ id: ASSUNTO, nome: 'Romance' }]);
    await expect(servico.listarAssuntos()).resolves.toEqual({
      itens: [{ id: ASSUNTO, nome: 'Romance' }],
    });
  });
});
