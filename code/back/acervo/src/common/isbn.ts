/**
 * Validação e normalização de ISBN-13 (RN-02, RNF-SEC-38).
 *
 * RNF-SEC-38 é a razão de este arquivo existir separado do DTO: o cadastro por
 * ISBN **não aceita URL do usuário**, e a única entrada permitida é um ISBN
 * validado por formato e por dígito verificador. A URL da fonte externa é
 * construída pelo servidor a partir da allowlist, nunca recebida.
 *
 * Mesmas regras de `code/scripts/ingestao/leai_ingestao/isbn.py`, com os mesmos
 * casos de teste. As duas implementações existem porque a ingestão é um script
 * Python e isto aqui é um serviço NestJS.
 */

/** Prefixos de ISBN-13 de livro. O contrato usa `^97[89][0-9]{10}$`. */
const PREFIXOS_VALIDOS = ['978', '979'];

const SEPARADORES = /[-\s‐-—.]/g;

/**
 * Devolve os 13 dígitos ou `null`. Aceita as formas que o leitor realmente
 * digita (`978-85-359-1484-9`); tudo que não for dígito depois da limpeza
 * invalida a entrada, e é isso que impede uma URL de passar.
 */
export function normalizarIsbn13(
  bruto: string | null | undefined,
): string | null {
  if (!bruto) {
    return null;
  }

  const digitos = bruto.trim().replace(SEPARADORES, '');
  if (!/^[0-9]{13}$/.test(digitos)) {
    return null;
  }
  if (!PREFIXOS_VALIDOS.some((prefixo) => digitos.startsWith(prefixo))) {
    return null;
  }
  if (!digitoVerificadorConfere(digitos)) {
    return null;
  }

  return digitos;
}

/** Confere o 13º dígito pelo algoritmo do EAN-13 (pesos 1 e 3 alternados). */
export function digitoVerificadorConfere(isbn13: string): boolean {
  if (!/^[0-9]{13}$/.test(isbn13)) {
    return false;
  }

  let soma = 0;
  for (let posicao = 0; posicao < 12; posicao += 1) {
    soma += Number(isbn13[posicao]) * (posicao % 2 === 0 ? 1 : 3);
  }

  const esperado = (10 - (soma % 10)) % 10;
  return esperado === Number(isbn13[12]);
}
