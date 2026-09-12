const DEFAULT_TIMEOUT_MS = 90_000

export interface ApiClientOptions {
  baseUrl?: string
  timeoutMs?: number
  fetch?: typeof globalThis.fetch
  createCorrelationId?: () => string
}

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number
}

interface ApiErrorBody {
  codigo?: string
  mensagem?: string
  correlationId?: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly correlationId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const fetchImplementation = options.fetch ?? globalThis.fetch
  const createCorrelationId = options.createCorrelationId ?? (() => crypto.randomUUID())

  return async function request<T>(path: string, requestOptions: ApiRequestOptions = {}): Promise<T> {
    const timeoutMs = requestOptions.timeoutMs ?? options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const headers = new Headers(requestOptions.headers)

    headers.set('Accept', 'application/json')
    headers.set('X-Correlation-Id', createCorrelationId())

    try {
      const response = await fetchImplementation(`${baseUrl}/${path.replace(/^\//, '')}`, {
        ...requestOptions,
        headers,
        signal: controller.signal,
      })

      if (!response.ok) {
        const body = await readErrorBody(response)
        throw new ApiError(
          body.mensagem ?? 'Não foi possível concluir a solicitação.',
          response.status,
          body.codigo ?? 'ERRO_NAO_IDENTIFICADO',
          body.correlationId ?? response.headers.get('X-Correlation-Id') ?? undefined,
        )
      }

      if (response.status === 204) {
        return undefined as T
      }

      return (await response.json()) as T
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

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

async function readErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    return (await response.json()) as ApiErrorBody
  } catch {
    return {}
  }
}

export const api = createApiClient()
