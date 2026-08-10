import { describe, it, expect, beforeEach } from 'vitest'

import {
  aprobacionDesdeFunnel,
  guardarAprobacionLocal,
  leerAprobacionLocal,
  borrarAprobacionLocal,
  RETENCION_DIAS,
} from './aprobacion-local'
import type { PreApprovalResult } from './funnel.service'
import { estaVigente, referenciaCanon, superaReferencia } from './aprobacion.service'

function resultado(over: Partial<PreApprovalResult> = {}): PreApprovalResult {
  return {
    asegurabilidad: 'yes',
    aseguradoras: [{ aseguradora: 'sura', status: 'approved' }],
    stubMode: false,
    message: 'ok',
    maxAfianzableCop: null,
    ...over,
  }
}

describe('aprobacionDesdeFunnel', () => {
  it('un "yes" queda aprobado', () => {
    expect(aprobacionDesdeFunnel(resultado()).estado).toBe('aprobado')
  })

  it('un "partial" TAMBIÉN queda aprobado, marcado como condicionado', () => {
    // A quien le dicen "sí, pero con codeudor" ya lo aprobaron: puede
    // postularse. Tratarlo como rechazo inventaría un muro que la aseguradora
    // no puso.
    const a = aprobacionDesdeFunnel(resultado({ asegurabilidad: 'partial' }))
    expect(a.estado).toBe('aprobado')
    expect(a.condicionada).toBe(true)
    expect(estaVigente(a)).toBe(true)
  })

  it('un "no" queda rechazado y no vigente', () => {
    const a = aprobacionDesdeFunnel(resultado({ asegurabilidad: 'no', aseguradoras: [] }))
    expect(a.estado).toBe('rechazado')
    expect(estaVigente(a)).toBe(false)
  })

  it('una aseguradora condicional marca la aprobación como condicionada', () => {
    const a = aprobacionDesdeFunnel(
      resultado({ aseguradoras: [{ aseguradora: 'mapfre', status: 'conditional' }] }),
    )
    expect(a.condicionada).toBe(true)
  })

  it('el máximo afianzable ENTRA como tope: es el techo real', () => {
    // Es lo que devuelve la aseguradora cuando se consulta sin propiedad.
    const a = aprobacionDesdeFunnel(resultado({ maxAfianzableCop: 2_800_000 }))
    expect(a.topeAprobadoCop).toBe(2_800_000)
    expect(referenciaCanon(a)).toEqual({ valorCop: 2_800_000, tipo: 'tope' })
  })

  it('sin máximo NO se inventa un tope, y la vigencia tampoco', () => {
    const a = aprobacionDesdeFunnel(resultado(), { canonConsultadoCop: 2_000_000 })
    expect(a.topeAprobadoCop).toBeNull()
    expect(a.vigenteHasta).toBeNull()
  })

  it('un máximo basura no se cuela como tope', () => {
    const a = aprobacionDesdeFunnel(resultado({ maxAfianzableCop: Number.NaN }))
    expect(a.topeAprobadoCop).toBeNull()
  })

  it('guarda el canon consultado cuando lo hubo, y null cuando no', () => {
    expect(aprobacionDesdeFunnel(resultado(), { canonConsultadoCop: 2_000_000 }).canonConsultadoCop)
      .toBe(2_000_000)
    expect(aprobacionDesdeFunnel(resultado()).canonConsultadoCop).toBeNull()
  })

  it('sin fecha de vigencia se considera vigente: no se le quita lo que ya ganó', () => {
    expect(estaVigente(aprobacionDesdeFunnel(resultado()))).toBe(true)
  })
})

describe('referencia para personalizar el catálogo', () => {
  it('el tope del backend manda sobre el canon consultado', () => {
    const a = { ...aprobacionDesdeFunnel(resultado(), { canonConsultadoCop: 2_000_000 }) }
    a.topeAprobadoCop = 3_000_000
    expect(referenciaCanon(a)).toEqual({ valorCop: 3_000_000, tipo: 'tope' })
  })

  it('sin tope usa el canon consultado, etiquetado distinto', () => {
    const a = aprobacionDesdeFunnel(resultado(), { canonConsultadoCop: 2_000_000 })
    expect(referenciaCanon(a)).toEqual({ valorCop: 2_000_000, tipo: 'consultado' })
  })

  it('sin ningún número no hay referencia, y entonces nada se marca', () => {
    const a = aprobacionDesdeFunnel(resultado())
    expect(referenciaCanon(a)).toBeNull()
    expect(superaReferencia(9_000_000, a)).toBeNull()
  })

  it('un rechazado no genera referencia', () => {
    const a = aprobacionDesdeFunnel(resultado({ asegurabilidad: 'no' }), {
      canonConsultadoCop: 2_000_000,
    })
    expect(referenciaCanon(a)).toBeNull()
  })

  it('marca lo que se pasa y deja pasar lo que cabe', () => {
    const a = aprobacionDesdeFunnel(resultado(), { canonConsultadoCop: 2_000_000 })
    expect(superaReferencia(2_500_000, a)).toBe(true)
    expect(superaReferencia(2_000_000, a)).toBe(false)
    expect(superaReferencia(1_500_000, a)).toBe(false)
  })
})

describe('persistencia local', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('guarda y recupera la aprobación', () => {
    expect(guardarAprobacionLocal(resultado(), { canonConsultadoCop: 2_000_000 })).toBe(true)
    const leida = leerAprobacionLocal()
    expect(leida?.estado).toBe('aprobado')
    expect(leida?.canonConsultadoCop).toBe(2_000_000)
  })

  it('NO guarda un resultado de demostración', () => {
    // Persistirlo dejaría al catálogo afirmando una aprobación falsa en
    // pantallas que ya no avisan que era una demo.
    expect(guardarAprobacionLocal(resultado({ stubMode: true }))).toBe(false)
    expect(leerAprobacionLocal()).toBeNull()
  })

  it('descarta un registro más viejo que la retención', () => {
    const viejo = new Date()
    viejo.setDate(viejo.getDate() - (RETENCION_DIAS + 1))
    guardarAprobacionLocal(resultado(), { ahora: viejo })
    expect(leerAprobacionLocal()).toBeNull()
  })

  it('conserva un registro dentro de la retención', () => {
    const reciente = new Date()
    reciente.setDate(reciente.getDate() - (RETENCION_DIAS - 1))
    guardarAprobacionLocal(resultado(), { ahora: reciente })
    expect(leerAprobacionLocal()?.estado).toBe('aprobado')
  })

  it('descarta basura sin reventar', () => {
    window.localStorage.setItem('arriendo-facil-aprobacion', 'no soy json')
    expect(leerAprobacionLocal()).toBeNull()
  })

  it('descarta un registro de otra versión', () => {
    window.localStorage.setItem(
      'arriendo-facil-aprobacion',
      JSON.stringify({ version: 999, guardadoEn: new Date().toISOString(), aprobacion: {} }),
    )
    expect(leerAprobacionLocal()).toBeNull()
  })

  it('borrar deja el catálogo sin personalizar', () => {
    guardarAprobacionLocal(resultado())
    borrarAprobacionLocal()
    expect(leerAprobacionLocal()).toBeNull()
  })

  it('también guarda un rechazo: el estado importa para no volver a preguntar', () => {
    guardarAprobacionLocal(resultado({ asegurabilidad: 'no' }))
    expect(leerAprobacionLocal()?.estado).toBe('rechazado')
  })
})
