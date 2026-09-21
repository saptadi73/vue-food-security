const configuredOrigin = import.meta.env.VITE_API_ORIGIN?.replace(/\/+$/, '') ?? ''
const rawOrigin = configuredOrigin || (import.meta.env.DEV ? 'http://localhost:8000' : '')
const rawPrefix = (import.meta.env.VITE_API_PREFIX ?? '/api/v1').replace(/\/+$/, '')
const useProxy = import.meta.env.VITE_USE_PROXY
  ? import.meta.env.VITE_USE_PROXY === 'true'
  : import.meta.env.DEV

export const env = {
  appName: 'FSOS',
  appLongName: 'Food Security & Traceability Operations System',
  apiOrigin: rawOrigin || 'same-origin',
  apiPrefix: rawPrefix,
  /** Tanpa origin eksplisit, production memakai reverse proxy same-origin di /api. */
  apiBase: useProxy || !rawOrigin ? rawPrefix : `${rawOrigin}${rawPrefix}`,
  useProxy,
  requestTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 20000),
  defaultTenant: import.meta.env.VITE_DEFAULT_TENANT ?? '',
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  isDev: import.meta.env.DEV,
} as const

/** Batas pagination yang dijamin kontrak backend (limit 1..100). */
export const PAGE_LIMITS = [10, 20, 50, 100] as const
export const DEFAULT_PAGE_LIMIT = 20
export const MAX_PAGE_LIMIT = 100
