<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import StatCard from '@/components/ui/StatCard.vue'
import BaseChart from '@/components/charts/BaseChart.vue'
import { fsos } from '@/api'
import type { StorageTemperatureItem } from '@/api/modules/dashboard'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { formatDateTime } from '@/utils/format'

const LIVE_INTERVAL_MS = 5_000
const lastSyncedAt = ref<Date | null>(null)

const columns: TableColumn<StorageTemperatureItem>[] = [
  { key: 'storage_name', label: 'Penyimpanan' },
  { key: 'storage_type', label: 'Tipe', hideBelow: 'md' },
  { key: 'temperature', label: 'Suhu', align: 'right' },
  { key: 'range', label: 'Ambang', align: 'right', hideBelow: 'md' },
  { key: 'recorded_at', label: 'Direkam', align: 'right', hideBelow: 'lg' },
  { key: 'status', label: 'Status', align: 'center' },
]

const list = usePaginatedList<StorageTemperatureItem>(
  async (query) => {
    const result = await fsos.dashboard.storageTemperatures(query)
    lastSyncedAt.value = new Date()
    return result
  },
  { searchFields: (row) => [row.storage_name, row.storage_type, row.status] },
)

const visibility = useDocumentVisibility()
const {
  pause: pauseLive,
  resume: resumeLive,
  isActive: liveActive,
} = useIntervalFn(() => {
  if (!list.loading.value && !list.refreshing.value) void list.refresh()
}, LIVE_INTERVAL_MS)

watch(visibility, (state) => {
  if (state === 'visible') {
    void list.refresh()
    resumeLive()
  } else {
    pauseLive()
  }
})

const liveStatus = computed(() => {
  if (list.error.value) return { label: 'Koneksi terganggu', tone: 'bg-rose-500' }
  if (list.loading.value || list.refreshing.value)
    return { label: 'Menyinkronkan', tone: 'bg-amber-400' }
  if (!liveActive.value) return { label: 'Live dijeda', tone: 'bg-surface-400' }
  return { label: 'Live · 5 detik', tone: 'bg-emerald-500' }
})

const lastSyncedLabel = computed(() =>
  lastSyncedAt.value
    ? `Terakhir ${lastSyncedAt.value.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}`
    : 'Menunggu data backend',
)

const summary = computed(() => {
  const rows = list.items.value
  return {
    total: rows.length,
    ok: rows.filter((row) => row.status === 'OK').length,
    outOfRange: rows.filter((row) => row.status === 'HIGH' || row.status === 'LOW').length,
    noData: rows.filter((row) => row.status === 'NO_DATA').length,
  }
})

function gaugePosition(row: StorageTemperatureItem) {
  const temperature = Number(row.temperature)
  const minimum = Number(row.temperature_min)
  const maximum = Number(row.temperature_max)
  if (![temperature, minimum, maximum].every(Number.isFinite) || maximum <= minimum) return 0
  return Math.min(100, Math.max(0, ((temperature - minimum) / (maximum - minimum)) * 100))
}

function gaugeColor(status: StorageTemperatureItem['status']) {
  if (status === 'OK') return '#10b981'
  if (status === 'HIGH') return '#f43f5e'
  if (status === 'LOW') return '#0ea5e9'
  return '#64748b'
}

function displayUnit(unit: string | null) {
  return unit?.toUpperCase() === 'C' ? '°C' : (unit ?? '')
}

function gaugeOptions(row: StorageTemperatureItem) {
  const temperature =
    row.temperature === null
      ? '—'
      : Number(row.temperature).toLocaleString('id-ID', {
          maximumFractionDigits: 2,
        })
  return {
    chart: { background: 'transparent', sparkline: { enabled: true } },
    plotOptions: {
      radialBar: {
        startAngle: -112,
        endAngle: 112,
        hollow: { size: '62%' },
        track: {
          background: 'rgba(100, 116, 139, 0.14)',
          strokeWidth: '100%',
          margin: 2,
        },
        dataLabels: {
          name: {
            show: true,
            offsetY: 24,
            fontSize: '11px',
            fontWeight: 700,
          },
          value: {
            show: true,
            offsetY: -10,
            fontSize: '24px',
            fontWeight: 800,
            formatter: () => `${temperature}${displayUnit(row.unit)}`,
          },
        },
      },
    },
    fill: { type: 'solid' },
    stroke: { lineCap: 'round' },
    labels: [row.status === 'OK' ? 'DALAM AMBANG' : row.status.replace('_', ' ')],
    tooltip: { enabled: false },
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Monitor Suhu Penyimpanan"
      description="Sampel temperature_log terbaru per storage aktif. Status dihitung backend terhadap ambang storage; sampel non-Celsius tidak dibandingkan."
      icon="lucide:thermometer"
      tag="Dashboard.Read"
    />

    <div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Storage terpantau"
        :value="summary.total"
        icon="lucide:warehouse"
        :loading="list.loading.value"
      />
      <StatCard
        label="Dalam batas"
        :value="summary.ok"
        icon="lucide:shield-check"
        tone="success"
        :loading="list.loading.value"
      />
      <StatCard
        label="Di luar batas"
        :value="summary.outOfRange"
        icon="lucide:thermometer-sun"
        tone="danger"
        :loading="list.loading.value"
      />
      <StatCard
        label="Tanpa data"
        :value="summary.noData"
        icon="lucide:circle-off"
        tone="neutral"
        :loading="list.loading.value"
      />
    </div>

    <section class="mb-4" aria-labelledby="temperature-gauges-title">
      <div class="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2
            id="temperature-gauges-title"
            class="text-sm font-bold text-surface-900 dark:text-white"
          >
            Kondisi real-time
          </h2>
          <p class="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
            Posisi gauge terhadap ambang setiap penyimpanan
          </p>
        </div>
        <div class="shrink-0 text-right">
          <div
            class="flex items-center justify-end gap-2 text-xs font-bold text-surface-700 dark:text-surface-200"
          >
            <span
              class="size-2 rounded-full"
              :class="[liveStatus.tone, liveActive && !list.error.value ? 'animate-pulse' : '']"
            />
            {{ liveStatus.label }}
          </div>
          <p class="mt-1 text-[10px] font-medium text-surface-400">{{ lastSyncedLabel }}</p>
        </div>
      </div>

      <div v-if="list.loading.value" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div v-for="item in 3" :key="item" class="card-surface h-64 animate-pulse" />
      </div>
      <div
        v-else-if="list.visibleItems.value.length"
        class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        <article
          v-for="row in list.visibleItems.value"
          :key="row.storage_id"
          class="card-surface animate-fade-up overflow-hidden px-4 pt-4 pb-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="truncate text-sm font-bold text-surface-900 dark:text-white">
                {{ row.storage_name }}
              </h3>
              <p class="mt-0.5 truncate text-[11px] font-semibold text-surface-400 uppercase">
                {{ row.storage_type }}
              </p>
            </div>
            <AppBadge :status="row.status" dot />
          </div>

          <BaseChart
            kind="radialBar"
            :series="[gaugePosition(row)]"
            :height="170"
            :colors="[gaugeColor(row.status)]"
            :options="gaugeOptions(row)"
          />

          <div
            class="-mt-2 grid grid-cols-2 divide-x divide-surface-200 border-t border-surface-200 pt-3 dark:divide-surface-800 dark:border-surface-800"
          >
            <div class="pr-3">
              <p class="text-[10px] font-bold text-surface-400 uppercase">Ambang aman</p>
              <p class="mt-1 font-mono text-xs font-bold text-surface-700 dark:text-surface-200">
                {{ row.temperature_min ?? '—' }} – {{ row.temperature_max ?? '—' }}
                {{ displayUnit(row.unit) }}
              </p>
            </div>
            <div class="pl-3 text-right">
              <p class="text-[10px] font-bold text-surface-400 uppercase">Pembaruan</p>
              <p class="mt-1 truncate text-xs font-semibold text-surface-700 dark:text-surface-200">
                {{ row.recorded_at ? formatDateTime(row.recorded_at) : 'Belum ada data' }}
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>

    <DataTable
      v-model:search="list.search.value"
      v-model:limit="list.limit.value"
      :columns="columns"
      :rows="list.visibleItems.value"
      row-key="storage_id"
      :loading="list.loading.value"
      :refreshing="list.refreshing.value"
      :error="list.error.value"
      searchable
      search-placeholder="Cari penyimpanan…"
      :empty="{ icon: 'lucide:thermometer', title: 'Belum ada storage aktif' }"
      :pagination="{
        page: list.page.value,
        offset: list.offset.value,
        hasNext: list.hasNext.value,
        hasPrev: list.hasPrev.value,
      }"
      @next="list.next()"
      @prev="list.prev()"
      @refresh="list.refresh()"
      @retry="list.fetchPage()"
    >
      <template #cell-temperature="{ row }">
        <span class="font-mono font-bold">
          {{ row.temperature ?? '—'
          }}<span class="text-xs text-surface-400">{{ row.unit ?? '' }}</span>
        </span>
      </template>
      <template #cell-range="{ row }">
        <span class="font-mono text-xs text-surface-400">
          {{ row.temperature_min ?? '—' }} … {{ row.temperature_max ?? '—' }}
        </span>
      </template>
      <template #cell-recorded_at="{ value }">{{ formatDateTime(value as string) }}</template>
      <template #cell-status="{ value }"><AppBadge :status="String(value)" /></template>
    </DataTable>
  </div>
</template>
