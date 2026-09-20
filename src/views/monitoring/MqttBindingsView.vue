<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { fsos } from '@/api'
import { isApiError } from '@/api'
import { env } from '@/config/env'
import type { DeviceInput, Vehicle } from '@/api/modules/masters'
import type { MqttEventRecord, MqttTopicRecord } from '@/api/modules/telemetry'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import { formatDateTime, shortId } from '@/utils/format'

const toast = useToastStore()
const authStore = useAuthStore()
const topics = ref<MqttTopicRecord[]>([])
const events = ref<MqttEventRecord[]>([])
const vehicles = ref<Vehicle[]>([])
const selectedTopic = ref<string | null>(null)
const selectedEvent = ref<MqttEventRecord | null>(null)
const selectedVehicle = ref<string | null>(null)
const selectedDeviceUuid = ref<string | null>(null)
const devices = ref<Awaited<ReturnType<typeof fsos.masters.devices.list>>['items']>([])
const deviceName = ref('')
const hardware = ref('')
const loadingDevices = ref(false)
const loadingTopics = ref(false)
const loadingEvents = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const debugResponse = ref<Record<string, unknown> | null>(null)
const bindingPanel = ref<{ $el?: HTMLElement } | null>(null)

const vehicleOptions = computed<SelectOption[]>(() =>
  vehicles.value
    .filter((vehicle) => vehicle.status === 'ACTIVE')
    .map((vehicle) => ({
      value: vehicle.vehicle_id,
      label: `${vehicle.vehicle_code} · ${vehicle.plate_number}`,
    })),
)

const payload = computed<Record<string, unknown>>(() => {
  const value = selectedEvent.value?.payload_json
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
})

const eventDeviceUuid = computed(() => {
  const candidate = payload.value.device_uuid ?? payload.value.device_id
  return typeof candidate === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : ''
})

const eventType = computed(() => {
  const candidate = payload.value.device_type ?? payload.value.type ?? payload.value.event_type
  if (typeof candidate === 'string') return candidate
  return selectedEvent.value?.topic.endsWith('/gps') || payload.value.event === 'gps' ? 'GPS' : 'FOOD_TEMPERATURE'
})

const mqttEvent = computed(() => typeof payload.value.event === 'string' ? payload.value.event : null)
const mqttSensor = computed(() => typeof payload.value.sensor === 'number' ? payload.value.sensor : null)
const selectedDevice = computed(() => devices.value.find((device) => device.device_uuid === selectedDeviceUuid.value) ?? null)
const deviceOptions = computed<SelectOption[]>(() => devices.value
  .filter((device) => device.status === 'ACTIVE')
  .map((device) => ({
    value: device.device_uuid,
    label: `${device.device_name} · ${device.device_type} · ${device.mqtt_topic ?? 'tanpa topic'}`,
  })))

async function loadTopics() {
  loadingTopics.value = true
  error.value = null
  debugResponse.value = {
    phase: 'topics',
    state: 'loading',
    method: 'GET',
    endpoint: `${env.apiBase}/mqtt/topics?limit=100`,
    session_tenant_id: authStore.identity?.tenant_id ?? null,
  }
  try {
    const page = await fsos.mqtt.topics({ limit: 100 })
    topics.value = page.items
    debugResponse.value = {
      phase: 'topics',
      state: 'success',
      method: 'GET',
      endpoint: `${env.apiBase}/mqtt/topics?limit=100`,
      session_tenant_id: authStore.identity?.tenant_id ?? null,
      item_count: page.items.length,
      topics: page.items.map((item) => item.topic),
      next_offset: page.next_offset,
    }
    const firstTopic = page.items[0]
    if (!selectedTopic.value && firstTopic) await selectTopic(firstTopic.topic)
  } catch (cause) {
    error.value = 'Daftar topic MQTT belum dapat dimuat.'
    debugResponse.value = isApiError(cause)
      ? {
          phase: 'topics',
          state: 'error',
          method: cause.method,
          endpoint: `${env.apiBase}${cause.path}`,
          session_tenant_id: authStore.identity?.tenant_id ?? null,
          status: cause.status,
          code: cause.code,
          message: cause.message,
          display_message: cause.displayMessage,
          request_id: cause.requestId,
          correlation_id: cause.correlationId,
        }
      : {
          phase: 'topics',
          state: 'error',
          method: 'GET',
          endpoint: `${env.apiBase}/mqtt/topics?limit=100`,
          session_tenant_id: authStore.identity?.tenant_id ?? null,
          message: cause instanceof Error ? cause.message : String(cause),
        }
    toast.fromError(cause, 'Gagal memuat topic MQTT')
  } finally {
    loadingTopics.value = false
  }
}

async function loadVehicles() {
  try {
    const page = await fsos.masters.vehicles.list({ limit: 100 })
    vehicles.value = page.items
  } catch (cause) {
    toast.fromError(cause, 'Gagal memuat armada')
  }
}

async function selectTopic(topic: string) {
  selectedTopic.value = topic
  selectedEvent.value = null
  loadingEvents.value = true
  try {
    const page = await fsos.mqtt.events({ topic, limit: 100 })
    events.value = page.items
  } catch (cause) {
    events.value = []
    toast.fromError(cause, 'Gagal memuat event MQTT')
  } finally {
    loadingEvents.value = false
  }
}

async function loadDevicesForEvent() {
  loadingDevices.value = true
  try {
    const page = await fsos.masters.devices.list({ limit: 100 })
    devices.value = page.items
  } catch (cause) {
    devices.value = []
    toast.fromError(cause, 'Gagal memuat Device aktif')
  } finally {
    loadingDevices.value = false
  }
}

async function chooseEvent(event: MqttEventRecord) {
  selectedEvent.value = event
  selectedDeviceUuid.value = null
  deviceName.value = eventType.value === 'GPS'
    ? `GPS ${event.topic.split('/').filter(Boolean).at(-2) ?? 'MQTT'}`
    : String(payload.value.event ?? 'Sensor Suhu MQTT')
  hardware.value = ''
  await loadDevicesForEvent()
  await nextTick()
  bindingPanel.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function createAndBind() {
  if (!selectedEvent.value || (eventType.value === 'GPS' && !selectedVehicle.value)) return
  saving.value = true
  try {
    let device = selectedDevice.value
    if (device) {
      device = await fsos.masters.devices.update(device.device_id, {
        device_uuid: device.device_uuid,
        device_name: device.device_name,
        device_type: device.device_type,
        firmware: device.firmware,
        hardware: device.hardware,
        zone_id: device.zone_id,
        mqtt_topic: selectedEvent.value.topic,
        mqtt_event: mqttEvent.value,
        mqtt_sensor: mqttSensor.value,
        status: 'ACTIVE',
        last_online: selectedEvent.value.received_at,
        expected_version: device.version,
      })
    } else {
      if (!deviceName.value.trim()) return
      const input: DeviceInput = {
        device_uuid: eventDeviceUuid.value || null,
        device_name: deviceName.value.trim(),
        device_type: eventType.value,
        hardware: hardware.value.trim() || null,
        mqtt_topic: selectedEvent.value.topic,
        mqtt_event: mqttEvent.value,
        mqtt_sensor: mqttSensor.value,
        status: 'ACTIVE',
        zone_id: null,
        firmware: null,
        last_online: selectedEvent.value.received_at,
      }
      device = await fsos.masters.devices.create(input)
    }
    if (eventType.value === 'GPS' && selectedVehicle.value) {
      await fsos.masters.deviceBindings.create({
        device_id: device.device_id,
        vehicle_id: selectedVehicle.value,
      })
    }
    toast.success(selectedDevice.value
      ? 'Device MQTT berhasil diperbarui dan di-binding ke event'
      : eventType.value === 'GPS'
        ? 'Device MQTT berhasil dibuat dan dibinding ke armada'
        : 'Device sensor MQTT berhasil dibuat dengan selector event')
    selectedEvent.value = null
    selectedVehicle.value = null
    selectedDeviceUuid.value = null
    await loadTopics()
  } catch (cause) {
    toast.fromError(cause, 'Gagal membuat device atau binding armada')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void Promise.all([loadTopics(), loadVehicles()])
})
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      title="Binding MQTT Device"
      description="Pilih topic dan event MQTT, buat Device dengan selector payload, lalu hubungkan GPS ke armada."
      icon="lucide:radio-tower"
      tag="Device.Read"
    >
      <template #actions>
        <AppButton variant="outline" icon="lucide:refresh-cw" :loading="loadingTopics" @click="loadTopics">
          Segarkan
        </AppButton>
      </template>
    </PageHeader>

    <div v-if="error" class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
      {{ error }}
    </div>

    <details class="rounded-xl border border-surface-200 bg-surface-50 p-4 text-xs dark:border-surface-700 dark:bg-surface-900/60" open>
      <summary class="cursor-pointer font-semibold text-surface-700 dark:text-surface-200">Debug response GET topic</summary>
      <pre class="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-950 p-3 font-mono text-[11px] text-surface-100">{{ JSON.stringify(debugResponse, null, 2) }}</pre>
      <p class="mt-2 text-surface-500">Token dan kredensial tidak ditampilkan. Gunakan <code>request_id</code> untuk mencocokkan log backend.</p>
    </details>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <AppCard title="1. Topic MQTT tersimpan" subtitle="Pilih topic untuk melihat event terakhir" icon="lucide:list-tree" :loading="loadingTopics">
        <div v-if="topics.length" class="space-y-2">
          <button
            v-for="topic in topics"
            :key="topic.topic"
            type="button"
            class="w-full rounded-xl border p-3 text-left transition"
            :class="selectedTopic === topic.topic ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-surface-200 hover:border-brand-300 dark:border-surface-700'"
            @click="selectTopic(topic.topic)"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="break-all font-mono text-xs text-surface-800 dark:text-surface-100">{{ topic.topic }}</span>
              <AppBadge :status="String(topic.event_count)" />
            </div>
            <p class="mt-1 text-xs text-surface-500">Terakhir: {{ formatDateTime(topic.latest_received_at) }}</p>
          </button>
        </div>
        <EmptyState v-else icon="lucide:radio-tower" title="Belum ada topic tersimpan" description="Topic akan muncul setelah ada pesan MQTT yang masuk ke mqtt_message_log." />
      </AppCard>

      <AppCard title="2. Event pada topic" :subtitle="selectedTopic ?? 'Pilih topic di sebelah kiri'" icon="lucide:inbox" :loading="loadingEvents">
        <div v-if="events.length" class="space-y-3">
          <article v-for="event in events" :key="event.message_uuid" class="rounded-xl border border-surface-200 p-4 dark:border-surface-700">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="font-mono text-xs text-surface-500">{{ shortId(event.message_uuid) }}</p>
                <p class="mt-1 text-sm font-semibold text-surface-900 dark:text-white">{{ formatDateTime(event.received_at) }}</p>
              </div>
              <AppButton
                size="sm"
                :variant="selectedEvent?.message_uuid === event.message_uuid ? 'primary' : 'outline'"
                icon="lucide:arrow-right"
                @click="chooseEvent(event)"
              >
                {{ selectedEvent?.message_uuid === event.message_uuid ? 'Event terpilih' : 'Pilih event' }}
              </AppButton>
            </div>
            <pre class="mt-3 max-h-40 overflow-auto rounded-lg bg-surface-950 p-3 text-xs text-surface-100">{{ JSON.stringify(event.payload_json ?? event.payload_text ?? {}, null, 2) }}</pre>
          </article>
        </div>
        <EmptyState v-else icon="lucide:inbox" title="Belum ada event pada topic" description="Pilih topic yang memiliki event tersimpan." />
      </AppCard>
    </div>

    <AppCard ref="bindingPanel" title="3. Binding Device MQTT" subtitle="Pilih Device aktif yang sudah ada, atau buat baru bila diperlukan" icon="lucide:link-2">
      <div v-if="selectedEvent" class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-xl bg-surface-50 p-4 text-sm dark:bg-surface-800/60">
          <p class="font-semibold text-surface-900 dark:text-white">Event terpilih</p>
          <p class="mt-2 break-all font-mono text-xs text-surface-600 dark:text-surface-300">{{ selectedEvent.topic }}</p>
          <dl class="mt-3 space-y-1 text-xs text-surface-500">
            <div class="flex justify-between gap-3"><dt>Device UUID</dt><dd class="font-mono">{{ eventDeviceUuid || 'Akan dibuat backend' }}</dd></div>
            <div class="flex justify-between gap-3"><dt>Tipe</dt><dd>{{ eventType }}</dd></div>
            <div class="flex justify-between gap-3"><dt>Selector event</dt><dd>{{ mqttEvent || 'Semua event' }}</dd></div>
            <div class="flex justify-between gap-3"><dt>Selector sensor</dt><dd>{{ mqttSensor ?? 'Semua sensor' }}</dd></div>
          </dl>
        </div>
        <div class="space-y-4">
          <AppSelect
            v-model="selectedDeviceUuid"
            label="Semua Device aktif yang sudah ada (opsional)"
            :options="deviceOptions"
            :loading="loadingDevices"
            placeholder="Pilih Device atau kosongkan untuk membuat baru"
            hint="Semua tipe Device ditampilkan; device yang dipilih akan diperbarui topic dan selector event-nya."
          />
          <div v-if="selectedDevice" class="rounded-lg border border-brand-300 bg-brand-50 p-3 text-xs text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
            Device existing terpilih: <strong>{{ selectedDevice.device_name }}</strong>. Tidak akan dibuat duplikat.
          </div>
          <template v-else>
            <AppInput v-model="deviceName" label="Nama Device baru" :required="!selectedDevice" placeholder="GPS Armada 01 / Sensor Makanan 01" />
            <AppInput v-model="hardware" label="Hardware (opsional)" placeholder="gps-tracker-v1 / DS18B20" />
          </template>
          <AppSelect v-if="eventType === 'GPS'" v-model="selectedVehicle" label="Armada tujuan" required :options="vehicleOptions" placeholder="Pilih armada aktif" />
          <p v-else class="rounded-lg bg-surface-50 p-3 text-xs text-surface-600 dark:bg-surface-800/60 dark:text-surface-300">
            Sensor suhu dibuat sebagai Device. Binding ke production batch atau holding dilakukan saat proses operasional.
          </p>
          <AppButton block icon="lucide:link-2" :loading="saving" :disabled="(eventType === 'GPS' && !selectedVehicle) || (!selectedDevice && !deviceName.trim())" @click="createAndBind">
            {{ selectedDevice ? 'Binding Device Terpilih' : eventType === 'GPS' ? 'Buat Device & Binding Armada' : 'Buat Device Sensor' }}
          </AppButton>
          <p class="text-xs text-surface-500">Jika pembuatan Device berhasil tetapi binding GPS gagal, Device tetap tercatat dan dapat diperbaiki dari Master Device IoT/Binding GPS Armada.</p>
        </div>
      </div>
      <EmptyState v-else icon="lucide:mouse-pointer-click" title="Pilih event terlebih dahulu" description="Pilih event dari daftar di atas untuk mengisi topic dan identitas device." />
    </AppCard>
  </div>
</template>
