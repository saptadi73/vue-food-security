<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import QrScanner from '@/components/qr/QrScanner.vue'
import PackageSummary from '@/components/domain/PackageSummary.vue'
import { fsos, isApiError } from '@/api'
import type { PackageData, RawMaterialBatchData } from '@/api/modules/operations'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, shortId } from '@/utils/format'

type ScanMode = 'material' | 'loading' | 'school-receiving' | 'traceability'

const props = defineProps<{ mode: ScanMode }>()
const router = useRouter()
const toast = useToastStore()
const manualValue = ref('')
const scanning = ref(false)
const packageResult = ref<PackageData | null>(null)
const materialResult = ref<RawMaterialBatchData | null>(null)
const receiptSaving = ref(false)
const consumptionSaving = ref(false)
const receiptErrors = ref<Record<string, string>>({})
const consumptionErrors = ref<Record<string, string>>({})
const receiptForm = ref({
  delivery_id: '',
  school: '',
  expected_version: '',
  received_quantity: '',
  condition: 'GOOD' as 'GOOD' | 'DAMAGED' | 'MISSING',
  accepted: 'true' as 'true' | 'false',
  temperature: '',
  photo: '',
  notes: '',
})
const consumptionForm = ref({
  expected_version: '',
  consumed_quantity: '',
  discarded_quantity: '0',
  notes: '',
})

const conditionOptions: SelectOption[] = [
  { value: 'GOOD', label: 'GOOD - diterima baik' },
  { value: 'DAMAGED', label: 'DAMAGED - rusak/kurang baik' },
  { value: 'MISSING', label: 'MISSING - tidak diterima/jumlah nol' },
]
const acceptedOptions: SelectOption[] = [
  { value: 'true', label: 'Diterima' },
  { value: 'false', label: 'Ditolak' },
]

const config = computed(() => {
  const values = {
    material: {
      title: 'Pindai Bahan Storage',
      description: 'Pindai label bahan untuk menyiapkan pengeluaran stok dari penyimpanan.',
      icon: 'lucide:wheat',
      hint: 'Arahkan kamera ke QR bahan makanan.',
    },
    loading: {
      title: 'Pindai Loading Delivery',
      description: 'Pindai kemasan saat makanan dimasukkan ke kendaraan pengiriman.',
      icon: 'lucide:truck',
      hint: 'Arahkan kamera ke QR paket yang akan dimuat.',
    },
    'school-receiving': {
      title: 'Pindai Penerimaan Sekolah',
      description: 'Pindai kemasan untuk memeriksa dan mencatat penerimaan di sekolah.',
      icon: 'lucide:school',
      hint: 'Arahkan kamera ke QR paket yang tiba di sekolah.',
    },
    traceability: {
      title: 'Cek Kemasan & Traceability',
      description: 'Periksa asal produksi, bahan, holding time, dan sisa waktu kedaluwarsa.',
      icon: 'lucide:git-branch',
      hint: 'Arahkan kamera ke QR paket untuk melihat detail traceability.',
    },
  }
  return values[props.mode]
})

async function resolve(value: string) {
  const payload = value.trim()
  if (!payload || scanning.value) return
  scanning.value = true
  packageResult.value = null
  materialResult.value = null
  try {
    if (props.mode === 'material') {
      const page = await fsos.operations.rawMaterialBatches.list({
        search: payload,
        offset: 0,
        limit: 20,
      })
      materialResult.value =
        page.items.find((item) => item.qr_code === payload || item.batch_code === payload) ?? null
      if (!materialResult.value) throw new Error('Batch bahan tidak ditemukan.')
      toast.success('Batch bahan ditemukan', { description: materialResult.value.batch_code })
    } else {
      packageResult.value = await fsos.packages.resolve(payload)
      receiptForm.value.expected_version = String(packageResult.value.version)
      receiptForm.value.received_quantity = packageResult.value.quantity ?? ''
      consumptionForm.value.expected_version = String(packageResult.value.version)
      consumptionForm.value.consumed_quantity = packageResult.value.quantity ?? ''
      consumptionForm.value.discarded_quantity = '0'
      consumptionForm.value.notes = ''
      if (props.mode === 'school-receiving') {
        receiptForm.value.delivery_id = ''
        receiptForm.value.school = ''
        const context = await fsos.packages.deliveryContext(packageResult.value.package_id)
        receiptForm.value.expected_version = String(context.package_version)
        if (context.delivery_id) receiptForm.value.delivery_id = context.delivery_id
        if (context.school) receiptForm.value.school = context.school
        if (!context.delivery_id || !context.school) {
          toast.warning('Konteks delivery belum ditemukan', { description: 'Isi Delivery ID dan School ID manual.' })
        } else if (context.package_status !== 'DELIVERED') {
          toast.warning('Paket belum siap diterima sekolah', { description: `Status paket saat ini ${context.package_status}` })
        } else if (context.delivery_status !== 'COMPLETED') {
          toast.warning('Delivery belum completed', { description: `Status saat ini ${context.delivery_status}` })
        }
      }
      toast.success('Paket ditemukan', { description: packageResult.value.package_code })
    }
    manualValue.value = payload
  } catch (error) {
    if (isApiError(error) && error.kind === 'not_found') {
      toast.warning('QR tidak ditemukan', { description: 'Pastikan QR sesuai tenant dan prosesnya.' })
    } else {
      toast.fromError(error, 'Gagal memproses QR')
    }
  } finally {
    scanning.value = false
  }
}

async function submitSchoolReceiving() {
  const item = packageResult.value
  if (!item || receiptSaving.value) return
  receiptErrors.value = {}
  if (!receiptForm.value.delivery_id.trim() || !receiptForm.value.school.trim()) {
    receiptErrors.value.header = 'Delivery ID dan sekolah tujuan wajib diisi.'
    return
  }
  if (!receiptForm.value.received_quantity.trim()) {
    receiptErrors.value.received_quantity = 'Jumlah diterima wajib diisi.'
    return
  }
  const expectedVersion = Number(receiptForm.value.expected_version)
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    receiptErrors.value.expected_version = 'Version paket wajib integer valid.'
    return
  }
  receiptSaving.value = true
  try {
    const receipt = await fsos.operations.schoolReceivings.create({
      delivery_id: receiptForm.value.delivery_id.trim(),
      package: item.package_id,
      school: receiptForm.value.school.trim(),
      expected_version: expectedVersion,
      received_quantity: receiptForm.value.received_quantity.trim(),
      condition: receiptForm.value.condition,
      accepted: receiptForm.value.accepted === 'true',
      temperature: receiptForm.value.temperature.trim() || null,
      photo: receiptForm.value.photo.trim() || null,
      notes: receiptForm.value.notes.trim() || null,
    })
    toast.success('Penerimaan sekolah tercatat', { description: shortId(receipt.school_receiving_id) })
    receiptForm.value.expected_version = String(expectedVersion + 1)
    consumptionForm.value.expected_version = String(expectedVersion + 1)
    if (receipt.accepted) {
      consumptionForm.value.consumed_quantity = receipt.received_quantity ?? ''
      consumptionForm.value.discarded_quantity = '0'
    }
  } catch (error) {
    if (isApiError(error)) receiptErrors.value = error.fieldErrors
    toast.fromError(error, 'Gagal mencatat penerimaan sekolah')
  } finally {
    receiptSaving.value = false
  }
}

async function submitConsumption() {
  const item = packageResult.value
  if (!item || consumptionSaving.value) return
  consumptionErrors.value = {}
  if (!consumptionForm.value.consumed_quantity.trim() || !consumptionForm.value.discarded_quantity.trim()) {
    consumptionErrors.value.quantity = 'Jumlah consumed dan discarded wajib diisi.'
    return
  }
  const expectedVersion = Number(consumptionForm.value.expected_version)
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    consumptionErrors.value.expected_version = 'Version paket wajib integer valid.'
    return
  }
  consumptionSaving.value = true
  try {
    const consumption = await fsos.operations.consumptions.create({
      package_id: item.package_id,
      expected_version: expectedVersion,
      consumed_quantity: consumptionForm.value.consumed_quantity.trim(),
      discarded_quantity: consumptionForm.value.discarded_quantity.trim(),
      notes: consumptionForm.value.notes.trim() || null,
    })
    toast.success('Konsumsi sekolah tercatat', { description: shortId(consumption.consumption_id) })
    consumptionForm.value.expected_version = String(expectedVersion + 1)
  } catch (error) {
    if (isApiError(error)) consumptionErrors.value = error.fieldErrors
    toast.fromError(error, 'Gagal mencatat konsumsi sekolah')
  } finally {
    consumptionSaving.value = false
  }
}
function onDetected(value: string) {
  manualValue.value = value
  void resolve(value)
}
</script>

<template>
  <div>
    <PageHeader :title="config.title" :description="config.description" :icon="config.icon" tag="QR">
      <template #actions>
        <AppButton to="/scan/traceability" variant="outline" icon="lucide:git-branch">
          Cek traceability
        </AppButton>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <AppCard title="Kamera scanner" :icon="config.icon" flush class="lg:col-span-3">
        <div class="p-4">
          <QrScanner :hint="config.hint" @detected="onDetected" @error="(message) => toast.warning('Kamera', { description: message })" />
          <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <AppInput v-model="manualValue" class="flex-1" label="Input manual QR" placeholder="Masukkan isi QR" @keydown.enter="resolve(manualValue)" />
            <AppButton icon="lucide:search" :loading="scanning" :disabled="!manualValue.trim()" @click="resolve(manualValue)">Proses</AppButton>
          </div>
        </div>
      </AppCard>

      <AppCard title="Hasil scan" icon="lucide:scan-line" :loading="scanning" class="lg:col-span-2">
        <PackageSummary v-if="packageResult" :item="packageResult" />
        <div v-else-if="materialResult" class="space-y-3 text-sm">
          <div><p class="text-xs text-surface-500">Kode batch</p><p class="font-mono font-bold">{{ materialResult.batch_code }}</p></div>
          <div><p class="text-xs text-surface-500">Status</p><p class="font-semibold">{{ materialResult.status }}</p></div>
          <div><p class="text-xs text-surface-500">Kedaluwarsa</p><p>{{ materialResult.expired_date ?? 'â€”' }}</p></div>
          <p class="rounded-xl bg-surface-50 p-3 text-xs text-surface-500 dark:bg-surface-850">Batch ditemukan. Lanjutkan proses pengeluaran bahan dengan memilih storage dan jumlah yang akan dikeluarkan.</p>
        </div>
        <EmptyState v-else compact icon="lucide:qr-code" title="Belum ada hasil" description="Pindai QR sesuai aktivitas pada halaman ini." />

        <template v-if="packageResult" #footer>
          <div class="flex flex-wrap gap-2">
            <AppButton v-if="mode === 'traceability'" size="sm" icon="lucide:git-branch" :disabled="!packageResult.asset_uuid" @click="router.push({ path: '/traceability', query: { asset: packageResult!.asset_uuid } })">Telusuri jejak</AppButton>
            <p v-if="mode === 'loading'" class="text-xs text-surface-500">QR berhasil dibaca. Konfirmasi loading paket melalui workflow delivery.</p>
          </div>
        </template>

        <div v-if="packageResult && mode === 'school-receiving'" class="mt-4 border-t border-surface-200 pt-4 dark:border-surface-800">
          <h3 class="mb-3 text-sm font-bold text-surface-800 dark:text-surface-100">Konfirmasi penerimaan sekolah</h3>
          <p v-if="receiptErrors.header" class="mb-3 text-sm font-medium text-danger-600">{{ receiptErrors.header }}</p>
          <div class="grid grid-cols-1 gap-3">
            <AppInput v-model="receiptForm.delivery_id" label="Delivery ID" required placeholder="UUID delivery completed" :error="receiptErrors.delivery_id" />
            <AppInput v-model="receiptForm.school" label="School ID" required placeholder="UUID sekolah tujuan" :error="receiptErrors.school" />
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AppInput v-model="receiptForm.expected_version" label="Version paket" required inputmode="numeric" :error="receiptErrors.expected_version" />
              <AppInput v-model="receiptForm.received_quantity" label="Jumlah diterima" required inputmode="decimal" :error="receiptErrors.received_quantity" />
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AppSelect v-model="receiptForm.condition" label="Kondisi" required :options="conditionOptions" :error="receiptErrors.condition" />
              <AppSelect v-model="receiptForm.accepted" label="Keputusan" required :options="acceptedOptions" :error="receiptErrors.accepted" />
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AppInput v-model="receiptForm.temperature" label="Suhu manual (C)" inputmode="decimal" :error="receiptErrors.temperature" />
              <AppInput v-model="receiptForm.photo" label="Referensi foto" placeholder="receipt/photo-001.jpg" :error="receiptErrors.photo" />
            </div>
            <AppInput v-model="receiptForm.notes" label="Catatan" placeholder="Wajib jika ditolak atau jumlah berbeda" :error="receiptErrors.notes" />
            <AppButton icon="lucide:school" :loading="receiptSaving" @click="submitSchoolReceiving">Catat penerimaan</AppButton>
          </div>

          <div class="mt-5 border-t border-surface-200 pt-4 dark:border-surface-800">
            <h3 class="mb-3 text-sm font-bold text-surface-800 dark:text-surface-100">Finalisasi konsumsi / discard</h3>
            <p v-if="consumptionErrors.quantity" class="mb-3 text-sm font-medium text-danger-600">{{ consumptionErrors.quantity }}</p>
            <div class="grid grid-cols-1 gap-3">
              <AppInput v-model="consumptionForm.expected_version" label="Version paket setelah receipt" required inputmode="numeric" :error="consumptionErrors.expected_version" />
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AppInput v-model="consumptionForm.consumed_quantity" label="Jumlah dikonsumsi" required inputmode="decimal" :error="consumptionErrors.consumed_quantity" />
                <AppInput v-model="consumptionForm.discarded_quantity" label="Jumlah dibuang" required inputmode="decimal" :error="consumptionErrors.discarded_quantity" />
              </div>
              <AppInput v-model="consumptionForm.notes" label="Catatan konsumsi/discard" placeholder="Wajib jika ada discard atau konsumsi melewati holding" :error="consumptionErrors.notes" />
              <AppButton icon="lucide:utensils" :loading="consumptionSaving" @click="submitConsumption">Catat konsumsi</AppButton>
            </div>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>


