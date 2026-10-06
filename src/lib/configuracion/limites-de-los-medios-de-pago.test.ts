import { describe, expect, it } from 'vitest'
import { erroresDeLargoDelMedio, TOPES_DEL_MEDIO } from './limites-de-los-medios-de-pago'
import type { NuevoMedioDePago } from '@/lib/api/medios-de-pago.types'

const base: NuevoMedioDePago = {
  tipo: 'TRANSFERENCIA',
  nombre: 'Transferencia',
  instrucciones: '',
  banco: 'Bancolombia',
  tipoDeCuenta: 'AHORROS',
  numeroDeCuenta: '123',
  titular: 'Portofino',
  documentoTitular: '',
  enlace: '',
  visibleAlInquilino: true,
  activo: true,
}

describe('erroresDeLargoDelMedio — el espejo del DTO del back', () => {
  it('un medio dentro de los topes pasa', () => {
    expect(erroresDeLargoDelMedio(base)).toEqual({})
  })

  it('cada campo pasado de su tope dice la frase del back', () => {
    expect(erroresDeLargoDelMedio({ ...base, banco: 'b'.repeat(81), titular: 't'.repeat(121) })).toEqual({
      banco: 'El banco puede tener hasta 80 caracteres.',
      titular: 'El titular puede tener hasta 120 caracteres.',
    })
  })

  it('los topes son los de las columnas (VarChar) y los del negocio (Text)', () => {
    expect(Object.fromEntries(Object.entries(TOPES_DEL_MEDIO).map(([c, { tope }]) => [c, tope]))).toEqual({
      nombre: 80,
      instrucciones: 500,
      banco: 80,
      tipoDeCuenta: 20,
      numeroDeCuenta: 40,
      titular: 120,
      documentoTitular: 30,
      enlace: 300,
    })
  })
})
