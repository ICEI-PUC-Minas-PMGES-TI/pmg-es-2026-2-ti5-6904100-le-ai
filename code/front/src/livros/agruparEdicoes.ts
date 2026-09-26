import type { LivroOficialResumo } from '../services/acervo'

/**
 * Edições de uma mesma obra na lista de resultados (RN-01). O modelo continua por edição: o grupo
 * só existe na tela, e o card mostra a principal com a contagem das demais. Mesma regra do app
 * (`code/mobile/lib/features/descobrir/agrupar_edicoes.dart`).
 */
export interface GrupoDeEdicoes {
  /** A primeira que chega, que é a mais recente: o servidor ordena por ano dentro do grupo. */
  principal: LivroOficialResumo
  edicoes: LivroOficialResumo[]
}

/**
 * Agrupa por título mais autores, **só entre vizinhos**. O servidor devolve as edições de uma obra
 * contíguas, inclusive através da fronteira da página; aplicada sobre a lista acumulada, o
 * "N edições" do último card cresce quando a página seguinte traz mais uma.
 *
 * Livro sem autor nunca se agrupa: sem autor, título igual não prova que é a mesma obra.
 */
export function agruparEdicoes(livros: readonly LivroOficialResumo[]): GrupoDeEdicoes[] {
  const grupos: GrupoDeEdicoes[] = []
  let chaveAnterior: string | null = null
  for (const livro of livros) {
    const chave = chaveDoGrupo(livro)
    const anterior = grupos.at(-1)
    if (chave !== null && chave === chaveAnterior && anterior) {
      anterior.edicoes.push(livro)
    } else {
      grupos.push({ principal: livro, edicoes: [livro] })
    }
    chaveAnterior = chave
  }
  return grupos
}

function chaveDoGrupo(livro: LivroOficialResumo): string | null {
  if (livro.autores.length === 0) {
    return null
  }
  const autores = livro.autores.map((autor) => autor.id).sort()
  const titulo = livro.titulo.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  return `${titulo}|${autores.join(',')}`
}
