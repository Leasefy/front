/**
 * La cobranza a mano (COBRANZA-MANUAL, 04-10-2026): gestiones, promesas,
 * «traer la cartera» y la carta prejurídica a mano.
 *
 * Nico: «"Registrar gestión" (llamada, WhatsApp, visita, correo, nota) con
 * promesa opcional (fecha y monto, aviso si se incumple) en cada fila de
 * Cartera y en el estado de cuenta». Espejo de
 * `back/src/inmobiliaria/cobranza-manual/` (catálogo, historial y promesas).
 */

export const TIPOS_DE_GESTION = ['LLAMADA', 'WHATSAPP', 'VISITA', 'CORREO', 'NOTA'] as const
export type TipoDeGestion = (typeof TIPOS_DE_GESTION)[number]

export const NOMBRE_DEL_TIPO: Readonly<Record<TipoDeGestion, string>> = {
  LLAMADA: 'Llamada',
  WHATSAPP: 'WhatsApp',
  VISITA: 'Visita',
  CORREO: 'Correo',
  NOTA: 'Nota',
}

export const RESULTADOS_DE_GESTION = [
  'HABLO_CON_LA_PERSONA',
  'NO_CONTESTO',
  'DEJO_MENSAJE',
  'DATO_EQUIVOCADO',
  'PROMETIO_PAGAR',
  'DICE_QUE_YA_PAGO',
  'NO_PUEDE_PAGAR',
  'PIDE_UN_ACUERDO',
  'SE_NIEGA_A_PAGAR',
] as const
export type ResultadoDeGestion = (typeof RESULTADOS_DE_GESTION)[number]

export const NOMBRE_DEL_RESULTADO: Readonly<Record<ResultadoDeGestion, string>> = {
  HABLO_CON_LA_PERSONA: 'Habló con la persona',
  NO_CONTESTO: 'No contestó',
  DEJO_MENSAJE: 'Dejó un mensaje',
  DATO_EQUIVOCADO: 'Número o dirección equivocados',
  PROMETIO_PAGAR: 'Prometió pagar',
  DICE_QUE_YA_PAGO: 'Dice que ya pagó',
  NO_PUEDE_PAGAR: 'No puede pagar por ahora',
  PIDE_UN_ACUERDO: 'Pide un acuerdo de pago',
  SE_NIEGA_A_PAGAR: 'Se niega a pagar',
}

/** SO-17: una promesa nueva de la misma persona deja la anterior «Reemplazada». */
export type EstadoDeLaPromesa = 'PENDIENTE' | 'CUMPLIDA' | 'INCUMPLIDA' | 'REEMPLAZADA'

export const NOMBRE_DEL_ESTADO_DE_LA_PROMESA: Readonly<Record<EstadoDeLaPromesa, string>> = {
  PENDIENTE: 'Pendiente',
  CUMPLIDA: 'Cumplida',
  INCUMPLIDA: 'Incumplida',
  REEMPLAZADA: 'Reemplazada',
}

/** De quién se habla: el contrato (fila de Cartera), el documento (estado de cuenta) o el deudor (Cobranza). */
export type QuienEs =
  | { contractId: string; cuotaId?: string }
  | { documento: string }
  | { deudorId: string }

export interface PromesaDelHistorial {
  fecha: string
  montoCop: number
  estado: EstadoDeLaPromesa
  /** Lo que entró hacia ella (`null` en las del agente: no se sabe acá). */
  abonadoCop: number | null
  faltaCop: number | null
}

export interface EntradaDelHistorial {
  id: string
  /** `equipo`: la registró una persona; `agente`: el agente de cobranza. */
  origen: 'equipo' | 'agente'
  cuando: string
  tipo: string
  tipoTexto: string
  resultado: string | null
  resultadoTexto: string | null
  comentario: string | null
  quien: string
  promesa: PromesaDelHistorial | null
}

export interface ContratoDeLaPersona {
  id: string
  numero: string | null
  direccion: string | null
  vigente: boolean
}

export interface HistorialDeLaPersona {
  persona: { nombre: string | null; contratos: ContratoDeLaPersona[] }
  historial: EntradaDelHistorial[]
  /** `false`: falta la migración; sólo sale lo del agente. */
  disponible: boolean
  agente: { disponible: boolean; deudorId: string | null }
  promesasIncumplidas: number
}

export interface GestionNueva {
  tipo: TipoDeGestion
  resultado?: ResultadoDeGestion
  comentario?: string
  promesa?: { fecha: string; montoCop: number }
}

export interface PromesaDeLaLista {
  id: string
  persona: string
  documento: string | null
  contractId: string | null
  tipo: string
  tipoTexto: string
  fecha: string
  montoCop: number
  estado: EstadoDeLaPromesa
  abonadoCop: number
  faltaCop: number
  registradaPor: string
  registradaEl: string
}

export interface PromesasDelEquipo {
  disponible: boolean
  promesas: PromesaDeLaLista[]
  /** `reemplazadas` falta en un back anterior a SO-17. */
  resumen: { pendientes: number; cumplidas: number; incumplidas: number; reemplazadas?: number }
}

/** Por dónde le llega la cartera a Cobranza (`cuotas` = la de los contratos). */
export interface DeDondeSaleLaCobranza {
  camino: 'cuotas' | 'cobros' | null
  /** `true`: la cobranza está en Automático y contacta sola. `null`: no se supo. */
  contactaSola: boolean | null
  /** La decisión la tomó la configuración del servidor (no la autonomía). */
  porLaVariable: boolean
  plazoSinFijar: boolean
}

export interface ResumenDeLaCorrida {
  filas: number
  deudores: number
  obligaciones: number
  altas: number
  omitidos: number
  agenciasConError: number
}

export type ResultadoDeTraerLaCartera =
  | {
      estado: 'hecha'
      camino: 'cuotas' | 'cobros'
      contactaSola: boolean | null
      plazoSinFijar: boolean
      resumen: ResumenDeLaCorrida
    }
  | { estado: 'en-curso' }
  | { estado: 'variable-invalida' }

/** Los datos que completa la persona en la carta a mano. */
export interface DatosDeLaCarta {
  ciudad?: string
  numContrato?: string
  direccionInmueble?: string
  nombreInmobiliaria?: string
  firmante?: string
  cargoDelFirmante?: string
}

export type CampoDeLaCarta = 'ciudad' | 'numContrato' | 'direccionInmueble' | 'nombreInmobiliaria'

export type ResultadoDeLaCarta =
  | { tipo: 'pdf'; archivo: Blob; nombre: string }
  | {
      tipo: 'faltan-datos'
      faltan: Array<{ campo: CampoDeLaCarta; etiqueta: string }>
      conocidos: Partial<Record<CampoDeLaCarta, string>>
    }
