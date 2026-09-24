import { api } from '../client'
import { endpoints } from '../endpoints'
import type { Uuid } from '../types'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED'
export type LocationType = 'KITCHEN' | 'SCHOOL'
export interface UserRole { role_id: Uuid; role_code: string; role_name: string }
export interface UserLocationAssignment {
  assignment_id: Uuid
  location_type: LocationType
  kitchen_id: Uuid | null
  school_id: Uuid | null
}
export interface TenantUser {
  user_id: Uuid
  username: string
  fullname: string
  email: string
  job_title: string | null
  status: UserStatus
  version: number
  created_at: string
  roles: UserRole[]
  location_assignments: UserLocationAssignment[]
}
export interface UserPage {
  items: TenantUser[]
  total: number
  offset: number
  limit: number
  next_offset: number | null
}
export interface LocationAssignmentInput {
  location_type: LocationType
  kitchen_id: Uuid | null
  school_id: Uuid | null
}
export interface UserCreateInput {
  username: string
  fullname: string
  email: string
  job_title: string | null
  password: string
  role_ids: Uuid[]
  location_assignments: LocationAssignmentInput[]
}
export interface UserUpdateInput extends Omit<UserCreateInput, 'username' | 'password'> {
  expected_version: number
  status: UserStatus
  password: string | null
}

export const usersApi = {
  list: (query?: { status?: UserStatus; offset?: number; limit?: number }) =>
    api.get<UserPage>(endpoints.users.list(query)),
  roles: () => api.get<UserRole[]>(endpoints.users.roles()),
  detail: (id: Uuid) => api.get<TenantUser>(endpoints.users.detail(id)),
  create: (payload: UserCreateInput) => api.post<TenantUser>(endpoints.users.create(), payload),
  update: (id: Uuid, payload: UserUpdateInput) =>
    api.put<TenantUser>(endpoints.users.update(id), payload),
}