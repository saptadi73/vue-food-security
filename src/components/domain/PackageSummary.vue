<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import type { PackageData } from '@/api/modules/operations'
import { formatDateTime, formatDecimal, formatDuration, shortId } from '@/utils/format'

const props = defineProps<{ item: PackageData }>()

const TIMER_TONE = {
  SAFE: { tone: 'success', icon: 'lucide:shield-check', bar: 'bg-emerald-500' },
  WARNING: { tone: 'warning', icon: 'lucide:triangle-alert', bar: 'bg-amber-500' },
  CRITICAL: { tone: 'danger', icon: 'lucide:flame', bar: 'bg-rose-500' },
  EXPIRED: { tone: 'danger', icon: 'lucide:clock-alert', bar: 'bg-rose-600' },
  DISCARD_RECOMMENDED: { tone: 'danger', icon: 'lucide:octagon-alert', bar: 'bg-rose-700' },
  UNKNOWN: { tone: 'muted', icon: 'lucide:circle-help', bar: 'bg-surface-400' },
} as const

const timer = computed(() => TIMER_TONE[props.item.timer_status] ?? TIMER_TONE.UNKNOWN)

/** Sisa waktu relatif terhadap maximum_minutes snapshot policy. */
const progress = computed(() => {
  const max = props.item.holding_policy?.maximum_minutes
  const remaining = props.item.remaining_minutes
  if (!max || remaining === null || remaining === undefined) return null
  return Math.max(0, Math.min(100, (remaining / max) * 100))
})

interface DetailRow {
  label: string
  value: string
  title?: string
  mono?: boolean
}

const detailRows = computed<DetailRow[]>(() => [
  {
    label: 'Package ID',
    value: shortId(props.item.package_id),
    title: props.item.package_id,
    mono: true,
  },
  {
    label: 'Batch produksi',
    value: shortId(props.item.production_batch_id),
    title: props.item.production_batch_id,
    mono: true,
  },
  {
    label: 'Suhu awal',
    value: props.item.initial_temperature ? `${props.item.initial_temperature} Â°C` : 'â€”',
  },
  { label: 'Mulai holding', value: formatDateTime(props.item.holding_started_at) },
  { label: 'Selesai holding', value: formatDateTime(props.item.holding_finished_at) },
  { label: 'Kategori', value: props.item.holding_policy?.food_category ?? 'â€”' },
])
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="font-mono text-lg font-extrabold text-surface-900 dark:text-white">
          {{ item.package_code }}
        </p>
        <p class="text-xs text-surface-500 dark:text-surface-400">
          Paket #{{ item.package_number }} Â· {{ formatDecimal(item.quantity) }} {{ item.uom ?? '' }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-1.5">
        <AppBadge :status="item.effective_status" />
        <AppBadge v-if="item.status !== item.effective_status" :status="item.status" tone="muted" />
      </div>
    </div>

    <!-- Timer holding -->
    <div
      class="rounded-xl border border-surface-200 p-3.5 dark:border-surface-800"
      :class="
        item.timer_status === 'EXPIRED'
          ? 'border-rose-300 bg-rose-50/60 dark:border-rose-500/40 dark:bg-rose-500/5'
          : ''
      "
    >
      <div class="flex items-center justify-between gap-3">
        <span class="flex items-center gap-2 text-sm font-bold">
          <Icon :icon="timer.icon" :width="17" :height="17" />
          Holding {{ item.timer_status }}
        </span>
        <span class="font-mono text-sm font-bold">
          {{ formatDuration(item.remaining_seconds) }}
        </span>
      </div>

      <div
        v-if="progress !== null"
        class="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800"
      >
        <div
          class="h-full rounded-full transition-[width] duration-500"
          :class="timer.bar"
          :style="{ width: `${progress}%` }"
        />
      </div>

      <p class="mt-2 text-[11px] text-surface-500 dark:text-surface-400">
        Kedaluwarsa {{ formatDateTime(item.expired_at) }} Â· dihitung
        {{ formatDateTime(item.calculated_at) }}
      </p>
    </div>

    <dl class="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
      <div
        v-for="entry in detailRows"
        :key="entry.label"
        class="flex items-center justify-between gap-3 border-b border-surface-100 py-1.5 dark:border-surface-800/60"
      >
        <dt class="shrink-0 text-surface-500 dark:text-surface-400">{{ entry.label }}</dt>
        <dd
          class="min-w-0 truncate text-right font-semibold text-surface-800 dark:text-surface-100"
          :class="entry.mono ? 'font-mono text-xs' : ''"
          :title="entry.title"
        >
          {{ entry.value }}
        </dd>
      </div>
    </dl>

    <div
      v-if="item.holding_policy"
      class="rounded-xl bg-surface-50 px-3.5 py-3 text-[11px] text-surface-500 dark:bg-surface-850 dark:text-surface-400"
    >
      Policy dibekukan saat alokasi pertama â€” warning
      {{ item.holding_policy.warning_minutes }}m, maksimum
      {{ item.holding_policy.maximum_minutes }}m, discard
      {{ item.holding_policy.discard_minutes }}m. Perubahan rule berikutnya tidak memperpanjang
      timer paket ini.
    </div>
  </div>
</template>

