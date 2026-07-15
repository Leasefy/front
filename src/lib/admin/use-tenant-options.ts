'use client'

import { adminApi } from './api'
import { useApiQuery } from './use-api-query'

export interface TenantOption {
  tenant_id: string
  legal_name: string
}

/** Agency options for filter selects (calls, cartera, audits). Backed by GET /tenants. */
export function useTenantOptions() {
  return useApiQuery<TenantOption[]>((signal) =>
    adminApi<Array<{ tenant_id: string; legal_name: string }>>('/tenants', { signal }).then((rows) =>
      (rows ?? []).map((t) => ({ tenant_id: t.tenant_id, legal_name: t.legal_name })),
    ),
  )
}
