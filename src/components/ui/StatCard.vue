<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { formatNumber } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    label: string
    value?: number | string | null
    icon?: string
    hint?: string
    tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
    loading?: boolean
    /** Perubahan relatif dalam persen, opsional. */
    delta?: number | null
  }>(),
  { tone: 'brand' },
)

const TONES = {
  brand: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  neutral: 'bg-surface-500/10 text-surface-600 dark:text-surface-300',
}

const display = computed(() =>
  typeof props.value === 'number' ? formatNumber(props.value) : (props.value ?? '—'),
)
</script>

<template>
  <div
    class="card-surface animate-fade-up group relative overflow-hidden p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float sm:p-5"
  >
    <div
      class="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
      :class="TONES[tone]"
    />

    <div class="flex items-start justify-between gap-3">
      <p
        class="text-xs font-semibold tracking-wide text-surface-500 uppercase dark:text-surface-400"
      >
        {{ label }}
      </p>
      <span
        v-if="icon"
        class="grid size-9 shrink-0 place-items-center rounded-xl"
        :class="TONES[tone]"
      >
        <Icon :icon="icon" :width="18" :height="18" />
      </span>
    </div>

    <div class="mt-3">
      <div v-if="loading" class="skeleton h-8 w-24" />
      <p
        v-else
        class="text-2xl font-extrabold tracking-tight text-surface-900 sm:text-3xl dark:text-white"
      >
        {{ display }}
      </p>
    </div>

    <div class="mt-1.5 flex items-center gap-2">
      <span
        v-if="delta !== null && delta !== undefined && !loading"
        class="inline-flex items-center gap-0.5 text-xs font-bold"
        :class="
          delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        "
      >
        <Icon
          :icon="delta >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'"
          :width="13"
          :height="13"
        />
        {{ Math.abs(delta) }}%
      </span>
      <p v-if="hint" class="truncate text-xs text-surface-500 dark:text-surface-400">{{ hint }}</p>
    </div>
  </div>
</template>
