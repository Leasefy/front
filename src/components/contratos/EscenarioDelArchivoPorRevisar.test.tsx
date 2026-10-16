/**
 * Nico, 14-10-2026 (#1659 de Portofino): el escenario del archivo que no se
 * pudo usar (cobra IVA y el inmueble es de vivienda) se dice ARRIBA del
 * contrato, con el motivo, y lleva a la tarjeta del escenario.
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/contracts.service', () => ({ contractsApi: {} }))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { EscenarioDelArchivoPorRevisar } from './EscenarioTributario'
import type { EscenarioTributarioDelContrato } from '@/lib/types/contract'

const E8 =
  'Escenario 8. PROPIETARIO PN o PJ COBRA IVA - ARRENDATARIO PN o PJ HACE RETENCION EN LA FUENTE SOBRE EL CANON'
const MOTIVO =
  'El archivo dice escenario 8, que cobra IVA sobre el canon, pero el inmueble es de VIVIENDA y ese arrendamiento está excluido de IVA (art. 476 num. 15 ET). Corrige el uso o el escenario en la ficha del contrato.'
const EJE = { valor: false, origen: 'AFIRMADO' as const, porque: 'x' }

function escenario(delArchivo: EscenarioTributarioDelContrato['delArchivo']): EscenarioTributarioDelContrato {
  return {
    codigo: 'SIN_DEFINIR',
    nombre: 'Combinación sin escenario en el catálogo',
    nombreEnNuby: null,
    resumen: '',
    impuestos: [],
    sinImpuestos: false,
    certeza: 'SIN_DEFINIR',
    deducidos: [],
    faltan: [],
    ejes: {
      ivaSobreElCanon: EJE,
      retencionSobreElCanon: EJE,
      reteIvaSobreElCanon: EJE,
      retencionSobreLaComision: EJE,
    },
    fueraDelCatalogo: [],
    delArchivo,
  }
}

describe('Nico 14-10: el escenario del archivo por revisar, arriba del contrato', () => {
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

  function pintar(e: EscenarioTributarioDelContrato | undefined) {
    act(() => root.render(<EscenarioDelArchivoPorRevisar contract={{ escenarioTributario: e }} />))
    return contenedor.querySelector('[data-testid="escenario-del-archivo-por-revisar"]')
  }

  it('el escenario que no se pudo usar se dice con su motivo y lleva a la tarjeta', () => {
    const aviso = pintar(escenario({ texto: E8, codigo: 'E8', aplicado: false, motivo: MOTIVO }))
    expect(aviso).not.toBeNull()
    expect(aviso!.textContent).toContain('Revisa el escenario tributario de este contrato')
    expect(aviso!.textContent).toContain(MOTIVO)
    expect(aviso!.querySelector('a')?.getAttribute('href')).toBe('#escenario-tributario')
  })

  it('el escenario del archivo que sí se usó no muestra nada', () => {
    expect(pintar(escenario({ texto: E8, codigo: 'E8', aplicado: true, motivo: null }))).toBeNull()
  })

  it('un contrato sin escenario del archivo (o un back viejo) no muestra nada', () => {
    expect(pintar(escenario(null))).toBeNull()
    expect(pintar(undefined)).toBeNull()
  })
})
