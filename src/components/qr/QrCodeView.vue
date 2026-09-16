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
    /** Ukuran media label thermal; default mengikuti label 4x6 inch umum. */
    labelWidthMm?: number
    labelHeightMm?: number
  }>(),
  {
    size: 256,
    errorCorrection: 'M',
    fileName: 'qr-code',
    labelWidthMm: 100,
    labelHeightMm: 150,
  },
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

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }
  return value.replace(/[&<>'"]/g, (character) => entities[character] ?? character)
}

function print() {
  if (!dataUrl.value) return
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  if (!doc) {
    frame.remove()
    return
  }

  const caption = escapeHtml(props.caption ?? '')
  const subcaption = escapeHtml(props.subcaption ?? '')
  const value = escapeHtml(props.value)
  const fileName = escapeHtml(props.fileName)

  // XP-420B umum dipakai dengan media 100x150 mm / 4x6 inch.
  doc.write(`<!doctype html><html><head><title>${fileName}</title>
    <style>
      @page{size:${props.labelWidthMm}mm ${props.labelHeightMm}mm;margin:0}
      *{box-sizing:border-box}
      html,body{width:${props.labelWidthMm}mm;height:${props.labelHeightMm}mm;margin:0;padding:0}
      body{font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff}
      .label{width:${props.labelWidthMm}mm;height:${props.labelHeightMm}mm;padding:7mm 6mm;display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden}
      .title{font-size:20pt;font-weight:700;line-height:1.1;margin-bottom:4mm;max-width:88mm;overflow-wrap:anywhere}
      img{display:block;width:78mm;height:78mm;image-rendering:auto}
      .subcaption{font-size:12pt;font-weight:600;line-height:1.2;margin-top:4mm;max-width:88mm;overflow-wrap:anywhere}
      .code{font-family:"Courier New",monospace;font-size:10pt;line-height:1.25;margin-top:3mm;max-width:88mm;overflow-wrap:anywhere}
      @media print{html,body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
    </style></head><body><div class="label">
      <div class="title">${caption}</div>
      <img src="${dataUrl.value}" alt="QR" />
      <div class="subcaption">${subcaption}</div>
      <div class="code">${value}</div>
    </div></body></html>`)
  doc.close()

  const printWindow = frame.contentWindow
  const printImage = doc.querySelector('img')
  const startPrint = () => {
    printWindow?.focus()
    printWindow?.print()
    setTimeout(() => frame.remove(), 1000)
  }

  if (printImage?.complete) startPrint()
  else if (printImage) printImage.addEventListener('load', startPrint, { once: true })
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
