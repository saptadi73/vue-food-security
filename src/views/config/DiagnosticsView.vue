<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { apiTrace, fsos, isApiError } from '@/api'
import { env } from '@/config/env'
import { useAuthStore } from '@/stores/auth'
import { copyToClipboard, formatDateTime } from '@/utils/format'

const auth = useAuthStore()

const checking = ref(false)
const health = ref<'unknown' | 'ok' | 'fail'>('unknown')
const ready = ref<'unknown' | 'ready' | 'not_ready' | 'fail'>('unknown')
const checks = ref<Record<string, unknown> | null>(null)
const lastCheckedAt = ref<string | null>(null)

async function runChecks() {
  checking.value = true
  try {
    await fsos.system.health()
    health.value = 'ok'
  } catch {
    health.value = 'fail'
  }

  try {
    const data = await fsos.system.ready()
    ready.value = data?.status === 'ready' ? 'ready' : 'not_ready'
    checks.value = (data?.checks as Record<string, unknown>) ?? null
  } catch (error) {
    // 503 Not Ready tetap membawa envelope dengan data.checks.
    ready.value = isApiError(error) && error.status === 503 ? 'not_ready' : 'fail'
    checks.value = null
  }

  lastCheckedAt.value = new Date().toISOString()
  checking.value = false
}

void runChecks()
</script>

<template>
  <div>
    <PageHeader
      title="Diagnostik API"
      description="Konfigurasi koneksi, kesiapan backend, identitas sesi dan riwayat request untuk penelusuran masalah."
      icon="lucide:activity"
    >
      <template #actions>
        <AppButton variant="outline" icon="lucide:rotate-cw" :loading="checking" @click="runChecks">
          Periksa ulang
        </AppButton>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <AppCard title="Koneksi" icon="lucide:plug-zap">
        <dl class="space-y-2 text-sm">
          <div
            v-for="entry in [
              { label: 'Base URL', value: env.apiBase },
              { label: 'Origin backend', value: env.apiOrigin },
              { label: 'Prefix', value: env.apiPrefix },
              { label: 'Dev proxy', value: env.useProxy ? 'aktif' : 'nonaktif' },
              { label: 'Timeout', value: `${env.requestTimeoutMs} ms` },
            ]"
            :key="entry.label"
            class="flex items-center justify-between gap-3 border-b border-surface-100 pb-2 last:border-0 dark:border-surface-800/60"
          >
            <dt class="shrink-0 text-surface-500 dark:text-surface-400">{{ entry.label }}</dt>
            <dd class="min-w-0 truncate text-right font-mono text-xs">{{ entry.value }}</dd>
          </div>
        </dl>
      </AppCard>

      <AppCard title="Kesiapan backend" icon="lucide:heart-pulse">
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-surface-500">GET /health</span>
            <AppBadge
              :status="health === 'ok' ? 'OK' : health === 'fail' ? 'FAILED' : 'UNKNOWN'"
              dot
            />
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-surface-500">GET /ready</span>
            <AppBadge
              :status="ready === 'ready' ? 'OK' : ready === 'unknown' ? 'UNKNOWN' : 'FAILED'"
              :label="ready"
              dot
            />
          </div>

          <pre
            v-if="checks"
            class="max-h-40 overflow-auto rounded-xl bg-surface-50 p-3 font-mono text-[11px] dark:bg-surface-850"
            >{{ JSON.stringify(checks, null, 2) }}</pre>

          <p class="text-[11px] text-surface-400">
            readiness 200 tidak menjamin login berhasil: secret JWT, rate limiter dan kelengkapan
            akun tidak diperiksa endpoint ini.
          </p>
          <p v-if="lastCheckedAt" class="text-[11px] text-surface-400">
            Diperiksa {{ formatDateTime(lastCheckedAt) }}
          </p>
        </div>
      </AppCard>

      <AppCard title="Sesi & RBAC" icon="lucide:shield">
        <dl class="space-y-2 text-sm">
          <div class="flex items-center justify-between gap-3">
            <dt class="text-surface-500">User ID</dt>
            <dd class="truncate font-mono text-xs">{{ auth.identity?.user_id ?? '—' }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3">
            <dt class="text-surface-500">Tenant ID</dt>
            <dd class="truncate font-mono text-xs">{{ auth.identity?.tenant_id ?? '—' }}</dd>
          </div>
        </dl>

        <p class="mt-3 mb-1.5 text-[10px] font-bold tracking-wide text-surface-400 uppercase">
          Role
        </p>
        <div class="flex flex-wrap gap-1.5">
          <AppBadge v-for="role in auth.roles" :key="role" :label="role" tone="brand" />
          <span v-if="!auth.roles.length" class="text-xs text-surface-400">—</span>
        </div>

        <p class="mt-4 mb-1.5 text-[10px] font-bold tracking-wide text-surface-400 uppercase">
          Permission ({{ auth.identity?.permissions.length ?? 0 }})
        </p>
        <div class="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          <AppBadge
            v-for="permission in auth.identity?.permissions ?? []"
            :key="permission"
            :label="permission"
            tone="neutral"
          />
        </div>
      </AppCard>
    </div>

    <AppCard class="mt-4" title="Riwayat request" icon="lucide:list" flush>
      <template #actions>
        <AppButton size="xs" variant="ghost" icon="lucide:trash-2" @click="apiTrace.clear()">
          Bersihkan
        </AppButton>
      </template>

      <ul
        class="max-h-[26rem] divide-y divide-surface-100 overflow-y-auto dark:divide-surface-800/60"
      >
        <li
          v-for="entry in apiTrace.state.entries"
          :key="entry.id"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 font-mono text-[11px]"
        >
          <span
            class="w-12 shrink-0 font-bold"
            :class="entry.ok ? 'text-emerald-500' : 'text-rose-500'"
          >
            {{ entry.status ?? 'ERR' }}
          </span>
          <span class="w-12 shrink-0 font-bold text-surface-500">{{ entry.method }}</span>
          <span class="min-w-0 flex-1 truncate text-surface-700 dark:text-surface-200">
            {{ entry.path }}
          </span>
          <span class="shrink-0 text-surface-400">{{ entry.durationMs }}ms</span>
          <button
            v-if="entry.requestId"
            type="button"
            class="shrink-0 text-surface-400 transition hover:text-brand-500"
            title="Salin request_id"
            @click="copyToClipboard(entry.requestId)"
          >
            <Icon icon="lucide:copy" :width="12" :height="12" />
          </button>
        </li>
        <li
          v-if="!apiTrace.state.entries.length"
          class="px-4 py-10 text-center text-sm text-surface-400"
        >
          Belum ada request tercatat pada sesi ini.
        </li>
      </ul>
    </AppCard>
  </div>
</template>
