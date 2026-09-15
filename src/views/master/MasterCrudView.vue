<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable from '@/components/ui/DataTable.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import MasterFormModal from './MasterFormModal.vue'
import { usePaginatedList } from '@/composables/usePaginatedList'
import { useReferenceOptions } from '@/composables/useReferenceOptions'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { resolveMaster, resourceFor } from '@/config/masterRegistry'
import { formatDateTime, shortId } from '@/utils/format'

const route = useRoute()
const toast = useToastStore()
const confirm = useConfirm()
const references = useReferenceOptions()

const definition = computed(() => resolveMaster(String(route.params.master ?? '')))
const parentValue = ref<string | null>(null)
const parentOptions = ref<SelectOption[]>([])

const formOpen = ref(false)
const editing = ref<Record<string, unknown> | null>(null)

const list = usePaginatedList<Record<string, unknown>>(
  (query) => {
    const master = definition.value
    if (!master) return Promise.resolve({ items: [], offset: 0, limit: 20, next_offset: null })
    return resourceFor(master).list(query) as Promise<never>
  },
  {
    immediate: false,
    filters: () => {
      const key = definition.value?.parentFilter?.key
      return key && parentValue.value ? { [key]: parentValue.value } : {}
    },
    searchFields: (row) =>
      (definition.value?.searchKeys ?? []).map((key) => String(row[key] ?? '')),
  },
)

async function loadParentOptions() {
  const filter = definition.value?.parentFilter
  parentOptions.value = []
  parentValue.value = null
  if (!filter) return
  const options = await references.load(filter.master, filter.valueKey, filter.labelKey)
  parentOptions.value = [{ value: null, label: `Semua ${filter.label.toLowerCase()}` }, ...options]
}

watch(
  definition,
  async (value) => {
    if (!value) return
    await loadParentOptions()
    list.reset()
  },
  { immediate: true },
)

watch(parentValue, () => list.reset())

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(row: Record<string, unknown>) {
  editing.value = row
  formOpen.value = true
}

async function submit(payload: Record<string, unknown>) {
  const master = definition.value!
  const resource = resourceFor(master)
  if (editing.value) {
    await resource.update(String(editing.value[master.idKey]), payload as never)
    toast.success(`${master.title} diperbarui`)
  } else {
    await resource.create(payload as never)
    toast.success(`${master.title} ditambahkan`)
  }
  references.invalidate(master.key)
  await list.refresh()
}

async function removeRow(row: Record<string, unknown>) {
  const master = definition.value!
  const identity = String(row[master.identityKey] ?? row[master.idKey])
  const ok = await confirm.destructive({
    title: `Hapus ${master.singular}`,
    message:
      'Soft delete menaikkan version dan menandai record terhapus. Backend menolak penghapusan bila masih ada referensi aktif, dan UI tidak menyediakan pemulihan.',
    details: [
      { label: 'Identitas', value: identity },
      { label: 'ID', value: String(row[master.idKey]) },
      { label: 'Version', value: String(row.version) },
    ],
    confirmationPhrase: identity,
    confirmLabel: 'Hapus permanen',
  })
  if (!ok) return

  try {
    await resourceFor(master).remove(String(row[master.idKey]), Number(row.version))
    toast.success(`${master.title} dihapus`, { description: identity })
    references.invalidate(master.key)
    await list.refresh()
  } catch (error) {
    toast.fromError(error, `Gagal menghapus ${master.singular}`)
  }
}

const DATE_KEYS = new Set(['updated_at', 'created_at', 'last_online', 'deleted_at'])
const ID_SUFFIX = /_id$|_uuid$/

function renderCell(column: { key: string }, value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (DATE_KEYS.has(column.key)) return formatDateTime(String(value))
  if (ID_SUFFIX.test(column.key)) return shortId(String(value))
  return String(value)
}
</script>

<template>
  <div v-if="definition">
    <PageHeader
      :title="definition.title"
      :description="definition.description"
      :icon="definition.icon"
      tag="CRUD"
    >
      <template #actions>
        <div v-if="definition.parentFilter" class="w-full sm:w-52">
          <AppSelect
            v-model="parentValue"
            :options="parentOptions"
            :placeholder="`Semua ${definition.parentFilter.label.toLowerCase()}`"
          />
        </div>
        <AppButton icon="lucide:plus" @click="openCreate">Tambah</AppButton>
      </template>
    </PageHeader>

    <DataTable
      v-model:search="list.search.value"
      v-model:limit="list.limit.value"
      :columns="definition.columns"
      :rows="list.visibleItems.value"
      :row-key="definition.idKey"
      :loading="list.loading.value"
      :refreshing="list.refreshing.value"
      :error="list.error.value"
      searchable
      :search-placeholder="`Cari ${definition.singular}…`"
      :empty="{
        icon: definition.icon,
        title: `Belum ada ${definition.singular}`,
        description: 'Tambahkan data pertama atau ubah filter induk.',
        actionLabel: 'Tambah',
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
      <template
        v-for="column in definition.columns"
        #[`cell-${column.key}`]="{ value }"
        :key="column.key"
      >
        <AppBadge v-if="column.key === 'status'" :status="String(value ?? '')" />
        <span v-else :title="String(value ?? '')">{{ renderCell(column, value) }}</span>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <button
            type="button"
            class="grid size-8 place-items-center rounded-lg text-surface-400 transition hover:bg-surface-100 hover:text-brand-600 dark:hover:bg-surface-800"
            aria-label="Ubah"
            @click="openEdit(row)"
          >
            <Icon icon="lucide:pencil" :width="15" :height="15" />
          </button>
          <button
            type="button"
            class="grid size-8 place-items-center rounded-lg text-surface-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
            aria-label="Hapus"
            @click="removeRow(row)"
          >
            <Icon icon="lucide:trash-2" :width="15" :height="15" />
          </button>
        </div>
      </template>
    </DataTable>

    <MasterFormModal
      v-model:open="formOpen"
      :definition="definition"
      :record="editing"
      :submit="submit"
    />
  </div>

  <div v-else class="py-20 text-center">
    <p class="text-sm text-surface-500">Master data tidak dikenal.</p>
  </div>
</template>
