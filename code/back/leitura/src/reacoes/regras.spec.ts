import { mudancaAoReagir, type ReacaoGravada } from './regras';

const ativa = (
  tipo: 'curtida' | 'descurtida',
  primeiraCurtidaEm: Date | null,
): ReacaoGravada => ({ tipo, ativa: true, primeiraCurtidaEm });

describe('mudancaAoReagir', () => {
  const quando = new Date('2026-10-09T12:00:00Z');

  it('a primeira reação do par é curtida: grava e notifica', () => {
    expect(mudancaAoReagir(null, 'curtida')).toEqual({
      gravar: true,
      primeiraCurtida: true,
    });
  });

  it('a primeira reação do par é descurtida: grava e não notifica', () => {
    expect(mudancaAoReagir(null, 'descurtida')).toEqual({
      gravar: true,
      primeiraCurtida: false,
    });
  });

  it('repetir a mesma reação ativa não grava', () => {
    expect(mudancaAoReagir(ativa('curtida', quando), 'curtida')).toEqual({
      gravar: false,
      primeiraCurtida: false,
    });
  });

  it('recurtir depois de retirar grava, mas não notifica de novo', () => {
    const retirada: ReacaoGravada = {
      tipo: 'curtida',
      ativa: false,
      primeiraCurtidaEm: quando,
    };
    expect(mudancaAoReagir(retirada, 'curtida')).toEqual({
      gravar: true,
      primeiraCurtida: false,
    });
  });

  it('curtir depois de uma descurtida que nunca foi curtida notifica', () => {
    expect(mudancaAoReagir(ativa('descurtida', null), 'curtida')).toEqual({
      gravar: true,
      primeiraCurtida: true,
    });
  });

  it('voltar a curtir depois de alternar para descurtida não notifica', () => {
    expect(mudancaAoReagir(ativa('descurtida', quando), 'curtida')).toEqual({
      gravar: true,
      primeiraCurtida: false,
    });
  });
});
