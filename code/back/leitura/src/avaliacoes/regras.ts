import { fullFormats } from 'ajv-formats/dist/formats';
import { EntidadeInvalida } from '../common/erros-de-negocio';

/** O mesmo `format: uri` que o validador da outbox aplica aos snapshots (RFC 3986, só ASCII). */
const ehUri = fullFormats.uri as (valor: string) => boolean;

/** Espaços e caracteres invisíveis (largura zero, BOM): texto só com eles não é resenha. */
const SO_INVISIVEIS = /^[\s\u200B-\u200D\u2060\uFEFF]*$/u;

/**
 * RN-06: onze valores permitidos, de 0 a 5 em passos de 0,5. Nota zero é
 * válida e distinta de nota ausente.
 *
 * Chega aqui um número já validado pelo DTO (texto, nulo ou ausente é 400).
 * Número fora da escala é regra de negócio: 422 com `campos`.
 */
export function validarValorDaNota(valor: number): void {
  if (valor < 0 || valor > 5 || !Number.isInteger(valor * 2)) {
    throw new EntidadeInvalida([
      { campo: 'valor', mensagem: 'Use uma nota de 0 a 5, em passos de 0,5.' },
    ]);
  }
}

export const LIMITE_DA_RESENHA = 5000;

/**
 * Caracteres Unicode (code points), como o `char_length` do CHECK `resenha_texto_ck`. O
 * `length` do JavaScript conta unidades UTF-16 e daria 2 para um emoji de um code point só.
 * Emoji composto (👍🏽, ❤️) tem mais de um code point e conta mais de 1, nos três lados.
 */
export function contarCaracteres(texto: string): number {
  return [...texto].length;
}

/**
 * RN-07: texto cru de 1 a 5.000 caracteres, incluindo a marcação. Só espaços (ou caracteres
 * invisíveis) não é resenha. O caractere nulo não cabe no `text` do Postgres. Chega aqui uma
 * string já validada pelo DTO; o resto é regra de negócio (422).
 */
export function validarTextoDaResenha(texto: string): void {
  if (SO_INVISIVEIS.test(texto)) {
    throw new EntidadeInvalida([
      { campo: 'texto', mensagem: 'Escreva algo sobre o livro para publicar.' },
    ]);
  }
  if (texto.includes('\u0000')) {
    throw new EntidadeInvalida([
      {
        campo: 'texto',
        mensagem: 'A resenha tem um caractere que não pode ser salvo.',
      },
    ]);
  }
  const total = contarCaracteres(texto);
  if (total > LIMITE_DA_RESENHA) {
    const excedente = total - LIMITE_DA_RESENHA;
    throw new EntidadeInvalida([
      {
        campo: 'texto',
        mensagem: `A resenha passou do limite em ${excedente} ${excedente === 1 ? 'caractere' : 'caracteres'}.`,
      },
    ]);
  }
}

/**
 * URL que vai num snapshot de evento (`format: uri`). O que vem de outro serviço e não é URL
 * http(s) válida vira `null`, para um dado estranho do acervo ou do identidade não impedir o
 * leitor de publicar (a outbox recusaria o evento inteiro).
 *
 * O `href` normalizado codifica acento e espaço (`capa-ação.jpg` → `capa-a%C3%A7%C3%A3o.jpg`);
 * o que ainda assim não passa no `format: uri` do validador (`|`, `%zz`) vira `null`.
 */
export function urlOuNulo(valor: string | null | undefined): string | null {
  if (!valor || /\s/.test(valor)) {
    return null;
  }
  try {
    const url = new URL(valor);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }
    return ehUri(url.href) ? url.href : null;
  } catch {
    return null;
  }
}
