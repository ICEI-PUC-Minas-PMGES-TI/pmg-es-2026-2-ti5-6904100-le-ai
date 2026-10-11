import type { LivroDaSerieResumo } from '../services/acervo'
import { agruparEdicoes, type GrupoDeEdicoes } from './agruparEdicoes'

export interface GrupoDaSerie {
  /** `null` no bloco `Sem número na série`. */
  numero: number | null
  grupo: GrupoDeEdicoes
}

export interface LivrosDaSerie {
  numerados: GrupoDaSerie[]
  semNumero: GrupoDaSerie[]
}

/**
 * Livros da série como a página desenha (pagina-da-serie.md): o servidor já manda pelo número de
 * ordem, com os sem número no fim. As edições só se agrupam **dentro do mesmo número**: dois
 * volumes de título igual não são edições da mesma obra. Lacuna na numeração não gera item.
 */
export function agruparSerie(livros: readonly LivroDaSerieResumo[]): LivrosDaSerie {
  const numerados: GrupoDaSerie[] = []
  const semNumero = livros.filter((livro) => livro.numeroNaSerie === null)
  let trecho: LivroDaSerieResumo[] = []

  function fecharTrecho(): void {
    const numero = trecho[0]?.numeroNaSerie ?? null
    for (const grupo of agruparEdicoes(trecho)) {
      numerados.push({ numero, grupo })
    }
    trecho = []
  }

  for (const livro of livros) {
    if (livro.numeroNaSerie === null) {
      continue
    }
    if (trecho.length && trecho[0]!.numeroNaSerie !== livro.numeroNaSerie) {
      fecharTrecho()
    }
    trecho.push(livro)
  }
  fecharTrecho()

  return {
    numerados,
    semNumero: agruparEdicoes(semNumero).map((grupo) => ({ numero: null, grupo })),
  }
}
