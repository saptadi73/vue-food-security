<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppSelect, { type SelectOption } from '@/components/ui/AppSelect.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { fsos, isApiError } from '@/api'
import type { DeliveryHistory, DeliveryTracking } from '@/api/modules/operations'
import type { Kitchen, School } from '@/api/modules/masters'
import { env } from '@/config/env'
import { formatDateTime, shortId } from '@/utils/format'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const toast = useToastStore()
const deliveryId = ref('')
const deliveryOptions = ref<SelectOption[]>([])
const deliveriesLoading = ref(false)
const tracking = ref<DeliveryTracking | null>(null)
const history = ref<DeliveryHistory | null>(null)
const loading = ref(false)
const mapElement = ref<HTMLElement | null>(null)
const kitchen = ref<Kitchen | null>(null)
const schools = ref<School[]>([])
const routeMessage = ref('')
type Position = { lat: number; lng: number }
type MapInstance = {
  setCenter: (position: Position) => void
  fitBounds: (bounds: BoundsInstance, padding?: number) => void
}
type MarkerInstance = {
  setPosition: (position: Position) => void
  setMap: (map: MapInstance | null) => void
}
type BoundsInstance = { extend: (position: Position) => void }
type DirectionsResult = Record<string, unknown>
type DirectionsRendererInstance = {
  setDirections: (result: DirectionsResult) => void
  setMap: (map: MapInstance | null) => void
}
type DirectionsServiceInstance = {
  route: (
    request: Record<string, unknown>,
    callback: (result: DirectionsResult | null, status: string) => void,
  ) => void
}
type MapsApi = {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance
    Marker: new (options: Record<string, unknown>) => MarkerInstance
    LatLngBounds: new () => BoundsInstance
    DirectionsService: new () => DirectionsServiceInstance
    DirectionsRenderer: new (options: Record<string, unknown>) => DirectionsRendererInstance
    TravelMode: { DRIVING: string }
    DirectionsStatus: { OK: string }
  }
}
declare global { interface Window { google?: MapsApi } }
let map: MapInstance | null = null
let vehicleMarker: MarkerInstance | null = null
let contextMarkers: MarkerInstance[] = []
let directionsService: DirectionsServiceInstance | null = null
let directionsRenderer: DirectionsRendererInstance | null = null
let lastRoutedPosition: Position | null = null
let timer: ReturnType<typeof setInterval> | undefined
let started = false

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

function coordinate(item: { latitude: string | null; longitude: string | null }): Position | null {
  if (item.latitude === null || item.longitude === null) return null
  const position = { lat: Number(item.latitude), lng: Number(item.longitude) }
  return Number.isFinite(position.lat) && Number.isFinite(position.lng) ? position : null
}

function movedEnough(current: Position, previous: Position | null) {
  if (!previous) return true
  const latKm = (current.lat - previous.lat) * 111.32
  const lngKm = (current.lng - previous.lng) * 111.32 * Math.cos((current.lat * Math.PI) / 180)
  return Math.hypot(latKm, lngKm) >= 0.1
}

function clearMapContext() {
  contextMarkers.forEach((item) => item.setMap(null))
  contextMarkers = []
  directionsRenderer?.setMap(null)
  directionsRenderer = null
  directionsService = null
  lastRoutedPosition = null
  routeMessage.value = ''
}

function drawContextMarkers() {
  if (!map || !window.google?.maps) return
  contextMarkers.forEach((item) => item.setMap(null))
  contextMarkers = []
  const bounds = new window.google.maps.LatLngBounds()
  const kitchenPosition = kitchen.value ? coordinate(kitchen.value) : null
  if (kitchenPosition) {
    bounds.extend(kitchenPosition)
    contextMarkers.push(new window.google.maps.Marker({
      map,
      position: kitchenPosition,
      title: `Dapur: ${kitchen.value!.kitchen_name}`,
      label: 'D',
    }))
  }
  schools.value.forEach((school, index) => {
    const position = coordinate(school)
    if (!position) return
    bounds.extend(position)
    contextMarkers.push(new window.google!.maps.Marker({
      map,
      position,
      title: `Tujuan ${index + 1}: ${school.school_name}`,
      label: String(index + 1),
    }))
  })
}

async function drawRoute(origin: Position) {
  if (!map || !window.google?.maps || !movedEnough(origin, lastRoutedPosition)) return
  const destinations = schools.value
    .map((school) => ({ school, position: coordinate(school) }))
    .filter((item): item is { school: School; position: Position } => item.position !== null)
  if (!destinations.length) {
    routeMessage.value = 'Koordinat sekolah tujuan belum tersedia.'
    return
  }
  if (destinations.length > 25) {
    routeMessage.value = 'Rute peta dibatasi 25 tujuan; ringkasan backend tetap mencakup seluruh manifest.'
  } else {
    routeMessage.value = ''
  }
  const visible = destinations.slice(0, 25)
  const destination = visible.at(-1)!.position
  const waypoints = visible.slice(0, -1).map((item) => ({ location: item.position, stopover: true }))
  directionsService ??= new window.google.maps.DirectionsService()
  directionsRenderer ??= new window.google.maps.DirectionsRenderer({
    map,
    suppressMarkers: true,
    preserveViewport: false,
    polylineOptions: { strokeColor: '#176b45', strokeOpacity: 0.9, strokeWeight: 5 },
  })
  directionsRenderer.setMap(map)
  await new Promise<void>((resolve) => {
    directionsService!.route({
      origin,
      destination,
      waypoints,
      optimizeWaypoints: false,
      travelMode: window.google!.maps.TravelMode.DRIVING,
    }, (result, status) => {
      if (status === window.google!.maps.DirectionsStatus.OK && result) {
        directionsRenderer!.setDirections(result)
        lastRoutedPosition = origin
        const bounds = new window.google!.maps.LatLngBounds()
        bounds.extend(origin)
        if (kitchen.value) {
          const kitchenPosition = coordinate(kitchen.value)
          if (kitchenPosition) bounds.extend(kitchenPosition)
        }
        destinations.forEach((item) => bounds.extend(item.position))
        map!.fitBounds(bounds, 56)
      } else {
        routeMessage.value = `Rute Google Maps belum tersedia (${status}).`
      }
      resolve()
    })
  })
}

async function loadRouteContext() {
  if (!deliveryId.value) return
  const detail = await fsos.operations.deliveries.detail(deliveryId.value)
  kitchen.value = detail.kitchen_id ? await fsos.masters.kitchens.detail(detail.kitchen_id) : null
  const schoolIds = [...new Set(detail.items.map((item) => item.school_id))]
  schools.value = await Promise.all(schoolIds.map((id) => fsos.masters.schools.detail(id)))
}

async function refresh() {
  if (!deliveryId.value) return
  loading.value = true
  try {
    ;[tracking.value, history.value] = await Promise.all([
      fsos.operations.deliveries.tracking(deliveryId.value),
      fsos.operations.deliveries.history(deliveryId.value),
    ])
    const gps = tracking.value.latest_gps
    if (gps && window.google?.maps && mapElement.value) {
      const position = { lat: Number(gps.latitude), lng: Number(gps.longitude) }
      if (!map) map = new window.google.maps.Map(mapElement.value, { center: position, zoom: 14, mapTypeControl: false })
      if (!vehicleMarker) vehicleMarker = new window.google.maps.Marker({ map, position, title: 'Lokasi armada', label: 'A' })
      else vehicleMarker.setPosition(position)
      drawContextMarkers()
      await drawRoute(position)
    }
  } finally {
    loading.value = false
  }
}

async function loadActiveDeliveries() {
  deliveriesLoading.value = true
  try {
    const [active, completed] = await Promise.all([
      fsos.operations.deliveries.list({ status: 'IN_TRANSIT', offset: 0, limit: 100 }),
      fsos.operations.deliveries.list({ status: 'COMPLETED', offset: 0, limit: 100 }),
    ])
    const deliveries = [...active.items, ...completed.items]
    deliveryOptions.value = deliveries.map((item) => ({
      value: item.delivery_id,
      label: `Delivery ${shortId(item.delivery_id)} · ${item.status} · Armada ${shortId(item.vehicle)}`,
    }))

    const requested = String(route.query.delivery ?? '')
    if (requested && deliveries.some((item) => item.delivery_id === requested)) {
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
  if (deliveryId.value) {
    try { await loadRouteContext() } catch (error) {
      if (isApiError(error)) toast.fromError(error, 'Gagal memuat tujuan pengiriman')
    }
    await refresh()
  }
  started = true
  timer = setInterval(() => void refresh(), 15000)
}

const locationText = computed(() => tracking.value?.latest_gps ? `${tracking.value.latest_gps.latitude}, ${tracking.value.latest_gps.longitude}` : 'Belum ada GPS')
watch(deliveryId, () => {
  if (!started) return
  tracking.value = null
  history.value = null
  kitchen.value = null
  schools.value = []
  clearMapContext()
  if (deliveryId.value) {
    void loadRouteContext()
      .then(() => refresh())
      .catch((error) => {
        if (isApiError(error)) toast.fromError(error, 'Gagal memuat tujuan pengiriman')
      })
  }
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
          hint="Delivery berjalan dan selesai tersedia untuk tracking serta riwayat."
        />
        <AppButton icon="lucide:refresh-cw" :loading="loading" :disabled="!deliveryId" @click="refresh">Perbarui</AppButton>
      </div>
    </AppCard>
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <AppCard class="lg:col-span-2" title="Rute armada ke sekolah" icon="lucide:map-pin" flush>
        <div ref="mapElement" class="min-h-96 bg-surface-100 dark:bg-surface-850"><EmptyState v-if="!env.googleMapsApiKey" compact icon="lucide:key-round" title="Google Maps API key belum tersedia" description="Isi VITE_GOOGLE_MAPS_API_KEY pada environment frontend." /></div>
        <div class="flex flex-wrap items-center gap-4 border-t border-surface-200 px-4 py-3 text-xs text-surface-600 dark:border-surface-700 dark:text-surface-300">
          <span><strong>A</strong> Armada</span><span><strong>D</strong> Dapur</span><span><strong>1..n</strong> Sekolah tujuan</span>
          <span v-if="routeMessage" class="text-warning-700 dark:text-warning-300">{{ routeMessage }}</span>
        </div>
      </AppCard>
      <AppCard title="Ringkasan tracking" icon="lucide:activity" :loading="loading"><EmptyState v-if="!tracking" compact icon="lucide:truck" title="Belum ada data" description="Pilih delivery dari daftar pengiriman aktif." /><dl v-else class="space-y-3 text-sm"><div><dt class="text-surface-500">Status</dt><dd class="font-semibold">{{ tracking.status }}</dd></div><div><dt class="text-surface-500">Lokasi terakhir</dt><dd class="font-mono text-xs">{{ locationText }}</dd></div><div><dt class="text-surface-500">Update GPS</dt><dd>{{ tracking.latest_gps ? formatDateTime(tracking.latest_gps.recorded_at) : '—' }}</dd></div><div><dt class="text-surface-500">Sisa jarak</dt><dd>{{ tracking.remaining_distance_km ?? '—' }} km</dd></div><div><dt class="text-surface-500">Sisa durasi</dt><dd>{{ tracking.remaining_duration_minutes ?? '—' }} menit</dd></div><div><dt class="text-surface-500">ETA</dt><dd>{{ tracking.estimated_arrival_time ? formatDateTime(tracking.estimated_arrival_time) : '—' }}</dd></div></dl></AppCard>
    </div>
    <AppCard class="mt-4" title="Riwayat perjalanan & geofence" icon="lucide:route" :loading="loading">
      <EmptyState v-if="!history" compact icon="lucide:map-pinned" title="Belum ada riwayat" description="Pilih delivery untuk membaca log GPS perjalanan." />
      <div v-else class="space-y-4">
        <div class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><p class="text-surface-500">Radius</p><p class="font-semibold">{{ history.geofence_radius_meters }} m</p></div>
          <div><p class="text-surface-500">Titik GPS</p><p class="font-semibold">{{ history.points.length }}</p></div>
          <div><p class="text-surface-500">Enter/Exit</p><p class="font-semibold">{{ history.geofence_events.length }}</p></div>
          <div><p class="text-surface-500">Status terakhir</p><p class="font-semibold">{{ history.points.at(-1)?.inside_geofence ? 'DI DALAM' : 'DI LUAR' }}</p></div>
        </div>
        <p v-if="history.truncated" class="text-xs text-warning-700">Riwayat dibatasi 500 titik terbaru.</p>
        <div class="max-h-80 overflow-auto rounded-xl border border-surface-200 dark:border-surface-800">
          <table class="w-full text-left text-xs">
            <thead class="sticky top-0 bg-surface-50 dark:bg-surface-900"><tr><th class="p-3">Waktu</th><th class="p-3">Koordinat</th><th class="p-3">Jarak tujuan</th><th class="p-3">Geofence</th></tr></thead>
            <tbody><tr v-for="point in history.points" :key="point.gps_log_id" class="border-t border-surface-100 dark:border-surface-800"><td class="p-3">{{ formatDateTime(point.recorded_at) }}</td><td class="p-3 font-mono">{{ point.latitude }}, {{ point.longitude }}</td><td class="p-3">{{ point.distance_to_nearest_meters ?? '—' }} m</td><td class="p-3 font-semibold">{{ point.inside_geofence ? 'INSIDE' : 'OUTSIDE' }}</td></tr></tbody>
          </table>
        </div>
      </div>
    </AppCard>
  </div>
</template>
