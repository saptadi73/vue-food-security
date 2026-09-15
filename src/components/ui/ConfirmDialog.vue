<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'
import { useConfirmStore } from '@/stores/confirm'

const store = useConfirmStore()

const typed = ref('')
const acknowledged = ref(false)

const state = computed(() => store.state)
const open = computed({
  get: () => state.value.open,
  set: (value: boolean) => {
    if (!value) store.cancel()
  },
})

const TONE = {
  danger: {
    icon: 'lucide:triangle-alert',
    ring: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    button: 'danger' as const,
  },
  warning: {
    icon: 'lucide:shield-alert',
    ring: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    button: 'primary' as const,
  },
  primary: {
    icon: 'lucide:circle-help',
    ring: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
    button: 'primary' as const,
  },
}

const tone = computed(() => TONE[state.value.tone ?? 'primary'])

const phraseOk = computed(
  () => !state.value.confirmationPhrase || typed.value.trim() === state.value.confirmationPhrase,
)
const ackOk = computed(() => !state.value.acknowledgement || acknowledged.value)
const canConfirm = computed(() => phraseOk.value && ackOk.value && !state.value.busy)

watch(
  () => state.value.open,
  (isOpen) => {
    if (isOpen) {
      typed.value = ''
      acknowledged.value = false
    }
  },
)
</script>

<template>
  <AppModal v-model:open="open" size="sm" :busy="state.busy">
    <template #header>
      <span class="grid size-11 shrink-0 place-items-center rounded-xl" :class="tone.ring">
        <Icon :icon="tone.icon" :width="22" :height="22" />
      </span>
      <div class="min-w-0 flex-1">
        <h2 class="text-base font-bold text-surface-900 dark:text-white">{{ state.title }}</h2>
      </div>
    </template>

    <div class="space-y-4 pb-2">
      <p class="text-sm leading-relaxed text-surface-600 dark:text-surface-300">
        {{ state.message }}
      </p>

      <dl
        v-if="state.details?.length"
        class="divide-y divide-surface-200 rounded-xl bg-surface-50 px-3.5 text-sm dark:divide-surface-800 dark:bg-surface-850"
      >
        <div v-for="item in state.details" :key="item.label" class="flex gap-3 py-2.5">
          <dt class="w-32 shrink-0 text-surface-500 dark:text-surface-400">{{ item.label }}</dt>
          <dd class="min-w-0 flex-1 truncate font-medium text-surface-800 dark:text-surface-100">
            {{ item.value }}
          </dd>
        </div>
      </dl>

      <!-- Konfirmasi ganda tahap 1: ketik ulang identitas data -->
      <div v-if="state.confirmationPhrase">
        <label class="mb-1.5 block text-xs font-semibold text-surface-700 dark:text-surface-300">
          Ketik
          <code
            class="rounded bg-surface-100 px-1.5 py-0.5 font-mono text-[11px] text-rose-600 dark:bg-surface-800 dark:text-rose-400"
            >{{ state.confirmationPhrase }}</code
          >
          untuk melanjutkan
        </label>
        <input
          v-model="typed"
          class="input-base font-mono"
          autocomplete="off"
          spellcheck="false"
          :placeholder="state.confirmationPhrase"
        />
      </div>

      <!-- Konfirmasi ganda tahap 2: pernyataan eksplisit -->
      <label
        v-if="state.acknowledgement"
        class="flex cursor-pointer items-start gap-2.5 rounded-xl border border-surface-200 p-3 text-sm transition hover:border-brand-400 dark:border-surface-800"
      >
        <input
          v-model="acknowledged"
          type="checkbox"
          class="mt-0.5 size-4 shrink-0 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
        />
        <span class="text-surface-600 dark:text-surface-300">{{ state.acknowledgement }}</span>
      </label>
    </div>

    <template #footer>
      <AppButton variant="subtle" :disabled="state.busy" @click="store.cancel()">
        {{ state.cancelLabel ?? 'Batal' }}
      </AppButton>
      <AppButton
        :variant="tone.button"
        :disabled="!canConfirm"
        :loading="state.busy"
        @click="store.confirm()"
      >
        {{ state.confirmLabel ?? 'Konfirmasi' }}
      </AppButton>
    </template>
  </AppModal>
</template>
