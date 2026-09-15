<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { RouterLink, useRoute } from 'vue-router'
import { mobileQuickNav } from '@/config/navigation'

const route = useRoute()

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <nav
    class="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-surface-200 bg-white/95 backdrop-blur-lg lg:hidden dark:border-surface-800 dark:bg-surface-900/95"
    aria-label="Navigasi cepat"
  >
    <ul class="grid grid-cols-5">
      <li v-for="item in mobileQuickNav" :key="item.to">
        <RouterLink
          :to="item.to"
          class="no-tap-highlight flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition-colors"
          :class="isActive(item.to) ? 'text-brand-600 dark:text-brand-400' : 'text-surface-400'"
        >
          <span
            class="grid size-9 place-items-center rounded-xl transition-all duration-200"
            :class="isActive(item.to) ? 'bg-brand-500/12 scale-105' : ''"
          >
            <Icon :icon="item.icon" :width="19" :height="19" />
          </span>
          {{ item.label }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
