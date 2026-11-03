import type { DrizzleDB } from '../../db/drizzle.module';
import type { OutboxRepository } from '../outbox/outbox.repository';
import type {
  LinhaDoLivroOficial,
  LivroOficialRepository,
} from './livro-oficial.repository';
import type { LinhaDaDistribuicao } from '../notas/notas-da-pagina';
import { LivroOficialService } from './livro-oficial.service';
import type { ResenhasRepository } from './resenhas.repository';

const ID = '5f0c6d1e-2f0a-4b8e-9a51-2b7f3c9d8e01';
const LEITOR = '3f1a5c2e-9b7d-4f6a-8c1e-2d4b6a8e0f31';

function livro(
  parcial: Partial<LinhaDoLivroOficial> = {},
): LinhaDoLivroOficial {
  return {
    id: ID,
    titulo: 'Torto arado',
    anoPublicacao: 2019,
    paginas: 264,
    editora: 'Todavia',
    capaUrlPropria: null,
    capaUrlExterna: 'https://covers.openlibrary.org/b/id/1-L.jpg',
    autores: [],
    assuntos: [],
    numeroSerie: null,
    isbn: '9788580864189',
    editoraId: null,
    serieId: null,
    serieNome: null,
    sinopse: null,
    sinopseStatus: 'nao_consultada',
    deveBuscarSinopse: true,
    notaGeral: null,
    notaGeralQtd: null,
    ...parcial,
  };
}

/** Como o Drizzle entrega: o erro do driver em `cause`. */
const falhaDoBanco = (code: string) =>
  Object.assign(new Error('Failed query'), { cause: { code } });

describe('LivroOficialService', () => {
  function montar(
    transacao: jest.Mock,
    parcial: Partial<LinhaDoLivroOficial> = {},
    distribuicao: LinhaDaDistribuicao[] = [],
  ) {
    const db = { transaction: transacao } as unknown as DrizzleDB;
    const livros = {
      obter: jest.fn().mockResolvedValue(livro(parcial)),
      notasDosLeitores: jest.fn().mockResolvedValue(distribuicao),
    } as unknown as LivroOficialRepository;
    const resenhas = {
      pagina: jest.fn().mockResolvedValue({ itens: [], proximoCursor: null }),
    } as unknown as ResenhasRepository;
    return new LivroOficialService(
      db,
      livros,
      resenhas,
      {} as OutboxRepository,
    );
  }

  it('a página abre com `pendente` mesmo se o pedido da sinopse falhar (RF-ACV-19)', async () => {
    const transacao = jest.fn().mockRejectedValue(falhaDoBanco('23514'));

    const pagina = await montar(transacao).obter(ID, LEITOR);

    expect(transacao).toHaveBeenCalledTimes(1);
    expect(pagina.sinopse).toEqual({ status: 'pendente', texto: null });
    expect(pagina.titulo).toBe('Torto arado');
  });

  it('a trava ocupada pelo consumidor também é no-op', async () => {
    const transacao = jest.fn().mockRejectedValue(falhaDoBanco('55P03'));

    const pagina = await montar(transacao).obter(ID, LEITOR);

    expect(pagina.sinopse.status).toBe('pendente');
  });

  it('monta a série da ficha com o número de ordem', async () => {
    const pagina = await montar(jest.fn(), {
      deveBuscarSinopse: false,
      sinopseStatus: 'ausente',
      editoraId: 'e1',
      serieId: 's1',
      serieNome: 'Trilogia',
      numeroSerie: 2,
    }).obter(ID, LEITOR);

    expect(pagina.editoraId).toBe('e1');
    expect(pagina.serie).toEqual({ id: 's1', nome: 'Trilogia', numero: 2 });
  });

  it('livro fora de série tem serie e editoraId nulos', async () => {
    const pagina = await montar(jest.fn(), {
      deveBuscarSinopse: false,
      sinopseStatus: 'ausente',
    }).obter(ID, LEITOR);

    expect(pagina.editoraId).toBeNull();
    expect(pagina.serie).toBeNull();
  });

  it('sem nenhuma nota, os dois indicadores são nulos e a distribuição é vazia (RN-06.3)', async () => {
    const pagina = await montar(jest.fn(), {
      deveBuscarSinopse: false,
      sinopseStatus: 'ausente',
    }).obter(ID, LEITOR);

    expect(pagina.notaGeral).toBeNull();
    expect(pagina.notaDosLeitores).toBeNull();
    expect(pagina.distribuicao).toEqual([]);
  });

  it('nota geral e nota dos leitores saem separadas, com o numeric convertido', async () => {
    const pagina = await montar(
      jest.fn(),
      {
        deveBuscarSinopse: false,
        sinopseStatus: 'ausente',
        notaGeral: '4.3',
        notaGeralQtd: 412,
      },
      [{ valor: '3.5', quantidade: 1, total: 1, media: '3.5' }],
    ).obter(ID, LEITOR);

    expect(pagina.notaGeral).toEqual({ valor: 4.3, quantidade: 412 });
    expect(pagina.notaDosLeitores).toEqual({ valor: 3.5, quantidade: 1 });
    expect(pagina.distribuicao).toHaveLength(11);
    expect(pagina.distribuicao[3]).toEqual({ valor: 3.5, quantidade: 1 });
  });
});
