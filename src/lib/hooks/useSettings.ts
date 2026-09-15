/**
 * Settings hooks for notification preferences and team management.
 */
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

/**
 * 🔴 `settings` arranca en `DEFAULT_SETTINGS` y, si el GET falla, SE QUEDA ahí.
 * Pintar esos valores como si fueran lo guardado son «notificaciones
 * fantasma»: la pantalla dice «te avisamos de los pagos» sin saber si es
 * cierto. Por eso el hook expone el fallo entero (`errorCrudo`, con el status
 * que `FalloDeCarga` necesita para decidir si reintentar sirve) y `refresh`.
 * Quien pinte `settings` tiene que mirar `errorCrudo` antes.
 */
export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorCrudo, setErrorCrudo] = useState<unknown>(null)
  const montado = useRef(true)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await settingsApi.getNotificationSettings()
      if (!montado.current) return
      setSettings(data)
      setError(null)
      setErrorCrudo(null)
    } catch (err) {
      if (!montado.current) return
      setErrorCrudo(err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      if (montado.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    montado.current = true
    void refresh()
    return () => { montado.current = false }
  }, [refresh])

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

  /**
   * Varias banderas en UNA escritura: el inquilino ve «Correos de tu arriendo»
   * como un solo interruptor que en el back son cuatro. Si falla, vuelve todo a
   * como estaba — el interruptor tiene que decir lo que de verdad quedó.
   */
  const updateSettings = useCallback(async (parche: Partial<NotificationSettings>) => {
    let anterior: NotificationSettings | null = null
    setSettings(prev => {
      anterior = prev
      return { ...prev, ...parche }
    })
    try {
      const updated = await settingsApi.updateNotificationSettings(parche)
      setSettings(updated)
    } catch (err) {
      if (anterior) setSettings(anterior)
      throw err
    }
  }, [])

  return { settings, isLoading, error, errorCrudo, refresh, updateSetting, updateSettings }
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
