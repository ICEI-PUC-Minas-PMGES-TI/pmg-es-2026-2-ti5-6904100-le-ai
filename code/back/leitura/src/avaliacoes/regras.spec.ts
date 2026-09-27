import { EntidadeInvalida } from '../common/erros-de-negocio';
import { validarValorDaNota } from './regras';

describe('validarValorDaNota (RN-06)', () => {
  it.each([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5])('aceita %d', (valor) => {
    expect(() => validarValorDaNota(valor)).not.toThrow();
  });

  it.each([-0.5, 5.5, 4.3, 0.25, 10, -1])('recusa %d com 422', (valor) => {
    expect(() => validarValorDaNota(valor)).toThrow(EntidadeInvalida);
  });

  it('aponta o campo valor', () => {
    let erro: unknown;
    try {
      validarValorDaNota(4.3);
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(EntidadeInvalida);
    expect((erro as EntidadeInvalida).getStatus()).toBe(422);
    expect((erro as EntidadeInvalida).extras).toEqual({
      campos: [
        {
          campo: 'valor',
          mensagem: 'Use uma nota de 0 a 5, em passos de 0,5.',
        },
      ],
    });
  });
});
