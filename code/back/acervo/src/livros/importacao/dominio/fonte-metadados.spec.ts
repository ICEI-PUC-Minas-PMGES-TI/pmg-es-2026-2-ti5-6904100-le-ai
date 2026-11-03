import { notaExterna } from './fonte-metadados';

describe('notaExterna (RNF-SEC-33)', () => {
  it('aceita de 0 a 5 com contagem de 1 para cima, com 1 casa', () => {
    expect(notaExterna(4.25, 4)).toEqual({ valor: 4.3, quantidade: 4 });
    expect(notaExterna(0, 1)).toEqual({ valor: 0, quantidade: 1 });
    expect(notaExterna(5, 9)).toEqual({ valor: 5, quantidade: 9 });
  });

  it.each([
    ['valor nulo', null, 3],
    ['valor acima de 5', 5.1, 3],
    ['valor negativo', -1, 3],
    ['valor não finito', Number.NaN, 3],
    ['valor em texto', '4.5', 3],
    ['contagem zero', 4, 0],
    ['contagem fracionária', 4, 2.5],
    ['contagem ausente', 4, undefined],
  ])('%s é ausência', (_caso, valor, quantidade) => {
    expect(notaExterna(valor, quantidade)).toBeNull();
  });
});
