import { api } from '../client'
import { endpoints } from '../endpoints'
import { tokenStore } from '../tokenStore'
import type { AuthIdentity, AuthTokens, LoginPayload } from '../types'

export const authApi = {
  async login(payload: LoginPayload) {
    const tokens = await api.post<AuthTokens>(endpoints.auth.login(), payload, {
      auth: false,
      skipRefresh: true,
    })
    tokenStore.set(tokens)
    return tokens
  },

  me() {
    return api.get<AuthIdentity>(endpoints.auth.me())
  },

  /** Logout selalu 200 selama payload lolos schema; token client tetap dibersihkan. */
  async logout() {
    const refreshToken = tokenStore.refreshToken
    try {
      if (refreshToken) {
        await api.post<{ logged_out: boolean }>(
          endpoints.auth.logout(),
          { refresh_token: refreshToken },
          { auth: false, skipRefresh: true },
        )
      }
    } finally {
      tokenStore.clear()
    }
  },

  refresh() {
    return api.refreshSession()
  },
}
