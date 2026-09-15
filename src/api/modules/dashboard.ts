import { api } from '../client'
import { endpoints } from '../endpoints'
import type { OffsetPage, PageQuery } from '../types'

export interface DashboardHomeData {
  complaints_open: number
  recalls_open: number
  deliveries_in_transit: number
  packages_recalled: number
  packages_delivered: number
  packages_received: number
  packages_consumed: number
  packages_discarded: number
  production_completed: number
  raw_batches_available: number
}

export interface DashboardStorageData {
  storages_active: number
  storage_zones: number
  raw_batches_accepted: number
  stock_entries: number
  temperature_logs: number
}

export type StorageTemperatureStatus = 'OK' | 'LOW' | 'HIGH' | 'NO_DATA' | 'UNSUPPORTED_UNIT'

export interface StorageTemperatureItem {
  storage_id: string
  storage_name: string
  storage_type: string
  temperature_min: string | null
  temperature_max: string | null
  device_uuid: string | null
  temperature_log_id: string | null
  recorded_at: string | null
  temperature: string | null
  unit: string | null
  status: StorageTemperatureStatus
}

export interface DashboardFleetData {
  vehicles_active: number
  drivers_active: number
  deliveries_created: number
  deliveries_in_transit: number
  deliveries_completed: number
  gps_logs: number
}

export interface DashboardHoldingData {
  packages_created: number
  packages_packaged: number
  packages_released: number
  packages_expired: number
  packages_recalled: number
  holding_logs: number
  alarms_open: number
}

export interface DashboardRecallData {
  complaints_open: number
  recalls_open: number
  recalls_completed: number
  packages_recalled: number
  recall_movements: number
}

export interface DashboardNotificationData {
  pending: number
  sent: number
  failed: number
  cancelled: number
  dashboard_pending: number
  email_pending: number
  whatsapp_pending: number
  telegram_pending: number
}

export const dashboardApi = {
  home: () => api.get<DashboardHomeData>(endpoints.dashboard.home()),
  storage: () => api.get<DashboardStorageData>(endpoints.dashboard.storage()),
  storageTemperatures: (query: PageQuery = {}) =>
    api.get<OffsetPage<StorageTemperatureItem>>(endpoints.dashboard.storageTemperatures(query)),
  fleet: () => api.get<DashboardFleetData>(endpoints.dashboard.fleet()),
  holding: () => api.get<DashboardHoldingData>(endpoints.dashboard.holding()),
  recall: () => api.get<DashboardRecallData>(endpoints.dashboard.recall()),
  notifications: () => api.get<DashboardNotificationData>(endpoints.dashboard.notifications()),
}
