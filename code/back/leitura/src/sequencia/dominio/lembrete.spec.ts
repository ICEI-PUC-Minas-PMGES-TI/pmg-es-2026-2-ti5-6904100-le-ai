import {
  chaveDeNegocioDoLembrete,
  eventIdDoLembrete,
  lembreteDevido,
} from './lembrete';
import type { EstadoSequencia } from './sequencia';

const estado = (
  ultimoDia: string | null,
  sequenciaAtual = 12,
  fuso: string | null = 'America/Sao_Paulo',
): EstadoSequencia => ({
  sequenciaAtual,
  maiorSequencia: Math.max(sequenciaAtual, 31),
  ultimoDia,
  ultimoFusoHorario: ultimoDia ? fuso : null,
});

describe('lembreteDevido (RF-GAM-05)', () => {
  // 25/09/2026 às 19h em São Paulo.
  const agora = new Date('2026-09-25T22:00:00Z');

  it('sequência ativa e último dia ontem: devido, com o dia local de hoje', () => {
    expect(lembreteDevido(estado('2026-09-24'), agora)).toEqual({
      dataLocal: '2026-09-25',
      sequenciaAtual: 12,
    });
  });

  it('já registrou hoje: não devido', () => {
    expect(lembreteDevido(estado('2026-09-25'), agora)).toBeNull();
  });

  it('último dia anteontem: a sequência já zerou, não devido', () => {
    expect(lembreteDevido(estado('2026-09-23'), agora)).toBeNull();
  });

  it('sem nenhum progresso: não devido', () => {
    expect(lembreteDevido(estado(null, 0), agora)).toBeNull();
  });

  it('o dia local é o do último fuso do dispositivo, não o do servidor', () => {
    // 22h UTC já é 26/09 em Tóquio: o último dia (25) passou a ser ontem lá.
    expect(
      lembreteDevido(estado('2026-09-25', 3, 'Asia/Tokyo'), agora),
    ).toEqual({ dataLocal: '2026-09-26', sequenciaAtual: 3 });
  });

  it('último dia "no futuro" (voltou para um fuso atrás): não devido', () => {
    expect(lembreteDevido(estado('2026-09-26'), agora)).toBeNull();
  });
});

describe('identidade do lembrete', () => {
  const usuario = '0B1E2C3D-4E5F-4061-8A7B-9C0D1E2F3A4B';

  it('chave de negócio do catálogo, com o id em minúsculas', () => {
    expect(chaveDeNegocioDoLembrete(usuario, '2026-09-25')).toBe(
      'sequencia:0b1e2c3d-4e5f-4061-8a7b-9c0d1e2f3a4b:lembrete:2026-09-25',
    );
  });

  it('eventId é UUID v5, igual no mesmo dia e diferente no seguinte', () => {
    const hoje = eventIdDoLembrete(usuario, '2026-09-25');
    expect(hoje).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(eventIdDoLembrete(usuario.toLowerCase(), '2026-09-25')).toBe(hoje);
    expect(eventIdDoLembrete(usuario, '2026-09-26')).not.toBe(hoje);
  });
});
