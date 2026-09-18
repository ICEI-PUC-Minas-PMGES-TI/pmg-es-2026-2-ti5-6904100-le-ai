import {
  FonteDeMetadados,
  FonteIndisponivel,
  MetadadosLivro,
} from './fonte-metadados';
import {
  ProcessadorImportacao,
  RepositorioDeConvergencia,
} from './processador-importacao';

const SOLICITACAO = {
  importacaoId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  solicitanteId: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
  isbn13: '9788535914849',
};

const LIVRO = 'cccccccc-3333-4333-8333-cccccccccccc';

function metadados(mudancas: Partial<MetadadosLivro> = {}): MetadadosLivro {
  return {
    isbn13: SOLICITACAO.isbn13,
    titulo: 'Memórias Póstumas de Brás Cubas',
    autores: ['OL10000003A'],
    editora: 'Penguin-Companhia',
    anoPublicacao: 2014,
    paginas: 288,
    capaUrl: 'https://covers.openlibrary.org/b/id/10520483-L.jpg',
    olEditionKey: 'OL1M',
    olWorkKey: 'OL9W',
    ...mudancas,
  };
}

function fonte(
  nome: string,
  comportamento: () => Promise<MetadadosLivro | null>,
): FonteDeMetadados {
  return { nome, buscarPorIsbn: jest.fn(comportamento) };
}

function repositorio(): RepositorioDeConvergencia {
  return {
    criarOuObterLivroOficial: jest.fn().mockResolvedValue(LIVRO),
    concluir: jest.fn().mockResolvedValue(undefined),
    marcarNaoEncontrado: jest.fn().mockResolvedValue(undefined),
    marcarFalhaTransitoria: jest.fn().mockResolvedValue(undefined),
  };
}

describe('ProcessadorImportacao', () => {
  it('conclui com o livro criado quando a fonte primária conhece o ISBN', async () => {
    const repo = repositorio();
    const primaria = fonte('openlibrary', async () => metadados());
    const secundaria = fonte('google-books', async () => metadados());

    const resultado = await new ProcessadorImportacao(
      [primaria, secundaria],
      repo,
    ).processar(SOLICITACAO);

    expect(resultado).toEqual({ estado: 'concluida', livroId: LIVRO });
    expect(repo.concluir).toHaveBeenCalledWith(SOLICITACAO.importacaoId, LIVRO);
    // §10.1: a secundária só é consultada quando a primária não retorna.
    expect(secundaria.buscarPorIsbn).not.toHaveBeenCalled();
  });

  it('cai para a fonte secundária quando a primária não conhece o ISBN', async () => {
    const repo = repositorio();
    const primaria = fonte('openlibrary', async () => null);
    const secundaria = fonte('google-books', async () => metadados());

    const resultado = await new ProcessadorImportacao(
      [primaria, secundaria],
      repo,
    ).processar(SOLICITACAO);

    expect(resultado.estado).toBe('concluida');
    expect(secundaria.buscarPorIsbn).toHaveBeenCalledWith(SOLICITACAO.isbn13);
  });

  // RF-ACV-06: só quando TODAS as fontes responderam e nenhuma conhece o ISBN.
  it('nenhuma fonte conhece o ISBN resulta em nao_encontrado', async () => {
    const repo = repositorio();
    const processador = new ProcessadorImportacao(
      [
        fonte('openlibrary', async () => null),
        fonte('google-books', async () => null),
      ],
      repo,
    );

    expect(await processador.processar(SOLICITACAO)).toEqual({
      estado: 'nao_encontrado',
    });
    expect(repo.marcarNaoEncontrado).toHaveBeenCalledWith(
      SOLICITACAO.importacaoId,
    );
  });

  // A distinção central: ausência oferece cadastro pessoal, indisponibilidade
  // permite reprocessar. Confundir as duas ofereceria cadastro pessoal para um
  // livro que existe.
  it('todas as fontes indisponíveis resulta em falha_transitoria, não em nao_encontrado', async () => {
    const repo = repositorio();
    const processador = new ProcessadorImportacao(
      [
        fonte('openlibrary', async () => {
          throw new FonteIndisponivel('openlibrary', 'tempo esgotado');
        }),
        fonte('google-books', async () => {
          throw new FonteIndisponivel('google-books', 'resposta 503');
        }),
      ],
      repo,
    );

    const resultado = await processador.processar(SOLICITACAO);

    expect(resultado.estado).toBe('falha_transitoria');
    expect(repo.marcarNaoEncontrado).not.toHaveBeenCalled();
    // O CHECK `importacao_livro_resultado_ck` exige `erro` não vazio neste estado.
    expect(repo.marcarFalhaTransitoria).toHaveBeenCalledWith(
      SOLICITACAO.importacaoId,
      expect.stringMatching(/.+/),
    );
  });

  it('uma fonte fora do ar não impede a outra de concluir', async () => {
    const repo = repositorio();
    const processador = new ProcessadorImportacao(
      [
        fonte('openlibrary', async () => {
          throw new FonteIndisponivel('openlibrary', 'fora do ar');
        }),
        fonte('google-books', async () => metadados()),
      ],
      repo,
    );

    expect((await processador.processar(SOLICITACAO)).estado).toBe('concluida');
  });

  // Não dá para afirmar ausência sem ter perguntado a todas as fontes.
  it('primária indisponível e secundária sem o ISBN vira falha_transitoria', async () => {
    const repo = repositorio();
    const processador = new ProcessadorImportacao(
      [
        fonte('openlibrary', async () => {
          throw new FonteIndisponivel('openlibrary', 'fora do ar');
        }),
        fonte('google-books', async () => null),
      ],
      repo,
    );

    expect((await processador.processar(SOLICITACAO)).estado).toBe(
      'falha_transitoria',
    );
  });

  // RN-12 e os CHECKs de livro oficial: sem total de páginas não há progresso
  // por página, e sem capa a linha nem entra. Descarte vira `nao_encontrado`,
  // não erro — o leitor pode cadastrar o livro como pessoal.
  it.each([
    ['sem páginas', { paginas: null }],
    ['páginas zero', { paginas: 0 }],
    ['sem capa', { capaUrl: null }],
    ['sem título', { titulo: '  ' }],
  ])(
    'descarta metadados %s e segue para nao_encontrado',
    async (_caso, mudancas) => {
      const repo = repositorio();
      const processador = new ProcessadorImportacao(
        [
          fonte('openlibrary', async () =>
            metadados(mudancas as Partial<MetadadosLivro>),
          ),
        ],
        repo,
      );

      expect((await processador.processar(SOLICITACAO)).estado).toBe(
        'nao_encontrado',
      );
      expect(repo.criarOuObterLivroOficial).not.toHaveBeenCalled();
    },
  );

  // RNF-ARQ-05: duas execuções do mesmo ISBN convergem para o mesmo livro. Quem
  // garante é o upsert do repositório, não um lock.
  it('duas execuções do mesmo ISBN convergem para o mesmo livro', async () => {
    const repo = repositorio();
    const processador = new ProcessadorImportacao(
      [fonte('openlibrary', async () => metadados())],
      repo,
    );

    const primeira = await processador.processar(SOLICITACAO);
    const segunda = await processador.processar({
      ...SOLICITACAO,
      importacaoId: 'dddddddd-4444-4444-8444-dddddddddddd',
      solicitanteId: 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee',
    });

    expect(primeira).toEqual(segunda);
  });

  it('erro de programação não vira falha_transitoria', async () => {
    const repo = repositorio();
    const processador = new ProcessadorImportacao(
      [
        fonte('openlibrary', async () => {
          throw new TypeError('bug');
        }),
      ],
      repo,
    );

    await expect(processador.processar(SOLICITACAO)).rejects.toBeInstanceOf(
      TypeError,
    );
    expect(repo.marcarFalhaTransitoria).not.toHaveBeenCalled();
  });
});
