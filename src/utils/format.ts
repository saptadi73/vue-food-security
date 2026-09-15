const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' })
const numberFormatter = new Intl.NumberFormat('id-ID')
const relativeFormatter = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' })

export function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date)
}

export function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.348],
  ['month', 12],
  ['year', Number.POSITIVE_INFINITY],
]

export function formatRelative(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  let delta = (date.getTime() - Date.now()) / 1000
  for (const [unit, step] of RELATIVE_STEPS) {
    if (Math.abs(delta) < step) return relativeFormatter.format(Math.round(delta), unit)
    delta /= step
  }
  return dateFormatter.format(date)
}

export function formatNumber(value?: number | string | null): string {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(numeric) ? numberFormatter.format(numeric) : String(value)
}

/** Decimal dari backend berupa string; tampilkan tanpa nol berlebih. */
export function formatDecimal(value?: string | number | null, maxFraction = 3): string {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: maxFraction }).format(numeric)
}

export function formatDuration(totalSeconds?: number | null): string {
  if (totalSeconds === null || totalSeconds === undefined) return '—'
  const seconds = Math.max(0, Math.trunc(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  if (hours > 0) return `${hours}j ${minutes}m`
  if (minutes > 0) return `${minutes}m ${rest}d`
  return `${rest}d`
}

/** UUID panjang dipersingkat untuk tabel; nilai penuh tetap ada di tooltip. */
export function shortId(value?: string | null, size = 8): string {
  if (!value) return '—'
  return value.length <= size * 2 ? value : `${value.slice(0, size)}…${value.slice(-4)}`
}

export function titleCase(value?: string | null): string {
  if (!value) return '—'
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(' ')
}

export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}
