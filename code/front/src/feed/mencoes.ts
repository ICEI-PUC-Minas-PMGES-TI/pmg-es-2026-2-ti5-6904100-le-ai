import type { Mencao } from '../services/social'

export type TrechoDeComentario =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'mencao'; texto: string; username: string }

export function trechosDoComentario(texto: string, mencoes: Mencao[]): TrechoDeComentario[] {
  const trechos: TrechoDeComentario[] = []
  let cursor = 0
  for (const mencao of [...mencoes].sort((a, b) => a.posicao - b.posicao)) {
    const fim = mencao.posicao + mencao.comprimento
    if (mencao.posicao < cursor || fim > texto.length) {
      continue
    }
    if (mencao.posicao > cursor) {
      trechos.push({ tipo: 'texto', texto: texto.slice(cursor, mencao.posicao) })
    }
    trechos.push({ tipo: 'mencao', texto: texto.slice(mencao.posicao, fim), username: mencao.username })
    cursor = fim
  }
  if (cursor < texto.length) {
    trechos.push({ tipo: 'texto', texto: texto.slice(cursor) })
  }
  return trechos
}
