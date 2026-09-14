import { createRouter, createWebHistory, type NavigationGuard, type RouteRecordRaw } from 'vue-router'

import ShellAutenticado from '../layouts/ShellAutenticado.vue'
import { getToken } from '../session'
import CadastroView from '../views/CadastroView.vue'
import DescobrirView from '../views/DescobrirView.vue'
import EstanteView from '../views/EstanteView.vue'
import FeedView from '../views/FeedView.vue'
import LoginView from '../views/LoginView.vue'
import PerfilView from '../views/PerfilView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Exige sessão ativa; sem token, a guarda redireciona para /login preservando o destino. */
    requerSessao?: boolean
    /** Com sessão ativa, a guarda redireciona para /estante em vez de renderizar a rota. */
    semSessao?: boolean
    /** Título mostrado no header do shell (CabecalhoTela). */
    titulo?: string
  }
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { semSessao: true },
  },
  {
    path: '/cadastro',
    name: 'cadastro',
    component: CadastroView,
    meta: { semSessao: true },
  },
  {
    path: '/',
    component: ShellAutenticado,
    meta: { requerSessao: true },
    children: [
      { path: '', redirect: '/estante' },
      {
        path: 'estante',
        name: 'estante',
        component: EstanteView,
        meta: { titulo: 'Minha estante' },
      },
      {
        path: 'descobrir',
        name: 'descobrir',
        component: DescobrirView,
        meta: { titulo: 'Descobrir' },
      },
      {
        path: 'feed',
        name: 'feed',
        component: FeedView,
        meta: { titulo: 'Feed' },
      },
      {
        path: 'perfil',
        name: 'perfil',
        component: PerfilView,
        meta: { titulo: 'Meu perfil' },
      },
    ],
  },
]

/**
 * Guarda de sessão (feature-P0-NAV.md, Etapa 9): rota com `meta.requerSessao` sem token vai
 * para `/login` preservando o destino em `?destino=`; `/login` e `/cadastro` com sessão ativa
 * vão para `/estante`.
 *
 * Exportada separada do router (não só chamada inline em `router.beforeEach`) para o teste
 * poder montar a mesma guarda numa instância isolada (`createMemoryHistory`), sem depender do
 * router singleton de produção nem duplicar a lógica.
 */
export const guardaDeSessao: NavigationGuard = (to) => {
  const autenticado = getToken() !== null

  if (to.meta.requerSessao && !autenticado) {
    return { path: '/login', query: { destino: to.fullPath } }
  }
  if (to.meta.semSessao && autenticado) {
    return { path: '/estante' }
  }
  return true
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(guardaDeSessao)

export default router
