import { api } from '../client'
import { endpoints } from '../endpoints'
import type { OffsetPage, PageQuery, Uuid } from '../types'

export type TraverseDirection = 'forward' | 'backward'
export type RelationshipDirection = 'children' | 'parents'

export interface AssetData extends Record<string, unknown> {
  asset_uuid: Uuid
  asset_type?: string
  entity_uuid?: Uuid
  status?: string
  created_at?: string
}

export interface AssetRelationship extends Record<string, unknown> {
  relationship_id?: Uuid
  parent_asset_uuid?: Uuid
  child_asset_uuid?: Uuid
  relationship_type?: string
}

export interface AssetMovement extends Record<string, unknown> {
  movement_id?: Uuid
  movement_type?: string
  movement_time?: string
  location?: string | null
}

export interface AssetPassport {
  asset: AssetData
  parents: AssetRelationship[]
  children: AssetRelationship[]
  movements: AssetMovement[]
  [key: string]: unknown
}

export interface TraceGraphData {
  root_asset_uuid: Uuid
  direction: TraverseDirection
  depth: number
  nodes: AssetData[]
  edges: AssetRelationship[]
  truncated: boolean
}

export interface ImpactData {
  impacted_assets: AssetData[]
  affected_counts: Record<string, number>
  package_assets: AssetData[]
  complaint_assets: AssetData[]
  recall_assets: AssetData[]
  edges: AssetRelationship[]
  truncated: boolean
}

/** Batas traversal sesuai kontrak; UI tidak boleh mengirim di luar rentang ini. */
export const TRACE_LIMITS = {
  depth: { min: 1, max: 6, default: 3 },
  nodeLimit: { min: 1, max: 200, default: 100 },
  impactDepthDefault: 6,
  impactLimitDefault: 200,
} as const

export const traceabilityApi = {
  asset: (assetUuid: string) => api.get<AssetData>(endpoints.traceability.asset(assetUuid)),

  relationships: (
    assetUuid: string,
    query: PageQuery & { direction?: RelationshipDirection } = {},
  ) =>
    api.get<OffsetPage<AssetRelationship>>(endpoints.traceability.relationships(assetUuid, query)),

  movements: (assetUuid: string, query: PageQuery = {}) =>
    api.get<OffsetPage<AssetMovement>>(endpoints.traceability.movements(assetUuid, query)),

  passport: (assetUuid: string) =>
    api.get<AssetPassport>(endpoints.traceability.passport(assetUuid)),

  impact: (assetUuid: string, query: { depth?: number; limit?: number } = {}) =>
    api.get<ImpactData>(endpoints.traceability.impact(assetUuid, query)),

  traverse: (
    assetUuid: string,
    query: { direction?: TraverseDirection; depth?: number; limit?: number } = {},
  ) => api.get<TraceGraphData>(endpoints.traceability.traverse(assetUuid, query)),
}
