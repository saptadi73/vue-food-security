import { api, type RequestOptions } from './client'
import type { CollectionEndpoints } from './endpoints'
import type { OffsetPage, PageQuery } from './types'

export interface ResourceListQuery extends PageQuery {
  [key: string]: unknown
}

/**
 * Pembungkus CRUD standar master FSOS:
 * list offset/limit, detail, create, replace (PUT + expected_version) dan
 * soft delete (DELETE + expected_version pada query).
 */
export function createResource<TData, TInput = Partial<TData>>(
  paths: CollectionEndpoints,
  label: string,
) {
  return {
    label,
    paths,

    list(query: ResourceListQuery = {}, options?: RequestOptions) {
      return api.get<OffsetPage<TData>>(paths.list(query), options)
    },

    detail(id: string, options?: RequestOptions) {
      return api.get<TData>(paths.detail(id), options)
    },

    create(input: TInput, options?: RequestOptions) {
      return api.post<TData>(paths.create(), input, options)
    },

    /** PUT mengganti seluruh definisi; expected_version wajib di body. */
    update(id: string, input: TInput & { expected_version: number }, options?: RequestOptions) {
      return api.put<TData>(paths.update(id), input, options)
    },

    remove(id: string, expectedVersion: number, options?: RequestOptions) {
      return api.delete<TData>(paths.remove(id, expectedVersion), options)
    },
  }
}

export type Resource<TData, TInput = Partial<TData>> = ReturnType<
  typeof createResource<TData, TInput>
>
