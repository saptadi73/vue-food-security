<script setup lang="ts">
import { computed, useId } from 'vue'
import { Icon } from '@iconify/vue'

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    required?: boolean
    icon?: string
    type?: string
    placeholder?: string
    disabled?: boolean
    readonly?: boolean
    autocomplete?: string
    inputmode?: 'text' | 'numeric' | 'decimal' | 'email' | 'search' | 'tel' | 'url'
    min?: number | string
    max?: number | string
    step?: number | string
    maxlength?: number
  }>(),
  { type: 'text' },
)

const model = defineModel<string | number | null>()
const id = useId()
const describedBy = computed(() => (props.error || props.hint ? `${id}-desc` : undefined))
</script>

<template>
  <div class="w-full">
    <label
      v-if="label"
      :for="id"
      class="mb-1.5 block text-xs font-semibold text-surface-700 dark:text-surface-300"
    >
      {{ label }}
      <span v-if="required" class="text-rose-500">*</span>
    </label>

    <div class="relative">
      <Icon
        v-if="icon"
        :icon="icon"
        :width="16"
        :height="16"
        class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-surface-400"
      />
      <input
        :id="id"
        v-model="model"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :min="min"
        :max="max"
        :step="step"
        :maxlength="maxlength"
        :aria-invalid="Boolean(error) || undefined"
        :aria-describedby="describedBy"
        class="input-base"
        :class="[
          icon ? 'pl-9' : '',
          error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : '',
        ]"
      />
      <slot name="suffix" />
    </div>

    <p
      v-if="error || hint"
      :id="`${id}-desc`"
      class="mt-1.5 flex items-start gap-1 text-xs"
      :class="error ? 'text-rose-600 dark:text-rose-400' : 'text-surface-500 dark:text-surface-400'"
    >
      <Icon
        v-if="error"
        icon="lucide:circle-alert"
        :width="13"
        :height="13"
        class="mt-0.5 shrink-0"
      />
      {{ error || hint }}
    </p>
  </div>
</template>
