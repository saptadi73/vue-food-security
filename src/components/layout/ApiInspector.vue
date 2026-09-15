<script setup lang="ts">
import { Icon } from '@iconify/vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { apiTrace } from '@/api'
import { useUiStore } from '@/stores/ui'
import { env } from '@/config/env'
import { copyToClipboard, formatRelative } from '@/utils/format'

const ui = useUiStore()

function statusTone(entry: { ok: boolean; status: number | null }) {
  if (entry.ok) return 'text-emerald-500'
  if (entry.status === null) return 'text-rose-500'
  return entry.status >= 500 ? 'text-rose-500' : 'text-amber-500'
}
</script>

<template>
  <AppModal
    :open="ui.apiInspectorOpen"
    size="xl"
    title="Inspektur API"
    description="Riwayat request terakhir beserta request_id untuk penelusuran ke log backend."
    icon="lucide:activity"
    @update:open="ui.apiInspectorOpen = $event"
  >
    <div
      class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-surface-50 px-3.5 py-2.5 font-mono text-[11px] text-surface-500 dark:bg-surface-850 dark:text-surface-400"
    >
      <span>base: {{ env.apiBase }}</span>
      <span>proxy: {{ env.useProxy ? 'aktif' : 'nonaktif' }}</span>
      <span>timeout: {{ env.requestTimeoutMs }}ms</span>
      <span>aktif: {{ apiTrace.state.inFlight }}</span>
    </div>

    <div v-if="apiTrace.state.entries.length === 0" class="py-10 text-center">
      <Icon icon="lucide:radio" :width="28" :height="28" class="mx-auto mb-2 text-surface-300" />
      <p class="text-sm text-surface-500">Belum ada request tercatat.</p>
    </div>

    <ul v-else class="divide-y divide-surface-200 dark:divide-surface-800">
      <li
        v-for="entry in apiTrace.state.entries"
        :key="entry.id"
        class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 font-mono text-[11px]"
      >
        <span class="w-14 shrink-0 font-bold" :class="statusTone(entry)">
          {{ entry.status ?? 'ERR' }}
        </span>
        <span class="w-12 shrink-0 font-bold text-surface-500">{{ entry.method }}</span>
        <span
          class="min-w-0 flex-1 truncate text-surface-700 dark:text-surface-200"
          :title="entry.path"
        >
          {{ entry.path }}
        </span>
        <span class="shrink-0 text-surface-400">{{ entry.durationMs }}ms</span>
        <span class="hidden shrink-0 text-surface-400 sm:inline">
          {{ formatRelative(new Date(entry.startedAt).toISOString()) }}
        </span>
        <button
          v-if="entry.requestId"
          type="button"
          class="shrink-0 text-surface-400 transition hover:text-brand-500"
          title="Salin request_id"
          @click="copyToClipboard(entry.requestId)"
        >
          <Icon icon="lucide:copy" :width="12" :height="12" />
        </button>
      </li>
    </ul>

    <template #footer>
      <AppButton variant="subtle" icon="lucide:trash-2" @click="apiTrace.clear()">
        Bersihkan
      </AppButton>
      <AppButton @click="ui.apiInspectorOpen = false">Tutup</AppButton>
    </template>
  </AppModal>
</template>
