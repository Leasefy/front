'use client'

/**
 * use-postulacion-directa — ¿esta persona tiene que llenar el formulario?
 *
 * Junta las tres cosas que hay que saber antes de mostrar seis pasos: si está
 * aprobada y vigente, si el inmueble le entra en el tope, y si ya llenó una
 * postulación completa antes. La regla vive en `lib/tenant/postulacion-directa`;
 * acá sólo se consiguen los datos.
 *
 * Regla de oro: **ante la duda, el formulario**. Si el prefill falla, si el
 * texto legal no carga, si algo no se pudo saber — se cae al camino de siempre.
 * Ninguna falla de red puede saltarse pasos.
 */

import { useEffect, useState } from 'react'

import { applicationsApi } from '@/lib/api/applications.service'
import { useAuth } from '@/lib/auth/use-auth'
import { getConsentText, type ConsentTextResponse } from '@/lib/api/legal.service'
import { useAprobacion } from '@/lib/hooks/use-aprobacion'
import { evaluarPostulacionDirecta, type Veredicto } from '@/lib/tenant/postulacion-directa'
import type { ApplicationPrefill, ApplicationPrefillData } from '@/lib/api/applications.types'

export interface UsePostulacionDirectaResult {
  /** Mientras es true no se decide nada: ni pantalla directa ni formulario. */
  cargando: boolean
  /** Los datos con los que se postula sin preguntar. `null` = va al formulario. */
  prefillDirecto: ApplicationPrefillData | null
  /** Texto legal versionado, para el consentimiento. */
  consentText: ConsentTextResponse | null
  /** Por qué NO fue directa. Útil para depurar; la pantalla no lo muestra. */
  veredicto: Veredicto | null
}

export function usePostulacionDirecta(canonCop: number | undefined): UsePostulacionDirectaResult {
  /*
   * `useAuth`, no `getAccessToken()`.
   *
   * El token vive en memoria y lo pone el AuthProvider cuando Supabase le
   * responde. Leerlo durante el render devuelve null en la primera pasada
   * aunque la persona SÍ tenga sesión — y ahí la diferencia entre "no hay
   * sesión" y "todavía no sé si hay sesión" deja de ser filosófica: con la
   * primera, a alguien aprobado le mostrábamos los seis pasos. Costó encontrarlo
   * porque los campos igual salían llenos: el prefill del wizard llegaba después.
   */
  const { isAuthenticated, isLoading: resolviendoSesion } = useAuth()
  const { aprobacion, cargando: cargandoAprobacion, vigente } = useAprobacion()
  const [prefill, setPrefill] = useState<ApplicationPrefill | null>(null)
  const [consentText, setConsentText] = useState<ConsentTextResponse | null>(null)
  const [cargandoPrefill, setCargandoPrefill] = useState(true)

  const haySesion = isAuthenticated

  useEffect(() => {
    if (resolviendoSesion) return
    if (!haySesion) {
      setCargandoPrefill(false)
      return
    }
    let cancelado = false

    // Las dos en paralelo: son independientes y las dos hacen falta.
    void Promise.all([
      applicationsApi.getPrefill().catch(() => null),
      getConsentText().catch(() => null),
    ]).then(([p, c]) => {
      if (cancelado) return
      setPrefill(p)
      setConsentText(c)
      setCargandoPrefill(false)
    })

    return () => {
      cancelado = true
    }
  }, [haySesion, resolviendoSesion])

  const cargando = resolviendoSesion || cargandoAprobacion || cargandoPrefill

  if (cargando) {
    return { cargando: true, prefillDirecto: null, consentText, veredicto: null }
  }

  const veredicto = evaluarPostulacionDirecta({
    haySesion,
    aprobacion,
    vigente,
    prefill,
    canonCop,
  })

  /*
   * Sin el texto legal versionado no se puede registrar un consentimiento
   * válido —el back rechaza el envío sin `authorizationVersion`— así que la
   * pantalla directa no tendría cómo terminar. Se manda al formulario, que
   * maneja ese caso con su propio mensaje.
   */
  const directa =
    veredicto.directa && Boolean(consentText?.version) && prefill?.hasPreviousApplication

  return {
    cargando: false,
    prefillDirecto: directa ? (prefill as ApplicationPrefillData) : null,
    consentText,
    veredicto,
  }
}
