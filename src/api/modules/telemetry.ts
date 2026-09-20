import { api } from '../client'
import { endpoints } from '../endpoints'
import { createResource } from '../resource'
import type { OffsetPage, PageQuery, Uuid } from '../types'

export interface AlarmRecord extends Record<string, unknown> {
  alarm_id: Uuid
  severity?: string
  status?: string
  effective_status?: string
  triggered_at?: string
  acknowledged_at?: string | null
}

export interface DeviceSessionRecord extends Record<string, unknown> {
  session_id: Uuid
  device_id?: Uuid
  connected_at?: string
  disconnected_at?: string | null
}

export interface MqttEventRecord extends Record<string, unknown> {
  message_uuid: Uuid
  tenant_id: Uuid
  topic: string
  qos: number
  received_at: string
  processed: boolean
  payload_json: unknown | null
  payload_text: string | null
}

export interface MqttTopicRecord extends Record<string, unknown> {
  topic: string
  event_count: number
  latest_received_at: string
}

export interface HoldingRule extends Record<string, unknown> {
  holding_rule_id: Uuid
  tenant_id: Uuid
  food_category: string
  warning_minutes: number
  maximum_minutes: number
  discard_minutes: number
  version: number
}

export interface HoldingRuleInput {
  food_category: string
  warning_minutes: number
  maximum_minutes: number
  discard_minutes: number
}

export const alarmsApi = {
  list: (query: PageQuery & Record<string, unknown> = {}) =>
    api.get<OffsetPage<AlarmRecord>>(endpoints.alarms.list(query)),
  detail: (id: string) => api.get<AlarmRecord>(endpoints.alarms.detail(id)),
  acknowledge: (id: string) => api.post<AlarmRecord>(endpoints.alarms.acknowledge(id)),
}

export const deviceSessionsApi = {
  list: (query: PageQuery & Record<string, unknown> = {}) =>
    api.get<OffsetPage<DeviceSessionRecord>>(endpoints.deviceSessions.list(query)),
  detail: (id: string) => api.get<DeviceSessionRecord>(endpoints.deviceSessions.detail(id)),
  end: (id: string, disconnectedAt: string) =>
    api.post<DeviceSessionRecord>(endpoints.deviceSessions.end(id), {
      disconnected_at: disconnectedAt,
    }),
}

export const mqttApi = {
  topics: (query: PageQuery & Record<string, unknown> = {}) =>
    api.get<OffsetPage<MqttTopicRecord>>(endpoints.mqtt.topics(query)),
  events: (query: PageQuery & Record<string, unknown> = {}) =>
    api.get<OffsetPage<MqttEventRecord>>(endpoints.mqtt.events(query)),
}

const holdingRuleResource = createResource<HoldingRule, HoldingRuleInput>(
  endpoints.holdingRules,
  'Holding rule',
)

export const holdingRulesApi = {
  ...holdingRuleResource,
  history: (id: string, query: PageQuery = {}) =>
    api.get<OffsetPage<Record<string, unknown>>>(endpoints.holdingRules.history(id, query)),
}

const alarmRuleResource = createResource<Record<string, unknown>>(
  endpoints.alarmRules,
  'Alarm rule',
)

export const alarmRulesApi = {
  ...alarmRuleResource,
  history: (id: string, query: PageQuery = {}) =>
    api.get<OffsetPage<Record<string, unknown>>>(endpoints.alarmRules.history(id, query)),
  setEnabled: (id: string, enabled: boolean, expectedVersion: number) =>
    api.put<Record<string, unknown>>(endpoints.alarmRules.enabled(id), {
      enabled,
      expected_version: expectedVersion,
    }),
}
