/**
 * «Confirmar» lleva a donde se declara (08-10-2026, Nico: «sí, botón que
 * lleve»). La factura de un contrato con el escenario deducido dice
 * «confírmalo en el contrato», y el bloque no tenía cómo: había que adivinar
 * que se hace en «Cómo se cobra → Corregir» y en la ficha del propietario.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { EscenarioTributario } from './EscenarioTributario'
import type { EscenarioTributarioDelContrato } from '@/lib/types/contract'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const AFIRMADO = { valor: false, origen: 'AFIRMADO' as const, porque: 'declarado' }
const DEDUCIDO = { valor: false, origen: 'DEDUCIDO' as const, porque: 'persona natural' }

function deducido(
  o: Partial<EscenarioTributarioDelContrato> = {},
): EscenarioTributarioDelContrato {
  return {
    codigo: 'E1',
    nombre: 'Vivienda o local entre personas naturales',
    nombreEnNuby: 'Escenario 1 VIVIENDA O LOCAL ENTRE PERSONAS NATURALES',
    resumen: 'No genera IVA ni retenciones.',
    impuestos: [],
    sinImpuestos: true,
    certeza: 'DEDUCIDO',
    deducidos: ['Se deduce de que el inquilino es persona natural.'],
    faltan: [],
    ejes: {
      ivaSobreElCanon: AFIRMADO,
      retencionSobreElCanon: DEDUCIDO,
      reteIvaSobreElCanon: AFIRMADO,
      retencionSobreLaComision: AFIRMADO,
    },
    fueraDelCatalogo: [],
    ...o,
  }
}

const FICHA = '/panel/inmobiliaria/propietarios/po-1?volver=%2Fpanel%2Finmobiliaria%2Fcontratos%2Fct-53'

describe('EscenarioTributario · «Confirmar» lleva a donde se declara', () => {
  let contenedor: HTMLDivElement
  let root: Root

  beforeEach(() => {
    contenedor = document.createElement('div')
    document.body.appendChild(contenedor)
    root = createRoot(contenedor)
  })

  afterEach(() => {
    act(() => root.unmount())
    contenedor.remove()
  })

  function pintar(
    e: EscenarioTributarioDelContrato,
    p: Partial<React.ComponentProps<typeof EscenarioTributario>> = {},
  ) {
    act(() => {
      root.render(
        <EscenarioTributario contract={{ id: 'ct-53', escenarioTributario: e }} {...p} />,
      )
    })
    return contenedor
  }

  it('deducido: el botón abre «Cómo se cobra»', () => {
    const abrir = vi.fn()
    const c = pintar(deducido(), {
      puedeEditar: true,
      onConfirmarEnElContrato: abrir,
      fichaDelPropietario: FICHA,
    })
    const boton = c.querySelector<HTMLButtonElement>(
      '[data-testid="escenario-confirmar-en-el-contrato"]',
    )
    expect(boton?.textContent).toContain('Confirmar en «Cómo se cobra»')
    act(() => boton!.click())
    expect(abrir).toHaveBeenCalledTimes(1)
    // Lo deducido es del inquilino: no manda a la ficha del propietario.
    expect(c.querySelector('[data-testid="escenario-perfil-del-propietario"]')).toBeNull()
  })

  it('lo del propietario (la retención sobre la comisión) lleva a su ficha', () => {
    const c = pintar(
      deducido({
        deducidos: ['Se deduce de que el propietario es persona natural.'],
        ejes: {
          ivaSobreElCanon: AFIRMADO,
          retencionSobreElCanon: AFIRMADO,
          reteIvaSobreElCanon: AFIRMADO,
          retencionSobreLaComision: DEDUCIDO,
        },
      }),
      { puedeEditar: true, onConfirmarEnElContrato: () => {}, fichaDelPropietario: FICHA },
    )
    const enlace = c.querySelector('[data-testid="escenario-perfil-del-propietario"]')
    expect(enlace?.textContent).toBe('Completar el perfil tributario del propietario')
    expect(enlace?.getAttribute('href')).toBe(FICHA)
  })

  it('sin permiso para editar contratos no ofrece nada', () => {
    const c = pintar(deducido(), {
      puedeEditar: false,
      onConfirmarEnElContrato: () => {},
      fichaDelPropietario: FICHA,
    })
    expect(c.querySelector('[data-testid="escenario-llevar-a-confirmar"]')).toBeNull()
  })

  it('confirmado: no hay nada que confirmar', () => {
    const c = pintar(
      deducido({
        certeza: 'CONFIRMADO',
        deducidos: [],
        ejes: {
          ivaSobreElCanon: AFIRMADO,
          retencionSobreElCanon: AFIRMADO,
          reteIvaSobreElCanon: AFIRMADO,
          retencionSobreLaComision: AFIRMADO,
        },
      }),
      { puedeEditar: true, onConfirmarEnElContrato: () => {}, fichaDelPropietario: FICHA },
    )
    expect(c.querySelector('[data-testid="escenario-confirmar-en-el-contrato"]')).toBeNull()
  })
})
