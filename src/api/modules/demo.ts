import { api } from '../client'
import { endpoints } from '../endpoints'

export interface DemoResetData {
  tenant_code: string
  tenant_id: string
  removed: Record<string, number>
}

export const demoApi = {
  reset: () => api.post<DemoResetData>(endpoints.demo.reset()),
}
