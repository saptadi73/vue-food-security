<script setup lang="ts">
import { Icon } from '@iconify/vue'

withDefaults(
  defineProps<{
    title: string
    description?: string
    icon?: string
    /** Label tag kecil di samping judul (mis. status kontrak endpoint). */
    tag?: string
  }>(),
  {},
)
</script>

<template>
  <div
    class="animate-fade-up mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between"
  >
    <div class="flex min-w-0 items-start gap-3.5">
      <span
        v-if="icon"
        class="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-brand-500/5 text-brand-600 ring-1 ring-brand-500/20 dark:text-brand-400"
      >
        <Icon :icon="icon" :width="22" :height="22" />
      </span>
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h1
            class="text-xl font-extrabold tracking-tight text-surface-900 sm:text-2xl dark:text-white"
          >
            {{ title }}
          </h1>
          <span
            v-if="tag"
            class="rounded-full bg-surface-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-surface-500 uppercase dark:bg-surface-800 dark:text-surface-400"
          >
            {{ tag }}
          </span>
        </div>
        <p
          v-if="description"
          class="text-balance mt-1 max-w-2xl text-sm text-surface-500 dark:text-surface-400"
        >
          {{ description }}
        </p>
      </div>
    </div>

    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
