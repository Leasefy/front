/**
 * recaudo-en-linea.ts (admin) — el reporte de Wompi, las liquidaciones de
 * Leasefy a cada inmobiliaria y el cuadre Wompi → la cuenta de Leasefy
 * (Nico, C2-AGREGADOR Q3/Q4, ola E).
 *
 * Contrato (admin backend, `NEXT_PUBLIC_ADMIN_API_URL` + `/api/v1/admin`,
 * `AdminAllowlistGuard`; back `src/admin/resources/recaudo-en-linea/`):
 *   GET  /recaudo-en-linea/resumen                        → migraciones, frecuencia del giro, inmobiliarias
 *   POST /recaudo-en-linea/reporte-de-wompi/vista-previa  → el CSV fila por fila, SIN escribir
 *   POST /recaudo-en-linea/reporte-de-wompi/importar      → lo legible, todo o nada; idempotente
 *   GET  /recaudo-en-linea/liquidaciones                  → por inmobiliaria, fecha y estado
 *   GET  /recaudo-en-linea/liquidaciones/:id              → con sus pagos (para el PDF y el Excel)
 *   POST /recaudo-en-linea/liquidaciones/vista-previa     → lo que se liquidaría para un rango
 *   POST /recaudo-en-linea/liquidaciones/generar          → una por inmobiliaria; repetir no duplica
 *   POST /recaudo-en-linea/liquidaciones/:id/girada       → «Leasefy ya la transfirió»
 *   POST /recaudo-en-linea/liquidaciones/:id/desmarcar-girada → deshace «girada» con motivo y bitácora (ola E, E6)
 *   GET  /recaudo-en-linea/cuadre?desde&hasta             → reportado vs liquidado, diferencias marcadas
 *
 * 🔴 Las tarifas son modelo de negocio: aquí nada se calcula. Los descuentos
 * se muestran TAL COMO VIENEN (del reporte de Wompi o de Leasefy).
 *
 * 🔴 El back valida con `forbidNonWhitelisted`: una clave de más es un 400.
 * Por eso cada cuerpo se arma clave por clave, y sólo con lo que tiene valor.
 */

import type { PillTone } from './types'
import { adminApi } from './api'

const PATH = '/recaudo-en-linea'

// ── Lo de arriba de la pantalla ─────────────────────────────────────────────

export interface InmobiliariaDelRecaudo {
  id: string
  nombre: string
}

export interface ResumenDelRecaudo {
  /** `false` = falta la migración del agregador: nada que mostrar todavía. */
  disponible: boolean
  /** `false` = falta la migración del giro: no se puede marcar «girada». */
  giroDisponible: boolean
  /**
   * Ola E (E6): `false` = falta la migración de la bitácora del giro: no se
   * puede DESMARCAR «girada». Opcional: un back anterior no lo manda.
   */
  desmarcarDisponible?: boolean
  /** Nico (C2-AGREGADOR Q3): «POR DEFINIR». */
  frecuenciaDelGiro: { definida: boolean; texto: string }
  migraciones: { agregador: string; giro: string; bitacoraDelGiro?: string }
  inmobiliarias: InmobiliariaDelRecaudo[]
  ultimoReporte: { archivo: string; subidoPor: string; at: string | null; transacciones: number } | null
}

export function resumenDelRecaudo(signal?: AbortSignal): Promise<ResumenDelRecaudo> {
  return adminApi<ResumenDelRecaudo>(`${PATH}/resumen`, { signal })
}

// ── El reporte de Wompi ─────────────────────────────────────────────────────

export type AccionDeLaFila = 'nueva' | 'igual' | 'actualiza' | 'repetida' | 'frenada'
export type CuadreDeLaTransaccion =
  | 'cuadra'
  | 'sin-registro'
  | 'valor-distinto'
  | 'no-aprobada'
  | 'neto-no-cuadra'

export interface FilaDelReporte {
  fila: number
  transaccionId: string | null
  accion: AccionDeLaFila
  /** Por qué no entra, qué cambia, o de qué renglón es copia. */
  motivo: string | null
  referencia: string | null
  fecha: string | null
  estado: string | null
  medio: string | null
  brutoCop: number | null
  comisionCop: number | null
  ivaCop: number | null
  retencionesCop: number | null
  netoCop: number | null
  desembolsoId: string | null
  cuadre: CuadreDeLaTransaccion | null
  detalleDelCuadre: string | null
  agencyId: string | null
  inmobiliaria: string | null
}

export interface ResumenDeLaLectura {
  renglones: number
  nuevas: number
  actualizan: number
  iguales: number
  repetidas: number
  frenadas: number
}

export interface DesembolsoDelReporte {
  desembolsoId: string
  fecha: string | null
  transacciones: number
  brutoCop: number
  descuentosCop: number
  netoCop: number
}

export interface LecturaDelReporte {
  archivo: string
  huella: string
  /** Este mismo archivo ya se había subido (cuándo y quién). */
  yaSubido: { at: string | null; por: string | null } | null
  resumen: ResumenDeLaLectura
  porCuadre: Partial<Record<CuadreDeLaTransaccion, number>>
  filas: FilaDelReporte[]
  /** Filas que no viajaron (las iguales primero); el resumen sí las cuenta. */
  filasOmitidas: number
  desembolsos: DesembolsoDelReporte[]
}

export interface ResultadoDeLaImportacion extends LecturaDelReporte {
  importadas: number
  cuadresActualizados: number
}

export interface ArchivoDelReporte {
  archivo: string
  contenido: string
}

export function vistaPreviaDelReporte(a: ArchivoDelReporte): Promise<LecturaDelReporte> {
  return adminApi<LecturaDelReporte>(`${PATH}/reporte-de-wompi/vista-previa`, {
    method: 'POST',
    body: { archivo: a.archivo, contenido: a.contenido },
  })
}

export function importarElReporte(a: ArchivoDelReporte): Promise<ResultadoDeLaImportacion> {
  return adminApi<ResultadoDeLaImportacion>(`${PATH}/reporte-de-wompi/importar`, {
    method: 'POST',
    body: { archivo: a.archivo, contenido: a.contenido },
  })
}

// ── Las liquidaciones ───────────────────────────────────────────────────────

export type EstadoDeLaLiquidacion = 'generada' | 'girada' | 'conciliada'

export interface DescuentoDeLaLiquidacion {
  concepto: string
  valorCop: number
  fuente: 'reporte-de-wompi' | 'leasefy'
}

export interface LiquidacionDelRecaudo {
  id: string
  numero: string
  referenciaDelGiro: string
  agencyId: string
  inmobiliaria: string | null
  fechaDelGiro: string | null
  desembolsoId: string | null
  creadaPor: string
  createdAt: string | null
  cantidadDePagos: number
  brutoCop: number
  comisionCop: number
  ivaCop: number
  retencionesCop: number
  otrosDescuentosCop: number
  descuentos: DescuentoDeLaLiquidacion[]
  netoCop: number
  estado: EstadoDeLaLiquidacion
  giradaAt: string | null
  giradaEl: string | null
  giradaPor: string | null
  referenciaBancariaDelGiro: string | null
  movimientoId: string | null
  conciliadaAt: string | null
  conciliadaPor: string | null
}

export interface PagoDeLaLiquidacion {
  transaccionId: string
  referencia: string | null
  fecha: string | null
  medio: string | null
  desembolsoId: string | null
  reciboId: string | null
  reciboNumero: string | null
  brutoCop: number
  comisionCop: number
  ivaCop: number
  retencionesCop: number
  netoCop: number
}

/** Una fila de la bitácora del giro (ola E, E6): cada vez que se marcó o se desmarcó «girada». */
export interface MovimientoDelGiro {
  accion: 'marcada' | 'desmarcada'
  giradaEl: string | null
  referenciaBancaria: string | null
  fechaDelGiroAntes: string | null
  fechaDelGiroDespues: string | null
  /** Obligatorio al desmarcar; `null` al marcar. */
  motivo: string | null
  por: string
  at: string | null
}

export interface DetalleDeLaLiquidacion extends LiquidacionDelRecaudo {
  nit: string | null
  giroDisponible: boolean
  /** Ola E (E6): se puede desmarcar «girada» (está la bitácora). Un back anterior no lo manda. */
  desmarcarDisponible?: boolean
  /** Ola E (E6): la historia del giro, la más reciente primero. */
  historiaDelGiro?: MovimientoDelGiro[]
  pagos: PagoDeLaLiquidacion[]
}

export interface ListaDeLiquidaciones {
  disponible: boolean
  giroDisponible: boolean
  data: LiquidacionDelRecaudo[]
  total: number
  pagina: number
  porPagina: number
  totales: { liquidaciones: number; brutoCop: number; netoCop: number }
}

export interface FiltrosDeLiquidaciones {
  agencyId?: string
  desde?: string
  hasta?: string
  estado?: EstadoDeLaLiquidacion
  pagina?: number
  porPagina?: number
}

export function listarLiquidaciones(
  f: FiltrosDeLiquidaciones,
  signal?: AbortSignal,
): Promise<ListaDeLiquidaciones> {
  return adminApi<ListaDeLiquidaciones>(`${PATH}/liquidaciones`, {
    signal,
    query: {
      agencyId: f.agencyId,
      desde: f.desde,
      hasta: f.hasta,
      estado: f.estado,
      pagina: f.pagina,
      porPagina: f.porPagina,
    },
  })
}

export function verLiquidacion(id: string, signal?: AbortSignal): Promise<DetalleDeLaLiquidacion> {
  return adminApi<DetalleDeLaLiquidacion>(`${PATH}/liquidaciones/${encodeURIComponent(id)}`, { signal })
}

export interface GiroDeLaLiquidacion {
  fecha: string
  referenciaBancaria?: string
}

export function marcarGirada(id: string, g: GiroDeLaLiquidacion): Promise<DetalleDeLaLiquidacion> {
  const body: Record<string, unknown> = { fecha: g.fecha }
  const referencia = g.referenciaBancaria?.trim()
  if (referencia) body.referenciaBancaria = referencia
  return adminApi<DetalleDeLaLiquidacion>(
    `${PATH}/liquidaciones/${encodeURIComponent(id)}/girada`,
    { method: 'POST', body },
  )
}

/** El motivo de desmarcar: 10 a 500 caracteres (lo exige el back y la base). */
export const MOTIVO_MINIMO_PARA_DESMARCAR = 10
export const MOTIVO_MAXIMO_PARA_DESMARCAR = 500

/**
 * 🔴 Desmarcar «girada» (ola E, E6 · Nico E2 Q2 a): sólo el equipo de Leasefy
 * (este panel), con motivo OBLIGATORIO y bitácora. La liquidación vuelve a
 * «generada». 409 si no está girada o si su giro ya está conciliado en el
 * banco de la inmobiliaria.
 */
export function desmarcarGirada(id: string, motivo: string): Promise<DetalleDeLaLiquidacion> {
  return adminApi<DetalleDeLaLiquidacion>(
    `${PATH}/liquidaciones/${encodeURIComponent(id)}/desmarcar-girada`,
    { method: 'POST', body: { motivo: motivo.trim() } },
  )
}

// ── Generar a mano por rango (la frecuencia del giro está POR DEFINIR) ─────

export interface DescuentoDeLeasefy {
  agencyId: string
  concepto: string
  valorCop: number
}

export interface PedidoDeLiquidaciones {
  desde: string
  hasta: string
  agencyId?: string
  soloDesembolsadas?: boolean
  descuentosDeLeasefy?: DescuentoDeLeasefy[]
}

export interface PagoPropuesto {
  transaccionId: string
  referencia: string | null
  fecha: string | null
  medio: string | null
  desembolsoId: string | null
  brutoCop: number
  comisionCop: number
  ivaCop: number
  retencionesCop: number
  netoCop: number
}

export interface PropuestaDeLiquidacion {
  agencyId: string
  inmobiliaria: string | null
  numero: string
  cantidadDePagos: number
  brutoCop: number
  comisionCop: number
  ivaCop: number
  retencionesCop: number
  otrosDescuentosCop: number
  descuentos: DescuentoDeLaLiquidacion[]
  netoCop: number
  /** Si no se puede generar, por qué. */
  bloqueo: string | null
  pagos: PagoPropuesto[]
}

export interface PagoQueQuedaFuera {
  transaccionId: string
  agencyId: string | null
  inmobiliaria: string | null
  fecha: string | null
  brutoCop: number
  netoCop: number
  motivo: string
}

export interface VistaPreviaDeLiquidaciones {
  desde: string
  hasta: string
  soloDesembolsadas: boolean
  propuestas: PropuestaDeLiquidacion[]
  fuera: PagoQueQuedaFuera[]
  /** Aprobadas sin fecha ni desembolso: ningún rango las alcanza. */
  sinFecha: number
  totales: { liquidaciones: number; brutoCop: number; netoCop: number; pagosFuera: number }
}

export type EstadoDelResultado = 'creada' | 'repetida' | 'bloqueada' | 'fallida'

export interface ResultadoDeLaGeneracion {
  desde: string
  hasta: string
  fechaDelGiro: string
  resultados: {
    agencyId: string
    inmobiliaria: string | null
    numero: string
    netoCop: number
    estado: EstadoDelResultado
    liquidacionId: string | null
    motivo: string | null
  }[]
  fuera: PagoQueQuedaFuera[]
  sinFecha: number
}

function cuerpoDelPedido(p: PedidoDeLiquidaciones): Record<string, unknown> {
  const body: Record<string, unknown> = { desde: p.desde, hasta: p.hasta }
  if (p.agencyId) body.agencyId = p.agencyId
  if (p.soloDesembolsadas !== undefined) body.soloDesembolsadas = p.soloDesembolsadas
  const descuentos = (p.descuentosDeLeasefy ?? []).filter((d) => d.concepto.trim() && d.valorCop > 0)
  if (descuentos.length > 0) {
    body.descuentosDeLeasefy = descuentos.map((d) => ({
      agencyId: d.agencyId,
      concepto: d.concepto.trim(),
      valorCop: d.valorCop,
    }))
  }
  return body
}

export function vistaPreviaDeLiquidaciones(p: PedidoDeLiquidaciones): Promise<VistaPreviaDeLiquidaciones> {
  return adminApi<VistaPreviaDeLiquidaciones>(`${PATH}/liquidaciones/vista-previa`, {
    method: 'POST',
    body: cuerpoDelPedido(p),
  })
}

export function generarLiquidaciones(
  p: PedidoDeLiquidaciones & { fechaDelGiro: string },
): Promise<ResultadoDeLaGeneracion> {
  return adminApi<ResultadoDeLaGeneracion>(`${PATH}/liquidaciones/generar`, {
    method: 'POST',
    body: { ...cuerpoDelPedido(p), fechaDelGiro: p.fechaDelGiro },
  })
}

// ── El cuadre Wompi → Leasefy ───────────────────────────────────────────────

export type TipoDeDiferencia =
  | 'no-cuadra'
  | 'liquidada-con-otros-valores'
  | 'liquidada-no-aprobada'
  | 'registrada-sin-reporte'

export type EstadoDelDesembolso = 'liquidado' | 'por-liquidar' | 'con-diferencias'

export interface DesembolsoDelCuadre {
  desembolsoId: string | null
  fecha: string | null
  transacciones: number
  brutoCop: number
  descuentosCop: number
  netoCop: number
  liquidadoNetoCop: number
  porLiquidarNetoCop: number
  sinCuadrarNetoCop: number
  diferenciaCop: number
  diferencias: number
  estado: EstadoDelDesembolso
}

export interface DiferenciaDelCuadre {
  tipo: TipoDeDiferencia
  transaccionId: string
  agencyId: string | null
  inmobiliaria: string | null
  desembolsoId: string | null
  fecha: string | null
  reportadoCop: number | null
  otroCop: number | null
  detalle: string
}

export interface CuadreDelRecaudo {
  disponible: boolean
  desde: string
  hasta: string
  cuadre: {
    totales: {
      transacciones: number
      aprobadas: number
      reportadoBrutoCop: number
      reportadoDescuentosCop: number
      reportadoNetoCop: number
      liquidadoNetoCop: number
      porLiquidar: number
      porLiquidarNetoCop: number
      sinCuadrar: number
      sinCuadrarNetoCop: number
      registradasSinReporte: number
      registradasSinReporteCop: number
      diferenciaCop: number
      diferencias: number
    }
    desembolsos: DesembolsoDelCuadre[]
    diferencias: DiferenciaDelCuadre[]
  } | null
  diferenciasOmitidas: number
  sinFecha: number
}

export function cuadreDelRecaudo(desde: string, hasta: string, signal?: AbortSignal): Promise<CuadreDelRecaudo> {
  return adminApi<CuadreDelRecaudo>(`${PATH}/cuadre`, { signal, query: { desde, hasta } })
}

// ── Cómo se dice cada cosa ──────────────────────────────────────────────────

export const NOMBRE_DE_LA_ACCION: Record<AccionDeLaFila, string> = {
  nueva: 'entra',
  actualiza: 'actualiza',
  igual: 'ya estaba igual',
  repetida: 'repetida',
  frenada: 'frenada',
}

export const TONO_DE_LA_ACCION: Record<AccionDeLaFila, PillTone> = {
  nueva: 'ok',
  actualiza: 'info',
  igual: 'muted',
  repetida: 'muted',
  frenada: 'bad',
}

export const NOMBRE_DEL_CUADRE: Record<CuadreDeLaTransaccion, string> = {
  cuadra: 'cuadra',
  'sin-registro': 'sin registro en la plataforma',
  'valor-distinto': 'valor distinto',
  'no-aprobada': 'no aprobada',
  'neto-no-cuadra': 'el neto no cuadra',
}

export const NOMBRE_DEL_ESTADO: Record<EstadoDeLaLiquidacion, string> = {
  generada: 'generada',
  girada: 'girada',
  conciliada: 'conciliada en el banco',
}

export const TONO_DEL_ESTADO: Record<EstadoDeLaLiquidacion, PillTone> = {
  generada: 'warn',
  girada: 'info',
  conciliada: 'ok',
}

export const NOMBRE_DE_LA_DIFERENCIA: Record<TipoDeDiferencia, string> = {
  'no-cuadra': 'No cuadra con la plataforma',
  'liquidada-con-otros-valores': 'Liquidada con otros valores',
  'liquidada-no-aprobada': 'Liquidada y Wompi ya no la reporta aprobada',
  'registrada-sin-reporte': 'Registrada y sin reporte de Wompi',
}

export const NOMBRE_DEL_DESEMBOLSO: Record<EstadoDelDesembolso, string> = {
  liquidado: 'liquidado',
  'por-liquidar': 'por liquidar',
  'con-diferencias': 'con diferencias',
}

export const TONO_DEL_DESEMBOLSO: Record<EstadoDelDesembolso, PillTone> = {
  liquidado: 'ok',
  'por-liquidar': 'warn',
  'con-diferencias': 'bad',
}

/** Quién concilió el giro en el banco de la inmobiliaria. */
export const NOMBRE_DE_QUIEN_CONCILIO: Record<string, string> = {
  referencia: 'sola, por la referencia',
  persona: 'una persona',
  piloto: 'el Piloto',
}
