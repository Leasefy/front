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
 *  - si la agencia quedó FAILED (el micro rechazó los datos), vuelve el paso
 *    previo prellenado con un aviso arriba para corregir y reenviar. Nada en
 *    este flujo es terminal (01-10-2026): «irreversible» era ilógico.
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
import { esErrorDeConexion } from '@/lib/conexion/estado-de-conexion'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import {
  esServicioNoDisponible,
  servicioDelError,
  textoDeServicioNoDisponible,
  type ServicioId,
} from '@/lib/conexion/servicio-no-disponible'

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
  /** Representante legal de la inmobiliaria — NO es quien se registra. */
  legalRepresentative?: string
}

/** Razón social + NIT captured by the pre-step — feeds the "Agencia" step's prefill. */
export interface AgencyPrefill {
  legalName: string
  nit: string
}

/** Lo que la persona ya escribió en el paso previo, de esta visita o de una anterior. */
export interface ValoresGuardados {
  razonSocial: string
  nit: string
  nombreCompleto?: string
  representanteLegal?: string
}

/**
 * ¿El fallo fue una caída y no algo de los datos? (01-10-2026)
 *
 *  - `servicio`: el back contestó 503 `SERVICIO_NO_DISPONIBLE` —se cayó una
 *    parte, casi siempre el asistente (el micro de agentes)—. `servicio` es
 *    `null` si el back no dijo cuál.
 *  - `conexion`: no hubo red, o Leasefy entero no respondió.
 *
 * En los dos casos lo escrito no se pierde y reintentar sí puede servir: el
 * banner lo dice sin «Código 503».
 */
/** Los campos de «Antes de comenzar» (`OwnerNameStepForm`) que el back puede rechazar. */
export type CampoDelRegistro = 'nombre' | 'representante' | 'razonSocial' | 'nit'

/** Un mensaje por campo de «Antes de comenzar». */
export type ErroresDelRegistro = Partial<Record<CampoDelRegistro, string>>

/**
 * La ruta de cada dato en el cuerpo de `POST /users/me/onboarding` → su campo
 * en el formulario. El nombre completo se parte en `firstName`/`lastName`.
 */
const CAMPO_DEL_SERVIDOR: Record<string, CampoDelRegistro> = {
  firstName: 'nombre',
  lastName: 'nombre',
  'agency.name': 'razonSocial',
  'agency.nit': 'nit',
  'agency.legalRepresentative': 'representante',
}

const CAMPOS_DEL_REGISTRO: readonly CampoDelRegistro[] = ['nombre', 'representante', 'razonSocial', 'nit']

export type CaidaDelRegistro =
  | { tipo: 'servicio'; servicio: ServicioId | null }
  | { tipo: 'conexion' }

export interface FalloDeAprovisionamiento {
  /** Lo que dijo el back, tal cual. Ya viene en español y es específico. */
  mensaje: string
  /** false ⇒ reintentar no puede funcionar; hay que escribirle a soporte. */
  reintentable: boolean
  /** Código HTTP, o 0 si nunca salió de la máquina. Para el reporte a soporte. */
  status: number | null
  /** Sólo cuando lo que falló fue una caída. Ver `CaidaDelRegistro`. */
  caida?: CaidaDelRegistro
  /**
   * true ⇒ lo que falló fueron los DATOS: se vuelve al formulario prellenado
   * con este mensaje arriba, para corregir y reenviar. Nunca es un callejón.
   */
  paraCorregir?: boolean
  /**
   * 02-10-2026 · Lo que el back rechazó por campo (el 400 `DATOS_INVALIDOS`
   * con `campos`): cada mensaje va a SU campo de `OwnerNameStepForm`, no
   * arriba. Lo que no tiene campo queda en `mensaje`.
   */
  campos?: ErroresDelRegistro
}

/** Lo que se dice arriba del formulario cuando la última vez el micro rechazó los datos. */
export const REVISA_LOS_DATOS =
  'La última vez no pudimos crear tu inmobiliaria con estos datos. Revísalos —sobre todo el NIT— y vuelve a intentar.'

/** Arriba del formulario, cuando todo lo que el back rechazó quedó marcado en su campo. */
export const REVISA_LOS_CAMPOS = 'Corrige lo que está marcado abajo y vuelve a intentar.'

/** Lo que tranquiliza en el registro: lo escrito se queda (ver `valoresGuardados`). */
export const LO_ESCRITO_NO_SE_PIERDE = 'Lo que escribiste no se pierde.'

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
  valoresGuardados: ValoresGuardados | null
  /** Sólo cuando `status === 'error'`. */
  fallo: FalloDeAprovisionamiento | null
  /** Re-posts the last `provision()` payload. Wired to the "Reintentar" CTA. */
  retry: () => void
  /** Provisions with the explicitly captured owner + agency data. */
  provision: (input: ProvisioningInput) => void
  /**
   * La persona volvió desde el asistente a corregir los datos de la
   * inmobiliaria (Nico, 01-10-2026). La inmobiliaria y la sesión ya existen:
   * el formulario vuelve lleno, el NIT queda fijo y al guardar sigue en el
   * asistente con la misma sesión.
   */
  corrigiendo: boolean
  /** Del asistente al formulario de la inmobiliaria. Sólo con la sesión lista. */
  corregirDatos: () => void
  /** Del formulario de vuelta al asistente, sin guardar nada. */
  volverAlAsistente: () => void
}

/** El código del 409 del back (`AgencyService.createAgency`). */
export const CORREO_DE_OTRA_INMOBILIARIA = 'CORREO_DE_OTRA_INMOBILIARIA'

/** Por si el 409 llega sin mensaje: la misma frase que manda el back. */
const MOTIVO_CORREO_DE_OTRA_INMOBILIARIA =
  'Ese correo ya es el de otra inmobiliaria en Leasefy. Usa el correo de la tuya; si es la misma, pídele acceso a su administrador.'

const FALLO_GENERICO =
  'No pudimos preparar el registro de tu inmobiliaria. Vuelve a intentarlo en unos minutos.'

/**
 * Traduce lo que salió mal a algo que se le pueda decir a una persona, y a si
 * tiene sentido ofrecerle el botón de reintentar.
 *
 * Un 400/422 son los datos: `paraCorregir` lleva de vuelta al formulario
 * prellenado. Lo único que no se ofrece reintentar es lo que el formulario no
 * puede arreglar (el 409 del correo de otra inmobiliaria, un 403).
 */
export function interpretarFallo(error: unknown): FalloDeAprovisionamiento {
  /*
   * 🔴 01-10-2026: con el micro de agentes caído, esto mostraba el `message`
   * del back con «Código 503» abajo, y la persona no sabía si era ella ni si
   * había perdido lo escrito. Una caída se dice como caída: qué se cayó, que
   * no es su culpa, que lo escrito se queda y que reintentar sirve.
   */
  // Primero la conexión: incluye la base caída, que también trae `servicio`
  // pero no es «una parte» — sin ella no funciona nada.
  if (esErrorDeConexion(error)) {
    return {
      mensaje: `${LO_ESCRITO_NO_SE_PIERDE} Apenas Leasefy responda, vuelve a intentar.`,
      reintentable: true,
      status: error instanceof ApiError ? error.status : null,
      caida: { tipo: 'conexion' },
    }
  }
  if (esServicioNoDisponible(error)) {
    const servicio = servicioDelError(error)
    return {
      mensaje: textoDeServicioNoDisponible(servicio, { tranquilidad: LO_ESCRITO_NO_SE_PIERDE })
        .detalle,
      reintentable: true,
      status: error instanceof ApiError ? error.status : 503,
      caida: { tipo: 'servicio', servicio },
    }
  }
  if (error instanceof ApiError) {
    /*
     * 🔴 Auditoría de seguridad 23-09-2026 (back): el correo de la agencia es
     * la identidad con la que el micro de avalúos le entrega sus certificados,
     * así que el back ya no deja crear una agencia con el correo de OTRA
     * (409 `CORREO_DE_OTRA_INMOBILIARIA`). Reintentar manda el mismo correo y
     * da el mismo 409: no se ofrece. El mensaje es el del back, que dice qué
     * hacer.
     */
    if (error.code === CORREO_DE_OTRA_INMOBILIARIA) {
      return {
        mensaje: mensajeParaLaPersona(error, { porDefecto: MOTIVO_CORREO_DE_OTRA_INMOBILIARIA }),
        reintentable: false,
        status: error.status,
      }
    }
    if (error.status === 0) {
      // Sin respuesta: «conexión» sólo acá (la regla de oro del traductor).
      return { mensaje: mensajeParaLaPersona(error), reintentable: true, status: 0 }
    }
    // Un 400/422 son los DATOS (el micro los rechazó, falta el NIT, no pasó
    // la validación): se corrigen en el formulario y se reenvían. Antes esto
    // era «terminal» y la persona quedaba trancada para siempre (Nico,
    // 01-10-2026: «le dice que es irreversible, ¿cómo así? es ilógico»).
    // Desde el 02-10 lo que trae `campos` va a SU campo; arriba, sólo lo suelto.
    if (error.status === 400 || error.status === 422) {
      const reparto = repartirErroresDelServidor<CampoDelRegistro>(error, {
        mapa: CAMPO_DEL_SERVIDOR,
        campos: CAMPOS_DEL_REGISTRO,
        porDefecto: REVISA_LOS_DATOS,
      })
      const hayCampos = reparto.orden.length > 0
      return {
        mensaje: reparto.sueltos.join(' · ') || (hayCampos ? REVISA_LOS_CAMPOS : REVISA_LOS_DATOS),
        reintentable: true,
        status: error.status,
        paraCorregir: true,
        ...(hayCampos ? { campos: reparto.porCampo } : {}),
      }
    }
    // Lo demás, con la regla de oro: un 4xx dice lo que mandó el back; un
    // 5xx, que falló de nuestro lado, con la referencia.
    return {
      mensaje: mensajeParaLaPersona(error, { accion: 'crear tu inmobiliaria', porDefecto: FALLO_GENERICO }),
      reintentable: error.status !== 403,
      status: error.status,
    }
  }
  // Algo que no vino de una respuesta del back (un error de JavaScript): no
  // se le muestra su texto a nadie.
  return { mensaje: FALLO_GENERICO, reintentable: true, status: null }
}

function valoresDelEnvio(input: ProvisioningInput): ValoresGuardados {
  const nombreCompleto = [input.firstName, input.lastName].filter(Boolean).join(' ')
  return {
    razonSocial: input.agencyName,
    nit: input.nit,
    ...(nombreCompleto ? { nombreCompleto } : {}),
    ...(input.legalRepresentative ? { representanteLegal: input.legalRepresentative } : {}),
  }
}

export function useOnboardingProvisioning(): UseOnboardingProvisioningResult {
  const [status, setStatus] = useState<OnboardingProvisioningStatus>('resuming')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [agencyPrefill, setAgencyPrefill] = useState<AgencyPrefill | null>(null)
  const [valoresGuardados, setValoresGuardados] = useState<ValoresGuardados | null>(null)
  const [fallo, setFallo] = useState<FalloDeAprovisionamiento | null>(null)
  const [corrigiendo, setCorrigiendo] = useState(false)
  // La sesión del asistente mientras se corrige: un fallo al guardar la
  // corrección no puede dejar a nadie sin el asistente que ya tenía.
  const sessionIdRef = useRef<string | null>(null)
  sessionIdRef.current = sessionId
  const corrigiendoRef = useRef(false)
  corrigiendoRef.current = corrigiendo

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
          const nombreCompleto = [punto.ownerFirstName, punto.ownerLastName]
            .map((parte) => parte?.trim())
            .filter(Boolean)
            .join(' ')
          setValoresGuardados({
            razonSocial: punto.legalName ?? '',
            nit: punto.nit ?? '',
            ...(nombreCompleto ? { nombreCompleto } : {}),
            ...(punto.legalRepresentative?.trim()
              ? { representanteLegal: punto.legalRepresentative.trim() }
              : {}),
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

        // FAILED = la última vez el micro rechazó los datos. No es un
        // callejón: vuelve el formulario prellenado, con el aviso arriba.
        if (punto.provisioningStatus === 'FAILED') {
          setFallo({ mensaje: REVISA_LOS_DATOS, reintentable: true, status: null, paraCorregir: true })
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
      agency: {
        name: input.agencyName,
        nit: input.nit,
        // Se omiten si vienen vacíos: el back los tiene como opcionales y
        // mandar '' escribiría una cadena vacía donde debería haber null.
        ...(input.legalRepresentative ? { legalRepresentative: input.legalRepresentative } : {}),
      },
    })
      .then((res) => {
        inFlightRef.current = false
        if (!mountedRef.current || requestIdRef.current !== requestId) return
        if (res.agentSessionId) {
          setSessionId(res.agentSessionId)
          setAgencyPrefill({ legalName: input.agencyName, nit: input.nit })
          // Para poder volver a corregirlos sin recargar la página.
          setValoresGuardados(valoresDelEnvio(input))
          setCorrigiendo(false)
          setStatus('ready')
        } else {
          // El back creó las filas pero el traspaso al agente no minteó la
          // sesión. Reintentar SÍ sirve: el back vuelve a intentar sólo ese
          // traspaso (`startAgentOnboarding`), no el aprovisionamiento entero.
          setSessionId(null)
          setValoresGuardados(valoresDelEnvio(input))
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
        // Corrigiendo, la sesión del asistente sigue siendo válida: se
        // conserva para que «Volver al asistente» funcione después del fallo.
        if (!corrigiendoRef.current) setSessionId(null)
        setValoresGuardados(valoresDelEnvio(input))
        const fallo = interpretarFallo(error)
        setFallo(fallo)
        // Si lo que falló fueron los datos, se vuelve al formulario para
        // corregirlos; lo demás (una caída, un 409) va al cartel. Corrigiendo,
        // siempre al formulario: el aviso va arriba y el asistente sigue a un
        // clic (`volverAlAsistente`).
        setStatus(fallo.paraCorregir || corrigiendoRef.current ? 'needs-info' : 'error')
        if (corrigiendoRef.current && !fallo.paraCorregir) setFallo({ ...fallo, paraCorregir: true })
      })
  }, [])

  const provision = useCallback(
    (input: ProvisioningInput) => {
      inputRef.current = input
      runProvision()
    },
    [runProvision],
  )

  const corregirDatos = useCallback(() => {
    if (!sessionIdRef.current || inFlightRef.current) return
    setFallo(null)
    setCorrigiendo(true)
    setStatus('needs-info')
  }, [])

  const volverAlAsistente = useCallback(() => {
    if (!sessionIdRef.current || inFlightRef.current) return
    setFallo(null)
    setCorrigiendo(false)
    setStatus('ready')
  }, [])

  return {
    status,
    sessionId,
    agencyPrefill,
    valoresGuardados,
    fallo,
    retry: runProvision,
    provision,
    corrigiendo,
    corregirDatos,
    volverAlAsistente,
  }
}
