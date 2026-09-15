<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { fsos } from '@/api'
import type { NotificationRecord } from '@/api/modules/incidents'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, shortId } from '@/utils/format'

const toast = useToastStore()
const confirm = useConfirm()

const columns: TableColumn[] = [
  { key: 'notification_id', label: 'Notifikasi', mono: true },
  { key: 'channel', label: 'Kanal', align: 'center' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'created_at', label: 'Dibuat', align: 'right', hideBelow: 'md' },
]

const list = usePaginatedList<NotificationRecord>((query) => fsos.notifications.list(query), {
  searchFields: (row) => [row.notification_id, String(row.channel ?? ''), String(row.status ?? '')],
})

async function mark(row: NotificationRecord, outcome: 'sent' | 'failed') {
  const ok = await confirm.caution({
    title: outcome === 'sent' ? 'Tandai terkirim' : 'Tandai gagal',
    message:
      'Perubahan status outbox bersifat final untuk notifikasi tersebut dan tidak mengirim ulang pesan.',
    details: [
      { label: 'ID', value: row.notification_id },
      { label: 'Kanal', value: String(row.channel ?? '—') },
    ],
    confirmLabel: outcome === 'sent' ? 'Tandai terkirim' : 'Tandai gagal',
  })
  if (!ok) return

  try {
    if (outcome === 'sent') await fsos.notifications.markSent(row.notification_id)
    else await fsos.notifications.markFailed(row.notification_id)
    toast.success('Status notifikasi diperbarui')
    await list.refresh()
  } catch (error) {
    toast.fromError(error, 'Gagal memperbarui notifikasi')
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Notification Outbox"
      description="Antrian notifikasi per kanal. Pengiriman sebenarnya dilakukan worker backend, bukan frontend."
      icon="lucide:bell"
      tag="Notification.Read"
    />

    <DataTable
      v-model:search="list.search.value"
      v-model:limit="list.limit.value"
      :columns="columns"
      :rows="list.visibleItems.value"
      row-key="notification_id"
      :loading="list.loading.value"
      :refreshing="list.refreshing.value"
      :error="list.error.value"
      searchable
      search-placeholder="Cari notifikasi…"
      :empty="{ icon: 'lucide:bell-off', title: 'Outbox kosong' }"
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
      <template #cell-notification_id="{ value }">
        <span :title="String(value)">{{ shortId(String(value)) }}</span>
      </template>
      <template #cell-channel="{ value }">
        <AppBadge :label="String(value ?? '—')" tone="info" />
      </template>
      <template #cell-status="{ value }"><AppBadge :status="String(value ?? '')" /></template>
      <template #cell-created_at="{ value }">{{ formatDateTime(value as string) }}</template>

      <template #actions="{ row }">
        <div class="flex justify-end gap-1.5">
          <AppButton
            size="xs"
            variant="outline"
            icon="lucide:send"
            :disabled="row.status !== 'PENDING'"
            @click="mark(row, 'sent')"
          >
            Terkirim
          </AppButton>
          <AppButton
            size="xs"
            variant="ghost"
            icon="lucide:x"
            :disabled="row.status !== 'PENDING'"
            @click="mark(row, 'failed')"
          >
            Gagal
          </AppButton>
        </div>
      </template>
    </DataTable>
  </div>
</template>
