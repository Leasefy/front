import { adminApi } from './api'
import { mensajeDelAdmin } from './errores-del-admin'

/**
 * DIAN-FEEL (04-10-2026): el facturador de cada inmobiliaria dentro de la
 * cuenta de FEEL de Leasefy. Nico: «una sola cuenta FEEL de Leasefy que
 * transmite por todas las inmobiliarias». En FEEL el emisor lo fija el token
 * (un token = un facturador), así que cada inmobiliaria es un facturador de la
 * cuenta de Leasefy; lo registra el equipo de Leasefy acá, nunca ella.
 * Back: `admin/resources/tenants/facturador-feel.*`.
 */

export type AmbienteDelFacturador = 'SANDBOX' | 'PRODUCCION'

/** GET /api/v1/admin/tenants/:tenantId/facturacion-electronica */
export interface FacturadorFeelDeLaInmobiliaria {
  disponible: boolean
  migracion: string | null
  feelPrendido: boolean
  urlSandbox: boolean
  urlProduccion: boolean
  inmobiliaria: { id: string; nombre: string; nit: string | null; razonSocial: string | null }
  facturador: null | {
    ambiente: string
    /** SIN_PROBAR | CONECTADA | FALLO */
    estado: string
    finalDelToken: string
    nitDelFacturador: string | null
    prefijoFa: string | null
    ultimaPruebaAt: string | null
    ultimoError: string | null
    actualizadoAt: string
  }
  resoluciones: { numero: string; prefijo: string; coincideConFeel: boolean | null }[]
}

const ruta = (tenantId: string) => `/tenants/${encodeURIComponent(tenantId)}/facturacion-electronica`

export function verFacturador(
  tenantId: string,
  signal?: AbortSignal,
): Promise<FacturadorFeelDeLaInmobiliaria> {
  return adminApi<FacturadorFeelDeLaInmobiliaria>(ruta(tenantId), { signal })
}

export function guardarFacturador(
  tenantId: string,
  datos: { ambiente: AmbienteDelFacturador; tokenIdentificador: string; nitDelFacturador: string },
): Promise<FacturadorFeelDeLaInmobiliaria> {
  return adminApi<FacturadorFeelDeLaInmobiliaria>(ruta(tenantId), {
    method: 'PUT',
    body: {
      ambiente: datos.ambiente,
      tokenIdentificador: datos.tokenIdentificador.trim(),
      nitDelFacturador: datos.nitDelFacturador.trim(),
    },
  })
}

export function probarFacturador(tenantId: string): Promise<FacturadorFeelDeLaInmobiliaria> {
  return adminApi<FacturadorFeelDeLaInmobiliaria>(`${ruta(tenantId)}/probar`, { method: 'POST', body: {} })
}

export function quitarFacturador(tenantId: string): Promise<FacturadorFeelDeLaInmobiliaria> {
  return adminApi<FacturadorFeelDeLaInmobiliaria>(ruta(tenantId), { method: 'DELETE' })
}

/** Lo que dice el estado de la conexión, en palabras. */
export function estadoDelFacturador(estado: string): { texto: string; tono: 'ok' | 'warn' | 'bad' } {
  if (estado === 'CONECTADA') return { texto: 'conectada', tono: 'ok' }
  if (estado === 'FALLO') return { texto: 'la prueba falló', tono: 'bad' }
  return { texto: 'sin probar', tono: 'warn' }
}

/** Antes de mandar; `null` = se puede. */
export function errorDelToken(token: string): string | null {
  const limpio = token.trim()
  if (!limpio) return 'Pega el token que FEEL le dio a este facturador.'
  if (limpio.length < 6) return 'El token es muy corto: cópialo entero.'
  if (limpio.length > 500) return 'El token no puede pasar de 500 caracteres.'
  return null
}

export function mensajeDelFalloDelFacturador(err: unknown, accion: string): string {
  return mensajeDelAdmin(err, {
    accion,
    porDefecto: 'No pudimos completar el cambio del facturador. Prueba de nuevo en un momento.',
  })
}
