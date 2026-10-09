import { EntidadeInvalida } from '../common/erros-de-negocio';
import { validarPagina, validarTextoDaFrase } from './regras';

describe('regras das frases (RN-11)', () => {
  it('aceita até 500 code points, contando emoji como 1', () => {
    expect(() => validarTextoDaFrase('📖'.repeat(500))).not.toThrow();
    expect(() => validarTextoDaFrase('a'.repeat(501))).toThrow(
      EntidadeInvalida,
    );
  });

  it('recusa trecho só de espaços ou invisíveis, e o caractere nulo', () => {
    expect(() => validarTextoDaFrase('   ')).toThrow(EntidadeInvalida);
    expect(() => validarTextoDaFrase('\u200B\uFEFF')).toThrow(EntidadeInvalida);
    expect(() => validarTextoDaFrase('ok\u0000')).toThrow(EntidadeInvalida);
  });

  it('página vai de 1 ao total do livro', () => {
    expect(() => validarPagina(1, 264)).not.toThrow();
    expect(() => validarPagina(264, 264)).not.toThrow();
    expect(() => validarPagina(0, 264)).toThrow(EntidadeInvalida);
    expect(() => validarPagina(265, 264)).toThrow(EntidadeInvalida);
  });
});
