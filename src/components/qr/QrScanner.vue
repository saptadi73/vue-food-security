<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import QrScanner from 'qr-scanner'
import { Icon } from '@iconify/vue'
import AppButton from '@/components/ui/AppButton.vue'

const props = withDefaults(
  defineProps<{
    /** Jeda minimum antar hasil identik agar tidak memicu request beruntun. */
    throttleMs?: number
    autoStart?: boolean
    hint?: string
  }>(),
  { throttleMs: 1800, autoStart: true },
)

const emit = defineEmits<{ detected: [payload: string]; error: [message: string] }>()

const videoEl = ref<HTMLVideoElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const scanner = shallowRef<QrScanner | null>(null)

const active = ref(false)
const starting = ref(false)
const errorMessage = ref('')
const cameras = ref<QrScanner.Camera[]>([])
const hasFlash = ref(false)
const flashOn = ref(false)

let lastPayload = ''
let lastAt = 0

function handleResult(payload: string) {
  const now = Date.now()
  if (payload === lastPayload && now - lastAt < props.throttleMs) return
  lastPayload = payload
  lastAt = now
  if ('vibrate' in navigator) navigator.vibrate?.(40)
  emit('detected', payload)
}

async function start() {
  if (!videoEl.value || starting.value) return
  starting.value = true
  errorMessage.value = ''
  try {
    if (!scanner.value) {
      scanner.value = new QrScanner(videoEl.value, (result) => handleResult(result.data), {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment',
        maxScansPerSecond: 6,
        returnDetailedScanResult: true,
      })
    }
    await scanner.value.start()
    active.value = true
    cameras.value = await QrScanner.listCameras(true)
    hasFlash.value = await scanner.value.hasFlash()
  } catch (cause) {
    const message =
      cause instanceof Error && cause.name === 'NotAllowedError'
        ? 'Izin kamera ditolak. Aktifkan akses kamera di pengaturan browser.'
        : 'Kamera tidak dapat diakses. Pastikan halaman dibuka melalui HTTPS atau localhost.'
    errorMessage.value = message
    emit('error', message)
    active.value = false
  } finally {
    starting.value = false
  }
}

function stop() {
  scanner.value?.stop()
  active.value = false
  flashOn.value = false
}

async function toggleFlash() {
  if (!scanner.value || !hasFlash.value) return
  await scanner.value.toggleFlash()
  flashOn.value = scanner.value.isFlashOn()
}

async function setCamera(deviceId: string) {
  if (!scanner.value) return
  await scanner.value.setCamera(deviceId)
  hasFlash.value = await scanner.value.hasFlash()
}

/** Fallback untuk perangkat tanpa kamera: pindai dari berkas gambar. */
async function scanFromFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true })
    handleResult(result.data)
  } catch {
    errorMessage.value = 'QR tidak terbaca dari gambar tersebut.'
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}

onMounted(() => {
  if (props.autoStart) void start()
})

onBeforeUnmount(() => {
  scanner.value?.destroy()
  scanner.value = null
})

defineExpose({ start, stop })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      class="relative aspect-square w-full overflow-hidden rounded-2xl bg-surface-950 ring-1 ring-surface-800 sm:aspect-video"
    >
      <video ref="videoEl" class="size-full object-cover" playsinline muted />

      <!-- Bingkai pemindaian -->
      <div v-if="active" class="pointer-events-none absolute inset-0 grid place-items-center">
        <div class="relative size-52 max-w-[65%] sm:size-64">
          <span
            class="absolute top-0 left-0 size-8 rounded-tl-xl border-t-3 border-l-3 border-brand-400"
          />
          <span
            class="absolute top-0 right-0 size-8 rounded-tr-xl border-t-3 border-r-3 border-brand-400"
          />
          <span
            class="absolute bottom-0 left-0 size-8 rounded-bl-xl border-b-3 border-l-3 border-brand-400"
          />
          <span
            class="absolute right-0 bottom-0 size-8 rounded-br-xl border-r-3 border-b-3 border-brand-400"
          />
          <span
            class="animate-scan-line absolute inset-x-2 top-1/2 h-0.5 rounded-full bg-brand-400/80 shadow-[0_0_12px_2px] shadow-brand-400/60"
          />
        </div>
      </div>

      <!-- Idle / error overlay -->
      <div
        v-if="!active"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-950/80 p-6 text-center"
      >
        <Icon
          :icon="errorMessage ? 'lucide:camera-off' : 'lucide:scan-line'"
          :width="40"
          :height="40"
          :class="errorMessage ? 'text-rose-400' : 'text-brand-400'"
        />
        <p class="text-sm font-semibold text-white">
          {{ errorMessage || 'Kamera belum aktif' }}
        </p>
        <p v-if="!errorMessage && hint" class="max-w-xs text-xs text-surface-400">{{ hint }}</p>
        <AppButton size="sm" icon="lucide:play" :loading="starting" @click="start">
          Aktifkan kamera
        </AppButton>
      </div>

      <div v-if="active" class="absolute top-3 right-3 flex gap-2">
        <button
          v-if="hasFlash"
          type="button"
          class="grid size-10 place-items-center rounded-xl bg-surface-950/70 text-white backdrop-blur transition hover:bg-surface-900"
          :aria-label="flashOn ? 'Matikan senter' : 'Nyalakan senter'"
          @click="toggleFlash"
        >
          <Icon :icon="flashOn ? 'lucide:zap-off' : 'lucide:zap'" :width="18" :height="18" />
        </button>
        <button
          type="button"
          class="grid size-10 place-items-center rounded-xl bg-surface-950/70 text-white backdrop-blur transition hover:bg-surface-900"
          aria-label="Hentikan kamera"
          @click="stop"
        >
          <Icon icon="lucide:square" :width="16" :height="16" />
        </button>
      </div>

      <span
        v-if="active"
        class="animate-pulse-ring absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-surface-950/70 px-3 py-1.5 text-[11px] font-bold text-brand-300 backdrop-blur"
      >
        <span class="size-1.5 rounded-full bg-brand-400" />
        Memindai…
      </span>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <select
        v-if="cameras.length > 1"
        class="input-base h-10 w-auto flex-1 py-0 text-xs"
        @change="setCamera(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="camera in cameras" :key="camera.id" :value="camera.id">
          {{ camera.label || 'Kamera' }}
        </option>
      </select>

      <AppButton size="sm" variant="outline" icon="lucide:image" @click="fileInput?.click()">
        Pindai dari gambar
      </AppButton>
      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="scanFromFile" />
    </div>
  </div>
</template>
