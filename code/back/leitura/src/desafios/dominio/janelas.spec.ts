import { emDia, hoje, janelaQueContem, janelasAte } from './janelas';

describe('janelas de calendário (RN-20.1)', () => {
  it('diária é o próprio dia', () => {
    expect(janelaQueContem('2026-10-09', 'diaria')).toEqual({
      inicio: '2026-10-09',
      fim: '2026-10-09',
    });
  });

  it.each([
    ['2026-10-05', '2026-10-05', '2026-10-11'], // segunda
    ['2026-10-09', '2026-10-05', '2026-10-11'], // sexta
    ['2026-10-11', '2026-10-05', '2026-10-11'], // domingo fecha a semana
    ['2026-10-12', '2026-10-12', '2026-10-18'],
  ])('semanal ISO: %s cai em %s a %s', (data, inicio, fim) => {
    expect(janelaQueContem(data, 'semanal')).toEqual({ inicio, fim });
  });

  it('semana ISO atravessa a virada do ano', () => {
    expect(janelaQueContem('2027-01-01', 'semanal')).toEqual({
      inicio: '2026-12-28',
      fim: '2027-01-03',
    });
    expect(janelaQueContem('2026-12-31', 'semanal')).toEqual({
      inicio: '2026-12-28',
      fim: '2027-01-03',
    });
  });

  it('mensal vai do dia 1 ao último dia, inclusive fevereiro bissexto', () => {
    expect(janelaQueContem('2026-10-09', 'mensal')).toEqual({
      inicio: '2026-10-01',
      fim: '2026-10-31',
    });
    expect(janelaQueContem('2028-02-10', 'mensal')).toEqual({
      inicio: '2028-02-01',
      fim: '2028-02-29',
    });
    expect(janelaQueContem('2026-02-28', 'mensal')).toEqual({
      inicio: '2026-02-01',
      fim: '2026-02-28',
    });
    expect(janelaQueContem('2026-12-31', 'mensal')).toEqual({
      inicio: '2026-12-01',
      fim: '2026-12-31',
    });
  });

  it('anual é o ano de calendário', () => {
    expect(janelaQueContem('2026-08-15', 'anual')).toEqual({
      inicio: '2026-01-01',
      fim: '2026-12-31',
    });
  });

  it('hoje é o dia local no fuso informado', () => {
    const instante = new Date('2026-10-10T01:30:00.000Z');
    expect(hoje('America/Sao_Paulo', instante)).toBe('2026-10-09');
    expect(hoje('Asia/Tokyo', instante)).toBe('2026-10-10');
  });
});

describe('janelas a materializar (RN-20.9)', () => {
  it('da janela de criação até a corrente, sem pular períodos vazios', () => {
    expect(janelasAte('2026-09-17', 'semanal', '2026-10-09')).toEqual([
      { inicio: '2026-09-14', fim: '2026-09-20' },
      { inicio: '2026-09-21', fim: '2026-09-27' },
      { inicio: '2026-09-28', fim: '2026-10-04' },
      { inicio: '2026-10-05', fim: '2026-10-11' },
    ]);
  });

  it('criação no meio da janela começa no início dela (RN-20.2)', () => {
    expect(janelasAte('2026-08-20', 'anual', '2026-10-09')).toEqual([
      { inicio: '2026-01-01', fim: '2026-12-31' },
    ]);
  });

  it('diária gera um período por dia', () => {
    expect(janelasAte('2026-10-07', 'diaria', '2026-10-09')).toHaveLength(3);
  });

  it('não cria nada depois da janela corrente', () => {
    expect(janelasAte('2026-11-01', 'mensal', '2026-10-09')).toEqual([]);
  });
});

describe('materialização em dia', () => {
  // 2026-10-10T20:00Z: dia 10 em São Paulo, dia 11 em Tóquio.
  const agora = new Date('2026-10-10T20:00:00Z');

  it('em dia quando a última janela alcança o hoje do fuso', () => {
    expect(emDia('2026-10-10', 'America/Sao_Paulo', agora)).toBe(true);
    expect(emDia('2026-10-11', 'America/Sao_Paulo', agora)).toBe(true);
  });

  it('atrasada quando o hoje do fuso passou da última janela', () => {
    expect(emDia('2026-10-10', 'Asia/Tokyo', agora)).toBe(false);
  });

  it('sem janela nenhuma, precisa materializar', () => {
    expect(emDia(null, 'America/Sao_Paulo', agora)).toBe(false);
  });
});
