import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: (to, from, saved) => saved ?? { top: 0 },
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { public: true, title: 'Masuk' },
    },
    {
      path: '/',
      component: AdminLayout,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: 'Dashboard' },
        },
        {
          path: 'monitoring/temperature',
          name: 'monitoring-temperature',
          component: () => import('@/views/monitoring/TemperatureView.vue'),
          meta: { title: 'Monitor Suhu' },
        },
        {
          path: 'monitoring/alarms',
          name: 'monitoring-alarms',
          component: () => import('@/views/monitoring/AlarmsView.vue'),
          meta: { title: 'Alarm' },
        },
        {
          path: 'monitoring/device-sessions',
          name: 'monitoring-device-sessions',
          component: () => import('@/views/monitoring/DeviceSessionsView.vue'),
          meta: { title: 'Sesi Perangkat' },
        },
        {
          path: 'scan',
          name: 'scan',
          component: () => import('@/views/ScanView.vue'),
          meta: { title: 'Pindai QR' },
        },
        {
          path: 'packages',
          name: 'packages',
          component: () => import('@/views/PackagesView.vue'),
          meta: { title: 'Paket & QR' },
        },
        {
          path: 'traceability',
          name: 'traceability',
          component: () => import('@/views/TraceabilityView.vue'),
          meta: { title: 'Jejak Asset' },
        },
        {
          path: 'complaints',
          name: 'complaints',
          component: () => import('@/views/incidents/ComplaintsView.vue'),
          meta: { title: 'Keluhan' },
        },
        {
          path: 'recalls',
          name: 'recalls',
          component: () => import('@/views/incidents/RecallsView.vue'),
          meta: { title: 'Recall' },
        },
        {
          path: 'notifications',
          name: 'notifications',
          component: () => import('@/views/incidents/NotificationsView.vue'),
          meta: { title: 'Notifikasi' },
        },
        {
          // Satu view generik melayani seluruh master; definisinya ada di masterRegistry.
          path: 'master/:master',
          name: 'master',
          component: () => import('@/views/master/MasterCrudView.vue'),
          meta: { title: 'Master Data' },
        },
        {
          path: 'config/holding-rules',
          name: 'holding-rules',
          component: () => import('@/views/config/HoldingRulesView.vue'),
          meta: { title: 'Holding Rule' },
        },
        {
          path: 'config/alarm-rules',
          name: 'alarm-rules',
          component: () => import('@/views/config/AlarmRulesView.vue'),
          meta: { title: 'Alarm Rule' },
        },
        {
          path: 'config/diagnostics',
          name: 'diagnostics',
          component: () => import('@/views/config/DiagnosticsView.vue'),
          meta: { title: 'Diagnostik API' },
        },
        {
          path: ':pathMatch(.*)*',
          name: 'not-found',
          component: () => import('@/views/NotFoundView.vue'),
          meta: { title: 'Tidak ditemukan' },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.public) {
    // Pengguna dengan sesi valid tidak perlu melihat halaman login lagi.
    if (auth.isAuthenticated) return { name: 'dashboard' }
    return true
  }

  if (auth.isAuthenticated) return true

  const restored = await auth.restore()
  if (restored) return true

  return { name: 'login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
})

router.afterEach((to) => {
  const title = (to.meta.title as string) ?? ''
  document.title = title ? `${title} · FSOS` : 'FSOS · Food Security & Traceability'
})

export default router
