import { computed, ref, watch } from 'vue'
import { ApiError, isApiError, type OffsetPage } from '@/api'
import { DEFAULT_PAGE_LIMIT } from '@/config/env'

export interface PaginatedOptions<T> {
  limit?: number
  immediate?: boolean
  /** Filter tambahan yang ikut dikirim ke server; perubahan mereset ke halaman 1. */
  filters?: () => Record<string, unknown>
  /** Pencarian sisi klien untuk endpoint yang belum mendukung query search. */
  searchFields?: (row: T) => string[]
  onError?: (error: ApiError) => void
}

/**
 * Pagination offset/limit sesuai kontrak backend (tanpa total_count).
 * Tombol "berikutnya" mengandalkan `next_offset` atau jumlah item < limit.
 */
export function usePaginatedList<T>(
  loader: (query: Record<string, unknown>, signal: AbortSignal) => Promise<OffsetPage<T>>,
  options: PaginatedOptions<T> = {},
) {
  const items = ref<T[]>([]) as { value: T[] }
  const offset = ref(0)
  const limit = ref(options.limit ?? DEFAULT_PAGE_LIMIT)
  const nextOffset = ref<number | null>(null)
  const loading = ref(false)
  const refreshing = ref(false)
  const loaded = ref(false)
  const error = ref<ApiError | null>(null)
  const search = ref('')

  let controller: AbortController | null = null

  const page = computed(() => Math.floor(offset.value / limit.value) + 1)
  const hasNext = computed(() => nextOffset.value !== null && nextOffset.value > offset.value)
  const hasPrev = computed(() => offset.value > 0)

  const visibleItems = computed(() => {
    const term = search.value.trim().toLowerCase()
    if (!term || !options.searchFields) return items.value
    return items.value.filter((row) =>
      options.searchFields!(row).some((field) =>
        String(field ?? '')
          .toLowerCase()
          .includes(term),
      ),
    )
  })

  const isEmpty = computed(() => loaded.value && visibleItems.value.length === 0)

  async function fetchPage(isRefresh = false) {
    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal

    if (isRefresh && loaded.value) refreshing.value = true
    else loading.value = true
    error.value = null

    try {
      const query = {
        offset: offset.value,
        limit: limit.value,
        ...(options.filters?.() ?? {}),
      }
      const result = await loader(query, signal)
      if (signal.aborted) return
      items.value = result.items ?? []
      // Backend tidak selalu mengirim next_offset; turunkan dari jumlah item.
      nextOffset.value =
        result.next_offset ??
        (result.items?.length === limit.value ? offset.value + limit.value : null)
      loaded.value = true
    } catch (cause) {
      if (signal.aborted) return
      const apiError = isApiError(cause)
        ? cause
        : new ApiError({ message: String(cause), kind: 'unknown' })
      if (apiError.kind === 'aborted') return
      error.value = apiError
      options.onError?.(apiError)
    } finally {
      loading.value = false
      refreshing.value = false
    }
  }

  function next() {
    if (!hasNext.value) return
    offset.value = nextOffset.value ?? offset.value + limit.value
    void fetchPage()
  }

  function prev() {
    if (!hasPrev.value) return
    offset.value = Math.max(0, offset.value - limit.value)
    void fetchPage()
  }

  function reset() {
    offset.value = 0
    void fetchPage()
  }

  watch(limit, () => reset())

  if (options.immediate !== false) void fetchPage()

  return {
    items,
    visibleItems,
    search,
    offset,
    limit,
    page,
    nextOffset,
    hasNext,
    hasPrev,
    loading,
    refreshing,
    loaded,
    isEmpty,
    error,
    fetchPage,
    refresh: () => fetchPage(true),
    next,
    prev,
    reset,
  }
}
