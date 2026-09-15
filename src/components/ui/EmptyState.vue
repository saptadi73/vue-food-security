<script setup lang="ts">
import { Icon } from '@iconify/vue'
import AppButton from './AppButton.vue'

withDefaults(
  defineProps<{
    icon?: string
    title?: string
    description?: string
    actionLabel?: string
    compact?: boolean
  }>(),
  { icon: 'lucide:inbox', title: 'Belum ada data' },
)

defineEmits<{ action: [] }>()
</script>

<template>
  <div
    class="animate-fade-in flex flex-col items-center justify-center text-center"
    :class="compact ? 'px-4 py-8' : 'px-6 py-14'"
  >
    <span
      class="mb-4 grid place-items-center rounded-2xl bg-surface-100 text-surface-400 dark:bg-surface-800 dark:text-surface-500"
      :class="compact ? 'size-12' : 'size-16'"
    >
      <Icon :icon="icon" :width="compact ? 22 : 28" :height="compact ? 22 : 28" />
    </span>
    <h3 class="text-sm font-bold text-surface-800 sm:text-base dark:text-surface-100">
      {{ title }}
    </h3>
    <p
      v-if="description"
      class="text-balance mt-1.5 max-w-sm text-sm text-surface-500 dark:text-surface-400"
    >
      {{ description }}
    </p>
    <div v-if="actionLabel || $slots.action" class="mt-5">
      <slot name="action">
        <AppButton size="sm" icon="lucide:plus" @click="$emit('action')">
          {{ actionLabel }}
        </AppButton>
      </slot>
    </div>
  </div>
</template>
