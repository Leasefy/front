/**
 * Facturación por mes — el listado de lo que hay que facturar y la emisión.
 *
 * ── Qué hay del otro lado ───────────────────────────────────────────────────
 *
 * `back-erp/src/inmobiliaria/facturacion/`. Dos rutas:
 *
 *   GET  /inmobiliaria/facturacion/por-generar?mes=2026-09
 *   POST /inmobiliaria/facturacion/generar   { mes, claves? }
 *
 * La agencia sale del JWT (`AgencyMemberGuard`); no se manda. Leer pide
 * `cobros:view`; EMITIR pide además rol ADMIN o CONTADOR
 * (`ContabilidadEscrituraGuard`) — un AGENTE ve el listado y recibe 403 al
 * generar, y la pantalla tiene que decirlo así.
 *
 * ── Por qué el cuerpo del POST se arma con claves explícitas ───────────────
 *
 * `back-erp/src/main.ts` monta el `ValidationPipe` con `whitelist: true` **y
 * `forbidNonWhitelisted: true`**: una clave que el DTO no declara devuelve 400
 * y con él la corrida entera. El DTO tiene exactamente `mes` y `claves`.
 *
 * 🔴 Este archivo NO es `facturacion.types.ts`. Aquel es el contrato de la
 * factura electrónica DIAN (M2), que todavía no existe; esto es el listado
 * mensual que sí tiene back. Se dejan separados a propósito: el día que llegue
 * el motor DIAN, la factura emitida acá es lo que le entra.
 */

import { apiClient } from './client'

const BASE = '/inmobiliaria/facturacion'

// ══ Vocabulario del back ════════════════════════════════════════════════════

/** `DestinatarioDeFactura` en `schema.prisma`. */
export type DestinatarioDeFactura = 'INQUILINO' | 'PROPIETARIO'

/** `TipoDeLinea` en `facturas-del-mes.ts`. */
export type TipoDeLineaDeFactura =
  | 'CANON'
  | 'ADMINISTRACION'
  | 'CONCEPTO_DEL_CONTRATO'
  | 'PRORRATEO'
  | 'COMISION'
  | 'INTERES_DE_MORA'
  | 'GASTO_ADMINISTRATIVO'

export interface LineaDeFactura {
  tipo: TipoDeLineaDeFactura
  nombre: string
  /** Siempre positivo: el signo lo pone `resta`. */
  valorCop: number
  resta: boolean
}

export interface FacturaDelMes {
  /** `contractId|mes|destinatario`. Es lo que se manda para emitir. */
  clave: string
  contractId: string
  /** Nuestro consecutivo de contrato. */
  codigo: number | null
  /** El número que la inmobiliaria conoce (el Nui). */
  numeroExterno: string | null
  inmueble: string
  destinatario: DestinatarioDeFactura
  terceroId: string | null
  terceroNombre: string
  terceroDocumento: string | null
  lineas: LineaDeFactura[]
  subtotalCop: number
  descuentoCop: number
  totalCop: number
  estado: 'POR_EMITIR' | 'EMITIDA'
  numero: number | null
  diasFacturados: number
  diasDelMes: number
  /** Lo que el propietario paga y NO se factura: va a deducción del egreso. */
  deduccionAlEgresoCop: number
}

export interface ContratoOmitido {
  contractId: string
  codigo: number | null
  inmueble: string
  destinatario: DestinatarioDeFactura
  motivo: string
}

export interface ResumenDeLado {
  porEmitir: number
  emitidas: number
  totalCop: number
}

export interface FacturasPorGenerar {
  mes: string
  inquilinos: FacturaDelMes[]
  propietarios: FacturaDelMes[]
  omitidos: ContratoOmitido[]
  totales: {
    contratosDelMes: number
    inquilinos: ResumenDeLado
    propietarios: ResumenDeLado
  }
}

export interface ResultadoDeGeneracion {
  mes: string
  emitidas: number
  /** Las que ya estaban emitidas cuando llegó la orden. No es un error. */
  yaEstaban: number
  totalCop: number
  facturas: { clave: string; numero: number; totalCop: number }[]
}

// ══ Llamadas ════════════════════════════════════════════════════════════════

export const facturacionPorMesService = {
  /** El listado COMPLETO del mes, separado en inquilinos y propietarios. */
  porGenerar: (mes: string) =>
    apiClient.get<FacturasPorGenerar>(
      `${BASE}/por-generar?mes=${encodeURIComponent(mes)}`,
    ),

  /**
   * Emite las elegidas. Sin `claves` —o con la lista vacía— el back emite
   * todas las del mes que estén por emitir.
   */
  generar: (mes: string, claves?: string[]) =>
    apiClient.post<ResultadoDeGeneracion>(
      `${BASE}/generar`,
      claves && claves.length > 0 ? { mes, claves } : { mes },
    ),
}

/** `2026-09` del mes corriente, en la zona del navegador. */
export function mesActual(hoy: Date = new Date()): string {
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Los últimos `cuantos` meses, del más reciente al más viejo, para el
 * selector. Se arma en el cliente porque el back no tiene un catálogo de
 * meses: los contratos van de 2019 a hoy y ofrecer siete años de opciones no
 * ayuda a nadie.
 */
export function mesesParaElegir(cuantos = 13, hoy: Date = new Date()): string[] {
  const meses: string[] = []
  for (let i = 0; i < cuantos; i += 1) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return meses
}

const NOMBRE_DEL_MES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/**
 * `2026-09` → `septiembre de 2026`.
 *
 * A mano y no con `toLocaleDateString`: `new Date('2026-09')` se lee como UTC
 * y en Bogotá (UTC−5) cae en agosto. Un selector de mes que dice el mes
 * anterior es exactamente el defecto que no se puede tener acá.
 */
export function mesLegible(mes: string): string {
  const [anio, numero] = mes.split('-')
  const nombre = NOMBRE_DEL_MES[Number(numero) - 1]
  if (!nombre || !anio) return mes
  return `${nombre} de ${anio}`
}
