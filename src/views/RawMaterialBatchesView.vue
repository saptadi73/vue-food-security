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
import { fsos } from '@/api'
import type { RawMaterialBatchData } from '@/api/modules/operations'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { formatDateTime, shortId } from '@/utils/format'

const status = ref<string | null>('ACCEPTED')
const qrTarget = ref<RawMaterialBatchData | null>(null)
const statusOptions: SelectOption[] = [
  { value: 'ACCEPTED', label: 'Diterima (ACCEPTED)' },
  { value: 'CREATED', label: 'Draft (CREATED)' },
  { value: 'REJECTED', label: 'Ditolak (REJECTED)' },
  { value: 'CANCELLED', label: 'Dibatalkan (CANCELLED)' },
  { value: null, label: 'Semua status' },
]

const columns: TableColumn<RawMaterialBatchData>[] = [
  { key: 'batch_code', label: 'Kode batch', mono: true },
  { key: 'raw_material_id', label: 'Bahan', mono: true, hideBelow: 'md' },
  { key: 'expired_date', label: 'Kedaluwarsa', hideBelow: 'lg' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'qr_code', label: 'QR', align: 'center' },
]

const list = usePaginatedList<RawMaterialBatchData>(
  (query) =>
    fsos.operations.rawMaterialBatches.list({
      ...query,
      status: status.value ?? undefined,
      sort: 'FEFO',
    }),
  {
    searchFields: (row) => [row.batch_code, row.raw_material_id, row.qr_code ?? ''],
  },
)

function applyStatus() {
  list.reset()
}
</script>

<template>
  <div>
    <PageHeader
      title="Penerimaan Bahan"
      description="Lihat batch bahan yang diterima dan buat/cetak label QR untuk identifikasi stok."
      icon="lucide:package-check"
      tag="RawMaterialBatch.Read"
    />

    <AppCard class="mb-4" title="Filter batch" icon="lucide:filter">
      <div class="max-w-sm">
        <AppSelect
          v-model="status"
          label="Status batch"
          :options="statusOptions"
          @update:model-value="applyStatus"
        />
      </div>
    </AppCard>

    <DataTable
      v-model:search="list.search.value"
      v-model:limit="list.limit.value"
      :columns="columns"
      :rows="list.visibleItems.value"
      row-key="raw_material_batch_id"
      :loading="list.loading.value"
      :refreshing="list.refreshing.value"
      :error="list.error.value"
      searchable
      search-placeholder="Cari kode batch atau QR…"
      :empty="{
        icon: 'lucide:package-check',
        title: 'Belum ada batch bahan',
        description: 'Batch akan muncul setelah transaksi penerimaan dibuat.',
      }"
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
      <template #cell-raw_material_id="{ value }">
        <span :title="String(value)" class="font-mono text-xs">{{ shortId(String(value)) }}</span>
      </template>
      <template #cell-expired_date="{ value }">
        {{ value ? formatDateTime(String(value)) : '—' }}
      </template>
      <template #cell-status="{ value }">
        <AppBadge :status="String(value)" />
      </template>
      <template #cell-qr_code="{ row }">
        <span v-if="!row.qr_code" class="text-xs text-surface-400">Belum ada</span>
        <AppButton v-else size="sm" variant="outline" icon="lucide:qr-code" @click="qrTarget = row">
          Buat QR
        </AppButton>
      </template>
    </DataTable>

    <AppModal
      :open="qrTarget !== null"
      size="sm"
      title="QR bahan"
      icon="lucide:qr-code"
      @update:open="qrTarget = null"
    >
      <div v-if="qrTarget" class="py-2">
        <QrCodeView
          :value="qrTarget.qr_code!"
          :caption="qrTarget.batch_code"
          :subcaption="`Bahan · ${shortId(qrTarget.raw_material_id)}`"
          :file-name="`qr-bahan-${qrTarget.batch_code}`"
        />
      </div>
    </AppModal>
  </div>
</template>
