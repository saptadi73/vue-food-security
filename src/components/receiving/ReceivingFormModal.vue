<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import { fsos } from '@/api'
import type { ReceivingInput, ReceivingItemInput } from '@/api/modules/operations'
import { useReferenceOptions } from '@/composables/useReferenceOptions'
import { useToastStore } from '@/stores/toast'

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [] }>()
const references = useReferenceOptions()
const toast = useToastStore()

const supplierOptions = ref<SelectOption[]>([])
const kitchenOptions = ref<SelectOption[]>([])
const materialOptions = ref<SelectOption[]>([])
const supplierId = ref<string | null>(null)
const kitchenId = ref<string | null>(null)
const receivedAt = ref(toLocalDateTime(new Date()))
const items = ref<ReceivingItemInput[]>([emptyItem()])
const saving = ref(false)

function toLocalDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function emptyItem(): ReceivingItemInput {
  return {
    raw_material_id: '',
    batch_code: '',
    quantity: '',
    temperature: null,
    condition: 'GOOD',
    photo: null,
    expired_date: null,
    qr_code: `fsos:raw-material-batch:${crypto.randomUUID()}`,
  }
}

function reset() {
  supplierId.value = null
  kitchenId.value = null
  receivedAt.value = toLocalDateTime(new Date())
  items.value = [emptyItem()]
}

async function loadOptions() {
  const [suppliers, kitchens, materials] = await Promise.all([
    references.load('suppliers', 'supplier_id', 'supplier_name', true),
    references.load('kitchens', 'kitchen_id', 'kitchen_name', true),
    references.load('rawMaterials', 'raw_material_id', 'material_name', true),
  ])
  supplierOptions.value = suppliers
  kitchenOptions.value = kitchens
  materialOptions.value = materials
}

async function submit() {
  if (!supplierId.value || !kitchenId.value || !receivedAt.value || saving.value) return
  if (items.value.some((item) => !item.raw_material_id || !item.batch_code.trim() || !item.quantity)) {
    toast.warning('Data item belum lengkap', {
      description: 'Pilih bahan, isi kode batch, dan jumlah pada setiap item.',
    })
    return
  }

  saving.value = true
  try {
    const payload: ReceivingInput = {
      supplier_id: supplierId.value,
      kitchen_id: kitchenId.value,
      received_at: new Date(receivedAt.value).toISOString(),
      items: items.value.map((item) => ({
        ...item,
        batch_code: item.batch_code.trim(),
        temperature: item.temperature || null,
        condition: item.condition?.trim() || null,
        expired_date: item.expired_date || null,
      })),
    }
    await fsos.operations.receivings.create(payload)
    toast.success('Penerimaan berhasil dibuat', {
      description: 'Draft siap diperiksa dan diselesaikan.',
    })
    open.value = false
    reset()
    emit('saved')
  } catch (error) {
    toast.fromError(error, 'Gagal membuat penerimaan')
  } finally {
    saving.value = false
  }
}

onMounted(() => void loadOptions())
</script>

<template>
  <AppModal
    v-model:open="open"
    title="Penerimaan bahan baru"
    description="Catat pemasok, dapur penerima, dan batch bahan yang datang."
    icon="lucide:package-plus"
    size="xl"
    :busy="saving"
  >
    <form id="receiving-form" class="space-y-5" @submit.prevent="submit">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AppSelect v-model="supplierId" label="Pemasok" :options="supplierOptions" required />
        <AppSelect v-model="kitchenId" label="Dapur penerima" :options="kitchenOptions" required />
        <AppInput v-model="receivedAt" label="Waktu diterima" type="datetime-local" required />
      </div>

      <section class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-bold text-surface-900 dark:text-white">Item bahan</h3>
            <p class="text-xs text-surface-500">Satu transaksi dapat berisi beberapa batch.</p>
          </div>
          <AppButton size="sm" variant="outline" icon="lucide:plus" @click="items.push(emptyItem())">
            Tambah item
          </AppButton>
        </div>

        <div
          v-for="(item, index) in items"
          :key="index"
          class="rounded-xl border border-surface-200 p-4 dark:border-surface-700"
        >
          <div class="mb-3 flex items-center justify-between">
            <p class="text-xs font-bold text-surface-500">ITEM {{ index + 1 }}</p>
            <AppButton
              v-if="items.length > 1"
              size="xs"
              variant="ghost"
              icon="lucide:trash-2"
              @click="items.splice(index, 1)"
            >
              Hapus item
            </AppButton>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AppSelect v-model="item.raw_material_id" label="Bahan" :options="materialOptions" required />
            <AppInput v-model="item.batch_code" label="Kode batch" required />
            <AppInput v-model="item.quantity" label="Jumlah" inputmode="decimal" required />
            <AppInput v-model="item.temperature" label="Suhu (°C)" inputmode="decimal" />
            <AppInput v-model="item.expired_date" label="Kedaluwarsa" type="date" />
            <AppInput v-model="item.condition" label="Kondisi" placeholder="GOOD / DAMAGED" />
            <AppInput
              v-model="item.qr_code"
              class="sm:col-span-2"
              label="Kode QR"
              hint="Dibuat otomatis dan dapat dicetak setelah penerimaan disimpan."
              readonly
            />
          </div>
        </div>
      </section>
    </form>

    <template #footer>
      <AppButton variant="ghost" :disabled="saving" @click="open = false">Batal</AppButton>
      <AppButton
        type="submit"
        form="receiving-form"
        icon="lucide:save"
        :loading="saving"
        :disabled="!supplierId || !kitchenId"
        @click="submit"
      >
        Simpan draft
      </AppButton>
    </template>
  </AppModal>
</template>
