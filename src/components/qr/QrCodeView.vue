<script setup lang="ts">
import { ref, watch } from 'vue'
import QRCode from 'qrcode'
import { Icon } from '@iconify/vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useToastStore } from '@/stores/toast'
import { copyToClipboard } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    /** Payload QR. Untuk paket gunakan `fsos:package:<package_id>`. */
    value: string
    caption?: string
    subcaption?: string
    size?: number
    /** Tingkat koreksi error; M cukup untuk label cetak standar. */
    errorCorrection?: 'L' | 'M' | 'Q' | 'H'
    fileName?: string
    hideActions?: boolean
  }>(),
  { size: 256, errorCorrection: 'M', fileName: 'qr-code' },
)

const toast = useToastStore()
const dataUrl = ref('')
const rendering = ref(true)
const failed = ref(false)

async function render() {
  rendering.value = true
  failed.value = false
  try {
    dataUrl.value = await QRCode.toDataURL(props.value, {
      errorCorrectionLevel: props.errorCorrection,
      width: props.size,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
  } catch {
    failed.value = true
    dataUrl.value = ''
  } finally {
    rendering.value = false
  }
}

watch(() => [props.value, props.size, props.errorCorrection], render, { immediate: true })

function download() {
  if (!dataUrl.value) return
  const link = document.createElement('a')
  link.href = dataUrl.value
  link.download = `${props.fileName}.png`
  link.click()
  toast.success('QR diunduh', { description: `${props.fileName}.png` })
}

async function copyPayload() {
  const ok = await copyToClipboard(props.value)
  ok
    ? toast.success('Payload QR disalin')
    : toast.error('Gagal menyalin', { description: 'Clipboard tidak tersedia di browser ini.' })
}

function print() {
  if (!dataUrl.value) return
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  if (!doc) return
  // Label cetak sederhana; backend belum menyediakan endpoint gambar/label QR.
  doc.write(`<!doctype html><html><head><title>${props.fileName}</title>
    <style>
      body{font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0}
      .label{text-align:center}
      img{width:52mm;height:52mm}
      .code{font-family:ui-monospace,monospace;font-size:10pt;margin-top:6px;word-break:break-all;max-width:60mm}
      .title{font-size:13pt;font-weight:700;margin-bottom:6px}
    </style></head><body><div class="label">
      <div class="title">${props.caption ?? ''}</div>
      <img src="${dataUrl.value}" alt="QR" />
      <div class="code">${props.value}</div>
    </div></body></html>`)
  doc.close()
  frame.contentWindow?.focus()
  frame.contentWindow?.print()
  setTimeout(() => frame.remove(), 1000)
}
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <div
      class="relative grid aspect-square w-full place-items-center rounded-2xl bg-white p-4 shadow-soft ring-1 ring-surface-200"
      :style="{ maxWidth: `${size + 32}px` }"
    >
      <div v-if="rendering" class="skeleton size-full rounded-xl" />
      <div v-else-if="failed" class="flex flex-col items-center gap-2 text-rose-500">
        <Icon icon="lucide:qr-code" :width="32" :height="32" />
        <p class="text-xs font-semibold">Payload tidak dapat dirender</p>
      </div>
      <img
        v-else
        :src="dataUrl"
        :alt="`QR ${value}`"
        class="animate-scale-in size-full object-contain"
        draggable="false"
      />
    </div>

    <div class="text-center">
      <p v-if="caption" class="text-sm font-bold text-surface-900 dark:text-white">{{ caption }}</p>
      <p v-if="subcaption" class="text-xs text-surface-500 dark:text-surface-400">
        {{ subcaption }}
      </p>
      <p
        class="mt-1.5 max-w-xs font-mono text-[11px] break-all text-surface-400 dark:text-surface-500"
      >
        {{ value }}
      </p>
    </div>

    <div v-if="!hideActions" class="flex flex-wrap justify-center gap-2">
      <AppButton size="sm" variant="outline" icon="lucide:download" @click="download">
        Unduh PNG
      </AppButton>
      <AppButton size="sm" variant="outline" icon="lucide:printer" @click="print">Cetak</AppButton>
      <AppButton size="sm" variant="ghost" icon="lucide:copy" @click="copyPayload">
        Salin payload
      </AppButton>
    </div>
  </div>
</template>
