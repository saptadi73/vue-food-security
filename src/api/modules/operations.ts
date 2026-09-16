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

export interface RawMaterialBatchData extends AuditFields {
  raw_material_batch_id: Uuid
  raw_material_id: Uuid
  receiving_id: Uuid
  supplier_id: Uuid
  batch_code: string
  expired_date: string | null
  status: 'CREATED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  qr_code: string | null
}

export type DeliveryStatus = 'CREATED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'

export interface DeliveryData extends AuditFields {
  delivery_id: Uuid
  kitchen_id: Uuid | null
  vehicle: Uuid
  driver: Uuid
  status: DeliveryStatus
  departure_time: string | null
  estimated_arrival_time: string | null
  estimated_distance_km: DecimalString | null
  estimated_duration_minutes: number | null
  arrival_time: string | null
}

export interface DeliveryPackageItem {
  delivery_item_id: Uuid
  delivery_id: Uuid
  package_id: Uuid
  school_id: Uuid
  package: PackageData
}

export interface DeliveryDetail extends DeliveryData {
  items: DeliveryPackageItem[]
}

export interface DeliveryTracking {
  delivery_id: Uuid
  vehicle: Uuid
  status: DeliveryStatus
  destination_count: number
  latest_gps: {
    gps_log_id: Uuid
    recorded_at: string
    latitude: DecimalString
    longitude: DecimalString
    speed: DecimalString | null
    heading: DecimalString | null
  } | null
  latest_temperature: {
    temperature_log_id: Uuid
    device_uuid: Uuid
    recorded_at: string
    temperature: DecimalString
    unit: string
  } | null
  remaining_distance_km: DecimalString | null
  remaining_duration_minutes: number | null
  estimated_arrival_time: string | null
  calculated_at: string
}

export interface DeliveryVehicleSummary extends AuditFields {
  vehicle: Uuid
  delivery_count: number
  package_count: number
  total_quantity: DecimalString
  uom: string | null
}

export interface DeliveryDestinationSummary extends AuditFields {
  school_id: Uuid
  delivery_count: number
  package_count: number
  total_quantity: DecimalString
  uom: string | null
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
  rawMaterialBatches: createResource<RawMaterialBatchData>(
    endpoints.rawMaterialBatches,
    'Batch bahan',
  ),
  productionBatches: createResource<Record<string, unknown>>(
    endpoints.productionBatches,
    'Batch produksi',
  ),
  deliveries: {
    list: (query: PageQuery & { vehicle?: Uuid; status?: DeliveryStatus } = {}) =>
      api.get<OffsetPage<DeliveryData>>(endpoints.deliveries.list(query)),
    detail: (id: string) => api.get<DeliveryDetail>(endpoints.deliveries.detail(id)),
    tracking: (id: string) => api.get<DeliveryTracking>(endpoints.deliveries.tracking(id)),
    byVehicle: (query: PageQuery & { vehicle?: Uuid; status?: DeliveryStatus } = {}) =>
      api.get<OffsetPage<DeliveryVehicleSummary>>(endpoints.deliveries.byVehicle(query)),
    byDestination: (query: PageQuery & { school_id?: Uuid; status?: DeliveryStatus } = {}) =>
      api.get<OffsetPage<DeliveryDestinationSummary>>(endpoints.deliveries.byDestination(query)),
  },
  schoolReceivings: createResource<Record<string, unknown>>(
    endpoints.schoolReceivings,
    'Penerimaan sekolah',
  ),
  consumptions: createResource<Record<string, unknown>>(endpoints.consumptions, 'Konsumsi'),
  packages: packagesApi,
}
