'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'

// ============================================================================
// Types
// ============================================================================

type AgencyModule =
  | 'dashboard' | 'propietarios' | 'portafolio' | 'pipeline'
  | 'agentes' | 'cobros' | 'dispersiones' | 'operaciones'
  | 'reportes' | 'configuracion' | 'documentos' | 'analytics'

type AgencyAction = 'view' | 'create' | 'edit' | 'delete' | 'export'

type LandlordResource =
  | 'team' | 'billing' | 'properties' | 'candidates' | 'contracts'
  | 'reports' | 'leases' | 'visits' | 'messages' | 'settings'

type LandlordAction = 'view' | 'create' | 'edit' | 'delete'

type AgencyPermissions = 'FULL_ACCESS' | Record<AgencyModule, AgencyAction[]>
type LandlordPermissions = Record<LandlordResource, LandlordAction[]>

interface AgentPermissionsResponse {
  role: 'AGENT'
  context: 'agency_member'
  agencyId: string
  agencyRole: 'ADMIN' | 'AGENTE' | 'CONTADOR' | 'VIEWER'
  permissions: AgencyPermissions
}

interface LandlordPermissionsResponse {
  role: 'LANDLORD'
  context: 'owner' | 'team_member'
  teamRole: 'admin' | 'manager' | 'accountant' | 'viewer' | null
  permissions: LandlordPermissions
}

type PermissionsResponse = AgentPermissionsResponse | LandlordPermissionsResponse

// ============================================================================
// Hook
// ============================================================================

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPermissions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await apiClient.get<PermissionsResponse>('/users/me/permissions')
      setPermissions(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching permissions'
      console.error('[usePermissions]', message)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    apiClient.get<PermissionsResponse>('/users/me/permissions')
      .then((data) => {
        if (!cancelled) {
          setPermissions(data)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Error fetching permissions'
          console.error('[usePermissions]', message)
          setError(message)
          setIsLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [])

  const canAccess = useCallback(
    (module: string, action: string): boolean => {
      if (!permissions || isLoading) return false

      const perms = permissions.permissions

      // FULL_ACCESS grants everything
      if (perms === 'FULL_ACCESS') return true

      // Object-based permissions: check module exists and action is listed
      const modulePerms = (perms as Record<string, string[]>)[module]
      if (!modulePerms) return false

      return modulePerms.includes(action)
    },
    [permissions, isLoading],
  )

  const isAdmin =
    permissions?.role === 'AGENT' && permissions.agencyRole === 'ADMIN'

  const agencyRole =
    permissions?.role === 'AGENT' ? permissions.agencyRole : null

  return {
    permissions,
    isLoading,
    error,
    canAccess,
    isAdmin,
    agencyRole,
    refetch: fetchPermissions,
  }
}
