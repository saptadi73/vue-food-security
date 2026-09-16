<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import BaseChart from '@/components/charts/BaseChart.vue'
import { fsos, isApiError, type ApiError } from '@/api'
import {
  TRACE_LIMITS,
  type AssetPassport,
  type ImpactData,
  type TraceGraphData,
  type TraverseDirection,
} from '@/api/modules/traceability'
import { PACKAGE_QR_PREFIX } from '@/api/modules/operations'
import { useToastStore } from '@/stores/toast'
import { formatDateTime, shortId } from '@/utils/format'

const route = useRoute()
const toast = useToastStore()

const initialAsset = typeof route.query.asset === 'string' ? route.query.asset : ''
const lookupValue = ref(initialAsset)
const assetUuid = ref(initialAsset)
const direction = ref<TraverseDirection>('backward')
const depth = ref(TRACE_LIMITS.depth.default)
const nodeLimit = ref(TRACE_LIMITS.nodeLimit.default)

const loading = ref(false)
const error = ref<ApiError | null>(null)
const passport = ref<AssetPassport | null>(null)
const graph = ref<TraceGraphData | null>(null)
const impact = ref<ImpactData | null>(null)

const tab = ref<'passport' | 'graph' | 'impact'>('passport')

const TABS = [
  { key: 'passport', label: 'Passport', icon: 'lucide:id-card' },
  { key: 'graph', label: 'Traversal', icon: 'lucide:git-branch' },
  { key: 'impact', label: 'Impact', icon: 'lucide:radar' },
] as const

const impactChart = computed(() => {
  const counts = impact.value?.affected_counts ?? {}
  const labels = Object.keys(counts)
  return { labels, series: labels.map((key) => counts[key] ?? 0) }
})

async function investigate() {
  const lookup = lookupValue.value.trim()
  if (!lookup || loading.value) return

  loading.value = true
  error.value = null
  passport.value = null
  graph.value = null
  impact.value = null

  try {
    let uuid = lookup
    if (lookup.startsWith(PACKAGE_QR_PREFIX)) {
      const packageData = await fsos.packages.resolve(lookup)
      if (!packageData.asset_uuid) {
        toast.warning('Jejak paket belum tersedia', {
          description: 'Paket ditemukan, tetapi belum terdaftar sebagai digital asset.',
        })
        return
      }
      uuid = packageData.asset_uuid
    }
    assetUuid.value = uuid

    // Passport dulu: bila asset tidak ada, dua request lain tidak perlu dijalankan.
    passport.value = await fsos.traceability.passport(uuid)
    const [graphResult, impactResult] = await Promise.allSettled([
      fsos.traceability.traverse(uuid, {
        direction: direction.value,
        depth: depth.value,
        limit: nodeLimit.value,
      }),
      fsos.traceability.impact(uuid, {
        depth: TRACE_LIMITS.impactDepthDefault,
        limit: TRACE_LIMITS.impactLimitDefault,
      }),
    ])
    if (graphResult.status === 'fulfilled') graph.value = graphResult.value
    if (impactResult.status === 'fulfilled') impact.value = impactResult.value
  } catch (cause) {
    if (isApiError(cause)) {
      error.value = cause
      if (cause.kind === 'not_found') {
        toast.warning('Asset tidak ditemukan', {
          description: lookup.startsWith(PACKAGE_QR_PREFIX)
            ? 'QR paket valid, tetapi asset traceability belum tersedia.'
            : 'Gunakan hasil pindai QR kemasan atau UUID registry digital asset.',
        })
      }
    }
  } finally {
    loading.value = false
  }
}

if (lookupValue.value) void investigate()

function focusNode(uuid: string) {
  lookupValue.value = uuid
  assetUuid.value = uuid
  void investigate()
}
</script>

<template>
  <div>
    <PageHeader
      title="Jejak Asset"
      description="Passport, traversal graph dan analisis impact dari registry digital asset. Read-only."
      icon="lucide:git-branch"
      tag="Traceability.Read"
    />

    <AppCard class="mb-4" title="Parameter investigasi" icon="lucide:search">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <AppInput
          v-model="lookupValue"
          class="sm:col-span-5"
          label="QR paket atau Asset UUID"
          icon="lucide:qr-code"
          placeholder="Pindai QR kemasan"
          hint="UUID hanya untuk investigasi teknis lanjutan."
          @keydown.enter="investigate"
        />
        <div class="sm:col-span-3">
          <label class="mb-1.5 block text-xs font-semibold text-surface-700 dark:text-surface-300">
            Arah traversal
          </label>
          <div class="grid grid-cols-2 gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-850">
            <button
              v-for="option in ['backward', 'forward'] as TraverseDirection[]"
              :key="option"
              type="button"
              class="rounded-lg py-2 text-xs font-bold transition"
              :class="
                direction === option
                  ? 'bg-white text-brand-600 shadow-soft dark:bg-surface-700 dark:text-brand-300'
                  : 'text-surface-500'
              "
              @click="direction = option"
            >
              {{ option === 'backward' ? 'Hulu (asal)' : 'Hilir (tujuan)' }}
            </button>
          </div>
        </div>
        <AppInput
          v-model="depth"
          class="sm:col-span-2"
          label="Depth"
          type="number"
          :min="TRACE_LIMITS.depth.min"
          :max="TRACE_LIMITS.depth.max"
          hint="1..6"
        />
        <AppInput
          v-model="nodeLimit"
          class="sm:col-span-2"
          label="Limit node"
          type="number"
          :min="TRACE_LIMITS.nodeLimit.min"
          :max="TRACE_LIMITS.nodeLimit.max"
          hint="1..200"
        />
      </div>

      <template #footer>
        <div class="flex flex-wrap gap-2">
          <AppButton icon="lucide:scan-line" variant="outline" to="/scan/traceability">
            Pindai QR
          </AppButton>
          <AppButton
            icon="lucide:radar"
            :loading="loading"
            :disabled="!lookupValue.trim()"
            @click="investigate"
          >
            Telusuri
          </AppButton>
        </div>
      </template>
    </AppCard>

    <ErrorState v-if="error" :error="error" @retry="investigate" />

    <div v-else-if="loading" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <AppCard v-for="block in 3" :key="block" loading />
    </div>

    <EmptyState
      v-else-if="!passport"
      icon="lucide:git-branch"
      title="Belum ada investigasi"
      description="Pindai QR kemasan untuk melihat passport, asal bahan, traversal graph, dan dampak hilir."
    />

    <template v-else>
      <!-- Tab -->
      <div
        class="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-surface-100 p-1 dark:bg-surface-850"
      >
        <button
          v-for="item in TABS"
          :key="item.key"
          type="button"
          class="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold whitespace-nowrap transition"
          :class="
            tab === item.key
              ? 'bg-white text-brand-600 shadow-soft dark:bg-surface-700 dark:text-brand-300'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          "
          @click="tab = item.key"
        >
          <Icon :icon="item.icon" :width="16" :height="16" />
          {{ item.label }}
        </button>
      </div>

      <!-- Passport -->
      <div v-if="tab === 'passport'" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AppCard title="Identitas asset" icon="lucide:id-card">
          <dl class="space-y-2 text-sm">
            <div
              v-for="entry in [
                { label: 'Asset UUID', value: passport.asset?.asset_uuid },
                { label: 'Tipe', value: passport.asset?.asset_type },
                { label: 'Entity UUID', value: passport.asset?.entity_uuid },
                { label: 'Status', value: passport.asset?.status },
                { label: 'Dibuat', value: formatDateTime(passport.asset?.created_at) },
              ]"
              :key="entry.label"
              class="flex items-start justify-between gap-3 border-b border-surface-100 pb-2 last:border-0 dark:border-surface-800/60"
            >
              <dt class="shrink-0 text-surface-500 dark:text-surface-400">{{ entry.label }}</dt>
              <dd
                class="min-w-0 text-right font-mono text-xs break-all text-surface-800 dark:text-surface-100"
              >
                {{ entry.value ?? '—' }}
              </dd>
            </div>
          </dl>
        </AppCard>

        <AppCard title="Relasi langsung" icon="lucide:link" flush>
          <div class="grid grid-cols-2 divide-x divide-surface-100 dark:divide-surface-800/60">
            <div class="p-4">
              <p class="mb-2 text-[10px] font-bold tracking-wide text-surface-400 uppercase">
                Parent ({{ passport.parents?.length ?? 0 }})
              </p>
              <ul class="space-y-1.5">
                <li
                  v-for="(edge, index) in passport.parents ?? []"
                  :key="`p-${index}`"
                  class="truncate font-mono text-[11px] text-surface-600 dark:text-surface-300"
                  :title="String(edge.parent_asset_uuid)"
                >
                  {{ shortId(String(edge.parent_asset_uuid)) }}
                </li>
                <li v-if="!passport.parents?.length" class="text-xs text-surface-400">—</li>
              </ul>
            </div>
            <div class="p-4">
              <p class="mb-2 text-[10px] font-bold tracking-wide text-surface-400 uppercase">
                Child ({{ passport.children?.length ?? 0 }})
              </p>
              <ul class="space-y-1.5">
                <li
                  v-for="(edge, index) in passport.children ?? []"
                  :key="`c-${index}`"
                  class="truncate font-mono text-[11px] text-surface-600 dark:text-surface-300"
                  :title="String(edge.child_asset_uuid)"
                >
                  {{ shortId(String(edge.child_asset_uuid)) }}
                </li>
                <li v-if="!passport.children?.length" class="text-xs text-surface-400">—</li>
              </ul>
            </div>
          </div>
        </AppCard>

        <AppCard title="Timeline movement" icon="lucide:route" flush>
          <ol class="max-h-96 overflow-y-auto p-4">
            <li
              v-for="(movement, index) in passport.movements ?? []"
              :key="`m-${index}`"
              class="relative border-l border-surface-200 pb-4 pl-5 last:pb-0 dark:border-surface-700"
            >
              <span
                class="absolute -left-[5px] top-1 size-2.5 rounded-full bg-brand-500 ring-4 ring-white dark:ring-surface-900"
              />
              <p class="text-sm font-bold text-surface-800 dark:text-surface-100">
                {{ movement.movement_type ?? 'MOVEMENT' }}
              </p>
              <p class="text-[11px] text-surface-400">
                {{ formatDateTime(movement.movement_time as string) }}
              </p>
            </li>
            <li v-if="!passport.movements?.length" class="text-sm text-surface-400">
              Belum ada movement tercatat.
            </li>
          </ol>
        </AppCard>
      </div>

      <!-- Traversal -->
      <div v-else-if="tab === 'graph'" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AppCard
          class="lg:col-span-2"
          title="Node hasil traversal"
          :subtitle="`${graph?.nodes?.length ?? 0} node · depth ${graph?.depth ?? depth} · ${graph?.direction ?? direction}`"
          icon="lucide:workflow"
          flush
        >
          <div
            v-if="graph?.truncated"
            class="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
          >
            <Icon icon="lucide:triangle-alert" :width="14" :height="14" class="mt-0.5 shrink-0" />
            Traversal terpotong pada batas node. Turunkan depth atau naikkan limit (maks 200).
          </div>

          <ul
            class="max-h-[28rem] divide-y divide-surface-100 overflow-y-auto dark:divide-surface-800/60"
          >
            <li
              v-for="node in graph?.nodes ?? []"
              :key="node.asset_uuid"
              class="flex items-center gap-3 px-4 py-2.5"
            >
              <AppBadge :label="String(node.asset_type ?? 'ASSET')" tone="brand" />
              <span
                class="min-w-0 flex-1 truncate font-mono text-[11px] text-surface-600 dark:text-surface-300"
                :title="node.asset_uuid"
              >
                {{ node.asset_uuid }}
              </span>
              <button
                type="button"
                class="shrink-0 text-surface-400 transition hover:text-brand-500"
                aria-label="Jadikan akar penelusuran"
                @click="focusNode(node.asset_uuid)"
              >
                <Icon icon="lucide:crosshair" :width="14" :height="14" />
              </button>
            </li>
            <li
              v-if="!graph?.nodes?.length"
              class="px-4 py-10 text-center text-sm text-surface-400"
            >
              Tidak ada node pada arah ini.
            </li>
          </ul>
        </AppCard>

        <AppCard title="Edge dilewati" icon="lucide:spline" flush>
          <ul
            class="max-h-[28rem] divide-y divide-surface-100 overflow-y-auto dark:divide-surface-800/60"
          >
            <li
              v-for="(edge, index) in graph?.edges ?? []"
              :key="`e-${index}`"
              class="px-4 py-2.5 font-mono text-[11px] text-surface-500 dark:text-surface-400"
            >
              {{ shortId(String(edge.parent_asset_uuid)) }}
              <Icon icon="lucide:arrow-right" :width="11" :height="11" class="mx-1 inline" />
              {{ shortId(String(edge.child_asset_uuid)) }}
              <span class="ml-1 text-brand-500">{{ edge.relationship_type ?? '' }}</span>
            </li>
            <li
              v-if="!graph?.edges?.length"
              class="px-4 py-10 text-center text-sm text-surface-400"
            >
              Tidak ada edge.
            </li>
          </ul>
        </AppCard>
      </div>

      <!-- Impact -->
      <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AppCard title="Dampak per tipe asset" icon="lucide:chart-pie">
          <BaseChart
            kind="donut"
            :series="impactChart.series"
            :labels="impactChart.labels"
            :height="280"
          />
        </AppCard>

        <AppCard class="lg:col-span-2" title="Ringkasan dampak hilir" icon="lucide:radar">
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div
              v-for="entry in [
                { label: 'Total asset', value: impact?.impacted_assets?.length ?? 0 },
                { label: 'Paket', value: impact?.package_assets?.length ?? 0 },
                { label: 'Keluhan', value: impact?.complaint_assets?.length ?? 0 },
                { label: 'Recall', value: impact?.recall_assets?.length ?? 0 },
              ]"
              :key="entry.label"
              class="rounded-xl bg-surface-50 px-3 py-3 text-center dark:bg-surface-850"
            >
              <p class="text-2xl font-extrabold text-surface-900 dark:text-white">
                {{ entry.value }}
              </p>
              <p class="text-[10px] font-bold tracking-wide text-surface-400 uppercase">
                {{ entry.label }}
              </p>
            </div>
          </div>

          <p
            v-if="impact?.truncated"
            class="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
          >
            Hasil impact terpotong pada batas traversal (depth 6, limit 200). Jangan menganggap
            daftar ini lengkap untuk keputusan recall.
          </p>

          <ul class="mt-4 max-h-64 space-y-1 overflow-y-auto">
            <li
              v-for="asset in impact?.package_assets ?? []"
              :key="asset.asset_uuid"
              class="flex items-center gap-2 rounded-lg px-2 py-1.5 font-mono text-[11px] text-surface-600 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-850"
            >
              <Icon
                icon="lucide:package"
                :width="12"
                :height="12"
                class="shrink-0 text-brand-500"
              />
              <span class="truncate">{{ asset.asset_uuid }}</span>
            </li>
          </ul>
        </AppCard>
      </div>
    </template>
  </div>
</template>
