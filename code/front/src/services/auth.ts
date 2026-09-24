import { encerrarSessao, getRefreshToken, getToken, sincronizarComArmazenamento } from '../session'
import { createApiClient, novaChaveIdempotencia, type ApiClientOptions } from './api'
import { comLockDeSessao, renovarSessao } from './renovacao'

/**
 * Contrato do serviço `identidade`. Espelha `docs/api/identidade.yaml`: cadastro e login
 * validados pelo servidor, cliente só reforça (RNF-SEC-13).
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

/** `Sessao` do contrato: acesso de 15 minutos e renovação rotativa (RF-AUT-03). */
export interface SessaoResposta {
  accessToken: string
  tokenType: string
  expiresIn: number
  refreshToken: string
}

export interface LoginResultado {
  sessao: SessaoResposta
  usuario: UsuarioResposta
}

type ComLock = <T>(tarefa: () => Promise<T>) => Promise<T>

export interface AuthServiceOptions extends ApiClientOptions {
  /** O lock de sessão entre abas; os testes passam um que só executa. */
  comLock?: ComLock
}

/**
 * Fábrica, não singleton solto: mesma forma de `createApiClient`, para os testes injetarem um
 * `fetch` falso sem tocar rede (molde de `api.spec.ts`). `getToken` e `renovarSessao` por
 * padrão são os da sessão global; passar outros só é útil em teste.
 */
export function createAuthService(options: AuthServiceOptions = {}) {
  const { comLock = comLockDeSessao, ...opcoesDoCliente } = options
  const baseUrl = opcoesDoCliente.baseUrl ?? import.meta.env.VITE_IDENTIDADE_BASE_URL
  const request = createApiClient({
    ...opcoesDoCliente,
    baseUrl,
    getToken: opcoesDoCliente.getToken ?? getToken,
    renovarSessao: opcoesDoCliente.renovarSessao ?? renovarSessao,
  })
  // As rotas públicas não levam o token da sessão: o filtro de bearer do Spring Security recusa
  // token vencido com 401 mesmo em rota aberta, e o logout é chamado justamente quando o acesso
  // pode ter vencido.
  const requestPublico = createApiClient({
    ...opcoesDoCliente,
    baseUrl,
    getToken: () => null,
    renovarSessao: undefined,
  })

  /**
   * A chave é de quem chama: a tela a guarda e a repete ao reenviar o mesmo formulário, para um
   * cadastro que deu certo no servidor mas perdeu a resposta não virar `409` de e-mail em uso.
   */
  async function cadastrar(dados: CadastroRequisicao, idempotencyKey: string): Promise<UsuarioResposta> {
    return requestPublico<UsuarioResposta>('/auth/register', { method: 'POST', json: dados, idempotencyKey })
  }

  /**
   * Login (RF-AUT-02) seguido de `/me` para trazer a identidade junto: o login devolve só a
   * sessão, e a tela de destino já precisa do nome de exibição. O `/me` usa o `Authorization`
   * explícito do token recém-emitido, não o da sessão global, que só passa a existir depois que
   * quem chamou `entrar()` gravar o resultado (`iniciarSessao`, em `session.ts`).
   */
  async function entrar(dados: LoginRequisicao): Promise<LoginResultado> {
    const sessao = await requestPublico<SessaoResposta>('/auth/login', {
      method: 'POST',
      json: dados,
      idempotencyKey: novaChaveIdempotencia(),
    })
    const usuario = await request<UsuarioResposta>('/me', {
      headers: { Authorization: `Bearer ${sessao.accessToken}` },
    })
    return { sessao, usuario }
  }

  /** Identidade do portador da sessão atual — usado para restaurar o usuário ao recarregar. */
  async function buscarUsuarioAtual(): Promise<UsuarioResposta> {
    return request<UsuarioResposta>('/me')
  }

  /**
   * Logout (RF-AUT-06): revoga a renovação no servidor e limpa a sessão local. A limpeza local
   * acontece sempre, mesmo com o servidor fora: sair não pode depender de rede. O custo é que o
   * token de renovação continua válido no servidor até vencer, se a revogação não chegar.
   *
   * Sob o lock de sessão: sem ele, uma renovação em curso em outra aba gravaria a sessão nova
   * depois desta limpeza, e a sessão voltaria.
   */
  async function sair(): Promise<void> {
    await comLock(async () => {
      sincronizarComArmazenamento()
      const refreshToken = getRefreshToken()
      try {
        if (refreshToken) {
          await requestPublico<void>('/auth/logout', {
            method: 'POST',
            json: { refreshToken },
            idempotencyKey: novaChaveIdempotencia(),
          })
        }
      } catch {
        // Revogação é melhor esforço; ver acima.
      } finally {
        encerrarSessao()
      }
    })
  }

  return { cadastrar, entrar, buscarUsuarioAtual, sair }
}

export const authService = createAuthService()
