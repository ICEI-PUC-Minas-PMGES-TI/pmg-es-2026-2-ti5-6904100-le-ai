import {
  atualizarTokens,
  encerrarSessao,
  lerSessaoPersistida,
  sincronizarComArmazenamento,
  type TokensDaSessao,
} from '../session'
import { ApiError, createApiClient, novaChaveIdempotencia } from './api'

/**
 * Renovação da sessão (RF-AUT-03) serializada entre abas.
 *
 * **Por que serializar.** O `identidade` trata token de renovação já rotacionado como vazado e
 * derruba todas as sessões do usuário (RNF-SEC-30). Duas abas que renovassem juntas com o mesmo
 * token seriam lidas como reuso: a segunda chegaria com um token que a primeira acabou de
 * rotacionar. Por isso toda renovação e todo logout passam pelo mesmo lock da Web Locks API, e
 * quem pega o lock relê o `localStorage` antes de chamar o servidor: se outra aba já renovou,
 * basta adotar o token dela.
 *
 * Sem `navigator.locks` (navegador antigo, jsdom), o lock vira só a deduplicação dentro da aba.
 */

export const NOME_DO_LOCK = 'le-ai-sessao'

type ComLock = <T>(tarefa: () => Promise<T>) => Promise<T>

export interface RenovadorOptions {
  /** Chama `POST /auth/refresh`. */
  renovar: (refreshToken: string) => Promise<TokensDaSessao>
  /** Os testes passam um lock falso; em produção é `navigator.locks`. */
  comLock?: ComLock
}

function lockDoNavegador(): ComLock {
  return <T>(tarefa: () => Promise<T>): Promise<T> => {
    const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
    if (!locks?.request) {
      return tarefa()
    }
    return locks.request(NOME_DO_LOCK, tarefa) as Promise<T>
  }
}

export function createRenovador(options: RenovadorOptions) {
  const comLock = options.comLock ?? lockDoNavegador()
  let emAndamento: Promise<boolean> | null = null

  async function executar(tokenQueFalhou: string): Promise<boolean> {
    return comLock(async () => {
      const gravada = lerSessaoPersistida()
      if (gravada === null) {
        // Outra aba saiu enquanto esta esperava o lock.
        encerrarSessao()
        return false
      }
      if (gravada.token !== tokenQueFalhou) {
        // Outra aba já renovou: adotar, sem chamar o servidor.
        sincronizarComArmazenamento()
        return true
      }
      if (!gravada.refreshToken) {
        // Sessão de antes de F-AUT, só com token de acesso: não há como renovar.
        encerrarSessao()
        return false
      }
      try {
        atualizarTokens(await options.renovar(gravada.refreshToken))
        return true
      } catch (erro) {
        // 401 é token vencido, revogado ou reusado: a sessão acabou de fato. Falha de rede ou
        // 5xx não é motivo para deslogar; a chamada original devolve o erro dela.
        if (erro instanceof ApiError && erro.status === 401) {
          encerrarSessao()
        }
        return false
      }
    })
  }

  /**
   * Renova se o token que recebeu `401` ainda é o da sessão. Chamadas simultâneas na mesma aba
   * compartilham a mesma renovação. Devolve se vale repetir a chamada original.
   */
  function renovar(tokenQueFalhou: string): Promise<boolean> {
    emAndamento ??= executar(tokenQueFalhou).finally(() => {
      emAndamento = null
    })
    return emAndamento
  }

  return { renovar, comLock }
}

const clienteDoIdentidade = createApiClient({ baseUrl: import.meta.env.VITE_IDENTIDADE_BASE_URL })

const renovador = createRenovador({
  renovar: (refreshToken) =>
    clienteDoIdentidade<TokensDaSessao>('/auth/refresh', {
      method: 'POST',
      json: { refreshToken },
      // Uma chave por renovação: as retentativas do cliente a repetem, e o servidor devolve a
      // mesma sessão em vez de contar como reuso.
      idempotencyKey: novaChaveIdempotencia(),
    }),
})

/** Passada como `renovarSessao` aos clientes que falam com serviços autenticados. */
export const renovarSessao = renovador.renovar

/** O mesmo lock da renovação, para o logout não cruzar com uma renovação de outra aba. */
export const comLockDeSessao = renovador.comLock
