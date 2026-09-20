import { ref, shallowRef } from 'vue'
import { mastersApi, type MasterKey } from '@/api/modules/masters'
import type { SelectOption } from '@/components/ui/AppSelect.vue'
import { MAX_PAGE_LIMIT } from '@/config/env'
import { useAuthStore } from '@/stores/auth'

const cache = new Map<string, SelectOption[]>()

/**
 * Memuat opsi select dari master lain.
 *
 * Backend belum menyediakan pencarian pada endpoint master, sehingga opsi diambil
 * satu halaman penuh (limit maksimum 100) dan di-cache per kombinasi master/label.
 */
export function useReferenceOptions() {
  const auth = useAuthStore()
  const options = shallowRef<Record<string, SelectOption[]>>({})
  const loading = ref(false)

  async function load(
    master: MasterKey,
    valueKey: string,
    labelKey: string,
    filterActive = false,
    deviceType?: string,
  ): Promise<SelectOption[]> {
    const tenantKey = auth.identity?.tenant_id ?? 'anonymous'
    const cacheKey = `${tenantKey}:${master}:${valueKey}:${labelKey}:${filterActive}:${deviceType ?? ''}`
    if (cache.has(cacheKey)) {
      options.value = { ...options.value, [cacheKey]: cache.get(cacheKey)! }
      return cache.get(cacheKey)!
    }

    loading.value = true
    try {
      // Opsi dropdown cukup satu halaman kecil; hindari request besar pada backend lama.
      const page = await mastersApi[master].list({
        offset: 0,
        limit: Math.min(MAX_PAGE_LIMIT, 20),
        ...(deviceType ? { device_type: deviceType } : {}),
      })
      const rows = (page.items ?? []) as unknown as Record<string, unknown>[]
      const mapped = rows
        .filter((row) => (filterActive && 'status' in row ? row.status === 'ACTIVE' : true))
        .map((row) => ({
          value: String(row[valueKey] ?? ''),
          label: String(row[labelKey] ?? row[valueKey] ?? '—'),
        }))
      cache.set(cacheKey, mapped)
      options.value = { ...options.value, [cacheKey]: mapped }
      return mapped
    } catch {
      return []
    } finally {
      loading.value = false
    }
  }

  function invalidate(master?: MasterKey) {
    if (!master) return cache.clear()
    for (const key of [...cache.keys()]) {
      if (key.includes(`:${master}:`)) cache.delete(key)
    }
  }

  return { options, loading, load, invalidate }
}
