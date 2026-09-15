<script setup lang="ts">
import { Icon } from '@iconify/vue'
import AppButton from '@/components/ui/AppButton.vue'
</script>

<template>
  <div class="animate-fade-up flex min-h-[60vh] flex-col items-center justify-center text-center">
    <span
      class="mb-5 grid size-20 place-items-center rounded-3xl bg-surface-100 text-surface-400 dark:bg-surface-800"
    >
      <Icon icon="lucide:map-pin-off" :width="36" :height="36" />
    </span>
    <p class="font-mono text-sm font-bold text-brand-600 dark:text-brand-400">404</p>
    <h1 class="mt-1 text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white">
      Halaman tidak ditemukan
    </h1>
    <p class="text-balance mt-2 max-w-sm text-sm text-surface-500 dark:text-surface-400">
      Rute yang diminta tidak terdaftar pada aplikasi ini.
    </p>
    <AppButton class="mt-6" to="/" icon="lucide:arrow-left">Kembali ke dashboard</AppButton>
  </div>
</template>
