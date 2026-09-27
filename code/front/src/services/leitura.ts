import { getToken } from '../session'
import { createApiClient, type ApiClientOptions } from './api'
import { renovarSessao } from './renovacao'

/**
 * Contrato do serviço `leitura` usado por F-AVA. Espelha `docs/api/leitura.yaml`: mesmos campos,
 * mesmas rotas. Toda escrita exige `Idempotency-Key`, e quem guarda a chave da intenção é quem
 * chama (o composable), não este serviço.
 */

/** `Nota` do contrato: de 0 a 5 em passos de 0,5 (RN-06). */
export interface Nota {
  livroId: string
  valor: number
  criadoEm: string
  atualizadoEm: string
}

/** `Resenha` do contrato: texto cru, até 5.000 caracteres (RN-07). */
export interface Resenha {
  id: string
  usuarioId: string
  livroId: string
  texto: string
  spoiler: boolean
  criadoEm: string
  atualizadoEm: string
}

/** Ausente é `null`, nunca valor inventado: nota `0` é uma nota. */
export interface MinhaAvaliacao {
  livroId: string
  nota: Nota | null
  resenha: Resenha | null
}

/** `LivroDaResenha` do contrato: o que o card do perfil mostra do livro. */
export interface LivroDaResenha {
  id: string
  tipo: 'oficial' | 'pessoal'
  titulo: string
  /** `null` em livro oficial sem autor. */
  autor: string | null
  capaUrl: string | null
}

/** `ResenhaDoPerfil` do contrato: a resenha com o livro e a nota do autor. */
export interface ResenhaDoPerfil extends Resenha {
  livro: LivroDaResenha
  nota: number | null
}

export interface PaginaResenhasPerfil {
  itens: ResenhaDoPerfil[]
  paginacao: { page: number; limite: number; totalItens: number; totalPaginas: number }
}

/** Fábrica no molde de `createAcervoService`, para os testes injetarem um `fetch` falso. */
export function createLeituraService(options: ApiClientOptions = {}) {
  const request = createApiClient({
    ...options,
    baseUrl: options.baseUrl ?? import.meta.env.VITE_LEITURA_BASE_URL,
    getToken: options.getToken ?? getToken,
    renovarSessao: options.renovarSessao ?? renovarSessao,
  })

  const caminhoDoLivro = (livroId: string) => `/livros/${encodeURIComponent(livroId)}`

  function obterMinhaAvaliacao(livroId: string): Promise<MinhaAvaliacao> {
    return request<MinhaAvaliacao>(`${caminhoDoLivro(livroId)}/minha-avaliacao`)
  }

  function salvarNota(livroId: string, valor: number, chave: string): Promise<Nota> {
    return request<Nota>(`${caminhoDoLivro(livroId)}/nota`, {
      method: 'PUT',
      json: { valor },
      idempotencyKey: chave,
    })
  }

  async function excluirNota(livroId: string, chave: string): Promise<void> {
    await request<void>(`${caminhoDoLivro(livroId)}/nota`, {
      method: 'DELETE',
      idempotencyKey: chave,
    })
  }

  function salvarResenha(livroId: string, texto: string, spoiler: boolean, chave: string): Promise<Resenha> {
    return request<Resenha>(`${caminhoDoLivro(livroId)}/resenha`, {
      method: 'PUT',
      json: { texto, spoiler },
      idempotencyKey: chave,
    })
  }

  async function excluirResenha(livroId: string, chave: string): Promise<void> {
    await request<void>(`${caminhoDoLivro(livroId)}/resenha`, {
      method: 'DELETE',
      idempotencyKey: chave,
    })
  }

  /** Resenhas autorizadas de um perfil (RN-08): página iniciada em 1, até 50 por página. */
  function listarResenhasPerfil(usuarioId: string, page = 1, limite = 20): Promise<PaginaResenhasPerfil> {
    const query = new URLSearchParams({ page: String(page), limite: String(limite) })
    return request<PaginaResenhasPerfil>(`/perfis/${encodeURIComponent(usuarioId)}/resenhas?${query}`)
  }

  return {
    obterMinhaAvaliacao,
    salvarNota,
    excluirNota,
    salvarResenha,
    excluirResenha,
    listarResenhasPerfil,
  }
}

export type LeituraService = ReturnType<typeof createLeituraService>

export const leituraService = createLeituraService()
