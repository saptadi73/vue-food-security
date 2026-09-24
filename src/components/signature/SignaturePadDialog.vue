<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { fsos, isApiError } from '@/api'
import type { SignatureEntityType, SignatureEvidence, SignatureVerification } from '@/api/modules/signatures'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/utils/format'

const props = defineProps<{ entityType: SignatureEntityType; entityId: string; purpose: string }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ signed: [evidence: SignatureEvidence] }>()
const toast = useToastStore()
const canvas = ref<HTMLCanvasElement | null>(null)
const evidence = ref<SignatureEvidence | null>(null)
const verification = ref<SignatureVerification | null>(null)
const loading = ref(false)
const saving = ref(false)
const drawing = ref(false)
const hasInk = ref(false)

function setupCanvas() {
  const el = canvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const ratio = Math.max(window.devicePixelRatio || 1, 1)
  el.width = Math.round(rect.width * ratio)
  el.height = Math.round(220 * ratio)
  const context = el.getContext('2d')!
  context.scale(ratio, ratio)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, rect.width, 220)
  context.strokeStyle = '#0f172a'
  context.lineWidth = 2.5
  context.lineCap = 'round'
  context.lineJoin = 'round'
  hasInk.value = false
}
function point(event: PointerEvent) { const r=canvas.value!.getBoundingClientRect(); return {x:event.clientX-r.left,y:event.clientY-r.top} }
function start(event: PointerEvent) { if(!canvas.value)return; drawing.value=true; canvas.value.setPointerCapture(event.pointerId); const p=point(event); const c=canvas.value.getContext('2d')!; c.beginPath(); c.moveTo(p.x,p.y) }
function move(event: PointerEvent) { if(!drawing.value||!canvas.value)return; const p=point(event); const c=canvas.value.getContext('2d')!; c.lineTo(p.x,p.y); c.stroke(); hasInk.value=true }
function stop() { drawing.value=false }
function clear() { setupCanvas(); verification.value=null }

async function loadEvidence() {
  if (!props.entityId) return
  loading.value = true
  evidence.value = null
  verification.value = null
  try { evidence.value = await fsos.signatures.get(props.entityType, props.entityId) }
  catch (error) { if (!(isApiError(error) && error.kind === 'not_found')) toast.fromError(error, 'Gagal memeriksa tanda tangan') }
  finally { loading.value = false; if (!evidence.value) await nextTick(setupCanvas) }
}

async function submit() {
  if (!canvas.value || !hasInk.value) return toast.warning('Tanda tangan masih kosong')
  saving.value = true
  try {
    const blob = await new Promise<Blob>((resolve, reject) => canvas.value!.toBlob(value => value ? resolve(value) : reject(new Error('Canvas export failed')), 'image/png'))
    evidence.value = await fsos.signatures.capture(props.entityType, props.entityId, props.purpose, blob)
    emit('signed', evidence.value)
    toast.success('Tanda tangan tersimpan', { description: 'Bukti immutable dan hash SHA-256 telah dicatat.' })
  } catch (error) { toast.fromError(error, 'Gagal menyimpan tanda tangan') }
  finally { saving.value = false }
}
async function verify() { if(!evidence.value)return; saving.value=true; try { verification.value=await fsos.signatures.verify(evidence.value.signature_id); toast.success('Verifikasi selesai', {description: verification.value.verification_status}) } catch(error){toast.fromError(error,'Gagal memverifikasi tanda tangan')} finally{saving.value=false} }

watch(open, async value => { if(value) await loadEvidence() })
</script>

<template>
  <AppModal v-model:open="open" size="lg" :busy="saving" title="Tanda tangan digital" icon="lucide:signature" description="Konfirmasi identitas dan transaksi sebelum menyimpan bukti immutable.">
    <div v-if="loading" class="py-12 text-center text-sm text-surface-500">Memeriksa evidence...</div>
    <div v-else-if="evidence" class="space-y-4">
      <div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5"><div class="flex items-center justify-between"><div><p class="text-xs font-semibold uppercase tracking-wide text-emerald-600">Evidence tersimpan</p><h3 class="mt-1 font-bold">{{ evidence.signer_snapshot.fullname || evidence.signed_by }}</h3></div><AppBadge :status="verification?.verification_status || evidence.status" /></div><dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt class="text-xs text-surface-500">Jabatan</dt><dd>{{ evidence.signer_snapshot.job_title || 'â€”' }}</dd></div><div><dt class="text-xs text-surface-500">Waktu server</dt><dd>{{ formatDateTime(evidence.signed_at) }}</dd></div><div><dt class="text-xs text-surface-500">Purpose</dt><dd>{{ evidence.purpose }}</dd></div><div><dt class="text-xs text-surface-500">Role snapshot</dt><dd>{{ evidence.signer_snapshot.roles?.join(', ') || 'â€”' }}</dd></div></dl></div>
      <div class="rounded-xl bg-surface-50 p-3 dark:bg-surface-850"><p class="text-xs text-surface-500">SHA-256</p><code class="break-all text-[11px]">{{ evidence.sha256_hex }}</code></div>
      <p v-if="verification" class="text-sm" :class="verification.verification_status==='VERIFIED'?'text-emerald-600':'text-rose-600'">Hasil verifikasi: <strong>{{ verification.verification_status }}</strong></p>
    </div>
    <div v-else class="space-y-4"><div class="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-800 dark:text-amber-200">Dengan menekan Simpan, tanda tangan dikaitkan permanen ke transaksi ini dan tidak dapat diedit atau dihapus.</div><canvas ref="canvas" class="h-[220px] w-full touch-none rounded-2xl border-2 border-dashed border-surface-300 bg-white dark:border-surface-700" aria-label="Area tanda tangan" @pointerdown="start" @pointermove="move" @pointerup="stop" @pointercancel="stop" /><div class="flex justify-between"><span class="text-xs text-surface-500">Gunakan jari, stylus, atau mouse.</span><button type="button" class="text-sm font-semibold text-brand-600" @click="clear">Bersihkan</button></div></div>
    <template #footer><AppButton variant="subtle" @click="open=false">Tutup</AppButton><AppButton v-if="evidence" icon="lucide:shield-check" :loading="saving" @click="verify">Verifikasi hash</AppButton><AppButton v-else icon="lucide:signature" :loading="saving" :disabled="!hasInk" @click="submit">Simpan tanda tangan</AppButton></template>
  </AppModal>
</template>