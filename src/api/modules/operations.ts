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
  | 'REJECTED'

export type TimerStatus = 'SAFE' | 'WARNING' | 'CRITICAL' | 'EXPIRED' | 'DISCARD_RECOMMENDED' | 'UNKNOWN'

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

export interface PackageDeliveryContextData {
  package_id: Uuid
  package_version: number
  package_status: PackageStatus
  delivery_item_id: Uuid | null
  delivery_id: Uuid | null
  delivery_status: DeliveryStatus | null
  school: Uuid | null
  departure_time: string | null
  arrival_time: string | null
  estimated_arrival_time: string | null
}

export interface HoldingActionInput {
  expected_version: number
  device_uuid?: Uuid | null
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

export interface ProductionBatchData extends AuditFields {
  production_batch_id: Uuid
  batch_code: string
  kitchen: Uuid
  menu: Uuid
  planned_quantity: DecimalString | null
  actual_quantity: DecimalString | null
  initial_temperature: DecimalString | null
  recipe_snapshot: Record<string, unknown> | null
  status: 'CREATED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED'
  started_at: string | null
  finished_at: string | null
  holding_started_at: string | null
  holding_expired_at: string | null
}

export interface ProductionItemData extends AuditFields {
  production_item_id: Uuid
  production_batch_id: Uuid
  raw_material_batch_id: Uuid
  storage_id: Uuid | null
  batch_version: number | null
  quantity: DecimalString
  uom: string
}

export interface ProductionBatchDetail extends ProductionBatchData {
  items: ProductionItemData[]
}

export interface ProductionInput {
  batch_code: string
  kitchen: Uuid
  menu: Uuid
  planned_quantity: DecimalString
}

export interface ProductionStartItemInput {
  raw_material_batch_id: Uuid
  storage_id: Uuid
  expected_version: number
  quantity: DecimalString
}

export interface ProductionStartInput {
  expected_version: number
  items: ProductionStartItemInput[]
}

export interface ProductionCompleteInput {
  expected_version: number
  actual_quantity: DecimalString
  initial_temperature?: DecimalString | null
  food_sensor_device_uuid?: Uuid | null
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

export interface RawMaterialStockStorageData {
  storage_id: Uuid
  quantity: DecimalString
  issued_quantity: DecimalString
  available_quantity: DecimalString
}

export interface RawMaterialStockBalanceData {
  raw_material_batch_id: Uuid
  version: number
  uom: string
  accepted_quantity: DecimalString
  putaway_quantity: DecimalString
  unallocated_quantity: DecimalString
  issued_quantity: DecimalString
  available_quantity: DecimalString
  storages: RawMaterialStockStorageData[]
}

export interface RawMaterialPutawayInput {
  expected_version: number
  storage_id: Uuid
  zone_id?: Uuid | null
  quantity: DecimalString
}

export type ReceivingStatus = 'CREATED' | 'COMPLETED' | 'CANCELLED'


export interface ReceivingItemInput {
  raw_material_id: Uuid
  batch_code: string
  quantity: DecimalString
  temperature?: DecimalString | null
  condition?: string | null
  photo?: string | null
  expired_date?: string | null
  qr_code?: string | null
}

export interface ReceivingInput {
  supplier_id: Uuid
  kitchen_id: Uuid
  received_at: string
  items: ReceivingItemInput[]
}

export interface ReceivingData extends AuditFields {
  receiving_id: Uuid
  supplier_id: Uuid
  kitchen_id: Uuid
  operator: Uuid
  received_at: string
  status: ReceivingStatus
}

export interface ReceivingItemData extends AuditFields {
  receiving_item_id: Uuid
  receiving_id: Uuid
  raw_material_batch_id: Uuid
  quantity: DecimalString
  uom: string
  temperature: DecimalString | null
  condition: string | null
  photo: string | null
  accepted: boolean | null
  batch: RawMaterialBatchData
}

export interface ReceivingDetail extends ReceivingData {
  items: ReceivingItemData[]
}

export interface ReceivingCompleteInput {
  expected_version: number
  items: { receiving_item_id: Uuid; accepted: boolean }[]
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

export interface DeliveryManifestItemInput {
  package_id: Uuid
  school_id: Uuid
  expected_version: number
}

export interface DeliveryInput {
  kitchen_id: Uuid
  vehicle: Uuid
  driver: Uuid
  average_speed_kmph?: DecimalString | null
  items: DeliveryManifestItemInput[]
}

export interface DeliveryDepartInput {
  expected_version: number
  estimated_arrival_time?: string | null
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

export interface DeliveryHistory {
  delivery_id: Uuid
  vehicle: Uuid
  status: DeliveryStatus
  window_started_at: string
  window_ended_at: string
  geofence_radius_meters: number
  truncated: boolean
  points: Array<{ gps_log_id: Uuid; recorded_at: string; latitude: DecimalString; longitude: DecimalString; speed: DecimalString | null; heading: DecimalString | null; nearest_school_id: Uuid | null; distance_to_nearest_meters: DecimalString | null; inside_geofence: boolean }>
  geofence_events: Array<{ event_type: 'ENTER' | 'EXIT'; school_id: Uuid; gps_log_id: Uuid; recorded_at: string; distance_meters: DecimalString }>
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

export type SchoolReceivingCondition = 'GOOD' | 'DAMAGED' | 'MISSING'

export interface SchoolReceivingInput {
  delivery_id: Uuid
  package: Uuid
  school: Uuid
  expected_version: number
  received_quantity: DecimalString
  condition: SchoolReceivingCondition
  accepted: boolean
  temperature?: DecimalString | null
  photo?: string | null
  notes?: string | null
}

export interface SchoolReceivingData extends AuditFields {
  school_receiving_id: Uuid
  delivery_id: Uuid
  package: Uuid
  school: Uuid
  received_time: string
  expected_quantity: DecimalString | null
  received_quantity: DecimalString | null
  discrepancy_quantity: DecimalString | null
  condition: SchoolReceivingCondition | null
  accepted: boolean | null
  temperature: DecimalString | null
  photo: string | null
  notes: string | null
  uom: string | null
  timer_status: TimerStatus | null
}

export interface ConsumptionInput {
  package_id: Uuid
  expected_version: number
  consumed_quantity: DecimalString
  discarded_quantity: DecimalString
  notes?: string | null
}

export interface ConsumptionData extends AuditFields {
  consumption_id: Uuid
  package_id: Uuid
  school_receiving_id: Uuid | null
  consumed_at: string
  consumed_quantity: DecimalString | null
  discarded_quantity: DecimalString | null
  remaining_minutes: number | null
  safe: boolean | null
  notes: string | null
  uom: string | null
  timer_status: TimerStatus | null
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
  deliveryContext: (id: string) => api.get<PackageDeliveryContextData>(endpoints.packages.deliveryContext(id)),
  startHolding: (id: string, input: HoldingActionInput) =>
    api.post<PackageData>(endpoints.packages.holdingStart(id), input),
  updateHolding: (id: string, input: HoldingActionInput) =>
    api.post<PackageData>(endpoints.packages.holdingUpdate(id), input),
  finishHolding: (id: string, input: HoldingFinishInput) =>
    api.post<PackageData>(endpoints.packages.holdingFinish(id), input),
  allocation: (productionBatchId: string) =>
    api.get<AllocationData>(endpoints.productionBatches.packaging(productionBatchId)),
}

export const receivingsApi = {
  list: (query: PageQuery & { supplier_id?: Uuid; kitchen_id?: Uuid; status?: ReceivingStatus } = {}) =>
    api.get<OffsetPage<ReceivingData>>(endpoints.receivings.list(query)),
  detail: (id: string) => api.get<ReceivingDetail>(endpoints.receivings.detail(id)),
  create: (input: ReceivingInput) =>
    api.post<ReceivingDetail>(endpoints.receivings.create(), input),
  complete: (
    id: string,
    input: { expected_version: number; items: { receiving_item_id: Uuid; accepted: boolean }[] },
  ) => api.post<ReceivingDetail>(endpoints.receivings.complete(id), input),
  cancel: (id: string, expectedVersion: number) =>
    api.post<ReceivingDetail>(endpoints.receivings.cancel(id), {
      expected_version: expectedVersion,
    }),
}

export interface UploadData {
  file_id: Uuid
  reference: string
  content_type: string
  size_bytes: number
}

export const uploadsApi = {
  receivingPhoto: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return api.post<UploadData>(endpoints.uploads.receivingPhoto(), body)
  },
}

const productionResource = createResource<ProductionBatchDetail, ProductionInput>(
  endpoints.productionBatches,
  'Batch produksi',
)

export const productionBatchesApi = {
  ...productionResource,
  list: (query: PageQuery & { kitchen_id?: Uuid; menu_id?: Uuid; status?: ProductionBatchData['status'] } = {}) =>
    api.get<OffsetPage<ProductionBatchData>>(endpoints.productionBatches.list(query)),
  detail: (id: string) => api.get<ProductionBatchDetail>(endpoints.productionBatches.detail(id)),
  start: (id: string, input: ProductionStartInput) =>
    api.post<ProductionBatchDetail>(endpoints.productionBatches.start(id), input),
  complete: (id: string, input: ProductionCompleteInput) =>
    api.post<ProductionBatchDetail>(endpoints.productionBatches.complete(id), input),
  cancel: (id: string, expectedVersion: number) =>
    api.post<ProductionBatchDetail>(endpoints.productionBatches.cancel(id), { expected_version: expectedVersion }),
}

export const operationsApi = {
  receivings: receivingsApi,
  uploads: uploadsApi,
  rawMaterialBatches: {
    list: (query: PageQuery & {
      receiving_id?: Uuid
      raw_material_id?: Uuid
      supplier_id?: Uuid
      status?: RawMaterialBatchData['status']
      search?: string
      material_category?: string
      sort?: 'CREATED_DESC' | 'FIFO' | 'FEFO'
    } = {}) => api.get<OffsetPage<RawMaterialBatchData>>(endpoints.rawMaterialBatches.list(query)),
    detail: (id: string) =>
      api.get<RawMaterialBatchData>(endpoints.rawMaterialBatches.detail(id)),
    resolve: (qrCode: string) =>
      api.get<RawMaterialBatchData>(endpoints.rawMaterialBatches.resolve(qrCode)),
    putaway: (id: string, input: RawMaterialPutawayInput) =>
      api.post<unknown>(endpoints.rawMaterialBatches.putaway(id), input),
    stock: (id: string) => api.get<RawMaterialStockBalanceData>(endpoints.rawMaterialBatches.stock(id)),
  },
  productionBatches: productionBatchesApi,
  deliveries: {
    list: (query: PageQuery & { kitchen_id?: Uuid; vehicle?: Uuid; driver?: Uuid; status?: DeliveryStatus } = {}) =>
      api.get<OffsetPage<DeliveryData>>(endpoints.deliveries.list(query)),
    detail: (id: string) => api.get<DeliveryDetail>(endpoints.deliveries.detail(id)),
    create: (input: DeliveryInput) => api.post<DeliveryDetail>(endpoints.deliveries.create(), input),
    tracking: (id: string) => api.get<DeliveryTracking>(endpoints.deliveries.tracking(id)),
    history: (id: string, radiusMeters = 200, limit = 500) =>
      api.get<DeliveryHistory>(endpoints.deliveries.history(id, { radius_meters: radiusMeters, limit })),
    depart: (id: string, input: DeliveryDepartInput) =>
      api.post<DeliveryDetail>(endpoints.deliveries.depart(id), input),
    complete: (id: string, expectedVersion: number) =>
      api.post<DeliveryDetail>(endpoints.deliveries.complete(id), { expected_version: expectedVersion }),
    cancel: (id: string, expectedVersion: number) =>
      api.post<DeliveryDetail>(endpoints.deliveries.cancel(id), { expected_version: expectedVersion }),
    byVehicle: (query: PageQuery & { vehicle?: Uuid; status?: DeliveryStatus } = {}) =>
      api.get<OffsetPage<DeliveryVehicleSummary>>(endpoints.deliveries.byVehicle(query)),
    byDestination: (query: PageQuery & { school_id?: Uuid; status?: DeliveryStatus } = {}) =>
      api.get<OffsetPage<DeliveryDestinationSummary>>(endpoints.deliveries.byDestination(query)),
  },
  schoolReceivings: {
    list: (query: PageQuery & { package_id?: Uuid; school?: Uuid; delivery_id?: Uuid } = {}) =>
      api.get<OffsetPage<SchoolReceivingData>>(endpoints.schoolReceivings.list(query)),
    detail: (id: string) => api.get<SchoolReceivingData>(endpoints.schoolReceivings.detail(id)),
    create: (input: SchoolReceivingInput) =>
      api.post<SchoolReceivingData>(endpoints.schoolReceivings.create(), input),
  },
  consumptions: {
    list: (query: PageQuery & { package_id?: Uuid } = {}) =>
      api.get<OffsetPage<ConsumptionData>>(endpoints.consumptions.list(query)),
    detail: (id: string) => api.get<ConsumptionData>(endpoints.consumptions.detail(id)),
    create: (input: ConsumptionInput) =>
      api.post<ConsumptionData>(endpoints.consumptions.create(), input),
  },
  packages: packagesApi,
}





