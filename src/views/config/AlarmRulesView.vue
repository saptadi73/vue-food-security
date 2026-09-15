<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { fsos } from '@/api'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, shortId } from '@/utils/format'

const toast = useToastStore()
const confirm = useConfirm()

const columns: TableColumn[] = [
  { key: 'rule_name', label: 'Nama rule' },
  { key: 'alarm_rule_id', label: 'ID', mono: true, hideBelow: 'lg' },
  { key: 'severity', label: 'Severity', align: 'center', hideBelow: 'md' },
  { key: 'enabled', label: 'Aktif', align: 'center' },
  { key: 'version', label: 'Ver', align: 'right', width: '64px' },
  { key: 'updated_at', label: 'Diperbarui', align: 'right', hideBelow: 'lg' },
]

const list = usePaginatedList<Record<string, unknown>>((query) => fsos.alarmRules.list(query), {
  searchFields: (row) => [String(row.rule_name ?? ''), String(row.severity ?? '')],
})

async function toggle(row: Record<string, unknown>) {
  const enabled = Boolean(row.enabled)
  const id = String(row.alarm_rule_id ?? row.rule_id)

  const ok = await confirm.caution({
    title: enabled ? 'Nonaktifkan alarm rule' : 'Aktifkan alarm rule',
    message: enabled
      ? 'Rule nonaktif tidak lagi dievaluasi. Alarm yang sudah tercatat tidak dihapus.'
      : 'Mengaktifkan rule mengubah konfigurasi evaluasi. Pastikan ambang sudah benar.',
    details: [
      { label: 'Rule', value: String(row.rule_name ?? id) },
      { label: 'expected_version', value: String(row.version) },
    ],
    confirmLabel: enabled ? 'Nonaktifkan' : 'Aktifkan',
  })
  if (!ok) return

  try {
    await fsos.alarmRules.setEnabled(id, !enabled, Number(row.version))
    toast.success(enabled ? 'Rule dinonaktifkan' : 'Rule diaktifkan')
    await list.refresh()
  } catch (error) {
    toast.fromError(error, 'Gagal mengubah status rule')
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Alarm Rule"
      description="Konfigurasi DSL v1 untuk alarm. Evaluator, simulasi dan executor masih dalam pengembangan backend."
      icon="lucide:bell-ring"
      tag="AlarmRule.Read"
    />

    <DataTable
      v-model:search="list.search.value"
      v-model:limit="list.limit.value"
      :columns="columns"
      :rows="list.visibleItems.value"
      row-key="alarm_rule_id"
      :loading="list.loading.value"
      :refreshing="list.refreshing.value"
      :error="list.error.value"
      searchable
      search-placeholder="Cari rule…"
      :empty="{ icon: 'lucide:bell-ring', title: 'Belum ada alarm rule' }"
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
      <template #cell-alarm_rule_id="{ value }">
        <span :title="String(value)">{{ shortId(String(value)) }}</span>
      </template>
      <template #cell-severity="{ value }"><AppBadge :status="String(value ?? '')" /></template>
      <template #cell-enabled="{ value }">
        <AppBadge
          :status="value ? 'ACTIVE' : 'INACTIVE'"
          :label="value ? 'Aktif' : 'Nonaktif'"
          dot
        />
      </template>
      <template #cell-updated_at="{ value }">{{ formatDateTime(value as string) }}</template>

      <template #actions="{ row }">
        <AppButton
          size="xs"
          :variant="row.enabled ? 'ghost' : 'outline'"
          :icon="row.enabled ? 'lucide:toggle-right' : 'lucide:toggle-left'"
          @click="toggle(row)"
        >
          {{ row.enabled ? 'Nonaktifkan' : 'Aktifkan' }}
        </AppButton>
      </template>
    </DataTable>
  </div>
</template>
