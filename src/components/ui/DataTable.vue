<script setup lang="ts" generic="T extends object">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import AppPagination from './AppPagination.vue'
import EmptyState from './EmptyState.vue'
import ErrorState from './ErrorState.vue'
import type { ApiError } from '@/api'

export interface TableColumn<Row = Record<string, unknown>> {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  width?: string
  /** Sembunyikan kolom pada layar kecil agar tabel tetap terbaca. */
  hideBelow?: 'sm' | 'md' | 'lg'
  mono?: boolean
  value?: (row: Row) => unknown
}

const props = withDefaults(
  defineProps<{
    columns: TableColumn<T>[]
    rows: T[]
    rowKey: keyof T | ((row: T) => string)
    loading?: boolean
    refreshing?: boolean
    error?: ApiError | null
    empty?: { icon?: string; title?: string; description?: string; actionLabel?: string }
    searchable?: boolean
    searchPlaceholder?: string
    /** true bila pencarian dikirim ke server, false bila difilter di klien. */
    serverSearch?: boolean
    selectable?: boolean
    skeletonRows?: number
    pagination?: { page: number; offset: number; hasNext: boolean; hasPrev: boolean }
  }>(),
  { skeletonRows: 6, searchPlaceholder: 'Cari…' },
)

const emit = defineEmits<{
  next: []
  prev: []
  refresh: []
  retry: []
  rowClick: [row: T]
  emptyAction: []
}>()

const search = defineModel<string>('search', { default: '' })
const limit = defineModel<number>('limit', { default: 20 })

const HIDE_CLASS = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
}

const showSkeleton = computed(() => props.loading && props.rows.length === 0)
const showEmpty = computed(() => !props.loading && !props.error && props.rows.length === 0)

function keyOf(row: T): string {
  return typeof props.rowKey === 'function'
    ? props.rowKey(row)
    : String((row as Record<string, unknown>)[props.rowKey as string])
}

function cellValue(row: T, column: TableColumn<T>): unknown {
  return column.value ? column.value(row) : (row as Record<string, unknown>)[column.key]
}

function alignClass(column: TableColumn<T>) {
  return column.align === 'right'
    ? 'text-right'
    : column.align === 'center'
      ? 'text-center'
      : 'text-left'
}
</script>

<template>
  <div class="card-surface flex flex-col overflow-hidden">
    <!-- Toolbar: pencarian + aksi tambahan -->
    <div
      v-if="searchable || $slots.toolbar"
      class="flex flex-col gap-3 border-b border-surface-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-surface-800"
    >
      <div v-if="searchable" class="relative w-full sm:max-w-xs">
        <Icon
          icon="lucide:search"
          :width="16"
          :height="16"
          class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-surface-400"
        />
        <input
          v-model="search"
          type="search"
          :placeholder="searchPlaceholder"
          class="input-base h-10 py-0 pl-9"
          @keydown.enter="serverSearch && emit('refresh')"
        />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <slot name="toolbar" />
        <button
          type="button"
          class="grid size-10 shrink-0 place-items-center rounded-xl border border-surface-300 text-surface-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-surface-700"
          :aria-label="'Muat ulang'"
          @click="emit('refresh')"
        >
          <Icon
            :icon="refreshing ? 'svg-spinners:ring-resize' : 'lucide:rotate-cw'"
            :width="16"
            :height="16"
          />
        </button>
      </div>
    </div>

    <ErrorState v-if="error" :error="error" compact @retry="emit('retry')" />

    <template v-else>
      <!-- Tabel (>= sm) -->
      <div class="scroll-x hidden sm:block">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-surface-200 dark:border-surface-800">
              <th
                v-for="column in columns"
                :key="column.key"
                scope="col"
                class="px-4 py-3 text-[11px] font-bold tracking-wider text-surface-500 uppercase dark:text-surface-400"
                :class="[alignClass(column), column.hideBelow ? HIDE_CLASS[column.hideBelow] : '']"
                :style="column.width ? { width: column.width } : undefined"
              >
                {{ column.label }}
              </th>
              <th v-if="$slots.actions" scope="col" class="w-px px-4 py-3">
                <span class="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>

          <tbody v-if="showSkeleton">
            <tr
              v-for="row in skeletonRows"
              :key="`skeleton-${row}`"
              class="border-b border-surface-100 dark:border-surface-800/60"
            >
              <td v-for="column in columns" :key="column.key" class="px-4 py-3.5">
                <div class="skeleton h-3.5" :style="{ width: `${50 + ((row * 13) % 45)}%` }" />
              </td>
              <td v-if="$slots.actions" class="px-4 py-3.5"><div class="skeleton h-3.5 w-8" /></td>
            </tr>
          </tbody>

          <tbody v-else>
            <tr
              v-for="row in rows"
              :key="keyOf(row)"
              class="animate-fade-in border-b border-surface-100 transition-colors last:border-0 hover:bg-surface-50 dark:border-surface-800/60 dark:hover:bg-surface-850/60"
              :class="selectable ? 'cursor-pointer' : ''"
              @click="selectable && emit('rowClick', row)"
            >
              <td
                v-for="column in columns"
                :key="column.key"
                class="px-4 py-3.5 text-surface-700 dark:text-surface-200"
                :class="[
                  alignClass(column),
                  column.mono ? 'font-mono text-xs' : '',
                  column.hideBelow ? HIDE_CLASS[column.hideBelow] : '',
                ]"
              >
                <slot :name="`cell-${column.key}`" :row="row" :value="cellValue(row, column)">
                  {{ cellValue(row, column) ?? '—' }}
                </slot>
              </td>
              <td v-if="$slots.actions" class="px-4 py-3.5 text-right" @click.stop>
                <slot name="actions" :row="row" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Kartu (mobile) -->
      <div class="divide-y divide-surface-100 sm:hidden dark:divide-surface-800/60">
        <template v-if="showSkeleton">
          <div v-for="row in skeletonRows" :key="`m-skeleton-${row}`" class="space-y-2.5 p-4">
            <div class="skeleton h-4 w-1/2" />
            <div class="skeleton h-3 w-3/4" />
            <div class="skeleton h-3 w-1/3" />
          </div>
        </template>

        <template v-else>
          <article
            v-for="row in rows"
            :key="`m-${keyOf(row)}`"
            class="animate-fade-in space-y-2 p-4 active:bg-surface-50 dark:active:bg-surface-850"
            @click="selectable && emit('rowClick', row)"
          >
            <slot name="mobile" :row="row">
              <div
                v-for="column in columns"
                :key="column.key"
                class="flex items-start justify-between gap-3"
              >
                <span
                  class="shrink-0 text-[11px] font-semibold tracking-wide text-surface-400 uppercase"
                >
                  {{ column.label }}
                </span>
                <span
                  class="min-w-0 text-right text-sm text-surface-800 dark:text-surface-100"
                  :class="column.mono ? 'font-mono text-xs break-all' : ''"
                >
                  <slot :name="`cell-${column.key}`" :row="row" :value="cellValue(row, column)">
                    {{ cellValue(row, column) ?? '—' }}
                  </slot>
                </span>
              </div>
            </slot>
            <div v-if="$slots.actions" class="flex justify-end pt-1" @click.stop>
              <slot name="actions" :row="row" />
            </div>
          </article>
        </template>
      </div>

      <slot v-if="showEmpty" name="empty">
        <EmptyState
          compact
          :icon="empty?.icon"
          :title="empty?.title ?? 'Belum ada data'"
          :description="empty?.description"
          :action-label="empty?.actionLabel"
          @action="emit('emptyAction')"
        />
      </slot>

      <AppPagination
        v-if="pagination && !showEmpty"
        v-model:limit="limit"
        :page="pagination.page"
        :offset="pagination.offset"
        :count="rows.length"
        :has-next="pagination.hasNext"
        :has-prev="pagination.hasPrev"
        :loading="loading"
        @next="emit('next')"
        @prev="emit('prev')"
      />
    </template>
  </div>
</template>
