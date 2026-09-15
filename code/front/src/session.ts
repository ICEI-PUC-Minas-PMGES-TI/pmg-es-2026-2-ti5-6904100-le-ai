import { computed, ref } from 'vue'

/**
 * Estado de sessão do site: singleton de módulo no molde de `theme.ts` (`ref` no escopo do
 * módulo + `initialize*()` chamada uma vez pela raiz). Sem Pinia: o `AGENTS.md` do front deixa
 * o gerenciamento de estado global "a definir quando uma feature demonstrar necessidade
 * concreta", e um token com um usuário não demonstram.
 *
 * Token em `localStorage` (não em cookie `httpOnly`): é o que dá para fazer sem refresh token
 * no P0-NAV, e fica registrado como pendência de segurança (superfície de XSS) para F-AUT
 * reavaliar com cookie e rotação.
 */

export interface UsuarioSessao {
  id: string
  username: string
  displayName: string
}

interface SessaoPersistida {
  token: string
  usuario: UsuarioSessao
}

const STORAGE_KEY = 'le-ai-sessao'

const token = ref<string | null>(null)
const usuario = ref<UsuarioSessao | null>(null)

function isUsuarioSessao(valor: unknown): valor is UsuarioSessao {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }
  const candidato = valor as Record<string, unknown>
  return (
    typeof candidato.id === 'string'
    && typeof candidato.username === 'string'
    && typeof candidato.displayName === 'string'
  )
}

function isSessaoPersistida(valor: unknown): valor is SessaoPersistida {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }
  const candidato = valor as Record<string, unknown>
  return typeof candidato.token === 'string' && isUsuarioSessao(candidato.usuario)
}

/**
 * Restaura a sessão salva, se houver. Chamada uma vez pela raiz do app (`onMounted`, como
 * `initializeTheme`) — não no carregamento do módulo, para o teste controlar quando o
 * `localStorage` é lido e para não depender de `window` existir fora do navegador.
 */
export function initializeSession(): void {
  if (typeof window === 'undefined') {
    return
  }

  const bruto = window.localStorage.getItem(STORAGE_KEY)
  if (bruto === null) {
    return
  }

  try {
    const analisado: unknown = JSON.parse(bruto)
    if (isSessaoPersistida(analisado)) {
      token.value = analisado.token
      usuario.value = analisado.usuario
      return
    }
  } catch {
    // JSON inválido cai no mesmo tratamento de formato inesperado: limpa e segue deslogado.
  }
  window.localStorage.removeItem(STORAGE_KEY)
}

/** Grava a sessão depois de um cadastro ou login bem-sucedido. */
export function iniciarSessao(novoToken: string, novoUsuario: UsuarioSessao): void {
  token.value = novoToken
  usuario.value = novoUsuario
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ token: novoToken, usuario: novoUsuario } satisfies SessaoPersistida),
  )
}

/** Limpa a sessão. Ainda sem chamada ao servidor: não há refresh token para revogar (F-AUT). */
export function encerrarSessao(): void {
  token.value = null
  usuario.value = null
  window.localStorage.removeItem(STORAGE_KEY)
}

/**
 * Leitura não reativa do token atual. É a função passada como `getToken` para
 * `createApiClient` — o cliente HTTP não precisa (nem deve) depender de Vue.
 */
export function getToken(): string | null {
  return token.value
}

export function useSession() {
  return {
    usuario: computed(() => usuario.value),
    autenticado: computed(() => token.value !== null),
    iniciarSessao,
    encerrarSessao,
  }
}
