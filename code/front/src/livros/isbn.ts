/**
 * Validação de ISBN-13 no cliente, com as mesmas regras de `code/back/acervo/src/common/isbn.ts`
 * e de `code/mobile/lib/features/livros/isbn.dart`.
 *
 * Serve à experiência, não à segurança: o servidor revalida tudo (RNF-SEC-38). O que o cliente
 * ganha é dizer "esse ISBN não confere" antes de gastar uma requisição e o rate limit do leitor
 * (RNF-SEC-18).
 */
const SEPARADORES = /[-\s‐-—.]/g

/** Só os dígitos do que foi digitado, sem validar. É o que decide se o botão habilita. */
export function digitosDoIsbn(bruto: string): string {
  return bruto.trim().replace(SEPARADORES, '')
}

/** Os 13 dígitos normalizados, ou `null` se não for um ISBN-13 de livro válido. */
export function normalizarIsbn13(bruto: string): string | null {
  const digitos = digitosDoIsbn(bruto)
  if (!/^[0-9]{13}$/.test(digitos) || !/^97[89]/.test(digitos)) {
    return null
  }
  let soma = 0
  for (let posicao = 0; posicao < 12; posicao++) {
    soma += Number(digitos[posicao]) * (posicao % 2 === 0 ? 1 : 3)
  }
  const esperado = (10 - (soma % 10)) % 10
  return esperado === Number(digitos[12]) ? digitos : null
}
