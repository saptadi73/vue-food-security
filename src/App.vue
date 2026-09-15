<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ToastHost from '@/components/ui/ToastHost.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { setSessionExpiredHandler } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

onMounted(() => {
  // Refresh token gagal di level client: bersihkan state lalu arahkan ke login.
  setSessionExpiredHandler(() => {
    auth.markSessionExpired()
    toast.warning('Sesi berakhir', { description: 'Silakan masuk kembali untuk melanjutkan.' })
    void router.push({
      name: 'login',
      query: { redirect: router.currentRoute.value.fullPath },
    })
  })
})
</script>

<template>
  <RouterView />
  <ToastHost />
  <ConfirmDialog />
</template>
