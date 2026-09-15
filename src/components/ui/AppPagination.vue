<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { PAGE_LIMITS } from '@/config/env'

withDefaults(
  defineProps<{
    page: number
    offset: number
    count: number
    hasNext: boolean
    hasPrev: boolean
    loading?: boolean
  }>(),
  {},
)

const limit = defineModel<number>('limit', { required: true })
defineEmits<{ next: []; prev: [] }>()
</script>

<template>
  <div
    class="flex flex-col gap-3 border-t border-surface-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-surface-800"
  >
    <div class="flex items-center gap-3 text-xs text-surface-500 dark:text-surface-400">
      <span>
        Halaman <strong class="text-surface-800 dark:text-surface-100">{{ page }}</strong> ·
        menampilkan {{ count }} baris
      </span>
      <label class="hidden items-center gap-1.5 sm:flex">
        <span>Per halaman</span>
        <select
          v-model.number="limit"
          class="rounded-lg border border-surface-300 bg-white px-2 py-1 text-xs font-semibold dark:border-surface-700 dark:bg-surface-850"
        >
          <option v-for="option in PAGE_LIMITS" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>
    </div>

    <!-- Backend memakai offset/limit tanpa total_count, jadi navigasi hanya maju/mundur. -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-300 px-3 text-xs font-semibold transition hover:border-brand-400 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-40 dark:border-surface-700"
        :disabled="!hasPrev || loading"
        @click="$emit('prev')"
      >
        <Icon icon="lucide:chevron-left" :width="14" :height="14" />
        Sebelumnya
      </button>
      <button
        type="button"
        class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-surface-300 px-3 text-xs font-semibold transition hover:border-brand-400 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-40 dark:border-surface-700"
        :disabled="!hasNext || loading"
        @click="$emit('next')"
      >
        Berikutnya
        <Icon icon="lucide:chevron-right" :width="14" :height="14" />
      </button>
    </div>
  </div>
</template>
