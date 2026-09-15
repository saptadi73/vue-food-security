<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import QrScanner from '@/components/qr/QrScanner.vue'
import PackageSummary from '@/components/domain/PackageSummary.vue'
import { fsos, isApiError } from '@/api'
import { PACKAGE_QR_PREFIX, type PackageData } from '@/api/modules/operations'
import { useReferenceOptions } from '@/composables/useReferenceOptions'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const toast = useToastStore()
const references = useReferenceOptions()

const manualPayload = ref('')
const resolving = ref(false)
const current = ref<PackageData | null>(null)
const history = ref<{ payload: string; code: string; at: string; ok: boolean }[]>([])

const complaintOpen = ref(false)
const complaintSaving = ref(false)
const schoolOptions = ref<SelectOption[]>([])
const complaintForm = ref({
  school_id: null as string | null,
  description: '',
  photo: '',
})
const complaintErrors = ref<Record<string, string>>({})

async function resolve(payload: string) {
  const value = payload.trim()
  if (!value || resolving.value) return

  resolving.value = true
  try {
    const result = await fsos.packages.resolve(value)
    current.value = result
    history.value = [
      { payload: value, code: result.package_code, at: new Date().toISOString(), ok: true },
      ...history.value.filter((entry) => entry.payload !== value),
    ].slice(0, 8)
    toast.success('Paket ditemukan', { description: result.package_code })
  } catch (error) {
    history.value = [
      { payload: value, code: '---', at: new Date().toISOString(), ok: false },
      ...history.value,
    ].slice(0, 8)
    if (isApiError(error) && error.kind === 'not_found') {
      toast.warning('Paket tidak ditemukan', {
        description: 'Payload tidak dikenal, terhapus, atau milik tenant lain.',
      })
    } else {
      toast.fromError(error, 'Gagal resolve paket')
    }
  } finally {
    resolving.value = false
  }
}

function onDetected(payload: string) {
  manualPayload.value = payload
  void resolve(payload)
}

async function openComplaint() {
  if (!current.value) return
  complaintErrors.value = {}
  complaintForm.value = { school_id: null, description: '', photo: '' }
  schoolOptions.value = await references.load('schools', 'school_id', 'school_name', true)
  complaintOpen.value = true
}

async function submitComplaint() {
  const item = current.value
  if (!item || complaintSaving.value) return

  complaintErrors.value = {}
  if (!complaintForm.value.school_id) complaintErrors.value.school_id = 'Wajib diisi.'
  if (!complaintForm.value.description.trim()) complaintErrors.value.description = 'Wajib diisi.'
  if (Object.keys(complaintErrors.value).length) return

  complaintSaving.value = true
  try {
    const complaint = await fsos.complaints.create({
      package_code: item.package_code,
      school_id: complaintForm.value.school_id,
      description: complaintForm.value.description.trim(),
      photo: complaintForm.value.photo.trim() || undefined,
    })
    toast.success('Keluhan tercatat', { description: String(complaint.complaint_id) })
    complaintOpen.value = false
    await router.push('/complaints')
  } catch (error) {
    if (isApiError(error)) complaintErrors.value = error.fieldErrors
    toast.fromError(error, 'Gagal mencatat keluhan')
  } finally {
    complaintSaving.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Pindai QR Paket"
      description="Payload kanonik berbentuk fsos:package:<package_id>. Payload bukan token akses; bearer sesi tetap wajib saat resolve."
      icon="lucide:scan-line"
      tag="Package.Read"
    />

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div class="lg:col-span-3">
        <AppCard title="Kamera" icon="lucide:camera" flush>
          <div class="p-4">
            <QrScanner
              hint="Arahkan kamera ke QR pada label paket. Kamera hanya berjalan pada origin aman (HTTPS atau localhost)."
              @detected="onDetected"
              @error="(message) => toast.warning('Kamera', { description: message })"
            />

            <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
              <AppInput
                v-model="manualPayload"
                class="flex-1"
                label="Input manual"
                icon="lucide:keyboard"
                :placeholder="`${PACKAGE_QR_PREFIX}<package_id>`"
                @keydown.enter="resolve(manualPayload)"
              />
              <AppButton
                icon="lucide:search"
                :loading="resolving"
                :disabled="!manualPayload.trim()"
                @click="resolve(manualPayload)"
              >
                Resolve
              </AppButton>
            </div>
          </div>
        </AppCard>
      </div>

      <div class="space-y-4 lg:col-span-2">
        <AppCard title="Hasil pemindaian" icon="lucide:package-check" :loading="resolving">
          <PackageSummary v-if="current" :item="current" />
          <EmptyState
            v-else
            compact
            icon="lucide:qr-code"
            title="Belum ada paket"
            description="Pindai QR atau masukkan payload secara manual."
          />

          <template v-if="current" #footer>
            <div class="flex flex-wrap gap-2">
              <AppButton size="sm" icon="lucide:message-square-warning" @click="openComplaint">
                Laporkan keluhan
              </AppButton>
              <AppButton
                size="sm"
                variant="outline"
                icon="lucide:git-branch"
                :disabled="!current.asset_uuid"
                title="Buka traceability asset package."
                @click="router.push({ path: '/traceability', query: { asset: current!.asset_uuid } })"
              >
                Telusuri jejak
              </AppButton>
              <AppButton
                size="sm"
                variant="ghost"
                icon="lucide:qr-code"
                @click="router.push({ path: '/packages', query: { focus: current!.package_id } })"
              >
                Lihat QR
              </AppButton>
            </div>
          </template>
        </AppCard>

        <AppCard v-if="history.length" title="Riwayat sesi ini" icon="lucide:history" flush>
          <ul class="divide-y divide-surface-100 dark:divide-surface-800/60">
            <li
              v-for="entry in history"
              :key="entry.payload + entry.at"
              class="flex items-center gap-3 px-4 py-2.5"
            >
              <Icon
                :icon="entry.ok ? 'lucide:circle-check' : 'lucide:circle-x'"
                :width="15"
                :height="15"
                :class="entry.ok ? 'text-emerald-500' : 'text-rose-500'"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-semibold">{{ entry.code }}</span>
                <span class="block truncate font-mono text-[10px] text-surface-400">
                  {{ entry.payload }}
                </span>
              </span>
              <span class="shrink-0 text-[10px] text-surface-400">
                {{ formatDateTime(entry.at).split(' ').pop() }}
              </span>
            </li>
          </ul>
        </AppCard>
      </div>
    </div>

    <AppModal
      v-model:open="complaintOpen"
      size="lg"
      title="Laporkan keluhan paket"
      icon="lucide:message-square-warning"
      description="Keluhan dibuat dari hasil scan paket. Foto dikirim sebagai referensi path/URI, bukan upload multipart."
      :busy="complaintSaving"
    >
      <form class="grid grid-cols-1 gap-4 py-2" @submit.prevent="submitComplaint">
        <AppInput
          :model-value="current?.package_code ?? ''"
          label="Kode paket"
          icon="lucide:package"
          readonly
        />
        <AppSelect
          v-model="complaintForm.school_id"
          label="Sekolah pelapor"
          required
          :options="schoolOptions"
          :error="complaintErrors.school_id"
        />
        <AppInput
          v-model="complaintForm.description"
          label="Deskripsi keluhan"
          required
          :maxlength="4000"
          placeholder="Contoh: makanan berbau tidak normal saat diterima."
          :error="complaintErrors.description"
        />
        <AppInput
          v-model="complaintForm.photo"
          label="Referensi foto"
          :maxlength="1024"
          placeholder="example/complaints/photo-001.jpg"
          hint="Kontrak backend saat ini menerima path/URI foto, bukan file upload multipart."
          :error="complaintErrors.photo"
        />
      </form>

      <template #footer>
        <AppButton variant="subtle" :disabled="complaintSaving" @click="complaintOpen = false">
          Batal
        </AppButton>
        <AppButton icon="lucide:send" :loading="complaintSaving" @click="submitComplaint">
          Kirim keluhan
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>


