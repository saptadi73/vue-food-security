import { env } from '@/config/env'
import { ApiError, toApiError } from './errors'
import { endpoints } from './endpoints'
import { tokenStore } from './tokenStore'
import { apiTrace } from './trace'
import type { ApiEnvelope, AuthTokens } from './types'

export interface RequestOptions {
  /** Body JSON; otomatis di-serialize. */
  body?: unknown
  /** Kirim Authorization bearer. Default true. */
  auth?: boolean
  signal?: AbortSignal
  timeoutMs?: number
  /** Menghubungkan beberapa request menjadi satu aktivitas (X-Correlation-ID). */
  correlationId?: string
  /** Jangan coba refresh + retry saat 401 (dipakai endpoint auth itu sendiri). */
  skipRefresh?: boolean
  headers?: Record<string, string>
}

type SessionExpiredHandler = () => void

let onSessionExpired: SessionExpiredHandler = () => {}
export function setSessionExpiredHandler(handler: SessionExpiredHandler) {
  onSessionExpired = handler
}

function newCorrelationId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `fsos-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * Kontrak melarang dua refresh berjalan bersamaan (reuse token mencabut sesi).
 * Semua pemanggil berbagi satu promise refresh.
 */
let refreshInFlight: Promise<AuthTokens> | null = null

async function performRefresh(): Promise<AuthTokens> {
  const refreshToken = tokenStore.refreshToken
  if (!refreshToken) {
    throw new ApiError({ message: 'Tidak ada sesi aktif.', status: 401, kind: 'unauthorized' })
  }
  const tokens = await rawRequest<AuthTokens>('POST', endpoints.auth.refresh(), {
    body: { refresh_token: refreshToken },
    auth: false,
    skipRefresh: true,
  })
  tokenStore.set(tokens)
  return tokens
}

function refreshSession(): Promise<AuthTokens> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function rawRequest<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const correlationId = options.correlationId ?? newCorrelationId()
  const controller = new AbortController()
  const timeoutMs = options.timeoutMs ?? env.requestTimeoutMs
  const timer = setTimeout(
    () => controller.abort(new DOMException('timeout', 'TimeoutError')),
    timeoutMs,
  )
  const externalAbort = () => controller.abort()
  options.signal?.addEventListener('abort', externalAbort, { once: true })

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Correlation-ID': correlationId.slice(0, 128),
    ...options.headers,
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.auth !== false && tokenStore.accessToken) {
    headers.Authorization = `Bearer ${tokenStore.accessToken}`
  }

  const startedAt = performance.now()
  apiTrace.start()

  let response: Response
  try {
    response = await fetch(`${env.apiBase}${path}`, {
      method,
      headers,
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch (cause) {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', externalAbort)
    const timedOut =
      controller.signal.reason instanceof DOMException &&
      controller.signal.reason.name === 'TimeoutError'
    const error = timedOut
      ? new ApiError({ message: 'Permintaan melebihi batas waktu.', kind: 'timeout', method, path })
      : toApiError(cause, { method, path })
    apiTrace.finish({
      id: correlationId,
      method,
      path,
      status: null,
      ok: false,
      durationMs: Math.round(performance.now() - startedAt),
      requestId: null,
      correlationId,
      serverTimeMs: null,
      message: error.displayMessage,
      startedAt: Date.now(),
    })
    throw error
  }

  clearTimeout(timer)
  options.signal?.removeEventListener('abort', externalAbort)

  const requestId = response.headers.get('X-Request-ID')
  let envelope: ApiEnvelope<T> | null = null
  try {
    envelope = (await response.json()) as ApiEnvelope<T>
  } catch {
    envelope = null
  }

  apiTrace.finish({
    id: correlationId,
    method,
    path,
    status: response.status,
    ok: response.ok,
    durationMs: Math.round(performance.now() - startedAt),
    requestId: envelope?.meta?.request_id ?? requestId,
    correlationId,
    serverTimeMs: envelope?.meta?.execution_time_ms ?? null,
    message: envelope?.message ?? response.statusText,
    startedAt: Date.now(),
  })

  if (!response.ok) {
    const retryAfter = response.headers.get('Retry-After')
    throw new ApiError({
      message: envelope?.message ?? `HTTP ${response.status}`,
      status: response.status,
      code: envelope?.code ?? response.status,
      errors: envelope?.errors ?? [],
      requestId: envelope?.meta?.request_id ?? requestId,
      correlationId: envelope?.meta?.correlation_id ?? correlationId,
      meta: envelope?.meta ?? null,
      method,
      path,
      retryAfterSeconds: retryAfter ? Number(retryAfter) : null,
    })
  }

  if (!envelope) {
    throw new ApiError({
      message: 'Respons bukan envelope JSON yang valid.',
      status: response.status,
      kind: 'unknown',
      method,
      path,
    })
  }

  return envelope.data as T
}

/**
 * API induk. Semua modul memanggil lewat sini sehingga penanganan envelope,
 * error, korelasi, timeout dan rotasi sesi hanya ada di satu tempat.
 */
export const api = {
  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    try {
      return await rawRequest<T>(method, path, options)
    } catch (error) {
      const apiError = toApiError(error, { method, path })
      const canRetry =
        apiError.isAuthFailure &&
        options.auth !== false &&
        !options.skipRefresh &&
        Boolean(tokenStore.refreshToken)

      if (!canRetry) throw apiError

      try {
        await refreshSession()
      } catch {
        tokenStore.clear()
        onSessionExpired()
        throw apiError
      }
      return rawRequest<T>(method, path, { ...options, skipRefresh: true })
    }
  },

  get<T>(path: string, options?: RequestOptions) {
    return api.request<T>('GET', path, options)
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return api.request<T>('POST', path, { ...options, body })
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return api.request<T>('PUT', path, { ...options, body })
  },
  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return api.request<T>('PATCH', path, { ...options, body })
  },
  delete<T>(path: string, options?: RequestOptions) {
    return api.request<T>('DELETE', path, options)
  },

  refreshSession,
}
