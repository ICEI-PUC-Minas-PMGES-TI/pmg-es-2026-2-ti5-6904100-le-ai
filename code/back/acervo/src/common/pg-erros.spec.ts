import { mapError } from './error-codes';
import { ehBancoIndisponivel } from './pg-erros';

/** Como o Drizzle entrega: o erro do driver em `cause`. */
const embrulhado = (causa: unknown) =>
  Object.assign(new Error('Failed query'), { cause: causa });

describe('ehBancoIndisponivel', () => {
  it.each([
    ['conexão recusada pelo servidor', '08006'],
    ['banco iniciando', '57P03'],
    ['conexões esgotadas', '53300'],
    ['rede fora', 'ECONNREFUSED'],
  ])('%s é indisponibilidade', (_caso, code) => {
    expect(
      ehBancoIndisponivel(embrulhado(Object.assign(new Error('x'), { code }))),
    ).toBe(true);
  });

  it('o pool sem conexão livre também, mesmo sem código', () => {
    expect(
      ehBancoIndisponivel(
        embrulhado(new Error('timeout exceeded when trying to connect')),
      ),
    ).toBe(true);
  });

  it('violação de constraint, de protocolo e erro de sintaxe não são', () => {
    expect(ehBancoIndisponivel(embrulhado({ code: '23505' }))).toBe(false);
    expect(ehBancoIndisponivel(embrulhado({ code: '08P01' }))).toBe(false);
    expect(ehBancoIndisponivel(embrulhado({ code: '42601' }))).toBe(false);
    expect(ehBancoIndisponivel(new Error('qualquer'))).toBe(false);
  });

  it('vira 503 no corpo de erro padrão', () => {
    expect(mapError(embrulhado({ code: '57P01' }))).toMatchObject({
      status: 503,
      codigo: 'SERVICO_INDISPONIVEL',
    });
  });
});
