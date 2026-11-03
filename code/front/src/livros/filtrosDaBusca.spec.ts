import { describe, expect, it } from 'vitest'

import {
  chipsDosFiltros,
  contarFiltros,
  filtrosDaQuery,
  filtrosDoRascunho,
  filtrosParaQuery,
  MENSAGEM_FAIXA_INVERTIDA,
  MENSAGEM_PAGINAS_ZERO,
  rascunhoDe,
  SEM_FILTROS,
  semFiltro,
  soDigitos,
  validarRascunho,
} from './filtrosDaBusca'

const rascunho = (extras: Partial<ReturnType<typeof rascunhoDe>> = {}) => ({ ...rascunhoDe(SEM_FILTROS), ...extras })

describe('filtrosDaBusca', () => {
  it('monta os chips no formato do protótipo, com a faixa em um chip só', () => {
    const filtros = { ...SEM_FILTROS, autor: 'Evaristo', editora: 'Pallas', serie: 'Duna', ano: 2019, paginasMin: 100, paginasMax: 150 }

    expect(chipsDosFiltros(filtros).map((chip) => chip.rotulo)).toEqual([
      'Autor: Evaristo',
      'Editora: Pallas',
      'Série: Duna',
      'Ano: 2019',
      '100 a 150 páginas',
    ])
    expect(contarFiltros(filtros)).toBe(5)
    expect(chipsDosFiltros({ ...SEM_FILTROS, paginasMin: 100 })[0]?.rotulo).toBe('A partir de 100 páginas')
    expect(chipsDosFiltros({ ...SEM_FILTROS, paginasMax: 150 })[0]?.rotulo).toBe('Até 150 páginas')
    expect(contarFiltros(SEM_FILTROS)).toBe(0)
  })

  it('remover a faixa tira os dois lados', () => {
    const filtros = { ...SEM_FILTROS, ano: 2019, paginasMin: 100, paginasMax: 150 }

    expect(semFiltro(filtros, 'paginas')).toEqual({ ...SEM_FILTROS, ano: 2019 })
    expect(semFiltro(filtros, 'ano')).toEqual({ ...SEM_FILTROS, paginasMin: 100, paginasMax: 150 })
  })

  it('lê a URL descartando o que é inválido, em vez de provocar um 400', () => {
    expect(
      filtrosDaQuery({ autor: '  Evaristo ', editora: '', ano: '0', paginasMin: '12a', paginasMax: '150' }),
    ).toEqual({ ...SEM_FILTROS, autor: 'Evaristo', paginasMax: 150 })
    expect(filtrosDaQuery({ paginasMin: '200', paginasMax: '100' })).toEqual(SEM_FILTROS)
  })

  it('a URL e os filtros fazem o caminho de ida e volta', () => {
    const filtros = { ...SEM_FILTROS, serie: 'Duna', ano: 1965, paginasMin: 300 }
    const query = filtrosParaQuery(filtros)

    expect(query).toEqual({
      autor: undefined,
      editora: undefined,
      serie: 'Duna',
      ano: '1965',
      paginasMin: '300',
      paginasMax: undefined,
    })
    expect(filtrosDaQuery(query as Record<string, string>)).toEqual(filtros)
  })

  it('valida a faixa no cliente com as mensagens do protótipo', () => {
    expect(validarRascunho(rascunho({ paginasMin: '200', paginasMax: '100' }))).toEqual({
      faixa: MENSAGEM_FAIXA_INVERTIDA,
    })
    expect(validarRascunho(rascunho({ paginasMin: '0' }))).toEqual({ paginasMin: MENSAGEM_PAGINAS_ZERO })
    expect(validarRascunho(rascunho({ paginasMax: '0', paginasMin: '5' }))).toEqual({ paginasMax: MENSAGEM_PAGINAS_ZERO })
    expect(validarRascunho(rascunho({ paginasMin: '100', paginasMax: '100' }))).toEqual({})
    expect(validarRascunho(rascunho({ ano: '0' })).ano).toBeDefined()
  })

  it('converte o rascunho aparando os textos e deixando vazio como ausente', () => {
    expect(filtrosDoRascunho(rascunho({ autor: '  Evaristo  ', editora: '   ', ano: '2019' }))).toEqual({
      ...SEM_FILTROS,
      autor: 'Evaristo',
      ano: 2019,
    })
  })

  it('a máscara numérica aceita só dígitos e respeita o limite', () => {
    const mascara = soDigitos(4)

    expect(mascara('20a19x', 6)).toEqual({ valor: '2019', cursor: 4 })
    expect(mascara('-12', 3)).toEqual({ valor: '12', cursor: 2 })
    expect(mascara('123456', 6).valor).toBe('1234')
  })
})
