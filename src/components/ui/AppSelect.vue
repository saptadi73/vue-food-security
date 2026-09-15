<script setup lang="ts">
import { useId } from 'vue'
import { Icon } from '@iconify/vue'

export interface SelectOption {
  value: string | number | null
  label: string
  disabled?: boolean
}

withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    required?: boolean
    disabled?: boolean
    placeholder?: string
    options: SelectOption[]
  }>(),
  { placeholder: 'Pilih…' },
)

const model = defineModel<string | number | null>()
const id = useId()
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
      <select
        :id="id"
        v-model="model"
        :disabled="disabled"
        :aria-invalid="Boolean(error) || undefined"
        class="input-base appearance-none pr-9"
        :class="error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : ''"
      >
        <option v-if="placeholder" :value="null" disabled>{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="String(option.value)"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>
      <Icon
        icon="lucide:chevron-down"
        :width="16"
        :height="16"
        class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-surface-400"
      />
    </div>

    <p
      v-if="error || hint"
      class="mt-1.5 text-xs"
      :class="error ? 'text-rose-600 dark:text-rose-400' : 'text-surface-500 dark:text-surface-400'"
    >
      {{ error || hint }}
    </p>
  </div>
</template>
