/**
 * 🔴 El IVA de la comisión en el cajón de la liquidación (Nico, 22-09).
 *
 * La captura: «Canon causado $2.054.037 · Comisión $205.404 · Neto
 * $1.848.633», y Nico: «no estás teniendo en cuenta el IVA en la comisión».
 * El back ya lo liquida en la cuota y lo manda APARTE (`totalIvaComision`),
 * fuera de los conceptos a cargo. Si el cajón no lo pinta, la cuenta a la
 * vista deja de cerrar: 2.054.037 − 205.404 ≠ 1.809.606.
 */
import * as React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { VistaPreviaDeDispersiones } from '@/lib/types/inmobiliaria'
import { CajonDeLaLiquidacion } from './CajonDeLaLiquidacion'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Propietario = VistaPreviaDeDispersiones['propietarios'][number]

function propietario(extra: Partial<Propietario> = {}): Propietario {
  return {
    propietarioId: 'p-1',
    propietarioName: 'Ana Propietaria',
    propietarioBankName: 'Bancolombia',
    propietarioBankAccount: '123',
    yaExiste: true,
    totalCollected: 2_054_037,
    totalCommission: 205_404,
    totalIvaComision: 39_027,
    totalRetencionesComision: 0,
    totalConceptosAFavor: 0,
    totalConceptosACargo: 0,
    totalDeTerceros: 0,
    netToPropietario: 1_809_606,
    items: [
      {
        cobroId: null,
        cuotaId: 'cuota-1',
        propertyId: 'inm-1',
        propertyTitle: 'Apto 301',
        rentCollected: 2_054_037,
        commissionPercent: 10,
        commissionAmount: 205_404,
        ivaComisionAmount: 39_027,
        retencionesComisionAmount: 0,
        netAmount: 1_809_606,
        conceptosAFavor: 0,
        conceptosACargo: 0,
        deTerceros: 0,
      },
    ],
    ...extra,
  } as Propietario
}

let host: HTMLDivElement
let root: Root

function montar(p: Propietario) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root.render(
      <CajonDeLaLiquidacion propietario={p} mes="septiembre de 2026" base="CAUSADO" onCerrar={() => {}} />,
    )
  })
}

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.body.innerHTML = ''
})

const texto = (testid: string) =>
  document.body.querySelector(`[data-testid="${testid}"]`)?.textContent ?? null

/** Los pesos de un texto como número: «−$39.027» → 39027. */
const pesos = (t: string | null) => Number((t ?? '').replace(/[^\d]/g, ''))

describe('el cajón de la liquidación con el IVA de la comisión', () => {
  it('pinta «IVA de la comisión» entre la comisión y el neto, y la cuenta cierra a la vista', () => {
    montar(propietario())
    const iva = texto('cajon-liquidacion-iva')
    expect(iva).toContain('IVA de la comisión')
    expect(pesos(iva)).toBe(39_027)
    expect(pesos(texto('cajon-liquidacion-neto'))).toBe(1_809_606)
    // canon − comisión − IVA = neto, con los números que se ven.
    expect(2_054_037 - 205_404 - pesos(iva)).toBe(pesos(texto('cajon-liquidacion-neto')))
    // El orden: comisión, IVA, neto.
    const cuerpo = document.body.textContent ?? ''
    expect(cuerpo.indexOf('Comisión')).toBeLessThan(cuerpo.indexOf('IVA de la comisión'))
    expect(cuerpo.indexOf('IVA de la comisión')).toBeLessThan(cuerpo.indexOf('Neto del mes'))
  })

  it('el renglón del inmueble también lo dice', () => {
    montar(propietario())
    expect(texto('cajon-liquidacion-inmuebles')).toContain('IVA $39.027')
  })

  it('sin IVA (inmobiliaria no responsable, o un back anterior) no aparece la línea', () => {
    montar(propietario({ totalIvaComision: 0, netToPropietario: 1_848_633 }))
    expect(texto('cajon-liquidacion-iva')).toBeNull()
    montar(propietario({ totalIvaComision: undefined, netToPropietario: 1_848_633 }))
    expect(texto('cajon-liquidacion-iva')).toBeNull()
  })

  it('lo que el propietario le retuvo a la comisión suma, en su línea', () => {
    montar(propietario({ totalRetencionesComision: 28_448, netToPropietario: 1_838_054 }))
    expect(pesos(texto('cajon-liquidacion-retenido'))).toBe(28_448)
  })
})
