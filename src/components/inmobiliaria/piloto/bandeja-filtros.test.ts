import { describe, expect, it } from 'vitest'
import { coincideConLaBusqueda, grupoDeLaFila } from './bandeja-filtros'

// CONTR-3 (QA de agentes 17-10): 285 de 286 decisiones en un solo chip,
// «Retenidos»; la prórroga del contrato 1505 en la página 29 de 29.
describe('grupoDeLaFila', () => {
  it('lo retenido va con el agente que lo propuso', () => {
    expect(grupoDeLaFila({ fuente: 'retenido', agente: 'contratos' })).toBe('contratos')
    expect(grupoDeLaFila({ fuente: 'retenido', agente: 'inspeccion' })).toBe('inspeccion')
  })

  it('la calidad retenida y la fuente «calidad» del micro son el mismo chip', () => {
    expect(grupoDeLaFila({ fuente: 'retenido', agente: 'calidad' })).toBe(grupoDeLaFila({ fuente: 'calidad', agente: 'calidad' }))
  })

  it('lo demás sigue con su tipo (las cartas no son «Mori»)', () => {
    expect(grupoDeLaFila({ fuente: 'carta_prejuridica', agente: 'cobranza' })).toBe('carta_prejuridica')
  })

  it('un retenido sin agente se queda en «retenido»', () => {
    expect(grupoDeLaFila({ fuente: 'retenido', agente: '' })).toBe('retenido')
  })
})

describe('coincideConLaBusqueda', () => {
  const prorroga = {
    titulo: 'Prorrogar el contrato 1505 de Apartamento en Centro, Caldas',
    resumen: 'Vence el 14 de octubre; Gómez Pérez no avisó que se va.',
  }

  it('encuentra por número de contrato, por inmueble y por persona', () => {
    expect(coincideConLaBusqueda(prorroga, '1505')).toBe(true)
    expect(coincideConLaBusqueda(prorroga, 'caldas centro')).toBe(true)
    expect(coincideConLaBusqueda(prorroga, 'gomez')).toBe(true)
  })

  it('sin tildes ni mayúsculas', () => {
    expect(coincideConLaBusqueda(prorroga, 'PRÓRROGAR')).toBe(true)
    expect(coincideConLaBusqueda(prorroga, 'perez')).toBe(true)
  })

  it('exige todas las palabras', () => {
    expect(coincideConLaBusqueda(prorroga, '1505 bello')).toBe(false)
  })

  it('vacío no filtra', () => {
    expect(coincideConLaBusqueda(prorroga, '   ')).toBe(true)
  })

  it('lee también el motivo de la perilla', () => {
    expect(coincideConLaBusqueda({ ...prorroga, motivo: 'Retenido en Copiloto' }, 'copiloto')).toBe(true)
  })
})
