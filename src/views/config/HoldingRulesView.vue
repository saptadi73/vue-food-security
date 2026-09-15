<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable, { type TableColumn } from '@/components/ui/DataTable.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { fsos, isApiError } from '@/api'
import type { HoldingRule } from '@/api/modules/telemetry'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/utils/format'

const toast = useToastStore()

const columns: TableColumn[] = [
  { key: 'food_category', label: 'Kategori' },
  { key: 'warning_minutes', label: 'Warning (m)', align: 'right' },
  { key: 'maximum_minutes', label: 'Maksimum (m)', align: 'right' },
  { key: 'discard_minutes', label: 'Discard (m)', align: 'right' },
  { key: 'version', label: 'Ver', align: 'right', width: '64px' },
]

const list = usePaginatedList<HoldingRule>((query) => fsos.holdingRules.list(query), {
  searchFields: (row) => [row.food_category],
})

const formOpen = ref(false)
const editing = ref<HoldingRule | null>(null)
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const form = ref({
  food_category: '',
  warning_minutes: 30,
  maximum_minutes: 60,
  discard_minutes: 90,
})

const historyOpen = ref(false)
const historyRows = ref<Record<string, unknown>[]>([])
const historyLoading = ref(false)

function openForm(row: HoldingRule | null) {
  editing.value = row
  errors.value = {}
  form.value = row
    ? {
        food_category: row.food_category,
        warning_minutes: row.warning_minutes,
        maximum_minutes: row.maximum_minutes,
        discard_minutes: row.discard_minutes,
      }
    : { food_category: '', warning_minutes: 30, maximum_minutes: 60, discard_minutes: 90 }
  formOpen.value = true
}

async function save() {
  saving.value = true
  errors.value = {}
  try {
    const payload = {
      food_category: form.value.food_category.trim(),
      warning_minutes: Number(form.value.warning_minutes),
      maximum_minutes: Number(form.value.maximum_minutes),
      discard_minutes: Number(form.value.discard_minutes),
    }
    if (editing.value) {
      await fsos.holdingRules.update(editing.value.holding_rule_id, {
        ...payload,
        expected_version: editing.value.version,
      })
      toast.success('Holding rule diperbarui', {
        description: 'Timer paket yang sudah dibuat tidak ikut berubah.',
      })
    } else {
      await fsos.holdingRules.create(payload)
      toast.success('Holding rule dibuat')
    }
    formOpen.value = false
    await list.refresh()
  } catch (error) {
    if (isApiError(error)) errors.value = error.fieldErrors
    toast.fromError(error, 'Gagal menyimpan holding rule')
  } finally {
    saving.value = false
  }
}

async function openHistory(row: HoldingRule) {
  historyOpen.value = true
  historyLoading.value = true
  historyRows.value = []
  try {
    const page = await fsos.holdingRules.history(row.holding_rule_id, { limit: 50 })
    historyRows.value = page.items ?? []
  } catch (error) {
    toast.fromError(error, 'Gagal memuat riwayat')
  } finally {
    historyLoading.value = false
  }
}

/** Snapshot revisi memakai bentuk bebas; dibaca lewat helper agar template tetap sederhana. */
function snapshotOf(revision: Record<string, unknown>) {
  return (revision.snapshot ?? {}) as Partial<HoldingRule>
}
</script>

<template>
  <div>
    <PageHeader
      title="Holding Rule"
      description="Batas waktu holding per kategori makanan. Perubahan rule tidak memperpanjang timer paket yang sudah dialokasikan."
      icon="lucide:timer"
      tag="HoldingRule.Write"
    >
      <template #actions>
        <AppButton icon="lucide:plus" @click="openForm(null)">Tambah rule</AppButton>
      </template>
    </PageHeader>

    <DataTable
      v-model:search="list.search.value"
      v-model:limit="list.limit.value"
      :columns="columns"
      :rows="list.visibleItems.value"
      row-key="holding_rule_id"
      :loading="list.loading.value"
      :refreshing="list.refreshing.value"
      :error="list.error.value"
      searchable
      search-placeholder="Cari kategori…"
      :empty="{ icon: 'lucide:timer', title: 'Belum ada holding rule', actionLabel: 'Tambah rule' }"
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
      @empty-action="openForm(null)"
    >
      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <button
            type="button"
            class="grid size-8 place-items-center rounded-lg text-surface-400 transition hover:bg-surface-100 hover:text-brand-600 dark:hover:bg-surface-800"
            aria-label="Riwayat revisi"
            @click="openHistory(row)"
          >
            <Icon icon="lucide:history" :width="15" :height="15" />
          </button>
          <button
            type="button"
            class="grid size-8 place-items-center rounded-lg text-surface-400 transition hover:bg-surface-100 hover:text-brand-600 dark:hover:bg-surface-800"
            aria-label="Ubah"
            @click="openForm(row)"
          >
            <Icon icon="lucide:pencil" :width="15" :height="15" />
          </button>
        </div>
      </template>
    </DataTable>

    <AppModal
      v-model:open="formOpen"
      size="md"
      :title="editing ? 'Ubah holding rule' : 'Tambah holding rule'"
      icon="lucide:timer"
      description="PUT mengganti seluruh definisi dan menaikkan version. Tidak ada DELETE untuk holding rule."
      :busy="saving"
    >
      <form class="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2" @submit.prevent="save">
        <AppInput
          v-model="form.food_category"
          class="sm:col-span-2"
          label="Kategori makanan"
          required
          :error="errors.food_category"
          hint="Dicocokkan dengan kategori menu saat alokasi paket pertama."
        />
        <AppInput
          v-model="form.warning_minutes"
          label="Warning (menit)"
          type="number"
          :min="0"
          required
          :error="errors.warning_minutes"
        />
        <AppInput
          v-model="form.maximum_minutes"
          label="Maksimum (menit)"
          type="number"
          :min="1"
          required
          :error="errors.maximum_minutes"
          hint="Harus positif."
        />
        <AppInput
          v-model="form.discard_minutes"
          label="Discard (menit)"
          type="number"
          :min="0"
          required
          :error="errors.discard_minutes"
        />
      </form>

      <template #footer>
        <AppButton variant="subtle" :disabled="saving" @click="formOpen = false">Batal</AppButton>
        <AppButton icon="lucide:save" :loading="saving" @click="save">Simpan</AppButton>
      </template>
    </AppModal>

    <AppModal
      v-model:open="historyOpen"
      size="lg"
      title="Riwayat revisi"
      icon="lucide:history"
      description="Snapshot append-only, urut version menurun. Tidak dapat diubah atau dihapus."
    >
      <div v-if="historyLoading" class="space-y-2 py-3">
        <div v-for="row in 5" :key="row" class="skeleton h-12" />
      </div>
      <ul v-else class="divide-y divide-surface-100 py-1 dark:divide-surface-800/60">
        <li
          v-for="revision in historyRows"
          :key="String(revision.revision_id)"
          class="flex items-center gap-3 py-3"
        >
          <span
            class="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-100 font-mono text-xs font-bold dark:bg-surface-800"
          >
            v{{ revision.version }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">
              {{ snapshotOf(revision).food_category ?? '—' }}
            </p>
            <p class="text-[11px] text-surface-400">
              {{ formatDateTime(revision.captured_at as string) }}
            </p>
          </div>
          <span class="shrink-0 font-mono text-xs text-surface-500">
            {{ snapshotOf(revision).warning_minutes }}/{{ snapshotOf(revision).maximum_minutes }}/{{
              snapshotOf(revision).discard_minutes
            }}
          </span>
        </li>
        <li v-if="!historyRows.length" class="py-10 text-center text-sm text-surface-400">
          Belum ada revisi.
        </li>
      </ul>
      <template #footer>
        <AppButton variant="subtle" @click="historyOpen = false">Tutup</AppButton>
      </template>
    </AppModal>
  </div>
</template>
