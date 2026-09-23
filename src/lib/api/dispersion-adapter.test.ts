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
    })

    it('🔴 no supone que el titular es el propietario (QA 22-09: «la cuenta es de la esposa»)', () => {
      expect(cuentaDelPropietario(DEL_BACK)?.accountHolder).toBe('')
      expect(
        cuentaDelPropietario({ ...DEL_BACK, propietarioBankAccountHolder: 'Hernán Botero Ochoa' })?.accountHolder,
      ).toBe('Hernán Botero Ochoa')
    })

    it('el tipo, si el back lo manda, se entiende en español o en inglés', () => {
      expect(cuentaDelPropietario({ ...DEL_BACK, propietarioBankAccountType: 'Ahorros' })?.accountType).toBe('savings')
      expect(cuentaDelPropietario({ ...DEL_BACK, propietarioBankAccountType: 'CORRIENTE' })?.accountType).toBe('checking')
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

    it('🔴 la base del canon: la del back, o deducida — nunca «recaudado» por defecto', () => {
      // Lo que manda `GET /inmobiliaria/dispersiones` desde el 16-09.
      expect(adaptarDispersion({ ...DEL_BACK, baseDelCanon: 'CAUSADO' }).baseDelCanon).toBe('CAUSADO')
      // Aprobar y girar no la mandan: la columna cruda, si viene.
      expect(adaptarDispersion({ ...DEL_BACK, baseDeCalculo: 'CAUSADO' }).baseDelCanon).toBe('CAUSADO')
      // Una de las cuotas, sin nada escrito: CAUSADO.
      const deCuotas = {
        ...DEL_BACK,
        items: DEL_BACK.items!.map((i) => ({ ...i, cobroId: null, cuotaId: 'cuota-1' })),
      }
      expect(adaptarDispersion(deCuotas).baseDelCanon).toBe('CAUSADO')
      // La vieja por cobros, sin nada escrito: RECAUDADO, que ahí es verdad.
      expect(adaptarDispersion(DEL_BACK).baseDelCanon).toBe('RECAUDADO')
    })

    it('sin items no explota', () => {
      const sinItems = { ...DEL_BACK }
      delete sinItems.items

      expect(adaptarDispersion(sinItems).items).toEqual([])
    })
  })
})

describe('las deducciones de la liquidación', () => {
  const BLOQUE = {
    netoDelMesCop: 900_000,
    deducciones: [],
    deduccionesCop: 1_100_000,
    saldoAnteriorCop: 0,
    netoCop: -200_000,
    aGirarCop: 0,
    saldoEnContraCop: 200_000,
    compensadoCop: 900_000,
    renglones: [],
  }

  it('pasan tal cual: el neto a girar y el saldo en contra los calcula el back', () => {
    const d = adaptarDispersion({ ...DEL_BACK, netToPropietario: -200_000, conDeducciones: BLOQUE })
    expect(d.conDeducciones).toEqual(BLOQUE)
    // El guardado se conserva: la pantalla lee `conDeducciones.aGirarCop`, no lo recalcula.
    expect(d.netToPropietario).toBe(-200_000)
  })

  it('un back anterior sin el bloque no inventa uno', () => {
    expect(adaptarDispersion(DEL_BACK).conDeducciones).toBeUndefined()
    expect(adaptarDispersion({ ...DEL_BACK, conDeducciones: null }).conDeducciones).toBeUndefined()
  })
})

/*
 * 🔴 22-09 · El IVA de la comisión (Nico: «no estás teniendo en cuenta el IVA
 * en la comisión»). El back lo manda aparte —total y por renglón— y el aviso
 * de una dispersión que se generó sin él. Si el adaptador lo tirara, el cajón
 * volvería a decir «Comisión · Neto» con una resta que no cierra.
 */
describe('el IVA de la comisión', () => {
  const CON_IVA: DispersionDelBack = {
    ...DEL_BACK,
    totalCollected: 2_054_037,
    totalCommission: 205_404,
    totalIvaComision: 39_027,
    totalRetencionesComision: 0,
    totalConceptosACargo: 0,
    netToPropietario: 1_809_606,
    items: [
      {
        cobroId: null,
        cuotaId: 'cuota-1',
        propertyTitle: 'Apto 301',
        rentCollected: 2_054_037,
        commissionPercent: 10,
        commissionAmount: 205_404,
        ivaComisionAmount: 39_027,
        netAmount: 1_809_606,
      },
    ],
  }

  it('pasa el total y el del renglón tal cual', () => {
    const d = adaptarDispersion(CON_IVA)
    expect(d.totalIvaComision).toBe(39_027)
    expect(d.items[0].ivaComisionAmount).toBe(39_027)
    expect(d.totalCollected - d.totalCommission - (d.totalIvaComision ?? 0)).toBe(d.netToPropietario)
  })

  it('un back anterior lo lee como cero, sin aviso', () => {
    const d = adaptarDispersion(DEL_BACK)
    expect(d.totalIvaComision).toBe(0)
    expect(d.totalRetencionesComision).toBe(0)
    expect(d.avisoDelIvaDeLaComision).toBeNull()
  })

  it('el aviso de una dispersión generada sin IVA llega a la pantalla', () => {
    const d = adaptarDispersion({
      ...DEL_BACK,
      avisoDelIvaDeLaComision: 'Esta liquidación se generó sin el IVA de la comisión',
    })
    expect(d.avisoDelIvaDeLaComision).toContain('sin el IVA')
  })
})
