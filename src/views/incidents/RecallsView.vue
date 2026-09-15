<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { fsos } from '@/api'
import type { RecallRecord } from '@/api/modules/incidents'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, shortId } from '@/utils/format'

const toast = useToastStore()
const confirm = useConfirm()

const columns: TableColumn[] = [
  { key: 'recall_id', label: 'Recall', mono: true },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'created_at', label: 'Dimulai', hideBelow: 'md' },
  { key: 'completed_at', label: 'Selesai', hideBelow: 'lg' },
]

const list = usePaginatedList<RecallRecord>((query) => fsos.recalls.list(query), {
  searchFields: (row) => [row.recall_id, String(row.status ?? '')],
})

async function execute(row: RecallRecord) {
  const ok = await confirm.destructive({
    title: 'Eksekusi recall',
    message:
      'Eksekusi menandai seluruh paket terdampak sebagai RECALLED dalam satu transaksi. Tindakan ini tidak memiliki operasi pembatalan.',
    details: [
      { label: 'Recall ID', value: row.recall_id },
      { label: 'Status', value: String(row.status ?? '—') },
    ],
    confirmationPhrase: row.recall_id.slice(0, 8),
    confirmLabel: 'Eksekusi recall',
  })
  if (!ok) return

  try {
    await fsos.recalls.execute(row.recall_id, {})
    toast.success('Recall dieksekusi')
    await list.refresh()
  } catch (error) {
    toast.fromError(error, 'Gagal mengeksekusi recall')
  }
}

async function close(row: RecallRecord) {
  const ok = await confirm.destructive({
    title: 'Tutup recall',
    message: 'Recall yang ditutup tidak dapat dibuka kembali melalui API.',
    details: [{ label: 'Recall ID', value: row.recall_id }],
    confirmationPhrase: row.recall_id.slice(0, 8),
    confirmLabel: 'Tutup recall',
  })
  if (!ok) return

  try {
    await fsos.recalls.close(row.recall_id, {})
    toast.success('Recall ditutup')
    await list.refresh()
  } catch (error) {
    toast.fromError(error, 'Gagal menutup recall')
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Recall"
      description="Penarikan batch produksi: mulai, eksekusi paket terdampak, bukti penarikan fisik dan penutupan."
      icon="lucide:undo-2"
      tag="Recall.Read"
    />

    <DataTable
      v-model:search="list.search.value"
      v-model:limit="list.limit.value"
      :columns="columns"
      :rows="list.visibleItems.value"
      row-key="recall_id"
      :loading="list.loading.value"
      :refreshing="list.refreshing.value"
      :error="list.error.value"
      searchable
      search-placeholder="Cari recall…"
      :empty="{
        icon: 'lucide:shield-check',
        title: 'Tidak ada recall',
        description: 'Belum ada penarikan produk pada tenant ini.',
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
      <template #cell-recall_id="{ value }">
        <span :title="String(value)">{{ shortId(String(value)) }}</span>
      </template>
      <template #cell-status="{ value }"><AppBadge :status="String(value ?? '')" /></template>
      <template #cell-created_at="{ value }">{{ formatDateTime(value as string) }}</template>
      <template #cell-completed_at="{ value }">{{ formatDateTime(value as string) }}</template>

      <template #actions="{ row }">
        <div class="flex justify-end gap-1.5">
          <AppButton
            size="xs"
            variant="outline"
            icon="lucide:play"
            :disabled="Boolean(row.completed_at)"
            @click="execute(row)"
          >
            Eksekusi
          </AppButton>
          <AppButton
            size="xs"
            variant="ghost"
            icon="lucide:check"
            :disabled="Boolean(row.completed_at)"
            @click="close(row)"
          >
            Tutup
          </AppButton>
        </div>
      </template>
    </DataTable>
  </div>
</template>
