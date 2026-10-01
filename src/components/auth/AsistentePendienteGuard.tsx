'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/use-auth'
import { getOnboardingResumePoint } from '@/lib/api/onboarding-provisioning.service'
import { resumeOnboarding } from '@/lib/api/onboarding-session.service'

/**
 * 🔴 El candado del asistente a medias (Nico, 2026-09-30: creó la cuenta,
 * llegó a «Miembros», lo sacó la plataforma, volvió a entrar y aterrizó en
 * el panel sin Habeas Data ni Confirmar — «un bug fuerte»).
 *
 * La cadena: la agencia y la membresía ADMIN nacen en «Antes de comenzar»
 * (`POST /users/me/onboarding`), y el back estampa AHÍ
 * `onboardingCompletedAt` — a propósito: para el back, el onboarding de la
 * PERSONA termina ahí y la agencia es «otro eje» (users.service.ts:444). El
 * login y los guards leen ese sello, así que quien quedó a mitad del
 * ASISTENTE (la sesión del micro: Agencia → Miembros → Habeas Data →
 * Confirmar) vuelve a entrar como cuenta completa, directo al panel.
 *
 * Este guard pregunta UNA vez por montaje del panel, encadenando las dos
 * fuentes de verdad:
 *   1. `GET /users/me/onboarding/session` (back) → ¿esta persona tiene una
 *      sesión del asistente? Un miembro invitado no la tiene y no se toca.
 *   2. `GET {agent}/onboarding/session/{id}/resume` (micro) → ¿en qué paso
 *      va? Cualquier paso distinto de `'complete'` = a medias → de vuelta a
 *      `/onboarding/inmobiliaria`, que retoma en el paso exacto.
 *      `'complete'` = terminado: en el micro, aceptar Habeas Data finaliza
 *      la sesión (estampa `completedAt`, compromete el tenant y deja el
 *      cursor en `'complete'`; `onboarding-session-accept-terms.ts`), y
 *      `/resume` responde 200 también para sesiones completadas
 *      (`allowCompleted: true`) justo para poder distinguirlo así.
 *
 * El veredicto «terminado» se guarda por usuario en localStorage para no
 * repetir las llamadas en cada montaje del panel. Cualquier fallo de red o
 * del back es fail-open: no se expulsa a nadie por no poder preguntar.
 */

const CLAVE = (userId: string) => `leasefy-asistente-listo:${userId}`

function yaVerificado(userId: string): boolean {
  try {
    return window.localStorage.getItem(CLAVE(userId)) === '1'
  } catch {
    return false
  }
}

function marcarListo(userId: string): void {
  try {
    window.localStorage.setItem(CLAVE(userId), '1')
  } catch {
    /* sin caché se vuelve a preguntar la próxima vez, y ya */
  }
}

export function AsistentePendienteGuard() {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id ?? null

  useEffect(() => {
    if (!userId || yaVerificado(userId)) return
    let vivo = true

    void (async () => {
      let punto
      try {
        punto = await getOnboardingResumePoint()
      } catch {
        return // fail-open: sin señal del back no se expulsa a nadie
      }
      if (!vivo) return

      if (punto.agentSessionId == null) {
        // Miembro invitado o agencia sin traspaso al micro: acá no hay
        // asistente que retomar. Con la agencia aún sin crear ni siquiera se
        // llega a este layout (ProtectedRoute no deja entrar sin membresía).
        if (punto.provisioningStatus == null) marcarListo(userId)
        return
      }

      try {
        const sesion = await resumeOnboarding(punto.agentSessionId)
        if (!vivo) return
        if (sesion.currentStep === 'complete') {
          marcarListo(userId)
          return
        }
        // El asistente quedó a medias: se retoma antes de usar el panel.
        router.replace('/onboarding/inmobiliaria')
      } catch {
        // Red, 401, 404 (sesión limpiada), 5xx: fail-open sin caché — el
        // panel sigue usable y la próxima entrada vuelve a preguntar.
      }
    })()

    return () => {
      vivo = false
    }
  }, [userId, router])

  return null
}
