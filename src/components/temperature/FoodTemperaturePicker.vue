<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { fsos } from '@/api'
import { mastersApi, type Device } from '@/api/modules/masters'
import type { FoodMeasurementContext, FoodTemperatureMeasurement } from '@/api/modules/foodTemperature'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/utils/format'

const props = defineProps<{ contextType: FoodMeasurementContext; contextId?: string | null; disabled?: boolean }>()
const temperature = defineModel<string>({ required: true })
const emit = defineEmits<{ measured: [measurement: FoodTemperatureMeasurement] }>()
const toast = useToastStore()
const devices = ref<Device[]>([])
const selected = ref('')
const loading = ref(false)
const measurement = ref<FoodTemperatureMeasurement | null>(null)

onMounted(async () => {
  try {
    const page = await mastersApi.devices.list({ limit: 100 })
    devices.value = page.items.filter(device =>
      device.status === 'ACTIVE' &&
      device.device_type === 'FOOD_TEMPERATURE' &&
      !device.zone_id,
    )
    if (devices.value.length === 1) selected.value = devices.value[0]!.device_id
  } catch (error) {
    toast.fromError(error, 'Gagal memuat sensor suhu makanan')
  }
})

async function measure() {
  if (!selected.value) return toast.warning('Pilih sensor suhu makanan')
  loading.value = true
  try {
    measurement.value = await fsos.foodTemperature.latest({
      device_id: selected.value,
      context_type: props.contextType,
      context_id: props.contextId || null,
      maximum_age_seconds: 60,
    })
    temperature.value = Number(measurement.value.temperature).toFixed(2)
    emit('measured', measurement.value)
    toast.success('Suhu berhasil diambil dari sensor', {
      description: `${temperature.value} deg C, sampel ${measurement.value.age_seconds} detik lalu`,
    })
  } catch (error) {
    toast.fromError(error, 'Gagal mengambil suhu dari sensor')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
    <div class="mb-3 flex items-center gap-2">
      <span class="grid size-9 place-items-center rounded-xl bg-cyan-500/15 text-cyan-600">
        <Icon icon="lucide:thermometer" :width="18" />
      </span>
      <div>
        <p class="text-sm font-bold text-surface-900 dark:text-white">Ukur suhu makanan</p>
        <p class="text-xs text-surface-500">Ambil satu sampel terbaru dari sensor MQTT</p>
      </div>
    </div>

    <div class="flex flex-col gap-2 sm:flex-row">
      <select
        v-model="selected"
        :disabled="disabled || loading"
        class="min-w-0 flex-1 rounded-xl border border-surface-300 bg-white px-3 py-2.5 text-sm dark:border-surface-700 dark:bg-surface-900"
      >
        <option value="">Pilih device FOOD_TEMPERATURE</option>
        <option v-for="device in devices" :key="device.device_id" :value="device.device_id">
          {{ device.device_name }} | {{ device.mqtt_topic || 'topic belum diatur' }}
        </option>
      </select>
      <button
        type="button"
        :disabled="disabled || loading || !selected"
        class="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-500 disabled:opacity-50"
        @click="measure"
      >
        {{ loading ? 'Mengambil sampel...' : 'Ambil dari sensor' }}
      </button>
    </div>

    <p v-if="!devices.length" class="mt-3 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
      Belum ada device ACTIVE bertipe FOOD_TEMPERATURE tanpa storage zone.
    </p>

    <div
      v-if="measurement"
      class="mt-4 overflow-hidden rounded-2xl border border-emerald-500/30 bg-white dark:bg-surface-900"
      aria-live="polite"
    >
      <div class="flex items-center justify-between gap-4 border-b border-surface-200 p-4 dark:border-surface-800">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-emerald-600">Suhu terukur</p>
          <p class="mt-1 text-4xl font-black tabular-nums text-surface-950 dark:text-white">
            {{ temperature }}<span class="ml-1 text-xl font-bold text-surface-500">&deg;C</span>
          </p>
        </div>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
          <span class="size-2 rounded-full bg-emerald-500" /> SAMPEL SEGAR
        </span>
      </div>
      <dl class="grid gap-3 p-4 text-xs sm:grid-cols-2">
        <div><dt class="text-surface-500">Sensor</dt><dd class="mt-0.5 font-semibold">{{ measurement.device_name }}</dd></div>
        <div><dt class="text-surface-500">Waktu sampel</dt><dd class="mt-0.5 font-semibold">{{ formatDateTime(measurement.recorded_at) }}</dd></div>
        <div><dt class="text-surface-500">Usia sampel</dt><dd class="mt-0.5 font-semibold">{{ measurement.age_seconds }} detik</dd></div>
        <div><dt class="text-surface-500">ID log sumber</dt><dd class="mt-0.5 font-mono font-semibold">{{ measurement.temperature_log_id.slice(0, 12) }}</dd></div>
      </dl>
    </div>
  </div>
</template>