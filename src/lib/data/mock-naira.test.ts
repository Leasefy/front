/**
 * mock-naira.test.ts — los ejemplos de Naira SON el contrato (13-01, Tarea 1).
 *
 * Qué prueba: un ejemplo por endpoint; cada uno pasa su esquema ESTRICTO en todos los niveles (un campo inventado o
 * renombrado en cualquier nivel es rojo); nada parece medido (fechas del año 2000, «(ejemplo)» en todo texto libre); los
 * `userId` son exactamente los centinelas declarados (B-5); y el control positivo: los ejemplos traen lo que los tests
 * de 13-02..13-07 necesitan para no ser vacuos.
 */

import { describe, expect, it } from 'vitest'
import { IDS_DE_ENDPOINT, RESPUESTA_ESTRICTA_POR_ENDPOINT, type IdDeEndpoint } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA, FECHA_DE_EJEMPLO, USER_IDS_DE_EJEMPLO } from './mock-naira'

/** Recorre un valor JSON y llama `visitar(clave, valor)` en cada propiedad y en cada elemento (clave del arreglo). */
function recorrer(valor: unknown, visitar: (clave: string, v: unknown) => void, clave = ''): void {
  if (Array.isArray(valor)) {
    for (const elemento of valor) {
      visitar(clave, elemento)
      recorrer(elemento, visitar, clave)
    }
    return
  }
  if (valor !== null && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) {
      visitar(k, v)
      recorrer(v, visitar, k)
    }
  }
}

const CLAVES_DE_TEXTO_LIBRE = new Set(['titulo', 'texto', 'text', 'nombre', 'nombreDeMetrica', 'ref'])
const ARREGLOS_DE_TEXTO_LIBRE = new Set(['citas', 'refsServidas'])

describe('EJEMPLOS_DE_NAIRA', () => {
  it('[N13:un-ejemplo-por-endpoint] las claves son exactamente IDS_DE_ENDPOINT', () => {
    expect(Object.keys(EJEMPLOS_DE_NAIRA).sort()).toEqual([...IDS_DE_ENDPOINT].sort())
    expect(IDS_DE_ENDPOINT.length).toBe(19) // P2 (15-10-2026): + whatsapp.consentimiento y whatsapp.consentir
  })

  it.each(IDS_DE_ENDPOINT)('[N13:fixture-es-contrato] %s pasa su esquema ESTRICTO en todos los niveles', (id: IdDeEndpoint) => {
    const r = RESPUESTA_ESTRICTA_POR_ENDPOINT[id].safeParse(EJEMPLOS_DE_NAIRA[id])
    expect(r.success, JSON.stringify(r.success ? null : r.error.issues)).toBe(true)
  })

  it('[N13:fixture-sin-fecha-actual] toda fecha de los 17 ejemplos es del año 2000', () => {
    const fechas: string[] = []
    const malas: string[] = []
    for (const id of IDS_DE_ENDPOINT) {
      recorrer(EJEMPLOS_DE_NAIRA[id], (_clave, v) => {
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
          fechas.push(v)
          if (!v.startsWith('2000-')) malas.push(id + ': ' + v)
        }
      })
    }
    expect(fechas.length).toBeGreaterThan(20) // control: el recorrido sí encuentra fechas
    expect(malas).toEqual([])
    expect(FECHA_DE_EJEMPLO).toBe('2000-01-03')
  })

  it('[N13:fixture-marcado-ejemplo] todo texto libre (titulo, texto, text, nombre, nombreDeMetrica, ref, citas, refsServidas) dice «(ejemplo)»', () => {
    const vistos: string[] = []
    const sinMarca: string[] = []
    for (const id of IDS_DE_ENDPOINT) {
      recorrer(EJEMPLOS_DE_NAIRA[id], (clave, v) => {
        const esTextoLibre = CLAVES_DE_TEXTO_LIBRE.has(clave) || ARREGLOS_DE_TEXTO_LIBRE.has(clave)
        if (esTextoLibre && typeof v === 'string') {
          vistos.push(v)
          if (!v.includes('(ejemplo)')) sinMarca.push(id + '.' + clave + ': ' + v)
        }
      })
    }
    expect(vistos.length).toBeGreaterThan(15) // control: el recorrido sí encuentra textos
    expect(sinMarca).toEqual([])
  })

  it('[N13:b5-ids-declarados] los userId de los ejemplos son EXACTAMENTE USER_IDS_DE_EJEMPLO', () => {
    const encontrados = new Set<string>()
    for (const id of IDS_DE_ENDPOINT) {
      recorrer(EJEMPLOS_DE_NAIRA[id], (clave, v) => {
        if (clave === 'userId' && typeof v === 'string') encontrados.add(v)
      })
    }
    expect(USER_IDS_DE_EJEMPLO.length).toBeGreaterThan(0)
    expect(encontrados).toEqual(new Set(USER_IDS_DE_EJEMPLO))
  })
})

describe('control positivo — lo que los tests de 13-02..13-07 necesitan de los ejemplos', () => {
  it('[N13:control-positivo] memoria: presente y borrado, las tres procedencias y una propuesta pendiente', () => {
    const m = EJEMPLOS_DE_NAIRA['memoria.vista']
    expect(m.items.some((i) => i.content.kind === 'present')).toBe(true)
    expect(m.items.some((i) => i.content.kind === 'erased')).toBe(true)
    expect(new Set(m.items.map((i) => i.provenance))).toEqual(new Set(['observed', 'inferred', 'stated_by_human']))
    expect(m.pendingProposals.length).toBeGreaterThanOrEqual(1)
  })

  it('[N13:control-positivo] briefing: entregado, atención e informativo, pct/cop/count, entidades de los dos tipos', () => {
    const b = EJEMPLOS_DE_NAIRA['briefing.dia']
    expect(b.resultado.kind).toBe('entregado')
    if (b.resultado.kind !== 'entregado') return
    const items = b.resultado.entregas.flatMap((e) => e.items)
    const secciones = new Set(items.map((i) => i.seccion))
    expect(secciones.has('atencion')).toBe(true)
    expect(secciones.has('informativo')).toBe(true)
    const unidades = new Set(items.map((i) => i.unidad))
    for (const u of ['pct', 'cop', 'count'] as const) expect(unidades.has(u)).toBe(true)
    expect(items.some((i) => i.entidades.kind === 'agregada')).toBe(true)
    expect(items.some((i) => i.entidades.kind === 'lista' && i.entidades.items.some((e) => e.tipo === 'inmueble'))).toBe(true)
    for (const i of items) {
      expect(typeof i.valorRenderizado).toBe('string')
      expect(typeof i.nombreDeMetrica).toBe('string')
    }
  })

  it('[N13:control-positivo] señal: citada, citasConClase del mismo largo que citas, una hipótesis, entidades en lista', () => {
    const s = EJEMPLOS_DE_NAIRA['senal.detalle']
    expect(s.item.entidades.kind).toBe('lista')
    expect(s.causa.kind).toBe('citada')
    if (s.causa.kind !== 'citada') return
    expect(s.causa.citasConClase?.length).toBe(s.causa.citas.length)
    expect((s.causa.citasConClase ?? []).some((c) => c.hipotesis !== null)).toBe(true)
  })

  it('[N13:control-positivo] conversación: oraciones con cifra y clase, una sin clase, refs de los dos tipos, texto = oraciones unidas', () => {
    const r = EJEMPLOS_DE_NAIRA['conversacion.preguntar']
    expect(r.kind).toBe('respondida')
    if (r.kind !== 'respondida') return
    const oraciones = r.oraciones ?? []
    expect(oraciones.some((o) => o.cifras.length > 0 && o.claimClass !== null)).toBe(true)
    expect(oraciones.some((o) => o.claimClass === null)).toBe(true)
    expect(new Set((r.refs ?? []).map((x) => x.kind))).toEqual(new Set(['chunk', 'investigacion']))
    expect(oraciones.map((o) => o.texto).join('\n')).toBe(r.texto)
  })

  it('[N13:control-positivo] acciones: cada una trae asOfs no vacíos', () => {
    const a = EJEMPLOS_DE_NAIRA['acciones.lista']
    expect(a.acciones.length).toBeGreaterThan(0)
    for (const accion of a.acciones) expect((accion.asOfs ?? []).length).toBeGreaterThan(0)
  })
})
