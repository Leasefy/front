/**
 * Settings hooks for notification preferences and team management.
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { settingsApi, type NotificationSettings } from '@/lib/api/settings.service'
import type { TeamMember, TeamRole } from '@/lib/types/team'

// ============================================================================
// useNotificationSettings
// ============================================================================

const DEFAULT_SETTINGS: NotificationSettings = {
  emailApplications: true,
  emailVisits: true,
  emailContracts: true,
  emailPayments: true,
  emailMessages: true,
  emailMarketing: false,
  pushAll: true,
  pushUrgent: true,
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    settingsApi.getNotificationSettings()
      .then((data) => {
        if (!cancelled) {
          setSettings(data)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setIsLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  const updateSetting = useCallback(async (key: keyof NotificationSettings, value: boolean) => {
    // Optimistic update
    setSettings(prev => ({ ...prev, [key]: value }))

    try {
      const updated = await settingsApi.updateNotificationSettings({ [key]: value })
      setSettings(updated)
    } catch (err) {
      // Revert on error
      setSettings(prev => ({ ...prev, [key]: !value }))
      throw err
    }
  }, [])

  return { settings, isLoading, error, updateSetting }
}

// ============================================================================
// useTeamMembers
// ============================================================================

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // El error entero además del mensaje: `FalloDeCarga` clasifica por status.
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null)

  const refresh = useCallback(async () => {
    // `setIsLoading(true)` faltaba: al reintentar, la pantalla se quedaba con
    // el último resultado y sin ninguna señal de que estaba pidiendo de nuevo.
    setIsLoading(true)
    try {
      const data = await settingsApi.getTeamMembers()
      setMembers(data)
      setError(null)
      setErrorCrudo(null)
    } catch (err) {
      setErrorCrudo(err)
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const invite = useCallback(async (email: string, role: TeamRole, name?: string) => {
    const member = await settingsApi.inviteTeamMember({ email, role, name })
    setMembers(prev => [member, ...prev])
    return member
  }, [])

  const update = useCallback(async (memberId: string, data: { name?: string; role?: string }) => {
    const updated = await settingsApi.updateTeamMember(memberId, data)
    setMembers(prev => prev.map(m => m.id === memberId ? updated : m))
    return updated
  }, [])

  const remove = useCallback(async (memberId: string) => {
    await settingsApi.removeTeamMember(memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
  }, [])

  return { members, isLoading, error, errorCrudo, invite, update, remove, refresh }
}
