import { ref, shallowRef } from 'vue'
import { ApiError, isApiError } from '@/api'

export interface AsyncDataOptions<T> {
  immediate?: boolean
  initialValue?: T | null
  onError?: (error: ApiError) => void
}

/**
 * Pembungkus request tunggal dengan state loading/error/refreshing yang konsisten.
 * `refresh()` tidak mengosongkan data sehingga skeleton hanya tampil pada load pertama.
 */
export function useAsyncData<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  options: AsyncDataOptions<T> = {},
) {
  const data = shallowRef<T | null>(options.initialValue ?? null)
  const error = ref<ApiError | null>(null)
  const loading = ref(false)
  const refreshing = ref(false)
  const loaded = ref(false)

  let controller: AbortController | null = null

  async function execute(isRefresh = false) {
    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal

    if (isRefresh && loaded.value) refreshing.value = true
    else loading.value = true
    error.value = null

    try {
      const result = await loader(signal)
      if (signal.aborted) return null
      data.value = result
      loaded.value = true
      return result
    } catch (cause) {
      if (signal.aborted) return null
      const apiError = isApiError(cause)
        ? cause
        : new ApiError({ message: String(cause), kind: 'unknown' })
      if (apiError.kind === 'aborted') return null
      error.value = apiError
      options.onError?.(apiError)
      return null
    } finally {
      loading.value = false
      refreshing.value = false
    }
  }

  if (options.immediate !== false) void execute()

  return {
    data,
    error,
    loading,
    refreshing,
    loaded,
    execute,
    refresh: () => execute(true),
    abort: () => controller?.abort(),
  }
}
