import { api } from '../client'
import { endpoints } from '../endpoints'
import { createResource } from '../resource'
import type { AuditFields, DecimalString, OffsetPage, PageQuery, Uuid } from '../types'

export type PackageStatus =
  | 'CREATED'
  | 'PACKAGED'
  | 'RELEASED'
  | 'EXPIRED'
  | 'RECALLED'
  | 'DELIVERED'
  | 'RECEIVED'
  | 'CONSUMED'
  | 'DISCARDED'

export type TimerStatus = 'SAFE' | 'WARNING' | 'CRITICAL' | 'EXPIRED' | 'UNKNOWN'

export interface HoldingPolicy {
  schema_version: number
  rule_id: Uuid | null
  rule_version: number | null
  food_category: string | null
  maximum_minutes: number
  warning_minutes: number
  discard_minutes: number
}

export interface PackageData extends AuditFields {
  package_id: Uuid
  /** UUID registry traceability untuk /traceability/assets/{asset_uuid}. */
  asset_uuid: Uuid | null
  package_code: string
  production_batch_id: Uuid
  package_type_id: Uuid | null
  package_number: number
  quantity: DecimalString | null
  initial_temperature: DecimalString | null
  uom: string | null
  status: PackageStatus
  effective_status: PackageStatus
  /** Payload kanonik QR: `fsos:package:<package_id>` (non-secret). */
  qr_payload: string
  holding_started_at: string | null
  holding_finished_at: string | null
  expired_at: string | null
  remaining_minutes: number | null
  remaining_seconds: number | null
  timer_status: TimerStatus
  holding_eligible: boolean
  calculated_at: string
  holding_policy: HoldingPolicy | null
}

export interface PackageInput {
  production_batch_id: Uuid
  expected_version: number
  package_type_id: Uuid
  package_code: string
  package_number: number
  quantity: DecimalString
  initial_temperature?: DecimalString | null
}

export interface HoldingActionInput {
  expected_version: number
}

export interface HoldingFinishInput extends HoldingActionInput {
  outcome: 'RELEASED' | 'DISCARDED'
}

export interface AllocationData {
  production_batch_id: Uuid
  version: number
  actual_quantity: DecimalString | null
  allocated_quantity: DecimalString
  unallocated_quantity: DecimalString | null
  uom: string | null
  holding_policy: HoldingPolicy | null
}

/** Prefix payload QR paket sesuai kontrak backend. */
export const PACKAGE_QR_PREFIX = 'fsos:package:'

export function buildPackageQrPayload(packageId: string) {
  return `${PACKAGE_QR_PREFIX}${packageId}`
}

export function parsePackageQrPayload(raw: string): string | null {
  const value = raw.trim()
  return value.startsWith(PACKAGE_QR_PREFIX) ? value.slice(PACKAGE_QR_PREFIX.length) : null
}

export const packagesApi = {
  list: (query: PageQuery & { production_batch_id?: Uuid } = {}) =>
    api.get<OffsetPage<PackageData>>(endpoints.packages.list(query)),
  detail: (id: string) => api.get<PackageData>(endpoints.packages.detail(id)),
  create: (input: PackageInput) => api.post<PackageData>(endpoints.packages.create(), input),
  /** Resolve hasil scan QR menjadi paket. Payload bukan token akses; bearer tetap wajib. */
  resolve: (qrPayload: string) => api.get<PackageData>(endpoints.packages.resolve(qrPayload)),
  startHolding: (id: string, input: HoldingActionInput) =>
    api.post<PackageData>(endpoints.packages.holdingStart(id), input),
  updateHolding: (id: string, input: HoldingActionInput) =>
    api.post<PackageData>(endpoints.packages.holdingUpdate(id), input),
  finishHolding: (id: string, input: HoldingFinishInput) =>
    api.post<PackageData>(endpoints.packages.holdingFinish(id), input),
  allocation: (productionBatchId: string) =>
    api.get<AllocationData>(endpoints.productionBatches.packaging(productionBatchId)),
}

export const operationsApi = {
  receivings: createResource<Record<string, unknown>>(endpoints.receivings, 'Penerimaan bahan'),
  rawMaterialBatches: createResource<Record<string, unknown>>(
    endpoints.rawMaterialBatches,
    'Batch bahan',
  ),
  productionBatches: createResource<Record<string, unknown>>(
    endpoints.productionBatches,
    'Batch produksi',
  ),
  deliveries: createResource<Record<string, unknown>>(endpoints.deliveries, 'Pengiriman'),
  schoolReceivings: createResource<Record<string, unknown>>(
    endpoints.schoolReceivings,
    'Penerimaan sekolah',
  ),
  consumptions: createResource<Record<string, unknown>>(endpoints.consumptions, 'Konsumsi'),
  packages: packagesApi,
}
