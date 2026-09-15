import { api } from '../client'
import { endpoints } from '../endpoints'

export interface ReadinessData {
  status: 'ready' | string
  checks?: Record<string, unknown> | null
}

export const systemApi = {
  health: () => api.get<Record<string, unknown>>(endpoints.system.health(), { auth: false }),
  /** 503 tetap melempar ApiError; pemanggil menangani sebagai "belum siap". */
  ready: () => api.get<ReadinessData>(endpoints.system.ready(), { auth: false }),
}
