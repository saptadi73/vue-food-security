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
    devices.value = page.items.filter(device => device.status === 'ACTIVE' && device.device_type === 'FOOD_TEMPERATURE' && !device.zone_id)
    if (devices.value.length === 1) selected.value = devices.value[0]!.device_id
  } catch (error) { toast.fromError(error, 'Gagal memuat food probe') }
})

async function measure() {
  if (!selected.value) return toast.warning('Pilih food probe')
  loading.value = true
  try {
    measurement.value = await fsos.foodTemperature.latest({ device_id: selected.value, context_type: props.contextType, context_id: props.contextId || null, maximum_age_seconds: 60 })
    temperature.value = Number(measurement.value.temperature).toFixed(2)
    emit('measured', measurement.value)
    toast.success('Suhu diambil dari sensor', { description: `${temperature.value} Â°C Â· sampel ${measurement.value.age_seconds} detik lalu` })
  } catch (error) { toast.fromError(error, 'Gagal mengambil suhu food probe') }
  finally { loading.value = false }
}
</script>

<template>
  <div class="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3">
    <div class="mb-2 flex items-center gap-2"><Icon icon="lucide:thermometer" class="text-cyan-600"/><p class="text-sm font-semibold">Ambil dari food probe</p></div>
    <div class="flex flex-col gap-2 sm:flex-row"><select v-model="selected" :disabled="disabled || loading" class="min-w-0 flex-1 rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-900"><option value="">Pilih device FOOD_TEMPERATURE</option><option v-for="device in devices" :key="device.device_id" :value="device.device_id">{{ device.device_name }} Â· {{ device.mqtt_topic || 'topic belum diatur' }}</option></select><button type="button" :disabled="disabled || loading || !selected" class="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="measure">{{ loading ? 'Mengambil...' : 'Ambil dari sensor' }}</button></div>
    <p v-if="!devices.length" class="mt-2 text-xs text-amber-600">Belum ada device ACTIVE bertipe FOOD_TEMPERATURE tanpa storage zone.</p>
    <p v-if="measurement" class="mt-2 text-xs text-surface-500">{{ measurement.temperature }} Â°C Â· {{ formatDateTime(measurement.recorded_at) }} Â· usia {{ measurement.age_seconds }} detik Â· log {{ measurement.temperature_log_id.slice(0,8) }}</p>
  </div>
</template>