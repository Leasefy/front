/**
 * La dirección de un concepto es plata.
 *
 * `paga` y `recibe` deciden si un concepto se le SUMA o se le RESTA al
 * propietario en su liquidación. Seis filas del catálogo estaban invertidas: el
 * predial y las reparaciones a su cargo le sumaban en vez de descontarle.
 *
 * No se prueba «el catálogo es correcto» —eso hay que revisarlo con la
 * inmobiliaria— sino las reglas que el catálogo mismo permite verificar.
 */

import { describe, it, expect } from 'vitest'

import { CONCEPTOS, conceptoPorId, type Concepto } from './conceptos'

const porId = (id: string): Concepto => {
  const c = conceptoPorId(id)
  if (!c) throw new Error(`no existe el concepto ${id}`)
  return c
}

describe('catálogo de conceptos', () => {
  describe('un cobro y una devolución van en direcciones opuestas', () => {
    it('servicios públicos del propietario: el cobro le sale, la devolución le entra', () => {
      const cobro = porId('cobro-de-servicios-publicos-propietario')
      const devolucion = porId('devolucion-por-servicios-publicos-propietario')

      expect(cobro.paga).toBe('PROPIETARIO')
      expect(devolucion.recibe).toBe('PROPIETARIO')
      // Lo que estaba mal: los dos con paga INMOBILIARIA, recibe PROPIETARIO.
      expect(cobro.paga).not.toBe(devolucion.paga)
    })

    it('reparaciones del propietario: el cargo le sale, la devolución le entra', () => {
      const devolucion = porId('devolucion-reparaciones-propietario')

      for (const n of [1, 2, 3]) {
        const cargo = porId(`reparacion-${n}-a-cargo-del-propietario`)
        expect(cargo.paga).toBe('PROPIETARIO')
        expect(cargo.paga).not.toBe(devolucion.paga)
      }
      expect(devolucion.recibe).toBe('PROPIETARIO')
    })
  })

  describe('«a cargo del» dice quién paga', () => {
    it('todos los "a cargo del propietario" los paga el propietario', () => {
      const aCargo = CONCEPTOS.filter((c) =>
        /a cargo del propietario/i.test(c.nombre),
      )

      expect(aCargo.length).toBeGreaterThan(0)
      for (const c of aCargo) expect(c.paga).toBe('PROPIETARIO')
    })

    it('todos los "a cargo del inquilino" los paga el inquilino', () => {
      const aCargo = CONCEPTOS.filter((c) =>
        /a cargo del inquilino/i.test(c.nombre),
      )

      expect(aCargo.length).toBeGreaterThan(0)
      for (const c of aCargo) expect(c.paga).toBe('INQUILINO')
    })
  })

  describe('reglas que ningún concepto puede romper', () => {
    it('nadie se paga a sí mismo', () => {
      // Un concepto donde paga y recibe son la misma parte no mueve un peso:
      // sería una fila que se puede agregar a un contrato y no hace nada.
      for (const c of CONCEPTOS) {
        expect(c.paga, `${c.id} se paga a sí mismo`).not.toBe(c.recibe)
      }
    })

    it('los ids son únicos', () => {
      // El id es lo que se guarda en el contrato: dos filas con el mismo id
      // hacen que `conceptoPorId` devuelva una y se guarde la otra.
      const ids = CONCEPTOS.map((c) => c.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('el canon lo paga el inquilino y lo recibe el propietario', () => {
      // Es el concepto que mueve el grueso de la plata. Si su dirección se
      // invierte, todo el resto de la liquidación queda al revés.
      const canon = porId('canon-arrendamiento')

      expect(canon.paga).toBe('INQUILINO')
      expect(canon.recibe).toBe('PROPIETARIO')
      expect(canon.base).toBe('ARRENDAMIENTO')
    })
  })

  describe('qué le toca al propietario', () => {
    it('lo que recibe son el canon, su incremento y las devoluciones', () => {
      const recibe = CONCEPTOS.filter((c) => c.recibe === 'PROPIETARIO').map(
        (c) => c.id,
      )

      expect(recibe.sort()).toEqual(
        [
          'canon-arrendamiento',
          'devolucion-por-servicios-publicos-propietario',
          'devolucion-reparaciones-propietario',
          'incremento-canon',
          'reajuste-canon-retribuible-a-propietario',
        ].sort(),
      )
    })
  })
})
