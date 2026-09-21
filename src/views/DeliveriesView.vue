<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { fsos, isApiError } from '@/api'
import type { DeliveryData, DeliveryDetail, DeliveryStatus } from '@/api/modules/operations'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { useReferenceOptions } from '@/composables/useReferenceOptions'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, formatDecimal, shortId } from '@/utils/format'

const router = useRouter()
const references = useReferenceOptions()
const toast = useToastStore()
const confirm = useConfirm()

const status = ref<DeliveryStatus | null>('IN_TRANSIT')
const vehicleFilter = ref<string | null>(null)
const optionsLoading = ref(false)
const vehicleOptions = ref<SelectOption[]>([])
const kitchenOptions = ref<SelectOption[]>([])
const driverOptions = ref<SelectOption[]>([])
const schoolOptions = ref<SelectOption[]>([])

const createOpen = ref(false)
const departOpen = ref(false)
const detailTarget = ref<DeliveryDetail | null>(null)
const departTarget = ref<DeliveryData | null>(null)
const saving = ref(false)
const detailLoading = ref(false)
const formErrors = ref<Record<string, string>>({})

const createForm = ref({
  kitchen_id: null as string | null,
  vehicle: null as string | null,
  driver: null as string | null,
  average_speed_kmph: '',
  items: [{ package_id: '', school_id: null as string | null, expected_version: '' }],
})
const departForm = ref({ estimated_arrival_time: '' })

const statusOptions: SelectOption[] = [
  { value: null, label: 'Semua status' },
  { value: 'CREATED', label: 'CREATED' },
  { value: 'IN_TRANSIT', label: 'IN_TRANSIT' },
  { value: 'COMPLETED', label: 'COMPLETED' },
  { value: 'CANCELLED', label: 'CANCELLED' },
]

const columns: TableColumn<DeliveryData>[] = [
  { key: 'delivery_id', label: 'Delivery', mono: true },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'vehicle', label: 'Armada', mono: true },
  { key: 'driver', label: 'Pengemudi', mono: true, hideBelow: 'md' },
  { key: 'estimated_arrival_time', label: 'ETA', hideBelow: 'lg' },
  { key: 'departure_time', label: 'Berangkat', hideBelow: 'lg' },
]

const list = usePaginatedList<DeliveryData>(
  (query) => fsos.operations.deliveries.list({
    ...query,
    status: status.value ?? undefined,
    vehicle: vehicleFilter.value ?? undefined,
  }),
  { searchFields: (row) => [row.delivery_id, row.vehicle, row.driver] },
)

async function loadOptions() {
  optionsLoading.value = true
  try {
    const [vehicles, kitchens, drivers, schools] = await Promise.all([
      references.load('vehicles', 'vehicle_id', 'plate_number', true),
      references.load('kitchens', 'kitchen_id', 'kitchen_name', true),
      references.load('drivers', 'driver_id', 'driver_name', true),
      references.load('schools', 'school_id', 'school_name', true),
    ])
    vehicleOptions.value = [{ value: null, label: 'Semua armada' }, ...vehicles]
    kitchenOptions.value = kitchens
    driverOptions.value = drivers
    schoolOptions.value = schools
  } finally {
    optionsLoading.value = false
  }
}

function resetCreateForm() {
  createForm.value = {
    kitchen_id: null,
    vehicle: null,
    driver: null,
    average_speed_kmph: '',
    items: [{ package_id: '', school_id: null, expected_version: '' }],
  }
  formErrors.value = {}
}

function openCreate() {
  resetCreateForm()
  createOpen.value = true
}

function addManifestRow() {
  createForm.value.items.push({ package_id: '', school_id: null, expected_version: '' })
}

function removeManifestRow(index: number) {
  if (createForm.value.items.length === 1) {
    createForm.value.items = [{ package_id: '', school_id: null, expected_version: '' }]
    return
  }
  createForm.value.items.splice(index, 1)
}

async function submitCreate() {
  if (saving.value) return
  formErrors.value = {}
  if (!createForm.value.kitchen_id || !createForm.value.vehicle || !createForm.value.driver) {
    formErrors.value.header = 'Dapur, armada, dan pengemudi wajib diisi.'
    return
  }
  const items = createForm.value.items
    .map((item) => ({
      package_id: item.package_id.trim(),
      school_id: item.school_id ?? '',
      expected_version: Number(item.expected_version),
    }))
    .filter((item) => item.package_id || item.school_id || item.expected_version)
  if (!items.length || items.some((item) => !item.package_id || !item.school_id || !Number.isInteger(item.expected_version) || item.expected_version < 1)) {
    formErrors.value.items = 'Minimal satu paket wajib berisi package ID, sekolah tujuan, dan version paket valid.'
    return
  }
  saving.value = true
  try {
    const created = await fsos.operations.deliveries.create({
      kitchen_id: createForm.value.kitchen_id,
      vehicle: createForm.value.vehicle,
      driver: createForm.value.driver,
      average_speed_kmph: createForm.value.average_speed_kmph || null,
      items,
    })
    toast.success('Manifest delivery dibuat', { description: shortId(created.delivery_id) })
    createOpen.value = false
    await list.refresh()
  } catch (error) {
    if (isApiError(error)) formErrors.value = error.fieldErrors
    toast.fromError(error, 'Gagal membuat delivery')
  } finally {
    saving.value = false
  }
}

async function openDetail(row: DeliveryData) {
  detailLoading.value = true
  detailTarget.value = null
  try {
    detailTarget.value = await fsos.operations.deliveries.detail(row.delivery_id)
  } catch (error) {
    toast.fromError(error, 'Gagal memuat detail delivery')
  } finally {
    detailLoading.value = false
  }
}

function openDepart(row: DeliveryData) {
  departTarget.value = row
  departForm.value = { estimated_arrival_time: row.estimated_arrival_time ?? '' }
  formErrors.value = {}
  departOpen.value = true
}

async function submitDepart() {
  const item = departTarget.value
  if (!item || saving.value) return
  saving.value = true
  formErrors.value = {}
  try {
    await fsos.operations.deliveries.depart(item.delivery_id, {
      expected_version: item.version,
      estimated_arrival_time: departForm.value.estimated_arrival_time || null,
    })
    toast.success('Delivery berangkat', { description: shortId(item.delivery_id) })
    departOpen.value = false
    departTarget.value = null
    await list.refresh()
  } catch (error) {
    if (isApiError(error)) formErrors.value = error.fieldErrors
    toast.fromError(error, 'Gagal depart delivery')
  } finally {
    saving.value = false
  }
}

async function completeDelivery(row: DeliveryData) {
  const ok = await confirm.destructive({
    title: 'Selesaikan delivery',
    message: 'Konfirmasi seluruh paket pada manifest sudah tiba secara fisik. Penerimaan sekolah tetap dicatat pada modul scan penerimaan sekolah.',
    details: [{ label: 'Delivery', value: row.delivery_id }, { label: 'expected_version', value: String(row.version) }],
    confirmationPhrase: shortId(row.delivery_id),
    confirmLabel: 'Selesaikan',
  })
  if (!ok) return
  try {
    await fsos.operations.deliveries.complete(row.delivery_id, row.version)
    toast.success('Delivery selesai', { description: shortId(row.delivery_id) })
    await list.refresh()
  } catch (error) {
    toast.fromError(error, 'Gagal menyelesaikan delivery')
  }
}

async function cancelDelivery(row: DeliveryData) {
  const ok = await confirm.destructive({
    title: 'Batalkan manifest',
    message: 'Hanya manifest CREATED yang bisa dibatalkan. Paket akan dilepas sesuai aturan backend.',
    details: [{ label: 'Delivery', value: row.delivery_id }, { label: 'expected_version', value: String(row.version) }],
    confirmationPhrase: shortId(row.delivery_id),
    confirmLabel: 'Batalkan manifest',
  })
  if (!ok) return
  try {
    await fsos.operations.deliveries.cancel(row.delivery_id, row.version)
    toast.success('Manifest dibatalkan', { description: shortId(row.delivery_id) })
    await list.refresh()
  } catch (error) {
    toast.fromError(error, 'Gagal membatalkan delivery')
  }
}

watch([status, vehicleFilter], () => list.reset())
onMounted(() => void loadOptions())
</script>

<template>
  <div>
    <PageHeader
      title="Pengiriman Aktif"
      description="Buat manifest, scan/loading ke armada, pantau perjalanan, dan selesaikan delivery sesuai alur distribusi FSTM."
      icon="lucide:truck"
      tag="Delivery.Read"
    >
      <template #actions>
        <AppButton icon="lucide:plus" @click="openCreate">Buat Manifest</AppButton>
      </template>
    </PageHeader>

    <AppCard class="mb-4" title="Filter pengiriman" icon="lucide:filter">
      <div class="grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
        <AppSelect v-model="status" label="Status" :options="statusOptions" />
        <AppSelect v-model="vehicleFilter" label="Armada" :options="vehicleOptions" :disabled="optionsLoading" />
      </div>
    </AppCard>

    <DataTable
      v-model:search="list.search.value"
      v-model:limit="list.limit.value"
      :columns="columns"
      :rows="list.visibleItems.value"
      row-key="delivery_id"
      :loading="list.loading.value"
      :refreshing="list.refreshing.value"
      :error="list.error.value"
      searchable
      search-placeholder="Cari delivery / armada / driver..."
      :pagination="{ page: list.page.value, offset: list.offset.value, hasNext: list.hasNext.value, hasPrev: list.hasPrev.value }"
      @next="list.next()"
      @prev="list.prev()"
      @refresh="list.refresh()"
      @retry="list.fetchPage()"
      @row-click="openDetail"
    >
      <template #cell-delivery_id="{ value }"><span class="font-mono text-xs">{{ shortId(String(value)) }}</span></template>
      <template #cell-status="{ value }"><AppBadge :status="String(value)" /></template>
      <template #cell-vehicle="{ value }"><span class="font-mono text-xs">{{ shortId(String(value)) }}</span></template>
      <template #cell-driver="{ value }"><span class="font-mono text-xs">{{ shortId(String(value)) }}</span></template>
      <template #cell-estimated_arrival_time="{ value }">{{ value ? formatDateTime(String(value)) : '---' }}</template>
      <template #cell-departure_time="{ value }">{{ value ? formatDateTime(String(value)) : '---' }}</template>
      <template #actions="{ row }">
        <div class="flex flex-wrap justify-end gap-1.5">
          <AppButton size="xs" variant="outline" icon="lucide:eye" @click="openDetail(row)">Detail</AppButton>
          <AppButton v-if="row.status === 'CREATED'" size="xs" icon="lucide:send" @click="openDepart(row)">Berangkat</AppButton>
          <AppButton v-if="row.status === 'IN_TRANSIT'" size="xs" icon="lucide:check" @click="completeDelivery(row)">Selesai</AppButton>
          <AppButton size="xs" variant="outline" icon="lucide:map" @click="router.push({ path: '/deliveries/tracking', query: { delivery: row.delivery_id } })">Tracking</AppButton>
          <AppButton v-if="row.status === 'CREATED'" size="xs" variant="ghost" icon="lucide:x" @click="cancelDelivery(row)">Cancel</AppButton>
        </div>
      </template>
    </DataTable>

    <AppModal v-model:open="createOpen" size="xl" title="Buat manifest delivery" icon="lucide:truck" description="Scan/isi paket RELEASED, pilih armada, driver, dan tujuan sekolah. Frontend dapat print/scan label paket sebelum dispatch." :busy="saving">
      <div class="space-y-4 py-2">
        <p v-if="formErrors.header" class="text-sm font-medium text-danger-600">{{ formErrors.header }}</p>
        <div class="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <AppSelect v-model="createForm.kitchen_id" label="Dapur asal" required :options="kitchenOptions" :disabled="optionsLoading" :error="formErrors.kitchen_id" />
          <AppSelect v-model="createForm.vehicle" label="Armada" required :options="vehicleOptions.filter((item) => item.value)" :disabled="optionsLoading" :error="formErrors.vehicle" />
          <AppSelect v-model="createForm.driver" label="Pengemudi" required :options="driverOptions" :disabled="optionsLoading" :error="formErrors.driver" />
          <AppInput v-model="createForm.average_speed_kmph" label="Kecepatan rata-rata km/jam" inputmode="decimal" placeholder="30.00" />
        </div>
        <p v-if="formErrors.items" class="text-sm font-medium text-danger-600">{{ formErrors.items }}</p>
        <div v-for="(item, index) in createForm.items" :key="index" class="rounded-2xl border border-surface-200 p-4 dark:border-surface-800">
          <div class="mb-3 flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-surface-700 dark:text-surface-200">Paket {{ index + 1 }}</p>
            <AppButton size="xs" variant="ghost" icon="lucide:trash-2" @click="removeManifestRow(index)">Hapus</AppButton>
          </div>
          <div class="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_1fr_0.6fr]">
            <AppInput v-model="item.package_id" label="Package ID / hasil scan" required placeholder="UUID paket" />
            <AppSelect v-model="item.school_id" label="Tujuan sekolah" required :options="schoolOptions" :disabled="optionsLoading" />
            <AppInput v-model="item.expected_version" label="Version paket" required inputmode="numeric" placeholder="3" />
          </div>
        </div>
        <AppButton variant="outline" icon="lucide:plus" @click="addManifestRow">Tambah paket</AppButton>
      </div>
      <template #footer>
        <AppButton variant="subtle" :disabled="saving" @click="createOpen = false">Batal</AppButton>
        <AppButton icon="lucide:save" :loading="saving" @click="submitCreate">Simpan Manifest</AppButton>
      </template>
    </AppModal>

    <AppModal :open="departOpen" size="md" title="Berangkat / loading armada" icon="lucide:send" description="Konfirmasi paket sudah dimuat ke armada. ETA opsional; wajib bila koordinat route belum lengkap." :busy="saving" @update:open="(value) => { departOpen = value; if (!value) departTarget = null }">
      <form class="space-y-4 py-2" @submit.prevent="submitDepart">
        <AppInput :model-value="departTarget ? shortId(departTarget.delivery_id) : ''" label="Delivery" readonly />
        <AppInput v-model="departForm.estimated_arrival_time" label="ETA manual ISO8601 opsional" placeholder="2026-09-16T11:30:00+07:00" :error="formErrors.estimated_arrival_time" />
      </form>
      <template #footer>
        <AppButton variant="subtle" :disabled="saving" @click="departOpen = false; departTarget = null">Batal</AppButton>
        <AppButton icon="lucide:send" :loading="saving" @click="submitDepart">Berangkat</AppButton>
      </template>
    </AppModal>

    <AppModal :open="detailTarget !== null" size="xl" title="Detail manifest delivery" icon="lucide:list-checks" :busy="detailLoading" @update:open="detailTarget = null">
      <div v-if="detailTarget" class="space-y-4 py-2">
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div class="rounded-xl bg-surface-50 p-3 dark:bg-surface-850"><p class="text-xs text-surface-500">Delivery</p><p class="font-mono font-bold">{{ shortId(detailTarget.delivery_id) }}</p></div>
          <div class="rounded-xl bg-surface-50 p-3 dark:bg-surface-850"><p class="text-xs text-surface-500">Status</p><AppBadge :status="detailTarget.status" /></div>
          <div class="rounded-xl bg-surface-50 p-3 dark:bg-surface-850"><p class="text-xs text-surface-500">ETA</p><p class="font-semibold">{{ detailTarget.estimated_arrival_time ? formatDateTime(detailTarget.estimated_arrival_time) : '---' }}</p></div>
          <div class="rounded-xl bg-surface-50 p-3 dark:bg-surface-850"><p class="text-xs text-surface-500">Jarak</p><p class="font-semibold">{{ detailTarget.estimated_distance_km ? `${formatDecimal(detailTarget.estimated_distance_km)} km` : '---' }}</p></div>
        </div>
        <div class="overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-800">
          <table class="min-w-full divide-y divide-surface-200 text-sm dark:divide-surface-800">
            <thead class="bg-surface-50 text-left text-xs uppercase text-surface-500 dark:bg-surface-850"><tr><th class="px-4 py-3">Paket</th><th class="px-4 py-3">Sekolah</th><th class="px-4 py-3">Kode</th><th class="px-4 py-3 text-right">Qty</th><th class="px-4 py-3">Status</th></tr></thead>
            <tbody class="divide-y divide-surface-100 dark:divide-surface-800">
              <tr v-for="item in detailTarget.items" :key="item.delivery_item_id">
                <td class="px-4 py-3 font-mono text-xs">{{ shortId(item.package_id) }}</td>
                <td class="px-4 py-3 font-mono text-xs">{{ shortId(item.school_id) }}</td>
                <td class="px-4 py-3 font-mono text-xs">{{ item.package.package_code }}</td>
                <td class="px-4 py-3 text-right">{{ formatDecimal(item.package.quantity) }}</td>
                <td class="px-4 py-3"><AppBadge :status="item.package.effective_status" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AppModal>
  </div>
</template>
