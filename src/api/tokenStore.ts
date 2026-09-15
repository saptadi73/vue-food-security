import type { AuthTokens } from './types'

/**
 * Penyimpanan token.
 *
 * Access token hanya di memori (tidak pernah menyentuh storage).
 * Refresh token disimpan di sessionStorage agar sesi bertahan saat reload tab,
 * tetapi hilang ketika tab ditutup. Catatan kontrak: backend belum menyediakan
 * cookie HttpOnly/BFF, sehingga ini kompromi terbaik yang tersedia sekarang.
 */
const REFRESH_KEY = 'fsos.session.refresh'
const EXPIRY_KEY = 'fsos.session.refresh_expires_at'

let accessToken: string | null = null
let accessExpiresAt = 0

function safeSession(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export const tokenStore = {
  get accessToken() {
    return accessToken
  },

  get refreshToken(): string | null {
    return safeSession()?.getItem(REFRESH_KEY) ?? null
  },

  get refreshExpiresAt(): string | null {
    return safeSession()?.getItem(EXPIRY_KEY) ?? null
  },

  /** true bila access token masih punya sisa umur wajar (buffer 30 detik). */
  get hasFreshAccess() {
    return Boolean(accessToken) && Date.now() < accessExpiresAt - 30_000
  },

  get hasSession() {
    return Boolean(accessToken) || Boolean(this.refreshToken)
  },

  set(tokens: AuthTokens) {
    accessToken = tokens.access_token
    accessExpiresAt = Date.now() + (tokens.expires_in ?? 900) * 1000
    const storage = safeSession()
    storage?.setItem(REFRESH_KEY, tokens.refresh_token)
    storage?.setItem(EXPIRY_KEY, tokens.refresh_expires_at)
  },

  clear() {
    accessToken = null
    accessExpiresAt = 0
    const storage = safeSession()
    storage?.removeItem(REFRESH_KEY)
    storage?.removeItem(EXPIRY_KEY)
  },
}
