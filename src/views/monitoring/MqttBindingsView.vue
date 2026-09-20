<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { fsos } from '@/api'
import type { DeviceInput, Vehicle } from '@/api/modules/masters'
import type { MqttEventRecord, MqttTopicRecord } from '@/api/modules/telemetry'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, shortId } from '@/utils/format'

const toast = useToastStore()
const topics = ref<MqttTopicRecord[]>([])
const events = ref<MqttEventRecord[]>([])
const vehicles = ref<Vehicle[]>([])
const selectedTopic = ref<string | null>(null)
const selectedEvent = ref<MqttEventRecord | null>(null)
const selectedVehicle = ref<string | null>(null)
const deviceName = ref('')
const hardware = ref('')
const loadingTopics = ref(false)
const loadingEvents = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

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
  return typeof candidate === 'string' ? candidate : 'GPS'
})

async function loadTopics() {
  loadingTopics.value = true
  error.value = null
  try {
    const page = await fsos.mqtt.topics({ limit: 100 })
    topics.value = page.items
    const firstTopic = page.items[0]
    if (!selectedTopic.value && firstTopic) await selectTopic(firstTopic.topic)
  } catch (cause) {
    error.value = 'Daftar topic MQTT belum dapat dimuat.'
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

function chooseEvent(event: MqttEventRecord) {
  selectedEvent.value = event
  deviceName.value = `GPS ${event.topic.split('/').filter(Boolean).at(-2) ?? 'MQTT'}`
  hardware.value = ''
}

async function createAndBind() {
  if (!selectedEvent.value || !selectedVehicle.value || !deviceName.value.trim()) return
  saving.value = true
  try {
    const input: DeviceInput = {
      device_uuid: eventDeviceUuid.value || null,
      device_name: deviceName.value.trim(),
      device_type: 'GPS',
      hardware: hardware.value.trim() || null,
      mqtt_topic: selectedEvent.value.topic,
      status: 'ACTIVE',
      zone_id: null,
      firmware: null,
      last_online: selectedEvent.value.received_at,
    }
    const device = await fsos.masters.devices.create(input)
    await fsos.masters.deviceBindings.create({
      device_id: device.device_id,
      vehicle_id: selectedVehicle.value,
    })
    toast.success('Device MQTT berhasil dibuat dan dibinding ke armada')
    selectedEvent.value = null
    selectedVehicle.value = null
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
      title="Binding MQTT Armada"
      description="Pilih topic dan event MQTT yang tersimpan, buat Device GPS, lalu hubungkan ke armada. MQTT live consumer belum aktif di backend."
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
              <AppButton size="sm" variant="outline" icon="lucide:arrow-right" @click="chooseEvent(event)">Pilih event</AppButton>
            </div>
            <pre class="mt-3 max-h-40 overflow-auto rounded-lg bg-surface-950 p-3 text-xs text-surface-100">{{ JSON.stringify(event.payload_json ?? event.payload_text ?? {}, null, 2) }}</pre>
          </article>
        </div>
        <EmptyState v-else icon="lucide:inbox" title="Belum ada event pada topic" description="Pilih topic yang memiliki event tersimpan." />
      </AppCard>
    </div>

    <AppCard title="3. Buat Device dan binding armada" subtitle="Device dibuat ACTIVE dengan topic event yang dipilih" icon="lucide:link-2">
      <div v-if="selectedEvent" class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-xl bg-surface-50 p-4 text-sm dark:bg-surface-800/60">
          <p class="font-semibold text-surface-900 dark:text-white">Event terpilih</p>
          <p class="mt-2 break-all font-mono text-xs text-surface-600 dark:text-surface-300">{{ selectedEvent.topic }}</p>
          <dl class="mt-3 space-y-1 text-xs text-surface-500">
            <div class="flex justify-between gap-3"><dt>Device UUID</dt><dd class="font-mono">{{ eventDeviceUuid || 'Akan dibuat backend' }}</dd></div>
            <div class="flex justify-between gap-3"><dt>Tipe</dt><dd>{{ eventType }}</dd></div>
          </dl>
        </div>
        <div class="space-y-4">
          <AppInput v-model="deviceName" label="Nama device" required placeholder="GPS Armada 01" />
          <AppInput v-model="hardware" label="Hardware" placeholder="gps-tracker-v1" />
          <AppSelect v-model="selectedVehicle" label="Armada tujuan" required :options="vehicleOptions" placeholder="Pilih armada aktif" />
          <AppButton block icon="lucide:link-2" :loading="saving" :disabled="!selectedVehicle || !deviceName.trim()" @click="createAndBind">
            Buat Device & Binding Armada
          </AppButton>
          <p class="text-xs text-surface-500">Jika pembuatan Device berhasil tetapi binding gagal, Device tetap tercatat dan dapat diperbaiki dari Master Perangkat/Binding.</p>
        </div>
      </div>
      <EmptyState v-else icon="lucide:mouse-pointer-click" title="Pilih event terlebih dahulu" description="Pilih event dari daftar di atas untuk mengisi topic dan identitas device." />
    </AppCard>
  </div>
</template>
