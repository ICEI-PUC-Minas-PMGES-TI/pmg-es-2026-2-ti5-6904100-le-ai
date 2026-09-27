import { NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import {
  EntidadeInvalida,
  ErroDeNegocio,
  ErroDeValidacao,
  LimiteExcedido,
} from './erros-de-negocio';

function mockHost(correlationId: string) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const req = { correlationId };
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => req,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const logger = {
    setContext: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  } as any;
  const filter = new AllExceptionsFilter(logger);

  it('formata erro conhecido com codigo, mensagem e correlationId', () => {
    const { host, status, json } = mockHost('teste-123');

    filter.catch(new NotFoundException(), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      codigo: 'RECURSO_NAO_ENCONTRADO',
      mensagem: 'Não encontramos o que você procura.',
      correlationId: 'teste-123',
    });
  });

  // O leitor de corpo do Express não lança HttpException, mas traz status e tipo.
  it('corpo acima do limite vira 413, não 500', () => {
    const { host, status, json } = mockHost('grande');
    const erro = Object.assign(new Error('request entity too large'), {
      type: 'entity.too.large',
      status: 413,
    });

    filter.catch(erro, host);

    expect(status).toHaveBeenCalledWith(413);
    expect(json.mock.calls[0][0].codigo).toBe('CORPO_MUITO_GRANDE');
  });

  it('erro desconhecido vira 500 e não vaza detalhe técnico', () => {
    const { host, status, json } = mockHost('abc');

    filter.catch(new Error('detalhe interno secreto'), host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.codigo).toBe('ERRO_INTERNO');
    expect(body.mensagem).not.toContain('secreto');
    expect(body.correlationId).toBe('abc');
  });
});

describe('AllExceptionsFilter com erro de negócio', () => {
  function cenario(excecao: unknown) {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => res,
        getRequest: () => ({ correlationId: 'c0rr' }),
      }),
    } as never;
    const logger = {
      setContext: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as never;

    new AllExceptionsFilter(logger).catch(excecao, host);
    return res;
  }

  it('acrescenta campos ao corpo do 422 sem quebrar o formato padrão', () => {
    const res = cenario(
      new EntidadeInvalida([
        {
          campo: 'valor',
          mensagem: 'Use uma nota de 0 a 5, em passos de 0,5.',
        },
      ]),
    );

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      campos: [
        {
          campo: 'valor',
          mensagem: 'Use uma nota de 0 a 5, em passos de 0,5.',
        },
      ],
      codigo: 'ENTIDADE_NAO_PROCESSAVEL',
      mensagem: 'Não foi possível processar os dados enviados.',
      correlationId: 'c0rr',
    });
  });

  it('acrescenta campos ao corpo do 400', () => {
    const res = cenario(
      new ErroDeValidacao([
        { campo: 'texto', mensagem: 'Informe o texto da resenha.' },
      ]),
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: 'REQUISICAO_INVALIDA',
        campos: [{ campo: 'texto', mensagem: 'Informe o texto da resenha.' }],
      }),
    );
  });

  it('aplica o Retry-After do 429', () => {
    const res = cenario(new LimiteExcedido(42));

    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '42');
    expect(res.status).toHaveBeenCalledWith(429);
  });

  // Os extras nunca podem sobrescrever o corpo padrão de RNF-ERR-01.
  it('não deixa extras sobrescreverem codigo, mensagem ou correlationId', () => {
    const res = cenario(
      new ErroDeNegocio(409, 'MEU_CODIGO', 'minha mensagem', {
        codigo: 'FORJADO',
        correlationId: 'forjado',
      }),
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'MEU_CODIGO', correlationId: 'c0rr' }),
    );
  });
});
