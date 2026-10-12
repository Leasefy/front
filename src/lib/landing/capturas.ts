import type { ProductSlug } from './types'

/**
 * Las capturas REALES del panel que ilustran cada interna de producto (Nico,
 * 12-10-2026: «donde haya imágenes que quieran representar algo del producto,
 * sácalo directamente del producto»).
 *
 * Son pantallas del panel de verdad, fotografiadas a 2x con una inmobiliaria
 * de demostración («Tu Inmobiliaria»): personas, inmuebles y cifras inventados,
 * ningún cliente real. Viven en `public/landing-v2/producto/` y salen de
 * `.playwright-mcp/landing-1210/foto/` (cada escena con su curaduría).
 *
 * Las coordenadas (`foco`, `notas`) van en % del ancho y del alto de la
 * captura (1440 × 900 del panel), así que no dependen del tamaño en pantalla.
 */

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface NotaSobreLaCaptura {
  /** Punto de la captura al que va el cursor (en %). */
  x: number
  y: number
  texto: string
}

export interface Captura {
  src: string
  alt: string
}

export interface PasoDelRecorrido {
  captura: Captura
  /** La parte de la pantalla que cuenta la historia: se acerca y se enmarca. */
  foco: Rect
  /** Lo que dice la etiqueta del marco. */
  etiqueta: string
}

export interface CapturasDelProducto {
  portada: Captura
  /** La misma pantalla en modo oscuro (el panel nocturno). */
  oscura: Captura
  /** Lo que la portada señala, una cosa a la vez. */
  notas: NotaSobreLaCaptura[]
  /** Una por historia del catálogo, en el mismo orden. */
  recorrido: [PasoDelRecorrido, PasoDelRecorrido, PasoDelRecorrido]
  /** Un recorte por capacidad, en el mismo orden. */
  recortes: [PasoDelRecorrido, PasoDelRecorrido, PasoDelRecorrido, PasoDelRecorrido]
}

const DIR = '/landing-v2/producto'
const c = (nombre: string, alt: string): Captura => ({ src: `${DIR}/${nombre}.webp`, alt })
const paso = (captura: Captura, foco: Rect, etiqueta: string): PasoDelRecorrido => ({ captura, foco, etiqueta })

const CRM = {
  pipeline: c('crm-pipeline', 'Embudo comercial de Leasefy con los interesados de cada etapa'),
  detalle: c('crm-detalle', 'Detalle de un interesado con su asesor y su siguiente acción'),
  origenes: c('crm-origenes', 'Origen de los leads por portal y su conversión'),
  postulaciones: c('crm-postulaciones', 'Postulaciones de inquilinos con su estudio'),
}
const ERP = {
  tablero: c('erp-tablero', 'Tablero financiero: lo que entró, lo que deben y el porcentaje recaudado'),
  recaudo: c('erp-recaudo', 'Recaudo del mes contra el mes anterior, día a día'),
  dispersiones: c('erp-dispersiones', 'Dispersiones a propietarios con su comisión y su neto'),
  renovaciones: c('erp-renovaciones', 'Renovaciones de contratos con el canon propuesto por IPC'),
}
const COB = {
  resumen: c('cob-resumen', 'Agente de cobranza: lo que espera tu decisión y lo que recuperó'),
  cartera: c('cob-cartera', 'Cartera partida por días de mora'),
  whatsapp: c('cob-whatsapp', 'Conversación de WhatsApp del agente con un inquilino que pide plazo'),
}
const CONC = {
  resumen: c('conc-resumen', 'Conciliación bancaria: lo que cruzó el agente y lo que dejó para revisar'),
  movimientos: c('conc-movimientos', 'Movimientos del extracto con el cruce que sugiere el agente'),
}
const ASEG = c('aseg-resumen', 'Asegurabilidad: cotizaciones del día contra varias aseguradoras')
const MATCH = c('match-ofrecer', 'Qué ofrecer: los inmuebles que le sirven a un interesado y por qué')
const INQ = c('inq-detalle', 'Detalle de una postulante con su estudio de asegurabilidad')
const AVA = c('ava-lista', 'Avalúos de la inmobiliaria con su valor y su certificado')

const oscura = (nombre: string, alt: string) => c(`${nombre}-oscuro`, `${alt} (modo oscuro)`)

export const CAPTURAS: Record<ProductSlug, CapturasDelProducto> = {
  crm: {
    portada: CRM.pipeline,
    oscura: oscura('crm-pipeline', CRM.pipeline.alt),
    notas: [
      { x: 41, y: 80, texto: 'Cada interesado con su siguiente paso' },
      { x: 63, y: 33, texto: '6 arriendos cerrados este mes' },
    ],
    recorrido: [
      paso(CRM.origenes, { x: 19, y: 52, w: 79, h: 46 }, 'Cada portal, con sus leads y su conversión'),
      paso(CRM.detalle, { x: 61, y: 66, w: 37, h: 27 }, 'Asesor, días en la etapa y lo que sigue'),
      paso(CRM.postulaciones, { x: 18, y: 44, w: 80, h: 52 }, 'Cada postulación con su estado y su estudio'),
    ],
    recortes: [
      paso(CRM.pipeline, { x: 26, y: 62, w: 72, h: 38 }, 'Pipeline'),
      paso(MATCH, { x: 18, y: 52, w: 80, h: 46 }, 'Qué ofrecer'),
      paso(CRM.detalle, { x: 61, y: 66, w: 37, h: 27 }, 'Asesor'),
      paso(CRM.origenes, { x: 19, y: 52, w: 79, h: 46 }, 'Orígenes'),
    ],
  },
  erp: {
    portada: ERP.tablero,
    oscura: oscura('erp-tablero', ERP.tablero.alt),
    notas: [
      { x: 88, y: 58, texto: '85,3 % recaudado a día 12' },
      { x: 48, y: 58, texto: '$ 127,9 M entraron este mes' },
    ],
    recorrido: [
      paso(ERP.renovaciones, { x: 18, y: 40, w: 80, h: 55 }, 'Cada vencimiento con su canon propuesto'),
      paso(ERP.recaudo, { x: 18, y: 41, w: 80, h: 32 }, 'Lo que se debe, lo que llegó y lo que falta'),
      paso(ERP.dispersiones, { x: 18, y: 26, w: 80, h: 32 }, 'Lo girado a cada propietario, con su neto'),
    ],
    recortes: [
      paso(ERP.renovaciones, { x: 18, y: 40, w: 80, h: 55 }, 'Renovaciones'),
      paso(ERP.recaudo, { x: 18, y: 41, w: 80, h: 32 }, 'Recaudo'),
      paso(CONC.movimientos, { x: 18, y: 8, w: 80, h: 62 }, 'Conciliación'),
      paso(ERP.dispersiones, { x: 18, y: 66, w: 80, h: 34 }, 'Dispersiones'),
    ],
  },
  cobranza: {
    portada: COB.resumen,
    oscura: oscura('cob-resumen', COB.resumen.alt),
    notas: [
      { x: 56, y: 42, texto: 'Sólo lo que pide tu decisión' },
      { x: 38, y: 74, texto: '$ 18,4 M recuperados por el agente' },
    ],
    recorrido: [
      paso(COB.cartera, { x: 18, y: 30, w: 80, h: 34 }, 'La cartera partida por días de mora'),
      paso(COB.whatsapp, { x: 18, y: 26, w: 56, h: 58 }, 'Laura escribe con la voz de tu inmobiliaria'),
      paso(COB.resumen, { x: 18, y: 25, w: 80, h: 35 }, 'A tu equipo le llega lo que necesita una persona'),
    ],
    recortes: [
      paso(COB.whatsapp, { x: 18, y: 26, w: 56, h: 58 }, 'WhatsApp'),
      paso(COB.cartera, { x: 18, y: 30, w: 80, h: 34 }, 'Cartera'),
      paso(COB.resumen, { x: 18, y: 25, w: 80, h: 35 }, 'Te toca a ti'),
      paso(COB.resumen, { x: 18, y: 60, w: 80, h: 40 }, 'Resultados'),
    ],
  },
  inquilino: {
    portada: INQ,
    oscura: oscura('inq-detalle', INQ.alt),
    notas: [
      { x: 75, y: 62, texto: 'Monto máximo asegurable: $ 3.200.000' },
      { x: 75, y: 30, texto: 'Candidata aprobada, lista para contrato' },
    ],
    recorrido: [
      paso(CRM.postulaciones, { x: 18, y: 44, w: 80, h: 52 }, 'Cada candidato con su estudio'),
      paso(INQ, { x: 53, y: 42, w: 45, h: 42 }, 'Hasta cuánto respaldan las aseguradoras'),
      paso(INQ, { x: 53, y: 20, w: 45, h: 20 }, 'Un veredicto claro para decidir'),
    ],
    recortes: [
      paso(INQ, { x: 53, y: 8, w: 45, h: 30 }, 'Candidato'),
      paso(INQ, { x: 53, y: 42, w: 45, h: 42 }, 'Estudio'),
      paso(CRM.postulaciones, { x: 18, y: 26, w: 80, h: 12 }, 'Estados'),
      paso(CRM.postulaciones, { x: 18, y: 44, w: 80, h: 52 }, 'Postulaciones'),
    ],
  },
  avaluos: {
    portada: AVA,
    oscura: oscura('ava-lista', AVA.alt),
    notas: [
      { x: 72, y: 34, texto: 'El valor de cada inmueble, firmado' },
      { x: 88, y: 50, texto: 'El certificado, listo para el propietario' },
    ],
    recorrido: [
      paso(AVA, { x: 18, y: 40, w: 80, h: 30 }, 'Cada avalúo con su método y su valor'),
      paso(AVA, { x: 18, y: 25, w: 80, h: 18 }, 'De borrador a entregado, sin perder ninguno'),
      paso(AVA, { x: 62, y: 40, w: 36, h: 52 }, 'Un certificado que se puede descargar y defender'),
    ],
    recortes: [
      paso(AVA, { x: 18, y: 40, w: 80, h: 30 }, 'Valor'),
      paso(AVA, { x: 18, y: 25, w: 80, h: 18 }, 'Estados'),
      paso(AVA, { x: 62, y: 40, w: 36, h: 52 }, 'Certificados'),
      paso(AVA, { x: 18, y: 0, w: 80, h: 22 }, 'Solicitar'),
    ],
  },
  conciliacion: {
    portada: CONC.resumen,
    oscura: oscura('conc-resumen', CONC.resumen.alt),
    notas: [
      { x: 52, y: 40, texto: '6 de 124 movimientos para tu ojo' },
      { x: 78, y: 59, texto: '95,2 % conciliado por el agente' },
    ],
    recorrido: [
      paso(CONC.movimientos, { x: 18, y: 8, w: 80, h: 62 }, 'Cada línea del banco con su cuota'),
      paso(CONC.resumen, { x: 18, y: 34, w: 80, h: 18 }, 'Lo que no cuadra, dicho en palabras'),
      paso(CONC.resumen, { x: 18, y: 63, w: 80, h: 34 }, 'Quién concilió qué, y cuándo'),
    ],
    recortes: [
      paso(CONC.movimientos, { x: 55, y: 8, w: 30, h: 62 }, 'Cruce sugerido'),
      paso(CONC.resumen, { x: 18, y: 34, w: 80, h: 18 }, 'Hallazgos'),
      paso(CONC.resumen, { x: 18, y: 52, w: 80, h: 12 }, 'Avance'),
      paso(CONC.resumen, { x: 18, y: 63, w: 80, h: 34 }, 'Actividad'),
    ],
  },
  matching: {
    portada: MATCH,
    oscura: oscura('match-ofrecer', MATCH.alt),
    notas: [
      { x: 92, y: 55, texto: '96 % de calce, con su porqué' },
      { x: 40, y: 46, texto: 'Presupuesto y tope asegurable a la vista' },
    ],
    recorrido: [
      paso(MATCH, { x: 18, y: 44, w: 80, h: 10 }, 'Lo que busca, con su presupuesto real'),
      paso(MATCH, { x: 18, y: 52, w: 80, h: 46 }, 'Primero lo que sí va a cerrar'),
      paso(CRM.pipeline, { x: 26, y: 62, w: 72, h: 38 }, 'Lo que se cierra vuelve al embudo'),
    ],
    recortes: [
      paso(MATCH, { x: 18, y: 52, w: 80, h: 22 }, 'Calce'),
      paso(MATCH, { x: 18, y: 44, w: 80, h: 10 }, 'Necesidad'),
      paso(MATCH, { x: 18, y: 64, w: 80, h: 34 }, 'Opciones'),
      paso(CRM.pipeline, { x: 26, y: 62, w: 72, h: 38 }, 'Embudo'),
    ],
  },
  asegurabilidad: {
    portada: ASEG,
    oscura: oscura('aseg-resumen', ASEG.alt),
    notas: [
      { x: 30, y: 27, texto: '7 cotizaciones hoy' },
      { x: 88, y: 45, texto: 'El veredicto de cada aseguradora' },
    ],
    recorrido: [
      paso(ASEG, { x: 18, y: 36, w: 80, h: 58 }, 'Varias aseguradoras a la vez'),
      paso(INQ, { x: 53, y: 42, w: 45, h: 42 }, 'Hasta cuánto respalda cada una'),
      paso(CRM.postulaciones, { x: 18, y: 44, w: 80, h: 52 }, 'El estudio viaja con la postulación'),
    ],
    recortes: [
      paso(ASEG, { x: 18, y: 22, w: 80, h: 15 }, 'Indicadores'),
      paso(ASEG, { x: 18, y: 36, w: 80, h: 58 }, 'Cotizaciones'),
      paso(INQ, { x: 53, y: 42, w: 45, h: 42 }, 'Aseguradoras'),
      paso(CRM.postulaciones, { x: 18, y: 44, w: 80, h: 52 }, 'Postulaciones'),
    ],
  },
}
