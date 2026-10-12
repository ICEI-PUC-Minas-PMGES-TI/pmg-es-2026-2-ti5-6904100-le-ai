import {
  anosComRegistro,
  type BaldeMensal,
  lerPeriodo,
  media,
  resumir,
  serie,
  somar,
} from './estatisticas';

function balde(
  ano: number,
  mes: number,
  campos: Partial<Omit<BaldeMensal, 'ano' | 'mes'>> = {},
): BaldeMensal {
  return {
    ano,
    mes,
    livrosConcluidos: 0,
    paginasLidas: 0,
    minutosLidos: 0,
    diasComLeitura: 0,
    diasEmLivrosConcluidos: 0,
    notasQuantidade: 0,
    notasSoma: 0,
    ...campos,
  };
}

const OUTUBRO_DE_2026 = { ano: 2026, mes: 10 };

describe('período da consulta', () => {
  it('ausente é o ano corrente', () => {
    expect(lerPeriodo(undefined, 2026)).toEqual({ tipo: 'ano', ano: 2026 });
  });

  it('aceita um ano de quatro dígitos e o acumulado', () => {
    expect(lerPeriodo('2024', 2026)).toEqual({ tipo: 'ano', ano: 2024 });
    expect(lerPeriodo('acumulado', 2026)).toEqual({ tipo: 'acumulado' });
  });

  it.each(['', '26', '02026', '0999', 'Acumulado', 'todos', '2026.0'])(
    'recusa %p',
    (texto) => {
      expect(lerPeriodo(texto, 2026)).toBeNull();
    },
  );
});

describe('médias', () => {
  it('arredonda a uma casa', () => {
    expect(media(10, 3)).toEqual({
      valor: 3.3,
      numerador: 10,
      denominador: 3,
    });
    expect(media(29, 6).valor).toBe(4.8);
  });

  it('sem denominador fica ausente, nunca zero (RF-STA-02)', () => {
    expect(media(0, 0)).toEqual({ valor: null, numerador: 0, denominador: 0 });
    expect(media(120, 0).valor).toBeNull();
  });
});

describe('resumo do período', () => {
  const baldes = [
    balde(2025, 11, {
      livrosConcluidos: 1,
      paginasLidas: 300,
      minutosLidos: 400,
      diasComLeitura: 10,
      diasEmLivrosConcluidos: 20,
      notasQuantidade: 1,
      notasSoma: 3,
    }),
    balde(2026, 1, {
      paginasLidas: 100,
      minutosLidos: 90,
      diasComLeitura: 4,
    }),
    balde(2026, 3, {
      livrosConcluidos: 2,
      paginasLidas: 50,
      minutosLidos: 60,
      diasComLeitura: 1,
      diasEmLivrosConcluidos: 9,
      notasQuantidade: 2,
      notasSoma: 9.5,
    }),
  ];

  it('o ano soma só os seus meses', () => {
    expect(resumir(baldes, { tipo: 'ano', ano: 2026 })).toEqual({
      totais: { livrosConcluidos: 2, paginasLidas: 150, minutosLidos: 150 },
      paginasPorDia: { valor: 30, numerador: 150, denominador: 5 },
      diasPorLivro: { valor: 4.5, numerador: 9, denominador: 2 },
      notaMedia: { valor: 4.8, numerador: 9.5, denominador: 2 },
    });
  });

  it('o acumulado soma todos os meses', () => {
    expect(resumir(baldes, { tipo: 'acumulado' })).toEqual({
      totais: { livrosConcluidos: 3, paginasLidas: 450, minutosLidos: 550 },
      paginasPorDia: { valor: 30, numerador: 450, denominador: 15 },
      diasPorLivro: { valor: 9.7, numerador: 29, denominador: 3 },
      notaMedia: { valor: 4.2, numerador: 12.5, denominador: 3 },
    });
  });

  it('ano sem nada tem totais zerados e médias ausentes', () => {
    const resumo = resumir(baldes, { tipo: 'ano', ano: 2019 });
    expect(resumo.totais).toEqual({
      livrosConcluidos: 0,
      paginasLidas: 0,
      minutosLidos: 0,
    });
    expect(resumo.paginasPorDia.valor).toBeNull();
    expect(resumo.diasPorLivro.valor).toBeNull();
    expect(resumo.notaMedia.valor).toBeNull();
  });

  it('somar uma lista vazia dá zeros', () => {
    expect(somar([])).toEqual({
      livrosConcluidos: 0,
      paginasLidas: 0,
      minutosLidos: 0,
      diasComLeitura: 0,
      diasEmLivrosConcluidos: 0,
      notasQuantidade: 0,
      notasSoma: 0,
    });
  });
});

describe('anos do seletor', () => {
  it('do mais recente ao mais antigo, com os livros de cada ano', () => {
    expect(
      anosComRegistro([
        balde(2024, 5, { diasComLeitura: 1, paginasLidas: 10 }),
        balde(2026, 2, { livrosConcluidos: 1 }),
        balde(2026, 8, { livrosConcluidos: 2, diasComLeitura: 3 }),
      ]),
    ).toEqual([
      { ano: 2026, livrosConcluidos: 3 },
      { ano: 2024, livrosConcluidos: 0 },
    ]);
  });

  it('nota sozinha não abre ano', () => {
    expect(
      anosComRegistro([balde(2023, 4, { notasQuantidade: 1, notasSoma: 5 })]),
    ).toEqual([]);
  });
});

describe('série dos gráficos (RF-STA-03)', () => {
  it('no primeiro ano começa no primeiro mês com registro e vai até o mês corrente', () => {
    const resultado = serie(
      [
        balde(2026, 6, { paginasLidas: 120, diasComLeitura: 2 }),
        balde(2026, 8, { livrosConcluidos: 1, paginasLidas: 30 }),
      ],
      { tipo: 'ano', ano: 2026 },
      OUTUBRO_DE_2026,
    );
    expect(resultado.granularidade).toBe('mes');
    expect(resultado.pontos).toEqual([
      { ano: 2026, mes: 6, paginasLidas: 120, livrosConcluidos: 0 },
      { ano: 2026, mes: 7, paginasLidas: 0, livrosConcluidos: 0 },
      { ano: 2026, mes: 8, paginasLidas: 30, livrosConcluidos: 1 },
      { ano: 2026, mes: 9, paginasLidas: 0, livrosConcluidos: 0 },
      { ano: 2026, mes: 10, paginasLidas: 0, livrosConcluidos: 0 },
    ]);
  });

  it('ano passado depois do primeiro vai de janeiro a dezembro', () => {
    const resultado = serie(
      [
        balde(2024, 11, { diasComLeitura: 1, paginasLidas: 5 }),
        balde(2025, 3, { diasComLeitura: 1, paginasLidas: 40 }),
      ],
      { tipo: 'ano', ano: 2025 },
      OUTUBRO_DE_2026,
    );
    expect(resultado.pontos.map((p) => p.mes)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(resultado.pontos[2].paginasLidas).toBe(40);
  });

  it('ano corrente sem nenhum registro vai de janeiro ao mês corrente, zerado', () => {
    const resultado = serie(
      [balde(2024, 2, { diasComLeitura: 1 })],
      { tipo: 'ano', ano: 2026 },
      OUTUBRO_DE_2026,
    );
    expect(resultado.pontos).toHaveLength(10);
    expect(resultado.pontos.every((p) => p.paginasLidas === 0)).toBe(true);
  });

  it('nunca corta um mês com registro depois do mês corrente', () => {
    const resultado = serie(
      [balde(2026, 11, { diasComLeitura: 1, paginasLidas: 8 })],
      { tipo: 'ano', ano: 2026 },
      OUTUBRO_DE_2026,
    );
    expect(resultado.pontos.at(-1)).toEqual({
      ano: 2026,
      mes: 11,
      paginasLidas: 8,
      livrosConcluidos: 0,
    });
  });

  it('o acumulado tem um ponto por ano, do primeiro com registro ao corrente', () => {
    const resultado = serie(
      [
        balde(2023, 7, { diasComLeitura: 1, paginasLidas: 50 }),
        balde(2023, 9, { livrosConcluidos: 1, paginasLidas: 25 }),
        balde(2025, 1, { livrosConcluidos: 2, diasComLeitura: 4 }),
      ],
      { tipo: 'acumulado' },
      OUTUBRO_DE_2026,
    );
    expect(resultado).toEqual({
      granularidade: 'ano',
      pontos: [
        { ano: 2023, mes: null, paginasLidas: 75, livrosConcluidos: 1 },
        { ano: 2024, mes: null, paginasLidas: 0, livrosConcluidos: 0 },
        { ano: 2025, mes: null, paginasLidas: 0, livrosConcluidos: 2 },
        { ano: 2026, mes: null, paginasLidas: 0, livrosConcluidos: 0 },
      ],
    });
  });

  it('sem registro, o acumulado não tem pontos', () => {
    expect(
      serie(
        [balde(2026, 1, { notasQuantidade: 1, notasSoma: 4 })],
        { tipo: 'acumulado' },
        OUTUBRO_DE_2026,
      ),
    ).toEqual({ granularidade: 'ano', pontos: [] });
  });
});
