import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  NaoAutenticado,
  ServicoIndisponivel,
} from '../common/erros-de-negocio';
import { ModeracaoTokenGuard } from './moderacao-token.guard';

const SEGREDO = 'segredo-da-moderacao-com-mais-de-32-caracteres';

function guard(segredo: string | undefined): ModeracaoTokenGuard {
  return new ModeracaoTokenGuard({
    get: () => segredo,
  } as unknown as ConfigService);
}

function contexto(cabecalho?: string | string[]): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers:
          cabecalho === undefined ? {} : { 'x-moderacao-token': cabecalho },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('ModeracaoTokenGuard', () => {
  it('aceita o token certo', () => {
    expect(guard(SEGREDO).canActivate(contexto(SEGREDO))).toBe(true);
  });

  it('recusa token ausente, errado ou de outro tamanho com 401', () => {
    for (const cabecalho of [undefined, 'errado', `${SEGREDO}x`]) {
      expect(() => guard(SEGREDO).canActivate(contexto(cabecalho))).toThrow(
        NaoAutenticado,
      );
    }
  });

  it('sem o segredo configurado é 503, nunca liberado', () => {
    expect(() => guard(undefined).canActivate(contexto(SEGREDO))).toThrow(
      ServicoIndisponivel,
    );
  });
});
