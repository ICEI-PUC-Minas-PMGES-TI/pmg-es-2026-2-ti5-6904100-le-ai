import { apurar, type EstadoSequencia, sequenciaVigente } from './sequencia';

describe('apurar (RN-18)', () => {
  it('sem dias, tudo zerado', () => {
    expect(apurar([])).toEqual({
      maior: 0,
      atualAteUltimoDia: 0,
      ultimoDia: null,
    });
  });

  it('dias consecutivos formam um trecho só', () => {
    expect(apurar(['2026-10-01', '2026-10-02', '2026-10-03'])).toEqual({
      maior: 3,
      atualAteUltimoDia: 3,
      ultimoDia: '2026-10-03',
    });
  });

  it('dia repetido conta uma vez (RN-18.3)', () => {
    expect(apurar(['2026-10-01', '2026-10-01', '2026-10-02'])).toMatchObject({
      maior: 2,
      atualAteUltimoDia: 2,
    });
  });

  it('buraco reinicia o trecho e a maior fica preservada (RN-18.6)', () => {
    expect(
      apurar([
        '2026-09-01',
        '2026-09-02',
        '2026-09-03',
        '2026-09-04',
        '2026-09-10',
        '2026-09-11',
      ]),
    ).toEqual({ maior: 4, atualAteUltimoDia: 2, ultimoDia: '2026-09-11' });
  });

  it('a ordem de chegada não importa: offline tardio recompõe o trecho', () => {
    // O dia 02 chegou depois (captura offline) e emenda os dois trechos.
    expect(apurar(['2026-10-03', '2026-10-01', '2026-10-02'])).toMatchObject({
      maior: 3,
      atualAteUltimoDia: 3,
    });
  });

  it('atravessa virada de mês e ano bissexto', () => {
    expect(
      apurar(['2028-02-28', '2028-02-29', '2028-03-01', '2028-12-31']),
    ).toMatchObject({ maior: 3, atualAteUltimoDia: 1 });
    expect(apurar(['2026-12-31', '2027-01-01'])).toMatchObject({ maior: 2 });
  });
});

describe('sequenciaVigente (RF-GAM-03, RN-18.4)', () => {
  const estado = (
    ultimoDia: string | null,
    ultimoFusoHorario: string | null = 'America/Sao_Paulo',
  ): EstadoSequencia => ({
    sequenciaAtual: 5,
    maiorSequencia: 9,
    ultimoDia,
    ultimoFusoHorario,
  });

  // 08/10/2026 12:00 em São Paulo (UTC-3).
  const agora = new Date('2026-10-08T15:00:00.000Z');

  it('leu hoje: vigente', () => {
    expect(sequenciaVigente(estado('2026-10-08'), agora)).toBe(5);
  });

  it('leu ontem: o dia de hoje ainda não terminou, segue vigente', () => {
    expect(sequenciaVigente(estado('2026-10-07'), agora)).toBe(5);
  });

  it('anteontem: um dia se encerrou sem leitura, zera', () => {
    expect(sequenciaVigente(estado('2026-10-06'), agora)).toBe(0);
  });

  it('sem registro, zero', () => {
    expect(sequenciaVigente(estado(null, null), agora)).toBe(0);
  });

  it('o hoje é o do último fuso do dispositivo, não o de quem consulta', () => {
    // Mesmo instante: 08/10 13:00 em São Paulo, 09/10 01:00 em Tóquio.
    const instante = new Date('2026-10-08T16:00:00.000Z');
    // Em São Paulo, o último dia (07) é ontem: vigente.
    expect(
      sequenciaVigente(estado('2026-10-07', 'America/Sao_Paulo'), instante),
    ).toBe(5);
    // Em Tóquio, o dia 08 inteiro já se encerrou sem leitura: zera.
    expect(sequenciaVigente(estado('2026-10-07', 'Asia/Tokyo'), instante)).toBe(
      0,
    );
  });

  it('último dia à frente do hoje (voltou para um fuso atrás) segue vigente', () => {
    expect(sequenciaVigente(estado('2026-10-09'), agora)).toBe(5);
  });
});
