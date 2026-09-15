<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { fsos } from '@/api'
import type { DeviceSessionRecord } from '@/api/modules/telemetry'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, shortId } from '@/utils/format'

const toast = useToastStore()
const confirm = useConfirm()

const columns: TableColumn[] = [
  { key: 'session_id', label: 'Sesi', mono: true },
  { key: 'device_id', label: 'Perangkat', mono: true, hideBelow: 'md' },
  { key: 'connected_at', label: 'Terhubung' },
  { key: 'disconnected_at', label: 'Terputus', hideBelow: 'md' },
  { key: 'state', label: 'Status', align: 'center' },
]

const list = usePaginatedList<DeviceSessionRecord>((query) => fsos.deviceSessions.list(query), {
  searchFields: (row) => [row.session_id, String(row.device_id ?? '')],
})

async function endSession(row: DeviceSessionRecord) {
  const ok = await confirm.destructive({
    title: 'Akhiri sesi perangkat',
    message:
      'Pencatatan akhir sesi bersifat append-only dan tidak dapat dibatalkan. Tidak ada operasi reconnect melalui API.',
    details: [{ label: 'Session ID', value: row.session_id }],
    confirmationPhrase: row.session_id.slice(0, 8),
    confirmLabel: 'Akhiri sesi',
  })
  if (!ok) return

  try {
    await fsos.deviceSessions.end(row.session_id, new Date().toISOString())
    toast.success('Sesi ditutup')
    await list.refresh()
  } catch (error) {
    toast.fromError(error, 'Gagal menutup sesi')
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Sesi Perangkat"
      description="Riwayat koneksi perangkat IoT. Berbeda dari CRUD device: API tidak menyediakan create/delete sesi."
      icon="lucide:radio"
      tag="DeviceSession.Read"
    />

    <DataTable
      v-model:search="list.search.value"
      v-model:limit="list.limit.value"
      :columns="columns"
      :rows="list.visibleItems.value"
      row-key="session_id"
      :loading="list.loading.value"
      :refreshing="list.refreshing.value"
      :error="list.error.value"
      searchable
      search-placeholder="Cari sesi…"
      :empty="{ icon: 'lucide:radio', title: 'Belum ada sesi perangkat' }"
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
      <template #cell-session_id="{ value }">
        <span :title="String(value)">{{ shortId(String(value)) }}</span>
      </template>
      <template #cell-device_id="{ value }">
        <span :title="String(value)">{{ shortId(String(value)) }}</span>
      </template>
      <template #cell-connected_at="{ value }">{{ formatDateTime(value as string) }}</template>
      <template #cell-disconnected_at="{ value }">{{ formatDateTime(value as string) }}</template>
      <template #cell-state="{ row }">
        <AppBadge :status="row.disconnected_at ? 'CLOSED' : 'ACTIVE'" dot />
      </template>

      <template #actions="{ row }">
        <AppButton
          size="xs"
          variant="outline"
          icon="lucide:power"
          :disabled="Boolean(row.disconnected_at)"
          @click="endSession(row)"
        >
          Akhiri
        </AppButton>
      </template>
    </DataTable>
  </div>
</template>
