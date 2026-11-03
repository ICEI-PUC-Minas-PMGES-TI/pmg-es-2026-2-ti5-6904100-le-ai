import {
  FAIXAS_DA_DISTRIBUICAO,
  notaGeral,
  notasDosLeitores,
} from './notas-da-pagina';

describe('notas da página do livro', () => {
  it('as faixas vão de 5 a 0, de meia em meia estrela', () => {
    expect(FAIXAS_DA_DISTRIBUICAO).toEqual([
      5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0,
    ]);
  });

  it('sem nota dos leitores: indicador nulo e distribuição vazia', () => {
    expect(notasDosLeitores([])).toEqual({
      notaDosLeitores: null,
      distribuicao: [],
    });
  });

  it('preenche as 11 faixas, com zero nas vazias, e a contagem bate com a soma', () => {
    const { notaDosLeitores: nota, distribuicao } = notasDosLeitores([
      { valor: '5.0', quantidade: '2', total: '3', media: '4.7' },
      { valor: '4.0', quantidade: '1', total: '3', media: '4.7' },
    ]);

    expect(nota).toEqual({ valor: 4.7, quantidade: 3 });
    expect(distribuicao).toHaveLength(11);
    expect(distribuicao[0]).toEqual({ valor: 5, quantidade: 2 });
    expect(distribuicao[2]).toEqual({ valor: 4, quantidade: 1 });
    expect(distribuicao[10]).toEqual({ valor: 0, quantidade: 0 });
    expect(distribuicao.reduce((soma, f) => soma + f.quantidade, 0)).toBe(
      nota?.quantidade,
    );
  });

  it('não arredonda de novo a média que o SQL arredondou (53 notas, soma 225: 4,2)', () => {
    // 225 / 53 = 4,245…: arredondar a 2 casas e depois a 1 daria 4,3.
    const { notaDosLeitores: nota } = notasDosLeitores([
      { valor: '4.5', quantidade: '50', total: '53', media: '4.2' },
      { valor: '0.0', quantidade: '3', total: '53', media: '4.2' },
    ]);
    expect(nota).toEqual({ valor: 4.2, quantidade: 53 });
  });

  it('nota geral ausente é nula, nunca zero', () => {
    expect(notaGeral(null, null)).toBeNull();
    expect(notaGeral('4.3', 412)).toEqual({ valor: 4.3, quantidade: 412 });
  });
});
