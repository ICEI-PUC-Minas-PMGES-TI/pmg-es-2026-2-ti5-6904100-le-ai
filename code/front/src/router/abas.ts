import { PhBooks, PhCompass, PhNewspaper, PhUserCircle } from '@phosphor-icons/vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

/**
 * As quatro áreas do shell (shell-de-navegacao.md), numa lista só para a sidebar e a barra
 * inferior não divergirem.
 */
export const ABAS = [
  { rota: '/estante', rotulo: 'Estante', icone: PhBooks },
  { rota: '/descobrir', rotulo: 'Descobrir', icone: PhCompass },
  { rota: '/feed', rotulo: 'Feed', icone: PhNewspaper },
  { rota: '/perfil', rotulo: 'Perfil', icone: PhUserCircle },
] as const

export type RotaDeAba = (typeof ABAS)[number]['rota']

/**
 * Aba ativa da rota atual. Tela de detalhe não é aba, mas pertence a uma: o cadastro por ISBN
 * aberto da estante mantém **Estante** ativa, e aberto da busca mantém **Descobrir**
 * (cadastro-por-isbn.md §4). Quem decide é `meta.aba` (texto ou função da rota); sem ela, vale
 * o prefixo do caminho.
 */
export function abaAtiva(rota: RouteLocationNormalizedLoaded): RotaDeAba | null {
  const declarada = typeof rota.meta.aba === 'function' ? rota.meta.aba(rota) : rota.meta.aba
  const alvo = declarada ?? rota.path
  const aba = ABAS.find((item) => alvo === item.rota || alvo.startsWith(`${item.rota}/`))
  return aba?.rota ?? null
}
