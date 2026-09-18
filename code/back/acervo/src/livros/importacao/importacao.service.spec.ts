import {
  AcessoNegado,
  ErroDeValidacao,
  EstadoInvalido,
  LivroJaCadastrado,
  NaoEncontrado,
} from '../../common/erros-de-negocio';
import { IdempotenciaService } from '../../common/idempotencia/idempotencia.service';
import { OutboxRepository } from '../outbox/outbox.repository';
import { ImportacaoRepository } from './importacao.repository';
import { ImportacaoService } from './importacao.service';

const SOLICITANTE = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const OUTRO = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const IMPORTACAO = 'cccccccc-3333-4333-8333-cccccccccccc';
const LIVRO = 'dddddddd-4444-4444-8444-dddddddddddd';
const ISBN = '9788535914849';

function registro(mudancas: Record<string, unknown> = {}) {
  return {
    id: IMPORTACAO,
    solicitanteId: SOLICITANTE,
    isbn13: ISBN,
    estado: 'pendente',
    livroId: null,
    erro: null,
    criadoEm: new Date('2026-09-18T12:00:00Z'),
    atualizadoEm: new Date('2026-09-18T12:00:00Z'),
    ...mudancas,
  };
}

function montar(
  opcoes: { livroExistente?: string | null; atual?: unknown } = {},
) {
  const repositorio = {
    buscarLivroOficialPorIsbn: jest
      .fn()
      .mockResolvedValue(opcoes.livroExistente ?? null),
    criar: jest.fn().mockResolvedValue(registro()),
    // `'atual' in opcoes` e não `?? registro()`: com o operador, passar `null`
    // de propósito cairia no valor padrão e o caso do 404 nunca seria testado.
    buscarPorId: jest
      .fn()
      .mockResolvedValue('atual' in opcoes ? opcoes.atual : registro()),
    reabrir: jest.fn().mockResolvedValue(registro()),
  } as unknown as ImportacaoRepository;

  const outbox = {
    inserir: jest.fn().mockResolvedValue('evento-1'),
  } as unknown as OutboxRepository;

  // Executa o efeito direto, como a transação faria, para o teste enxergar a
  // ordem real das operações.
  const idempotencia = {
    executar: jest.fn((_ctx, efeito) => efeito({} as never)),
  } as unknown as IdempotenciaService;

  return {
    servico: new ImportacaoService(repositorio, outbox, idempotencia),
    repositorio,
    outbox,
    idempotencia,
  };
}

describe('ImportacaoService.solicitar', () => {
  it('aceita ISBN com separadores e normaliza antes de gravar', async () => {
    const { servico, repositorio } = montar();
    await servico.solicitar(SOLICITANTE, 'chave', '978-85-359-1484-9');

    expect(repositorio.criar).toHaveBeenCalledWith(
      expect.anything(),
      SOLICITANTE,
      ISBN,
    );
  });

  // RNF-SEC-38: nunca uma URL, e sempre com dígito verificador conferido.
  it.each([
    '9788535914840',
    'https://openlibrary.org/isbn/9788535914849',
    'abc',
  ])('recusa %p com 400 no campo isbn', async (entrada) => {
    const { servico } = montar();
    await expect(
      servico.solicitar(SOLICITANTE, 'chave', entrada),
    ).rejects.toBeInstanceOf(ErroDeValidacao);
  });

  // RF-ACV-07: o 409 precisa levar o leitor à página do livro existente, e para
  // isso o corpo carrega o livroId.
  it('ISBN já cadastrado responde 409 com o id do livro existente', async () => {
    const { servico } = montar({ livroExistente: LIVRO });

    await expect(
      servico.solicitar(SOLICITANTE, 'chave', ISBN),
    ).rejects.toMatchObject({
      codigo: 'LIVRO_JA_CADASTRADO',
      livroId: LIVRO,
    });
  });

  it('não cria solicitação nem evento quando o ISBN já existe', async () => {
    const { servico, repositorio, outbox } = montar({ livroExistente: LIVRO });

    await expect(
      servico.solicitar(SOLICITANTE, 'chave', ISBN),
    ).rejects.toBeInstanceOf(LivroJaCadastrado);
    expect(repositorio.criar).not.toHaveBeenCalled();
    expect(outbox.inserir).not.toHaveBeenCalled();
  });

  it('responde 202 com a solicitação pendente', async () => {
    const { servico } = montar();
    const resposta = await servico.solicitar(SOLICITANTE, 'chave', ISBN);

    expect(resposta).toEqual({
      status: 202,
      corpo: { importacaoId: IMPORTACAO, status: 'pendente' },
    });
  });

  // RNF-ERR-10: domínio e evento na mesma transação, pela outbox.
  it('grava a outbox no contrato canônico, com data mínimo', async () => {
    const { servico, outbox } = montar();
    await servico.solicitar(SOLICITANTE, 'chave', ISBN);

    expect(outbox.inserir).toHaveBeenCalledWith(expect.anything(), {
      tipo: 'livro.importacao_solicitada',
      versao: 1,
      chaveNegocio: `importacao:${IMPORTACAO}`,
      payload: {
        importacaoId: IMPORTACAO,
        solicitanteId: SOLICITANTE,
        isbn13: ISBN,
      },
    });
  });

  it('usa o ISBN normalizado no hash de idempotência, não o texto digitado', async () => {
    const { servico, idempotencia } = montar();
    await servico.solicitar(SOLICITANTE, 'chave', '978-85-359-1484-9');

    expect(idempotencia.executar).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { isbn13: ISBN } }),
      expect.anything(),
    );
  });
});

describe('ImportacaoService.obter', () => {
  it('só o solicitante consulta a própria importação', async () => {
    const { servico } = montar();
    await expect(servico.obter(IMPORTACAO, OUTRO)).rejects.toBeInstanceOf(
      AcessoNegado,
    );
  });

  it('importação inexistente é 404', async () => {
    const { servico } = montar({ atual: null });
    await expect(servico.obter(IMPORTACAO, SOLICITANTE)).rejects.toBeInstanceOf(
      NaoEncontrado,
    );
  });

  // `nao_encontrado` é a única porta para o cadastro pessoal de RF-ACV-06.
  it('permiteCadastroPessoal só é verdadeiro em nao_encontrado', async () => {
    for (const estado of [
      'pendente',
      'concluida',
      'falha_transitoria',
    ] as const) {
      const extra =
        estado === 'concluida'
          ? { livroId: LIVRO }
          : estado === 'falha_transitoria'
            ? { erro: 'fonte indisponível' }
            : {};
      const { servico } = montar({ atual: registro({ estado, ...extra }) });
      const dto = await servico.obter(IMPORTACAO, SOLICITANTE);
      expect(dto.permiteCadastroPessoal).toBe(false);
    }

    const { servico } = montar({
      atual: registro({ estado: 'nao_encontrado' }),
    });
    expect(
      (await servico.obter(IMPORTACAO, SOLICITANTE)).permiteCadastroPessoal,
    ).toBe(true);
  });

  it('livroId só aparece em concluida', async () => {
    const { servico } = montar({
      atual: registro({ estado: 'concluida', livroId: LIVRO }),
    });
    expect((await servico.obter(IMPORTACAO, SOLICITANTE)).livroId).toBe(LIVRO);
  });
});

describe('ImportacaoService.reprocessar', () => {
  it('reenfileira a partir de falha_transitoria e mantém o mesmo importacaoId', async () => {
    const { servico, outbox } = montar({
      atual: registro({
        estado: 'falha_transitoria',
        erro: 'fonte indisponível',
      }),
    });

    const resposta = await servico.reprocessar(
      IMPORTACAO,
      SOLICITANTE,
      'chave',
    );

    expect(resposta.corpo.importacaoId).toBe(IMPORTACAO);
    expect(outbox.inserir).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ chaveNegocio: `importacao:${IMPORTACAO}` }),
    );
  });

  // `nao_encontrado` não se reprocessa: as fontes responderam, e a resposta foi
  // que o ISBN não existe. O caminho dali é o cadastro pessoal.
  it.each(['pendente', 'concluida', 'nao_encontrado'] as const)(
    'recusa reprocessar a partir de %s',
    async (estado) => {
      const extra = estado === 'concluida' ? { livroId: LIVRO } : {};
      const { servico } = montar({ atual: registro({ estado, ...extra }) });
      await expect(
        servico.reprocessar(IMPORTACAO, SOLICITANTE, 'chave'),
      ).rejects.toBeInstanceOf(EstadoInvalido);
    },
  );

  it('só o solicitante reprocessa', async () => {
    const { servico } = montar({
      atual: registro({ estado: 'falha_transitoria', erro: 'x' }),
    });
    await expect(
      servico.reprocessar(IMPORTACAO, OUTRO, 'chave'),
    ).rejects.toBeInstanceOf(AcessoNegado);
  });
});
