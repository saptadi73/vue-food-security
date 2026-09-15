import { api } from '../client'
import { endpoints } from '../endpoints'
import type { OffsetPage, PageQuery, Uuid } from '../types'

export interface ComplaintRecord extends Record<string, unknown> {
  complaint_id: Uuid
  status?: string
  severity?: string
  created_at?: string
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
