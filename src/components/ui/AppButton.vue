<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle' | 'outline'
type Size = 'xs' | 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    icon?: string
    iconRight?: string
    loading?: boolean
    disabled?: boolean
    block?: boolean
    type?: 'button' | 'submit' | 'reset'
    to?: RouteLocationRaw
    /** Label a11y ketika tombol hanya berisi ikon. */
    srLabel?: string
  }>(),
  { variant: 'primary', size: 'md', type: 'button' },
)

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-soft hover:bg-brand-500 active:bg-brand-700 focus-visible:outline-brand-500',
  secondary:
    'bg-surface-900 text-white hover:bg-surface-800 dark:bg-white dark:text-surface-900 dark:hover:bg-surface-100',
  outline:
    'border border-surface-300 bg-white text-surface-700 hover:border-brand-400 hover:text-brand-700 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200 dark:hover:border-brand-500 dark:hover:text-brand-300',
  subtle:
    'bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-200 dark:hover:bg-surface-700',
  ghost:
    'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-white',
  danger: 'bg-rose-600 text-white shadow-soft hover:bg-rose-500 active:bg-rose-700',
}

const SIZES: Record<Size, string> = {
  xs: 'h-8 gap-1.5 px-2.5 text-xs rounded-lg',
  sm: 'h-9 gap-1.5 px-3 text-sm rounded-lg',
  md: 'h-10 gap-2 px-4 text-sm rounded-xl',
  lg: 'h-12 gap-2.5 px-5 text-base rounded-xl',
}

const classes = computed(() => [
  'no-tap-highlight inline-flex shrink-0 items-center justify-center font-semibold transition-all duration-150',
  'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
  VARIANTS[props.variant],
  SIZES[props.size],
  props.block ? 'w-full' : '',
])

const iconSize = computed(() => (props.size === 'lg' ? 20 : props.size === 'xs' ? 14 : 16))
</script>

<template>
  <RouterLink v-if="to && !disabled && !loading" :to="to" :class="classes">
    <Icon v-if="icon" :icon="icon" :width="iconSize" :height="iconSize" />
    <slot />
    <Icon v-if="iconRight" :icon="iconRight" :width="iconSize" :height="iconSize" />
  </RouterLink>

  <button
    v-else
    :type="type"
    :class="classes"
    :disabled="disabled || loading"
    :aria-label="srLabel"
    :aria-busy="loading || undefined"
  >
    <Icon
      v-if="loading"
      icon="svg-spinners:ring-resize"
      :width="iconSize"
      :height="iconSize"
      aria-hidden="true"
    />
    <Icon v-else-if="icon" :icon="icon" :width="iconSize" :height="iconSize" aria-hidden="true" />
    <slot />
    <Icon
      v-if="iconRight && !loading"
      :icon="iconRight"
      :width="iconSize"
      :height="iconSize"
      aria-hidden="true"
    />
  </button>
</template>
