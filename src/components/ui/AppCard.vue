<script setup lang="ts">
import { Icon } from '@iconify/vue'

withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    icon?: string
    /** Hilangkan padding isi untuk konten penuh seperti tabel/chart. */
    flush?: boolean
    loading?: boolean
    interactive?: boolean
  }>(),
  {},
)
</script>

<template>
  <section
    class="card-surface animate-fade-up flex flex-col overflow-hidden transition-all duration-200"
    :class="interactive ? 'hover:-translate-y-0.5 hover:shadow-float' : ''"
  >
    <header
      v-if="title || $slots.header || $slots.actions"
      class="flex flex-wrap items-start justify-between gap-3 border-b border-surface-200/70 px-4 py-3.5 sm:px-5 dark:border-surface-800"
    >
      <slot name="header">
        <div class="flex min-w-0 items-center gap-3">
          <span
            v-if="icon"
            class="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400"
          >
            <Icon :icon="icon" :width="18" :height="18" />
          </span>
          <div class="min-w-0">
            <h2 class="truncate text-sm font-bold text-surface-900 sm:text-base dark:text-white">
              {{ title }}
            </h2>
            <p
              v-if="subtitle"
              class="mt-0.5 truncate text-xs text-surface-500 dark:text-surface-400"
            >
              {{ subtitle }}
            </p>
          </div>
        </div>
      </slot>
      <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </header>

    <div :class="flush ? '' : 'p-4 sm:p-5'" class="flex-1">
      <div v-if="loading" class="space-y-3">
        <div class="skeleton h-4 w-2/5" />
        <div class="skeleton h-4 w-4/5" />
        <div class="skeleton h-4 w-3/5" />
      </div>
      <slot v-else />
    </div>

    <footer
      v-if="$slots.footer"
      class="border-t border-surface-200/70 px-4 py-3 sm:px-5 dark:border-surface-800"
    >
      <slot name="footer" />
    </footer>
  </section>
</template>
