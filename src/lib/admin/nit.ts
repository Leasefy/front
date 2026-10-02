import { adminApi } from './api'
import { mensajeDelAdmin } from './errores-del-admin'

/**
 * El NIT de una inmobiliaria en el backoffice (02-10-2026, Nico): en
 * Configuración queda bloqueado después del registro; el equipo de Leasefy lo
 * corrige acá. Back: `admin/resources/tenants/nit-de-la-inmobiliaria.*`.
 *
 * La regla es la del registro (back `nit-de-la-inmobiliaria.ts`, micro
 * `NIT_REGEX`): de 6 a 10 dígitos y, opcional, `-DV`. Se mira acá sólo para
 * avisar antes de mandar; el back la vuelve a mirar.
 */
export const NIT_DE_LA_INMOBILIARIA = /^\d{6,10}(?:-\d)?$/

export const MENSAJE_NIT_INVALIDO =
  'El NIT debe tener entre 6 y 10 dígitos y, si lo incluyes, el dígito de verificación después del guion (900123456-8)'

/** La acción en la bitácora (`agent.audit_log`), para enlazar a Audit search. */
export const ACCION_CORREGIR_NIT = 'agency.nit.update'

export interface CambioDeNit {
  /** ISO 8601. */
  cuando: string
  /** Correo del admin que lo cambió. */
  quien: string | null
  antes: string | null
  despues: string | null
}

/** GET /api/v1/admin/tenants/:tenantId/nit */
export interface NitDeLaInmobiliaria {
  agencyId: string
  nombre: string
  /** El del back: la fuente. */
  nit: string | null
  /** `agent.agencies.nit`; con `microLeido`, `null` = el micro no la tiene. */
  nitEnElMicro: string | null
  /** `false` = no se pudo leer la base del micro. */
  microLeido: boolean
  cambios: CambioDeNit[]
  /** `false` = no se pudo leer la bitácora: `cambios` vacío es «no sé». */
  cambiosLeidos: boolean
}

export type LlegadaAlMicro = 'actualizado' | 'sin_agencia_en_el_micro' | 'no_respondio' | 'no_aplica'

/** PATCH /api/v1/admin/tenants/:tenantId/nit */
export interface CorreccionDelNit extends NitDeLaInmobiliaria {
  /** `false` = ya tenía ese NIT: sólo se le volvió a mandar al micro. */
  cambio: boolean
  micro: LlegadaAlMicro
}

export function verNit(tenantId: string, signal?: AbortSignal): Promise<NitDeLaInmobiliaria> {
  return adminApi<NitDeLaInmobiliaria>(`/tenants/${tenantId}/nit`, { signal })
}

export function corregirNit(tenantId: string, nit: string): Promise<CorreccionDelNit> {
  return adminApi<CorreccionDelNit>(`/tenants/${tenantId}/nit`, {
    method: 'PATCH',
    body: { nit: nit.trim() },
  })
}

/** Lo que se ve debajo del campo antes de mandar; `null` = se puede mandar. */
export function errorDelNit(nit: string): string | null {
  const limpio = nit.trim()
  if (!limpio) return 'Escribe el NIT.'
  if (!NIT_DE_LA_INMOBILIARIA.test(limpio)) return MENSAJE_NIT_INVALIDO
  return null
}

/**
 * Lo que pasó, en una frase. `aviso` = el NIT quedó en Leasefy pero algo no
 * llegó: quien lo corrigió tiene que saberlo, no leer «listo».
 */
export function resultadoDeLaCorreccion(r: CorreccionDelNit): { tono: 'ok' | 'aviso'; texto: string } {
  const quedo = r.cambio ? `El NIT quedó en ${r.nit}` : `Ya tenía el NIT ${r.nit}`
  switch (r.micro) {
    case 'no_aplica':
      return {
        tono: 'ok',
        texto: `${quedo}. La inmobiliaria todavía no está activa en el micro de agentes: lo recibe cuando se active.`,
      }
    case 'no_respondio':
      return {
        tono: 'aviso',
        texto: `${quedo} en Leasefy, pero el micro de agentes no respondió y sigue con ${r.nitEnElMicro ?? 'el anterior'}. Guarda otra vez el mismo NIT para reintentar.`,
      }
    case 'sin_agencia_en_el_micro':
      return {
        tono: 'aviso',
        texto: `${quedo} en Leasefy. El micro de agentes no tiene esta inmobiliaria, así que allá no cambió nada.`,
      }
    case 'actualizado':
      if (r.microLeido && r.nitEnElMicro !== r.nit) {
        return {
          tono: 'aviso',
          texto: `${quedo} en Leasefy, pero el micro de agentes sigue con ${r.nitEnElMicro ?? 'ninguno'}: puede que esa versión del micro todavía no reciba el NIT.`,
        }
      }
      return {
        tono: 'ok',
        texto: r.cambio
          ? `${quedo} y les llegó a los agentes.`
          : `${quedo}. Se lo volvimos a mandar a los agentes.`,
      }
  }
}

/**
 * El texto de un fallo del back; los 400/409/503 ya traen uno en español.
 *
 * 02-10-2026 · Delega en el traductor (`mensajeDelAdmin`): decía «Revisa tu
 * conexión» ante CUALQUIER cosa que no fuera un `ApiError` (también un
 * `TypeError` de JavaScript) y pintaba «Error 500» pelado ante un 5xx.
 */
export function mensajeDelFallo(err: unknown, accion = 'completar el cambio del NIT'): string {
  return mensajeDelAdmin(err, {
    accion,
    porDefecto: 'No pudimos completar el cambio del NIT. Prueba de nuevo en un momento.',
  })
}
