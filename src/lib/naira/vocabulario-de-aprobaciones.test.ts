/**
 * vocabulario-de-aprobaciones.test.ts — el vocabulario visible de las aprobaciones de Naira (13-05, Tarea 1).
 *
 * Qué prueba: cada mapa de claves cubre EXACTAMENTE su vocabulario del contrato y resuelve a texto en es y en; el nombre de
 * una tarea sale de los detectores activos y del título de su métrica (y nada heredado del prototipo lo resuelve); el
 * listado solo pinta la consecuencia con cortes válidos (E13-6, INV-07); los grupos respetan el orden del servidor; los
 * cortes de los hechos salen sin repetir; el valor de un hecho va crudo; el aporte nombra un tipo de fuente. Marcador
 * [N13:*] en el TÍTULO del `it`.
 */

import { describe, expect, it } from 'vitest'

import {
  CLASES_DE_CONSECUENCIA,
  ESTADOS_DE_LA_PROPUESTA,
  ESTADOS_DE_TAREA,
  RAZONES_DE_CONFLICTO_DE_DECISION,
  TIPOS_DE_ACCION,
  type NairaActionSummary,
} from '@/lib/api/naira/contrato'
import en from '@/lib/i18n/locales/en.json'
import es from '@/lib/i18n/locales/es.json'
import { METRICAS_DEL_CATALOGO } from '@/lib/naira/fuente-a-ruta'
import { tituloDeLaMetrica } from '@/lib/naira/vocabulario-de-seguimiento'

import {
  CLAVE_DE_LA_CLASE_DE_CONSECUENCIA,
  CLAVE_DEL_APORTE,
  CLAVE_DEL_CONFLICTO_DE_DECISION,
  CLAVE_DEL_ESTADO_DE_LA_PROPUESTA,
  CLAVE_DEL_ESTADO_DE_TAREA,
  CLAVE_DEL_TIPO_DE_ACCION,
  METRICA_DEL_DETECTOR_ACTIVO,
  claveDelAporte,
  consecuenciaDelListado,
  cortesDeLosHechos,
  esRazonDeConflictoDeDecision,
  grupoDeLaPropuesta,
  metricaDelDetector,
  nombreDeLaTarea,
  propuestasDelGrupo,
  valorDelHecho,
} from './vocabulario-de-aprobaciones'

const texto = (d: unknown, k: string): unknown =>
  k.split('.').reduce<unknown>((a, p) => (a !== null && typeof a === 'object' ? (a as Record<string, unknown>)[p] : undefined), d)

const ordenado = (xs: readonly string[]) => [...xs].sort()

const MAPAS: readonly (readonly [string, Readonly<Record<string, string>>, readonly string[]])[] = [
  ['CLAVE_DEL_TIPO_DE_ACCION', CLAVE_DEL_TIPO_DE_ACCION, TIPOS_DE_ACCION],
  ['CLAVE_DE_LA_CLASE_DE_CONSECUENCIA', CLAVE_DE_LA_CLASE_DE_CONSECUENCIA, CLASES_DE_CONSECUENCIA],
  ['CLAVE_DEL_ESTADO_DE_LA_PROPUESTA', CLAVE_DEL_ESTADO_DE_LA_PROPUESTA, ESTADOS_DE_LA_PROPUESTA],
  ['CLAVE_DEL_ESTADO_DE_TAREA', CLAVE_DEL_ESTADO_DE_TAREA, ESTADOS_DE_TAREA],
  ['CLAVE_DEL_CONFLICTO_DE_DECISION', CLAVE_DEL_CONFLICTO_DE_DECISION, RAZONES_DE_CONFLICTO_DE_DECISION],
  ['CLAVE_DEL_APORTE', CLAVE_DEL_APORTE, ['system', 'staff', 'third_party']],
]

const ACTIVOS = [
  'cartera.recaudo_tendencia',
  'prospectos.leads_sin_contacto',
  'estado.vacancia_prolongada',
  'estado.portafolio_sin_disponibles',
  'estado.vacancia_tendencia',
]

const HOSTILES = ['constructor', 'toString', '__proto__', 'hasOwnProperty', '', 'x', 'cartera.mora_umbral_cop']

function accion(parcial: Partial<NairaActionSummary> & { readonly proposalId?: string }): NairaActionSummary {
  return {
    proposalId: 'P-1',
    consecuencia: { kind: 'reproducible', texto: 'CONSECUENCIA-CON-CIFRA 98765' },
    tipo: 'crear_tarea',
    clase: 'interna_reversible',
    destinatario: { kind: 'rol', rol: 'role:cartera' },
    reversible: true,
    estado: 'pendiente',
    venceEn: '2000-01-10T15:00:00.000Z',
    propuestaEn: '2000-01-03T15:00:00.000Z',
    puedeDecidir: true,
    asOfs: ['2000-01-02T11:15:00.000Z'],
    ...parcial,
  }
}

describe('vocabulario de las aprobaciones de Naira', () => {
  it('[N13:control-positivo] métrica y nombre de una tarea, grupo y tipo de un caso conocido', () => {
    expect(metricaDelDetector('cartera.recaudo_tendencia')).toBe('cartera.recovered_cop_30d')
    const nombre = nombreDeLaTarea('cartera.recaudo_tendencia')
    expect(nombre).not.toBeNull()
    expect(nombre).toBe(tituloDeLaMetrica('cartera.recovered_cop_30d'))
    expect(grupoDeLaPropuesta('pendiente')).toBe('por_decidir')
    expect(texto(es, CLAVE_DEL_TIPO_DE_ACCION.crear_tarea)).toBe('Crear una tarea')
  })

  it('[N13:vocabulario-exhaustivo] cada mapa cubre su vocabulario y resuelve a texto en es y en', () => {
    for (const [nombre, mapa, vocabulario] of MAPAS) {
      expect(ordenado(Object.keys(mapa)), nombre).toEqual(ordenado(vocabulario))
      for (const clave of Object.values(mapa)) {
        for (const d of [es, en]) {
          const v = texto(d, clave)
          expect(typeof v, `${nombre} ${clave}`).toBe('string')
          expect(String(v).trim(), `${nombre} ${clave}`).not.toBe('')
        }
      }
      if (nombre === 'CLAVE_DEL_CONFLICTO_DE_DECISION') continue
      const textosEs = Object.values(mapa).map((clave) => texto(es, clave))
      expect(new Set(textosEs).size, nombre).toBe(textosEs.length)
    }
    const NO_VERIFICABLE = 'inmobiliaria.ai.naira.propuesta.conflictos.no_verificable'
    const comparten = RAZONES_DE_CONFLICTO_DE_DECISION.filter((r) => CLAVE_DEL_CONFLICTO_DE_DECISION[r] === NO_VERIFICABLE)
    expect(ordenado(comparten)).toEqual(ordenado(['clase_incoherente', 'no_reproducible', 'procedencia_no_disponible']))
    const otras = RAZONES_DE_CONFLICTO_DE_DECISION.filter((r) => CLAVE_DEL_CONFLICTO_DE_DECISION[r] !== NO_VERIFICABLE)
    const textosOtras = [...otras.map((r) => texto(es, CLAVE_DEL_CONFLICTO_DE_DECISION[r])), texto(es, NO_VERIFICABLE)]
    expect(new Set(textosOtras).size).toBe(textosOtras.length)
    for (const d of [es, en]) {
      expect(String(texto(d, 'inmobiliaria.ai.naira.propuesta.conflictos.vencida'))).toContain('{{fecha}}')
      const titular = String(texto(d, 'inmobiliaria.ai.naira.aprobaciones.titularConRol'))
      expect(titular).toContain('{{tipo}}')
      expect(titular).toContain('{{rol}}')
    }
  })

  it('[N13:detector-activo] los cinco detectores activos, con métrica del catálogo y título; lo demás es null', () => {
    expect(ordenado(Object.keys(METRICA_DEL_DETECTOR_ACTIVO))).toEqual(ordenado(ACTIVOS))
    for (const detector of ACTIVOS) expect(Object.hasOwn(METRICA_DEL_DETECTOR_ACTIVO, detector), detector).toBe(true)
    for (const [detector, metrica] of Object.entries(METRICA_DEL_DETECTOR_ACTIVO)) {
      expect((METRICAS_DEL_CATALOGO as readonly string[]).includes(metrica), detector).toBe(true)
      expect(nombreDeLaTarea(detector), detector).not.toBeNull()
    }
    for (const hostil of HOSTILES) {
      expect(metricaDelDetector(hostil), hostil).toBeNull()
      expect(nombreDeLaTarea(hostil), hostil).toBeNull()
    }
  })

  it('[N13:listado-sin-consecuencia] sin un corte válido la consecuencia no sale; no reproducible lo dice', () => {
    const sinAsOfs: NairaActionSummary = accion({})
    delete sinAsOfs.asOfs
    expect('asOfs' in sinAsOfs).toBe(false)
    const casos: readonly NairaActionSummary[] = [
      accion({ asOfs: [] }),
      accion({ asOfs: ['no-es-un-corte'] }),
      accion({ asOfs: ['2000-01-02T11:15:00.000Z', '2000-02-30T11:15:00.000Z'] }),
      sinAsOfs,
    ]
    for (const caso of casos) {
      const r = consecuenciaDelListado(caso)
      expect(r, JSON.stringify(caso.asOfs)).toEqual({ kind: 'sin_corte' })
      const serializado = JSON.stringify(r)
      expect(serializado).not.toContain('98765')
      expect(serializado).not.toContain('CONSECUENCIA')
    }
    expect(consecuenciaDelListado(accion({ consecuencia: { kind: 'no_reproducible' } }))).toEqual({ kind: 'no_reproducible' })
    expect(
      consecuenciaDelListado({ ...sinAsOfs, consecuencia: { kind: 'no_reproducible' } }),
    ).toEqual({ kind: 'no_reproducible' })
  })

  it('[N13:listado-con-corte] con cortes válidos, el texto y sus cortes sin repetir en el orden del servidor', () => {
    const r = consecuenciaDelListado(
      accion({ asOfs: ['2000-01-02T11:15:00.000Z', '2000-01-01T11:15:00.000Z', '2000-01-02T11:15:00.000Z'] }),
    )
    expect(r).toEqual({
      kind: 'con_corte',
      texto: 'CONSECUENCIA-CON-CIFRA 98765',
      asOfs: ['2000-01-02T11:15:00.000Z', '2000-01-01T11:15:00.000Z'],
    })
  })

  it('[N13:grupos-de-propuesta] pendiente y vencible por decidir; el resto reciente; sin reordenar', () => {
    for (const estado of ESTADOS_DE_LA_PROPUESTA) {
      const esperado = estado === 'pendiente' || estado === 'vencible' ? 'por_decidir' : 'recientes'
      expect(grupoDeLaPropuesta(estado), estado).toBe(esperado)
    }
    const acciones = [
      accion({ proposalId: 'P-3', estado: 'pendiente' }),
      accion({ proposalId: 'P-1', estado: 'aprobada' }),
      accion({ proposalId: 'P-2', estado: 'vencible' }),
    ]
    expect(propuestasDelGrupo(acciones, 'por_decidir').map((a) => a.proposalId)).toEqual(['P-3', 'P-2'])
    expect(propuestasDelGrupo(acciones, 'recientes').map((a) => a.proposalId)).toEqual(['P-1'])
  })

  it('[N13:cortes-en-orden] los cortes de los hechos, distintos y en el orden del servidor', () => {
    const A = '2000-01-02T11:15:00.000Z'
    const B = '2000-01-01T08:00:00.000Z'
    const C = '2000-01-03T03:30:00.000Z'
    expect(cortesDeLosHechos([{ asOf: A }, { asOf: B }, { asOf: A }, { asOf: C }])).toEqual([A, B, C])
    expect(cortesDeLosHechos([])).toEqual([])
  })

  it('[N13:valor-del-hecho] número finito o texto no vacío, crudo; lo demás es null', () => {
    expect(valorDelHecho(4711)).toBe('4711')
    expect(valorDelHecho(12.5)).toBe('12.5')
    expect(valorDelHecho('5923')).toBe('5923')
    for (const v of ['', Number.NaN, Number.POSITIVE_INFINITY, null, undefined, true, { a: 1 }]) {
      expect(valorDelHecho(v), String(v)).toBeNull()
    }
  })

  it('[N13:aporte] el aporte nombra un tipo de fuente; lo desconocido no se pinta; nunca la certeza', () => {
    const clave = claveDelAporte('system')
    expect(clave).not.toBeNull()
    expect(texto(es, clave ?? '')).toBe('Sistema')
    for (const v of ['x', 'constructor', '']) expect(claveDelAporte(v), v).toBeNull()
    for (const k of Object.values(CLAVE_DEL_APORTE)) {
      for (const d of [es, en]) {
        const v = String(texto(d, k)).toLowerCase()
        expect(v).not.toContain('confianza')
        expect(v).not.toContain('confidence')
      }
    }
  })

  it('[N13:razon-de-conflicto] solo las razones del contrato son razones de conflicto', () => {
    for (const r of RAZONES_DE_CONFLICTO_DE_DECISION) expect(esRazonDeConflictoDeDecision(r), r).toBe(true)
    for (const r of ['otra', '', null]) expect(esRazonDeConflictoDeDecision(r), String(r)).toBe(false)
  })
})
