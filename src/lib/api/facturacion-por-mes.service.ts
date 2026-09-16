/**
 * Facturación — las prefacturas que hay por generar, y la emisión.
 *
 * ── Qué hay del otro lado ───────────────────────────────────────────────────
 *
 * `back-erp/src/inmobiliaria/facturacion/`. Dos rutas:
 *
 *   GET  /inmobiliaria/facturacion/por-generar?mes=2026-09
 *   GET  /inmobiliaria/facturacion/por-generar?desde=2026-09&hasta=2026-12-31
 *   POST /inmobiliaria/facturacion/generar   { mes, claves? }
 *
 * 🔴 Cada prefactura SALE de la cuota del contrato (`contrato_cuotas`, la tabla
 * de amortización), no de un recálculo del mes: es la misma plata que el cliente
 * ve en su estado de cuenta. Por eso acá no hay ni una cuenta de canon, IVA ni
 * retención — el front pinta lo que el back leyó.
 *
 * 🔴 Y MOSTRAR NO ES EMITIR. El CEO (2026-09-13): «Si quiero mirar qué facturas
 * tengo por generar hasta el 31 de diciembre… Lo que NO se puede es enviarlas
 * [antes de tiempo].» Cada fila trae `emitible` y su `motivoNoEmitible`; el mes
 * que no empezó se ve y no se emite, y el back devuelve 400 si se intenta.
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
 * factura ELECTRÓNICA (CUFE, firma, envío a la DIAN por un proveedor
 * tecnológico), que todavía no existe; esto es el listado mensual que sí tiene
 * back, con su IVA, sus retenciones y su numeración autorizada. Se dejan
 * separados a propósito: el día que llegue el motor electrónico, la factura
 * emitida acá es lo que le entra.
 */

import { apiClient } from './client'

const BASE = '/inmobiliaria/facturacion'

// ══ Vocabulario del back ════════════════════════════════════════════════════

/** `DestinatarioDeFactura` en `schema.prisma`. */
export type DestinatarioDeFactura = 'INQUILINO' | 'PROPIETARIO'

/** `TipoDeLinea` en `prefacturas-de-las-cuotas.ts`. */
export type TipoDeLineaDeFactura =
  | 'CANON'
  | 'ADMINISTRACION'
  | 'CONCEPTO_DEL_CONTRATO'
  | 'PRORRATEO'
  | 'COMISION'
  | 'INTERES_DE_MORA'
  | 'GASTO_ADMINISTRATIVO'
  | 'AJUSTE_MANUAL'

/**
 * De dónde salió un recargo de mora.
 *
 * 🔴 No es cosmético: `COBRO` es un número que finanzas ya liquidó y quedó
 * escrito; `CUOTA` es el mismo motor corriendo HOY sobre una deuda que ningún
 * cobro reclamó todavía, y por lo tanto CRECE cada día hasta que se emita.
 */
export type OrigenDelRecargo = 'COBRO' | 'CUOTA'

export interface LineaDeFactura {
  tipo: TipoDeLineaDeFactura
  nombre: string
  /** Siempre positivo: el signo lo pone `resta`. */
  valorCop: number
  resta: boolean
  /** Sólo en los recargos de mora. Ausente con un back anterior. */
  origen?: OrigenDelRecargo
}

/**
 * Un impuesto ya liquidado sobre la factura.
 *
 * 🔴 El VALOR sale de la cuota; el `porcentaje` va DEDUCIDO de su base, no leído
 * de la tarifa de hoy: la cuota se escribió con las tarifas de su día.
 */
export interface ImpuestoDeLaFactura {
  tipo: 'IVA' | 'RETEFUENTE' | 'RETEIVA' | 'RETEICA'
  sobre: 'ARRENDAMIENTO' | 'COMISION' | 'IVA_DEL_CANON'
  nombre: string
  porcentaje: number
  baseCop: number
  valorCop: number
  /** `true` si sube el valor de la factura (el IVA). */
  suma: boolean
  loPractica: 'PROPIETARIO' | 'INQUILINO' | 'INMOBILIARIA'
  aCargoDe: 'INQUILINO' | 'PROPIETARIO' | 'INMOBILIARIA'
  explicacion: string
}

export interface FacturaDelMes {
  /**
   * `contractId|mes|destinatario`. Es lo que se manda para emitir, y es la MISMA
   * terna que identifica la cuota: por eso emitir dos veces no puede facturar
   * dos veces el mismo mes.
   */
  clave: string
  /** La cuota del estado de cuenta de la que sale esta factura. */
  cuotaId: string
  contractId: string
  /** Nuestro consecutivo de contrato. */
  codigo: number | null
  /** El número que la inmobiliaria conoce (el Nui). */
  numeroExterno: string | null
  inmueble: string
  /** `YYYY-MM` del período. En un rango, cada fila dice de qué mes es. */
  mes: string
  destinatario: DestinatarioDeFactura
  terceroId: string | null
  terceroNombre: string
  terceroDocumento: string | null
  lineas: LineaDeFactura[]
  subtotalCop: number
  descuentoCop: number
  /** La base: `subtotal − descuento`, antes de impuestos. */
  baseCop: number
  ivaCop: number
  /**
   * 🔴 Lo que retiene quien recibe la factura. NO baja el valor de la factura:
   * baja lo que se paga (`netoCop`).
   */
  retencionesCop: number
  /** El VALOR de la factura: `base + IVA`. */
  totalCop: number
  /** Lo que efectivamente se paga: `total − retenciones`. */
  netoCop: number
  impuestos: ImpuestoDeLaFactura[]
  /** 🔴 Algún impuesto no se facturó porque su dato está deducido o falta. */
  impuestosSinConfirmar: boolean
  notasTributarias: string[]
  escenario: {
    codigo: string
    nombre: string
    certeza: 'CONFIRMADO' | 'DEDUCIDO' | 'SIN_DEFINIR'
  } | null
  estado: 'POR_EMITIR' | 'EMITIDA'
  /** El consecutivo interno de la inmobiliaria. */
  numero: number | null
  /** El número autorizado por la resolución de la DIAN («FE-1042»). */
  numeroDian: string | null
  diasFacturados: number
  diasDelMes: number
  /** Lo que el propietario paga y NO se factura: va a deducción del egreso. */
  deduccionAlEgresoCop: number
  /**
   * 🔴 `false` en un mes que todavía no empieza: la prefactura se ve, no se
   * emite. La casilla se apaga y el motivo se muestra.
   */
  emitible: boolean
  /** Por qué no se puede emitir hoy. `null` cuando sí se puede. */
  motivoNoEmitible: string | null
  /**
   * 🔴 La mora de esta cuota y de dónde salió su recargo.
   *
   * `null` del lado PROPIETARIO (su comisión no se paga tarde) y ausente con un
   * back anterior a la segunda vuelta de facturación.
   */
  mora?: {
    esCartera: boolean
    diasDeMora: number
    /** El interés de mora y el gasto administrativo que la factura lleva. */
    recargosCop: number
    /** `null` cuando la factura no lleva ningún recargo. */
    origen: OrigenDelRecargo | null
    /** Por qué está en cartera y aun así no lleva recargo. `null` si lleva. */
    motivo: string | null
  } | null
  /**
   * Lo que esta fila tiene que decir y no cabe en un número: una cuota en mora
   * que ninguna regla pudo liquidar, un desglose que hubo que cuadrar contra el
   * estado de cuenta.
   */
  avisos: string[]
}

export interface ContratoOmitido {
  contractId: string
  codigo: number | null
  /** El número que la inmobiliaria conoce (el Nui). Ausente con un back anterior. */
  numeroExterno?: string | null
  inmueble: string
  /** `YYYY-MM` del período que no genera factura. */
  mes: string
  destinatario: DestinatarioDeFactura
  motivo: string
}

/** Un contrato que deja de prefacturarse después de un mes concreto. */
export interface ContratoQueTermina {
  contractId: string
  destinatario: DestinatarioDeFactura
  codigo: number | null
  numeroExterno: string | null
  inmueble: string
  terceroNombre: string
  /** `YYYY-MM-DD` del fin del contrato. */
  terminaEl: string | null
}

/** Un mes del rango, con su carga y si hoy se puede emitir. */
export interface MesDelRango {
  mes: string
  /** `Diciembre de 2026`, ya en palabras. */
  nombre: string
  emitible: boolean
  motivoNoEmitible: string | null
  inquilinos: ResumenDeLado
  propietarios: ResumenDeLado
  /**
   * 🔴 Los contratos que se CAEN acá: éste es su último mes prefacturado
   * porque el contrato termina. «Los contratos que finalicen antes se van
   * eliminando de la prefactura» (el CEO). Sin esto, el total del mes siguiente
   * baja y no hay forma de saber por qué. Ausente con un back anterior.
   */
  terminan?: ContratoQueTermina[]
}

/**
 * Un contrato del rango, agrupado. Es la frase del CEO escrita: «ya tengo
 * prefacturado **10 facturas de un millón**» — `cantidad` son las diez,
 * `valorTipicoCop` es el millón.
 */
export interface ContratoDelRango {
  contractId: string
  destinatario: DestinatarioDeFactura
  codigo: number | null
  numeroExterno: string | null
  inmueble: string
  terceroNombre: string
  cantidad: number
  totalCop: number
  /** El total que MÁS se repite entre sus meses, no un promedio. */
  valorTipicoCop: number
  /** `true` si todos sus meses valen lo mismo. */
  valorParejo: boolean
  primerMes: string
  ultimoMes: string
  /** 🔴 El contrato se acaba dentro del rango: deja de prefacturarse. */
  terminaEnElRango: boolean
  /** `YYYY-MM-DD` del fin del contrato, cuando lo tiene. */
  terminaEl: string | null
}

export interface ResumenDeLado {
  porEmitir: number
  emitidas: number
  /** El valor facturado (base + IVA). */
  totalCop: number
  baseCop: number
  ivaCop: number
  retencionesCop: number
  /** Cuántas salen marcadas «impuestos sin confirmar». */
  sinConfirmar: number
  conIva: number
  conRetenciones: number
}

/** Qué dice la resolución de la DIAN sobre si hoy se puede numerar. */
export interface EstadoDeLaResolucion {
  puedeNumerar: boolean
  motivo:
    | 'SIN_RESOLUCION'
    | 'ANULADA'
    | 'NO_VIGENTE_TODAVIA'
    | 'VENCIDA'
    | 'RANGO_AGOTADO'
    | null
  /** El motivo en palabras: es lo que la pantalla muestra tal cual. */
  explicacion: string | null
  numero: string | null
  prefijo: string | null
  desde: number | null
  hasta: number | null
  vigenteHasta: string | null
  disponibles: number
  /** El próximo número autorizado, ya con prefijo. */
  siguiente: string | null
}

export interface FacturasPorGenerar {
  /** El primer mes mirado, `YYYY-MM`. */
  desde: string
  /** El último mes mirado, `YYYY-MM`. */
  hasta: string
  /** El primer mes del rango: es el que se emite. */
  mes: string
  inquilinos: FacturaDelMes[]
  propietarios: FacturaDelMes[]
  omitidos: ContratoOmitido[]
  /** Mes por mes: cuánto pesa cada uno y si hoy se puede emitir. */
  meses: MesDelRango[]
  /** Contrato por contrato: «10 facturas de un millón». */
  porContrato: ContratoDelRango[]
  totales: {
    /** Cuántos contratos distintos aparecen en el rango. */
    contratos: number
    /** Cuántos meses trae el rango. */
    meses: number
    /** Las que hoy se pueden emitir, y lo que suman. */
    emitiblesHoy: number
    totalEmitibleHoyCop: number
    inquilinos: ResumenDeLado
    propietarios: ResumenDeLado
  }
  /** Sin resolución vigente el back NO emite: el botón tiene que decirlo. */
  resolucion: EstadoDeLaResolucion
}

/** Hasta dónde mirar. Sin nada, el mes en curso. */
export interface RangoDePrefacturas {
  /** `YYYY-MM`. */
  desde?: string
  /** `YYYY-MM` o `YYYY-MM-DD`: la persona piensa «hasta el 31 de diciembre». */
  hasta?: string
}

export interface ResultadoDeGeneracion {
  mes: string
  emitidas: number
  /** Las que ya estaban emitidas cuando llegó la orden. No es un error. */
  yaEstaban: number
  /** Las que NO se emitieron porque el rango de la resolución no alcanzó. */
  sinNumero: number
  /** Por qué quedaron sin número. `null` si se emitieron todas. */
  motivo: string | null
  totalCop: number
  facturas: {
    clave: string
    numero: number
    numeroDian: string
    totalCop: number
  }[]
}

/** Una resolución cargada, con su estado ya resuelto por el back. */
export interface ResolucionDeFacturacion {
  id: string
  numero: string
  fechaResolucion: string
  prefijo: string
  desde: number
  hasta: number
  vigenteDesde: string
  vigenteHasta: string
  ultimoNumeroUsado: number
  anulada: boolean
  usados: number
  disponibles: number
  puedeNumerar: boolean
  motivo: EstadoDeLaResolucion['motivo']
  explicacion: string | null
  siguiente: string | null
}

export interface ResolucionesDeLaAgencia {
  resoluciones: ResolucionDeFacturacion[]
  vigente: EstadoDeLaResolucion
}

/** Lo que se manda para cargar una resolución. Las fechas van «YYYY-MM-DD». */
export interface NuevaResolucion {
  numero: string
  fechaResolucion: string
  prefijo: string
  desde: number
  hasta: number
  vigenteDesde: string
  vigenteHasta: string
  ultimoNumeroUsado?: number
}

// ══ Llamadas ════════════════════════════════════════════════════════════════

// ══ Anular una factura emitida: la nota crédito ═════════════════════════════
//
// 🔴 DECISIÓN DE NEGOCIO (Nico, 2026-09-15) — CAMBIABLE. Una factura emitida no
// se borra: lleva un número que la DIAN autorizó. Anular es emitir OTRO
// documento —la nota crédito— con concepto y motivo obligatorios; quedan los
// dos. Y cuando no se puede, la pantalla lo DICE en vez de ofrecer el botón.
// Las reglas están en `back-erp/src/inmobiliaria/facturacion/nota-credito.ts`.

/** `ConceptoDeNotaCredito` en `schema.prisma`. */
export type ConceptoDeNotaCredito =
  | 'DEVOLUCION'
  | 'ANULACION'
  | 'REBAJA'
  | 'AJUSTE_DE_PRECIO'
  | 'OTROS'

/** El nombre del concepto tal como lo lee una persona. */
export const NOMBRE_DEL_CONCEPTO: Record<ConceptoDeNotaCredito, string> = {
  DEVOLUCION: 'Devolución del servicio o del valor cobrado',
  ANULACION: 'Anulación de la factura',
  REBAJA: 'Rebaja o descuento',
  AJUSTE_DE_PRECIO: 'Ajuste de precio',
  OTROS: 'Otro',
}

export type BloqueoDeNotaCredito =
  | 'SIN_NUMERO_DIAN'
  | 'YA_ANULADA'
  | 'MIGRACION_PENDIENTE'

export interface EstadoDeLaAnulacion {
  puede: boolean
  bloqueo: BloqueoDeNotaCredito | null
  /** Qué decirle a la persona cuando no se puede. */
  explicacion: string | null
}

export interface NotaCreditoDeLaFactura {
  id: string
  /** `NC-12`: consecutivo PROPIO, no el de las facturas. */
  numero: string
  concepto: ConceptoDeNotaCredito
  motivo: string
  valorCop: number
  /** Qué pasó en el libro, o por qué no pasó nada. */
  notaContable: string | null
  createdAt: string
}

export interface FacturaEmitida {
  id: string
  numero: number
  /** Con prefijo (`FE-1042`). `null` = se emitió sin resolución cargada. */
  numeroDian: string | null
  destinatario: DestinatarioDeFactura
  terceroNombre: string
  terceroDocumento: string | null
  inmueble: string
  contractId: string
  mes: string
  baseCop: number
  ivaCop: number
  retencionesCop: number
  totalCop: number
  netoCop: number
  createdAt: string
  notaCredito: NotaCreditoDeLaFactura | null
  anulacion: EstadoDeLaAnulacion
}

export interface FacturasEmitidasDelMes {
  mes: string
  /** `false` = esta base todavía no tiene la tabla de notas crédito. */
  anulacionDisponible: boolean
  facturas: FacturaEmitida[]
}

export const facturacionPorMesService = {
  /**
   * Las prefacturas del rango, separadas en inquilinos y propietarios.
   *
   * Con un solo mes (`{ desde: m, hasta: m }`) responde ese mes, que es lo que
   * respondía `?mes=`. Sin nada, el mes en curso.
   */
  porGenerar: (rango: RangoDePrefacturas = {}) => {
    const query = new URLSearchParams()
    if (rango.desde) query.set('desde', rango.desde)
    if (rango.hasta) query.set('hasta', rango.hasta)
    const cola = query.toString()
    return apiClient.get<FacturasPorGenerar>(
      cola ? `${BASE}/por-generar?${cola}` : `${BASE}/por-generar`,
    )
  },

  /**
   * Emite las elegidas. Sin `claves` —o con la lista vacía— el back emite
   * todas las del mes que estén por emitir.
   */
  generar: (mes: string, claves?: string[]) =>
    apiClient.post<ResultadoDeGeneracion>(
      `${BASE}/generar`,
      claves && claves.length > 0 ? { mes, claves } : { mes },
    ),

  /** Las resoluciones de la agencia. Sólo ADMIN o CONTADOR. */
  resoluciones: () =>
    apiClient.get<ResolucionesDeLaAgencia>(`${BASE}/resolucion`),

  /**
   * Carga una resolución. El cuerpo se arma con claves explícitas: el back
   * monta el `ValidationPipe` con `forbidNonWhitelisted`, así que una clave de
   * más devuelve 400.
   */
  crearResolucion: (datos: NuevaResolucion) =>
    apiClient.post<ResolucionDeFacturacion>(`${BASE}/resolucion`, {
      numero: datos.numero,
      fechaResolucion: datos.fechaResolucion,
      prefijo: datos.prefijo,
      desde: datos.desde,
      hasta: datos.hasta,
      vigenteDesde: datos.vigenteDesde,
      vigenteHasta: datos.vigenteHasta,
      ...(typeof datos.ultimoNumeroUsado === 'number'
        ? { ultimoNumeroUsado: datos.ultimoNumeroUsado }
        : {}),
    }),

  /**
   * Anula una resolución: deja de numerar, pero no se borra.
   *
   * 🔴 `motivo` es obligatorio en el back (`AnularResolucionDto`, hasta 500
   * caracteres; sólo espacios es 400): una resolución anulada deja a la
   * inmobiliaria sin poder numerar, y el porqué tiene que quedar escrito.
   */
  anularResolucion: (id: string, motivo: string) =>
    apiClient.post<ResolucionDeFacturacion>(
      `${BASE}/resolucion/${id}/anular`,
      { motivo },
    ),

  /** Lo YA emitido del mes, con el estado de su anulación. */
  emitidas: (mes: string) =>
    apiClient.get<FacturasEmitidasDelMes>(
      `${BASE}/emitidas?mes=${encodeURIComponent(mes)}`,
    ),

  /**
   * Anula una factura emitiendo una nota crédito.
   *
   * 🔴 `concepto` y `motivo` son obligatorios en el back (mínimo 10 caracteres;
   * sólo espacios es 400). Un 409 trae `code`: `YA_ANULADA`, `SIN_NUMERO_DIAN`
   * o `MIGRACION_PENDIENTE`, y la pantalla lo lee para decir qué pasó en vez de
   * un «error» pelado.
   */
  emitirNotaCredito: (
    facturaId: string,
    datos: { concepto: ConceptoDeNotaCredito; motivo: string },
  ) =>
    apiClient.post<{ id: string; numeroDeLaNota: string; valorCop: number }>(
      `${BASE}/${facturaId}/nota-credito`,
      { concepto: datos.concepto, motivo: datos.motivo },
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
/**
 * `2028-01-15` → `15/01/2028`.
 *
 * Se leen los primeros diez caracteres, sin construir un `Date`: un
 * `@db.Date` llega como `...T00:00:00.000Z` y en Bogotá (UTC−5) se pinta el
 * día anterior. Una vigencia que dice el día equivocado es exactamente el
 * defecto que no se puede tener en una resolución de la DIAN.
 */
export function fechaLegible(iso: string | null): string {
  if (!iso) return '—'
  const [anio, mes, dia] = iso.slice(0, 10).split('-')
  if (!anio || !mes || !dia) return iso
  return `${dia}/${mes}/${anio}`
}

export function mesLegible(mes: string): string {
  const [anio, numero] = mes.split('-')
  const nombre = NOMBRE_DEL_MES[Number(numero) - 1]
  if (!nombre || !anio) return mes
  return `${nombre} de ${anio}`
}
