import { NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import {
  ErroDeNegocio,
  ErroDeValidacao,
  LimiteExcedido,
  LivroJaCadastrado,
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

  it('acrescenta livroId ao corpo do 409 sem quebrar o formato padrão', () => {
    const res = cenario(
      new LivroJaCadastrado('11111111-2222-3333-4444-555555555555'),
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      livroId: '11111111-2222-3333-4444-555555555555',
      codigo: 'LIVRO_JA_CADASTRADO',
      mensagem: 'Este livro já está no acervo.',
      correlationId: 'c0rr',
    });
  });

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
