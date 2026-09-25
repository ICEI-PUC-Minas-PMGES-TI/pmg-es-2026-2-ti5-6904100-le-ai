import { computed, ref, shallowRef } from 'vue'

import type { Pagina } from '../services/perfil'

/**
 * Lista paginada do servidor carregada por rolagem (RNF-DES-02): a primeira página substitui a
 * lista, as seguintes só acrescentam no fim, sem recarregar o que já está na tela nem mover o
 * scroll (seguidores-e-seguidos.md §4.7). Falha da página seguinte não apaga as anteriores.
 */
export function usePaginacao<T extends { id: string }>(buscar: (pagina: number) => Promise<Pagina<T>>) {
  const itens = shallowRef<T[]>([])
  const total = ref(0)
  const carregando = ref(false)
  const carregandoMais = ref(false)
  const falhou = ref(false)
  const falhouMais = ref(false)
  let proxima = 0
  let paginas = 0

  const temMais = computed(() => proxima < paginas)

  async function carregar(): Promise<void> {
    carregando.value = true
    falhou.value = false
    try {
      const pagina = await buscar(0)
      itens.value = pagina.items
      total.value = pagina.totalElements
      paginas = pagina.totalPages
      proxima = 1
    } catch {
      falhou.value = true
    } finally {
      carregando.value = false
    }
  }

  async function carregarMais(): Promise<void> {
    if (!temMais.value || carregando.value || carregandoMais.value) {
      return
    }
    carregandoMais.value = true
    falhouMais.value = false
    try {
      const pagina = await buscar(proxima)
      // Um item removido entre duas páginas empurra os seguintes uma posição para trás; o id
      // evita mostrar duas vezes o que escorregou para a página já carregada.
      const vistos = new Set(itens.value.map((item) => item.id))
      itens.value = [...itens.value, ...pagina.items.filter((item) => !vistos.has(item.id))]
      total.value = pagina.totalElements
      paginas = pagina.totalPages
      proxima += 1
    } catch {
      falhouMais.value = true
    } finally {
      carregandoMais.value = false
    }
  }

  /** Tira da lista depois de uma ação que deu certo (remover, deixar de seguir, decidir). */
  function retirar(id: string): void {
    const antes = itens.value.length
    itens.value = itens.value.filter((item) => item.id !== id)
    if (itens.value.length < antes) {
      total.value = Math.max(0, total.value - 1)
    }
  }

  return { itens, total, carregando, carregandoMais, falhou, falhouMais, temMais, carregar, carregarMais, retirar }
}
