<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useUiStore } from '@/stores/ui'
import { chartTheme, type ChartKind } from './chartTheme'

// ApexCharts hanya dimuat ketika halaman yang memiliki grafik benar-benar dibuka.
const VueApexCharts = defineAsyncComponent(() => import('vue3-apexcharts'))

const props = withDefaults(
  defineProps<{
    kind: ChartKind
    series: unknown
    categories?: (string | number)[]
    labels?: string[]
    height?: number | string
    colors?: string[]
    loading?: boolean
    /** Override opsi ApexCharts tambahan. */
    options?: Record<string, unknown>
    stacked?: boolean
    horizontal?: boolean
  }>(),
  { height: 300 },
)

const ui = useUiStore()

const isDark = computed(
  () =>
    ui.theme === 'dark' ||
    (ui.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches),
)

const chartOptions = computed(() =>
  chartTheme({
    kind: props.kind,
    dark: isDark.value,
    categories: props.categories,
    labels: props.labels,
    colors: props.colors,
    stacked: props.stacked,
    horizontal: props.horizontal,
    extra: props.options,
  }),
)
</script>

<template>
  <div class="relative w-full" :style="{ minHeight: `${height}px` }">
    <div
      v-if="loading"
      class="absolute inset-0 z-10 flex flex-col justify-end gap-2 rounded-xl p-2"
      aria-hidden="true"
    >
      <div class="flex h-full items-end gap-2">
        <div
          v-for="bar in 9"
          :key="bar"
          class="skeleton flex-1 rounded-t-lg"
          :style="{ height: `${25 + ((bar * 37) % 70)}%` }"
        />
      </div>
    </div>
    <VueApexCharts
      v-show="!loading"
      :type="kind"
      :height="height"
      :options="chartOptions"
      :series="series"
    />
  </div>
</template>
