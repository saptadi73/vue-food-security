<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { BADGE_CLASSES, statusTone, type BadgeTone } from '@/utils/status'

const props = withDefaults(
  defineProps<{
    label?: string
    tone?: BadgeTone
    /** Turunkan tone otomatis dari nilai status backend. */
    status?: string | null
    icon?: string
    dot?: boolean
    size?: 'sm' | 'md'
  }>(),
  { size: 'sm' },
)

const tone = computed<BadgeTone>(() => props.tone ?? statusTone(props.status))
const text = computed(() => props.label ?? props.status ?? '')
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset whitespace-nowrap"
    :class="[
      BADGE_CLASSES[tone],
      size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
    ]"
  >
    <span v-if="dot" class="size-1.5 rounded-full bg-current opacity-80" />
    <Icon v-if="icon" :icon="icon" :width="13" :height="13" />
    <slot>{{ text }}</slot>
  </span>
</template>
