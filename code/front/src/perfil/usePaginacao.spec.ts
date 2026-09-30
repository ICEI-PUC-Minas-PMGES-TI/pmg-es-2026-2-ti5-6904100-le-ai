import { describe, expect, it, vi } from 'vitest'

import type { Pagina } from '../services/perfil'
import { usePaginacao } from './usePaginacao'

function pagina(ids: string[], page: number, totalElements: number, totalPages: number): Pagina<{ id: string }> {
  return { items: ids.map((id) => ({ id })), page, size: 2, totalElements, totalPages }
}

describe('usePaginacao', () => {
  it('a primeira página substitui, as seguintes acrescentam no fim sem repetir', async () => {
    const buscar = vi
      .fn()
      .mockResolvedValueOnce(pagina(['a', 'b'], 0, 5, 3))
      .mockResolvedValueOnce(pagina(['b', 'c'], 1, 5, 3))
    const lista = usePaginacao(buscar)

    expect(lista.temMais.value).toBe(false)
    await lista.carregar()
    expect(lista.temMais.value).toBe(true)
    await lista.carregarMais()

    expect(lista.itens.value.map((item) => item.id)).toEqual(['a', 'b', 'c'])
    expect(buscar).toHaveBeenLastCalledWith(1)
    expect(lista.temMais.value).toBe(true)
  })

  it('falha da página seguinte mantém o que já estava carregado', async () => {
    const buscar = vi.fn().mockResolvedValueOnce(pagina(['a'], 0, 2, 2)).mockRejectedValueOnce(new Error('rede'))
    const lista = usePaginacao(buscar)

    await lista.carregar()
    await lista.carregarMais()

    expect(lista.itens.value).toHaveLength(1)
    expect(lista.falhouMais.value).toBe(true)
    expect(lista.falhou.value).toBe(false)
  })

  it('retirar tira o item e desconta do total', async () => {
    const lista = usePaginacao(vi.fn().mockResolvedValue(pagina(['a', 'b'], 0, 2, 1)))
    await lista.carregar()

    lista.retirar('a')
    lista.retirar('nao-existe')

    expect(lista.itens.value.map((item) => item.id)).toEqual(['b'])
    expect(lista.total.value).toBe(1)
    expect(lista.temMais.value).toBe(false)
  })

  it('recarregar no meio de outra carga descarta a resposta antiga, mesmo que chegue depois', async () => {
    let responderAntiga: (valor: Pagina<{ id: string }>) => void = () => {}
    const buscar = vi
      .fn()
      .mockReturnValueOnce(new Promise((resolver) => (responderAntiga = resolver)))
      .mockResolvedValueOnce(pagina(['nova'], 0, 1, 1))
    const lista = usePaginacao(buscar)

    const antiga = lista.carregar()
    await lista.carregar()
    responderAntiga(pagina(['antiga'], 0, 1, 1))
    await antiga

    expect(lista.itens.value.map((item) => item.id)).toEqual(['nova'])
    expect(lista.carregando.value).toBe(false)
  })

  it('página seguinte que chega depois de um recarregamento não entra na lista nova', async () => {
    let responderMais: (valor: Pagina<{ id: string }>) => void = () => {}
    const buscar = vi
      .fn()
      .mockResolvedValueOnce(pagina(['a'], 0, 2, 2))
      .mockReturnValueOnce(new Promise((resolver) => (responderMais = resolver)))
      .mockResolvedValueOnce(pagina(['x'], 0, 1, 1))
    const lista = usePaginacao(buscar)

    await lista.carregar()
    const mais = lista.carregarMais()
    await lista.carregar()
    responderMais(pagina(['b'], 1, 2, 2))
    await mais

    expect(lista.itens.value.map((item) => item.id)).toEqual(['x'])
    expect(lista.carregandoMais.value).toBe(false)
    expect(lista.temMais.value).toBe(false)
  })
})
