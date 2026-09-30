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

/**
 * Grupos da máscara, o mesmo desenho do placeholder do protótipo (`978-85-359-1484-9`). Os
 * hífens são só visuais: a posição real deles varia por editora, e o que vai ao servidor são os
 * 13 dígitos.
 */
const GRUPOS = [3, 2, 3, 4, 1]
export const DIGITOS_DO_ISBN = 13

export interface ValorMascarado {
  valor: string
  cursor: number
}

function agrupar(digitos: string): string {
  const partes: string[] = []
  let inicio = 0
  for (const tamanho of GRUPOS) {
    if (inicio >= digitos.length) {
      break
    }
    partes.push(digitos.slice(inicio, inicio + tamanho))
    inicio += tamanho
  }
  return partes.join('-')
}

/**
 * Máscara do campo de ISBN: descarta o que não é dígito, limita a 13 e agrupa. Digitar com ou
 * sem hífen, com espaço ou colar do livro dá o mesmo resultado. O cursor fica depois do mesmo
 * dígito em que estava, para editar no meio não o jogar para o fim; apagar um hífen apaga o
 * dígito anterior, senão o Backspace pararia nele.
 */
export function mascararIsbn(bruto: string, cursor: number, anterior = ''): ValorMascarado {
  let digitos = bruto.replace(/\D/g, '')
  let digitosAntesDoCursor = bruto.slice(0, cursor).replace(/\D/g, '').length

  const apagouSoSeparador =
    bruto.length < anterior.length && digitos === anterior.replace(/\D/g, '') && digitosAntesDoCursor > 0
  if (apagouSoSeparador) {
    digitos = digitos.slice(0, digitosAntesDoCursor - 1) + digitos.slice(digitosAntesDoCursor)
    digitosAntesDoCursor -= 1
  }

  digitos = digitos.slice(0, DIGITOS_DO_ISBN)
  digitosAntesDoCursor = Math.min(digitosAntesDoCursor, digitos.length)
  const valor = agrupar(digitos)

  let posicao = 0
  for (let vistos = 0; posicao < valor.length && vistos < digitosAntesDoCursor; posicao++) {
    if (/\d/.test(valor[posicao]!)) {
      vistos++
    }
  }
  return { valor, cursor: posicao }
}
