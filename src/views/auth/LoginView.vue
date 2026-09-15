<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { isApiError } from '@/api'
import { env } from '@/config/env'

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()
const route = useRoute()

const tenant = ref(env.defaultTenant)
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const formError = ref('')

const canSubmit = computed(
  () => tenant.value.trim() && username.value.trim() && password.value.length > 0,
)

async function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  formError.value = ''
  fieldErrors.value = {}

  try {
    // Field `tenant` menerima tenant code maupun UUID, jadi tenant_id legacy tidak dikirim.
    await auth.login({
      tenant: tenant.value.trim(),
      username: username.value.trim(),
      password: password.value,
    })
    toast.success('Berhasil masuk', { description: `Role: ${auth.roles.join(', ') || '—'}` })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect)
  } catch (error) {
    if (isApiError(error)) {
      fieldErrors.value = error.fieldErrors
      formError.value = error.displayMessage
      if (error.kind === 'rate_limited' && error.retryAfterSeconds) {
        formError.value = `Terlalu banyak percobaan. Coba lagi dalam ${error.retryAfterSeconds} detik.`
      }
    } else {
      formError.value = 'Login gagal karena kesalahan tidak terduga.'
    }
  } finally {
    password.value = ''
    submitting.value = false
  }
}
</script>

<template>
  <!-- Layar auth selalu gelap, jadi token warna dipaksa memakai skala dark. -->
  <div
    class="dark relative flex min-h-dvh items-center justify-center overflow-hidden bg-surface-950 p-4"
  >
    <!-- Latar dekoratif -->
    <div
      class="pointer-events-none absolute -top-40 -left-40 size-[32rem] rounded-full bg-brand-600/20 blur-[120px]"
    />
    <div
      class="pointer-events-none absolute -right-32 -bottom-40 size-[28rem] rounded-full bg-emerald-500/15 blur-[120px]"
    />
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.15]"
      style="
        background-image:
          linear-gradient(rgba(148, 163, 184, 0.35) 1px, transparent 1px),
          linear-gradient(90deg, rgba(148, 163, 184, 0.35) 1px, transparent 1px);
        background-size: 56px 56px;
        mask-image: radial-gradient(ellipse at center, black 20%, transparent 70%);
      "
    />

    <div class="animate-fade-up relative w-full max-w-md">
      <div class="mb-7 flex flex-col items-center text-center">
        <span
          class="mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-700 text-white shadow-float"
        >
          <Icon icon="lucide:leaf" :width="28" :height="28" />
        </span>
        <h1 class="text-2xl font-extrabold tracking-tight text-white">{{ env.appName }}</h1>
        <p class="mt-1 text-sm text-surface-400">{{ env.appLongName }}</p>
      </div>

      <form
        class="rounded-2xl border border-surface-800 bg-surface-900/80 p-6 shadow-float backdrop-blur-xl sm:p-7"
        novalidate
        @submit.prevent="submit"
      >
        <div class="space-y-4">
          <AppInput
            v-model="tenant"
            label="Tenant"
            icon="lucide:building-2"
            placeholder="FSOS_DEMO"
            autocomplete="organization"
            required
            :error="fieldErrors.tenant ?? fieldErrors.tenant_id"
            hint="Tenant code (mis. FSOS_DEMO). UUID tenant juga diterima."
          />

          <AppInput
            v-model="username"
            label="Username"
            icon="lucide:user"
            placeholder="operator"
            autocomplete="username"
            required
            :error="fieldErrors.username"
          />

          <div class="relative">
            <AppInput
              v-model="password"
              label="Password"
              icon="lucide:lock"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
              :error="fieldErrors.password"
            />
            <button
              type="button"
              class="absolute top-[30px] right-2 grid size-9 place-items-center rounded-lg text-surface-400 transition hover:text-surface-200"
              :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
              @click="showPassword = !showPassword"
            >
              <Icon
                :icon="showPassword ? 'lucide:eye-off' : 'lucide:eye'"
                :width="16"
                :height="16"
              />
            </button>
          </div>
        </div>

        <p
          v-if="formError"
          class="animate-fade-in mt-4 flex items-start gap-2 rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300"
          role="alert"
        >
          <Icon icon="lucide:circle-alert" :width="16" :height="16" class="mt-0.5 shrink-0" />
          {{ formError }}
        </p>

        <AppButton
          type="submit"
          block
          size="lg"
          class="mt-6"
          icon-right="lucide:arrow-right"
          :loading="submitting"
          :disabled="!canSubmit"
        >
          Masuk
        </AppButton>

        <p class="mt-5 text-center text-[11px] leading-relaxed text-surface-400">
          Access token disimpan di memori dan refresh token di sessionStorage tab ini. Sesi berakhir
          saat tab ditutup.
        </p>
      </form>

      <p class="mt-5 text-center font-mono text-[11px] text-surface-400">{{ env.apiBase }}</p>
    </div>
  </div>
</template>
