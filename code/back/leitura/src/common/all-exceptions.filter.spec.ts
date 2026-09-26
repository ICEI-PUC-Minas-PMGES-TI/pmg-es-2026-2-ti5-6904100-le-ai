import { NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ErroDeNegocio, ErroDeValidacao } from './erros-de-negocio';

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

  it('acrescenta campos ao corpo do 400', () => {
    const res = cenario(
      new ErroDeValidacao([
        { campo: 'isbn', mensagem: 'Informe um ISBN-13 válido.' },
      ]),
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: 'REQUISICAO_INVALIDA',
        campos: [{ campo: 'isbn', mensagem: 'Informe um ISBN-13 válido.' }],
      }),
    );
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
