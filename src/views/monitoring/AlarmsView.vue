<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { fsos } from '@/api'
import type { AlarmRecord } from '@/api/modules/telemetry'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, shortId } from '@/utils/format'

const toast = useToastStore()
const confirm = useConfirm()

const columns: TableColumn[] = [
  { key: 'alarm_id', label: 'Alarm', mono: true },
  { key: 'severity', label: 'Severity', align: 'center' },
  { key: 'triggered_at', label: 'Terpicu', hideBelow: 'md' },
  { key: 'acknowledged_at', label: 'Acknowledged', hideBelow: 'lg' },
  { key: 'effective_status', label: 'Status', align: 'center' },
]

const list = usePaginatedList<AlarmRecord>((query) => fsos.alarms.list(query), {
  searchFields: (row) => [row.alarm_id, String(row.severity ?? ''), String(row.status ?? '')],
})

async function acknowledge(row: AlarmRecord) {
  const ok = await confirm.caution({
    title: 'Catat acknowledgment',
    message:
      'Acknowledgment bersifat append-only dan tidak dapat dibatalkan. Status efektif alarm dapat berubah setelah pencatatan.',
    details: [
      { label: 'Alarm ID', value: row.alarm_id },
      { label: 'Severity', value: String(row.severity ?? '—') },
    ],
    confirmLabel: 'Catat acknowledgment',
  })
  if (!ok) return

  try {
    await fsos.alarms.acknowledge(row.alarm_id)
    toast.success('Acknowledgment tercatat')
    await list.refresh()
  } catch (error) {
    toast.fromError(error, 'Gagal mencatat acknowledgment')
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Kejadian Alarm"
      description="Daftar alarm beserta status efektif. Kontrak tidak menyediakan create/update/delete bukti alarm."
      icon="lucide:siren"
      tag="Alarm.Read"
    />

    <DataTable
      v-model:search="list.search.value"
      v-model:limit="list.limit.value"
      :columns="columns"
      :rows="list.visibleItems.value"
      row-key="alarm_id"
      :loading="list.loading.value"
      :refreshing="list.refreshing.value"
      :error="list.error.value"
      searchable
      search-placeholder="Cari alarm…"
      :empty="{
        icon: 'lucide:bell-off',
        title: 'Tidak ada alarm',
        description: 'Belum ada kejadian alarm pada tenant ini.',
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
      <template #cell-alarm_id="{ value }">
        <span :title="String(value)">{{ shortId(String(value)) }}</span>
      </template>
      <template #cell-severity="{ value }"><AppBadge :status="String(value ?? '')" /></template>
      <template #cell-effective_status="{ row }">
        <AppBadge :status="String(row.effective_status ?? row.status ?? '')" />
      </template>
      <template #cell-triggered_at="{ value }">{{ formatDateTime(value as string) }}</template>
      <template #cell-acknowledged_at="{ value }">{{ formatDateTime(value as string) }}</template>

      <template #actions="{ row }">
        <AppButton
          size="xs"
          variant="outline"
          icon="lucide:check"
          :disabled="Boolean(row.acknowledged_at)"
          @click="acknowledge(row)"
        >
          Ack
        </AppButton>
      </template>
    </DataTable>
  </div>
</template>
