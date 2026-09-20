/**
 * Facturación ELECTRÓNICA (DIAN) — la parte del producto.
 *
 * ── Qué hay del otro lado ───────────────────────────────────────────────────
 *
 * `back-erp/src/inmobiliaria/facturacion/`. Las rutas nuevas del 17-09:
 *
 *   GET  /inmobiliaria/facturacion/transmision
 *   POST /inmobiliaria/facturacion/transmision/:id/reintentar
 *   POST /inmobiliaria/facturacion/transmision/reintentar-sin-proveedor
 *   GET  /inmobiliaria/facturacion/entregas
 *   POST /inmobiliaria/facturacion/entregas/:id/acuse
 *   GET  /inmobiliaria/facturacion/certificaciones
 *   POST /inmobiliaria/facturacion/certificaciones/:propietarioId
 *   GET  /inmobiliaria/facturacion/notas-debito
 *   POST /inmobiliaria/facturacion/:id/nota-credito-parcial
 *   POST /inmobiliaria/facturacion/:id/nota-debito
 *   GET  /inmobiliaria/facturacion/documento-soporte
 *   GET  /inmobiliaria/facturacion/documento-soporte/proveedores
 *   POST /inmobiliaria/facturacion/documento-soporte/proveedores
 *   POST /inmobiliaria/facturacion/documento-soporte/previsualizar
 *   POST /inmobiliaria/facturacion/documento-soporte
 *   GET  /inmobiliaria/facturacion/terceros-sin-correo
 *
 * ── 🔴 Lo que la pantalla NO puede dar por sentado ─────────────────────────
 *
 * Cada listado trae `disponible`. Cuatro migraciones de esta tanda todavía NO
 * están aplicadas, y mientras tanto el back responde `disponible: false` con la
 * migración que falta y una `explicacion` en castellano. La pantalla lo DICE en
 * vez de pintar una tabla vacía que parece «no tienes nada»: son dos cosas
 * distintas y se arreglan distinto.
 *
 * ── El cuerpo se arma con claves explícitas ────────────────────────────────
 *
 * `back-erp/src/main.ts` monta el `ValidationPipe` con `whitelist: true` **y
 * `forbidNonWhitelisted: true`**: una clave que el DTO no declara devuelve 400
 * y con él la operación entera.
 */

import { apiClient } from './client'

const BASE = '/inmobiliaria/facturacion'

// ══ Tipos de documento y resoluciones por tipo ══════════════════════════════

/** `TipoDeDocumento` en `back-erp/.../tipos-de-documento.ts`. */
export type TipoDeDocumento =
  | 'CANON_INQUILINO'
  | 'COMISION_PROPIETARIO'
  | 'OTROS'
  | 'NOTA_CREDITO'
  | 'NOTA_DEBITO'
  | 'DOCUMENTO_SOPORTE'

export const NOMBRE_DEL_TIPO: Record<TipoDeDocumento, string> = {
  CANON_INQUILINO: 'Canon del inquilino',
  COMISION_PROPIETARIO: 'Comisión al propietario',
  OTROS: 'Otros (intereses, reparaciones, estudios)',
  NOTA_CREDITO: 'Nota crédito',
  NOTA_DEBITO: 'Nota débito',
  DOCUMENTO_SOPORTE: 'Documento soporte',
}

/** El orden en que se muestran: primero lo que factura todos los meses. */
export const TIPOS_EN_ORDEN: readonly TipoDeDocumento[] = [
  'CANON_INQUILINO',
  'COMISION_PROPIETARIO',
  'OTROS',
  'NOTA_CREDITO',
  'NOTA_DEBITO',
  'DOCUMENTO_SOPORTE',
]

/** Con qué resolución se numera hoy cada tipo. */
export interface ResolucionPorTipo {
  tipo: TipoDeDocumento
  nombre: string
  resolucionId: string | null
  resolucionNumero: string | null
  prefijo: string | null
  puedeNumerar: boolean
  /** `true` cuando numera con una resolución GENERAL (sin tipo). */
  porLaGeneral: boolean
  disponibles: number
  siguiente: string | null
  explicacion: string | null
}

export type ClaseDeAviso = 'BLOQUEA' | 'ADVIERTE'

export type MotivoDeAviso =
  | 'SIN_RESOLUCION'
  | 'RANGO_AGOTADO'
  | 'VENCIDA'
  | 'RANGO_POR_AGOTARSE'
  | 'POR_VENCER'

export interface AvisoDeLaResolucion {
  tipo: TipoDeDocumento
  clase: ClaseDeAviso
  motivo: MotivoDeAviso
  resolucionId: string | null
  resolucionNumero: string | null
  disponibles: number
  diasParaVencer: number | null
  explicacion: string
}

// ══ La cola de transmisión ══════════════════════════════════════════════════

export type DocumentoQueSeTransmite =
  | 'FACTURA'
  | 'NOTA_CREDITO'
  | 'NOTA_DEBITO'
  | 'DOCUMENTO_SOPORTE'

export type EstadoDeTransmision =
  | 'POR_TRANSMITIR'
  | 'TRANSMITIDA'
  | 'ACEPTADA_DIAN'
  | 'RECHAZADA_DIAN'
  | 'SIN_PROVEEDOR'

export const ESTADOS_DE_TRANSMISION: readonly EstadoDeTransmision[] = [
  'POR_TRANSMITIR',
  'TRANSMITIDA',
  'ACEPTADA_DIAN',
  'RECHAZADA_DIAN',
  'SIN_PROVEEDOR',
]

export interface DocumentoEnLaCola {
  id: string
  documentoTipo: DocumentoQueSeTransmite
  documentoNombre: string
  documentoId: string
  numeroDian: string | null
  estado: EstadoDeTransmision
  estadoNombre: string
  intentos: number
  proximoIntentoAt: string | null
  ultimoIntentoAt: string | null
  ultimoError: string | null
  cufe: string | null
  cude: string | null
  xmlUrl: string | null
  pdfUrl: string | null
  encoladaAt: string
  transmitidaAt: string | null
  aceptadaAt: string | null
  rechazadaAt: string | null
  proveedor: string | null
  /** `true` cuando se puede volver a intentar a mano (rechazada, sin proveedor). */
  reintentable: boolean
}

export interface AvisoDeTransmision {
  transmisionId: string
  documentoTipo: string
  numeroDian: string | null
  horas: number
  intentos: number
  ultimoError: string | null
}

export interface ColaDeTransmision {
  disponible: boolean
  migracion: string | null
  proveedor: string
  /** `false` mientras la inmobiliaria no tenga proveedor tecnológico. */
  proveedorConfigurado: boolean
  resumen: Partial<Record<EstadoDeTransmision, number>>
  avisos: AvisoDeTransmision[]
  documentos: DocumentoEnLaCola[]
  explicacion: string | null
}

// ══ La entrega y el acuse ═══════════════════════════════════════════════════

export type CanalDeEntrega = 'CORREO' | 'WHATSAPP' | 'ENLACE'

export type EstadoDeEntrega =
  | 'POR_ENVIAR'
  | 'ENVIADA'
  | 'SIMULADA'
  | 'FALLIDA'
  | 'ACEPTADA'
  | 'ACEPTADA_TACITA'
  | 'RECHAZADA_CLIENTE'

export interface EntregaDeDocumento {
  id: string
  documentoTipo: DocumentoQueSeTransmite
  documentoId: string
  numeroDian: string | null
  canal: CanalDeEntrega
  canalNombre: string
  destinatario: string | null
  estado: EstadoDeEntrega
  estadoNombre: string
  constancia: string | null
  motivo: string | null
  enviadaAt: string | null
  aceptaTacitoAt: string | null
  acuseAt: string | null
  acusePor: string | null
  intentos: number
  /** `true` mientras el cliente todavía puede aceptar o rechazar. */
  esperaAcuse: boolean
}

export interface EntregasDeDocumentos {
  disponible: boolean
  migracion: string | null
  resumen: Partial<Record<EstadoDeEntrega, number>>
  entregas: EntregaDeDocumento[]
  explicacion: string | null
}

// ══ La certificación del mandatario ═════════════════════════════════════════

export interface CertificacionDelMandatario {
  id: string
  propietarioId: string
  propietarioNombre: string
  propietarioDocumento: string | null
  periodoDesde: string
  periodoHasta: string
  enPalabras: string
  facturasContadas: number
  baseCop: number
  ivaCop: number
  retefuenteCop: number
  reteivaCop: number
  reteicaCop: number
  totalCop: number
  generadaAt: string
}

export interface CertificacionesDelMandatario {
  disponible: boolean
  migracion: string | null
  certificaciones: CertificacionDelMandatario[]
  explicacion: string | null
}

export interface RenglonDeLaCertificacion {
  facturaId: string
  numeroDian: string | null
  mes: string
  contractId: string
  inmueble: string
  inquilino: string
  inquilinoDocumento: string | null
  fecha: string
  baseCop: number
  ivaCop: number
  retefuenteCop: number
  reteivaCop: number
  reteicaCop: number
  totalCop: number
  notasCreditoCop: number
}

export interface CertificacionGenerada {
  id: string
  propietario: { id: string; nombre: string; documento: string | null }
  periodo: { desde: string; hasta: string; enPalabras: string }
  facturasContadas: number
  baseCop: number
  ivaCop: number
  retefuenteCop: number
  reteivaCop: number
  reteicaCop: number
  totalCop: number
  detalle: RenglonDeLaCertificacion[]
  generadaAt: string
}

// ══ Notas débito ════════════════════════════════════════════════════════════

export type ConceptoDeNotaDebito =
  | 'INTERESES_DE_MORA'
  | 'GASTOS_DE_COBRANZA'
  | 'AJUSTE_DE_PRECIO'
  | 'OTROS'

export const NOMBRE_DEL_CONCEPTO_DEBITO: Record<ConceptoDeNotaDebito, string> = {
  INTERESES_DE_MORA: 'Intereses de mora',
  GASTOS_DE_COBRANZA: 'Gastos de cobranza',
  AJUSTE_DE_PRECIO: 'Ajuste de precio',
  OTROS: 'Otro',
}

export interface NotaDebito {
  id: string
  numeroInterno: string
  numeroDian: string | null
  facturaId: string
  contractId: string | null
  mes: string | null
  estado: string
  concepto: ConceptoDeNotaDebito
  conceptoNombre: string
  motivo: string
  terceroNombre: string
  terceroDocumento: string | null
  baseCop: number
  ivaCop: number
  valorCop: number
  createdAt: string
  transmision: {
    estado: string
    estadoNombre: string
    cufe: string | null
    ultimoError: string | null
  } | null
}

export interface NotasDebitoDeLaAgencia {
  disponible: boolean
  migracion: string | null
  notas: NotaDebito[]
  explicacion: string | null
}

// ══ El estado de corrección de una factura ══════════════════════════════════

export type BloqueoDeCorreccion =
  | 'SIN_NUMERO_DIAN'
  | 'YA_ANULADA'
  | 'SIN_SALDO'
  | 'MIGRACION_PENDIENTE'

export interface EstadoDeLaCorreccion {
  saldoCop: number
  acreditadoCop: number
  puedeAnular: boolean
  puedeParcial: boolean
  maximoParcialCop: number
  puedeNotaDebito: boolean
  bloqueo: BloqueoDeCorreccion | null
  explicacion: string | null
}

// ══ El documento soporte ════════════════════════════════════════════════════

export interface ProveedorNoObligado {
  id: string
  nombre: string
  tipoDocumento: string | null
  documento: string | null
  email: string | null
  telefono: string | null
  direccion: string | null
  ciudad: string | null
  responsableIva: boolean | null
  regimenSimple: boolean | null
  retefuentePct: number | null
  activo: boolean
  /** `true` cuando falta el dato que decide su retención. */
  faltaPerfilTributario: boolean
}

export interface ProveedoresNoObligados {
  disponible: boolean
  migracion: string | null
  proveedores: ProveedorNoObligado[]
  explicacion: string | null
}

export interface ImpuestoDelDocumento {
  tipo: 'IVA' | 'RETEFUENTE' | 'RETEIVA' | 'RETEICA'
  nombre: string
  porcentaje: number
  baseCop: number
  valorCop: number
  suma: boolean
  explicacion: string
}

export interface LiquidacionDelDocumentoSoporte {
  proveedor: { id: string; nombre: string; documento: string | null }
  baseCop: number
  ivaCop: number
  retefuenteCop: number
  reteivaCop: number
  reteicaCop: number
  totalCop: number
  netoCop: number
  impuestos: ImpuestoDelDocumento[]
  /** `true` cuando algún impuesto no se liquidó por falta de un dato. */
  sinConfirmar: boolean
  notas: string[]
}

export interface DocumentoSoporte {
  id: string
  numeroInterno: string
  numeroDian: string | null
  estado: string
  proveedorId: string
  proveedorNombre: string
  proveedorDocumento: string | null
  origenTipo: string
  origenNombre: string
  origenId: string | null
  fecha: string
  concepto: string
  baseCop: number
  ivaCop: number
  retefuenteCop: number
  reteivaCop: number
  reteicaCop: number
  totalCop: number
  netoCop: number
  createdAt: string
  transmision: {
    estado: string
    estadoNombre: string
    cufe: string | null
    ultimoError: string | null
  } | null
}

export interface DocumentosSoporte {
  disponible: boolean
  migracion: string | null
  documentos: DocumentoSoporte[]
  explicacion: string | null
}

// ══ Terceros sin correo ═════════════════════════════════════════════════════

export type ClaseDeTercero = 'INQUILINO' | 'PROPIETARIO'

export interface TerceroSinCorreo {
  id: string
  clase: ClaseDeTercero
  nombre: string
  documento: string | null
  telefono: string | null
  contratos: number
  /** `true` si mientras tanto se le puede entregar por WhatsApp. */
  tieneWhatsapp: boolean
}

export interface TercerosSinCorreo {
  total: number
  conCorreo: number
  sinCorreo: number
  sinCorreoConWhatsapp: number
  /** A cuántos no les llega NADA: su documento queda esperando en un enlace. */
  sinNingunCanal: number
  /** `true` cuando esta inmobiliaria exige el correo al crear un tercero. */
  exigido: boolean
  /** `false` sin la migración: la política no se puede leer ni cambiar. */
  configurable: boolean
  terceros: TerceroSinCorreo[]
}

// ══ Llamadas ════════════════════════════════════════════════════════════════

export const facturacionElectronicaService = {
  /** La cola de transmisión a la DIAN, con sus avisos. */
  cola: (estado?: EstadoDeTransmision) =>
    apiClient.get<ColaDeTransmision>(
      `${BASE}/transmision${estado ? `?estado=${encodeURIComponent(estado)}` : ''}`,
    ),

  /** Vuelve a encolar UN documento. Es el único camino para uno rechazado. */
  reintentarTransmision: (id: string) =>
    apiClient.post<{ id: string; estado: string }>(
      `${BASE}/transmision/${id}/reintentar`,
      {},
    ),

  /** Vuelve a encolar TODO lo que quedó sin proveedor. */
  reintentarLosSinProveedor: () =>
    apiClient.post<{ reencolados: number }>(
      `${BASE}/transmision/reintentar-sin-proveedor`,
      {},
    ),

  /** Cómo le llegó cada documento a su cliente y en qué va su acuse. */
  entregas: () => apiClient.get<EntregasDeDocumentos>(`${BASE}/entregas`),

  /** Registra que el cliente aceptó o rechazó. Un rechazo exige motivo. */
  registrarAcuse: (
    id: string,
    datos: { aceptada: boolean; motivo?: string; por?: string },
  ) =>
    apiClient.post<{ id: string; estado: string }>(
      `${BASE}/entregas/${id}/acuse`,
      {
        aceptada: datos.aceptada,
        ...(datos.motivo ? { motivo: datos.motivo } : {}),
        ...(datos.por ? { por: datos.por } : {}),
      },
    ),

  /** Las certificaciones del mandatario ya generadas. */
  certificaciones: (propietarioId?: string) =>
    apiClient.get<CertificacionesDelMandatario>(
      `${BASE}/certificaciones${propietarioId ? `?propietarioId=${encodeURIComponent(propietarioId)}` : ''}`,
    ),

  /** Genera (o vuelve a generar) la certificación de un propietario. */
  generarCertificacion: (
    propietarioId: string,
    periodo: { desde: string; hasta: string },
  ) =>
    apiClient.post<CertificacionGenerada>(
      `${BASE}/certificaciones/${propietarioId}`,
      { desde: periodo.desde, hasta: periodo.hasta },
    ),

  /** Las notas débito emitidas. */
  notasDebito: () =>
    apiClient.get<NotasDebitoDeLaAgencia>(`${BASE}/notas-debito`),

  /**
   * Emite una nota crédito PARCIAL sobre una factura.
   *
   * 🔴 `valorCop` no puede pasar del saldo: el back RECHAZA la que se pasa con
   * el máximo exacto en el mensaje, no la recorta.
   */
  emitirNotaCreditoParcial: (
    facturaId: string,
    datos: {
      concepto: string
      motivo: string
      valorCop: number
      lineas?: { tipo: string; nombre: string; valorCop: number }[]
    },
  ) =>
    apiClient.post<{ id: string; numeroDeLaNota: string; valorCop: number }>(
      `${BASE}/${facturaId}/nota-credito-parcial`,
      {
        concepto: datos.concepto,
        motivo: datos.motivo,
        valorCop: datos.valorCop,
        ...(datos.lineas && datos.lineas.length > 0
          ? { lineas: datos.lineas }
          : {}),
      },
    ),

  /** Emite una nota DÉBITO: cobrar de más sobre una factura ya emitida. */
  emitirNotaDebito: (
    facturaId: string,
    datos: {
      concepto: ConceptoDeNotaDebito
      motivo: string
      valorCop: number
      ivaCop?: number
    },
  ) =>
    apiClient.post<NotaDebito>(`${BASE}/${facturaId}/nota-debito`, {
      concepto: datos.concepto,
      motivo: datos.motivo,
      valorCop: datos.valorCop,
      ...(typeof datos.ivaCop === 'number' ? { ivaCop: datos.ivaCop } : {}),
    }),

  /** Los documentos soporte emitidos. */
  documentosSoporte: () =>
    apiClient.get<DocumentosSoporte>(`${BASE}/documento-soporte`),

  /** Los proveedores no obligados a facturar. */
  proveedores: () =>
    apiClient.get<ProveedoresNoObligados>(
      `${BASE}/documento-soporte/proveedores`,
    ),

  crearProveedor: (datos: {
    nombre: string
    tipoDocumento?: string
    documento?: string
    email?: string
    telefono?: string
    responsableIva?: boolean
    retefuentePct?: number
  }) =>
    apiClient.post<ProveedorNoObligado>(
      `${BASE}/documento-soporte/proveedores`,
      {
        nombre: datos.nombre,
        ...(datos.tipoDocumento ? { tipoDocumento: datos.tipoDocumento } : {}),
        ...(datos.documento ? { documento: datos.documento } : {}),
        ...(datos.email ? { email: datos.email } : {}),
        ...(datos.telefono ? { telefono: datos.telefono } : {}),
        ...(typeof datos.responsableIva === 'boolean'
          ? { responsableIva: datos.responsableIva }
          : {}),
        ...(typeof datos.retefuentePct === 'number'
          ? { retefuentePct: datos.retefuentePct }
          : {}),
      },
    ),

  /** La liquidación de un documento soporte ANTES de emitirlo. */
  previsualizarDocumentoSoporte: (datos: {
    proveedorId: string
    lineas: { concepto: string; valorCop: number }[]
  }) =>
    apiClient.post<LiquidacionDelDocumentoSoporte>(
      `${BASE}/documento-soporte/previsualizar`,
      { proveedorId: datos.proveedorId, lineas: datos.lineas },
    ),

  emitirDocumentoSoporte: (datos: {
    proveedorId: string
    origenTipo: 'MANTENIMIENTO' | 'EGRESO' | 'MANUAL'
    origenId?: string
    fecha: string
    concepto: string
    lineas: { concepto: string; valorCop: number }[]
  }) =>
    apiClient.post<
      DocumentoSoporte & { sinConfirmar: boolean; notas: string[] }
    >(`${BASE}/documento-soporte`, {
      proveedorId: datos.proveedorId,
      origenTipo: datos.origenTipo,
      ...(datos.origenId ? { origenId: datos.origenId } : {}),
      fecha: datos.fecha,
      concepto: datos.concepto,
      lineas: datos.lineas,
    }),

  /** Los terceros que todavía no tienen correo. */
  tercerosSinCorreo: (clase?: ClaseDeTercero) =>
    apiClient.get<TercerosSinCorreo>(
      `${BASE}/terceros-sin-correo${clase ? `?clase=${clase}` : ''}`,
    ),
}

/** `$1.234.567`, como todo el resto del panel. */
export function pesos(valor: number): string {
  return `$${Math.round(valor).toLocaleString('es-CO')}`
}
