<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'text' | 'title' | 'avatar' | 'block' | 'chip'
    lines?: number
    width?: string
    height?: string
    rounded?: string
  }>(),
  { variant: 'text', lines: 1 },
)

const PRESET = {
  text: 'h-3.5 w-full rounded-md',
  title: 'h-5 w-40 rounded-lg',
  avatar: 'size-10 rounded-full',
  block: 'h-24 w-full rounded-xl',
  chip: 'h-6 w-20 rounded-full',
} as const
</script>

<template>
  <div v-if="lines > 1" class="space-y-2" aria-hidden="true">
    <div
      v-for="line in lines"
      :key="line"
      class="skeleton"
      :class="[PRESET[variant], rounded]"
      :style="{ width: line === lines ? '70%' : width, height }"
    />
  </div>
  <div
    v-else
    class="skeleton"
    :class="[PRESET[variant], rounded]"
    :style="{ width, height }"
    aria-hidden="true"
  />
</template>
