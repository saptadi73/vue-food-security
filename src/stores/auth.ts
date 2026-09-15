import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fsos, isApiError, tokenStore } from '@/api'
import type { AuthIdentity, LoginPayload } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const identity = ref<AuthIdentity | null>(null)
  const status = ref<'idle' | 'loading' | 'authenticated' | 'anonymous'>('idle')
  const lastError = ref<string | null>(null)

  const isAuthenticated = computed(
    () => status.value === 'authenticated' && identity.value !== null,
  )
  const permissions = computed(() => new Set(identity.value?.permissions ?? []))
  const roles = computed(() => identity.value?.roles ?? [])

  /**
   * Cek permission sisi klien hanya untuk menyembunyikan menu/aksi.
   * Otorisasi sebenarnya tetap dilakukan server pada setiap request.
   */
  function can(permission: string | string[]): boolean {
    if (!identity.value) return false
    const needed = Array.isArray(permission) ? permission : [permission]
    return needed.some((item) => permissions.value.has(item))
  }

  async function login(payload: LoginPayload) {
    status.value = 'loading'
    lastError.value = null
    try {
      await fsos.auth.login(payload)
      identity.value = await fsos.auth.me()
      status.value = 'authenticated'
      return identity.value
    } catch (error) {
      status.value = 'anonymous'
      identity.value = null
      lastError.value = isApiError(error) ? error.displayMessage : 'Login gagal.'
      throw error
    }
  }

  /** Dipanggil router guard saat reload: pulihkan sesi dari refresh token. */
  async function restore() {
    if (status.value === 'authenticated') return true
    if (!tokenStore.hasSession) {
      status.value = 'anonymous'
      return false
    }
    status.value = 'loading'
    try {
      if (!tokenStore.hasFreshAccess) await fsos.auth.refresh()
      identity.value = await fsos.auth.me()
      status.value = 'authenticated'
      return true
    } catch {
      tokenStore.clear()
      identity.value = null
      status.value = 'anonymous'
      return false
    }
  }

  async function logout() {
    try {
      await fsos.auth.logout()
    } finally {
      identity.value = null
      status.value = 'anonymous'
    }
  }

  function markSessionExpired() {
    identity.value = null
    status.value = 'anonymous'
  }

  return {
    identity,
    status,
    lastError,
    isAuthenticated,
    roles,
    permissions,
    can,
    login,
    logout,
    restore,
    markSessionExpired,
  }
})
