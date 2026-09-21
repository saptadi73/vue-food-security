<script setup lang="ts">
import { ref } from 'vue'
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
import { mastersApi } from '@/api/modules/masters'
import type { RawMaterialBatchData } from '@/api/modules/operations'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { useReferenceOptions } from '@/composables/useReferenceOptions'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, shortId } from '@/utils/format'

const toast = useToastStore()
const references = useReferenceOptions()
const confirm = useConfirm()

type BatchStatusFilter = 'ACCEPTED' | 'CREATED' | 'REJECTED' | 'CANCELLED' | null

const status = ref<BatchStatusFilter>('ACCEPTED')
const qrTarget = ref<RawMaterialBatchData | null>(null)
const qrProduct = ref<{ name: string; code: string } | null>(null)
const createOpen = ref(false)
const saving = ref(false)
const recoveringId = ref<string | null>(null)
const supplierOptions = ref<SelectOption[]>([])
const kitchenOptions = ref<SelectOption[]>([])
const storageOptions = ref<SelectOption[]>([])
const materialOptions = ref<SelectOption[]>([])
const formErrors = ref<Record<string, string>>({})

const form = ref({
  supplier_id: null as string | null,
  kitchen_id: null as string | null,
  storage_id: null as string | null,
  raw_material_id: null as string | null,
  received_at: '',
  batch_code: '',
  quantity: '',
  temperature: '',
  condition: 'GOOD',
  expired_date: '',
  photo: null as File | null,
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

async function openQr(row: RawMaterialBatchData) {
  qrTarget.value = row
  qrProduct.value = null
  try {
    const material = await mastersApi.rawMaterials.detail(row.raw_material_id)
    if (qrTarget.value?.raw_material_batch_id === row.raw_material_batch_id) {
      qrProduct.value = { name: material.material_name, code: material.material_code }
    }
  } catch {
    /* Label tetap dapat dicetak dengan kode batch saat referensi bahan tidak tersedia. */
  }
}

async function openCreate() {
  formErrors.value = {}
  form.value = {
    supplier_id: null,
    kitchen_id: null,
    storage_id: null,
    raw_material_id: null,
    received_at: nowLocalMinute(),
    batch_code: '',
    quantity: '',
    temperature: '',
    condition: 'GOOD',
    expired_date: '',
    photo: null,
    qr_code: '',
  }
  ;[supplierOptions.value, kitchenOptions.value, storageOptions.value, materialOptions.value] = await Promise.all([
    references.load('suppliers', 'supplier_id', 'supplier_name', true),
    references.load('kitchens', 'kitchen_id', 'kitchen_name', true),
    references.load('storages', 'storage_id', 'storage_name', true),
    references.load('rawMaterials', 'raw_material_id', 'material_name', true),
  ])
  createOpen.value = true
}

function validate() {
  const errors: Record<string, string> = {}
  if (!form.value.supplier_id) errors.supplier_id = 'Wajib diisi.'
  if (!form.value.kitchen_id) errors.kitchen_id = 'Wajib diisi.'
  if (!form.value.storage_id) errors.storage_id = 'Wajib diisi agar stok langsung tersedia.'
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
  let receivingCompleted = false
  try {
    let photoReference: string | null = null
    if (form.value.photo) {
      const uploaded = await fsos.operations.uploads.receivingPhoto(form.value.photo)
      photoReference = uploaded.reference
    }
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
          photo: photoReference,
          expired_date: form.value.expired_date || null,
          qr_code: form.value.qr_code.trim() || null,
        },
      ],
    })
    const completed = await fsos.operations.receivings.complete(receiving.receiving_id, {
      expected_version: receiving.version,
      items: receiving.items.map((item) => ({
        receiving_item_id: item.receiving_item_id,
        accepted: true,
      })),
    })
    receivingCompleted = true
    const batch = completed.items[0]?.batch
    if (!batch) throw new Error('Batch hasil penerimaan tidak tersedia untuk putaway.')
    await fsos.operations.rawMaterialBatches.putaway(batch.raw_material_batch_id, {
      expected_version: batch.version,
      storage_id: form.value.storage_id!,
      zone_id: null,
      quantity: String(form.value.quantity),
    })
    toast.success('Bahan diterima', { description: form.value.batch_code.trim() })
    createOpen.value = false
    status.value = 'ACCEPTED'
    await list.refresh()
  } catch (error) {
    if (isApiError(error)) formErrors.value = error.fieldErrors
    toast.fromError(error, receivingCompleted
      ? 'Bahan diterima, tetapi penempatan ke storage gagal'
      : 'Gagal mencatat penerimaan bahan')
  } finally {
    saving.value = false
  }
}

async function completeDraft(row: RawMaterialBatchData) {
  if (recoveringId.value) return
  const ok = await confirm.caution({
    title: 'Terima draft penerimaan',
    message: 'Seluruh item pada transaksi penerimaan ini akan diselesaikan sebagai diterima.',
    details: [{ label: 'Receiving', value: row.receiving_id }],
    confirmLabel: 'Terima bahan',
  })
  if (!ok) return

  recoveringId.value = row.receiving_id
  try {
    const receiving = await fsos.operations.receivings.detail(row.receiving_id)
    await fsos.operations.receivings.complete(receiving.receiving_id, {
      expected_version: receiving.version,
      items: receiving.items.map((item) => ({
        receiving_item_id: item.receiving_item_id,
        accepted: true,
      })),
    })
    toast.success('Draft penerimaan diselesaikan')
    await list.refresh()
  } catch (error) {
    toast.fromError(error, 'Gagal menyelesaikan draft penerimaan')
  } finally {
    recoveringId.value = null
  }
}

async function cancelDraft(row: RawMaterialBatchData) {
  if (recoveringId.value) return
  const ok = await confirm.destructive({
    title: 'Batalkan draft penerimaan',
    message: 'Seluruh batch dalam transaksi draft ini akan dibatalkan.',
    details: [{ label: 'Receiving', value: row.receiving_id }],
    confirmationPhrase: shortId(row.receiving_id),
    confirmLabel: 'Batalkan draft',
  })
  if (!ok) return

  recoveringId.value = row.receiving_id
  try {
    const receiving = await fsos.operations.receivings.detail(row.receiving_id)
    await fsos.operations.receivings.cancel(receiving.receiving_id, receiving.version)
    toast.success('Draft penerimaan dibatalkan')
    await list.refresh()
  } catch (error) {
    toast.fromError(error, 'Gagal membatalkan draft penerimaan')
  } finally {
    recoveringId.value = null
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
        <AppButton v-else size="sm" variant="outline" icon="lucide:qr-code" @click="openQr(row)">
          Buat QR
        </AppButton>
      </template>
      <template #actions="{ row }">
        <div v-if="row.status === 'CREATED'" class="flex flex-wrap justify-end gap-1.5">
          <AppButton
            size="xs"
            icon="lucide:check"
            :loading="recoveringId === row.receiving_id"
            @click="completeDraft(row)"
          >
            Terima
          </AppButton>
          <AppButton
            size="xs"
            variant="ghost"
            icon="lucide:x"
            :disabled="recoveringId !== null"
            @click="cancelDraft(row)"
          >
            Batalkan
          </AppButton>
        </div>
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
          :original-code="qrTarget.batch_code"
          :product-name="qrProduct?.name"
          :product-code="qrProduct?.code"
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
        <AppSelect
          v-model="form.supplier_id"
          label="Supplier"
          required
          :options="supplierOptions"
          :error="formErrors.supplier_id"
        />
        <AppSelect
          v-model="form.kitchen_id"
          label="Dapur penerima"
          required
          :options="kitchenOptions"
          :error="formErrors.kitchen_id"
        />
        <AppSelect
          v-model="form.storage_id"
          label="Storage tujuan"
          required
          :options="storageOptions"
          hint="Seluruh quantity langsung ditempatkan setelah penerimaan selesai."
          :error="formErrors.storage_id"
        />
        <AppInput
          v-model="form.received_at"
          label="Tanggal/jam terima"
          type="datetime-local"
          required
          :error="formErrors.received_at"
        />
        <AppSelect
          v-model="form.raw_material_id"
          label="Bahan makanan"
          required
          :options="materialOptions"
          :error="formErrors.raw_material_id"
        />
        <AppInput
          v-model="form.batch_code"
          label="Kode batch"
          required
          :maxlength="100"
          placeholder="RB-AYAM-002"
          :error="formErrors.batch_code"
        />
        <AppInput
          v-model="form.quantity"
          label="Jumlah"
          required
          inputmode="decimal"
          placeholder="10.000000"
          :error="formErrors.quantity"
        />
        <AppInput
          v-model="form.temperature"
          label="Suhu bahan (manual, C)"
          inputmode="decimal"
          placeholder="3.20"
          :error="formErrors.temperature"
        />
        <AppInput
          v-model="form.expired_date"
          label="Expired date"
          type="date"
          :error="formErrors.expired_date"
        />
        <AppInput
          v-model="form.condition"
          label="Kondisi bahan"
          :maxlength="100"
          placeholder="GOOD"
          :error="formErrors.condition"
        />
        <div class="w-full">
          <label class="mb-1.5 block text-xs font-semibold text-surface-700 dark:text-surface-300">
            Foto kondisi bahan
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="input-base file:mr-3 file:border-0 file:bg-transparent file:text-xs file:font-semibold"
            @change="(event) => { form.photo = (event.target as HTMLInputElement).files?.[0] ?? null }"
          />
          <p class="mt-1.5 text-xs text-surface-500 dark:text-surface-400">
            Opsional. JPEG, PNG, atau WebP; maksimal 10 MiB. File diunggah saat menyimpan.
            <span v-if="form.photo" class="text-emerald-600 dark:text-emerald-400">{{ form.photo.name }}</span>
          </p>
          <p v-if="formErrors.photo" class="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
            {{ formErrors.photo }}
          </p>
        </div>
        <AppInput
          v-model="form.qr_code"
          class="sm:col-span-2"
          label="Payload QR batch"
          :maxlength="255"
          placeholder="Kosongkan untuk dibuat otomatis oleh backend"
          hint="Jika kosong, backend menerbitkan fsos:raw-material-batch:&lt;UUID&gt;. Cetak nilai QR dari response API."
          :error="formErrors.qr_code"
        />
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
