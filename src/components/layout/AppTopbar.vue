<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useRoute, useRouter } from 'vue-router'
import { onClickOutside } from '@vueuse/core'
import { apiTrace } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { navigation } from '@/config/navigation'
import { shortId } from '@/utils/format'

const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()
const confirm = useConfirm()
const toast = useToastStore()

const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
onClickOutside(menuRef, () => (menuOpen.value = false))

const currentTitle = computed(() => {
  const match = navigation
    .flatMap((section) => section.items)
    .find((item) => (item.to === '/' ? route.path === '/' : route.path.startsWith(item.to)))
  return (route.meta.title as string) ?? match?.label ?? 'FSTM'
})

const section = computed(
  () =>
    navigation.find((item) =>
      item.items.some((nav) =>
        nav.to === '/' ? route.path === '/' : route.path.startsWith(nav.to),
      ),
    )?.title ?? '',
)

const themeIcon = computed(
  () =>
    ({ light: 'lucide:sun', dark: 'lucide:moon', system: 'lucide:monitor' })[ui.theme] ??
    'lucide:sun',
)

const initials = computed(() => (auth.identity?.roles[0] ?? 'FS').slice(0, 2).toUpperCase())

async function logout() {
  const ok = await confirm.caution({
    title: 'Keluar dari sesi',
    message: 'Sesi akan dicabut di server dan token pada perangkat ini dibersihkan.',
  })
  if (!ok) return
  await auth.logout()
  toast.info('Anda telah keluar')
  void router.push({ name: 'login' })
}

function openInspector() {
  menuOpen.value = false
  ui.apiInspectorOpen = true
}

function requestLogout() {
  menuOpen.value = false
  void logout()
}
</script>

<template>
  <header
    class="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b border-surface-200 bg-white/85 px-3 backdrop-blur-lg sm:px-5 dark:border-surface-800 dark:bg-surface-900/85"
  >
    <button
      type="button"
      class="grid size-10 shrink-0 place-items-center rounded-xl text-surface-500 transition hover:bg-surface-100 lg:hidden dark:hover:bg-surface-800"
      aria-label="Buka menu"
      @click="ui.mobileNavOpen = true"
    >
      <Icon icon="lucide:menu" :width="20" :height="20" />
    </button>

    <div class="min-w-0 flex-1">
      <p
        v-if="section"
        class="hidden text-[11px] font-semibold tracking-wide text-surface-400 uppercase sm:block"
      >
        {{ section }}
      </p>
      <h1
        class="truncate text-base font-extrabold tracking-tight text-surface-900 sm:text-lg dark:text-white"
      >
        {{ currentTitle }}
      </h1>
    </div>

    <!-- Indikator request aktif: penelusuran cepat tanpa devtools -->
    <button
      type="button"
      class="hidden items-center gap-2 rounded-xl border border-surface-200 px-3 py-2 text-xs font-semibold text-surface-500 transition hover:border-brand-400 hover:text-brand-600 sm:inline-flex dark:border-surface-800"
      title="Inspektur API"
      @click="ui.apiInspectorOpen = true"
    >
      <Icon
        :icon="apiTrace.state.inFlight > 0 ? 'svg-spinners:ring-resize' : 'lucide:activity'"
        :width="15"
        :height="15"
        :class="apiTrace.state.inFlight > 0 ? 'text-brand-500' : ''"
      />
      API
      <span
        v-if="apiTrace.state.inFlight > 0"
        class="rounded-full bg-brand-500/15 px-1.5 text-[10px] text-brand-600 dark:text-brand-300"
      >
        {{ apiTrace.state.inFlight }}
      </span>
    </button>

    <button
      type="button"
      class="grid size-10 shrink-0 place-items-center rounded-xl text-surface-500 transition hover:bg-surface-100 dark:hover:bg-surface-800"
      :aria-label="`Tema: ${ui.theme}`"
      :title="`Tema: ${ui.theme}`"
      @click="ui.cycleTheme()"
    >
      <Icon :icon="themeIcon" :width="18" :height="18" />
    </button>

    <div ref="menuRef" class="relative shrink-0">
      <button
        type="button"
        class="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-surface-100 dark:hover:bg-surface-800"
        :aria-expanded="menuOpen"
        aria-haspopup="menu"
        @click="menuOpen = !menuOpen"
      >
        <span
          class="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-emerald-700 text-xs font-extrabold text-white"
        >
          {{ initials }}
        </span>
        <Icon
          icon="lucide:chevron-down"
          :width="14"
          :height="14"
          class="hidden text-surface-400 sm:block"
        />
      </button>

      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 -translate-y-1 scale-95"
        leave-active-class="transition duration-100 ease-in"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="menuOpen"
          class="absolute right-0 z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-float dark:border-surface-700 dark:bg-surface-850"
          role="menu"
        >
          <div class="border-b border-surface-200 p-4 dark:border-surface-700">
            <p class="text-sm font-bold text-surface-900 dark:text-white">
              {{ auth.identity?.roles.join(', ') || 'Tanpa role' }}
            </p>
            <dl class="mt-2 space-y-1 text-[11px] text-surface-500 dark:text-surface-400">
              <div class="flex justify-between gap-2">
                <dt>User</dt>
                <dd class="font-mono" :title="auth.identity?.user_id">
                  {{ shortId(auth.identity?.user_id) }}
                </dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt>Tenant</dt>
                <dd class="font-mono" :title="auth.identity?.tenant_id">
                  {{ shortId(auth.identity?.tenant_id) }}
                </dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt>Permission</dt>
                <dd>{{ auth.identity?.permissions.length ?? 0 }} aktif</dd>
              </div>
            </dl>
          </div>

          <button
            type="button"
            class="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-semibold text-surface-600 transition hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800"
            role="menuitem"
            @click="openInspector"
          >
            <Icon icon="lucide:activity" :width="16" :height="16" />
            Inspektur API
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-2.5 border-t border-surface-200 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-surface-700 dark:hover:bg-rose-500/10"
            role="menuitem"
            @click="requestLogout"
          >
            <Icon icon="lucide:log-out" :width="16" :height="16" />
            Keluar
          </button>
        </div>
      </Transition>
    </div>
  </header>
</template>
