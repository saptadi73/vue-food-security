import { useConfirmStore, type ConfirmRequest } from '@/stores/confirm'

/**
 * Konfirmasi ganda global.
 *
 * ```ts
 * const confirm = useConfirm()
 * const ok = await confirm.destructive({
 *   title: 'Hapus dapur',
 *   message: 'Soft delete tidak dapat dibatalkan dari UI.',
 *   confirmationPhrase: kitchen.kitchen_code,
 * })
 * ```
 */
export function useConfirm() {
  const store = useConfirmStore()

  return {
    ask: (request: ConfirmRequest) => store.ask(request),

    destructive: (request: Omit<ConfirmRequest, 'tone'>) =>
      store.ask({
        confirmLabel: 'Ya, lanjutkan',
        cancelLabel: 'Batal',
        acknowledgement: 'Saya memahami konsekuensi tindakan ini.',
        ...request,
        tone: 'danger',
      }),

    caution: (request: Omit<ConfirmRequest, 'tone'>) =>
      store.ask({ confirmLabel: 'Lanjutkan', cancelLabel: 'Batal', ...request, tone: 'warning' }),
  }
}
