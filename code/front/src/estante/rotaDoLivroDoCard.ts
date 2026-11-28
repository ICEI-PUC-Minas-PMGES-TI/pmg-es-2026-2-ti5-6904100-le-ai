import type { RouteLocationRaw } from 'vue-router'

import type { ItemDoCard } from './itemDoCard'

/** De onde o card é visto: a própria estante, o Meu perfil ou o perfil de outro leitor. */
export type OrigemDoCard = 'estante' | 'meu-perfil' | 'outro-perfil'

/**
 * Página do livro aberta pela capa e pelo título do card. O livro oficial fica na aba de origem
 * (`origem=estante` ou `origem=perfil`). O pessoal só abre para o dono: o terceiro chega a ele
 * exclusivamente pelo feed ou por uma lista (RN-15), então no perfil de outro leitor fica sem link.
 */
export function rotaDoLivroDoCard(item: ItemDoCard, origem: OrigemDoCard): RouteLocationRaw | null {
  if (item.livro.tipo === 'pessoal') {
    return origem === 'outro-perfil' ? null : { name: 'livro-pessoal', params: { id: item.livroId } }
  }
  return {
    name: 'livro-oficial',
    params: { id: item.livroId },
    query: { origem: origem === 'estante' ? 'estante' : 'perfil' },
  }
}
