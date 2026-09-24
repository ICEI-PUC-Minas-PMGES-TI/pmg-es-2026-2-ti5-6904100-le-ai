import { getToken } from '../session'
import { ApiError, createApiClient, type ApiClientOptions } from './api'
import { renovarSessao } from './renovacao'

/**
 * Contrato do serviço `acervo` usado por F-ACV-CADASTRO. Espelha `docs/api/acervo.yaml`: mesmos
 * campos, mesmas rotas, mesmos estados. Toda escrita exige `Idempotency-Key` (o servidor recusa
 * sem ela com `400`), e quem guarda a chave da intenção é a tela, não este serviço.
 */
export type EstadoImportacao = 'pendente' | 'concluida' | 'nao_encontrado' | 'falha_transitoria'

/** Resumo da edição para o card de confirmação (cadastro-por-isbn.md §4.4 e §4.5). */
export interface LivroImportadoResumo {
  id: string
  titulo: string
  autores: string | null
  editora: string | null
  anoPublicacao: number | null
  paginas: number
  capaUrl: string | null
}

export interface Importacao {
  importacaoId: string
  isbn: string
  status: EstadoImportacao
  livroId: string | null
  /** Só em `concluida`. */
  livro?: LivroImportadoResumo | null
  permiteCadastroPessoal: boolean
}

/**
 * Desfecho de `POST /livros/oficial`: a solicitação foi aceita (`202`) ou o ISBN já existe na
 * base oficial (`409` com `livroId`, RF-ACV-07). Os dois são caminhos de sucesso para a tela.
 */
export type ResultadoDaSolicitacao =
  | { tipo: 'aceita'; importacaoId: string }
  | { tipo: 'existente'; livroId: string; livro: LivroImportadoResumo | null }

export interface ResenhaDoDono {
  id: string
  autorId: string
  autorNome: string
  autorAvatarUrl?: string | null
  texto: string
  spoiler: boolean
  criadoEm: string
  atualizadoEm: string
}

export interface LivroPessoalDetalhe {
  id: string
  tipo: 'pessoal'
  donoId: string
  titulo: string
  autor: string
  paginas: number
  sinopse: string | null
  capaUrl: string | null
  /**
   * `true` para terceiro autorizado por RN-15, `false` para o dono. Decidido pelo servidor: o
   * cliente só escolhe o que desenhar, nunca o que é permitido.
   */
  modoConsulta: boolean
  notaDoDono: { valor: number } | null
  resenhaDoDono: ResenhaDoDono | null
  /** `null` quando o perfil do dono não está disponível; a página não inventa um nome. */
  dono: { nome: string; avatarUrl: string | null } | null
}

/** Campos do formulário. Sem ISBN: em livro pessoal o campo é ausente, não vazio (RN-02). */
export interface DadosLivroPessoal {
  titulo: string
  autor: string
  paginas: number
  sinopse: string | null
  capaUrl: string | null
}

export interface ViaDeAcesso {
  via: 'feed'
  referenciaId: string
}

/**
 * Na criação, opcional ausente não vai no corpo. Na edição, `null` explícito limpa o campo no
 * servidor (`capaUrl: null` remove a capa), então os cinco vão sempre.
 */
export function corpoDoLivroPessoal(dados: DadosLivroPessoal, edicao: boolean): Record<string, unknown> {
  const corpo: Record<string, unknown> = { titulo: dados.titulo, autor: dados.autor, paginas: dados.paginas }
  if (edicao || dados.sinopse !== null) {
    corpo.sinopse = dados.sinopse
  }
  if (edicao || dados.capaUrl !== null) {
    corpo.capaUrl = dados.capaUrl
  }
  return corpo
}

/** Fábrica no molde de `createAuthService`, para os testes injetarem um `fetch` falso. */
export function createAcervoService(options: ApiClientOptions = {}) {
  const request = createApiClient({
    ...options,
    baseUrl: options.baseUrl ?? import.meta.env.VITE_ACERVO_BASE_URL,
    getToken: options.getToken ?? getToken,
    renovarSessao: options.renovarSessao ?? renovarSessao,
  })

  /** `POST /livros/oficial`. O `409` de ISBN já cadastrado vira resultado, não exceção. */
  async function solicitarImportacao(isbn: string, chave: string): Promise<ResultadoDaSolicitacao> {
    try {
      const aceita = await request<{ importacaoId: string }>('/livros/oficial', {
        method: 'POST',
        json: { isbn },
        idempotencyKey: chave,
      })
      return { tipo: 'aceita', importacaoId: aceita.importacaoId }
    } catch (erro) {
      if (erro instanceof ApiError && erro.status === 409 && erro.livroId) {
        const livro = (erro.corpo as { livro?: LivroImportadoResumo } | undefined)?.livro ?? null
        return { tipo: 'existente', livroId: erro.livroId, livro }
      }
      throw erro
    }
  }

  function obterImportacao(importacaoId: string): Promise<Importacao> {
    return request<Importacao>(`/livros/importacoes/${encodeURIComponent(importacaoId)}`)
  }

  async function reprocessarImportacao(importacaoId: string, chave: string): Promise<void> {
    await request(`/livros/importacoes/${encodeURIComponent(importacaoId)}/reprocessar`, {
      method: 'POST',
      idempotencyKey: chave,
    })
  }

  function criarLivroPessoal(dados: DadosLivroPessoal, chave: string): Promise<LivroPessoalDetalhe> {
    return request<LivroPessoalDetalhe>('/livros/pessoal', {
      method: 'POST',
      json: corpoDoLivroPessoal(dados, false),
      idempotencyKey: chave,
    })
  }

  function atualizarLivroPessoal(id: string, dados: DadosLivroPessoal, chave: string): Promise<LivroPessoalDetalhe> {
    return request<LivroPessoalDetalhe>(`/livros/pessoal/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      json: corpoDoLivroPessoal(dados, true),
      idempotencyKey: chave,
    })
  }

  async function excluirLivroPessoal(id: string, chave: string): Promise<void> {
    await request(`/livros/pessoal/${encodeURIComponent(id)}`, { method: 'DELETE', idempotencyKey: chave })
  }

  /** O dono abre sem `via`. Terceiro só com `via=feed&referenciaId=<atividadeId>` (RN-15). */
  function obterLivroPessoal(id: string, acesso?: ViaDeAcesso): Promise<LivroPessoalDetalhe> {
    const consulta = acesso ? `?${new URLSearchParams({ via: acesso.via, referenciaId: acesso.referenciaId })}` : ''
    return request<LivroPessoalDetalhe>(`/livros/pessoal/${encodeURIComponent(id)}${consulta}`)
  }

  return {
    solicitarImportacao,
    obterImportacao,
    reprocessarImportacao,
    criarLivroPessoal,
    atualizarLivroPessoal,
    excluirLivroPessoal,
    obterLivroPessoal,
  }
}

export type AcervoService = ReturnType<typeof createAcervoService>

export const acervoService = createAcervoService()
