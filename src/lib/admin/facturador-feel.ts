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

/**
 * QA-FACT-CONTA-95 (05-10-2026), decisión de Nico n.º 6: «varios prefijos, uno
 * por resolución». En FEEL un token = un facturador = UNA numeración (P11.4):
 * la resolución de la comisión, con su prefijo, es un facturador aparte del de
 * «cualquier tipo». La emisión escoge el token por el tipo de la factura.
 */
export type TipoDelFacturador = 'CANON_INQUILINO' | 'COMISION_PROPIETARIO' | 'OTROS'

export const TIPOS_DEL_FACTURADOR: readonly TipoDelFacturador[] = ['CANON_INQUILINO', 'COMISION_PROPIETARIO', 'OTROS']

export const NOMBRE_DEL_TIPO: Record<TipoDelFacturador, string> = {
  CANON_INQUILINO: 'canon del inquilino',
  COMISION_PROPIETARIO: 'comisión al propietario',
  OTROS: 'otros conceptos (intereses)',
}

export interface VistaDelFacturador {
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

/** GET /api/v1/admin/tenants/:tenantId/facturacion-electronica */
export interface FacturadorFeelDeLaInmobiliaria {
  disponible: boolean
  migracion: string | null
  feelPrendido: boolean
  urlSandbox: boolean
  urlProduccion: boolean
  inmobiliaria: { id: string; nombre: string; nit: string | null; razonSocial: string | null }
  facturador: null | VistaDelFacturador
  /** QA-FACT-CONTA-95: ausentes con un back anterior (= sin facturadores por tipo). */
  porTipoDisponible?: boolean
  migracionPorTipo?: string | null
  facturadoresPorTipo?: (VistaDelFacturador & { tipoDeDocumento: TipoDelFacturador; nombreDelTipo: string })[]
  resoluciones: { numero: string; prefijo: string; coincideConFeel: boolean | null }[]
}

const ruta = (tenantId: string, tipo?: TipoDelFacturador | null) =>
  `/tenants/${encodeURIComponent(tenantId)}/facturacion-electronica${tipo ? `/por-tipo/${tipo}` : ''}`

export function verFacturador(
  tenantId: string,
  signal?: AbortSignal,
): Promise<FacturadorFeelDeLaInmobiliaria> {
  return adminApi<FacturadorFeelDeLaInmobiliaria>(ruta(tenantId), { signal })
}

export function guardarFacturador(
  tenantId: string,
  datos: { ambiente: AmbienteDelFacturador; tokenIdentificador: string; nitDelFacturador: string },
  tipo: TipoDelFacturador | null = null,
): Promise<FacturadorFeelDeLaInmobiliaria> {
  return adminApi<FacturadorFeelDeLaInmobiliaria>(ruta(tenantId, tipo), {
    method: 'PUT',
    body: {
      ambiente: datos.ambiente,
      tokenIdentificador: datos.tokenIdentificador.trim(),
      nitDelFacturador: datos.nitDelFacturador.trim(),
    },
  })
}

export function probarFacturador(
  tenantId: string,
  tipo: TipoDelFacturador | null = null,
): Promise<FacturadorFeelDeLaInmobiliaria> {
  return adminApi<FacturadorFeelDeLaInmobiliaria>(`${ruta(tenantId, tipo)}/probar`, { method: 'POST', body: {} })
}

export function quitarFacturador(
  tenantId: string,
  tipo: TipoDelFacturador | null = null,
): Promise<FacturadorFeelDeLaInmobiliaria> {
  return adminApi<FacturadorFeelDeLaInmobiliaria>(ruta(tenantId, tipo), { method: 'DELETE' })
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
