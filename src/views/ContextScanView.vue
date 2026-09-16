<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
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
        limit: 100,
      })
      materialResult.value =
        page.items.find((item) => item.qr_code === payload || item.batch_code === payload) ?? null
      if (!materialResult.value) throw new Error('Batch bahan tidak ditemukan.')
      toast.success('Batch bahan ditemukan', { description: materialResult.value.batch_code })
    } else {
      packageResult.value = await fsos.packages.resolve(payload)
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
          <div><p class="text-xs text-surface-500">Kedaluwarsa</p><p>{{ materialResult.expired_date ?? '—' }}</p></div>
          <p class="rounded-xl bg-surface-50 p-3 text-xs text-surface-500 dark:bg-surface-850">Batch ditemukan. Lanjutkan proses pengeluaran bahan dengan memilih storage dan jumlah yang akan dikeluarkan.</p>
        </div>
        <EmptyState v-else compact icon="lucide:qr-code" title="Belum ada hasil" description="Pindai QR sesuai aktivitas pada halaman ini." />

        <template v-if="packageResult" #footer>
          <div class="flex flex-wrap gap-2">
            <AppButton v-if="mode === 'traceability'" size="sm" icon="lucide:git-branch" :disabled="!packageResult.asset_uuid" @click="router.push({ path: '/traceability', query: { asset: packageResult!.asset_uuid } })">Telusuri jejak</AppButton>
            <p v-else class="text-xs text-surface-500">QR berhasil dibaca. Konfirmasi aksi berikutnya melalui workflow {{ mode === 'loading' ? 'delivery' : 'penerimaan sekolah' }}.</p>
          </div>
        </template>
      </AppCard>
    </div>
  </div>
</template>
