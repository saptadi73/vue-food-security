<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useScrollLock } from '@vueuse/core'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    icon?: string
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    /** Cegah penutupan tidak sengaja saat proses berjalan. */
    persistent?: boolean
    busy?: boolean
  }>(),
  { size: 'md' },
)

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
const isLocked = useScrollLock(document.body)

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  full: 'sm:max-w-[min(90rem,95vw)]',
} as const

function close() {
  if (props.persistent || props.busy) return
  open.value = false
  emit('close')
}

watch(
  open,
  async (value) => {
    isLocked.value = value
    if (!value) return
    await nextTick()
    // Fokus masuk ke panel agar pembaca layar dan keyboard mengikuti dialog.
    panel.value?.focus()
  },
  { immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-100 flex items-end justify-center overflow-y-auto bg-surface-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
        role="presentation"
      >
        <Transition
          appear
          enter-active-class="transition duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]"
          enter-from-class="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <div
            v-if="open"
            ref="panel"
            tabindex="-1"
            role="dialog"
            aria-modal="true"
            :aria-label="title"
            class="flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-float outline-none sm:rounded-2xl dark:bg-surface-900"
            :class="SIZES[size]"
          >
            <div
              class="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-surface-300 sm:hidden dark:bg-surface-700"
            />

            <header
              v-if="title || $slots.header"
              class="flex items-start gap-3 px-5 pt-4 pb-3 sm:px-6 sm:pt-5"
            >
              <slot name="header">
                <span
                  v-if="icon"
                  class="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400"
                >
                  <Icon :icon="icon" :width="20" :height="20" />
                </span>
                <div class="min-w-0 flex-1">
                  <h2 class="text-base font-bold text-surface-900 dark:text-white">{{ title }}</h2>
                  <p v-if="description" class="mt-1 text-sm text-surface-500 dark:text-surface-400">
                    {{ description }}
                  </p>
                </div>
              </slot>
              <button
                v-if="!persistent"
                type="button"
                class="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-lg text-surface-400 transition hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-white"
                aria-label="Tutup dialog"
                :disabled="busy"
                @click="close"
              >
                <Icon icon="lucide:x" :width="18" :height="18" />
              </button>
            </header>

            <div class="min-h-0 flex-1 overflow-y-auto px-5 py-2 sm:px-6">
              <slot />
            </div>

            <footer
              v-if="$slots.footer"
              class="safe-bottom flex flex-col-reverse gap-2 border-t border-surface-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6 dark:border-surface-800"
            >
              <slot name="footer" />
            </footer>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
