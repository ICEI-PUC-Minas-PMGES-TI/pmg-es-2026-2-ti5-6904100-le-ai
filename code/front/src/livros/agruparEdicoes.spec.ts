import { describe, expect, it } from 'vitest'

import { agruparEdicoes } from './agruparEdicoes'
import { livro } from '../testes/massaDaBusca'

const ids = (grupos: ReturnType<typeof agruparEdicoes>) => grupos.map((grupo) => grupo.edicoes.map((edicao) => edicao.id))

describe('agruparEdicoes', () => {
  it('junta edições vizinhas de mesmo título e autores, a primeira como principal', () => {
    const grupos = agruparEdicoes([
      livro('2018', 'Ponciá Vicêncio', { anoPublicacao: 2018 }),
      livro('2017', 'Ponciá Vicêncio', { anoPublicacao: 2017 }),
      livro('becos', 'Becos da Memória'),
    ])

    expect(ids(grupos)).toEqual([['2018', '2017'], ['becos']])
    expect(grupos[0]!.principal.anoPublicacao).toBe(2018)
  })

  it('ignora acento, maiúscula e espaço nas pontas do título', () => {
    expect(ids(agruparEdicoes([livro('a', 'Ponciá Vicêncio'), livro('b', ' PONCIA VICENCIO ')]))).toEqual([['a', 'b']])
  })

  it('autores diferentes são obras diferentes; a ordem dos autores não importa', () => {
    const x = { id: 'x', nome: 'X' }
    const y = { id: 'y', nome: 'Y' }
    expect(ids(agruparEdicoes([livro('a', 'Poemas', { autores: [x] }), livro('b', 'Poemas', { autores: [y] })]))).toEqual([
      ['a'],
      ['b'],
    ])
    expect(
      ids(agruparEdicoes([livro('a', 'A quatro mãos', { autores: [x, y] }), livro('b', 'A quatro mãos', { autores: [y, x] })])),
    ).toEqual([['a', 'b']])
  })

  it('livro sem autor nunca se agrupa', () => {
    expect(ids(agruparEdicoes([livro('a', 'Poemas', { autores: [] }), livro('b', 'Poemas', { autores: [] })]))).toEqual([
      ['a'],
      ['b'],
    ])
  })

  it('só agrupa vizinhos', () => {
    expect(agruparEdicoes([livro('a', 'Poemas'), livro('b', 'Outro'), livro('c', 'Poemas')])).toHaveLength(3)
  })
})
