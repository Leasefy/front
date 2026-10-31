import { describe, expect, it } from 'vitest'

import type { PilotoActivoResponse } from '@/lib/api/piloto'
import type { CotizacionDelPlan } from '@/lib/conversion/acceso'
import { fraseDeLoPorSumar } from './CuentaDelPlan'
import { compraDelPiloto } from './PilotoEnTuPlan'

const cotizacion = (porSumar: CotizacionDelPlan['porSumarEnLaRenovacion']): CotizacionDelPlan => ({
  tier: 'pro',
  nombre: 'Leasefy',
  monto: 630_000,
  porInmueble: true,
  inmuebles: 300,
  usuarios: 2,
  desglose: { plan: 630_000, usuariosDeMas: 0, usuariosAdicionales: 0, piloto: 0, conPilotoAutomatico: false },
  porSumarEnLaRenovacion: porSumar,
})

describe('lo que se suma en la próxima renovación (activo un día = mes cobrado, Nico 31-10-2026)', () => {
  it('lo dice con cuántos, desde cuándo y cuánto', () => {
    expect(fraseDeLoPorSumar(cotizacion({ inmuebles: 3, valor: 6_300, desde: '2026-10-05' }))?.replace(/\u00a0/g, ' ')).toBe(
      'En tu próxima renovación se suman 3 inmuebles que estuvieron activos después del 5 de octubre de 2026 sin estarlo ese día: $ 6.300 más.',
    )
    expect(fraseDeLoPorSumar(cotizacion({ inmuebles: 1, valor: 0, desde: '2026-10-05' }))).toBe(
      'En tu próxima renovación se suma 1 inmueble que estuvo activo después del 5 de octubre de 2026 sin estarlo ese día: con ellos sigues en el mínimo, así que no suman nada.',
    )
  })

  it('sin nada que sumar (o con un back anterior) no dice nada', () => {
    expect(fraseDeLoPorSumar(cotizacion(null))).toBeNull()
    expect(fraseDeLoPorSumar(cotizacion(undefined))).toBeNull()
    expect(fraseDeLoPorSumar(cotizacion({ inmuebles: 0, valor: 0, desde: '2026-10-05' }))).toBeNull()
  })
})

describe('comprar el Piloto desde «Tu plan» (Nico 31-10-2026)', () => {
  const piloto = (p: Partial<PilotoActivoResponse>) =>
    ({ puedeCambiarlo: true, sePuedeActivar: true, sinVencimiento: false, sePuedeContratar: true, motivo: 'sin_activar', ...p }) as PilotoActivoResponse

  it('sin estrenar: la prueba de 30 días; en la prueba o terminada: contratarlo', () => {
    expect(compraDelPiloto(piloto({ motivo: 'sin_activar' }))).toBe('probar')
    expect(compraDelPiloto(piloto({ motivo: 'activo' }))).toBe('contratar')
    expect(compraDelPiloto(piloto({ motivo: 'prueba_terminada' }))).toBe('contratar')
  })

  it('quien no es administrador, el maestro apagado o un micro sin dato: no se ofrece', () => {
    expect(compraDelPiloto(piloto({ puedeCambiarlo: false }))).toBeNull()
    expect(compraDelPiloto(piloto({ motivo: 'apagado_por_leasefy', sePuedeActivar: false, sePuedeContratar: false }))).toBeNull()
    expect(compraDelPiloto(piloto({ motivo: 'activo', sePuedeContratar: undefined }))).toBeNull()
    expect(compraDelPiloto(null)).toBeNull()
  })
})

describe('cuánto le saldría Leasefy con lo que trae en la migración (Nico 31-10-2026)', () => {
  const plan = { porInmueble: 2_100, minimoMensual: 99_000, usuariosIncluidos: 2, usuarioAdicional: 20_000, preguntasIncluidas: 50 }
  it('por inmueble activo, con el mínimo', async () => {
    const { cuentaDeLaMigracion } = await import('@/components/migracion/CuantoTeSale')
    expect(cuentaDeLaMigracion(1_240, plan)).toEqual({ total: 2_604_000, enElMinimo: false })
    expect(cuentaDeLaMigracion(12, plan)).toEqual({ total: 99_000, enElMinimo: true })
    expect(cuentaDeLaMigracion(0, plan)).toEqual({ total: 99_000, enElMinimo: true })
  })
})
