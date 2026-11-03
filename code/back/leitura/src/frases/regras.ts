import { contarCaracteres } from '../avaliacoes/regras';
import { EntidadeInvalida } from '../common/erros-de-negocio';

/** RN-11: até 500 caracteres por trecho, página obrigatória e até 10 trechos por leitor e livro. */
export const LIMITE_DO_TRECHO = 500;
export const FRASES_POR_LIVRO = 10;

const SO_INVISIVEIS = /^[\s\u200B-\u200D\u2060\uFEFF]*$/u;

/**
 * Texto de 1 a 500 code points (como o `char_length` do CHECK `frase_texto_ck`), com algo além
 * de espaços ou caracteres invisíveis e sem o caractere nulo, que o `text` do Postgres não guarda.
 */
export function validarTextoDaFrase(texto: string): void {
  if (SO_INVISIVEIS.test(texto)) {
    throw new EntidadeInvalida([
      { campo: 'texto', mensagem: 'Escreva o trecho que você quer guardar.' },
    ]);
  }
  if (texto.includes('\u0000')) {
    throw new EntidadeInvalida([
      {
        campo: 'texto',
        mensagem: 'O trecho tem um caractere que não pode ser salvo.',
      },
    ]);
  }
  const total = contarCaracteres(texto);
  if (total > LIMITE_DO_TRECHO) {
    const excedente = total - LIMITE_DO_TRECHO;
    throw new EntidadeInvalida([
      {
        campo: 'texto',
        mensagem: `O trecho passou do limite em ${excedente} ${excedente === 1 ? 'caractere' : 'caracteres'}.`,
      },
    ]);
  }
}

/** Página de 1 até o total do livro (`paginas` é obrigatório em `v_livro_referencia_v1`). */
export function validarPagina(pagina: number, paginasDoLivro: number): void {
  if (pagina < 1) {
    throw new EntidadeInvalida([
      { campo: 'pagina', mensagem: 'Informe uma página a partir de 1.' },
    ]);
  }
  if (pagina > paginasDoLivro) {
    throw new EntidadeInvalida([
      {
        campo: 'pagina',
        mensagem: `O livro tem ${paginasDoLivro} páginas. Informe uma página até ${paginasDoLivro}.`,
      },
    ]);
  }
}
