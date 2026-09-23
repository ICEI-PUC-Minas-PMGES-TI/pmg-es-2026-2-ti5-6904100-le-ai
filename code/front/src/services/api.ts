const DEFAULT_TIMEOUT_MS = 90_000

/**
 * Esperas entre tentativas de uma operação idempotente (RNF-ERR-03): no máximo três tentativas.
 * Curtas de propósito, porque o timeout de cada tentativa já cobre o cold start do Render.
 */
const ESPERAS_DE_RETENTATIVA_MS = [1_000, 3_000] as const

export interface ApiClientOptions {
  baseUrl?: string
  timeoutMs?: number
  fetch?: typeof globalThis.fetch
  createCorrelationId?: () => string
  /** Token da sessão atual, se houver. Injetado como `Authorization: Bearer <token>`. */
  getToken?: () => string | null
  /** Esperas entre tentativas. Os testes passam `[0, 0]` para não depender do relógio. */
  esperasDeRetentativaMs?: readonly number[]
}

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number
  /**
   * Chave de idempotência da **intenção** (RNF-ERR-04). Quem chama guarda a chave e a repete ao
   * reenviar a mesma intenção; o cliente a repete nas próprias retentativas. Só vai no header
   * quando presente: o CORS do `identidade` não aceita `Idempotency-Key`.
   */
  idempotencyKey?: string
  /** Corpo JSON. O cliente serializa e põe `Content-Type`. */
  json?: unknown
}

interface ApiErrorBody {
  codigo?: string
  mensagem?: string
  correlationId?: string
  livroId?: string
  campos?: { campo?: string; mensagem?: string }[]
}

export class ApiError extends Error {
  /** Id do livro existente, no `409` de ISBN já cadastrado (RF-ACV-07). */
  readonly livroId?: string
  /** Mensagem por campo, no `400` de validação: `{ titulo: 'Informe o título do livro.' }`. */
  readonly campos?: Record<string, string>

  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly correlationId?: string,
    readonly corpo?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    const detalhe = corpo as ApiErrorBody | undefined
    if (typeof detalhe?.livroId === 'string') {
      this.livroId = detalhe.livroId
    }
    if (Array.isArray(detalhe?.campos)) {
      this.campos = Object.fromEntries(
        detalhe.campos
          .filter((item) => typeof item?.campo === 'string' && typeof item.mensagem === 'string')
          .map((item) => [item.campo as string, item.mensagem as string]),
      )
    }
  }
}

/** Chave nova para uma intenção nova. Mesmo formato do correlation-id: UUID v4. */
export function novaChaveIdempotencia(): string {
  return crypto.randomUUID()
}

function statusRetentavel(status: number): boolean {
  return status === 502 || status === 503 || status === 504
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const fetchImplementation = options.fetch ?? globalThis.fetch
  const createCorrelationId = options.createCorrelationId ?? (() => crypto.randomUUID())
  const esperas = options.esperasDeRetentativaMs ?? ESPERAS_DE_RETENTATIVA_MS

  return async function request<T>(path: string, requestOptions: ApiRequestOptions = {}): Promise<T> {
    const { timeoutMs: timeoutDaChamada, idempotencyKey, json, ...init } = requestOptions
    const timeoutMs = timeoutDaChamada ?? options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const metodo = (init.method ?? 'GET').toUpperCase()

    // Montados uma vez: todas as tentativas levam o mesmo correlation-id e a mesma chave, e é
    // isso que faz o servidor reconhecer o reenvio em vez de repetir o efeito.
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    headers.set('X-Correlation-Id', createCorrelationId())
    if (idempotencyKey) {
      headers.set('Idempotency-Key', idempotencyKey)
    }
    if (json !== undefined) {
      headers.set('Content-Type', 'application/json')
    }

    // Só preenche quando a chamada não trouxe Authorization própria — é o que permite
    // o login buscar /me com o token recém-emitido antes de a sessão global existir.
    const token = options.getToken?.()
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const corpo = json !== undefined ? JSON.stringify(json) : init.body
    // Retentar escrita sem chave repetiria o efeito (RNF-ERR-03): só GET ou escrita com chave.
    const podeRetentar = metodo === 'GET' || idempotencyKey !== undefined
    const esperasDaChamada = podeRetentar ? esperas : []
    const url = `${baseUrl}/${path.replace(/^\//, '')}`

    for (let tentativa = 0; ; tentativa++) {
      const ultima = tentativa >= esperasDaChamada.length
      try {
        const response = await tentar(url, { ...init, headers, body: corpo }, timeoutMs)
        if (!response.ok) {
          if (!ultima && statusRetentavel(response.status)) {
            await esperar(esperasDaChamada[tentativa]!)
            continue
          }
          throw await erroDaResposta(response)
        }
        return (await lerCorpo(response)) as T
      } catch (error) {
        // Só falha de rede se repete. Timeout é cold start: repetir dobraria a espera de quem já
        // esperou 90 segundos, e a mensagem certa é pedir para tentar de novo.
        if (!ultima && error instanceof ApiError && error.code === 'SERVICO_INDISPONIVEL' && error.status === 0) {
          await esperar(esperasDaChamada[tentativa]!)
          continue
        }
        throw error
      }
    }
  }

  async function tentar(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetchImplementation(url, { ...init, signal: controller.signal })
    } catch {
      if (controller.signal.aborted) {
        throw new ApiError(
          'O servidor demorou para responder. Tente novamente.',
          0,
          'TEMPO_LIMITE_EXCEDIDO',
        )
      }
      throw new ApiError('Não foi possível acessar o servidor. Tente novamente.', 0, 'SERVICO_INDISPONIVEL')
    } finally {
      clearTimeout(timeout)
    }
  }
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function erroDaResposta(response: Response): Promise<ApiError> {
  const body = await readErrorBody(response)
  return new ApiError(
    body.mensagem ?? 'Não foi possível concluir a solicitação.',
    response.status,
    body.codigo ?? 'ERRO_NAO_IDENTIFICADO',
    body.correlationId ?? response.headers.get('X-Correlation-Id') ?? undefined,
    body,
  )
}

/** `204` e corpo vazio não passam por `json()`, que lançaria em corpo vazio. */
async function lerCorpo(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined
  }
  const texto = await response.text()
  return texto.trim() === '' ? undefined : JSON.parse(texto)
}

async function readErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    return (await response.json()) as ApiErrorBody
  } catch {
    return {}
  }
}

export const api = createApiClient()
