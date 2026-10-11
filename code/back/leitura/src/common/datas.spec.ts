import { deDiaJuliano, diaDaSemanaIso, diaJuliano, somarDias } from './datas';

describe('datas de calendário', () => {
  it('somarDias atravessa mês e ano', () => {
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('dia juliano vai e volta, inclusive antes de 1970', () => {
    for (const data of ['1969-12-31', '1970-01-01', '2024-02-29']) {
      expect(deDiaJuliano(diaJuliano(data))).toBe(data);
    }
  });

  it.each([
    ['2026-10-05', 0], // segunda
    ['2026-10-09', 4], // sexta
    ['2026-10-11', 6], // domingo
    ['1969-12-29', 0], // segunda antes de 1970
  ])('dia da semana ISO de %s é %i', (data, esperado) => {
    expect(diaDaSemanaIso(data)).toBe(esperado);
  });
});
