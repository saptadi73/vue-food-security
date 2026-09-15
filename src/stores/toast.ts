import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isApiError } from '@/api'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastAction {
  label: string
  handler: () => void
}

export interface ToastItem {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  /** Meta teknis (request_id) agar laporan bug mudah ditelusuri. */
  reference?: string
  duration: number
  action?: ToastAction
  createdAt: number
}

export interface ToastOptions {
  description?: string
  reference?: string
  duration?: number
  action?: ToastAction
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 3500,
  info: 4000,
  warning: 5500,
  error: 7000,
  loading: 0,
}

const MAX_VISIBLE = 5

export const useToastStore = defineStore('toast', () => {
  const items = ref<ToastItem[]>([])
  const timers = new Map<string, number>()

  function dismiss(id: string) {
    const timer = timers.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.delete(id)
    }
    items.value = items.value.filter((item) => item.id !== id)
  }

  function push(variant: ToastVariant, title: string, options: ToastOptions = {}): string {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
    const duration = options.duration ?? DEFAULT_DURATION[variant]
    const item: ToastItem = {
      id,
      variant,
      title,
      description: options.description,
      reference: options.reference,
      duration,
      action: options.action,
      createdAt: Date.now(),
    }
    items.value = [item, ...items.value].slice(0, MAX_VISIBLE)
    if (duration > 0) {
      timers.set(
        id,
        window.setTimeout(() => dismiss(id), duration),
      )
    }
    return id
  }

  /** Ubah toast loading menjadi hasil akhirnya tanpa menumpuk notifikasi. */
  function resolve(id: string, variant: ToastVariant, title: string, options: ToastOptions = {}) {
    dismiss(id)
    return push(variant, title, options)
  }

  /** Format baku error API: pesan ramah + request_id untuk penelusuran. */
  function fromError(error: unknown, fallbackTitle = 'Operasi gagal') {
    if (isApiError(error)) {
      if (error.kind === 'aborted') return ''
      return push('error', fallbackTitle, {
        description: error.displayMessage,
        reference: error.requestId ?? undefined,
      })
    }
    return push('error', fallbackTitle, {
      description: error instanceof Error ? error.message : String(error),
    })
  }

  return {
    items,
    push,
    dismiss,
    resolve,
    fromError,
    success: (title: string, options?: ToastOptions) => push('success', title, options),
    error: (title: string, options?: ToastOptions) => push('error', title, options),
    warning: (title: string, options?: ToastOptions) => push('warning', title, options),
    info: (title: string, options?: ToastOptions) => push('info', title, options),
    loading: (title: string, options?: ToastOptions) => push('loading', title, options),
    clear: () => {
      items.value.forEach((item) => dismiss(item.id))
    },
  }
})
