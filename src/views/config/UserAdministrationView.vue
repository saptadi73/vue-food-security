<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Icon } from '@iconify/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { api, endpoints, fsos, toApiError } from '@/api'
import type { OffsetPage } from '@/api'
import type { Kitchen, School } from '@/api/modules/masters'
import type { TenantUser, UserRole, UserStatus } from '@/api/modules/users'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/utils/format'

const toast = useToastStore()
const users = ref<TenantUser[]>([])
const roles = ref<UserRole[]>([])
const kitchens = ref<Kitchen[]>([])
const schools = ref<School[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const modalOpen = ref(false)
const editing = ref<TenantUser | null>(null)
const search = ref('')
const statusFilter = ref<UserStatus | ''>('')

const form = reactive({
  username: '', fullname: '', email: '', job_title: '', password: '', status: 'ACTIVE' as UserStatus,
  role_ids: [] as string[], kitchen_ids: [] as string[], school_ids: [] as string[],
})

const visibleUsers = computed(() => {
  const needle = search.value.trim().toLowerCase()
  return users.value.filter((user) => !needle || [user.username, user.fullname, user.email, user.job_title]
    .some((value) => String(value ?? '').toLowerCase().includes(needle)))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [userPage, roleList, kitchenPage, schoolPage] = await Promise.all([
      fsos.users.list({ status: statusFilter.value || undefined, limit: 100 }),
      fsos.users.roles(),
      api.get<OffsetPage<Kitchen>>(endpoints.kitchens.list({ limit: 100, status: 'ACTIVE' })),
      api.get<OffsetPage<School>>(endpoints.schools.list({ limit: 100, status: 'ACTIVE' })),
    ])
    users.value = userPage.items
    roles.value = roleList
    kitchens.value = kitchenPage.items
    schools.value = schoolPage.items
  } catch (cause) {
    error.value = toApiError(cause).displayMessage
  } finally { loading.value = false }
}

function openCreate() {
  editing.value = null
  Object.assign(form, { username: '', fullname: '', email: '', job_title: '', password: '', status: 'ACTIVE', role_ids: [], kitchen_ids: [], school_ids: [] })
  modalOpen.value = true
}

function openEdit(user: TenantUser) {
  editing.value = user
  Object.assign(form, {
    username: user.username, fullname: user.fullname, email: user.email, job_title: user.job_title ?? '', password: '', status: user.status,
    role_ids: user.roles.map((role) => role.role_id),
    kitchen_ids: user.location_assignments.flatMap((item) => item.kitchen_id ? [item.kitchen_id] : []),
    school_ids: user.location_assignments.flatMap((item) => item.school_id ? [item.school_id] : []),
  })
  modalOpen.value = true
}

function toggle(list: string[], id: string) {
  const index = list.indexOf(id)
  index >= 0 ? list.splice(index, 1) : list.push(id)
}

async function submit() {
  if (!form.role_ids.length) return toast.error('Pilih minimal satu role')
  if (!editing.value && form.password.length < 12) return toast.error('Password minimal 12 karakter')
  const location_assignments = [
    ...form.kitchen_ids.map((kitchen_id) => ({ location_type: 'KITCHEN' as const, kitchen_id, school_id: null })),
    ...form.school_ids.map((school_id) => ({ location_type: 'SCHOOL' as const, kitchen_id: null, school_id })),
  ]
  saving.value = true
  try {
    if (editing.value) {
      await fsos.users.update(editing.value.user_id, {
        expected_version: editing.value.version, fullname: form.fullname, email: form.email,
        job_title: form.job_title || null, status: form.status, password: form.password || null,
        role_ids: form.role_ids, location_assignments,
      })
      toast.success('User diperbarui')
    } else {
      await fsos.users.create({ username: form.username, fullname: form.fullname, email: form.email,
        job_title: form.job_title || null, password: form.password, role_ids: form.role_ids, location_assignments })
      toast.success('User didaftarkan')
    }
    modalOpen.value = false
    await load()
  } catch (cause) { toast.fromError(cause, 'Gagal menyimpan user') }
  finally { saving.value = false }
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader title="Administrasi User" description="Kelola identitas operasional, role, jabatan, serta akses dapur dan sekolah." icon="lucide:users" tag="USER.READ">
      <template #actions><AppButton icon="lucide:user-plus" @click="openCreate">Daftarkan user</AppButton></template>
    </PageHeader>

    <section class="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900">
      <div class="flex flex-col gap-3 border-b border-surface-200 p-4 sm:flex-row dark:border-surface-800">
        <div class="relative flex-1"><Icon icon="lucide:search" class="absolute left-3 top-3 text-surface-400"/><input v-model="search" class="w-full rounded-xl border border-surface-300 bg-transparent py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-500 dark:border-surface-700" placeholder="Cari nama, username, email, atau jabatan" /></div>
        <select v-model="statusFilter" class="rounded-xl border border-surface-300 bg-transparent px-3 py-2.5 text-sm dark:border-surface-700" @change="load"><option value="">Semua status</option><option>ACTIVE</option><option>INACTIVE</option><option>LOCKED</option></select>
        <button class="rounded-xl border border-surface-300 px-4 text-sm dark:border-surface-700" @click="load">Segarkan</button>
      </div>
      <p v-if="error" class="m-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{{ error }}</p>
      <div class="overflow-x-auto"><table class="w-full min-w-[880px] text-left text-sm"><thead class="bg-surface-50 text-xs uppercase text-surface-500 dark:bg-surface-950"><tr><th class="p-4">User</th><th>Jabatan</th><th>Role</th><th>Lokasi</th><th>Status</th><th>Dibuat</th><th class="pr-4 text-right">Aksi</th></tr></thead><tbody>
        <tr v-if="loading"><td colspan="7" class="p-10 text-center text-surface-500">Memuat user...</td></tr>
        <tr v-for="user in visibleUsers" :key="user.user_id" class="border-t border-surface-100 dark:border-surface-800"><td class="p-4"><strong class="block">{{ user.fullname }}</strong><span class="text-xs text-surface-500">{{ user.username }} Â· {{ user.email }}</span></td><td>{{ user.job_title || 'â€”' }}</td><td><span class="text-xs">{{ user.roles.map(r => r.role_name).join(', ') }}</span></td><td><span class="text-xs">{{ user.location_assignments.length }} assignment</span></td><td><AppBadge :status="user.status" /></td><td>{{ formatDateTime(user.created_at) }}</td><td class="pr-4 text-right"><button class="rounded-lg border border-surface-300 px-3 py-2 text-xs hover:border-brand-500 hover:text-brand-600 dark:border-surface-700" @click="openEdit(user)">Ubah</button></td></tr>
        <tr v-if="!loading && !visibleUsers.length"><td colspan="7" class="p-10 text-center text-surface-500">Belum ada user yang cocok.</td></tr>
      </tbody></table></div>
    </section>

    <div v-if="modalOpen" class="fixed inset-0 z-50 grid place-items-center bg-surface-950/70 p-4" @click.self="modalOpen=false"><form class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-surface-900" @submit.prevent="submit"><div class="mb-6 flex items-start justify-between"><div><h2 class="text-xl font-bold">{{ editing ? 'Ubah user' : 'Daftarkan user' }}</h2><p class="text-sm text-surface-500">Password tidak pernah ditampilkan kembali oleh server.</p></div><button type="button" @click="modalOpen=false"><Icon icon="lucide:x" /></button></div>
      <div class="grid gap-4 sm:grid-cols-2"><label class="text-sm">Username<input v-model="form.username" required :disabled="!!editing" class="mt-1 w-full rounded-xl border border-surface-300 bg-transparent p-3 disabled:opacity-60 dark:border-surface-700" /></label><label class="text-sm">Nama lengkap<input v-model="form.fullname" required class="mt-1 w-full rounded-xl border border-surface-300 bg-transparent p-3 dark:border-surface-700" /></label><label class="text-sm">Email<input v-model="form.email" type="email" required class="mt-1 w-full rounded-xl border border-surface-300 bg-transparent p-3 dark:border-surface-700" /></label><label class="text-sm">Jabatan<input v-model="form.job_title" class="mt-1 w-full rounded-xl border border-surface-300 bg-transparent p-3 dark:border-surface-700" /></label><label class="text-sm">Password {{ editing ? '(kosongkan jika tetap)' : '' }}<input v-model="form.password" type="password" :required="!editing" minlength="12" class="mt-1 w-full rounded-xl border border-surface-300 bg-transparent p-3 dark:border-surface-700" /></label><label v-if="editing" class="text-sm">Status<select v-model="form.status" class="mt-1 w-full rounded-xl border border-surface-300 bg-transparent p-3 dark:border-surface-700"><option>ACTIVE</option><option>INACTIVE</option><option>LOCKED</option></select></label></div>
      <div class="mt-5 grid gap-4 lg:grid-cols-3"><fieldset class="rounded-xl border border-surface-200 p-4 dark:border-surface-700"><legend class="px-1 text-sm font-semibold">Role</legend><label v-for="role in roles" :key="role.role_id" class="mt-2 flex gap-2 text-sm"><input type="checkbox" :checked="form.role_ids.includes(role.role_id)" @change="toggle(form.role_ids, role.role_id)" />{{ role.role_name }}</label></fieldset><fieldset class="rounded-xl border border-surface-200 p-4 dark:border-surface-700"><legend class="px-1 text-sm font-semibold">Dapur</legend><label v-for="item in kitchens" :key="item.kitchen_id" class="mt-2 flex gap-2 text-sm"><input type="checkbox" :checked="form.kitchen_ids.includes(item.kitchen_id)" @change="toggle(form.kitchen_ids, item.kitchen_id)" />{{ item.kitchen_name }}</label><p v-if="!kitchens.length" class="text-xs text-surface-500">Tidak ada dapur aktif.</p></fieldset><fieldset class="rounded-xl border border-surface-200 p-4 dark:border-surface-700"><legend class="px-1 text-sm font-semibold">Sekolah</legend><label v-for="item in schools" :key="item.school_id" class="mt-2 flex gap-2 text-sm"><input type="checkbox" :checked="form.school_ids.includes(item.school_id)" @change="toggle(form.school_ids, item.school_id)" />{{ item.school_name }}</label><p v-if="!schools.length" class="text-xs text-surface-500">Tidak ada sekolah aktif.</p></fieldset></div>
      <div class="mt-6 flex justify-end gap-3"><button type="button" class="rounded-xl border border-surface-300 px-5 py-2.5 dark:border-surface-700" @click="modalOpen=false">Batal</button><button :disabled="saving" class="rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{{ saving ? 'Menyimpan...' : 'Simpan user' }}</button></div></form></div>
  </div>
</template>