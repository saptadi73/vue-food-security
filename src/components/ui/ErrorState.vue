<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import AppButton from './AppButton.vue'
import type { ApiError } from '@/api'
import { copyToClipboard } from '@/utils/format'

const props = defineProps<{ error: ApiError | null; compact?: boolean }>()
defineEmits<{ retry: [] }>()

const ICONS: Record<string, string> = {
  unauthorized: 'lucide:lock',
  forbidden: 'lucide:shield-x',
  not_found: 'lucide:search-x',
  network: 'lucide:wifi-off',
  timeout: 'lucide:timer-off',
  rate_limited: 'lucide:hourglass',
  unavailable: 'lucide:server-crash',
}

const icon = computed(() => ICONS[props.error?.kind ?? ''] ?? 'lucide:circle-alert')
const canRetry = computed(() =>
  ['network', 'timeout', 'server', 'unavailable', 'rate_limited', 'unknown'].includes(
    props.error?.kind ?? '',
  ),
)
</script>

<template>
  <div
    v-if="error"
    class="animate-fade-in flex flex-col items-center justify-center text-center"
    :class="compact ? 'px-4 py-8' : 'px-6 py-12'"
  >
    <span class="mb-4 grid size-14 place-items-center rounded-2xl bg-rose-500/10 text-rose-500">
      <Icon :icon="icon" :width="26" :height="26" />
    </span>
    <h3 class="text-sm font-bold text-surface-800 sm:text-base dark:text-surface-100">
      Gagal memuat data
    </h3>
    <p class="text-balance mt-1.5 max-w-md text-sm text-surface-500 dark:text-surface-400">
      {{ error.displayMessage }}
    </p>

    <ul
      v-if="error.errors.length"
      class="mt-3 max-w-md space-y-1 text-left text-xs text-surface-500 dark:text-surface-400"
    >
      <li v-for="item in error.errors" :key="item.field" class="font-mono">
        {{ item.field }}: {{ item.message }}
      </li>
    </ul>

    <div class="mt-5 flex flex-wrap items-center justify-center gap-2">
      <AppButton v-if="canRetry" size="sm" icon="lucide:rotate-cw" @click="$emit('retry')">
        Coba lagi
      </AppButton>
      <button
        v-if="error.requestId"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-surface-400 transition hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800"
        title="Salin request ID"
        @click="copyToClipboard(error.requestId!)"
      >
        <Icon icon="lucide:copy" :width="12" :height="12" />
        {{ error.requestId }}
      </button>
    </div>
  </div>
</template>
