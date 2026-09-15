import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ConfirmTone = 'danger' | 'warning' | 'primary'

export interface ConfirmRequest {
  title: string
  message: string
  /** Detail tambahan yang ditampilkan sebagai daftar ringkas. */
  details?: { label: string; value: string }[]
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
  /**
   * Konfirmasi ganda: pengguna harus mengetik ulang teks ini sebelum tombol aktif.
   * Dipakai untuk aksi destruktif (delete master, recall, discard).
   */
  confirmationPhrase?: string
  /** Checkbox pernyataan yang wajib dicentang. */
  acknowledgement?: string
}

interface InternalState extends ConfirmRequest {
  open: boolean
  busy: boolean
}

export const useConfirmStore = defineStore('confirm', () => {
  const state = ref<InternalState>({
    open: false,
    busy: false,
    title: '',
    message: '',
  })

  let resolver: ((value: boolean) => void) | null = null

  function ask(request: ConfirmRequest): Promise<boolean> {
    state.value = { ...request, open: true, busy: false }
    return new Promise<boolean>((resolve) => {
      resolver = resolve
    })
  }

  function settle(result: boolean) {
    state.value = { ...state.value, open: false, busy: false }
    resolver?.(result)
    resolver = null
  }

  return {
    state,
    ask,
    confirm: () => settle(true),
    cancel: () => settle(false),
    setBusy: (value: boolean) => {
      state.value = { ...state.value, busy: value }
    },
  }
})
