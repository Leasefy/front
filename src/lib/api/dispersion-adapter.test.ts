/**
 * Lo que el back manda no es lo que la pantalla usa. Acá se prueba el borde.
 *
 * Los tres casos son defectos MEDIDOS contra el sistema corriendo, no
 * hipótesis: la pantalla reventaba con un propietario sin cuenta, y los
 * contadores por estado daban siempre cero.
 */

import { describe, it, expect } from 'vitest'

import {
  adaptarDispersion,
  cuentaDelPropietario,
  estadoDeDispersion,
  type DispersionDelBack,
} from './dispersion-adapter'

const DEL_BACK: DispersionDelBack = {
  id: 'disp-1',
  propietarioId: 'prop-1',
  propietarioName: 'Jorge Restrepo',
  propietarioBankName: 'Bancolombia',
  propietarioBankAccount: '123456789',
  month: '2026-08',
  totalCollected: 1_000_000,
  totalCommission: 100_000,
  totalConceptosAFavor: 0,
  totalConceptosACargo: 900_000,
  totalDeTerceros: 230_000,
  netToPropietario: 0,
  status: 'DISP_PENDING',
  createdAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z',
  items: [
    {
      cobroId: 'cobro-1',
      propertyTitle: 'Apto 101',
      rentCollected: 1_000_000,
      commissionPercent: 10,
      commissionAmount: 100_000,
      netAmount: 0,
      conceptosAFavor: 0,
      conceptosACargo: 900_000,
      deTerceros: 230_000,
    },
  ],
}

describe('adaptarDispersion', () => {
  describe('el estado', () => {
    it('traduce los cuatro estados del back', () => {
      // Sin traducir, TODOS los contadores por estado daban cero y ningún
      // filtro casaba: la pantalla parecía vacía con datos adentro.
      expect(estadoDeDispersion('DISP_PENDING')).toBe('pending')
      expect(estadoDeDispersion('PROCESSING')).toBe('processing')
      expect(estadoDeDispersion('DISP_COMPLETED')).toBe('completed')
      expect(estadoDeDispersion('FAILED')).toBe('failed')
    })

    it('un estado desconocido cae en pendiente, no se descarta', () => {
      // Descartar la fila escondería una dispersión real; llamarla
      // «completada» diría que ya se giró la plata.
      expect(estadoDeDispersion('ALGO_NUEVO')).toBe('pending')
    })
  })

  describe('la cuenta bancaria', () => {
    it('la arma con los dos strings sueltos del back', () => {
      const cuenta = cuentaDelPropietario(DEL_BACK)

      expect(cuenta?.accountNumber).toBe('123456789')
      expect(cuenta?.accountHolder).toBe('Jorge Restrepo')
    })

    it('sin cuenta registrada devuelve null, no un objeto vacío', () => {
      // El caso que tumbaba la sección entera: `Cannot read properties of
      // null (reading 'accountNumber')`. Y un objeto con strings vacíos se
      // pintaría como una cuenta en blanco, que se lee como dato perdido.
      const cuenta = cuentaDelPropietario({
        propietarioName: 'Jorge Restrepo',
        propietarioBankName: null,
        propietarioBankAccount: null,
      })

      expect(cuenta).toBeNull()
    })

    it('no inventa el tipo de cuenta', () => {
      // Suponer «ahorros» es inventar el destino de un giro.
      expect(cuentaDelPropietario(DEL_BACK)?.accountType).toBe('')
    })
  })

  describe('el desglose de la liquidación', () => {
    it('conserva lo que paga el propietario', () => {
      const d = adaptarDispersion(DEL_BACK)

      expect(d.totalConceptosACargo).toBe(900_000)
      expect(d.totalDeTerceros).toBe(230_000)
      expect(d.items[0].conceptosACargo).toBe(900_000)
    })

    it('una dispersión vieja, sin las columnas nuevas, no rompe', () => {
      // Las dispersiones generadas antes de la migración no traen el
      // desglose. Cero es correcto ahí: no hubo conceptos.
      const vieja = { ...DEL_BACK }
      delete vieja.totalConceptosACargo
      delete vieja.totalDeTerceros
      delete vieja.totalConceptosAFavor

      const d = adaptarDispersion(vieja)

      expect(d.totalConceptosACargo).toBe(0)
      expect(d.totalDeTerceros).toBe(0)
    })

    it('sin items no explota', () => {
      const sinItems = { ...DEL_BACK }
      delete sinItems.items

      expect(adaptarDispersion(sinItems).items).toEqual([])
    })
  })
})
