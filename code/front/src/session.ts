import { computed, ref } from 'vue'

/**
 * Estado de sessão do site: singleton de módulo no molde de `theme.ts` (`ref` no escopo do
 * módulo + `initialize*()` chamada uma vez pela raiz). Sem Pinia: o `AGENTS.md` do front deixa
 * o gerenciamento de estado global "a definir quando uma feature demonstrar necessidade
 * concreta", e dois tokens com um usuário não demonstram.
 *
 * **Tokens em `localStorage`** (decisão de F-AUT, 24/09/2026). Um cookie `httpOnly` de refresh
 * seria cookie de terceiro entre `leai-web.onrender.com` e `leai-identidade.onrender.com`
 * (`onrender.com` está na Public Suffix List), bloqueado pelo Safari e cada vez mais pelo
 * Chrome. O refresh fica aqui, e a superfície de XSS aceita é compensada no servidor: token de
 * renovação rotativo, e reuso de token já rotacionado derruba todas as sessões do usuário.
 *
 * **Várias abas, um `localStorage`.** O evento `storage` mantém as abas iguais: quem renova ou
 * sai numa aba reflete nas outras. A renovação em si é serializada entre abas em
 * `services/renovacao.ts`, porque duas abas renovando o mesmo token contariam como reuso.
 */

export interface UsuarioSessao {
  id: string
  username: string
  displayName: string
}

/**
 * A parte de `Sessao` (`docs/api/identidade.yaml`) que o site guarda. A validade do acesso não
 * entra: a renovação é reativa, no primeiro `401` (`services/api.ts`).
 */
export interface TokensDaSessao {
  accessToken: string
  refreshToken: string
}

interface SessaoPersistida {
  token: string
  /** Ausente em sessão gravada antes de F-AUT: vale até o token de acesso expirar. */
  refreshToken?: string
  usuario: UsuarioSessao
}

export const STORAGE_KEY = 'le-ai-sessao'

const token = ref<string | null>(null)
const refreshToken = ref<string | null>(null)
const usuario = ref<UsuarioSessao | null>(null)

let sincronizandoAbas = false

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
  return (
    typeof candidato.token === 'string'
    && (candidato.refreshToken === undefined || typeof candidato.refreshToken === 'string')
    && isUsuarioSessao(candidato.usuario)
  )
}

/** Lê a sessão gravada, ou `null` se não houver ou estiver em formato inesperado. */
export function lerSessaoPersistida(): SessaoPersistida | null {
  const bruto = window.localStorage.getItem(STORAGE_KEY)
  if (bruto === null) {
    return null
  }
  try {
    const analisado: unknown = JSON.parse(bruto)
    if (isSessaoPersistida(analisado)) {
      return analisado
    }
  } catch {
    // JSON inválido cai no mesmo tratamento de formato inesperado.
  }
  return null
}

function aplicar(sessao: SessaoPersistida | null): void {
  token.value = sessao?.token ?? null
  refreshToken.value = sessao?.refreshToken ?? null
  usuario.value = sessao?.usuario ?? null
}

function gravar(sessao: SessaoPersistida): void {
  aplicar(sessao)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessao))
}

/**
 * Restaura a sessão salva, se houver, e passa a acompanhar as outras abas. Chamada uma vez pela
 * raiz do app, não no carregamento do módulo, para o teste controlar quando o `localStorage` é
 * lido e para não depender de `window` existir fora do navegador. Idempotente.
 */
export function initializeSession(): void {
  if (typeof window === 'undefined') {
    return
  }

  const sessao = lerSessaoPersistida()
  if (sessao === null) {
    window.localStorage.removeItem(STORAGE_KEY)
  }
  aplicar(sessao)

  if (!sincronizandoAbas) {
    sincronizandoAbas = true
    window.addEventListener('storage', (evento) => {
      // `key === null` é o `localStorage.clear()` de outra aba.
      if (evento.key === STORAGE_KEY || evento.key === null) {
        aplicar(lerSessaoPersistida())
      }
    })
  }
}

/** Grava a sessão depois de um login bem-sucedido (o cadastro entra em seguida). */
export function iniciarSessao(tokens: TokensDaSessao, novoUsuario: UsuarioSessao): void {
  gravar({ token: tokens.accessToken, refreshToken: tokens.refreshToken, usuario: novoUsuario })
}

/** Troca o par de tokens depois de uma renovação, mantendo o usuário. */
export function atualizarTokens(tokens: TokensDaSessao): void {
  if (usuario.value === null) {
    return
  }
  iniciarSessao(tokens, usuario.value)
}

/**
 * Relê o `localStorage` para a memória desta aba. O evento `storage` já faz isso, mas chega
 * depois; quem acabou de pegar o lock de renovação precisa do valor de agora.
 */
export function sincronizarComArmazenamento(): void {
  aplicar(lerSessaoPersistida())
}

/** Limpa a sessão local. A revogação no servidor é do `authService.sair()`. */
export function encerrarSessao(): void {
  aplicar(null)
  window.localStorage.removeItem(STORAGE_KEY)
}

/**
 * Leitura não reativa do token atual. É a função passada como `getToken` para
 * `createApiClient` — o cliente HTTP não precisa (nem deve) depender de Vue.
 */
export function getToken(): string | null {
  return token.value
}

export function getRefreshToken(): string | null {
  return refreshToken.value
}

export function useSession() {
  return {
    usuario: computed(() => usuario.value),
    autenticado: computed(() => token.value !== null),
    iniciarSessao,
    encerrarSessao,
  }
}
