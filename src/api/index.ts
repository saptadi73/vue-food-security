/**
 * API induk FSOS.
 *
 * Titik masuk tunggal: `import { fsos } from '@/api'`.
 * Struktur modul mengikuti pembagian di docs/frontend-api.md sehingga setiap
 * endpoint dapat ditelusuri dari nama modul -> registry path -> dokumen kontrak.
 */
import { authApi } from './modules/auth'
import { dashboardApi } from './modules/dashboard'
import { mastersApi } from './modules/masters'
import { operationsApi, packagesApi } from './modules/operations'
import { complaintsApi, notificationsApi, recallsApi } from './modules/incidents'
import { alarmRulesApi, alarmsApi, deviceSessionsApi, holdingRulesApi, mqttApi } from './modules/telemetry'
import { traceabilityApi } from './modules/traceability'
import { systemApi } from './modules/system'

export const fsos = {
  auth: authApi,
  system: systemApi,
  dashboard: dashboardApi,
  masters: mastersApi,
  operations: operationsApi,
  packages: packagesApi,
  complaints: complaintsApi,
  recalls: recallsApi,
  notifications: notificationsApi,
  alarms: alarmsApi,
  alarmRules: alarmRulesApi,
  holdingRules: holdingRulesApi,
  deviceSessions: deviceSessionsApi,
  mqtt: mqttApi,
  traceability: traceabilityApi,
} as const

export { api, setSessionExpiredHandler } from './client'
export { endpoints } from './endpoints'
export { apiTrace } from './trace'
export { tokenStore } from './tokenStore'
export { ApiError, isApiError, toApiError } from './errors'
export * from './types'
