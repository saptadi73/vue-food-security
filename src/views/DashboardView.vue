<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import BaseChart from '@/components/charts/BaseChart.vue'
import { fsos } from '@/api'
import { useAsyncData } from '@/composables/useAsyncData'
import { formatDateTime, formatRelative } from '@/utils/format'

const home = useAsyncData(() => fsos.dashboard.home())
const holding = useAsyncData(() => fsos.dashboard.holding())
const fleet = useAsyncData(() => fsos.dashboard.fleet())
const storage = useAsyncData(() => fsos.dashboard.storage())
const recall = useAsyncData(() => fsos.dashboard.recall())
const notifications = useAsyncData(() => fsos.dashboard.notifications())
const temperatures = useAsyncData(() => fsos.dashboard.storageTemperatures({ limit: 8 }))

const anyLoading = computed(
  () => home.loading.value || holding.loading.value || fleet.loading.value,
)

function refreshAll() {
  void home.refresh()
  void holding.refresh()
  void fleet.refresh()
  void storage.refresh()
  void recall.refresh()
  void notifications.refresh()
  void temperatures.refresh()
}

/** Distribusi paket sepanjang rantai — sumber tunggal DashboardHomeData. */
const packageFlow = computed(() => {
  const data = home.data.value
  return {
    categories: ['Delivered', 'Received', 'Consumed', 'Discarded', 'Recalled'],
    series: [
      {
        name: 'Paket',
        data: [
          data?.packages_delivered ?? 0,
          data?.packages_received ?? 0,
          data?.packages_consumed ?? 0,
          data?.packages_discarded ?? 0,
          data?.packages_recalled ?? 0,
        ],
      },
    ],
  }
})

const holdingSeries = computed(() => {
  const data = holding.data.value
  return [
    data?.packages_created ?? 0,
    data?.packages_packaged ?? 0,
    data?.packages_released ?? 0,
    data?.packages_expired ?? 0,
    data?.packages_recalled ?? 0,
  ]
})

const notificationSeries = computed(() => {
  const data = notifications.data.value
  return [
    {
      name: 'Outbox',
      data: [data?.pending ?? 0, data?.sent ?? 0, data?.failed ?? 0, data?.cancelled ?? 0],
    },
  ]
})

const channelSeries = computed(() => {
  const data = notifications.data.value
  return [
    data?.dashboard_pending ?? 0,
    data?.email_pending ?? 0,
    data?.whatsapp_pending ?? 0,
    data?.telegram_pending ?? 0,
  ]
})

const fleetSeries = computed(() => {
  const data = fleet.data.value
  return [
    {
      name: 'Delivery',
      data: [
        data?.deliveries_created ?? 0,
        data?.deliveries_in_transit ?? 0,
        data?.deliveries_completed ?? 0,
      ],
    },
  ]
})
</script>

<template>
  <div>
    <PageHeader
      title="Dashboard Operasional"
      description="Snapshot counter tenant saat request. Angka dihitung langsung dari database, bukan agregat cache."
      icon="lucide:layout-dashboard"
    >
      <template #actions>
        <AppButton
          variant="outline"
          icon="lucide:rotate-cw"
          :loading="anyLoading"
          @click="refreshAll"
        >
          Muat ulang
        </AppButton>
        <AppButton to="/scan" icon="lucide:scan-line">Pindai QR</AppButton>
      </template>
    </PageHeader>

    <ErrorState v-if="home.error.value" :error="home.error.value" @retry="home.refresh()" />

    <template v-else>
      <!-- KPI utama -->
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Keluhan aktif"
          :value="home.data.value?.complaints_open"
          icon="lucide:message-square-warning"
          tone="warning"
          :loading="home.loading.value"
          hint="Belum ditutup"
        />
        <StatCard
          label="Recall berjalan"
          :value="home.data.value?.recalls_open"
          icon="lucide:undo-2"
          tone="danger"
          :loading="home.loading.value"
          hint="Belum completed"
        />
        <StatCard
          label="Dalam perjalanan"
          :value="home.data.value?.deliveries_in_transit"
          icon="lucide:truck"
          tone="info"
          :loading="home.loading.value"
          hint="Status IN_TRANSIT"
        />
        <StatCard
          label="Produksi selesai"
          :value="home.data.value?.production_completed"
          icon="lucide:factory"
          tone="success"
          :loading="home.loading.value"
          hint="Batch COMPLETED"
        />
      </div>

      <!-- Chart baris 1 -->
      <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AppCard
          class="lg:col-span-2"
          title="Distribusi paket"
          subtitle="Posisi paket pada rantai distribusi"
          icon="lucide:package"
        >
          <BaseChart
            kind="bar"
            :series="packageFlow.series"
            :categories="packageFlow.categories"
            :height="300"
            :loading="home.loading.value"
            :colors="['#16a34a']"
          />
        </AppCard>

        <AppCard
          title="Lifecycle holding"
          subtitle="Status paket pada masa holding"
          icon="lucide:timer"
        >
          <BaseChart
            kind="donut"
            :series="holdingSeries"
            :labels="['Created', 'Packaged', 'Released', 'Expired', 'Recalled']"
            :height="300"
            :loading="holding.loading.value"
          />
        </AppCard>
      </div>

      <!-- Chart baris 2 -->
      <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AppCard title="Armada & pengiriman" icon="lucide:truck">
          <BaseChart
            kind="bar"
            horizontal
            :series="fleetSeries"
            :categories="['Dibuat', 'In transit', 'Selesai']"
            :height="240"
            :loading="fleet.loading.value"
            :colors="['#0ea5e9']"
          />
          <dl class="mt-3 grid grid-cols-3 gap-2 text-center">
            <div class="rounded-xl bg-surface-50 py-2.5 dark:bg-surface-850">
              <dt class="text-[10px] font-bold text-surface-400 uppercase">Kendaraan</dt>
              <dd class="text-lg font-extrabold">{{ fleet.data.value?.vehicles_active ?? '—' }}</dd>
            </div>
            <div class="rounded-xl bg-surface-50 py-2.5 dark:bg-surface-850">
              <dt class="text-[10px] font-bold text-surface-400 uppercase">Driver</dt>
              <dd class="text-lg font-extrabold">{{ fleet.data.value?.drivers_active ?? '—' }}</dd>
            </div>
            <div class="rounded-xl bg-surface-50 py-2.5 dark:bg-surface-850">
              <dt class="text-[10px] font-bold text-surface-400 uppercase">GPS log</dt>
              <dd class="text-lg font-extrabold">{{ fleet.data.value?.gps_logs ?? '—' }}</dd>
            </div>
          </dl>
        </AppCard>

        <AppCard title="Notification outbox" icon="lucide:bell">
          <BaseChart
            kind="bar"
            :series="notificationSeries"
            :categories="['Pending', 'Sent', 'Failed', 'Cancelled']"
            :height="240"
            :loading="notifications.loading.value"
            :colors="['#f59e0b']"
          />
        </AppCard>

        <AppCard title="Pending per kanal" icon="lucide:send">
          <BaseChart
            kind="donut"
            :series="channelSeries"
            :labels="['Dashboard', 'Email', 'WhatsApp', 'Telegram']"
            :height="240"
            :loading="notifications.loading.value"
            :colors="['#8b5cf6', '#0ea5e9', '#16a34a', '#38bdf8']"
          />
        </AppCard>
      </div>

      <!-- Monitor suhu + ringkasan recall -->
      <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AppCard
          class="lg:col-span-2"
          title="Monitor suhu penyimpanan"
          subtitle="Sampel terbaru dari temperature_log"
          icon="lucide:thermometer"
          flush
        >
          <template #actions>
            <AppButton size="xs" variant="ghost" to="/monitoring/temperature"
              >Lihat semua</AppButton
            >
          </template>

          <div v-if="temperatures.loading.value" class="space-y-3 p-4">
            <div v-for="row in 5" :key="row" class="skeleton h-10" />
          </div>

          <ul v-else class="divide-y divide-surface-100 dark:divide-surface-800/60">
            <li
              v-for="item in temperatures.data.value?.items ?? []"
              :key="item.storage_id"
              class="flex items-center gap-3 px-4 py-3"
            >
              <span class="min-w-0 flex-1">
                <span
                  class="block truncate text-sm font-semibold text-surface-800 dark:text-surface-100"
                >
                  {{ item.storage_name }}
                </span>
                <span class="text-[11px] text-surface-400">
                  {{ item.storage_type }} · {{ formatRelative(item.recorded_at) }}
                </span>
              </span>
              <span class="shrink-0 font-mono text-sm font-bold">
                {{ item.temperature ?? '—'
                }}<span class="text-xs text-surface-400">{{ item.unit ?? '' }}</span>
              </span>
              <AppBadge :status="item.status" />
            </li>
            <li
              v-if="!temperatures.data.value?.items?.length"
              class="px-4 py-8 text-center text-sm text-surface-400"
            >
              Belum ada log suhu.
            </li>
          </ul>
        </AppCard>

        <AppCard title="Recall & stok" icon="lucide:shield-alert">
          <dl class="space-y-2.5 text-sm">
            <div
              v-for="entry in [
                { label: 'Recall selesai', value: recall.data.value?.recalls_completed },
                { label: 'Paket ter-recall', value: recall.data.value?.packages_recalled },
                { label: 'Movement recall', value: recall.data.value?.recall_movements },
                { label: 'Storage aktif', value: storage.data.value?.storages_active },
                { label: 'Zona penyimpanan', value: storage.data.value?.storage_zones },
                { label: 'Batch bahan tersedia', value: home.data.value?.raw_batches_available },
                { label: 'Entry stok', value: storage.data.value?.stock_entries },
              ]"
              :key="entry.label"
              class="flex items-center justify-between gap-3 border-b border-surface-100 pb-2.5 last:border-0 dark:border-surface-800/60"
            >
              <dt class="text-surface-500 dark:text-surface-400">{{ entry.label }}</dt>
              <dd class="font-mono font-bold text-surface-900 dark:text-white">
                {{ entry.value ?? '—' }}
              </dd>
            </div>
          </dl>
        </AppCard>
      </div>

      <p class="mt-5 text-center text-[11px] text-surface-400">
        Terakhir dimuat {{ formatDateTime(new Date().toISOString()) }} · tidak ada subscription
        realtime pada kontrak saat ini.
      </p>
    </template>
  </div>
</template>
