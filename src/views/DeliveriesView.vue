<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { fsos } from '@/api'
import type { DeliveryDetail } from '@/api/modules/operations'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { useReferenceOptions } from '@/composables/useReferenceOptions'
import { shortId, formatDateTime } from '@/utils/format'

const router = useRouter()
const references = useReferenceOptions()
const viewBy = ref<'vehicle' | 'school'>('vehicle')
const selectedId = ref<string | null>(null)
const options = ref<SelectOption[]>([])
const loadingOptions = ref(false)

const columns: TableColumn<DeliveryDetail>[] = [
  { key: 'delivery_id', label: 'Delivery', mono: true },
  { key: 'vehicle', label: 'Armada', mono: true },
  { key: 'driver', label: 'Pengemudi', mono: true, hideBelow: 'md' },
  { key: 'departure_time', label: 'Berangkat', hideBelow: 'lg' },
  { key: 'status', label: 'Status', align: 'center' },
]

const list = usePaginatedList<DeliveryDetail>(
  async (query) => {
    const page = await fsos.operations.deliveries.list({
      ...query,
      status: 'IN_TRANSIT',
      vehicle: viewBy.value === 'vehicle' ? selectedId.value ?? undefined : undefined,
    })
    let items = await Promise.all(page.items.map((item) => fsos.operations.deliveries.detail(item.delivery_id)))
    if (viewBy.value === 'school' && selectedId.value) {
      items = items.filter((item) => item.items.some((entry) => entry.school_id === selectedId.value))
    }
    return { ...page, items }
  },
  { searchFields: (row) => [row.delivery_id, row.vehicle, row.driver] },
)

async function loadOptions() {
  loadingOptions.value = true
  try {
    const master = viewBy.value === 'vehicle' ? 'vehicles' : 'schools'
    const valueKey = viewBy.value === 'vehicle' ? 'vehicle_id' : 'school_id'
    const labelKey = viewBy.value === 'vehicle' ? 'plate_number' : 'school_name'
    options.value = [{ value: null, label: viewBy.value === 'vehicle' ? 'Semua armada' : 'Semua sekolah' }, ...await references.load(master, valueKey, labelKey, true)]
  } finally {
    loadingOptions.value = false
  }
}

async function reload() {
  await loadOptions()
  list.reset()
}

watch(viewBy, () => { selectedId.value = null; void reload() })
watch(selectedId, () => list.reset())
onMounted(() => void reload())
</script>

<template>
  <div>
    <PageHeader title="Pengiriman Aktif" description="Pantau armada yang sedang mengirim makanan berdasarkan armada atau tujuan sekolah." icon="lucide:truck" tag="Delivery.Read" />
    <AppCard class="mb-4" title="Filter pengiriman" icon="lucide:filter">
      <div class="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        <AppSelect v-model="viewBy" label="Kelompokkan berdasarkan" :options="[{ value: 'vehicle', label: 'Armada' }, { value: 'school', label: 'Tujuan sekolah' } as SelectOption]" />
        <AppSelect v-model="selectedId" :label="viewBy === 'vehicle' ? 'Armada' : 'Sekolah'" :options="options" :disabled="loadingOptions" />
      </div>
    </AppCard>
    <DataTable :columns="columns" :rows="list.visibleItems.value" row-key="delivery_id" :loading="list.loading.value" :refreshing="list.refreshing.value" :error="list.error.value" :pagination="{ page: list.page.value, offset: list.offset.value, hasNext: list.hasNext.value, hasPrev: list.hasPrev.value }" @next="list.next()" @prev="list.prev()" @refresh="list.refresh()" @retry="list.fetchPage()">
      <template #cell-delivery_id="{ value }"><span class="font-mono text-xs">{{ shortId(String(value)) }}</span></template>
      <template #cell-vehicle="{ value }"><span class="font-mono text-xs">{{ shortId(String(value)) }}</span></template>
      <template #cell-driver="{ value }"><span class="font-mono text-xs">{{ shortId(String(value)) }}</span></template>
      <template #cell-departure_time="{ value }">{{ value ? formatDateTime(String(value)) : '—' }}</template>
      <template #cell-status="{ value }"><AppBadge :status="String(value)" /></template>
      <template #actions="{ row }"><AppButton size="sm" icon="lucide:map" @click="router.push({ path: '/deliveries/tracking', query: { delivery: row.delivery_id } })">Cek live tracking</AppButton></template>
    </DataTable>
  </div>
</template>
