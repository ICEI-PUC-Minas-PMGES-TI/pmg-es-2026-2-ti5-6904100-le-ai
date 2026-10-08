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

/** `UsuarioProprio` de `GET /me`: a identidade mais o e-mail do próprio dono (Configurações). */
export interface UsuarioProprio extends UsuarioResposta {
  email: string
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

/**
 * `AcessoDeRecuperacao` do contrato (F-CONTA-2, RN-23.3): o login de conta com exclusão pendente
 * devolve um token curto que só serve para cancelar a exclusão, sem renovação, e as datas que a
 * tela de recuperação mostra.
 */
export interface AcessoDeRecuperacao {
  accessToken: string
  expiresIn: number
  exclusaoSolicitadaEm: string
  exclusaoPrevistaEm: string
  username: string
  nomeExibicao: string
}

/** O login entra na conta ou, com a exclusão pendente, só abre a recuperação. */
export type ResultadoDoLogin = LoginResultado | { recuperacao: AcessoDeRecuperacao }

/** `ExclusaoSolicitada` do contrato: a janela de 30 dias aberta pelo pedido. */
export interface ExclusaoSolicitada {
  exclusaoSolicitadaEm: string
  exclusaoPrevistaEm: string
}

const TIPO_RECUPERACAO = 'recuperacao_exclusao'

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
  async function entrar(dados: LoginRequisicao): Promise<ResultadoDoLogin> {
    const resposta = await requestPublico<SessaoResposta | (AcessoDeRecuperacao & { tipo: string })>(
      '/auth/login',
      { method: 'POST', json: dados, idempotencyKey: novaChaveIdempotencia() },
    )
    // Conta em exclusão (F-CONTA-2): o token só vale para cancelar, então nem o `/me` é chamado.
    if ('tipo' in resposta && resposta.tipo === TIPO_RECUPERACAO) {
      return { recuperacao: resposta as AcessoDeRecuperacao }
    }
    const sessao = resposta as SessaoResposta
    const usuario = await request<UsuarioResposta>('/me', {
      headers: { Authorization: `Bearer ${sessao.accessToken}` },
    })
    return { sessao, usuario }
  }

  /**
   * Pede a exclusão da conta (RF-AUT-07, RN-23.1): senha atual, confirmação explícita e chave de
   * quem chama, que a repete ao reenviar depois de um erro para o pedido não duplicar. O
   * servidor revoga todas as renovações; a tela limpa a sessão local ao receber o `202`.
   */
  async function solicitarExclusao(senha: string, idempotencyKey: string): Promise<ExclusaoSolicitada> {
    return request<ExclusaoSolicitada>('/me/conta', {
      method: 'DELETE',
      json: { senha, confirmacao: true },
      idempotencyKey,
    })
  }

  /**
   * Cancela a exclusão com o acesso de recuperação, nunca com a sessão normal (RN-23.4). Sem
   * renovação: `401` aqui é o acesso de 15 minutos que venceu.
   */
  async function cancelarExclusao(accessToken: string, idempotencyKey: string): Promise<void> {
    await requestPublico<void>('/me/conta/cancelar-exclusao', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      idempotencyKey,
    })
  }

  /** Identidade do portador da sessão atual — usado para restaurar o usuário ao recarregar. */
  async function buscarUsuarioAtual(): Promise<UsuarioProprio> {
    return request<UsuarioProprio>('/me')
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

  /**
   * Pede o link de recuperação (RF-AUT-04). O servidor responde o mesmo `202` exista ou não a
   * conta; a tela também não pode diferenciar (RNF-SEC-28), então não há retorno a interpretar.
   * Chave nova por pedido: "Enviar de novo" é outra intenção, e a mesma chave não reenviaria.
   */
  async function solicitarRecuperacao(email: string): Promise<void> {
    await requestPublico<unknown>('/auth/password/forgot', {
      method: 'POST',
      json: { email },
      idempotencyKey: novaChaveIdempotencia(),
    })
  }

  /**
   * Redefine a senha pelo token do link. `410` é link desconhecido, vencido ou usado, sempre com
   * a mesma mensagem; `400` é a senha nova. A chave é de quem chama, como no cadastro.
   */
  async function redefinirSenha(dados: { token: string; novaSenha: string }, idempotencyKey: string): Promise<void> {
    await requestPublico<void>('/auth/password/reset', { method: 'POST', json: dados, idempotencyKey })
  }

  /**
   * Troca a senha (RF-AUT-05). O servidor revoga **todas** as renovações da conta, inclusive a
   * deste navegador, então a sessão daqui é refeita com um login pela senha nova, que quem chama
   * ainda tem em mãos: é o que cumpre o "aqui você continua conectado" de alterar-senha.md §4.6
   * sem mudar o contrato. Se esse login falhar, a troca já aconteceu e não é desfeita; a sessão
   * daqui termina quando o token de acesso vencer.
   */
  async function alterarSenha(
    dados: { senhaAtual: string; novaSenha: string },
    usuario: UsuarioResposta,
    idempotencyKey: string,
  ): Promise<LoginResultado | null> {
    await request<void>('/auth/password/change', { method: 'POST', json: dados, idempotencyKey })
    try {
      const resultado = await entrar({ identificador: usuario.username, senha: dados.novaSenha })
      return 'recuperacao' in resultado ? null : resultado
    } catch {
      return null
    }
  }

  return {
    cadastrar,
    entrar,
    buscarUsuarioAtual,
    sair,
    solicitarRecuperacao,
    redefinirSenha,
    alterarSenha,
    solicitarExclusao,
    cancelarExclusao,
  }
}

export const authService = createAuthService()
