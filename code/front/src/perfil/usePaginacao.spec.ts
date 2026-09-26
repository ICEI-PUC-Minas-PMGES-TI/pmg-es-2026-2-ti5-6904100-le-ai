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

    await lista.carregar()
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
})
