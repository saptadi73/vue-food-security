import { api } from '../client'
import { endpoints } from '../endpoints'
import type { OffsetPage, PageQuery, Uuid } from '../types'

export interface ComplaintRecord extends Record<string, unknown> {
  complaint_id: Uuid
  status?: string
  severity?: string
  created_at?: string
}


export interface PackageIncidentAlertItem {
  complaint_id: Uuid
  category: string
  severity: string
  status: string
  description: string
  reported_at: string
  source_package_id: Uuid
}

export interface IncidentRecommendedAction {
  code: string
  label: string
  required: boolean
}

export interface PackageIncidentAlert {
  package_id: Uuid
  production_batch_id: Uuid
  production_batch_code: string
  has_active_incident: boolean
  highest_severity: string | null
  primary_complaint_id: Uuid | null
  alerts: PackageIncidentAlertItem[]
  affected_package_count: number
  delivered_count: number
  received_count: number
  consumed_count: number
  recalled_count: number
  recall_id: Uuid | null
  recall_status: 'NONE' | 'OPEN' | 'EXECUTED' | 'COMPLETED'
  recall_reason: string | null
  recommended_actions: IncidentRecommendedAction[]
}
export interface RecallRecord extends Record<string, unknown> {
  recall_id: Uuid
  status?: string
  created_at?: string
  completed_at?: string | null
}

export type NotificationChannel = 'DASHBOARD' | 'EMAIL' | 'WHATSAPP' | 'TELEGRAM'
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'

export interface NotificationRecord extends Record<string, unknown> {
  notification_id: Uuid
  channel?: NotificationChannel
  status?: NotificationStatus
  created_at?: string
}

export const complaintsApi = {
  list: (query: PageQuery & Record<string, unknown> = {}) =>
    api.get<OffsetPage<ComplaintRecord>>(endpoints.complaints.list(query)),
  detail: (id: string) => api.get<ComplaintRecord>(endpoints.complaints.detail(id)),
  create: (input: Record<string, unknown>) =>
    api.post<ComplaintRecord>(endpoints.complaints.create(), input),
  reports: (query: PageQuery & Record<string, unknown> = {}) =>
    api.get<OffsetPage<Record<string, unknown>>>(endpoints.complaints.reports(query)),
  report: (id: string) => api.get<Record<string, unknown>>(endpoints.complaints.report(id)),
  batchImpact: (id: string) => api.get<Record<string, unknown>>(endpoints.complaints.batchImpact(id)),
  packageAlerts: (packageId: string) => api.get<PackageIncidentAlert>(endpoints.complaints.packageAlerts(packageId)),
  uploadPhoto: (file: File) => { const body = new FormData(); body.append('file', file); return api.post<{ file_id: string; reference: string; content_type: string; size_bytes: number }>(endpoints.uploads.complaintPhoto(), body) },
}

export const recallsApi = {
  list: (query: PageQuery & Record<string, unknown> = {}) =>
    api.get<OffsetPage<RecallRecord>>(endpoints.recalls.list(query)),
  detail: (id: string) => api.get<RecallRecord>(endpoints.recalls.detail(id)),
  start: (input: Record<string, unknown>) =>
    api.post<RecallRecord>(endpoints.recalls.create(), input),
  execute: (id: string, input: Record<string, unknown>) =>
    api.post<RecallRecord>(endpoints.recalls.execute(id), input),
  withdrawals: (id: string, query: PageQuery & { package_id?: Uuid } = {}) =>
    api.get<OffsetPage<Record<string, unknown>>>(endpoints.recalls.withdrawals(id, query)),
  addWithdrawal: (id: string, input: Record<string, unknown>) =>
    api.post<Record<string, unknown>>(endpoints.recalls.withdrawals(id), input),
  close: (id: string, input: Record<string, unknown>) =>
    api.post<RecallRecord>(endpoints.recalls.close(id), input),
}

export const notificationsApi = {
  list: (query: PageQuery & Record<string, unknown> = {}) =>
    api.get<OffsetPage<NotificationRecord>>(endpoints.notifications.list(query)),
  markSent: (id: string, input: Record<string, unknown> = {}) =>
    api.post<NotificationRecord>(endpoints.notifications.markSent(id), input),
  markFailed: (id: string, input: Record<string, unknown> = {}) =>
    api.post<NotificationRecord>(endpoints.notifications.markFailed(id), input),
}

