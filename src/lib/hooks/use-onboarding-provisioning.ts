'use client'

/**
 * useOnboardingProvisioning — provisions the agent onboarding session for
 * the authenticated agency owner, y sabe dónde quedó si ya había empezado.
 *
 * Llama `POST /users/me/onboarding` (contrato en
 * `src/lib/api/onboarding-provisioning.service.ts`) con
 * `userType: 'INMOBILIARIA'` y `agency: { name, nit }` — el back sólo crea la
 * agencia + la membresía ADMIN + la sesión del agente con esa combinación.
 *
 * Antes de pedirle nada a la persona, el hook pregunta por el punto de retorno
 * (`GET /users/me/onboarding/session`). Con eso:
 *  - si ya hay sesión minteada, el asistente se monta directo donde iba;
 *  - si hay agencia pero no sesión, el paso previo aparece PRELLENADO con la
 *    razón social y el NIT que ya había escrito, y reenviarlo vuelve a pedirle
 *    la sesión al agente;
 *  - si la agencia quedó FAILED, no se ofrece reintento: es terminal y lo
 *    destraba soporte. Un botón que no puede funcionar es peor que no tenerlo.
 *
 * Los fallos ya no se tragan. El mensaje del back —que viene en español y es
 * específico— se guarda y se muestra, junto con si tiene sentido reintentar.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  postUsersOnboarding,
  getOnboardingResumePoint,
} from '@/lib/api/onboarding-provisioning.service'
import { ApiError } from '@/lib/api/client'

/**
 * userType for the OWNER who creates the agency through this wizard.
 * Confirmed against the back: only `'INMOBILIARIA'` (plus an `agency`
 * object) triggers agency creation + agent-session provisioning. `'AGENT'`
 * is reserved for members ACCEPTING an invitation (`acceptInvitation` flow
 * in `src/app/registro/page.tsx`).
 */
export const INMOBILIARIA_USER_TYPE = 'INMOBILIARIA'

export type OnboardingProvisioningStatus =
  /** Preguntando por el punto de retorno; todavía no se le muestra nada. */
  | 'resuming'
  | 'needs-info'
  | 'provisioning'
  | 'ready'
  | 'error'

export interface ProvisioningInput {
  firstName: string
  lastName: string
  /** Razón social — becomes `agency.name` in the request body. */
  agencyName: string
  /** NIT — required by the back; without it the agency provisioning FAILS terminally. */
  nit: string
}

/** Razón social + NIT captured by the pre-step — feeds the "Agencia" step's prefill. */
export interface AgencyPrefill {
  legalName: string
  nit: string
}

export interface FalloDeAprovisionamiento {
  /** Lo que dijo el back, tal cual. Ya viene en español y es específico. */
  mensaje: string
  /** false ⇒ reintentar no puede funcionar; hay que escribirle a soporte. */
  reintentable: boolean
  /** Código HTTP, o 0 si nunca salió de la máquina. Para el reporte a soporte. */
  status: number | null
}

export interface UseOnboardingProvisioningResult {
  status: OnboardingProvisioningStatus
  /** Only populated once `status === 'ready'`. */
  sessionId: string | null
  /**
   * Razón social + NIT captured by `OwnerNameStepForm`, exposed so the
   * caller can prefill the "Agencia" step instead of re-asking them.
   */
  agencyPrefill: AgencyPrefill | null
  /** Lo que ya había escrito en una visita anterior, para no volver a pedirlo. */
  valoresGuardados: { razonSocial: string; nit: string } | null
  /** Sólo cuando `status === 'error'`. */
  fallo: FalloDeAprovisionamiento | null
  /** Re-posts the last `provision()` payload. Wired to the "Reintentar" CTA. */
  retry: () => void
  /** Provisions with the explicitly captured owner + agency data. */
  provision: (input: ProvisioningInput) => void
}

const FALLO_GENERICO =
  'No pudimos preparar el registro de tu inmobiliaria. Vuelve a intentarlo en unos minutos.'

/**
 * Traduce lo que salió mal a algo que se le pueda decir a una persona, y a si
 * tiene sentido ofrecerle el botón de reintentar.
 *
 * Un 400 del back en este flujo es siempre terminal: o la agencia quedó FAILED
 * (que no se auto-reintenta nunca) o los datos no pasaron validación, y en los
 * dos casos volver a mandar lo mismo da lo mismo.
 */
export function interpretarFallo(error: unknown): FalloDeAprovisionamiento {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return { mensaje: error.message, reintentable: true, status: 0 }
    }
    return {
      mensaje: error.message || FALLO_GENERICO,
      reintentable: error.status !== 400 && error.status !== 403,
      status: error.status,
    }
  }
  return { mensaje: FALLO_GENERICO, reintentable: true, status: null }
}

export function useOnboardingProvisioning(): UseOnboardingProvisioningResult {
  const [status, setStatus] = useState<OnboardingProvisioningStatus>('resuming')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [agencyPrefill, setAgencyPrefill] = useState<AgencyPrefill | null>(null)
  const [valoresGuardados, setValoresGuardados] = useState<{
    razonSocial: string
    nit: string
  } | null>(null)
  const [fallo, setFallo] = useState<FalloDeAprovisionamiento | null>(null)

  const mountedRef = useRef(true)
  // Guards against a stale response overwriting state after a later retry.
  const requestIdRef = useRef(0)
  // Data captured through `provision()` — kept in a ref so `retry()`
  // re-posts the exact same payload after a failure.
  const inputRef = useRef<ProvisioningInput | null>(null)
  // Double-submit guard: the back's createAgency is a non-atomic
  // findFirst-then-create, so a second POST while one is in flight could
  // create a duplicate agency. Ignore provision()/retry() until it settles.
  const inFlightRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Punto de retorno. Corre una vez, al montar. Si falla por lo que sea, se
  // cae al paso previo en blanco: no saber dónde quedó nunca puede impedir
  // empezar de nuevo.
  useEffect(() => {
    let vigente = true
    getOnboardingResumePoint()
      .then((punto) => {
        if (!vigente || !mountedRef.current) return

        if (punto.legalName || punto.nit) {
          setValoresGuardados({
            razonSocial: punto.legalName ?? '',
            nit: punto.nit ?? '',
          })
        }

        if (punto.agentSessionId) {
          setSessionId(punto.agentSessionId)
          if (punto.legalName && punto.nit) {
            setAgencyPrefill({ legalName: punto.legalName, nit: punto.nit })
          }
          setStatus('ready')
          return
        }

        if (punto.provisioningStatus === 'FAILED') {
          setFallo({
            mensaje:
              'El registro de esta inmobiliaria quedó bloqueado y no se puede reintentar solo. Escríbenos y lo destrabamos.',
            reintentable: false,
            status: null,
          })
          setStatus('error')
          return
        }

        setStatus('needs-info')
      })
      .catch(() => {
        if (!vigente || !mountedRef.current) return
        setStatus('needs-info')
      })
    return () => {
      vigente = false
    }
  }, [])

  const runProvision = useCallback(() => {
    const input = inputRef.current
    // retry() before any provision(): nothing to re-post — stay in needs-info.
    if (!input) return
    if (inFlightRef.current) return
    inFlightRef.current = true
    const requestId = ++requestIdRef.current
    setFallo(null)
    setStatus('provisioning')
    postUsersOnboarding({
      firstName: input.firstName,
      // Mirrors the canonical split in `src/app/onboarding/propietario/page.tsx`:
      // lastName falls back to firstName so the back's @IsNotEmpty passes.
      lastName: input.lastName || input.firstName,
      userType: INMOBILIARIA_USER_TYPE,
      agency: { name: input.agencyName, nit: input.nit },
    })
      .then((res) => {
        inFlightRef.current = false
        if (!mountedRef.current || requestIdRef.current !== requestId) return
        if (res.agentSessionId) {
          setSessionId(res.agentSessionId)
          setAgencyPrefill({ legalName: input.agencyName, nit: input.nit })
          setStatus('ready')
        } else {
          // El back creó las filas pero el traspaso al agente no minteó la
          // sesión. Reintentar SÍ sirve: el back vuelve a intentar sólo ese
          // traspaso (`startAgentOnboarding`), no el aprovisionamiento entero.
          setSessionId(null)
          setValoresGuardados({ razonSocial: input.agencyName, nit: input.nit })
          setFallo({
            mensaje:
              'Tu inmobiliaria quedó creada, pero no alcanzamos a abrir el asistente. Vuelve a intentarlo.',
            reintentable: true,
            status: null,
          })
          setStatus('error')
        }
      })
      .catch((error: unknown) => {
        inFlightRef.current = false
        if (!mountedRef.current || requestIdRef.current !== requestId) return
        setSessionId(null)
        setValoresGuardados({ razonSocial: input.agencyName, nit: input.nit })
        setFallo(interpretarFallo(error))
        setStatus('error')
      })
  }, [])

  const provision = useCallback(
    (input: ProvisioningInput) => {
      inputRef.current = input
      runProvision()
    },
    [runProvision],
  )

  return {
    status,
    sessionId,
    agencyPrefill,
    valoresGuardados,
    fallo,
    retry: runProvision,
    provision,
  }
}
