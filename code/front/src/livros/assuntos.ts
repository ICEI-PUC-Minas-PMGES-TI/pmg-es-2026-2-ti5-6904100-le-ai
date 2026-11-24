import type { AssuntoResumo } from '../services/acervo'

/**
 * Textos e ordem dos assuntos do livro pessoal (F-ACV-OPC, RF-ACV-22). Helper próprio: o
 * `normalizar` de `recomendacoes/useRecomendar.ts` é privado daquela feature.
 */

/** Minúsculas, sem acento e sem espaço nas pontas: `História` e `hist` se encontram. */
export function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR').trim()
}

/** Ordem alfabética do seletor e da ficha, pela grafia em pt-BR. */
export function emOrdemAlfabetica(assuntos: readonly AssuntoResumo[]): AssuntoResumo[] {
  return [...assuntos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** `História e Memórias`; com três ou mais, vírgulas e "e" antes do último. */
export function listaComE(nomes: readonly string[]): string {
  if (nomes.length <= 1) {
    return nomes[0] ?? ''
  }
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

/** A partir do sexto, o cliente avisa sem bloquear (RN-21.2: recomenda-se no máximo cinco). */
export const ASSUNTOS_RECOMENDADOS = 5

export function avisoDeMuitosAssuntos(total: number): string {
  return `Você escolheu ${total} assuntos. Até 5 ajuda a encontrar o livro com mais precisão.`
}
