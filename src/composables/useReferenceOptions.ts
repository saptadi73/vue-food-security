import { ref, shallowRef } from 'vue'
import { mastersApi, type MasterKey } from '@/api/modules/masters'
import type { SelectOption } from '@/components/ui/AppSelect.vue'
import { MAX_PAGE_LIMIT } from '@/config/env'

const cache = new Map<string, SelectOption[]>()

/**
 * Memuat opsi select dari master lain.
 *
 * Backend belum menyediakan pencarian pada endpoint master, sehingga opsi diambil
 * satu halaman penuh (limit maksimum 100) dan di-cache per kombinasi master/label.
 */
export function useReferenceOptions() {
  const options = shallowRef<Record<string, SelectOption[]>>({})
  const loading = ref(false)

  async function load(
    master: MasterKey,
    valueKey: string,
    labelKey: string,
    filterActive = false,
  ): Promise<SelectOption[]> {
    const cacheKey = `${master}:${valueKey}:${labelKey}:${filterActive}`
    if (cache.has(cacheKey)) {
      options.value = { ...options.value, [cacheKey]: cache.get(cacheKey)! }
      return cache.get(cacheKey)!
    }

    loading.value = true
    try {
      const page = await mastersApi[master].list({ offset: 0, limit: MAX_PAGE_LIMIT })
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
      if (key.startsWith(`${master}:`)) cache.delete(key)
    }
  }

  return { options, loading, load, invalidate }
}
