<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import QrCodeView from '@/components/qr/QrCodeView.vue'
import { fsos, isApiError } from '@/api'
import type { RawMaterialBatchData } from '@/api/modules/operations'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { useReferenceOptions } from '@/composables/useReferenceOptions'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, shortId } from '@/utils/format'

const toast = useToastStore()
const references = useReferenceOptions()

type BatchStatusFilter = 'ACCEPTED' | 'CREATED' | 'REJECTED' | 'CANCELLED' | null

const status = ref<BatchStatusFilter>('ACCEPTED')
const qrTarget = ref<RawMaterialBatchData | null>(null)
const createOpen = ref(false)
const saving = ref(false)
const supplierOptions = ref<SelectOption[]>([])
const kitchenOptions = ref<SelectOption[]>([])
const materialOptions = ref<SelectOption[]>([])
const formErrors = ref<Record<string, string>>({})

const form = ref({
  supplier_id: null as string | null,
  kitchen_id: null as string | null,
  raw_material_id: null as string | null,
  received_at: '',
  batch_code: '',
  quantity: '',
  temperature: '',
  condition: 'GOOD',
  expired_date: '',
  photo: '',
  qr_code: '',
})

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

const qrPreview = computed(() => form.value.qr_code.trim() || `QR-${form.value.batch_code.trim()}`)

function toIsoFromLocal(value: string) {
  return new Date(value).toISOString()
}

function nowLocalMinute() {
  const now = new Date()
  now.setSeconds(0, 0)
  const offsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16)
}

function applyStatus() {
  list.reset()
}

async function openCreate() {
  formErrors.value = {}
  form.value = {
    supplier_id: null,
    kitchen_id: null,
    raw_material_id: null,
    received_at: nowLocalMinute(),
    batch_code: '',
    quantity: '',
    temperature: '',
    condition: 'GOOD',
    expired_date: '',
    photo: '',
    qr_code: '',
  }
  ;[supplierOptions.value, kitchenOptions.value, materialOptions.value] = await Promise.all([
    references.load('suppliers', 'supplier_id', 'supplier_name', true),
    references.load('kitchens', 'kitchen_id', 'kitchen_name', true),
    references.load('rawMaterials', 'raw_material_id', 'material_name', true),
  ])
  createOpen.value = true
}

function validate() {
  const errors: Record<string, string> = {}
  if (!form.value.supplier_id) errors.supplier_id = 'Wajib diisi.'
  if (!form.value.kitchen_id) errors.kitchen_id = 'Wajib diisi.'
  if (!form.value.raw_material_id) errors.raw_material_id = 'Wajib diisi.'
  if (!form.value.received_at) errors.received_at = 'Wajib diisi.'
  if (!form.value.batch_code.trim()) errors.batch_code = 'Wajib diisi.'
  if (!form.value.quantity) errors.quantity = 'Wajib diisi.'
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

async function submitCreate() {
  if (!validate() || saving.value) return
  saving.value = true
  formErrors.value = {}
  try {
    const receiving = await fsos.operations.receivings.create({
      supplier_id: form.value.supplier_id!,
      kitchen_id: form.value.kitchen_id!,
      received_at: toIsoFromLocal(form.value.received_at),
      items: [
        {
          raw_material_id: form.value.raw_material_id!,
          batch_code: form.value.batch_code.trim(),
          quantity: String(form.value.quantity),
          temperature: form.value.temperature ? String(form.value.temperature) : null,
          condition: form.value.condition.trim() || null,
          photo: form.value.photo.trim() || null,
          expired_date: form.value.expired_date || null,
          qr_code: qrPreview.value,
        },
      ],
    })
    await fsos.operations.receivings.complete(receiving.receiving_id, {
      expected_version: receiving.version,
      items: receiving.items.map((item) => ({
        receiving_item_id: item.receiving_item_id,
        accepted: true,
      })),
    })
    toast.success('Bahan diterima', { description: form.value.batch_code.trim() })
    createOpen.value = false
    status.value = 'ACCEPTED'
    await list.refresh()
  } catch (error) {
    if (isApiError(error)) formErrors.value = error.fieldErrors
    toast.fromError(error, 'Gagal mencatat penerimaan bahan')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Penerimaan Bahan"
      description="Catat bahan datang, suhu manual, supplier, jumlah, expired date, foto kondisi, lalu cetak label QR batch."
      icon="lucide:package-check"
      tag="Receiving.Write"
    >
      <template #actions>
        <AppButton icon="lucide:plus" @click="openCreate">Terima Bahan</AppButton>
      </template>
    </PageHeader>

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
      search-placeholder="Cari kode batch atau QR..."
      :empty="{
        icon: 'lucide:package-check',
        title: 'Belum ada batch bahan',
        description: 'Klik Terima Bahan untuk mencatat penerimaan pertama.',
        actionLabel: 'Terima Bahan',
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
      @empty-action="openCreate"
    >
      <template #cell-raw_material_id="{ value }">
        <span :title="String(value)" class="font-mono text-xs">{{ shortId(String(value)) }}</span>
      </template>
      <template #cell-expired_date="{ value }">
        {{ value ? formatDateTime(String(value)) : '---' }}
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
          :subcaption="`Bahan - ${shortId(qrTarget.raw_material_id)}`"
          :file-name="`qr-bahan-${qrTarget.batch_code}`"
        />
      </div>
    </AppModal>

    <AppModal
      v-model:open="createOpen"
      size="xl"
      title="Terima bahan baku"
      icon="lucide:package-plus"
      description="Transaksi akan dibuat lalu langsung diselesaikan sebagai ACCEPTED agar batch siap diberi QR dan dialokasikan ke storage."
      :busy="saving"
    >
      <form class="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2" @submit.prevent="submitCreate">
        <AppSelect v-model="form.supplier_id" label="Supplier" required :options="supplierOptions" :error="formErrors.supplier_id" />
        <AppSelect v-model="form.kitchen_id" label="Dapur penerima" required :options="kitchenOptions" :error="formErrors.kitchen_id" />
        <AppInput v-model="form.received_at" label="Tanggal/jam terima" type="datetime-local" required :error="formErrors.received_at" />
        <AppSelect v-model="form.raw_material_id" label="Bahan makanan" required :options="materialOptions" :error="formErrors.raw_material_id" />
        <AppInput v-model="form.batch_code" label="Kode batch" required :maxlength="100" placeholder="RB-AYAM-002" :error="formErrors.batch_code" />
        <AppInput v-model="form.quantity" label="Jumlah" required inputmode="decimal" placeholder="10.000000" :error="formErrors.quantity" />
        <AppInput v-model="form.temperature" label="Suhu bahan (manual, C)" inputmode="decimal" placeholder="3.20" :error="formErrors.temperature" />
        <AppInput v-model="form.expired_date" label="Expired date" type="date" :error="formErrors.expired_date" />
        <AppInput v-model="form.condition" label="Kondisi bahan" :maxlength="100" placeholder="GOOD" :error="formErrors.condition" />
        <AppInput v-model="form.photo" label="Referensi foto kondisi" :maxlength="1024" placeholder="example/receiving/photo.jpg" :error="formErrors.photo" />
        <AppInput v-model="form.qr_code" class="sm:col-span-2" label="Payload QR batch" :maxlength="255" :placeholder="qrPreview" hint="Kosongkan untuk memakai QR-&lt;kode batch&gt;. QR dirender/print di frontend." :error="formErrors.qr_code" />
      </form>

      <template #footer>
        <AppButton variant="subtle" :disabled="saving" @click="createOpen = false">Batal</AppButton>
        <AppButton icon="lucide:package-check" :loading="saving" @click="submitCreate">
          Simpan & Terima
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>


