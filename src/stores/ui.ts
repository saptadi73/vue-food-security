import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_KEY = 'fsos.ui.theme'
const SIDEBAR_KEY = 'fsos.ui.sidebar-collapsed'

function readStored<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) ?? fallback
  } catch {
    return fallback
  }
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<ThemeMode>(readStored<ThemeMode>(THEME_KEY, 'dark'))
  const sidebarCollapsed = ref(readStored<string>(SIDEBAR_KEY, 'false') === 'true')
  const mobileNavOpen = ref(false)
  const commandPaletteOpen = ref(false)
  const apiInspectorOpen = ref(false)

  const media = window.matchMedia('(prefers-color-scheme: dark)')

  function applyTheme() {
    const isDark = theme.value === 'dark' || (theme.value === 'system' && media.matches)
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  }

  function setTheme(next: ThemeMode) {
    theme.value = next
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      /* storage tidak tersedia */
    }
    applyTheme()
  }

  function cycleTheme() {
    const order: ThemeMode[] = ['light', 'dark', 'system']
    setTheme(order[(order.indexOf(theme.value) + 1) % order.length]!)
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  watch(sidebarCollapsed, (value) => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(value))
    } catch {
      /* storage tidak tersedia */
    }
  })

  media.addEventListener('change', () => {
    if (theme.value === 'system') applyTheme()
  })
  applyTheme()

  return {
    theme,
    sidebarCollapsed,
    mobileNavOpen,
    commandPaletteOpen,
    apiInspectorOpen,
    setTheme,
    cycleTheme,
    applyTheme,
    toggleSidebar,
  }
})
