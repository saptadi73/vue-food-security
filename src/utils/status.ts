export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'muted'

const TONE_BY_STATUS: Record<string, BadgeTone> = {
  ACTIVE: 'success',
  INACTIVE: 'muted',
  REGISTERED: 'info',
  OK: 'success',
  SAFE: 'success',
  WARNING: 'warning',
  CRITICAL: 'danger',
  EXPIRED: 'danger',
  HIGH: 'danger',
  LOW: 'warning',
  NO_DATA: 'muted',
  UNSUPPORTED_UNIT: 'warning',
  UNKNOWN: 'muted',
  CREATED: 'info',
  PACKAGED: 'brand',
  RELEASED: 'brand',
  IN_TRANSIT: 'info',
  DELIVERED: 'success',
  RECEIVED: 'success',
  CONSUMED: 'success',
  COMPLETED: 'success',
  DISCARDED: 'danger',
  RECALLED: 'danger',
  PENDING: 'warning',
  SENT: 'success',
  FAILED: 'danger',
  CANCELLED: 'muted',
  OPEN: 'warning',
  CLOSED: 'muted',
  ACKNOWLEDGED: 'info',
}

export function statusTone(status?: string | null): BadgeTone {
  if (!status) return 'neutral'
  return TONE_BY_STATUS[status.toUpperCase()] ?? 'neutral'
}

export const BADGE_CLASSES: Record<BadgeTone, string> = {
  neutral:
    'bg-surface-100 text-surface-700 ring-surface-200 dark:bg-surface-800 dark:text-surface-200 dark:ring-surface-700',
  muted:
    'bg-surface-100 text-surface-500 ring-surface-200 dark:bg-surface-850 dark:text-surface-400 dark:ring-surface-700',
  success:
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  warning:
    'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  danger:
    'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30',
  info: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
  brand:
    'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30',
}
