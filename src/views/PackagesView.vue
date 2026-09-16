<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import QrCodeView from '@/components/qr/QrCodeView.vue'
import PackageSummary from '@/components/domain/PackageSummary.vue'
import { fsos, isApiError } from '@/api'
import type { AllocationData, PackageData } from '@/api/modules/operations'
import type { OffsetPage } from '@/api/types'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { useReferenceOptions } from '@/composables/useReferenceOptions'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, formatDecimal, formatDuration, shortId } from '@/utils/format'

const route = useRoute()
const toast = useToastStore()
const confirm = useConfirm()
const references = useReferenceOptions()

const batchId = ref('')
const productionOptions = ref<SelectOption[]>([])
const productionLoading = ref(false)
const qrTarget = ref<PackageData | null>(null)
const detailTarget = ref<PackageData | null>(null)
const createOpen = ref(false)

const allocation = ref<AllocationData | null>(null)
const allocationLoading = ref(false)
const packagingOptions = ref<SelectOption[]>([])

const form = ref({
  package_type_id: null as string | null,
  package_code: '',
  package_number: 1,
  quantity: '',
  initial_temperature: '',
})
const formErrors = ref<Record<string, string>>({})
const saving = ref(false)

const columns: TableColumn<PackageData>[] = [
  { key: 'package_code', label: 'Kode paket', mono: true },
  { key: 'package_number', label: '#', align: 'right', width: '64px' },
  { key: 'quantity', label: 'Jumlah', align: 'right' },
  { key: 'effective_status', label: 'Status', align: 'center' },
  { key: 'timer_status', label: 'Holding', align: 'center' },
  { key: 'remaining_seconds', label: 'Sisa', align: 'right', hideBelow: 'md' },
  { key: 'expired_at', label: 'Kedaluwarsa', align: 'right', hideBelow: 'lg' },
]

const list = usePaginatedList<PackageData>(
  (query) => {
    if (!batchId.value) {
      return Promise.resolve<OffsetPage<PackageData>>({
        items: [],
        offset: Number(query.offset ?? 0),
        limit: Number(query.limit ?? 20),
        next_offset: null,
      })
    }
    return fsos.packages.list({ ...query, production_batch_id: batchId.value })
  },
  {
    searchFields: (row) => [row.package_code, row.package_id, String(row.package_number)],
    immediate: false,
  },
)

const canCreate = computed(() => Boolean(batchId.value.trim() && allocation.value))

async function loadProductionOptions() {
  productionLoading.value = true
  try {
    let rows: Record<string, unknown>[]
    try {
      const page = await fsos.operations.productionBatches.list({
        status: 'COMPLETED',
        offset: 0,
        limit: 20,
      })
      rows = page.items as unknown as Record<string, unknown>[]
    } catch {
      // Kompatibilitas dengan backend lama yang belum menerima filter status.
      const page = await fsos.operations.productionBatches.list({ offset: 0, limit: 20 })
      rows = (page.items as unknown as Record<string, unknown>[]).filter((row) => row.status === 'COMPLETED')
    }
    productionOptions.value = rows.map((row) => {
      const batchCode = String(row.batch_code ?? 'Tanpa kode')
      const finishedAt = row.finished_at ? formatDateTime(String(row.finished_at)) : '—'
      const actualQuantity = row.actual_quantity ? ` · hasil ${row.actual_quantity}` : ''
      return {
        value: String(row.production_batch_id ?? ''),
        label: `${batchCode} · selesai ${finishedAt}${actualQuantity}`,
      }
    })
  } catch (error) {
    toast.fromError(error, 'Gagal memuat daftar produksi')
  } finally {
    productionLoading.value = false
  }
}

async function loadAllocation() {
  const id = batchId.value.trim()
  allocation.value = null
  if (!id) return
  allocationLoading.value = true
  try {
    allocation.value = await fsos.packages.allocation(id)
  } catch (error) {
    if (isApiError(error) && error.kind !== 'not_found')
      toast.fromError(error, 'Gagal membaca alokasi')
  } finally {
    allocationLoading.value = false
  }
}

function applyFilter() {
  list.reset()
  void loadAllocation()
}

function showQrFromDetail() {
  qrTarget.value = detailTarget.value
  detailTarget.value = null
}

async function openCreate() {
  formErrors.value = {}
  form.value = {
    package_type_id: null,
    package_code: '',
    package_number: (list.items.value.length ?? 0) + 1,
    quantity: '',
    initial_temperature: '',
  }
  packagingOptions.value = await references.load('packagingTypes', 'packaging_type_id', 'name')
  createOpen.value = true
}

async function refreshPackageList() {
  await Promise.all([list.refresh(), loadAllocation()])
}

async function packageHolding(
  row: PackageData,
  action: 'start' | 'update' | 'release' | 'discard',
) {
  const isFinal = action === 'release' || action === 'discard'
  if (isFinal) {
    const ok = await confirm.caution({
      title: action === 'release' ? 'Release paket' : 'Discard paket',
      message:
        action === 'release'
          ? 'Paket akan dilepas dari workflow holding jika belum expired.'
          : 'Paket akan ditandai DISCARDED dan tidak dapat dikirim.',
      details: [
        { label: 'Kode paket', value: row.package_code },
        { label: 'expected_version', value: String(row.version) },
      ],
      confirmLabel: action === 'release' ? 'Release' : 'Discard',
    })
    if (!ok) return
  }

  try {
    if (action === 'start') {
      await fsos.packages.startHolding(row.package_id, { expected_version: row.version })
      toast.success('Holding dimulai', { description: row.package_code })
    } else if (action === 'update') {
      await fsos.packages.updateHolding(row.package_id, { expected_version: row.version })
      toast.success('Status holding diperbarui', { description: row.package_code })
    } else {
      await fsos.packages.finishHolding(row.package_id, {
        expected_version: row.version,
        outcome: action === 'release' ? 'RELEASED' : 'DISCARDED',
      })
      toast.success(action === 'release' ? 'Paket released' : 'Paket discarded', {
        description: row.package_code,
      })
    }
    await refreshPackageList()
  } catch (error) {
    toast.fromError(error, 'Gagal memperbarui holding paket')
  }
}

async function submitCreate() {
  const current = allocation.value
  if (!current) return

  formErrors.value = {}
  if (!form.value.package_type_id) formErrors.value.package_type_id = 'Wajib diisi.'
  if (!form.value.package_code.trim()) formErrors.value.package_code = 'Wajib diisi.'
  if (!form.value.quantity) formErrors.value.quantity = 'Wajib diisi.'
  if (Object.keys(formErrors.value).length) return

  // Konfirmasi ganda: alokasi paket menaikkan version produksi dan tidak dapat dibatalkan.
  const ok = await confirm.caution({
    title: 'Alokasikan paket',
    message:
      'Alokasi menaikkan version batch produksi, membekukan holding policy pada alokasi pertama, dan tidak memiliki operasi pembatalan.',
    details: [
      { label: 'Batch', value: current.production_batch_id },
      { label: 'expected_version', value: String(current.version) },
      { label: 'Sisa belum dialokasi', value: String(current.unallocated_quantity ?? 'â€”') },
      { label: 'Jumlah paket', value: form.value.quantity },
    ],
    confirmLabel: 'Alokasikan',
  })
  if (!ok) return

  saving.value = true
  try {
    await fsos.packages.create({
      production_batch_id: current.production_batch_id,
      expected_version: current.version,
      package_type_id: form.value.package_type_id!,
      package_code: form.value.package_code.trim(),
      package_number: Number(form.value.package_number),
      quantity: String(form.value.quantity),
      initial_temperature: form.value.initial_temperature
        ? String(form.value.initial_temperature)
        : null,
    })
    toast.success('Paket dialokasikan', { description: form.value.package_code })
    createOpen.value = false
    await refreshPackageList()
  } catch (error) {
    if (isApiError(error)) {
      formErrors.value = error.fieldErrors
      if (error.kind === 'conflict') {
        toast.warning('Version produksi berubah', {
          description: 'Alokasi dimuat ulang. Coba simpan kembali.',
        })
        await loadAllocation()
      } else {
        toast.fromError(error, 'Gagal mengalokasikan paket')
      }
    }
  } finally {
    saving.value = false
  }
}

watch(
  () => route.query.focus,
  async (value) => {
    if (typeof value !== 'string') return
    try {
      qrTarget.value = await fsos.packages.detail(value)
    } catch {
      /* diabaikan: paket mungkin milik tenant lain */
    }
  },
)

onMounted(() => {
  if (typeof route.query.batch === 'string') batchId.value = route.query.batch
  void loadProductionOptions()
  applyFilter()
})
</script>

<template>
  <div>
    <PageHeader
      title="Paket & QR"
      description="Pilih produksi yang sudah selesai, alokasikan paket, lalu buat dan cetak label QR."
      icon="lucide:package"
      tag="Package.Write"
    >
      <template #actions>
        <AppButton to="/scan" variant="outline" icon="lucide:scan-line">Pindai</AppButton>
        <AppButton icon="lucide:plus" :disabled="!canCreate" @click="openCreate">
          Alokasikan paket
        </AppButton>
      </template>
    </PageHeader>

    <!-- Pilih produksi + ringkasan alokasi -->
    <AppCard class="mb-4" title="Pilih produksi" icon="lucide:factory">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <AppSelect
          v-model="batchId"
          class="flex-1"
          label="Produksi selesai"
          :options="productionOptions"
          :disabled="productionLoading"
          placeholder="Pilih batch produksi"
          hint="Daftar hanya menampilkan produksi berstatus COMPLETED."
          @update:model-value="applyFilter"
        />
        <AppButton
          icon="lucide:qr-code"
          :disabled="!batchId"
          :loading="allocationLoading"
          @click="applyFilter"
        >
          Buat QR
        </AppButton>
      </div>

      <dl v-if="allocation" class="animate-fade-in mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          v-for="entry in [
            { label: 'Version', value: allocation.version },
            { label: 'Hasil aktual', value: formatDecimal(allocation.actual_quantity) },
            { label: 'Teralokasi', value: formatDecimal(allocation.allocated_quantity) },
            { label: 'Sisa', value: formatDecimal(allocation.unallocated_quantity) },
          ]"
          :key="entry.label"
          class="rounded-xl bg-surface-50 px-3 py-2.5 dark:bg-surface-850"
        >
          <dt class="text-[10px] font-bold tracking-wide text-surface-400 uppercase">
            {{ entry.label }}
          </dt>
          <dd class="font-mono text-base font-extrabold text-surface-900 dark:text-white">
            {{ entry.value }}
            <span class="text-xs font-normal text-surface-400">{{ allocation.uom ?? '' }}</span>
          </dd>
        </div>
      </dl>
    </AppCard>

    <DataTable
      v-model:search="list.search.value"
      v-model:limit="list.limit.value"
      :columns="columns"
      :rows="list.visibleItems.value"
      row-key="package_id"
      :loading="list.loading.value"
      :refreshing="list.refreshing.value"
      :error="list.error.value"
      searchable
      selectable
      search-placeholder="Cari kode paketâ€¦"
      :empty="{
        icon: 'lucide:package',
        title: 'Belum ada paket',
        description: 'Masukkan batch produksi yang sudah COMPLETED lalu alokasikan paket.',
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
      @row-click="(row) => (detailTarget = row)"
    >
      <template #cell-quantity="{ row }">
        {{ formatDecimal(row.quantity) }}
        <span class="text-xs text-surface-400">{{ row.uom }}</span>
      </template>
      <template #cell-effective_status="{ value }">
        <AppBadge :status="String(value)" />
      </template>
      <template #cell-timer_status="{ value }">
        <AppBadge :status="String(value)" dot />
      </template>
      <template #cell-remaining_seconds="{ value }">
        {{ formatDuration(value as number | null) }}
      </template>
      <template #cell-expired_at="{ value }">
        {{ formatDateTime(value as string | null) }}
      </template>

      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <button
            v-if="row.status === 'CREATED'"
            type="button"
            class="grid size-8 place-items-center rounded-lg text-surface-400 transition hover:bg-surface-100 hover:text-emerald-600 dark:hover:bg-surface-800"
            aria-label="Mulai holding"
            title="Mulai holding"
            @click="packageHolding(row, 'start')"
          >
            <Icon icon="lucide:timer" :width="15" :height="15" />
          </button>
          <button
            v-if="row.status === 'PACKAGED'"
            type="button"
            class="grid size-8 place-items-center rounded-lg text-surface-400 transition hover:bg-surface-100 hover:text-emerald-600 dark:hover:bg-surface-800"
            aria-label="Release holding"
            title="Release holding"
            @click="packageHolding(row, 'release')"
          >
            <Icon icon="lucide:check" :width="15" :height="15" />
          </button>
          <button
            v-if="
              row.status === 'CREATED' ||
              row.status === 'PACKAGED' ||
              row.effective_status === 'EXPIRED'
            "
            type="button"
            class="grid size-8 place-items-center rounded-lg text-surface-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
            aria-label="Discard paket"
            title="Discard paket"
            @click="packageHolding(row, 'discard')"
          >
            <Icon icon="lucide:trash-2" :width="15" :height="15" />
          </button>
          <button
            type="button"
            class="grid size-8 place-items-center rounded-lg text-surface-400 transition hover:bg-surface-100 hover:text-brand-600 dark:hover:bg-surface-800"
            aria-label="Refresh holding"
            title="Refresh holding"
            @click="packageHolding(row, 'update')"
          >
            <Icon icon="lucide:rotate-cw" :width="15" :height="15" />
          </button>
          <button
            type="button"
            class="grid size-8 place-items-center rounded-lg text-surface-400 transition hover:bg-surface-100 hover:text-brand-600 dark:hover:bg-surface-800"
            aria-label="Tampilkan QR"
            title="Buat dan cetak QR"
            @click="qrTarget = row"
          >
            <Icon icon="lucide:qr-code" :width="15" :height="15" />
          </button>
          <button
            type="button"
            class="grid size-8 place-items-center rounded-lg text-surface-400 transition hover:bg-surface-100 hover:text-brand-600 dark:hover:bg-surface-800"
            aria-label="Detail paket"
            @click="detailTarget = row"
          >
            <Icon icon="lucide:eye" :width="15" :height="15" />
          </button>
        </div>
      </template>
    </DataTable>

    <!-- Modal QR -->
    <AppModal
      :open="qrTarget !== null"
      size="sm"
      title="QR paket"
      icon="lucide:qr-code"
      @update:open="qrTarget = null"
    >
      <div v-if="qrTarget" class="py-2">
        <QrCodeView
          :value="qrTarget.qr_payload"
          :caption="qrTarget.package_code"
          :subcaption="`Paket #${qrTarget.package_number} Â· ${shortId(qrTarget.package_id)}`"
          :file-name="`qr-${qrTarget.package_code}`"
        />
      </div>
    </AppModal>

    <!-- Modal detail -->
    <AppModal
      :open="detailTarget !== null"
      size="md"
      title="Detail paket"
      icon="lucide:package-search"
      @update:open="detailTarget = null"
    >
      <div v-if="detailTarget" class="py-2">
        <PackageSummary :item="detailTarget" />
      </div>
      <template #footer>
        <AppButton variant="subtle" @click="detailTarget = null">Tutup</AppButton>
        <AppButton v-if="detailTarget" icon="lucide:qr-code" @click="showQrFromDetail">
          Tampilkan QR
        </AppButton>
      </template>
    </AppModal>

    <!-- Modal alokasi -->
    <AppModal
      v-model:open="createOpen"
      size="lg"
      title="Alokasikan paket"
      icon="lucide:package-plus"
      description="Quantity tidak boleh melebihi sisa hasil produksi. Tidak ada operasi edit/hapus paket."
      :busy="saving"
    >
      <form class="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2" @submit.prevent="submitCreate">
        <AppSelect
          v-model="form.package_type_id"
          label="Jenis kemasan"
          required
          :options="packagingOptions"
          :error="formErrors.package_type_id"
        />
        <AppInput
          v-model="form.package_code"
          label="Kode paket"
          required
          :maxlength="100"
          placeholder="PKG-001"
          :error="formErrors.package_code"
        />
        <AppInput
          v-model="form.package_number"
          label="Nomor paket"
          type="number"
          :min="1"
          required
          hint="Unik per batch produksi."
          :error="formErrors.package_number"
        />
        <AppInput
          v-model="form.quantity"
          label="Jumlah"
          inputmode="decimal"
          required
          :hint="`Maksimal ${allocation?.unallocated_quantity ?? 'â€”'} ${allocation?.uom ?? ''}`"
          :error="formErrors.quantity"
        />
        <AppInput
          v-model="form.initial_temperature"
          label="Suhu awal (Â°C)"
          inputmode="decimal"
          hint="Opsional, maksimal 2 desimal."
          :error="formErrors.initial_temperature"
        />
      </form>

      <template #footer>
        <AppButton variant="subtle" :disabled="saving" @click="createOpen = false">Batal</AppButton>
        <AppButton icon="lucide:package-plus" :loading="saving" @click="submitCreate">
          Alokasikan
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>

