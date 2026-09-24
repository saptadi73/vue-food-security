import { api } from '../client'
import { endpoints } from '../endpoints'
import type { Uuid } from '../types'

export type FoodMeasurementContext = 'RECEIVING' | 'PRODUCTION_COMPLETE' | 'PACKAGING' | 'SCHOOL_RECEIVING'
export interface FoodTemperatureMeasurement {
  device_id: Uuid
  device_uuid: Uuid
  device_name: string
  temperature_log_id: Uuid
  temperature: string
  unit: 'C'
  recorded_at: string
  age_seconds: number
  context_type: FoodMeasurementContext
  context_id: Uuid | null
  valid: true
}
export const foodTemperatureApi = {
  latest: (input: { device_id: Uuid; context_type: FoodMeasurementContext; context_id?: Uuid | null; maximum_age_seconds?: number }) =>
    api.post<FoodTemperatureMeasurement>(endpoints.foodTemperatureMeasurements.latest(), input),
}