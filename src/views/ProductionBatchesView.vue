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
import { fsos, isApiError } from '@/api'
import { mastersApi } from '@/api/modules/masters'
import type { ProductionBatchData, ProductionBatchDetail } from '@/api/modules/operations'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { useReferenceOptions } from '@/composables/useReferenceOptions'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, formatDecimal, shortId } from '@/utils/format'

const toast = useToastStore()
const confirm = useConfirm()
const references = useReferenceOptions()

const status = ref<'CREATED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED' | null>(null)
const detailTarget = ref<ProductionBatchDetail | null>(null)
const completeTarget = ref<ProductionBatchData | null>(null)
const startTarget = ref<ProductionBatchData | null>(null)
const createOpen = ref(false)
const completeOpen = ref(false)
const startOpen = ref(false)
const saving = ref(false)
const detailLoading = ref(false)
const startStockLoading = ref<Record<number, boolean>>({})
const kitchenOptions = ref<SelectOption[]>([])
const menuOptions = ref<SelectOption[]>([])
const formErrors = ref<Record<string, string>>({})
const foodSensorOptions = ref<SelectOption[]>([])

const form = ref({
  batch_code: '',
  kitchen: null as string | null,
  menu: null as string | null,
  planned_quantity: '',
})
const completeForm = ref({
  actual_quantity: '',
  initial_temperature: '',
  food_sensor_device_uuid: null as string | null,
})
const startForm = ref({
  items: [
    { raw_material_batch_id: '', storage_id: '', expected_version: '', quantity: '' },
  ],
})

const statusOptions: SelectOption[] = [
  { value: null, label: 'Semua status' },
  { value: 'CREATED', label: 'CREATED' },
  { value: 'RUNNING', label: 'RUNNING' },
  { value: 'COMPLETED', label: 'COMPLETED' },
  { value: 'CANCELLED', label: 'CANCELLED' },
]

const columns: TableColumn<ProductionBatchData>[] = [
  { key: 'batch_code', label: 'Kode MO', mono: true },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'planned_quantity', label: 'Rencana', align: 'right' },
  { key: 'actual_quantity', label: 'Aktual', align: 'right' },
  { key: 'initial_temperature', label: 'Suhu inti', align: 'right', hideBelow: 'md' },
  { key: 'finished_at', label: 'Selesai masak', align: 'right', hideBelow: 'lg' },
]

const list = usePaginatedList<ProductionBatchData>(
  (query) =>
    fsos.operations.productionBatches.list({
      ...query,
      status: status.value ?? undefined,
    }),
  {
    searchFields: (row) => [row.batch_code, row.production_batch_id, row.status],
  },
)

function applyStatus() {
  list.reset()
}

async function loadReferences() {
  ;[kitchenOptions.value, menuOptions.value] = await Promise.all([
    references.load('kitchens', 'kitchen_id', 'kitchen_name', true),
    references.load('foodItems', 'food_item_id', 'food_name', true),
  ])
}

async function openCreate() {
  formErrors.value = {}
  form.value = { batch_code: '', kitchen: null, menu: null, planned_quantity: '' }
  await loadReferences()
  createOpen.value = true
}

function validateCreate() {
  const errors: Record<string, string> = {}
  if (!form.value.batch_code.trim()) errors.batch_code = 'Wajib diisi.'
  if (!form.value.kitchen) errors.kitchen = 'Wajib diisi.'
  if (!form.value.menu) errors.menu = 'Wajib diisi.'
  if (!form.value.planned_quantity) errors.planned_quantity = 'Wajib diisi.'
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

async function submitCreate() {
  if (!validateCreate() || saving.value) return
  saving.value = true
  try {
    await fsos.operations.productionBatches.create({
      batch_code: form.value.batch_code.trim(),
      kitchen: form.value.kitchen!,
      menu: form.value.menu!,
      planned_quantity: String(form.value.planned_quantity),
    })
    toast.success('Batch produksi dibuat', { description: form.value.batch_code.trim() })
    createOpen.value = false
    await list.refresh()
  } catch (error) {
    if (isApiError(error)) formErrors.value = error.fieldErrors
    toast.fromError(error, 'Gagal membuat batch produksi')
  } finally {
    saving.value = false
  }
}

async function openDetail(row: ProductionBatchData) {
  detailLoading.value = true
  detailTarget.value = null
  try {
    detailTarget.value = await fsos.operations.productionBatches.detail(row.production_batch_id)
  } catch (error) {
    toast.fromError(error, 'Gagal memuat detail produksi')
  } finally {
    detailLoading.value = false
  }
}

function addStartRow() {
  startForm.value.items.push({ raw_material_batch_id: '', storage_id: '', expected_version: '', quantity: '' })
}

function removeStartRow(index: number) {
  if (startForm.value.items.length === 1) {
    startForm.value.items = [{ raw_material_batch_id: '', storage_id: '', expected_version: '', quantity: '' }]
    return
  }
  startForm.value.items.splice(index, 1)
}

function openStart(row: ProductionBatchData) {
  startTarget.value = row
  startForm.value = {
    items: [{ raw_material_batch_id: '', storage_id: '', expected_version: '', quantity: '' }],
  }
  formErrors.value = {}
  startOpen.value = true
}

async function loadStartRowStock(index: number) {
  const source = startForm.value.items[index]
  if (!source?.raw_material_batch_id.trim()) {
    formErrors.value.items = 'Isi Raw Material Batch ID / QR terlebih dahulu.'
    return
  }
  formErrors.value = {}
  startStockLoading.value[index] = true
  try {
    const stock = await fsos.operations.rawMaterialBatches.stock(source.raw_material_batch_id.trim())
    source.expected_version = String(stock.version)
    const storage = stock.storages.find((item) => Number(item.available_quantity) > 0)
    if (!storage) {
      formErrors.value.items = 'Stok batch ini belum tersedia di storage atau available quantity nol.'
      return
    }
    source.storage_id = storage.storage_id
    if (!source.quantity) source.quantity = storage.available_quantity
    toast.success('Stok bahan ditemukan', {
      description: `${storage.available_quantity} ${stock.uom} tersedia di storage ${shortId(storage.storage_id)}`,
    })
  } catch (error) {
    toast.fromError(error, 'Gagal cek stok bahan')
  } finally {
    startStockLoading.value[index] = false
  }
}
async function submitStart() {
  const item = startTarget.value
  if (!item || saving.value) return
  formErrors.value = {}
  const rows = startForm.value.items
    .map((row) => ({
      raw_material_batch_id: row.raw_material_batch_id.trim(),
      storage_id: row.storage_id.trim(),
      expected_version: Number(row.expected_version),
      quantity: String(row.quantity).trim(),
    }))
    .filter((row) => row.raw_material_batch_id || row.storage_id || row.quantity)
  if (!rows.length) {
    formErrors.value.items = 'Minimal satu batch bahan harus diisi.'
    return
  }
  if (rows.some((row) => !row.raw_material_batch_id || !row.storage_id || !row.quantity || !Number.isInteger(row.expected_version) || row.expected_version < 1)) {
    formErrors.value.items = 'Lengkapi batch bahan, storage, version bahan, dan quantity valid.'
    return
  }
  saving.value = true
  try {
    await fsos.operations.productionBatches.start(item.production_batch_id, {
      expected_version: item.version,
      items: rows,
    })
    toast.success('Produksi dimulai', { description: item.batch_code })
    startOpen.value = false
    startTarget.value = null
    await list.refresh()
  } catch (error) {
    if (isApiError(error)) formErrors.value = error.fieldErrors
    toast.fromError(error, 'Gagal mulai produksi')
  } finally {
    saving.value = false
  }
}
function openComplete(row: ProductionBatchData) {
  completeTarget.value = row
  completeForm.value = {
    actual_quantity: row.actual_quantity ?? row.planned_quantity ?? '',
    initial_temperature: row.initial_temperature ?? '',
    food_sensor_device_uuid: null,
  }
  formErrors.value = {}
  completeOpen.value = true
  void loadFoodSensors()
}

async function loadFoodSensors() {
  try {
    const page = await mastersApi.devices.list({ limit: 100 })
    foodSensorOptions.value = page.items
      .filter((device) => device.status === 'ACTIVE' && ['FOOD_TEMPERATURE', 'TEMPERATURE', 'FOOD_SENSOR'].includes(device.device_type))
      .map((device) => ({ value: device.device_uuid, label: `${device.device_name} · ${device.device_uuid}` }))
  } catch (error) {
    toast.fromError(error, 'Gagal memuat sensor makanan')
  }
}

async function submitComplete() {
  const item = completeTarget.value
  if (!item || saving.value) return
  formErrors.value = {}
  if (!completeForm.value.actual_quantity) {
    formErrors.value.actual_quantity = 'Wajib diisi.'
    return
  }
  saving.value = true
  try {
    await fsos.operations.productionBatches.complete(item.production_batch_id, {
      expected_version: item.version,
      actual_quantity: String(completeForm.value.actual_quantity),
      initial_temperature: completeForm.value.initial_temperature
        ? String(completeForm.value.initial_temperature)
        : null,
      food_sensor_device_uuid: completeForm.value.food_sensor_device_uuid,
    })
    toast.success('Produksi selesai', { description: item.batch_code })
    completeOpen.value = false
    completeTarget.value = null
    await list.refresh()
  } catch (error) {
    if (isApiError(error)) formErrors.value = error.fieldErrors
    toast.fromError(error, 'Gagal menyelesaikan produksi')
  } finally {
    saving.value = false
  }
}

async function cancelBatch(row: ProductionBatchData) {
  const ok = await confirm.destructive({
    title: 'Batalkan batch produksi',
    message: 'Batch CREATED akan menjadi CANCELLED. Tidak ada pengembalian stok karena belum start produksi.',
    details: [
      { label: 'Kode', value: row.batch_code },
      { label: 'expected_version', value: String(row.version) },
    ],
    confirmationPhrase: row.batch_code,
    confirmLabel: 'Batalkan batch',
  })
  if (!ok) return
  try {
    await fsos.operations.productionBatches.cancel(row.production_batch_id, row.version)
    toast.success('Batch dibatalkan', { description: row.batch_code })
    await list.refresh()
  } catch (error) {
    toast.fromError(error, 'Gagal membatalkan batch')
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Batch Produksi"
      description="Rencana cooking, status batch, suhu inti makanan, waktu selesai masak, dan bahan yang digunakan."
      icon="lucide:chef-hat"
      tag="Production.Read"
    >
      <template #actions>
        <AppButton icon="lucide:plus" @click="openCreate">Batch Produksi</AppButton>
      </template>
    </PageHeader>

    <AppCard class="mb-4" title="Filter produksi" icon="lucide:filter">
      <div class="max-w-sm">
        <AppSelect v-model="status" label="Status batch" :options="statusOptions" @update:model-value="applyStatus" />
      </div>
    </AppCard>

    <DataTable
      v-model:search="list.search.value"
      v-model:limit="list.limit.value"
      :columns="columns"
      :rows="list.visibleItems.value"
      row-key="production_batch_id"
      :loading="list.loading.value"
      :refreshing="list.refreshing.value"
      :error="list.error.value"
      searchable
      search-placeholder="Cari kode MO..."
      :empty="{
        icon: 'lucide:chef-hat',
        title: 'Belum ada batch produksi',
        description: 'Buat batch produksi untuk memulai workflow cooking.',
        actionLabel: 'Batch Produksi',
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
      @row-click="openDetail"
    >
      <template #cell-status="{ value }"><AppBadge :status="String(value)" /></template>
      <template #cell-planned_quantity="{ row }">{{ formatDecimal(row.planned_quantity) }}</template>
      <template #cell-actual_quantity="{ row }">{{ formatDecimal(row.actual_quantity) }}</template>
      <template #cell-initial_temperature="{ row }">
        {{ row.initial_temperature ? `${row.initial_temperature} C` : '---' }}
      </template>
      <template #cell-finished_at="{ value }">{{ formatDateTime(value as string | null) }}</template>

      <template #actions="{ row }">
        <div class="flex justify-end gap-1.5">
          <AppButton size="xs" variant="outline" icon="lucide:eye" @click="openDetail(row)">Detail</AppButton>
          <AppButton v-if="row.status === 'RUNNING'" size="xs" icon="lucide:check" @click="openComplete(row)">Selesai</AppButton>
          <AppButton v-if="row.status === 'CREATED'" size="xs" icon="lucide:play" @click="openStart(row)">Mulai</AppButton>
          <AppButton v-if="row.status === 'CREATED'" size="xs" variant="ghost" icon="lucide:x" @click="cancelBatch(row)">Cancel</AppButton>
        </div>
      </template>
    </DataTable>

    <AppModal
      v-model:open="createOpen"
      size="lg"
      title="Buat batch produksi"
      icon="lucide:chef-hat"
      description="Membuat rencana batch dan snapshot resep. Start produksi/pengeluaran bahan dilakukan lewat workflow stok berikutnya."
      :busy="saving"
    >
      <form class="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2" @submit.prevent="submitCreate">
        <AppInput v-model="form.batch_code" label="Kode masak / MO" required placeholder="MO-2026-0002" :error="formErrors.batch_code" />
        <AppSelect v-model="form.kitchen" label="Dapur" required :options="kitchenOptions" :error="formErrors.kitchen" />
        <AppSelect v-model="form.menu" label="Menu" required :options="menuOptions" :error="formErrors.menu" />
        <AppInput v-model="form.planned_quantity" label="Target porsi/jumlah" required inputmode="decimal" :error="formErrors.planned_quantity" />
      </form>
      <template #footer>
        <AppButton variant="subtle" :disabled="saving" @click="createOpen = false">Batal</AppButton>
        <AppButton icon="lucide:save" :loading="saving" @click="submitCreate">Simpan</AppButton>
      </template>
    </AppModal>

    <AppModal
      :open="startOpen"
      size="xl"
      @update:open="(value) => { startOpen = value; if (!value) startTarget = null }"
      title="Mulai masak / pakai bahan"
      icon="lucide:scan-line"
      description="Masukkan hasil scan batch bahan dari storage. Backend akan validasi stok, expiry, version, tenant dan mengurangi stok secara atomik."
      :busy="saving"
    >
      <div class="space-y-4 py-2">
        <div class="rounded-xl border border-dashed border-primary-200 bg-primary-50/70 p-3 text-sm text-primary-800 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-200">
          <p class="font-semibold">{{ startTarget?.batch_code }}</p>
          <p>Gunakan scanner frontend untuk mengisi Raw Material Batch ID/QR, Storage ID, version batch bahan, dan quantity yang dikeluarkan.</p>
        </div>
        <p v-if="formErrors.items" class="text-sm font-medium text-danger-600">{{ formErrors.items }}</p>
        <div v-for="(source, index) in startForm.items" :key="index" class="rounded-2xl border border-surface-200 p-4 dark:border-surface-800">
          <div class="mb-3 flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-surface-700 dark:text-surface-200">Bahan {{ index + 1 }}</p>
            <AppButton size="xs" variant="ghost" icon="lucide:trash-2" @click="removeStartRow(index)">Hapus</AppButton>
          </div>
          <div class="grid grid-cols-1 gap-3 lg:grid-cols-[1.35fr_1.15fr_0.7fr_0.8fr_auto]">
            <AppInput v-model="source.raw_material_batch_id" label="Raw material batch ID / QR" required placeholder="UUID dari scan bahan" />
            <AppInput v-model="source.storage_id" label="Storage ID" required placeholder="UUID storage/rak" />
            <AppInput v-model="source.expected_version" label="Version bahan" required inputmode="numeric" placeholder="4" />
            <AppInput v-model="source.quantity" label="Qty keluar" required inputmode="decimal" placeholder="1.000000" />
            <div class="flex items-end">
              <AppButton class="w-full" size="sm" variant="outline" icon="lucide:warehouse" :loading="startStockLoading[index]" @click="loadStartRowStock(index)">Cek stok</AppButton>
            </div>
          </div>
        </div>
        <AppButton variant="outline" icon="lucide:plus" @click="addStartRow">Tambah bahan</AppButton>
      </div>
      <template #footer>
        <AppButton variant="subtle" :disabled="saving" @click="startOpen = false; startTarget = null">Batal</AppButton>
        <AppButton icon="lucide:play" :loading="saving" @click="submitStart">Mulai Produksi</AppButton>
      </template>
    </AppModal>
    <AppModal
      :open="completeOpen"
      size="md"
      @update:open="(value) => { completeOpen = value; if (!value) completeTarget = null }"
      title="Selesaikan masak"
      icon="lucide:thermometer"
      description="Catat hasil aktual dan suhu inti makanan manual. Holding dan packaging diproses setelah batch COMPLETED."
      :busy="saving"
    >
      <form class="grid grid-cols-1 gap-4 py-2" @submit.prevent="submitComplete">
        <AppInput :model-value="completeTarget?.batch_code ?? ''" label="Kode batch" readonly />
        <AppInput v-model="completeForm.actual_quantity" label="Hasil aktual" required inputmode="decimal" :error="formErrors.actual_quantity" />
        <AppInput v-model="completeForm.initial_temperature" label="Suhu inti makanan (C)" inputmode="decimal" :error="formErrors.initial_temperature" />
        <AppSelect
          v-model="completeForm.food_sensor_device_uuid"
          label="Sensor makanan (opsional)"
          :options="foodSensorOptions"
          placeholder="Pilih sensor untuk batch"
          hint="Sensor akan dibinding ke production batch dan dapat mengirim suhu aktual."
        />
      </form>
      <template #footer>
        <AppButton variant="subtle" :disabled="saving" @click="completeOpen = false; completeTarget = null">Batal</AppButton>
        <AppButton icon="lucide:check" :loading="saving" @click="submitComplete">Selesai Masak</AppButton>
      </template>
    </AppModal>

    <AppModal
      :open="detailTarget !== null"
      size="xl"
      title="Detail batch produksi"
      icon="lucide:list-checks"
      :busy="detailLoading"
      @update:open="detailTarget = null"
    >
      <div v-if="detailTarget" class="space-y-4 py-2">
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div class="rounded-xl bg-surface-50 p-3 dark:bg-surface-850">
            <p class="text-xs text-surface-500">Kode MO</p>
            <p class="font-mono font-bold">{{ detailTarget.batch_code }}</p>
          </div>
          <div class="rounded-xl bg-surface-50 p-3 dark:bg-surface-850">
            <p class="text-xs text-surface-500">Status</p>
            <AppBadge :status="detailTarget.status" />
          </div>
          <div class="rounded-xl bg-surface-50 p-3 dark:bg-surface-850">
            <p class="text-xs text-surface-500">Suhu inti</p>
            <p class="font-bold">{{ detailTarget.initial_temperature ?? '---' }}</p>
          </div>
          <div class="rounded-xl bg-surface-50 p-3 dark:bg-surface-850">
            <p class="text-xs text-surface-500">Selesai masak</p>
            <p class="text-sm font-semibold">{{ formatDateTime(detailTarget.finished_at) }}</p>
          </div>
        </div>

        <AppCard title="Snapshot resep" icon="lucide:book-open">
          <pre class="max-h-56 overflow-auto rounded-xl bg-surface-50 p-3 font-mono text-xs dark:bg-surface-850">{{ JSON.stringify(detailTarget.recipe_snapshot, null, 2) }}</pre>
        </AppCard>

        <AppCard title="Bahan yang digunakan" icon="lucide:wheat" flush>
          <ul class="divide-y divide-surface-100 dark:divide-surface-800/60">
            <li v-for="item in detailTarget.items" :key="item.production_item_id" class="flex items-center gap-3 px-4 py-3 text-sm">
              <span class="min-w-0 flex-1">
                <span class="block font-mono text-xs">{{ shortId(item.raw_material_batch_id) }}</span>
                <span class="text-xs text-surface-400">Storage {{ item.storage_id ? shortId(item.storage_id) : '---' }}</span>
              </span>
              <span class="font-mono font-bold">{{ item.quantity }} {{ item.uom }}</span>
            </li>
            <li v-if="!detailTarget.items.length" class="px-4 py-8 text-center text-sm text-surface-400">
              Belum ada bahan issue/start produksi tercatat.
            </li>
          </ul>
        </AppCard>
      </div>
    </AppModal>
  </div>
</template>





