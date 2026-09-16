<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import QrCodeView from '@/components/qr/QrCodeView.vue'
import ReceivingFormModal from '@/components/receiving/ReceivingFormModal.vue'
import { fsos } from '@/api'
import type { RawMaterialBatchData, ReceivingData, ReceivingDetail } from '@/api/modules/operations'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, shortId } from '@/utils/format'

const toast = useToastStore()
const activeTab = ref<'receivings' | 'batches'>('receivings')
const createOpen = ref(false)
const detailOpen = ref(false)
const detail = ref<ReceivingDetail | null>(null)
const detailLoading = ref(false)
const processing = ref(false)
const decisions = ref<Record<string, boolean>>({})
const status = ref<string | null>('ACCEPTED')
const qrTarget = ref<RawMaterialBatchData | null>(null)

const statusOptions: SelectOption[] = [
  { value: 'ACCEPTED', label: 'Diterima (ACCEPTED)' },
  { value: 'CREATED', label: 'Draft (CREATED)' },
  { value: 'REJECTED', label: 'Ditolak (REJECTED)' },
  { value: 'CANCELLED', label: 'Dibatalkan (CANCELLED)' },
  { value: null, label: 'Semua status' },
]

const receivingColumns: TableColumn<ReceivingData>[] = [
  { key: 'receiving_id', label: 'Penerimaan', mono: true },
  { key: 'received_at', label: 'Waktu diterima' },
  { key: 'supplier_id', label: 'Pemasok', mono: true, hideBelow: 'md' },
  { key: 'kitchen_id', label: 'Dapur', mono: true, hideBelow: 'lg' },
  { key: 'status', label: 'Status', align: 'center' },
]

const batchColumns: TableColumn<RawMaterialBatchData>[] = [
  { key: 'batch_code', label: 'Kode batch', mono: true },
  { key: 'raw_material_id', label: 'Bahan', mono: true, hideBelow: 'md' },
  { key: 'expired_date', label: 'Kedaluwarsa', hideBelow: 'lg' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'qr_code', label: 'QR', align: 'center' },
]

const receivingList = usePaginatedList<ReceivingData>(
  (query) => fsos.operations.receivings.list(query),
  { searchFields: (row) => [row.receiving_id, row.supplier_id, row.kitchen_id, row.status] },
)

const batchList = usePaginatedList<RawMaterialBatchData>(
  (query) => fsos.operations.rawMaterialBatches.list({
    ...query,
    status: (status.value as RawMaterialBatchData['status'] | null) ?? undefined,
    sort: 'FEFO',
  }),
  { searchFields: (row) => [row.batch_code, row.raw_material_id, row.qr_code ?? ''] },
)

function refreshAll() {
  receivingList.reset()
  batchList.reset()
}

async function showDetail(row: ReceivingData) {
  detailOpen.value = true
  detailLoading.value = true
  detail.value = null
  try {
    const result = await fsos.operations.receivings.detail(row.receiving_id)
    detail.value = result
    decisions.value = Object.fromEntries(result.items.map((item) => [item.receiving_item_id, item.accepted ?? true]))
  } catch (error) {
    toast.fromError(error, 'Gagal memuat detail penerimaan')
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

async function completeReceiving() {
  if (!detail.value || processing.value) return
  processing.value = true
  try {
    await fsos.operations.receivings.complete(detail.value.receiving_id, {
      expected_version: detail.value.version,
      items: detail.value.items.map((item) => ({
        receiving_item_id: item.receiving_item_id,
        accepted: decisions.value[item.receiving_item_id] ?? false,
      })),
    })
    toast.success('Penerimaan diselesaikan', { description: 'Status batch diperbarui sesuai hasil inspeksi.' })
    detailOpen.value = false
    refreshAll()
  } catch (error) {
    toast.fromError(error, 'Gagal menyelesaikan penerimaan')
  } finally {
    processing.value = false
  }
}

async function cancelReceiving() {
  if (!detail.value || processing.value) return
  if (!window.confirm('Batalkan draft ini? Data tetap disimpan sebagai jejak audit dan tidak dapat dibuka kembali.')) return
  processing.value = true
  try {
    await fsos.operations.receivings.cancel(detail.value.receiving_id, detail.value.version)
    toast.success('Penerimaan dibatalkan')
    detailOpen.value = false
    refreshAll()
  } catch (error) {
    toast.fromError(error, 'Gagal membatalkan penerimaan')
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader title="Penerimaan Bahan" description="Buat transaksi penerimaan, lakukan inspeksi, lalu cetak label QR batch bahan." icon="lucide:package-check" tag="Receiving.Write">
      <template #actions>
        <AppButton icon="lucide:package-plus" @click="createOpen = true">Penerimaan baru</AppButton>
      </template>
    </PageHeader>

    <div class="mb-4 flex gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-850">
      <button type="button" class="flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition" :class="activeTab === 'receivings' ? 'bg-white text-brand-600 shadow-soft dark:bg-surface-700 dark:text-brand-300' : 'text-surface-500'" @click="activeTab = 'receivings'">Transaksi penerimaan</button>
      <button type="button" class="flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition" :class="activeTab === 'batches' ? 'bg-white text-brand-600 shadow-soft dark:bg-surface-700 dark:text-brand-300' : 'text-surface-500'" @click="activeTab = 'batches'">Batch & label QR</button>
    </div>

    <DataTable
      v-if="activeTab === 'receivings'"
      v-model:search="receivingList.search.value"
      v-model:limit="receivingList.limit.value"
      :columns="receivingColumns" :rows="receivingList.visibleItems.value" row-key="receiving_id"
      :loading="receivingList.loading.value" :refreshing="receivingList.refreshing.value" :error="receivingList.error.value"
      searchable search-placeholder="Cari transaksi penerimaan…"
      :empty="{ icon: 'lucide:package-plus', title: 'Belum ada penerimaan', description: 'Buat transaksi penerimaan bahan pertama.', actionLabel: 'Penerimaan baru' }"
      :pagination="{ page: receivingList.page.value, offset: receivingList.offset.value, hasNext: receivingList.hasNext.value, hasPrev: receivingList.hasPrev.value }"
      @empty-action="createOpen = true" @next="receivingList.next()" @prev="receivingList.prev()" @refresh="receivingList.refresh()" @retry="receivingList.fetchPage()"
    >
      <template #cell-receiving_id="{ value }"><span :title="String(value)" class="font-mono text-xs">{{ shortId(String(value)) }}</span></template>
      <template #cell-received_at="{ value }">{{ formatDateTime(String(value)) }}</template>
      <template #cell-supplier_id="{ value }">{{ shortId(String(value)) }}</template>
      <template #cell-kitchen_id="{ value }">{{ shortId(String(value)) }}</template>
      <template #cell-status="{ value }"><AppBadge :status="String(value)" /></template>
      <template #actions="{ row }"><AppButton size="sm" variant="outline" icon="lucide:clipboard-check" @click="showDetail(row)">{{ row.status === 'CREATED' ? 'Inspeksi' : 'Detail' }}</AppButton></template>
    </DataTable>

    <template v-else>
      <AppCard class="mb-4" title="Filter batch" icon="lucide:filter">
        <div class="max-w-sm"><AppSelect v-model="status" label="Status batch" :options="statusOptions" @update:model-value="batchList.reset()" /></div>
      </AppCard>
      <DataTable
        v-model:search="batchList.search.value" v-model:limit="batchList.limit.value"
        :columns="batchColumns" :rows="batchList.visibleItems.value" row-key="raw_material_batch_id"
        :loading="batchList.loading.value" :refreshing="batchList.refreshing.value" :error="batchList.error.value"
        searchable search-placeholder="Cari kode batch atau QR…"
        :empty="{ icon: 'lucide:package-check', title: 'Belum ada batch bahan', description: 'Batch akan muncul setelah transaksi penerimaan dibuat.' }"
        :pagination="{ page: batchList.page.value, offset: batchList.offset.value, hasNext: batchList.hasNext.value, hasPrev: batchList.hasPrev.value }"
        @next="batchList.next()" @prev="batchList.prev()" @refresh="batchList.refresh()" @retry="batchList.fetchPage()"
      >
        <template #cell-raw_material_id="{ value }"><span :title="String(value)" class="font-mono text-xs">{{ shortId(String(value)) }}</span></template>
        <template #cell-expired_date="{ value }">{{ value ? formatDateTime(String(value)) : '—' }}</template>
        <template #cell-status="{ value }"><AppBadge :status="String(value)" /></template>
        <template #cell-qr_code="{ row }">
          <span v-if="!row.qr_code" class="text-xs text-surface-400">Belum ada</span>
          <AppButton v-else size="sm" variant="outline" icon="lucide:qr-code" @click="qrTarget = row">Cetak QR</AppButton>
        </template>
      </DataTable>
    </template>

    <ReceivingFormModal v-model:open="createOpen" @saved="refreshAll" />

    <AppModal v-model:open="detailOpen" title="Inspeksi penerimaan" description="Tentukan batch yang diterima atau ditolak sebelum menyelesaikan transaksi." icon="lucide:clipboard-check" size="lg" :busy="processing">
      <div v-if="detailLoading" class="py-12 text-center text-sm text-surface-500">Memuat detail penerimaan…</div>
      <div v-else-if="detail" class="space-y-4">
        <div class="grid grid-cols-2 gap-3 rounded-xl bg-surface-50 p-4 text-sm dark:bg-surface-850">
          <div><p class="text-xs text-surface-500">Waktu diterima</p><p class="font-semibold">{{ formatDateTime(detail.received_at) }}</p></div>
          <div><p class="text-xs text-surface-500">Status</p><AppBadge :status="detail.status" /></div>
        </div>
        <div v-for="item in detail.items" :key="item.receiving_item_id" class="flex flex-col gap-3 rounded-xl border border-surface-200 p-4 sm:flex-row sm:items-center dark:border-surface-700">
          <div class="min-w-0 flex-1">
            <p class="font-mono text-sm font-bold">{{ item.batch.batch_code }}</p>
            <p class="mt-1 text-xs text-surface-500">{{ item.quantity }} {{ item.uom }} · {{ item.temperature ?? '—' }} °C · {{ item.condition ?? 'Tanpa catatan' }}</p>
          </div>
          <label v-if="detail.status === 'CREATED'" class="flex items-center gap-2 text-sm font-semibold">
            <input v-model="decisions[item.receiving_item_id]" type="checkbox" class="size-4 accent-brand-600" />
            {{ decisions[item.receiving_item_id] ? 'Terima' : 'Tolak' }}
          </label>
          <AppBadge v-else :status="item.batch.status" />
        </div>
      </div>
      <template v-if="detail?.status === 'CREATED'" #footer>
        <AppButton variant="danger" icon="lucide:ban" :disabled="processing" @click="cancelReceiving">Batalkan draft</AppButton>
        <AppButton icon="lucide:check-check" :loading="processing" @click="completeReceiving">Selesaikan inspeksi</AppButton>
      </template>
    </AppModal>

    <AppModal :open="qrTarget !== null" size="sm" title="QR bahan" icon="lucide:qr-code" @update:open="qrTarget = null">
      <div v-if="qrTarget" class="py-2"><QrCodeView :value="qrTarget.qr_code!" :caption="qrTarget.batch_code" :subcaption="`Bahan · ${shortId(qrTarget.raw_material_id)}`" :file-name="`qr-bahan-${qrTarget.batch_code}`" /></div>
    </AppModal>
  </div>
</template>
