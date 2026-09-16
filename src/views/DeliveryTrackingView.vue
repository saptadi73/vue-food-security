<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { fsos, isApiError } from '@/api'
import type { DeliveryTracking } from '@/api/modules/operations'
import { env } from '@/config/env'
import { formatDateTime, shortId } from '@/utils/format'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const toast = useToastStore()
const deliveryId = ref('')
const deliveryOptions = ref<SelectOption[]>([])
const deliveriesLoading = ref(false)
const tracking = ref<DeliveryTracking | null>(null)
const loading = ref(false)
const mapElement = ref<HTMLElement | null>(null)
type MapInstance = { setCenter: (position: { lat: number; lng: number }) => void }
type MarkerInstance = { setPosition: (position: { lat: number; lng: number }) => void }
type MapsApi = {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance
    Marker: new (options: Record<string, unknown>) => MarkerInstance
  }
}
declare global { interface Window { google?: MapsApi } }
let map: MapInstance | null = null
let marker: MarkerInstance | null = null
let timer: ReturnType<typeof setInterval> | undefined

async function loadMaps() {
  if (!env.googleMapsApiKey || window.google?.maps) return
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(env.googleMapsApiKey)}`
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps gagal dimuat.'))
    document.head.appendChild(script)
  })
}

async function refresh() {
  if (!deliveryId.value) return
  loading.value = true
  try {
    tracking.value = await fsos.operations.deliveries.tracking(deliveryId.value)
    const gps = tracking.value.latest_gps
    if (gps && window.google?.maps && mapElement.value) {
      const position = { lat: Number(gps.latitude), lng: Number(gps.longitude) }
      if (!map) map = new window.google.maps.Map(mapElement.value, { center: position, zoom: 14, mapTypeControl: false })
      if (!marker) marker = new window.google.maps.Marker({ map, position, title: 'Lokasi armada' })
      else marker.setPosition(position)
      map.setCenter(position)
    }
  } finally {
    loading.value = false
  }
}

async function loadActiveDeliveries() {
  deliveriesLoading.value = true
  try {
    const page = await fsos.operations.deliveries.list({ status: 'IN_TRANSIT', offset: 0, limit: 100 })
    deliveryOptions.value = page.items.map((item) => ({
      value: item.delivery_id,
      label: `Delivery ${shortId(item.delivery_id)} · Armada ${shortId(item.vehicle)}`,
    }))

    const requested = String(route.query.delivery ?? '')
    if (requested && page.items.some((item) => item.delivery_id === requested)) {
      deliveryId.value = requested
    }
  } catch (error) {
    if (isApiError(error)) toast.fromError(error, 'Gagal memuat pengiriman aktif')
  } finally {
    deliveriesLoading.value = false
  }
}

async function start() {
  await loadActiveDeliveries()
  try { await loadMaps() } catch { /* peta tetap menampilkan ringkasan tracking */ }
  if (deliveryId.value) await refresh()
  timer = setInterval(() => void refresh(), 15000)
}

const locationText = computed(() => tracking.value?.latest_gps ? `${tracking.value.latest_gps.latitude}, ${tracking.value.latest_gps.longitude}` : 'Belum ada GPS')
watch(deliveryId, () => {
  tracking.value = null
  if (deliveryId.value) void refresh()
})
onMounted(() => void start())
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <div>
    <PageHeader title="Live Tracking Delivery" description="Lokasi terakhir armada dan estimasi sisa perjalanan. Data diperbarui otomatis setiap 15 detik." icon="lucide:map" tag="Delivery.Read" />
    <AppCard class="mb-4" title="Pilih pengiriman aktif" icon="lucide:truck">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
        <AppSelect
          v-model="deliveryId"
          class="flex-1"
          label="Delivery / Armada"
          :options="deliveryOptions"
          :disabled="deliveriesLoading"
          placeholder="Pilih pengiriman yang sedang berjalan"
          hint="Hanya delivery berstatus IN_TRANSIT yang ditampilkan."
        />
        <AppButton icon="lucide:refresh-cw" :loading="loading" :disabled="!deliveryId" @click="refresh">Perbarui</AppButton>
      </div>
    </AppCard>
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <AppCard class="lg:col-span-2" title="Peta lokasi armada" icon="lucide:map-pin" flush><div ref="mapElement" class="min-h-96 bg-surface-100 dark:bg-surface-850"><EmptyState v-if="!env.googleMapsApiKey" compact icon="lucide:key-round" title="Google Maps API key belum tersedia" description="Isi VITE_GOOGLE_MAPS_API_KEY pada environment frontend." /></div></AppCard>
      <AppCard title="Ringkasan tracking" icon="lucide:activity" :loading="loading"><EmptyState v-if="!tracking" compact icon="lucide:truck" title="Belum ada data" description="Pilih delivery dari daftar pengiriman aktif." /><dl v-else class="space-y-3 text-sm"><div><dt class="text-surface-500">Status</dt><dd class="font-semibold">{{ tracking.status }}</dd></div><div><dt class="text-surface-500">Lokasi terakhir</dt><dd class="font-mono text-xs">{{ locationText }}</dd></div><div><dt class="text-surface-500">Update GPS</dt><dd>{{ tracking.latest_gps ? formatDateTime(tracking.latest_gps.recorded_at) : '—' }}</dd></div><div><dt class="text-surface-500">Sisa jarak</dt><dd>{{ tracking.remaining_distance_km ?? '—' }} km</dd></div><div><dt class="text-surface-500">Sisa durasi</dt><dd>{{ tracking.remaining_duration_minutes ?? '—' }} menit</dd></div><div><dt class="text-surface-500">ETA</dt><dd>{{ tracking.estimated_arrival_time ? formatDateTime(tracking.estimated_arrival_time) : '—' }}</dd></div></dl></AppCard>
    </div>
  </div>
</template>
