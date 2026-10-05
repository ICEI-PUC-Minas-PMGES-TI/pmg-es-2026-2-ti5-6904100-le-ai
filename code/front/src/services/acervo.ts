import { getToken } from '../session'
import { ApiError, createApiClient, type ApiClientOptions } from './api'
import { renovarSessao } from './renovacao'

/**
 * Contrato do serviço `acervo` usado por F-ACV-CADASTRO e F-ACV-BUSCA. Espelha `docs/api/acervo.yaml`: mesmos
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

export interface AssuntoResumo {
  id: string
  nome: string
}

export interface AutorResumo {
  id: string
  nome: string
}

/**
 * Uma edição (RN-01), como a busca devolve. Editora, ano e autores podem faltar: parte do acervo
 * carregado não os tem, e a tela omite o que falta em vez de inventar.
 */
export interface LivroOficialResumo {
  id: string
  titulo: string
  /** Na ordem do servidor, por nome. Pode vir vazio. */
  autores: AutorResumo[]
  editora: string | null
  anoPublicacao: number | null
  paginas: number
  /** Resolvida pelo servidor: cópia própria, depois URL externa (RN-14.4). */
  capa: { url: string | null; origem: 'propria' | 'externa' | 'placeholder' }
  assuntos: AssuntoResumo[]
}

/** Página da busca, **a partir de 1**, ao contrário das listas de F-PERFIL. */
export interface PaginaLivros {
  itens: LivroOficialResumo[]
  page: number
  limit: number
  totalItens: number
  totalPaginas: number
}

export type StatusDaSinopse = 'nao_consultada' | 'pendente' | 'disponivel' | 'ausente' | 'falha_transitoria'

/** Sinopse do livro oficial (RN-19): o texto só vem em `disponivel`. */
export interface SinopseDoLivro {
  status: StatusDaSinopse
  texto: string | null
}

/** Resenha de outro leitor, já filtrada por RN-08 no servidor. Mesma forma de `ResenhaDoDono`. */
export type ResenhaDoLivro = ResenhaDoDono

export interface PaginaResenhas {
  itens: ResenhaDoLivro[]
  limit: number
  proximoCursor: string | null
}

/**
 * Página do livro oficial. `resenhas` nulo quer dizer que os contratos de `leitura` ou
 * `identidade` estavam indisponíveis: a página abre mesmo assim.
 */
export interface LivroOficialDetalhe extends LivroOficialResumo {
  isbn: string
  sinopse: SinopseDoLivro
  resenhas: PaginaResenhas | null
}

export interface CriteriosDaBusca {
  q?: string | null
  assunto?: string | null
  page?: number
}

/** Padrão do contrato; o servidor aceita até 50. */
export const TAMANHO_DA_PAGINA_DE_LIVROS = 20

export interface ViaDeAcesso {
  /**
   * `lista` (F-LST): o `acervo` só aceita depois da etapa 3 da F-LST; até lá responde 400, e a
   * página cai no estado "indisponível". O dono abre o próprio livro sem via.
   */
  via: 'feed' | 'lista'
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

  /** `GET /assuntos`: o conjunto curado para o filtro da busca (RN-21). */
  async function listarAssuntos(): Promise<AssuntoResumo[]> {
    const lista = await request<{ itens?: AssuntoResumo[] }>('/assuntos')
    return lista?.itens ?? []
  }

  /**
   * `GET /livros`: busca paginada de livros oficiais. O servidor exige `q` ou `assunto`; quem chama
   * nunca manda os dois vazios.
   */
  function buscarLivros({ q, assunto, page = 1 }: CriteriosDaBusca): Promise<PaginaLivros> {
    const consulta = new URLSearchParams()
    if (q) {
      consulta.set('q', q)
    }
    if (assunto) {
      consulta.set('assunto', assunto)
    }
    consulta.set('page', String(page))
    consulta.set('limit', String(TAMANHO_DA_PAGINA_DE_LIVROS))
    return request<PaginaLivros>(`/livros?${consulta}`)
  }

  /**
   * `GET /livros/{id}`: a página do livro oficial. A primeira abertura pede a sinopse, e a resposta
   * nunca espera a fonte externa.
   */
  function obterLivroOficial(id: string): Promise<LivroOficialDetalhe> {
    return request<LivroOficialDetalhe>(`/livros/${encodeURIComponent(id)}`)
  }

  /** `GET /livros/{id}/resenhas`: as próximas resenhas, por cursor. */
  function listarResenhasDoLivro(id: string, cursor?: string | null): Promise<PaginaResenhas> {
    const consulta = cursor ? `?${new URLSearchParams({ cursor })}` : ''
    return request<PaginaResenhas>(`/livros/${encodeURIComponent(id)}/resenhas${consulta}`)
  }

  return {
    listarAssuntos,
    buscarLivros,
    obterLivroOficial,
    listarResenhasDoLivro,
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
