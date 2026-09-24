import { api } from '../client'
import { endpoints } from '../endpoints'
import type { Uuid } from '../types'

export type SignatureEntityType = 'SCHOOL_RECEIVING' | 'COMPLAINT'
export interface SignatureEvidence {
  signature_id: Uuid
  entity_type: SignatureEntityType
  entity_id: Uuid
  purpose: string
  signed_by: Uuid
  signed_at: string
  signer_snapshot: { user_id?: string; fullname?: string; job_title?: string | null; roles?: string[] }
  file_id: Uuid
  content_type: string
  size_bytes: number
  sha256_hex: string
  status: 'CAPTURED'
  version: number
}
export interface SignatureVerification extends SignatureEvidence {
  verification_status: 'VERIFIED' | 'MISMATCH' | 'MISSING'
  calculated_sha256_hex: string
}

export const signaturesApi = {
  get: (entityType: SignatureEntityType, entityId: Uuid) =>
    api.get<SignatureEvidence>(endpoints.signatures.target(entityType, entityId)),
  capture: (entityType: SignatureEntityType, entityId: Uuid, purpose: string, file: Blob) => {
    const body = new FormData()
    body.append('purpose', purpose)
    body.append('file', file, 'signature.png')
    return api.post<SignatureEvidence>(endpoints.signatures.target(entityType, entityId), body)
  },
  verify: (signatureId: Uuid) =>
    api.post<SignatureVerification>(endpoints.signatures.verify(signatureId)),
}