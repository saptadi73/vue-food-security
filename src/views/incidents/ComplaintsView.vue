<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SignaturePadDialog from '@/components/signature/SignaturePadDialog.vue'
import { fsos } from '@/api'
import type { ComplaintRecord } from '@/api/modules/incidents'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import { formatDateTime, shortId } from '@/utils/format'

interface SignerSnapshot {
  fullname?: string
  job_title?: string | null
  roles?: string[]
}

interface ReceivedBy {
  signature_id?: string
  signed_by?: string
  signed_at?: string
  signer_snapshot?: SignerSnapshot
}

interface SchoolReceiptRow extends Record<string, unknown> {
  school_receiving_id: string
  school?: string
  school_name?: string
  school_address?: string | null
  received_time?: string
  accepted?: boolean | null
  condition?: string | null
  received_by?: ReceivedBy | null
}

interface DeliveryManifestRow extends Record<string, unknown> {
  delivery_item_id: string
  delivery_id?: string
  school_id?: string
  school_name?: string
  school_address?: string | null
  delivery_status?: string
}

interface CurrentLocation {
  type: 'SCHOOL' | 'DELIVERY'
  school_id?: string
  school_name?: string
  school_address?: string | null
  detected_at?: string
  status?: string
  received_by?: ReceivedBy | null
  delivery_id?: string
  vehicle_id?: string
}

interface ComplaintReport extends Record<string, unknown> {
  complaint_id: string
  description?: string
  reported_at?: string
  package?: Record<string, unknown>
  current_location?: CurrentLocation | null
  delivery_manifest?: DeliveryManifestRow[]
  school_receivings?: SchoolReceiptRow[]
  consumption?: Record<string, unknown> | null
}

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

const report = ref<ComplaintReport | null>(null)
const batchImpact = ref<Record<string, any> | null>(null)
const reportLoading = ref(false)
const showRawJson = ref(false)

const receiptColumns: TableColumn<SchoolReceiptRow>[] = [
  { key: 'school_name', label: 'Sekolah' },
  { key: 'received_time', label: 'Waktu terima', align: 'right' },
  { key: 'condition', label: 'Kondisi', align: 'center' },
  { key: 'accepted', label: 'Diterima', align: 'center' },
  { key: 'received_by', label: 'Diterima oleh' },
]

const manifestColumns: TableColumn<DeliveryManifestRow>[] = [
  { key: 'school_name', label: 'Sekolah tujuan' },
  { key: 'delivery_status', label: 'Status pengiriman', align: 'center' },
]

const currentLocation = computed(() => report.value?.current_location ?? null)

function signerLabel(receivedBy?: ReceivedBy | null): string {
  const snapshot = receivedBy?.signer_snapshot
  if (!snapshot?.fullname) return 'Belum ditandatangani'
  return snapshot.job_title ? `${snapshot.fullname} (${snapshot.job_title})` : snapshot.fullname
}

async function openReport(row: ComplaintRecord) {
  reportLoading.value = true
  report.value = null
  batchImpact.value = null
  showRawJson.value = false
  try {
    const [detail, impact] = await Promise.all([
      fsos.complaints.report(row.complaint_id),
      fsos.complaints.batchImpact(row.complaint_id),
    ])
    report.value = detail as ComplaintReport
    batchImpact.value = impact
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
      :open="report !== null || reportLoading"
      size="xl"
      title="Laporan insiden"
      icon="lucide:file-text"
      description="Lokasi, penerima dan bukti tanda tangan hasil analisa backend."
      @update:open="report = null"
    >
      <div v-if="reportLoading" class="space-y-2 py-4">
        <div v-for="row in 8" :key="row" class="skeleton h-4" />
      </div>
      <div v-else-if="report" class="space-y-4">
        <AppCard title="Keluhan" icon="lucide:message-square-warning" flush>
          <div class="space-y-1 p-4 text-sm">
            <p class="text-surface-700 dark:text-surface-200">{{ report.description || '—' }}</p>
            <p class="text-xs text-surface-500 dark:text-surface-400">
              Dilaporkan {{ formatDateTime(report.reported_at) }}
            </p>
          </div>
        </AppCard>

        <AppCard title="Lokasi dan penerima saat ini" icon="lucide:map-pin" flush>
          <div v-if="currentLocation" class="space-y-2 p-4 text-sm">
            <div class="flex flex-wrap items-center gap-2">
              <AppBadge :status="currentLocation.status ?? currentLocation.type" />
              <span class="font-semibold text-surface-900 dark:text-white">
                {{ currentLocation.school_name || 'Sekolah belum diketahui' }}
              </span>
            </div>
            <p v-if="currentLocation.school_address" class="text-surface-600 dark:text-surface-300">
              <span class="font-medium">Alamat:</span> {{ currentLocation.school_address }}
            </p>
            <p class="text-surface-600 dark:text-surface-300">
              <span class="font-medium">Terdeteksi:</span> {{ formatDateTime(currentLocation.detected_at) }}
            </p>
            <p class="text-surface-600 dark:text-surface-300">
              <span class="font-medium">Diterima oleh:</span>
              {{ signerLabel(currentLocation.received_by) }}
            </p>
          </div>
          <EmptyState v-else compact icon="lucide:map-pin-off" title="Belum ada lokasi terdeteksi" />
        </AppCard>

        <AppCard title="Riwayat penerimaan sekolah" icon="lucide:clipboard-check" flush>
          <DataTable
            :columns="receiptColumns"
            :rows="report.school_receivings ?? []"
            row-key="school_receiving_id"
            :empty="{ icon: 'lucide:inbox', title: 'Belum ada penerimaan sekolah' }"
          >
            <template #cell-received_time="{ value }">{{ formatDateTime(value as string) }}</template>
            <template #cell-condition="{ value }"><AppBadge :status="String(value ?? '')" /></template>
            <template #cell-accepted="{ value }">
              <AppBadge :status="value ? 'RECEIVED' : 'REJECTED'" :label="value ? 'Diterima' : 'Ditolak'" />
            </template>
            <template #cell-received_by="{ row }">{{ signerLabel(row.received_by) }}</template>
          </DataTable>
        </AppCard>

        <AppCard title="Manifest pengiriman" icon="lucide:truck" flush>
          <DataTable
            :columns="manifestColumns"
            :rows="report.delivery_manifest ?? []"
            row-key="delivery_item_id"
            :empty="{ icon: 'lucide:inbox', title: 'Belum ada manifest pengiriman' }"
          >
            <template #cell-delivery_status="{ value }"><AppBadge :status="String(value ?? '')" /></template>
          </DataTable>
        </AppCard>

        <AppCard v-if="batchImpact" title="Dampak batch produksi" icon="lucide:boxes" flush>
          <div class="grid grid-cols-2 gap-3 border-b border-surface-200 p-4 sm:grid-cols-4 dark:border-surface-800">
            <div><p class="text-xs text-surface-500">Kemasan terdampak</p><p class="text-xl font-black">{{ batchImpact.affected_package_count ?? 0 }}</p></div>
            <div><p class="text-xs text-surface-500">Sudah dialokasikan</p><p class="text-xl font-black">{{ batchImpact.delivered_count ?? 0 }}</p></div>
            <div><p class="text-xs text-surface-500">Sudah diterima</p><p class="text-xl font-black text-amber-600">{{ batchImpact.received_count ?? 0 }}</p></div>
            <div><p class="text-xs text-surface-500">Sudah dikonsumsi</p><p class="text-xl font-black text-rose-600">{{ batchImpact.consumed_count ?? 0 }}</p></div>
          </div>
          <div class="overflow-x-auto"><table class="w-full min-w-[720px] text-left text-xs"><thead class="bg-surface-50 text-surface-500 dark:bg-surface-850"><tr><th class="p-3">Kemasan</th><th>Tujuan</th><th>Delivery</th><th>Penerimaan</th><th>Konsumsi</th></tr></thead><tbody><tr v-for="item in batchImpact.packages ?? []" :key="item.package_id" class="border-t border-surface-100 dark:border-surface-800"><td class="p-3 font-mono font-semibold">{{ item.package_code }}</td><td>{{ item.school_name || 'Belum dialokasikan' }}</td><td><AppBadge :status="item.delivery_status || item.package_status" /></td><td>{{ item.school_receiving_id ? formatDateTime(item.received_time) : 'Belum diterima' }}</td><td>{{ item.consumption_id ? formatDateTime(item.consumed_at) : 'Belum dikonsumsi' }}</td></tr></tbody></table></div>
        </AppCard>

        <div>
          <AppButton size="xs" variant="subtle" :icon="showRawJson ? 'lucide:chevron-up' : 'lucide:code'" @click="showRawJson = !showRawJson">
            {{ showRawJson ? 'Sembunyikan data mentah' : 'Tampilkan data mentah (JSON)' }}
          </AppButton>
          <pre
            v-if="showRawJson"
            class="mt-2 max-h-[40vh] overflow-auto rounded-xl bg-surface-50 p-4 font-mono text-[11px] leading-relaxed text-surface-700 dark:bg-surface-850 dark:text-surface-200"
            >{{ JSON.stringify({ report, batch_impact: batchImpact }, null, 2) }}</pre
          >
        </div>
      </div>
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
