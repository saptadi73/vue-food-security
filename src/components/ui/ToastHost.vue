<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useToastStore, type ToastVariant } from '@/stores/toast'
import { copyToClipboard } from '@/utils/format'

const toast = useToastStore()

const STYLE: Record<ToastVariant, { icon: string; accent: string; iconClass: string }> = {
  success: {
    icon: 'lucide:circle-check',
    accent: 'bg-emerald-500',
    iconClass: 'text-emerald-500',
  },
  error: { icon: 'lucide:circle-x', accent: 'bg-rose-500', iconClass: 'text-rose-500' },
  warning: {
    icon: 'lucide:triangle-alert',
    accent: 'bg-amber-500',
    iconClass: 'text-amber-500',
  },
  info: { icon: 'lucide:info', accent: 'bg-sky-500', iconClass: 'text-sky-500' },
  loading: {
    icon: 'svg-spinners:ring-resize',
    accent: 'bg-brand-500',
    iconClass: 'text-brand-500',
  },
}

function runAction(item: { id: string; action?: { handler: () => void } }) {
  item.action?.handler()
  toast.dismiss(item.id)
}
</script>

<template>
  <Teleport to="body">
    <div
      class="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-200 flex flex-col items-center gap-2 p-3 sm:top-0 sm:bottom-auto sm:items-end sm:p-5"
      role="region"
      aria-live="polite"
      aria-label="Notifikasi"
    >
      <TransitionGroup
        enter-active-class="transition duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]"
        enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:translate-x-6 scale-95"
        leave-active-class="transition duration-150 ease-in absolute"
        leave-to-class="opacity-0 scale-95"
        move-class="transition duration-200"
      >
        <div
          v-for="item in toast.items"
          :key="item.id"
          class="pointer-events-auto flex w-full max-w-md gap-3 overflow-hidden rounded-2xl border border-surface-200 bg-white/95 p-3.5 shadow-float backdrop-blur-md dark:border-surface-700 dark:bg-surface-850/95"
        >
          <span
            class="w-1 shrink-0 self-stretch rounded-full"
            :class="STYLE[item.variant].accent"
          />
          <Icon
            :icon="STYLE[item.variant].icon"
            :width="20"
            :height="20"
            class="mt-0.5 shrink-0"
            :class="STYLE[item.variant].iconClass"
          />

          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-surface-900 dark:text-white">{{ item.title }}</p>
            <p
              v-if="item.description"
              class="mt-0.5 text-[13px] leading-snug text-surface-600 dark:text-surface-300"
            >
              {{ item.description }}
            </p>

            <div class="mt-2 flex flex-wrap items-center gap-3">
              <button
                v-if="item.action"
                type="button"
                class="text-xs font-bold text-brand-600 hover:underline dark:text-brand-400"
                @click="runAction(item)"
              >
                {{ item.action.label }}
              </button>
              <button
                v-if="item.reference"
                type="button"
                class="inline-flex items-center gap-1 font-mono text-[10px] text-surface-400 transition hover:text-surface-600 dark:hover:text-surface-200"
                title="Salin request ID untuk penelusuran"
                @click="copyToClipboard(item.reference)"
              >
                <Icon icon="lucide:copy" :width="11" :height="11" />
                {{ item.reference.slice(0, 8) }}
              </button>
            </div>
          </div>

          <button
            type="button"
            class="-mt-1 -mr-1 grid size-7 shrink-0 place-items-center self-start rounded-lg text-surface-400 transition hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800"
            aria-label="Tutup notifikasi"
            @click="toast.dismiss(item.id)"
          >
            <Icon icon="lucide:x" :width="14" :height="14" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
