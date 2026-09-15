/**
 * Bentuk kontrak bersama backend FSOS.
 * Referensi: docs/frontend-api.md — bagian "Envelope API" dan "Pagination".
 */

export interface ApiMeta {
  request_id: string
  correlation_id: string
  timestamp: string
  execution_time_ms: number
}

export interface ApiFieldError {
  field: string
  message: string
}

export interface ApiEnvelope<T> {
  success: boolean
  code: number
  message: string
  data: T | null
  errors: ApiFieldError[]
  meta: ApiMeta
}

/** Page master/transaksi: offset/limit/next_offset, tanpa total_count. */
export interface OffsetPage<T> {
  items: T[]
  offset: number
  limit: number
  next_offset?: number | null
}

export interface PageQuery {
  offset?: number
  limit?: number
}

/** Kolom audit yang dipakai seluruh master operasional. */
export interface AuditFields {
  tenant_id: string
  version: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  created_by: string
  updated_by: string
  deleted_by: string | null
}

export type Uuid = string
/** Decimal dikirim backend sebagai string agar presisi tidak hilang. */
export type DecimalString = string

export interface AuthTokens {
  access_token: string
  refresh_token: string
  refresh_expires_at: string
  token_type: string
  expires_in: number
}

export interface AuthIdentity {
  user_id: Uuid
  tenant_id: Uuid
  roles: string[]
  permissions: string[]
}

/** Kirim salah satu dari `tenant` atau `tenant_id`; mengirim keduanya ditolak 400. */
export type LoginPayload = {
  username: string
  password: string
} & ({ tenant: string; tenant_id?: never } | { tenant_id: Uuid; tenant?: never })
