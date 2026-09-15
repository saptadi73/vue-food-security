const rawOrigin = (import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:8000').replace(/\/+$/, '')
const rawPrefix = (import.meta.env.VITE_API_PREFIX ?? '/api/v1').replace(/\/+$/, '')
const useProxy = import.meta.env.VITE_USE_PROXY === 'true'

export const env = {
  appName: 'FSOS',
  appLongName: 'Food Security & Traceability Operations System',
  apiOrigin: rawOrigin,
  apiPrefix: rawPrefix,
  /** Saat proxy aktif, request memakai path relatif sehingga origin browser tidak berubah. */
  apiBase: useProxy ? rawPrefix : `${rawOrigin}${rawPrefix}`,
  useProxy,
  requestTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 20000),
  defaultTenant: import.meta.env.VITE_DEFAULT_TENANT ?? '',
  isDev: import.meta.env.DEV,
} as const

/** Batas pagination yang dijamin kontrak backend (limit 1..100). */
export const PAGE_LIMITS = [10, 20, 50, 100] as const
export const DEFAULT_PAGE_LIMIT = 20
export const MAX_PAGE_LIMIT = 100
