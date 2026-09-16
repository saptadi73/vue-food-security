<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { RouterLink, useRoute } from 'vue-router'
import { navigation } from '@/config/navigation'
import { useUiStore } from '@/stores/ui'
import { env } from '@/config/env'

const props = defineProps<{ mobile?: boolean }>()
const emit = defineEmits<{ navigate: [] }>()

const ui = useUiStore()
const route = useRoute()

const collapsed = computed(() => !props.mobile && ui.sidebarCollapsed)
const filter = ref('')

const sections = computed(() => {
  const term = filter.value.trim().toLowerCase()
  if (!term) return navigation
  return navigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.label.toLowerCase().includes(term)),
    }))
    .filter((section) => section.items.length > 0)
})

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <aside
    class="flex h-full flex-col bg-white transition-[width] duration-250 dark:bg-surface-900"
    :class="collapsed ? 'w-[76px]' : 'w-[268px]'"
  >
    <!-- Brand -->
    <div class="flex h-16 shrink-0 items-center gap-3 px-4">
      <img
        src="/logo-fsos.png"
        alt="Logo Food Security"
        class="size-11 shrink-0 object-contain drop-shadow-md"
      />
      <div v-if="!collapsed" class="min-w-0 animate-fade-in">
        <p class="truncate text-sm font-extrabold tracking-tight text-surface-900 dark:text-white">
          {{ env.appName }}
        </p>
        <p class="truncate text-[11px] text-surface-500 dark:text-surface-400">
          Food Security & Traceability
        </p>
      </div>
    </div>

    <!-- Filter menu -->
    <div v-if="!collapsed" class="px-3 pb-2">
      <div class="relative">
        <Icon
          icon="lucide:search"
          :width="14"
          :height="14"
          class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-surface-400"
        />
        <input
          v-model="filter"
          type="search"
          placeholder="Cari menu…"
          class="h-9 w-full rounded-lg border border-surface-200 bg-surface-50 pr-3 pl-8 text-xs font-medium outline-none transition focus:border-brand-400 focus:bg-white dark:border-surface-800 dark:bg-surface-850 dark:focus:bg-surface-850"
        />
      </div>
    </div>

    <nav class="scroll-x min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Navigasi utama">
      <div v-for="section in sections" :key="section.title" class="mb-5 last:mb-0">
        <p
          v-if="!collapsed"
          class="mb-1.5 px-2.5 text-[10px] font-bold tracking-widest text-surface-400 uppercase dark:text-surface-500"
        >
          {{ section.title }}
        </p>
        <div v-else class="mx-auto mb-2 h-px w-8 bg-surface-200 dark:bg-surface-800" />

        <ul class="space-y-0.5">
          <li v-for="item in section.items" :key="item.to">
            <RouterLink
              :to="item.to"
              :title="collapsed ? item.label : undefined"
              class="group no-tap-highlight relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-semibold transition-all duration-150"
              :class="
                isActive(item.to)
                  ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300'
                  : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-850 dark:hover:text-white'
              "
              @click="emit('navigate')"
            >
              <span
                v-if="isActive(item.to)"
                class="absolute top-1/2 -left-3 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-500"
              />
              <Icon
                :icon="item.icon"
                :width="18"
                :height="18"
                class="shrink-0 transition-transform duration-150 group-hover:scale-110"
              />
              <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
            </RouterLink>
          </li>
        </ul>
      </div>

      <p v-if="sections.length === 0" class="px-3 py-6 text-center text-xs text-surface-400">
        Menu tidak ditemukan.
      </p>
    </nav>

    <div v-if="!mobile" class="shrink-0 border-t border-surface-200 p-3 dark:border-surface-800">
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-semibold text-surface-500 transition hover:bg-surface-100 hover:text-surface-800 dark:hover:bg-surface-850 dark:hover:text-white"
        @click="ui.toggleSidebar()"
      >
        <Icon
          :icon="collapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'"
          :width="18"
          :height="18"
          class="shrink-0"
        />
        <span v-if="!collapsed">Ciutkan menu</span>
      </button>
    </div>
  </aside>
</template>
