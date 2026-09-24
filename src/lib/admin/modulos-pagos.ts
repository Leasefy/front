/**
 * modulos-pagos.ts (admin) — los módulos de PAGO por inmobiliaria.
 *
 * Nico (17-09): «nómina va detrás de un feature flag por inmobiliaria, porque es
 * un módulo de pago… quién prende el flag: **sólo un dueño de Leasefy** (nivel
 * plataforma), no la inmobiliaria por su cuenta».
 *
 * Contrato (`NEXT_PUBLIC_ADMIN_API_URL` + `/api/v1/admin`):
 *   GET /modulos-pagos/catalogo                      → { modulos }
 *   GET /modulos-pagos/matriz?q=&limite=             → MatrizDeModulos
 *   GET /modulos-pagos/:modulo/agencias              → quiénes lo tienen prendido
 *   PUT /agencias/:agencyId/modulos-pagos/:modulo    → { modulo, habilitado }
 *
 * 🔴 **Ausencia de fila = apagado.** El back ya normaliza eso: cada agencia sale
 * con TODOS los módulos del catálogo y `habilitado: false` donde no hay fila, así
 * que esta pantalla nunca tiene que deducir un estado de una clave que falta.
 */

import { adminApi } from './api'

export interface ModuloDelCatalogo {
  modulo: string
  nombre: string
  descripcion: string
}

export interface EstadoDeUnModulo {
  habilitado: boolean
  /** El correo del dueño de Leasefy que lo prendió o apagó. */
  habilitadoPorEmail: string | null
  /** ISO-8601. */
  habilitadoAt: string | null
  motivo: string | null
}

export interface FilaDeLaMatriz {
  agencyId: string
  nombre: string
  nit: string | null
  /** Una entrada por módulo del catálogo, siempre presentes todas. */
  modulos: Record<string, EstadoDeUnModulo>
}

export interface MatrizDeModulos {
  /** `false` = falta la migración; todo sale en cero y eso ES el estado real. */
  disponible: boolean
  motivo: string | null
  catalogo: ModuloDelCatalogo[]
  agencias: FilaDeLaMatriz[]
}

const PATH = '/modulos-pagos'

/** Inmobiliarias × módulos. Trae TODAS, no sólo las que compraron algo. */
export function getMatrizDeModulos(
  opciones: { q?: string; limite?: number } = {},
  signal?: AbortSignal,
): Promise<MatrizDeModulos> {
  return adminApi<MatrizDeModulos>(`${PATH}/matriz`, {
    query: {
      ...(opciones.q ? { q: opciones.q } : {}),
      ...(opciones.limite ? { limite: opciones.limite } : {}),
    },
    signal,
  })
}

/**
 * Prende o apaga un módulo para una inmobiliaria.
 *
 * `motivo` no es obligatorio en el back, pero esta pantalla lo pide: un
 * entitlement de pago que nadie explicó se vuelve imposible de auditar seis
 * meses después.
 */
export function fijarModulo(
  agencyId: string,
  modulo: string,
  body: { habilitado: boolean; motivo?: string },
): Promise<{ modulo: string; habilitado: boolean }> {
  return adminApi<{ modulo: string; habilitado: boolean }>(
    `/agencias/${agencyId}/modulos-pagos/${modulo}`,
    { method: 'PUT', body },
  )
}
