import type { ApiFieldError, ApiMeta } from './types'

export type ApiErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'server'
  | 'unavailable'
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'unknown'

const KIND_BY_STATUS: Record<number, ApiErrorKind> = {
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  405: 'not_found',
  409: 'conflict',
  422: 'validation',
  429: 'rate_limited',
  500: 'server',
  503: 'unavailable',
}

/** Pesan siap tampil (bahasa Indonesia) untuk kondisi yang sering muncul. */
const HUMAN_MESSAGE: Partial<Record<ApiErrorKind, string>> = {
  unauthorized: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.',
  forbidden: 'Permission untuk operasi ini belum diberikan.',
  not_found: 'Data yang diminta tidak ditemukan.',
  conflict: 'Data sudah berubah di server. Muat ulang lalu coba lagi.',
  rate_limited: 'Terlalu banyak permintaan. Coba lagi beberapa saat.',
  server: 'Terjadi kegagalan di server.',
  unavailable: 'Layanan sedang tidak tersedia.',
  network: 'Tidak dapat terhubung ke server. Periksa koneksi atau konfigurasi CORS.',
  timeout: 'Permintaan melebihi batas waktu.',
  aborted: 'Permintaan dibatalkan.',
}

export class ApiError extends Error {
  readonly status: number | null
  readonly code: number | null
  readonly kind: ApiErrorKind
  readonly errors: ApiFieldError[]
  readonly requestId: string | null
  readonly correlationId: string | null
  readonly meta: ApiMeta | null
  readonly method: string
  readonly path: string
  readonly retryAfterSeconds: number | null

  constructor(init: {
    message: string
    status?: number | null
    code?: number | null
    kind?: ApiErrorKind
    errors?: ApiFieldError[]
    requestId?: string | null
    correlationId?: string | null
    meta?: ApiMeta | null
    method?: string
    path?: string
    retryAfterSeconds?: number | null
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status ?? null
    this.code = init.code ?? init.status ?? null
    this.kind = init.kind ?? (this.status ? (KIND_BY_STATUS[this.status] ?? 'unknown') : 'unknown')
    this.errors = init.errors ?? []
    this.requestId = init.requestId ?? null
    this.correlationId = init.correlationId ?? null
    this.meta = init.meta ?? null
    this.method = init.method ?? 'GET'
    this.path = init.path ?? ''
    this.retryAfterSeconds = init.retryAfterSeconds ?? null
  }

  static fromStatus(status: number, message: string, extra: Partial<ApiError> = {}) {
    return new ApiError({ status, message, ...extra })
  }

  /** Pesan pendek untuk toast. */
  get displayMessage(): string {
    if (this.kind === 'validation' && this.errors.length) {
      return this.errors[0]!.message
    }
    return HUMAN_MESSAGE[this.kind] ?? this.message ?? 'Terjadi kesalahan tidak terduga.'
  }

  /** Map error validasi ke `{ field: message }` untuk form. */
  get fieldErrors(): Record<string, string> {
    const map: Record<string, string> = {}
    for (const item of this.errors) {
      const key = item.field.replace(/^(body|query|path)\./, '')
      if (!map[key]) map[key] = item.message
    }
    return map
  }

  get isAuthFailure() {
    return this.kind === 'unauthorized'
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

export function toApiError(error: unknown, context: { method?: string; path?: string } = {}) {
  if (isApiError(error)) return error
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError({ message: 'Permintaan dibatalkan.', kind: 'aborted', ...context })
  }
  return new ApiError({
    message: error instanceof Error ? error.message : String(error),
    kind: 'network',
    ...context,
  })
}
