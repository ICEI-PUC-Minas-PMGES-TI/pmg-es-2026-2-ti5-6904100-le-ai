import { getToken } from '../session'
import { createApiClient, type ApiClientOptions } from './api'

/**
 * Contrato do serviço `identidade` (P0-NAV — esqueleto de auth). Espelha
 * `docs/api/identidade.yaml`: cadastro e login validados pelo servidor, cliente só reforça
 * (RNF-SEC-13).
 */
export interface CadastroRequisicao {
  email: string
  username: string
  displayName: string
  /** Formato ISO `AAAA-MM-DD`. O servidor recusa menor de 18 anos (RNF-SEC-43). */
  dataNascimento: string
  senha: string
}

export interface UsuarioResposta {
  id: string
  username: string
  displayName: string
}

export interface LoginRequisicao {
  /** E-mail ou nome de usuário — o servidor resolve qual dos dois é (RF-AUT-02). */
  identificador: string
  senha: string
}

export interface TokenResposta {
  accessToken: string
  tokenType: string
  expiresIn: number
}

export interface LoginResultado {
  token: TokenResposta
  usuario: UsuarioResposta
}

/**
 * Fábrica, não singleton solto: mesma forma de `createApiClient`, para os testes injetarem um
 * `fetch` falso sem tocar rede (molde de `api.spec.ts`). `getToken` por padrão lê a sessão
 * global de `session.ts`; passar outro só é útil em teste.
 */
export function createAuthService(options: ApiClientOptions = {}) {
  const request = createApiClient({
    ...options,
    baseUrl: options.baseUrl ?? import.meta.env.VITE_IDENTIDADE_BASE_URL,
    getToken: options.getToken ?? getToken,
  })

  async function cadastrar(dados: CadastroRequisicao): Promise<UsuarioResposta> {
    return request<UsuarioResposta>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
  }

  /**
   * Login (RF-AUT-02) seguido de `/me` (RF-AUT-03) para trazer a identidade junto: o servidor
   * devolve só o token no login, sem dado nenhum do usuário, e a tela de destino já precisa do
   * nome de exibição. O `/me` usa o `Authorization` explícito do token recém-emitido — não o
   * `getToken()` da sessão global, que só passa a existir depois que quem chamou `entrar()`
   * gravar o resultado (`iniciarSessao`, em `session.ts`).
   */
  async function entrar(dados: LoginRequisicao): Promise<LoginResultado> {
    const token = await request<TokenResposta>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
    const usuario = await request<UsuarioResposta>('/me', {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    })
    return { token, usuario }
  }

  /** Identidade do portador da sessão atual — usado para restaurar o usuário ao recarregar. */
  async function buscarUsuarioAtual(): Promise<UsuarioResposta> {
    return request<UsuarioResposta>('/me')
  }

  return { cadastrar, entrar, buscarUsuarioAtual }
}

export const authService = createAuthService()
