<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import { isApiError } from '@/api'
import { useReferenceOptions } from '@/composables/useReferenceOptions'
import type { FieldDef, MasterDefinition } from '@/config/masterRegistry'

const props = defineProps<{
  definition: MasterDefinition
  record: Record<string, unknown> | null
  submit: (payload: Record<string, unknown>) => Promise<void>
}>()

const open = defineModel<boolean>('open', { required: true })

const form = reactive<Record<string, unknown>>({})
const fieldErrors = ref<Record<string, string>>({})
const generalError = ref('')
const saving = ref(false)
const references = useReferenceOptions()
const refOptions = reactive<Record<string, SelectOption[]>>({})

const isEdit = computed(() => props.record !== null)

function defaultFor(field: FieldDef) {
  if (field.defaultValue !== undefined) return field.defaultValue
  return field.type === 'select' || field.type === 'reference' ? null : ''
}

async function hydrate() {
  fieldErrors.value = {}
  generalError.value = ''
  for (const field of props.definition.fields) {
    const raw = props.record?.[field.key]
    form[field.key] = raw === undefined || raw === null ? defaultFor(field) : raw
    if (field.type === 'reference' && field.reference) {
      const { master, valueKey, labelKey, filterActive, deviceType } = field.reference
      refOptions[field.key] = await references.load(master, valueKey, labelKey, filterActive, deviceType)
    }
  }
}

watch(open, (value) => {
  if (value) void hydrate()
})

/**
 * Bangun payload sesuai kontrak: string kosong menjadi null (bukan ""),
 * angka dikirim sebagai integer, decimal tetap string agar presisi terjaga.
 */
function buildPayload(): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const field of props.definition.fields) {
    const value = form[field.key]
    if (value === '' || value === null || value === undefined) {
      if (field.required) {
        payload[field.key] = value
      } else if (!(field.type === 'select' && field.defaultValue)) {
        payload[field.key] = null
      }
      continue
    }
    payload[field.key] = field.type === 'number' ? Number(value) : value
  }
  // Optional null tidak perlu dikirim jika memang bawaan default.
  for (const key of Object.keys(payload)) {
    if (payload[key] === null) delete payload[key]
  }
  if (isEdit.value) payload.expected_version = Number(props.record?.version)
  return payload
}

function validate(): boolean {
  const errors: Record<string, string> = {}
  for (const field of props.definition.fields) {
    const value = form[field.key]
    if (field.required && (value === null || value === undefined || value === '')) {
      errors[field.key] = 'Wajib diisi.'
    }
  }
  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function save() {
  if (!validate()) return
  saving.value = true
  generalError.value = ''
  try {
    await props.submit(buildPayload())
    open.value = false
  } catch (error) {
    if (isApiError(error)) {
      fieldErrors.value = { ...fieldErrors.value, ...error.fieldErrors }
      generalError.value = error.displayMessage
    } else {
      generalError.value = 'Terjadi kesalahan tidak terduga.'
    }
  } finally {
    saving.value = false
  }
}

function inputType(field: FieldDef) {
  if (field.type === 'email') return 'email'
  if (field.type === 'number') return 'number'
  if (field.type === 'datetime') return 'datetime-local'
  return 'text'
}
</script>

<template>
  <AppModal
    v-model:open="open"
    size="lg"
    :icon="definition.icon"
    :title="`${isEdit ? 'Ubah' : 'Tambah'} ${definition.singular}`"
    :description="
      isEdit
        ? 'PUT mengganti seluruh definisi. Field opsional yang dikosongkan kembali ke default.'
        : definition.description
    "
    :busy="saving"
  >
    <form class="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2" @submit.prevent="save">
      <template v-for="field in definition.fields" :key="field.key">
        <div :class="field.full ? 'sm:col-span-2' : ''">
          <AppSelect
            v-if="field.type === 'select'"
            v-model="form[field.key] as string"
            :label="field.label"
            :options="field.options ?? []"
            :required="field.required"
            :hint="field.hint"
            :error="fieldErrors[field.key]"
          />
          <AppSelect
            v-else-if="field.type === 'reference'"
            v-model="form[field.key] as string"
            :label="field.label"
            :options="refOptions[field.key] ?? []"
            :required="field.required"
            :disabled="isEdit && field.immutable"
            :hint="isEdit && field.immutable ? 'Tidak dapat diubah setelah dibuat.' : field.hint"
            :error="fieldErrors[field.key]"
          />
          <AppInput
            v-else
            v-model="form[field.key] as string"
            :label="field.label"
            :type="inputType(field)"
            :required="field.required"
            :hint="isEdit && field.immutable ? 'Tidak dapat diubah setelah dibuat.' : field.hint"
            :error="fieldErrors[field.key]"
            :placeholder="field.placeholder"
            :maxlength="field.maxlength"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            :readonly="isEdit && field.immutable"
            :inputmode="field.type === 'decimal' ? 'decimal' : undefined"
          />
        </div>
      </template>

      <p
        v-if="generalError"
        class="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 sm:col-span-2 dark:bg-rose-500/10 dark:text-rose-300"
      >
        {{ generalError }}
      </p>

      <p v-if="isEdit" class="font-mono text-[11px] text-surface-400 sm:col-span-2">
        expected_version: {{ record?.version }}
      </p>
    </form>

    <template #footer>
      <AppButton variant="subtle" :disabled="saving" @click="open = false">Batal</AppButton>
      <AppButton icon="lucide:save" :loading="saving" @click="save">
        {{ isEdit ? 'Simpan perubahan' : 'Simpan' }}
      </AppButton>
    </template>
  </AppModal>
</template>
