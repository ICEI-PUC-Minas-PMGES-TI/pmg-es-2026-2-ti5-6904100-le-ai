import {
  dentroDaJanela,
  ehMesValido,
  intervaloDoMes,
  janelaDoCalendario,
  somarMeses,
} from './calendario';

describe('somarMeses', () => {
  it('atravessa a virada do ano nos dois sentidos', () => {
    expect(somarMeses('2026-01', -1)).toBe('2025-12');
    expect(somarMeses('2026-12', 1)).toBe('2027-01');
    expect(somarMeses('2026-09', -5)).toBe('2026-04');
  });
});

describe('ehMesValido', () => {
  it.each(['2026-09', '2026-12', '2026-01'])('%s é mês', (mes) => {
    expect(ehMesValido(mes)).toBe(true);
  });

  it.each(['2026-13', '2026-00', '2026-9', '26-09', '2026-09-01', ''])(
    '%s não é mês',
    (mes) => {
      expect(ehMesValido(mes)).toBe(false);
    },
  );
});

describe('intervaloDoMes', () => {
  it('fevereiro bissexto e mês de 31 dias', () => {
    expect(intervaloDoMes('2028-02')).toEqual({
      de: '2028-02-01',
      ate: '2028-02-29',
    });
    expect(intervaloDoMes('2026-12')).toEqual({
      de: '2026-12-01',
      ate: '2026-12-31',
    });
  });
});

describe('janelaDoCalendario (RNF-DES-02)', () => {
  const agora = new Date('2026-09-24T15:00:00Z');

  it('mês corrente e os cinco anteriores', () => {
    expect(
      janelaDoCalendario(agora, 'America/Sao_Paulo', '2025-01-10'),
    ).toEqual({
      hoje: '2026-09-24',
      mesAtual: '2026-09',
      mesMaisAntigo: '2026-04',
    });
  });

  it('não recua antes do primeiro dia com leitura', () => {
    expect(
      janelaDoCalendario(agora, 'America/Sao_Paulo', '2026-07-18')
        .mesMaisAntigo,
    ).toBe('2026-07');
  });

  it('sem nenhum dia, só o mês corrente, no fuso padrão', () => {
    expect(janelaDoCalendario(agora, null, null)).toEqual({
      hoje: '2026-09-24',
      mesAtual: '2026-09',
      mesMaisAntigo: '2026-09',
    });
  });

  it('o hoje e o mês corrente vêm do último fuso do dispositivo', () => {
    const virada = new Date('2026-10-01T01:00:00Z');
    expect(
      janelaDoCalendario(virada, 'America/Sao_Paulo', '2026-09-01').mesAtual,
    ).toBe('2026-09');
    expect(
      janelaDoCalendario(virada, 'Europe/Lisbon', '2026-09-01').mesAtual,
    ).toBe('2026-10');
  });

  it('primeiro dia "no futuro" não passa do mês corrente', () => {
    const janela = janelaDoCalendario(
      new Date('2026-10-01T01:00:00Z'),
      'America/Sao_Paulo',
      '2026-10-01',
    );
    expect(janela.mesMaisAntigo).toBe('2026-09');
  });

  it('dentroDaJanela confere os dois limites', () => {
    const janela = janelaDoCalendario(agora, 'America/Sao_Paulo', '2020-01-01');
    expect(dentroDaJanela('2026-04', janela)).toBe(true);
    expect(dentroDaJanela('2026-09', janela)).toBe(true);
    expect(dentroDaJanela('2026-03', janela)).toBe(false);
    expect(dentroDaJanela('2026-10', janela)).toBe(false);
  });
});
