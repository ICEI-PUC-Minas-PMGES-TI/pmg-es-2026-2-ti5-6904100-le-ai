import { alvoForaDoLimite, TETO_POR_UNIDADE } from './desafio';

describe('valor-alvo por unidade', () => {
  it.each([
    ['paginas', 1],
    ['paginas', 100_000],
    ['minutos', 100_000],
    ['livros', 1_000],
  ] as const)('%s aceita %d', (unidade, valor) => {
    expect(alvoForaDoLimite(unidade, valor)).toBeNull();
  });

  it.each([
    ['paginas', 0],
    ['paginas', 100_001],
    ['minutos', 100_001],
    ['livros', 1_001],
  ] as const)('%s recusa %d', (unidade, valor) => {
    expect(alvoForaDoLimite(unidade, valor)).toContain(
      TETO_POR_UNIDADE[unidade].toLocaleString('pt-BR'),
    );
  });

  it('a mensagem fala da unidade em português', () => {
    expect(alvoForaDoLimite('livros', 5000)).toBe(
      'Para livros, o alvo vai de 1 a 1.000.',
    );
  });
});
