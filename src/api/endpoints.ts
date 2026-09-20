/**
 * Registry path API - satu sumber kebenaran untuk seluruh pemanggilan HTTP.
 *
 * Aturan: tidak ada string path yang ditulis langsung di store/komponen.
 * Semua path dibangun dari sini agar penelusuran endpoint (dan audit kontrak
 * terhadap docs/frontend-api.md) bisa dilakukan di satu file.
 */

const q = (params: QueryParams): string => {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') continue
    search.append(key, String(value))
  }
  const out = search.toString()
  return out ? `?${out}` : ''
}

/** Objek query apa pun; nilai undefined/null/'' otomatis dibuang. */
export type QueryParams = object | undefined

export const endpoints = {
  system: {
    health: () => '/health',
    databaseHealth: () => '/health/database',
    ready: () => '/ready',
  },

  auth: {
    login: () => '/auth/login',
    refresh: () => '/auth/refresh',
    logout: () => '/auth/logout',
    me: () => '/auth/me',
  },

  dashboard: {
    home: () => '/dashboard/home',
    storage: () => '/dashboard/storage',
    storageTemperatures: (p?: QueryParams) => `/dashboard/storage-temperatures${q(p)}`,
    fleet: () => '/dashboard/fleet',
    holding: () => '/dashboard/holding',
    recall: () => '/dashboard/recall',
    notifications: () => '/dashboard/notifications',
  },

  // --- Master operasional (CRUD + soft delete dengan expected_version) ---
  kitchens: collection('/kitchens'),
  storages: collection('/storages'),
  storageZones: collection('/storage-zones'),
  suppliers: collection('/suppliers'),
  rawMaterials: collection('/raw-materials'),
  supplierMaterials: collection('/supplier-materials'),
  schools: collection('/schools'),
  vehicles: collection('/vehicles'),
  drivers: collection('/drivers'),
  foodItems: collection('/food-items'),
  recipes: collection('/recipes'),
  packagingTypes: collection('/packaging-types'),
  devices: collection('/devices'),
  deviceBindings: collection('/device-bindings'),

  // --- Konfigurasi rule ---
  holdingRules: {
    ...collection('/holding-rules'),
    history: (id: string, p?: QueryParams) => `/holding-rules/${id}/history${q(p)}`,
  },
  alarmRules: {
    ...collection('/alarm-rules'),
    history: (id: string, p?: QueryParams) => `/alarm-rules/${id}/history${q(p)}`,
    enabled: (id: string) => `/alarm-rules/${id}/enabled`,
  },

  // --- Telemetry / perangkat ---
  alarms: {
    list: (p?: QueryParams) => `/alarms${q(p)}`,
    detail: (id: string) => `/alarms/${id}`,
    acknowledge: (id: string) => `/alarms/${id}/acknowledgment`,
  },
  deviceSessions: {
    list: (p?: QueryParams) => `/device-sessions${q(p)}`,
    detail: (id: string) => `/device-sessions/${id}`,
    end: (id: string) => `/device-sessions/${id}/end`,
  },
  mqtt: {
    events: (p?: QueryParams) => `/mqtt/events${q(p)}`,
    topics: (p?: QueryParams) => `/mqtt/topics${q(p)}`,
  },

  // --- Rantai operasional ---
  receivings: {
    list: (p?: QueryParams) => `/receivings${q(p)}`,
    create: () => '/receivings',
    detail: (id: string) => `/receivings/${id}`,
    complete: (id: string) => `/receivings/${id}/complete`,
    cancel: (id: string) => `/receivings/${id}/cancel`,
  },
  uploads: {
    receivingPhoto: () => '/uploads/receiving-photo',
  },
  rawMaterialBatches: {
    ...collection('/raw-material-batches'),
    resolve: (qrCode: string) => `/raw-material-batches/resolve?qr_code=${encodeURIComponent(qrCode)}`,
    stock: (id: string) => `/raw-material-batches/${id}/stock`,
  },
  productionBatches: {
    ...collection('/production-batches'),
    start: (id: string) => `/production-batches/${id}/start`,
    complete: (id: string) => `/production-batches/${id}/complete`,
    cancel: (id: string) => `/production-batches/${id}/cancel`,
    packaging: (id: string) => `/production-batches/${id}/packaging`,
  },
  packages: {
    ...collection('/packages'),
    resolve: (qrPayload: string) => `/packages/resolve${q({ qr_payload: qrPayload })}`,
    deliveryContext: (id: string) => `/packages/${id}/delivery-context`,
    holdingStart: (id: string) => `/packages/${id}/holding/start`,
    holdingUpdate: (id: string) => `/packages/${id}/holding/update`,
    holdingFinish: (id: string) => `/packages/${id}/holding/finish`,
  },
  deliveries: {
    ...collection('/deliveries'),
    byVehicle: (p?: QueryParams) => `/deliveries/packages/by-vehicle${q(p)}`,
    byDestination: (p?: QueryParams) => `/deliveries/packages/by-destination${q(p)}`,
    tracking: (id: string) => `/deliveries/${id}/tracking`,
    depart: (id: string) => `/deliveries/${id}/depart`,
    complete: (id: string) => `/deliveries/${id}/complete`,
    cancel: (id: string) => `/deliveries/${id}/cancel`,
  },
  schoolReceivings: collection('/school-receivings'),
  consumptions: collection('/consumptions'),

  // --- Insiden ---
  complaints: {
    ...collection('/complaints'),
    reports: (p?: QueryParams) => `/complaints/reports${q(p)}`,
    report: (id: string) => `/complaints/${id}/report`,
  },
  recalls: {
    ...collection('/recalls'),
    execute: (id: string) => `/recalls/${id}/execute`,
    withdrawals: (id: string, p?: QueryParams) => `/recalls/${id}/withdrawals${q(p)}`,
    close: (id: string) => `/recalls/${id}/close`,
  },
  notifications: {
    list: (p?: QueryParams) => `/notifications${q(p)}`,
    markSent: (id: string) => `/notifications/${id}/mark-sent`,
    markFailed: (id: string) => `/notifications/${id}/mark-failed`,
  },

  // --- Traceability read-only ---
  traceability: {
    asset: (assetUuid: string) => `/traceability/assets/${assetUuid}`,
    relationships: (assetUuid: string, p?: QueryParams) =>
      `/traceability/assets/${assetUuid}/relationships${q(p)}`,
    movements: (assetUuid: string, p?: QueryParams) =>
      `/traceability/assets/${assetUuid}/movements${q(p)}`,
    passport: (assetUuid: string) => `/traceability/assets/${assetUuid}/passport`,
    impact: (assetUuid: string, p?: QueryParams) =>
      `/traceability/assets/${assetUuid}/impact${q(p)}`,
    traverse: (assetUuid: string, p?: QueryParams) =>
      `/traceability/assets/${assetUuid}/traverse${q(p)}`,
  },
} as const

export interface CollectionEndpoints {
  list: (p?: QueryParams) => string
  create: () => string
  detail: (id: string) => string
  update: (id: string) => string
  /** DELETE master wajib membawa expected_version sebagai query. */
  remove: (id: string, expectedVersion: number) => string
}

function collection(base: string): CollectionEndpoints {
  return {
    list: (p) => `${base}${q(p)}`,
    create: () => base,
    detail: (id) => `${base}/${id}`,
    update: (id) => `${base}/${id}`,
    remove: (id, expectedVersion) => `${base}/${id}${q({ expected_version: expectedVersion })}`,
  }
}

export { q as buildQuery }





