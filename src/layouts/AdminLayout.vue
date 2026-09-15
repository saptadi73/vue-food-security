<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useScrollLock } from '@vueuse/core'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import MobileTabBar from '@/components/layout/MobileTabBar.vue'
import ApiInspector from '@/components/layout/ApiInspector.vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const route = useRoute()
const locked = useScrollLock(document.body)

watch(
  () => ui.mobileNavOpen,
  (open) => (locked.value = open),
)
watch(
  () => route.fullPath,
  () => (ui.mobileNavOpen = false),
)
</script>

<template>
  <div class="flex min-h-dvh bg-surface-50 dark:bg-surface-950">
    <!-- Sidebar desktop -->
    <div
      class="sticky top-0 hidden h-dvh shrink-0 border-r border-surface-200 lg:block dark:border-surface-800"
    >
      <AppSidebar />
    </div>

    <!-- Drawer mobile -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-if="ui.mobileNavOpen"
          class="fixed inset-0 z-90 bg-surface-950/60 backdrop-blur-sm lg:hidden"
          @click="ui.mobileNavOpen = false"
        />
      </Transition>
      <Transition
        enter-active-class="transition duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]"
        enter-from-class="-translate-x-full"
        leave-active-class="transition duration-200 ease-in"
        leave-to-class="-translate-x-full"
      >
        <div
          v-if="ui.mobileNavOpen"
          class="fixed inset-y-0 left-0 z-95 shadow-float lg:hidden"
          role="dialog"
          aria-label="Menu navigasi"
        >
          <AppSidebar mobile @navigate="ui.mobileNavOpen = false" />
        </div>
      </Transition>
    </Teleport>

    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopbar />

      <main class="flex-1 px-3 pt-4 pb-24 sm:px-5 sm:pb-8 lg:px-7">
        <RouterView v-slot="{ Component, route: current }">
          <Transition
            mode="out-in"
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-2"
            leave-active-class="transition duration-100 ease-in"
            leave-to-class="opacity-0"
          >
            <component :is="Component" :key="current.path" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <MobileTabBar />
    <ApiInspector />
  </div>
</template>
