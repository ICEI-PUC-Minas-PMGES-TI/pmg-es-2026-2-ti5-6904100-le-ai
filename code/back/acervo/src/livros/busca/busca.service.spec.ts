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
    numeroSerie: null,
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

  it('recusa busca sem nenhum critério, no campo q', async () => {
    const erro = await servico.buscar({}).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroDeValidacao);
    expect((erro as ErroDeValidacao).extras).toEqual({
      campos: [
        {
          campo: 'q',
          mensagem: 'Informe um texto de busca, um assunto ou um filtro.',
        },
      ],
    });
    expect(repositorio.pagina).not.toHaveBeenCalled();
  });

  it.each([
    [{ autor: 'evaristo' }],
    [{ editora: 'pallas' }],
    [{ serie: 'harry potter' }],
    [{ ano: 2019 }],
    [{ paginasMin: 100 }],
    [{ paginasMax: 150 }],
  ])('aceita busca só com o filtro %j', async (filtro) => {
    await servico.buscar(filtro);
    expect(repositorio.pagina).toHaveBeenCalled();
  });

  it('quebra os filtros de texto em palavras, como o q', async () => {
    await servico.buscar({
      autor: 'Conceição  Evaristo',
      editora: 'cia das letras',
      serie: 'Harry',
    });
    expect(repositorio.pagina).toHaveBeenCalledWith(
      expect.objectContaining({
        autorPalavras: ['Conceição', 'Evaristo'],
        editoraPalavras: ['cia', 'das', 'letras'],
        seriePalavras: ['Harry'],
      }),
    );
  });

  it('repassa ano e faixa de páginas', async () => {
    await servico.buscar({ ano: 2019, paginasMin: 100, paginasMax: 150 });
    expect(repositorio.pagina).toHaveBeenCalledWith(
      expect.objectContaining({ ano: 2019, paginasMin: 100, paginasMax: 150 }),
    );
  });

  it('aceita faixa de um número só', async () => {
    await servico.buscar({ paginasMin: 120, paginasMax: 120 });
    expect(repositorio.pagina).toHaveBeenCalled();
  });

  it('recusa paginasMin maior que paginasMax, no campo paginasMax', async () => {
    const erro = await servico
      .buscar({ paginasMin: 200, paginasMax: 100 })
      .catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroDeValidacao);
    expect((erro as ErroDeValidacao).extras).toEqual({
      campos: [
        {
          campo: 'paginasMax',
          mensagem:
            'O número máximo de páginas deve ser maior ou igual ao mínimo.',
        },
      ],
    });
    expect(repositorio.pagina).not.toHaveBeenCalled();
  });

  it('busca na ordem de relevância', async () => {
    await servico.buscar({ q: 'torto' });
    expect(repositorio.pagina).toHaveBeenCalledWith(
      expect.not.objectContaining({ ordem: expect.anything() }),
    );
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
