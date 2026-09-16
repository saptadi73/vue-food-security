/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ORIGIN?: string
  readonly VITE_API_PREFIX?: string
  readonly VITE_USE_PROXY?: string
  readonly VITE_API_TIMEOUT_MS?: string
  readonly VITE_DEFAULT_TENANT?: string
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'vue3-apexcharts' {
  import type { DefineComponent, Plugin } from 'vue'
  const VueApexCharts: DefineComponent<Record<string, unknown>> & Plugin
  export default VueApexCharts
}
