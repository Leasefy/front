/**
 * briefing-y-senal.test.ts — lo que decide el Briefing y la ficha de una señal antes de pintar (13-03, Tarea 1).
 *
 * Qué prueba: el día en Bogotá aunque el proceso esté en otra zona (P17: el proceso se pone en Asia/Tokyo en
 * `beforeAll`, se comprueba que tomó y se restaura); la validez y la aritmética de días; qué entrega se elige y que los
 * ítems no se reordenan; la tabla del silencio (INV-06: sin inventario jamás la frase de silencio); lo que la ruta trae
 * hoy (E13-5 no viaja; E13-2 y E13-3 del contrato); el largo del recall del contrato; los vocabularios espejados.
 * Los fixtures son del año 2000 salvo los días que prueban Bogotá y la semana, y pasan el esquema ESTRICTO (FG13-3).
 * Marcador [N13:*] en el TÍTULO.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  NairaRecallRequestSchema,
  RESPUESTA_ESTRICTA_POR_ENDPOINT,
  type NairaBriefingDay,
  type NairaBriefingDelivery,
  type NairaBriefingItem,
  type NairaSignalDetail,
} from '@/lib/api/naira/contrato'

import {
  CLASES_DEL_DIA,
  ESTADOS_DEL_DETECTOR,
  LARGO_MAXIMO_DE_RECALL,
  MOTIVOS_SIN_INVESTIGACION,
  citasSinClase,
  elegirEntrega,
  entidadesDeLaSenal,
  esDiaValido,
  esLunes,
  formatearDia,
  hoyEnBogota,
  itemsDeLaSeccion,
  loQueTraeElDia,
  mensajeDelSilencio,
  sumarDias,
  type InventarioDelBriefing,
} from './briefing-y-senal'

const PROMOCION = '00000000-0000-4000-8000-000000000001'
const INMUEBLE = '00000000-0000-4000-8000-000000000009'

function item(parcial: Partial<NairaBriefingItem> = {}): NairaBriefingItem {
  return {
    seccion: 'atencion',
    posicion: 1,
    metricId: 'cartera.morosidad_rate',
    valor: '12.5',
    unidad: 'pct',
    asOf: '2000-01-03T11:15:00.000Z',
    fuente: 'agent.debtor_states',
    trust: 'system',
    clave: 'morosidad@1:cartera.morosidad_rate:2000-01-03',
    urgencyClass: 'ventana_legal',
    titulo: 'La morosidad subió (ejemplo).',
    promocion: { kind: 'promovida', promocionId: PROMOCION },
    causa: { kind: 'investigacion_no_disponible' },
    entidades: { kind: 'agregada' },
    valorRenderizado: '12,5%',
    nombreDeMetrica: 'Morosidad de la cartera (ejemplo)',
    ...parcial,
  }
}

function entrega(canal: NairaBriefingDelivery['canal'], tipo: NairaBriefingDelivery['tipo'], items: NairaBriefingItem[] = [item()]): NairaBriefingDelivery {
  return { canal, tipo, congeladaEn: '2000-01-03T11:45:00.000Z', estadoDelEnvio: 'enviado', items }
}

const POR_WHATSAPP = entrega('whatsapp', 'briefing')
const POR_CORREO = entrega('email', 'briefing')
const AVISO = entrega('email', 'aviso_suspension', [])

const DIA: NairaBriefingDay = {
  dia: '2000-01-03',
  corte: '2000-01-03T11:00:00.000Z',
  resultado: { kind: 'entregado', entregas: [POR_WHATSAPP, POR_CORREO], ocultosPorRol: 0 },
}

const SENAL_AGREGADA: NairaSignalDetail = {
  promocionId: PROMOCION,
  dia: '2000-01-03',
  corte: '2000-01-03T11:00:00.000Z',
  congeladaEn: '2000-01-03T11:45:00.000Z',
  item: item(),
  causa: {
    kind: 'citada',
    investigacionId: '00000000-0000-4000-8000-000000000002',
    citas: ['Cita de ejemplo.'],
    citasConClase: [{ texto: 'Cita de ejemplo.', claimClass: null, hipotesis: null }],
  },
}

const SENAL_CON_LISTA: NairaSignalDetail = {
  ...SENAL_AGREGADA,
  item: item({ entidades: { kind: 'lista', items: [{ tipo: 'inmueble', id: INMUEBLE }] } }),
}

const REGISTRADO = (clase: (typeof CLASES_DEL_DIA)[number]): InventarioDelBriefing => ({
  kind: 'registrado',
  clase,
  detectores: [],
  fuentes: [],
  compuertasConDescarte: [],
  investigacion: [],
})

const DIA_EN_LA_ZONA_ORIGINAL = formatearDia('2026-10-05')

describe('el día en Bogotá aunque el proceso esté en otra zona', () => {
  let tzPrevia: string | undefined

  beforeAll(() => {
    tzPrevia = process.env.TZ
    process.env.TZ = 'Asia/Tokyo'
  })

  afterAll(() => {
    if (tzPrevia === undefined) delete process.env.TZ
    else process.env.TZ = tzPrevia
  })

  it('[N13:dia-bogota] hoyEnBogota corta el día en hora de Colombia (en Tokio ya es otro día)', () => {
    // Control: la zona del proceso SÍ cambió (en Tokio ese instante ya es el día 5).
    expect(new Date('2026-10-05T03:30:00.000Z').getDate()).toBe(5)
    expect(new Date('2026-10-06T03:30:00.000Z').getDate()).toBe(6)
    expect(hoyEnBogota(new Date('2026-10-06T03:30:00.000Z'))).toBe('2026-10-05')
    expect(hoyEnBogota(new Date('2026-10-06T05:30:00.000Z'))).toBe('2026-10-06')
  })

  it('[N13:lunes] el lunes es un día de calendario: no depende de la zona', () => {
    expect(new Date('2026-10-05T03:30:00.000Z').getDate()).toBe(5)
    expect(esLunes('2000-01-03')).toBe(true)
    expect(esLunes('2026-10-05')).toBe(true)
    expect(esLunes('2026-10-06')).toBe(false)
  })

  it('[N13:formatear-dia] el día se escribe igual en Tokio que en la zona original, y no como YYYY-MM-DD', () => {
    expect(new Date('2026-10-05T03:30:00.000Z').getDate()).toBe(5)
    const enTokio = formatearDia('2026-10-05')
    expect(enTokio).toBe(DIA_EN_LA_ZONA_ORIGINAL)
    expect(enTokio).toContain('5')
    expect(enTokio).toContain('oct')
    expect(enTokio).toContain('2026')
    expect(enTokio).not.toBe('2026-10-05')
  })
})

describe('días de calendario', () => {
  it('[N13:dia-valido] forma YYYY-MM-DD y un día que existe', () => {
    expect(esDiaValido('2026-10-05')).toBe(true)
    expect(esDiaValido('2024-02-29')).toBe(true)
    for (const malo of ['2026-02-30', '2026-13-01', '2026-1-5', 'hola', '', '2026-10-05T00:00']) {
      expect(esDiaValido(malo), malo).toBe(false)
    }
  })

  it('[N13:sumar-dias] cruza meses, años y bisiestos', () => {
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28')
    expect(sumarDias('2024-03-01', -1)).toBe('2024-02-29')
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(sumarDias('2026-10-05', 0)).toBe('2026-10-05')
  })

  it('[N13:lunes] en la zona del proceso', () => {
    expect(esLunes('2000-01-03')).toBe(true)
    expect(esLunes('2026-10-05')).toBe(true)
    expect(esLunes('2026-10-06')).toBe(false)
  })
})

describe('qué entrega se pinta', () => {
  it('[N13:entrega-elegida] el briefing por correo antes que por WhatsApp; solo avisos; ninguna', () => {
    expect(elegirEntrega([POR_WHATSAPP, POR_CORREO])).toEqual({ kind: 'briefing', entrega: POR_CORREO, tambienPorWhatsapp: true })
    expect(elegirEntrega([POR_WHATSAPP])).toEqual({ kind: 'briefing', entrega: POR_WHATSAPP, tambienPorWhatsapp: false })
    expect(elegirEntrega([POR_CORREO])).toEqual({ kind: 'briefing', entrega: POR_CORREO, tambienPorWhatsapp: false })
    expect(elegirEntrega([AVISO])).toEqual({ kind: 'solo_aviso' })
    expect(elegirEntrega([AVISO, POR_WHATSAPP])).toEqual({ kind: 'briefing', entrega: POR_WHATSAPP, tambienPorWhatsapp: false })
    expect(elegirEntrega([])).toEqual({ kind: 'ninguna' })
  })

  it('[N13:items-sin-reordenar] los ítems de una sección salen en el orden en que llegaron', () => {
    const segundo = item({ posicion: 2, titulo: 'Segundo (ejemplo).' })
    const primero = item({ posicion: 1, titulo: 'Primero (ejemplo).' })
    const deEstado = item({ seccion: 'estado', posicion: 3, promocion: { kind: 'sin_promocion' } })
    const atencion = itemsDeLaSeccion([segundo, deEstado, primero], 'atencion')
    expect(atencion).toEqual([segundo, primero])
    expect(itemsDeLaSeccion([segundo, deEstado, primero], 'estado')).toEqual([deEstado])
    expect(itemsDeLaSeccion([segundo], 'semanal')).toEqual([])
  })
})

describe('el silencio y lo que trae la ruta hoy', () => {
  it('[N13:silencio-sin-inventario] sin inventario, la atención vacía jamás es «no hay nada»', () => {
    for (const inventario of [{ kind: 'no_viaja' }, { kind: 'sin_registro' }, REGISTRADO('silencio')] as const) {
      expect(mensajeDelSilencio(false, inventario)).toBeNull()
    }
    expect(mensajeDelSilencio(true, { kind: 'no_viaja' })).toBe('silencio_sin_inventario')
    expect(mensajeDelSilencio(true, { kind: 'sin_registro' })).toBe('silencio_sin_inventario')
    expect(mensajeDelSilencio(true, REGISTRADO('sin_evaluacion'))).toBe('sin_evaluacion')
    expect(mensajeDelSilencio(true, REGISTRADO('silencio'))).toBe('frase_de_silencio')
    expect(mensajeDelSilencio(true, REGISTRADO('con_senales'))).toBe('frase_de_silencio')
  })

  it('[N13:hoy-no-viaja] E13-5 no viaja; las entidades y la causa salen del contrato', () => {
    expect(loQueTraeElDia(DIA)).toEqual({ inventario: { kind: 'no_viaja' }, madurez: { kind: 'no_viaja' }, arranque: { kind: 'no_viaja' } })
    expect(entidadesDeLaSenal(SENAL_AGREGADA)).toEqual({ kind: 'agregada' })
    expect(entidadesDeLaSenal(SENAL_AGREGADA)).toBe(SENAL_AGREGADA.item.entidades)
    expect(entidadesDeLaSenal(SENAL_CON_LISTA)).toEqual({ kind: 'lista', items: [{ tipo: 'inmueble', id: INMUEBLE }] })
    expect(entidadesDeLaSenal(SENAL_CON_LISTA)).toBe(SENAL_CON_LISTA.item.entidades)
    expect(citasSinClase(['a', 'b'])).toEqual([
      { texto: 'a', claimClass: null, hipotesis: null },
      { texto: 'b', claimClass: null, hipotesis: null },
    ])
    expect(citasSinClase([])).toEqual([])
  })

  it('[N13:recall-largo-del-contrato] el largo máximo del recall es el del esquema del contrato', () => {
    expect(LARGO_MAXIMO_DE_RECALL).toBe(2000)
    expect(NairaRecallRequestSchema.safeParse({ semana: '2000-01-03', texto: 'x'.repeat(LARGO_MAXIMO_DE_RECALL) }).success).toBe(true)
    expect(NairaRecallRequestSchema.safeParse({ semana: '2000-01-03', texto: 'x'.repeat(LARGO_MAXIMO_DE_RECALL + 1) }).success).toBe(false)
  })

  it('[N13:vocabularios-del-agente] los vocabularios espejados son los del agente (09-04, 10-04)', () => {
    expect(CLASES_DEL_DIA).toEqual(['con_senales', 'silencio', 'sin_evaluacion'])
    expect(ESTADOS_DEL_DETECTOR).toEqual(['ok', 'skipped_stale', 'failed'])
    expect(MOTIVOS_SIN_INVESTIGACION).toEqual(['no_promovida', 'no_disponible_hoy', 'sin_explicacion_completa', 'fila_ilegible'])
  })

  it('[N13:control-positivo] los fixtures del archivo son el contrato y elegirEntrega los usa', () => {
    expect(RESPUESTA_ESTRICTA_POR_ENDPOINT['briefing.dia'].safeParse(DIA).success).toBe(true)
    expect(RESPUESTA_ESTRICTA_POR_ENDPOINT['senal.detalle'].safeParse(SENAL_AGREGADA).success).toBe(true)
    expect(RESPUESTA_ESTRICTA_POR_ENDPOINT['senal.detalle'].safeParse(SENAL_CON_LISTA).success).toBe(true)
    if (DIA.resultado.kind !== 'entregado') throw new Error('fixture')
    const elegida = elegirEntrega(DIA.resultado.entregas)
    expect(elegida.kind).toBe('briefing')
    if (elegida.kind === 'briefing') expect(elegida.entrega.canal).toBe('email')
  })
})
