import type { RouteLocationRaw } from 'vue-router'

import type { LivroDaLista } from '../services/listas'

/**
 * Para onde vão os links das telas de F-LST. A lista do próprio leitor mora sob `/perfil`; a de
 * outro leitor, sob `/leitores/:username`, que guarda o nome para o bloco de restrição (o 403 não
 * diz de quem é a lista).
 */
export function rotaDaLista(listaId: string, dono: { username: string } | null, propria: boolean): RouteLocationRaw {
  return propria || !dono
    ? { name: 'lista-propria', params: { id: listaId } }
    : { name: 'lista-de-outro', params: { username: dono.username, id: listaId } }
}

/** Índice de listas: aba `Listas` do perfil (web) ou página própria (abaixo de 768px). */
export function rotaDoIndice(username: string | null, comoAba: boolean): RouteLocationRaw {
  if (comoAba) {
    return username ? { name: 'perfil-de-outro', params: { username }, query: { aba: 'listas' } } : '/perfil?aba=listas'
  }
  return username ? { name: 'listas-de-outro', params: { username } } : { name: 'minhas-listas' }
}

/**
 * Página do livro a partir de um item. Livro pessoal visto por terceiro vai com `via=lista` e a
 * lista como referência (RN-15). **O dono vai sem via:** o `acervo` libera o dono sem olhar a via.
 * Era o contorno de antes da etapa 3 da F-LST (07/10/2026), quando `via=lista` respondia 400, e
 * ficou por ser inofensivo.
 */
export function rotaDoLivro(livro: LivroDaLista, listaId: string, donoDaLista: boolean): RouteLocationRaw {
  if (livro.tipo === 'PESSOAL') {
    return donoDaLista
      ? { name: 'livro-pessoal', params: { id: livro.id } }
      : { name: 'livro-pessoal', params: { id: livro.id }, query: { via: 'lista', referenciaId: listaId } }
  }
  return { name: 'livro-oficial', params: { id: livro.id }, query: { origem: 'perfil' } }
}

/** A web troca o desenho em 768px; abaixo disso o índice é página própria. */
export function ehWeb(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 768px)').matches
}
