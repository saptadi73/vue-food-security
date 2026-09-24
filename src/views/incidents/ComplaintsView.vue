<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import SignaturePadDialog from '@/components/signature/SignaturePadDialog.vue'
import { fsos } from '@/api'
import type { ComplaintRecord } from '@/api/modules/incidents'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import { formatDateTime, shortId } from '@/utils/format'

const toast = useToastStore()
const auth = useAuthStore()
const signatureOpen = ref(false)
const signatureTarget = ref('')
function openSignature(row: ComplaintRecord) { signatureTarget.value = row.complaint_id; signatureOpen.value = true }

const columns: TableColumn[] = [
  { key: 'complaint_id', label: 'Keluhan', mono: true },
  { key: 'severity', label: 'Severity', align: 'center', hideBelow: 'md' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'created_at', label: 'Dibuat', align: 'right', hideBelow: 'md' },
]

const list = usePaginatedList<ComplaintRecord>((query) => fsos.complaints.list(query), {
  searchFields: (row) => [row.complaint_id, String(row.status ?? ''), String(row.severity ?? '')],
})

const report = ref<Record<string, unknown> | null>(null)
const reportLoading = ref(false)

async function openReport(row: ComplaintRecord) {
  reportLoading.value = true
  report.value = {}
  try {
    report.value = await fsos.complaints.report(row.complaint_id)
  } catch (error) {
    report.value = null
    toast.fromError(error, 'Gagal memuat laporan insiden')
  } finally {
    reportLoading.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Keluhan"
      description="Complaint intake beserta laporan insiden lengkap hasil analisa backend."
      icon="lucide:message-square-warning"
      tag="Complaint.Read"
    />

    <DataTable
      v-model:search="list.search.value"
      v-model:limit="list.limit.value"
      :columns="columns"
      :rows="list.visibleItems.value"
      row-key="complaint_id"
      :loading="list.loading.value"
      :refreshing="list.refreshing.value"
      :error="list.error.value"
      searchable
      search-placeholder="Cari keluhan…"
      :empty="{ icon: 'lucide:message-square-off', title: 'Belum ada keluhan' }"
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
      <template #cell-complaint_id="{ value }">
        <span :title="String(value)">{{ shortId(String(value)) }}</span>
      </template>
      <template #cell-severity="{ value }"><AppBadge :status="String(value ?? '')" /></template>
      <template #cell-status="{ value }"><AppBadge :status="String(value ?? '')" /></template>
      <template #cell-created_at="{ value }">{{ formatDateTime(value as string) }}</template>

      <template #actions="{ row }">
        <AppButton v-if="auth.can('Complaint.Sign')" size="xs" variant="outline" icon="lucide:signature" @click="openSignature(row)">Tanda tangan</AppButton>
        <AppButton size="xs" variant="outline" icon="lucide:file-text" @click="openReport(row)">
          Laporan
        </AppButton>
      </template>
    </DataTable>

    <AppModal
      :open="report !== null"
      size="xl"
      title="Laporan insiden"
      icon="lucide:file-text"
      description="Respons mentah endpoint analisa; struktur mengikuti kontrak backend."
      @update:open="report = null"
    >
      <div v-if="reportLoading" class="space-y-2 py-4">
        <div v-for="row in 8" :key="row" class="skeleton h-4" />
      </div>
      <pre
        v-else
        class="max-h-[60vh] overflow-auto rounded-xl bg-surface-50 p-4 font-mono text-[11px] leading-relaxed text-surface-700 dark:bg-surface-850 dark:text-surface-200"
        >{{ JSON.stringify(report, null, 2) }}</pre>
      <template #footer>
        <AppButton variant="subtle" @click="report = null">Tutup</AppButton>
      </template>
    </AppModal>
    <SignaturePadDialog
      v-if="signatureTarget"
      v-model:open="signatureOpen"
      entity-type="COMPLAINT"
      :entity-id="signatureTarget"
      purpose="COMPLAINT_REPORTER_ATTESTATION"
    />
  </div>
</template>
