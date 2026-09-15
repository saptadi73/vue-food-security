<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import StatCard from '@/components/ui/StatCard.vue'
import { fsos } from '@/api'
import type { StorageTemperatureItem } from '@/api/modules/dashboard'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { formatDateTime } from '@/utils/format'

const columns: TableColumn<StorageTemperatureItem>[] = [
  { key: 'storage_name', label: 'Penyimpanan' },
  { key: 'storage_type', label: 'Tipe', hideBelow: 'md' },
  { key: 'temperature', label: 'Suhu', align: 'right' },
  { key: 'range', label: 'Ambang', align: 'right', hideBelow: 'md' },
  { key: 'recorded_at', label: 'Direkam', align: 'right', hideBelow: 'lg' },
  { key: 'status', label: 'Status', align: 'center' },
]

const list = usePaginatedList<StorageTemperatureItem>(
  (query) => fsos.dashboard.storageTemperatures(query),
  { searchFields: (row) => [row.storage_name, row.storage_type, row.status] },
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
